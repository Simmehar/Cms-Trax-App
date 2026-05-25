/**
 * SmartDocumentScanner.tsx
 * Uses react-native-dotenv instead of react-native-config
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Platform,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import MlkitOcr, { MlkitOcrResult } from 'react-native-mlkit-ocr';
import RNFS from 'react-native-fs';
import Svg, { G, Rect } from 'react-native-svg';
import { GOOGLE_VISION_API_KEY, GEMINI_API_KEY } from '@env';  // ✅ dotenv

const GoogleVision = GOOGLE_VISION_API_KEY;
const GeminiKey = GEMINI_API_KEY;

console.log('GoogleVision', GoogleVision);
console.log('GeminiKey', GeminiKey);

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const SCAN_INTERVAL_MS = 600;
const STABILITY_FRAMES = 3;
const CAPTURE_DELAY_MS = 500;
const IOU_STABLE_THRESH = 0.45;
const REGION_TOO_SMALL = 0.40;
const REGION_TOO_LARGE = 0.75;
const REGION_TARGET = 0.55;
const ZOOM_LERP_SPEED = 0.35;
const CORNER_ARM = 22;
const CORNER_SW = 3;
const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GoogleVision}`;

const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GeminiKey}`;

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
  onImageCaptured: (imagePath: string) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// PURE UTILITIES
// ─────────────────────────────────────────────────────────────
function computeIoU(a: BBox, b: BBox): number {
  const xL = Math.max(a.x, b.x), yT = Math.max(a.y, b.y);
  const xR = Math.min(a.x + a.width, b.x + b.width), yB = Math.min(a.y + a.height, b.y + b.height);
  if (xR <= xL || yB <= yT) return 0;
  const inter = (xR - xL) * (yB - yT);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function scoreRegion(bbox: BBox, text: string, imgW: number, imgH: number, prevRegions: ScoredRegion[]): number {
  const boxArea = bbox.width * bbox.height;
  const textDensity = Math.min((text.length * 1000) / Math.max(boxArea, 1), 1);
  const normalizedArea = Math.min(boxArea / (imgW * imgH), 1);
  const cx = (bbox.x + bbox.width / 2) / imgW;
  const cy = (bbox.y + bbox.height / 2) / imgH;
  const centerProximity = Math.max(0, 1 - Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2) * 2);
  const prev = prevRegions.find(r => computeIoU(r.bbox, bbox) > IOU_STABLE_THRESH);
  const stability = prev ? Math.min(prev.stableFrames / 10, 1) : 0;
  return textDensity * 0.4 + normalizedArea * 0.3 + centerProximity * 0.2 + stability * 0.1;
}

function scaleToScreen(bbox: BBox, imgW: number, imgH: number, screenW: number, screenH: number): BBox {
  let eW = imgW, eH = imgH;
  const sp = screenH > screenW, il = imgW > imgH;
  if (sp && il) { eW = imgH; eH = imgW; }
  let { x, y, width: w, height: h } = bbox;
  if (sp && il) { const nx = bbox.y, ny = imgW - bbox.x - bbox.width; x = nx; y = ny; w = bbox.height; h = bbox.width; }
  return { x: x * (screenW / eW), y: y * (screenH / eH), width: w * (screenW / eW), height: h * (screenH / eH) };
}

function mergeTopRegions(regions: ScoredRegion[], topN: number, imgW: number, imgH: number): BBox | null {
  const top = regions.slice(0, Math.min(regions.length, topN));
  if (!top.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of top) { minX = Math.min(minX, r.bbox.x); minY = Math.min(minY, r.bbox.y); maxX = Math.max(maxX, r.bbox.x + r.bbox.width); maxY = Math.max(maxY, r.bbox.y + r.bbox.height); }
  const padX = (maxX - minX) * 0.15, padY = (maxY - minY) * 0.15;
  return { x: Math.max(0, minX - padX), y: Math.max(0, minY - padY), width: Math.min(imgW - Math.max(0, minX - padX), maxX - minX + padX * 2), height: Math.min(imgH - Math.max(0, minY - padY), maxY - minY + padY * 2) };
}

function computeTargetZoom(d: BBox, imgW: number, imgH: number, cur: number, min: number, max: number): number {
  const ratio = (d.width * d.height) / (imgW * imgH);
  if (ratio >= REGION_TOO_SMALL && ratio <= REGION_TOO_LARGE) return cur;
  return Math.min(Math.max(cur * Math.sqrt(REGION_TARGET / Math.max(ratio, 0.01)), min), max);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ─────────────────────────────────────────────────────────────
// CLOUD VISION
// ─────────────────────────────────────────────────────────────
export async function callCloudVision(imagePath: string): Promise<{ text: string; confidence: number }> {
  const fsPath = imagePath.startsWith('file://') ? imagePath.slice(7) : imagePath;
  const base64 = await RNFS.readFile(fsPath, 'base64');
  const response = await fetch(VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: { languageHints: ['en'], textDetectionParams: { enableTextDetectionConfidenceScore: true } },
      }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message ?? 'Cloud Vision error');
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  const text: string = annotation?.text ?? '';
  const confidence = annotation?.pages?.[0]?.confidence ?? 0;
  console.log(`[CloudVision] conf=${(confidence * 100).toFixed(1)}%  preview: ${text.slice(0, 120)}`);
  return { text, confidence };
}

// ─────────────────────────────────────────────────────────────
// GEMINI
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
    recipient_name: String(p.recipient_name ?? '').trim(),
    ship_name: String(p.ship_name ?? '').trim(),
    carrier: String(p.carrier ?? '').trim(),
    tracking_number: String(p.tracking_number ?? '').trim(),
    shipper: String(p.shipper ?? '').trim(),
    address: String(p.address ?? '').trim(),
    phone: String(p.phone ?? '').trim(),
  });

  try { const p = JSON.parse(raw.trim()); if (p && typeof p === 'object') return normalise(p); } catch { }

  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { const p = JSON.parse(stripped); if (p && typeof p === 'object') return normalise(p); } catch { }

  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { const p = JSON.parse(stripped.slice(start, end + 1)); if (p && typeof p === 'object') return normalise(p); } catch { }
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
    } catch { }
  }

  console.error('[Gemini] All parse stages failed. Raw:', raw.slice(0, 250));
  return null;
}

export async function callGeminiExtraction(ocrText: string, shipList: { name: string }[]): Promise<GeminiExtractionResult> {
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
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
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
// SVG CORNER MARKERS
// ─────────────────────────────────────────────────────────────
function CornerMarkers({ bbox, locked }: { bbox: BBox; locked: boolean }) {
  const c = locked ? '#00FF88' : '#FFFFFF';
  const { x, y, width: w, height: h } = bbox;
  return (<>
    <Rect x={x} y={y} width={CORNER_ARM} height={CORNER_SW} fill={c} rx={1} />
    <Rect x={x} y={y} width={CORNER_SW} height={CORNER_ARM} fill={c} rx={1} />
    <Rect x={x + w - CORNER_ARM} y={y} width={CORNER_ARM} height={CORNER_SW} fill={c} rx={1} />
    <Rect x={x + w - CORNER_SW} y={y} width={CORNER_SW} height={CORNER_ARM} fill={c} rx={1} />
    <Rect x={x} y={y + h - CORNER_SW} width={CORNER_ARM} height={CORNER_SW} fill={c} rx={1} />
    <Rect x={x} y={y + h - CORNER_ARM} width={CORNER_SW} height={CORNER_ARM} fill={c} rx={1} />
    <Rect x={x + w - CORNER_ARM} y={y + h - CORNER_SW} width={CORNER_ARM} height={CORNER_SW} fill={c} rx={1} />
    <Rect x={x + w - CORNER_SW} y={y + h - CORNER_ARM} width={CORNER_SW} height={CORNER_ARM} fill={c} rx={1} />
  </>);
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const SmartDocumentScanner: React.FC<SmartDocumentScannerProps> = ({
  onImageCaptured, onClose,
}) => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const [zoom, setZoom] = useState(1.0);
  const zoomRef = useRef(1.0);
  const [regions, setRegions] = useState<ScoredRegion[]>([]);
  const [primaryRegion, setPrimaryRegion] = useState<ScoredRegion | null>(null);
  const regionsRef = useRef<ScoredRegion[]>([]);
  const [scanState, setScanState] = useState<ScanState>({ phase: 'idle', guidance: 'Point camera at package label' });
  const scanStateRef = useRef<ScanState>(scanState);
  const isScanningRef = useRef(false);
  const capturedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { regionsRef.current = regions; }, [regions]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { scanStateRef.current = scanState; }, [scanState]);

  const minZoom = device?.minZoom ?? 1.0;
  const maxZoom = useMemo(() => Math.min(device?.maxZoom ?? 6.0, 8.0), [device]);
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
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (captureTimerRef.current) { clearTimeout(captureTimerRef.current); captureTimerRef.current = null; }
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
    } catch { }
  };

  const runScanFrame = useCallback(async () => {
    const phase = scanStateRef.current.phase;
    if (isScanningRef.current || capturedRef.current || !cameraRef.current ||
      ['capturing', 'done'].includes(phase)) return;

    isScanningRef.current = true;
    let currentPhotoPath: string | null = null;

    try {
      const photo = await (Platform.OS === 'android'
        ? (cameraRef.current as any).takeSnapshot({ quality: 30, skipMetadata: true })
        : cameraRef.current.takePhoto({ qualityPrioritization: 'speed', enableShutterSound: false, flash: 'off', skipMetadata: true })
      );
      currentPhotoPath = photo.path;
      const mlkitPath = currentPhotoPath.startsWith('file://') ? currentPhotoPath : `file://${currentPhotoPath}`;
      const mlkitResult: MlkitOcrResult = await MlkitOcr.detectFromFile(mlkitPath);
      await deleteTempFile(currentPhotoPath); currentPhotoPath = null;

      const prevRegions = regionsRef.current;
      const imgW = photo.width ?? SW, imgH = photo.height ?? SH;

      if (!mlkitResult?.length) {
        setScanState({ phase: 'scanning', guidance: 'Looking for text…' });
        setRegions([]); setPrimaryRegion(null); isScanningRef.current = false; return;
      }

      const scored: ScoredRegion[] = mlkitResult
        .filter(block => {
          const f = block?.frame;
          return f != null && typeof f.x === 'number' && typeof f.y === 'number'
            && typeof f.width === 'number' && typeof f.height === 'number';
        })
        .map(block => {
          const bbox: BBox = { x: block.frame.x, y: block.frame.y, width: block.frame.width, height: block.frame.height };
          const prev = prevRegions.find(r => computeIoU(r.bbox, bbox) > IOU_STABLE_THRESH);
          return {
            bbox,
            screenBbox: scaleToScreen(bbox, imgW, imgH, SW, SH),
            text: block.text,
            score: scoreRegion(bbox, block.text, imgW, imgH, prevRegions),
            stableFrames: prev ? prev.stableFrames + 1 : 1,
          };
        });

      scored.sort((a, b) => b.score - a.score);
      const docBbox = mergeTopRegions(scored, 5, imgW, imgH);
      const primary = scored[0] ?? null;
      setRegions(scored); setPrimaryRegion(primary);

      if (docBbox && primary) {
        const targetZoom = computeTargetZoom(docBbox, imgW, imgH, zoomRef.current, minZoom, maxZoom);
        setZoom(Math.max(minZoom, Math.min(lerp(zoomRef.current, targetZoom, ZOOM_LERP_SPEED), maxZoom)));
        const ratio = (docBbox.width * docBbox.height) / (imgW * imgH);

        if (ratio < REGION_TOO_SMALL) setScanState({ phase: 'scanning', guidance: 'Getting closer…' });
        else if (ratio > REGION_TOO_LARGE) setScanState({ phase: 'scanning', guidance: 'Move back slightly' });
        else if (primary.stableFrames >= STABILITY_FRAMES && !capturedRef.current) {
          setScanState({ phase: 'locking', guidance: '✓  Hold steady…' });
          if (!captureTimerRef.current) {
            captureTimerRef.current = setTimeout(() => {
              captureTimerRef.current = null;
              if (!capturedRef.current) triggerCapture();
            }, CAPTURE_DELAY_MS);
          }
        } else {
          setScanState({ phase: 'scanning', guidance: 'Hold steady…' });
        }
      } else {
        setScanState({ phase: 'scanning', guidance: 'Align label in frame' });
      }
    } catch (err: any) {
      if (err?.message && !err.message.includes('Camera is not ready') && !err.message.includes('capture-already-in-progress')) {
        console.warn('[Scanner] scan frame error:', err.message);
      }
      if (currentPhotoPath) deleteTempFile(currentPhotoPath);
    } finally { isScanningRef.current = false; }
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
  const isBusy = scanState.phase === 'capturing';
  const pColor = isLocking ? '#00FF88' : '#61B3E4';

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
        {primaryRegion && (
          <G>
            <Rect
              x={primaryRegion.screenBbox.x} y={primaryRegion.screenBbox.y}
              width={primaryRegion.screenBbox.width} height={primaryRegion.screenBbox.height}
              stroke={pColor} strokeWidth={isLocking ? 3 : 2}
              fill={isLocking ? 'rgba(0,255,136,0.08)' : 'rgba(97,179,228,0.08)'}
              rx={5} ry={5}
            />
            <CornerMarkers bbox={primaryRegion.screenBbox} locked={isLocking} />
          </G>
        )}
        {!primaryRegion && (
          <Rect
            x={SW * 0.08} y={SH * 0.25} width={SW * 0.84} height={SH * 0.50}
            stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}
            fill="transparent" strokeDasharray="8 6" rx={8} ry={8}
          />
        )}
      </Svg>

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
            <Text style={styles.busyTxt}>Capturing…</Text>
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
          style={[styles.shutterBtn, isBusy && styles.shutterDisabled]}
          onPress={triggerCapture}
          disabled={isBusy}
          activeOpacity={0.8}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>

      {!isBusy && (
        <View style={styles.hintRow}>
          <Text style={styles.hintTxt}>
            {primaryRegion
              ? `Auto-capture in ${Math.max(0, STABILITY_FRAMES - primaryRegion.stableFrames + 1)} stable frames  •  or tap ⬤`
              : 'Tap ⬤ to capture manually'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  permText: { color: '#fff', fontSize: 16, marginTop: 16, textAlign: 'center', paddingHorizontal: 32 },
  guidanceBanner: { position: 'absolute', top: 56, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.60)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  guidanceLocking: { backgroundColor: 'rgba(0,60,30,0.75)', borderColor: '#00FF88' },
  guidanceTxt: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },
  zoomBadge: { position: 'absolute', top: 110, right: 20, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  zoomTxt: { color: '#FFD700', fontSize: 13, fontWeight: '700' },
  busyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  busyCard: { backgroundColor: 'rgba(20,20,20,0.92)', borderRadius: 20, padding: 28, alignItems: 'center', gap: 14, minWidth: 200 },
  busyTxt: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  closeCircle: { position: 'absolute', top: 48, left: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.60)', justifyContent: 'center', alignItems: 'center' },
  closeTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
  shutterRow: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  shutterBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  shutterDisabled: { opacity: 0.35 },
  shutterInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.90)' },
  hintRow: { position: 'absolute', bottom: 16, width: '100%', paddingHorizontal: 24, alignItems: 'center' },
  hintTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center' },
});

export default SmartDocumentScanner;