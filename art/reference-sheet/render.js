/* Renders every sprite in sprites.js to <name>.png in this directory.
   Run: node render.js — no dependencies. Audits the PICO-8 palette and fails loud. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const SPRITES = require('./sprites.js');

const W = SPRITES.SIZE;
const PALETTE = new Set(Object.values(SPRITES.P).map(c => c.toUpperCase()));

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

function toPng(grid) {
  const raw = Buffer.alloc(W * (1 + W * 4)); // filter byte + RGBA per row
  for (let y = 0; y < W; y++) {
    const row = y * (1 + W * 4);
    raw[row] = 0;
    for (let x = 0; x < W; x++) {
      const c = grid[y * W + x];
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
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function compositeGrid(layers) {
  const out = new Array(W * W).fill(null);
  for (const layer of layers) {
    const g = SPRITES.renderGrid(layer);
    for (let i = 0; i < out.length; i++) if (g[i]) out[i] = g[i];
  }
  return out;
}

let failed = false;
for (const name of SPRITES.names) {
  const grid = SPRITES.renderGrid(name);
  const off = new Set(grid.filter(c => c && !PALETTE.has(c.toUpperCase())));
  if (off.size) { failed = true; console.error(`${name}: OUT OF PALETTE ${[...off]}`); }
  fs.writeFileSync(path.join(__dirname, `${name}.png`), toPng(grid));
  console.log(`${name}.png  out-of-palette: ${off.size ? [...off] : 'none'}`);
}

// Composite previews (Slice 3) — never bundled into the app, just a way to
// see gear layers stacked in z-order before anything is built on the Rig.
for (const comp of (SPRITES.COMPOSITES || [])) {
  const grid = compositeGrid(comp.layers);
  const off = new Set(grid.filter(c => c && !PALETTE.has(c.toUpperCase())));
  if (off.size) { failed = true; console.error(`${comp.name}: OUT OF PALETTE ${[...off]}`); }
  fs.writeFileSync(path.join(__dirname, `${comp.name}.png`), toPng(grid));
  console.log(`${comp.name}.png  out-of-palette: ${off.size ? [...off] : 'none'}`);
}
process.exit(failed ? 1 : 0);
