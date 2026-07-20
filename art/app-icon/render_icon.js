/* App icon: the dragon speaks. Renders a 64px composition (a dragon sprite +
   sound-wave speech bubble, drawn from the sprite recipes) upscaled 16x to the
   1024px master in Assets.xcassets, plus a preview PNG per colourway here.
   Run: node art/app-icon/render_icon.js — no dependencies, any cwd. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const S = require(path.join(__dirname, '../reference-sheet/sprites.js'));

const W = 64, SCALE = 16, OUT = W * SCALE;
const P = S.P;

// The shipped icon. Change to another COLOURWAYS key and re-run to swap.
const CHOSEN = 'pal-plum';
const COLOURWAYS = {
  'boss-navy': { bg: P.navy, mascot: 'boss-dragon' },
  'boss-sky': { bg: P.sky, mascot: 'boss-dragon' },
  'boss-crm': { bg: P.crm, mascot: 'boss-dragon' },
  'pal-sky': { bg: P.sky, mascot: 'pal-dragonling' },
  'pal-crm': { bg: P.crm, mascot: 'pal-dragonling' },
  'pal-plum': { bg: P.plum, mascot: 'pal-dragonling' },
  // JyutKeep Plus subscription image (ASC upload, never bundled). Gold is
  // GameTheme.gold = P.org, the Pick badge colour.
  'plus-org': { bg: P.org, mascot: 'pal-dragonling', plus: true },
  'plus-brz': { bg: P.brz, mascot: 'pal-dragonling', plus: true },
};
const SUB_CHOSEN = 'plus-org';

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
// App Store icons must be opaque: RGB, no alpha channel.
function toPng(grid) {
  const raw = Buffer.alloc(OUT * (1 + OUT * 3));
  for (let y = 0; y < OUT; y++) {
    const row = y * (1 + OUT * 3);
    raw[row] = 0;
    for (let x = 0; x < OUT; x++) {
      const c = grid[Math.floor(y / SCALE) * W + Math.floor(x / SCALE)];
      const o = row + 1 + x * 3;
      raw[o] = parseInt(c.slice(1, 3), 16);
      raw[o + 1] = parseInt(c.slice(3, 5), 16);
      raw[o + 2] = parseInt(c.slice(5, 7), 16);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(OUT, 0); ihdr.writeUInt32BE(OUT, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function px(g, x, y, c) { if (x >= 0 && x < W && y >= 0 && y < W) g[y * W + x] = c; }
function rect(g, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(g, x, y, c);
}
function rrect(g, x0, y0, x1, y1, r, c) {
  rect(g, x0 + r, y0, x1 - r, y1, c);
  rect(g, x0, y0 + r, x1, y1 - r, c);
  for (const [cx, cy] of [[x0 + r, y0 + r], [x1 - r, y0 + r], [x0 + r, y1 - r], [x1 - r, y1 - r]])
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r + r) px(g, cx + x, cy + y, c);
}
function sparkle(g, cx, cy, c) {
  px(g, cx, cy, c); px(g, cx - 1, cy, c); px(g, cx + 1, cy, c);
  px(g, cx, cy - 1, c); px(g, cx, cy + 1, c);
}

function compose({ bg, mascot, plus }) {
  const g = new Array(W * W).fill(bg);
  const sprite = S.renderGrid(mascot);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const c = sprite[y * W + x];
    if (c) px(g, x - 4, y + 6, c);
  }
  const bx = 38, by = 3;
  rrect(g, bx, by, bx + 22, by + 15, 4, P.navy);
  rrect(g, bx + 1, by + 1, bx + 21, by + 14, 3, P.crm);
  px(g, bx + 4, by + 16, P.navy); px(g, bx + 3, by + 17, P.navy); px(g, bx + 4, by + 17, P.crm); px(g, bx + 5, by + 16, P.crm);
  // sound waves inside the bubble only — never over its border
  const wpx = (x, y, c) => { if (g[y * W + x] === P.crm) px(g, x, y, c); };
  const arc = (cx, r, c) => {
    for (let a = -1.0; a <= 1.0; a += 0.02) wpx(Math.round(cx + r * Math.cos(a) - r), Math.round(by + 8 + r * Math.sin(a)), c);
  };
  arc(bx + 7, 3, P.red); arc(bx + 13, 6, P.org);
  wpx(bx + 4, by + 8, P.red); wpx(bx + 5, by + 8, P.red);
  sparkle(g, 8, 20, P.yel);
  if (plus) {
    sparkle(g, 55, 26, P.crm);
    sparkle(g, 10, 46, P.crm);
    sparkle(g, 50, 52, P.yel);
  }
  return g;
}

const iconsetDir = path.join(__dirname, '../../Canto/Resources/Assets.xcassets/AppIcon.appiconset');
const PALETTE = new Set(Object.values(P).map(c => c.toUpperCase()));
let failed = false;
for (const [name, spec] of Object.entries(COLOURWAYS)) {
  const g = compose(spec);
  const off = new Set(g.filter(c => !PALETTE.has(c.toUpperCase())));
  if (off.size) { failed = true; console.error(`${name}: OUT OF PALETTE ${[...off]}`); }
  fs.writeFileSync(path.join(__dirname, `preview-${name}.png`), toPng(g));
  console.log(`preview-${name}.png  out-of-palette: ${off.size ? [...off] : 'none'}`);
}
fs.writeFileSync(path.join(iconsetDir, 'icon-1024.png'), toPng(compose(COLOURWAYS[CHOSEN])));
console.log(`icon-1024.png <- ${CHOSEN}`);
fs.writeFileSync(path.join(__dirname, 'subscription-plus-1024.png'), toPng(compose(COLOURWAYS[SUB_CHOSEN])));
console.log(`subscription-plus-1024.png <- ${SUB_CHOSEN}`);
process.exit(failed ? 1 : 0);
