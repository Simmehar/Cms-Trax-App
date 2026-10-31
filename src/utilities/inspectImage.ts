import RNFS from 'react-native-fs';

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64ToBytes(b64: string): Uint8Array {
  const lookup = new Uint8Array(128);
  for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = lookup[clean.charCodeAt(i)];
    const e2 = lookup[clean.charCodeAt(i + 1)];
    const e3 = i + 2 < clean.length ? lookup[clean.charCodeAt(i + 2)] : 0;
    const e4 = i + 3 < clean.length ? lookup[clean.charCodeAt(i + 3)] : 0;
    out[p++] = (e1 << 2) | (e2 >> 4);
    if (i + 2 < clean.length) out[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (i + 3 < clean.length) out[p++] = ((e3 & 3) << 6) | e4;
  }
  return out.subarray(0, p);
}

export interface JpegInfo {
  ok: boolean;
  fileSize: number;
  rawWidth?: number;
  rawHeight?: number;
  exifOrientation?: number;
  hasExif: boolean;
}

function readExifOrientation(b: Uint8Array, tiff: number): number | undefined {
  const little = b[tiff] === 0x49; // 'II' = little endian, 'MM' = big endian
  const u16 = (o: number) =>
    little ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1];
  const u32 = (o: number) =>
    little
      ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0
      : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

  const ifd = tiff + u32(tiff + 4);
  if (ifd + 2 > b.length) return undefined;
  const n = u16(ifd);
  for (let k = 0; k < n; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > b.length) break;
    if (u16(e) === 0x0112) return u16(e + 8); // Orientation tag
  }
  return undefined;
}

function parseJpeg(b: Uint8Array, fileSize: number): JpegInfo {
  const info: JpegInfo = { ok: false, fileSize, hasExif: false };
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return info;
  info.ok = true;

  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }

    const len = (b[i + 2] << 8) | b[i + 3];
    const s = i + 4;

    // APP1 "Exif"
    if (m === 0xe1 && b[s] === 0x45 && b[s + 1] === 0x78 && b[s + 2] === 0x69 && b[s + 3] === 0x66) {
      info.hasExif = true;
      info.exifOrientation = readExifOrientation(b, s + 6);
    }

    // SOF marker = real pixel dimensions
    const isSOF = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (isSOF) {
      info.rawHeight = (b[s + 1] << 8) | b[s + 2];
      info.rawWidth = (b[s + 3] << 8) | b[s + 4];
      break;
    }
    if (m === 0xda) break; // start of scan, nothing useful after this
    i += 2 + len;
  }
  return info;
}

function describe(label: string, info: JpegInfo): string {
  if (!info.ok) return `[ImgCheck] ${label}: not a readable JPEG`;

  const o = info.exifOrientation;
  const swap = o !== undefined && o >= 5 && o <= 8;
  const dispW = swap ? info.rawHeight : info.rawWidth;
  const dispH = swap ? info.rawWidth : info.rawHeight;

  let verdict: string;
  if (o === undefined || o === 1) {
    verdict = 'pixels are upright as stored (no EXIF rotation needed)';
  } else {
    verdict =
      `pixels are stored SIDEWAYS, EXIF orientation=${o} rotates it for display. ` +
      'Any viewer/server that ignores or strips EXIF will show it ROTATED';
  }

  return (
    `[ImgCheck] ${label}\n` +
    `  size: ${(info.fileSize / 1024).toFixed(0)} KB\n` +
    `  raw pixels: ${info.rawWidth}x${info.rawHeight}\n` +
    `  EXIF present: ${info.hasExif}, orientation: ${o ?? 'none'}\n` +
    `  should display as: ${dispW}x${dispH}\n` +
    `  → ${verdict}`
  );
}

/** Inspect a local file (file:// uri or plain path). Logs and returns the info. */
export async function inspectLocalImage(uri: string, label = 'local'): Promise<JpegInfo | null> {
  try {
    const path = decodeURI(uri.replace(/^file:\/\//, ''));
    const stat = await RNFS.stat(path);
    // EXIF + dimensions live at the start of the file, 256 KB is plenty
    const b64 = await RNFS.read(path, 262144, 0, 'base64');
    const info = parseJpeg(b64ToBytes(b64), Number(stat.size));
    console.log(describe(label, info));
    return info;
  } catch (e) {
    console.warn('[ImgCheck] failed for', label, e);
    return null;
  }
}

/** Download the uploaded image from the server URL and inspect what actually got stored. */
export async function inspectRemoteImage(url: string, label = 'remote'): Promise<JpegInfo | null> {
  const dest = `${RNFS.CachesDirectoryPath}/inspect_${Date.now()}.jpg`;
  try {
    const res = await RNFS.downloadFile({ fromUrl: url, toFile: dest }).promise;
    if (res.statusCode !== 200) {
      console.warn('[ImgCheck] remote download status', res.statusCode);
      return null;
    }
    return await inspectLocalImage(dest, label);
  } catch (e) {
    console.warn('[ImgCheck] remote failed', e);
    return null;
  } finally {
    RNFS.unlink(dest).catch(() => {});
  }
}