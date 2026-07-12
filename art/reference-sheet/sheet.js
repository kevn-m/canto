/* Upscaled contact sheet for eyeballing sprites — the approval-gate view (ADR 0026).
   Run: node art/reference-sheet/sheet.js [--scale 5] [--cols 6] [--out /path/sheet.png] [names...]
   Names may be sprite recipes or COMPOSITES entries; no names = every composite.
   Nearest-neighbour upscale (sips blurs pixel art). Never bundled into the app. */
const fs = require('fs');
const zlib = require('zlib');
const SPRITES = require('./sprites.js');

const W = SPRITES.SIZE;

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function toPng(grid, w, h) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const row = y * (1 + w * 4);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const c = grid[y * w + x];
      const o = row + 1 + x * 4;
      if (c) {
        raw[o] = parseInt(c.slice(1, 3), 16);
        raw[o + 1] = parseInt(c.slice(3, 5), 16);
        raw[o + 2] = parseInt(c.slice(5, 7), 16);
        raw[o + 3] = 255;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function gridFor(name) {
  const comp = (SPRITES.COMPOSITES || []).find(c => c.name === name);
  if (comp) {
    const out = new Array(W * W).fill(null);
    for (const layer of comp.layers) {
      const g = SPRITES.renderGrid(layer);
      for (let i = 0; i < out.length; i++) if (g[i]) out[i] = g[i];
    }
    return out;
  }
  if (!SPRITES.names.includes(name)) { console.error(`unknown sprite/composite: ${name}`); process.exit(1); }
  return SPRITES.renderGrid(name);
}

const args = process.argv.slice(2);
let scale = 5, cols = 6, out = 'sheet.png';
const names = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--scale') scale = parseInt(args[++i], 10);
  else if (args[i] === '--cols') cols = parseInt(args[++i], 10);
  else if (args[i] === '--out') out = args[++i];
  else names.push(args[i]);
}
if (!names.length) names.push(...(SPRITES.COMPOSITES || []).map(c => c.name));
if (!names.length) { console.error('nothing to render'); process.exit(1); }

const gutter = 2;
const cell = W * scale + gutter;
const nCols = Math.min(cols, names.length);
const nRows = Math.ceil(names.length / nCols);
const sw = nCols * cell + gutter, sh = nRows * cell + gutter;
const sheet = new Array(sw * sh).fill(null);

names.forEach((name, idx) => {
  const g = gridFor(name);
  const ox = gutter + (idx % nCols) * cell, oy = gutter + Math.floor(idx / nCols) * cell;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const c = g[y * W + x];
    if (!c) continue;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++)
      sheet[(oy + y * scale + dy) * sw + (ox + x * scale + dx)] = c;
  }
});

fs.writeFileSync(out, toPng(sheet, sw, sh));
names.forEach((n, i) => console.log(`cell ${Math.floor(i / nCols) + 1},${i % nCols + 1}: ${n}`));
console.log(`SHEET: ${out} (${sw}x${sh}, ${names.length} cells, row-major order above)`);
