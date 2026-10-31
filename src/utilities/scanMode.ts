/**
 * utilities/scanMode.ts
 *
 * Single source of truth for "what is the scanner looking for?".
 *  label   → carrier tracking number (barcode / QR) + shipping-label OCR
 *            (non-hospitality, hospitality Packages, Internal Deliveries)
 *  plate   → alphanumeric license plate (Valet only)
 *  generic → alphanumeric / QR / barcode ID
 *            (Luggage, Rentals, Lost & Found)
 */
import type { ScannedCode } from './codeParser';

export type ScanMode = 'label' | 'plate' | 'generic';

export const HOSPITALITY_TYPE = {
  PACKAGES: 1,
  LUGGAGE: 2,
  VALET: 3,
  INTERNAL_DELIVERIES: 4,
  RENTALS: 5,
  LOST_FOUND: 6,
} as const;

export function resolveScanMode(
  isHospitality: boolean,
  selectedPackageType: number,
): ScanMode {
  if (!isHospitality) return 'label';
  switch (selectedPackageType) {
    case HOSPITALITY_TYPE.VALET:
      return 'plate';
    case HOSPITALITY_TYPE.PACKAGES:
    case HOSPITALITY_TYPE.INTERNAL_DELIVERIES:
      return 'label';
    case HOSPITALITY_TYPE.LUGGAGE:
    case HOSPITALITY_TYPE.RENTALS:
    case HOSPITALITY_TYPE.LOST_FOUND:
    default:
      return 'generic';
  }
}

/**
 * Is this decoded code usable for the current mode?
 *  label   → must classify as a carrier tracking number
 *  generic → any ID-like value (not a bare URL), min 4 chars
 *  plate   → the parser's own `confident` flag (valet tickets etc.)
 */
export function isCodeAcceptable(
  code: ScannedCode | null | undefined,
  mode: ScanMode,
): boolean {
  if (!code || !code.value) return false;
  switch (mode) {
    case 'label':
      return code.kind === 'tracking';
    case 'generic':
      return code.kind !== 'url' && code.value.length >= 4;
    case 'plate':
    default:
      return code.confident;
  }
}

// ─────────────────────────────────────────────────────────────
// MODE METADATA — shared by the grid, the scanner and AddPackageModal
// ─────────────────────────────────────────────────────────────
export interface ScanModeMeta {
  key: ScanMode;
  labelKey: string; // i18n key for the mode name
  hintKey: string;  // i18n key for what gets scanned
  accent: string;   // highlight colour
}

export const SCAN_MODE_META: Record<ScanMode, ScanModeMeta> = {
  plate: {
    key: 'plate',
    labelKey: 'Valet',
    hintKey: 'Number Plate',
    accent: '#F59E0B', // amber
  },
  label: {
    key: 'label',
    labelKey: 'Tracking',
    hintKey: 'Barcode / QR / Label',
    accent: '#3B82F6', // blue
  },
  generic: {
    key: 'generic',
    labelKey: 'Tag / ID',
    hintKey: 'Alphanumeric / QR / Barcode',
    accent: '#8B5CF6', // violet
  },
};

export function scanModeMeta(mode: ScanMode): ScanModeMeta {
  return SCAN_MODE_META[mode];
}