/**
 * utilities/codeParser.ts
 *
 * Universal barcode / QR / boarding-pass handling. Pure functions only.
 *
 * Handles:
 *  - Valet / claim tickets (Code128 + QR + printed number all agree on one ID)
 *  - Airline boarding passes (IATA BCBP in PDF417 / Aztec / QR): PNR + passenger + route
 *  - Carrier tracking labels (UPS, FedEx, USPS, Amazon, DHL, SpeedX)
 *  - QR codes holding a URL: the ticket ID is pulled out of the link
 *  - Anything else: generic ID
 */

export type CodeKind = 'boarding_pass' | 'tracking' | 'ticket_id' | 'url' | 'generic';

export interface BoardingPassInfo {
  passenger: string; // "JOHN DOE"
  firstName: string;
  lastName: string;
  pnr: string;
  from: string;
  to: string;
  carrier: string;
  flight: string;
  seat: string;
}

export interface ScannedCode {
  /** The cleaned ID we use (tracking no., ticket no., PNR, ...) */
  value: string;
  /** Exactly what the scanner decoded */
  raw: string;
  /** qr, code-128, pdf-417, ... */
  symbology: string;
  kind: CodeKind;
  score: number;
  confident: boolean;
  /** how many frames saw it */
  count: number;
  boardingPass?: BoardingPassInfo;
}

export type SeenCodes = Map<string, ScannedCode>;

/**
 * Every symbology VisionCamera supports.
 * NOTE: 'upc-a' is NOT a valid VisionCamera type (UPC-A is reported as ean-13).
 */
export const CODE_TYPES = [
  'qr',
  'code-128',
  'code-39',
  'code-93',
  'codabar',
  'ean-13',
  'ean-8',
  'upc-e',
  'itf',
  'data-matrix',
  'pdf-417',
  'aztec',
] as const;

// ─────────────────────────────────────────────────────────────
// CARRIER DETECTION
// ─────────────────────────────────────────────────────────────
export function detectCarrierFromTrackingNumber(trackingNumber: string): string {
  if (!trackingNumber) return '';
  const t = trackingNumber.replace(/[\s-]/g, '').toUpperCase().trim();
  if (!t) return '';
  if (t.startsWith('SPX')) return 'SpeedX';
  if (t.startsWith('1Z')) return 'UPS';
  if (t.startsWith('TBA') || t.startsWith('TBM') || t.startsWith('TBC')) return 'Amazon';
  if (/^\d{12,15}$/.test(t)) return 'FedEx';
  if (/^\d{10,11}$/.test(t)) return 'DHL';
  return '';
}

// ─────────────────────────────────────────────────────────────
// BOARDING PASS (IATA BCBP)
// ─────────────────────────────────────────────────────────────
export function parseBoardingPass(raw: string): BoardingPassInfo | null {
  if (!raw || !/^M[1-4]/.test(raw) || raw.length < 58) return null;

  const nameField = raw.slice(2, 22).trim();
  const [lastRaw = '', firstRaw = ''] = nameField.split('/');
  const firstName = firstRaw.replace(/\s+(MR|MRS|MS|MISS|MSTR|DR)$/i, '').trim();
  const lastName = lastRaw.trim();

  const pnr = raw.slice(23, 30).trim();
  const from = raw.slice(30, 33);
  const to = raw.slice(33, 36);
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return null;
  if (!lastName) return null;

  return {
    passenger: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    pnr,
    from,
    to,
    carrier: raw.slice(36, 39).trim(),
    flight: raw.slice(39, 44).trim().replace(/^0+/, ''),
    seat: raw.slice(48, 52).trim().replace(/^0+/, ''),
  };
}

// ─────────────────────────────────────────────────────────────
// URL -> ID
// ─────────────────────────────────────────────────────────────
const ID_PARAMS = [
  'id', 'ticket', 'ticketid', 'ticket_id', 'tkt', 't', 'tag', 'claim',
  'code', 'ref', 'number', 'no', 'num', 'vid', 'v', 'k', 'key',
];

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function extractIdFromUrl(url: string): string | null {
  const [beforeHash] = url.split('#');
  const [base, query] = beforeHash.split('?');

  if (query) {
    for (const pair of query.split('&')) {
      const [k, v = ''] = pair.split('=');
      const val = safeDecode(v);
      if (ID_PARAMS.includes(k.toLowerCase()) && /^[A-Za-z0-9\-]{4,30}$/.test(val)) {
        return val;
      }
    }
  }

  const path = base.replace(/^https?:\/\/[^/]+/i, '');
  const segs = path.split('/').filter(Boolean).reverse();
  for (const s of segs) if (/^\d{4,12}$/.test(s)) return s;
  for (const s of segs) {
    if (/\d/.test(s) && /^[A-Za-z0-9\-]{4,30}$/.test(s)) return s;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// NORMALISE + SCORE
// ─────────────────────────────────────────────────────────────
/** Strip carrier routing prefixes so only the tracking number remains. */
export function normalizeBarcodeValue(raw: string): string {
  const v = raw.replace(/\s/g, '');
  const usps = v.match(/^420(?:\d{5}|\d{9})(\d{22})$/); // USPS: 420 + ZIP + 22 digits
  if (usps) return usps[1];
  if (/^\d{34}$/.test(v)) return v.slice(-12); // FedEx 34-digit: tracking = last 12
  return v;
}

function scoreValue(v: string): { kind: CodeKind; score: number } {
  const u = v.toUpperCase();
  if (/^1Z[0-9A-Z]{16}$/.test(u)) return { kind: 'tracking', score: 10 };
  if (/^TB[AMC]\d{6,}$/.test(u)) return { kind: 'tracking', score: 10 };
  if (/^SPX/.test(u)) return { kind: 'tracking', score: 10 };
  if (/^(\d{12}|\d{15}|\d{20,22})$/.test(u)) return { kind: 'tracking', score: 9 };
  if (/^\d{10,11}$/.test(u)) return { kind: 'tracking', score: 7 };
  if (/^[A-Z]{0,3}\d{4,9}$/.test(u)) return { kind: 'ticket_id', score: 6 }; // valet/claim ticket
  if (/^[A-Z0-9\-]{4,30}$/.test(u)) return { kind: 'generic', score: 4 };
  return { kind: 'generic', score: 2 };
}

export function classifyCode(raw: string, symbology: string): ScannedCode {
  const trimmed = raw.trim();

  // 1) Airline boarding pass
  const bp = parseBoardingPass(raw);
  if (bp) {
    return {
      value: bp.pnr || bp.passenger,
      raw,
      symbology,
      kind: 'boarding_pass',
      score: 10,
      confident: true,
      count: 1,
      boardingPass: bp,
    };
  }

  // 2) URL inside a QR
  if (/^https?:\/\//i.test(trimmed)) {
    const id = extractIdFromUrl(trimmed);
    if (id) {
      const s = scoreValue(id);
      return {
        value: s.kind === 'tracking' ? id.toUpperCase() : id,
        raw,
        symbology,
        kind: s.kind === 'generic' ? 'ticket_id' : s.kind,
        score: Math.max(s.score, 5),
        confident: Math.max(s.score, 5) >= 6,
        count: 1,
      };
    }
    return { value: trimmed, raw, symbology, kind: 'url', score: 1, confident: false, count: 1 };
  }

  // 3) Plain barcode / QR text
  const v = normalizeBarcodeValue(raw);
  const s = scoreValue(v);
  return {
    value: s.kind === 'tracking' ? v.toUpperCase() : v,
    raw,
    symbology,
    kind: s.kind,
    score: s.score,
    confident: s.score >= 6,
    count: 1,
  };
}

// ─────────────────────────────────────────────────────────────
// MULTI-FRAME ACCUMULATION
// ─────────────────────────────────────────────────────────────
/**
 * Codes are keyed by their cleaned value, so a Code128 "598353" and a QR
 * link ending in "598353" merge into ONE entry with count 2.
 */
export function addCode(seen: SeenCodes, raw: string, symbology: string): void {
  const c = classifyCode(raw, symbology);
  const prev = seen.get(c.value);
  if (prev) {
    seen.set(c.value, {
      ...prev,
      count: prev.count + 1,
      score: Math.max(prev.score, c.score),
      confident: prev.confident || c.confident,
    });
  } else {
    seen.set(c.value, c);
  }
}

export function rankCodes(seen: SeenCodes): ScannedCode[] {
  return [...seen.values()].sort((a, b) => b.score - a.score || b.count - a.count);
}

export function kindLabel(c: ScannedCode): string {
  switch (c.kind) {
    case 'boarding_pass': return 'BOARDING PASS';
    case 'tracking': return 'TRACKING';
    case 'ticket_id': return 'TICKET';
    case 'url': return 'LINK';
    default: return 'CODE';
  }
}

export function codeDisplayText(c: ScannedCode): string {
  if (c.kind === 'boarding_pass' && c.boardingPass) {
    const b = c.boardingPass;
    return `${b.passenger} • ${b.from}→${b.to}`;
  }
  return c.value.length > 26 ? `${c.value.slice(0, 26)}…` : c.value;
}

// ─────────────────────────────────────────────────────────────
// MERGE INTO EXTRACTION RESULT
// ─────────────────────────────────────────────────────────────
interface ExtractionLike {
  recipient_name: string;
  tracking_number: string;
  carrier: string;
}

/** Barcode beats OCR for the ID field, because barcodes don't get misread. */
export function mergeCodeIntoExtraction<T extends ExtractionLike>(
  e: T,
  code: ScannedCode,
  isHospitality: boolean,
): T {
  const out: T = { ...e };
  if (code.confident || !out.tracking_number) out.tracking_number = code.value;

  if (code.kind === 'boarding_pass' && code.boardingPass && !out.recipient_name) {
    out.recipient_name = code.boardingPass.passenger;
  }

  if (!isHospitality && code.kind === 'tracking') {
    const c = detectCarrierFromTrackingNumber(out.tracking_number);
    if (c) out.carrier = c;
  }
  return out;
}