import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  useCameraFormat,
} from 'react-native-vision-camera';
import MlkitOcr, { MlkitOcrResult } from 'react-native-mlkit-ocr';
import RNFS from 'react-native-fs';
import Svg, { Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { GOOGLE_VISION_API_KEY, GEMINI_API_KEY } from '@env';

import {
  CODE_TYPES,
  ScannedCode,
  SeenCodes,
  addCode,
  rankCodes,
  kindLabel,
  codeDisplayText,
  detectCarrierFromTrackingNumber,
} from '../utilities/codeParser';
import { ScanMode, isCodeAcceptable } from '../utilities/scanMode';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');

// Loop timing (self-scheduling: this is the pause AFTER a frame finishes)
const SCAN_INTERVAL_MS = 120;
const STABILITY_FRAMES = 2;
const CAPTURE_DELAY_MS = 150;
const CODE_CAPTURE_DELAY_MS = 60;

const IOU_STABLE_THRESH = 0.45;
const REGION_TOO_SMALL = 0.40;
const REGION_TOO_LARGE = 0.75;
const REGION_TARGET = 0.55;
const ZOOM_LERP_SPEED = 0.35;
const ZOOM_DEAD_BAND = 0.06;
const CORNER_ARM = 22;
const CORNER_SW = 3;

const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Network + OCR speed settings
const GEMINI_TIMEOUT_MS = 8000;
const VISION_TIMEOUT_MS = 8000;
const MIN_ONDEVICE_OCR_CHARS = 20; // below this, fall back to Cloud Vision

const PLATE_CONSENSUS_WINDOW = 5;
const PLATE_CONSENSUS_MIN = 2;
const PLATE_STUCK_TIMEOUT_MS = 5000;

const CODE_CAPTURE_MIN_SIGHTINGS = 1;

const MAX_SESSION_RETRIES = 3;
const SESSION_RETRY_DELAY_MS = 1500;

const ACCENT = '#61B3E4';
const ACCENT_LOCKED = '#00FF88';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScoredRegion {
  bbox: BBox;
  screenBbox: BBox;
  text: string;
  score: number;
  stableFrames: number;
}

type ScanPhase = 'idle' | 'scanning' | 'locking' | 'capturing' | 'done';
interface ScanState {
  phase: ScanPhase;
  guidance: string;
}

export interface GeminiExtractionResult {
  recipient_name: string;
  ship_name: string;
  carrier: string;
  tracking_number: string;
  shipper: string;
  address: string;
  phone: string;
}

export const EMPTY_EXTRACTION: GeminiExtractionResult = {
  recipient_name: '',
  ship_name: '',
  carrier: '',
  tracking_number: '',
  shipper: '',
  address: '',
  phone: '',
};

export interface SmartDocumentScannerProps {
  onImageCaptured: (
    imagePath: string,
    consensusPlate?: string | null,
    scannedCode?: ScannedCode | null,
  ) => void;
  onClose: () => void;
  scanMode: ScanMode;
}

// ─────────────────────────────────────────────────────────────
// PURE UTILITIES
// ─────────────────────────────────────────────────────────────
function computeIoU(a: BBox, b: BBox): number {
  const xL = Math.max(a.x, b.x);
  const yT = Math.max(a.y, b.y);
  const xR = Math.min(a.x + a.width, b.x + b.width);
  const yB = Math.min(a.y + a.height, b.y + b.height);
  if (xR <= xL || yB <= yT) return 0;
  const inter = (xR - xL) * (yB - yT);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function normalizeSplitTbaTracking(text: string): string {
  if (!text) return '';
  return text.replace(
    /\b(TB[AMC]\d{6,10})[\s\r\n]+(\d{3,7})\b/gi,
    (_m, p1, p2) => `${p1}${p2}`,
  );
}

const US_PLATE_REGEX = /\b[A-Z0-9]{1,3}[-\s]?[A-Z0-9]{3,5}\b/i;
const cleanPlateText = (raw: string) =>
  raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

const PLATE_EXCLUDE_WORDS = new Set([
  'CALIFORNIA', 'NEWYORK', 'TEXAS', 'FLORIDA', 'OHIO', 'GEORGIA',
  'ILLINOIS', 'PENNSYLVANIA', 'MICHIGAN', 'NEVADA', 'ARIZONA',
  'WASHINGTON', 'VIRGINIA', 'MARYLAND', 'COLORADO', 'OREGON', 'UTAH',
  'INDIANA', 'MISSOURI', 'TENNESSEE', 'WISCONSIN', 'MINNESOTA',
  'ALABAMA', 'LOUISIANA', 'KENTUCKY', 'OKLAHOMA', 'CONNECTICUT',
  'MASSACHUSETTS', 'NEWJERSEY', 'SOUTHCAROLINA', 'NORTHCAROLINA',
  'EXPIRES', 'EXPIRATION', 'REGISTRATION', 'MONTH', 'YEAR', 'USA',
  'UNITEDSTATES', 'GARDENSTATE', 'SUNSHINESTATE', 'GOLDENSTATE',
  'EMPIRESTATE', 'SILVERSTATE', 'LONESTARSTATE',
]);

const PLATE_ASPECT_RATIO = 2.1;

function computeExpectedPlateRegion(imgW: number, imgH: number): BBox {
  const width = imgW * 0.72;
  const height = width / PLATE_ASPECT_RATIO;
  return { x: (imgW - width) / 2, y: imgH * 0.33, width, height };
}

function bboxContainsCenter(outer: BBox, inner: BBox, paddingRatio = 0.2): boolean {
  const padX = outer.width * paddingRatio;
  const padY = outer.height * paddingRatio;
  const left = outer.x - padX;
  const top = outer.y - padY;
  const right = outer.x + outer.width + padX;
  const bottom = outer.y + outer.height + padY;
  const cx = inner.x + inner.width / 2;
  const cy = inner.y + inner.height / 2;
  return cx >= left && cx <= right && cy >= top && cy <= bottom;
}

export function extractPlateCandidateFromFocusedBlocks(
  blocks: { bbox: BBox; text: string }[],
  focusBbox: BBox | null,
): string | null {
  if (!blocks.length) return null;
  const relevant = focusBbox
    ? blocks.filter(b => bboxContainsCenter(focusBbox, b.bbox))
    : blocks;
  if (!relevant.length) return null;
  return extractPlateCandidate(relevant.map(b => b.text).join('\n'));
}

export function extractPlateCandidate(ocrText: string): string | null {
  if (!ocrText) return null;
  const lines = ocrText.split(/\r?\n/);
  const candidates: { text: string; score: number }[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const cleaned = cleanPlateText(trimmed);
    if (cleaned.length < 5 || cleaned.length > 8) continue;
    if (PLATE_EXCLUDE_WORDS.has(cleaned)) continue;

    const hasDigit = /[0-9]/.test(cleaned);
    const hasAlpha = /[A-Z]/.test(cleaned);
    const mixBonus = hasDigit && hasAlpha ? 2 : 0;
    const noisePenalty = (trimmed.length - cleaned.length) * 0.5;
    candidates.push({ text: cleaned, score: cleaned.length + mixBonus - noisePenalty });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].text;
}

export interface PlateVoteResult {
  value: string;
  confidence: number;
  exactMajority: boolean;
}

export function votePlateCandidates(candidates: string[]): PlateVoteResult | null {
  const clean = candidates.filter(Boolean);
  if (!clean.length) return null;

  const exactFreq = new Map<string, number>();
  for (const c of clean) exactFreq.set(c, (exactFreq.get(c) ?? 0) + 1);

  let bestExact: string | null = null;
  let bestExactCount = 0;
  for (const [val, count] of exactFreq) {
    if (count > bestExactCount) {
      bestExact = val;
      bestExactCount = count;
    }
  }
  if (bestExact && bestExactCount >= PLATE_CONSENSUS_MIN) {
    return { value: bestExact, confidence: bestExactCount / clean.length, exactMajority: true };
  }

  const lenFreq = new Map<number, number>();
  for (const c of clean) lenFreq.set(c.length, (lenFreq.get(c.length) ?? 0) + 1);
  let modalLen = 0;
  let modalLenCount = 0;
  for (const [len, count] of lenFreq) {
    if (count > modalLenCount) {
      modalLen = len;
      modalLenCount = count;
    }
  }
  const sameLen = clean.filter(c => c.length === modalLen);
  if (sameLen.length < PLATE_CONSENSUS_MIN) return null;

  let fused = '';
  for (let i = 0; i < modalLen; i++) {
    const charFreq = new Map<string, number>();
    for (const c of sameLen) charFreq.set(c[i], (charFreq.get(c[i]) ?? 0) + 1);
    let bestChar = '';
    let bestCharCount = 0;
    for (const [ch, count] of charFreq) {
      if (count > bestCharCount) {
        bestChar = ch;
        bestCharCount = count;
      }
    }
    fused += bestChar;
  }
  return {
    value: fused,
    confidence: sameLen.length / clean.length,
    exactMajority: false,
  };
}

function scoreRegion(
  bbox: BBox,
  text: string,
  imgW: number,
  imgH: number,
  prevRegions: ScoredRegion[],
  plateMode: boolean = false,
): number {
  const boxArea = bbox.width * bbox.height;
  const textDensity = Math.min((text.length * 1000) / Math.max(boxArea, 1), 1);
  const normalizedArea = Math.min(boxArea / (imgW * imgH), 1);
  const cx = (bbox.x + bbox.width / 2) / imgW;
  const cy = (bbox.y + bbox.height / 2) / imgH;
  const centerProximity = Math.max(0, 1 - Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2) * 2);
  const prev = prevRegions.find(r => computeIoU(r.bbox, bbox) > IOU_STABLE_THRESH);
  const stability = prev ? Math.min(prev.stableFrames / 10, 1) : 0;

  let plateBonus = 0;
  if (plateMode) {
    const cleaned = cleanPlateText(text);
    if (cleaned.length >= 5 && cleaned.length <= 8 && US_PLATE_REGEX.test(text)) {
      plateBonus = 0.5;
    }
  }
  return (
    textDensity * 0.35 +
    normalizedArea * 0.25 +
    centerProximity * 0.25 +
    stability * 0.15 +
    plateBonus
  );
}

function scaleToScreen(
  bbox: BBox,
  imgW: number,
  imgH: number,
  screenW: number,
  screenH: number,
): BBox {
  let eW = imgW;
  let eH = imgH;
  const sp = screenH > screenW;
  const il = imgW > imgH;
  if (sp && il) {
    eW = imgH;
    eH = imgW;
  }
  let { x, y, width: w, height: h } = bbox;
  if (sp && il) {
    const nx = bbox.y;
    const ny = imgW - bbox.x - bbox.width;
    x = nx;
    y = ny;
    w = bbox.height;
    h = bbox.width;
  }
  return {
    x: x * (screenW / eW),
    y: y * (screenH / eH),
    width: w * (screenW / eW),
    height: h * (screenH / eH),
  };
}

function mergeTopRegions(
  regions: ScoredRegion[],
  topN: number,
  imgW: number,
  imgH: number,
): BBox | null {
  const top = regions.slice(0, Math.min(regions.length, topN));
  if (!top.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of top) {
    minX = Math.min(minX, r.bbox.x);
    minY = Math.min(minY, r.bbox.y);
    maxX = Math.max(maxX, r.bbox.x + r.bbox.width);
    maxY = Math.max(maxY, r.bbox.y + r.bbox.height);
  }
  const padX = (maxX - minX) * 0.15;
  const padY = (maxY - minY) * 0.15;
  return {
    x: Math.max(0, minX - padX),
    y: Math.max(0, minY - padY),
    width: Math.min(imgW - Math.max(0, minX - padX), maxX - minX + padX * 2),
    height: Math.min(imgH - Math.max(0, minY - padY), maxY - minY + padY * 2),
  };
}

function computeTargetZoom(
  d: BBox,
  imgW: number,
  imgH: number,
  cur: number,
  min: number,
  max: number,
): number {
  const ratio = (d.width * d.height) / (imgW * imgH);
  if (ratio >= REGION_TOO_SMALL && ratio <= REGION_TOO_LARGE) return cur;
  return Math.min(
    Math.max(cur * Math.sqrt(REGION_TARGET / Math.max(ratio, 0.01)), min),
    max,
  );
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Generic UI strings — same for every mode. */
function modeStrings(_mode: ScanMode) {
  return {
    initial: 'Scan number or code',
    looking: 'Scanning…',
    align: 'Align inside the frame',
  };
}

/** fetch with a hard timeout so a slow network never hangs the UI. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────
// GUIDE FRAME — shape only varies, text stays generic
// ─────────────────────────────────────────────────────────────
interface GuideDims {
  width: number;
  height: number;
  y: number;
  radius: number;
}

function computeGuideDims(mode: ScanMode): GuideDims {
  if (mode === 'plate') {
    const w = SW * 0.85;
    return { width: w, height: w / 2.1, y: SH * 0.38, radius: 10 };
  }
  if (mode === 'generic') {
    const w = SW * 0.7;
    return { width: w, height: w, y: SH * 0.26, radius: 16 };
  }
  return { width: SW * 0.82, height: SH * 0.5, y: SH * 0.24, radius: 12 };
}

// ─────────────────────────────────────────────────────────────
// CLOUD VISION (now only a FALLBACK when on-device OCR is weak)
// ─────────────────────────────────────────────────────────────
export async function callCloudVision(
  imagePath: string,
): Promise<{ text: string; confidence: number }> {
  const fsPath = imagePath.startsWith('file://') ? imagePath.slice(7) : imagePath;
  const base64 = await RNFS.readFile(fsPath, 'base64');
  const response = await fetchWithTimeout(
    VISION_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: {
              languageHints: ['en'],
              textDetectionParams: { enableTextDetectionConfidenceScore: true },
            },
          },
        ],
      }),
    },
    VISION_TIMEOUT_MS,
  );
  const data = await response.json();
  if (data.error) throw new Error(data.error.message ?? 'Cloud Vision error');
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  return {
    text: annotation?.text ?? '',
    confidence: annotation?.pages?.[0]?.confidence ?? 0,
  };
}

/** On-device OCR over a captured file. Fast, free, no upload. */
export async function runOnDeviceOcr(imagePath: string): Promise<string> {
  const path = imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`;
  const blocks: MlkitOcrResult = await MlkitOcr.detectFromFile(path);
  return (blocks ?? []).map(b => b.text).join('\n');
}

// ─────────────────────────────────────────────────────────────
// GEMINI PROMPTS
// ─────────────────────────────────────────────────────────────
export const buildGeminiPlatePrompt = (ocrText: string, consensusHint?: string | null) =>
  `You are a US vehicle license plate parser.

Extract the primary USA car license plate number from the given OCR text.
Standard US license plates have 5 to 8 characters (letters and numbers). 
Ignore state slogans, dates, state names (e.g. "CALIFORNIA", "NEW YORK"), registration stickers, or frame text.
${
  consensusHint
    ? `\nA multi-frame on-device consensus pass produced this best-guess candidate: "${consensusHint}". Treat it as a strong prior, but override it if the OCR text clearly shows a different, more complete reading.\n`
    : ''
}
Return ONLY valid JSON:
{
  "recipient_name": "",
  "ship_name": "",
  "carrier": "License Plate",
  "tracking_number": "<THE_CAR_PLATE_NUMBER>",
  "shipper": "",
  "address": "",
  "phone": ""
}

RULES:
- Uppercase, remove spaces/dashes (e.g. "7XYZ123").
- Store plate directly in "tracking_number".
- All other fields except "carrier" must remain empty strings.

OCR TEXT:
${ocrText}
`;

export const buildGeminiLabelPrompt = (ocrText: string, shipNames: string) =>
  `You are a shipping label parser for cruise deliveries.

VALID SHIPS LIST:
${shipNames}

Extract fields from OCR text. Return ONLY valid JSON.

FIELDS:
1. recipient_name: Person receiving package (Usually under "SHIP TO", NEVER include ship name)
2. ship_name: Name of cruise ship
3. carrier: Delivery company (Amazon, FedEx, UPS, DHL, SpeedX)
4. tracking_number: Exact tracking ID. Combine split Amazon TBA numbers.
5. shipper: Sender/company name if available
6. address: Delivery address
7. phone: Phone number if present

OCR TEXT:
${ocrText}

OUTPUT:
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

export const buildGeminiGenericIdPrompt = (ocrText: string) =>
  `You are an ID/tag parser for hotel operations (luggage tags, rental tags, lost-and-found tags, valet tickets).

Extract the single primary alphanumeric identifier (tag number, ticket number, asset ID, plate number) from the OCR text.
Return ONLY valid JSON:
{
  "recipient_name": "<guest/person name if clearly present, else empty>",
  "ship_name": "",
  "carrier": "",
  "tracking_number": "<PRIMARY_ID>",
  "shipper": "",
  "address": "",
  "phone": ""
}

RULES:
- Uppercase the ID and remove spaces.
- Prefer the ID printed next to or under a barcode.
- Leave a field empty when unsure. Never invent values.

OCR TEXT:
${ocrText}
`;

export function robustParseGeminiJson(
  raw: string,
): GeminiExtractionResult | null {
  const normalise = (p: any): GeminiExtractionResult => ({
    recipient_name: String(p.recipient_name ?? '').trim(),
    ship_name: String(p.ship_name ?? '').trim(),
    carrier: String(p.carrier ?? '').trim(),
    tracking_number: String(p.tracking_number ?? '').trim(),
    shipper: String(p.shipper ?? '').trim(),
    address: String(p.address ?? '').trim(),
    phone: String(p.phone ?? '').trim(),
  });
  try {
    const p = JSON.parse(raw.trim());
    if (p && typeof p === 'object') return normalise(p);
  } catch {}
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    const p = JSON.parse(stripped);
    if (p && typeof p === 'object') return normalise(p);
  } catch {}
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const p = JSON.parse(stripped.slice(start, end + 1));
      if (p && typeof p === 'object') return normalise(p);
    } catch {}
  }
  return null;
}

/** One Gemini HTTP call. `fast` adds JSON mime type + thinking disabled. */
async function postGemini(prompt: string, fast: boolean): Promise<Response> {
  const generationConfig: Record<string, any> = {
    temperature: 0.0,
    topK: 1,
    topP: 1,
    maxOutputTokens: 256,
  };
  if (fast) {
    generationConfig.responseMimeType = 'application/json';
    // Disables "thinking" latency on models that support it.
    // If the model rejects this field we retry without it (see below).
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  return fetchWithTimeout(
    GEMINI_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    },
    GEMINI_TIMEOUT_MS,
  );
}

export async function callGeminiExtraction(
  ocrText: string,
  shipList: { name: string }[] = [],
  scanMode: ScanMode = 'label',
  consensusPlateHint?: string | null,
  scannedCode?: ScannedCode | null,
): Promise<GeminiExtractionResult> {
  if (!ocrText.trim() && !scannedCode) {
    console.warn('[Gemini] No OCR text and no scanned code, skipping.');
    return EMPTY_EXTRACTION;
  }

  const barcodeHintText =
    scannedCode?.confident
      ? `\nA camera barcode read produced: "${scannedCode.value}" (kind=${scannedCode.kind}, symbology=${scannedCode.symbology}). ` +
        `This value is authoritative for the tracking/ticket ID — do not overrule it from OCR.\n`
      : '';

  let prompt: string;
  if (scanMode === 'plate') {
    prompt = buildGeminiPlatePrompt(ocrText, consensusPlateHint);
  } else if (scanMode === 'generic') {
    prompt = buildGeminiGenericIdPrompt(ocrText);
  } else {
    prompt = buildGeminiLabelPrompt(
      normalizeSplitTbaTracking(ocrText),
      shipList.map(s => s.name).join(', '),
    );
  }
  prompt += barcodeHintText;

  const t0 = Date.now();
  try {
    console.log(
      `[Gemini] Calling ${GEMINI_MODEL}… (mode=${scanMode}, barcode=${scannedCode?.kind ?? 'none'})`,
    );

    let response = await postGemini(prompt, true);

    // If the fast config (thinkingConfig / responseMimeType) is rejected, retry plain.
    if (response.status === 400) {
      const errBody = await response.text();
      console.warn('[Gemini] 400 with fast config, retrying plain:', errBody.slice(0, 200));
      response = await postGemini(prompt, false);
    }

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${errBody.slice(0, 300)}`);
    }
    const data = await response.json();
    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const result = robustParseGeminiJson(rawText);
    console.log(`[Gemini] done in ${Date.now() - t0}ms`);
    if (!result) return EMPTY_EXTRACTION;
    console.log('[Gemini] Extracted →', JSON.stringify(result));
    return result;
  } catch (err: any) {
    console.error('[Gemini] Extraction failed:', err?.message ?? err);
    return EMPTY_EXTRACTION;
  }
}

// ─────────────────────────────────────────────────────────────
// FAST POST-CAPTURE PIPELINE
// Call this from the parent's onImageCaptured instead of
// callCloudVision + callGeminiExtraction.
//
//   1. Barcode/plate shortcut → no network at all
//   2. On-device ML Kit OCR on the captured photo
//   3. Cloud Vision ONLY if on-device text is too short
//   4. Gemini for structured parsing
// ─────────────────────────────────────────────────────────────
export interface FastExtractionOptions {
  scanMode: ScanMode;
  shipList?: { name: string }[];
  consensusPlate?: string | null;
  scannedCode?: ScannedCode | null;
  /**
   * When true (default) and a confident barcode / plate consensus already
   * gives us the ID, return instantly without calling Gemini.
   * Set false in label mode if you always need name/address from the label.
   */
  skipLlmWhenCodeKnown?: boolean;
}

export async function runFastExtraction(
  imagePath: string,
  opts: FastExtractionOptions,
): Promise<GeminiExtractionResult> {
  const {
    scanMode,
    shipList = [],
    consensusPlate = null,
    scannedCode = null,
    skipLlmWhenCodeKnown = true,
  } = opts;
  const tStart = Date.now();

  // ── 1. Instant shortcuts ──────────────────────────────
  if (skipLlmWhenCodeKnown) {
    if (scanMode === 'plate' && consensusPlate) {
      console.log('[Fast] plate consensus shortcut');
      return {
        ...EMPTY_EXTRACTION,
        carrier: 'License Plate',
        tracking_number: consensusPlate,
      };
    }
    if (scanMode === 'generic' && scannedCode?.confident && scannedCode.value) {
      console.log('[Fast] generic barcode shortcut');
      return {
        ...EMPTY_EXTRACTION,
        tracking_number: scannedCode.value.replace(/\s+/g, '').toUpperCase(),
      };
    }
    if (scanMode === 'label' && scannedCode?.confident && scannedCode.kind === 'tracking') {
      console.log('[Fast] label barcode shortcut');
      return {
        ...EMPTY_EXTRACTION,
        carrier: detectCarrierFromTrackingNumber(scannedCode.value) || '',
        tracking_number: scannedCode.value,
      };
    }
  }

  // ── 2. On-device OCR ──────────────────────────────────
  let ocrText = '';
  try {
    const t1 = Date.now();
    ocrText = await runOnDeviceOcr(imagePath);
    console.log(`[Fast] ML Kit OCR ${Date.now() - t1}ms, ${ocrText.length} chars`);
  } catch (e: any) {
    console.warn('[Fast] on-device OCR failed:', e?.message ?? e);
  }

  // ── 3. Cloud Vision fallback only if the text is weak ──
  if (ocrText.trim().length < MIN_ONDEVICE_OCR_CHARS) {
    try {
      const t2 = Date.now();
      const cloud = await callCloudVision(imagePath);
      console.log(`[Fast] Cloud Vision fallback ${Date.now() - t2}ms`);
      if (cloud.text.trim().length > ocrText.trim().length) ocrText = cloud.text;
    } catch (e: any) {
      console.warn('[Fast] Cloud Vision fallback failed:', e?.message ?? e);
    }
  }

  // ── 4. Gemini structured parse ────────────────────────
  const result = await callGeminiExtraction(
    ocrText,
    shipList,
    scanMode,
    consensusPlate,
    scannedCode,
  );

  // Barcode value is authoritative: patch it in if Gemini missed it.
  if (scannedCode?.confident && scannedCode.value && !result.tracking_number) {
    result.tracking_number = scannedCode.value;
  }

  console.log(`[Fast] total post-capture ${Date.now() - tStart}ms`);
  return result;
}

// ─────────────────────────────────────────────────────────────
// SVG CORNER MARKERS
// ─────────────────────────────────────────────────────────────
export function CornerMarkers({ bbox, locked }: { bbox: BBox; locked: boolean }) {
  const c = locked ? ACCENT_LOCKED : '#FFFFFF';
  const { x, y, width: w, height: h } = bbox;
  return (
    <>
      <Rect x={x} y={y} width={CORNER_ARM} height={CORNER_SW} fill={c} rx={1} />
      <Rect x={x} y={y} width={CORNER_SW} height={CORNER_ARM} fill={c} rx={1} />
      <Rect x={x + w - CORNER_ARM} y={y} width={CORNER_ARM} height={CORNER_SW} fill={c} rx={1} />
      <Rect x={x + w - CORNER_SW} y={y} width={CORNER_SW} height={CORNER_ARM} fill={c} rx={1} />
      <Rect x={x} y={y + h - CORNER_SW} width={CORNER_ARM} height={CORNER_SW} fill={c} rx={1} />
      <Rect x={x} y={y + h - CORNER_ARM} width={CORNER_SW} height={CORNER_ARM} fill={c} rx={1} />
      <Rect x={x + w - CORNER_ARM} y={y + h - CORNER_SW} width={CORNER_ARM} height={CORNER_SW} fill={c} rx={1} />
      <Rect x={x + w - CORNER_SW} y={y + h - CORNER_ARM} width={CORNER_SW} height={CORNER_ARM} fill={c} rx={1} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const SmartDocumentScanner: React.FC<SmartDocumentScannerProps> = ({
  onImageCaptured,
  onClose,
  scanMode,
}) => {
  const scanModeRef = useRef<ScanMode>(scanMode);
  useEffect(() => { scanModeRef.current = scanMode; }, [scanMode]);

  const device = useCameraDevice('back');

  // ~3MP photo: noticeably faster capture + smaller files, still sharp for OCR
  const format = useCameraFormat(device, [
    { photoResolution: { width: 1920, height: 1440 } },
    { fps: 30 },
  ]);

  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1.0);
  const zoomRef = useRef(1.0);
  const [regions, setRegions] = useState<ScoredRegion[]>([]);
  const [primaryRegion, setPrimaryRegion] = useState<ScoredRegion | null>(null);
  const regionsRef = useRef<ScoredRegion[]>([]);

  const plateCandidatesRef = useRef<string[]>([]);
  const consensusPlateRef = useRef<string | null>(null);
  const plateStuckSinceRef = useRef<number | null>(null);

  const seenCodesRef = useRef<SeenCodes>(new Map());
  const bestCodeRef = useRef<ScannedCode | null>(null);
  const [bestCode, setBestCode] = useState<ScannedCode | null>(null);

  const [cameraKey, setCameraKey] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [scanState, setScanState] = useState<ScanState>({
    phase: 'idle',
    guidance: t(modeStrings(scanMode).initial),
  });
  const scanStateRef = useRef<ScanState>(scanState);
  const isScanningRef = useRef(false);
  const capturedRef = useRef(false);
  const loopActiveRef = useRef(false);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCaptureRef = useRef<() => void>(() => {});
  const startScanLoopRef = useRef<() => void>(() => {});
  const runScanFrameRef = useRef<() => Promise<void>>(async () => {});

  const isCodeReady = (code: ScannedCode | null) =>
    !!code &&
    isCodeAcceptable(code, scanModeRef.current) &&
    code.count >= CODE_CAPTURE_MIN_SIGHTINGS;

  const applyZoomSmart = useCallback((target: number, min: number, max: number) => {
    const next = Math.max(min, Math.min(lerp(zoomRef.current, target, ZOOM_LERP_SPEED), max));
    if (Math.abs(next - zoomRef.current) < ZOOM_DEAD_BAND) return;
    zoomRef.current = next;
    setZoom(next);
  }, []);

  // ── Code scanner (native, no photo needed → fastest path) ─
  const codeScanner = useCodeScanner({
    codeTypes: [...CODE_TYPES],
    onCodeScanned: codes => {
      if (capturedRef.current || !codes.length) return;

      let changed = false;
      for (const c of codes) {
        if (c.value) {
          addCode(seenCodesRef.current, c.value, c.type);
          changed = true;
        }
      }
      if (!changed) return;

      const ranked = rankCodes(seenCodesRef.current);
      const top =
        ranked.find(c => isCodeAcceptable(c, scanModeRef.current)) ??
        ranked[0] ??
        null;
      bestCodeRef.current = top;

      setBestCode(prev => {
        if (
          prev?.value === top?.value &&
          prev?.count === top?.count &&
          prev?.score === top?.score &&
          prev?.kind === top?.kind
        ) return prev;
        return top;
      });

      if (isCodeReady(top) && !captureTimerRef.current && !capturedRef.current) {
        captureTimerRef.current = setTimeout(() => {
          captureTimerRef.current = null;
          if (!capturedRef.current) triggerCaptureRef.current();
        }, CODE_CAPTURE_DELAY_MS);
      }
    },
  });

  // ── Camera error handler ─────────────────────────────────
  const handleCameraError = useCallback(
    (err: any) => {
      const msg: string = err?.message ?? String(err);
      console.warn('[Scanner] Camera error:', msg);
      setSessionError(msg);

      const isSessionError =
        msg.includes('invalid-output-configuration') || msg.includes('session');

      if (isSessionError && retryCount < MAX_SESSION_RETRIES) {
        setIsCameraActive(false);
        setTimeout(() => {
          setCameraKey(k => k + 1);
          setRetryCount(c => c + 1);
          setIsCameraActive(true);
        }, SESSION_RETRY_DELAY_MS);
      }
    },
    [retryCount],
  );

  useEffect(() => {
    setIsCameraActive(false);
    const timer = setTimeout(() => setIsCameraActive(true), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { regionsRef.current = regions; }, [regions]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { scanStateRef.current = scanState; }, [scanState]);

  const minZoom = device?.minZoom ?? 1.0;
  const maxZoom = useMemo(() => Math.min(device?.maxZoom ?? 6.0, 8.0), [device]);
  const neutralZoom = device?.neutralZoom ?? 1.0;

  const resetConsensus = useCallback(() => {
    plateCandidatesRef.current = [];
    consensusPlateRef.current = null;
    plateStuckSinceRef.current = null;
    seenCodesRef.current = new Map();
    bestCodeRef.current = null;
    setBestCode(null);
  }, []);

  const stopScanLoop = useCallback(() => {
    loopActiveRef.current = false;
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }
  }, []);

  const deleteTempFile = async (path: string | null) => {
    if (!path) return;
    try {
      const fp = path.startsWith('file://') ? path.slice(7) : path;
      if (await RNFS.exists(fp)) await RNFS.unlink(fp);
    } catch {}
  };

  const triggerCapture = useCallback(async () => {
    if (capturedRef.current || !cameraRef.current) return;
    capturedRef.current = true;
    stopScanLoop();
    setScanState({ phase: 'capturing', guidance: t('Capturing image…') });

    const rawCode = bestCodeRef.current;
    const codeAtCapture: ScannedCode | null =
      rawCode && isCodeAcceptable(rawCode, scanModeRef.current)
        ? { ...rawCode, confident: true }
        : null;

    try {
      const tCap = Date.now();
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'speed',
        enableShutterSound: true,
        flash: 'off',
        photoCodec: 'jpeg',
      } as any);
      console.log(`[Scanner] capture ${Date.now() - tCap}ms`);

      const imagePath = photo.path.startsWith('file://')
        ? photo.path
        : `file://${photo.path}`;
      setScanState({ phase: 'done', guidance: t('Done!') });
      onImageCaptured(
        imagePath,
        scanModeRef.current === 'plate' ? consensusPlateRef.current : null,
        codeAtCapture,
      );
    } catch (err: any) {
      console.error('[Scanner] capture error:', err);
      capturedRef.current = false;
      setScanState({ phase: 'scanning', guidance: t('Capture failed — try again') });
      Alert.alert(t('Scan Failed'), err?.message ?? t('Could not capture.'));
      startScanLoopRef.current();
    }
  }, [onImageCaptured, stopScanLoop, t]);

  useEffect(() => { triggerCaptureRef.current = triggerCapture; }, [triggerCapture]);

  const runScanFrame = useCallback(async () => {
    const phase = scanStateRef.current.phase;
    if (
      isScanningRef.current ||
      capturedRef.current ||
      !cameraRef.current ||
      ['capturing', 'done'].includes(phase)
    ) return;

    isScanningRef.current = true;
    let currentPhotoPath: string | null = null;

    const mode = scanModeRef.current;
    const isPlate = mode === 'plate';
    const strings = modeStrings(mode);

    const scheduleCapture = (guidance: string) => {
      setScanState({ phase: 'locking', guidance });
      if (!captureTimerRef.current) {
        captureTimerRef.current = setTimeout(() => {
          captureTimerRef.current = null;
          if (!capturedRef.current) triggerCapture();
        }, CAPTURE_DELAY_MS);
      }
    };

    // ── FAST PATH: a valid barcode is already known → skip OCR entirely ──
    if (isCodeReady(bestCodeRef.current)) {
      const code = bestCodeRef.current!;
      scheduleCapture(`${kindLabel(code)} — ${codeDisplayText(code)}`);
      isScanningRef.current = false;
      return;
    }

    try {
      const photo = await (Platform.OS === 'android'
        ? (cameraRef.current as any).takeSnapshot({
            quality: 30,
            skipMetadata: true,
          })
        : cameraRef.current.takePhoto({
            qualityPrioritization: 'speed',
            enableShutterSound: false,
            flash: 'off',
            skipMetadata: true,
          }));
      currentPhotoPath = photo.path;
      const mlkitPath = currentPhotoPath.startsWith('file://')
        ? currentPhotoPath
        : `file://${currentPhotoPath}`;
      const mlkitResult: MlkitOcrResult = await MlkitOcr.detectFromFile(mlkitPath);
      // fire-and-forget cleanup so it doesn't block the next frame
      deleteTempFile(currentPhotoPath);
      currentPhotoPath = null;

      // A barcode may have been confirmed while OCR was running
      const barcodeConfident = isCodeReady(bestCodeRef.current);

      const prevRegions = regionsRef.current;
      const imgW = photo.width ?? SW;
      const imgH = photo.height ?? SH;

      if (!mlkitResult?.length) {
        setScanState({
          phase: 'scanning',
          guidance: barcodeConfident
            ? t('Code detected — capturing…')
            : t(strings.looking),
        });
        if (regionsRef.current.length) {
          setRegions([]);
          setPrimaryRegion(null);
        }
        if (barcodeConfident) scheduleCapture(t('Code detected — capturing…'));
        isScanningRef.current = false;
        return;
      }

      const scored: ScoredRegion[] = mlkitResult
        .filter(block => {
          const f = block?.frame;
          return f != null && typeof f.x === 'number' && typeof f.y === 'number'
            && typeof f.width === 'number' && typeof f.height === 'number';
        })
        .map(block => {
          const bbox: BBox = {
            x: block.frame.x, y: block.frame.y,
            width: block.frame.width, height: block.frame.height,
          };
          const prev = prevRegions.find(r => computeIoU(r.bbox, bbox) > IOU_STABLE_THRESH);
          return {
            bbox,
            screenBbox: scaleToScreen(bbox, imgW, imgH, SW, SH),
            text: block.text,
            score: scoreRegion(bbox, block.text, imgW, imgH, prevRegions, isPlate),
            stableFrames: prev ? prev.stableFrames + 1 : 1,
          };
        });

      scored.sort((a, b) => b.score - a.score);
      const topN = isPlate ? 2 : mode === 'generic' ? 3 : 5;
      const docBbox = mergeTopRegions(scored, topN, imgW, imgH);
      const primary = scored[0] ?? null;
      setRegions(scored);
      setPrimaryRegion(primary);

      // ── Silent plate consensus (no on-screen text) ──
      if (isPlate && docBbox) {
        const plateFocusRegion = computeExpectedPlateRegion(imgW, imgH);
        const candidate = extractPlateCandidateFromFocusedBlocks(
          scored.map(r => ({ bbox: r.bbox, text: r.text })),
          plateFocusRegion,
        );
        if (candidate) {
          plateCandidatesRef.current = [...plateCandidatesRef.current, candidate]
            .slice(-PLATE_CONSENSUS_WINDOW);
          plateStuckSinceRef.current = null;
        } else if (plateStuckSinceRef.current === null) {
          plateStuckSinceRef.current = Date.now();
        }
        const vote = votePlateCandidates(plateCandidatesRef.current);
        if (vote && vote.confidence >= PLATE_CONSENSUS_MIN / PLATE_CONSENSUS_WINDOW) {
          consensusPlateRef.current = vote.value;
        }
      }

      // ── Mode-accepted barcode/QR → capture ──
      if (barcodeConfident) {
        scheduleCapture(
          `${kindLabel(bestCodeRef.current!)} — ${codeDisplayText(bestCodeRef.current!)}`,
        );
        isScanningRef.current = false;
        return;
      }

      // ── OCR-based flow ──
      if (docBbox && primary) {
        const targetZoom = computeTargetZoom(
          docBbox, imgW, imgH, zoomRef.current, minZoom, maxZoom,
        );
        applyZoomSmart(targetZoom, minZoom, maxZoom);
        const ratio = (docBbox.width * docBbox.height) / (imgW * imgH);

        const plateConsensusReady = !isPlate || consensusPlateRef.current !== null;
        const stuckTooLong =
          isPlate && !plateConsensusReady &&
          plateStuckSinceRef.current !== null &&
          Date.now() - plateStuckSinceRef.current > PLATE_STUCK_TIMEOUT_MS;

        if (ratio < REGION_TOO_SMALL) {
          setScanState({ phase: 'scanning', guidance: t('Getting closer…') });
        } else if (ratio > REGION_TOO_LARGE) {
          setScanState({ phase: 'scanning', guidance: t('Move back slightly') });
        } else if (stuckTooLong) {
          setScanState({
            phase: 'scanning',
            guidance: t('Move closer, avoid glare, or tap ⬤ to capture manually'),
          });
        } else if (
          primary.stableFrames >= STABILITY_FRAMES &&
          plateConsensusReady &&
          !capturedRef.current
        ) {
          scheduleCapture(t('Hold steady…'));
        } else {
          setScanState({ phase: 'scanning', guidance: t('Hold steady…') });
        }
      } else {
        setScanState({ phase: 'scanning', guidance: t(strings.align) });
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
  }, [minZoom, maxZoom, t, triggerCapture, applyZoomSmart]);

  useEffect(() => { runScanFrameRef.current = runScanFrame; }, [runScanFrame]);

  // Self-scheduling loop: next frame starts SCAN_INTERVAL_MS after the previous finishes
  const startScanLoop = useCallback(() => {
    stopScanLoop();
    capturedRef.current = false;
    resetConsensus();
    loopActiveRef.current = true;

    const tick = async () => {
      if (!loopActiveRef.current || capturedRef.current) return;
      try {
        await runScanFrameRef.current();
      } catch {}
      if (loopActiveRef.current && !capturedRef.current) {
        loopTimerRef.current = setTimeout(tick, SCAN_INTERVAL_MS);
      }
    };
    loopTimerRef.current = setTimeout(tick, 0);
  }, [stopScanLoop, resetConsensus]);

  useEffect(() => { startScanLoopRef.current = startScanLoop; }, [startScanLoop]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then(granted => {
        if (!granted) {
          Alert.alert(
            t('Camera Permission Required'),
            t('Please allow camera access.'),
            [{ text: t('OK'), onPress: onClose }],
          );
        } else {
          setZoom(neutralZoom);
        }
      });
    } else {
      setZoom(neutralZoom);
    }
    return () => stopScanLoop();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (hasPermission && device && isCameraActive) startScanLoop();
    return stopScanLoop;
  }, [hasPermission, device, isCameraActive, startScanLoop, stopScanLoop]);

  if (!hasPermission) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.permText}>{t('Requesting camera permission…')}</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fullScreen}>
        <Text style={styles.permText}>{t('No camera device found')}</Text>
        <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const guideDims = computeGuideDims(scanMode);

  const isLocking = scanState.phase === 'locking';
  const isBusy = scanState.phase === 'capturing';

  const barcodeReady = isCodeReady(bestCode);
  const retryExhausted = sessionError && retryCount >= MAX_SESSION_RETRIES;

  return (
    <View style={styles.fullScreen}>
      <Camera
        key={cameraKey}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        photo
        format={format}
        zoom={zoom}
        enableZoomGesture={false}
        codeScanner={codeScanner}
        onError={handleCameraError}
        onInitialized={() => {
          setSessionError(null);
          setRetryCount(0);
        }}
      />

      <Svg style={StyleSheet.absoluteFill} width={SW} height={SH} pointerEvents="none">
        {regions.slice(1).map((r, i) => (
          <Rect
            key={`s${i}`}
            x={r.screenBbox.x} y={r.screenBbox.y}
            width={r.screenBbox.width} height={r.screenBbox.height}
            stroke="rgba(255,255,255,0.4)" strokeWidth={1}
            fill="transparent" strokeDasharray="5 4" rx={3} ry={3}
          />
        ))}

        {!primaryRegion && (
          <Rect
            x={(SW - guideDims.width) / 2}
            y={guideDims.y}
            width={guideDims.width}
            height={guideDims.height}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1.5}
            fill="transparent"
            strokeDasharray="8 6"
            rx={guideDims.radius}
            ry={guideDims.radius}
          />
        )}
      </Svg>

      {sessionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTxt}>
            {retryExhausted
              ? t('Camera unavailable — please close and retry')
              : `${t('Camera starting')}… (${retryCount}/${MAX_SESSION_RETRIES})`}
          </Text>
        </View>
      )}

      <View style={[styles.guidanceBanner, isLocking && styles.guidanceLocking]}>
        <Text style={styles.guidanceTxt}>{scanState.guidance}</Text>
      </View>

      {zoom > 1.08 && (
        <View style={styles.zoomBadge}>
          <Text style={styles.zoomTxt}>{zoom.toFixed(1)}×</Text>
        </View>
      )}

      {isBusy && (
        <View style={styles.busyOverlay}>
          <View style={styles.busyCard}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.busyTxt}>{t('Capturing…')}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.closeCircle}
        onPress={() => { stopScanLoop(); onClose(); }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.closeTxt}>✕</Text>
      </TouchableOpacity>

      <View style={styles.shutterRow}>
        <TouchableOpacity
          style={[styles.shutterBtn, (isBusy || !!retryExhausted) && styles.shutterDisabled]}
          onPress={triggerCapture}
          disabled={isBusy || !!retryExhausted}
          activeOpacity={0.8}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>

      {!isBusy && (
        <View style={styles.hintRow}>
          <Text style={styles.hintTxt}>
            {barcodeReady
              ? t('Code detected — capturing automatically')
              : primaryRegion
              ? `Auto-capture in ${Math.max(0, STABILITY_FRAMES - primaryRegion.stableFrames + 1)} frames  •  or tap ⬤`
              : t('Tap ⬤ to capture')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  permText: { color: '#fff', fontSize: 16, marginTop: 16, textAlign: 'center', paddingHorizontal: 32 },
  errorBanner: {
    position: 'absolute', top: 8, left: 20, right: 20,
    backgroundColor: 'rgba(180,30,30,0.85)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  errorTxt: { color: '#fff', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  guidanceBanner: {
    position: 'absolute', top: 56, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    maxWidth: SW - 40,
    backgroundColor: 'rgba(0,0,0,0.60)', paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  guidanceLocking: { backgroundColor: 'rgba(0,60,30,0.75)', borderColor: ACCENT_LOCKED },
  guidanceTxt: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },
  zoomBadge: {
    position: 'absolute', top: 110, right: 20,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  zoomTxt: { color: '#FFD700', fontSize: 13, fontWeight: '700' },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center',
  },
  busyCard: {
    backgroundColor: 'rgba(20,20,20,0.92)', borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 14, minWidth: 200,
  },
  busyTxt: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  closeCircle: {
    position: 'absolute', top: 48, left: 20, width: 42, height: 42,
    borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
  shutterRow: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  shutterBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterDisabled: { opacity: 0.35 },
  shutterInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.90)' },
  hintRow: { position: 'absolute', bottom: 16, width: '100%', paddingHorizontal: 24, alignItems: 'center' },
  hintTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center' },
});

export default SmartDocumentScanner;