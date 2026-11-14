// Generates placeholder SokoOS brand icons for the Tauri bundle with no external
// dependencies (Node's built-in zlib only). Replace the generated art with the real
// SokoOS brand asset when it is available; the sizes and formats are what Tauri expects.
//
//   node scripts/generate-icons.mjs
//
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri', 'icons');

// Sunset Savanna brand orange on a warm sand backdrop.
const BRAND = [0xc2, 0x41, 0x0c];
const BACKDROP = [0x3a, 0x22, 0x16];
const MARK = [0xfb, 0xf5, 0xee];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Build an RGBA pixel buffer: brand square with a centered "S" mark. */
function renderIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const pad = Math.round(size * 0.12);
  const barW = Math.max(2, Math.round(size * 0.09));

  // Draw a blocky "S" out of three horizontal bars and two vertical connectors.
  const mid = Math.round(size / 2);
  const top = pad;
  const bottom = size - pad;
  const left = pad;
  const right = size - pad;

  const setPixel = (x, y, rgb, alpha) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = rgb[0];
    px[i + 1] = rgb[1];
    px[i + 2] = rgb[2];
    px[i + 3] = alpha;
  };

  const fillRect = (x0, y0, x1, y1, rgb) => {
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) setPixel(x, y, rgb, 255);
  };

  // Background.
  fillRect(0, 0, size - 1, size - 1, BACKDROP);
  const inner = Math.round(size * 0.06);
  fillRect(inner, inner, size - 1 - inner, size - 1 - inner, BRAND);

  // S geometry: top bar, middle bar, bottom bar, right connector (top), left connector (bottom).
  fillRect(left, top, right, top + barW, MARK);
  fillRect(left, mid - Math.floor(barW / 2), right, mid + Math.ceil(barW / 2), MARK);
  fillRect(left, bottom - barW, right, bottom, MARK);
  fillRect(right - barW, top, right, mid, MARK);
  fillRect(left, mid, left + barW, bottom, MARK);

  return px;
}

function encodePng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const pixels = renderIcon(size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Wrap PNG images in an ICO container (Vista+ PNG-compressed entries). */
function encodeIco(sizes) {
  const images = sizes.map((size) => ({ size, png: encodePng(size) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

mkdirSync(OUT_DIR, { recursive: true });

const pngTargets = [
  ['32x32.png', 32],
  ['128x128.png', 128],
  ['128x128@2x.png', 256],
  ['icon.png', 512],
];
for (const [name, size] of pngTargets) {
  writeFileSync(join(OUT_DIR, name), encodePng(size));
}
writeFileSync(join(OUT_DIR, 'icon.ico'), encodeIco([32, 48, 64, 256]));

// eslint-disable-next-line no-console
console.log(`Wrote ${pngTargets.length + 1} icons to ${OUT_DIR}`);
