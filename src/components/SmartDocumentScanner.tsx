/**
 * SmartDocumentScanner.tsx
 * Uses react-native-dotenv instead of react-native-config
 * OCR: @react-native-ml-kit/text-recognition
 *
 * ── iOS PATCH NOTES ────────────────────────────────────────────
 *  Fix 1 – extractBBoxFromBlock()
 *    Multi-fallback bbox extraction:
 *      frame.x/y  →  frame.left/top  →  cornerPoints  →  lines[].frame
 *    Handles iOS "left/top" serialization & normalised (0-1) coords.
 *
 *  Fix 2 – takeSnapshot on iOS (with takePhoto fallback)
 *    React-Native-Vision-Camera v3 supports takeSnapshot on iOS.
 *    Low-quality JPEG snapshot is much faster AND avoids HEIF format
 *    which can cause ML Kit to silently return empty blocks on iOS.
 *
 *  Fix 3 – iOS synthetic-region fallback
 *    When blocks[] is empty but mlkitResult.text is non-empty
 *    (confirmed iOS ML Kit serialization gap), we synthesise one
 *    BBox covering the centre of the image so the detection overlay,
 *    edge box, auto-zoom, and auto-capture all continue to work.
 *
 *  Fix 4 – photo dimensions fallback
 *    photo.width / photo.height are not always populated by
 *    takePhoto on iOS. We read actual JPEG dimensions via RNFS header
 *    parsing as a fallback before defaulting to screen size.
 *
 *  Fix 5 – diagnostic logging
 *    [iOS-OCR] prefix lets you filter Metro logs to see exactly
 *    what the native bridge is returning per frame.
 *
 *  All Android paths are UNCHANGED.
 * ─────────────────────────────────────────────────────────────
 *
 * ORIGINAL FEATURES (UI-only, zero OCR logic changes):
 *  • Edge Detection / Boundary Detection  — SVG polygon drawn around the
 *    merged document boundary (`mergeTopRegions`) scaled to screen coords.
 *  • Auto Capture / Smart Capture         — animated countdown ring + badge
 *    that appears while the scanner is in the "locking" phase.
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Platform,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import TextRecognition, {
  TextRecognitionResult,
  TextBlock,
} from '@react-native-ml-kit/text-recognition';
import RNFS from 'react-native-fs';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { GOOGLE_VISION_API_KEY, GEMINI_API_KEY } from '@env';

const GoogleVision = GOOGLE_VISION_API_KEY;
const GeminiKey    = GEMINI_API_KEY;

console.log('GoogleVision', GoogleVision);
console.log('GeminiKey', GeminiKey);

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const SCAN_INTERVAL_MS   = 600;
const STABILITY_FRAMES   = 1;
const CAPTURE_DELAY_MS   = 900;
const IOU_STABLE_THRESH  = 0.45;
const REGION_TOO_SMALL   = 0.40;
const REGION_TOO_LARGE   = 0.75;
const REGION_TARGET      = 0.55;
const ZOOM_LERP_SPEED    = 0.08;
const CORNER_ARM         = 22;
const CORNER_SW          = 3;
const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GoogleVision}`;

const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GeminiKey}`;

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface BBox { x: number; y: number; width: number; height: number; }

export interface ScoredRegion {
  bbox: BBox; screenBbox: BBox; text: string; score: number; stableFrames: number;
}

type ScanPhase = 'idle' | 'scanning' | 'locking' | 'capturing' | 'done';
interface ScanState { phase: ScanPhase; guidance: string; }

export interface GeminiExtractionResult {
  recipient_name: string;
  ship_name:      string;
  carrier:        string;
  tracking_number:string;
  shipper:        string;
  address:        string;
  phone:          string;
}

export const EMPTY_EXTRACTION: GeminiExtractionResult = {
  recipient_name: '',
  ship_name:      '',
  carrier:        '',
  tracking_number:'',
  shipper:        '',
  address:        '',
  phone:          '',
};

export interface SmartDocumentScannerProps {
  onImageCaptured: (imagePath: string) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// PURE UTILITIES  (unchanged)
// ─────────────────────────────────────────────────────────────
function computeIoU(a: BBox, b: BBox): number {
  const xL = Math.max(a.x, b.x), yT = Math.max(a.y, b.y);
  const xR = Math.min(a.x + a.width,  b.x + b.width);
  const yB = Math.min(a.y + a.height, b.y + b.height);
  if (xR <= xL || yB <= yT) return 0;
  const inter = (xR - xL) * (yB - yT);
  const union  = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function scoreRegion(
  bbox: BBox, text: string,
  imgW: number, imgH: number,
  prevRegions: ScoredRegion[],
): number {
  const boxArea       = bbox.width * bbox.height;
  const textDensity   = Math.min((text.length * 1000) / Math.max(boxArea, 1), 1);
  const normalizedArea= Math.min(boxArea / (imgW * imgH), 1);
  const cx = (bbox.x + bbox.width  / 2) / imgW;
  const cy = (bbox.y + bbox.height / 2) / imgH;
  const centerProximity = Math.max(0, 1 - Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2) * 2);
  const prev      = prevRegions.find(r => computeIoU(r.bbox, bbox) > IOU_STABLE_THRESH);
  const stability = prev ? Math.min(prev.stableFrames / 10, 1) : 0;
  return textDensity * 0.4 + normalizedArea * 0.3 + centerProximity * 0.2 + stability * 0.1;
}

function scaleToScreen(
  bbox: BBox,
  imgW: number, imgH: number,
  screenW: number, screenH: number,
): BBox {
  let eW = imgW, eH = imgH;
  const sp = screenH > screenW, il = imgW > imgH;
  if (sp && il) { eW = imgH; eH = imgW; }
  let { x, y, width: w, height: h } = bbox;
  if (sp && il) {
    const nx = bbox.y, ny = imgW - bbox.x - bbox.width;
    x = nx; y = ny; w = bbox.height; h = bbox.width;
  }
  return {
    x:      x * (screenW / eW),
    y:      y * (screenH / eH),
    width:  w * (screenW / eW),
    height: h * (screenH / eH),
  };
}

function mergeTopRegions(
  regions: ScoredRegion[], topN: number,
  imgW: number, imgH: number,
): BBox | null {
  const top = regions.slice(0, Math.min(regions.length, topN));
  if (!top.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of top) {
    minX = Math.min(minX, r.bbox.x);
    minY = Math.min(minY, r.bbox.y);
    maxX = Math.max(maxX, r.bbox.x + r.bbox.width);
    maxY = Math.max(maxY, r.bbox.y + r.bbox.height);
  }
  const padX = (maxX - minX) * 0.15, padY = (maxY - minY) * 0.15;
  return {
    x:      Math.max(0, minX - padX),
    y:      Math.max(0, minY - padY),
    width:  Math.min(imgW - Math.max(0, minX - padX), maxX - minX + padX * 2),
    height: Math.min(imgH - Math.max(0, minY - padY), maxY - minY + padY * 2),
  };
}

function computeTargetZoom(
  d: BBox, imgW: number, imgH: number,
  cur: number, min: number, max: number,
): number {
  const ratio = (d.width * d.height) / (imgW * imgH);
  if (ratio > 0.48 && ratio < 0.62) return cur;
  const scale = REGION_TARGET / Math.max(ratio, 0.01);
  const adjusted = cur * (1 + (scale - 1) * 0.4);
  return Math.min(Math.max(adjusted, min), max);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ─────────────────────────────────────────────────────────────
// iOS FIX 1 — extractBBoxFromBlock
//
// Why this is needed:
//   Android ML Kit   → block.frame = { x, y, width, height }  (pixel coords)
//   iOS Firebase ML  → block.frame = { left, top, width, height } (pixel coords)
//   iOS Vision (alt) → block.frame may be { x, y, w, h } in 0–1 normalised space
//                       or block.cornerPoints = [{x,y}, …] instead of frame
//   Some iOS builds  → block.frame is null; line-level frames still present
//
// Strategy:
//   1. Try frame.x / frame.y          (Android + some iOS)
//   2. Try frame.left / frame.top     (standard iOS Firebase ML serialisation)
//   3. Detect normalised [0,1] coords and scale to pixel space
//   4. Fall back to cornerPoints bounding rect
//   5. Fall back to aggregating block.lines[].frame
// ─────────────────────────────────────────────────────────────
function extractBBoxFromBlock(
  block: TextBlock,
  imgW: number,
  imgH: number,
): BBox | null {
  // ── Helper: decide if coords look normalised (0–1 range) ──
  const isNormalised = (x: number, y: number, w: number, h: number) =>
    w > 0 && h > 0 && w <= 1.05 && h <= 1.05 &&
    x >= 0 && x < 1.1 && y >= 0 && y < 1.1;

  const toPx = (x: number, y: number, w: number, h: number, norm: boolean): BBox =>
    norm
      ? { x: x * imgW, y: y * imgH, width: w * imgW, height: h * imgH }
      : { x, y, width: w, height: h };

  // ── 1 + 2 + 3: Try block.frame (all key variants) ──────────
  const f = (block as any)?.frame;
  if (f && typeof f === 'object') {
    const rawX = typeof f.x    === 'number' ? f.x    : typeof f.left === 'number' ? f.left : null;
    const rawY = typeof f.y    === 'number' ? f.y    : typeof f.top  === 'number' ? f.top  : null;
    const rawW = typeof f.width  === 'number' ? f.width  : null;
    const rawH = typeof f.height === 'number' ? f.height : null;

    if (rawX !== null && rawY !== null && rawW !== null && rawH !== null &&
        rawW > 0 && rawH > 0) {
      const norm = isNormalised(rawX, rawY, rawW, rawH);
      return toPx(rawX, rawY, rawW, rawH, norm);
    }
  }

  // ── 4: cornerPoints → bounding rect ────────────────────────
  const cp = (block as any)?.cornerPoints;
  if (Array.isArray(cp) && cp.length >= 2) {
    const pts = cp
      .map((p: any) => ({
        x: typeof p.x === 'number' ? p.x : (Array.isArray(p) ? p[0] : null),
        y: typeof p.y === 'number' ? p.y : (Array.isArray(p) ? p[1] : null),
      }))
      .filter(p => p.x !== null && p.y !== null) as { x: number; y: number }[];

    if (pts.length >= 2) {
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const rW = maxX - minX, rH = maxY - minY;
      if (rW > 0 && rH > 0) {
        const norm = isNormalised(minX, minY, rW, rH);
        return toPx(minX, minY, rW, rH, norm);
      }
    }
  }

  // ── 5: Aggregate block.lines[].frame ───────────────────────
  const lines = (block as any)?.lines;
  if (Array.isArray(lines) && lines.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;

    for (const line of lines) {
      const lf = (line as any)?.frame;
      if (!lf || typeof lf !== 'object') continue;

      const lx = typeof lf.x    === 'number' ? lf.x    : typeof lf.left === 'number' ? lf.left : null;
      const ly = typeof lf.y    === 'number' ? lf.y    : typeof lf.top  === 'number' ? lf.top  : null;
      const lw = typeof lf.width  === 'number' ? lf.width  : null;
      const lh = typeof lf.height === 'number' ? lf.height : null;

      if (lx !== null && ly !== null && lw !== null && lh !== null && lw > 0 && lh > 0) {
        const norm = isNormalised(lx, ly, lw, lh);
        const [px, py, pw, ph] = norm
          ? [lx * imgW, ly * imgH, lw * imgW, lh * imgH]
          : [lx, ly, lw, lh];
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px + pw);
        maxY = Math.max(maxY, py + ph);
        found = true;
      }
    }

    if (found && maxX > minX && maxY > minY) {
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// iOS FIX 3 — buildSyntheticRegions
//
// When @react-native-ml-kit/text-recognition returns
//   { text: "some text", blocks: [] }
// on iOS (confirmed serialisation gap in certain pod versions),
// `text` is the full document OCR result.  We split it into lines
// and estimate evenly-distributed bounding boxes across the centre
// of the image so the detection pipeline stays fully functional.
//
// This gives us:
//   • visible OCR / edge-detection overlay    ✓
//   • auto-zoom that tracks estimated content ✓
//   • auto-capture when stable               ✓
//   • correct text passed to cloud vision    ✓ (from mlkitResult.text)
// ─────────────────────────────────────────────────────────────
function buildSyntheticRegions(
  fullText: string,
  imgW: number,
  imgH: number,
  prevRegions: ScoredRegion[],
): ScoredRegion[] {
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  // Occupy the central 80% of the image, split evenly per line
  const padX   = imgW * 0.10;
  const padY   = imgH * 0.15;
  const totalW = imgW - padX * 2;
  const totalH = imgH - padY * 2;
  const lineH  = totalH / lines.length;

  return lines.map((lineText, i) => {
    const bbox: BBox = {
      x:      padX,
      y:      padY + i * lineH,
      width:  totalW,
      height: lineH,
    };
    const prev = prevRegions.find(r => computeIoU(r.bbox, bbox) > IOU_STABLE_THRESH);
    return {
      bbox,
      screenBbox:   scaleToScreen(bbox, imgW, imgH, SW, SH),
      text:         lineText,
      score:        scoreRegion(bbox, lineText, imgW, imgH, prevRegions),
      stableFrames: prev ? prev.stableFrames + 1 : 1,
    } as ScoredRegion;
  });
}

// ─────────────────────────────────────────────────────────────
// iOS FIX 4 — getPhotoSize
//
// react-native-vision-camera takePhoto() on iOS does not always
// populate photo.width / photo.height (it does on Android +
// newer RN-VC versions).  We read the raw JPEG SOF0/SOF2 marker
// to get the true pixel dimensions before falling back to screen size.
// ─────────────────────────────────────────────────────────────
async function getPhotoSize(
  photoPath: string,
  fallbackW: number,
  fallbackH: number,
): Promise<{ width: number; height: number }> {
  if (fallbackW > 100 && fallbackH > 100) {
    return { width: fallbackW, height: fallbackH };
  }

  try {
    // Read first 64 KB — enough to find JPEG SOF marker
    const fsPath = photoPath.startsWith('file://') ? photoPath.slice(7) : photoPath;
    const hex = await RNFS.read(fsPath, 65536, 0, 'base64');
    const buf = Buffer.from ? Buffer.from(hex, 'base64') : _b64ToUint8(hex);

    for (let i = 0; i < buf.length - 8; i++) {
      // Look for SOF0 (0xFFC0) or SOF2 (0xFFC2)
      if (buf[i] === 0xFF && (buf[i + 1] === 0xC0 || buf[i + 1] === 0xC2)) {
        const h = (buf[i + 5] << 8) | buf[i + 6];
        const w = (buf[i + 7] << 8) | buf[i + 8];
        if (w > 0 && h > 0) return { width: w, height: h };
      }
    }
  } catch (_) {
    // Silent – fall through to screen dimensions
  }

  return { width: fallbackW || SW, height: fallbackH || SH };
}

/** Minimal base64 → Uint8Array for environments without Buffer */
function _b64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// ─────────────────────────────────────────────────────────────
// CLOUD VISION  (unchanged)
// ─────────────────────────────────────────────────────────────
export async function callCloudVision(
  imagePath: string,
): Promise<{ text: string; confidence: number }> {
  const fsPath = imagePath.startsWith('file://') ? imagePath.slice(7) : imagePath;
  const base64  = await RNFS.readFile(fsPath, 'base64');
  const response = await fetch(VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: {
          languageHints: ['en'],
          textDetectionParams: { enableTextDetectionConfidenceScore: true },
        },
      }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message ?? 'Cloud Vision error');
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  const text: string = annotation?.text ?? '';
  const confidence   = annotation?.pages?.[0]?.confidence ?? 0;
  console.log(`[CloudVision] conf=${(confidence * 100).toFixed(1)}%  preview: ${text.slice(0, 120)}`);
  return { text, confidence };
}

// ─────────────────────────────────────────────────────────────
// GEMINI  (unchanged)
// ─────────────────────────────────────────────────────────────
export const buildGeminiPrompt = (ocrText: string, shipNames: string) =>
  `You are a shipping label parser for cruise deliveries.
  VALID SHIPS LIST:
  ${shipNames}
  Extract fields from OCR text.

  Return ONLY valid JSON.

  FIELDS:

  1. recipient_name:
    - Person receiving package
    - Crew or Mail or Crew Mail or Crew Mail Services is never a recipient name
    - Usually under "SHIP TO"
    - NEVER include ship name or company

  2. ship_name:
    - Name of cruise ship (e.g., Celebrity Summit, Wonder of the Seas)
    - Often appears below recipient name

  3. carrier:
    - Delivery company (Amazon, FedEx, UPS, DHL)

  4. tracking_number:
    - Exact tracking ID

  5. address:
    - Delivery address (deck, cabin, etc.)

  6. phone:
    - If present

  ---

  STRICT RULES:
  - recipient_name MUST contain only person name
  - ship_name MUST be separate
  - NEVER combine recipient_name + ship_name

  Example:
  Rahul Sharma
  Celebrity Summit

  OUTPUT:
  {
    "recipient_name": "Rahul Sharma",
    "ship_name": "Celebrity Summit"
  }

  ---

  OCR TEXT:
  ${ocrText}

  OUTPUT FORMAT:
  {
    "recipient_name": "",
    "ship_name": "",
    "carrier": "",
    "tracking_number": "",
    "shipper": "",
    "address": "",
    "phone": ""
  }
  `;

export function robustParseGeminiJson(raw: string): GeminiExtractionResult | null {
  const normalise = (p: any): GeminiExtractionResult => ({
    recipient_name:  String(p.recipient_name  ?? '').trim(),
    ship_name:       String(p.ship_name       ?? '').trim(),
    carrier:         String(p.carrier         ?? '').trim(),
    tracking_number: String(p.tracking_number ?? '').trim(),
    shipper:         String(p.shipper         ?? '').trim(),
    address:         String(p.address         ?? '').trim(),
    phone:           String(p.phone           ?? '').trim(),
  });

  try { const p = JSON.parse(raw.trim()); if (p && typeof p === 'object') return normalise(p); } catch {}

  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { const p = JSON.parse(stripped); if (p && typeof p === 'object') return normalise(p); } catch {}

  const start = stripped.indexOf('{');
  const end   = stripped.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { const p = JSON.parse(stripped.slice(start, end + 1)); if (p && typeof p === 'object') return normalise(p); } catch {}
  }

  if (start !== -1) {
    try {
      let partial = stripped.slice(start);
      partial = partial.replace(/:\s*"([^"\n]*)$/, ': "$1"');
      partial = partial.replace(/,\s*$/, '');
      let open = 0;
      for (const ch of partial) { if (ch === '{') open++; else if (ch === '}') open--; }
      partial += '}'.repeat(Math.max(0, open));
      const p = JSON.parse(partial);
      if (p && typeof p === 'object') {
        console.warn('[Gemini] Used truncation repair');
        return normalise(p);
      }
    } catch {}
  }

  console.error('[Gemini] All parse stages failed. Raw:', raw.slice(0, 250));
  return null;
}

export async function callGeminiExtraction(
  ocrText: string,
  shipList: { name: string }[],
): Promise<GeminiExtractionResult> {
  if (!ocrText.trim()) {
    console.warn('[Gemini] Empty OCR text, skipping.');
    return EMPTY_EXTRACTION;
  }
  const shipNames = shipList.map(s => s.name).join(', ');
  try {
    console.log(`[Gemini] Calling ${GEMINI_MODEL}…`);
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildGeminiPrompt(ocrText, shipNames) }] }],
        generationConfig: { temperature: 0.0, topK: 1, topP: 1, maxOutputTokens: 4096 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${errBody.slice(0, 300)}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message ?? 'Gemini API error');

    const finishReason: string = data.candidates?.[0]?.finishReason ?? 'UNKNOWN';
    if (finishReason === 'MAX_TOKENS') console.warn('[Gemini] Hit MAX_TOKENS — attempting JSON repair');

    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('[Gemini] Raw response:', rawText.slice(0, 400));

    const result = robustParseGeminiJson(rawText);
    if (!result) return EMPTY_EXTRACTION;

    console.log('[Gemini] Extracted →', JSON.stringify(result));
    return result;
  } catch (err: any) {
    console.error('[Gemini] Extraction failed:', err?.message ?? err);
    return EMPTY_EXTRACTION;
  }
}

// ─────────────────────────────────────────────────────────────
// SVG CORNER MARKERS  (unchanged)
// ─────────────────────────────────────────────────────────────
function CornerMarkers({ bbox, locked }: { bbox: BBox; locked: boolean }) {
  const c = locked ? '#00FF88' : '#FFFFFF';
  const { x, y, width: w, height: h } = bbox;
  return (<>
    <Rect x={x}             y={y}             width={CORNER_ARM} height={CORNER_SW}  fill={c} rx={1} />
    <Rect x={x}             y={y}             width={CORNER_SW}  height={CORNER_ARM} fill={c} rx={1} />
    <Rect x={x + w - CORNER_ARM} y={y}        width={CORNER_ARM} height={CORNER_SW}  fill={c} rx={1} />
    <Rect x={x + w - CORNER_SW}  y={y}        width={CORNER_SW}  height={CORNER_ARM} fill={c} rx={1} />
    <Rect x={x}             y={y + h - CORNER_SW}  width={CORNER_ARM} height={CORNER_SW}  fill={c} rx={1} />
    <Rect x={x}             y={y + h - CORNER_ARM} width={CORNER_SW}  height={CORNER_ARM} fill={c} rx={1} />
    <Rect x={x + w - CORNER_ARM} y={y + h - CORNER_SW}  width={CORNER_ARM} height={CORNER_SW}  fill={c} rx={1} />
    <Rect x={x + w - CORNER_SW}  y={y + h - CORNER_ARM} width={CORNER_SW}  height={CORNER_ARM} fill={c} rx={1} />
  </>);
}

// ─────────────────────────────────────────────────────────────
// EDGE DETECTION OVERLAY  (unchanged)
// ─────────────────────────────────────────────────────────────
interface EdgeDetectionOverlayProps {
  bbox: BBox;
  phase: ScanPhase;
}

function EdgeDetectionOverlay({ bbox, phase }: EdgeDetectionOverlayProps) {
  const locked      = phase === 'locking' || phase === 'capturing';
  const active      = phase === 'scanning' || locked;
  if (!active) return null;

  const edgeColor   = locked ? '#00FF88' : '#61B3E4';
  const fillOpacity = locked ? 0.07 : 0.04;
  const strokeW     = locked ? 2.5 : 1.8;
  const dash        = locked ? undefined : '10 6';
  const { x, y, width: w, height: h } = bbox;

  const MID_ARM = 10;
  const arrowPaths = [
    `M${x + w / 2 - MID_ARM},${y - 6} L${x + w / 2},${y + 4} L${x + w / 2 + MID_ARM},${y - 6}`,
    `M${x + w / 2 - MID_ARM},${y + h + 6} L${x + w / 2},${y + h - 4} L${x + w / 2 + MID_ARM},${y + h + 6}`,
    `M${x - 6},${y + h / 2 - MID_ARM} L${x + 4},${y + h / 2} L${x - 6},${y + h / 2 + MID_ARM}`,
    `M${x + w + 6},${y + h / 2 - MID_ARM} L${x + w - 4},${y + h / 2} L${x + w + 6},${y + h / 2 + MID_ARM}`,
  ];

  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} fill={edgeColor} fillOpacity={fillOpacity} rx={8} ry={8} />
      <Rect x={x} y={y} width={w} height={h} stroke={edgeColor} strokeWidth={strokeW} fill="transparent" strokeDasharray={dash} rx={8} ry={8} />
      {locked && arrowPaths.map((d, i) => (
        <Path key={`arr${i}`} d={d} stroke={edgeColor} strokeWidth={2} fill="transparent" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </G>
  );
}

// ─────────────────────────────────────────────────────────────
// SMART CAPTURE COUNTDOWN RING  (unchanged)
// ─────────────────────────────────────────────────────────────
interface SmartCaptureIndicatorProps {
  visible: boolean;
  durationMs?: number;
}

const RING_SIZE      = 88;
const RING_RADIUS    = 36;
const RING_STROKE    = 4;
const CIRCUMFERENCE  = 2 * Math.PI * RING_RADIUS;

function SmartCaptureIndicator({ visible, durationMs = CAPTURE_DELAY_MS }: SmartCaptureIndicatorProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) { progress.setValue(0); pulse.setValue(1); return; }

    Animated.timing(progress, {
      toValue: 1, duration: durationMs, useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 420, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 420, useNativeDriver: true }),
      ]),
    ).start();

    return () => { progress.stopAnimation(); pulse.stopAnimation(); };
  }, [visible]); // eslint-disable-line

  if (!visible) return null;

  const dashOffset = progress.interpolate({
    inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.smartCapContainer} pointerEvents="none">
      <Animated.View style={[styles.smartCapPulse, { transform: [{ scale: pulse }] }]} />
      <Svg width={RING_SIZE} height={RING_SIZE} style={styles.smartCapSvg}>
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke="rgba(255,255,255,0.15)" strokeWidth={RING_STROKE} fill="transparent"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke="#00FF88" strokeWidth={RING_STROKE} fill="transparent"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset as any}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.smartCapInner} pointerEvents="none">
        <Text style={styles.smartCapIcon}>⚡</Text>
      </View>
      <View style={styles.smartCapLabel}>
        <Text style={styles.smartCapLabelTxt}>SMART{'\n'}CAPTURE</Text>
      </View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const SmartDocumentScanner: React.FC<SmartDocumentScannerProps> = ({
  onImageCaptured, onClose,
}) => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const [zoom, setZoom]                       = useState(1.0);
  const zoomRef                               = useRef(1.0);
  const [regions, setRegions]                 = useState<ScoredRegion[]>([]);
  const [primaryRegion, setPrimaryRegion]     = useState<ScoredRegion | null>(null);
  const [docEdgeScreenBbox, setDocEdgeScreenBbox] = useState<BBox | null>(null);
  const regionsRef                            = useRef<ScoredRegion[]>([]);
  const [scanState, setScanState]             = useState<ScanState>({ phase: 'idle', guidance: 'Point camera at package label' });
  const scanStateRef                          = useRef<ScanState>(scanState);
  const isScanningRef                         = useRef(false);
  const capturedRef                           = useRef(false);
  const intervalRef                           = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureTimerRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { regionsRef.current = regions; }, [regions]);
  useEffect(() => { zoomRef.current    = zoom;    }, [zoom]);
  useEffect(() => { scanStateRef.current = scanState; }, [scanState]);

  const minZoom     = device?.minZoom ?? 1.0;
  const maxZoom     = useMemo(() => Math.min(device?.maxZoom ?? 6.0, 8.0), [device]);
  const neutralZoom = device?.neutralZoom ?? 1.0;

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then(granted => {
        if (!granted) {
          Alert.alert('Camera Permission Required', 'Please allow camera access.', [{ text: 'OK', onPress: onClose }]);
        } else {
          setZoom(neutralZoom);
          setScanState({ phase: 'scanning', guidance: 'Point camera at label' });
        }
      });
    } else {
      setZoom(neutralZoom);
      setScanState({ phase: 'scanning', guidance: 'Point camera at label' });
    }
    return () => stopScanLoop();
  }, []); // eslint-disable-line

  const stopScanLoop = useCallback(() => {
    if (intervalRef.current)    { clearInterval(intervalRef.current);  intervalRef.current    = null; }
    if (captureTimerRef.current){ clearTimeout(captureTimerRef.current); captureTimerRef.current = null; }
  }, []);

  const startScanLoop = useCallback(() => {
    stopScanLoop();
    capturedRef.current = false;
    intervalRef.current = setInterval(runScanFrame, SCAN_INTERVAL_MS);
  }, []); // eslint-disable-line

  const deleteTempFile = async (path: string | null) => {
    if (!path) return;
    try {
      const fp = path.startsWith('file://') ? path.slice(7) : path;
      if (await RNFS.exists(fp)) await RNFS.unlink(fp);
    } catch {}
  };

  function looksLikeShippingLabel(text: string): boolean {
    const t = text.toLowerCase();
    return (
      /ship|to|address|deliver|tracking|awb|order|phone|pin/.test(t) ||
      /\d{5,}/.test(t) ||
      text.split(' ').length >= 3
    );
  }

  // ─────────────────────────────────────────────────────────
  // runScanFrame  — iOS-patched
  //
  // Changes vs original:
  //
  //   iOS FIX 2 — takeSnapshot first on iOS
  //     VisionCamera v3 supports takeSnapshot on iOS. We try it
  //     and fall back to takePhoto if it throws.  This avoids
  //     HEIF output (which can cause ML Kit to silently return
  //     blocks=[]) and is much faster (no full-sensor capture).
  //
  //   iOS FIX 4 — getPhotoSize()
  //     Reads actual JPEG dimensions when photo.width/height are
  //     missing, so scaleToScreen() uses correct pixel coords.
  //
  //   iOS FIX 1 — extractBBoxFromBlock()
  //     Replaces direct f.x/f.y access with the multi-fallback
  //     extractor (handles left/top, cornerPoints, line frames,
  //     and 0-1 normalised coordinates).
  //
  //   iOS FIX 3 — buildSyntheticRegions()
  //     When blocks[] is empty but mlkitResult.text is non-empty,
  //     synthesise estimated line-level bounding boxes so the
  //     whole detection pipeline continues to function.
  //
  // All scoring / merging / zoom / phase logic is 100% unchanged.
  // ─────────────────────────────────────────────────────────
  const runScanFrame = useCallback(async () => {
    const phase = scanStateRef.current.phase;
    if (
      isScanningRef.current ||
      capturedRef.current   ||
      !cameraRef.current    ||
      ['capturing', 'done'].includes(phase)
    ) return;

    isScanningRef.current = true;
    let currentPhotoPath: string | null = null;

    try {
      // ── 1. Take a frame snapshot ────────────────────────────
      // iOS FIX 2: try takeSnapshot first — it returns JPEG at low quality
      // which is (a) fast and (b) reliably parsed by ML Kit on iOS.
      // takeSnapshot is available on iOS in VisionCamera v3+.
      let photo: { path: string; width?: number; height?: number };

      if (Platform.OS === 'android') {
        photo = await (cameraRef.current as any).takeSnapshot({
          quality: 30,
          skipMetadata: true,
        });
      } else {
        // iOS — prefer takeSnapshot (JPEG, fast), fall back to takePhoto
        try {
          photo = await (cameraRef.current as any).takeSnapshot({
            quality: 35,
            skipMetadata: true,
          });
        } catch (_snapErr) {
          // takeSnapshot not available on this VisionCamera version — fall back
          console.log('[iOS-OCR] takeSnapshot unavailable, using takePhoto');
          photo = await cameraRef.current.takePhoto({
            qualityPrioritization: 'speed',
            enableShutterSound: false,
            flash: 'off',
            skipMetadata: true,
          });
        }
      }

      currentPhotoPath = photo.path;

      // ── 2. Ensure path has file:// prefix ───────────────────
      const mlkitPath = currentPhotoPath.startsWith('file://')
        ? currentPhotoPath
        : `file://${currentPhotoPath}`;

      // ── 3. Run OCR ──────────────────────────────────────────
      const mlkitResult: TextRecognitionResult = await TextRecognition.recognize(mlkitPath);

      // iOS FIX 5: diagnostic — log raw bridge output once per session
      if (Platform.OS === 'ios') {
        const blockCount = mlkitResult?.blocks?.length ?? 0;
        const textLen    = mlkitResult?.text?.length   ?? 0;
        console.log(
          `[iOS-OCR] blocks=${blockCount}  text.length=${textLen}` +
          (blockCount > 0
            ? `  block[0].frame=${JSON.stringify((mlkitResult.blocks[0] as any)?.frame)}` +
              `  block[0].cornerPoints=${JSON.stringify((mlkitResult.blocks[0] as any)?.cornerPoints)}`
            : ''),
        );
      }

      // Delete temp snapshot immediately
      await deleteTempFile(currentPhotoPath);
      currentPhotoPath = null;

      // iOS FIX 4: get correct image dimensions
      const { width: imgW, height: imgH } = await getPhotoSize(
        mlkitPath,
        photo.width  ?? 0,
        photo.height ?? 0,
      );

      const prevRegions = regionsRef.current;

      // ── 4. Build scored regions ─────────────────────────────
      let scored: ScoredRegion[] = [];

      const hasBlocks = Array.isArray(mlkitResult?.blocks) && mlkitResult.blocks.length > 0;

      if (hasBlocks) {
        // ── Normal path: blocks returned (Android + some iOS) ──
        // iOS FIX 1: use extractBBoxFromBlock instead of direct frame access
        scored = mlkitResult.blocks
          .filter((block: TextBlock) => {
            const text = block.text ?? '';
            if (!looksLikeShippingLabel(text)) return false;
            // Accepts any block with ANY frame data; extractor handles the rest
            const hasSomeFrame =
              !!(block as any)?.frame ||
              !!(block as any)?.cornerPoints ||
              (Array.isArray((block as any)?.lines) && (block as any).lines.length > 0);
            return hasSomeFrame;
          })
          .map((block: TextBlock) => {
            const bbox = extractBBoxFromBlock(block, imgW, imgH);
            if (!bbox) return null;
            const prev = prevRegions.find(r => computeIoU(r.bbox, bbox) > IOU_STABLE_THRESH);
            return {
              bbox,
              screenBbox:   scaleToScreen(bbox, imgW, imgH, SW, SH),
              text:         block.text,
              score:        scoreRegion(bbox, block.text, imgW, imgH, prevRegions),
              stableFrames: prev ? prev.stableFrames + 1 : 1,
            } as ScoredRegion;
          })
          .filter((r): r is ScoredRegion => r !== null);

      } else if (Platform.OS === 'ios' && mlkitResult?.text?.trim()) {
        // iOS FIX 3: blocks[] empty but text exists → synthesise regions
        console.log('[iOS-OCR] blocks empty, using synthetic fallback for text:', mlkitResult.text.slice(0, 80));
        scored = buildSyntheticRegions(mlkitResult.text, imgW, imgH, prevRegions);
      }

      // ── 5. Guard: nothing detected ───────────────────────────
      if (!scored.length) {
        setScanState({ phase: 'scanning', guidance: 'Looking for text…' });
        setRegions([]);
        setPrimaryRegion(null);
        setDocEdgeScreenBbox(null);
        isScanningRef.current = false;
        return;
      }

      scored.sort((a, b) => b.score - a.score);

      const docBbox      = mergeTopRegions(scored, 5, imgW, imgH);
      const combinedText = scored.slice(0, 5).map(r => r.text).join(' ');

      const isLabel = looksLikeShippingLabel(combinedText);
      if (!isLabel) {
        console.log('[Scanner] Weak label confidence, but continuing...');
      }

      const primary = scored[0] ?? null;
      setRegions(scored);
      setPrimaryRegion(primary);

      if (docBbox) {
        setDocEdgeScreenBbox(scaleToScreen(docBbox, imgW, imgH, SW, SH));
      } else {
        setDocEdgeScreenBbox(null);
      }

      // ── 6. Phase / zoom logic — 100% unchanged ───────────────
      if (docBbox && primary) {
        const targetZoom = computeTargetZoom(docBbox, imgW, imgH, zoomRef.current, minZoom, maxZoom);
        const nextZoom = lerp(zoomRef.current, targetZoom, ZOOM_LERP_SPEED);

        const MAX_STEP = 0.15;
        const clampedZoom =
          Math.abs(nextZoom - zoomRef.current) > MAX_STEP
            ? zoomRef.current + Math.sign(nextZoom - zoomRef.current) * MAX_STEP
            : nextZoom;

        setZoom(Math.max(minZoom, Math.min(clampedZoom, maxZoom)));

        const ratio = (docBbox.width * docBbox.height) / (imgW * imgH);

        if (ratio < REGION_TOO_SMALL) {
          setScanState({ phase: 'scanning', guidance: 'Getting closer…' });
        } else if (ratio > REGION_TOO_LARGE) {
          setScanState({ phase: 'scanning', guidance: 'Move back slightly' });
        } else if (primary.stableFrames >= STABILITY_FRAMES && !capturedRef.current) {
          setScanState({ phase: 'locking', guidance: '✓  Hold steady…' });
          if (!captureTimerRef.current) {
            captureTimerRef.current = setTimeout(() => {
              captureTimerRef.current = null;
              if (!capturedRef.current) triggerCapture();
            }, CAPTURE_DELAY_MS);
          }
        } else {
          if (scanStateRef.current.phase !== 'locking') {
            setScanState({ phase: 'scanning', guidance: 'Hold steady…' });
          }
        }
      } else {
        setScanState({ phase: 'scanning', guidance: 'Align label in frame' });
      }

    } catch (err: any) {
      if (
        err?.message &&
        !err.message.includes('Camera is not ready') &&
        !err.message.includes('capture-already-in-progress')
      ) {
        console.warn('[Scanner] scan frame error:', err.message);
      }
      if (currentPhotoPath) deleteTempFile(currentPhotoPath);
    } finally {
      isScanningRef.current = false;
    }
  }, [minZoom, maxZoom]); // eslint-disable-line

  useEffect(() => {
    if (hasPermission && device) startScanLoop();
    return stopScanLoop;
  }, [hasPermission, device, startScanLoop, stopScanLoop]);

  const triggerCapture = useCallback(async () => {
    if (capturedRef.current || !cameraRef.current) return;
    capturedRef.current = true;
    stopScanLoop();
    setScanState({ phase: 'capturing', guidance: 'Capturing image…' });

    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        enableShutterSound: true,
        flash: 'off',
      });
      const imagePath = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      setScanState({ phase: 'done', guidance: 'Done!' });
      onImageCaptured(imagePath);
    } catch (err: any) {
      console.error('[Scanner] capture error:', err);
      capturedRef.current = false;
      setScanState({ phase: 'scanning', guidance: 'Capture failed — try again' });
      Alert.alert('Scan Failed', err?.message ?? 'Could not capture.');
      startScanLoop();
    }
  }, [onImageCaptured, startScanLoop, stopScanLoop]);

  if (!hasPermission) return (
    <View style={styles.fullScreen}>
      <ActivityIndicator size="large" color="#61B3E4" />
      <Text style={styles.permText}>Requesting camera permission…</Text>
    </View>
  );
  if (!device) return (
    <View style={styles.fullScreen}>
      <Text style={styles.permText}>No camera device found</Text>
      <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
        <Text style={styles.closeTxt}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const isLocking = scanState.phase === 'locking';
  const isBusy    = scanState.phase === 'capturing';
  const pColor    = isLocking ? '#00FF88' : '#61B3E4';

  return (
    <View style={styles.fullScreen}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        photo
        zoom={zoom}
        enableZoomGesture={false}
      />

      {/* ── SVG overlay ───────────────────────────────────── */}
      <Svg style={StyleSheet.absoluteFill} width={SW} height={SH} pointerEvents="none">
        <Defs>
          <LinearGradient id="edgeGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={isLocking ? '#00FF88' : '#61B3E4'} stopOpacity="0.6" />
            <Stop offset="1" stopColor={isLocking ? '#00FF88' : '#61B3E4'} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>

        {/* Edge Detection Overlay */}
        {docEdgeScreenBbox && (
          <EdgeDetectionOverlay bbox={docEdgeScreenBbox} phase={scanState.phase} />
        )}

        {/* Secondary region indicators */}
        {regions.slice(1).map((r, i) => (
          <Rect
            key={`s${i}`}
            x={r.screenBbox.x}     y={r.screenBbox.y}
            width={r.screenBbox.width} height={r.screenBbox.height}
            stroke="rgba(255,255,255,0.4)" strokeWidth={1}
            fill="transparent" strokeDasharray="5 4" rx={3} ry={3}
          />
        ))}

        {/* Primary region + corner markers */}
        {primaryRegion && (
          <G>
            <Rect
              x={primaryRegion.screenBbox.x}     y={primaryRegion.screenBbox.y}
              width={primaryRegion.screenBbox.width} height={primaryRegion.screenBbox.height}
              stroke={pColor} strokeWidth={isLocking ? 3 : 2}
              fill={isLocking ? 'rgba(0,255,136,0.08)' : 'rgba(97,179,228,0.08)'}
              rx={5} ry={5}
            />
            <CornerMarkers bbox={primaryRegion.screenBbox} locked={isLocking} />
          </G>
        )}

        {/* Idle placeholder */}
        {!primaryRegion && (
          <Rect
            x={SW * 0.08} y={SH * 0.25} width={SW * 0.84} height={SH * 0.50}
            stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}
            fill="transparent" strokeDasharray="8 6" rx={8} ry={8}
          />
        )}
      </Svg>

      {/* Smart Capture Countdown Ring */}
      <SmartCaptureIndicator visible={isLocking} durationMs={CAPTURE_DELAY_MS} />

      {/* Edge Detected badge */}
      {docEdgeScreenBbox && scanState.phase === 'scanning' && (
        <View style={styles.edgeBadge}>
          <Text style={styles.edgeBadgeTxt}>⬡  EDGE DETECTED</Text>
        </View>
      )}

      {/* Guidance banner */}
      <View style={[styles.guidanceBanner, isLocking && styles.guidanceLocking]}>
        <Text style={styles.guidanceTxt}>{scanState.guidance}</Text>
      </View>

      {/* Zoom badge */}
      {zoom > 1.08 && (
        <View style={styles.zoomBadge}>
          <Text style={styles.zoomTxt}>{zoom.toFixed(1)}×</Text>
        </View>
      )}

      {/* Busy overlay */}
      {isBusy && (
        <View style={styles.busyOverlay}>
          <View style={styles.busyCard}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.busyTxt}>Capturing…</Text>
          </View>
        </View>
      )}

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeCircle}
        onPress={() => { stopScanLoop(); onClose(); }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.closeTxt}>✕</Text>
      </TouchableOpacity>

      {/* Shutter button */}
      <View style={styles.shutterRow}>
        <TouchableOpacity
          style={[styles.shutterBtn, isBusy && styles.shutterDisabled]}
          onPress={triggerCapture}
          disabled={isBusy}
          activeOpacity={0.8}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>

      {/* Hint row */}
      {!isBusy && (
        <View style={styles.hintRow}>
          <Text style={styles.hintTxt}>
            {primaryRegion
              ? `Auto-capture in ${Math.max(0, STABILITY_FRAMES - primaryRegion.stableFrames + 1)} stable frames  •  or tap ⬤`
              : 'Tap ⬤ to capture manually (V1.1)'}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fullScreen:      { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  permText:        { color: '#fff', fontSize: 16, marginTop: 16, textAlign: 'center', paddingHorizontal: 32 },
  guidanceBanner:  { position: 'absolute', top: 56, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.60)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  guidanceLocking: { backgroundColor: 'rgba(0,60,30,0.75)', borderColor: '#00FF88' },
  guidanceTxt:     { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },
  zoomBadge:       { position: 'absolute', top: 110, right: 20, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  zoomTxt:         { color: '#FFD700', fontSize: 13, fontWeight: '700' },
  busyOverlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  busyCard:        { backgroundColor: 'rgba(20,20,20,0.92)', borderRadius: 20, padding: 28, alignItems: 'center', gap: 14, minWidth: 200 },
  busyTxt:         { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  closeCircle:     { position: 'absolute', top: 48, left: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.60)', justifyContent: 'center', alignItems: 'center' },
  closeTxt:        { color: '#fff', fontSize: 17, fontWeight: '700' },
  shutterRow:      { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  shutterBtn:      { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  shutterDisabled: { opacity: 0.35 },
  shutterInner:    { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.90)' },
  hintRow:         { position: 'absolute', bottom: 16, width: '100%', paddingHorizontal: 24, alignItems: 'center' },
  hintTxt:         { color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center' },

  edgeBadge: {
    position: 'absolute', top: 108, alignSelf: 'center',
    backgroundColor: 'rgba(0,30,60,0.72)', borderWidth: 1, borderColor: '#223890',
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14,
  },
  edgeBadgeTxt: { color: '#223890', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  smartCapContainer: {
    position: 'absolute',
    top: SH / 2 - RING_SIZE / 2 - 40,
    alignSelf: 'center',
    alignItems: 'center',
    width: RING_SIZE,
  },
  smartCapPulse: {
    position: 'absolute',
    width: RING_SIZE + 16, height: RING_SIZE + 16,
    borderRadius: (RING_SIZE + 16) / 2,
    borderWidth: 2, borderColor: 'rgba(0,255,136,0.30)',
    top: -8, left: -8,
  },
  smartCapSvg:   {},
  smartCapInner: { position: 'absolute', width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center' },
  smartCapIcon:  { fontSize: 26 },
  smartCapLabel: { marginTop: 6, backgroundColor: 'rgba(0,60,30,0.80)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#00FF88' },
  smartCapLabelTxt: { color: '#00FF88', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
});

export default SmartDocumentScanner;