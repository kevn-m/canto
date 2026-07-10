/* Batch 1 — PICO-8 chibi mascots, 64x64 */
(function () {
  const P = {
    blk: '#000000', navy: '#1D2B53', plum: '#7E2553', grn: '#008751',
    brn: '#AB5236', dgy: '#5F574F', lgy: '#C2C3C7', crm: '#FFF1E8',
    red: '#FF004D', org: '#FFA300', yel: '#FFEC27', lim: '#00E436',
    sky: '#29ADFF', lav: '#83769C', pnk: '#FF77A8', pch: '#FFCCAA'
  };
  const W = 64;

  function Grid() { this.d = new Array(W * W).fill(null); }
  Grid.prototype.get = function (x, y) { return (x < 0 || y < 0 || x >= W || y >= W) ? null : this.d[y * W + x]; };
  Grid.prototype.set = function (x, y, c) { if (x >= 0 && y >= 0 && x < W && y < W) this.d[y * W + x] = c; };

  function ellipse(g, cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.4), dy = (y - cy) / (ry + 0.4);
        if (dx * dx + dy * dy <= 1) g.set(x, y, c);
      }
  }
  function disc(g, cx, cy, r, c) { ellipse(g, cx, cy, r, r, c); }
  function rect(g, x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.set(x, y, c);
  }
  function rrect(g, x0, y0, x1, y1, rad, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const nx = Math.max(x0 + rad - x, x - (x1 - rad), 0);
      const ny = Math.max(y0 + rad - y, y - (y1 - rad), 0);
      if (nx * nx + ny * ny <= (rad + 0.4) * (rad + 0.4)) g.set(x, y, c);
    }
  }
  function tri(g, ax, ay, bx, by, cx, cy, c) {
    const minX = Math.floor(Math.min(ax, bx, cx)), maxX = Math.ceil(Math.max(ax, bx, cx));
    const minY = Math.floor(Math.min(ay, by, cy)), maxY = Math.ceil(Math.max(ay, by, cy));
    const s = (p1x, p1y, p2x, p2y, px, py) => (px - p2x) * (p1y - p2y) - (p1x - p2x) * (py - p2y);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const d1 = s(ax, ay, bx, by, x, y), d2 = s(bx, by, cx, cy, x, y), d3 = s(cx, cy, ax, ay, x, y);
      const neg = (d1 < 0) || (d2 < 0) || (d3 < 0), pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      if (!(neg && pos)) g.set(x, y, c);
    }
  }
  function stroke(g, pts, r0, r1, c) {
    let total = 0; const lens = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      lens.push(l); total += l;
    }
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const steps = Math.max(2, Math.ceil(lens[i - 1] * 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t;
        const y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
        const gt = (acc + lens[i - 1] * t) / total;
        disc(g, x, y, r0 + (r1 - r0) * gt, c);
      }
      acc += lens[i - 1];
    }
  }
  // ball with soft top-left light: shadow rim bottom-right + optional highlight
  function ball(g, cx, cy, rx, ry, base, shad, hi) {
    ellipse(g, cx, cy, rx, ry, shad || base);
    if (shad) ellipse(g, cx - 0.8, cy - 0.8, rx - 0.8, ry - 0.8, base);
    if (hi) ellipse(g, cx - rx * 0.38, cy - ry * 0.45, Math.max(1.6, rx * 0.3), Math.max(1.2, ry * 0.2), hi);
  }
  function clipTo(g, colors, fn) {
    const proto = Grid.prototype.set;
    g.set = function (x, y, c) { const cur = this.get(x, y); if (cur && colors.indexOf(cur) >= 0) proto.call(this, x, y, c); };
    fn(); delete g.set;
  }
  function outline(g) {
    const orig = g.d.slice();
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? null : orig[y * W + x];
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      if (orig[y * W + x] !== null) continue;
      if (at(x + 1, y) || at(x - 1, y) || at(x, y + 1) || at(x, y - 1)) g.set(x, y, P.navy);
    }
  }
  // face bits
  function eye(g, x, y, ry) {
    ry = ry || 3;
    ellipse(g, x, y, 2, ry, P.navy);
    g.set(Math.round(x - 1), y - ry + 1, P.crm);
    g.set(Math.round(x - 1), y - ry + 2, P.crm);
  }
  function smileArc(g, cx, y, w, depth, c) {
    c = c || P.navy;
    for (let x = Math.ceil(cx - w); x <= Math.floor(cx + w); x++) {
      const t = (x - cx) / w;
      g.set(x, y + Math.round(depth * (1 - 1.7 * t * t)), c);
    }
  }
  function openMouth(g, cx, y, rx, ry) {
    ellipse(g, cx, y, rx || 3, ry || 2.6, P.navy);
    ellipse(g, cx, y + 1, (rx || 3) * 0.6, (ry || 2.6) * 0.5, P.pnk);
  }
  function blush(g, x, y) { ellipse(g, x, y, 1.7, 1, P.pnk); }
  function eyes(g, cx, y, sp, ry) { eye(g, cx - sp, y, ry); eye(g, cx + sp, y, ry); }

  const CX = 31.5;
  const S = [];

  S.push({ name: 'dolphin', draw(g) {
    tri(g, 28, 14, 41, 14, 39, 4, P.sky);                 // dorsal fin (swept back)
    tri(g, 34, 14, 41, 14, 39, 4, P.lav);
    ball(g, 24, 56, 5, 3.4, P.sky, P.lav);                // flukes
    ball(g, 39, 56, 5, 3.4, P.sky, P.lav);
    ball(g, CX, 52, 5, 5, P.sky, P.lav);                  // tail root
    ball(g, 17, 42, 4.4, 2.8, P.sky, P.lav);              // flippers
    ball(g, 46, 42, 4.4, 2.8, P.sky, P.lav);
    ball(g, CX, 45, 10, 9, P.sky, P.lav);                 // body
    ellipse(g, CX, 46, 6, 6.5, P.crm);                    // belly
    ball(g, CX, 25, 15, 13, P.sky, P.lav);                // head
    ball(g, CX, 34, 6, 3.4, P.crm, P.lgy);                // snout
    eyes(g, CX, 27, 7);
    smileArc(g, CX, 34, 2.6, 1);
    blush(g, CX - 12, 31); blush(g, CX + 12, 31);
  }});

  S.push({ name: 'elephant', draw(g) {
    ball(g, 11, 24, 9, 12, P.lgy, P.lav);                 // huge ears
    ball(g, 52, 24, 9, 12, P.lgy, P.lav);
    ellipse(g, 11, 24, 5.2, 8, P.pch);
    ellipse(g, 52, 24, 5.2, 8, P.pch);
    ball(g, CX, 48, 11, 8.5, P.lgy, P.lav);               // body
    ball(g, 25, 56, 4.5, 3, P.lgy, P.lav);                // feet
    ball(g, 38, 56, 4.5, 3, P.lgy, P.lav);
    ball(g, CX, 25, 14, 13, P.lgy, P.lav, P.crm);         // head
    stroke(g, [[31, 33], [31, 38], [33, 42], [37, 44], [41, 43], [43, 40]], 3.8, 2.8, P.navy); // trunk outline
    stroke(g, [[31, 33], [31, 38], [33, 42], [37, 44], [41, 43], [43, 40]], 2.8, 1.8, P.lgy); // trunk
    eyes(g, CX, 26, 7);
    smileArc(g, 24.5, 34, 2.6, 1);                        // smile beside trunk
    blush(g, CX - 12, 31); blush(g, CX + 12, 31);
  }});

  S.push({ name: 'lion', draw(g) {
    for (let a = 0; a < 12; a++) {                        // bumpy mane
      const th = a / 12 * Math.PI * 2;
      disc(g, CX + Math.cos(th) * 15, 25 + Math.sin(th) * 14, 4.2, P.brn);
    }
    ball(g, CX, 25, 16, 15, P.brn, P.plum);               // mane core
    stroke(g, [[41, 53], [48, 51], [52, 48]], 1.6, 1.4, P.org); // tail
    ball(g, 53, 45, 3.2, 3.6, P.brn, P.plum);             // tail tuft
    ball(g, CX, 49, 10, 8, P.org, P.brn);                 // body
    ball(g, 25, 56, 4, 3, P.org, P.brn);                  // feet
    ball(g, 38, 56, 4, 3, P.org, P.brn);
    ball(g, CX, 26, 11, 10, P.org, P.brn, P.yel);         // face
    ball(g, CX, 31, 5, 3.4, P.pch);                       // muzzle
    rect(g, 30, 28, 33, 29, P.navy);                      // nose
    eyes(g, CX, 25, 6);
    smileArc(g, CX, 32, 2.4, 1);
    blush(g, CX - 9, 29); blush(g, CX + 9, 29);
  }});

  S.push({ name: 'tiger', draw(g) {
    disc(g, 21, 12, 5, P.org); disc(g, 21, 12, 2.5, P.pch);   // ears
    disc(g, 42, 12, 5, P.org); disc(g, 42, 12, 2.5, P.pch);
    stroke(g, [[42, 52], [47, 50], [49, 46]], 1.8, 1.6, P.org); // tail
    disc(g, 49.5, 45, 2, P.blk);                          // tail tip
    ball(g, CX, 48, 10, 8, P.org, P.brn);                 // body
    ellipse(g, CX, 49, 5.5, 6, P.crm);                    // belly
    ball(g, 25, 56, 4, 3, P.org, P.brn);                  // feet
    ball(g, 38, 56, 4, 3, P.org, P.brn);
    ball(g, CX, 25, 15, 13, P.org, P.brn, P.yel);         // head
    clipTo(g, [P.org, P.brn, P.yel], function () {        // stripes
      rect(g, 27, 12, 28, 16, P.blk);
      rect(g, 31, 11, 32, 18, P.blk);
      rect(g, 35, 12, 36, 16, P.blk);
      rect(g, 14, 21, 20, 22, P.blk); rect(g, 14, 26, 19, 27, P.blk);
      rect(g, 43, 21, 49, 22, P.blk); rect(g, 44, 26, 49, 27, P.blk);
      rect(g, 21, 44, 24, 45, P.blk); rect(g, 39, 44, 42, 45, P.blk);
    });
    ball(g, CX, 31, 6, 4, P.crm, P.lgy);                  // muzzle
    rect(g, 30, 28, 33, 29, P.pnk);                       // nose
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 32, 2.6, 1);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

  S.push({ name: 'crocodile', draw(g) {
    tri(g, 23, 11, 28, 11, 25.5, 6, P.grn);               // head ridges
    tri(g, 29, 10, 34, 10, 31.5, 4, P.grn);
    tri(g, 35, 11, 40, 11, 37.5, 6, P.grn);
    stroke(g, [[41, 50], [47, 49], [51, 45], [52, 40]], 3, 1.8, P.lim); // tail
    tri(g, 47, 46, 51, 45, 50, 41, P.grn);                // tail ridge
    ball(g, CX, 47, 10, 7.5, P.lim, P.grn);               // body
    ellipse(g, CX, 48, 5.5, 5, P.crm);                    // belly
    ball(g, 24, 55, 4, 3, P.lim, P.grn);                  // feet
    ball(g, 39, 55, 4, 3, P.lim, P.grn);
    ball(g, CX, 20, 13, 10, P.lim, P.grn);                // head
    ball(g, CX, 31, 11, 6.5, P.lim, P.grn);               // big snout
    g.set(28, 27, P.grn); g.set(29, 27, P.grn);           // nostrils
    g.set(34, 27, P.grn); g.set(35, 27, P.grn);
    smileArc(g, CX, 31, 6, 2);                            // wide smile
    rect(g, 27, 33, 28, 34, P.crm);                       // friendly teeth
    rect(g, 35, 33, 36, 34, P.crm);
    eyes(g, CX, 20, 7);
    blush(g, CX - 11, 24); blush(g, CX + 11, 24);
  }});

  S.push({ name: 'bear', draw(g) {
    disc(g, 20, 12, 5.5, P.brn); disc(g, 20, 12, 2.8, P.pch); // ears
    disc(g, 43, 12, 5.5, P.brn); disc(g, 43, 12, 2.8, P.pch);
    ball(g, CX, 49, 11, 8, P.brn, P.plum);                // body
    ellipse(g, CX, 50, 6, 5.5, P.pch);                    // belly
    ball(g, 19, 46, 3.5, 4, P.brn, P.plum);               // arms
    ball(g, 44, 46, 3.5, 4, P.brn, P.plum);
    ball(g, 25, 57, 4.5, 3, P.brn, P.plum);               // feet
    ball(g, 38, 57, 4.5, 3, P.brn, P.plum);
    ball(g, CX, 26, 15, 13, P.brn, P.plum);               // head
    ball(g, CX, 32, 7, 5, P.pch);                         // big muzzle
    ellipse(g, CX, 29.5, 2, 1.4, P.navy);                 // nose
    eyes(g, CX, 25, 8);
    smileArc(g, CX, 33, 2.4, 1);
    blush(g, CX - 13, 30); blush(g, CX + 13, 30);
  }});

  S.push({ name: 'giraffe', draw(g) {
    rect(g, 26, 4, 27, 9, P.yel); disc(g, 26.5, 3, 1.7, P.brn); // ossicones
    rect(g, 36, 4, 37, 9, P.yel); disc(g, 36.5, 3, 1.7, P.brn);
    ellipse(g, 18, 14, 3.6, 2.2, P.yel);                  // ears
    ellipse(g, 45, 14, 3.6, 2.2, P.yel);
    rect(g, 26, 24, 37, 46, P.org);                       // neck (shaded col)
    rect(g, 26, 24, 35, 46, P.yel);
    ball(g, CX, 51, 11, 8, P.yel, P.org);                 // body
    ball(g, 25, 58, 3.6, 2.6, P.yel);                     // legs
    ball(g, 38, 58, 3.6, 2.6, P.yel);
    ball(g, CX, 16, 11.5, 10, P.yel, P.org, P.crm);       // head
    clipTo(g, [P.yel, P.org], function () {               // patches
      disc(g, 29, 30, 2.2, P.brn); disc(g, 35, 36, 2.4, P.brn);
      disc(g, 28, 41, 2, P.brn); disc(g, 36, 44, 2.1, P.brn);
      disc(g, 25, 49, 2.4, P.brn); disc(g, 38, 52, 2.2, P.brn);
    });
    ball(g, CX, 20, 5.5, 3.6, P.pch);                     // muzzle
    g.set(29, 19, P.brn); g.set(34, 19, P.brn);           // nostrils
    eyes(g, CX, 15, 6);
    smileArc(g, CX, 21, 2, 1);
    blush(g, CX - 10, 18); blush(g, CX + 10, 18);
  }});

  S.push({ name: 'monkey', draw(g) {
    disc(g, 15, 25, 5, P.brn); disc(g, 15, 25, 2.6, P.pch);   // ears
    disc(g, 48, 25, 5, P.brn); disc(g, 48, 25, 2.6, P.pch);
    stroke(g, [[42, 50], [48, 47], [52, 42], [53, 36], [50, 31], [45, 30], [43, 33]], 1.8, 1.5, P.brn); // curled tail
    ball(g, CX, 48, 9.5, 8, P.brn, P.plum);               // body
    ellipse(g, CX, 49, 5, 5, P.pch);                      // belly
    ball(g, 21, 46, 3.4, 4, P.brn, P.plum);               // arms
    ball(g, 42, 46, 3.4, 4, P.brn, P.plum);
    ball(g, 26, 56, 4, 3, P.brn, P.plum);                 // feet
    ball(g, 37, 56, 4, 3, P.brn, P.plum);
    ball(g, CX, 25, 14, 13, P.brn, P.plum);               // head
    disc(g, 25.5, 24, 6.5, P.pch);                        // face patch
    disc(g, 37.5, 24, 6.5, P.pch);
    ellipse(g, CX, 28, 9, 7, P.pch);
    eyes(g, CX, 25, 6);
    g.set(30, 29, P.navy); g.set(33, 29, P.navy);         // nostrils
    smileArc(g, CX, 31, 3, 1);
    blush(g, CX - 9, 29); blush(g, CX + 9, 29);
  }});

  S.push({ name: 'coffee', draw(g) {
    stroke(g, [[26, 16], [24, 12], [26, 8], [24, 4]], 1.4, 1.2, P.lgy); // steam
    stroke(g, [[37, 17], [39, 13], [37, 9], [39, 5]], 1.4, 1.2, P.lgy);
    ellipse(g, 49, 39, 7, 8, P.red);                      // handle
    ellipse(g, 50, 39, 3.4, 4.5, null);                   // handle hole
    rrect(g, 17, 22, 46, 56, 6, P.plum);                  // mug (shadow)
    rrect(g, 17, 22, 44, 54, 6, P.red);                   // mug body
    rect(g, 20, 28, 21, 40, P.pnk);                       // highlight
    ellipse(g, CX, 23, 15, 4, P.crm);                     // rim
    ellipse(g, CX, 23, 12.5, 2.8, P.brn);                 // coffee
    eyes(g, CX, 37, 7);
    smileArc(g, CX, 44, 3, 1.4);
    blush(g, CX - 12, 41); blush(g, CX + 12, 41);
  }});

  S.push({ name: 'eating', draw(g) {
    disc(g, 20, 10, 5.5, P.brn); disc(g, 20, 10, 2.8, P.pch); // bear ears
    disc(g, 43, 10, 5.5, P.brn); disc(g, 43, 10, 2.8, P.pch);
    ball(g, CX, 48, 11, 8, P.brn, P.plum);                // body
    ball(g, 25, 57, 4.5, 3, P.brn, P.plum);               // feet
    ball(g, 38, 57, 4.5, 3, P.brn, P.plum);
    // sandwich
    rrect(g, 19, 36, 44, 41, 2, P.crm);                   // top bread
    rect(g, 18, 41, 45, 42, P.org);                       // cheese
    rect(g, 19, 43, 44, 44, P.lim);                       // lettuce
    for (let x = 20; x <= 43; x += 3) g.set(x, 45, P.lim);
    rrect(g, 19, 45, 44, 51, 2, P.crm);                   // bottom bread
    rect(g, 20, 50, 43, 51, P.lgy);                       // bread shade
    disc(g, 25, 36, 2.3, null); disc(g, 38, 36, 2.3, null); // bite notches
    disc(g, 20, 44, 3.2, P.brn); disc(g, 43, 44, 3.2, P.brn); // paws
    ball(g, CX, 24, 15, 13, P.brn, P.plum);               // head
    ball(g, CX, 30, 7, 5, P.pch);                         // muzzle
    // happy open bite: flat-top "D" mouth
    ellipse(g, CX, 34, 5, 4, P.navy);
    rect(g, 26, 29, 37, 31, P.pch);                       // flatten mouth top
    ellipse(g, CX, 36, 2.8, 1.6, P.pnk);                  // tongue
    ellipse(g, CX, 28.5, 2, 1.3, P.navy);                 // nose
    eyes(g, CX, 23, 8);
    blush(g, CX - 13, 28); blush(g, CX + 13, 28);
  }});

  /* Batch 2 — tower enemies. Same chibi rules: the player is under 6, so
     even the boss is pleased to see you. */

  S.push({ name: 'enemy-slime', draw(g) {
    ball(g, CX + 6, 20, 3, 3.2, P.lim, P.grn);            // gooey top bump
    ball(g, CX, 38, 17, 15, P.lim, P.grn);                // dome
    ellipse(g, 14, 50, 3.4, 2.6, P.lim);                  // side goo blobs
    ellipse(g, 49, 50, 3.4, 2.6, P.lim);
    ellipse(g, CX, 51, 18, 4, P.grn);                     // spread base (shadow)
    ellipse(g, CX, 50, 17, 3.2, P.lim);
    eyes(g, CX, 36, 7);
    smileArc(g, CX, 43, 3, 1.4);
    blush(g, CX - 12, 40); blush(g, CX + 12, 40);
  }});

  S.push({ name: 'enemy-bat', draw(g) {
    tri(g, 4, 24, 21, 21, 20, 40, P.lav);                 // huge wings
    tri(g, 59, 24, 42, 21, 43, 40, P.lav);
    tri(g, 4, 24, 13, 30, 9, 35, null);                   // wing scallop notches
    tri(g, 59, 24, 50, 30, 54, 35, null);
    tri(g, 22, 15, 28, 19, 20, 24, P.lgy);                // big ears
    tri(g, 41, 15, 35, 19, 43, 24, P.lgy);
    tri(g, 23, 17, 26, 19, 22, 22, P.pch);
    tri(g, 40, 17, 37, 19, 41, 22, P.pch);
    ball(g, CX, 33, 13, 12, P.lgy, P.lav);                // round body-head
    ball(g, 27, 46, 3, 2.2, P.lgy, P.lav);                // stubby feet
    ball(g, 36, 46, 3, 2.2, P.lgy, P.lav);
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.6, 1.2);
    rect(g, 29, 39, 29, 40, P.crm);                       // friendly fangs
    rect(g, 34, 39, 34, 40, P.crm);
    blush(g, CX - 10, 36); blush(g, CX + 10, 36);
  }});

  S.push({ name: 'boss-dragon', draw(g) {
    tri(g, 8, 20, 22, 17, 19, 38, P.org);                 // wings
    tri(g, 55, 20, 41, 17, 44, 38, P.org);
    tri(g, 24, 11, 29, 13, 25, 4, P.yel);                 // horns
    tri(g, 39, 11, 34, 13, 38, 4, P.yel);
    stroke(g, [[42, 52], [49, 49], [53, 43]], 2.6, 1.6, P.red); // tail
    tri(g, 51, 44, 56, 42, 53, 38, P.yel);                // tail flame tip
    ball(g, CX, 48, 11, 8, P.red, P.plum);                // body
    ellipse(g, CX, 49, 6, 5.5, P.crm);                    // belly
    ball(g, 25, 56, 4.5, 3, P.red, P.plum);               // feet
    ball(g, 38, 56, 4.5, 3, P.red, P.plum);
    ball(g, CX, 25, 15, 13, P.red, P.plum);               // head
    ball(g, CX, 32, 6.5, 4.2, P.pch);                     // muzzle
    g.set(29, 30, P.plum); g.set(34, 30, P.plum);         // nostrils
    eyes(g, CX, 24, 7);
    smileArc(g, CX, 33, 2.8, 1.2);
    blush(g, CX - 12, 29); blush(g, CX + 12, 29);
  }});

  S.push({ name: 'enemy-mushroom', draw(g) {
    ball(g, CX, 42, 9.5, 10, P.crm, P.lgy);               // stalk
    ball(g, CX, 22, 17, 12, P.red, P.plum);               // cap
    ellipse(g, 21, 20, 3, 2, P.crm);                      // cap spots
    ellipse(g, 33, 14, 3.4, 2.2, P.crm);
    ellipse(g, 43, 22, 2.6, 1.8, P.crm);
    eyes(g, CX, 42, 5.5);
    smileArc(g, CX, 48, 2.6, 1.2);
    blush(g, CX - 9, 46); blush(g, CX + 9, 46);
  }});

  S.push({ name: 'enemy-snail', draw(g) {
    ball(g, 40, 30, 13, 12, P.org, P.brn);                // shell
    ellipse(g, 40, 30, 7.5, 6.5, P.yel);                  // swirl rings
    ellipse(g, 40, 30, 3.2, 2.8, P.org);
    stroke(g, [[14, 30], [12, 22]], 1.1, 1.1, P.grn);     // antennae
    stroke(g, [[22, 28], [23, 20]], 1.1, 1.1, P.grn);
    ball(g, 12, 21, 2.4, 2.4, P.lim, P.grn);
    ball(g, 23, 19, 2.4, 2.4, P.lim, P.grn);
    ellipse(g, CX, 53, 19, 5, P.lim);                     // foot
    ball(g, 18, 43, 8.5, 9, P.lim, P.grn);                // head
    eyes(g, 18, 42, 4, 2.4);
    smileArc(g, 18, 48, 2.2, 1);
    blush(g, 11, 45); blush(g, 25, 45);
  }});

  S.push({ name: 'boss-wolf', draw(g) {
    tri(g, 17, 17, 28, 12, 19, 4, P.dgy);                 // ears
    tri(g, 46, 17, 35, 12, 44, 4, P.dgy);
    tri(g, 20, 14, 26, 12, 21, 7, P.pch);
    tri(g, 43, 14, 37, 12, 42, 7, P.pch);
    stroke(g, [[46, 50], [54, 45], [56, 36]], 3.4, 1.8, P.dgy); // bushy tail
    ball(g, CX, 48, 11, 8.5, P.dgy, P.lav);               // body
    ellipse(g, CX, 49, 6, 5.5, P.lgy);                    // chest
    ball(g, 25, 56, 4.5, 3, P.dgy, P.lav);                // feet
    ball(g, 38, 56, 4.5, 3, P.dgy, P.lav);
    ball(g, CX, 25, 15, 13, P.dgy, P.lav);                // head
    ellipse(g, CX, 33, 7, 4.6, P.lgy);                    // muzzle
    ellipse(g, CX, 31, 2.2, 1.5, P.navy);                 // nose
    eyes(g, CX, 24, 7);
    smileArc(g, CX, 35, 2.6, 1.1);
    blush(g, CX - 12, 29); blush(g, CX + 12, 29);
  }});

  S.push({ name: 'enemy-cactus', draw(g) {
    stroke(g, [[20, 40], [17, 32]], 3, 3, P.lim);         // arms with elbows
    stroke(g, [[44, 44], [46, 36]], 3, 3, P.lim);
    ball(g, 17, 31, 3, 3, P.lim, P.grn);
    ball(g, 46, 35, 3, 3, P.lim, P.grn);
    ball(g, CX, 38, 10, 18, P.lim, P.grn);                // body
    ball(g, CX, 17, 4, 3, P.pnk, P.plum);                 // flower
    ball(g, CX, 17, 1.6, 1.4, P.yel);
    eyes(g, CX, 34, 5.5);
    smileArc(g, CX, 41, 2.6, 1.2);
    blush(g, CX - 8, 38); blush(g, CX + 8, 38);
  }});

  S.push({ name: 'enemy-scorpion', draw(g) {
    stroke(g, [[44, 48], [53, 40], [52, 28]], 3, 1.8, P.org); // curled tail
    ball(g, 51, 25, 3.2, 3.2, P.org, P.brn);              // stinger ball
    tri(g, 49, 21, 54, 21, 51, 15, P.yel);                // stinger tip
    ball(g, 15, 42, 5.5, 4.5, P.org, P.brn);              // claws
    ball(g, 15, 52, 5.5, 4.5, P.org, P.brn);
    rect(g, 15, 40, 16, 44, null); rect(g, 15, 50, 16, 54, null); // claw notches
    ball(g, 33, 48, 12, 9, P.org, P.brn);                 // body
    ball(g, 26, 57, 3.4, 2, P.org, P.brn);                // legs
    ball(g, 36, 58, 3.4, 2, P.org, P.brn);
    ball(g, 33, 34, 11, 10, P.org, P.brn);                // head
    eyes(g, 33, 33, 5.5);
    smileArc(g, 33, 39, 2.4, 1.1);
    blush(g, 24, 37); blush(g, 42, 37);
  }});

  S.push({ name: 'boss-mummy', draw(g) {
    ball(g, CX, 48, 11, 8.5, P.crm, P.lgy);               // wrapped body
    ball(g, 25, 56, 4.5, 3, P.crm, P.lgy);                // feet
    ball(g, 38, 56, 4.5, 3, P.crm, P.lgy);
    ball(g, 17, 42, 4, 3, P.crm, P.lgy);                  // reaching arms
    ball(g, 46, 42, 4, 3, P.crm, P.lgy);
    ball(g, CX, 25, 15, 13, P.crm, P.lgy);                // head
    clipTo(g, [P.crm], () => {                            // bandage stripes
      rect(g, 12, 14, 51, 15, P.lgy);
      rect(g, 12, 20, 51, 21, P.lgy);
      rect(g, 12, 42, 51, 43, P.lgy);
      rect(g, 12, 50, 51, 51, P.lgy);
    });
    rect(g, 22, 24, 41, 31, P.dgy);                       // eye gap in the wrap
    eyes(g, CX, 28, 6);
    stroke(g, [[45, 18], [51, 14], [52, 8]], 1.4, 1, P.crm); // loose bandage end
    smileArc(g, CX, 36, 2.6, 1.1);
    blush(g, CX - 12, 33); blush(g, CX + 12, 33);
  }});

  S.push({ name: 'player-kid', draw(g) {
    ball(g, CX, 48, 9, 7.5, P.yel, P.org);                // yellow romper
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn);                // feet
    ball(g, 37, 57, 4, 2.6, P.pch, P.brn);
    ball(g, 21, 47, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 42, 47, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 26, 14, 13, P.pch);                       // head (flat: a shade rim reads as a beard)
    ellipse(g, CX, 17, 13, 6.5, P.brn);                   // hair cap
    ellipse(g, 19, 22, 2, 4, P.brn);                      // side locks
    ellipse(g, 44, 22, 2, 4, P.brn);
    ball(g, CX, 9, 3, 3, P.brn);                          // sprout tuft
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 3, 1.4);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

  S.push({ name: 'player-dad', draw(g) {
    ball(g, CX, 49, 10, 8, P.sky, P.lav);                 // shirt
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn);                // feet
    ball(g, 37, 57, 4, 2.6, P.pch, P.brn);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 14, 13, P.pch, P.brn);                // head
    ellipse(g, CX, 17, 13, 5.5, P.dgy);                   // short dark hair
    ellipse(g, 19, 22, 2, 4, P.dgy);                      // sideburns
    ellipse(g, 44, 22, 2, 4, P.dgy);
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

  /* Slice 1 — corpus ranks 1–50, proof batch. Characters human-confirmed
     against dict.sqlite, not the advisory suggested_char column. */

  S.push({ name: 'man', draw(g) {              // 人 jan4
    ball(g, CX, 49, 10, 8, P.grn, P.plum);                // green shirt
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn);                // feet
    ball(g, 37, 57, 4, 2.6, P.pch, P.brn);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 14, 13, P.pch, P.brn);                // head
    ellipse(g, CX, 16, 13, 6, P.brn);                     // hair cap
    ellipse(g, 19, 21, 2, 4, P.brn);                      // side locks
    ellipse(g, 44, 21, 2, 4, P.brn);
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

  S.push({ name: 'house', draw(g) {            // 屋 uk1
    tri(g, 10, 31, 53, 31, CX, 11, P.plum);               // roof (shadow)
    tri(g, 10, 31, 51, 31, CX - 1, 12, P.red);            // roof
    rrect(g, 15, 31, 48, 57, 2, P.lgy);                   // walls (shadow)
    rrect(g, 15, 31, 46, 55, 2, P.crm);                   // walls
    rrect(g, 27, 47, 36, 57, 2, P.brn);                   // door
    g.set(34, 52, P.yel);                                 // doorknob
    eyes(g, CX, 39, 6);                                   // face on the wall
    smileArc(g, CX, 44, 3, 1.2);
    blush(g, CX - 11, 42); blush(g, CX + 11, 42);
  }});

  S.push({ name: 'car', draw(g) {              // 車 ce1
    disc(g, 19, 51, 6, P.navy);                           // wheels
    disc(g, 44, 51, 6, P.navy);
    disc(g, 19, 51, 2.4, P.lgy);
    disc(g, 44, 51, 2.4, P.lgy);
    rrect(g, 8, 40, 55, 52, 4, P.lav);                    // lower body (shadow)
    rrect(g, 8, 40, 53, 50, 4, P.sky);                    // lower body
    rrect(g, 17, 28, 45, 41, 5, P.sky);                   // cabin
    rrect(g, 20, 30, 42, 39, 3, P.crm);                   // windshield
    disc(g, 51, 45, 2, P.yel);                            // headlight
    eyes(g, CX, 34, 6);                                   // face on windshield
    smileArc(g, CX, 46, 4, 1.4);                          // grille smile
    blush(g, 16, 45); blush(g, 47, 45);
  }});

  S.push({ name: 'dog', draw(g) {              // 狗 gau2
    stroke(g, [[43, 50], [49, 47], [51, 41]], 2, 1.5, P.brn); // tail
    ball(g, CX, 49, 10, 8, P.brn, P.plum);                // body
    ellipse(g, CX, 50, 5.5, 5, P.pch);                    // belly
    ball(g, 25, 57, 4, 3, P.brn, P.plum);                 // feet
    ball(g, 38, 57, 4, 3, P.brn, P.plum);
    ball(g, CX, 26, 14, 12, P.brn, P.plum);               // head
    ball(g, 17, 30, 3.6, 7, P.brn, P.plum);               // floppy ears
    ball(g, 46, 30, 3.6, 7, P.brn, P.plum);
    clipTo(g, [P.brn, P.plum], function () {              // dark eye patch
      disc(g, 38, 24, 5, P.dgy);
    });
    ball(g, CX, 32, 6.5, 4.5, P.crm, P.lgy);              // muzzle
    ellipse(g, CX, 29.5, 2, 1.4, P.navy);                 // nose
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 33, 2.4, 1);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

  S.push({ name: 'horse', draw(g) {            // 馬 maa5
    tri(g, 21, 13, 28, 14, 23, 3, P.brn);                 // ears (pointed)
    tri(g, 42, 13, 35, 14, 40, 3, P.brn);
    tri(g, 23, 13, 27, 14, 25, 6, P.pch);                 // ear inners
    tri(g, 40, 13, 36, 14, 38, 6, P.pch);
    stroke(g, [[43, 51], [49, 49], [51, 43]], 1.8, 1.4, P.brn); // tail
    ball(g, CX, 50, 11, 8, P.org, P.brn);                 // body
    ball(g, 24, 58, 3.6, 2.4, P.org, P.brn);              // legs
    ball(g, 39, 58, 3.6, 2.4, P.org, P.brn);
    ball(g, CX, 25, 11, 13, P.org, P.brn);                // long head
    rect(g, 28, 8, 35, 14, P.brn);                        // mane tuft between ears
    ball(g, CX, 37, 6.5, 5, P.pch, P.brn);                // long snout
    g.set(29, 38, P.navy); g.set(34, 38, P.navy);         // nostrils
    eyes(g, CX, 24, 7);
    smileArc(g, CX, 40, 2.4, 1);
    blush(g, CX - 11, 31); blush(g, CX + 11, 31);
  }});

  S.push({ name: 'tree', draw(g) {             // 樹 syu6
    rrect(g, 27, 38, 36, 58, 2, P.dgy);                   // trunk (shadow)
    rrect(g, 27, 38, 34, 58, 2, P.brn);                   // trunk
    for (let a = 0; a < 10; a++) {                        // bushy crown
      const th = a / 10 * Math.PI * 2;
      disc(g, CX + Math.cos(th) * 14, 24 + Math.sin(th) * 13, 5, P.grn);
    }
    ball(g, CX, 24, 16, 15, P.lim, P.grn);                // foliage
    disc(g, 21, 27, 2.4, P.red);                          // one apple
    g.set(21, 24, P.brn);                                 // apple stem
    eyes(g, CX, 24, 7);
    smileArc(g, CX, 32, 3, 1.2);
    blush(g, CX - 12, 29); blush(g, CX + 12, 29);
  }});

  S.push({ name: 'boat', draw(g) {             // 船 syun4
    ellipse(g, CX, 57, 20, 3, P.sky);                     // water
    rect(g, 31, 18, 32, 42, P.brn);                       // mast
    tri(g, 30, 19, 30, 39, 18, 34, P.lgy);                // back sail
    tri(g, 33, 19, 33, 39, 47, 34, P.crm);                // main sail
    tri(g, 12, 42, 51, 42, 44, 54, P.plum);               // hull (shadow)
    tri(g, 12, 42, 44, 54, 20, 54, P.plum);
    tri(g, 12, 42, 51, 42, 45, 52, P.red);                // hull
    tri(g, 12, 42, 45, 52, 21, 52, P.red);
    rect(g, 14, 42, 49, 44, P.crm);                       // deck stripe
    eyes(g, CX, 47, 5);                                   // face on hull
    smileArc(g, CX, 51, 3, 1.2);
    blush(g, CX - 12, 49); blush(g, CX + 12, 49);
  }});

  S.push({ name: 'gun', draw(g) {              // 槍 coeng1 — drawn as a kid-safe toy squirt gun
    rrect(g, 22, 16, 38, 30, 3, P.plum);                  // water tank (shadow)
    rrect(g, 22, 16, 36, 28, 3, P.pnk);                   // water tank
    rrect(g, 12, 30, 46, 41, 3, P.brn);                   // barrel (shadow)
    rrect(g, 12, 30, 46, 39, 3, P.org);                   // barrel body
    rect(g, 46, 33, 50, 37, P.sky);                       // nozzle
    rrect(g, 15, 39, 26, 55, 3, P.brn);                   // grip (shadow)
    rrect(g, 15, 39, 24, 53, 3, P.org);                   // grip
    eyes(g, 33, 34, 4);                                   // face on the barrel
    smileArc(g, 33, 37, 2.4, 1);
    blush(g, 26, 36); blush(g, 41, 36);
  }});

  S.push({ name: 'girl', draw(g) {             // 女 neoi5
    disc(g, 15, 30, 4.5, P.brn);                          // pigtails
    disc(g, 48, 30, 4.5, P.brn);
    ball(g, CX, 50, 10, 8, P.pnk, P.plum);                // dress
    tri(g, 20, 57, 43, 57, CX, 46, P.pnk);                // skirt flare
    ball(g, 26, 58, 3.6, 2.4, P.pch, P.brn);              // feet
    ball(g, 37, 58, 3.6, 2.4, P.pch, P.brn);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 14, 13, P.pch, P.brn);                // head
    ellipse(g, CX, 15, 13, 6.5, P.brn);                   // hair
    ellipse(g, 18, 24, 2.5, 6, P.brn);                    // side hair
    ellipse(g, 45, 24, 2.5, 6, P.brn);
    disc(g, CX, 9, 2, P.red);                             // bow
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

  S.push({ name: 'guy', draw(g) {              // 佬 lou2 — older casual bloke
    ball(g, CX, 49, 10, 8, P.org, P.brn);                 // shirt
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn);                // feet
    ball(g, 37, 57, 4, 2.6, P.pch, P.brn);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 14, 13, P.pch, P.brn);                // head
    ellipse(g, CX, 16, 13, 5, P.dgy);                     // short grey hair
    ellipse(g, 19, 21, 2, 3.5, P.dgy);
    ellipse(g, 44, 21, 2, 3.5, P.dgy);
    eyes(g, CX, 28, 6);
    rect(g, 27, 33, 36, 34, P.dgy);                       // moustache
    smileArc(g, CX, 37, 3, 1);
    blush(g, CX - 11, 33); blush(g, CX + 11, 33);
  }});

  S.push({ name: 'boy', draw(g) {              // 男仔 naam4 zai2
    ball(g, CX, 49, 9, 7.5, P.sky, P.lav);                // t-shirt
    rect(g, 24, 52, 39, 58, P.brn);                       // shorts
    ball(g, 26, 58, 3.6, 2.4, P.pch, P.brn);              // legs
    ball(g, 37, 58, 3.6, 2.4, P.pch, P.brn);
    ball(g, 21, 47, 3, 2.4, P.pch, P.brn);                // hands
    ball(g, 42, 47, 3, 2.4, P.pch, P.brn);
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 16, 12, 5.5, P.brn);                   // hair
    tri(g, 26, 12, 32, 14, 28, 7, P.brn);                 // spiky tufts
    tri(g, 33, 12, 39, 14, 37, 7, P.brn);
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 33, 2.8, 1.3);
    blush(g, CX - 9, 31); blush(g, CX + 9, 31);
  }});

  S.push({ name: 'men', draw(g) {              // 男 naam4 — two figures
    ball(g, 18, 44, 7, 6, P.sky, P.lav);                  // left body
    ball(g, 14, 51, 2.8, 1.8, P.pch, P.brn);              // feet
    ball(g, 22, 51, 2.8, 1.8, P.pch, P.brn);
    ball(g, 18, 28, 9, 8.5, P.pch, P.brn);                // head
    ellipse(g, 18, 22, 8, 3.5, P.dgy);                    // hair
    eyes(g, 18, 29, 4);
    smileArc(g, 18, 33, 2, 0.9);
    ball(g, 45, 44, 7, 6, P.grn, P.plum);                 // right body
    ball(g, 41, 51, 2.8, 1.8, P.pch, P.brn);
    ball(g, 49, 51, 2.8, 1.8, P.pch, P.brn);
    ball(g, 45, 28, 9, 8.5, P.pch, P.brn);
    ellipse(g, 45, 22, 8, 3.5, P.brn);
    eyes(g, 45, 29, 4);
    smileArc(g, 45, 33, 2, 0.9);
  }});

  S.push({ name: 'mother', draw(g) {           // 母 mou5
    ellipse(g, 16, 34, 4, 11, P.brn);                     // long hair
    ellipse(g, 47, 34, 4, 11, P.brn);
    ball(g, CX, 50, 10, 8, P.red, P.plum);                // dress
    tri(g, 20, 57, 43, 57, CX, 46, P.red);                // skirt
    ball(g, 26, 58, 3.6, 2.4, P.pch, P.brn);              // feet
    ball(g, 37, 58, 3.6, 2.4, P.pch, P.brn);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 14, 13, P.pch, P.brn);                // head
    ellipse(g, CX, 15, 13, 6.5, P.brn);                   // hair top
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

  S.push({ name: 'father', draw(g) {           // 爸 baa4
    ball(g, CX, 49, 10, 8, P.plum);                       // shirt
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn);                // feet
    ball(g, 37, 57, 4, 2.6, P.pch, P.brn);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 14, 13, P.pch, P.brn);                // head
    ellipse(g, CX, 16, 13, 5, P.brn);                     // hair
    eyes(g, CX, 28, 6);
    rect(g, 27, 33, 36, 34, P.brn);                       // moustache
    smileArc(g, CX, 37, 3, 1);
    blush(g, CX - 11, 33); blush(g, CX + 11, 33);
  }});

  S.push({ name: 'baby', draw(g) {             // 寶 bou2
    ball(g, CX, 46, 9, 7.5, P.sky, P.lav);                // onesie
    ball(g, 22, 50, 3, 2.4, P.pch, P.brn);                // hands
    ball(g, 41, 50, 3, 2.4, P.pch, P.brn);
    ball(g, 26, 55, 3.4, 2.4, P.pch, P.brn);              // feet
    ball(g, 37, 55, 3.4, 2.4, P.pch, P.brn);
    ball(g, CX, 26, 15, 14, P.pch, P.brn);                // big head
    disc(g, CX, 13, 2.5, P.brn);                          // curl
    eyes(g, CX, 28, 6.5);
    smileArc(g, CX, 35, 2.8, 1.3);
    blush(g, CX - 11, 32); blush(g, CX + 11, 32);
  }});

  S.push({ name: 'doctor', draw(g) {           // 醫生 ji1 sang1
    ball(g, CX, 49, 10, 8, P.crm, P.lgy);                 // white coat
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn);                // feet
    ball(g, 37, 57, 4, 2.6, P.pch, P.brn);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    rect(g, 30, 45, 33, 51, P.red); rect(g, 28, 47, 35, 49, P.red); // red cross
    ball(g, CX, 27, 14, 13, P.pch, P.brn);                // head
    ellipse(g, CX, 16, 13, 5, P.brn);                     // hair
    disc(g, CX, 18, 2.6, P.lgy); disc(g, CX, 18, 1.3, P.sky); // head mirror
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 3, 1.1);
    blush(g, CX - 11, 34); blush(g, CX + 11, 34);
  }});

  S.push({ name: 'police', draw(g) {           // 警察 ging2 caat3
    ball(g, CX, 49, 10, 8, P.sky, P.lav);                 // uniform
    ball(g, 26, 57, 4, 2.6, P.sky, P.lav);                // legs
    ball(g, 37, 57, 4, 2.6, P.sky, P.lav);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    rect(g, 31, 44, 32, 51, P.navy);                      // shirt placket
    ball(g, CX, 28, 13, 12, P.pch, P.brn);                // head
    rrect(g, 18, 13, 45, 19, 2, P.navy);                  // cap brim
    ellipse(g, CX, 12, 11, 5, P.navy);                    // cap dome
    disc(g, CX, 13, 2, P.yel);                            // badge
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 3, 1.1);
    blush(g, CX - 11, 34); blush(g, CX + 11, 34);
  }});

  S.push({ name: 'bed', draw(g) {              // 床 cong4
    rrect(g, 10, 30, 18, 52, 2, P.brn);                   // headboard
    rrect(g, 46, 34, 54, 52, 2, P.brn);                   // footboard
    rect(g, 12, 48, 52, 55, P.brn);                       // frame
    rrect(g, 14, 40, 50, 50, 2, P.sky);                   // blanket
    rect(g, 14, 40, 50, 43, P.crm);                       // folded sheet
    ball(g, 21, 38, 6, 4, P.crm, P.lgy);                  // pillow
    eyes(g, 34, 46, 4);                                   // face on blanket
    smileArc(g, 34, 49, 2.4, 1);
    blush(g, 28, 48); blush(g, 40, 48);
  }});

  S.push({ name: 'room', draw(g) {             // 房 fong2
    rrect(g, 9, 12, 54, 57, 3, P.lgy);                    // wall (shadow border)
    rrect(g, 9, 12, 52, 55, 3, P.crm);                    // wall
    rect(g, 9, 47, 54, 57, P.brn);                        // floor
    rrect(g, 13, 18, 25, 30, 1, P.sky);                   // window
    rect(g, 18, 18, 19, 30, P.crm); rect(g, 13, 23, 25, 24, P.crm); // window frame
    rrect(g, 38, 18, 49, 28, 1, P.lim);                   // picture
    ellipse(g, 31, 52, 11, 3, P.red);                     // rug
    eyes(g, 33, 38, 5);                                   // face on wall
    smileArc(g, 33, 43, 2.6, 1.1);
    blush(g, 25, 41); blush(g, 41, 41);
  }});

  S.push({ name: 'face', draw(g) {             // 面 min6
    disc(g, 12, 30, 3, P.pch);                            // ears
    disc(g, 51, 30, 3, P.pch);
    ball(g, CX, 31, 18, 18, P.pch, P.brn);                // big face, no hair
    eyes(g, CX, 30, 8);
    ellipse(g, CX, 36, 2, 1.6, P.brn);                    // nose
    smileArc(g, CX, 42, 5, 1.6);
    blush(g, CX - 13, 38); blush(g, CX + 13, 38);
  }});

  S.push({ name: 'phone', draw(g) {            // 電話 din6 waa2
    rrect(g, 20, 8, 44, 56, 5, P.dgy);                    // body (shadow)
    rrect(g, 20, 8, 43, 55, 5, P.navy);                   // body
    rrect(g, 23, 14, 41, 48, 2, P.sky);                   // screen
    disc(g, CX, 11, 1, P.lgy);                            // speaker
    disc(g, CX, 52, 1.6, P.lgy);                          // home button
    eyes(g, CX, 28, 6);                                   // face on screen
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, 26, 32); blush(g, 39, 32);
  }});

  S.push({ name: 'hair', draw(g) {             // 頭髮 tau4 faat3
    ball(g, CX, 30, 17, 17, P.brn, P.plum);               // big hair mass
    ball(g, 18, 18, 6, 6, P.brn, P.plum);                 // volume bumps
    ball(g, 45, 18, 6, 6, P.brn, P.plum);
    ball(g, CX, 12, 7, 6, P.brn, P.plum);
    ellipse(g, CX, 41, 12, 9, P.pch);                     // face peeking below
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 45, 2.6, 1.1);
    blush(g, CX - 9, 43); blush(g, CX + 9, 43);
  }});

  S.push({ name: 'school', draw(g) {           // 學校 hok6 haau6
    rect(g, 31, 4, 32, 30, P.dgy);                        // flagpole
    tri(g, 33, 4, 33, 11, 42, 7, P.red);                  // flag
    rrect(g, 8, 28, 55, 57, 2, P.lgy);                    // building (shadow)
    rrect(g, 8, 28, 53, 55, 2, P.crm);                    // building
    rect(g, 8, 22, 55, 30, P.red);                        // roof band
    rrect(g, 13, 34, 21, 42, 1, P.sky);                   // windows
    rrect(g, 27, 34, 35, 42, 1, P.sky);
    rrect(g, 41, 34, 49, 42, 1, P.sky);
    rrect(g, 27, 46, 36, 57, 2, P.brn);                   // door
    eyes(g, 31, 50, 3);                                   // small face on door
    smileArc(g, 31, 53, 1.8, 0.8);
  }});

  S.push({ name: 'sit', draw(g) {              // 坐 co5 — seated on a chair
    rrect(g, 16, 30, 47, 34, 1, P.brn);                   // chair top rail
    rect(g, 16, 30, 19, 52, P.brn);                       // back posts
    rect(g, 44, 30, 47, 52, P.brn);
    rect(g, 16, 46, 47, 50, P.dgy);                       // seat
    ball(g, CX, 40, 9, 7, P.grn, P.plum);                 // seated body
    rect(g, 25, 49, 29, 58, P.pch);                       // shins
    rect(g, 34, 49, 38, 58, P.pch);
    ball(g, 27, 58, 2.6, 1.6, P.pch, P.brn);              // feet
    ball(g, 36, 58, 2.6, 1.6, P.pch, P.brn);
    ball(g, 20, 40, 2.8, 2.2, P.pch, P.brn);              // hands
    ball(g, 43, 40, 2.8, 2.2, P.pch, P.brn);
    ball(g, CX, 22, 11, 10, P.pch, P.brn);                // head
    ellipse(g, CX, 14, 10, 5, P.brn);                     // hair
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 29, 2.6, 1.1);
    blush(g, CX - 9, 27); blush(g, CX + 9, 27);
  }});

  S.push({ name: 'door', draw(g) {             // 門 mun4
    rrect(g, 16, 8, 48, 58, 2, P.lgy);                    // frame
    rrect(g, 19, 11, 45, 58, 1, P.brn);                   // door
    rrect(g, 23, 15, 41, 32, 1, P.plum);                  // upper panel
    rrect(g, 23, 36, 41, 52, 1, P.plum);                  // lower panel
    disc(g, 41, 34, 1.8, P.yel);                          // knob
    eyes(g, 32, 22, 4);                                   // face on panel
    smileArc(g, 32, 26, 2.2, 1);
    blush(g, 26, 24); blush(g, 38, 24);
  }});

  S.push({ name: 'head', draw(g) {             // 頭 tau4
    ball(g, CX, 46, 5, 4, P.pch, P.brn);                  // neck stub
    disc(g, 13, 28, 3, P.pch);                            // ears
    disc(g, 50, 28, 3, P.pch);
    ball(g, CX, 28, 16, 15, P.pch, P.brn);                // head
    ellipse(g, CX, 15, 15, 7, P.brn);                     // hair
    ellipse(g, 17, 24, 2.5, 5, P.brn);
    ellipse(g, 46, 24, 2.5, 5, P.brn);
    eyes(g, CX, 29, 7);
    ellipse(g, CX, 35, 1.8, 1.4, P.brn);                  // nose
    smileArc(g, CX, 40, 4, 1.4);
    blush(g, CX - 12, 37); blush(g, CX + 12, 37);
  }});

  S.push({ name: 'book', draw(g) {             // 書 syu1
    rrect(g, 14, 16, 50, 50, 2, P.plum);                  // back cover
    rrect(g, 12, 14, 48, 48, 2, P.red);                   // front cover
    rect(g, 16, 14, 18, 48, P.crm);                       // page edges
    rect(g, 46, 16, 48, 48, P.crm);
    rect(g, 40, 10, 43, 24, P.yel);                       // bookmark
    eyes(g, 31, 28, 5);                                   // face on cover
    smileArc(g, 31, 34, 3, 1.2);
    blush(g, 24, 32); blush(g, 39, 32);
  }});

  S.push({ name: 'night', draw(g) {            // 夜 je6 — crescent moon
    for (const [sx, sy] of [[10, 12], [54, 18], [52, 50]]) {
      g.set(sx, sy, P.yel); g.set(sx - 1, sy, P.yel); g.set(sx + 1, sy, P.yel);
      g.set(sx, sy - 1, P.yel); g.set(sx, sy + 1, P.yel);
    }
    ball(g, CX, 32, 18, 18, P.yel, P.org);                // moon
    disc(g, 44, 26, 15, null);                            // carve crescent
    eyes(g, 25, 34, 5);                                   // face on crescent
    smileArc(g, 24, 40, 2.4, 1);
    blush(g, 18, 38);
  }});

  S.push({ name: 'honey', draw(g) {            // 蜜 mat6 — honey pot
    stroke(g, [[42, 8], [44, 16], [42, 22]], 1.4, 1.2, P.brn); // dipper stick
    ball(g, 43, 24, 4, 3, P.org, P.brn);                  // dipper honey
    ball(g, CX, 40, 15, 14, P.org, P.brn, P.yel);         // pot
    rect(g, 18, 26, 45, 30, P.brn);                       // rim
    ellipse(g, 20, 44, 2.5, 5, P.yel);                    // shine
    eyes(g, CX, 40, 6);                                   // face on pot
    smileArc(g, CX, 46, 3, 1.2);
    blush(g, CX - 11, 44); blush(g, CX + 11, 44);
  }});

  S.push({ name: 'blood', draw(g) {            // 血 hyut3 — friendly drop
    tri(g, CX, 6, 24, 30, 39, 30, P.red);                 // pointed top
    ball(g, CX, 42, 14, 13, P.red, P.plum);               // round bottom
    ellipse(g, 25, 38, 2.5, 4, P.pnk);                    // shine
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 49, 3, 1.2);
    blush(g, CX - 10, 46); blush(g, CX + 10, 46);
  }});

  S.push({ name: 'drink', draw(g) {            // 飲 jam2 — cup with straw
    rect(g, 34, 6, 37, 24, P.pnk);                        // straw
    rect(g, 34, 6, 43, 9, P.pnk);                         // straw bend
    tri(g, 18, 22, 45, 22, CX, 58, P.sky);                // cup
    tri(g, 32, 22, 45, 22, 37, 55, P.lav);                // cup shadow
    rrect(g, 16, 18, 47, 24, 1, P.crm);                   // lid rim
    ellipse(g, CX, 30, 8, 4, P.red);                      // drink
    eyes(g, CX, 38, 6);                                   // face on cup
    smileArc(g, CX, 45, 3, 1.2);
    blush(g, 22, 42); blush(g, 41, 42);
  }});

  S.push({ name: 'money', draw(g) {            // 錢 cin2 — gold coins
    ball(g, 22, 50, 12, 4, P.org, P.brn);                 // stack
    ball(g, 22, 46, 12, 4, P.yel, P.org);
    ball(g, 22, 42, 12, 4, P.org, P.brn);
    ball(g, 41, 34, 13, 13, P.yel, P.org);                // front coin
    disc(g, 41, 34, 8, P.org);                            // rim
    disc(g, 41, 34, 6.5, P.yel);
    eyes(g, 41, 33, 5);                                   // face on coin
    smileArc(g, 41, 38, 2.4, 1);
    blush(g, 35, 36); blush(g, 47, 36);
  }});

  S.push({ name: 'paper', draw(g) {            // 紙 zi2
    rrect(g, 16, 8, 46, 56, 1, P.lgy);                    // sheet (shadow)
    rrect(g, 14, 8, 44, 54, 1, P.crm);                    // sheet
    tri(g, 37, 8, 44, 8, 44, 15, P.lgy);                  // folded corner
    rect(g, 19, 20, 39, 21, P.lgy);                       // ruling lines
    rect(g, 19, 26, 39, 27, P.lgy);
    rect(g, 19, 46, 39, 47, P.lgy);
    eyes(g, 29, 34, 5);                                   // face
    smileArc(g, 29, 40, 2.6, 1.1);
    blush(g, 22, 38); blush(g, 36, 38);
  }});

  S.push({ name: 'hotel', draw(g) {            // 酒店 zau2 dim3 — tall building
    for (const sx of [22, 31, 41]) {                      // rating stars
      g.set(sx, 5, P.yel); g.set(sx - 1, 5, P.yel); g.set(sx + 1, 5, P.yel);
      g.set(sx, 4, P.yel); g.set(sx, 6, P.yel);
    }
    rrect(g, 16, 10, 49, 57, 2, P.lav);                   // tower (shadow)
    rrect(g, 16, 10, 47, 55, 2, P.sky);                   // tower
    for (let ry = 16; ry <= 40; ry += 8)                  // lit windows
      for (let cx = 21; cx <= 41; cx += 7)
        rect(g, cx, ry, cx + 3, ry + 4, P.yel);
    rrect(g, 24, 48, 40, 57, 1, P.red);                   // entrance canopy
    eyes(g, 32, 51, 3);                                   // face on canopy
    smileArc(g, 32, 54, 1.8, 0.8);
  }});

  S.push({ name: 'eye', draw(g) {              // 眼 ngaan5
    ball(g, CX, 33, 21, 15, P.crm, P.lgy);                // eyeball
    disc(g, CX, 33, 10, P.sky);                           // iris
    disc(g, CX, 33, 6, P.navy);                           // pupil
    disc(g, 28, 29, 2.6, P.crm);                          // sparkle
    stroke(g, [[12, 22], [16, 18]], 1.2, 0.6, P.navy);    // lashes
    stroke(g, [[CX, 16], [CX, 12]], 1.2, 0.6, P.navy);
    stroke(g, [[51, 22], [47, 18]], 1.2, 0.6, P.navy);
    blush(g, 13, 40); blush(g, 50, 40);
  }});

  S.push({ name: 'table', draw(g) {            // 檯 toi2
    ball(g, 41, 21, 3.5, 4.5, P.red, P.plum);             // cup on top
    disc(g, 20, 24, 3, P.lim);                            // apple on top
    rrect(g, 7, 26, 56, 33, 2, P.brn);                    // table top
    rect(g, 7, 31, 56, 33, P.dgy);                        // top edge shade
    rect(g, 13, 33, 50, 39, P.brn);                       // apron
    rect(g, 13, 39, 17, 56, P.brn);                       // legs
    rect(g, 46, 39, 50, 56, P.brn);
    eyes(g, 31, 35, 5);                                   // face on apron
    smileArc(g, 31, 38, 2.4, 1);
    blush(g, 24, 37); blush(g, 39, 37);
  }});

  S.push({ name: 'plane', draw(g) {            // 飛機 fei1 gei1
    tri(g, 26, 30, 40, 30, 30, 12, P.lgy);                // top wing
    tri(g, 24, 40, 40, 40, 34, 56, P.lgy);                // bottom wing
    tri(g, 8, 22, 20, 30, 8, 38, P.red);                  // tail fin
    ball(g, 36, 32, 22, 10, P.crm, P.lgy);                // fuselage
    ball(g, 52, 32, 6, 8, P.sky, P.lav);                  // nose
    for (let wx = 26; wx <= 46; wx += 6) disc(g, wx, 30, 2, P.sky); // windows
    eyes(g, 52, 31, 4);                                   // face on nose
    smileArc(g, 52, 35, 2, 0.9);
    blush(g, 47, 34);
  }});

  S.push({ name: 'dress', draw(g) {            // 裙 kwan4
    stroke(g, [[22, 18], [CX, 12], [42, 18]], 1, 1, P.lgy); // hanger
    g.set(CX, 8, P.lgy); g.set(CX, 9, P.lgy); g.set(CX, 10, P.lgy); // hook
    rrect(g, 24, 16, 40, 28, 2, P.pnk);                   // bodice
    tri(g, 12, 54, 52, 54, CX, 26, P.pnk);                // skirt
    tri(g, 12, 54, 32, 54, CX, 30, P.plum);               // skirt shadow
    rect(g, 12, 52, 52, 54, P.plum);                      // hem
    eyes(g, CX, 40, 6);                                   // face on skirt
    smileArc(g, CX, 46, 3, 1.2);
    blush(g, CX - 11, 44); blush(g, CX + 11, 44);
  }});

  S.push({ name: 'food', draw(g) {             // 食 sik6 — rice bowl
    stroke(g, [[40, 8], [46, 30]], 1, 1, P.brn);          // chopsticks
    stroke(g, [[45, 8], [50, 30]], 1, 1, P.brn);
    ball(g, CX, 30, 15, 6, P.crm, P.lgy);                 // rice mound
    rrect(g, 14, 32, 49, 52, 8, P.plum);                  // bowl (shadow)
    ellipse(g, CX, 32, 18, 4, P.lgy);                     // bowl rim
    rrect(g, 15, 32, 47, 50, 8, P.red);                   // bowl
    rect(g, 22, 40, 41, 42, P.pnk);                       // pattern band
    eyes(g, CX, 44, 6);                                   // face on bowl
    smileArc(g, CX, 48, 3, 1.1);
    blush(g, 22, 46); blush(g, 41, 46);
  }});

  S.push({ name: 'bag', draw(g) {              // 袋 doi2 — tote bag
    stroke(g, [[22, 26], [24, 14], [31, 12]], 1.4, 1.4, P.brn); // handles
    stroke(g, [[41, 26], [39, 14], [32, 12]], 1.4, 1.4, P.brn);
    rrect(g, 14, 24, 50, 56, 4, P.plum);                  // bag (shadow)
    rrect(g, 14, 24, 48, 54, 4, P.red);                   // bag
    rect(g, 14, 24, 48, 28, P.pnk);                       // top band
    eyes(g, CX, 38, 6);                                   // face
    smileArc(g, CX, 45, 3, 1.2);
    blush(g, 22, 42); blush(g, 41, 42);
  }});

  S.push({ name: 'suit', draw(g) {             // 西裝 sai1 zong1
    stroke(g, [[24, 16], [CX, 11], [40, 16]], 1, 1, P.lgy); // hanger
    g.set(CX, 8, P.lgy); g.set(CX, 9, P.lgy); g.set(CX, 10, P.lgy);
    rrect(g, 14, 18, 50, 56, 3, P.navy);                  // jacket
    tri(g, 25, 18, 39, 18, CX, 40, P.crm);                // shirt V
    rect(g, 30, 20, 33, 38, P.red);                       // tie
    tri(g, 29, 19, 34, 19, CX, 25, P.red);                // tie knot
    eyes(g, CX, 47, 5);                                   // face
    smileArc(g, CX, 51, 2.6, 1);
    blush(g, 23, 49); blush(g, 42, 49);
  }});

  S.push({ name: 'neck', draw(g) {             // 頸 geng2
    ball(g, CX, 54, 17, 7, P.grn, P.plum);                // shoulders
    rect(g, 26, 28, 37, 50, P.pch);                       // long neck
    ball(g, 26, 39, 1.5, 11, P.brn);                      // neck contour
    ball(g, 37, 39, 1.5, 11, P.brn);
    for (let i = 0; i < 7; i++) disc(g, 26 + i * 1.8, 47 + Math.abs(i - 3) * 0.6, 1.4, P.yel); // necklace
    ball(g, CX, 20, 11, 10, P.pch, P.brn);                // head
    ellipse(g, CX, 12, 10, 4.5, P.brn);                   // hair
    eyes(g, CX, 21, 5);
    smileArc(g, CX, 26, 2.4, 1);
    blush(g, CX - 8, 24); blush(g, CX + 8, 24);
  }});

  S.push({ name: 'clock', draw(g) {            // 鐘 zung1 — alarm clock
    disc(g, 18, 14, 5, P.lgy); disc(g, 45, 14, 5, P.lgy); // bells
    rect(g, 20, 10, 43, 14, P.dgy);                       // bell bar
    ball(g, CX, 36, 18, 18, P.red, P.plum);               // body
    disc(g, CX, 36, 13, P.crm);                           // dial
    for (let a = 0; a < 12; a++) {                        // tick marks
      const th = a / 12 * Math.PI * 2;
      g.set(Math.round(CX + Math.cos(th) * 11), Math.round(36 + Math.sin(th) * 11), P.navy);
    }
    ball(g, 22, 55, 3, 2, P.dgy); ball(g, 41, 55, 3, 2, P.dgy); // feet
    eyes(g, CX, 33, 4);
    smileArc(g, CX, 40, 2.6, 1);
    blush(g, 23, 38); blush(g, 40, 38);
  }});

  S.push({ name: 'rock', draw(g) {             // 石 sek6
    ellipse(g, CX, 55, 18, 3, P.dgy);                     // ground shadow
    ball(g, CX, 40, 20, 15, P.lgy, P.dgy);                // boulder
    tri(g, 14, 40, 30, 30, 28, 44, P.lgy);                // facets
    tri(g, 50, 42, 36, 30, 38, 46, P.dgy);
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 45, 3, 1.2);
    blush(g, CX - 12, 42); blush(g, CX + 12, 42);
  }});

  S.push({ name: 'watch', draw(g) {            // 錶 biu1 — wristwatch
    tri(g, 22, 8, 41, 8, CX, 22, P.red);                  // top strap
    tri(g, 22, 56, 41, 56, CX, 42, P.red);                // bottom strap
    rect(g, 24, 10, 39, 20, P.red); rect(g, 24, 44, 39, 54, P.red);
    ball(g, CX, 32, 15, 15, P.lgy, P.dgy);                // case
    disc(g, CX, 32, 11, P.crm);                           // dial
    for (let a = 0; a < 12; a++) {
      const th = a / 12 * Math.PI * 2;
      g.set(Math.round(CX + Math.cos(th) * 9), Math.round(32 + Math.sin(th) * 9), P.navy);
    }
    eyes(g, CX, 30, 4);
    smileArc(g, CX, 36, 2.4, 1);
    blush(g, 22, 34); blush(g, 41, 34);
  }});

  S.push({ name: 'box', draw(g) {              // 箱 soeng1 — cardboard box
    tri(g, 14, 24, 50, 24, 44, 16, P.org);                // top face
    tri(g, 14, 24, 44, 16, 20, 16, P.org);
    rrect(g, 14, 24, 50, 54, 2, P.brn);                   // front face
    rect(g, 14, 24, 50, 26, P.dgy);                       // flap seam
    eyes(g, CX, 38, 5);                                   // face
    smileArc(g, CX, 44, 2.8, 1.1);
    blush(g, 24, 42); blush(g, 39, 42);
  }});

  S.push({ name: 'camera', draw(g) {           // 相機 soeng2 gei1
    rrect(g, 10, 22, 54, 50, 3, P.dgy);                   // body (shadow)
    rrect(g, 10, 22, 52, 48, 3, P.navy);                  // body
    rrect(g, 30, 16, 44, 24, 1, P.navy);                  // viewfinder hump
    ball(g, CX, 36, 12, 12, P.lgy, P.dgy);                // lens ring
    disc(g, CX, 36, 9, P.sky);                            // lens glass (eye)
    disc(g, CX, 36, 5, P.navy);                           // aperture
    disc(g, 28, 32, 2.2, P.crm);                          // shine
    rect(g, 14, 26, 20, 30, P.red);                       // shutter button
    disc(g, 44, 28, 2, P.yel);                            // flash
    smileArc(g, CX, 47, 3, 1.1);                          // smile
    blush(g, 18, 44); blush(g, 45, 44);
  }});

  S.push({ name: 'fire', draw(g) {             // 火 fo2 — campfire flame
    rect(g, 16, 52, 48, 56, P.brn);                       // logs
    rect(g, 20, 50, 44, 54, P.dgy);
    tri(g, 24, 20, 31, 26, 28, 10, P.red);                // flame tips
    tri(g, 40, 22, 34, 26, 37, 12, P.red);
    ball(g, CX, 34, 15, 20, P.red, P.plum);               // outer flame
    ball(g, CX, 38, 10, 14, P.org, P.red);                // mid flame
    ball(g, CX, 42, 6, 9, P.yel, P.org);                  // inner flame
    eyes(g, CX, 36, 6);                                   // face
    smileArc(g, CX, 42, 3, 1.2);
    blush(g, CX - 11, 40); blush(g, CX + 11, 40);
  }});

  S.push({ name: 'ice', draw(g) {              // 雪 syut3 — ice cube
    tri(g, 16, 24, 48, 24, 42, 14, P.crm);                // top face
    tri(g, 16, 24, 42, 14, 22, 14, P.crm);
    rrect(g, 16, 24, 48, 54, 3, P.sky);                   // front face
    rect(g, 20, 28, 24, 40, P.crm);                       // shine streak
    g.set(30, 30, P.crm); g.set(31, 30, P.crm);           // frost sparkle
    g.set(40, 44, P.crm); g.set(40, 45, P.crm);
    eyes(g, 33, 38, 5);                                   // face
    smileArc(g, 33, 44, 2.6, 1.1);
    blush(g, 26, 42); blush(g, 40, 42);
  }});

  /* Sprite corpus — slice 2. Concrete nouns as chibi mascots. Same rules:
     face on the main body, mouth up, two signature features, kid-safe. */

  /* Sprite corpus slices 2-3 (gated: body-parts, abstracts, alcohol excluded). */
  S.push({ name: 'smoke', draw(g) {
    stroke(g, [[24, 20], [22, 14], [25, 9], [22, 4]], 1.4, 1.1, P.lgy);   // rising wisps
    stroke(g, [[40, 20], [43, 14], [40, 9], [43, 5]], 1.4, 1.1, P.lgy);
    ball(g, 20, 42, 8, 7, P.lgy, P.lav);                 // cloud puffs
    ball(g, 44, 42, 8, 7, P.lgy, P.lav);
    ball(g, CX, 45, 10, 8, P.lgy, P.lav);
    ball(g, CX, 34, 13, 11, P.lgy, P.lav, P.crm);        // main puff (face)
    eyes(g, CX, 35, 7);
    smileArc(g, CX, 42, 3, 1.4);
    blush(g, CX - 11, 39); blush(g, CX + 11, 39);
  }});

  S.push({ name: 'card', draw(g) {
    rrect(g, 17, 8, 47, 56, 4, P.lgy);                   // card edge
    rrect(g, 15, 7, 45, 54, 4, P.crm);                   // card face
    disc(g, 20, 15, 2, P.red); disc(g, 23, 15, 2, P.red); // heart pip (top)
    tri(g, 18, 16, 26, 16, 22, 20, P.red);
    disc(g, 37, 46, 2, P.red); disc(g, 40, 46, 2, P.red); // heart pip (bottom)
    tri(g, 35, 47, 43, 47, 39, 51, P.red);
    eyes(g, 30, 29, 6);
    smileArc(g, 30, 35, 3, 1.4);
    blush(g, 22, 33); blush(g, 38, 33);
  }});

  S.push({ name: 'cup', draw(g) {
    ellipse(g, 47, 39, 6.5, 7.5, P.lav);                 // handle
    ellipse(g, 48, 39, 3, 4, null);                      // handle hole
    rrect(g, 18, 24, 45, 56, 5, P.lav);                  // mug (shadow)
    rrect(g, 18, 24, 43, 54, 5, P.sky);                  // mug body
    rect(g, 21, 30, 22, 44, P.crm);                      // highlight
    ellipse(g, 30, 25, 14, 3.5, P.crm);                  // rim
    eyes(g, 30, 38, 7);
    smileArc(g, 30, 45, 3, 1.4);
    blush(g, 18, 42); blush(g, 42, 42);
  }});

  S.push({ name: 'town', draw(g) {
    rect(g, 10, 30, 24, 54, P.brn);                      // left building
    tri(g, 8, 30, 26, 30, 17, 20, P.red);
    rect(g, 14, 37, 20, 45, P.sky);
    rect(g, 40, 28, 54, 54, P.org);                      // right building
    tri(g, 38, 28, 56, 28, 47, 18, P.plum);
    rect(g, 44, 35, 50, 43, P.sky);
    rect(g, 23, 24, 41, 54, P.yel);                      // center building (face)
    tri(g, 21, 24, 43, 24, 32, 12, P.grn);
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 42, 2.6, 1.2);
    blush(g, 25, 40); blush(g, 38, 40);
  }});

  S.push({ name: 'street', draw(g) {
    tri(g, 16, 56, 48, 56, 38, 12, P.dgy);               // road (trapezoid)
    tri(g, 16, 56, 38, 12, 26, 12, P.dgy);
    for (let y = 16; y < 34; y += 7) rect(g, 31, y, 32, y + 3, P.yel); // center dashes
    rect(g, 15, 54, 18, 56, P.lgy); rect(g, 46, 54, 49, 56, P.lgy);    // kerbs
    eyes(g, 32, 43, 6);
    smileArc(g, 32, 49, 2.6, 1.2);
    blush(g, 24, 47); blush(g, 40, 47);
  }});

  S.push({ name: 'kid', draw(g) {
    ball(g, CX, 49, 8.5, 7, P.lim, P.grn);               // romper
    ball(g, 26, 57, 3.6, 2.4, P.pch, P.brn);             // feet
    ball(g, 37, 57, 3.6, 2.4, P.pch, P.brn);
    ball(g, 22, 48, 3, 2.4, P.pch, P.brn);               // hands
    ball(g, 41, 48, 3, 2.4, P.pch, P.brn);
    ball(g, CX, 27, 13, 12, P.pch);                      // head (flat)
    ellipse(g, CX, 18, 12, 6, P.brn);                    // hair
    ball(g, CX, 11, 2.6, 2.6, P.brn);                    // tuft
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 3, 1.4);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

  S.push({ name: 'window', draw(g) {
    rrect(g, 12, 10, 51, 54, 3, P.crm);                  // frame (shadow)
    rrect(g, 12, 10, 49, 52, 3, P.lgy);                  // frame
    rect(g, 16, 14, 47, 48, P.sky);                      // glass
    g.set(20, 18, P.crm); g.set(21, 19, P.crm); g.set(22, 20, P.crm); // glint
    rect(g, 30, 14, 32, 48, P.lgy);                      // muntin (vertical)
    rect(g, 16, 30, 47, 32, P.lgy);                      // muntin (horizontal)
    eyes(g, CX, 24, 8);
    smileArc(g, CX, 40, 3, 1.4);
    blush(g, 20, 38); blush(g, 43, 38);
  }});

  S.push({ name: 'bird', draw(g) {
    tri(g, 44, 44, 55, 40, 52, 53, P.lav);               // tail
    ball(g, CX, 40, 12, 11, P.sky, P.lav);               // body
    ellipse(g, CX, 42, 7, 7, P.crm);                     // belly
    ball(g, 22, 40, 5, 6, P.lav, P.navy);                // wing
    ball(g, 27, 57, 2.4, 2, P.org);                      // feet
    ball(g, 36, 57, 2.4, 2, P.org);
    ball(g, CX, 22, 11, 10, P.sky, P.lav, P.crm);        // head
    tri(g, 27, 26, 36, 26, 31.5, 23, P.org);             // beak (open, happy)
    tri(g, 27, 27, 36, 27, 31.5, 31, P.org);
    eyes(g, CX, 20, 6);
    blush(g, CX - 9, 25); blush(g, CX + 9, 25);
  }});

  S.push({ name: 'church', draw(g) {
    rect(g, 27, 22, 37, 40, P.lgy);                      // steeple
    tri(g, 25, 22, 39, 22, 32, 8, P.red);                // spire
    rect(g, 31, 3, 32, 9, P.yel); rect(g, 29, 5, 34, 6, P.yel); // cross
    rect(g, 14, 38, 50, 56, P.crm);                      // hall
    rect(g, 14, 38, 50, 40, P.lgy);                      // eave
    rrect(g, 28, 46, 36, 56, 4, P.brn);                  // arched door
    rect(g, 19, 44, 23, 50, P.sky); rect(g, 41, 44, 45, 50, P.sky); // windows
    eyes(g, 32, 28, 4);
    smileArc(g, 32, 33, 2, 1);
    blush(g, 28, 31); blush(g, 36, 31);
  }});

  S.push({ name: 'rain', draw(g) {
    ball(g, 20, 28, 8, 6.5, P.lgy, P.lav);               // cloud puffs
    ball(g, 44, 28, 8, 6.5, P.lgy, P.lav);
    ball(g, CX, 24, 12, 9, P.lgy, P.lav, P.crm);
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 30, 2.6, 1.2);
    blush(g, CX - 11, 28); blush(g, CX + 11, 28);
    for (const p of [[18, 45], [27, 51], [36, 47], [45, 51], [31, 56]]) { // raindrops
      disc(g, p[0], p[1], 1.8, P.sky);
      tri(g, p[0] - 1.8, p[1], p[0] + 1.8, p[1], p[0], p[1] - 4, P.sky);
    }
  }});

  S.push({ name: 'teeth', draw(g) {
    ball(g, CX, 30, 15, 13, P.crm, P.lgy);               // tooth crown
    tri(g, 22, 40, 30, 40, 24, 54, P.crm);               // roots
    tri(g, 34, 40, 42, 40, 40, 54, P.crm);
    rect(g, 22, 38, 42, 42, P.crm);
    eyes(g, CX, 28, 7);
    smileArc(g, CX, 35, 3, 1.4);
    blush(g, CX - 12, 33); blush(g, CX + 12, 33);
  }});

  S.push({ name: 'bridge', draw(g) {
    rect(g, 4, 46, 60, 58, P.sky);                       // water
    ellipse(g, CX, 52, 20, 18, P.brn);                   // arch mass
    ellipse(g, CX, 58, 13, 16, P.sky);                   // arch opening
    rect(g, 6, 26, 58, 34, P.brn);                       // deck (shadow)
    rect(g, 6, 26, 58, 32, P.pch);                       // deck top
    for (let x = 10; x <= 54; x += 8) rect(g, x, 22, x + 2, 26, P.brn); // railing posts
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 46, 2.8, 1.2);
    blush(g, CX - 13, 44); blush(g, CX + 13, 44);
  }});

  S.push({ name: 'ring', draw(g) {
    ball(g, CX, 46, 14, 11, P.yel, P.org);               // gold band
    ellipse(g, CX, 48, 8, 7, null);                      // band hole
    tri(g, 20, 26, 44, 26, 32, 40, P.lav);               // gem (back tip)
    ball(g, CX, 22, 13, 12, P.sky, P.lav, P.crm);        // gem
    eyes(g, CX, 21, 6);
    smileArc(g, CX, 27, 2.6, 1.2);
    blush(g, CX - 10, 25); blush(g, CX + 10, 25);
  }});

  S.push({ name: 'pig', draw(g) {
    disc(g, 21, 14, 4.5, P.pnk); tri(g, 17, 15, 25, 15, 21, 8, P.pnk); // ears
    disc(g, 43, 14, 4.5, P.pnk); tri(g, 39, 15, 47, 15, 43, 8, P.pnk);
    stroke(g, [[43, 52], [49, 50], [50, 45], [47, 44]], 1.4, 1.1, P.pnk); // curly tail
    ball(g, CX, 48, 11, 8, P.pnk, P.plum);               // body
    ball(g, 25, 57, 4, 3, P.pnk, P.plum);                // feet
    ball(g, 38, 57, 4, 3, P.pnk, P.plum);
    ball(g, CX, 26, 14, 12, P.pnk, P.plum);              // head
    ball(g, CX, 32, 6, 4.5, P.pch, P.pnk);               // snout
    ellipse(g, 30, 32, 1.2, 1.6, P.plum);                // nostrils
    ellipse(g, 33, 32, 1.2, 1.6, P.plum);
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 37, 2.4, 1);
    blush(g, CX - 12, 31); blush(g, CX + 12, 31);
  }});

  S.push({ name: 'woman', draw(g) {
    ball(g, CX, 30, 17, 16, P.brn, P.plum);              // long hair
    tri(g, 17, 56, 46, 56, CX, 40, P.red);               // dress skirt
    ball(g, CX, 42, 7, 6, P.red, P.plum);                // bodice
    ball(g, 24, 47, 3, 3, P.pch, P.brn);                 // hands
    ball(g, 39, 47, 3, 3, P.pch, P.brn);
    ball(g, 27, 57, 2.4, 2, P.pch); ball(g, 36, 57, 2.4, 2, P.pch); // feet
    ball(g, CX, 26, 12, 12, P.pch);                      // face (flat)
    ellipse(g, CX, 16, 12, 6, P.brn);                    // fringe
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 3, 1.4);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

  S.push({ name: 'wall', draw(g) {
    rrect(g, 8, 14, 55, 54, 3, P.brn);                   // wall (mortar base)
    clipTo(g, [P.brn], function () {
      for (let row = 0; row < 5; row++) {
        const y0 = 16 + row * 8, off = (row % 2) * 7;
        for (let bx = -7; bx < 56; bx += 14) rrect(g, 10 + bx + off, y0, 22 + bx + off, y0 + 6, 1, P.red);
      }
    });
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 11, 34); blush(g, CX + 11, 34);
  }});

  S.push({ name: 'hat', draw(g) {
    ellipse(g, 40, 40, 16, 5, P.plum);                   // brim (shadow)
    ellipse(g, 40, 38, 15, 4.5, P.red);                  // brim
    ball(g, CX, 30, 16, 14, P.red, P.plum);              // crown
    ellipse(g, CX, 22, 8, 4, P.pnk);                     // highlight
    disc(g, CX, 16, 2, P.plum);                          // button
    eyes(g, CX, 30, 7);
    smileArc(g, CX, 37, 3, 1.3);
    blush(g, CX - 13, 34); blush(g, CX + 13, 34);
  }});

  S.push({ name: 'professor', draw(g) {
    ball(g, CX, 50, 11, 9, P.dgy, P.blk);                // gown
    ball(g, 21, 49, 3, 3, P.pch, P.brn);                 // hands
    ball(g, 43, 49, 3, 3, P.pch, P.brn);
    ball(g, CX, 28, 13, 12, P.pch, P.brn);               // head
    ellipse(g, 20, 33, 3, 5, P.lgy); ellipse(g, 43, 33, 3, 5, P.lgy); // grey hair
    ellipse(g, 26, 28, 4, 3.5, P.navy); ellipse(g, 26, 28, 2.6, 2.2, P.crm); // glasses L
    ellipse(g, 38, 28, 4, 3.5, P.navy); ellipse(g, 38, 28, 2.6, 2.2, P.crm); // glasses R
    rect(g, 30, 27, 34, 28, P.navy);                     // bridge
    disc(g, 26, 28, 1.3, P.navy); disc(g, 38, 28, 1.3, P.navy); // pupils
    rect(g, 22, 13, 42, 16, P.blk); rect(g, 27, 16, 37, 19, P.blk); // mortarboard
    stroke(g, [[40, 15], [44, 20], [44, 26]], 1, 1, P.yel); disc(g, 44, 27, 1.6, P.yel); // tassel
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, 20, 34); blush(g, 43, 34);
  }});

  S.push({ name: 'train', draw(g) {
    disc(g, 20, 52, 5, P.dgy); disc(g, 20, 52, 2, P.lgy); // wheels
    disc(g, 33, 52, 5, P.dgy); disc(g, 33, 52, 2, P.lgy);
    disc(g, 45, 52, 4, P.dgy); disc(g, 45, 52, 1.6, P.lgy);
    rrect(g, 12, 30, 40, 50, 5, P.red);                  // boiler
    ellipse(g, 12, 40, 3, 10, P.plum);                   // front rim
    rrect(g, 38, 22, 52, 48, 3, P.sky);                  // cab
    rect(g, 41, 26, 49, 34, P.crm);                      // cab window
    rect(g, 18, 20, 24, 30, P.dgy);                      // smokestack
    ball(g, 21, 16, 4, 3, P.lgy, P.lav);                 // smoke
    ball(g, 25, 11, 3, 2.5, P.lgy, P.lav);
    eyes(g, 22, 38, 6);
    smileArc(g, 22, 44, 2.6, 1.2);
    blush(g, 15, 42); blush(g, 29, 42);
  }});

  S.push({ name: 'coat', draw(g) {
    ball(g, 14, 34, 5, 9, P.plum); ball(g, 49, 34, 5, 9, P.plum); // sleeves
    rrect(g, 15, 22, 48, 56, 6, P.plum);                 // coat (shadow)
    rrect(g, 15, 22, 46, 54, 6, P.sky);                  // coat body
    ball(g, CX, 22, 12, 4, P.crm, P.lgy);                // fur collar
    rect(g, 31, 44, 32, 54, P.lav);                      // zipper
    rrect(g, 19, 42, 27, 50, 2, P.lav); rrect(g, 36, 42, 44, 50, 2, P.lav); // pockets
    eyes(g, CX, 34, 7);
    smileArc(g, CX, 41, 2.6, 1.2);
    blush(g, 20, 38); blush(g, 43, 38);
  }});

  S.push({ name: 'saw', draw(g) {
    rrect(g, 8, 28, 24, 46, 5, P.org);                   // handle
    ellipse(g, 16, 37, 5, 6, null);                      // grip hole
    tri(g, 22, 30, 56, 30, 22, 42, P.lgy);               // blade
    rect(g, 22, 30, 54, 31, P.crm);                      // top edge
    for (let x = 26; x <= 52; x += 5) disc(g, x, 42, 2.2, P.lgy); // rounded teeth
    eyes(g, 38, 33, 5);
    smileArc(g, 38, 37, 2.4, 1);
    blush(g, 32, 35); blush(g, 44, 35);
  }});

  S.push({ name: 'truck', draw(g) {
    disc(g, 20, 52, 5, P.dgy); disc(g, 20, 52, 2, P.lgy); // wheels
    disc(g, 44, 52, 5, P.dgy); disc(g, 44, 52, 2, P.lgy);
    rrect(g, 8, 24, 38, 48, 2, P.org);                   // cargo box
    rect(g, 8, 24, 38, 27, P.brn);
    rrect(g, 38, 32, 54, 48, 3, P.red);                  // cab
    rect(g, 41, 35, 50, 41, P.sky);                      // windshield
    rect(g, 52, 44, 56, 48, P.lgy);                      // bumper
    eyes(g, 22, 34, 6);
    smileArc(g, 22, 40, 2.6, 1.2);
    blush(g, 14, 38); blush(g, 30, 38);
  }});

  S.push({ name: 'shirt', draw(g) {
    tri(g, 8, 24, 20, 22, 16, 38, P.lim);                // sleeves
    tri(g, 56, 24, 44, 22, 48, 38, P.lim);
    ball(g, 12, 30, 4, 5, P.lim, P.grn); ball(g, 52, 30, 4, 5, P.lim, P.grn);
    rrect(g, 16, 22, 47, 54, 4, P.grn);                  // body (shadow)
    rrect(g, 16, 22, 45, 52, 4, P.lim);                  // body
    ellipse(g, CX, 23, 6, 3, P.crm);                     // collar
    ellipse(g, CX, 22, 4, 2, null);                      // neck hole
    eyes(g, CX, 34, 7);
    smileArc(g, CX, 41, 2.8, 1.3);
    blush(g, 21, 38); blush(g, 42, 38);
  }});

  S.push({ name: 'cat', draw(g) {
    tri(g, 18, 16, 28, 16, 20, 4, P.lgy); tri(g, 45, 16, 35, 16, 43, 4, P.lgy); // ears
    tri(g, 20, 14, 26, 14, 22, 7, P.pnk); tri(g, 43, 14, 37, 14, 41, 7, P.pnk);
    stroke(g, [[43, 50], [50, 48], [53, 42], [51, 37]], 2, 1.4, P.lgy); // tail
    ball(g, CX, 48, 10, 8, P.lgy, P.lav);                // body
    ball(g, 25, 57, 4, 3, P.lgy, P.lav); ball(g, 38, 57, 4, 3, P.lgy, P.lav);
    ball(g, CX, 26, 14, 12, P.lgy, P.lav);               // head
    ball(g, CX, 31, 5, 3.5, P.crm);                      // muzzle
    ellipse(g, CX, 29.5, 1.6, 1.2, P.pnk);               // nose
    stroke(g, [[26, 32], [16, 30]], 0.7, 0.7, P.dgy); stroke(g, [[26, 34], [16, 35]], 0.7, 0.7, P.dgy);
    stroke(g, [[37, 32], [47, 30]], 0.7, 0.7, P.dgy); stroke(g, [[37, 34], [47, 35]], 0.7, 0.7, P.dgy);
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 33, 2, 0.9);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

  S.push({ name: 'clothes', draw(g) {
    rrect(g, 14, 44, 50, 54, 3, P.sky); rect(g, 14, 44, 50, 46, P.lav);   // bottom fold
    rrect(g, 16, 34, 48, 44, 3, P.org); rect(g, 16, 34, 48, 36, P.brn);   // middle fold
    rrect(g, 18, 24, 46, 34, 3, P.red); rect(g, 18, 24, 46, 26, P.plum);  // top fold
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 32, 2.6, 1.2);
    blush(g, 22, 31); blush(g, 41, 31);
  }});

  S.push({ name: 'bottle', draw(g) {
    rect(g, 29, 8, 34, 16, P.grn);                       // cap
    rect(g, 30, 16, 33, 24, P.lim);                      // neck
    ball(g, CX, 28, 8, 6, P.lim, P.grn);                 // shoulders
    rrect(g, 22, 28, 42, 56, 6, P.grn);                  // body (shadow)
    rrect(g, 22, 28, 40, 54, 6, P.lim);                  // body
    rect(g, 25, 34, 26, 50, P.crm);                      // highlight
    rrect(g, 24, 42, 40, 50, 1, P.crm);                  // label
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 38, 2.6, 1.2);
    blush(g, 24, 36); blush(g, 39, 36);
  }});

  S.push({ name: 'rose', draw(g) {
    rect(g, 30, 30, 33, 58, P.grn);                      // stem
    ellipse(g, 21, 46, 6, 3.4, P.lim); ellipse(g, 42, 50, 6, 3.4, P.lim); // leaves
    for (let a = 0; a < 6; a++) { const th = a / 6 * 6.283; disc(g, CX + Math.cos(th) * 11, 24 + Math.sin(th) * 10, 4.5, P.red); }
    ball(g, CX, 24, 11, 10, P.pnk, P.red);               // bloom (face)
    eyes(g, CX, 23, 6);
    smileArc(g, CX, 29, 2.6, 1.2);
    blush(g, CX - 10, 27); blush(g, CX + 10, 27);
  }});

  S.push({ name: 'pizza', draw(g) {
    tri(g, 14, 16, 50, 16, CX, 56, P.org);               // slice (shadow)
    tri(g, 15, 17, 49, 17, CX, 53, P.yel);               // cheese
    rrect(g, 12, 12, 52, 20, 4, P.brn);                  // crust (shadow)
    rrect(g, 12, 12, 52, 18, 4, P.org);                  // crust
    disc(g, 20, 24, 3, P.red); disc(g, 43, 24, 3, P.red); // pepperoni
    disc(g, 26, 44, 3, P.red); disc(g, 37, 44, 3, P.red);
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.6, 1.2);
    blush(g, 22, 32); blush(g, 41, 32);
  }});

  S.push({ name: 'magazine', draw(g) {
    for (let y = 14; y < 54; y += 3) rect(g, 45, y, 49, y + 1, P.lgy); // page edges
    rrect(g, 12, 10, 46, 56, 2, P.plum);                 // cover (shadow)
    rrect(g, 12, 10, 45, 54, 2, P.pnk);                  // cover
    rect(g, 14, 12, 43, 18, P.red);                      // masthead band
    rrect(g, 16, 22, 41, 44, 2, P.sky);                  // cover photo
    eyes(g, 28, 30, 5);
    smileArc(g, 28, 35, 2.2, 1);
    blush(g, 23, 33); blush(g, 34, 33);
  }});

  S.push({ name: 'island', draw(g) {
    rect(g, 4, 44, 60, 58, P.sky);                       // water
    for (let x = 6; x < 58; x += 8) { g.set(x, 50, P.crm); g.set(x + 1, 50, P.crm); } // waves
    ellipse(g, CX, 46, 20, 8, P.org);                    // sand (shadow)
    ellipse(g, CX, 45, 18, 7, P.yel);                    // sand
    rrect(g, 30, 24, 34, 44, 1, P.brn);                  // palm trunk
    ellipse(g, 22, 20, 8, 3, P.lim); ellipse(g, 42, 20, 8, 3, P.lim); // fronds
    ellipse(g, CX, 15, 4, 6, P.grn); ellipse(g, 26, 15, 6, 3, P.lim); ellipse(g, 38, 15, 6, 3, P.lim);
    disc(g, CX, 22, 2, P.brn);                           // coconut
    eyes(g, CX, 44, 5);
    smileArc(g, CX, 48, 2.2, 1);
    blush(g, 24, 46); blush(g, 39, 46);
  }});

  S.push({ name: 'jail', draw(g) {
    rect(g, 10, 14, 51, 18, P.dgy);                      // roof
    rrect(g, 12, 18, 51, 56, 2, P.dgy);                  // stone (shadow)
    rrect(g, 12, 18, 49, 54, 2, P.lgy);                  // stone
    clipTo(g, [P.lgy], function () {
      rect(g, 12, 32, 49, 33, P.dgy); rect(g, 12, 44, 49, 45, P.dgy);
      rect(g, 30, 45, 31, 54, P.dgy); rect(g, 20, 18, 21, 32, P.dgy); rect(g, 40, 33, 41, 44, P.dgy);
    });
    rrect(g, 22, 22, 40, 40, 1, P.navy);                 // window frame
    rect(g, 24, 24, 38, 38, P.sky);                      // glass
    rect(g, 27, 24, 28, 38, P.navy); rect(g, 31, 24, 32, 38, P.navy); rect(g, 35, 24, 36, 38, P.navy); // bars
    eyes(g, 31, 28, 4);
    smileArc(g, 31, 33, 2, 1);
    blush(g, 26, 31); blush(g, 37, 31);
  }});

  S.push({ name: 'bell', draw(g) {
    ellipse(g, CX, 10, 4, 3, P.org); ellipse(g, CX, 10, 2, 1.5, null); // handle loop
    ball(g, CX, 30, 16, 15, P.yel, P.org, P.crm);        // dome
    rect(g, 12, 40, 51, 46, P.yel);                      // rim band
    rect(g, 12, 44, 51, 46, P.org);                      // rim shadow
    disc(g, CX, 50, 3.5, P.org);                         // clapper
    eyes(g, CX, 28, 7);
    smileArc(g, CX, 35, 3, 1.3);
    blush(g, CX - 13, 32); blush(g, CX + 13, 32);
  }});

  S.push({ name: 'mouth', draw(g) {
    ball(g, CX, 38, 18, 13, P.red, P.plum);              // big lips
    ellipse(g, CX, 41, 13, 8, P.navy);                   // mouth cavity
    rect(g, 14, 30, 49, 38, P.red);                      // flatten upper lip
    rect(g, 20, 38, 43, 41, P.crm);                      // upper teeth
    ellipse(g, CX, 47, 6, 3, P.pnk);                     // tongue
    eyes(g, CX, 20, 8);
    blush(g, CX - 14, 30); blush(g, CX + 14, 30);
  }});

  S.push({ name: 'sun', draw(g) {
    for (let a = 0; a < 12; a++) {
      const th = a / 12 * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      tri(g, CX + c * 15 - s * 3, 32 + s * 15 + c * 3, CX + c * 15 + s * 3, 32 + s * 15 - c * 3, CX + c * 24, 32 + s * 24, P.yel);
    }
    ball(g, CX, 32, 16, 16, P.yel, P.org, P.crm);       // sun disc
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 40, 3, 1.4);
    blush(g, CX - 11, 37); blush(g, CX + 11, 37);
  }});

  S.push({ name: 'pants', draw(g) {
    rrect(g, 15, 17, 48, 56, 6, P.lav);                 // shadow
    rrect(g, 15, 17, 46, 54, 6, P.sky);                 // pants body
    rect(g, 15, 17, 48, 23, P.lgy);                     // waistband
    g.set(24, 20, P.navy); g.set(38, 20, P.navy);       // button studs
    rect(g, 28, 38, 35, 56, null);                      // leg gap
    eyes(g, CX, 31, 7);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 12, 34); blush(g, CX + 12, 34);
  }});

  S.push({ name: 'milk', draw(g) {
    rect(g, 19, 24, 45, 56, P.lgy);                     // carton side
    rect(g, 19, 24, 43, 56, P.crm);                     // front
    tri(g, 19, 24, 43, 24, 31, 13, P.crm);              // gable
    tri(g, 31, 24, 43, 24, 37, 13, P.lgy);
    rect(g, 29, 13, 33, 18, P.lgy);                     // folded top ridge
    ellipse(g, 31, 33, 6, 4, P.sky);                    // milk splash label
    eyes(g, 31, 40, 7);
    smileArc(g, 31, 47, 3, 1.3);
    blush(g, 20, 44); blush(g, 42, 44);
  }});

  S.push({ name: 'heart', draw(g) {
    disc(g, 23, 25, 11, P.plum); disc(g, 42, 25, 11, P.plum);
    tri(g, 11, 28, 53, 28, 32, 56, P.plum);
    disc(g, 22, 23, 11, P.red); disc(g, 41, 23, 11, P.red);
    tri(g, 11, 26, 51, 26, 31, 53, P.red);
    ellipse(g, 18, 18, 4, 3, P.pnk);                    // highlight
    eyes(g, CX, 28, 7);
    smileArc(g, CX, 36, 3, 1.4);
    blush(g, 17, 33); blush(g, 46, 33);
  }});

  S.push({ name: 'meat', draw(g) {
    stroke(g, [[44, 50], [50, 56]], 2.4, 2.4, P.crm);   // bone shaft
    ball(g, 51, 56, 3, 3, P.crm, P.lgy); ball(g, 47, 52, 3, 3, P.crm, P.lgy); // bone knobs
    ball(g, CX - 3, 30, 16, 15, P.brn, P.plum, P.org);  // drumstick meat
    eyes(g, CX - 3, 28, 7);
    smileArc(g, CX - 3, 36, 3, 1.3);
    blush(g, CX - 16, 33); blush(g, CX + 9, 33);
  }});

  S.push({ name: 'hill', draw(g) {
    tri(g, 6, 52, 58, 52, CX, 10, P.grn);               // mountain (shadow)
    tri(g, 6, 52, 44, 52, 26, 12, P.lim);               // lit face
    tri(g, 20, 24, 44, 24, CX, 10, P.crm);              // snow cap
    tri(g, 30, 24, 44, 24, 36, 14, P.lgy);
    ellipse(g, CX, 52, 26, 4, P.grn);                   // ground
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 47, 3, 1.3);
    blush(g, CX - 12, 44); blush(g, CX + 12, 44);
  }});

  S.push({ name: 'glass', draw(g) {
    rrect(g, 19, 16, 44, 56, 4, P.lgy);                 // glass
    rect(g, 22, 34, 41, 54, P.sky);                     // water
    ellipse(g, 31, 34, 10, 2.4, P.crm);                 // surface
    rect(g, 23, 20, 25, 50, P.crm);                     // shine
    tri(g, 19, 40, 19, 57, 24, 57, null);               // taper the base
    tri(g, 44, 40, 44, 57, 39, 57, null);
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.2);
    blush(g, 23, 44); blush(g, 40, 44);
  }});

  S.push({ name: 'shoe', draw(g) {
    rrect(g, 7, 47, 57, 55, 4, P.crm);                  // sole
    rect(g, 7, 52, 57, 55, P.lgy);
    ball(g, 40, 42, 16, 9, P.red, P.plum);              // toe box
    ball(g, 20, 34, 13, 12, P.red, P.plum);             // ankle back
    ellipse(g, 20, 30, 7, 5, P.plum);                   // ankle opening
    rect(g, 26, 34, 38, 37, P.crm);                     // tongue
    g.set(28, 32, P.crm); g.set(32, 31, P.crm); g.set(36, 32, P.crm); // laces
    eyes(g, 40, 42, 6);
    smileArc(g, 40, 47, 2.6, 1.1);
    blush(g, 33, 45); blush(g, 47, 45);
  }});

  S.push({ name: 'toilet', draw(g) {
    rrect(g, 17, 10, 47, 26, 3, P.lgy);                 // tank
    rrect(g, 17, 10, 45, 24, 3, P.crm);
    ellipse(g, 40, 15, 1.6, 1.6, P.sky);                // flush button
    rrect(g, 25, 48, 38, 58, 3, P.lgy);                 // pedestal
    ball(g, CX, 38, 16, 12, P.crm, P.lgy);              // bowl
    ellipse(g, CX, 34, 11, 4.5, P.sky);                 // water
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 45, 2.8, 1.2);
    blush(g, CX - 13, 43); blush(g, CX + 13, 43);
  }});

  S.push({ name: 'chicken', draw(g) {
    disc(g, 26, 12, 3, P.red); disc(g, 31.5, 9, 3.4, P.red); disc(g, 37, 12, 3, P.red); // comb
    ball(g, CX, 44, 15, 13, P.crm, P.lgy);              // body
    ellipse(g, 18, 44, 5, 8, P.crm); ellipse(g, 45, 44, 5, 8, P.crm); // wings
    ball(g, CX, 24, 13, 12, P.crm, P.lgy);              // head
    tri(g, 28, 29, 35, 29, CX, 33, P.org);              // beak
    g.set(30, 34, P.red); g.set(33, 34, P.red);         // wattle
    stroke(g, [[27, 57], [27, 61]], 1, 1, P.org); stroke(g, [[36, 57], [36, 61]], 1, 1, P.org); // feet
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 36, 2, 0.9);
    blush(g, CX - 11, 28); blush(g, CX + 11, 28);
  }});

  S.push({ name: 'doll', draw(g) {
    ball(g, CX, 38, 16, 20, P.red, P.plum);             // dress body
    ellipse(g, CX, 24, 13, 13, P.pnk);                  // scarf
    disc(g, CX, 26, 10, P.pch);                         // face
    ellipse(g, CX, 18, 10, 3, P.brn);                   // hair fringe
    ellipse(g, CX, 50, 7, 5, P.yel);                    // belly flower
    disc(g, CX, 50, 2.5, P.org);
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 32, 2.4, 1.1);
    blush(g, CX - 8, 30); blush(g, CX + 8, 30);
  }});

  S.push({ name: 'hospital', draw(g) {
    rrect(g, 12, 16, 52, 58, 3, P.lgy);                 // building
    rrect(g, 12, 16, 50, 56, 3, P.crm);
    rect(g, 29, 19, 34, 31, P.red); rect(g, 25, 23, 38, 27, P.red); // cross
    ellipse(g, 18, 42, 2.6, 3, P.sky); ellipse(g, 45, 42, 2.6, 3, P.sky); // windows
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.6, 1.2);
    blush(g, CX - 13, 46); blush(g, CX + 13, 46);
  }});

  S.push({ name: 'toast', draw(g) {
    rrect(g, 12, 22, 52, 56, 9, P.brn);                 // crust
    ellipse(g, CX, 22, 20, 7, P.brn);                   // crust top hump
    rrect(g, 16, 26, 48, 52, 6, P.org);                 // toasted face
    ellipse(g, CX, 26, 15, 4, P.org);
    rrect(g, 25, 20, 38, 30, 2, P.yel);                 // butter pat
    rect(g, 26, 21, 37, 24, P.crm);                     // butter shine
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 45, 3, 1.3);
    blush(g, 21, 43); blush(g, 42, 43);
  }});

  S.push({ name: 'apple', draw(g) {
    stroke(g, [[CX - 1, 16], [CX, 10]], 1.4, 1.4, P.brn); // stem
    ellipse(g, 38, 12, 5, 3, P.lim);                    // leaf
    ball(g, 24, 34, 13, 14, P.red, P.plum);             // lobes
    ball(g, 40, 34, 13, 14, P.red, P.plum);
    ball(g, CX, 40, 16, 16, P.red, P.plum, P.pnk);      // body
    ellipse(g, 22, 26, 4, 3, P.pnk);                    // highlight
    eyes(g, CX, 36, 7);
    smileArc(g, CX, 44, 3, 1.3);
    blush(g, CX - 13, 41); blush(g, CX + 13, 41);
  }});

  S.push({ name: 'sea', draw(g) {
    ball(g, CX, 44, 21, 13, P.sky, P.lav);              // sea body
    ball(g, 40, 26, 13, 11, P.sky, P.lav);              // wave crest curl
    ellipse(g, 40, 20, 12, 5, P.crm);                   // foam top
    disc(g, 48, 24, 4, P.crm); disc(g, 44, 20, 3, P.crm); // foam blobs
    disc(g, 16, 46, 2.4, P.crm); disc(g, 47, 48, 2, P.crm);
    eyes(g, CX - 4, 44, 7);
    smileArc(g, CX - 4, 51, 3, 1.3);
    blush(g, 12, 48); blush(g, 40, 48);
  }});

  S.push({ name: 'map', draw(g) {
    rrect(g, 10, 16, 53, 52, 2, P.brn);                 // parchment shadow
    rrect(g, 10, 16, 51, 50, 2, P.pch);                 // parchment
    rect(g, 24, 16, 25, 50, P.brn); rect(g, 38, 16, 39, 50, P.brn); // folds
    rect(g, 10, 32, 51, 33, P.brn);
    for (let i = 0; i < 5; i++) disc(g, 16 + i * 6, 40 - i * 3, 1.2, P.red); // route dots
    ball(g, 46, 24, 3, 3, P.red, P.plum); disc(g, 46, 24, 1.4, P.yel); // marker
    eyes(g, 24, 40, 6);
    smileArc(g, 24, 45, 2.4, 1.1);
    blush(g, 16, 43); blush(g, 33, 43);
  }});

  S.push({ name: 'garage', draw(g) {
    tri(g, 8, 26, 55, 26, CX, 11, P.red);               // roof
    tri(g, CX, 11, 55, 26, 40, 26, P.plum);             // roof shade
    rrect(g, 12, 26, 51, 56, 1, P.lgy);                 // wall shadow
    rrect(g, 12, 26, 49, 54, 1, P.crm);                 // wall
    rrect(g, 17, 30, 46, 54, 1, P.sky);                 // roll-up door
    rect(g, 17, 46, 46, 47, P.lav); rect(g, 17, 50, 46, 51, P.lav); // panel lines
    eyes(g, CX, 37, 6);
    smileArc(g, CX, 43, 2.6, 1.1);
    blush(g, 22, 41); blush(g, 41, 41);
  }});

  S.push({ name: 'park', draw(g) {
    ellipse(g, CX, 58, 26, 4, P.grn);                   // grass
    rect(g, 29, 40, 34, 52, P.brn);                     // trunk
    ball(g, CX, 26, 17, 15, P.lim, P.grn);              // canopy
    disc(g, 20, 22, 6, P.lim); disc(g, 44, 24, 6, P.lim);
    rect(g, 12, 50, 24, 52, P.org);                     // bench seat
    rect(g, 13, 52, 14, 57, P.brn); rect(g, 22, 52, 23, 57, P.brn); // bench legs
    eyes(g, CX, 26, 7);
    smileArc(g, CX, 33, 3, 1.3);
    blush(g, CX - 13, 30); blush(g, CX + 13, 30);
  }});

  S.push({ name: 'snake', draw(g) {
    ellipse(g, CX, 44, 20, 14, P.grn); ellipse(g, CX, 44, 20, 12, P.lim); // outer coil
    ellipse(g, CX, 44, 12, 8, P.grn); ellipse(g, CX, 44, 12, 6, P.lim);   // inner ring
    disc(g, 16, 44, 2, P.grn); disc(g, 47, 44, 2, P.grn); // pattern
    ball(g, CX, 22, 11, 10, P.lim, P.grn);              // raised head
    rect(g, 30, 30, 33, 35, P.red); g.set(30, 35, P.red); g.set(33, 35, P.red); // forked tongue
    eyes(g, CX, 21, 6);
    smileArc(g, CX, 27, 2.2, 1);
    blush(g, CX - 9, 25); blush(g, CX + 9, 25);
  }});

  S.push({ name: 'cow', draw(g) {
    tri(g, 20, 12, 26, 16, 18, 8, P.crm); tri(g, 43, 12, 37, 16, 45, 8, P.crm); // horns
    ellipse(g, 15, 20, 4, 3, P.pch); ellipse(g, 48, 20, 4, 3, P.pch); // ears
    ball(g, CX, 46, 15, 13, P.crm, P.lgy);              // body
    ball(g, 22, 55, 3.5, 3, P.crm, P.lgy); ball(g, 41, 55, 3.5, 3, P.crm, P.lgy); // feet
    ball(g, CX, 24, 15, 13, P.crm, P.lgy);              // head
    clipTo(g, [P.crm, P.lgy], () => { disc(g, 20, 20, 4, P.dgy); disc(g, 42, 46, 5, P.dgy); disc(g, 24, 50, 3, P.dgy); }); // patches
    ball(g, CX, 30, 7, 5, P.pnk);                       // snout
    g.set(29, 30, P.plum); g.set(34, 30, P.plum);       // nostrils
    eyes(g, CX, 23, 7);
    smileArc(g, CX, 32, 2.4, 1);
    blush(g, CX - 12, 29); blush(g, CX + 12, 29);
  }});

  S.push({ name: 'airport', draw(g) {
    ellipse(g, CX, 41, 28, 5, P.lav);                   // wing shadow
    ellipse(g, CX, 39, 27, 4.5, P.sky);                 // wings
    ball(g, CX, 32, 10, 23, P.crm, P.lgy);              // fuselage
    tri(g, 25, 52, 31, 50, 24, 60, P.sky);              // tail fins
    tri(g, 38, 52, 32, 50, 39, 60, P.sky);
    ellipse(g, CX, 46, 2, 2, P.sky); ellipse(g, CX, 51, 2, 2, P.sky); // windows
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.6, 1.1);
    blush(g, CX - 9, 30); blush(g, CX + 9, 30);
  }});

  S.push({ name: 'lake', draw(g) {
    ellipse(g, CX, 42, 25, 16, P.grn);                  // grassy bank
    ball(g, CX, 42, 20, 12, P.sky, P.lav);              // calm water
    rect(g, 18, 36, 26, 37, P.crm); rect(g, 38, 46, 46, 47, P.crm); // ripples
    ellipse(g, 44, 34, 4, 2.4, P.lim); disc(g, 44, 34, 1.4, P.grn); // lily pad
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 47, 3, 1.3);
    blush(g, CX - 13, 44); blush(g, CX + 13, 44);
  }});

  S.push({ name: 'bug', draw(g) {
    stroke(g, [[26, 14], [24, 8]], 1, 1, P.navy); stroke(g, [[37, 14], [39, 8]], 1, 1, P.navy); // antennae
    disc(g, 24, 7, 2, P.navy); disc(g, 39, 7, 2, P.navy);
    ball(g, CX, 40, 18, 16, P.red, P.plum);             // shell
    rect(g, 31, 24, 32, 56, P.navy);                    // wing split
    disc(g, 20, 38, 3, P.navy); disc(g, 43, 38, 3, P.navy); // spots
    disc(g, 22, 48, 2.6, P.navy); disc(g, 41, 48, 2.6, P.navy);
    ball(g, CX, 22, 11, 9, P.dgy, P.navy);              // head
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 27, 2.4, 1);
    blush(g, 20, 26); blush(g, 43, 26);
  }});

  S.push({ name: 'lawyer', draw(g) {
    ball(g, CX, 49, 11, 9, P.dgy, P.navy);              // suit jacket
    ball(g, 26, 57, 4, 2.6, P.dgy, P.navy); ball(g, 37, 57, 4, 2.6, P.dgy, P.navy); // shoes
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn); ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn); // hands
    tri(g, 27, 41, 36, 41, CX, 52, P.crm);              // shirt V
    rect(g, 30, 42, 33, 52, P.red);                     // tie
    ball(g, CX, 27, 14, 13, P.pch, P.brn);              // head
    ellipse(g, CX, 17, 13, 5.5, P.dgy);                 // tidy hair
    ellipse(g, 19, 22, 2, 4, P.dgy); ellipse(g, 44, 22, 2, 4, P.dgy);
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

  /* Sprite corpus slices 4-20 (gated). */
  S.push({ name: 'bat', draw(g) {
    tri(g, 4, 26, 21, 22, 19, 42, P.lav);                 // wings
    tri(g, 59, 26, 43, 22, 45, 42, P.lav);
    tri(g, 8, 28, 15, 31, 11, 37, null);                  // scallop notches
    tri(g, 56, 28, 49, 31, 53, 37, null);
    tri(g, 22, 14, 27, 20, 19, 23, P.lgy);                // big ears
    tri(g, 41, 14, 36, 20, 44, 23, P.lgy);
    tri(g, 23, 16, 26, 20, 21, 22, P.pch);
    tri(g, 40, 16, 37, 20, 42, 22, P.pch);
    ball(g, CX, 34, 13, 12, P.lgy, P.lav);                // round body-head
    ball(g, 27, 47, 3, 2.2, P.lgy, P.lav);                // stubby feet
    ball(g, 36, 47, 3, 2.2, P.lgy, P.lav);
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 39, 2.6, 1.2);
    rect(g, 29, 40, 29, 41, P.crm);                       // friendly fangs
    rect(g, 34, 40, 34, 41, P.crm);
    blush(g, CX - 10, 37); blush(g, CX + 10, 37);
  }});

  S.push({ name: 'cage', draw(g) {
    disc(g, CX, 8, 3, P.org); ellipse(g, CX, 8, 1.5, 1.5, null); // hang ring
    ellipse(g, CX, 15, 13, 7, P.brn);                     // dome cap shadow
    ellipse(g, CX, 14, 12, 6, P.yel);                     // dome cap
    rrect(g, 15, 47, 48, 53, 3, P.brn);                   // base shadow
    rrect(g, 15, 46, 48, 51, 3, P.yel);                   // base
    rect(g, 19, 17, 20, 46, P.yel);                       // bars
    rect(g, 24, 17, 25, 46, P.yel);
    rect(g, 38, 17, 39, 46, P.yel);
    rect(g, 43, 17, 44, 46, P.yel);
    eyes(g, CX, 30, 5.5);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 9, 34); blush(g, CX + 9, 34);
  }});

  S.push({ name: 'star', draw(g) {
    const cy = 31, R = 18, r = 8;
    for (let k = 0; k < 5; k++) {                         // five spikes
      const a = -Math.PI / 2 + k * 2 * Math.PI / 5;
      tri(g, CX + R * Math.cos(a), cy + R * Math.sin(a),
        CX + r * Math.cos(a - 0.7), cy + r * Math.sin(a - 0.7),
        CX + r * Math.cos(a + 0.7), cy + r * Math.sin(a + 0.7), P.yel);
    }
    ball(g, CX, cy, 9, 9, P.yel, P.org);                  // core (shadow rim)
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 35, 2.4, 1.1);
    blush(g, CX - 9, 33); blush(g, CX + 9, 33);
  }});

  S.push({ name: 'bread', draw(g) {
    ellipse(g, CX, 41, 19, 10, P.brn);                    // base shadow
    rrect(g, 13, 26, 50, 47, 10, P.brn);                  // loaf (shadow)
    rrect(g, 13, 24, 50, 45, 10, P.org);                  // crust top
    stroke(g, [[18, 30], [23, 26]], 0.9, 0.9, P.brn);     // crust score marks (kept high, off the brow line)
    stroke(g, [[27, 30], [32, 26]], 0.9, 0.9, P.brn);
    stroke(g, [[36, 30], [41, 26]], 0.9, 0.9, P.brn);
    eyes(g, CX, 37, 6);
    smileArc(g, CX, 42, 2.8, 1.2);
    blush(g, CX - 13, 40); blush(g, CX + 13, 40);
  }});

  S.push({ name: 'cake', draw(g) {
    ball(g, CX, 37, 19, 15, P.org, P.brn);                // round pastry
    ellipse(g, CX, 32, 16, 9, P.yel);                     // golden top
    for (let k = 0; k < 10; k++) {                        // fluted edge dots
      const a = k * Math.PI / 5;
      disc(g, CX + 18 * Math.cos(a), 37 + 14 * Math.sin(a), 1, P.brn);
    }
    disc(g, CX, 23, 3, P.red);                            // cherry
    stroke(g, [[CX, 20], [CX + 2, 17]], 0.8, 0.8, P.grn); // stem
    eyes(g, CX, 35, 6);
    smileArc(g, CX, 41, 2.8, 1.2);
    blush(g, CX - 13, 39); blush(g, CX + 13, 39);
  }});

  S.push({ name: 'boots', draw(g) {
    rrect(g, 33, 18, 44, 44, 4, P.lav);                   // back boot shaft
    rrect(g, 33, 42, 53, 52, 4, P.lav);                   // back boot foot
    disc(g, 50, 47, 5, P.lav);
    rrect(g, 33, 50, 54, 54, 2, P.lgy);                   // back sole
    rrect(g, 13, 16, 25, 44, 4, P.sky);                   // front shaft
    rrect(g, 13, 42, 34, 52, 4, P.sky);                   // front foot
    disc(g, 31, 47, 5, P.sky);                            // rounded toe
    rrect(g, 13, 50, 35, 54, 2, P.lgy);                   // front sole
    rect(g, 15, 16, 23, 19, P.crm);                       // cuff band
    eyes(g, 21, 28, 5);
    smileArc(g, 21, 34, 2.2, 1);
    blush(g, 15, 32); blush(g, 27, 32);
  }});

  S.push({ name: 'basketball', draw(g) {
    ball(g, CX, 32, 18, 18, P.org, P.brn);                // ball
    stroke(g, [[CX, 14], [20, 32], [CX, 50]], 0.9, 0.9, P.brn); // left curve seam
    stroke(g, [[CX, 14], [43, 32], [CX, 50]], 0.9, 0.9, P.brn); // right curve seam
    stroke(g, [[14, 32], [50, 32]], 0.9, 0.9, P.brn);     // waist seam
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 3, 1.6);
    blush(g, CX - 12, 36); blush(g, CX + 12, 36);
  }});

  S.push({ name: 'sleep', draw(g) {
    ball(g, CX, 36, 16, 15, P.yel, P.org);                // round sleepy moon
    disc(g, 24, 31, 2, P.org); disc(g, 41, 43, 1.6, P.org); // craters
    tri(g, 14, 25, 44, 25, 8, 6, P.red);                  // floppy nightcap
    rrect(g, 13, 22, 45, 26, 2, P.plum);                  // cap brim shadow
    rrect(g, 13, 21, 45, 25, 2, P.red);                   // cap brim
    disc(g, 8, 6, 3, P.crm);                              // pom-pom
    smileArc(g, CX - 6, 36, 2.6, 1.2);                    // closed sleepy eyes
    smileArc(g, CX + 6, 36, 2.6, 1.2);
    smileArc(g, CX, 43, 2.2, 1);                          // peaceful smile
    ball(g, 44, 41, 2.6, 2.6, P.sky, P.lav);              // sleepy bubble
    blush(g, CX - 11, 41); blush(g, CX + 11, 41);
  }});

  S.push({ name: 'castle', draw(g) {
    tri(g, 16, 8, 22, 10, 16, 13, P.pnk);                 // flags
    tri(g, 48, 8, 54, 10, 48, 13, P.pnk);
    stroke(g, [[16, 8], [16, 15]], 0.8, 0.8, P.brn);      // flag poles
    stroke(g, [[48, 8], [48, 15]], 0.8, 0.8, P.brn);
    tri(g, 9, 24, 23, 24, 16, 14, P.red);                 // tower roofs
    tri(g, 41, 24, 55, 24, 48, 14, P.red);
    rrect(g, 10, 24, 22, 54, 2, P.lav); rrect(g, 10, 24, 21, 54, 2, P.lgy); // left tower
    rrect(g, 42, 24, 54, 54, 2, P.lav); rrect(g, 42, 24, 53, 54, 2, P.lgy); // right tower
    rect(g, 22, 32, 42, 54, P.lav); rect(g, 22, 32, 41, 54, P.lgy); // keep
    rect(g, 24, 30, 27, 33, P.lgy); rect(g, 30, 30, 33, 33, P.lgy); rect(g, 36, 30, 39, 33, P.lgy); // battlements
    rrect(g, 27, 45, 36, 54, 4, P.brn);                   // gate
    rrect(g, 13, 34, 17, 39, 2, P.sky); rrect(g, 47, 34, 51, 39, 2, P.sky); // windows
    eyes(g, CX, 38, 5.5);
    smileArc(g, CX, 43, 2.4, 1.1);
    blush(g, CX - 9, 41); blush(g, CX + 9, 41);
  }});

  S.push({ name: 'pen', draw(g) {
    tri(g, 24, 46, 39, 46, CX, 57, P.pch);                // wood cone
    tri(g, 28, 52, 35, 52, CX, 57, P.dgy);                // graphite tip
    rrect(g, 24, 12, 39, 46, 2, P.yel);                   // barrel
    rect(g, 35, 14, 39, 46, P.org);                       // shadow side
    rect(g, 26, 14, 27, 46, P.crm);                       // highlight
    rect(g, 24, 13, 39, 16, P.lgy);                       // ferrule
    rrect(g, 24, 6, 39, 14, 3, P.pnk);                    // eraser
    eyes(g, CX, 27, 5);
    smileArc(g, CX, 33, 2.2, 1);
    blush(g, 27, 31); blush(g, 36, 31);
  }});

  S.push({ name: 'turtle', draw(g) {
    ball(g, 15, 44, 4, 3, P.lim, P.grn);                  // legs
    ball(g, 48, 44, 4, 3, P.lim, P.grn);
    ball(g, 22, 53, 4, 3, P.lim, P.grn);
    ball(g, 41, 53, 4, 3, P.lim, P.grn);
    tri(g, 47, 40, 52, 42, 50, 35, P.lim);                // tail
    ball(g, CX, 31, 18, 14, P.org, P.brn);                // shell
    ellipse(g, CX, 32, 13, 9, P.yel);                     // shell inner
    disc(g, CX, 31, 3, P.org);                            // centre plate
    for (let k = 0; k < 6; k++) {                         // hex plates
      const a = k * Math.PI / 3;
      disc(g, CX + 9 * Math.cos(a), 31 + 6 * Math.sin(a), 2, P.org);
    }
    ball(g, CX, 50, 8, 7, P.lim, P.grn);                  // head
    eyes(g, CX, 50, 5);
    smileArc(g, CX, 55, 2.2, 1);
    blush(g, CX - 7, 53); blush(g, CX + 7, 53);
  }});

  S.push({ name: 'candy', draw(g) {
    tri(g, 8, 26, 18, 33, 8, 42, P.pnk);                  // wrapper twists
    tri(g, 56, 26, 46, 33, 56, 42, P.pnk);
    tri(g, 10, 30, 16, 34, 10, 38, P.red);                // twist folds
    tri(g, 54, 30, 48, 34, 54, 38, P.red);
    ball(g, CX, 34, 14, 13, P.pnk, P.red);                // candy centre
    stroke(g, [[24, 26], [40, 42]], 1.2, 1.2, P.crm);     // swirl stripe
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 39, 2.6, 1.2);
    blush(g, CX - 11, 37); blush(g, CX + 11, 37);
  }});

  S.push({ name: 'rope', draw(g) {
    ball(g, CX, 36, 19, 16, P.org, P.brn);                // coil ring
    ellipse(g, CX, 30, 9, 6, null);                       // hole -> ring
    for (let k = 0; k < 16; k++) {                        // twist ticks
      const a = k * Math.PI / 8;
      const x = Math.round(CX + 13.5 * Math.cos(a)), y = Math.round(36 + 11 * Math.sin(a));
      g.set(x, y, P.brn); g.set(x - 1, y - 1, P.brn);
    }
    stroke(g, [[46, 30], [52, 22], [50, 16]], 2.4, 1.6, P.org); // loose end
    disc(g, 50, 15, 2, P.brn);                            // frayed tip
    eyes(g, CX, 42, 4.5);
    smileArc(g, CX, 47, 2, 1);
    blush(g, CX - 7, 45); blush(g, CX + 7, 45);
  }});

  S.push({ name: 'mask', draw(g) {
    stroke(g, [[46, 12], [50, 4]], 1.4, 0.8, P.pnk);      // plume stem
    tri(g, 44, 13, 52, 9, 50, 3, P.pnk);                  // feather
    rrect(g, 41, 38, 44, 58, 2, P.brn);                   // handle
    ball(g, CX, 30, 18, 15, P.sky, P.lav);                // mask plate
    tri(g, 8, 26, 16, 28, 12, 34, P.sky);                 // side flourishes
    tri(g, 55, 26, 47, 28, 51, 34, P.sky);
    for (let k = 0; k < 14; k++) {                        // gold rim dots
      const a = k * Math.PI / 7;
      disc(g, CX + 17 * Math.cos(a), 30 + 14 * Math.sin(a), 1, P.yel);
    }
    disc(g, CX, 16, 2.5, P.red);                          // jewel
    eyes(g, CX, 28, 7);
    smileArc(g, CX, 36, 3, 1.4);
    blush(g, CX - 12, 33); blush(g, CX + 12, 33);
  }});

  S.push({ name: 'picture', draw(g) {
    rrect(g, 9, 10, 54, 54, 4, P.org);                    // frame shadow
    rrect(g, 9, 10, 53, 52, 4, P.yel);                    // frame
    rect(g, 16, 16, 47, 42, P.sky);                       // photo sky
    rect(g, 16, 37, 47, 42, P.lim);                       // green ground
    disc(g, 42, 24, 4.5, P.yel);                          // sun
    disc(g, 22, 22, 3, P.crm); disc(g, 26, 22, 2.4, P.crm); // cloud
    eyes(g, CX, 47, 4.5);
    smileArc(g, CX, 50, 2, 0.9);
    blush(g, CX - 9, 49); blush(g, CX + 9, 49);
  }});

  S.push({ name: 'bath', draw(g) {
    disc(g, 20, 30, 5, P.crm); disc(g, 31, 27, 6, P.crm); disc(g, 42, 30, 5, P.crm); // suds
    ball(g, 41, 24, 4, 3.5, P.yel, P.org);                // rubber duck
    tri(g, 43, 24, 48, 24, 44, 27, P.org);                // duck beak
    g.set(40, 22, P.navy);                                // duck eye
    rrect(g, 10, 34, 53, 52, 6, P.lav);                   // tub shadow
    rrect(g, 10, 32, 53, 50, 6, P.sky);                   // tub body
    rect(g, 12, 44, 51, 50, P.lav);                       // tub lower shade
    ball(g, 16, 53, 3, 2.5, P.lgy); ball(g, 47, 53, 3, 2.5, P.lgy); // feet
    eyes(g, 24, 40, 5);
    smileArc(g, 24, 45, 2.2, 1);
    blush(g, 18, 43); blush(g, 30, 43);
  }});

  S.push({ name: 'piano', draw(g) {
    rrect(g, 11, 12, 52, 30, 3, P.brn);                   // cabinet
    rect(g, 11, 12, 52, 16, P.plum);                      // lid shadow
    rect(g, 8, 30, 55, 40, P.crm);                        // white keys
    for (let x = 13; x < 52; x += 6) rect(g, x, 30, x + 1, 40, P.dgy); // key gaps
    for (let x = 15; x < 50; x += 6) rect(g, x - 1, 30, x + 1, 36, P.blk); // black keys
    rect(g, 12, 40, 51, 48, P.brn); rect(g, 12, 40, 51, 42, P.plum); // lower body
    rect(g, 14, 48, 18, 55, P.brn); rect(g, 45, 48, 49, 55, P.brn); // legs
    eyes(g, CX, 20, 6);
    smileArc(g, CX, 25, 2.6, 1.2);
    blush(g, CX - 12, 23); blush(g, CX + 12, 23);
  }});

  S.push({ name: 'rabbit', draw(g) {
    ball(g, 24, 14, 4, 11, P.crm, P.lgy);                 // ears
    ball(g, 39, 14, 4, 11, P.crm, P.lgy);
    ellipse(g, 24, 14, 2, 8, P.pnk);                      // inner ear
    ellipse(g, 39, 14, 2, 8, P.pnk);
    ball(g, CX, 46, 11, 9, P.crm, P.lgy);                 // body
    ball(g, 23, 55, 4, 3, P.crm, P.lgy);                  // feet
    ball(g, 40, 55, 4, 3, P.crm, P.lgy);
    disc(g, 46, 48, 3.5, P.crm);                          // cotton tail
    ball(g, CX, 30, 13, 12, P.crm, P.lgy);                // head
    ball(g, CX, 34, 5, 3.5, P.crm, P.lgy);                // muzzle
    ellipse(g, CX, 33, 1.6, 1.2, P.pnk);                  // nose
    eyes(g, CX, 29, 7);
    smileArc(g, CX, 35, 2, 0.9);
    blush(g, CX - 11, 33); blush(g, CX + 11, 33);
  }});

  S.push({ name: 'salad', draw(g) {           // 沙拉 saa1 laai1
    ball(g, 22, 24, 5, 4, P.lim, P.grn);                 // leafy greens
    ball(g, CX, 22, 6, 5, P.lim, P.grn);
    ball(g, 41, 24, 5, 4, P.lim, P.grn);
    disc(g, 26, 22, 2.4, P.red); disc(g, 39, 22, 2.4, P.red); // tomato bits
    disc(g, CX, 18, 2, P.org);                           // carrot bit
    rrect(g, 12, 26, 51, 46, 9, P.plum);                 // bowl (shadow)
    ellipse(g, CX, 27, 20, 4, P.lgy);                    // rim
    rrect(g, 13, 27, 49, 44, 9, P.sky);                  // bowl
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 41, 3, 1.2);
    blush(g, 20, 39); blush(g, 42, 39);
  }});

  S.push({ name: 'hook', draw(g) {            // 勾 au1
    stroke(g, [[28, 9], [28, 30], [30, 40], [37, 44], [43, 40], [44, 32]], 3.6, 3, P.navy); // metal underline
    stroke(g, [[28, 9], [28, 30], [30, 40], [37, 44], [43, 40], [44, 32]], 2.4, 2, P.lgy);  // hook body
    disc(g, 44, 31, 2, P.crm);                           // rounded tip shine
    ball(g, 28, 13, 6, 6, P.lgy, P.lav);                 // top loop head
    eyes(g, 28, 13, 3);
    smileArc(g, 28, 17, 2, 0.9);
    blush(g, 22, 15); blush(g, 34, 15);
  }});

  S.push({ name: 'tea', draw(g) {             // 茶 caa4
    stroke(g, [[26, 16], [24, 12], [26, 8], [24, 4]], 1.4, 1.2, P.lgy); // steam
    stroke(g, [[37, 17], [39, 13], [37, 9], [39, 5]], 1.4, 1.2, P.lgy);
    ellipse(g, 47, 33, 6, 7, P.lgy);                     // handle
    ellipse(g, 48, 33, 3, 4, null);
    rrect(g, 16, 21, 45, 43, 5, P.lgy);                  // cup (shadow)
    rrect(g, 16, 21, 43, 41, 5, P.crm);                  // cup
    ellipse(g, CX, 22, 14, 3.5, P.lim);                  // tea surface
    ellipse(g, CX, 50, 20, 4, P.lgy);                    // saucer
    ellipse(g, CX, 49, 18, 3, P.crm);
    eyes(g, CX, 31, 6);
    smileArc(g, CX, 37, 3, 1.2);
    blush(g, 20, 34); blush(g, 40, 34);
  }});

  S.push({ name: 'wheel', draw(g) {           // 輪 leon4
    ball(g, CX, 33, 21, 21, P.dgy, P.blk);               // tire
    disc(g, CX, 33, 15, P.navy);                         // inner tire
    disc(g, CX, 33, 13, P.lgy);                          // rim
    for (let a = 0; a < 6; a++) { const th = a / 6 * 6.283; stroke(g, [[CX, 33], [CX + Math.cos(th) * 12, 33 + Math.sin(th) * 12]], 1.4, 1.4, P.dgy); } // spokes
    disc(g, CX, 33, 6, P.lgy);                           // hub
    disc(g, CX, 33, 4.5, P.crm);
    eyes(g, CX, 32, 5);
    smileArc(g, CX, 37, 2.4, 1);
    blush(g, CX - 9, 35); blush(g, CX + 9, 35);
  }});

  S.push({ name: 'sandwich', draw(g) {        // 三文治 saam1 man4 zi6
    rrect(g, 12, 16, 52, 26, 4, P.brn);                  // top bread (crust)
    rrect(g, 12, 16, 52, 24, 4, P.org);                  // top bread
    ellipse(g, CX, 17, 18, 3, P.yel);                    // toasted top
    rect(g, 11, 26, 53, 29, P.lim);                      // lettuce
    for (let x = 13; x <= 51; x += 4) { g.set(x, 30, P.grn); g.set(x + 1, 30, P.grn); }
    rect(g, 12, 31, 52, 35, P.red);                      // ham
    rect(g, 13, 35, 51, 38, P.yel);                      // cheese
    rrect(g, 12, 38, 52, 48, 4, P.org);                  // bottom bread
    rect(g, 14, 46, 50, 48, P.brn);                      // bread shade
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 42, 3, 1.2);
    blush(g, 20, 40); blush(g, 43, 40);
  }});

  S.push({ name: 'turkey', draw(g) {          // 火雞 fo2 gai1
    for (let a = 0; a <= 8; a++) { const th = -2.6 + a / 8 * 2.1; disc(g, CX + Math.cos(th) * 22, 40 + Math.sin(th) * 22, 5, a % 2 ? P.org : P.red); } // tail fan
    ball(g, CX, 44, 13, 12, P.brn, P.plum);              // body
    ellipse(g, CX, 46, 7, 7, P.org);                     // breast
    ball(g, CX, 26, 9, 8, P.brn, P.plum);                // head
    tri(g, 27, 27, 35, 27, CX, 32, P.yel);               // beak
    stroke(g, [[31, 30], [30, 35]], 1.2, 1, P.red);      // snood
    ball(g, 24, 55, 3, 2, P.org); ball(g, 39, 55, 3, 2, P.org); // feet
    eyes(g, CX, 25, 6);
    smileArc(g, CX, 33, 2, 0.9);
    blush(g, CX - 8, 29); blush(g, CX + 8, 29);
  }});

  S.push({ name: 'nail', draw(g) {            // 釘 deng1
    ellipse(g, CX, 12, 14, 5, P.dgy);                    // head (shadow)
    ellipse(g, CX, 11, 13, 4.5, P.lgy);                  // head
    ellipse(g, CX - 5, 10, 3, 1.4, P.crm);               // shine
    tri(g, 24, 16, 39, 16, CX, 58, P.lgy);               // shaft
    tri(g, 24, 16, 31, 16, CX - 3, 52, P.crm);           // shaft light
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 37, 2.4, 1);
    blush(g, CX - 8, 34); blush(g, CX + 8, 34);
  }});

  S.push({ name: 'baseball', draw(g) {        // 棒球 paang5 kau4
    ball(g, CX, 33, 20, 20, P.crm, P.lgy);               // ball
    for (let i = 0; i < 14; i++) {                       // two curved seams + inward stitch ticks
      const t = i / 13, y = 17 + t * 32, bow = Math.sin(t * Math.PI) * 4;
      const xl = Math.round(15 + bow), xr = Math.round(48 - bow);
      g.set(xl, y, P.red); g.set(xr, y, P.red);
      if (i % 2 === 0) { g.set(xl + 2, y, P.red); g.set(xr - 2, y, P.red); }
    }
    eyes(g, CX, 31, 7);
    smileArc(g, CX, 39, 3, 1.3);
    blush(g, CX - 13, 36); blush(g, CX + 13, 36);
  }});

  S.push({ name: 'duck', draw(g) {            // 鴨 aap3
    stroke(g, [[45, 46], [52, 42], [53, 36]], 3, 1.6, P.yel); // tail
    ball(g, CX, 45, 14, 12, P.yel, P.org);               // body
    ball(g, 18, 44, 5, 7, P.yel, P.org);                 // wing
    ball(g, CX, 24, 12, 11, P.yel, P.org);               // head
    ellipse(g, CX, 31, 8, 3.5, P.org);                   // flat bill
    g.set(28, 31, P.brn); g.set(35, 31, P.brn);          // nostrils
    ball(g, 26, 58, 3.4, 2, P.org); ball(g, 38, 58, 3.4, 2, P.org); // feet
    eyes(g, CX, 23, 7);
    blush(g, CX - 10, 28); blush(g, CX + 10, 28);
  }});

  S.push({ name: 'blanket', draw(g) {         // 被 pei5
    rrect(g, 8, 20, 56, 52, 4, P.plum);                  // blanket (shadow)
    rrect(g, 8, 20, 54, 50, 4, P.sky);                   // blanket
    rect(g, 8, 46, 54, 50, P.lav);                       // folded edge
    clipTo(g, [P.sky], () => {                           // patchwork
      rect(g, 8, 20, 22, 34, P.pnk); rect(g, 36, 20, 54, 34, P.lim);
      rect(g, 22, 34, 36, 50, P.yel);
      for (let x = 10; x <= 52; x += 6) g.set(x, 33, P.crm); // stitch line
    });
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 3, 1.2);
    blush(g, 20, 38); blush(g, 43, 38);
  }});

  S.push({ name: 'diamond', draw(g) {         // 鑽石 zyun3 sek6
    rect(g, 18, 20, 45, 22, P.crm);                      // table
    tri(g, 16, 22, 47, 22, CX, 54, P.sky);               // gem body
    tri(g, 16, 22, CX, 22, CX, 50, P.lav);               // left facet shade
    tri(g, 22, 22, 30, 22, 26, 40, P.crm);               // sparkle facets
    tri(g, 34, 22, 41, 22, 37, 40, P.crm);
    g.set(23, 18, P.crm); g.set(24, 18, P.crm); g.set(24, 17, P.crm); // top sparkle
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 2.6, 1.2);
    blush(g, 22, 34); blush(g, 41, 34);
  }});

  S.push({ name: 'lemon', draw(g) {           // 檸檬 ning4 mung1
    ball(g, CX, 34, 20, 15, P.yel, P.org);               // body
    ellipse(g, 12, 34, 2.5, 2, P.yel); ellipse(g, 51, 34, 2.5, 2, P.yel); // nub ends
    ellipse(g, 22, 22, 4, 2.4, P.crm);                   // highlight
    ellipse(g, 44, 18, 5, 3, P.lim);                     // leaf
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 40, 3, 1.3);
    blush(g, CX - 13, 37); blush(g, CX + 13, 37);
  }});

  S.push({ name: 'bowl', draw(g) {            // 碗 wun2
    ellipse(g, CX, 30, 22, 5, P.lgy);                    // rim outer
    ellipse(g, CX, 30, 19, 4, P.dgy);                    // hollow
    rrect(g, 12, 30, 51, 52, 12, P.plum);                // bowl (shadow)
    rrect(g, 13, 30, 49, 50, 11, P.sky);                 // bowl
    rect(g, 20, 40, 43, 42, P.crm);                      // stripe band
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 45, 3, 1.2);
    blush(g, 21, 43); blush(g, 42, 43);
  }});

  S.push({ name: 'corn', draw(g) {            // 粟米 suk1 mai5
    ellipse(g, 18, 32, 6, 16, P.lim);                    // husk leaves
    ellipse(g, 45, 32, 6, 16, P.lim);
    ball(g, CX, 34, 12, 20, P.yel, P.org);               // cob
    clipTo(g, [P.yel, P.org], () => {                    // kernel grid
      for (let y = 18; y <= 52; y += 4) for (let x = 22; x <= 42; x += 4) g.set(x + (Math.floor(y / 4) % 2) * 2, y, P.org);
    });
    ellipse(g, CX, 14, 4, 4, P.lim);                     // top husk tuft
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 41, 2.6, 1.2);
    blush(g, CX - 9, 38); blush(g, CX + 9, 38);
  }});

  S.push({ name: 'frog', draw(g) {            // 青蛙 cing1 waa1
    ball(g, CX, 40, 18, 15, P.lim, P.grn);               // body/head
    ellipse(g, CX, 48, 11, 7, P.crm);                    // belly
    ball(g, 16, 52, 5, 3, P.lim, P.grn); ball(g, 47, 52, 5, 3, P.lim, P.grn); // feet
    disc(g, 20, 22, 7, P.lim); disc(g, 43, 22, 7, P.lim); // eye bulges
    disc(g, 20, 22, 4, P.crm); disc(g, 43, 22, 4, P.crm);
    disc(g, 20, 23, 2.4, P.navy); disc(g, 43, 23, 2.4, P.navy); // pupils
    g.set(19, 20, P.crm); g.set(42, 20, P.crm);          // sparkle
    smileArc(g, CX, 40, 8, 2.4);                         // wide mouth
    blush(g, 16, 36); blush(g, 47, 36);
  }});

  S.push({ name: 'lock', draw(g) {            // 鎖 so2
    stroke(g, [[22, 30], [22, 18], [CX, 12], [41, 18], [41, 30]], 3.6, 3.6, P.dgy); // shackle (shadow)
    stroke(g, [[22, 30], [22, 18], [CX, 12], [41, 18], [41, 30]], 2.2, 2.2, P.lgy); // shackle
    rrect(g, 15, 28, 49, 54, 4, P.brn);                  // body (shadow)
    rrect(g, 15, 28, 47, 52, 4, P.org);                  // body
    disc(g, CX, 47, 2.4, P.brn); rect(g, 31, 47, 32, 51, P.brn); // keyhole
    eyes(g, CX, 37, 6);
    smileArc(g, CX, 42, 2.6, 1.1);
    blush(g, 21, 40); blush(g, 42, 40);
  }});

  S.push({ name: 'suitcase', draw(g) {        // 手提箱 sau2 tai4 soeng1
    stroke(g, [[26, 14], [26, 8], [38, 8], [38, 14]], 2, 2, P.dgy);   // handle (shadow)
    stroke(g, [[26, 14], [26, 9], [38, 9], [38, 14]], 1.2, 1.2, P.lgy); // handle
    rrect(g, 12, 16, 52, 54, 4, P.plum);                 // case (shadow)
    rrect(g, 12, 16, 50, 52, 4, P.red);                  // case
    rect(g, 12, 22, 50, 24, P.pnk);                      // top band
    rect(g, 22, 15, 26, 18, P.yel); rect(g, 38, 15, 42, 18, P.yel); // latches
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 41, 3, 1.2);
    blush(g, 20, 38); blush(g, 43, 38);
  }});

  S.push({ name: 'cave', draw(g) {            // 洞 dung6
    ellipse(g, CX, 56, 26, 5, P.dgy);                    // ground
    ball(g, CX, 36, 24, 20, P.lgy, P.dgy);               // rocky mound
    tri(g, 12, 30, 26, 22, 24, 34, P.crm);               // facet highlights
    tri(g, 44, 30, 34, 22, 40, 34, P.dgy);
    ellipse(g, CX, 52, 13, 11, P.navy);                  // cave mouth (dark)
    ellipse(g, CX, 55, 13, 9, P.dgy);                    // inner dark
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 42, 4, 1.4);
    blush(g, CX - 15, 39); blush(g, CX + 15, 39);
  }});

  S.push({ name: 'eagle', draw(g) {           // 鷹 jing1
    tri(g, 4, 22, 22, 26, 16, 44, P.brn);                // left wing
    tri(g, 59, 22, 41, 26, 47, 44, P.brn);
    ball(g, 12, 30, 4, 5, P.plum); ball(g, 51, 30, 4, 5, P.plum); // wing tips
    ball(g, CX, 44, 12, 11, P.brn, P.plum);              // body
    ball(g, 27, 57, 2.6, 2, P.org); ball(g, 37, 57, 2.6, 2, P.org); // talons
    ball(g, CX, 24, 12, 11, P.crm, P.lgy);               // white head
    tri(g, 28, 26, 35, 26, CX, 32, P.yel);               // hooked beak
    tri(g, 29, 31, 34, 31, CX, 35, P.org);               // hook tip
    smileArc(g, CX, 37, 2, 0.8);
    eyes(g, CX, 23, 7);
    blush(g, CX - 10, 28); blush(g, CX + 10, 28);
  }});

  S.push({ name: 'pillow', draw(g) {          // 枕頭 zam2 tau4
    rrect(g, 8, 20, 56, 50, 10, P.lav);                  // pillow (shadow)
    rrect(g, 9, 20, 54, 48, 10, P.sky);                  // pillow
    ellipse(g, CX, 28, 16, 3, P.crm);                    // top sheen
    for (const cx of [10, 54]) for (const cy of [22, 46]) disc(g, cx, cy, 1.6, P.crm); // corner tufts
    eyes(g, CX, 33, 7);
    smileArc(g, CX, 40, 3, 1.3);
    blush(g, 20, 37); blush(g, 43, 37);
  }});

  S.push({ name: 'princess', draw(g) {        // 公主 gung1 zyu2
    rect(g, 22, 10, 41, 13, P.yel);                      // crown band
    tri(g, 22, 10, 30, 10, 26, 4, P.yel); tri(g, 33, 10, 41, 10, 37, 4, P.yel);
    tri(g, 28, 10, 35, 10, CX, 3, P.yel);
    disc(g, CX, 6, 1.4, P.red);                          // jewel
    tri(g, 14, 56, 49, 56, CX, 34, P.pnk);               // gown
    tri(g, 14, 56, 32, 56, CX, 38, P.plum);              // gown shade
    ball(g, CX, 36, 7, 6, P.pnk, P.plum);                // bodice
    ball(g, 20, 44, 3, 2.6, P.pch, P.brn); ball(g, 43, 44, 3, 2.6, P.pch, P.brn); // hands
    ball(g, CX, 22, 12, 11, P.pch, P.brn);               // head
    ellipse(g, 18, 26, 3, 8, P.brn); ellipse(g, 45, 26, 3, 8, P.brn); // long hair
    ellipse(g, CX, 13, 12, 5, P.brn);                    // hair top
    eyes(g, CX, 23, 6);
    smileArc(g, CX, 29, 2.6, 1.2);
    blush(g, CX - 9, 27); blush(g, CX + 9, 27);
  }});

  S.push({ name: 'lamp', draw(g) {            // 燈 dang1
    for (const [sx, sy] of [[10, 14], [52, 16], [50, 40]]) { g.set(sx, sy, P.yel); g.set(sx - 1, sy, P.yel); g.set(sx + 1, sy, P.yel); g.set(sx, sy - 1, P.yel); g.set(sx, sy + 1, P.yel); } // glow
    tri(g, 18, 34, 45, 34, 40, 12, P.org);               // shade (shadow side)
    tri(g, 18, 34, 40, 12, 23, 12, P.yel);               // shade
    rect(g, 23, 11, 40, 13, P.crm);                      // shade top rim
    rect(g, 18, 34, 45, 36, P.org);                      // shade bottom rim
    rect(g, 30, 36, 33, 50, P.dgy);                      // stalk
    rrect(g, 22, 50, 41, 56, 3, P.brn);                  // base
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 30, 2.6, 1.1);
    blush(g, 24, 28); blush(g, 39, 28);
  }});

  S.push({ name: 'badge', draw(g) {           // 徽章 fai1 zoeng1
    tri(g, 20, 12, 30, 12, 22, 30, P.red);               // left ribbon
    tri(g, 34, 12, 44, 12, 42, 30, P.sky);               // right ribbon
    for (let a = 0; a < 5; a++) {                        // gold star
      const th = a / 5 * 6.283 - Math.PI / 2;
      tri(g, CX + Math.cos(th) * 15, 38 + Math.sin(th) * 15, CX + Math.cos(th + 0.6) * 7, 38 + Math.sin(th + 0.6) * 7, CX + Math.cos(th - 0.6) * 7, 38 + Math.sin(th - 0.6) * 7, P.yel);
    }
    disc(g, CX, 38, 9, P.org);                           // center
    disc(g, CX, 38, 7, P.yel);
    eyes(g, CX, 37, 5);
    smileArc(g, CX, 42, 2.4, 1);
    blush(g, 24, 40); blush(g, 40, 40);
  }});

  S.push({ name: 'soap', draw(g) {            // 番梘 faan1 gaan2
    for (const [bx, by, br] of [[14, 14, 4], [50, 18, 5], [46, 41, 3], [16, 45, 3]]) { disc(g, bx, by, br, P.sky); disc(g, bx - 1, by - 1, br * 0.4, P.crm); } // bubbles
    ball(g, CX, 38, 20, 13, P.pnk, P.plum, P.crm);       // soap bar
    ellipse(g, CX, 32, 14, 4, P.crm);                    // sudsy sheen
    eyes(g, CX, 37, 7);
    smileArc(g, CX, 44, 3, 1.3);
    blush(g, CX - 13, 41); blush(g, CX + 13, 41);
  }});

  S.push({ name: 'soldier', draw(g) {         // 士兵 si6 bing1
    ball(g, CX, 49, 10, 8, P.grn, P.plum);               // uniform
    ball(g, 26, 57, 4, 2.6, P.brn, P.dgy); ball(g, 37, 57, 4, 2.6, P.brn, P.dgy); // boots
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn); ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn); // hands
    rect(g, 24, 44, 39, 46, P.lim);                      // belt
    ball(g, CX, 28, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 18, 14, 8, P.grn);                    // helmet dome
    rect(g, 17, 20, 46, 23, P.grn);                      // helmet brim
    disc(g, CX, 16, 2, P.yel);                           // star badge
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 3, 1.1);
    blush(g, CX - 10, 34); blush(g, CX + 10, 34);
  }});

  S.push({ name: 'shark', draw(g) {
    tri(g, 25, 16, 37, 16, 29, 0, P.lav);                 // big triangular dorsal fin
    tri(g, 26, 16, 35, 16, 29, 2, P.lgy);
    ball(g, 19, 55, 5, 3.2, P.lgy, P.lav);                // tail flukes
    ball(g, 42, 55, 5, 3.2, P.lgy, P.lav);
    ball(g, CX, 51, 6, 5, P.lgy, P.lav);                  // tail root
    ball(g, 14, 43, 4.6, 2.6, P.lgy, P.lav);              // pectoral fins
    ball(g, 49, 43, 4.6, 2.6, P.lgy, P.lav);
    ball(g, CX, 46, 12, 10, P.lgy, P.lav);                // body
    ellipse(g, CX, 48, 7, 6, P.crm);                      // belly
    ball(g, CX, 28, 14, 12, P.lgy, P.lav);                // head
    ellipse(g, CX, 37, 8, 3.5, P.plum);                   // open grin
    rect(g, 24, 33, 39, 35, P.lgy);                       // flatten mouth top
    rect(g, 25, 35, 26, 36, P.crm); rect(g, 30, 36, 31, 37, P.crm); rect(g, 36, 35, 37, 36, P.crm); // friendly teeth
    eyes(g, CX, 27, 7);
    blush(g, CX - 12, 33); blush(g, CX + 12, 33);
  }});

  S.push({ name: 'banana', draw(g) {
    stroke(g, [[15, 44], [13, 30], [20, 19], [33, 14], [46, 18]], 7.5, 5, P.org); // shadow body
    stroke(g, [[15, 43], [12, 29], [19, 18], [32, 13], [45, 17]], 6.5, 4, P.yel); // banana body
    disc(g, 15, 45, 2.2, P.brn);                          // bottom tip
    disc(g, 47, 18, 2.2, P.brn);                          // stem tip
    eyes(g, 23, 31, 6);
    smileArc(g, 23, 37, 3, 1.3);
    blush(g, 15, 35); blush(g, 31, 35);
  }});

  S.push({ name: 'passport', draw(g) {
    rrect(g, 15, 9, 48, 55, 4, P.lav);                    // cover shadow
    rrect(g, 15, 9, 46, 53, 4, P.sky);                    // cover
    rect(g, 44, 12, 46, 52, P.lav);                       // page edge
    ellipse(g, CX, 22, 6, 6, P.yel);                      // gold emblem ring
    ellipse(g, CX, 22, 3.5, 3.5, P.sky);
    disc(g, CX, 22, 1.6, P.yel);
    eyes(g, CX, 36, 7);
    smileArc(g, CX, 42, 3, 1.4);
    blush(g, CX - 12, 40); blush(g, CX + 12, 40);
  }});

  S.push({ name: 'cheese', draw(g) {
    tri(g, 12, 47, 51, 47, 49, 20, P.org);                // wedge shadow
    tri(g, 12, 45, 49, 45, 47, 20, P.yel);                // wedge front
    disc(g, 22, 39, 3, P.org);                            // holes
    disc(g, 35, 41, 2.4, P.org);
    disc(g, 39, 31, 2, P.org);
    eyes(g, 28, 31, 6);
    smileArc(g, 28, 37, 2.6, 1.2);
    blush(g, 20, 35); blush(g, 38, 35);
  }});

  S.push({ name: 'clown', draw(g) {
    tri(g, 18, 16, 45, 16, CX, 2, P.red);                 // party hat
    ball(g, CX, 3, 2.6, 2.6, P.yel);                      // pompom
    rect(g, 17, 15, 46, 17, P.yel);                       // hat brim
    ball(g, CX, 32, 15, 14, P.crm, P.lgy);                // face
    disc(g, 14, 32, 4, P.org); disc(g, 49, 32, 4, P.org); // hair puffs
    ball(g, CX, 37, 3.4, 3.2, P.red, P.plum);             // red nose
    eyes(g, CX, 30, 7);
    smileArc(g, CX, 43, 4, 1.8);
    blush(g, CX - 11, 37); blush(g, CX + 11, 37);
  }});

  S.push({ name: 'guitar', draw(g) {
    rrect(g, 28, 3, 35, 9, 2, P.brn);                     // headstock
    g.set(28, 4, P.lgy); g.set(35, 4, P.lgy); g.set(28, 7, P.lgy); g.set(35, 7, P.lgy); // pegs
    rect(g, 30, 8, 33, 34, P.dgy);                        // fretboard
    rect(g, 30, 8, 31, 34, P.lgy);                        // neck edge
    ball(g, CX, 34, 8, 7, P.brn, P.plum);                 // upper bout
    ball(g, CX, 47, 13, 12, P.brn, P.plum);               // lower bout
    disc(g, CX, 38, 3.4, P.dgy);                          // sound hole
    disc(g, CX, 38, 2.2, P.navy);
    eyes(g, CX, 47, 6);
    smileArc(g, CX, 52, 2.6, 1.1);
    blush(g, CX - 9, 50); blush(g, CX + 9, 50);
  }});

  S.push({ name: 'carpet', draw(g) {
    rrect(g, 10, 18, 53, 48, 3, P.plum);                  // border shadow
    rrect(g, 12, 20, 51, 46, 2, P.red);                   // field
    rrect(g, 16, 24, 47, 42, 2, P.org);                   // inner panel
    ellipse(g, CX, 33, 11, 6, P.red);                     // medallion bg
    ellipse(g, CX, 33, 10, 5, P.yel);                     // medallion
    for (let x = 12; x <= 51; x += 4) { rect(g, x, 48, x + 1, 51, P.crm); rect(g, x, 15, x + 1, 18, P.crm); } // fringe
    eyes(g, CX, 31, 6);
    smileArc(g, CX, 36, 2.6, 1.1);
    blush(g, 20, 34); blush(g, 43, 34);
  }});

  S.push({ name: 'wallet', draw(g) {
    rrect(g, 12, 18, 51, 50, 4, P.plum);                  // body shadow
    rrect(g, 12, 20, 49, 48, 4, P.brn);                   // body
    rrect(g, 12, 18, 49, 30, 4, P.brn);                   // fold flap
    rect(g, 12, 30, 49, 31, P.plum);                      // fold seam
    ball(g, CX, 30, 3, 3, P.yel, P.org);                  // clasp button
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 44, 3, 1.3);
    blush(g, CX - 12, 41); blush(g, CX + 12, 41);
  }});

  S.push({ name: 'pot', draw(g) {
    ellipse(g, 12, 41, 4, 2.6, P.dgy);                    // handles
    ellipse(g, 51, 41, 4, 2.6, P.dgy);
    ellipse(g, 12, 41, 2, 1.2, null);                     // handle holes
    ellipse(g, 51, 41, 2, 1.2, null);
    rrect(g, 15, 34, 48, 55, 5, P.lav);                   // pot shadow
    rrect(g, 15, 34, 46, 53, 5, P.lgy);                   // pot body
    ellipse(g, CX, 30, 18, 4, P.dgy);                     // lid
    ellipse(g, CX, 29, 16, 3, P.lgy);
    disc(g, CX, 25, 2.4, P.dgy);                          // lid knob
    eyes(g, CX, 42, 7);
    smileArc(g, CX, 48, 3, 1.3);
    blush(g, CX - 12, 45); blush(g, CX + 12, 45);
  }});

  S.push({ name: 'fan', draw(g) {
    tri(g, 10, 22, 53, 22, CX, 52, P.lav);                // fan shadow
    tri(g, 11, 23, 52, 23, CX, 51, P.sky);                // fan blade
    ellipse(g, CX, 22, 22, 6, P.lav);                     // top rim shadow
    ellipse(g, CX, 21, 21, 5, P.sky);                     // top edge
    stroke(g, [[CX, 50], [14, 24]], 1, 1, P.lav);         // pleat ribs
    stroke(g, [[CX, 50], [22, 22]], 1, 1, P.lav);
    stroke(g, [[CX, 50], [CX, 20]], 1, 1, P.lav);
    stroke(g, [[CX, 50], [41, 22]], 1, 1, P.lav);
    stroke(g, [[CX, 50], [49, 24]], 1, 1, P.lav);
    disc(g, CX, 51, 2.4, P.brn);                          // pivot rivet
    eyes(g, CX, 31, 6);
    smileArc(g, CX, 36, 2.6, 1.1);
    blush(g, CX - 11, 34); blush(g, CX + 11, 34);
  }});

  S.push({ name: 'ambulance', draw(g) {
    disc(g, 20, 52, 5, P.dgy); disc(g, 20, 52, 2.4, P.lgy); // wheels
    disc(g, 44, 52, 5, P.dgy); disc(g, 44, 52, 2.4, P.lgy);
    rrect(g, 8, 24, 56, 50, 4, P.lav);                    // body shadow
    rrect(g, 8, 24, 54, 48, 4, P.crm);                    // white body
    rect(g, 8, 41, 54, 48, P.lgy);                        // lower stripe
    ball(g, CX, 18, 4, 3, P.red, P.plum);                 // roof light
    rect(g, 42, 30, 44, 38, P.red); rect(g, 39, 33, 47, 35, P.red); // red cross
    rrect(g, 11, 28, 27, 40, 2, P.sky);                   // windshield
    eyes(g, 19, 34, 5);
    smileArc(g, 19, 39, 2.4, 1);
    blush(g, 12, 37); blush(g, 26, 37);
  }});

  S.push({ name: 'whale', draw(g) {
    stroke(g, [[24, 15], [21, 7], [24, 3]], 1.4, 1.1, P.sky); // spout
    stroke(g, [[24, 15], [28, 7], [24, 3]], 1.4, 1.1, P.sky);
    ball(g, 52, 34, 5, 6, P.sky, P.lav);                  // tail root
    tri(g, 49, 28, 60, 24, 56, 34, P.sky);                // fluke upper
    tri(g, 49, 40, 60, 44, 56, 34, P.sky);                // fluke lower
    ball(g, 27, 40, 19, 15, P.sky, P.lav);                // body
    ellipse(g, 24, 45, 12, 7, P.crm);                     // belly
    ball(g, 14, 45, 4, 2.6, P.sky, P.lav);                // side fin
    eyes(g, 24, 34, 7);
    smileArc(g, 24, 42, 3.4, 1.6);
    blush(g, 13, 39); blush(g, 35, 39);
  }});

  S.push({ name: 'priest', draw(g) {
    ball(g, CX, 50, 12, 10, P.dgy, P.navy);               // cassock
    ball(g, 21, 51, 3.2, 2.6, P.pch, P.brn);              // hands
    ball(g, 42, 51, 3.2, 2.6, P.pch, P.brn);
    rect(g, 27, 39, 36, 42, P.crm);                       // white collar band
    rect(g, 30, 39, 33, 41, P.dgy);                       // collar notch
    rect(g, 30, 45, 33, 46, P.yel); rect(g, 31, 43, 32, 49, P.yel); // cross pendant
    ball(g, CX, 27, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 18, 12, 5, P.dgy);                     // hair
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.8, 1.2);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

  S.push({ name: 'ladder', draw(g) {
    rect(g, 17, 14, 21, 57, P.brn); rect(g, 20, 14, 21, 57, P.plum); // left rail
    rect(g, 43, 14, 47, 57, P.brn); rect(g, 46, 14, 47, 57, P.plum); // right rail
    for (const ry of [22, 32, 42, 52]) { rect(g, 21, ry, 43, ry + 3, P.brn); rect(g, 21, ry + 2, 43, ry + 3, P.plum); } // rungs
    ellipse(g, CX, 14, 15, 8, P.brn);                     // top head plate
    ellipse(g, CX, 13, 14, 7, P.org);                     // face area
    eyes(g, CX, 13, 6);
    smileArc(g, CX, 19, 2.6, 1.1);
    blush(g, CX - 10, 16); blush(g, CX + 10, 16);
  }});

  S.push({ name: 'mail', draw(g) {
    rrect(g, 10, 16, 53, 50, 3, P.lgy);                   // envelope shadow
    rrect(g, 10, 16, 51, 48, 3, P.crm);                   // envelope body
    tri(g, 10, 16, 51, 16, CX, 33, P.pch);                // flap
    stroke(g, [[10, 16], [CX, 33]], 0.8, 0.8, P.lav);     // flap edges
    stroke(g, [[51, 16], [CX, 33]], 0.8, 0.8, P.lav);
    ball(g, CX, 34, 3, 2.8, P.red, P.plum);               // wax seal
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 45, 3, 1.2);
    blush(g, CX - 13, 43); blush(g, CX + 13, 43);
  }});

  S.push({ name: 'plate', draw(g) {
    ellipse(g, CX, 35, 26, 20, P.lav);                    // plate shadow
    ellipse(g, CX, 33, 25, 19, P.lgy);                    // rim
    ellipse(g, CX, 33, 18, 13, P.crm);                    // well
    ellipse(g, CX, 33, 12, 8.5, P.lgy);                   // center
    eyes(g, CX, 31, 7);
    smileArc(g, CX, 37, 3, 1.4);
    blush(g, CX - 13, 35); blush(g, CX + 13, 35);
  }});

  S.push({ name: 'popcorn', draw(g) {
    disc(g, 19, 22, 4, P.yel); disc(g, 19, 21, 3, P.crm);   // puffs
    disc(g, 27, 16, 5, P.yel); disc(g, 27, 15, 3.6, P.crm);
    disc(g, 36, 17, 4.6, P.yel); disc(g, 36, 16, 3.4, P.crm);
    disc(g, 44, 22, 4, P.yel); disc(g, 44, 21, 3, P.crm);
    disc(g, CX, 21, 4.6, P.yel); disc(g, CX, 20, 3.4, P.crm);
    rrect(g, 15, 26, 48, 56, 3, P.plum);                  // tub shadow
    rrect(g, 15, 26, 46, 54, 3, P.red);                   // tub
    for (let x = 18; x <= 43; x += 8) rect(g, x, 27, x + 3, 54, P.crm); // stripes
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 46, 3, 1.3);
    blush(g, CX - 13, 43); blush(g, CX + 13, 43);
  }});

  S.push({ name: 'bush', draw(g) {
    ellipse(g, CX, 52, 20, 4, P.grn);                     // ground shadow
    ball(g, 19, 37, 9, 8, P.grn, P.grn);                  // back clumps
    ball(g, 45, 37, 9, 8, P.grn, P.grn);
    ball(g, CX, 42, 11, 9, P.grn, P.grn);
    ball(g, CX, 30, 13, 11, P.lim, P.grn);                // top main
    ball(g, 20, 34, 7, 6, P.lim, P.grn);
    ball(g, 44, 34, 7, 6, P.lim, P.grn);
    disc(g, 22, 28, 1.6, P.pnk); disc(g, 42, 30, 1.6, P.yel); disc(g, 38, 22, 1.6, P.pnk); // flowers
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 38, 3, 1.3);
    blush(g, CX - 12, 36); blush(g, CX + 12, 36);
  }});

  S.push({ name: 'gift', draw(g) {
    ball(g, 25, 24, 5, 4, P.yel, P.org);                  // bow loops
    ball(g, 38, 24, 5, 4, P.yel, P.org);
    disc(g, CX, 25, 2.6, P.org);                          // bow knot
    rrect(g, 14, 28, 49, 55, 2, P.plum);                  // box shadow
    rrect(g, 14, 28, 47, 53, 2, P.red);                   // box
    rect(g, 28, 28, 35, 53, P.yel);                       // vertical ribbon
    rect(g, 14, 37, 47, 41, P.yel);                       // horizontal ribbon
    eyes(g, CX, 46, 6);
    smileArc(g, CX, 50, 2.6, 1.2);
    blush(g, CX - 13, 48); blush(g, CX + 13, 48);
  }});

  S.push({ name: 'spider', draw(g) {
    const L = P.dgy;
    stroke(g, [[24, 40], [14, 30], [8, 32]], 1.6, 1, L);  // left legs
    stroke(g, [[24, 42], [13, 40], [7, 44]], 1.6, 1, L);
    stroke(g, [[25, 44], [15, 48], [10, 54]], 1.6, 1, L);
    stroke(g, [[26, 46], [18, 54], [16, 59]], 1.6, 1, L);
    stroke(g, [[39, 40], [49, 30], [55, 32]], 1.6, 1, L); // right legs
    stroke(g, [[39, 42], [50, 40], [56, 44]], 1.6, 1, L);
    stroke(g, [[38, 44], [48, 48], [53, 54]], 1.6, 1, L);
    stroke(g, [[37, 46], [45, 54], [47, 59]], 1.6, 1, L);
    ball(g, CX, 42, 13, 12, P.lav, P.plum);               // round body
    ball(g, CX, 30, 9, 8, P.lav, P.plum);                 // head
    eyes(g, CX, 30, 7);
    smileArc(g, CX, 37, 2.8, 1.2);
    blush(g, CX - 8, 34); blush(g, CX + 8, 34);
  }});

  S.push({ name: 'sheep', draw(g) {
    for (let a = 0; a < 11; a++) { const th = a / 11 * Math.PI * 2; disc(g, CX + Math.cos(th) * 15, 35 + Math.sin(th) * 13, 5, P.lgy); } // wool bumps
    ball(g, CX, 35, 16, 14, P.crm, P.lgy);                // wool core
    disc(g, CX, 21, 5, P.crm);                            // head-top wool
    ball(g, 25, 56, 2.6, 3, P.dgy, P.navy);               // legs
    ball(g, 38, 56, 2.6, 3, P.dgy, P.navy);
    ellipse(g, 19, 32, 3.6, 2.4, P.pch);                  // ears
    ellipse(g, 44, 32, 3.6, 2.4, P.pch);
    ball(g, CX, 33, 9.5, 9, P.pch, P.brn);                // face
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.6, 1.1);
    blush(g, CX - 8, 35); blush(g, CX + 8, 35);
  }});

  S.push({ name: 'robe', draw(g) {
    tri(g, 31.5, 28, 13, 58, 50, 58, P.lav);              // skirt flare (shadow)
    tri(g, 30.5, 28, 15, 57, 48, 57, P.sky);              // skirt
    ball(g, 15, 36, 4.5, 6, P.sky, P.lav);                // wide sleeves
    ball(g, 48, 36, 4.5, 6, P.sky, P.lav);
    rrect(g, 21, 22, 42, 45, 5, P.sky);                   // torso
    rect(g, 21, 43, 42, 45, P.lav);                       // hem shade
    tri(g, 26, 22, 31.5, 33, 37, 22, P.crm);              // wrap collar V
    rrect(g, 28, 44, 35, 50, 2, P.pnk);                   // sash knot
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 2.4, 1);
    blush(g, CX - 11, 35); blush(g, CX + 11, 35);
  }});

  S.push({ name: 'refrigerator', draw(g) {
    rrect(g, 18, 8, 46, 58, 4, P.lav);                    // body shadow
    rrect(g, 18, 8, 44, 56, 4, P.lgy);                    // body
    rect(g, 20, 30, 44, 32, P.lav);                       // door split
    rect(g, 39, 12, 41, 26, P.dgy);                       // top handle
    rect(g, 39, 36, 41, 52, P.dgy);                       // bottom handle
    rect(g, 21, 12, 23, 26, P.crm);                       // highlight strip
    eyes(g, 28, 20, 6);
    smileArc(g, 28, 26, 2.4, 1);
    blush(g, 18, 24); blush(g, 38, 24);
  }});

  S.push({ name: 'chocolate', draw(g) {
    rrect(g, 16, 20, 48, 50, 3, P.dgy);                   // bar edge
    rrect(g, 16, 20, 46, 48, 3, P.brn);                   // bar
    clipTo(g, [P.brn], () => {                             // segment grid
      rect(g, 21, 20, 22, 48, P.plum);
      rect(g, 40, 20, 41, 48, P.plum);
      rect(g, 16, 27, 46, 28, P.plum);
      rect(g, 16, 40, 46, 41, P.plum);
    });
    rect(g, 18, 22, 24, 23, P.org);                       // sheen
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 37, 2.4, 1);
    blush(g, CX - 12, 35); blush(g, CX + 12, 35);
  }});

  S.push({ name: 'jar', draw(g) {
    rect(g, 22, 12, 41, 18, P.grn);                       // lid rim
    rrect(g, 20, 10, 43, 16, 2, P.lim);                   // lid top
    ball(g, CX, 38, 16, 17, P.sky, P.lav);                // glass body
    ellipse(g, 25, 32, 3, 7, P.crm);                      // shine
    ellipse(g, CX, 47, 12, 4, P.lav);                     // contents shade
    eyes(g, CX, 36, 7);
    smileArc(g, CX, 43, 2.8, 1.2);
    blush(g, CX - 12, 40); blush(g, CX + 12, 40);
  }});

  S.push({ name: 'necklace', draw(g) {
    const chain = [[13, 18], [15, 32], [23, 43], [31.5, 46], [40, 43], [48, 32], [50, 18]];
    stroke(g, chain, 2.2, 2.2, P.org);                    // gold chain
    for (const [x, y] of [[13, 18], [15, 32], [23, 43], [40, 43], [48, 32], [50, 18]])
      ball(g, x, y, 2.4, 2.4, P.yel, P.org);              // beads
    ball(g, CX, 50, 7, 6, P.pnk, P.plum);                 // pendant gem (face)
    ellipse(g, 29, 47, 1.6, 2, P.crm);                    // gem shine
    eyes(g, CX, 50, 4);
    smileArc(g, CX, 54, 2, 0.9);
    blush(g, CX - 6, 52); blush(g, CX + 6, 52);
  }});

  S.push({ name: 'jump', draw(g) {
    ellipse(g, 18, 57, 4.5, 1.6, P.lgy);                  // dust puffs
    ellipse(g, 46, 57, 4.5, 1.6, P.lgy);
    disc(g, 12, 55, 1.4, P.lgy); disc(g, 52, 55, 1.4, P.lgy);
    ball(g, 17, 20, 3, 3.4, P.pch, P.brn);                // arms thrown up
    ball(g, 47, 20, 3, 3.4, P.pch, P.brn);
    ball(g, CX, 42, 9, 7.5, P.yel, P.org);                // romper body
    ball(g, 24, 50, 3.6, 2.6, P.pch, P.brn);              // kicked-up feet
    ball(g, 40, 50, 3.6, 2.6, P.pch, P.brn);
    ball(g, CX, 26, 13, 12, P.pch);                       // head
    ellipse(g, CX, 17, 12, 6, P.brn);                     // hair
    ball(g, CX, 10, 2.6, 2.6, P.brn);                     // tuft
    eyes(g, CX, 28, 6);
    openMouth(g, CX, 34, 3, 2.4);                         // happy "wheee"
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

  S.push({ name: 'wolf', draw(g) {
    tri(g, 18, 18, 27, 14, 20, 6, P.lgy);                 // ears
    tri(g, 45, 18, 36, 14, 43, 6, P.lgy);
    tri(g, 20, 15, 25, 14, 21, 9, P.pch);
    tri(g, 43, 15, 38, 14, 42, 9, P.pch);
    stroke(g, [[45, 51], [53, 47], [55, 39]], 3.2, 1.8, P.lgy); // bushy tail
    ball(g, CX, 49, 10.5, 8, P.lgy, P.lav);               // body
    ellipse(g, CX, 50, 5.5, 5, P.crm);                    // chest fluff
    ball(g, 25, 57, 4, 2.8, P.lgy, P.lav);                // feet
    ball(g, 39, 57, 4, 2.8, P.lgy, P.lav);
    ball(g, CX, 26, 14, 12, P.lgy, P.lav);                // head
    ellipse(g, CX, 33, 6.5, 4.4, P.crm);                  // muzzle
    ellipse(g, CX, 31, 2, 1.4, P.navy);                   // nose
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 35, 2.6, 1.1);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

  S.push({ name: 'motorcycle', draw(g) {
    disc(g, 16, 46, 10, P.dgy); disc(g, 16, 46, 5, P.lgy);   // rear wheel
    disc(g, 48, 46, 10, P.dgy); disc(g, 48, 46, 5, P.lgy);   // front wheel
    disc(g, 16, 46, 2, P.navy); disc(g, 48, 46, 2, P.navy);  // hubs
    rrect(g, 16, 30, 48, 42, 4, P.red);                   // tank/body
    rect(g, 16, 40, 48, 42, P.plum);                      // shade
    rrect(g, 12, 26, 26, 32, 2, P.plum);                  // seat
    stroke(g, [[46, 34], [52, 26], [52, 22]], 1.6, 1.6, P.dgy); // handlebar
    disc(g, 52, 21, 2, P.dgy);                            // grip
    ball(g, 46, 37, 3.6, 3.6, P.yel, P.org);              // headlight
    eyes(g, 28, 33, 6);
    smileArc(g, 28, 38, 2.4, 1);
    blush(g, 18, 36); blush(g, 38, 36);
  }});

  S.push({ name: 'hamburger', draw(g) {
    ball(g, CX, 18, 16, 9, P.org, P.brn, P.yel);          // top bun dome
    for (const [x, y] of [[24, 15], [31, 12], [38, 15], [27, 18], [36, 18]])
      g.set(x, y, P.crm);                                 // sesame seeds
    rect(g, 15, 25, 48, 28, P.lim);                       // lettuce
    for (let x = 15; x <= 48; x += 3) g.set(x, 29, P.lim);
    rect(g, 16, 29, 47, 33, P.red);                       // tomato
    rect(g, 15, 33, 48, 39, P.brn);                       // patty
    rect(g, 15, 37, 48, 39, P.plum);                      // patty shade
    ball(g, CX, 48, 16, 8, P.org, P.brn);                 // bottom bun
    eyes(g, CX, 47, 7);
    smileArc(g, CX, 53, 2.6, 1.1);
    blush(g, CX - 13, 50); blush(g, CX + 13, 50);
  }});

  S.push({ name: 'tower', draw(g) {
    tri(g, 31.5, 3, 18, 18, 45, 18, P.plum);              // roof shadow
    tri(g, 30, 3, 20, 17, 44, 17, P.red);                 // conical roof
    disc(g, 31.5, 3, 2, P.yel);                           // finial
    rrect(g, 22, 17, 42, 56, 2, P.lav);                   // tower shadow
    rrect(g, 21, 17, 40, 56, 2, P.lgy);                   // stone shaft
    clipTo(g, [P.lgy], () => {                             // brick courses
      rect(g, 21, 24, 40, 24, P.lav);
      rect(g, 21, 47, 40, 47, P.lav);
    });
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.4, 1);
    blush(g, CX - 11, 38); blush(g, CX + 11, 38);
  }});

  S.push({ name: 'oven', draw(g) {
    rrect(g, 15, 14, 50, 58, 4, P.dgy);                   // body shadow
    rrect(g, 15, 14, 48, 56, 4, P.lgy);                   // body
    rect(g, 17, 20, 46, 22, P.dgy);                       // control panel
    disc(g, 21, 18, 2, P.red); disc(g, 42, 18, 2, P.red); // knobs
    rrect(g, 20, 26, 44, 52, 3, P.navy);                  // window frame
    rrect(g, 22, 28, 42, 50, 2, P.org);                   // warm glow
    rect(g, 24, 46, 40, 48, P.red);                       // ember shade
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 42, 2.6, 1.1);
    blush(g, CX - 10, 40); blush(g, CX + 10, 40);
  }});

  S.push({ name: 'bacon', draw(g) {
    stroke(g, [[10, 24], [22, 20], [34, 26], [46, 20], [54, 26]], 5, 5, P.red);   // back strip
    stroke(g, [[10, 24], [22, 20], [34, 26], [46, 20], [54, 26]], 3.6, 3.6, P.pnk);
    stroke(g, [[9, 40], [21, 36], [33, 42], [45, 36], [55, 42]], 5.5, 5.5, P.plum); // front shadow
    stroke(g, [[9, 39], [21, 35], [33, 41], [45, 35], [55, 41]], 4, 4, P.pnk);
    stroke(g, [[9, 39], [21, 35], [33, 41], [45, 35], [55, 41]], 1.4, 1.4, P.crm);  // fat streak
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 2.4, 1);
    blush(g, CX - 11, 42); blush(g, CX + 11, 42);
  }});

  S.push({ name: 'towel', draw(g) {
    rrect(g, 16, 14, 48, 56, 5, P.lav);                   // towel shadow
    rrect(g, 15, 13, 46, 54, 5, P.sky);                   // towel body
    rect(g, 18, 44, 44, 47, P.crm);                       // woven stripe
    rect(g, 18, 47, 44, 48, P.lav);
    rect(g, 15, 13, 18, 54, P.lav);                       // fold crease
    for (let x = 17; x <= 43; x += 4) rect(g, x, 51, x + 1, 54, P.sky); // fringe
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.6, 1.1);
    blush(g, CX - 11, 32); blush(g, CX + 11, 32);
  }});

  S.push({ name: 'peanut', draw(g) {
    ball(g, CX, 22, 12, 12, P.org, P.brn);                // top lobe
    ball(g, CX, 44, 13, 13, P.org, P.brn);                // bottom lobe
    ellipse(g, CX, 33, 8.5, 4, P.brn);                    // pinch waist
    ellipse(g, CX, 33, 8.5, 2.4, P.org);
    clipTo(g, [P.org], () => {                             // shell bumps
      for (const [x, y] of [[24, 16], [38, 18], [22, 46], [40, 44], [31, 52]])
        disc(g, x, y, 1.4, P.brn);
    });
    eyes(g, CX, 44, 6);
    smileArc(g, CX, 50, 2.4, 1);
    blush(g, CX - 10, 48); blush(g, CX + 10, 48);
  }});

  S.push({ name: 'umbrella', draw(g) {
    ellipse(g, CX, 30, 22, 16, P.plum);                   // canopy shadow
    ellipse(g, CX, 28, 22, 16, P.red);                    // canopy dome
    rect(g, 8, 30, 55, 48, null);                         // cut lower half
    for (let i = 0; i < 5; i++) ellipse(g, 12 + i * 10, 30, 5, 3, P.red); // scallops
    clipTo(g, [P.red], () => {                             // ribs
      rect(g, 31, 12, 32, 30, P.plum);
      rect(g, 20, 16, 21, 30, P.plum);
      rect(g, 42, 16, 43, 30, P.plum);
    });
    disc(g, 31.5, 10, 2, P.yel);                          // ferrule
    rect(g, 30, 30, 33, 52, P.brn);                       // pole
    stroke(g, [[31.5, 50], [31.5, 54], [27, 55]], 2, 1.6, P.brn); // J handle
    eyes(g, CX, 23, 6);
    smileArc(g, CX, 28, 2.2, 0.9);
    blush(g, CX - 11, 26); blush(g, CX + 11, 26);
  }});

  S.push({ name: 'chair', draw(g) {
    rrect(g, 20, 10, 43, 40, 3, P.brn);                   // backrest
    rect(g, 20, 34, 43, 40, P.plum);                      // backrest shade
    rrect(g, 16, 38, 47, 46, 2, P.brn);                   // seat
    rect(g, 16, 44, 47, 46, P.plum);
    rect(g, 19, 46, 22, 58, P.brn);                       // front legs
    rect(g, 41, 46, 44, 58, P.brn);
    rect(g, 24, 40, 26, 54, P.plum);                      // back legs
    rect(g, 37, 40, 39, 54, P.plum);
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 28, 2.6, 1.1);
    blush(g, CX - 11, 26); blush(g, CX + 11, 26);
  }});

  S.push({ name: 'ham', draw(g) {
    ball(g, 34, 38, 17, 15, P.pnk, P.plum);               // ham body
    ball(g, 30, 45, 14, 11, P.pnk, P.plum);               // lower bulge
    rect(g, 20, 30, 48, 32, P.red);                       // glaze band
    rect(g, 24, 20, 30, 26, P.crm);                       // bone stub
    disc(g, 27, 19, 4, P.crm);                            // bone knob
    ellipse(g, 27, 19, 2, 2, P.lgy);
    clipTo(g, [P.pnk], () => {                             // scored marks
      for (const [x, y] of [[30, 41], [38, 43], [34, 49]]) disc(g, x, y, 1, P.plum);
    });
    eyes(g, 34, 40, 6);
    smileArc(g, 34, 46, 2.4, 1);
    blush(g, 24, 44); blush(g, 44, 44);
  }});

  S.push({ name: 'envelope', draw(g) {
    rrect(g, 11, 18, 52, 50, 2, P.lgy);                   // shadow
    rrect(g, 11, 17, 50, 48, 2, P.crm);                   // body
    tri(g, 12, 18, 49, 18, 31.5, 34, P.pch);              // flap
    rect(g, 12, 18, 49, 19, P.lgy);                       // top edge
    disc(g, 31.5, 33, 2, P.red);                          // wax seal
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 45, 2.4, 1);
    blush(g, CX - 12, 43); blush(g, CX + 12, 43);
  }});

  S.push({ name: 'soup', draw(g) {
    stroke(g, [[24, 20], [22, 15], [24, 10]], 1.4, 1.1, P.lgy); // steam
    stroke(g, [[39, 20], [41, 15], [39, 10]], 1.4, 1.1, P.lgy);
    ellipse(g, CX, 26, 18, 5, P.brn);                     // soup surface rim
    ellipse(g, CX, 25, 17, 4, P.org);                     // soup
    disc(g, 24, 24, 2, P.lim); disc(g, 38, 25, 2, P.red); // veg bits
    disc(g, 31, 26, 1.6, P.yel);
    rrect(g, 14, 26, 49, 46, 6, P.plum);                  // bowl shadow
    rrect(g, 14, 26, 47, 44, 6, P.lgy);                   // bowl
    rect(g, 16, 30, 45, 32, P.crm);                       // bowl stripe
    ellipse(g, CX, 50, 14, 4, P.lav);                     // base
    eyes(g, CX, 36, 7);
    smileArc(g, CX, 41, 2.6, 1.1);
    blush(g, CX - 13, 39); blush(g, CX + 13, 39);
  }});

  S.push({ name: 'fence', draw(g) {
    rrect(g, 12, 16, 52, 54, 2, P.lav);                   // panel shadow
    rect(g, 12, 16, 50, 52, P.crm);                       // panel
    for (const x of [22, 32, 42]) rect(g, x, 16, x + 1, 52, P.lav); // picket grooves
    for (const x of [12, 22, 32, 42]) tri(g, x, 16, x + 10, 16, x + 5, 10, P.crm); // pointed tops
    rect(g, 12, 22, 50, 25, P.lav);                       // top rail
    rect(g, 12, 44, 50, 47, P.lav);                       // bottom rail
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.4, 1);
    blush(g, CX - 12, 38); blush(g, CX + 12, 38);
  }});

  S.push({ name: 'drum', draw(g) {
    stroke(g, [[45, 12], [51, 38]], 1.4, 1.4, P.brn);     // drumsticks
    disc(g, 45, 11, 2.6, P.pch);
    stroke(g, [[19, 12], [13, 38]], 1.4, 1.4, P.brn);
    disc(g, 19, 11, 2.6, P.pch);
    ellipse(g, CX, 24, 17, 6, P.lgy);                     // top rim
    ellipse(g, CX, 23, 16, 5, P.crm);                     // drumhead
    rrect(g, 15, 24, 48, 48, 2, P.red);                   // shell
    ellipse(g, CX, 48, 16.5, 5, P.plum);                  // bottom rim
    clipTo(g, [P.red], () => {                             // tension lacing
      for (let i = 0; i < 6; i++) {
        tri(g, 13 + i * 7, 25, 16.5 + i * 7, 25, 16.5 + i * 7, 33, P.yel);
        tri(g, 16.5 + i * 7, 33, 20 + i * 7, 33, 20 + i * 7, 25, P.yel);
      }
    });
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 2.4, 1);
    blush(g, CX - 12, 42); blush(g, CX + 12, 42);
  }});

  S.push({ name: 'mule', draw(g) {
    ball(g, 22, 12, 3.5, 9, P.brn, P.plum);            // long ears
    ball(g, 41, 12, 3.5, 9, P.brn, P.plum);
    ball(g, CX, 48, 12, 9, P.brn, P.plum);             // body
    ball(g, 25, 57, 3.5, 3, P.brn, P.plum); ball(g, 38, 57, 3.5, 3, P.brn, P.plum); // legs
    ball(g, CX, 26, 13, 12, P.brn, P.plum);            // head
    ball(g, CX, 35, 8, 6, P.pch, P.brn);               // muzzle
    g.set(28, 36, P.plum); g.set(35, 36, P.plum);      // nostrils
    ellipse(g, CX, 15, 4, 5, P.dgy);                   // forelock
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 38, 2.6, 1.1);
    blush(g, CX - 11, 33); blush(g, CX + 11, 33);
  }});

  S.push({ name: 'pumpkin', draw(g) {
    stroke(g, [[CX, 16], [CX + 2, 9]], 2, 1.6, P.grn); // stem
    ball(g, CX, 40, 20, 16, P.org, P.brn);             // main body
    ball(g, 18, 40, 8, 15, P.org, P.brn);              // left rib
    ball(g, 45, 40, 8, 15, P.org, P.brn);              // right rib
    clipTo(g, [P.org, P.brn], () => { rect(g, 23, 26, 24, 54, P.brn); rect(g, 39, 26, 40, 54, P.brn); }); // rib lines
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 48, 3, 1.3);
    blush(g, CX - 14, 45); blush(g, CX + 14, 45);
  }});

  S.push({ name: 'fridge', draw(g) {
    rrect(g, 16, 10, 48, 58, 4, P.lgy);                // body shadow
    rrect(g, 16, 10, 46, 56, 4, P.crm);                // body
    rect(g, 16, 30, 46, 32, P.lgy);                    // freezer split
    rrect(g, 41, 16, 43, 26, 1, P.sky);                // top handle
    rrect(g, 41, 36, 43, 48, 1, P.sky);                // bottom handle
    eyes(g, 30, 42, 6);
    smileArc(g, 30, 48, 2.6, 1.2);
    blush(g, 22, 46); blush(g, 39, 46);
  }});

  S.push({ name: 'bean', draw(g) {
    ball(g, 26, 30, 12, 12, P.brn, P.plum, P.org);     // upper lobe
    ball(g, 34, 46, 12, 12, P.brn, P.plum, P.org);     // lower lobe
    ball(g, 30, 38, 10, 11, P.brn, P.plum);            // waist join
    ellipse(g, 22, 26, 3.5, 3, P.org);                 // highlight
    eyes(g, 28, 30, 6);
    smileArc(g, 29, 36, 2.4, 1.1);
    blush(g, 19, 34); blush(g, 38, 34);
  }});

  S.push({ name: 'flag', draw(g) {
    rect(g, 16, 8, 19, 58, P.brn);                     // pole
    ball(g, 17.5, 8, 2.5, 2.5, P.yel, P.org);          // finial
    rrect(g, 19, 12, 52, 38, 2, P.red);                // banner
    ball(g, 52, 25, 4, 13, P.plum);                    // trailing wave
    ellipse(g, 24, 16, 4, 2, P.pnk);                   // shine
    eyes(g, 34, 24, 6);
    smileArc(g, 34, 30, 2.6, 1.2);
    blush(g, 27, 28); blush(g, 42, 28);
  }});

  S.push({ name: 'helmet', draw(g) {
    ball(g, CX, 30, 20, 17, P.org, P.brn, P.yel);      // dome
    rect(g, 29, 12, 34, 26, P.yel);                    // top ridge
    rrect(g, 8, 40, 55, 46, 3, P.org);                 // brim
    rect(g, 8, 44, 55, 46, P.brn);                     // brim shadow
    eyes(g, CX, 28, 7);
    smileArc(g, CX, 35, 2.8, 1.2);
    blush(g, CX - 13, 32); blush(g, CX + 13, 32);
  }});

  S.push({ name: 'sailor', draw(g) {
    ball(g, CX, 50, 12, 9, P.crm, P.lgy);              // white shirt
    clipTo(g, [P.crm, P.lgy], () => { rect(g, 20, 46, 43, 48, P.sky); rect(g, 20, 52, 43, 54, P.sky); }); // stripes
    ball(g, 21, 50, 3, 2.6, P.pch, P.brn); ball(g, 42, 50, 3, 2.6, P.pch, P.brn); // hands
    rect(g, 30, 38, 33, 42, P.sky);                    // collar tie
    ball(g, CX, 28, 13, 12, P.pch, P.brn);             // head
    ellipse(g, CX, 16, 13, 4, P.crm);                  // hat brim
    ball(g, CX, 12, 8, 4, P.crm, P.lgy);               // hat crown
    rect(g, 24, 16, 39, 17, P.sky);                    // hat band
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 2.6, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

  S.push({ name: 'pan', draw(g) {
    stroke(g, [[46, 34], [58, 28]], 2.4, 2.2, P.brn);  // handle
    ball(g, CX, 38, 21, 13, P.dgy, P.navy);            // pan body
    ellipse(g, CX, 34, 18, 9, P.lgy);                  // cooking surface
    ellipse(g, CX, 32, 10, 4, P.crm);                  // shine
    eyes(g, CX, 36, 7);
    smileArc(g, CX, 42, 2.8, 1.2);
    blush(g, CX - 12, 39); blush(g, CX + 12, 39);
  }});

  S.push({ name: 'bracelet', draw(g) {
    const cols = [P.red, P.org, P.yel, P.lim, P.sky, P.pnk, P.lav, P.grn];
    for (let a = 0; a < 12; a++) {
      const th = a / 12 * Math.PI * 2;
      ball(g, CX + Math.cos(th) * 19, 34 + Math.sin(th) * 19, 4.5, 4.5, cols[a % cols.length]);
    }
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 38, 2.8, 1.2);
    blush(g, CX - 12, 35); blush(g, CX + 12, 35);
  }});

  S.push({ name: 'garbage', draw(g) {
    rrect(g, 18, 22, 46, 58, 3, P.grn);                // can body
    rect(g, 18, 22, 46, 26, P.lim);                    // rim
    rrect(g, 14, 14, 50, 20, 3, P.lim);                // lid
    rrect(g, 29, 8, 35, 14, 2, P.grn);                 // lid knob
    clipTo(g, [P.grn], () => { rect(g, 24, 30, 25, 54, P.lim); rect(g, 31, 30, 32, 54, P.lim); rect(g, 38, 30, 39, 54, P.lim); }); // ridges
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 45, 2.8, 1.2);
    blush(g, 22, 42); blush(g, 41, 42);
  }});

  S.push({ name: 'spoon', draw(g) {
    rrect(g, 28, 30, 35, 58, 3, P.lgy);                // handle
    ball(g, CX, 24, 13, 15, P.lgy, P.lav, P.crm);      // bowl
    ellipse(g, CX, 22, 8, 9, P.crm);                   // inner shine
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 30, 2.6, 1.1);
    blush(g, CX - 9, 27); blush(g, CX + 9, 27);
  }});

  S.push({ name: 'palm', draw(g) {
    rect(g, 28, 32, 34, 58, P.brn);                    // trunk
    clipTo(g, [P.brn], () => { rect(g, 28, 40, 34, 41, P.plum); rect(g, 28, 48, 34, 49, P.plum); }); // trunk rings
    ball(g, 16, 22, 12, 5, P.grn); ball(g, 47, 22, 12, 5, P.grn); // fronds
    ball(g, CX, 14, 6, 10, P.grn);
    ball(g, 20, 30, 10, 5, P.lim); ball(g, 44, 30, 10, 5, P.lim);
    disc(g, CX, 26, 4, P.brn); disc(g, 27, 28, 3, P.brn); disc(g, 36, 28, 3, P.brn); // coconuts
    eyes(g, CX, 44, 6);
    smileArc(g, CX, 50, 2.4, 1.1);
    blush(g, 25, 48); blush(g, 38, 48);
  }});

  S.push({ name: 'ketchup', draw(g) {
    rrect(g, 22, 20, 41, 58, 5, P.red);                // bottle body
    rect(g, 27, 12, 36, 22, P.red);                    // neck
    rrect(g, 26, 8, 37, 14, 2, P.crm);                 // cap
    ellipse(g, 26, 30, 3, 8, P.pnk);                   // shine
    rrect(g, 26, 40, 37, 52, 2, P.crm);                // label
    disc(g, CX, 46, 4, P.org);                         // tomato icon
    eyes(g, CX, 26, 5);
    smileArc(g, CX, 31, 2.2, 1);
    blush(g, 26, 29); blush(g, 38, 29);
  }});

  S.push({ name: 'balloon', draw(g) {
    stroke(g, [[CX, 44], [30, 52], [34, 60]], 1, 1, P.dgy); // string
    ball(g, CX, 26, 17, 19, P.red, P.plum, P.pnk);     // balloon
    tri(g, 29, 43, 34, 43, CX, 48, P.red);             // knot
    ellipse(g, 24, 18, 4, 6, P.pnk);                   // shine
    eyes(g, CX, 26, 7);
    smileArc(g, CX, 33, 3, 1.3);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

  S.push({ name: 'bee', draw(g) {
    ellipse(g, 16, 24, 9, 6, P.crm); ellipse(g, 47, 24, 9, 6, P.crm); // wings
    ellipse(g, 16, 24, 7, 4, P.sky); ellipse(g, 47, 24, 7, 4, P.sky);
    ball(g, CX, 42, 17, 15, P.yel, P.org);             // body
    clipTo(g, [P.yel, P.org], () => { rect(g, 15, 36, 48, 40, P.navy); rect(g, 15, 46, 48, 50, P.navy); }); // stripes
    stroke(g, [[24, 12], [22, 6]], 1, 1, P.navy); stroke(g, [[39, 12], [41, 6]], 1, 1, P.navy); // antennae
    disc(g, 22, 5, 2, P.navy); disc(g, 41, 5, 2, P.navy);
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 11, 33); blush(g, CX + 11, 33);
  }});

  S.push({ name: 'sock', draw(g) {
    rrect(g, 22, 40, 52, 54, 6, P.pnk);                // foot
    ball(g, 48, 47, 6, 6, P.pnk, P.red);               // toe
    rect(g, 22, 18, 36, 46, P.pnk);                    // leg
    ball(g, 26, 44, 8, 8, P.pnk, P.red);               // heel bend
    rrect(g, 20, 12, 38, 20, 3, P.red);                // cuff
    clipTo(g, [P.pnk], () => { rect(g, 22, 24, 36, 26, P.crm); rect(g, 22, 30, 36, 32, P.crm); }); // stripes
    eyes(g, 29, 37, 5);
    smileArc(g, 29, 42, 2.2, 1);
    blush(g, 23, 40); blush(g, 36, 40);
  }});

  S.push({ name: 'shovel', draw(g) {
    rect(g, 29, 10, 34, 40, P.brn);                    // handle shaft
    rrect(g, 24, 8, 39, 16, 3, P.brn);                 // D-grip
    rect(g, 28, 10, 35, 14, null);                     // grip hole
    ball(g, CX, 46, 13, 14, P.lgy, P.lav, P.crm);      // blade
    tri(g, 19, 48, 44, 48, CX, 60, P.lgy);             // blade tip
    eyes(g, CX, 44, 6);
    smileArc(g, CX, 50, 2.6, 1.2);
    blush(g, CX - 11, 47); blush(g, CX + 11, 47);
  }});

  S.push({ name: 'nest', draw(g) {
    ball(g, CX, 42, 22, 13, P.brn, P.plum);            // nest bowl
    ellipse(g, CX, 38, 16, 7, P.dgy);                  // hollow
    clipTo(g, [P.brn, P.plum], () => { for (let i = 0; i < 6; i++) rect(g, 12 + i * 7, 46, 16 + i * 7, 47, P.plum); }); // twigs
    ball(g, 24, 38, 5, 4.5, P.sky, P.lav); ball(g, 33, 39, 5, 4.5, P.sky, P.lav); ball(g, 40, 37, 5, 4.5, P.sky, P.lav); // eggs
    eyes(g, CX, 48, 6);
    smileArc(g, CX, 53, 2.6, 1.1);
    blush(g, CX - 13, 50); blush(g, CX + 13, 50);
  }});

  S.push({ name: 'flashlight', draw(g) {
    tri(g, 42, 8, 42, 34, 60, 21, P.yel);              // light beam
    ellipse(g, 44, 21, 3, 8, P.crm);                   // lens glow
    rrect(g, 14, 14, 44, 28, 4, P.red);                // head housing
    rrect(g, 18, 28, 40, 54, 3, P.plum);               // handle
    clipTo(g, [P.plum], () => { rect(g, 18, 36, 40, 38, P.red); rect(g, 18, 44, 40, 46, P.red); }); // grip lines
    eyes(g, 28, 20, 5);
    smileArc(g, 28, 24, 2.2, 1);
    blush(g, 22, 23); blush(g, 35, 23);
  }});

  S.push({ name: 'spaghetti', draw(g) {
    ellipse(g, CX, 50, 26, 8, P.lgy);                  // plate
    ellipse(g, CX, 48, 22, 6, P.crm);
    ball(g, CX, 38, 20, 14, P.yel, P.org);             // noodle mound
    clipTo(g, [P.yel, P.org], () => { for (let i = 0; i < 5; i++) { const x = 16 + i * 8; stroke(g, [[x, 26], [x + 3, 40], [x - 2, 50]], 1, 1, P.crm); } }); // strands
    ball(g, 22, 44, 5, 5, P.red, P.plum); ball(g, 41, 45, 5, 5, P.red, P.plum); // meatballs
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.6, 1.2);
    blush(g, CX - 12, 37); blush(g, CX + 12, 37);
  }});

  S.push({ name: 'tomato', draw(g) {
    ball(g, CX, 38, 19, 17, P.red, P.plum, P.pnk);     // body
    disc(g, CX, 22, 5, P.grn);                         // calyx center
    tri(g, 20, 24, 31, 15, 31, 26, P.lim);             // leaf spikes
    tri(g, 43, 24, 32, 15, 32, 26, P.lim);
    tri(g, CX, 13, 27, 24, 36, 24, P.lim);
    stroke(g, [[CX, 16], [CX, 11]], 1.6, 1.2, P.grn);  // stem
    ellipse(g, 22, 30, 4, 3, P.pnk);                   // shine
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 45, 3, 1.3);
    blush(g, CX - 14, 42); blush(g, CX + 14, 42);
  }});

  S.push({ name: 'planet', draw(g) {           // 星球 sing1 kau4
    ellipse(g, CX, 34, 25, 6.5, P.brn);              // ring (shadow behind planet)
    ellipse(g, CX, 32, 25, 6.5, P.org);              // ring
    ball(g, CX, 31, 15, 15, P.sky, P.lav, P.crm);    // planet covers ring middle
    disc(g, 10, 15, 1.6, P.yel);                     // stars
    disc(g, 55, 21, 1.4, P.yel);
    disc(g, 52, 49, 1.4, P.yel);
    eyes(g, CX, 30, 7);
    smileArc(g, CX, 37, 3, 1.3);
    blush(g, CX - 12, 34); blush(g, CX + 12, 34);
  }});

  S.push({ name: 'trash', draw(g) {            // 垃圾桶 laap6 saap3 tung2
    rect(g, 16, 20, 47, 24, P.dgy);                  // lid rim (shadow)
    rrect(g, 15, 15, 48, 22, 2, P.lgy);              // lid
    rect(g, 29, 9, 34, 15, P.lgy);                   // lid knob
    rrect(g, 18, 22, 45, 56, 3, P.lav);              // can (shadow)
    rrect(g, 18, 22, 43, 54, 3, P.sky);              // can body
    rect(g, 21, 26, 22, 50, P.crm);                  // ridges
    rect(g, 40, 26, 41, 50, P.crm);
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.8, 1.2);
    blush(g, 22, 38); blush(g, 41, 38);
  }});

  S.push({ name: 'grandmother', draw(g) {      // 婆 po4
    disc(g, CX, 8, 4, P.lgy);                        // top bun
    ball(g, CX, 50, 10, 8, P.lav, P.navy);           // shawl dress
    tri(g, 20, 57, 43, 57, CX, 46, P.lav);           // skirt
    ball(g, 26, 58, 3.6, 2.4, P.pch, P.brn);         // feet
    ball(g, 37, 58, 3.6, 2.4, P.pch, P.brn);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);         // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 14, 13, P.pch, P.brn);           // head
    ellipse(g, CX, 15, 13, 6, P.lgy);                // grey hair cap
    ellipse(g, 19, 22, 2.5, 5, P.lgy); ellipse(g, 44, 22, 2.5, 5, P.lgy); // side hair
    ellipse(g, 26, 29, 3.6, 3, P.navy); ellipse(g, 26, 29, 2.4, 2, P.crm); // glasses L
    ellipse(g, 37, 29, 3.6, 3, P.navy); ellipse(g, 37, 29, 2.4, 2, P.crm); // glasses R
    rect(g, 30, 28, 33, 29, P.navy);                 // bridge
    disc(g, 26, 29, 1.2, P.navy); disc(g, 37, 29, 1.2, P.navy); // eyes
    smileArc(g, CX, 36, 3, 1.2);
    blush(g, CX - 11, 33); blush(g, CX + 11, 33);
  }});

  S.push({ name: 'potato', draw(g) {           // 薯 syu4
    ball(g, CX, 34, 20, 15, P.brn, P.plum, P.org);   // body
    ball(g, 16, 30, 5, 5, P.brn, P.plum);            // lumps
    ball(g, 48, 38, 5, 5, P.brn, P.plum);
    ball(g, 40, 21, 4, 4, P.brn, P.plum);
    disc(g, 20, 42, 1.4, P.plum); disc(g, 45, 30, 1.4, P.plum); disc(g, 34, 47, 1.2, P.plum); // eye spots
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 40, 3, 1.3);
    blush(g, CX - 13, 37); blush(g, CX + 13, 37);
  }});

  S.push({ name: 'toad', draw(g) {             // 蛤乸 gap3 naa2
    ball(g, CX, 42, 20, 15, P.lim, P.grn);           // squat body
    ellipse(g, CX, 47, 12, 7, P.crm);                // pale belly
    ball(g, 14, 50, 5, 3.5, P.lim, P.grn);           // webbed feet
    ball(g, 49, 50, 5, 3.5, P.lim, P.grn);
    ball(g, 21, 25, 6, 6, P.lim, P.grn);             // bulging eye bumps
    ball(g, 42, 25, 6, 6, P.lim, P.grn);
    disc(g, 21, 26, 2.6, P.navy); g.set(20, 24, P.crm);
    disc(g, 42, 26, 2.6, P.navy); g.set(41, 24, P.crm);
    disc(g, 15, 38, 1.6, P.grn); disc(g, 48, 42, 1.6, P.grn); disc(g, 24, 52, 1.4, P.grn); // warts
    smileArc(g, CX, 41, 6, 2);                        // wide grin
    blush(g, 17, 44); blush(g, 46, 44);
  }});

  S.push({ name: 'barrel', draw(g) {           // 桶 tung2
    ball(g, CX, 34, 18, 23, P.org, P.brn);           // bulging body
    ellipse(g, CX, 12, 15, 4, P.crm);                // top rim
    ellipse(g, CX, 12, 12, 3, P.brn);                // inside
    rect(g, 14, 20, 49, 24, P.dgy);                  // upper hoop
    rect(g, 13, 44, 50, 48, P.dgy);                  // lower hoop
    clipTo(g, [P.org, P.brn], function () {           // stave seams
      rect(g, 20, 14, 21, 54, P.brn); rect(g, 42, 14, 43, 54, P.brn);
    });
    eyes(g, CX, 33, 7);
    smileArc(g, CX, 40, 3, 1.3);
    blush(g, CX - 14, 37); blush(g, CX + 14, 37);
  }});

  S.push({ name: 'fork', draw(g) {             // 叉 caa1
    for (let tx = 24; tx <= 37; tx += 4) rect(g, tx, 8, tx + 2, 28, P.lgy);  // tines shadow
    for (let tx = 24; tx <= 37; tx += 4) rect(g, tx, 8, tx + 1, 27, P.crm);  // tines
    rrect(g, 23, 26, 40, 34, 3, P.crm);              // neck
    rrect(g, 25, 32, 39, 58, 6, P.lgy);              // handle (shadow)
    rrect(g, 25, 32, 37, 56, 6, P.crm);              // handle
    eyes(g, CX, 43, 6);
    smileArc(g, CX, 49, 2.6, 1.2);
    blush(g, 25, 47); blush(g, 39, 47);
  }});

  S.push({ name: 'lipstick', draw(g) {         // 口紅 hau2 hung4
    rrect(g, 23, 15, 41, 34, 5, P.plum);             // bullet (shadow)
    rrect(g, 23, 15, 39, 32, 5, P.red);              // bullet
    tri(g, 24, 22, 39, 15, 39, 26, P.pnk);           // slanted tip
    rrect(g, 20, 34, 43, 41, 1, P.lgy);              // silver band
    rrect(g, 21, 41, 43, 58, 2, P.plum);             // tube (shadow)
    rrect(g, 21, 41, 41, 56, 2, P.pnk);              // tube
    eyes(g, CX, 47, 6);
    smileArc(g, CX, 52, 2.6, 1.1);
    blush(g, 25, 50); blush(g, 38, 50);
  }});

  S.push({ name: 'dice', draw(g) {             // 骰仔 sik1 zai2
    tri(g, 14, 18, 22, 10, 56, 10, P.lgy);           // top face
    tri(g, 14, 18, 56, 10, 48, 18, P.lgy);
    rrect(g, 14, 20, 50, 56, 5, P.lgy);              // front (shadow)
    rrect(g, 14, 18, 48, 54, 5, P.crm);              // front
    disc(g, 22, 26, 2, P.navy); disc(g, 41, 26, 2, P.navy);  // corner pips
    disc(g, 22, 48, 2, P.navy); disc(g, 41, 48, 2, P.navy);
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 42, 2.6, 1.2);
    blush(g, 20, 40); blush(g, 43, 40);
  }});

  S.push({ name: 'goose', draw(g) {            // 鵝 ngo4
    ball(g, CX + 4, 46, 13, 12, P.crm, P.lgy);       // plump body
    tri(g, 40, 40, 54, 42, 48, 54, P.lgy);           // tail
    ball(g, 20, 44, 5, 7, P.crm, P.lgy);             // wing
    stroke(g, [[26, 46], [22, 32], [24, 20]], 5, 4, P.crm); // long curved neck
    ball(g, 25, 18, 8, 8, P.crm, P.lgy);             // head
    ball(g, 25, 13, 2.5, 2, P.org);                  // knob
    tri(g, 16, 17, 25, 15, 25, 21, P.org);           // bill
    ball(g, 27, 57, 2.4, 2, P.org); ball(g, 34, 57, 2.4, 2, P.org); // feet
    eyes(g, 27, 17, 4);
    smileArc(g, 23, 21, 1.4, 0.7);
    blush(g, 20, 20); blush(g, 32, 19);
  }});

  S.push({ name: 'strawberry', draw(g) {       // 草莓 cou2 mui2
    ball(g, CX, 36, 17, 16, P.red, P.plum);          // berry
    tri(g, 18, 44, 45, 44, CX, 58, P.red);           // taper to tip
    tri(g, 22, 46, 41, 46, CX, 57, P.plum);          // tip shade
    tri(g, 20, 24, 30, 24, 22, 14, P.grn);           // calyx leaves
    tri(g, 27, 22, 37, 22, CX, 12, P.lim);
    tri(g, 34, 24, 44, 24, 42, 14, P.grn);
    ball(g, CX, 22, 6, 3, P.lim, P.grn);             // leafy center
    for (const s of [[20, 32], [43, 32], [24, 46], [39, 46], [31, 52], [17, 38], [46, 38]]) disc(g, s[0], s[1], 1, P.yel); // seeds
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 41, 2.8, 1.3);
    blush(g, CX - 12, 39); blush(g, CX + 12, 39);
  }});

  S.push({ name: 'leopard', draw(g) {          // 豹 baau3
    disc(g, 21, 14, 4.5, P.yel); disc(g, 21, 14, 2.4, P.org); // ears
    disc(g, 42, 14, 4.5, P.yel); disc(g, 42, 14, 2.4, P.org);
    stroke(g, [[43, 50], [50, 47], [52, 40], [49, 35]], 2, 1.4, P.yel); // tail
    ball(g, CX, 48, 11, 8, P.yel, P.org);            // body
    ball(g, 25, 57, 4, 3, P.yel, P.org); ball(g, 38, 57, 4, 3, P.yel, P.org); // feet
    ball(g, CX, 26, 14, 12, P.yel, P.org);           // head
    clipTo(g, [P.yel, P.org], function () {           // rosette spots
      for (const s of [[18, 22], [45, 22], [16, 48], [47, 48], [22, 52], [41, 52], [19, 34], [44, 34]]) disc(g, s[0], s[1], 2, P.brn);
    });
    ball(g, CX, 31, 5.5, 4, P.crm);                  // muzzle
    ellipse(g, CX, 29.5, 1.6, 1.2, P.brn);           // nose
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 33, 2, 0.9);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

  S.push({ name: 'cowboy', draw(g) {           // 牛仔 ngau4 zai2
    ball(g, CX, 49, 10, 8, P.sky, P.lav);            // denim shirt
    ball(g, 26, 57, 4, 2.6, P.brn, P.plum);          // boots
    ball(g, 37, 57, 4, 2.6, P.brn, P.plum);
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn);         // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    tri(g, 24, 44, 39, 44, CX, 52, P.red);           // bandana
    ball(g, CX, 27, 13, 12, P.pch, P.brn);           // head
    ellipse(g, CX, 18, 12, 5, P.brn);                // hair
    ellipse(g, CX, 16, 18, 4, P.brn);                // hat brim (shadow)
    ellipse(g, CX, 14, 17, 3.5, P.org);              // hat brim
    ball(g, CX, 9, 8, 6, P.org, P.brn);              // hat crown
    rect(g, 22, 12, 41, 14, P.brn);                  // hat band
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

  S.push({ name: 'leaf', draw(g) {             // 葉 jip6
    ball(g, CX, 32, 15, 22, P.lim, P.grn);           // blade
    tri(g, 17, 20, 46, 20, CX, 6, P.lim);            // pointed tip
    tri(g, 17, 44, 46, 44, CX, 58, P.lim);           // pointed base
    rect(g, 30, 8, 33, 56, P.grn);                   // midrib
    stroke(g, [[31, 22], [20, 15]], 1, 1, P.grn); stroke(g, [[31, 26], [43, 19]], 1, 1, P.grn); // veins
    stroke(g, [[31, 44], [19, 40]], 1, 1, P.grn); stroke(g, [[31, 48], [44, 44]], 1, 1, P.grn);
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 2.8, 1.2);
    blush(g, 22, 34); blush(g, 41, 34);
  }});

  S.push({ name: 'luggage', draw(g) {          // 行李 hang4 lei5
    rrect(g, 21, 8, 42, 18, 4, P.dgy);               // handle
    ellipse(g, CX, 13, 6, 3, null);                  // handle hole
    rrect(g, 12, 16, 52, 56, 5, P.plum);             // case (shadow)
    rrect(g, 12, 16, 50, 54, 5, P.red);              // case body
    rect(g, 13, 22, 50, 24, P.plum);                 // lid seam
    rrect(g, 17, 32, 21, 42, 1, P.yel);              // latch left
    rrect(g, 43, 32, 47, 42, 1, P.yel);              // latch right
    eyes(g, CX, 37, 7);
    smileArc(g, CX, 44, 3, 1.3);
    blush(g, CX - 14, 41); blush(g, CX + 14, 41);
  }});

  S.push({ name: 'sweater', draw(g) {          // 毛衣 mou4 ji1
    tri(g, 6, 26, 20, 22, 16, 42, P.plum);           // sleeves
    tri(g, 58, 26, 44, 22, 48, 42, P.plum);
    ball(g, 12, 40, 4, 4, P.lav, P.plum); ball(g, 52, 40, 4, 4, P.lav, P.plum); // ribbed cuffs
    rrect(g, 16, 22, 47, 54, 5, P.plum);             // body (shadow)
    rrect(g, 16, 22, 45, 52, 5, P.pnk);              // knit body
    ellipse(g, CX, 23, 7, 3, P.plum);                // collar (shadow)
    ellipse(g, CX, 22, 6, 2.5, P.lav);               // ribbed collar
    rect(g, 16, 48, 45, 52, P.lav);                  // ribbed hem
    clipTo(g, [P.pnk], function () {                  // knit v-stitches
      for (let yy = 28; yy < 46; yy += 6) for (let xx = 19; xx < 44; xx += 6) { g.set(xx, yy, P.plum); g.set(xx + 2, yy, P.plum); g.set(xx + 1, yy + 1, P.plum); }
    });
    eyes(g, CX, 34, 7);
    smileArc(g, CX, 41, 2.8, 1.3);
    blush(g, 21, 38); blush(g, 42, 38);
  }});

  S.push({ name: 'cabinet', draw(g) {          // 櫃 gwai6
    rrect(g, 12, 8, 52, 58, 2, P.brn);               // carcass (shadow)
    rrect(g, 12, 8, 50, 56, 2, P.org);               // body
    rect(g, 12, 8, 50, 12, P.brn);                   // top trim
    rrect(g, 16, 16, 30, 52, 1, P.brn); rrect(g, 17, 17, 30, 50, 1, P.org); // left door
    rrect(g, 32, 16, 46, 52, 1, P.brn); rrect(g, 33, 17, 46, 50, 1, P.org); // right door
    disc(g, 28, 42, 1.6, P.yel); disc(g, 35, 42, 1.6, P.yel); // knobs
    rect(g, 20, 52, 26, 56, P.brn); rect(g, 36, 52, 42, 56, P.brn); // feet
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.6, 1.2);
    blush(g, 20, 30); blush(g, 43, 30);
  }});

  S.push({ name: 'toothbrush', draw(g) {       // 牙刷 ngaa4 caat2
    for (let x = 25; x <= 38; x += 3) rect(g, x, 6, x + 1, 12, P.lgy);  // bristles
    rrect(g, 23, 11, 40, 20, 3, P.lav);                 // brush head shadow
    rrect(g, 23, 11, 39, 19, 3, P.crm);                 // brush head
    ellipse(g, CX, 9, 4, 2.5, P.pnk);                   // toothpaste blob
    rrect(g, 27, 18, 37, 58, 4, P.lav);                 // handle shadow
    rrect(g, 27, 18, 35, 58, 4, P.sky);                 // handle
    rect(g, 29, 24, 30, 52, P.crm);                     // shine
    eyes(g, 31, 40, 6);
    smileArc(g, 31, 47, 2.6, 1.2);
    blush(g, 24, 44); blush(g, 38, 44);
  }});

  S.push({ name: 'tuna', draw(g) {             // 吞拿魚 tan1 naa4 jyu2
    tri(g, 6, 20, 6, 46, 24, 33, P.grn);                // tail fin shadow
    tri(g, 9, 23, 9, 43, 24, 33, P.lim);                // tail fin
    tri(g, 28, 8, 44, 10, 34, 20, P.lav);               // dorsal fin
    ball(g, 36, 33, 20, 14, P.sky, P.lav);              // body
    tri(g, 52, 28, 52, 39, 60, 33, P.sky);              // pointed snout
    ellipse(g, 38, 39, 15, 5, P.crm);                   // silver belly
    ellipse(g, 30, 44, 6, 3, P.lav);                    // pectoral fin
    eyes(g, 44, 30, 6);
    smileArc(g, 46, 37, 2.6, 1.1);
    blush(g, 38, 34); blush(g, 52, 33);
  }});

  S.push({ name: 'orange', draw(g) {           // 橙 caang2 — the fruit
    stroke(g, [[CX, 12], [CX, 6]], 1.4, 1.4, P.brn);    // stem
    ellipse(g, 40, 12, 5, 3, P.lim);                    // leaf
    ball(g, CX, 36, 18, 17, P.org, P.brn, P.yel);       // body
    ellipse(g, CX, 20, 2.5, 2, P.brn);                  // navel dimple
    disc(g, 22, 28, 1, P.brn); disc(g, 41, 30, 1, P.brn); disc(g, 26, 47, 1, P.brn); // pores
    eyes(g, CX, 34, 7);
    smileArc(g, CX, 42, 3, 1.3);
    blush(g, CX - 13, 39); blush(g, CX + 13, 39);
  }});

  S.push({ name: 'gorilla', draw(g) {          // 大猩猩 daai6 sing1 sing1
    ball(g, CX, 48, 18, 12, P.dgy, P.blk);              // broad body
    ball(g, 13, 44, 5, 9, P.dgy, P.blk); ball(g, 50, 44, 5, 9, P.dgy, P.blk); // long arms
    ball(g, 15, 54, 4.5, 3.5, P.dgy, P.blk); ball(g, 48, 54, 4.5, 3.5, P.dgy, P.blk); // knuckles
    ellipse(g, CX, 49, 8, 7, P.brn);                    // lighter chest
    ball(g, CX, 25, 15, 13, P.dgy, P.blk);              // head
    disc(g, 18, 22, 4, P.dgy); disc(g, 45, 22, 4, P.dgy); // ears
    ball(g, CX, 30, 11, 8, P.pch, P.brn);               // big face patch
    ellipse(g, CX, 21, 12, 4, P.dgy);                   // heavy brow ridge
    ellipse(g, 29, 31, 1.4, 1, P.brn); ellipse(g, 34, 31, 1.4, 1, P.brn); // nostrils
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 34, 2.6, 1.1);
    blush(g, 22, 32); blush(g, 41, 32);
  }});

  S.push({ name: 'moose', draw(g) {            // 駝鹿 to4 luk2 — elk/moose
    disc(g, 16, 12, 6, P.brn); disc(g, 47, 12, 6, P.brn); // palmate antlers
    tri(g, 8, 14, 20, 14, 10, 4, P.brn); tri(g, 12, 14, 24, 14, 22, 5, P.brn);
    tri(g, 44, 14, 56, 14, 54, 4, P.brn); tri(g, 40, 14, 52, 14, 42, 5, P.brn);
    ball(g, CX, 48, 12, 9, P.brn, P.plum);              // body
    ball(g, 24, 58, 3.6, 3, P.brn, P.plum); ball(g, 39, 58, 3.6, 3, P.brn, P.plum); // legs
    ball(g, CX, 27, 12, 13, P.brn, P.plum);             // long head
    ball(g, CX, 38, 7, 5.5, P.dgy, P.plum);             // big snout
    ellipse(g, 29, 38, 1.3, 1, P.plum); ellipse(g, 34, 38, 1.3, 1, P.plum); // nostrils
    disc(g, 30, 44, 2.5, P.plum);                       // dewlap
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 40, 2.4, 1);
    blush(g, 20, 31); blush(g, 43, 31);
  }});

  S.push({ name: 'peanuts', draw(g) {          // 花生 faa1 sang1
    ball(g, CX, 21, 12, 11, P.pch, P.brn);              // top lobe
    ball(g, CX, 43, 14, 14, P.pch, P.brn);              // bottom lobe
    clipTo(g, [P.pch, P.brn], function () {             // netted shell texture
      for (let yy = 12; yy < 56; yy += 5) for (let xx = 20; xx < 44; xx += 5) disc(g, xx + ((yy / 5) % 2) * 2, yy, 0.7, P.brn);
    });
    eyes(g, CX, 42, 7);
    smileArc(g, CX, 50, 3, 1.2);
    blush(g, 18, 46); blush(g, 45, 46);
  }});

  S.push({ name: 'cracker', draw(g) {          // 梳打餅 so1 daa2 beng2
    rrect(g, 12, 14, 52, 54, 4, P.brn);                 // edge shadow
    rrect(g, 12, 14, 50, 52, 4, P.org);                 // biscuit
    rrect(g, 15, 17, 47, 49, 3, P.yel);                 // baked top
    for (let yy = 20; yy <= 46; yy += 6.5) { disc(g, 18, yy, 1, P.brn); disc(g, 45, yy, 1, P.brn); }
    for (let xx = 24; xx <= 39; xx += 5) { disc(g, xx, 19, 1, P.brn); disc(g, xx, 47, 1, P.brn); }
    eyes(g, CX, 30, 7);
    smileArc(g, CX, 38, 3, 1.3);
    blush(g, 18, 35); blush(g, 45, 35);
  }});

  S.push({ name: 'brick', draw(g) {            // 磚 zyun1
    rrect(g, 8, 22, 56, 48, 3, P.plum);                 // shadow
    rrect(g, 8, 22, 54, 46, 3, P.red);                  // brick body
    rect(g, 10, 24, 52, 27, P.pnk);                     // lit top face
    rect(g, 26, 24, 28, 46, P.plum);                    // mortar seam
    eyes(g, CX, 34, 7);
    smileArc(g, CX, 41, 3, 1.3);
    blush(g, 16, 38); blush(g, 47, 38);
  }});

  S.push({ name: 'olive', draw(g) {            // 欖 laam5
    stroke(g, [[31, 14], [34, 8]], 1.2, 1.2, P.brn);    // stem
    ellipse(g, 40, 12, 5, 3, P.lim);                    // leaf
    ball(g, CX, 36, 15, 18, P.grn, P.plum);             // olive body
    ellipse(g, 24, 26, 3, 5, P.lim);                    // highlight
    ellipse(g, CX, 22, 3, 2.5, P.red);                  // pimento
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 43, 2.8, 1.2);
    blush(g, 20, 40); blush(g, 43, 40);
  }});

  S.push({ name: 'deer', draw(g) {             // 鹿 luk6
    stroke(g, [[24, 12], [20, 4]], 1.2, 1, P.brn); stroke(g, [[22, 8], [16, 6]], 1, 1, P.brn); // antlers
    stroke(g, [[39, 12], [43, 4]], 1.2, 1, P.brn); stroke(g, [[41, 8], [47, 6]], 1, 1, P.brn);
    ellipse(g, 20, 18, 2.6, 5, P.pch); ellipse(g, 43, 18, 2.6, 5, P.pch); // ears
    ball(g, CX, 48, 11, 9, P.brn, P.plum);              // body
    clipTo(g, [P.brn], function () { disc(g, 27, 46, 1.4, P.pch); disc(g, 36, 49, 1.4, P.pch); disc(g, 31, 52, 1.4, P.pch); }); // spots
    ball(g, 24, 58, 3.4, 3, P.brn, P.plum); ball(g, 39, 58, 3.4, 3, P.brn, P.plum); // legs
    ball(g, CX, 28, 11, 11, P.brn, P.plum);             // head
    ball(g, CX, 34, 6, 4.5, P.pch, P.brn);              // muzzle
    ellipse(g, CX, 32, 1.6, 1.2, P.navy);               // nose
    eyes(g, CX, 27, 7);
    smileArc(g, CX, 35, 2.2, 1);
    blush(g, 20, 32); blush(g, 43, 32);
  }});

  S.push({ name: 'queen', draw(g) {            // 后 hau6 — empress/queen
    ball(g, CX, 30, 17, 16, P.brn, P.plum);             // hair
    tri(g, 15, 57, 48, 57, CX, 38, P.plum);             // gown
    tri(g, 15, 57, 33, 57, CX, 42, P.pnk);              // gown highlight
    ball(g, CX, 42, 7, 6, P.plum, P.navy);              // bodice
    ball(g, 24, 47, 3, 3, P.pch, P.brn); ball(g, 39, 47, 3, 3, P.pch, P.brn); // hands
    ball(g, CX, 26, 12, 12, P.pch);                     // face
    ellipse(g, CX, 16, 12, 6, P.brn);                   // fringe
    rect(g, 22, 8, 41, 13, P.yel);                      // crown band
    tri(g, 22, 10, 27, 10, 24, 3, P.yel); tri(g, 29, 10, 34, 10, CX, 2, P.yel); tri(g, 36, 10, 41, 10, 39, 3, P.yel); // points
    disc(g, 24, 3, 1.4, P.red); disc(g, CX, 2, 1.4, P.red); disc(g, 39, 3, 1.4, P.red); // jewels
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 3, 1.4);
    blush(g, 21, 31); blush(g, 42, 31);
  }});

  S.push({ name: 'trophy', draw(g) {           // 獎杯 zoeng2 bui1
    stroke(g, [[18, 20], [12, 28], [18, 36]], 2, 2, P.brn); // handles
    stroke(g, [[45, 20], [51, 28], [45, 36]], 2, 2, P.brn);
    ball(g, CX, 26, 16, 14, P.yel, P.org);              // cup bowl
    ellipse(g, CX, 16, 14, 4, P.org);                   // rim
    rect(g, 28, 40, 35, 48, P.org);                     // stem
    rrect(g, 22, 48, 41, 54, 2, P.brn);                 // base
    rect(g, 25, 54, 38, 58, P.dgy);                     // plinth
    eyes(g, CX, 24, 7);
    smileArc(g, CX, 31, 3, 1.3);
    blush(g, 18, 28); blush(g, 45, 28);
  }});

  S.push({ name: 'bride', draw(g) {            // 新娘 san1 noeng4
    ellipse(g, CX, 40, 20, 20, P.lgy);                  // veil behind
    ball(g, CX, 30, 15, 15, P.brn, P.plum);             // hair
    tri(g, 14, 57, 49, 57, CX, 36, P.crm);              // white gown
    tri(g, 14, 57, 32, 57, CX, 40, P.lgy);              // gown shadow
    ball(g, CX, 42, 7, 6, P.crm, P.lgy);                // bodice
    ball(g, 24, 48, 3, 3, P.pch, P.brn); ball(g, 39, 48, 3, 3, P.pch, P.brn); // hands
    disc(g, CX, 50, 4, P.grn); disc(g, 29, 49, 2, P.pnk); disc(g, 34, 49, 2, P.red); disc(g, CX, 47, 2, P.yel); // bouquet
    ball(g, CX, 26, 12, 12, P.pch);                     // face
    ellipse(g, CX, 16, 11, 5, P.brn);                   // fringe
    ellipse(g, CX, 10, 13, 4, P.crm);                   // veil band
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 3, 1.4);
    blush(g, 22, 31); blush(g, 41, 31);
  }});

  S.push({ name: 'briefcase', draw(g) {        // 公事包 gung1 si6 baau1
    stroke(g, [[26, 20], [26, 14], [38, 14], [38, 20]], 1.6, 1.6, P.brn); // handle
    rrect(g, 12, 20, 52, 52, 3, P.plum);                // case shadow
    rrect(g, 12, 20, 50, 50, 3, P.brn);                 // case body
    rect(g, 12, 33, 50, 36, P.plum);                    // lid seam
    rrect(g, 26, 30, 38, 38, 1, P.yel);                 // clasp
    disc(g, 20, 34, 1.4, P.yel); disc(g, 44, 34, 1.4, P.yel); // latches
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 47, 2.8, 1.2);
    blush(g, 20, 45); blush(g, 44, 45);
  }});

  S.push({ name: 'sausage', draw(g) {          // 香腸 hoeng1 coeng2
    stroke(g, [[16, 40], [18, 24], [CX, 18], [45, 24], [47, 40]], 8, 8, P.plum); // shadow arc
    stroke(g, [[16, 38], [18, 24], [CX, 18], [45, 24], [47, 38]], 7, 7, P.red);  // sausage arc
    ball(g, 15, 42, 3, 3, P.brn, P.plum); ball(g, 48, 42, 3, 3, P.brn, P.plum);  // twisted ends
    ellipse(g, 24, 22, 5, 3, P.pnk);                    // sheen
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.8, 1.2);
    blush(g, 22, 30); blush(g, 42, 30);
  }});

  S.push({ name: 'wheelchair', draw(g) {       // 輪椅 leon4 ji2
    stroke(g, [[40, 14], [44, 18]], 1.4, 1.4, P.dgy);   // push handle
    rrect(g, 18, 16, 42, 42, 3, P.lav);                 // seat back shadow
    rrect(g, 18, 16, 40, 40, 3, P.sky);                 // seat back (face panel)
    rect(g, 18, 40, 48, 46, P.lav);                     // seat cushion
    disc(g, 30, 50, 13, P.dgy);                         // big wheel tire
    disc(g, 30, 50, 9, P.lgy);
    for (let a = 0; a < 8; a++) { const th = a / 8 * 6.283; stroke(g, [[30, 50], [30 + Math.cos(th) * 9, 50 + Math.sin(th) * 9]], 0.6, 0.6, P.dgy); } // spokes
    disc(g, 30, 50, 2.5, P.dgy);                        // hub
    disc(g, 48, 52, 3.5, P.dgy);                        // front caster
    eyes(g, 29, 26, 6);
    smileArc(g, 29, 32, 2.8, 1.2);
    blush(g, 21, 30); blush(g, 38, 30);
  }});

  S.push({ name: 'hose', draw(g) {             // 水喉 seoi2 hau4
    for (let r = 16; r >= 6; r -= 5) { for (let a = 0; a < 22; a++) { const th = a / 22 * 6.283; disc(g, 28 + Math.cos(th) * r, 40 + Math.sin(th) * r, 1.8, P.grn); } } // coil
    ball(g, 28, 40, 6, 6, P.lim, P.grn);                // coil centre
    stroke(g, [[40, 19], [30, 26]], 2.4, 2.4, P.grn);   // tube up to nozzle
    rect(g, 40, 16, 50, 22, P.dgy); rect(g, 48, 17, 54, 21, P.lgy); // nozzle
    disc(g, 56, 16, 1.6, P.sky); disc(g, 58, 20, 1.4, P.sky); disc(g, 55, 22, 1.2, P.sky); // water drops
    eyes(g, 28, 38, 6);
    smileArc(g, 28, 44, 2.8, 1.2);
    blush(g, 20, 42); blush(g, 36, 42);
  }});

  S.push({ name: 'ginger', draw(g) {           // 薑 goeng1
    ball(g, 30, 40, 15, 13, P.pch, P.brn);              // main root
    ball(g, 16, 34, 6, 6, P.pch, P.brn);                // knob
    ball(g, 46, 44, 7, 6, P.pch, P.brn);                // knob
    ball(g, 40, 24, 6, 7, P.pch, P.brn);                // finger
    ball(g, 22, 52, 5, 4, P.pch, P.brn);                // knob
    stroke(g, [[40, 20], [42, 12]], 1.4, 1, P.lim);     // sprout
    clipTo(g, [P.pch, P.brn], function () { stroke(g, [[20, 44], [42, 44]], 0.6, 0.6, P.brn); stroke(g, [[22, 36], [40, 36]], 0.6, 0.6, P.brn); }); // ridges
    eyes(g, 30, 38, 6);
    smileArc(g, 30, 44, 2.8, 1.2);
    blush(g, 20, 42); blush(g, 40, 42);
  }});

  S.push({ name: 'skirt', draw(g) {            // 裙 kwan4 — skirt (waistband + A-line flare)
    rrect(g, 20, 18, 43, 26, 2, P.plum);                // waistband
    tri(g, 10, 54, 53, 54, CX, 24, P.pnk);              // flared skirt
    tri(g, 10, 54, CX, 54, CX, 30, P.plum);             // shadow
    rect(g, 10, 51, 53, 54, P.plum);                    // hem
    stroke(g, [[26, 28], [22, 52]], 0.6, 0.6, P.plum); stroke(g, [[37, 28], [41, 52]], 0.6, 0.6, P.plum); // pleats
    disc(g, CX, 22, 1.4, P.yel);                        // button
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 3, 1.3);
    blush(g, 22, 41); blush(g, 41, 41);
  }});

  S.push({ name: 'razor', draw(g) {              // 鬚刨 sou1 paau2
    rrect(g, 28, 30, 35, 58, 3, P.lav);              // handle shadow
    rrect(g, 28, 30, 33, 56, 3, P.sky);              // handle
    rect(g, 29, 34, 30, 52, P.crm);                  // handle shine
    rrect(g, 15, 15, 48, 31, 4, P.lav);              // head shadow
    rrect(g, 15, 15, 46, 29, 4, P.lgy);              // razor head
    rect(g, 16, 26, 45, 29, P.crm);                  // safety comb bar
    for (let x = 18; x <= 44; x += 3) g.set(x, 28, P.lav); // comb teeth
    eyes(g, CX, 20, 6);
    smileArc(g, CX, 25, 2.6, 1.1);
    blush(g, 20, 23); blush(g, 43, 23);
  }});

  S.push({ name: 'elk', draw(g) {                // 駝鹿 to4 luk2
    stroke(g, [[24, 14], [20, 8], [14, 6]], 1.6, 1.2, P.brn); // left antler
    stroke(g, [[20, 8], [18, 3]], 1.4, 1, P.brn);
    stroke(g, [[24, 14], [26, 7], [24, 3]], 1.4, 1, P.brn);
    stroke(g, [[39, 14], [43, 8], [49, 6]], 1.6, 1.2, P.brn); // right antler
    stroke(g, [[43, 8], [45, 3]], 1.4, 1, P.brn);
    stroke(g, [[39, 14], [37, 7], [39, 3]], 1.4, 1, P.brn);
    ellipse(g, 16, 22, 3.4, 4.5, P.brn); ellipse(g, 47, 22, 3.4, 4.5, P.brn); // ears
    ball(g, CX, 48, 11, 9, P.brn, P.plum);           // body
    ball(g, 25, 57, 3.6, 3, P.brn, P.plum); ball(g, 38, 57, 3.6, 3, P.brn, P.plum); // legs
    ball(g, CX, 26, 13, 12, P.brn, P.plum);          // head
    ball(g, CX, 33, 6.5, 5, P.pch);                  // long muzzle
    ellipse(g, CX, 31, 2, 1.4, P.navy);              // nose
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 35, 2.4, 1);
    blush(g, CX - 11, 31); blush(g, CX + 11, 31);
  }});

  S.push({ name: 'bathtub', draw(g) {            // 浴缸 juk6 gong1
    rrect(g, 9, 22, 13, 30, 1, P.yel);               // faucet
    stroke(g, [[11, 22], [11, 18], [16, 18]], 1.4, 1.1, P.yel); // spout
    ball(g, CX, 40, 22, 13, P.lgy, P.lav);           // tub
    ellipse(g, CX, 34, 19, 6, P.crm);                // rim
    ellipse(g, CX, 35, 16, 4.5, P.sky);              // water
    disc(g, 24, 31, 3, P.crm); disc(g, 40, 30, 2.4, P.crm); disc(g, 31, 28, 1.8, P.crm); // bubbles
    ball(g, 15, 54, 3, 3, P.lgy, P.lav); ball(g, 48, 54, 3, 3, P.lgy, P.lav); // clawfeet
    eyes(g, CX, 43, 7);
    smileArc(g, CX, 49, 2.8, 1.2);
    blush(g, CX - 14, 46); blush(g, CX + 14, 46);
  }});

  S.push({ name: 'shorts', draw(g) {             // 短褲 dyun2 fu3
    rrect(g, 15, 20, 48, 46, 6, P.brn);              // shadow
    rrect(g, 15, 20, 46, 44, 6, P.org);              // shorts body
    rect(g, 15, 20, 48, 26, P.brn);                  // waistband
    g.set(24, 23, P.crm); g.set(38, 23, P.crm);      // studs
    rect(g, 28, 34, 35, 46, null);                   // leg gap
    eyes(g, CX, 31, 7);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 12, 34); blush(g, CX + 12, 34);
  }});

  S.push({ name: 'mailbox', draw(g) {            // 郵筒 jau4 tung2
    ball(g, CX, 14, 12, 6, P.red, P.plum);           // dome top
    rrect(g, 20, 16, 44, 56, 3, P.plum);             // post shadow
    rrect(g, 20, 16, 42, 54, 3, P.red);              // post body
    rect(g, 23, 22, 40, 25, P.navy);                 // mail slot
    ellipse(g, 24, 36, 2, 8, P.pnk);                 // side highlight
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 44, 2.8, 1.2);
    blush(g, CX - 13, 41); blush(g, CX + 13, 41);
  }});

  S.push({ name: 'owl', draw(g) {                // 夜梟 je6 hiu1
    tri(g, 18, 15, 27, 15, 20, 4, P.brn);            // ear tufts
    tri(g, 36, 15, 45, 15, 43, 4, P.brn);
    ball(g, CX, 33, 17, 19, P.brn, P.plum);          // rounded body+head
    ellipse(g, 17, 34, 5, 10, P.plum); ellipse(g, 46, 34, 5, 10, P.plum); // wings
    ellipse(g, CX, 40, 9, 9, P.pch);                 // belly
    disc(g, 24, 25, 6.5, P.crm); disc(g, 39, 25, 6.5, P.crm); // big eyes
    disc(g, 24, 25, 3.6, P.navy); disc(g, 39, 25, 3.6, P.navy);
    g.set(22, 23, P.crm); g.set(37, 23, P.crm);      // sparkles
    tri(g, 28, 30, 35, 30, CX, 27, P.org);           // beak up (happy)
    tri(g, 28, 31, 35, 31, CX, 35, P.org);
    ball(g, 25, 55, 3, 2, P.org); ball(g, 38, 55, 3, 2, P.org); // feet
    blush(g, 18, 32); blush(g, 45, 32);
  }});

  S.push({ name: 'peach', draw(g) {              // 桃 tou4
    stroke(g, [[CX, 14], [30, 8]], 1.4, 1.2, P.brn); // stem
    ellipse(g, 40, 12, 6, 3.4, P.lim);               // leaf
    ball(g, 24, 36, 13, 14, P.pch, P.org);           // left lobe
    ball(g, 40, 36, 13, 14, P.pch, P.org);           // right lobe
    ball(g, CX, 40, 15, 15, P.pch, P.org, P.crm);    // body
    stroke(g, [[CX, 26], [CX, 52]], 1, 0.8, P.org);  // cleft
    ellipse(g, 22, 28, 4, 3, P.crm);                 // highlight
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 46, 3, 1.3);
    blush(g, CX - 13, 43); blush(g, CX + 13, 43);
  }});

  S.push({ name: 'bicycle', draw(g) {            // 單車 daan1 ce1
    disc(g, 16, 42, 11, P.navy); disc(g, 16, 42, 9, P.dgy); disc(g, 16, 42, 3, P.lgy); // rear wheel
    disc(g, 47, 42, 11, P.navy); disc(g, 47, 42, 9, P.dgy); disc(g, 47, 42, 3, P.lgy); // front wheel
    stroke(g, [[16, 42], [30, 42], [24, 26], [16, 42]], 1.6, 1.6, P.red); // rear triangle
    stroke(g, [[30, 42], [42, 26], [47, 42]], 1.6, 1.6, P.red); // front fork
    stroke(g, [[24, 26], [42, 26]], 1.4, 1.4, P.red); // top tube
    rrect(g, 20, 22, 28, 25, 1, P.brn);              // seat
    stroke(g, [[42, 26], [44, 20], [49, 20]], 1.4, 1.2, P.brn); // handlebar
    eyes(g, 31, 33, 4);
    smileArc(g, 31, 37, 2, 1);
    blush(g, 26, 36); blush(g, 37, 36);
  }});

  S.push({ name: 'butterfly', draw(g) {          // 蝶 dip6
    ball(g, 18, 24, 12, 11, P.sky, P.lav);           // upper left wing
    ball(g, 45, 24, 12, 11, P.sky, P.lav);           // upper right
    ball(g, 20, 44, 9, 9, P.pnk, P.plum);            // lower left
    ball(g, 43, 44, 9, 9, P.pnk, P.plum);            // lower right
    disc(g, 16, 22, 3, P.crm); disc(g, 47, 22, 3, P.crm); // wing spots
    disc(g, 20, 45, 2.4, P.crm); disc(g, 43, 45, 2.4, P.crm);
    stroke(g, [[26, 12], [22, 6]], 1, 0.8, P.navy); stroke(g, [[37, 12], [41, 6]], 1, 0.8, P.navy); // antennae
    disc(g, 22, 6, 1.6, P.navy); disc(g, 41, 6, 1.6, P.navy);
    ball(g, CX, 32, 4, 15, P.brn, P.plum);           // body
    eyes(g, CX, 22, 4);
    smileArc(g, CX, 27, 1.8, 0.9);
    blush(g, 27, 25); blush(g, 36, 25);
  }});

  S.push({ name: 'grape', draw(g) {              // 葡萄 pou4 tou4
    stroke(g, [[CX, 14], [34, 8]], 1.4, 1.2, P.brn); // stem
    ellipse(g, 40, 11, 6, 3.4, P.lim);               // leaf
    const bunch = [[24,22],[31.5,22],[39,22],[20,30],[27.5,30],[35,30],[43,30],
                   [24,38],[31.5,38],[39,38],[27.5,46],[35,46],[31.5,53]];
    for (const p of bunch) ball(g, p[0], p[1], 6, 6, P.lav, P.plum);
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 41, 2.8, 1.2);
    blush(g, 20, 39); blush(g, 43, 39);
  }});

  S.push({ name: 'violin', draw(g) {             // 小提琴 siu2 tai4 kam4
    rect(g, 29, 5, 34, 20, P.plum);                  // neck shadow
    rect(g, 30, 5, 33, 20, P.dgy);                   // fingerboard
    disc(g, CX, 5, 4, P.brn);                        // scroll
    g.set(30, 7, P.brn); g.set(33, 7, P.brn);        // pegs
    ball(g, CX, 25, 11, 11, P.brn, P.plum, P.org);   // upper bout
    ball(g, CX, 43, 15, 16, P.brn, P.plum, P.org);   // lower bout
    ellipse(g, 18, 34, 2.6, 4, null); ellipse(g, 45, 34, 2.6, 4, null); // waist cuts
    rect(g, 27, 46, 28, 54, P.navy); rect(g, 35, 46, 36, 54, P.navy); // f-holes
    eyes(g, CX, 41, 6);
    smileArc(g, CX, 48, 2.6, 1.2);
    blush(g, 19, 45); blush(g, 44, 45);
  }});

  S.push({ name: 'lobster', draw(g) {            // 龍蝦 lung4 haa1
    ball(g, 12, 30, 6, 8, P.red, P.plum);            // left claw
    ball(g, 8, 23, 4, 3.4, P.red, P.plum);           // left pincer nub
    ellipse(g, 9, 30, 1.6, 3, null);                 // left pincer gap
    ball(g, 51, 30, 6, 8, P.red, P.plum);            // right claw
    ball(g, 55, 23, 4, 3.4, P.red, P.plum);          // right pincer nub
    ellipse(g, 54, 30, 1.6, 3, null);                // right pincer gap
    stroke(g, [[18, 33], [24, 31]], 1.4, 1.2, P.red); // arms
    stroke(g, [[45, 33], [39, 31]], 1.4, 1.2, P.red);
    ball(g, CX, 30, 11, 12, P.red, P.plum, P.pnk);   // head/thorax
    ball(g, CX, 44, 8, 5, P.red, P.plum);            // tail seg1
    ball(g, CX, 51, 6.5, 4.5, P.red, P.plum);        // tail seg2
    tri(g, 24, 54, 39, 54, CX, 61, P.red);           // tail fan
    stroke(g, [[28, 16], [26, 8]], 1, 0.8, P.red); stroke(g, [[35, 16], [37, 8]], 1, 0.8, P.red); // antennae
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.6, 1.2);
    blush(g, CX - 9, 32); blush(g, CX + 9, 32);
  }});

  S.push({ name: 'vase', draw(g) {               // 花樽 faa1 zeon1
    disc(g, 24, 12, 4, P.red); disc(g, 39, 12, 4, P.yel); disc(g, CX, 8, 4, P.pnk); // blooms
    stroke(g, [[24, 16], [26, 26]], 1, 1, P.grn); stroke(g, [[39, 16], [37, 26]], 1, 1, P.grn);
    stroke(g, [[CX, 12], [CX, 26]], 1, 1, P.grn);    // stems
    ellipse(g, CX, 26, 10, 4, P.lav);                // vase mouth
    ball(g, CX, 30, 8, 5, P.sky, P.lav);             // neck
    ball(g, CX, 46, 15, 13, P.sky, P.lav, P.crm);    // belly
    ellipse(g, 24, 40, 3, 6, P.crm);                 // highlight
    eyes(g, CX, 46, 7);
    smileArc(g, CX, 52, 2.8, 1.2);
    blush(g, CX - 13, 49); blush(g, CX + 13, 49);
  }});

  S.push({ name: 'carrot', draw(g) {
    ellipse(g, 23, 13, 3, 9, P.grn); ellipse(g, 40, 13, 3, 9, P.grn); // fronds
    ellipse(g, CX, 10, 3.5, 10, P.lim);
    tri(g, 16, 26, 47, 26, CX, 60, P.brn);            // root shadow
    tri(g, 17, 27, 45, 27, CX, 56, P.org);            // root
    ball(g, CX, 27, 14, 5, P.org, P.brn);             // rounded shoulder
    clipTo(g, [P.org], () => { rect(g, 24, 36, 26, 37, P.brn); rect(g, 35, 40, 37, 41, P.brn); rect(g, 28, 46, 30, 47, P.brn); });
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 39, 2.6, 1.2);
    blush(g, CX - 11, 36); blush(g, CX + 11, 36);
  }});

  S.push({ name: 'sofa', draw(g) {
    rrect(g, 8, 30, 56, 52, 5, P.plum);               // body shadow
    rrect(g, 8, 30, 54, 50, 5, P.pnk);                // body
    ball(g, 13, 40, 6, 9, P.plum);                    // left arm
    ball(g, 51, 40, 6, 9, P.plum);                    // right arm
    rrect(g, 18, 34, 45, 46, 3, P.red);               // seat cushion
    rect(g, 18, 40, 45, 41, P.plum);                  // cushion seam
    rect(g, 14, 52, 20, 56, P.brn); rect(g, 44, 52, 50, 56, P.brn); // legs
    eyes(g, CX, 37, 6);
    smileArc(g, CX, 43, 2.6, 1.2);
    blush(g, 21, 41); blush(g, 42, 41);
  }});

  S.push({ name: 'tractor', draw(g) {
    disc(g, 44, 48, 12, P.dgy); disc(g, 44, 48, 6, P.lgy); disc(g, 44, 48, 2, P.dgy); // big rear wheel
    disc(g, 17, 52, 7, P.dgy); disc(g, 17, 52, 3, P.lgy); // small front wheel
    rrect(g, 12, 30, 40, 48, 3, P.grn);               // body
    rrect(g, 30, 20, 46, 38, 3, P.lim);               // cab
    rect(g, 33, 23, 43, 31, P.sky);                   // window
    rect(g, 18, 20, 22, 30, P.dgy);                   // exhaust stack
    ball(g, 20, 15, 3, 2.4, P.lgy, P.lav);            // puff
    eyes(g, 22, 36, 5);
    smileArc(g, 22, 41, 2.2, 1);
    blush(g, 16, 39); blush(g, 28, 39);
  }});

  S.push({ name: 'camel', draw(g) {
    stroke(g, [[15,45],[8,39],[7,33]], 1.8,1.2,P.brn); // tail
    disc(g,7,32,2.5,P.brn);
    ball(g, 21,33, 8,12,P.org,P.brn);                  // two humps
    ball(g, 34,31, 8,13,P.org,P.brn);
    stroke(g, [[27,31],[28,38],[30,32]], 1.2,1.2,P.brn);
    ball(g, 29,46, 18,9,P.org,P.brn);                  // horizontal body
    for (const x of [18,28,39,46]) ball(g,x,56,3.5,4,P.org,P.brn);
    stroke(g, [[41,44],[47,37],[46,28],[49,21]], 6,4.5,P.navy); // curved neck
    stroke(g, [[41,44],[47,37],[46,28],[49,21]], 4.8,3.5,P.org);
    ellipse(g, 44,13, 3.5,4.5,P.org); ellipse(g, 55,13, 3.5,4.5,P.org); // rounded ears
    ellipse(g, 44,13, 1.8,2.6,P.pch); ellipse(g, 55,13, 1.8,2.6,P.pch);
    ball(g, 50,21, 10,9,P.org,P.brn);                   // wide three-quarter head
    ball(g, 57,25, 5.5,4.5,P.pch,P.brn);                // soft projecting muzzle
    disc(g, 59,24,1,P.navy);
    eyes(g, 48,22,5.8);
    smileArc(g, 55,29,2.8,1.3);
    blush(g, 41,26); blush(g, 57,28);
  }});

  S.push({ name: 'garlic', draw(g) {
    stroke(g, [[CX, 22], [29, 10]], 1.4, 1.2, P.lim); // sprout
    ellipse(g, 33, 9, 3, 5, P.lim);
    ball(g, CX, 40, 17, 18, P.crm, P.lgy);            // bulb
    ball(g, 23, 42, 6, 14, P.crm, P.lgy);             // left clove
    ball(g, 40, 42, 6, 14, P.crm, P.lgy);             // right clove
    ellipse(g, CX, 42, 5, 15, P.crm);                 // center clove
    clipTo(g, [P.crm], () => { rect(g, 24, 30, 25, 54, P.lgy); rect(g, 38, 30, 39, 54, P.lgy); });
    rect(g, 30, 24, 33, 28, P.lgy);                   // neck wrap
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 45, 2.6, 1.2);
    blush(g, CX - 12, 42); blush(g, CX + 12, 42);
  }});

  S.push({ name: 'sushi', draw(g) {
    ball(g, CX, 46, 20, 11, P.crm, P.lgy);            // rice
    ball(g, CX, 30, 19, 9, P.org, P.red);             // salmon
    clipTo(g, [P.org, P.red], () => { rect(g, 18, 28, 45, 29, P.pch); rect(g, 18, 33, 45, 34, P.pch); }); // fatty marbling
    rect(g, 22, 37, 41, 41, P.dgy);                   // nori seaweed strap
    rect(g, 22, 37, 41, 38, P.lgy);
    eyes(g, CX, 47, 6);
    smileArc(g, CX, 52, 2.6, 1.1);
    blush(g, 20, 50); blush(g, 43, 50);
  }});

  S.push({ name: 'locker', draw(g) {
    rrect(g, 16, 8, 48, 58, 2, P.lav);                // door shadow
    rrect(g, 16, 8, 46, 56, 2, P.sky);                // door
    rect(g, 20, 12, 43, 13, P.lgy); rect(g, 22, 15, 41, 16, P.lgy); rect(g, 24, 18, 39, 19, P.lgy); // vents
    rrect(g, 40, 34, 44, 44, 1, P.lgy);               // handle
    rect(g, 17, 30, 47, 31, P.lav);                   // panel seam
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.2);
    blush(g, 23, 44); blush(g, 37, 44);
  }});

  S.push({ name: 'drawers', draw(g) {
    rrect(g, 12, 12, 52, 58, 2, P.brn);               // cabinet shadow
    rrect(g, 12, 12, 50, 56, 2, P.org);               // cabinet
    rrect(g, 15, 16, 47, 27, 1, P.brn);               // drawer 1
    rrect(g, 15, 42, 47, 53, 1, P.brn);               // drawer 3
    rrect(g, 15, 29, 47, 40, 1, P.brn);               // drawer 2
    disc(g, 22, 21, 1.6, P.yel); disc(g, 40, 21, 1.6, P.yel); // knobs 1
    disc(g, 22, 47, 1.6, P.yel); disc(g, 40, 47, 1.6, P.yel); // knobs 3
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 38, 2.4, 1);
    blush(g, 21, 36); blush(g, 42, 36);
  }});

  S.push({ name: 'shrimp', draw(g) {
    stroke(g, [[42, 20], [50, 10]], 1, 1, P.red); stroke(g, [[46, 20], [54, 14]], 1, 1, P.red); // antennae
    ball(g, 24, 30, 11, 10, P.pnk, P.red);            // head segment
    ball(g, 34, 40, 9, 9, P.pnk, P.red);
    ball(g, 40, 50, 7, 7, P.pnk, P.red);
    ball(g, 32, 56, 5, 5, P.pnk, P.red);              // curl to tail
    tri(g, 20, 56, 32, 58, 24, 49, P.red);            // tail fan
    tri(g, 16, 53, 28, 58, 21, 47, P.pnk);
    clipTo(g, [P.pnk], () => { rect(g, 30, 36, 42, 37, P.red); rect(g, 36, 46, 44, 47, P.red); }); // segments
    eyes(g, 23, 29, 6);
    smileArc(g, 23, 35, 2.4, 1);
    blush(g, 15, 33); blush(g, 31, 33);
  }});

  S.push({ name: 'rocket', draw(g) {
    tri(g, 16, 44, 24, 56, 10, 56, P.grn); tri(g, 48, 44, 40, 56, 54, 56, P.grn); // fins
    tri(g, 20, 20, 43, 20, CX, 4, P.red);             // nose cone
    rrect(g, 20, 20, 43, 54, 4, P.lgy);               // body shadow
    rrect(g, 20, 20, 41, 52, 4, P.crm);               // body
    disc(g, CX, 30, 5, P.sky);                        // porthole
    disc(g, CX, 30, 3.5, P.lav);
    ball(g, CX, 60, 6, 4, P.org, P.red);              // flame
    ball(g, CX, 60, 3, 2, P.yel);
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 47, 2.6, 1.1);
    blush(g, 24, 45); blush(g, 39, 45);
  }});

  S.push({ name: 'doughnut', draw(g) {
    ball(g, CX, 36, 22, 20, P.org, P.brn);            // dough
    ellipse(g, CX, 32, 21, 15, P.pnk);                // icing
    ellipse(g, CX, 30, 12, 6, P.red);                 // drip
    ellipse(g, CX, 38, 9, 8, null);                   // hole
    g.set(20, 26, P.sky); g.set(26, 24, P.yel); g.set(40, 25, P.lim); g.set(44, 30, P.sky); g.set(18, 34, P.yel); g.set(46, 36, P.lim); // sprinkles
    eyes(g, CX, 49, 5);
    smileArc(g, CX, 53, 2.4, 1);
    blush(g, 19, 51); blush(g, 44, 51);
  }});

  S.push({ name: 'wheat', draw(g) {
    rect(g, 30, 38, 33, 60, P.grn);                   // stalk
    ellipse(g, 24, 46, 6, 2.5, P.lim); ellipse(g, 41, 52, 6, 2.5, P.lim); // leaves
    for (let i = 0; i < 5; i++) stroke(g, [[CX, 12], [21 + i * 5, 1]], 0.8, 0.4, P.yel); // awns fan
    ball(g, CX, 26, 8, 16, P.yel, P.org);             // grain head (tall)
    clipTo(g, [P.yel, P.org], () => {                 // kernel rows
      for (let i = 0; i < 3; i++) { ellipse(g, 26, 14 + i * 6, 2.5, 2.5, P.org); ellipse(g, 37, 14 + i * 6, 2.5, 2.5, P.org); ellipse(g, CX, 17 + i * 6, 2, 2, P.org); }
    });
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 35, 2.2, 1);
    blush(g, 24, 33); blush(g, 39, 33);
  }});

  S.push({ name: 'scissors', draw(g) {
    ellipse(g, 22, 48, 7, 8, P.red); ellipse(g, 22, 48, 3.5, 4.5, null); // loop 1
    ellipse(g, 41, 48, 7, 8, P.plum); ellipse(g, 41, 48, 3.5, 4.5, null); // loop 2
    stroke(g, [[24, 42], [30, 30], [40, 12]], 3, 1.8, P.lgy); // blade 1 (rounded tip)
    stroke(g, [[39, 42], [33, 30], [24, 12]], 3, 1.8, P.lgy); // blade 2
    disc(g, 31.5, 34, 2, P.yel);                      // pivot
    eyes(g, CX, 24, 5);
    smileArc(g, CX, 29, 2.2, 1);
    blush(g, 25, 27); blush(g, 38, 27);
  }});

  S.push({ name: 'pyramid', draw(g) {
    disc(g, 50, 14, 6, P.yel); disc(g, 50, 14, 4, P.org); // sun
    ellipse(g, CX, 56, 28, 5, P.org);                 // sand
    tri(g, 6, 52, 57, 52, CX, 12, P.brn);             // shaded side
    tri(g, 6, 52, CX, 52, CX, 12, P.yel);             // lit face
    tri(g, CX, 52, 40, 52, CX, 26, P.org);            // shade band
    clipTo(g, [P.yel, P.brn, P.org], () => { rect(g, 14, 40, 49, 41, P.brn); rect(g, 20, 30, 44, 31, P.brn); rect(g, CX - 1, 26, CX + 1, 52, P.brn); });
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.2);
    blush(g, CX - 12, 43); blush(g, CX + 12, 43);
  }});

  S.push({ name: 'squirrel', draw(g) {
    ball(g, 47, 32, 13, 17, P.brn, P.plum);           // bushy tail
    ellipse(g, 47, 26, 8, 10, P.org);                 // tail inner
    ball(g, 28, 46, 11, 10, P.org, P.brn);            // body
    ellipse(g, 28, 48, 6, 7, P.crm);                  // belly
    ball(g, 22, 55, 3, 2.5, P.pch, P.brn); ball(g, 33, 55, 3, 2.5, P.pch, P.brn); // feet
    disc(g, 17, 20, 4.5, P.org); disc(g, 17, 20, 2, P.pch); // ears
    disc(g, 33, 18, 4.5, P.org); disc(g, 33, 18, 2, P.pch);
    ball(g, 25, 28, 12, 11, P.org, P.brn);            // head
    ellipse(g, 25, 34, 5, 4, P.pch);                  // rounded muzzle
    eyes(g, 25, 27, 6);
    disc(g, 25, 32, 1.2, P.navy);
    smileArc(g, 25, 35, 2.5, 2);
    blush(g, 16, 31); blush(g, 34, 31);
  }});

  S.push({ name: 'cupcake', draw(g) {
    ball(g, CX, 26, 15, 10, P.pnk, P.plum, P.crm);       // frosting mound
    ball(g, CX, 18, 10, 7, P.pnk, P.plum);               // swirl peak
    disc(g, CX, 11, 3.5, P.red);                         // cherry
    rrect(g, 19, 34, 44, 54, 2, P.crm);                  // wrapper
    clipTo(g, [P.crm], () => { for (let x = 22; x < 44; x += 4) rect(g, x, 34, x + 1, 54, P.lgy); }); // fluting
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.6, 1.2);
    blush(g, CX - 12, 45); blush(g, CX + 12, 45);
  }});

  S.push({ name: 'dove', draw(g) {
    ellipse(g, 15, 40, 6, 9, P.crm); ellipse(g, 48, 40, 6, 9, P.crm); // wings
    ball(g, CX, 44, 13, 12, P.crm, P.lgy);               // body
    ball(g, CX, 24, 12, 11, P.crm, P.lgy);               // head
    tri(g, 28, 27, 35, 27, CX, 32, P.org);               // beak
    stroke(g, [[27, 57], [27, 60]], 1, 1, P.org); stroke(g, [[36, 57], [36, 60]], 1, 1, P.org); // feet
    ellipse(g, 44, 52, 6, 3, P.lim); disc(g, 40, 51, 1.4, P.grn); // olive sprig
    eyes(g, CX, 23, 6);
    smileArc(g, CX, 34, 2, 0.9);
    blush(g, CX - 10, 27); blush(g, CX + 10, 27);
  }});

  S.push({ name: 'notebook', draw(g) {
    rrect(g, 14, 12, 50, 56, 2, P.grn);                  // cover shadow
    rrect(g, 16, 12, 50, 54, 2, P.lim);                  // cover
    rect(g, 16, 12, 22, 54, P.grn);                      // spine band
    for (let y = 16; y < 52; y += 5) disc(g, 19, y, 1.6, P.lgy); // spiral rings
    for (let y = 30; y < 50; y += 5) rect(g, 27, y, 45, y + 1, P.crm); // ruled lines
    eyes(g, 36, 20, 5);
    smileArc(g, 36, 25, 2.2, 1);
    blush(g, 30, 23); blush(g, 42, 23);
  }});

  S.push({ name: 'fern', draw(g) {
    rrect(g, 24, 46, 40, 58, 2, P.brn);                  // pot
    rect(g, 22, 44, 42, 48, P.org);                      // pot rim
    const fronds = [[CX, 44, CX, 8], [CX, 44, 15, 16], [CX, 44, 48, 16], [CX, 44, 20, 30], [CX, 44, 43, 30]];
    for (const [x0, y0, x1, y1] of fronds) {
      stroke(g, [[x0, y0], [x1, y1]], 1.6, 0.7, P.grn);
      for (let t = 0.2; t < 1.01; t += 0.16) { const lx = x0 + (x1 - x0) * t, ly = y0 + (y1 - y0) * t;
        ellipse(g, lx - 2.5, ly, 2.6, 1.2, P.lim); ellipse(g, lx + 2.5, ly, 2.6, 1.2, P.lim); }
    }
    eyes(g, CX, 50, 4);
    smileArc(g, CX, 54, 2, 0.9);
    blush(g, 27, 53); blush(g, 37, 53);
  }});

  S.push({ name: 'bible', draw(g) {
    for (let y = 16; y < 52; y += 2) rect(g, 44, y, 48, y + 1, P.crm); // page edges
    rrect(g, 14, 12, 46, 56, 2, P.plum);                 // cover shadow
    rrect(g, 14, 12, 45, 54, 2, P.brn);                  // leather cover
    rect(g, 29, 20, 32, 40, P.yel);                      // cross vertical
    rect(g, 24, 26, 37, 29, P.yel);                      // cross horizontal
    rect(g, 40, 30, 42, 58, P.red);                      // ribbon bookmark
    eyes(g, 29, 44, 5);
    smileArc(g, 29, 49, 2.2, 1);
    blush(g, 23, 47); blush(g, 36, 47);
  }});

  S.push({ name: 'mustache', draw(g) {
    ball(g, CX, 30, 16, 16, P.pch, P.brn);               // face
    ellipse(g, CX, 14, 14, 5, P.brn);                    // hair
    ball(g, CX, 30, 4, 3.4, P.pch, P.brn);               // nose
    ball(g, 20, 38, 8, 5, P.brn, P.plum);                // mustache left
    ball(g, 43, 38, 8, 5, P.brn, P.plum);                // mustache right
    stroke(g, [[13, 38], [9, 33]], 2, 1, P.brn);         // curl tip L
    stroke(g, [[50, 38], [54, 33]], 2, 1, P.brn);        // curl tip R
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 43, 1.8, 0.8);
    blush(g, 18, 32); blush(g, 45, 32);
  }});

  S.push({ name: 'photographer', draw(g) {
    ball(g, CX, 50, 13, 10, P.sky, P.lav);               // body
    ball(g, CX, 24, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 14, 12, 5, P.brn);                    // hair
    rrect(g, 19, 40, 44, 54, 2, P.dgy);                  // camera body
    disc(g, CX, 47, 6, P.navy); disc(g, CX, 47, 4, P.sky); g.set(30, 46, P.crm); // lens
    rect(g, 22, 37, 30, 40, P.lgy);                      // flash bar
    ball(g, 17, 46, 3, 2.6, P.pch, P.brn); ball(g, 46, 46, 3, 2.6, P.pch, P.brn); // hands
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 30, 2.2, 1);
    blush(g, CX - 10, 28); blush(g, CX + 10, 28);
  }});

  S.push({ name: 'museum', draw(g) {
    tri(g, 8, 26, 55, 26, CX, 12, P.lgy);                // pediment shadow
    tri(g, 10, 26, 52, 26, CX, 14, P.crm);               // pediment
    rect(g, 12, 26, 51, 30, P.lgy);                      // architrave
    for (let x = 15; x < 48; x += 8) { rrect(g, x, 30, x + 4, 52, 1, P.crm); rect(g, x + 4, 30, x + 5, 52, P.lgy); } // columns
    rect(g, 8, 52, 55, 58, P.lgy);                       // steps
    rect(g, 10, 55, 53, 58, P.dgy);
    eyes(g, CX, 20, 5);
    smileArc(g, CX, 24, 2, 0.9);
    blush(g, 24, 22); blush(g, 39, 22);
  }});

  S.push({ name: 'bagel', draw(g) {
    ball(g, CX, 34, 20, 18, P.org, P.brn, P.yel);        // dough ring
    ellipse(g, CX, 34, 7, 6, null);                      // hole
    for (let a = 0; a < 10; a++) { const th = a / 10 * Math.PI * 2; disc(g, CX + Math.cos(th) * 14, 34 + Math.sin(th) * 12, 0.9, P.crm); } // sesame
    eyes(g, CX, 21, 5);
    smileArc(g, CX, 26, 2.2, 1);
    blush(g, 18, 25); blush(g, 45, 25);
  }});

  S.push({ name: 'backpack', draw(g) {
    rrect(g, 24, 12, 39, 19, 3, P.red);                  // top grab loop
    ellipse(g, 31.5, 14, 4, 2, null);                    // loop hole
    rrect(g, 13, 17, 50, 56, 8, P.plum);                 // pack shadow
    rrect(g, 13, 17, 48, 54, 8, P.red);                  // pack body
    rrect(g, 18, 18, 25, 53, 3, P.plum);                 // left front strap
    rrect(g, 38, 18, 45, 53, 3, P.plum);                 // right front strap
    rect(g, 20, 44, 23, 47, P.yel); rect(g, 40, 44, 43, 47, P.yel); // buckles
    rect(g, 26, 42, 37, 44, P.plum);                     // pocket zipper
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 35, 2.2, 1);
    blush(g, 22, 33); blush(g, 41, 33);
  }});

  S.push({ name: 'coyote', draw(g) {
    tri(g, 16, 20, 26, 22, 18, 6, P.lgy); tri(g, 47, 20, 37, 22, 45, 6, P.lgy); // ears
    tri(g, 18, 18, 24, 20, 19, 10, P.pch); tri(g, 45, 18, 39, 20, 44, 10, P.pch); // inner ears
    stroke(g, [[46, 50], [54, 52], [56, 44]], 3, 1.5, P.lgy); // bushy tail
    ball(g, 55, 44, 3, 3, P.crm, P.lgy);                 // tail tip
    ball(g, CX, 48, 11, 9, P.lgy, P.lav);                // body
    ball(g, 25, 56, 3.5, 2.6, P.lgy, P.lav); ball(g, 38, 56, 3.5, 2.6, P.lgy, P.lav); // feet
    ball(g, CX, 26, 13, 12, P.lgy, P.lav);               // head
    ball(g, CX, 33, 6, 5, P.crm, P.lgy);                 // muzzle
    disc(g, CX, 34, 1.6, P.navy);                        // nose
    eyes(g, CX, 25, 6);
    smileArc(g, CX, 37, 2, 0.9);
    blush(g, CX - 11, 31); blush(g, CX + 11, 31);
  }});

  S.push({ name: 'postcard', draw(g) {
    rrect(g, 8, 16, 56, 50, 2, P.lgy);                   // card shadow
    rrect(g, 8, 16, 54, 48, 2, P.crm);                   // card
    rect(g, 12, 20, 34, 44, P.sky);                      // picture sky
    tri(g, 12, 44, 34, 44, 23, 30, P.grn);               // picture hill
    disc(g, 29, 26, 3, P.yel);                           // picture sun
    rrect(g, 40, 20, 50, 30, 1, P.pnk);                  // stamp
    for (let y = 36; y < 44; y += 3) rect(g, 38, y, 51, y + 1, P.lgy); // address lines
    eyes(g, 45, 24, 4);
    smileArc(g, 45, 27, 1.6, 0.8);
    blush(g, 40, 26); blush(g, 50, 26);
  }});

  S.push({ name: 'waiter', draw(g) {
    ball(g, CX, 49, 12, 10, P.dgy, P.navy);              // vest
    tri(g, 26, 40, 37, 40, CX, 52, P.crm);               // shirt
    rect(g, 29, 42, 34, 46, P.red);                      // bowtie
    disc(g, 31.5, 44, 1, P.plum);
    ball(g, 44, 50, 3.2, 2.6, P.pch, P.brn);             // resting hand
    ball(g, 19, 44, 3.2, 2.6, P.pch, P.brn);             // raised hand
    ellipse(g, 15, 41, 9, 3, P.lgy);                     // tray
    ball(g, 15, 37, 4, 3, P.crm, P.lgy);                 // dome cover
    ball(g, CX, 26, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 16, 12, 5, P.dgy);                    // hair
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.4, 1.1);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

  S.push({ name: 'lettuce', draw(g) {
    ball(g, CX, 40, 18, 16, P.grn, P.grn);               // outer head
    ellipse(g, 18, 34, 8, 10, P.lim); ellipse(g, 45, 34, 8, 10, P.lim); // side leaves
    ellipse(g, 22, 22, 8, 6, P.lim); ellipse(g, 41, 22, 8, 6, P.lim);   // top leaves
    ball(g, CX, 42, 12, 12, P.lim, P.grn, P.crm);        // inner leaf
    stroke(g, [[24, 46], [CX, 36]], 0.8, 0.4, P.grn); stroke(g, [[39, 46], [CX, 36]], 0.8, 0.4, P.grn); // veins
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.4, 1.1);
    blush(g, CX - 12, 43); blush(g, CX + 12, 43);
  }});

  S.push({ name: 'meteor', draw(g) {
    tri(g, 40, 12, 56, 8, 30, 40, P.yel);                // flame trail outer
    tri(g, 40, 16, 54, 12, 32, 40, P.org);               // inner trail
    stroke(g, [[52, 12], [46, 20]], 1, 1, P.red);        // ember streak
    ball(g, 26, 40, 13, 12, P.dgy, P.navy, P.lgy);       // rock
    disc(g, 20, 36, 2, P.lgy); disc(g, 31, 44, 2, P.lgy); // craters
    eyes(g, 26, 39, 6);
    smileArc(g, 26, 45, 2.4, 1.1);
    blush(g, 16, 43); blush(g, 35, 43);
  }});

  S.push({ name: 'telescope', draw(g) {
    stroke(g, [[CX, 42], [18, 58]], 1.4, 1.4, P.brn); stroke(g, [[CX, 42], [45, 58]], 1.4, 1.4, P.brn); // tripod
    stroke(g, [[CX, 42], [CX, 58]], 1.4, 1.4, P.brn);
    rrect(g, 20, 20, 50, 32, 5, P.lav);                  // tube shadow
    rrect(g, 18, 18, 48, 30, 5, P.sky);                  // tube
    ellipse(g, 47, 24, 3, 6, P.crm);                     // big lens end
    ellipse(g, 18, 24, 2, 4, P.navy);                    // eyepiece
    disc(g, 40, 11, 2, P.yel); disc(g, 46, 8, 1.4, P.yel); // stars
    eyes(g, 30, 24, 5);
    smileArc(g, 30, 28, 2, 0.9);
    blush(g, 24, 26); blush(g, 37, 26);
  }});

  S.push({ name: 'sled', draw(g) {
    stroke(g, [[14, 20], [9, 26], [9, 34], [16, 38]], 3.5, 3.5, P.brn); // rolled-up front curl
    rrect(g, 14, 34, 54, 44, 3, P.plum);                 // deck shadow
    rrect(g, 14, 32, 54, 42, 3, P.red);                  // thick slatted board
    for (let x = 20; x < 52; x += 6) rect(g, x, 32, x + 1, 42, P.plum); // slats
    stroke(g, [[12, 22], [5, 17]], 1.2, 1.2, P.yel);     // pull rope
    eyes(g, 36, 35, 5);
    smileArc(g, 36, 39, 2.2, 1);
    blush(g, 30, 37); blush(g, 42, 37);
  }});

  S.push({ name: 'chili', draw(g) {
    stroke(g, [[36, 16], [33, 10], [27, 9]], 2, 1, P.grn); // stem
    ellipse(g, 30, 14, 4, 3, P.lim);                     // cap
    ball(g, CX, 30, 10, 9, P.red, P.plum, P.pnk);        // top bulb
    ball(g, 28, 44, 8, 9, P.red, P.plum);                // mid curve
    ball(g, 33, 54, 5, 6, P.red, P.plum);                // tip
    ellipse(g, 26, 24, 2.5, 4, P.pnk);                   // shine
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.4, 1.1);
    blush(g, 22, 33); blush(g, 40, 33);
  }});

  S.push({ name: 'pope', draw(g) {
    ball(g, CX, 48, 14, 12, P.crm, P.lgy);               // robe
    ball(g, 20, 52, 3.4, 2.8, P.pch, P.brn); ball(g, 43, 52, 3.4, 2.8, P.pch, P.brn); // hands
    tri(g, 24, 21, 39, 21, CX, 6, P.crm);                // mitre hat
    tri(g, 24, 21, 39, 21, CX, 12, P.lgy);               // mitre shade
    rect(g, 30, 8, 33, 17, P.yel); rect(g, 27, 11, 36, 13, P.yel); // cross on mitre
    rect(g, 22, 21, 41, 24, P.yel);                      // hat band
    ball(g, CX, 30, 10, 9, P.pch, P.brn);                // face
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 35, 2.2, 1);
    blush(g, CX - 8, 33); blush(g, CX + 8, 33);
  }});

  S.push({ name: 'cactus', draw(g) {
    rrect(g, 26, 20, 37, 54, 5, P.grn);                  // trunk shadow
    rrect(g, 25, 18, 36, 52, 5, P.lim);                  // trunk
    rrect(g, 14, 30, 24, 40, 4, P.lim); rect(g, 20, 38, 24, 44, P.lim); // left arm
    rrect(g, 37, 24, 47, 34, 4, P.lim); rect(g, 37, 32, 41, 40, P.lim); // right arm
    for (let y = 22; y < 50; y += 6) { g.set(30, y, P.grn); g.set(31, y, P.grn); } // spine ridge
    disc(g, 30, 14, 3, P.pnk); disc(g, 30, 14, 1.4, P.yel); // flower
    rrect(g, 22, 52, 40, 58, 1, P.brn);                  // pot
    eyes(g, 30, 34, 5);
    smileArc(g, 30, 39, 2.2, 1);
    blush(g, 24, 37); blush(g, 37, 37);
  }});

  S.push({ name: 'laptop', draw(g) {
    rrect(g, 12, 12, 52, 40, 2, P.lgy);                  // screen bezel
    rect(g, 15, 15, 49, 37, P.sky);                      // screen
    rect(g, 15, 15, 49, 20, P.lav);                      // screen top bar
    rrect(g, 8, 40, 56, 50, 2, P.lgy);                   // keyboard base
    rect(g, 8, 44, 56, 46, P.dgy);                       // key row
    rect(g, 24, 47, 40, 49, P.crm);                      // spacebar
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.6, 1.2);
    blush(g, 20, 30); blush(g, 43, 30);
  }});

  S.push({ name: 'submarine', draw(g) {
    rect(g, 30, 8, 33, 20, P.dgy); rect(g, 33, 8, 40, 10, P.dgy); // periscope
    rrect(g, 27, 18, 37, 28, 2, P.org);                  // conning tower
    ball(g, CX, 40, 22, 13, P.yel, P.org);               // hull
    disc(g, 19, 40, 3.5, P.navy); disc(g, 19, 40, 2.4, P.sky); // porthole
    disc(g, 44, 40, 3.5, P.navy); disc(g, 44, 40, 2.4, P.sky);
    stroke(g, [[52, 40], [57, 40]], 2, 2, P.dgy);        // prop shaft
    ellipse(g, 57, 40, 2, 5, P.lgy);                     // propeller
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 2.6, 1.2);
    blush(g, CX - 12, 42); blush(g, CX + 12, 42);
  }});

  S.push({ name: 'penguin', draw(g) {
    ellipse(g, 14, 42, 5, 9, P.dgy); ellipse(g, 49, 42, 5, 9, P.dgy); // flippers
    ball(g, CX, 44, 15, 15, P.dgy, P.navy);              // body
    ellipse(g, CX, 46, 9, 11, P.crm);                    // white belly
    ball(g, CX, 24, 13, 12, P.dgy, P.navy);              // head
    ellipse(g, CX, 27, 8, 7, P.crm);                     // face patch
    tri(g, 28, 28, 35, 28, CX, 33, P.org);               // beak
    ellipse(g, 25, 58, 4, 2, P.org); ellipse(g, 38, 58, 4, 2, P.org); // feet
    eyes(g, CX, 25, 5);
    smileArc(g, CX, 33, 1.8, 0.8);
    blush(g, 22, 29); blush(g, 41, 29);
  }});

  S.push({ name: 'freezer', draw(g) {          // 冰櫃 bing1 gwai6
    rrect(g, 16, 8, 48, 58, 4, P.lgy);                  // cabinet shadow
    rrect(g, 16, 8, 46, 56, 4, P.crm);                  // cabinet front
    rect(g, 16, 31, 46, 33, P.lgy);                     // door split
    rrect(g, 40, 14, 43, 26, 1, P.sky);                 // upper handle
    rrect(g, 40, 38, 43, 50, 1, P.sky);                 // lower handle
    rect(g, 23, 42, 32, 43, P.sky); rect(g, 27, 38, 28, 47, P.sky); // snowflake
    g.set(24, 40, P.sky); g.set(31, 45, P.sky); g.set(31, 40, P.sky); g.set(24, 45, P.sky);
    eyes(g, 28, 20, 6);
    smileArc(g, 28, 25, 2.6, 1.2);
    blush(g, 20, 23); blush(g, 37, 23);
  }});

  S.push({ name: 'helicopter', draw(g) {       // 直升機 zik6 sing1 gei1
    rect(g, 8, 12, 55, 14, P.lgy);                      // rotor blade shadow
    rect(g, 8, 11, 55, 13, P.sky);                      // main rotor
    rect(g, 30, 14, 33, 21, P.dgy);                     // mast
    stroke(g, [[40, 36], [56, 31]], 2.4, 1.4, P.red);   // tail boom
    rect(g, 51, 24, 53, 37, P.plum);                    // tail fin
    rect(g, 49, 29, 57, 31, P.lgy);                     // tail rotor
    ball(g, 27, 38, 15, 13, P.red, P.plum);             // cockpit body
    ellipse(g, 18, 33, 4, 3, P.crm);                    // shine
    rect(g, 18, 53, 40, 55, P.dgy);                     // skid
    rect(g, 22, 51, 23, 53, P.dgy); rect(g, 35, 51, 36, 53, P.dgy); // struts
    eyes(g, 27, 37, 6);
    smileArc(g, 27, 43, 2.6, 1.2);
    blush(g, 17, 41); blush(g, 37, 41);
  }});

  S.push({ name: 'ant', draw(g) {              // 蟻 ngai5
    stroke(g, [[26, 13], [22, 5]], 1, 1, P.navy); stroke(g, [[37, 13], [41, 5]], 1, 1, P.navy); // antennae
    disc(g, 22, 5, 1.6, P.navy); disc(g, 41, 5, 1.6, P.navy);
    stroke(g, [[24, 34], [13, 32]], 1.2, 1.2, P.navy); stroke(g, [[24, 37], [13, 42]], 1.2, 1.2, P.navy);
    stroke(g, [[39, 34], [50, 32]], 1.2, 1.2, P.navy); stroke(g, [[39, 37], [50, 42]], 1.2, 1.2, P.navy);
    ball(g, CX, 49, 12, 11, P.brn, P.plum);             // abdomen
    ball(g, CX, 36, 7, 6, P.brn, P.plum);               // thorax
    ball(g, CX, 21, 12, 11, P.red, P.plum);             // head
    eyes(g, CX, 21, 6);
    smileArc(g, CX, 27, 2.4, 1.1);
    blush(g, CX - 9, 25); blush(g, CX + 9, 25);
  }});

  S.push({ name: 'singer', draw(g) {           // 歌手 go1 sau2
    ball(g, CX, 49, 11, 9, P.pnk, P.plum);              // top
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn); ball(g, 37, 57, 4, 2.6, P.pch, P.brn); // feet
    ball(g, 44, 45, 3, 2.6, P.pch, P.brn);              // raised hand
    rect(g, 44, 30, 46, 45, P.dgy);                     // mic stick
    ball(g, 45, 28, 4, 4, P.lgy, P.dgy);                // mic head
    ball(g, 30, 27, 14, 13, P.pch, P.brn);              // head
    ellipse(g, 30, 17, 13, 6, P.dgy);                   // hair
    ellipse(g, 18, 24, 2.5, 5, P.dgy); ellipse(g, 42, 22, 2.5, 4, P.dgy);
    disc(g, 53, 15, 2.4, P.sky); rect(g, 54, 7, 55, 15, P.sky); // music note
    eyes(g, 30, 27, 6);
    openMouth(g, 30, 33, 3, 2.4);                       // singing
    blush(g, 19, 31); blush(g, 40, 31);
  }});

  S.push({ name: 'cockroach', draw(g) {        // 甴曱 gaat6 zaat6
    stroke(g, [[24, 20], [14, 8]], 1.2, 1.2, P.navy); stroke(g, [[39, 20], [49, 8]], 1.2, 1.2, P.navy); // long antennae
    stroke(g, [[20, 42], [10, 46]], 1.1, 1.1, P.brn); stroke(g, [[20, 48], [11, 54]], 1.1, 1.1, P.brn);
    stroke(g, [[43, 42], [53, 46]], 1.1, 1.1, P.brn); stroke(g, [[43, 48], [52, 54]], 1.1, 1.1, P.brn);
    ball(g, CX, 42, 17, 16, P.brn, P.plum);             // flat oval body
    ellipse(g, CX, 29, 12, 7, P.pch);                   // head shield
    rect(g, CX - 1, 38, CX + 1, 53, P.plum);            // wing seam
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 34, 2.6, 1.2);
    blush(g, CX - 11, 33); blush(g, CX + 11, 33);
  }});

  S.push({ name: 'chain', draw(g) {            // 鏈 lin6
    ball(g, 14, 18, 8, 9, P.lgy, P.dgy); ellipse(g, 14, 18, 3.5, 4.5, null); // top link
    ball(g, 49, 46, 8, 9, P.lgy, P.dgy); ellipse(g, 49, 46, 3.5, 4.5, null); // bottom link
    ball(g, CX, 32, 12, 13, P.lgy, P.dgy);              // center link
    ellipse(g, CX, 40, 5, 3.5, null);                   // hole
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 35, 2.4, 1.1);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

  S.push({ name: 'drums', draw(g) {            // 鑼鼓 lo4 gu2
    stroke(g, [[16, 8], [28, 26]], 1.4, 1.4, P.crm); ball(g, 16, 8, 2.6, 2.6, P.pch); // stick L
    stroke(g, [[47, 8], [36, 26]], 1.4, 1.4, P.crm); ball(g, 47, 8, 2.6, 2.6, P.pch); // stick R
    rrect(g, 15, 30, 48, 54, 3, P.plum);                // shell shadow
    rrect(g, 15, 30, 46, 52, 3, P.red);                 // shell
    ellipse(g, 30, 30, 16, 5, P.crm);                   // drum head
    rect(g, 18, 33, 19, 50, P.yel); rect(g, 43, 33, 44, 50, P.yel); // lug bars
    for (let i = 0; i < 4; i++) { g.set(20 + i * 7, 32, P.yel); g.set(20 + i * 7, 51, P.yel); }
    eyes(g, 30, 40, 7);
    smileArc(g, 30, 46, 3, 1.3);
    blush(g, 20, 44); blush(g, 43, 44);
  }});

  S.push({ name: 'salmon', draw(g) {           // 三文魚 saam1 man4 jyu4
    tri(g, 8, 22, 8, 46, 22, 34, P.plum);               // tail fin back
    tri(g, 10, 24, 10, 44, 22, 34, P.org);              // tail fin
    ball(g, 36, 34, 20, 15, P.org, P.plum);             // body
    ellipse(g, 40, 41, 14, 5, P.pnk);                   // belly stripe
    tri(g, 32, 20, 44, 20, 38, 12, P.org);              // dorsal fin
    ellipse(g, 32, 46, 5, 3, P.plum);                   // pectoral fin
    eyes(g, 46, 30, 5);
    smileArc(g, 50, 36, 2.4, 1.1);
    blush(g, 42, 36); blush(g, 53, 33);
  }});

  S.push({ name: 'palace', draw(g) {           // 宮 gung1
    ball(g, CX, 14, 8, 8, P.lav, P.plum); rect(g, 24, 14, 39, 18, P.lav); // center dome
    stroke(g, [[CX, 6], [CX, 2]], 1, 1, P.yel); disc(g, CX, 3, 1.6, P.yel);
    ball(g, 14, 22, 5, 5, P.lav, P.plum); ball(g, 49, 22, 5, 5, P.lav, P.plum); // side domes
    rrect(g, 9, 26, 54, 58, 2, P.lgy);                  // facade shadow
    rrect(g, 9, 26, 52, 56, 2, P.crm);                  // facade
    rect(g, 9, 26, 52, 28, P.yel);                      // trim
    ball(g, CX, 51, 7, 9, P.sky, P.lav); rect(g, 25, 51, 38, 57, P.sky); // arched gate
    rect(g, 17, 46, 20, 55, P.lav); rect(g, 43, 46, 46, 55, P.lav); // arched windows
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 41, 2.6, 1.2);
    blush(g, CX - 12, 39); blush(g, CX + 12, 39);
  }});

  S.push({ name: 'camp', draw(g) {             // 營 jing4
    ellipse(g, CX, 56, 24, 3, P.grn);                   // ground
    tri(g, 6, 54, CX, 8, 34, 54, P.grn);                // tent shadow slope
    tri(g, 30, 54, CX, 8, 58, 54, P.lim);               // tent lit slope
    tri(g, 6, 54, CX - 1, 10, 20, 54, P.grn);
    tri(g, 24, 54, CX, 24, 39, 54, P.navy);             // door flap
    tri(g, CX, 24, 34, 54, 39, 54, P.dgy);
    stroke(g, [[CX, 8], [CX, 3]], 1.2, 1.2, P.brn); ball(g, CX + 3, 4, 2, 1.6, P.yel); // flag
    eyes(g, 19, 40, 5);
    smileArc(g, 19, 45, 2.4, 1.1);
    blush(g, 12, 43); blush(g, 26, 43);
  }});

  S.push({ name: 'toothpaste', draw(g) {       // 牙膏 ngaa4 gou1
    rrect(g, 20, 20, 43, 56, 5, P.lav);                 // tube shadow
    rrect(g, 20, 20, 41, 54, 5, P.crm);                 // tube body
    rect(g, 22, 24, 24, 50, P.sky);                     // stripe
    rect(g, 20, 52, 43, 56, P.lgy); for (let x = 22; x <= 41; x += 3) g.set(x, 54, P.lav); // crimp
    rrect(g, 27, 12, 36, 22, 2, P.sky);                 // cap
    ball(g, CX, 10, 4, 3, P.lim, P.grn); ball(g, 27, 8, 2.5, 2, P.lim, P.grn); // paste blob
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 39, 2.6, 1.2);
    blush(g, CX - 11, 37); blush(g, CX + 11, 37);
  }});

  S.push({ name: 'lighthouse', draw(g) {       // 燈塔 dang1 taap3
    ellipse(g, CX, 14, 11, 8, P.yel);                   // lamp glow
    g.set(9, 14, P.yel); g.set(11, 14, P.yel); g.set(52, 14, P.yel); g.set(54, 14, P.yel); // sparkle rays
    rrect(g, 25, 9, 38, 20, 2, P.org);                  // lamp room
    ellipse(g, CX, 14, 4, 4, P.crm);                    // lamp glass
    rect(g, 22, 20, 42, 23, P.red);                     // gallery rail
    tri(g, 18, 56, 46, 56, CX, 22, P.lgy);              // tower shadow
    tri(g, 18, 56, CX, 22, 30, 56, P.crm);              // tower lit
    clipTo(g, [P.crm, P.lgy], () => { rect(g, 16, 28, 48, 33, P.red); rect(g, 16, 42, 48, 47, P.red); }); // stripes
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 2.6, 1.2);
    blush(g, CX - 9, 42); blush(g, CX + 9, 42);
  }});

  S.push({ name: 'marbles', draw(g) {          // 波子 bo1 zi2
    ball(g, 19, 48, 9, 9, P.lim, P.grn, P.crm);         // small marble
    ellipse(g, 16, 45, 2.5, 2, P.crm);
    ball(g, 47, 46, 10, 10, P.org, P.brn, P.yel);       // marble
    ellipse(g, 44, 43, 2.5, 2, P.crm);
    ball(g, CX, 30, 15, 15, P.sky, P.lav, P.crm);       // big marble
    stroke(g, [[20, 26], [26, 20], [33, 22]], 2, 1.5, P.pnk); // swirl
    ellipse(g, 25, 24, 3, 2, P.crm);                    // shine
    eyes(g, CX, 31, 6);
    smileArc(g, CX, 37, 2.6, 1.2);
    blush(g, CX - 11, 35); blush(g, CX + 11, 35);
  }});

  S.push({ name: 'robot', draw(g) {            // 機械人 gei1 haai6 jan4
    stroke(g, [[CX, 8], [CX, 4]], 1.2, 1.2, P.lgy); ball(g, CX, 3, 2.5, 2.5, P.red); // antenna
    ball(g, 13, 42, 3, 4, P.dgy, P.navy); ball(g, 48, 42, 3, 4, P.dgy, P.navy); // arms
    rrect(g, 18, 10, 45, 34, 3, P.lav);                 // head shadow
    rrect(g, 18, 10, 43, 32, 3, P.lgy);                 // head
    rrect(g, 22, 14, 41, 28, 2, P.sky);                 // face screen
    rrect(g, 20, 36, 43, 58, 2, P.lav);                 // body shadow
    rrect(g, 20, 36, 41, 56, 2, P.lgy);                 // body
    disc(g, 27, 45, 2, P.red); disc(g, 35, 45, 2, P.yel); disc(g, 31, 51, 2, P.lim); // buttons
    eyes(g, 31, 20, 6);
    smileArc(g, 31, 26, 2.6, 1.2);
    blush(g, 22, 24); blush(g, 40, 24);
  }});

  S.push({ name: 'microscope', draw(g) {       // 顯微鏡 hin2 mei4 geng3
    rrect(g, 18, 52, 46, 58, 3, P.dgy);                 // base foot
    rrect(g, 26, 20, 40, 54, 3, P.sky);                 // upright body (face)
    stroke(g, [[34, 22], [48, 12]], 3, 2, P.lgy);       // angled eyepiece tube
    ball(g, 48, 11, 4, 5, P.dgy, P.navy);               // eyepiece cup
    rect(g, 21, 40, 34, 43, P.lgy);                     // stage shelf
    rect(g, 30, 33, 34, 41, P.dgy);                     // objective barrel
    disc(g, 27, 42, 1.6, P.navy);                       // slide hole
    eyes(g, 33, 30, 5);
    smileArc(g, 33, 36, 2.4, 1.1);
    blush(g, 26, 34); blush(g, 40, 34);
  }});

  S.push({ name: 'lasagna', draw(g) {
    ball(g, CX, 32, 19, 7, P.yel, P.org);         // melty cheese top
    ellipse(g, 16, 35, 2.6, 3, P.yel);            // cheese drips
    ellipse(g, 47, 35, 2.6, 3, P.yel);
    rrect(g, 14, 35, 49, 55, 3, P.crm);           // pasta slab
    rect(g, 15, 39, 48, 41, P.red);               // sauce layer
    rect(g, 15, 43, 48, 44, P.brn);               // meat layer
    eyes(g, CX, 47, 7);
    smileArc(g, CX, 52, 2.8, 1.2);
    blush(g, CX - 13, 50); blush(g, CX + 13, 50);
  }});

  S.push({ name: 'muffin', draw(g) {
    ball(g, CX, 25, 17, 13, P.brn, P.plum);       // muffin top
    disc(g, 22, 21, 2.2, P.lav);                  // blueberries
    disc(g, 40, 19, 2.2, P.lav);
    rrect(g, 19, 36, 44, 55, 2, P.org);           // paper wrapper
    clipTo(g, [P.org], function () {              // wrapper pleats
      rect(g, 24, 36, 25, 55, P.brn);
      rect(g, 30, 36, 31, 55, P.brn);
      rect(g, 37, 36, 38, 55, P.brn);
    });
    eyes(g, CX, 26, 7);
    smileArc(g, CX, 32, 2.6, 1.1);
    blush(g, CX - 13, 30); blush(g, CX + 13, 30);
  }});

  S.push({ name: 'cola', draw(g) {
    stroke(g, [[38, 44], [45, 24], [48, 14]], 1.6, 1.4, P.pnk); // straw
    rrect(g, 16, 20, 47, 56, 5, P.dgy);           // glass
    rrect(g, 18, 22, 45, 54, 4, P.brn);           // cola
    ellipse(g, CX, 23, 12, 2.4, P.plum);          // surface
    disc(g, 24, 31, 1.3, P.crm); disc(g, 40, 35, 1.2, P.crm); disc(g, 30, 41, 1.3, P.crm); // fizz
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 44, 3, 1.3);
    blush(g, CX - 13, 42); blush(g, CX + 13, 42);
  }});

  S.push({ name: 'blueberry', draw(g) {
    ball(g, CX, 35, 17, 16, P.sky, P.lav);        // berry body
    disc(g, CX, 19, 2.6, P.plum);                 // crown
    tri(g, CX - 4, 21, CX - 1, 13, CX + 1, 21, P.plum);
    tri(g, CX - 1, 21, CX + 2, 13, CX + 4, 21, P.plum);
    eyes(g, CX, 35, 7);
    smileArc(g, CX, 42, 3, 1.3);
    blush(g, CX - 12, 39); blush(g, CX + 12, 39);
  }});

  S.push({ name: 'platter', draw(g) {
    ellipse(g, CX, 53, 26, 5, P.lgy);             // plate rim
    ellipse(g, CX, 51, 24, 4, P.crm);             // plate top
    ball(g, CX, 34, 20, 17, P.lgy, P.lav);        // silver dome
    rect(g, 18, 30, 22, 44, P.crm);               // sheen
    ball(g, CX, 15, 3, 2.6, P.yel, P.org);        // knob handle
    eyes(g, CX, 34, 8);
    smileArc(g, CX, 41, 3, 1.3);
    blush(g, CX - 14, 38); blush(g, CX + 14, 38);
  }});

  S.push({ name: 'flute', draw(g) {
    rrect(g, 14, 26, 58, 37, 5, P.lgy);           // tube shadow
    rrect(g, 14, 25, 58, 35, 5, P.crm);           // tube (silver)
    rect(g, 20, 27, 52, 28, P.crm);               // sheen
    disc(g, 30, 31, 1.6, P.navy); disc(g, 38, 31, 1.6, P.navy); // finger holes
    disc(g, 46, 31, 1.6, P.navy); disc(g, 53, 31, 1.6, P.navy);
    ball(g, 16, 30, 9, 9, P.lgy, P.lav);          // mouthpiece head
    disc(g, 12, 30, 1.8, P.navy);                 // blow hole
    eyes(g, 17, 29, 5);
    smileArc(g, 17, 34, 2.2, 1);
    blush(g, 11, 32); blush(g, 24, 32);
  }});

  S.push({ name: 'pancake', draw(g) {
    ball(g, CX, 49, 20, 6, P.org, P.brn);         // bottom cake
    ball(g, CX, 41, 19, 6, P.org, P.brn);         // middle cake
    ball(g, CX, 33, 18, 6, P.org, P.brn);         // top cake
    ellipse(g, 20, 30, 3, 2, P.brn);              // syrup drips
    ellipse(g, 44, 31, 3, 2, P.brn);
    ellipse(g, CX, 28, 16, 3, P.brn);             // syrup pool
    rrect(g, 26, 23, 37, 29, 2, P.yel);           // butter pat
    eyes(g, CX, 41, 7);
    smileArc(g, CX, 47, 3, 1.3);
    blush(g, CX - 14, 44); blush(g, CX + 14, 44);
  }});

  S.push({ name: 'grandpa', draw(g) {
    ball(g, CX, 50, 10, 8, P.grn, P.dgy);         // cardigan
    ball(g, 26, 58, 4, 2.6, P.dgy, P.blk);        // slippers
    ball(g, 37, 58, 4, 2.6, P.dgy, P.blk);
    ball(g, 20, 49, 3.2, 2.6, P.pch, P.brn);      // hands
    ball(g, 43, 49, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 14, 13, P.pch, P.brn);        // head
    ellipse(g, CX, 38, 12, 7, P.crm);             // white beard
    ellipse(g, CX, 16, 12, 5, P.lgy);             // grey hair rim
    ellipse(g, 19, 22, 2.4, 4, P.lgy); ellipse(g, 44, 22, 2.4, 4, P.lgy); // side hair
    ellipse(g, CX - 6, 26, 4, 4, P.navy); ellipse(g, CX - 6, 26, 3, 3, P.pch); // glasses
    ellipse(g, CX + 6, 26, 4, 4, P.navy); ellipse(g, CX + 6, 26, 3, 3, P.pch);
    rect(g, 28, 26, 35, 26, P.navy);              // bridge
    eyes(g, CX, 26, 3);
    smileArc(g, CX, 32, 2.4, 1);
    blush(g, CX - 11, 30); blush(g, CX + 11, 30);
  }});

  S.push({ name: 'cradle', draw(g) {
    stroke(g, [[14, 54], [32, 59], [50, 54]], 2, 2, P.brn); // curved rocker
    rrect(g, 14, 34, 49, 52, 6, P.lav);           // basket shadow
    rrect(g, 14, 33, 49, 50, 6, P.sky);           // basket
    rect(g, 15, 40, 48, 43, P.crm);               // sheet
    rect(g, 15, 44, 48, 45, P.pnk);               // blanket trim
    ball(g, 21, 33, 10, 11, P.sky, P.lav);        // hood
    ellipse(g, 21, 35, 6, 7, P.lav);              // hood inside
    eyes(g, 39, 40, 5);
    smileArc(g, 39, 45, 2.2, 1);
    blush(g, 33, 43); blush(g, 45, 43);
  }});

  S.push({ name: 'grapefruit', draw(g) {
    ball(g, CX, 34, 18, 17, P.org, P.brn);        // peel
    disc(g, CX, 34, 15, P.pnk);                   // pink flesh
    for (let a = 0; a < 8; a++) {                 // segment dividers
      const th = a / 8 * Math.PI * 2;
      stroke(g, [[CX, 34], [CX + Math.cos(th) * 14, 34 + Math.sin(th) * 14]], 0.8, 0.8, P.crm);
    }
    disc(g, CX, 34, 2.2, P.crm);                  // pith
    eyes(g, CX, 31, 7);
    smileArc(g, CX, 39, 3, 1.3);
    blush(g, CX - 12, 37); blush(g, CX + 12, 37);
  }});

  S.push({ name: 'cheesecake', draw(g) {
    tri(g, 18, 15, 46, 15, CX, 55, P.crm);        // slice body
    tri(g, 22, 18, 42, 18, CX, 48, P.yel);        // filling (cream rim)
    rect(g, 17, 12, 47, 17, P.brn);               // graham crust
    disc(g, CX, 11, 3.4, P.red);                  // strawberry
    tri(g, CX - 3, 9, CX + 3, 9, CX, 4, P.lim);   // leaf
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.1);
    blush(g, CX - 8, 34); blush(g, CX + 8, 34);
  }});

  S.push({ name: 'pineapple', draw(g) {
    tri(g, 26, 20, 30, 22, 27, 4, P.grn);         // crown leaves
    tri(g, 30, 22, 34, 22, CX, 2, P.lim);
    tri(g, 34, 20, 38, 22, 37, 4, P.grn);
    tri(g, 21, 22, 27, 23, 22, 8, P.grn);
    tri(g, 43, 22, 37, 23, 42, 8, P.grn);
    ball(g, CX, 39, 16, 18, P.yel, P.org);        // body
    clipTo(g, [P.yel, P.org], function () {       // crosshatch
      for (let k = -24; k <= 24; k += 7) {
        stroke(g, [[CX + k, 20], [CX + k + 18, 58]], 0.7, 0.7, P.brn);
        stroke(g, [[CX + k, 20], [CX + k - 18, 58]], 0.7, 0.7, P.brn);
      }
    });
    eyes(g, CX, 37, 7);
    smileArc(g, CX, 44, 3, 1.3);
    blush(g, CX - 12, 42); blush(g, CX + 12, 42);
  }});

  S.push({ name: 'octopus', draw(g) {
    stroke(g, [[19, 40], [13, 49], [17, 57]], 3.4, 1.3, P.lav); // tentacles
    stroke(g, [[25, 44], [21, 53], [24, 59]], 3.4, 1.3, P.lav);
    stroke(g, [[31, 45], [31, 55], [31, 60]], 3.4, 1.3, P.lav);
    stroke(g, [[38, 44], [42, 53], [39, 59]], 3.4, 1.3, P.lav);
    stroke(g, [[44, 40], [50, 49], [46, 57]], 3.4, 1.3, P.lav);
    disc(g, 15, 50, 1, P.pnk); disc(g, 48, 50, 1, P.pnk); // suckers
    ball(g, CX, 28, 17, 16, P.lav, P.plum);       // mantle
    ball(g, 24, 20, 4, 3, P.lav, P.plum);         // head bumps
    ball(g, 39, 20, 4, 3, P.lav, P.plum);
    eyes(g, CX, 28, 8);
    smileArc(g, CX, 36, 3, 1.3);
    blush(g, CX - 13, 33); blush(g, CX + 13, 33);
  }});

  S.push({ name: 'skunk', draw(g) {
    ball(g, 48, 22, 8, 13, P.dgy, P.blk);         // bushy tail
    ellipse(g, 48, 20, 3.6, 10, P.crm);           // tail stripe
    ball(g, CX, 47, 12, 10, P.dgy, P.blk);        // body
    ellipse(g, CX, 46, 4, 9, P.crm);              // back stripe
    ball(g, 25, 57, 4, 2.6, P.dgy, P.blk);        // feet
    ball(g, 38, 57, 4, 2.6, P.dgy, P.blk);
    disc(g, 22, 12, 3.4, P.dgy); disc(g, 41, 12, 3.4, P.dgy); // ears
    ball(g, CX, 26, 13, 12, P.dgy, P.blk);        // head
    ellipse(g, CX, 25, 6, 12, P.crm);             // white face blaze
    eyes(g, CX, 24, 5);
    ellipse(g, CX, 33, 1.6, 1.2, P.navy);         // nose
    smileArc(g, CX, 30, 2.2, 1);
    blush(g, CX - 10, 28); blush(g, CX + 10, 28);
  }});

  S.push({ name: 'meatball', draw(g) {
    stroke(g, [[16, 44], [22, 50], [20, 56]], 1.4, 1.2, P.yel); // spaghetti
    stroke(g, [[47, 44], [42, 50], [44, 56]], 1.4, 1.2, P.yel);
    ellipse(g, CX, 48, 19, 7, P.red);             // sauce pool
    ball(g, CX, 33, 15, 14, P.brn, P.plum);       // meatball
    ellipse(g, 23, 25, 3, 2, P.red); ellipse(g, 40, 23, 3, 2, P.red); // sauce on top
    disc(g, 38, 21, 1.4, P.lim);                  // parsley
    eyes(g, CX, 33, 7);
    smileArc(g, CX, 40, 3, 1.3);
    blush(g, CX - 12, 38); blush(g, CX + 12, 38);
  }});

  /* Sprite corpus slices 15,17-20 (gated). */
  S.push({ name: 'tub', draw(g) {                // 盆 pun4
    ellipse(g, CX, 30, 22, 7, P.lgy);            // basin rim (shadow)
    ellipse(g, CX, 29, 20, 6, P.crm);            // rim top
    ellipse(g, CX, 31, 16, 4, P.sky);            // water
    ball(g, CX, 44, 20, 12, P.lav, P.plum);      // basin body
    ellipse(g, 16, 40, 2.4, 6, P.pnk);           // side sheen
    disc(g, 24, 30, 2.4, P.crm); disc(g, 40, 30, 2, P.crm); // suds
    eyes(g, CX, 44, 8);
    smileArc(g, CX, 50, 3, 1.3);
    blush(g, CX - 14, 47); blush(g, CX + 14, 47);
  }});

  S.push({ name: 'tray', draw(g) {               // 盤 pun4
    ellipse(g, CX, 38, 26, 9, P.lav);            // tray underside (shadow)
    ellipse(g, CX, 35, 26, 9, P.lgy);            // tray rim
    ellipse(g, CX, 34, 22, 7, P.crm);            // tray floor
    rrect(g, 6, 32, 12, 38, 2, P.lgy);           // left handle
    rrect(g, 51, 32, 57, 38, 2, P.lgy);          // right handle
    ellipse(g, 8, 35, 2, 2, null); ellipse(g, 55, 35, 2, 2, null); // handle holes
    eyes(g, CX, 33, 8);
    smileArc(g, CX, 39, 3, 1.2);
    blush(g, CX - 14, 36); blush(g, CX + 14, 36);
  }});

  S.push({ name: 'pea', draw(g) {                // 豆子 dau2 zi2
    stroke(g, [[CX, 12], [28, 6]], 1.2, 1, P.grn); // stem
    ball(g, CX, 34, 22, 13, P.lim, P.grn);       // pod
    ellipse(g, 13, 32, 3, 8, P.grn);             // pod tips
    ellipse(g, 50, 32, 3, 8, P.grn);
    ball(g, 21, 44, 5, 5, P.lim, P.grn);         // pea bumps along seam
    ball(g, CX, 46, 5, 5, P.lim, P.grn);
    ball(g, 42, 44, 5, 5, P.lim, P.grn);
    eyes(g, CX, 32, 8);
    smileArc(g, CX, 38, 2.8, 1.2);
    blush(g, 18, 36); blush(g, 45, 36);
  }});

  S.push({ name: 'warehouse', draw(g) {          // 倉 cong1
    tri(g, 8, 26, CX, 12, 55, 26, P.plum);       // roof shadow
    tri(g, 10, 26, CX, 14, 53, 26, P.red);       // roof
    rrect(g, 12, 26, 51, 56, 1, P.plum);         // barn shadow
    rrect(g, 12, 26, 49, 54, 1, P.red);          // barn body
    rect(g, 25, 34, 38, 54, P.crm);              // big door
    rect(g, 31, 34, 32, 54, P.brn);              // door split
    rect(g, 14, 30, 22, 34, P.crm); rect(g, 41, 30, 49, 34, P.crm); // hayloft windows
    eyes(g, CX, 22, 5);
    smileArc(g, CX, 25, 2, 0.9);
    blush(g, 24, 24); blush(g, 39, 24);
  }});

  S.push({ name: 'toaster', draw(g) {            // 多士爐 do1 si6 lou4
    rrect(g, 18, 26, 46, 30, 2, P.crm);          // toast 1
    rrect(g, 30, 24, 44, 30, 2, P.org);          // toast 2 (behind)
    rrect(g, 12, 30, 52, 56, 6, P.lav);          // body shadow
    rrect(g, 12, 30, 50, 54, 6, P.lgy);          // body (chrome)
    rect(g, 18, 30, 44, 32, P.navy);             // toast slots
    rect(g, 15, 34, 16, 50, P.crm);              // side sheen
    rrect(g, 44, 40, 49, 48, 1, P.dgy);          // lever
    disc(g, 20, 50, 2, P.red);                   // dial
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 46, 2.8, 1.2);
    blush(g, CX - 13, 43); blush(g, CX + 13, 43);
  }});

  S.push({ name: 'cherry', draw(g) {             // 櫻桃 jing1 tou4
    stroke(g, [[24, 40], [26, 20], [CX, 14]], 1.4, 1.1, P.grn); // left stem
    stroke(g, [[42, 40], [39, 20], [CX, 14]], 1.4, 1.1, P.grn); // right stem
    ellipse(g, 40, 14, 6, 3.2, P.lim);           // leaf
    ball(g, 22, 44, 12, 12, P.red, P.plum, P.pnk); // left cherry
    ball(g, 44, 44, 12, 12, P.red, P.plum, P.pnk); // right cherry
    disc(g, 18, 40, 2.4, P.crm);                 // sheen
    eyes(g, 22, 44, 6);
    smileArc(g, 22, 49, 2.4, 1.1);
    blush(g, 15, 47); blush(g, 29, 47);
  }});

  S.push({ name: 'fountain', draw(g) {           // 噴泉 pan3 cyun4
    stroke(g, [[CX, 20], [26, 12], [24, 6]], 1.4, 1, P.sky); // water arc left
    stroke(g, [[CX, 20], [37, 12], [39, 6]], 1.4, 1, P.sky); // water arc right
    disc(g, 24, 6, 1.6, P.crm); disc(g, 39, 6, 1.6, P.crm); // droplets
    ball(g, CX, 22, 8, 5, P.lgy, P.lav);         // top tier basin
    ellipse(g, CX, 20, 6, 2, P.sky);             // top water
    rect(g, 29, 26, 34, 42, P.lgy);              // center pillar
    ellipse(g, CX, 48, 24, 9, P.lav);            // pool bowl (shadow)
    ellipse(g, CX, 44, 23, 7, P.lgy);            // pool rim
    ellipse(g, CX, 45, 18, 4, P.sky);            // water in pool
    eyes(g, CX, 50, 7);
    smileArc(g, CX, 55, 2.8, 1.2);
    blush(g, CX - 14, 52); blush(g, CX + 14, 52);
  }});

  S.push({ name: 'crystal', draw(g) {            // 晶 zing1
    tri(g, 16, 26, 47, 26, CX, 58, P.lav);       // lower point (shadow)
    tri(g, 18, 26, 45, 26, CX, 55, P.sky);       // lower point
    tri(g, 16, 26, 24, 12, 32, 26, P.sky);       // top-left facet
    tri(g, 47, 26, 39, 12, 32, 26, P.lav);       // top-right facet
    rect(g, 24, 12, 39, 26, P.sky);              // crown
    stroke(g, [[CX, 26], [CX, 52]], 0.8, 0.8, P.lav); // center ridge
    disc(g, 22, 20, 1.6, P.crm); disc(g, 40, 46, 1.4, P.crm); // sparkles
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 38, 2.6, 1.1);
    blush(g, CX - 11, 36); blush(g, CX + 11, 36);
  }});

  S.push({ name: 'shop', draw(g) {               // 行 hong4
    rrect(g, 10, 24, 53, 56, 2, P.lgy);          // building shadow
    rrect(g, 10, 24, 51, 54, 2, P.crm);          // building
    rect(g, 10, 20, 53, 26, P.plum);             // awning back
    for (let i = 0; i < 6; i++) { const x = 11 + i * 7; tri(g, x, 26, x + 7, 26, x + 3.5, 31, i % 2 ? P.crm : P.red); } // scalloped awning
    rect(g, 27, 38, 36, 54, P.brn);              // door
    disc(g, 34, 46, 1, P.yel);                   // knob
    rect(g, 15, 34, 23, 42, P.sky); rect(g, 40, 34, 48, 42, P.sky); // windows
    eyes(g, CX, 32, 5);
    smileArc(g, CX, 35, 2, 0.9);
    blush(g, 24, 34); blush(g, 39, 34);
  }});

  S.push({ name: 'bookstore', draw(g) {          // 書店 syu1 dim3
    rrect(g, 14, 44, 50, 54, 1, P.red);          // bottom book
    rect(g, 14, 44, 17, 54, P.plum);             // spine shade
    rrect(g, 12, 34, 48, 44, 1, P.sky);          // middle book
    rect(g, 12, 34, 15, 44, P.lav);
    rrect(g, 16, 24, 52, 34, 1, P.lim);          // top book
    rect(g, 16, 24, 19, 34, P.grn);
    rrect(g, 24, 14, 40, 24, 1, P.crm);          // open book sign on top
    stroke(g, [[CX, 14], [CX, 24]], 0.8, 0.8, P.lgy); // book spine
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 33, 2, 0.9);
    blush(g, 25, 32); blush(g, 38, 32);
  }});

  S.push({ name: 'biscuit', draw(g) {            // 餅乾 beng2 gon1
    ball(g, CX, 34, 19, 18, P.org, P.brn, P.yel); // cookie
    disc(g, 22, 26, 2, P.brn); disc(g, 40, 24, 2, P.brn); // chips
    disc(g, 44, 40, 2, P.brn); disc(g, 20, 42, 2, P.brn);
    disc(g, CX, 20, 1.8, P.brn);
    eyes(g, CX, 34, 7);
    smileArc(g, CX, 41, 3, 1.3);
    blush(g, CX - 13, 39); blush(g, CX + 13, 39);
  }});

  S.push({ name: 'stadium', draw(g) {            // 球場 kau4 coeng4
    stroke(g, [[14, 16], [14, 8]], 1, 1, P.dgy); disc(g, 14, 7, 3, P.yel); // light tower L
    stroke(g, [[49, 16], [49, 8]], 1, 1, P.dgy); disc(g, 49, 7, 3, P.yel); // light tower R
    ellipse(g, CX, 40, 26, 18, P.lav);           // stands (shadow)
    ellipse(g, CX, 38, 25, 17, P.lgy);           // stands
    ellipse(g, CX, 39, 17, 11, P.grn);           // field shadow
    ellipse(g, CX, 38, 16, 10, P.lim);           // field
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 43, 2.6, 1.2);
    blush(g, 20, 40); blush(g, 43, 40);
  }});

  S.push({ name: 'wig', draw(g) {                // 假髮 gaa2 faat3
    ball(g, CX, 26, 19, 16, P.brn, P.plum);      // hair mass
    for (let i = 0; i < 7; i++) { const x = 14 + i * 6; disc(g, x, 40, 4, P.brn); } // curly fringe
    disc(g, 14, 28, 5, P.brn); disc(g, 49, 28, 5, P.brn); // side curls
    ellipse(g, 22, 18, 5, 3, P.plum);            // parting sheen
    ellipse(g, CX, 34, 12, 9, P.pch);            // mannequin face
    ellipse(g, CX, 22, 13, 4, P.brn);            // bangs
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.4, 1.1);
    blush(g, CX - 10, 38); blush(g, CX + 10, 38);
  }});

  S.push({ name: 'grill', draw(g) {              // 烤架 haau1 gaa2
    ellipse(g, CX, 40, 22, 14, P.dgy);           // grill bowl (shadow)
    ellipse(g, CX, 37, 21, 13, P.lgy);           // grate plate
    for (let i = 0; i < 5; i++) rect(g, 12 + i * 9, 26, 13 + i * 9, 48, P.dgy); // grate bars
    ellipse(g, 24, 30, 3, 2, P.red); ellipse(g, 40, 44, 3, 2, P.org); // glowing coals
    ball(g, 12, 22, 3, 2, P.lgy); ball(g, 51, 22, 3, 2, P.lgy); // handles
    eyes(g, CX, 36, 7);
    smileArc(g, CX, 42, 2.8, 1.2);
    blush(g, CX - 14, 39); blush(g, CX + 14, 39);
  }});

  S.push({ name: 'cheeseburger', draw(g) {       // 芝士漢堡包 zi1 si6 hon3 bou2 baau1
    ball(g, CX, 22, 19, 10, P.org, P.brn, P.yel); // top bun
    for (let i = 0; i < 8; i++) { const th = i / 8 * Math.PI * 2; disc(g, CX + Math.cos(th) * 10, 18 + Math.sin(th) * 4, 0.9, P.crm); } // sesame
    rect(g, 13, 30, 50, 33, P.lim);              // lettuce
    for (let x = 14; x < 50; x += 4) g.set(x, 34, P.lim);
    tri(g, 20, 33, 30, 33, 25, 39, P.yel);       // cheese corner
    tri(g, 34, 33, 44, 33, 39, 39, P.yel);       // cheese corner
    rrect(g, 15, 35, 48, 43, 2, P.brn);          // patty
    rrect(g, 13, 43, 50, 52, 4, P.org);          // bottom bun
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 27, 2.4, 1.1);
    blush(g, 20, 25); blush(g, 43, 25);
  }});

  S.push({ name: 'kite', draw(g) {               // 紙鳶 zi2 jyun1
    tri(g, CX, 8, 12, 30, CX, 30, P.sky);        // upper-left
    tri(g, CX, 8, 51, 30, CX, 30, P.lav);        // upper-right
    tri(g, 12, 30, CX, 52, CX, 30, P.pnk);       // lower-left
    tri(g, 51, 30, CX, 52, CX, 30, P.plum);      // lower-right
    stroke(g, [[CX, 52], [26, 56], [37, 60], [28, 63]], 1, 0.8, P.brn); // tail
    ball(g, 26, 56, 2.4, 2, P.red); ball(g, 37, 60, 2.4, 2, P.yel); ball(g, 28, 63, 2.4, 2, P.lim); // bows
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.4, 1.1);
    blush(g, 22, 30); blush(g, 41, 30);
  }});

  S.push({ name: 'king', draw(g) {               // 王 wong4
    ball(g, CX, 50, 14, 11, P.red, P.plum);      // robe
    ellipse(g, CX, 50, 8, 8, P.yel);             // medallion band
    ball(g, 19, 52, 3.2, 2.6, P.pch, P.brn); ball(g, 44, 52, 3.2, 2.6, P.pch, P.brn); // hands
    rect(g, 20, 12, 43, 20, P.yel);              // crown band
    tri(g, 20, 12, 27, 12, 23.5, 4, P.yel); tri(g, 28, 12, 35, 12, CX, 3, P.yel); tri(g, 36, 12, 43, 12, 39.5, 4, P.yel); // crown points
    disc(g, 23.5, 5, 1.4, P.red); disc(g, CX, 4, 1.4, P.sky); disc(g, 39.5, 5, 1.4, P.grn); // jewels
    ball(g, CX, 29, 12, 11, P.pch, P.brn);       // face
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 2.4, 1.1);
    blush(g, CX - 9, 33); blush(g, CX + 9, 33);
  }});

  S.push({ name: 'scooter', draw(g) {            // 踏板車 daap6 baan2 ce1
    disc(g, 16, 48, 8, P.navy); disc(g, 16, 48, 6, P.dgy); disc(g, 16, 48, 2, P.lgy); // rear wheel
    disc(g, 48, 48, 8, P.navy); disc(g, 48, 48, 6, P.dgy); disc(g, 48, 48, 2, P.lgy); // front wheel
    rrect(g, 16, 44, 48, 48, 1, P.red);          // deck
    stroke(g, [[48, 46], [48, 14]], 2, 1.6, P.red); // stem
    rect(g, 40, 12, 56, 15, P.dgy);              // handlebar
    ball(g, 40, 13, 2, 2, P.plum); ball(g, 56, 13, 2, 2, P.plum); // grips
    eyes(g, 30, 38, 5);
    smileArc(g, 30, 42, 2, 1);
    blush(g, 25, 41); blush(g, 35, 41);
  }});

  S.push({ name: 'earring', draw(g) {            // 耳環 ji5 waan2
    disc(g, CX, 8, 2.4, P.lgy);                  // ear hook top
    for (let a = 0; a < 18; a++) { const th = a / 18 * Math.PI * 2; disc(g, CX + Math.cos(th) * 11, 24 + Math.sin(th) * 11, 2.2, P.yel); } // gold hoop
    stroke(g, [[CX, 35], [CX, 38]], 1, 1, P.yel); // link to gem
    ball(g, CX, 47, 9, 10, P.sky, P.lav, P.crm); // gem drop (face)
    eyes(g, CX, 47, 6);
    smileArc(g, CX, 53, 2.4, 1.1);
    blush(g, CX - 10, 50); blush(g, CX + 10, 50);
  }});

  S.push({ name: 'onion', draw(g) {              // 洋蔥 joeng4 cung1
    stroke(g, [[27, 20], [23, 6]], 1.3, 0.9, P.lim); // sprouts
    stroke(g, [[CX, 20], [CX, 3]], 1.3, 0.9, P.grn);
    stroke(g, [[36, 20], [40, 6]], 1.3, 0.9, P.lim);
    ball(g, CX, 38, 17, 18, P.pch, P.brn);       // bulb
    tri(g, 26, 22, 37, 22, CX, 16, P.pch);       // pointed neck
    clipTo(g, [P.pch, P.brn], function () {      // papery ribs
      stroke(g, [[CX, 20], [18, 52]], 0.8, 0.8, P.brn);
      stroke(g, [[CX, 20], [26, 54]], 0.8, 0.8, P.brn);
      stroke(g, [[CX, 20], [37, 54]], 0.8, 0.8, P.brn);
      stroke(g, [[CX, 20], [45, 52]], 0.8, 0.8, P.brn);
    });
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 45, 3, 1.3);
    blush(g, CX - 13, 42); blush(g, CX + 13, 42);
  }});

  S.push({ name: 'pasta', draw(g) {              // 意粉 ji3 fan2
    stroke(g, [[18, 30], [16, 20]], 1.2, 1, P.lgy); // fork stem
    disc(g, 16, 18, 2, P.lgy); rect(g, 13, 14, 19, 18, P.lgy); // fork head
    for (let i = 0; i < 5; i++) { const x = 20 + i * 6; stroke(g, [[x, 30], [x + 2, 22], [x - 1, 16]], 1, 1, P.yel); } // twirled strands
    ellipse(g, CX, 34, 21, 10, P.yel);           // noodle pile
    clipTo(g, [P.yel], function () { for (let k = 0; k < 6; k++) stroke(g, [[16 + k * 7, 28], [20 + k * 7, 40]], 0.8, 0.8, P.org); }); // strand lines
    ellipse(g, 24, 20, 2.4, 1.6, P.red);         // tomato
    ellipse(g, CX, 44, 22, 9, P.lav);            // bowl shadow
    ellipse(g, CX, 42, 21, 8, P.sky);            // bowl
    eyes(g, CX, 44, 7);
    smileArc(g, CX, 50, 2.8, 1.2);
    blush(g, CX - 14, 47); blush(g, CX + 14, 47);
  }});

  S.push({ name: 'twins', draw(g) {              // 孖 maa1
    ball(g, 20, 50, 9, 8, P.sky, P.lav);         // baby A body
    ball(g, 43, 50, 9, 8, P.pnk, P.plum);        // baby B body
    ball(g, 20, 30, 12, 12, P.pch, P.brn);       // baby A head
    ball(g, 43, 30, 12, 12, P.pch, P.brn);       // baby B head
    ellipse(g, 20, 22, 9, 4, P.brn); disc(g, 20, 20, 2, P.brn); // A curl
    ellipse(g, 43, 22, 9, 4, P.yel); disc(g, 43, 20, 2, P.yel); // B curl
    eyes(g, 20, 31, 5); eyes(g, 43, 31, 5);
    smileArc(g, 20, 36, 2, 1); smileArc(g, 43, 36, 2, 1);
    blush(g, 14, 34); blush(g, 26, 34);
    blush(g, 37, 34); blush(g, 49, 34);
  }});

  S.push({ name: 'net', draw(g) {
    stroke(g, [[44, 50], [52, 58]], 2, 2, P.brn);         // handle
    ball(g, CX, 30, 17, 16, P.lav, P.dgy);                // net bag
    ellipse(g, CX, 31, 13, 12, P.crm);                    // mesh field
    clipTo(g, [P.crm], function () {                      // net grid
      for (let x = 16; x <= 48; x += 4) stroke(g, [[x, 16], [x + 3, 46]], 0.7, 0.7, P.dgy);
      for (let x = 16; x <= 48; x += 4) stroke(g, [[x, 16], [x - 3, 46]], 0.7, 0.7, P.dgy);
    });
    ellipse(g, CX, 15, 15, 3.5, P.lgy);                   // hoop rim
    eyes(g, CX, 31, 7);
    smileArc(g, CX, 38, 3, 1.3);
    blush(g, CX - 12, 35); blush(g, CX + 12, 35);
  }});

  S.push({ name: 'emerald', draw(g) {
    tri(g, 14, 26, CX, 10, 49, 26, P.lim);                // crown
    tri(g, 15, 26, 48, 26, CX, 54, P.grn);                // pavilion (shadow)
    tri(g, 18, 26, 45, 26, CX, 49, P.lim);                // pavilion light
    stroke(g, [[14, 26], [49, 26]], 0.8, 0.8, P.grn);     // girdle
    stroke(g, [[24, 26], [CX, 49]], 0.8, 0.8, P.grn);     // facet lines
    stroke(g, [[39, 26], [CX, 49]], 0.8, 0.8, P.grn);
    stroke(g, [[CX, 10], [24, 26]], 0.8, 0.8, P.grn);
    stroke(g, [[CX, 10], [39, 26]], 0.8, 0.8, P.grn);
    g.set(22, 17, P.crm); g.set(23, 17, P.crm); g.set(22, 18, P.crm); // sparkle
    eyes(g, CX, 31, 6);
    smileArc(g, CX, 37, 2.4, 1.1);
    blush(g, CX - 10, 34); blush(g, CX + 10, 34);
  }});

  S.push({ name: 'panther', draw(g) {
    disc(g, 21, 12, 5, P.yel); disc(g, 21, 12, 2.5, P.org);   // ears
    disc(g, 42, 12, 5, P.yel); disc(g, 42, 12, 2.5, P.org);
    stroke(g, [[42, 52], [48, 50], [50, 45]], 1.8, 1.6, P.yel); // tail
    ball(g, CX, 48, 10, 8, P.yel, P.org);                 // body
    ball(g, 25, 56, 4, 3, P.yel, P.org);                  // feet
    ball(g, 38, 56, 4, 3, P.yel, P.org);
    ball(g, CX, 25, 15, 13, P.yel, P.org);                // head
    clipTo(g, [P.yel, P.org], function () {               // rosette spots (ring + centre)
      const spot = (x, y) => { disc(g, x, y, 2.4, P.brn); disc(g, x, y, 1.1, P.yel); disc(g, x, y, 0.6, P.brn); };
      spot(19, 18); spot(44, 18); spot(16, 30); spot(47, 30);
      spot(21, 50); spot(42, 50); spot(CX, 46);
    });
    ball(g, CX, 31, 5.5, 4, P.crm, P.lgy);                // muzzle
    rect(g, 30, 28, 33, 29, P.pnk);                       // nose
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 32, 2.6, 1);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

  S.push({ name: 'typewriter', draw(g) {
    rect(g, 25, 6, 39, 20, P.crm);                        // paper
    rect(g, 25, 6, 26, 20, P.lgy);                        // paper shade
    rrect(g, 16, 18, 47, 28, 3, P.plum);                  // roller (shade)
    rrect(g, 16, 18, 45, 26, 3, P.red);                   // roller
    rrect(g, 14, 26, 49, 52, 4, P.plum);                  // body shadow
    rrect(g, 14, 26, 47, 50, 4, P.red);                   // body
    for (let ky = 0; ky < 2; ky++) for (let kx = 0; kx < 5; kx++)
      disc(g, 20 + kx * 6, 42 + ky * 5, 1.8, P.crm);      // keys
    eyes(g, CX, 33, 7);
    smileArc(g, CX, 38, 3, 1.1);
    blush(g, CX - 14, 36); blush(g, CX + 14, 36);
  }});

  S.push({ name: 'thermometer', draw(g) {
    rrect(g, 28, 8, 36, 44, 4, P.lgy);                    // tube shade
    rrect(g, 28, 8, 35, 44, 4, P.crm);                    // tube
    rect(g, 31, 12, 33, 40, P.red);                       // column
    ball(g, CX, 48, 8, 8, P.red, P.plum);                 // bulb
    rect(g, 36, 16, 38, 16, P.lgy); rect(g, 36, 22, 38, 22, P.lgy);
    rect(g, 36, 28, 38, 28, P.lgy); rect(g, 36, 34, 38, 34, P.lgy); // ticks
    eyes(g, CX, 47, 5.5);
    smileArc(g, CX, 52, 2.4, 1.1);
    blush(g, CX - 6, 50); blush(g, CX + 6, 50);
  }});

  S.push({ name: 'chopsticks', draw(g) {
    stroke(g, [[10, 10], [30, 40]], 2.2, 1.2, P.org);     // left stick
    stroke(g, [[24, 8], [34, 40]], 2.2, 1.2, P.org);      // right stick
    stroke(g, [[10, 10], [30, 40]], 1.1, 0.6, P.yel);     // stick sheen
    ball(g, 34, 46, 11, 9, P.crm, P.lgy);                 // dumpling
    g.set(28, 40, P.lgy); g.set(34, 39, P.lgy); g.set(40, 40, P.lgy); // pleats
    eyes(g, 34, 46, 6);
    smileArc(g, 34, 51, 2.6, 1.1);
    blush(g, 26, 49); blush(g, 42, 49);
  }});

  S.push({ name: 'nut', draw(g) {
    stroke(g, [[CX, 10], [CX, 6]], 1.4, 1, P.brn);        // stem
    ball(g, CX, 22, 15, 10, P.org, P.brn);                // cap
    clipTo(g, [P.org, P.brn], function () {               // cap texture
      for (let x = 18; x <= 45; x += 4) rect(g, x, 14, x, 29, P.brn);
      for (let y = 16; y <= 28; y += 4) rect(g, 18, y, 45, y, P.brn);
    });
    ball(g, CX, 40, 13, 15, P.brn, P.plum);               // nut body
    ellipse(g, 25, 36, 2.6, 3.4, P.org);                  // highlight
    eyes(g, CX, 42, 7);
    smileArc(g, CX, 49, 2.8, 1.2);
    blush(g, CX - 11, 46); blush(g, CX + 11, 46);
  }});

  S.push({ name: 'brush', draw(g) {
    rrect(g, 12, 20, 52, 34, 6, P.lav);                   // handle shade
    rrect(g, 12, 20, 52, 32, 6, P.sky);                   // handle
    rect(g, 16, 24, 21, 26, P.crm);                       // sheen
    for (let x = 15; x <= 49; x += 4) stroke(g, [[x, 34], [x, 51]], 1.6, 1.1, P.yel); // bristles
    for (let x = 17; x <= 47; x += 4) stroke(g, [[x, 35], [x, 50]], 0.7, 0.7, P.org); // bristle gaps
    rect(g, 14, 34, 51, 36, P.org);                       // bristle root
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 29, 2.8, 1.1);
    blush(g, CX - 13, 27); blush(g, CX + 13, 27);
  }});

  S.push({ name: 'coconut', draw(g) {
    tri(g, 28, 8, 24, 0, 20, 8, P.lim);                   // leaf sprouts
    tri(g, 35, 8, 39, 0, 43, 8, P.lim);
    stroke(g, [[26, 10], [24, 4]], 1, 1, P.grn);
    stroke(g, [[37, 10], [39, 4]], 1, 1, P.grn);
    ball(g, CX, 34, 17, 16, P.brn, P.plum);               // coconut
    clipTo(g, [P.brn, P.plum], function () {              // fibrous flecks
      for (let i = 0; i < 40; i++) { const a = i * 2.4; disc(g, CX + Math.cos(a) * 11, 34 + Math.sin(a) * 10, 0.6, P.plum); }
    });
    ellipse(g, 22, 26, 2.6, 3.4, P.org);                  // highlight
    eyes(g, CX, 34, 8);
    smileArc(g, CX, 42, 3, 1.4);
    blush(g, CX - 13, 39); blush(g, CX + 13, 39);
  }});

  S.push({ name: 'shield', draw(g) {
    rrect(g, 14, 12, 49, 40, 6, P.lav);                   // shadow
    rrect(g, 14, 12, 47, 38, 6, P.sky);                   // body
    tri(g, 14, 36, 49, 36, CX, 58, P.lav);                // point shadow
    tri(g, 14, 34, 47, 34, CX, 55, P.sky);                // point
    rect(g, 14, 12, 47, 15, P.crm);                       // top trim
    ball(g, CX, 20, 3, 3, P.yel, P.org);                  // gold boss
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 39, 3, 1.3);
    blush(g, CX - 12, 36); blush(g, CX + 12, 36);
  }});

  S.push({ name: 'loaf', draw(g) {
    ball(g, CX, 34, 20, 13, P.brn, P.plum);               // domed crust
    rrect(g, 12, 34, 51, 52, 4, P.brn);                   // loaf base
    rect(g, 12, 50, 51, 52, P.plum);                      // base shade
    ellipse(g, CX, 30, 17, 8, P.org);                     // light crust
    stroke(g, [[22, 24], [18, 34]], 1, 1, P.brn);         // score marks
    stroke(g, [[31, 22], [28, 34]], 1, 1, P.brn);
    stroke(g, [[40, 24], [38, 34]], 1, 1, P.brn);
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 46, 3, 1.3);
    blush(g, CX - 14, 43); blush(g, CX + 14, 43);
  }});

  S.push({ name: 'plum', draw(g) {
    stroke(g, [[34, 14], [38, 7]], 1, 1, P.brn);          // stem
    tri(g, 38, 10, 50, 6, 46, 14, P.lim);                 // leaf
    stroke(g, [[38, 10], [48, 8]], 0.8, 0.8, P.grn);
    ball(g, CX, 36, 17, 17, P.plum, P.navy, P.pnk);       // plum
    stroke(g, [[CX, 19], [CX, 30]], 0.8, 0.8, P.navy);    // cleft
    eyes(g, CX, 36, 7);
    smileArc(g, CX, 43, 3, 1.4);
    blush(g, CX - 12, 40); blush(g, CX + 12, 40);
  }});

  S.push({ name: 'pajamas', draw(g) {
    ball(g, 15, 26, 4, 6, P.sky, P.lav);                  // sleeves
    ball(g, 48, 26, 4, 6, P.sky, P.lav);
    ball(g, 24, 54, 5, 4, P.sky, P.lav);                  // footies
    ball(g, 39, 54, 5, 4, P.sky, P.lav);
    rrect(g, 18, 18, 45, 50, 6, P.lav);                   // torso shade
    rrect(g, 18, 18, 43, 48, 6, P.sky);                   // torso
    rect(g, 21, 18, 42, 21, P.crm);                       // collar
    for (let y = 40; y <= 46; y += 3) disc(g, CX, y, 1.2, P.yel); // buttons
    ball(g, 23, 38, 1.4, 1.4, P.crm); ball(g, 40, 40, 1.4, 1.4, P.crm); // stars
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 33, 2.6, 1.1);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

  S.push({ name: 'omelet', draw(g) {
    ball(g, CX, 36, 20, 13, P.yel, P.org, P.crm);         // folded egg
    ellipse(g, CX, 46, 20, 5, P.yel);                     // lower edge
    stroke(g, [[16, 34], [30, 44], [48, 34]], 1, 1, P.org); // fold seam
    disc(g, 22, 30, 1.2, P.lim); disc(g, 40, 32, 1.2, P.lim); // chives
    disc(g, 33, 27, 1.4, P.red);                          // ketchup dot
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 44, 2.8, 1.2);
    blush(g, CX - 13, 41); blush(g, CX + 13, 41);
  }});

  S.push({ name: 'throne', draw(g) {
    rrect(g, 20, 6, 43, 40, 5, P.org);                    // back shade
    rrect(g, 20, 6, 41, 38, 5, P.yel);                    // back cushion
    ball(g, CX, 8, 3, 3, P.red, P.plum);                  // jewel finial
    rrect(g, 12, 34, 20, 52, 3, P.org);                   // arms
    rrect(g, 43, 34, 51, 52, 3, P.org);
    ball(g, 16, 34, 3, 3, P.yel, P.org); ball(g, 47, 34, 3, 3, P.yel, P.org); // arm knobs
    rrect(g, 16, 40, 47, 54, 3, P.red);                   // seat
    rect(g, 16, 52, 47, 54, P.plum);                      // seat shade
    eyes(g, CX, 22, 7);
    smileArc(g, CX, 28, 3, 1.3);
    blush(g, CX - 12, 25); blush(g, CX + 12, 25);
  }});

  S.push({ name: 'speaker', draw(g) {
    rrect(g, 16, 8, 47, 56, 5, P.dgy);                    // cabinet shade
    rrect(g, 16, 8, 45, 54, 5, P.lgy);                    // cabinet
    rect(g, 18, 10, 20, 52, P.crm);                       // side sheen
    disc(g, CX, 44, 10, P.dgy);                           // woofer
    disc(g, CX, 44, 6.5, P.lav);
    disc(g, CX, 44, 2.5, P.dgy);
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 28, 2.8, 1.2);
    blush(g, CX - 12, 26); blush(g, CX + 12, 26);
  }});

  S.push({ name: 'torch', draw(g) {
    rrect(g, 28, 34, 35, 58, 3, P.brn);                   // handle
    rect(g, 28, 34, 29, 58, P.plum);                      // handle shade
    ellipse(g, CX, 34, 8, 4, P.dgy);                      // head band
    ball(g, CX, 20, 11, 14, P.org, P.red);                // outer flame
    ball(g, CX, 22, 6.5, 9, P.yel, P.org);                // inner flame
    tri(g, 26, 10, 37, 10, CX, 2, P.org);                 // flame tip
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 28, 2.6, 1.1);
    blush(g, CX - 9, 26); blush(g, CX + 9, 26);
  }});

  S.push({ name: 'saxophone', draw(g) {
    stroke(g, [[30, 10], [34, 14]], 2, 2, P.dgy);         // mouthpiece
    stroke(g, [[33, 14], [36, 32], [33, 44]], 4, 4, P.brn); // tube shade
    stroke(g, [[33, 14], [36, 32], [33, 44]], 3, 3, P.yel); // tube
    ball(g, 26, 46, 12, 11, P.org, P.brn, P.yel);         // bell
    ellipse(g, 26, 40, 9, 3, P.yel);                      // bell rim
    disc(g, 37, 24, 1.4, P.lgy); disc(g, 38, 30, 1.4, P.lgy); disc(g, 37, 36, 1.4, P.lgy); // keys
    eyes(g, 26, 46, 6);
    smileArc(g, 26, 52, 2.6, 1.1);
    blush(g, 17, 50); blush(g, 35, 50);
  }});

  S.push({ name: 'blender', draw(g) {
    rrect(g, 17, 47, 46, 58, 3, P.dgy);                  // wide motor base
    rect(g, 17, 47, 46, 49, P.lav);                      // base rim
    disc(g, 39, 53, 2, P.red);                           // dial button
    rect(g, 22, 30, 24, 46, P.lav);                      // jar side shade
    rrect(g, 22, 15, 41, 47, 4, P.lgy);                  // jar
    tri(g, 40, 16, 46, 18, 40, 22, P.lgy);               // pour spout
    rrect(g, 24, 33, 39, 46, 3, P.pnk);                  // smoothie
    tri(g, 27, 43, 36, 43, 31.5, 37, P.crm);             // blade glint
    rrect(g, 21, 12, 42, 16, 2, P.sky);                  // lid
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 31, 2.4, 1);
    blush(g, CX - 9, 29); blush(g, CX + 9, 29);
  }});

  S.push({ name: 'raven', draw(g) {
    stroke(g, [[40, 48], [50, 52], [54, 50]], 3, 1.5, P.dgy); // tail
    ball(g, CX, 46, 11, 9, P.dgy, P.blk);                // body
    ellipse(g, CX, 48, 5, 6, P.lav);                     // breast sheen
    ball(g, 43, 44, 4.5, 7, P.dgy, P.blk);               // folded wing
    ball(g, 25, 57, 3, 2, P.org, P.brn);                 // feet
    ball(g, 38, 57, 3, 2, P.org, P.brn);
    ball(g, CX, 24, 12, 11, P.dgy, P.blk);               // head
    tri(g, 27, 27, 36, 27, 31.5, 33, P.org);             // beak
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 34, 2, 0.8);
    blush(g, CX - 9, 29); blush(g, CX + 9, 29);
  }});

  S.push({ name: 'mango', draw(g) {
    stroke(g, [[34, 14], [37, 10], [41, 8]], 1.4, 1, P.brn); // stem
    tri(g, 37, 12, 47, 8, 44, 16, P.grn);                // leaf
    ball(g, CX, 34, 15, 17, P.org, P.brn, P.yel);        // plump mango
    ellipse(g, 25, 26, 4, 5, P.yel);                     // sun blush
    eyes(g, CX, 33, 7);
    smileArc(g, CX, 40, 3, 1.2);
    blush(g, CX - 11, 38); blush(g, CX + 11, 38);
  }});

  S.push({ name: 'bakery', draw(g) {
    rrect(g, 15, 24, 48, 57, 3, P.lav);                  // wall shadow
    rrect(g, 15, 24, 46, 55, 3, P.crm);                  // wall
    rect(g, 27, 46, 36, 55, P.brn);                      // door
    ellipse(g, 34, 51, 1, 1, P.yel);                     // knob
    rrect(g, 12, 22, 49, 30, 2, P.red);                  // awning
    clipTo(g, [P.red], () => { for (let x = 15; x <= 47; x += 7) rect(g, x, 22, x + 3, 30, P.crm); });
    for (let x = 12; x <= 48; x += 6) tri(g, x, 30, x + 6, 30, x + 3, 34, P.red); // scalloped hem
    ball(g, CX, 15, 8, 5, P.org, P.brn, P.yel);          // bread loaf sign
    for (let i = -2; i <= 2; i++) g.set(31 + i * 2, 13, P.brn); // scored top
    eyes(g, CX, 39, 6);
    smileArc(g, CX, 44, 2.6, 1.1);
    blush(g, CX - 11, 42); blush(g, CX + 11, 42);
  }});

  S.push({ name: 'cranberry', draw(g) {
    stroke(g, [[34, 20], [38, 14], [43, 11]], 1.4, 1, P.brn); // stem
    tri(g, 38, 16, 48, 12, 45, 20, P.grn);               // leaf
    ball(g, 24, 40, 8, 8, P.red, P.plum, P.pnk);         // back berry
    ball(g, 41, 42, 8, 8, P.red, P.plum, P.pnk);         // side berry
    ball(g, CX, 36, 11, 11, P.red, P.plum, P.pnk);       // front berry
    eyes(g, CX, 35, 6);
    smileArc(g, CX, 41, 2.6, 1.1);
    blush(g, CX - 9, 39); blush(g, CX + 9, 39);
  }});

  S.push({ name: 'pigeon', draw(g) {
    stroke(g, [[40, 50], [50, 52], [53, 49]], 3, 1.5, P.lgy); // tail
    ball(g, CX, 45, 12, 10, P.lgy, P.lav);               // plump body
    ellipse(g, CX, 40, 7, 6, P.lav);                     // neck sheen
    disc(g, 28, 39, 1.6, P.pnk); disc(g, 35, 39, 1.6, P.grn); // iridescence
    ball(g, 43, 44, 5, 7, P.lgy, P.lav);                 // wing
    ball(g, 25, 57, 3, 2, P.pnk, P.red);                 // feet
    ball(g, 38, 57, 3, 2, P.pnk, P.red);
    ball(g, CX, 24, 10, 9, P.lgy, P.lav);                // head
    tri(g, 28, 26, 35, 26, 31.5, 31, P.org);             // beak
    disc(g, 31.5, 22, 1.4, P.crm);                       // cere
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 32, 2, 0.8);
    blush(g, CX - 8, 28); blush(g, CX + 8, 28);
  }});

  S.push({ name: 'screwdriver', draw(g) {
    rect(g, 29, 40, 34, 56, P.lgy);                      // long metal shaft
    rect(g, 29, 40, 30, 56, P.lav);                      // shaft shade
    rect(g, 28, 56, 35, 59, P.dgy);                      // flat-head tip
    rrect(g, 22, 10, 41, 40, 8, P.plum);                 // handle shadow
    rrect(g, 22, 10, 39, 38, 8, P.red);                  // handle
    ellipse(g, 31.5, 39, 4, 1.5, P.lgy);                 // metal ferrule
    rect(g, 23, 15, 38, 16, P.plum);                     // grip groove
    rect(g, 23, 33, 38, 34, P.plum);                     // grip groove
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 30, 2.4, 1);
    blush(g, CX - 10, 28); blush(g, CX + 10, 28);
  }});

  S.push({ name: 'oyster', draw(g) {
    ball(g, CX, 30, 17, 12, P.lav, P.plum);              // top shell
    clipTo(g, [P.lav, P.plum], () => { for (let i = -3; i <= 3; i++) stroke(g, [[CX, 30], [CX + i * 5, 19]], 1, 0.6, P.lgy); }); // fan ridges
    ball(g, CX, 44, 18, 10, P.lgy, P.lav);               // bottom shell
    ellipse(g, CX, 44, 14, 6, P.pch);                    // pearly inside
    disc(g, CX, 48, 3.5, P.crm);                         // pearl
    g.set(30, 47, P.crm);                                // pearl shine
    eyes(g, CX, 42, 5);
    smileArc(g, CX, 46, 2.4, 0.9);
    blush(g, CX - 12, 44); blush(g, CX + 12, 44);
  }});

  S.push({ name: 'cello', draw(g) {
    rect(g, 30, 4, 33, 26, P.brn);                       // neck
    rect(g, 30, 4, 31, 26, P.org);                       // neck light edge
    ball(g, CX, 8, 3.5, 4, P.dgy);                       // scroll
    ball(g, CX, 30, 11, 9, P.brn, P.plum, P.org);        // upper bout
    ball(g, CX, 44, 14, 12, P.brn, P.plum, P.org);       // lower bout
    rect(g, 22, 36, 41, 40, P.brn);                      // waist join
    clipTo(g, [P.brn, P.plum, P.org], () => {            // f-holes
      rect(g, 24, 40, 24, 48, P.navy); rect(g, 39, 40, 39, 48, P.navy);
    });
    for (let sx = 29; sx <= 34; sx += 2) rect(g, sx, 16, sx, 38, P.crm); // strings
    rect(g, 30, 55, 33, 61, P.dgy);                      // endpin
    eyes(g, CX, 43, 6);
    smileArc(g, CX, 48, 2.4, 1);
    blush(g, CX - 10, 46); blush(g, CX + 10, 46);
  }});

  S.push({ name: 'fiddle', draw(g) {
    rect(g, 30, 6, 33, 26, P.brn);                       // neck
    ball(g, CX, 9, 3.2, 3.5, P.dgy);                     // scroll
    ball(g, CX, 32, 10, 8, P.org, P.brn, P.yel);         // upper bout
    ball(g, CX, 45, 12, 10, P.org, P.brn, P.yel);        // lower bout
    rect(g, 24, 38, 39, 42, P.org);                      // waist
    clipTo(g, [P.org, P.brn, P.yel], () => {             // f-holes
      rect(g, 26, 42, 26, 50, P.navy); rect(g, 37, 42, 37, 50, P.navy);
    });
    for (let sx = 29; sx <= 34; sx += 2) rect(g, sx, 18, sx, 38, P.crm); // strings
    stroke(g, [[16, 42], [52, 14]], 1.2, 1.2, P.crm);    // bow hair
    stroke(g, [[14, 44], [17, 40]], 1.8, 1.6, P.brn);    // bow frog
    eyes(g, CX, 45, 6);
    smileArc(g, CX, 50, 2.2, 1);
    blush(g, CX - 9, 48); blush(g, CX + 9, 48);
  }});

  S.push({ name: 'ski', draw(g) {
    rrect(g, 23, 7, 41, 58, 8, P.lav);                    // snowboard (shadow)
    rrect(g, 23, 7, 39, 56, 8, P.sky);                    // board face
    rect(g, 25, 12, 26, 52, P.crm);                       // highlight stripe
    rect(g, 24, 21, 39, 24, P.dgy);                       // top binding strap
    rect(g, 24, 41, 39, 44, P.dgy);                       // bottom binding strap
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.6, 1.2);
    blush(g, CX - 9, 36); blush(g, CX + 9, 36);
  }});

  S.push({ name: 'goggles', draw(g) {
    rect(g, 5, 28, 14, 33, P.dgy);                        // left strap
    rect(g, 49, 28, 58, 33, P.dgy);                       // right strap
    rrect(g, 12, 18, 51, 46, 10, P.plum);                 // frame (shadow)
    rrect(g, 12, 18, 49, 44, 10, P.red);                  // frame
    ball(g, 23, 30, 7.5, 7.5, P.sky, P.lav);              // left lens
    ball(g, 40, 30, 7.5, 7.5, P.sky, P.lav);              // right lens
    eye(g, 23, 31, 3.5); eye(g, 40, 31, 3.5);             // pupils in lenses
    smileArc(g, CX, 40, 3, 1.2);
    blush(g, 15, 38); blush(g, 48, 38);
  }});

  S.push({ name: 'bin', draw(g) {
    rrect(g, 16, 19, 47, 23, 2, P.lav);                   // lid (shadow)
    rrect(g, 15, 17, 48, 22, 2, P.lgy);                   // lid
    disc(g, CX, 14, 2.4, P.lgy);                          // lid knob
    rrect(g, 18, 24, 45, 57, 4, P.lav);                   // body shadow
    rrect(g, 18, 24, 43, 55, 4, P.lgy);                   // body
    rect(g, 24, 28, 25, 51, P.lav);                       // ridges
    rect(g, 31, 28, 32, 51, P.lav);
    rect(g, 38, 28, 39, 51, P.lav);
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 43, 2.6, 1.2);
    blush(g, CX - 10, 41); blush(g, CX + 10, 41);
  }});

  S.push({ name: 'weasel', draw(g) {
    stroke(g, [[44, 50], [52, 46], [55, 38]], 2.2, 1.4, P.brn); // long tail
    disc(g, 22, 13, 3.5, P.brn); disc(g, 22, 13, 1.8, P.pch);   // ears
    disc(g, 41, 13, 3.5, P.brn); disc(g, 41, 13, 1.8, P.pch);
    ball(g, CX, 46, 8, 13, P.brn, P.plum);               // long slinky body
    ellipse(g, CX, 48, 4.5, 9, P.crm);                   // cream belly
    ball(g, 25, 57, 3.2, 2.4, P.brn, P.plum);            // feet
    ball(g, 38, 57, 3.2, 2.4, P.brn, P.plum);
    ball(g, CX, 22, 11, 11, P.brn, P.plum);              // head
    ball(g, CX, 28, 4.5, 3.2, P.pch);                    // pointy snout
    ellipse(g, CX, 25.5, 1.6, 1.2, P.navy);              // nose
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 29, 2, 1);
    blush(g, CX - 9, 26); blush(g, CX + 9, 26);
  }});

  S.push({ name: 'classroom', draw(g) {
    rrect(g, 8, 12, 55, 48, 3, P.brn);                   // board frame
    rrect(g, 11, 15, 52, 45, 2, P.grn);                  // green board
    stroke(g, [[16, 22], [22, 20], [28, 23], [34, 20]], 1, 1, P.crm); // chalk scribble
    eyes(g, CX, 30, 7);
    smileArc(g, CX, 37, 3, 1.4);
    blush(g, CX - 12, 35); blush(g, CX + 12, 35);
    rect(g, 14, 48, 49, 51, P.brn);                      // chalk ledge
    ball(g, 44, 45, 3, 3.2, P.red, P.plum);              // apple on ledge
    rect(g, 44, 41, 44, 43, P.brn);                      // apple stem
    disc(g, 40, 49, 1.4, P.crm);                         // chalk stick
  }});

  S.push({ name: 'jaguar', draw(g) {
    disc(g, 21, 12, 5, P.org); disc(g, 21, 12, 2.5, P.pch); // ears
    disc(g, 42, 12, 5, P.org); disc(g, 42, 12, 2.5, P.pch);
    stroke(g, [[42, 52], [48, 50], [50, 45]], 1.8, 1.4, P.org); // tail
    ball(g, CX, 48, 10, 8, P.org, P.brn);                // body
    ellipse(g, CX, 49, 5.5, 6, P.crm);                   // belly
    ball(g, 25, 56, 4, 3, P.org, P.brn);                 // feet
    ball(g, 38, 56, 4, 3, P.org, P.brn);
    ball(g, CX, 25, 15, 13, P.org, P.brn, P.yel);        // head
    clipTo(g, [P.org, P.brn, P.yel], function () {       // rosette spots
      const spot = (x, y) => { disc(g, x, y, 2.2, P.plum); disc(g, x, y, 1, P.org); };
      spot(18, 21); spot(45, 21); spot(16, 31); spot(47, 31);
      spot(20, 43); spot(43, 43); spot(24, 18); spot(39, 18);
    });
    ball(g, CX, 31, 6, 4, P.crm, P.lgy);                 // muzzle
    rect(g, 30, 28, 33, 29, P.navy);                     // nose
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 32, 2.6, 1);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

  S.push({ name: 'iceberg', draw(g) {
    ball(g, CX, 48, 17, 9, P.sky, P.lav);                // underwater base
    tri(g, 32, 10, 14, 41, 50, 41, P.lgy);               // peak (shadow)
    tri(g, 32, 10, 17, 41, 47, 41, P.crm);               // peak (lit)
    rect(g, 20, 40, 44, 44, P.crm);                      // block below peak
    for (let x = 12; x <= 51; x++) g.set(x, 41 + Math.round(1.2 * Math.sin(x * 0.6)), P.sky); // waterline
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.6, 1.2);
    blush(g, CX - 9, 30); blush(g, CX + 9, 30);
  }});

  S.push({ name: 'orchid', draw(g) {
    stroke(g, [[CX, 52], [30, 44], [31, 38]], 2, 1.4, P.grn); // stem
    ellipse(g, 24, 50, 4, 2.2, P.lim); ellipse(g, 40, 50, 4, 2.2, P.lim); // leaves
    ball(g, CX, 14, 6, 6, P.pnk, P.plum);                // top petal
    ball(g, 17, 24, 6, 6, P.pnk, P.plum);                // left petal
    ball(g, 46, 24, 6, 6, P.pnk, P.plum);                // right petal
    ball(g, 22, 38, 5.5, 5.5, P.pnk, P.plum);            // lower-left petal
    ball(g, 41, 38, 5.5, 5.5, P.pnk, P.plum);            // lower-right petal
    ball(g, CX, 27, 10, 10, P.lav, P.plum);              // centre face
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.6, 1.2);
    blush(g, CX - 8, 30); blush(g, CX + 8, 30);
  }});

  S.push({ name: 'farmer', draw(g) {
    ball(g, CX, 49, 10, 8, P.sky, P.lav);                // denim overalls
    rect(g, 27, 42, 29, 50, P.sky); rect(g, 34, 42, 36, 50, P.sky); // bib straps
    ball(g, 26, 57, 4, 2.6, P.brn, P.dgy);               // boots
    ball(g, 37, 57, 4, 2.6, P.brn, P.dgy);
    ball(g, 21, 48, 3.2, 2.6, P.pch, P.brn);             // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 16, 18, 4, P.org);                    // straw brim (shadow)
    ellipse(g, CX, 15, 18, 4, P.yel);                    // straw brim
    ball(g, CX, 11, 8, 5, P.yel, P.org);                 // hat crown
    rect(g, 24, 12, 39, 13, P.org);                      // hat band
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

  S.push({ name: 'cloud', draw(g) {
    disc(g, 20, 34, 9, P.lgy); disc(g, 44, 34, 9, P.lgy); // shadow lobes
    disc(g, 30, 26, 11, P.lgy); disc(g, 40, 30, 8, P.lgy);
    disc(g, 20, 33, 8.5, P.crm); disc(g, 44, 33, 8.5, P.crm); // lit lobes
    disc(g, 30, 25, 10.5, P.crm); disc(g, 40, 29, 7.5, P.crm);
    ellipse(g, CX, 40, 20, 6, P.crm);                    // flat base
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 38, 3, 1.4);
    blush(g, CX - 12, 36); blush(g, CX + 12, 36);
  }});

  S.push({ name: 'lollipop', draw(g) {
    rect(g, 30, 34, 33, 58, P.lgy);                      // stick shadow
    rect(g, 30, 34, 32, 58, P.crm);                      // stick
    ball(g, CX, 24, 16, 16, P.red, P.plum);              // candy
    for (let a = 0; a < 36; a++) {                       // swirl
      const r = a * 0.34, th = a * 0.7;
      g.set(Math.round(CX + Math.cos(th) * r), Math.round(24 + Math.sin(th) * r), P.crm);
    }
    eyes(g, CX, 22, 7);
    smileArc(g, CX, 29, 2.6, 1.2);
    blush(g, CX - 11, 27); blush(g, CX + 11, 27);
  }});

  S.push({ name: 'apron', draw(g) {
    stroke(g, [[24, 14], [20, 10]], 1.4, 1.2, P.lgy);    // neck strap L
    stroke(g, [[39, 14], [43, 10]], 1.4, 1.2, P.lgy);    // neck strap R
    rect(g, 27, 12, 36, 18, P.pnk);                      // bib top
    rrect(g, 18, 18, 45, 54, 6, P.plum);                 // apron (shadow)
    rrect(g, 18, 18, 43, 52, 6, P.pnk);                  // apron
    rect(g, 8, 22, 20, 25, P.pnk);                       // waist tie L
    rect(g, 43, 22, 56, 25, P.pnk);                      // waist tie R
    rrect(g, 24, 34, 39, 46, 2, P.plum);                 // pocket
    eyes(g, CX, 26, 7);
    smileArc(g, CX, 32, 2.8, 1.2);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

  S.push({ name: 'bowling', draw(g) {
    ball(g, 51, 40, 6, 14, P.crm, P.lgy);                // pin behind
    rect(g, 47, 31, 52, 34, P.red);                      // pin stripe
    ball(g, CX - 2, 34, 17, 17, P.sky, P.lav);           // ball
    disc(g, 23, 23, 2, P.navy);                          // finger holes
    disc(g, 30, 21, 2, P.navy);
    disc(g, 27, 28, 2, P.navy);
    eyes(g, CX - 2, 37, 7);
    smileArc(g, CX - 2, 44, 3, 1.4);
    blush(g, CX - 14, 42); blush(g, CX + 9, 42);
  }});

  S.push({ name: 'pirate', draw(g) {
    ball(g, CX, 49, 10, 8, P.red, P.plum);               // striped shirt
    clipTo(g, [P.red, P.plum], function () {
      rect(g, 20, 44, 44, 45, P.crm); rect(g, 20, 50, 44, 51, P.crm);
    });
    ball(g, 26, 57, 4, 2.6, P.dgy, P.navy);              // boots
    ball(g, 37, 57, 4, 2.6, P.dgy, P.navy);
    ball(g, 21, 48, 3.2, 2.6, P.pch, P.brn);             // hands
    ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 27, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 13, 17, 4, P.dgy);                    // tricorn brim
    ball(g, CX, 9, 11, 5, P.dgy, P.navy);                // hat crown
    disc(g, CX, 12, 2.4, P.yel);                         // hat emblem
    rect(g, 33, 28, 44, 30, P.dgy);                      // eyepatch band
    disc(g, 39, 31, 2.6, P.dgy);                         // eyepatch
    eye(g, 25, 30, 3);                                   // one open eye
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 10, 34); blush(g, CX + 10, 34);
  }});

  S.push({ name: 'bandage', draw(g) {
    rrect(g, 8, 24, 55, 40, 8, P.brn);                   // shadow
    rrect(g, 8, 23, 55, 39, 8, P.pch);                   // bandage strip
    rrect(g, 22, 25, 41, 37, 4, P.crm);                  // centre pad
    disc(g, 14, 27, 0.6, P.brn); disc(g, 14, 31, 0.6, P.brn); disc(g, 14, 35, 0.6, P.brn); // holes
    disc(g, 49, 27, 0.6, P.brn); disc(g, 49, 31, 0.6, P.brn); disc(g, 49, 35, 0.6, P.brn);
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 35, 2.6, 1.1);
    blush(g, CX - 11, 33); blush(g, CX + 11, 33);
  }});

  S.push({ name: 'pelican', draw(g) {
    ball(g, CX, 45, 13, 13, P.crm, P.lgy);               // body
    ball(g, 19, 42, 4.5, 8, P.crm, P.lgy);               // wings
    ball(g, 44, 42, 4.5, 8, P.crm, P.lgy);
    ball(g, 27, 58, 3.2, 2, P.org, P.brn);               // feet
    ball(g, 37, 58, 3.2, 2, P.org, P.brn);
    ball(g, CX, 22, 12, 11, P.crm, P.lgy);               // head
    eyes(g, CX, 19, 6);
    ball(g, CX, 34, 10, 8, P.org, P.brn);                // big throat pouch
    tri(g, 21, 27, 42, 27, 31.5, 31, P.yel);             // beak top
    smileArc(g, CX, 35, 3.2, 1.4, P.brn);                // pouch smile
    blush(g, 19, 27); blush(g, 44, 27);
  }});

  S.push({ name: 'stocking', draw(g) {
    rrect(g, 26, 10, 40, 50, 5, P.plum);                 // leg (shadow)
    rrect(g, 26, 10, 38, 48, 5, P.red);                  // leg
    rrect(g, 14, 44, 40, 56, 5, P.plum);                 // foot (shadow)
    rrect(g, 14, 44, 38, 54, 5, P.red);                  // foot
    rect(g, 24, 10, 40, 16, P.crm);                      // cuff
    rect(g, 24, 18, 40, 20, P.crm);                      // stripe
    rect(g, 16, 48, 24, 52, P.crm);                      // toe
    eyes(g, CX + 1, 30, 6);
    smileArc(g, CX + 1, 36, 2.6, 1.2);
    blush(g, CX - 8, 34); blush(g, CX + 10, 34);
  }});

  S.push({ name: 'pepper', draw(g) {
    stroke(g, [[30, 14], [31, 9], [35, 7]], 2, 1.4, P.grn); // stem
    ellipse(g, 30, 15, 5, 3, P.lim);                     // green cap
    ball(g, CX, 34, 11, 16, P.red, P.plum);              // chili body
    ball(g, 34, 50, 6, 8, P.red, P.plum);                // curved tip
    ball(g, 37, 56, 3.5, 4, P.red, P.plum);              // tip point
    rect(g, 22, 30, 24, 40, P.pnk);                      // highlight
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 39, 2.8, 1.4);
    blush(g, CX - 11, 37); blush(g, CX + 11, 37);
  }});

  S.push({ name: 'softball', draw(g) {
    ball(g, CX, 33, 18, 18, P.yel, P.org, P.crm);       // ball
    stroke(g, [[19,24],[16,33],[19,42]], 0.8, 0.8, P.red); // left seam
    stroke(g, [[44,24],[47,33],[44,42]], 0.8, 0.8, P.red); // right seam
    for (let sy=27; sy<=39; sy+=3) { rect(g, 15,sy, 19,sy, P.red); rect(g, 44,sy, 48,sy, P.red); } // stitches
    eyes(g, CX, 31, 6);
    smileArc(g, CX, 38, 3, 1.2);
    blush(g, CX-12, 36); blush(g, CX+12, 36);
  }});

  S.push({ name: 'raspberry', draw(g) {
    tri(g, 24,18, 30,20, 26,9, P.grn);                  // green hull leaves
    tri(g, 40,18, 34,20, 38,9, P.grn);
    tri(g, 28,18, 36,18, CX,7, P.lim);
    ball(g, CX, 37, 15, 15, P.red, P.plum);             // berry mass
    for (const [bx,by] of [[24,29],[31,27],[38,29],[21,36],[28,35],[35,35],[42,36],[24,44],[31,44],[38,44],[28,50],[35,50]])
      { disc(g, bx,by, 2.6, P.plum); disc(g, bx-0.6,by-0.6, 1.8, P.red); } // drupelet bumps
    eyes(g, CX, 35, 6);
    smileArc(g, CX, 41, 2.8, 1.2);
    blush(g, CX-12, 39); blush(g, CX+12, 39);
  }});

  S.push({ name: 'fortress', draw(g) {
    rrect(g, 14,26, 51,58, 2, P.lav);                   // keep shadow
    rrect(g, 14,26, 49,56, 2, P.lgy);                   // stone keep
    for (const mx of [14,23,32,41]) { rect(g, mx,20, mx+4,26, P.lgy); rect(g, mx,24, mx+4,26, P.lav); } // battlements
    rect(g, 14,37, 49,38, P.lav); rect(g, 31,26, 32,37, P.lav); // stone block lines
    ball(g, CX, 56, 6, 8, P.brn, P.plum);               // arched door
    rect(g, 26,54, 38,58, P.brn);
    eyes(g, CX, 41, 6);                                 // face on the stone
    smileArc(g, CX, 47, 3, 1.2);
    blush(g, CX-12, 45); blush(g, CX+12, 45);
  }});

  S.push({ name: 'janitor', draw(g) {
    stroke(g, [[42,50],[52,8]], 1.4, 1.4, P.brn);       // broom handle
    tri(g, 46,44, 58,44, 52,54, P.yel);                 // bristles
    rect(g, 46,43, 58,45, P.org);                       // broom band
    ball(g, CX, 49, 10, 8, P.sky, P.lav);               // blue overalls
    ball(g, 26,57, 4,2.6, P.pch, P.brn);                // feet
    ball(g, 37,57, 4,2.6, P.pch, P.brn);
    ball(g, 20,48, 3.2,2.6, P.pch, P.brn);              // hands
    ball(g, 43,48, 3.2,2.6, P.pch, P.brn);
    ball(g, CX, 28, 13, 12, P.pch, P.brn);              // head
    rrect(g, 18,15, 45,20, 2, P.grn); ellipse(g, CX,13, 11,4, P.grn); // cap
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 3, 1.1);
    blush(g, CX-11, 34); blush(g, CX+11, 34);
  }});

  S.push({ name: 'watermelon', draw(g) {
    tri(g, 9,25, 54,25, CX,59, P.red);                  // red flesh wedge
    tri(g, 38,25, 54,25, 47,45, P.plum);                // flesh shadow
    rrect(g, 8,13, 55,26, 5, P.lim);                    // green rind
    rect(g, 8,22, 55,25, P.crm);                        // white pith band
    for (const rx of [15,24,33,42]) rect(g, rx,13, rx+1,22, P.grn); // rind stripes
    for (const [sx,sy] of [[18,34],[45,34],[16,44],[47,44],[24,52],[39,52]]) ellipse(g, sx,sy, 1,1.6, P.navy); // seeds
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 3, 1.2);
    blush(g, 20,40); blush(g, 43,40);
  }});

  S.push({ name: 'harp', draw(g) {
    tri(g, 16,54, 30,54, 27,11, P.brn);                 // soundboard shadow
    tri(g, 21,54, 30,54, 27,12, P.org);                 // soundboard body
    rect(g, 44,50, 48,55, P.org);                       // base foot
    for (let sx=30; sx<=44; sx+=3) stroke(g, [[sx, 13+(sx-26)*0.15],[sx, 50]], 0.6, 0.6, P.crm); // strings
    stroke(g, [[26,13],[38,8],[48,17]], 3, 2.4, P.org); // neck (curved top)
    stroke(g, [[26,13],[38,9],[47,17]], 2, 1.4, P.yel);
    stroke(g, [[48,17],[47,52]], 3, 2.6, P.org);        // pillar
    stroke(g, [[48,17],[46,52]], 2, 1.6, P.yel);
    eyes(g, 25, 40, 4);
    smileArc(g, 25, 45, 2.2, 1);
    blush(g, 19,43); blush(g, 30,43);
  }});

  S.push({ name: 'zebra', draw(g) {
    tri(g, 21,13, 28,14, 23,3, P.lgy);                  // ears
    tri(g, 42,13, 35,14, 40,3, P.lgy);
    tri(g, 23,13, 27,14, 25,6, P.pch);
    tri(g, 40,13, 36,14, 38,6, P.pch);
    stroke(g, [[43,51],[49,49],[51,43]], 1.8, 1.4, P.lgy); // tail
    disc(g, 51,43, 2, P.blk);                           // tail tuft
    ball(g, CX, 50, 11, 8, P.crm, P.lgy);               // body
    ball(g, 24,58, 3.6,2.4, P.crm, P.lgy);              // legs
    ball(g, 39,58, 3.6,2.4, P.crm, P.lgy);
    ball(g, CX, 25, 11, 13, P.crm, P.lgy);              // head
    rect(g, 28,8, 35,14, P.dgy);                        // mane tuft
    ball(g, CX, 37, 6.5, 5, P.crm, P.lgy);              // snout
    g.set(29,38, P.navy); g.set(34,38, P.navy);         // nostrils
    clipTo(g, [P.crm, P.lgy], function () {             // black stripes
      rect(g, 26,18, 27,24, P.blk); rect(g, 31,17, 32,23, P.blk); rect(g, 36,18, 37,24, P.blk);
      rect(g, 18,45, 24,46, P.blk); rect(g, 17,50, 23,51, P.blk);
      rect(g, 39,45, 45,46, P.blk); rect(g, 40,50, 46,51, P.blk);
      rect(g, 27,45, 28,54, P.blk); rect(g, 35,45, 36,54, P.blk);
    });
    eyes(g, CX, 24, 7);
    smileArc(g, CX, 40, 2.4, 1);
    blush(g, CX-11, 31); blush(g, CX+11, 31);
  }});

  S.push({ name: 'dragonfly', draw(g) {
    ellipse(g, 15,20, 12,5, P.sky);                     // wings
    ellipse(g, 48,20, 12,5, P.sky);
    ellipse(g, 14,31, 11,4.5, P.lav);
    ellipse(g, 49,31, 11,4.5, P.lav);
    ellipse(g, 13,19, 6,2, P.crm); ellipse(g, 50,19, 6,2, P.crm); // wing sheen
    stroke(g, [[CX,36],[CX,55]], 3.6, 1.8, P.lim);      // abdomen
    for (let sy=40; sy<=52; sy+=3) rect(g, CX-3,sy, CX+3,sy, P.grn); // segments
    ball(g, CX, 30, 6, 6, P.lim, P.grn);                // thorax
    ball(g, CX, 18, 7.5, 6.5, P.lim, P.grn);            // head
    eyes(g, CX, 17, 4.5);                               // big compound eyes
    smileArc(g, CX, 23, 2, 0.9);
    blush(g, CX-6, 21); blush(g, CX+6, 21);
  }});

  S.push({ name: 'circus', draw(g) {
    rect(g, 31,5, 32,15, P.brn);                        // flag pole
    tri(g, 32,6, 32,11, 41,8.5, P.yel);                 // pennant
    tri(g, 9,36, 54,36, CX,14, P.red);                  // roof
    clipTo(g, [P.red], function () { for (const rx of [17,27,37,47]) tri(g, rx-3,36, rx+3,36, CX,15, P.crm); }); // roof stripes
    rrect(g, 12,36, 51,57, 1, P.crm);                   // tent body
    for (const wx of [15,23,31,39,47]) rect(g, wx,44, wx+2,57, P.red); // wall stripes
    tri(g, 27,57, 36,57, CX,45, P.plum);                // entrance
    eyes(g, CX, 39, 5);
    smileArc(g, CX, 43, 2.6, 1);
    blush(g, 22,42); blush(g, 42,42);
  }});

  S.push({ name: 'keyboard', draw(g) {
    rrect(g, 5,20, 58,52, 3, P.dgy);                    // body shadow
    rrect(g, 5,20, 58,50, 3, P.lgy);                    // body
    for (const ry of [24,29,34]) for (let cx=9; cx<=51; cx+=6) rrect(g, cx,ry, cx+4,ry+2, 1, P.lav); // keys
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 47, 3, 1.1);
    blush(g, 16,45); blush(g, 47,45);
  }});

  S.push({ name: 'zipper', draw(g) {
    rect(g, 18,8, 26,58, P.sky);                        // left tape
    rect(g, 38,8, 46,58, P.sky);
    rect(g, 20,8, 26,58, P.lav);                        // tape shade
    rect(g, 40,8, 46,58, P.lav);
    for (let ty=34; ty<=56; ty+=3) rect(g, 27,ty, 37,ty+1, P.lgy); // closed teeth
    for (let ty=10; ty<=28; ty+=3) { rect(g, 24,ty, 29,ty+1, P.lgy); rect(g, 35,ty, 40,ty+1, P.lgy); } // open teeth
    rrect(g, 24,30, 40,41, 2, P.org);                   // slider
    rect(g, 30,41, 33,48, P.yel); ellipse(g, 31.5,50, 4,3, P.yel); // pull tab
    ellipse(g, 31.5,50, 1.8,1.2, null);                 // tab hole
    eyes(g, CX, 34, 4);
    smileArc(g, CX, 38, 2.2, 0.9);
    blush(g, 26,37); blush(g, 37,37);
  }});

  S.push({ name: 'disc', draw(g) {
    ball(g, CX, 30, 20, 20, P.lgy, P.lav);              // silver disc
    disc(g, CX, 30, 17, P.sky);                         // iridescent ring
    disc(g, CX, 30, 13, P.lav);
    disc(g, CX, 30, 11, P.lgy);
    ellipse(g, 22,22, 3,7, P.crm);                      // sheen
    disc(g, CX, 30, 5, P.dgy);                          // hub
    disc(g, CX, 30, 2.4, null);                         // center hole
    eyes(g, CX, 44, 5);
    smileArc(g, CX, 49, 2.6, 1);
    blush(g, 23,47); blush(g, 40,47);
  }});

  S.push({ name: 'scorpion', draw(g) {
    stroke(g, [[CX,36],[42,26],[35,15],[29,17]], 3, 1.6, P.org); // curled tail
    ball(g, 29,17, 3.2,3, P.org, P.brn);                // rounded soft stinger
    stroke(g, [[24,47],[15,49]], 2.2, 2.2, P.org);      // arms
    stroke(g, [[39,47],[48,49]], 2.2, 2.2, P.org);
    ball(g, 13,49, 6,5, P.org, P.brn);                  // claws
    ball(g, 50,49, 6,5, P.org, P.brn);
    rect(g, 12,47, 14,51, null); rect(g, 49,47, 51,51, null); // pincer gaps
    ball(g, CX, 47, 12, 8, P.org, P.brn);               // body
    ball(g, 26,56, 3,2, P.org, P.brn); ball(g, 37,56, 3,2, P.org, P.brn); // legs
    ball(g, CX, 33, 11, 9, P.org, P.brn);               // head
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 39, 2.4, 1.1);
    blush(g, CX-9, 36); blush(g, CX+9, 36);
  }});

  S.push({ name: 'escalator', draw(g) {
    tri(g, 6,58, 58,58, 58,18, P.lav);                  // ramp underside
    tri(g, 6,56, 54,56, 54,20, P.lgy);                  // ramp
    for (let i=0; i<7; i++) { const x=12+i*6, y=52-i*5; rect(g, x-3,y, x+3,y+1, P.dgy); rect(g, x+2,y-4, x+3,y+1, P.dgy); } // steps
    stroke(g, [[8,50],[54,14]], 2, 2, P.sky);           // handrail
    ball(g, 54,14, 2.5,2.5, P.sky, P.lav);              // rail knob
    eyes(g, 20, 46, 5);
    smileArc(g, 20, 51, 2.4, 1);
    blush(g, 14,49); blush(g, 26,49);
  }});

  S.push({ name: 'calendar', draw(g) {
    for (const bx of [20,32,44]) { rect(g, bx-1,7, bx,13, P.lgy); disc(g, bx-0.5,8, 1.6, P.dgy); } // spiral binding
    rrect(g, 12,12, 51,56, 2, P.lav);                   // page shadow
    rrect(g, 12,11, 49,54, 2, P.crm);                   // page
    rrect(g, 12,11, 49,26, 2, P.red);                   // header
    rect(g, 12,24, 49,26, P.plum);                      // header shade
    for (let gy=32; gy<=48; gy+=6) for (let gx=18; gx<=44; gx+=6) disc(g, gx,gy, 1, P.lgy); // grid dots
    disc(g, 30,38, 2.4, P.org);                         // marked day
    eyes(g, CX, 18, 5);                                 // face on header
    smileArc(g, CX, 22, 2.6, 1);
    blush(g, 20,21); blush(g, 43,21);
  }});

  S.push({ name: 'mackerel', draw(g) {
    tri(g, 44,18, 56,10, 52,26, P.lav);                 // tail fin
    tri(g, 46,22, 56,30, 50,16, P.sky);
    ball(g, 36, 30, 14, 11, P.sky, P.lav);              // rear body
    tri(g, 30,16, 42,16, 36,8, P.lav);                  // dorsal fin
    ball(g, 22, 36, 14, 13, P.sky, P.lav, P.crm);       // head (faces viewer)
    ellipse(g, 22, 42, 8, 5, P.crm);                    // pale belly
    ball(g, 13, 44, 4, 2.6, P.lav);                     // side fin
    clipTo(g, [P.sky, P.lav], function () { for (const sx of [30,35,40,45]) stroke(g, [[sx,22],[sx+2,32]], 1.2, 1.2, P.navy); }); // back stripes
    eyes(g, 22, 35, 7);
    smileArc(g, 22, 42, 2.6, 1);
    blush(g, 12,40); blush(g, 32,40);
  }});

  S.push({ name: 'fisherman', draw(g) {
    stroke(g, [[42,50],[52,8]], 1.4, 1, P.brn);         // rod
    stroke(g, [[52,8],[54,9],[54,22]], 0.6, 0.6, P.lgy); // line
    ball(g, 54,23, 2,2.4, P.red, P.plum);               // float
    ball(g, CX, 49, 10, 8, P.grn, P.plum);              // vest
    ball(g, 26,57, 4,2.6, P.brn, P.blk);                // boots
    ball(g, 37,57, 4,2.6, P.brn, P.blk);
    ball(g, 20,48, 3.2,2.6, P.pch, P.brn);              // hands
    ball(g, 43,48, 3.2,2.6, P.pch, P.brn);
    ball(g, CX, 30, 13, 12, P.pch, P.brn);              // head
    ellipse(g, CX, 18, 17, 4, P.org);                   // hat brim
    ellipse(g, CX, 14, 9, 5, P.org);                    // crown
    rect(g, 23,16, 40,17, P.brn);                       // hat band
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 3, 1.1);
    blush(g, CX-11, 36); blush(g, CX+11, 36);
  }});

  S.push({ name: 'astronaut', draw(g) {
    ball(g, CX, 46, 12, 10, P.crm, P.lgy);              // suit body
    ball(g, 18,46, 4,5, P.crm, P.lgy);                  // arms
    ball(g, 45,46, 4,5, P.crm, P.lgy);
    ball(g, 25,57, 4.5,3, P.crm, P.lgy);                // boots
    ball(g, 38,57, 4.5,3, P.crm, P.lgy);
    rrect(g, 27,42, 37,50, 1, P.lav); disc(g, 30,45, 1, P.red); disc(g, 34,45, 1, P.lim); // chest panel
    ball(g, CX, 24, 15, 14, P.lgy, P.lav);              // helmet ring
    disc(g, CX, 25, 12, P.sky);                         // visor glass
    disc(g, CX, 26, 11, P.pch);                         // face inside
    ellipse(g, 23,18, 2.5,4, P.crm);                    // visor glare
    eyes(g, CX, 26, 5);
    smileArc(g, CX, 32, 2.6, 1);
    blush(g, CX-8, 30); blush(g, CX+8, 30);
  }});

  S.push({ name: 'snail', draw(g) {
    ball(g, 40, 30, 14, 13, P.org, P.brn);              // shell
    ellipse(g, 40, 30, 8, 7, P.yel);                    // swirl
    ellipse(g, 40, 30, 4, 3.4, P.org);
    disc(g, 40,30, 1.5, P.yel);
    ellipse(g, CX, 54, 20, 5, P.lim);                   // foot
    ball(g, 16, 44, 9, 9.5, P.lim, P.grn);              // head
    stroke(g, [[12,36],[10,27]], 1.1, 1.1, P.grn);      // antennae
    stroke(g, [[20,35],[21,26]], 1.1, 1.1, P.grn);
    ball(g, 10,26, 2.4,2.4, P.lim, P.grn); ball(g, 21,25, 2.4,2.4, P.lim, P.grn);
    eyes(g, 16, 43, 4.5);
    smileArc(g, 16, 49, 2.2, 1);
    blush(g, 9,46); blush(g, 23,46);
  }});

  S.push({ name: 'broccoli', draw(g) {
    stroke(g, [[CX,54],[CX,32]], 6, 4, P.lim);
    stroke(g, [[CX,42],[22,32]], 3, 2, P.lim);
    stroke(g, [[CX,42],[41,31]], 3, 2, P.lim);
    for (const [x,y,r] of [[20,24,9],[30,20,10],[42,24,9],[26,30,9],[37,30,9]])
      ball(g, x,y,r,r-1, P.grn, P.navy, P.lim);
    eyes(g, CX, 28, 7);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, 20,33); blush(g, 43,33);
  }});

  S.push({ name: 'kangaroo', draw(g) {
    stroke(g, [[42,49],[52,53],[58,50]], 4, 2, P.brn);
    ball(g, CX, 48, 12, 10, P.org, P.brn);
    ball(g, 24,57, 6,3, P.org, P.brn); ball(g, 41,57, 7,3, P.org, P.brn);
    ellipse(g, CX,47, 7,6, P.pch);
    ball(g, CX, 27, 12, 12, P.org, P.brn);
    ellipse(g, 24,12, 4,11, P.org); ellipse(g, 39,12, 4,11, P.org);
    ellipse(g, 24,12, 2,7, P.pch); ellipse(g, 39,12, 2,7, P.pch);
    ellipse(g, CX,34, 6,4, P.pch);
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 35, 2.6, 1);
    blush(g, 21,33); blush(g, 42,33);
  }});

  S.push({ name: 'seagull', draw(g) {
    tri(g, 21,42, 5,28, 26,34, P.lgy); tri(g, 42,42, 58,28, 37,34, P.lgy);
    tri(g, 18,39, 7,31, 25,36, P.crm); tri(g, 45,39, 56,31, 38,36, P.crm);
    ball(g, CX, 42, 12, 9, P.crm, P.lgy);
    ball(g, CX, 25, 12, 11, P.crm, P.lgy);
    tri(g, 28,31, 35,31, CX,38, P.org);
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 30, 2.6, 1);
    blush(g, 21,29); blush(g, 42,29);
  }});

  S.push({ name: 'sculpture', draw(g) {
    rrect(g, 18,49, 45,57, 2, P.lav);
    rrect(g, 22,43, 41,51, 2, P.lgy);
    ellipse(g, CX,43, 15,8, P.lgy);
    rect(g, 28,36,35,44,P.lgy);
    ball(g, CX, 26, 11, 13, P.lgy, P.lav, P.crm);
    ellipse(g, CX,16, 9,5, P.lav);
    ellipse(g, CX,31, 3,2, P.crm);
    eyes(g, CX, 25, 6);
    smileArc(g, CX, 34, 2.6, 1);
    blush(g, 22,32); blush(g, 41,32);
  }});

  S.push({ name: 'fireman', draw(g) {
    ball(g, CX, 49, 11, 9, P.red, P.plum);
    ball(g, 25,58, 4,2.5, P.blk, P.navy); ball(g, 38,58, 4,2.5, P.blk, P.navy);
    rect(g, 21,48,42,50, P.yel); rect(g, 30,42,33,57, P.yel);
    ball(g, CX, 29, 13, 12, P.pch, P.brn);
    ellipse(g, CX,18, 17,5, P.red); rrect(g, 22,10,41,20, 5, P.red);
    rect(g, 29,11,34,16, P.yel);
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 3, 1.1);
    blush(g, 20,34); blush(g, 43,34);
  }});

  S.push({ name: 'pier', draw(g) {
    for (const x of [15,27,39,51]) rect(g, x,27,x+4,58,P.brn);
    rect(g, 8,22,56,31,P.org); rect(g, 8,28,56,32,P.brn);
    for (let x=10; x<=52; x+=8) rect(g,x,23,x+1,28,P.yel);
    stroke(g, [[12,22],[12,10]], 1.4,1.4,P.navy);
    stroke(g, [[52,22],[52,10]], 1.4,1.4,P.navy);
    stroke(g, [[12,11],[52,11]], 1.2,1.2,P.navy);
    eyes(g, CX, 25, 6);
    smileArc(g, CX, 30, 3, 1.1);
    blush(g, 20,29); blush(g, 43,29);
  }});

  S.push({ name: 'curry', draw(g) {
    ellipse(g, CX,48, 22,10, P.lgy);
    ellipse(g, CX,43, 21,11, P.crm);
    ellipse(g, CX,41, 18,8, P.org);
    for (const [x,y,c] of [[22,39,P.yel],[30,43,P.brn],[39,39,P.lim],[45,44,P.yel]])
      ball(g,x,y,4,3,c,c===P.lim?P.grn:P.brn);
    stroke(g, [[46,35],[56,12]], 1.4,1.4,P.brn);
    eyes(g, CX, 47, 6);
    smileArc(g, CX, 52, 3, 1.1);
    blush(g, 18,50); blush(g, 45,50);
  }});

  S.push({ name: 'goldfish', draw(g) {
    tri(g, 47,31, 58,17, 57,43, P.yel);
    ball(g, 33,31, 18,13, P.org, P.brn, P.yel);
    tri(g, 31,18, 42,18, 37,10, P.yel);
    tri(g, 31,44, 42,44, 37,52, P.brn);
    ball(g, 19,31, 10,11, P.org, P.brn, P.yel);
    eyes(g, 19, 29, 5);
    smileArc(g, 19, 36, 2.3, 1);
    blush(g, 12,34); blush(g, 26,34);
  }});

  S.push({ name: 'parachute', draw(g) {
    ellipse(g, CX,20, 25,15, P.red);
    clipTo(g, [P.red], function () { rect(g,26,5,37,31,P.crm); });
    rect(g,6,20,57,31,null);
    stroke(g, [[8,20],[23,47]], .7,.7,P.navy); stroke(g, [[55,20],[40,47]], .7,.7,P.navy);
    stroke(g, [[CX,20],[26,47]], .7,.7,P.navy); stroke(g, [[CX,20],[37,47]], .7,.7,P.navy);
    rrect(g, 22,45,41,58,3,P.org);
    eyes(g, CX, 50, 5);
    smileArc(g, CX, 55, 2.6, 1);
    blush(g, 24,54); blush(g, 39,54);
  }});

  S.push({ name: 'popsicle', draw(g) {
    rrect(g, 18,8,45,48, 8, P.sky);
    rect(g, 18,34,45,48,P.lav);
    ellipse(g,25,17,3,6,P.crm);
    rrect(g, 27,46,36,59, 2, P.brn);
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 41, 3, 1.1);
    blush(g, 22,39); blush(g, 41,39);
  }});

  S.push({ name: 'rainbow', draw(g) {
    for (const [r,c] of [[25,P.red],[21,P.org],[17,P.yel],[13,P.lim],[9,P.sky]])
      stroke(g, [[CX-r,46],[CX-r*.7,22],[CX,12],[CX+r*.7,22],[CX+r,46]], 4,4,c);
    ellipse(g, 11,47, 10,7, P.crm); ellipse(g, 52,47, 10,7, P.crm);
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, 21,33); blush(g, 42,33);
  }});

  S.push({ name: 'lizard', draw(g) {
    stroke(g, [[43,42],[52,45],[59,38]], 3,1.2,P.lim);
    ball(g, 36,42, 18,7, P.lim, P.grn);
    for (const [x,y] of [[28,47],[43,47],[29,37],[44,37]])
      stroke(g, [[x,y],[x+(x<CX?-7:7),y+4]], 2,1.2,P.lim);
    ball(g, 16,39, 10,9, P.lim, P.grn);
    eyes(g, 16, 38, 4.5);
    smileArc(g, 16, 44, 2.3, 1);
    blush(g, 9,42); blush(g, 23,42);
  }});

  S.push({ name: 'checkers', draw(g) {
    rrect(g, 7,8,56,57, 3, P.brn);
    for (let y=11;y<55;y+=11) for (let x=10;x<54;x+=11)
      rect(g,x,y,x+10,y+10,((x+y)/11)%2<1?P.crm:P.plum);
    for (const [x,y,c] of [[15,16,P.red],[37,16,P.red],[26,27,P.red],[48,38,P.sky],[26,49,P.sky],[48,49,P.sky]])
      ball(g,x,y,4,3,c,c===P.red?P.plum:P.lav);
    eyes(g, CX, 31, 5);
    smileArc(g, CX, 37, 2.6, 1);
  }});

  S.push({ name: 'beaver', draw(g) {
    ellipse(g, 48,45, 11,16, P.brn);
    for (const y of [37,43,49]) stroke(g,[[40,y],[55,y+5]],.7,.7,P.org);
    for (const y of [39,45]) stroke(g,[[55,y],[42,y+10]],.7,.7,P.org);
    ball(g, CX,48, 11,9,P.brn,P.plum);
    ball(g, 24,57,4,2.5,P.brn,P.plum); ball(g,38,57,4,2.5,P.brn,P.plum);
    ball(g, CX,27, 13,12,P.brn,P.plum);
    ellipse(g,21,17,5,5,P.brn); ellipse(g,42,17,5,5,P.brn);
    ellipse(g,CX,34,7,5,P.pch);
    rect(g,28,36,31,42,P.crm); rect(g,32,36,35,42,P.crm);
    eyes(g,CX,27,6);
    smileArc(g,CX,40,2.6,1);
    blush(g,20,35); blush(g,43,35);
  }});

  S.push({ name: 'scanner', draw(g) {
    rrect(g, 9,22,54,57, 4, P.lgy);
    rrect(g, 12,5,51,29, 3, P.dgy);
    rrect(g, 15,8,48,26, 2, P.crm);
    rect(g,18,11,45,13,P.sky); rect(g,18,17,39,19,P.lgy);
    rrect(g, 13,25,50,38, 2, P.dgy);
    rect(g,16,28,47,31,P.lim);
    rect(g,17,38,46,40,P.dgy);
    disc(g,47,49,2,P.lim);
    eyes(g,CX,47,6);
    smileArc(g,CX,53,3,1.1);
    blush(g,20,51); blush(g,43,51);
  }});

  S.push({ name: 'hamster', draw(g) {
    ball(g, CX,43, 17,16,P.org,P.brn,P.pch);
    ellipse(g,19,25,7,7,P.org); ellipse(g,44,25,7,7,P.org);
    ellipse(g,19,25,4,4,P.pnk); ellipse(g,44,25,4,4,P.pnk);
    ball(g,CX,32,15,14,P.org,P.brn,P.pch);
    ellipse(g,23,38,8,8,P.crm); ellipse(g,40,38,8,8,P.crm);
    disc(g,CX,37,2,P.pnk);
    eyes(g,CX,31,7);
    smileArc(g,CX,42,2.5,1);
    blush(g,18,39); blush(g,45,39);
  }});

  S.push({ name: 'holly', draw(g) {
    stroke(g, [[CX,53],[CX,18]], 2,2,P.brn);
    for (const [x,y,a] of [[22,22,-1],[41,22,1],[20,35,-1],[43,35,1],[23,47,-1],[40,47,1]]) {
      tri(g,CX,y-5,x,y,x,y+7,P.grn);
      tri(g,x,y-5,x+(a*8),y,x,y+6,P.lim);
    }
    disc(g,27,31,4,P.red); disc(g,36,31,4,P.red); disc(g,CX,38,4,P.red);
    eyes(g,CX,31,5);
    smileArc(g,CX,37,2.5,1);
    blush(g,24,36); blush(g,39,36);
  }});

  S.push({ name: 'lever', draw(g) {
    tri(g, 18,52,46,52,CX,35,P.lav);
    rrect(g, 12,50,51,58, 2, P.dgy);
    stroke(g, [[CX,40],[48,13]], 4,3,P.brn);
    ball(g,49,12,7,7,P.red,P.plum,P.pnk);
    eyes(g,CX,49,5);
    smileArc(g,CX,54,2.6,1);
    blush(g,23,53); blush(g,40,53);
  }});

  S.push({ name: 'squash', draw(g) {
    stroke(g, [[CX,16],[38,7]], 2,1.2,P.grn);
    ball(g,CX,36,18,19,P.yel,P.org,P.crm);
    for (const x of [22,27,36,41]) stroke(g,[[x,20],[x+(x<CX?-3:3),50]],1,1,P.org);
    eyes(g,CX,35,7);
    smileArc(g,CX,43,3,1.2);
    blush(g,19,41); blush(g,44,41);
  }});

  S.push({ name: 'mast', draw(g) {
    ellipse(g, CX,56,23,4,P.sky);
    tri(g, 12,46,52,46,43,56,P.brn);                  // boat hull
    tri(g, 16,46,47,46,40,53,P.org);
    stroke(g, [[CX,49],[CX,12]], 1.2,1.2,P.brn);       // thin support, not the subject
    tri(g, 34,14, 34,43, 55,35, P.crm);                // bright mainsail
    tri(g, 29,18, 29,45, 10,37, P.lgy);                // shaded sail
    rect(g, 18,48,45,50,P.brn);
    eyes(g,CX,49,5);
    smileArc(g,CX,54,2.4,1);
    blush(g,23,52); blush(g,41,52);
  }});

  S.push({ name: 'stereo', draw(g) {
    rrect(g, 9,18,55,54,4,P.dgy);
    rrect(g, 11,16,53,52,4,P.lgy);
    disc(g,21,36,9,P.navy); disc(g,21,36,5,P.lav); disc(g,21,36,2,P.sky);
    disc(g,43,36,9,P.navy); disc(g,43,36,5,P.lav); disc(g,43,36,2,P.sky);
    rrect(g,24,21,40,29,2,P.dgy);
    rect(g,27,23,37,25,P.lim);
    disc(g,24,46,1.5,P.red); disc(g,40,46,1.5,P.red);
    eyes(g,CX,26,5);
    smileArc(g,CX,31,2.4,1);
    blush(g,25,30); blush(g,39,30);
  }});

  S.push({ name: 'walrus', draw(g) {
    ellipse(g,16,45,9,7,P.brn); ellipse(g,48,45,9,7,P.brn);
    ball(g,CX,43,18,14,P.org,P.brn,P.pch);
    ball(g,CX,27,17,14,P.org,P.brn,P.pch);
    ball(g,24,35,7,6,P.pch,P.brn); ball(g,40,35,7,6,P.pch,P.brn);
    tri(g,26,39,30,39,27,56,P.crm); tri(g,34,39,38,39,37,56,P.crm);
    stroke(g, [[22,36],[15,34]], 0.8,0.4,P.brn); stroke(g, [[42,36],[49,34]], 0.8,0.4,P.brn);
    disc(g,CX,34,2,P.navy);
    eyes(g,CX,27,7);
    smileArc(g,CX,39,2,0.8);
    blush(g,20,32); blush(g,44,32);
  }});

  S.push({ name: 'cappuccino', draw(g) {
    rrect(g,17,30,45,54,5,P.crm);
    ellipse(g,CX,30,15,6,P.lgy);
    ellipse(g,CX,29,10,3,P.brn);
    stroke(g, [[45,36],[54,37],[49,47],[45,45]], 2.2,2,P.crm);
    stroke(g, [[23,18],[21,11]], 1,0.5,P.lgy); stroke(g, [[32,18],[33,9]], 1,0.5,P.lgy);
    stroke(g, [[41,18],[43,11]], 1,0.5,P.lgy);
    eyes(g,CX,42,6);
    smileArc(g,CX,48,2.6,1);
    blush(g,22,45); blush(g,42,45);
  }});

  S.push({ name: 'harmonica', draw(g) {
    rrect(g,9,27,55,42,3,P.lav);
    rrect(g,11,25,53,40,3,P.sky);
    for (let x = 15; x <= 47; x += 5) rect(g,x,28,x+2,37,P.navy);
    rect(g,13,24,51,27,P.lgy);
    rect(g,13,40,51,43,P.lav);
    eyes(g,CX,32,5);
    smileArc(g,CX,38,2.2,1);
    blush(g,23,36); blush(g,41,36);
  }});

  S.push({ name: 'heater', draw(g) {
    rrect(g,15,17,49,56,4,P.lgy);
    rrect(g,18,20,46,53,3,P.dgy);
    for (let x = 22; x <= 42; x += 5) rect(g,x,24,x+2,46,P.org);
    ball(g,32,45,11,5,P.red,P.plum,P.org);
    ball(g,32,41,7,4,P.yel,P.org);
    disc(g,22,14,3,P.lgy); disc(g,42,14,3,P.lgy);
    eyes(g,CX,31,5);
    smileArc(g,CX,37,2.4,1);
    blush(g,22,35); blush(g,42,35);
  }});

  S.push({ name: 'weeds', draw(g) {
    ellipse(g,CX,58,25,4,P.brn);
    for (const [x,y,h] of [[17,54,24],[24,55,31],[32,55,36],[40,55,29],[47,54,22]]) {
      stroke(g, [[x,56],[x,y-h/2]], 1.5,0.7,P.grn);
      ellipse(g,x-4,y-h/3,4,2,P.lim); ellipse(g,x+4,y-h/4,4,2,P.lim);
    }
    disc(g,28,28,2,P.yel); disc(g,38,24,2,P.yel);
    eyes(g,CX,44,5);
    smileArc(g,CX,50,2.4,1);
    blush(g,22,48); blush(g,42,48);
  }});

  S.push({ name: 'rudder', draw(g) {
    stroke(g, [[CX,10],[CX,56]], 2.5,2.5,P.brn);
    tri(g,33,24,53,38,33,52,P.red);
    tri(g,30,24,11,38,30,52,P.org);
    ellipse(g,CX,55,18,4,P.lav);
    eyes(g,CX,34,5);
    smileArc(g,CX,40,2.4,1);
    blush(g,23,38); blush(g,41,38);
  }});

  S.push({ name: 'firewood', draw(g) {
    stroke(g, [[16,45],[48,30]], 6,6,P.brn);
    stroke(g, [[18,47],[50,32]], 3.5,3.5,P.org);
    stroke(g, [[18,32],[49,47]], 6,6,P.brn);
    stroke(g, [[20,34],[51,49]], 3.5,3.5,P.org);
    disc(g,16,45,4,P.yel); disc(g,49,47,4,P.yel);
    stroke(g, [[CX,43],[29,34],[33,26],[38,35]], 3,2,P.red);
    ball(g,CX,38,8,6,P.org,P.red,P.yel);
    eyes(g,CX,36,5);
    smileArc(g,CX,42,2.2,1);
    blush(g,24,40); blush(g,40,40);
  }});

  S.push({ name: 'pistachio', draw(g) {
    ball(g,CX,36,18,16,P.lim,P.grn,P.crm);
    ellipse(g,CX,34,10,15,P.crm);
    stroke(g, [[CX,18],[CX,52]], 1.2,1.2,P.grn);
    ball(g,22,40,7,8,P.lim,P.grn); ball(g,42,40,7,8,P.lim,P.grn);
    eyes(g,CX,34,6);
    smileArc(g,CX,42,2.4,1);
    blush(g,21,39); blush(g,43,39);
  }});

  S.push({ name: 'clarinet', draw(g) {
    stroke(g, [[20,44],[31,37],[42,30],[54,23]], 5.5,3,P.dgy);
    stroke(g, [[20,44],[31,37],[42,30],[54,23]], 3.2,1.8,P.brn);
    ellipse(g,17,46,11,8,P.dgy);                       // wide flared bell
    ellipse(g,17,46,7,4,P.brn);
    tri(g, 51,20, 60,17, 58,24, P.dgy);                // sharp angled mouthpiece
    tri(g, 52,21, 58,19, 56,23, P.brn);
    for (const [x,y] of [[28,39],[34,35],[40,31],[46,28]]) disc(g,x,y,1.7,P.yel);
    rect(g,29,41,43,42,P.lgy);                         // silver key rail
    rect(g,30,34,33,39,P.dgy); rect(g,42,27,45,32,P.dgy); // joint bands
    eyes(g,17,45,4.8);
    smileArc(g,17,50,2.2,1);
    blush(g,9,47); blush(g,25,47);
  }});

  S.push({ name: 'rag', draw(g) {
    tri(g,16,15,51,20,42,55,P.sky);
    tri(g,16,15,42,55,12,49,P.lav);
    clipTo(g,[P.sky,P.lav], () => { rect(g,19,26,45,27,P.crm); rect(g,24,38,40,39,P.crm); });
    ellipse(g,21,50,8,5,P.lav); ellipse(g,45,54,7,4,P.sky);
    eyes(g,CX,34,6);
    smileArc(g,CX,41,2.6,1);
    blush(g,22,39); blush(g,42,39);
  }});

  S.push({ name: 'puppet', draw(g) {
    stroke(g, [[16,7],[48,7]], 1.2,1.2,P.brn);
    for (const x of [24,40]) stroke(g, [[x,8],[x,28]], 0.6,0.6,P.lgy);
    ball(g,CX,27,12,11,P.pch,P.brn);
    rrect(g,22,39,42,55,4,P.red);
    stroke(g, [[23,41],[14,49]], 2.2,1.5,P.pch); stroke(g, [[41,41],[50,49]], 2.2,1.5,P.pch);
    ball(g,25,58,3,3,P.brn); ball(g,39,58,3,3,P.brn);
    ellipse(g,CX,17,11,5,P.brn);
    eyes(g,CX,27,6);
    smileArc(g,CX,33,2.4,1);
    blush(g,22,31); blush(g,42,31);
  }});

  S.push({ name: 'volcano', draw(g) {
    tri(g,8,57,56,57,CX,18,P.brn);
    tri(g,17,57,47,57,CX,22,P.dgy);
    ellipse(g,CX,21,10,4,P.red);
    ball(g,CX,17,9,6,P.org,P.red,P.yel);
    disc(g,25,8,3,P.lgy); disc(g,39,9,4,P.lgy); disc(g,32,5,3,P.lgy);
    stroke(g, [[CX,22],[27,37]], 2,1,P.red); stroke(g, [[CX,22],[38,42]], 2,1,P.org);
    eyes(g,CX,43,6);
    smileArc(g,CX,49,2.6,1);
    blush(g,21,47); blush(g,43,47);
  }});

  S.push({ name: 'dishwasher', draw(g) {
    rrect(g,13,10,51,58,4,P.lgy);
    rrect(g,16,13,48,55,3,P.crm);
    rect(g,18,16,46,22,P.dgy);
    disc(g,22,19,1.5,P.lim); disc(g,27,19,1.5,P.red);
    rect(g,19,29,45,31,P.lav); rect(g,19,39,45,41,P.lav);
    disc(g,25,36,5,P.sky); disc(g,39,36,5,P.sky);
    eyes(g,CX,47,5);
    smileArc(g,CX,52,2.4,1);
    blush(g,23,50); blush(g,41,50);
  }});

  S.push({ name: 'saucer', draw(g) {
    ellipse(g,CX,45,23,8,P.lgy);
    ellipse(g,CX,42,18,5,P.crm);
    ellipse(g,CX,37,11,4,P.sky);
    rrect(g,23,25,41,39,4,P.sky);
    stroke(g, [[42,30],[52,31],[48,38],[41,37]], 1.8,1.6,P.sky);
    stroke(g, [[28,19],[26,11]], 0.8,0.4,P.lgy); stroke(g, [[35,19],[36,10]], 0.8,0.4,P.lgy);
    eyes(g,CX,33,5);
    smileArc(g,CX,38,2.2,1);
    blush(g,25,36); blush(g,39,36);
  }});

  S.push({ name: 'mosquito', draw(g) {
    ellipse(g,21,28,11,7,P.sky); ellipse(g,43,28,11,7,P.sky);
    stroke(g, [[CX,24],[CX,47]], 4,5,P.dgy);
    stroke(g, [[CX,25],[20,15]], 0.8,0.4,P.navy); stroke(g, [[CX,25],[44,15]], 0.8,0.4,P.navy);
    stroke(g, [[CX,29],[19,43]], 0.8,0.4,P.dgy); stroke(g, [[CX,34],[45,49]], 0.8,0.4,P.dgy);
    ball(g,CX,20,7,6,P.dgy,P.navy);
    stroke(g, [[CX,22],[31,10]], 0.8,0.4,P.navy);
    eyes(g,CX,20,5);
    smileArc(g,CX,26,1.8,0.8);
    blush(g,25,24); blush(g,39,24);
  }});

  S.push({ name: 'fig', draw(g) {
    stroke(g, [[CX,18],[36,9]], 2,1,P.grn);
    ball(g,CX,38,17,18,P.plum,P.brn,P.pnk);
    ellipse(g,CX,40,9,12,P.red);
    for (const [x,y] of [[29,36],[34,37],[31,44],[38,42]]) disc(g,x,y,1,P.yel);
    eyes(g,CX,31,6);
    smileArc(g,CX,48,2.6,1);
    blush(g,21,43); blush(g,43,43);
  }});

  S.push({ name: 'jellyfish', draw(g) {
    ball(g,CX,25,18,14,P.pnk,P.plum,P.crm);
    ellipse(g,CX,36,18,4,P.plum);
    for (const x of [20,27,34,41,48]) stroke(g, [[x,36],[x-3,48],[x+1,58]], 1.4,0.8,P.pnk);
    eyes(g,CX,25,7);
    smileArc(g,CX,31,2.8,1.2);
    blush(g,20,30); blush(g,44,30);
  }});

  S.push({ name: 'tennis', draw(g) {
    disc(g,43,20,11,P.lim);
    stroke(g, [[36,13],[50,27]], 1.1,1.1,P.crm); stroke(g, [[50,13],[36,27]], 1.1,1.1,P.crm);
    ellipse(g,23,37,11,18,P.lav); ellipse(g,23,37,7,13,null);
    stroke(g, [[29,48],[42,58]], 3,2,P.brn);
    for (let x = 18; x <= 28; x += 4) stroke(g, [[x,25],[x,49]], 0.6,0.6,P.crm);
    for (let y = 29; y <= 45; y += 4) stroke(g, [[15,y],[31,y]], 0.6,0.6,P.crm);
    eyes(g,43,20,4);
    smileArc(g,43,25,1.8,0.8);
    blush(g,36,23); blush(g,50,23);
  }});

  S.push({ name: 'seaweed', draw(g) {
    ellipse(g,CX,58,20,4,P.brn);
    for (const [x,c] of [[18,P.grn],[27,P.lim],[36,P.grn],[45,P.lim]]) {
      stroke(g, [[x,57],[x-3,43],[x+2,28],[x-1,14]], 3,1.4,c);
      ellipse(g,x+4,34,4,9,c);
    }
    disc(g,25,24,2,P.red); disc(g,41,42,2,P.red);
    eyes(g,CX,39,5);
    smileArc(g,CX,45,2.4,1);
    blush(g,23,43); blush(g,41,43);
  }});

  S.push({ name: 'carousel', draw(g) {
    stroke(g, [[CX,10],[CX,57]], 1.6,1.6,P.yel);
    tri(g,9,20,55,20,CX,6,P.red);
    rect(g,13,20,51,24,P.yel);
    stroke(g, [[20,24],[20,54]], 0.8,0.8,P.yel); stroke(g, [[44,24],[44,54]], 0.8,0.8,P.yel);
    ball(g,CX,42,13,8,P.crm,P.lgy);
    ellipse(g,23,38,6,7,P.crm); tri(g,18,34,23,36,20,29,P.crm);
    for (const x of [24,39]) stroke(g, [[x,49],[x-2,57]], 1.2,1.2,P.brn);
    ball(g,45,41,5,5,P.pnk,P.plum);
    eyes(g,28,39,5);
    smileArc(g,28,44,2,0.8);
    blush(g,21,42); blush(g,34,42);
  }});

  S.push({ name: 'reef', draw(g) {
    ellipse(g,CX,56,27,5,P.sky);
    ball(g,22,46,9,9,P.org,P.brn); ball(g,38,44,12,10,P.lgy,P.lav);
    ball(g,48,49,7,6,P.pnk,P.plum);
    stroke(g, [[17,38],[13,27]], 2,1,P.red); stroke(g, [[17,38],[24,28]], 2,1,P.red);
    stroke(g, [[42,36],[45,24]], 1.8,1,P.grn); stroke(g, [[42,36],[36,26]], 1.8,1,P.grn);
    eyes(g,CX,45,5);
    smileArc(g,CX,51,2.2,1);
    blush(g,23,49); blush(g,41,49);
  }});

  S.push({ name: 'ink', draw(g) {
    rrect(g,21,24,43,55,4,P.dgy);
    rrect(g,24,18,40,27,2,P.navy);
    ellipse(g,CX,24,9,4,P.plum);
    ball(g,CX,39,10,9,P.navy,P.dgy);
    stroke(g, [[43,20],[53,10]], 2.4,1.2,P.brn);
    ellipse(g,54,9,5,2,P.pnk);
    eyes(g,CX,37,5);
    smileArc(g,CX,43,2.2,1);
    blush(g,24,41); blush(g,40,41);
  }});

  S.push({ name: 'banjo', draw(g) {
    stroke(g, [[37,28],[53,10]], 3.5,2.2,P.brn);
    rect(g,48,8,58,12,P.brn);
    disc(g,27,42,16,P.brn); disc(g,27,42,12,P.crm);
    rect(g,27,40,42,43,P.brn);
    for (let o = -3; o <= 3; o += 3) stroke(g, [[27,42+o],[54,10+o/2]], 0.5,0.5,P.lgy);
    eyes(g,27,39,5);
    smileArc(g,27,46,2.4,1);
    blush(g,17,44); blush(g,37,44);
  }});

  S.push({ name: 'hippo', draw(g) {
    disc(g,20,14,5,P.lav); disc(g,44,14,5,P.lav);
    disc(g,20,14,2.4,P.pch); disc(g,44,14,2.4,P.pch);
    ball(g,CX,48,13,9,P.lav,P.dgy);
    ball(g,25,56,4,3,P.lav,P.dgy); ball(g,39,56,4,3,P.lav,P.dgy);
    ball(g,CX,26,16,13,P.lav,P.dgy,P.crm);
    ball(g,CX,35,14,8,P.pch,P.lav);
    disc(g,27,33,1.4,P.dgy); disc(g,37,33,1.4,P.dgy);
    eyes(g,CX,25,7);
    smileArc(g,CX,39,3,1.2);
    blush(g,20,34); blush(g,44,34);
  }});

  S.push({ name: 'vinegar', draw(g) {
    rrect(g,23,10,41,17,2,P.brn);
    rrect(g,20,16,44,55,6,P.org);
    rrect(g,24,23,40,44,3,P.crm);
    ellipse(g,CX,20,10,4,P.yel);
    rect(g,26,11,38,13,P.dgy);
    disc(g,24,50,3,P.brn); disc(g,40,50,3,P.brn);
    eyes(g,CX,33,5);
    smileArc(g,CX,39,2.4,1);
    blush(g,24,37); blush(g,40,37);
  }});

  S.push({ name: 'dial', draw(g) {
    disc(g,CX,34,22,P.lgy);
    disc(g,CX,34,17,P.crm);
    for (let a = 0; a < 12; a++) {
      const th = a / 12 * Math.PI * 2;
      disc(g,CX + Math.cos(th) * 14,34 + Math.sin(th) * 14,1.2,P.dgy);
    }
    stroke(g, [[CX,34],[40,24]], 1.4,0.8,P.red);
    stroke(g, [[CX,34],[25,41]], 1.2,0.8,P.sky);
    disc(g,CX,34,3,P.yel);
    eyes(g,CX,33,5);
    smileArc(g,CX,42,2.4,1);
    blush(g,20,38); blush(g,44,38);
  }});

  S.push({ name: 'spray', draw(g) {
    rrect(g,20,25,45,56,5,P.sky);
    rrect(g,25,16,41,27,3,P.lgy);
    rect(g,36,18,54,22,P.lgy);
    tri(g,46,22,57,27,46,29,P.lgy);
    rect(g,25,31,41,45,P.crm);
    for (const [x,y] of [[55,19],[59,16],[58,24]]) disc(g,x,y,1.4,P.sky);
    ellipse(g,32,52,8,3,P.lav);
    eyes(g,32,38,5);
    smileArc(g,32,44,2.4,1);
    blush(g,23,42); blush(g,41,42);
  }});

  S.push({ name: 'feed', draw(g) {
    ellipse(g,CX,49,24,9,P.red);
    ellipse(g,CX,45,20,7,P.pch);
    ellipse(g,CX,44,14,4,P.yel);
    for (const [x,y] of [[22,39],[30,37],[39,38],[46,41]]) disc(g,x,y,2,P.org);
    stroke(g, [[42,20],[52,12]], 2,1.2,P.lgy);
    ellipse(g,53,11,5,3,P.lgy);
    eyes(g,CX,46,5);
    smileArc(g,CX,52,2.4,1);
    blush(g,22,49); blush(g,42,49);
  }});

  S.push({ name: 'fishing', draw(g) {
    ellipse(g,CX,56,26,4,P.sky);
    stroke(g, [[14,14],[25,28],[35,39]], 1.2,0.8,P.brn);
    stroke(g, [[35,39],[48,31],[51,43]], 0.7,0.5,P.lgy);
    disc(g,51,45,2,P.red);
    ball(g,28,42,13,8,P.sky,P.lav);
    tri(g,13,42,23,36,23,48,P.sky);
    tri(g,39,37,48,32,45,42,P.lav);
    eyes(g,31,40,5);
    smileArc(g,30,47,2.2,1);
    blush(g,21,45); blush(g,38,45);
  }});

  S.push({ name: 'date', draw(g) {
    rrect(g,14,13,50,55,4,P.crm);
    rect(g,14,13,50,24,P.red);
    rect(g,20,9,24,17,P.dgy); rect(g,40,9,44,17,P.dgy);
    disc(g,28,36,6,P.pnk); disc(g,36,36,6,P.pnk);
    tri(g,22,38,42,38,32,50,P.pnk);
    eyes(g,CX,34,5);
    smileArc(g,CX,43,2.4,1);
    blush(g,21,39); blush(g,43,39);
  }});

  S.push({ name: 'snowball', draw(g) {
    ball(g,CX,38,20,17,P.crm,P.lgy);
    ellipse(g,22,29,5,3,P.sky); ellipse(g,43,48,6,3,P.sky);
    disc(g,20,17,2,P.crm); disc(g,44,15,2,P.crm); disc(g,51,27,2,P.crm);
    eyes(g,CX,36,7);
    smileArc(g,CX,43,2.8,1.2);
    blush(g,20,40); blush(g,44,40);
  }});

  S.push({ name: 'chimpanzee', draw(g) {
    disc(g,15,25,6,P.dgy); disc(g,49,25,6,P.dgy);
    disc(g,15,25,3,P.pch); disc(g,49,25,3,P.pch);
    ball(g,CX,49,10,8,P.dgy,P.navy);
    ball(g,24,56,4,3,P.dgy,P.navy); ball(g,40,56,4,3,P.dgy,P.navy);
    ball(g,CX,25,15,13,P.dgy,P.navy);
    disc(g,26,25,7,P.pch); disc(g,38,25,7,P.pch);
    ellipse(g,CX,30,10,7,P.pch);
    eyes(g,CX,25,6);
    smileArc(g,CX,32,3,1);
    blush(g,23,30); blush(g,41,30);
  }});

  S.push({ name: 'buffet', draw(g) {
    rrect(g,10,43,54,56,3,P.brn);
    rect(g,13,55,17,59,P.brn); rect(g,47,55,51,59,P.brn);
    ellipse(g,22,39,12,5,P.lgy); ellipse(g,22,37,9,3,P.crm);
    ball(g,22,34,5,4,P.org,P.brn,P.yel);
    ellipse(g,42,38,11,5,P.lgy); ellipse(g,42,36,8,3,P.crm);
    ball(g,42,33,4,4,P.lim,P.grn);
    eyes(g,CX,47,5);
    smileArc(g,CX,52,2.4,1);
    blush(g,23,50); blush(g,41,50);
  }});

  S.push({ name: 'cricket', draw(g) {
    stroke(g, [[21,39],[12,50]], 1.3,0.8,P.grn); stroke(g, [[43,39],[52,50]], 1.3,0.8,P.grn);
    stroke(g, [[25,36],[17,28]], 1,0.6,P.grn); stroke(g, [[39,36],[47,28]], 1,0.6,P.grn);
    ball(g,CX,39,16,9,P.lim,P.grn);
    ball(g,CX,26,11,9,P.lim,P.grn,P.crm);
    stroke(g, [[27,18],[22,9]], 0.8,0.4,P.grn); stroke(g, [[37,18],[43,9]], 0.8,0.4,P.grn);
    eyes(g,CX,25,6);
    smileArc(g,CX,31,2.4,1);
    blush(g,23,29); blush(g,41,29);
  }});

  S.push({ name: 'shampoo', draw(g) {
    rrect(g,20,20,44,56,6,P.sky);
    rrect(g,25,12,39,21,3,P.lav);
    rect(g,28,8,44,12,P.lav);
    tri(g,42,12,52,15,42,18,P.lav);
    rrect(g,24,29,40,44,3,P.crm);
    stroke(g, [[27,36],[32,32],[37,36]], 1.1,1.1,P.sky);
    ellipse(g,CX,52,9,3,P.lav);
    eyes(g,CX,37,5);
    smileArc(g,CX,43,2.4,1);
    blush(g,23,41); blush(g,41,41);
  }});

  S.push({ name: 'bouquet', draw(g) {
    for (const [x,y,c] of [[22,22,P.red],[32,18,P.pnk],[42,23,P.org],[27,29,P.yel],[38,30,P.red]]) {
      disc(g,x,y,5,c); disc(g,x-3,y,2,P.crm); disc(g,x+3,y,2,P.crm);
    }
    stroke(g, [[23,33],[31,53]], 1.4,0.8,P.grn);
    stroke(g, [[33,31],[31,53]], 1.4,0.8,P.grn);
    stroke(g, [[42,34],[31,53]], 1.4,0.8,P.grn);
    tri(g,18,40,46,40,CX,58,P.lgy);
    rect(g,24,45,40,48,P.pnk);
    eyes(g,CX,43,5);
    smileArc(g,CX,49,2.2,1);
    blush(g,24,47); blush(g,40,47);
  }});

  S.push({ name: 'necktie', draw(g) {
    tri(g,24,10,40,10,CX,22,P.red);
    tri(g,CX,20,18,52,46,52,P.red);
    tri(g,CX,24,23,48,41,48,P.plum);
    rect(g,27,25,37,27,P.yel); rect(g,25,36,39,38,P.yel);
    ball(g,CX,54,9,4,P.red,P.plum);
    eyes(g,CX,35,5);
    smileArc(g,CX,43,2.4,1);
    blush(g,24,39); blush(g,40,39);
  }});

  S.push({ name: 'ledge', draw(g) {
    rrect(g,10,21,54,50,3,P.lgy);
    rrect(g,15,26,49,45,2,P.sky);
    rect(g,31,22,33,50,P.crm); rect(g,10,46,54,56,P.dgy);
    rrect(g,23,37,41,47,2,P.brn);
    ellipse(g,CX,32,5,9,P.lim); ellipse(g,26,34,4,7,P.grn); ellipse(g,38,34,4,7,P.grn);
    eyes(g,CX,50,4.5);
    smileArc(g,CX,54,2.2,0.8);
    blush(g,23,52); blush(g,41,52);
  }});

  S.push({ name: 'pick', draw(g) {
    tri(g,CX,10,12,50,52,50,P.sky);
    ellipse(g,CX,43,20,9,P.sky);
    tri(g,CX,16,20,47,44,47,P.lav);
    ellipse(g,27,27,5,3,P.crm);
    for (const y of [31,37,43]) stroke(g, [[20,y],[44,y]], 0.6,0.6,P.crm);
    eyes(g,CX,34,6);
    smileArc(g,CX,42,2.6,1);
    blush(g,22,38); blush(g,42,38);
  }});

  S.push({ name: 'canteen', draw(g) {
    rrect(g,10,24,54,55,3,P.brn);
    rect(g,14,28,50,51,P.crm);
    rect(g,17,24,23,55,P.lav); rect(g,41,24,47,55,P.lav);
    rect(g,16,15,48,23,P.red);
    rrect(g,20,8,44,17,4,P.yel);
    ellipse(g,CX,52,13,3,P.dgy);
    eyes(g,CX,37,6);
    smileArc(g,CX,45,2.6,1);
    blush(g,21,41); blush(g,43,41);
  }});

  S.push({ name: 'caviar', draw(g) {
    rrect(g,16,22,48,54,5,P.navy);
    ellipse(g,CX,22,16,6,P.lgy);
    ellipse(g,CX,20,13,4,P.crm);
    rrect(g,21,31,43,44,3,P.crm);
    for (const [x,y,c] of [[25,35,P.navy],[31,37,P.dgy],[37,35,P.navy],[29,41,P.dgy],[40,40,P.navy]]) disc(g,x,y,1.4,c);
    eyes(g,CX,47,5);
    smileArc(g,CX,52,2.4,1);
    blush(g,23,50); blush(g,41,50);
  }});

  S.push({ name: 'groom', draw(g) {
    rrect(g,22,38,42,56,4,P.navy);
    tri(g,23,39,31,52,31,39,P.crm); tri(g,41,39,33,52,33,39,P.crm);
    rect(g,29,43,35,47,P.red);
    ball(g,CX,26,12,11,P.pch,P.brn);
    ellipse(g,CX,17,12,5,P.brn);
    rect(g,23,11,41,16,P.navy); rect(g,26,5,38,12,P.navy);
    eyes(g,CX,26,6);
    smileArc(g,CX,32,2.4,1);
    blush(g,23,30); blush(g,41,30);
  }});

  S.push({ name: 'cuff', draw(g) {
    rrect(g,14,18,50,54,5,P.sky);
    rrect(g,18,21,46,51,3,P.crm);
    rect(g,31,21,33,51,P.lgy);
    disc(g,28,30,2,P.yel); disc(g,28,40,2,P.yel);
    disc(g,36,30,2,P.yel); disc(g,36,40,2,P.yel);
    rect(g,12,47,52,56,P.lav);
    eyes(g,CX,36,5);
    smileArc(g,CX,44,2.4,1);
    blush(g,22,40); blush(g,42,40);
  }});

  S.push({ name: 'fossil', draw(g) {
    ball(g,CX,38,22,17,P.brn,P.plum,P.org);
    stroke(g, [[21,40],[28,34],[36,34],[43,40]], 2.4,1.6,P.crm);
    stroke(g, [[28,34],[25,27]], 1.2,0.7,P.crm);
    stroke(g, [[36,34],[40,27]], 1.2,0.7,P.crm);
    disc(g,24,27,2,P.crm); disc(g,40,27,2,P.crm);
    ellipse(g,31,47,11,3,P.org);
    eyes(g,CX,38,5);
    smileArc(g,CX,45,2.4,1);
    blush(g,22,42); blush(g,42,42);
  }});

  S.push({ name: 'slug', draw(g) {
    ellipse(g,32,45,24,10,P.lim);
    ellipse(g,21,39,11,10,P.lim);
    ellipse(g,37,48,17,5,P.grn);
    stroke(g, [[19,31],[15,20]], 0.9,0.4,P.grn); stroke(g, [[26,31],[31,20]], 0.9,0.4,P.grn);
    disc(g,15,19,1.8,P.navy); disc(g,31,19,1.8,P.navy);
    eyes(g,22,39,5);
    smileArc(g,22,45,2.2,1);
    blush(g,14,43); blush(g,30,43);
  }});

  S.push({ name: 'aquarium', draw(g) {
    rrect(g,9,17,55,53,4,P.sky);
    rect(g,12,45,52,53,P.brn);
    ellipse(g,20,42,5,8,P.grn); ellipse(g,45,39,5,10,P.lim);
    ball(g,34,34,10,6,P.org,P.brn);
    tri(g,22,34,29,29,29,39,P.org);
    disc(g,38,32,1.2,P.navy);
    for (const [x,y] of [[18,25],[48,25],[25,30]]) disc(g,x,y,1.4,P.crm);
    eyes(g,CX,47,5);
    smileArc(g,CX,52,2.4,1);
    blush(g,23,50); blush(g,41,50);
  }});

  S.push({ name: 'mistletoe', draw(g) {
    stroke(g, [[CX,13],[CX,52]], 1.4,0.8,P.grn);
    for (const [x,y,s] of [[24,24,-1],[40,24,1],[22,36,-1],[42,36,1],[27,46,-1],[37,46,1]]) {
      ellipse(g,x,y,5,3,P.lim);
      stroke(g, [[CX,y+2],[x,y]], 0.8,0.5,P.grn);
    }
    disc(g,29,31,2,P.crm); disc(g,35,31,2,P.crm); disc(g,32,39,2,P.crm);
    rect(g,25,11,39,15,P.red);
    eyes(g,CX,35,5);
    smileArc(g,CX,43,2.3,1);
    blush(g,23,39); blush(g,41,39);
  }});

  S.push({ name: 'propeller', draw(g) {
    tri(g,28,29,21,7,39,10,P.lgy);
    tri(g,35,29,57,36,49,51,P.lgy);
    tri(g,31,36,7,45,16,53,P.lgy);
    ellipse(g,30,11,10,4,P.lav);
    ellipse(g,52,43,5,10,P.lav);
    ellipse(g,13,49,9,5,P.lav);
    disc(g,CX,32,8,P.yel);
    disc(g,CX,32,4,P.org);
    eyes(g,CX,30,4.5);
    smileArc(g,CX,37,2.2,0.9);
    blush(g,24,34); blush(g,40,34);
  }});

S.push({ name: 'drill', draw(g) {              // 電鑽 din6 zyun3
    stroke(g, [[42,29],[59,29]], 1.6, 0.6, P.lgy);       // drill bit
    disc(g, 42, 29, 4, P.dgy); disc(g, 42, 29, 2.4, P.lgy); // chuck
    rrect(g, 14, 20, 42, 38, 6, P.brn);                  // body (shadow)
    rrect(g, 14, 20, 40, 36, 6, P.org);                  // body
    rrect(g, 17, 37, 27, 56, 4, P.brn);                  // grip (shadow)
    rrect(g, 17, 37, 25, 54, 4, P.org);                  // grip
    rect(g, 24, 36, 30, 41, P.dgy);                      // trigger
    eyes(g, 26, 26, 6);
    smileArc(g, 26, 32, 3, 1.1);
    blush(g, 18, 30); blush(g, 34, 30);
  }});

S.push({ name: 'casserole', draw(g) {          // 砂鍋 saa1 wo1
    ball(g, 15, 41, 4, 4, P.brn, P.dgy);                 // handles
    ball(g, 48, 41, 4, 4, P.brn, P.dgy);
    ball(g, CX, 42, 17, 12, P.org, P.brn);               // pot body
    rect(g, 15, 34, 48, 38, P.brn);                      // rim
    ellipse(g, CX, 30, 16, 5, P.brn);                    // lid (shadow)
    ellipse(g, CX, 29, 15, 5, P.red);                    // lid
    disc(g, CX, 24, 2.5, P.yel);                         // knob
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 3, 1.2);
    blush(g, 20, 46); blush(g, 43, 46);
  }});

S.push({ name: 'spacecraft', draw(g) {         // 飛船 fei1 syun4
    for (const [sx,sy] of [[12,14],[52,18],[50,46]]) { g.set(sx,sy,P.yel); g.set(sx-1,sy,P.yel); g.set(sx+1,sy,P.yel); g.set(sx,sy-1,P.yel); g.set(sx,sy+1,P.yel); }
    tri(g, 14,44, 22,44, 11,57, P.org);                  // fins
    tri(g, 43,44, 51,44, 54,57, P.org);
    stroke(g, [[CX,50],[CX,61]], 3, 1, P.red);           // flame
    ball(g, CX, 34, 12, 20, P.lgy, P.lav, P.crm);        // rocket body
    tri(g, 19,18, 44,18, CX, 4, P.red);                  // nose cone
    disc(g, CX, 30, 7, P.sky);                           // porthole
    disc(g, CX, 30, 5, P.crm);
    eyes(g, CX, 29, 5);
    smileArc(g, CX, 33, 2.2, 0.9);
    blush(g, 23, 38); blush(g, 40, 38);
  }});

S.push({ name: 'coach', draw(g) {              // 大客車 daai6 haak3 ce1
    disc(g, 16, 53, 5, P.navy); disc(g, 47, 53, 5, P.navy);
    disc(g, 16, 53, 2, P.lgy); disc(g, 47, 53, 2, P.lgy);
    rrect(g, 6, 16, 58, 52, 5, P.brn);                   // body (shadow)
    rrect(g, 6, 16, 56, 50, 5, P.org);                   // body
    for (let x = 9; x <= 49; x += 8) rrect(g, x, 20, x+6, 29, 1, P.sky); // window row
    rect(g, 8, 33, 56, 35, P.red);                       // side stripe
    disc(g, 55, 45, 1.6, P.yel);                         // headlight
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 47, 3, 1.2);
    blush(g, 18, 45); blush(g, 45, 45);
  }});

S.push({ name: 'wand', draw(g) {               // 魔杖 mo1 zoeng6
    for (const [sx,sy] of [[14,20],[50,16],[48,40]]) { g.set(sx,sy,P.crm); g.set(sx-1,sy,P.crm); g.set(sx+1,sy,P.crm); g.set(sx,sy-1,P.crm); g.set(sx,sy+1,P.crm); }
    stroke(g, [[26,54],[36,28]], 2.4, 2, P.plum);        // handle (shadow)
    stroke(g, [[25,54],[35,28]], 1.4, 1, P.lav);         // handle
    const sx0 = 34, sy0 = 20;
    for (let i = 0; i < 5; i++) { const a = -Math.PI/2 + i*2*Math.PI/5;
      tri(g, sx0+Math.cos(a-0.5)*5, sy0+Math.sin(a-0.5)*5, sx0+Math.cos(a+0.5)*5, sy0+Math.sin(a+0.5)*5, sx0+Math.cos(a)*13, sy0+Math.sin(a)*13, P.yel); }
    disc(g, sx0, sy0, 7, P.yel);
    eyes(g, sx0, sy0, 4);
    smileArc(g, sx0, sy0+5, 2.4, 1);
    blush(g, sx0-6, sy0+3); blush(g, sx0+6, sy0+3);
  }});

S.push({ name: 'mascara', draw(g) {            // 睫毛膏 zit3 mou4 gou1
    rrect(g, 16, 22, 30, 56, 3, P.plum);                 // tube (shadow)
    rrect(g, 16, 22, 28, 54, 3, P.pnk);                  // tube
    rrect(g, 17, 13, 29, 24, 2, P.dgy);                  // cap
    stroke(g, [[42,16],[42,26]], 1.4, 1.4, P.dgy);       // wand stem
    ball(g, 42, 38, 5, 12, P.dgy, P.navy);               // brush
    for (let y = 28; y <= 48; y += 3) stroke(g, [[36,y],[48,y-2]], 0.6, 0.6, P.navy); // bristles
    eyes(g, 22, 34, 5);
    smileArc(g, 22, 40, 2.4, 1);
    blush(g, 16, 38); blush(g, 28, 38);
  }});

S.push({ name: 'pickle', draw(g) {             // 醃黃瓜 jip3 wong4 gwaa1
    ball(g, CX, 33, 13, 21, P.grn, P.navy, P.lim);       // pickle body
    for (const [x,y] of [[23,22],[40,22],[22,34],[41,34],[25,48],[38,48],[31,50]])
      disc(g, x, y, 1.4, P.lim);                         // warty bumps
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 38, 3, 1.2);
    blush(g, 21, 36); blush(g, 43, 36);
  }});

S.push({ name: 'darts', draw(g) {              // 飛鏢 fei1 biu1
    disc(g, CX, 30, 22, P.grn);                          // rings
    disc(g, CX, 30, 18, P.crm);
    disc(g, CX, 30, 14, P.red);
    disc(g, CX, 30, 10, P.crm);
    disc(g, CX, 30, 7, P.red);                           // bullseye
    tri(g, 44,10, 55,3, 50,17, P.sky);                   // dart flight
    stroke(g, [[49,10],[34,26]], 1.4, 1, P.lgy);         // shaft
    disc(g, 33, 27, 2, P.org);                           // soft toy tip
    eyes(g, CX, 29, 4);
    smileArc(g, CX, 34, 2, 0.9);
    blush(g, 24, 32); blush(g, 40, 32);
  }});

S.push({ name: 'fabric', draw(g) {             // 布料 bou3 liu2
    rrect(g, 12, 22, 52, 44, 3, P.plum);                 // bolt (shadow)
    rrect(g, 12, 22, 50, 42, 3, P.pnk);                  // bolt
    ellipse(g, 12, 33, 3, 10, P.plum);                   // rolled ends
    ellipse(g, 50, 33, 3, 10, P.red);
    tri(g, 12, 44, 30, 44, 14, 58, P.pnk);               // draping fold
    tri(g, 14, 44, 30, 44, 30, 58, P.plum);
    for (const y of [27,33,39]) rect(g, 18, y, 45, y+1, P.crm); // pattern lines
    eyes(g, 33, 31, 6);
    smileArc(g, 33, 37, 2.6, 1.1);
    blush(g, 25, 35); blush(g, 41, 35);
  }});

S.push({ name: 'stump', draw(g) {              // 株 zyu1
    ellipse(g, CX, 56, 16, 4, P.dgy);                    // ground
    rect(g, 16, 30, 48, 55, P.brn);                      // trunk
    clipTo(g, [P.brn], function () { rect(g, 43, 30, 48, 55, P.dgy); }); // bark shade
    ellipse(g, CX, 30, 16, 6, P.org);                    // cut top
    ellipse(g, CX, 30, 11, 4, P.brn);                    // rings
    ellipse(g, CX, 30, 6, 2.5, P.org);
    ball(g, 48, 39, 4, 3, P.brn, P.dgy);                 // branch stub
    eyes(g, CX, 43, 6);
    smileArc(g, CX, 49, 3, 1.2);
    blush(g, 22, 47); blush(g, 43, 47);
  }});

S.push({ name: 'spinach', draw(g) {            // 菠菜 bo1 coi3
    for (const [x,y,rx,ry] of [[18,30,8,13],[46,30,8,13],[24,20,7,11],[40,20,7,11],[CX,15,8,12]])
      ball(g, x, y, rx, ry, P.grn, P.navy, P.lim);       // outer leaves
    ball(g, CX, 34, 14, 15, P.lim, P.grn);               // front leaf
    for (const [x,y] of [[CX,22],[26,32],[38,32],[CX,45]]) stroke(g, [[CX,34],[x,y]], 0.7, 0.5, P.grn); // veins
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 40, 3, 1.2);
    blush(g, 22, 38); blush(g, 43, 38);
  }});

S.push({ name: 'sardine', draw(g) {            // 沙丁魚 saa1 ding1 jyu2
    tri(g, 44,32, 57,24, 55,42, P.lgy);                  // tail
    ball(g, 34, 33, 15, 10, P.lgy, P.lav, P.crm);        // rear body
    tri(g, 28,22, 40,22, 34,14, P.lav);                  // dorsal fin
    ball(g, 20, 34, 11, 10, P.lgy, P.lav, P.crm);        // head
    ellipse(g, 20, 40, 7, 3, P.crm);                     // belly
    clipTo(g, [P.lgy, P.lav], function () { stroke(g, [[24,26],[48,30]], 1, 1, P.sky); }); // side line
    eyes(g, 18, 32, 5);
    smileArc(g, 18, 38, 2.3, 1);
    blush(g, 11, 36); blush(g, 26, 36);
  }});

S.push({ name: 'charcoal', draw(g) {           // 木炭 muk6 taan3
    disc(g, 22, 20, 2, P.org); disc(g, 40, 18, 2, P.yel); disc(g, 31, 13, 1.5, P.org); // sparks
    ball(g, 22, 46, 11, 8, P.dgy, P.navy);               // lumps
    ball(g, 42, 46, 11, 8, P.dgy, P.navy);
    ball(g, CX, 34, 14, 11, P.navy, P.blk);              // dark top lump
    ball(g, CX, 32, 11, 8, P.dgy, P.navy);
    clipTo(g, [P.dgy, P.navy], function () { disc(g, 41, 43, 2, P.org); disc(g, 20, 49, 1.6, P.red); }); // glowing embers
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.8, 1.1);
    blush(g, 21, 36); blush(g, 42, 36);
  }});

S.push({ name: 'asteroid', draw(g) {           // 小行星 siu2 hang4 sing1
    for (const [sx,sy] of [[12,14],[52,16],[50,46],[14,48]]) { g.set(sx,sy,P.yel); g.set(sx-1,sy,P.yel); g.set(sx+1,sy,P.yel); g.set(sx,sy-1,P.yel); g.set(sx,sy+1,P.yel); }
    ball(g, CX, 33, 19, 17, P.lgy, P.dgy, P.crm);        // rock
    clipTo(g, [P.lgy, P.dgy, P.crm], function () {
      disc(g, 22, 22, 3, P.dgy); disc(g, 43, 41, 3.5, P.dgy); disc(g, 41, 20, 2, P.dgy);
      disc(g, 22, 22, 1.6, P.lgy); disc(g, 43, 41, 2, P.lgy);
    });
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 40, 3, 1.2);
    blush(g, 22, 38); blush(g, 42, 38);
  }});

S.push({ name: 'cougar', draw(g) {             // 美洲獅 mei5 zau1 si1
    stroke(g, [[42,50],[52,50],[56,42]], 3, 1.5, P.org); // long tail
    ball(g, CX, 49, 11, 8, P.org, P.brn);                // body
    ball(g, 25, 57, 4, 2.6, P.org, P.brn);               // feet
    ball(g, 38, 57, 4, 2.6, P.org, P.brn);
    ball(g, CX, 27, 14, 13, P.org, P.brn);               // head
    disc(g, 20, 17, 4, P.org); disc(g, 43, 17, 4, P.org); // rounded ears
    disc(g, 20, 17, 2, P.pch); disc(g, 43, 17, 2, P.pch);
    ball(g, CX, 33, 7, 5, P.pch, P.brn);                 // muzzle
    ellipse(g, CX, 30, 2, 1.4, P.navy);                  // nose
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 34, 2.4, 1);
    blush(g, CX-12, 31); blush(g, CX+12, 31);
  }});

S.push({ name: 'skateboard', draw(g) {         // 滑板 waat6 baan2
    stroke(g, [[10,36],[16,30],[48,30],[54,36]], 4, 4, P.red); // deck with kicktails
    rrect(g, 12, 30, 52, 38, 4, P.red);                  // deck body
    rect(g, 14, 30, 50, 33, P.pnk);                      // grip stripe
    rect(g, 20, 38, 24, 42, P.lgy); rect(g, 40, 38, 44, 42, P.lgy); // trucks
    disc(g, 22, 45, 4, P.yel); disc(g, 42, 45, 4, P.yel); // wheels
    disc(g, 22, 45, 1.6, P.crm); disc(g, 42, 45, 1.6, P.crm);
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 37, 2.6, 1);
    blush(g, 22, 35); blush(g, 42, 35);
  }});

S.push({ name: 'ark', draw(g) {                // 方舟 fong1 zau1
    ellipse(g, CX, 57, 24, 4, P.sky);                    // water
    rrect(g, 20, 20, 44, 38, 2, P.brn);                  // cabin (shadow)
    rrect(g, 20, 20, 42, 36, 2, P.org);                  // cabin
    tri(g, 16, 22, 48, 22, CX, 10, P.red);               // roof
    rrect(g, 27, 26, 37, 36, 1, P.brn);                  // door
    tri(g, 8, 40, 56, 40, 48, 54, P.brn);                // hull
    tri(g, 8, 40, 48, 54, 16, 54, P.brn);
    rect(g, 10, 40, 54, 44, P.org);                      // deck line
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 34, 2.2, 1);
    blush(g, 24, 33); blush(g, 40, 33);
  }});

S.push({ name: 'compass', draw(g) {            // 指南針 zi2 naam4 zam1
    ball(g, CX, 34, 20, 21, P.red, P.plum);              // round case
    disc(g, CX, 26, 13, P.navy);                         // bezel
    disc(g, CX, 26, 11, P.crm);                          // dial
    tri(g, CX, 16, 28, 27, 35, 27, P.red);               // north needle
    tri(g, CX, 36, 28, 27, 35, 27, P.lav);               // south needle
    disc(g, CX, 26, 1.6, P.dgy);                         // pivot
    eyes(g, CX, 46, 6);
    smileArc(g, CX, 51, 2.6, 1);
    blush(g, 21, 49); blush(g, 42, 49);
  }});

S.push({ name: 'reindeer', draw(g) {           // 馴鹿 seon4 luk2
    stroke(g, [[22,16],[18,6]], 1.4, 1, P.brn); stroke(g, [[20,11],[13,9]], 1, 0.7, P.brn); stroke(g, [[19,8],[22,2]], 1, 0.7, P.brn);
    stroke(g, [[41,16],[45,6]], 1.4, 1, P.brn); stroke(g, [[43,11],[50,9]], 1, 0.7, P.brn); stroke(g, [[44,8],[41,2]], 1, 0.7, P.brn);
    ball(g, CX, 49, 10, 8, P.brn, P.plum);               // body
    ball(g, 25, 57, 4, 2.6, P.brn, P.plum); ball(g, 38, 57, 4, 2.6, P.brn, P.plum); // legs
    ball(g, CX, 28, 13, 12, P.brn, P.plum);              // head
    disc(g, 18, 22, 3, P.brn); disc(g, 45, 22, 3, P.brn); // ears
    ball(g, CX, 35, 6, 5, P.pch, P.brn);                 // muzzle
    disc(g, CX, 36, 2.4, P.red);                         // red nose
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.2, 1);
    blush(g, CX-11, 33); blush(g, CX+11, 33);
  }});

S.push({ name: 'barber', draw(g) {             // 理髮師 lei5 faat3 si1
    rrect(g, 7, 22, 13, 52, 3, P.crm);                   // barber pole
    clipTo(g, [P.crm], function () { for (let y = 20; y < 54; y += 5) tri(g, 7,y-2, 13,y-4, 13,y+2, P.red); });
    ball(g, 34, 49, 10, 8, P.sky, P.lav);                // smock
    ball(g, 29, 57, 4, 2.6, P.pch, P.brn); ball(g, 40, 57, 4, 2.6, P.pch, P.brn);
    ball(g, 24, 48, 3, 2.6, P.pch, P.brn); ball(g, 45, 48, 3, 2.6, P.pch, P.brn);
    rect(g, 46, 43, 47, 50, P.dgy); for (let y = 44; y <= 49; y++) g.set(49, y, P.dgy); // comb
    ball(g, 34, 28, 13, 12, P.pch, P.brn);               // head
    ellipse(g, 34, 18, 12, 5, P.brn);                    // hair
    eyes(g, 34, 30, 6);
    smileArc(g, 34, 36, 3, 1.1);
    blush(g, 24, 34); blush(g, 44, 34);
  }});

S.push({ name: 'taxicab', draw(g) {            // 小黃 siu2 wong4
    disc(g, 19, 51, 6, P.navy); disc(g, 44, 51, 6, P.navy);
    disc(g, 19, 51, 2.4, P.lgy); disc(g, 44, 51, 2.4, P.lgy);
    rrect(g, 8, 40, 55, 52, 4, P.org);                   // lower body (shadow)
    rrect(g, 8, 40, 53, 50, 4, P.yel);                   // lower body
    rrect(g, 17, 28, 45, 41, 5, P.yel);                  // cabin
    rrect(g, 20, 30, 42, 39, 3, P.sky);                  // windshield
    rrect(g, 27, 22, 37, 28, 1, P.dgy);                  // roof taxi light
    for (let x = 10; x <= 50; x += 6) rect(g, x, 44, x+3, 47, (Math.floor(x/6)%2===0)?P.navy:P.crm); // checker
    disc(g, 51, 45, 2, P.crm);                           // headlight
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 38, 3, 1.2);
    blush(g, 24, 36); blush(g, 39, 36);
  }});

S.push({ name: 'buzzer', draw(g) {             // 蜂鳴器 fung1 ming4 hei3
    stroke(g, [[50,20],[55,26],[52,34]], 1.4, 1, P.yel); // sound waves
    stroke(g, [[54,15],[60,26],[56,38]], 1.2, 0.8, P.org);
    ellipse(g, CX, 50, 20, 8, P.dgy);                    // base (shadow)
    ellipse(g, CX, 47, 20, 8, P.lgy);                    // base
    ball(g, CX, 34, 18, 14, P.red, P.plum, P.pnk);       // red dome button
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 39, 3, 1.2);
    blush(g, 20, 37); blush(g, 43, 37);
  }});

S.push({ name: 'plumber', draw(g) {            // 水管工 seoi2 gun2 gung1
    ball(g, CX, 49, 10, 8, P.sky, P.lav);                // shirt
    rrect(g, 22, 44, 42, 58, 2, P.navy);                 // overalls
    rect(g, 25, 40, 28, 48, P.navy); rect(g, 36, 40, 39, 48, P.navy); // straps
    ball(g, 26, 58, 3.6, 2.4, P.brn, P.blk); ball(g, 38, 58, 3.6, 2.4, P.brn, P.blk); // boots
    ball(g, 20, 48, 3.2, 2.6, P.pch, P.brn); ball(g, 43, 48, 3.2, 2.6, P.pch, P.brn); // hands
    stroke(g, [[43,48],[50,40]], 2, 2, P.lgy); rect(g, 48, 36, 52, 40, P.lgy); g.set(50, 37, null); // wrench
    ball(g, CX, 27, 13, 12, P.pch, P.brn);               // head
    rrect(g, 18, 12, 45, 19, 2, P.red);                  // cap brim
    ellipse(g, CX, 12, 11, 5, P.red);                    // cap
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.1);
    blush(g, CX-11, 33); blush(g, CX+11, 33);
  }});

S.push({ name: 'stream', draw(g) {             // 山坑 saan1 haang1
    ellipse(g, CX, 32, 26, 24, P.grn);                   // grassy banks
    stroke(g, [[16,10],[34,22],[22,36],[40,50],[30,60]], 7, 7, P.sky); // winding water
    clipTo(g, [P.sky], function () { stroke(g, [[16,10],[34,22],[22,36],[40,50],[30,60]], 3, 3, P.crm); }); // shimmer
    disc(g, 44, 22, 3, P.lgy); disc(g, 18, 44, 3, P.lgy); disc(g, 47, 40, 2.5, P.lgy); // rocks
    eyes(g, 27, 30, 5);
    smileArc(g, 27, 35, 2.4, 1);
    blush(g, 20, 33); blush(g, 34, 33);
  }});

S.push({ name: 'hammock', draw(g) {            // 吊床 diu3 cong4
    stroke(g, [[9,10],[9,54]], 2, 2, P.brn);             // posts
    stroke(g, [[55,10],[55,54]], 2, 2, P.brn);
    stroke(g, [[9,22],[CX,44],[55,22]], 4, 4, P.red);    // sling (shadow)
    stroke(g, [[9,22],[CX,40],[55,22]], 2.5, 2.5, P.pnk); // hammock
    clipTo(g, [P.red, P.pnk], function () { for (let x = 14; x <= 50; x += 6) stroke(g, [[x,26],[x,44]], 0.6, 0.6, P.crm); }); // net
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 39, 2.6, 1);
    blush(g, 22, 37); blush(g, 42, 37);
  }});

S.push({ name: 'rooftop', draw(g) {            // 天台 tin1 toi4
    rrect(g, 12, 30, 52, 58, 1, P.lgy);                  // building (shadow)
    rrect(g, 12, 30, 50, 56, 1, P.crm);                  // building
    rect(g, 12, 30, 50, 34, P.dgy);                      // flat roof slab
    for (let x = 14; x <= 48; x += 6) rect(g, x, 24, x+1, 30, P.lav); // railing posts
    rect(g, 12, 23, 50, 25, P.lav);                      // top rail
    rrect(g, 34, 18, 46, 30, 1, P.brn);                  // rooftop tank/shed
    rrect(g, 18, 40, 27, 48, 1, P.sky);                  // window
    eyes(g, 35, 44, 5);
    smileArc(g, 35, 49, 2.6, 1.1);
    blush(g, 28, 47); blush(g, 42, 47);
  }});

S.push({ name: 'manager', draw(g) {            // 主管 zyu2 gun2
    ball(g, CX, 49, 11, 9, P.navy, P.blk);               // suit jacket
    tri(g, 26, 42, 37, 42, CX, 54, P.crm);               // shirt V
    rect(g, 30, 43, 33, 55, P.red);                      // tie
    ball(g, 26, 58, 4, 2.6, P.navy, P.blk); ball(g, 38, 58, 4, 2.6, P.navy, P.blk); // legs
    ball(g, 19, 48, 3.2, 2.6, P.pch, P.brn); ball(g, 44, 48, 3.2, 2.6, P.pch, P.brn); // hands
    ball(g, CX, 27, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 17, 12, 5, P.dgy);                    // neat hair
    disc(g, 40, 45, 2, P.yel);                           // badge
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.1);
    blush(g, CX-11, 33); blush(g, CX+11, 33);
  }});

S.push({ name: 'ditch', draw(g) {              // 溝 gau1
    rrect(g, 6, 22, 57, 56, 3, P.brn);                   // earth block
    rect(g, 6, 22, 57, 26, P.lim);                       // grass top
    tri(g, 22, 26, 41, 26, CX, 50, P.dgy);               // channel wall
    tri(g, 26, 26, 37, 26, CX, 46, P.lav);               // channel depth
    ellipse(g, CX, 47, 5, 2, P.sky);                     // water trickle
    for (const [x,y] of [[14,40],[48,38],[45,48]]) disc(g, x, y, 2, P.dgy); // pebbles
    eyes(g, 15, 33, 4);
    smileArc(g, 15, 37, 2, 0.9);
    blush(g, 10, 36); blush(g, 20, 36);
  }});

S.push({ name: 'rod', draw(g) {                // 棍 gwan3
    rrect(g, 27, 8, 37, 56, 4, P.dgy);                   // rod (shadow)
    rrect(g, 26, 8, 35, 54, 4, P.brn);                   // rod
    clipTo(g, [P.brn], function () { for (const y of [16,26,36,46]) rect(g, 26, y, 35, y+1, P.dgy); }); // grain
    ellipse(g, 30, 11, 3, 2, P.org);                     // top highlight
    eyes(g, 30, 30, 4);
    smileArc(g, 30, 36, 2.2, 1);
    blush(g, 25, 34); blush(g, 35, 34);
  }});

S.push({ name: 'volleyball', draw(g) {         // 排球 paai4 kau4
    ball(g, CX, 33, 20, 20, P.crm, P.lgy);               // ball
    clipTo(g, [P.crm, P.lgy], function () {
      stroke(g, [[14,26],[30,30],[50,26]], 1, 1, P.sky); // seams
      stroke(g, [[12,38],[28,36],[48,44]], 1, 1, P.sky);
      stroke(g, [[CX,14],[36,32],[CX,52]], 1, 1, P.sky);
      stroke(g, [[24,15],[20,33],[28,52]], 1, 1, P.sky);
    });
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 40, 3, 1.2);
    blush(g, 20, 38); blush(g, 43, 38);
  }});

S.push({ name: 'globe', draw(g) {                       // 地球儀 — spherical map on a stand
    rrect(g,24,54,40,58,2,P.brn);                         // wooden base
    rect(g,30,50,34,55,P.brn);                            // support post
    stroke(g,[[16,50],[13,30],[22,13]],1.6,1.6,P.dgy);    // meridian arc left
    stroke(g,[[48,50],[51,30],[42,13]],1.6,1.6,P.dgy);    // meridian arc right
    ball(g,CX,32,17,17,P.sky,P.lav,P.crm);                // ocean sphere
    clipTo(g,[P.sky,P.lav],()=>{ disc(g,24,25,5,P.lim); disc(g,38,34,6,P.grn); disc(g,29,42,4,P.lim); });
    eyes(g,CX,31,7);
    smileArc(g,CX,38,3,1.2);
    blush(g,20,36); blush(g,44,36);
  }});

S.push({ name: 'quarterback', draw(g) {                 // 四分衛 — football player + ball
    ball(g,CX,48,11,9,P.red,P.plum);                      // jersey
    ball(g,25,57,4,2.6,P.crm,P.lgy); ball(g,38,57,4,2.6,P.crm,P.lgy); // pants
    ball(g,19,47,3.2,2.6,P.pch,P.brn);                    // left hand
    ball(g,CX,25,13,12,P.pch,P.brn);                      // head
    ellipse(g,CX,16,13,7,P.sky);                          // helmet dome
    rect(g,19,20,45,24,P.sky);                            // helmet side
    stroke(g,[[21,28],[42,28]],0.7,0.7,P.lgy);            // facemask bar
    ball(g,47,44,6,4,P.brn,P.plum);                       // football
    rect(g,44,43,50,44,P.crm);                            // laces
    eyes(g,CX,27,6);
    smileArc(g,CX,32,2.6,1);
    blush(g,22,31); blush(g,42,31);
  }});

S.push({ name: 'syringe', draw(g) {                     // 針筒 — friendly syringe
    stroke(g,[[46,18],[54,10]],1,0.5,P.lgy);              // thin needle
    rrect(g,16,22,46,34,4,P.lgy);                         // barrel (shadow)
    rrect(g,16,22,46,32,4,P.crm);                         // barrel
    rrect(g,18,24,34,30,2,P.sky);                         // liquid
    rect(g,44,25,50,29,P.lgy);                            // tip cone
    rrect(g,8,20,16,36,2,P.plum);                         // plunger flange
    rect(g,10,26,18,30,P.pnk);                            // plunger rod
    eyes(g,30,27,4.5);
    smileArc(g,29,31,2.2,0.9);
    blush(g,22,30); blush(g,38,30);
  }});

S.push({ name: 'bulldozer', draw(g) {                   // 推土機 — dozer with blade + tracks
    disc(g,22,50,7,P.dgy); disc(g,40,50,7,P.dgy);         // track wheels
    rrect(g,14,44,50,54,4,P.navy);                        // track base
    disc(g,22,50,3,P.lgy); disc(g,40,50,3,P.lgy);
    rrect(g,24,26,50,45,3,P.org);                         // body
    rrect(g,28,18,46,30,2,P.sky);                         // cab window
    rrect(g,8,30,14,53,2,P.lav);                          // blade (shadow)
    rrect(g,7,30,13,52,2,P.lgy);                          // front blade
    stroke(g,[[13,34],[24,40]],1.4,1.4,P.dgy);            // blade arm
    eyes(g,37,24,5);
    smileArc(g,37,30,2.4,1);
    blush(g,30,28); blush(g,44,28);
  }});

S.push({ name: 'bait', draw(g) {                        // 誘餌 — friendly worm on hook
    stroke(g,[[46,8],[48,24],[40,33],[31,30]],1.6,1,P.lgy); // fish hook
    disc(g,46,7,1.8,P.lgy);                               // hook eye
    stroke(g,[[22,52],[27,42],[20,33],[27,23],[24,14]],4.5,3.5,P.pnk); // worm body
    ball(g,25,13,5,4.5,P.pnk,P.plum);                     // worm head
    for (const [x,y] of [[26,42],[21,33],[26,23]]) stroke(g,[[x-4,y],[x+4,y]],1,1,P.plum); // segments
    eyes(g,25,13,4);
    smileArc(g,25,18,2,0.9);
    blush(g,19,17); blush(g,31,17);
  }});

S.push({ name: 'wizard', draw(g) {                      // 巫師 — pointed hat + beard
    ball(g,CX,44,13,11,P.plum,P.navy);                    // robe
    ball(g,CX,29,12,11,P.pch,P.brn);                      // face
    stroke(g,[[24,38],[CX,55],[39,38]],5,1.5,P.crm);      // long beard
    ellipse(g,CX,40,7,4,P.crm);
    tri(g,15,24,48,24,CX,1,P.lav);                        // tall hat cone
    rect(g,14,23,49,27,P.lav);                            // brim
    ellipse(g,CX,10,7,4,P.sky);                           // hat band
    disc(g,CX,3,1.8,P.yel);                               // star tip
    for (const [x,y] of [[24,16],[37,19]]) disc(g,x,y,1.3,P.yel);
    eyes(g,CX,29,5);
    smileArc(g,CX,34,2,0.9);
    blush(g,22,33); blush(g,42,33);
  }});

S.push({ name: 'skate', draw(g) {                       // 冰刀 — ice skate boot + blade
    rrect(g,17,12,45,20,4,P.lgy);                         // boot cuff
    rrect(g,15,16,44,42,5,P.crm);                         // white boot
    rect(g,20,20,40,22,P.lgy);                            // tongue top
    stroke(g,[[24,26],[36,30]],0.7,0.7,P.sky); stroke(g,[[36,26],[24,30]],0.7,0.7,P.sky); // laces
    rect(g,13,42,47,45,P.lgy);                            // sole plate
    rect(g,19,45,22,51,P.lgy); rect(g,38,45,41,51,P.lgy); // blade posts
    ellipse(g,30,52,18,3,P.crm);                          // long blade
    ellipse(g,30,52,18,1.5,P.lgy);
    disc(g,13,50,2,P.crm);                                // upturned toe
    eyes(g,30,35,5);
    smileArc(g,30,40,2.4,1);
    blush(g,22,38); blush(g,40,38);
  }});

S.push({ name: 'asparagus', draw(g) {                   // 露筍 — green spears bundle
    for (const [x,c] of [[22,P.grn],[28,P.lim],[34,P.grn],[40,P.lim]]) {
      stroke(g,[[x,52],[x,16]],2.5,2,c);                  // stalk
      tri(g,x-3,18,x+3,18,x,8,c);                         // pointed tip
      for (const yy of [14,20,26]) { g.set(x-3,yy,P.grn); g.set(x+3,yy,P.grn); } // scale bumps
    }
    rect(g,18,40,44,44,P.red);                            // tie band
    eyes(g,CX,50,5);
    smileArc(g,CX,55,2.4,1);
    blush(g,22,54); blush(g,40,54);
  }});

S.push({ name: 'trunks', draw(g) {                      // 泳褲 — swim trunks
    rect(g,14,24,49,42,P.sky);                            // shorts body
    rect(g,14,42,29,52,P.sky);                            // left leg
    rect(g,34,42,49,52,P.sky);                            // right leg
    rect(g,14,20,49,26,P.navy);                           // waistband
    stroke(g,[[27,23],[31,28],[35,23]],0.8,0.8,P.crm);    // drawstring
    clipTo(g,[P.sky],()=>{ for (const x of [20,31,42]) rect(g,x,26,x+2,52,P.crm); }); // stripes
    ellipse(g,31,46,3,4,P.lav);                           // center gap
    eyes(g,CX,33,5);
    smileArc(g,CX,38,2.4,1);
    blush(g,20,37); blush(g,42,37);
  }});

S.push({ name: 'trombone', draw(g) {                    // 長號 — brass bell + slide
    ellipse(g,18,34,11,10,P.org);                         // bell (shadow)
    ellipse(g,18,34,8,7,P.yel);
    stroke(g,[[26,28],[52,20]],2.2,2.2,P.yel);            // top tube
    rect(g,48,18,53,44,P.org);                            // U bend
    stroke(g,[[26,40],[50,42]],2.2,2.2,P.org);            // slide tube
    disc(g,54,19,1.8,P.yel);                              // mouthpiece
    eyes(g,17,32,5);
    smileArc(g,17,38,2.4,1);
    blush(g,10,36); blush(g,25,36);
  }});

S.push({ name: 'noodle', draw(g) {                      // 米粉 — noodle bowl
    ellipse(g,CX,42,20,4,P.crm);                          // noodle mound
    for (const x of [18,24,31,38,44]) stroke(g,[[x,40],[x-2,30],[x+2,24]],1.4,1,P.yel); // strands
    rrect(g,12,40,52,56,3,P.plum);                        // bowl (shadow)
    rrect(g,12,40,50,54,3,P.red);                         // bowl
    rect(g,12,42,50,45,P.crm);                            // rim highlight
    stroke(g,[[40,14],[48,44]],1,1,P.brn); stroke(g,[[44,14],[52,44]],1,1,P.brn); // chopsticks
    eyes(g,25,48,5);
    smileArc(g,25,53,2.4,1);
    blush(g,18,51); blush(g,32,51);
  }});

S.push({ name: 'plunger', draw(g) {                     // 搋子 — drain plunger
    rect(g,29,10,35,40,P.brn);                            // handle (shadow)
    rect(g,29,10,33,40,P.org);                            // handle
    disc(g,32,10,3,P.org);                                // knob
    ellipse(g,CX,44,16,10,P.plum);                        // rubber cup (shadow)
    ellipse(g,CX,42,16,10,P.red);                         // rubber cup
    ellipse(g,CX,38,11,5,P.plum);                         // cup rim inner
    rect(g,20,50,44,54,P.plum);                           // base ring
    eyes(g,CX,42,5);
    smileArc(g,CX,48,2.6,1);
    blush(g,21,46); blush(g,42,46);
  }});

S.push({ name: 'guard', draw(g) {                       // 侍衛官 — royal guard, bearskin hat
    ball(g,CX,48,11,9,P.red,P.plum);                      // red coat
    rect(g,30,40,33,57,P.yel);                            // gold buttons
    ball(g,25,57,4,2.6,P.navy,P.dgy); ball(g,38,57,4,2.6,P.navy,P.dgy); // trousers
    ball(g,20,47,3,2.4,P.pch,P.brn); ball(g,43,47,3,2.4,P.pch,P.brn); // hands
    ball(g,CX,28,11,10,P.pch,P.brn);                      // face
    ellipse(g,CX,13,10,13,P.navy);                        // tall bearskin hat (shadow)
    ellipse(g,CX,12,9,12,P.dgy);                          // fuzzy hat
    eyes(g,CX,29,5);
    smileArc(g,CX,34,2.4,1);
    blush(g,24,33); blush(g,40,33);
  }});

S.push({ name: 'painter', draw(g) {                     // 畫家 — artist, beret + palette
    ball(g,CX,49,10,8,P.crm,P.lgy);                       // smock
    ball(g,26,57,4,2.6,P.pch,P.brn); ball(g,38,57,4,2.6,P.pch,P.brn);
    ball(g,20,48,3.2,2.6,P.pch,P.brn);                    // left hand
    ball(g,CX,27,13,12,P.pch,P.brn);                      // head
    ellipse(g,CX,16,12,5,P.brn);                          // hair
    ellipse(g,CX,13,10,4,P.plum);                         // beret
    disc(g,26,11,1.4,P.plum);                             // beret nub
    ellipse(g,46,48,8,6,P.brn);                           // palette
    for (const [x,y,c] of [[43,46,P.red],[49,46,P.sky],[46,51,P.yel]]) disc(g,x,y,1.6,c); // paint blobs
    eyes(g,CX,29,6);
    smileArc(g,CX,35,2.6,1);
    blush(g,22,33); blush(g,42,33);
  }});

S.push({ name: 'postman', draw(g) {                     // 郵差 — mailman, cap + satchel
    ball(g,CX,49,10,8,P.sky,P.lav);                       // uniform
    ball(g,26,57,4,2.6,P.navy,P.dgy); ball(g,38,57,4,2.6,P.navy,P.dgy);
    ball(g,20,48,3.2,2.6,P.pch,P.brn); ball(g,43,48,3.2,2.6,P.pch,P.brn);
    rrect(g,40,46,52,55,2,P.brn);                         // satchel
    rect(g,44,44,48,47,P.crm);                            // letter
    ball(g,CX,28,12,11,P.pch,P.brn);                      // head
    rrect(g,19,15,44,20,2,P.navy);                        // cap brim
    ellipse(g,CX,13,10,5,P.sky);                          // cap dome
    disc(g,CX,13,1.6,P.yel);                              // badge
    eyes(g,CX,30,6);
    smileArc(g,CX,36,2.4,1);
    blush(g,24,34); blush(g,40,34);
  }});

S.push({ name: 'antenna', draw(g) {                     // 天線 — rabbit-ear aerial + base
    stroke(g,[[CX,40],[15,9]],1.4,0.8,P.lgy);             // left rod
    stroke(g,[[CX,40],[48,9]],1.4,0.8,P.lgy);             // right rod
    disc(g,14,8,2.2,P.red); disc(g,49,8,2.2,P.red);       // rod tips
    for (const [x,y] of [[9,6],[11,3],[54,6],[52,3]]) disc(g,x,y,1,P.yel); // signal sparks
    rrect(g,20,38,45,55,3,P.dgy);                         // base (shadow)
    rrect(g,20,38,43,53,3,P.navy);                        // base
    rect(g,24,42,39,48,P.sky);                            // panel
    eyes(g,31,44,4);
    smileArc(g,31,49,2.2,0.9);
    blush(g,24,47); blush(g,39,47);
  }});

S.push({ name: 'podium', draw(g) {                      // 領獎臺 — winner's podium + medal
    rrect(g,7,36,24,57,1,P.lav);                          // 2nd place (left)
    rrect(g,40,42,57,57,1,P.lav);                         // 3rd place (right)
    rrect(g,22,28,42,57,1,P.sky);                         // 1st place (center, tallest)
    tri(g,25,24,31,24,28,32,P.red); tri(g,33,24,39,24,36,32,P.sky); // ribbons
    disc(g,CX,20,7,P.org); disc(g,CX,20,5,P.yel);         // gold medal
    eyes(g,CX,40,5);
    smileArc(g,CX,46,2.4,1);
    blush(g,24,44); blush(g,40,44);
  }});

S.push({ name: 'streetcar', draw(g) {                   // 有軌電車 — tram + trolley pole
    stroke(g,[[CX,20],[44,6]],0.8,0.8,P.dgy);             // trolley pole
    disc(g,44,6,1.6,P.yel);                               // pole shoe
    rect(g,8,10,56,12,P.dgy);                             // overhead wire
    disc(g,16,52,5,P.navy); disc(g,47,52,5,P.navy);       // wheels
    rrect(g,10,22,53,52,4,P.grn);                         // body (shadow)
    rrect(g,10,22,51,50,4,P.lim);                         // body
    rrect(g,14,26,49,38,2,P.sky);                         // windows band
    rect(g,30,26,33,38,P.lim);                            // window divider
    rect(g,10,46,51,49,P.crm);                            // skirt stripe
    eyes(g,CX,31,5);
    smileArc(g,CX,43,2.6,1);
    blush(g,20,42); blush(g,44,42);
  }});

S.push({ name: 'windmill', draw(g) {                    // 風車 — pinwheel
    stroke(g,[[CX,28],[46,58]],1.6,1.6,P.brn);            // stick
    tri(g,CX,28,54,18,54,34,P.pnk);                       // right vane
    tri(g,CX,28,24,4,40,4,P.yel);                         // top vane
    tri(g,CX,28,9,22,9,38,P.sky);                         // left vane
    tri(g,CX,28,24,52,40,52,P.lim);                       // bottom vane
    ball(g,CX,28,7,7,P.red,P.plum,P.pnk);                 // hub
    eyes(g,CX,27,5);
    smileArc(g,CX,32,2.2,0.9);
    blush(g,23,31); blush(g,40,31);
  }});

S.push({ name: 'wreath', draw(g) {                      // 花圈 — garland ring + bow
    for (let a=0;a<16;a++){ const th=a/16*Math.PI*2; disc(g,CX+Math.cos(th)*18,32+Math.sin(th)*18,6,P.grn); }
    for (let a=0;a<16;a++){ const th=a/16*Math.PI*2+0.2; disc(g,CX+Math.cos(th)*18,32+Math.sin(th)*18,4,P.lim); }
    disc(g,CX,32,11,null);                                // hollow center
    disc(g,CX,32,6,P.crm);                                // face medallion
    for (const [x,y] of [[20,20],[44,22],[22,44],[42,42]]) disc(g,x,y,2,P.red); // berries
    rect(g,26,48,37,52,P.red);                            // bow knot
    tri(g,26,48,20,54,26,54,P.red); tri(g,37,48,43,54,37,54,P.red); // bow tails
    eyes(g,CX,31,4);
    smileArc(g,CX,35,2,0.9);
    blush(g,25,34); blush(g,38,34);
  }});

S.push({ name: 'vet', draw(g) {                         // 獸醫 — vet, white coat + puppy
    ball(g,CX,49,10,8,P.crm,P.lgy);                       // coat
    ball(g,26,57,4,2.6,P.pch,P.brn); ball(g,38,57,4,2.6,P.pch,P.brn);
    ball(g,20,48,3.2,2.6,P.pch,P.brn);                    // left hand
    disc(g,44,49,5,P.brn);                                // puppy head
    disc(g,40,45,2,P.brn); disc(g,48,45,2,P.brn);         // puppy ears
    g.set(44,50,P.navy);                                  // puppy nose
    disc(g,29,47,2,P.grn); for(const[dx,dy] of [[-2,-2],[2,-2],[-2,2],[2,2]]) disc(g,29+dx,47+dy,0.8,P.grn); // paw badge
    ball(g,CX,27,13,12,P.pch,P.brn);                      // head
    ellipse(g,CX,16,12,5,P.brn);                          // hair
    eyes(g,CX,29,6);
    smileArc(g,CX,35,2.6,1);
    blush(g,22,33); blush(g,42,33);
  }});

S.push({ name: 'marshmallow', draw(g) {                 // 棉花糖 — marshmallow on skewer
    stroke(g,[[36,54],[30,26]],1,1,P.brn);               // skewer
    rrect(g,18,18,44,42,7,P.lgy);                         // marshmallow (shadow)
    rrect(g,18,16,42,40,7,P.crm);                         // marshmallow
    ellipse(g,30,17,12,3,P.crm);                          // top round
    rect(g,18,26,42,28,P.lgy);                            // seam
    ellipse(g,30,40,12,3,P.org);                          // toasted bottom
    eyes(g,30,26,5);
    smileArc(g,30,32,2.6,1.1);
    blush(g,21,30); blush(g,39,30);
  }});

S.push({ name: 'jockey', draw(g) {                      // 騎師 — jockey riding a horse
    stroke(g,[[46,44],[52,40]],1.6,1.2,P.brn);            // horse tail
    ball(g,34,44,15,9,P.brn,P.plum);                      // horse body
    ball(g,24,54,3,3,P.brn); ball(g,44,54,3,3,P.brn);     // horse legs
    ball(g,16,36,7,6,P.brn,P.plum);                       // horse head
    tri(g,12,32,17,33,13,26,P.brn);                       // horse ear
    g.set(11,38,P.navy);                                  // horse eye
    smileArc(g,12,41,1.6,0.7);                            // horse smile
    ball(g,34,30,6,7,P.sky,P.lav);                        // jockey silks
    ball(g,34,20,6,6,P.pch,P.brn);                        // jockey head
    ellipse(g,34,15,6,3,P.red);                           // jockey cap
    eyes(g,34,20,4);
    smileArc(g,34,24,1.8,0.8);
    blush(g,29,23); blush(g,39,23);
  }});

S.push({ name: 'haystack', draw(g) {                    // 禾桿冚珍珠 — hay mound + hidden pearl
    ball(g,CX,42,22,17,P.yel,P.org);                      // hay mound
    for (const x of [16,24,31,39,47]) stroke(g,[[x,28],[x+(x<CX?-2:2),56]],0.7,0.7,P.org); // straw
    ellipse(g,CX,26,10,4,P.yel);                          // rounded top
    disc(g,46,52,3,P.crm); disc(g,45,51,1.4,P.lgy);       // hidden pearl (the idiom)
    eyes(g,CX,40,6);
    smileArc(g,CX,47,2.8,1.2);
    blush(g,22,45); blush(g,42,45);
  }});

S.push({ name: 'auntie', draw(g) {                      // 阿姐 — auntie, hair bun + apron
    disc(g,CX,10,5,P.dgy);                                // hair bun
    ball(g,CX,49,11,9,P.plum,P.navy);                     // blouse
    tri(g,20,50,43,50,CX,58,P.plum);                      // skirt
    rrect(g,24,44,40,56,2,P.crm);                         // apron
    ball(g,25,58,3.6,2.4,P.pch,P.brn); ball(g,38,58,3.6,2.4,P.pch,P.brn);
    ball(g,20,48,3,2.4,P.pch,P.brn); ball(g,43,48,3,2.4,P.pch,P.brn);
    ball(g,CX,28,13,12,P.pch,P.brn);                      // head
    ellipse(g,CX,17,13,6,P.dgy);                          // grey hair
    ellipse(g,18,23,2,4,P.dgy); ellipse(g,45,23,2,4,P.dgy);
    eyes(g,CX,30,6);
    smileArc(g,CX,36,3,1.2);
    blush(g,CX-11,34); blush(g,CX+11,34);
  }});

S.push({ name: 'locket', draw(g) {                      // 掛墜盒 — heart locket + chain
    disc(g,CX,9,2.5,P.yel);                               // top ring
    stroke(g,[[CX,11],[21,26]],0.8,0.8,P.yel);            // chain left
    stroke(g,[[CX,11],[42,26]],0.8,0.8,P.yel);            // chain right
    disc(g,23,30,10,P.org); disc(g,40,30,10,P.org); tri(g,14,33,49,33,CX,56,P.org); // heart (shadow)
    disc(g,23,29,8.5,P.red); disc(g,40,29,8.5,P.red); tri(g,16,33,47,33,CX,53,P.red); // heart
    ellipse(g,25,24,3,2,P.pnk);                           // shine
    disc(g,CX,25,2,P.yel);                                // hinge
    eyes(g,CX,34,5);
    smileArc(g,CX,41,2.6,1.1);
    blush(g,23,39); blush(g,41,39);
  }});

S.push({ name: 'celery', draw(g) {                      // 芹菜 — celery, leafy tops + ribbed
    for (const x of [23,31,39]) { disc(g,x,15,4,P.lim); disc(g,x-3,18,3,P.grn); disc(g,x+3,18,3,P.lim); }
    ball(g,CX,40,11,18,P.lim,P.grn);                      // bundle
    for (const x of [26,31,37]) rect(g,x,44,x+1,54,P.grn); // rib grooves
    rect(g,17,46,46,50,P.red);                            // tie band
    eyes(g,CX,34,5);
    smileArc(g,CX,40,2.4,1);
    blush(g,21,38); blush(g,42,38);
  }});

S.push({ name: 'licorice', draw(g) {                    // 甘草 — twisted licorice rope
    for (let i=0;i<2;i++){ const ph=i*Math.PI;
      for (let t=0;t<=1;t+=0.05){ const y=14+t*40; const x=CX+Math.sin(t*7+ph)*8; disc(g,x,y,3,i?P.brn:P.dgy); } }
    eyes(g,CX,30,4.5);
    smileArc(g,CX,35,2.2,0.9);
    blush(g,22,33); blush(g,41,33);
  }});

S.push({ name: 'frosting', draw(g) {                    // 糖霜 — cupcake with frosting swirl
    rrect(g,18,38,44,56,2,P.org);                         // liner (shadow)
    rrect(g,18,38,42,54,2,P.yel);                         // liner
    for (const x of [22,28,34,40]) rect(g,x,38,x+1,54,P.org); // ridges
    ellipse(g,CX,36,15,6,P.pnk);                          // swirl base
    ellipse(g,CX,29,11,5,P.pnk);                          // swirl mid
    ellipse(g,CX,23,7,4,P.pnk);                           // swirl top
    clipTo(g,[P.pnk],()=>{ ellipse(g,26,33,10,3,P.pch); ellipse(g,29,27,7,2,P.pch); }); // highlight
    disc(g,CX,17,3,P.red);                                // cherry
    g.set(31,13,P.grn); g.set(32,13,P.grn);               // stem
    eyes(g,CX,32,5);
    smileArc(g,CX,38,2.4,1);
    blush(g,22,36); blush(g,40,36);
  }});

S.push({ name: 'squid', draw(g) {                       // 魷魚 — squid, mantle + tentacles
    tri(g,CX,6,23,18,40,18,P.pnk);                        // pointed mantle tip
    ball(g,CX,26,13,17,P.pnk,P.plum,P.crm);               // mantle
    ellipse(g,17,24,5,8,P.pnk); ellipse(g,46,24,5,8,P.pnk); // side fins
    for (const x of [20,26,31,37,43]) stroke(g,[[x,40],[x-2,52],[x+2,60]],1.6,0.9,P.pnk); // tentacles
    stroke(g,[[24,40],[18,58]],1.2,2,P.plum); stroke(g,[[39,40],[46,58]],1.2,2,P.plum); // long arms
    eyes(g,CX,24,7);
    smileArc(g,CX,31,2.8,1.2);
    blush(g,20,29); blush(g,44,29);
  }});

S.push({ name: 'greenhouse', draw(g) {
    tri(g, 12, 24, 51, 24, CX, 10, P.lav);              // roof glass shadow
    tri(g, 14, 24, 49, 24, CX, 12, P.sky);              // roof glass
    rrect(g, 14, 24, 49, 54, 2, P.lav);                 // wall shadow
    rrect(g, 14, 24, 47, 52, 2, P.sky);                 // glass walls
    clipTo(g, [P.sky], () => { rect(g, 30, 38, 31, 52, P.crm); rect(g, 14, 37, 47, 38, P.crm); }); // mullions
    ball(g, 22, 47, 4, 4, P.lim, P.grn); ball(g, 41, 47, 4, 4, P.lim, P.grn); // plants
    disc(g, 22, 42, 2, P.pnk); disc(g, 41, 42, 2, P.yel); // blossoms
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 35, 2.4, 1.1);
    blush(g, 21, 33); blush(g, 42, 33);
  }});

S.push({ name: 'shoelace', draw(g) {
    ellipse(g, CX, 52, 22, 6, P.lgy);                   // sole shadow
    ellipse(g, CX, 50, 22, 5, P.crm);                   // white sole
    rrect(g, 12, 34, 52, 50, 6, P.plum);                // shoe body shadow
    rrect(g, 12, 34, 50, 48, 6, P.red);                 // sneaker body
    ellipse(g, 44, 40, 7, 6, P.pnk);                    // toe cap
    tri(g, 20, 34, 34, 34, 27, 24, P.crm);              // tongue
    for (let i = 0; i < 4; i++) {                        // criss-cross laces
      stroke(g, [[20, 30 + i * 4], [33, 26 + i * 4]], 1, 1, P.yel);
      stroke(g, [[33, 30 + i * 4], [20, 26 + i * 4]], 1, 1, P.yel);
    }
    disc(g, 22, 30, 1, P.dgy); disc(g, 31, 30, 1, P.dgy); // eyelets
    eyes(g, 43, 39, 4);
    smileArc(g, 43, 44, 2.2, 1);
    blush(g, 38, 42); blush(g, 48, 42);
  }});

S.push({ name: 'toothpick', draw(g) {
    tri(g, 28, 54, 35, 54, CX, 60, P.dgy);              // pointed tip
    rrect(g, 28, 20, 35, 55, 2, P.brn);                 // stick shadow
    rrect(g, 28, 20, 34, 54, 2, P.org);                 // wooden stick
    rect(g, 30, 24, 31, 52, P.yel);                     // shine
    disc(g, CX, 16, 6, P.brn); disc(g, CX, 16, 4.4, P.org); // turned round top
    disc(g, CX, 10, 2.4, P.yel);                        // finial knob
    ball(g, CX, 38, 8, 7, P.org, P.brn);                // widened face node
    eyes(g, CX, 37, 6);
    smileArc(g, CX, 43, 2.4, 1.1);
    blush(g, CX - 7, 41); blush(g, CX + 7, 41);
  }});

S.push({ name: 'avocado', draw(g) {
    ball(g, CX, 34, 16, 20, P.grn, P.plum);             // dark skin
    ball(g, CX, 34, 13, 17, P.lim, P.grn);              // flesh
    ball(g, CX, 37, 8, 9, P.org, P.brn);                // big pit
    ellipse(g, 28, 33, 2.4, 3, P.yel);                  // pit shine
    eyes(g, CX, 20, 5);
    smileArc(g, CX, 25, 2.4, 1);
    blush(g, CX - 8, 23); blush(g, CX + 8, 23);
  }});

S.push({ name: 'coaster', draw(g) {
    rrect(g, 24, 8, 40, 34, 3, P.grn);                  // tumbler behind
    rrect(g, 26, 10, 38, 32, 2, P.lim);                 // drink
    ellipse(g, CX, 10, 6, 1.8, P.crm);                  // drink top
    ellipse(g, CX, 44, 24, 9, P.plum);                  // coaster shadow
    ellipse(g, CX, 42, 24, 9, P.pnk);                   // mat coaster
    ellipse(g, CX, 41, 19, 6, P.crm);                   // inner ring
    for (let a = 0; a < 16; a++) { const th = a / 16 * Math.PI * 2; disc(g, CX + Math.cos(th) * 22, 42 + Math.sin(th) * 8, 0.9, P.plum); } // rim stipple
    eyes(g, CX, 42, 5);
    smileArc(g, CX, 47, 2.6, 1.1);
    blush(g, 20, 45); blush(g, 43, 45);
  }});

S.push({ name: 'cry', draw(g) {
    ball(g, CX, 32, 17, 16, P.pch, P.brn);              // head
    ellipse(g, CX, 19, 16, 6, P.brn);                   // hair
    ball(g, CX, 9, 3, 2.6, P.brn);                      // tuft
    tri(g, 18, 40, 24, 40, 21, 32, P.sky);              // friendly teardrop L
    disc(g, 21, 41, 3.2, P.sky); g.set(20, 39, P.crm);
    tri(g, 40, 40, 46, 40, 43, 32, P.sky);              // friendly teardrop R
    disc(g, 43, 41, 3.2, P.sky); g.set(42, 39, P.crm);
    eyes(g, CX, 32, 7);
    smileArc(g, CX, 40, 2.8, 1.2);
    blush(g, CX - 12, 38); blush(g, CX + 12, 38);
  }});

S.push({ name: 'tourist', draw(g) {
    ball(g, CX, 49, 11, 9, P.red, P.plum);              // hawaiian shirt
    clipTo(g, [P.red], () => { for (const [x, y] of [[26, 44], [36, 47], [30, 52], [38, 42]]) disc(g, x, y, 1.6, P.lim); }); // flowers
    ball(g, 26, 57, 4, 2.6, P.crm, P.lgy); ball(g, 37, 57, 4, 2.6, P.crm, P.lgy); // sandals
    ball(g, 20, 47, 3, 2.6, P.pch, P.brn); ball(g, 44, 47, 3, 2.6, P.pch, P.brn); // hands
    rrect(g, 24, 40, 39, 50, 2, P.dgy);                 // camera body
    disc(g, CX, 45, 3.4, P.sky); disc(g, CX, 45, 2, P.navy); // lens
    stroke(g, [[24, 41], [20, 47]], 0.8, 0.8, P.brn); stroke(g, [[39, 41], [44, 47]], 0.8, 0.8, P.brn); // strap
    ball(g, CX, 26, 13, 12, P.pch, P.brn);              // head
    ellipse(g, CX, 16, 17, 4, P.crm);                   // sun hat brim
    ball(g, CX, 12, 9, 5, P.yel, P.org);                // hat crown
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.6, 1.2);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

S.push({ name: 'swimsuit', draw(g) {
    ball(g, CX, 34, 14, 18, P.plum);                    // torso shadow
    ball(g, CX, 33, 13, 17, P.pnk);                     // one-piece body
    rect(g, 22, 16, 26, 30, P.pnk); rect(g, 37, 16, 41, 30, P.pnk); // shoulder straps
    ellipse(g, 22, 15, 3, 2, P.pnk); ellipse(g, 41, 15, 3, 2, P.pnk);
    clipTo(g, [P.pnk], () => { for (let x = 20; x <= 44; x += 6) for (let y = 22; y <= 44; y += 6) disc(g, x, y, 1.3, P.crm); }); // polka dots
    tri(g, 24, 48, 39, 48, CX, 40, null);               // leg cutout notch
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 2.6, 1.2);
    blush(g, CX - 11, 34); blush(g, CX + 11, 34);
  }});

S.push({ name: 'croissant', draw(g) {
    const seg = [[14, 42, 4], [19, 34, 6], [26, 29, 8], [CX, 27, 8], [38, 29, 8], [45, 34, 6], [50, 42, 4]];
    for (const [x, y, r] of seg) ball(g, x, y, r, r, P.org, P.brn); // crescent rolls
    for (const [x, y, r] of seg) if (r > 4) ellipse(g, x - 1.5, y - 1.5, r * 0.4, r * 0.3, P.yel); // buttery shine
    clipTo(g, [P.org, P.brn], () => { for (const [x, y, r] of seg) rect(g, Math.round(x), y - r + 1, Math.round(x), y + r - 1, P.brn); }); // seams
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.6, 1.1);
    blush(g, 20, 31); blush(g, 43, 31);
  }});

S.push({ name: 'stroller', draw(g) {
    disc(g, 20, 52, 6, P.navy); disc(g, 20, 52, 2.4, P.lgy); // wheels
    disc(g, 44, 52, 6, P.navy); disc(g, 44, 52, 2.4, P.lgy);
    stroke(g, [[46, 44], [54, 20]], 1.4, 1.4, P.lgy);   // push handle
    rrect(g, 14, 34, 50, 48, 4, P.lav);                 // basket shadow
    rrect(g, 14, 33, 48, 46, 4, P.sky);                 // pram basket
    ellipse(g, 22, 26, 14, 14, P.plum);                 // canopy shadow
    ellipse(g, 22, 27, 13, 13, P.pnk);                  // hood canopy
    ellipse(g, 22, 40, 14, 13, null);                   // cut to half-dome
    ball(g, 34, 34, 8, 7, P.pch, P.brn);                // peeking baby
    ball(g, 34, 27, 6, 4, P.crm);                       // baby bonnet
    eyes(g, 34, 34, 4);
    smileArc(g, 34, 38, 2, 1);
    blush(g, 29, 36); blush(g, 39, 36);
  }});

S.push({ name: 'businessman', draw(g) {
    ball(g, CX, 49, 11, 9, P.dgy, P.navy);              // grey suit
    ball(g, 26, 57, 4, 2.6, P.blk, P.navy); ball(g, 37, 57, 4, 2.6, P.blk, P.navy); // shoes
    ball(g, 44, 48, 3.2, 2.6, P.pch, P.brn);            // hand
    tri(g, 27, 41, 36, 41, CX, 52, P.crm);              // shirt V
    rect(g, 30, 42, 33, 53, P.red);                     // tie
    rrect(g, 42, 46, 54, 57, 2, P.brn);                 // briefcase
    rect(g, 44, 48, 52, 55, P.org);                     // case face
    rect(g, 46, 45, 50, 47, P.dgy);                     // case handle
    ball(g, CX, 27, 14, 13, P.pch, P.brn);              // head
    ellipse(g, CX, 17, 13, 5, P.dgy);                   // hair
    ellipse(g, 19, 22, 2, 3.5, P.dgy); ellipse(g, 44, 22, 2, 3.5, P.dgy);
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

S.push({ name: 'peninsula', draw(g) {
    ellipse(g, CX, 34, 26, 24, P.sky);                  // sea
    clipTo(g, [P.sky], () => { for (let y = 14; y <= 54; y += 6) rect(g, 8, y, 55, y, P.lav); }); // ripples
    ball(g, CX, 12, 15, 9, P.lim, P.grn);               // mainland
    ball(g, CX, 28, 10, 12, P.lim, P.grn);              // neck
    ball(g, CX, 44, 12, 10, P.lim, P.grn);              // headland
    ellipse(g, 22, 20, 3, 2, P.grn); ellipse(g, 40, 24, 3, 2, P.grn); // bushes
    disc(g, 24, 40, 2.5, P.grn); disc(g, 39, 40, 2.5, P.grn); // trees
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.4, 1);
    blush(g, 22, 45); blush(g, 41, 45);
  }});

S.push({ name: 'boxer', draw(g) {
    ball(g, CX, 48, 11, 9, P.sky, P.lav);               // tank top
    rect(g, 26, 40, 29, 50, P.crm); rect(g, 34, 40, 37, 50, P.crm); // straps
    ball(g, 26, 57, 4, 2.6, P.crm, P.lgy); ball(g, 37, 57, 4, 2.6, P.crm, P.lgy); // shoes
    ball(g, 16, 44, 6, 6, P.red, P.plum); ball(g, 47, 44, 6, 6, P.red, P.plum); // big gloves
    ellipse(g, 14, 42, 2.4, 2, P.pnk); ellipse(g, 45, 42, 2.4, 2, P.pnk); // glove shine
    rect(g, 20, 44, 21, 48, P.plum); rect(g, 42, 44, 43, 48, P.plum); // wrist cuffs
    ball(g, CX, 26, 13, 12, P.pch, P.brn);              // head
    rrect(g, 18, 14, 45, 22, 4, P.org);                 // headgear band
    ellipse(g, CX, 12, 14, 5, P.org);                   // headgear top
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.6, 1.2);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'battleship', draw(g) {
    ellipse(g, CX, 56, 26, 4, P.sky);                   // water
    tri(g, 6, 40, 58, 40, 50, 54, P.navy); tri(g, 6, 40, 50, 54, 14, 54, P.navy); // hull shadow
    tri(g, 6, 40, 58, 40, 50, 52, P.dgy); tri(g, 6, 40, 50, 52, 15, 52, P.dgy); // grey hull
    rect(g, 10, 40, 54, 41, P.lgy);                     // deck line
    rrect(g, 20, 26, 43, 40, 2, P.lgy);                 // superstructure
    rrect(g, 27, 16, 37, 28, 2, P.lgy);                 // bridge tower
    rect(g, 30, 8, 33, 18, P.dgy);                      // mast
    rect(g, 40, 24, 46, 32, P.plum);                    // funnel
    ball(g, 44, 20, 4, 3, P.lgy, P.lav); ball(g, 48, 15, 3, 2.4, P.lgy, P.lav); // funnel puff
    disc(g, 16, 46, 1.6, P.yel); disc(g, 44, 46, 1.6, P.yel); // portholes
    eyes(g, CX, 33, 5);
    smileArc(g, CX, 38, 2.4, 1);
    blush(g, 23, 36); blush(g, 40, 36);
  }});

S.push({ name: 'supermarket', draw(g) {
    rrect(g, 8, 20, 56, 56, 2, P.lgy);                  // building shadow
    rrect(g, 8, 20, 54, 54, 2, P.crm);                  // storefront wall
    rect(g, 8, 26, 54, 30, P.red);                      // awning band
    for (let i = 0; i < 7; i++) tri(g, 8 + i * 7, 30, 15 + i * 7, 30, 11.5 + i * 7, 38, i % 2 ? P.red : P.pnk); // awning scallops
    rrect(g, 12, 40, 26, 52, 1, P.sky);                 // window
    rrect(g, 28, 40, 50, 52, 1, P.sky);                 // door glass
    rect(g, 38, 40, 39, 52, P.lgy);                     // door split
    rect(g, 30, 22, 44, 25, P.grn);                     // sign board
    eyes(g, CX, 44, 5);
    smileArc(g, CX, 48, 2.6, 1.1);
    blush(g, 24, 46); blush(g, 40, 46);
  }});

S.push({ name: 'jasmine', draw(g) {
    stroke(g, [[CX, 58], [CX, 40]], 1.4, 1, P.grn);     // stem
    ellipse(g, 22, 46, 5, 3, P.lim); ellipse(g, 41, 44, 5, 3, P.lim); // leaves
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ball(g, CX + 11 * Math.cos(a), 26 + 11 * Math.sin(a), 6, 5, P.crm, P.lgy); } // petals
    ball(g, CX, 26, 7, 7, P.yel, P.org);                // yellow center
    eyes(g, CX, 25, 5);
    smileArc(g, CX, 30, 2.4, 1);
    blush(g, CX - 9, 28); blush(g, CX + 9, 28);
  }});

S.push({ name: 'herb', draw(g) {
    for (const [x, y, r] of [[20, 22, 7], [43, 22, 7], [26, 14, 6], [38, 14, 6], [CX, 10, 7]]) ball(g, x, y, r, r, P.grn, P.plum); // back leaves
    ball(g, CX, 24, 13, 12, P.lim, P.grn);              // leafy bush
    stroke(g, [[CX, 32], [CX, 20]], 0.8, 0.6, P.grn);   // midrib
    stroke(g, [[CX, 28], [24, 22]], 0.7, 0.5, P.grn); stroke(g, [[CX, 28], [39, 22]], 0.7, 0.5, P.grn); // veins
    rrect(g, 20, 40, 43, 56, 2, P.plum);                // pot shadow
    rrect(g, 20, 40, 41, 54, 2, P.org);                 // terracotta pot
    rect(g, 18, 38, 45, 42, P.brn);                     // pot rim
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 30, 2.6, 1.2);
    blush(g, CX - 11, 27); blush(g, CX + 11, 27);
  }});

S.push({ name: 'crowbar', draw(g) {
    stroke(g, [[24, 54], [24, 20], [30, 12]], 3.5, 3, P.plum); // bar shadow
    stroke(g, [[24, 54], [24, 20], [30, 12]], 2.5, 2.2, P.red); // red shaft + hook
    tri(g, 30, 8, 40, 12, 32, 16, P.plum);              // pry tip shadow
    tri(g, 30, 9, 39, 12, 32, 15, P.red);               // forked claw
    ellipse(g, 24, 54, 4, 3, P.plum); ellipse(g, 24, 53, 3, 2, P.red); // chisel foot
    rect(g, 22, 24, 23, 48, P.pnk);                     // shine
    ball(g, 24, 36, 7, 7, P.red, P.plum);               // face node
    eyes(g, 24, 35, 5);
    smileArc(g, 24, 40, 2.2, 1);
    blush(g, 18, 38); blush(g, 30, 38);
  }});

S.push({ name: 'otter', draw(g) {
    stroke(g, [[40, 54], [50, 52], [54, 46]], 3.5, 2, P.brn); // flat tail
    ball(g, CX, 48, 11, 9, P.brn, P.plum);              // body
    ellipse(g, CX, 50, 6, 5.5, P.pch);                  // light belly
    ball(g, 22, 47, 3.4, 3, P.brn, P.plum); ball(g, 41, 47, 3.4, 3, P.brn, P.plum); // paws
    disc(g, 24, 12, 4, P.brn); disc(g, 24, 12, 2, P.pch); // ears
    disc(g, 39, 12, 4, P.brn); disc(g, 39, 12, 2, P.pch);
    ball(g, CX, 26, 13, 12, P.brn, P.plum);             // head
    ball(g, CX, 32, 7, 5.5, P.pch, P.lgy);              // wide muzzle
    ellipse(g, CX, 29, 1.8, 1.4, P.navy);               // nose
    for (const dx of [-6, -4, 4, 6]) g.set(Math.round(CX + dx), 34, P.lgy); // whiskers
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 34, 2.2, 1);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
  }});

S.push({ name: 'teapot', draw(g) {
    stroke(g, [[24, 20], [22, 14], [24, 9]], 1.2, 1, P.lgy); // steam
    ellipse(g, 50, 40, 7, 8, P.plum); ellipse(g, 50, 40, 3.4, 4.5, null); // handle
    stroke(g, [[16, 34], [8, 30], [7, 24]], 3, 2, P.plum);  // spout shadow
    stroke(g, [[16, 34], [8, 30], [8, 25]], 2, 1.4, P.pnk); // spout
    ball(g, CX, 40, 18, 15, P.pnk, P.plum);             // pot body
    ellipse(g, CX, 30, 14, 3, P.plum);                  // lid seat
    ellipse(g, CX, 27, 11, 4, P.pnk);                   // lid
    disc(g, CX, 22, 2.6, P.crm);                        // lid knob
    ellipse(g, 24, 34, 4, 3, P.crm);                    // body shine
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 46, 3, 1.3);
    blush(g, CX - 13, 43); blush(g, CX + 13, 43);
  }});

S.push({ name: 'bleach', draw(g) {
    disc(g, 12, 16, 1.4, P.crm); disc(g, 50, 20, 1.2, P.sky); disc(g, 46, 12, 1.4, P.crm); // sparkles
    rrect(g, 20, 24, 44, 56, 4, P.lav);                 // bottle shadow
    rrect(g, 20, 24, 42, 54, 4, P.sky);                 // jug body
    rrect(g, 26, 12, 37, 26, 2, P.lav);                 // neck
    rrect(g, 25, 8, 38, 14, 1, P.crm);                  // cap
    rrect(g, 23, 34, 40, 48, 2, P.crm);                 // label
    disc(g, 24, 30, 2, P.crm);                          // handle hint
    rect(g, 22, 28, 26, 30, null);                      // handle hole
    eyes(g, CX, 40, 5);
    smileArc(g, CX, 45, 2.4, 1.1);
    blush(g, 24, 43); blush(g, 39, 43);
  }});

S.push({ name: 'chipmunk', draw(g) {
    stroke(g, [[42, 50], [52, 44], [54, 32], [50, 24]], 4, 2.5, P.brn); // bushy tail
    clipTo(g, [P.brn], () => stroke(g, [[44, 48], [52, 40], [53, 30]], 1.2, 1, P.pch)); // tail streak
    ball(g, CX, 46, 10, 9, P.brn, P.plum);              // body
    ellipse(g, CX, 48, 5.5, 5.5, P.crm);                // belly
    clipTo(g, [P.brn], () => { rect(g, 20, 40, 21, 54, P.crm); rect(g, 42, 40, 43, 54, P.crm); }); // stripes
    disc(g, 22, 12, 4, P.brn); disc(g, 22, 12, 2, P.pch); // ears
    disc(g, 41, 12, 4, P.brn); disc(g, 41, 12, 2, P.pch);
    ball(g, CX, 25, 13, 12, P.brn, P.plum);             // head
    ball(g, 22, 30, 4.5, 4, P.pch, P.brn); ball(g, 41, 30, 4.5, 4, P.pch, P.brn); // puffed cheeks
    ball(g, CX, 29, 4, 3.4, P.crm);                     // muzzle
    ellipse(g, CX, 27, 1.4, 1.1, P.navy);               // nose
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 31, 2, 0.9);
    blush(g, 22, 31); blush(g, 41, 31);
  }});

S.push({ name: 'milkshake', draw(g) {
    stroke(g, [[40, 20], [42, 8]], 1.6, 1.6, P.sky);    // straw
    ball(g, CX, 20, 13, 6, P.crm, P.lgy);               // whipped swirl
    ball(g, 24, 18, 5, 4, P.crm, P.lgy); ball(g, 39, 18, 5, 4, P.crm, P.lgy);
    disc(g, CX, 14, 3, P.red);                          // cherry
    tri(g, 20, 26, 43, 26, 39, 56, P.plum);             // glass shadow
    tri(g, 21, 26, 42, 26, 38, 54, P.pnk);              // pink shake
    rect(g, 20, 24, 43, 27, P.lgy);                     // glass rim
    rect(g, 23, 30, 25, 50, P.crm);                     // glass shine
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 42, 2.6, 1.2);
    blush(g, 24, 40); blush(g, 39, 40);
  }});

S.push({ name: 'yearbook', draw(g) {
    rrect(g, 14, 16, 50, 52, 2, P.navy);                // back cover
    rrect(g, 12, 14, 48, 50, 2, P.plum);                // cover shadow
    rrect(g, 12, 14, 46, 48, 2, P.sky);                 // front cover
    rect(g, 12, 14, 17, 48, P.lav);                     // spine
    rrect(g, 18, 20, 42, 30, 1, P.crm);                 // cover plate
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; tri(g, CX, 24, CX + 5 * Math.cos(a - 0.5), 24 + 5 * Math.sin(a - 0.5), CX + 5 * Math.cos(a + 0.5), 24 + 5 * Math.sin(a + 0.5), P.yel); } // star emblem
    rect(g, 44, 18, 47, 44, P.red);                     // bookmark ribbon
    tri(g, 44, 44, 47, 44, 45.5, 48, null);             // ribbon notch
    eyes(g, CX, 40, 5);
    smileArc(g, CX, 44, 2.4, 1);
    blush(g, 24, 42); blush(g, 39, 42);
  }});

S.push({ name: 'ramp', draw(g) {
    tri(g, 8, 54, 56, 54, 56, 22, P.dgy);               // ramp underside
    tri(g, 8, 52, 54, 52, 54, 24, P.lgy);               // ramp deck
    clipTo(g, [P.lgy], () => { for (let x = 14; x <= 52; x += 7) stroke(g, [[x, 52], [x + 8, 30]], 1, 1, P.dgy); }); // treads
    for (let i = 0; i < 4; i++) { const t = i / 3, x = 14 + t * 36, y = 48 - t * 22; stroke(g, [[x, y], [x, y - 8]], 1, 1, P.crm); } // rail posts
    stroke(g, [[14, 40], [50, 18]], 1.2, 1.2, P.crm);   // handrail top
    rect(g, 48, 18, 58, 54, P.sky);                     // platform side
    eyes(g, 26, 40, 5);
    smileArc(g, 26, 45, 2.4, 1);
    blush(g, 20, 43); blush(g, 32, 43);
  }});

S.push({ name: 'woodpecker', draw(g) {
    rrect(g, 44, 6, 56, 58, 4, P.brn);                  // tree trunk
    clipTo(g, [P.brn], () => { rect(g, 48, 8, 49, 56, P.dgy); rect(g, 53, 12, 54, 52, P.dgy); }); // bark
    disc(g, 50, 30, 2, P.navy);                         // peck hole
    ball(g, 28, 40, 11, 12, P.navy, P.blk);             // dark body
    ellipse(g, 28, 44, 6, 7, P.crm);                    // white belly
    ball(g, 22, 52, 3, 2.4, P.dgy, P.navy); ball(g, 33, 52, 3, 2.4, P.dgy, P.navy); // feet
    ball(g, 28, 22, 11, 10, P.navy, P.blk);             // head
    ball(g, 28, 15, 6, 5, P.red, P.plum);               // red crest
    tri(g, 38, 22, 50, 24, 38, 27, P.yel);              // long pointed beak
    eyes(g, 26, 22, 6);
    smileArc(g, 30, 27, 1.8, 0.8);
    blush(g, 21, 26); blush(g, 35, 26);
  }});

S.push({ name: 'magnet', draw(g) {
    disc(g, 9, 48, 1.4, P.yel); disc(g, 55, 48, 1.4, P.crm); disc(g, 9, 30, 1.2, P.yel); disc(g, 55, 30, 1.2, P.crm); // sparks
    ball(g, CX, 30, 22, 22, P.red, P.plum);             // horseshoe outer
    disc(g, CX, 33, 11, null);                          // inner hollow
    rect(g, 20, 33, 43, 56, null);                      // open the U
    rect(g, 9, 44, 20, 56, null); rect(g, 43, 44, 54, 56, null); // trim legs
    rect(g, 9, 48, 21, 54, P.lgy); rect(g, 42, 48, 54, 54, P.lgy); // grey poles
    ellipse(g, 16, 20, 3, 4, P.pnk);                    // shine
    eyes(g, CX, 16, 5);
    smileArc(g, CX, 20, 2.4, 1);
    blush(g, 20, 19); blush(g, 43, 19);
  }});

S.push({ name: 'bead', draw(g) {
    stroke(g, [[8, 12], [56, 12]], 0.8, 0.8, P.lgy);    // string
    disc(g, 14, 12, 3.5, P.sky); disc(g, 50, 12, 3.5, P.sky); // neighbour beads
    ball(g, CX, 34, 19, 19, P.pnk, P.plum, P.crm);      // big glossy bead
    disc(g, CX, 16, 2.4, P.navy);                       // top thread hole
    ellipse(g, 23, 26, 4, 5, P.crm);                    // gloss shine
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.8, 1.2);
    blush(g, CX - 13, 38); blush(g, CX + 13, 38);
  }});

S.push({ name: 'herring', draw(g) {
    tri(g, 6, 24, 6, 44, 22, 34, P.lav);                // tail back
    tri(g, 9, 26, 9, 42, 22, 34, P.sky);                // tail fin
    tri(g, 28, 20, 40, 22, 33, 28, P.sky);              // dorsal fin
    tri(g, 30, 44, 40, 42, 34, 40, P.sky);              // belly fin
    ball(g, 37, 34, 19, 12, P.sky, P.lav);              // slim body
    tri(g, 53, 30, 53, 38, 60, 34, P.sky);              // snout
    ellipse(g, 38, 39, 13, 3.5, P.crm);                 // silver belly
    clipTo(g, [P.sky, P.lav], () => { for (let x = 26; x <= 50; x += 5) disc(g, x, 30, 1, P.crm); }); // scale glints
    eyes(g, 47, 32, 5);
    smileArc(g, 50, 37, 2, 1);
    blush(g, 41, 36); blush(g, 54, 34);
  }});

S.push({ name: 'salute', draw(g) {
    ball(g, CX, 49, 11, 9, P.grn, P.navy);              // uniform
    rect(g, 22, 44, 41, 46, P.yel);                     // belt trim
    ball(g, 26, 57, 4, 2.6, P.blk, P.navy); ball(g, 37, 57, 4, 2.6, P.blk, P.navy); // shoes
    ball(g, 20, 47, 3, 2.6, P.pch, P.brn);              // left hand
    ball(g, CX, 27, 13, 12, P.pch, P.brn);              // head
    stroke(g, [[45, 44], [44, 30]], 2, 2, P.grn);       // saluting arm
    ball(g, 44, 30, 3.4, 3, P.pch, P.brn);              // saluting hand
    rrect(g, 40, 22, 47, 26, 1, P.pch);                 // fingers to brow
    ellipse(g, CX, 16, 15, 4, P.grn);                   // cap brim
    ball(g, CX, 12, 9, 5, P.grn, P.navy);               // cap crown
    disc(g, CX, 12, 2, P.yel);                          // cap badge
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 2.8, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

S.push({ name: 'hourglass', draw(g) {
    rrect(g, 14, 8, 49, 13, 2, P.brn);                  // top frame
    rrect(g, 14, 51, 49, 56, 2, P.brn);                 // bottom frame
    rect(g, 17, 12, 19, 52, P.dgy); rect(g, 44, 12, 46, 52, P.dgy); // posts
    tri(g, 20, 14, 43, 14, CX, 32, P.sky);              // top glass bulb
    tri(g, CX, 32, 20, 50, 43, 50, P.sky);              // bottom glass bulb
    tri(g, 24, 15, 39, 15, CX, 22, P.org);              // top sand
    tri(g, CX, 50, 24, 48, 39, 48, P.org);              // bottom sand pile
    rect(g, 30, 30, 33, 46, P.yel);                     // falling stream
    eyes(g, CX, 25, 5);
    smileArc(g, CX, 29, 2.2, 1);
    blush(g, 24, 27); blush(g, 39, 27);
  }});

S.push({ name: 'accordion', draw(g) {
    rrect(g, 8, 18, 22, 50, 3, P.plum);                 // left box shadow
    rrect(g, 8, 18, 20, 48, 3, P.red);                  // left box
    rrect(g, 42, 18, 56, 50, 3, P.plum);                // right box shadow
    rrect(g, 42, 18, 54, 48, 3, P.red);                 // right box
    for (let i = 0; i < 5; i++) { rect(g, 21 + i * 4, 16, 22 + i * 4, 50, P.crm); rect(g, 23 + i * 4, 16, 23 + i * 4, 50, P.lav); } // pleated bellows
    for (let y = 22; y <= 44; y += 6) rect(g, 45, y, 51, y + 2, P.crm); // bass buttons
    for (let i = 0; i < 3; i++) rect(g, 11 + i * 3, 20, 12 + i * 3, 24, P.crm); // white keys
    eyes(g, 14, 32, 4);
    smileArc(g, 14, 37, 2, 0.9);
    blush(g, 9, 35); blush(g, 19, 35);
  }});

S.push({ name: 'comet', draw(g) {
    disc(g, 12, 10, 1.4, P.crm); disc(g, 50, 14, 1.2, P.yel); disc(g, 20, 48, 1.2, P.crm); // stars
    stroke(g, [[8, 54], [22, 44], [34, 32], [42, 24]], 2, 9, P.lav); // tail outer
    stroke(g, [[8, 54], [22, 44], [34, 32], [42, 24]], 1.4, 6.5, P.sky); // tail inner
    stroke(g, [[10, 52], [24, 42], [36, 30]], 1, 3, P.crm); // tail core
    ball(g, 44, 22, 12, 12, P.yel, P.org, P.crm);       // glowing head
    disc(g, 40, 16, 2, P.crm);                          // sparkle
    eyes(g, 44, 22, 5);
    smileArc(g, 44, 27, 2.4, 1.1);
    blush(g, 38, 25); blush(g, 50, 25);
  }});

S.push({ name: 'target', draw(g) {
    rect(g, 30, 44, 33, 58, P.brn);                     // stand post
    tri(g, 24, 58, 39, 58, CX, 50, P.dgy);              // stand foot
    disc(g, CX, 28, 20, P.red);                         // outer ring
    disc(g, CX, 28, 16, P.crm);
    disc(g, CX, 28, 12, P.red);
    disc(g, CX, 28, 8, P.crm);
    disc(g, CX, 28, 4, P.red);                          // bullseye
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 33, 2.6, 1.2);
    blush(g, CX - 13, 30); blush(g, CX + 13, 30);
  }});

S.push({ name: 'jigsaw', draw(g) {
    rrect(g,16,20,49,53,4,P.lav);                  // piece shadow
    rrect(g,15,19,48,52,4,P.sky);                  // piece body
    disc(g,31,15,5.5,P.sky);                        // top tab knob
    disc(g,52,35,5.5,P.sky);                        // right tab knob
    disc(g,15,35,4.5,null);                         // left socket cut
    disc(g,31,52,4.5,null);                         // bottom socket cut
    eyes(g,29,32,6);
    smileArc(g,29,40,2.6,1);
    blush(g,20,38); blush(g,40,38);
  }});

S.push({ name: 'calculator', draw(g) {
    rrect(g,15,9,48,57,4,P.dgy);                    // case shadow
    rrect(g,14,8,47,55,4,P.lgy);                    // case body
    rrect(g,18,12,43,26,2,P.grn);                   // screen frame
    rrect(g,19,13,42,25,1,P.lim);                   // screen
    for (let ry=0;ry<3;ry++) for (let cx=0;cx<4;cx++)
      rrect(g,18+cx*7,31+ry*7,22+cx*7,35+ry*7,1,P.sky); // button grid
    eyes(g,30,18,4);
    smileArc(g,30,22,2.4,1);
    blush(g,22,20); blush(g,39,20);
  }});

S.push({ name: 'panda', draw(g) {
    disc(g,17,14,7,P.navy); disc(g,17,14,4,P.dgy);  // black ears
    disc(g,46,14,7,P.navy); disc(g,46,14,4,P.dgy);
    ball(g,CX,49,11,9,P.crm,P.lgy);                 // body
    ball(g,20,47,4,4,P.navy,P.blk); ball(g,44,47,4,4,P.navy,P.blk); // black arms
    ball(g,25,57,4.5,3,P.navy,P.blk); ball(g,38,57,4.5,3,P.navy,P.blk); // black feet
    ball(g,CX,26,15,13,P.crm,P.lgy);                // white head
    ellipse(g,23,28,5,6,P.navy);                    // black eye patches
    ellipse(g,40,28,5,6,P.navy);
    disc(g,23,29,2.4,P.crm); disc(g,23,29,1.3,P.navy); g.set(22,28,P.crm); // eye in patch
    disc(g,40,29,2.4,P.crm); disc(g,40,29,1.3,P.navy); g.set(39,28,P.crm);
    ball(g,CX,33,6,4,P.crm,P.lgy);                  // muzzle
    ellipse(g,CX,31,2,1.4,P.navy);                  // nose
    smileArc(g,CX,35,2.4,1);
    blush(g,15,32); blush(g,48,32);
  }});

S.push({ name: 'mint', draw(g) {
    stroke(g,[[CX,57],[CX,24]],1.6,1,P.grn);        // stem
    ball(g,20,34,9,7,P.grn,P.navy,P.lim);           // left leaf
    ball(g,43,34,9,7,P.grn,P.navy,P.lim);           // right leaf
    ball(g,CX,20,8,9,P.lim,P.grn);                  // top leaf
    clipTo(g,[P.grn,P.lim],()=>{                     // midribs
      stroke(g,[[20,28],[20,41]],0.6,0.6,P.grn);
      stroke(g,[[43,28],[43,41]],0.6,0.6,P.grn);
      stroke(g,[[CX,13],[CX,28]],0.6,0.6,P.grn);
    });
    eyes(g,CX,20,5);
    smileArc(g,CX,25,2.2,1);
    blush(g,24,23); blush(g,40,23);
  }});

S.push({ name: 'thunder', draw(g) {
    ball(g,22,22,10,7,P.lgy,P.lav,P.crm);           // cloud puffs
    ball(g,40,22,11,8,P.lgy,P.lav,P.crm);
    ball(g,CX,26,9,6,P.lgy,P.lav);
    tri(g,30,30,40,30,26,44,P.yel);                 // bolt upper flag
    tri(g,26,44,34,44,22,58,P.yel);                 // bolt lower flag
    clipTo(g,[P.yel],()=>{ tri(g,32,32,40,32,28,42,P.org); }); // bolt shade
    eyes(g,CX,22,6);
    smileArc(g,CX,27,2.4,1);
    blush(g,20,25); blush(g,42,25);
  }});

S.push({ name: 'chainsaw', draw(g) {
    rrect(g,10,34,30,50,5,P.org);                   // motor body
    rrect(g,12,36,28,48,3,P.yel);                   // body panel
    rect(g,26,38,50,44,P.lgy);                      // guide bar
    ellipse(g,50,41,4,4,P.lgy);                     // bar nose
    clipTo(g,[P.lgy],()=>{                           // rounded blunt teeth
      for(let x=30;x<52;x+=4){ disc(g,x,38,1,P.sky); disc(g,x,44,1,P.sky); } });
    rrect(g,14,26,26,36,3,P.dgy);                   // top handle
    ellipse(g,17,29,2,4,null);                      // grip hole
    eyes(g,20,42,4);
    smileArc(g,20,46,2.2,0.9);
    blush(g,14,44); blush(g,27,44);
  }});

S.push({ name: 'bookcase', draw(g) {
    rrect(g,12,8,52,58,3,P.brn);                    // cabinet
    rect(g,15,11,49,55,P.crm);                      // interior back
    rect(g,15,26,49,29,P.brn);                      // shelf 1
    rect(g,15,42,49,45,P.brn);                      // shelf 2
    rect(g,17,13,20,25,P.red); rect(g,21,13,24,25,P.sky); rect(g,25,15,28,25,P.lim);
    rect(g,30,13,33,25,P.yel); rect(g,34,14,37,25,P.pnk); rect(g,38,13,41,25,P.org); // top books
    rect(g,17,31,20,41,P.lav); rect(g,21,29,24,41,P.org); rect(g,25,31,28,41,P.sky);
    rect(g,30,30,33,41,P.red); rect(g,34,31,37,41,P.lim); rect(g,40,31,45,41,P.pnk); // mid books
    eyes(g,CX,50,5);
    smileArc(g,CX,54,2.4,1);
    blush(g,22,52); blush(g,42,52);
  }});

S.push({ name: 'barracuda', draw(g) {
    tri(g,8,26,8,42,20,34,P.lav);                   // tail fin
    ball(g,34,34,22,8,P.lgy,P.lav,P.crm);           // long body
    tri(g,30,26,42,26,36,18,P.lav);                 // dorsal fin
    tri(g,30,42,42,42,36,50,P.lav);                 // anal fin
    ball(g,50,34,10,9,P.lgy,P.lav,P.crm);           // head
    tri(g,56,30,63,33,56,37,P.lgy);                 // pointed snout
    clipTo(g,[P.lgy,P.lav],()=>{ stroke(g,[[22,30],[50,30]],0.7,0.7,P.sky); }); // lateral line
    rect(g,55,35,60,36,P.crm);                      // friendly teeth
    eyes(g,51,32,5);
    smileArc(g,55,36,1.6,0.7);
    blush(g,48,37); blush(g,58,36);
  }});

S.push({ name: 'fax', draw(g) {
    rect(g,21,6,43,20,P.crm);                        // paper feeding out
    clipTo(g,[P.crm],()=>{ for(let y=9;y<19;y+=3) stroke(g,[[24,y],[40,y]],0.5,0.5,P.lgy); });
    rrect(g,12,19,52,53,4,P.sky);                    // machine body
    rect(g,16,21,48,25,P.lav);                       // paper slot
    eyes(g,CX,34,6);
    smileArc(g,CX,40,2.6,1);
    for(const [x,y] of [[16,46],[22,46],[28,46]]) disc(g,x,y,1.6,P.lav); // keypad dots
    rrect(g,40,42,48,50,2,P.dgy);                    // handset
    blush(g,20,38); blush(g,44,38);
  }});

S.push({ name: 'manual', draw(g) {
    rrect(g,16,10,48,54,3,P.grn);                    // back cover
    rrect(g,14,8,46,52,3,P.lim);                     // front cover
    for(let y=11;y<50;y+=3) disc(g,15,y,1,P.crm);    // spiral rings
    rect(g,17,8,19,52,P.grn);                        // spine strip
    for(let a=0;a<8;a++){ const th=a/8*Math.PI*2;    // gear teeth emblem
      rect(g,30+Math.cos(th)*7,27+Math.sin(th)*7,32+Math.cos(th)*7,29+Math.sin(th)*7,P.crm); }
    disc(g,31,28,6,P.crm); disc(g,31,28,3,P.lim);    // gear hub
    eyes(g,31,40,5);
    smileArc(g,31,45,2.4,1);
    blush(g,23,43); blush(g,40,43);
  }});

S.push({ name: 'dictionary', draw(g) {
    rrect(g,14,12,50,52,3,P.navy);                   // thick cover under
    rect(g,44,14,50,50,P.crm);                       // thick page block
    clipTo(g,[P.crm],()=>{ for(let y=16;y<50;y+=2) stroke(g,[[44,y],[50,y]],0.5,0.5,P.lgy); });
    rrect(g,12,10,48,50,3,P.plum);                   // front cover
    rect(g,12,10,17,50,P.navy);                      // spine
    rect(g,30,50,34,58,P.red);                       // ribbon bookmark
    disc(g,30,26,7,P.yel); disc(g,30,26,3.5,P.plum); // cover emblem ring
    eyes(g,30,38,5);
    smileArc(g,30,43,2.4,1);
    blush(g,22,41); blush(g,38,41);
  }});

S.push({ name: 'sloth', draw(g) {
    rect(g,6,10,58,15,P.brn);                        // branch across top
    ball(g,CX,38,13,15,P.brn,P.plum,P.pch);          // body
    ellipse(g,CX,40,8,10,P.pch);                     // light tummy
    stroke(g,[[22,26],[16,16],[14,12]],3,2.4,P.brn); // left arm up
    stroke(g,[[41,26],[47,16],[49,12]],3,2.4,P.brn); // right arm up
    for(const x of [12,15]) stroke(g,[[x,14],[x-1,9]],0.9,0.6,P.crm); // left claws
    for(const x of [49,52]) stroke(g,[[x,14],[x+1,9]],0.9,0.6,P.crm); // right claws
    ball(g,CX,30,11,10,P.pch,P.brn);                 // face
    ellipse(g,25,30,4,5,P.brn); ellipse(g,38,30,4,5,P.brn); // dark eye patches
    disc(g,CX,33,1.6,P.navy);                        // nose
    eyes(g,CX,30,7);
    smileArc(g,CX,36,2.2,1);
    blush(g,22,34); blush(g,41,34);
  }});

S.push({ name: 'turnip', draw(g) {
    for(const [x,y] of [[20,14],[CX,9],[43,14]]){ ball(g,x,y,6,8,P.grn,P.navy,P.lim); stroke(g,[[x,y+6],[CX,30]],1.2,0.8,P.grn); } // leafy greens
    ball(g,CX,42,16,15,P.crm,P.lgy);                 // white bulb
    ellipse(g,CX,34,14,6,P.lav);                     // purple crown shade
    clipTo(g,[P.crm,P.lgy],()=>{ stroke(g,[[24,42],[24,54]],0.6,0.6,P.lgy); stroke(g,[[39,42],[39,54]],0.6,0.6,P.lgy); }); // root grooves
    stroke(g,[[CX,56],[CX,61]],1.2,0.4,P.crm);       // taproot
    eyes(g,CX,42,6);
    smileArc(g,CX,48,2.6,1);
    blush(g,22,46); blush(g,42,46);
  }});

S.push({ name: 'babysitter', draw(g) {
    ball(g,CX,47,12,10,P.pnk,P.plum);                // dress
    ball(g,24,57,4,2.6,P.crm,P.lgy); ball(g,39,57,4,2.6,P.crm,P.lgy); // shoes
    ball(g,20,46,3.4,3,P.pch,P.brn);                 // far arm
    ball(g,CX,26,12,11,P.pch,P.brn);                 // head
    ellipse(g,CX,16,13,6,P.brn); ellipse(g,18,24,4,7,P.brn); ellipse(g,45,24,4,7,P.brn); // long hair
    eyes(g,CX,27,6);
    smileArc(g,CX,33,2.6,1);
    blush(g,22,31); blush(g,42,31);
    ball(g,44,44,6,6,P.pch,P.brn);                   // baby head in arms
    ellipse(g,44,50,5,4,P.yel);                      // baby blanket
    eye(g,42,44,2); eye(g,46,44,2); smileArc(g,44,46,1.4,0.6); // baby face
  }});

S.push({ name: 'trampoline', draw(g) {
    ellipse(g,CX,30,24,9,P.sky);                     // mat surface
    ellipse(g,CX,29,24,8,P.lav);                     // mat top
    ellipse(g,CX,28,20,6,P.sky);                     // mat centre
    rect(g,7,30,56,34,P.lgy);                        // frame pad
    for(let x=12;x<54;x+=6) stroke(g,[[x,30],[x+2,34]],0.6,0.6,P.dgy); // springs
    stroke(g,[[14,34],[10,54]],2,2,P.dgy); stroke(g,[[49,34],[54,54]],2,2,P.dgy); // legs
    stroke(g,[[10,54],[18,54]],1.4,1.4,P.dgy); stroke(g,[[46,54],[54,54]],1.4,1.4,P.dgy); // feet
    eyes(g,CX,25,6);
    smileArc(g,CX,30,2.4,1);
    blush(g,20,28); blush(g,43,28);
  }});

S.push({ name: 'paramedic', draw(g) {
    ball(g,CX,48,12,10,P.crm,P.lgy);                 // white uniform
    rect(g,28,42,35,45,P.red); rect(g,30,40,33,47,P.red); // red cross on chest
    ball(g,25,58,4,2.6,P.navy,P.blk); ball(g,38,58,4,2.6,P.navy,P.blk); // shoes
    ball(g,19,47,3.2,3,P.pch,P.brn);                 // hand
    rrect(g,40,46,52,55,2,P.org); rect(g,44,44,48,47,P.org); // first-aid kit
    rect(g,44,49,48,51,P.crm); rect(g,45,48,47,52,P.crm); // kit cross
    ball(g,CX,28,12,11,P.pch,P.brn);                 // head
    rect(g,19,20,44,24,P.sky); ellipse(g,CX,18,13,4,P.sky); disc(g,CX,17,2,P.red); // cap + badge
    eyes(g,CX,29,6);
    smileArc(g,CX,35,2.6,1);
    blush(g,22,33); blush(g,42,33);
  }});

S.push({ name: 'blackberry', draw(g) {
    ball(g,45,17,7,6,P.lim,P.grn); stroke(g,[[43,21],[38,28]],1,0.6,P.grn); // leaf
    clipTo(g,[P.lim,P.grn],()=>{ stroke(g,[[45,12],[45,22]],0.6,0.6,P.grn); }); // leaf vein
    const d=[[26,29],[34,29],[22,35],[30,35],[38,35],[26,41],[34,41],[30,47]];
    for(const [x,y] of d){ ball(g,x,y,4,4,P.plum,P.navy); disc(g,x-1,y-1,1.2,P.pnk); } // drupelets
    eyes(g,30,36,6);
    smileArc(g,30,43,2.2,1);
    blush(g,19,40); blush(g,41,40);
  }});

S.push({ name: 'brochure', draw(g) {
    rrect(g,9,16,54,50,2,P.lav);                     // shadow back
    rect(g,10,14,26,48,P.sky);                       // left panel
    rect(g,26,14,42,48,P.crm);                       // middle panel
    rect(g,42,14,55,48,P.sky);                       // right panel
    rect(g,24,14,27,48,P.lav); rect(g,41,14,43,48,P.lav); // fold creases
    disc(g,18,22,4,P.org);                           // left photo
    clipTo(g,[P.crm],()=>{ for(let y=20;y<44;y+=4) stroke(g,[[29,y],[39,y]],0.6,0.6,P.lgy); }); // text lines
    disc(g,48,22,4,P.lim);                           // right photo
    eyes(g,34,30,5);
    smileArc(g,34,35,2.2,1);
    blush(g,28,33); blush(g,40,33);
  }});

S.push({ name: 'porcupine', draw(g) {
    for(let a=0;a<15;a++){ const th=-Math.PI+0.1+a/14*(Math.PI-0.2); // long spike fan
      const bx=CX+Math.cos(th)*10, by=36+Math.sin(th)*9;
      const tx=CX+Math.cos(th)*20, ty=36+Math.sin(th)*17;
      tri(g,bx-2,by,bx+2,by,tx,ty,a%2?P.brn:P.org); }
    ball(g,CX,40,14,12,P.org,P.brn);                 // body
    ball(g,CX,48,9,8,P.pch,P.brn);                   // face/snout
    tri(g,27,52,36,52,CX,58,P.pch);                  // pointed snout
    disc(g,CX,55,1.6,P.navy);                        // nose
    eyes(g,CX,47,5);
    smileArc(g,CX,52,2,0.9);
    blush(g,23,50); blush(g,40,50);
  }});

S.push({ name: 'vest', draw(g) {
    ball(g,CX,37,18,20,P.sky,P.lav);                 // vest
    tri(g,25,15,38,15,CX,44,P.crm);                  // V-neck shirt front
    disc(g,13,37,4.5,null); disc(g,50,37,4.5,null);  // armholes cut
    disc(g,22,44,1.8,P.yel); disc(g,22,50,1.8,P.yel); // buttons
    disc(g,41,44,1.8,P.yel); disc(g,41,50,1.8,P.yel);
    rrect(g,17,48,26,55,1,P.lav); rrect(g,37,48,46,55,1,P.lav); // pockets
    eyes(g,CX,26,4);
    smileArc(g,CX,31,2.2,1);
    blush(g,25,29); blush(g,38,29);
  }});

S.push({ name: 'goatee', draw(g) {
    ball(g,CX,27,15,14,P.pch,P.brn);                 // face
    ellipse(g,CX,14,14,5,P.brn); rect(g,18,13,45,17,P.brn); // hair
    disc(g,17,25,3,P.pch); disc(g,46,25,3,P.pch);    // ears
    eyes(g,CX,26,7);
    g.set(31,32,P.brn); g.set(32,32,P.brn);          // nose
    stroke(g,[[24,36],[31,38]],1.3,0.9,P.dgy); stroke(g,[[39,36],[32,38]],1.3,0.9,P.dgy); // mustache
    smileArc(g,CX,40,2.2,1);
    tri(g,26,42,37,42,CX,54,P.dgy);                  // pointy chin goatee
    blush(g,20,33); blush(g,43,33);
  }});

S.push({ name: 'buttercup', draw(g) {
    stroke(g,[[CX,57],[CX,32]],1.6,1,P.grn);         // stem
    ellipse(g,20,46,6,3,P.lim); ellipse(g,43,44,6,3,P.lim); // leaves
    for(let a=0;a<5;a++){ const th=a/5*Math.PI*2-1.57; // 5 rounded petals
      ball(g,CX+Math.cos(th)*8,24+Math.sin(th)*8,6,5,P.yel,P.org); }
    disc(g,CX,24,6,P.yel);                           // cupped centre
    disc(g,CX,24,3.5,P.org);                         // pollen middle
    eyes(g,CX,24,5);
    smileArc(g,CX,29,2.2,1);
    blush(g,23,26); blush(g,40,26);
  }});

S.push({ name: 'fuse', draw(g) {
    rect(g,6,25,16,43,P.lgy); rect(g,48,25,58,43,P.lgy); // metal end caps
    clipTo(g,[P.lgy],()=>{ rect(g,8,27,10,41,P.crm); rect(g,50,27,52,41,P.crm); }); // cap shine
    rrect(g,12,24,52,44,5,P.sky);                    // glass tube
    ellipse(g,20,30,3,4,P.crm);                      // gloss
    stroke(g,[[16,30],[22,27],[28,32],[34,27],[40,32],[46,27],[50,30]],0.9,0.9,P.org); // filament
    eyes(g,CX,36,5);
    smileArc(g,CX,41,2.2,1);
    blush(g,22,39); blush(g,44,39);
  }});

S.push({ name: 'custard', draw(g) {
    ellipse(g, CX, 40, 17, 13, P.org);                   // custard shadow
    ball(g, CX, 38, 16, 12, P.yel, P.org, P.crm);        // custard mound
    ellipse(g, 24, 32, 4, 2, P.crm);                     // sheen
    rrect(g, 15, 44, 48, 56, 4, P.lgy);                  // bowl
    rect(g, 15, 44, 48, 46, P.crm);                      // rim sheen
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 42, 2.6, 1.1);
    blush(g, 20, 40); blush(g, 43, 40);
  }});

S.push({ name: 'domino', draw(g) {
    rrect(g, 20, 8, 44, 57, 4, P.lgy);                   // tile shadow
    rrect(g, 20, 8, 43, 56, 4, P.crm);                   // tile
    rect(g, 21, 31, 43, 33, P.dgy);                      // divider
    for (const [x, y] of [[27, 41], [38, 41], [27, 49], [38, 49]]) disc(g, x, y, 2.4, P.navy); // pips
    eyes(g, CX, 20, 6);
    smileArc(g, CX, 26, 2.6, 1.1);
    blush(g, 24, 24); blush(g, 40, 24);
  }});

S.push({ name: 'tuba', draw(g) {
    ellipse(g, 30, 10, 14, 5, P.brn);                    // bell rim
    ellipse(g, 30, 11, 10, 3, P.dgy);                    // bell hole
    tri(g, 19, 13, 42, 13, 30, 30, P.yel);               // flared bell
    stroke(g, [[30, 30], [21, 41], [26, 53], [39, 53], [43, 42]], 4, 4, P.brn); // coiled tubing shade
    stroke(g, [[30, 30], [21, 41], [26, 53], [39, 53], [43, 42]], 3, 3, P.yel); // coiled tubing
    disc(g, 28, 45, 1.6, P.lgy); disc(g, 33, 47, 1.6, P.lgy); // valves
    eyes(g, 29, 20, 5);
    smileArc(g, 29, 25, 2.2, 1);
    blush(g, 22, 23); blush(g, 39, 23);
  }});

S.push({ name: 'lice', draw(g) {
    for (const sx of [-1, 1]) {
      stroke(g, [[CX + sx * 9, 40], [CX + sx * 17, 35]], 1, 0.6, P.brn);
      stroke(g, [[CX + sx * 10, 45], [CX + sx * 18, 45]], 1, 0.6, P.brn);
      stroke(g, [[CX + sx * 9, 50], [CX + sx * 17, 55]], 1, 0.6, P.brn);
    }
    ball(g, CX, 44, 15, 14, P.brn, P.plum, P.org);       // round body
    ball(g, CX, 25, 8, 7, P.brn, P.plum);                // head
    stroke(g, [[28, 19], [24, 11]], 0.8, 0.4, P.brn); stroke(g, [[35, 19], [39, 11]], 0.8, 0.4, P.brn); // antennae
    disc(g, 24, 10, 1.6, P.navy); disc(g, 39, 10, 1.6, P.navy);
    eyes(g, CX, 25, 5);
    smileArc(g, CX, 30, 2, 0.9);
    blush(g, 25, 28); blush(g, 38, 28);
  }});

S.push({ name: 'thermostat', draw(g) {
    rrect(g, 14, 12, 49, 52, 6, P.lgy);                  // wall plate
    rect(g, 14, 14, 49, 16, P.crm);                      // sheen
    disc(g, CX, 32, 15, P.dgy);                          // dial ring
    disc(g, CX, 32, 12, P.crm);                          // face
    for (let a = 0; a < 8; a++) { const th = a / 8 * Math.PI * 2; disc(g, CX + Math.cos(th) * 9, 32 + Math.sin(th) * 9, 0.9, P.dgy); }
    disc(g, CX, 22, 1.6, P.red);                         // set mark
    eyes(g, CX, 31, 5);
    smileArc(g, CX, 37, 2.2, 1);
    blush(g, 22, 34); blush(g, 41, 34);
  }});

S.push({ name: 'headlight', draw(g) {
    for (const [y, l] of [[22, 55], [32, 59], [42, 55]]) stroke(g, [[47, y], [l, y]], 1.5, 0.5, P.yel); // forward beams
    rrect(g, 10, 15, 45, 49, 11, P.lav);                 // chrome housing shade
    rrect(g, 10, 15, 44, 47, 11, P.lgy);                 // chrome housing
    rect(g, 13, 18, 16, 44, P.crm);                      // chrome sheen
    ball(g, 28, 31, 13, 13, P.crm, P.lgy);               // lens
    disc(g, 28, 31, 8, P.yel);                           // projector glow
    disc(g, 28, 31, 4.5, P.crm);
    eyes(g, 28, 30, 5);
    smileArc(g, 28, 36, 2.4, 1);
    blush(g, 19, 34); blush(g, 38, 34);
  }});

S.push({ name: 'sticker', draw(g) {
    disc(g, CX, 32, 20, P.crm);                          // backing peel
    disc(g, CX, 30, 18, P.yel);                          // sticker face
    ellipse(g, CX, 30, 16, 16, P.yel);
    tri(g, 43, 43, 52, 50, 41, 52, P.lgy);               // peeling corner
    disc(g, 22, 22, 3, P.crm);                           // shine
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 35, 3, 1.3);
    blush(g, 20, 32); blush(g, 44, 32);
  }});

S.push({ name: 'billboard', draw(g) {
    rect(g, 20, 44, 24, 58, P.brn); rect(g, 40, 44, 44, 58, P.brn); // posts
    rrect(g, 8, 10, 55, 46, 3, P.lgy);                   // frame
    rrect(g, 11, 13, 52, 43, 2, P.sky);                  // poster
    disc(g, 44, 20, 5, P.yel);                           // sun on poster
    ellipse(g, 22, 40, 12, 5, P.lim);                    // hill on poster
    eyes(g, 26, 26, 5);
    smileArc(g, 26, 32, 2.4, 1);
    blush(g, 19, 30); blush(g, 34, 30);
  }});

S.push({ name: 'catfish', draw(g) {
    tri(g, 43, 32, 58, 21, 57, 43, P.grn);               // tail
    ball(g, 30, 33, 19, 14, P.lim, P.grn);               // body
    tri(g, 27, 20, 39, 20, 33, 11, P.grn);               // dorsal fin
    stroke(g, [[14, 38], [5, 42]], 0.9, 0.5, P.grn); stroke(g, [[14, 41], [6, 47]], 0.9, 0.5, P.grn); // whiskers
    stroke(g, [[17, 42], [13, 52]], 0.9, 0.5, P.grn);
    eyes(g, 18, 30, 5);
    smileArc(g, 15, 38, 3, 1);                           // wide mouth
    blush(g, 11, 35); blush(g, 26, 35);
  }});

S.push({ name: 'beehive', draw(g) {
    ellipse(g, CX, 52, 20, 6, P.org);                    // base ring
    ellipse(g, CX, 44, 18, 6, P.yel);
    ellipse(g, CX, 36, 15, 5.5, P.org);
    ellipse(g, CX, 29, 12, 5, P.yel);
    ball(g, CX, 20, 9, 7, P.yel, P.org);                 // top dome
    disc(g, CX, 50, 3, P.brn);                           // entrance
    ball(g, 46, 25, 3, 3, P.yel, P.org); ellipse(g, 43, 23, 3, 2, P.sky); // little bee
    eyes(g, CX, 20, 5);
    smileArc(g, CX, 25, 2, 0.9);
    blush(g, 24, 23); blush(g, 39, 23);
  }});

S.push({ name: 'scales', draw(g) {
    rrect(g, 24, 50, 40, 57, 2, P.brn);                  // base
    rect(g, 30, 20, 34, 52, P.yel);                      // post
    rect(g, 14, 22, 50, 25, P.yel);                      // beam
    ellipse(g, 17, 36, 9, 4, P.org); stroke(g, [[17, 25], [10, 34]], 0.6, 0.6, P.dgy); stroke(g, [[17, 25], [24, 34]], 0.6, 0.6, P.dgy); // left pan
    ellipse(g, 47, 36, 9, 4, P.org); stroke(g, [[47, 25], [40, 34]], 0.6, 0.6, P.dgy); stroke(g, [[47, 25], [54, 34]], 0.6, 0.6, P.dgy); // right pan
    disc(g, CX, 22, 4, P.org);                           // pivot
    eyes(g, CX, 31, 5);
    smileArc(g, CX, 37, 2.2, 1);
    blush(g, 23, 35); blush(g, 40, 35);
  }});

S.push({ name: 'camcorder', draw(g) {
    rrect(g, 14, 22, 46, 48, 4, P.dgy);                  // body shade
    rrect(g, 14, 22, 45, 46, 4, P.navy);                 // body
    rrect(g, 44, 26, 56, 42, 3, P.dgy);                  // lens barrel
    disc(g, 54, 34, 5, P.sky); disc(g, 54, 34, 2.5, P.crm); // lens glass
    rrect(g, 20, 12, 34, 22, 2, P.dgy);                  // top mic
    disc(g, 20, 27, 1.6, P.red);                         // record dot
    eyes(g, 29, 34, 5);
    smileArc(g, 29, 40, 2.4, 1);
    blush(g, 22, 38); blush(g, 38, 38);
  }});

S.push({ name: 'chute', draw(g) {
    rect(g, 12, 14, 20, 46, P.lav);                      // back rail
    stroke(g, [[16, 16], [20, 40], [40, 53]], 5, 5, P.lgy); // slide shade
    stroke(g, [[16, 16], [20, 40], [40, 53]], 3.5, 3.5, P.sky); // slide surface
    rect(g, 46, 20, 48, 54, P.brn); rect(g, 54, 20, 56, 54, P.brn); // ladder rails
    for (const y of [26, 34, 42, 50]) rect(g, 48, y, 54, y + 1, P.brn); // rungs
    eyes(g, 26, 32, 5);
    smileArc(g, 26, 38, 2.2, 1);
    blush(g, 20, 36); blush(g, 33, 36);
  }});

S.push({ name: 'caterpillar', draw(g) {
    for (const [x, y] of [[50, 40], [43, 44], [35, 42], [27, 44], [19, 42]]) ball(g, x, y, 7, 7, P.lim, P.grn); // segments
    for (const x of [50, 43, 35, 27, 19]) disc(g, x, 50, 1.4, P.grn); // feet
    ball(g, 15, 33, 10, 9, P.lim, P.grn, P.crm);         // head
    stroke(g, [[11, 25], [7, 15]], 0.8, 0.4, P.grn); stroke(g, [[19, 25], [23, 15]], 0.8, 0.4, P.grn); // antennae
    disc(g, 7, 14, 1.8, P.navy); disc(g, 23, 14, 1.8, P.navy);
    eyes(g, 15, 32, 5);
    smileArc(g, 15, 38, 2.2, 1);
    blush(g, 8, 35); blush(g, 22, 35);
  }});

S.push({ name: 'swordfish', draw(g) {
    stroke(g, [[30, 30], [5, 21]], 2, 0.6, P.lgy);       // long bill
    ball(g, 37, 32, 17, 13, P.sky, P.lav, P.crm);        // body
    tri(g, 50, 32, 61, 21, 61, 43, P.sky);               // tail
    tri(g, 34, 19, 45, 19, 40, 9, P.lav);                // dorsal fin
    tri(g, 34, 45, 43, 45, 38, 53, P.lav);               // pelvic fin
    eyes(g, 30, 30, 5);
    smileArc(g, 28, 36, 2.2, 1);
    blush(g, 25, 34); blush(g, 39, 33);
  }});

S.push({ name: 'encyclopedia', draw(g) {
    rrect(g, 12, 40, 52, 54, 2, P.grn);                  // bottom book
    rect(g, 12, 42, 52, 44, P.lim);
    rrect(g, 10, 28, 50, 40, 2, P.red);                  // middle book
    rect(g, 10, 30, 50, 32, P.pnk);
    rrect(g, 14, 14, 48, 28, 2, P.sky);                  // top book
    rect(g, 14, 16, 48, 18, P.crm);
    rect(g, 17, 21, 20, 27, P.crm);                      // spine tag
    eyes(g, 33, 21, 5);
    smileArc(g, 33, 26, 2.4, 1);
    blush(g, 26, 24); blush(g, 41, 24);
  }});

S.push({ name: 'blowtorch', draw(g) {
    rrect(g, 22, 28, 42, 56, 5, P.red);                  // gas canister
    ellipse(g, 25, 34, 3, 7, P.pnk);                     // sheen
    rrect(g, 28, 18, 36, 30, 2, P.lgy);                  // nozzle neck
    ball(g, CX, 10, 6, 8, P.org, P.red);                 // outer flame
    ball(g, CX, 11, 3, 5, P.yel, P.org);                 // inner flame
    tri(g, 28, 8, 35, 8, CX, 1, P.org);                  // flame tip
    eyes(g, CX, 40, 5);
    smileArc(g, CX, 46, 2.4, 1);
    blush(g, 25, 44); blush(g, 39, 44);
  }});

S.push({ name: 'grasshopper', draw(g) {
    stroke(g, [[38, 40], [52, 33], [50, 48]], 2, 1, P.grn); // hind legs
    stroke(g, [[24, 40], [12, 33], [14, 48]], 2, 1, P.grn);
    stroke(g, [[26, 44], [20, 54]], 1, 0.6, P.grn); stroke(g, [[38, 44], [44, 54]], 1, 0.6, P.grn); // front legs
    ball(g, CX, 42, 17, 10, P.lim, P.grn);               // long body
    ball(g, CX, 26, 11, 9, P.lim, P.grn, P.crm);         // head
    stroke(g, [[27, 18], [22, 8]], 0.8, 0.4, P.grn); stroke(g, [[37, 18], [42, 8]], 0.8, 0.4, P.grn); // antennae
    eyes(g, CX, 25, 6);
    smileArc(g, CX, 31, 2.4, 1);
    blush(g, 23, 29); blush(g, 41, 29);
  }});

S.push({ name: 'papaya', draw(g) {
    ball(g, CX, 36, 17, 20, P.grn, P.plum);              // rind
    ellipse(g, CX, 37, 13, 17, P.org);                   // flesh
    ellipse(g, CX, 39, 6, 9, P.brn);                     // seed hollow
    for (const [x, y] of [[29, 35], [34, 37], [30, 41], [34, 43], [32, 47]]) disc(g, x, y, 1.8, P.navy); // seeds
    eyes(g, CX, 24, 5);
    smileArc(g, CX, 29, 2.2, 1);
    blush(g, 22, 27); blush(g, 41, 27);
  }});

S.push({ name: 'headphones', draw(g) {
    stroke(g, [[13, 44], [13, 24], [22, 11], [41, 11], [50, 24], [50, 44]], 3, 3, P.dgy); // band shade
    stroke(g, [[13, 44], [13, 24], [22, 11], [41, 11], [50, 24], [50, 44]], 2, 2, P.sky); // band
    ball(g, 50, 44, 8, 11, P.navy, P.dgy);               // right cup
    ellipse(g, 50, 44, 4, 6, P.lav);
    ball(g, 13, 44, 9, 12, P.dgy, P.navy, P.crm);        // left cup (face)
    ellipse(g, 13, 44, 5, 7, P.sky);
    eyes(g, 13, 42, 5);
    smileArc(g, 13, 48, 2, 0.9);
    blush(g, 8, 46); blush(g, 19, 46);
  }});

S.push({ name: 'shake', draw(g) {
    rrect(g, 20, 26, 44, 54, 4, P.lgy);                  // glass
    rrect(g, 22, 30, 42, 52, 3, P.pnk);                  // shake
    ball(g, CX, 22, 13, 8, P.crm, P.lgy);                // whipped cream
    ellipse(g, CX, 15, 6, 4, P.crm);
    disc(g, CX, 10, 3, P.red);                           // cherry
    stroke(g, [[40, 8], [46, 30]], 1.2, 1.2, P.red);     // straw
    eyes(g, CX, 38, 5);
    smileArc(g, CX, 44, 2.4, 1);
    blush(g, 24, 42); blush(g, 40, 42);
  }});

S.push({ name: 'dome', draw(g) {
    rect(g, 14, 40, 50, 54, P.lgy);                      // base
    rect(g, 14, 40, 50, 42, P.crm);
    for (const x of [21, 32, 43]) rrect(g, x - 3, 44, x + 3, 52, 2, P.sky); // arches
    ball(g, CX, 30, 20, 16, P.lav, P.dgy, P.crm);        // dome
    rect(g, 30, 10, 33, 20, P.yel);                      // finial
    disc(g, CX, 9, 2.5, P.yel);
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 36, 2.4, 1);
    blush(g, 20, 34); blush(g, 44, 34);
  }});

S.push({ name: 'tap', draw(g) {
    rect(g, 26, 50, 38, 56, P.lgy);                      // base
    rect(g, 29, 30, 35, 52, P.lgy);                      // riser
    rect(g, 29, 30, 31, 52, P.crm);                      // sheen
    stroke(g, [[32, 30], [32, 20], [44, 20], [44, 30]], 3.5, 3.5, P.lgy); // spout shade
    stroke(g, [[32, 30], [32, 20], [44, 20], [44, 30]], 2.5, 2.5, P.crm); // spout
    rrect(g, 19, 24, 30, 30, 2, P.sky);                  // handle
    ball(g, 44, 42, 4, 5, P.sky, P.lav);                 // water drop
    ellipse(g, 44, 54, 7, 3, P.sky);                     // puddle
    eyes(g, 31, 40, 5);
    smileArc(g, 31, 46, 2.2, 1);
    blush(g, 25, 44); blush(g, 38, 44);
  }});

S.push({ name: 'wallpaper', draw(g) {
    rect(g, 20, 28, 42, 56, P.pnk);                      // unrolled sheet
    for (const [x, y] of [[26, 34], [37, 34], [26, 44], [37, 44], [26, 52], [37, 52]]) { disc(g, x, y, 2, P.crm); disc(g, x, y, 1, P.red); } // pattern
    rrect(g, 17, 10, 42, 30, 5, P.pnk);                  // roll
    ellipse(g, 18, 20, 4, 9, P.plum);                    // roll end shade
    ellipse(g, 40, 20, 4, 9, P.red);
    eyes(g, 29, 18, 5);
    smileArc(g, 29, 24, 2.2, 1);
    blush(g, 22, 22); blush(g, 37, 22);
  }});

S.push({ name: 'acorn', draw(g) {
    disc(g, CX, 10, 2, P.brn);                           // stem
    ball(g, CX, 42, 15, 15, P.org, P.brn, P.yel);        // nut
    ellipse(g, CX, 24, 17, 10, P.brn);                   // cap
    clipTo(g, [P.brn], function () { for (const [x, y] of [[22, 22], [28, 26], [34, 22], [40, 26], [25, 29], [38, 29], [CX, 24]]) disc(g, x, y, 1.4, P.plum); }); // cap texture
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 49, 2.6, 1.1);
    blush(g, 22, 47); blush(g, 42, 47);
  }});

S.push({ name: 'diver', draw(g) {
    ball(g, CX, 48, 12, 9, P.sky, P.lav);                // wetsuit
    ball(g, 20, 55, 5, 3, P.org, P.brn); ball(g, 43, 55, 5, 3, P.org, P.brn); // flippers
    ball(g, 19, 46, 3.2, 3, P.sky, P.lav); ball(g, 44, 46, 3.2, 3, P.sky, P.lav); // arms
    rrect(g, 42, 32, 50, 50, 2, P.yel);                  // air tank
    ball(g, CX, 25, 14, 13, P.pch, P.brn);               // head
    rrect(g, 18, 20, 45, 32, 4, P.sky);                  // mask band
    ellipse(g, CX, 26, 11, 8, P.crm);                    // mask glass
    stroke(g, [[44, 22], [50, 14], [50, 26]], 1.4, 1.4, P.brn); // snorkel
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 35, 2.4, 1);
    blush(g, 21, 32); blush(g, 43, 32);
  }});

S.push({ name: 'treadmill', draw(g) {
    rrect(g, 10, 44, 52, 52, 2, P.dgy);                  // belt deck
    rect(g, 10, 44, 52, 46, P.lgy);                      // belt top
    for (const x of [16, 24, 32, 40]) rect(g, x, 47, x + 2, 51, P.lav); // slats
    rect(g, 14, 52, 18, 58, P.dgy); rect(g, 44, 52, 48, 58, P.dgy); // feet
    rect(g, 44, 16, 48, 44, P.lgy);                      // upright
    rect(g, 20, 30, 44, 32, P.lgy);                      // handle
    rrect(g, 38, 10, 56, 20, 2, P.sky);                  // console
    eyes(g, 47, 14, 4);
    smileArc(g, 47, 18, 1.8, 0.8);
    blush(g, 42, 17); blush(g, 52, 17);
  }});

S.push({ name: 'graffiti', draw(g) {
    for (const [x, y, c] of [[42, 20, P.lim], [48, 27, P.pnk], [44, 33, P.yel]]) disc(g, x, y, 4, c); // paint burst
    stroke(g, [[20, 46], [30, 38], [38, 46], [46, 38]], 1.6, 1.6, P.red); // scribble
    rrect(g, 18, 24, 34, 54, 4, P.sky);                  // spray can
    rect(g, 20, 24, 22, 52, P.crm);                      // sheen
    rrect(g, 22, 14, 30, 24, 2, P.lgy);                  // cap
    disc(g, 26, 12, 1.4, P.dgy);                         // nozzle
    eyes(g, 26, 36, 5);
    smileArc(g, 26, 42, 2.2, 1);
    blush(g, 20, 40); blush(g, 33, 40);
  }});

S.push({ name: 'cheetah', draw(g) {
    disc(g, 21, 14, 4.5, P.org); disc(g, 21, 14, 2.4, P.brn); // ears
    disc(g, 42, 14, 4.5, P.org); disc(g, 42, 14, 2.4, P.brn);
    stroke(g, [[43, 50], [51, 47], [53, 39], [50, 33]], 2, 1.4, P.org); // tail
    disc(g, 50, 34, 1.6, P.navy);                        // tail tip
    ball(g, CX, 48, 11, 8, P.org, P.brn);                // body
    ball(g, 25, 57, 4, 3, P.org, P.brn); ball(g, 38, 57, 4, 3, P.org, P.brn); // feet
    ball(g, CX, 26, 14, 12, P.org, P.brn, P.yel);        // head
    clipTo(g, [P.org, P.brn, P.yel], function () { for (const [x, y] of [[18, 22], [45, 22], [16, 48], [47, 48], [22, 52], [41, 52], [19, 34], [44, 34], [24, 19], [39, 19]]) disc(g, x, y, 1.6, P.navy); }); // spots
    ball(g, CX, 32, 5.5, 4, P.crm);                      // muzzle
    ellipse(g, CX, 30, 1.6, 1.2, P.navy);                // nose
    stroke(g, [[28, 30], [26, 37]], 0.9, 0.6, P.navy); stroke(g, [[35, 30], [37, 37]], 0.9, 0.6, P.navy); // tear stripes
    eyes(g, CX, 26, 7);
    smileArc(g, CX, 34, 2, 0.9);
    blush(g, CX - 12, 31); blush(g, CX + 12, 31);
  }});

S.push({ name: 'gymnasium', draw(g) {
    ball(g, CX, 25, 21, 13, P.sky, P.lav);               // stadium dome roof
    disc(g, 23, 22, 3.2, P.org); disc(g, 40, 22, 3.2, P.org); // dumbbell weights
    rect(g, 23, 21, 40, 23, P.dgy);                      // dumbbell bar
    rrect(g, 13, 33, 51, 57, 2, P.lgy);                  // wall shadow
    rrect(g, 12, 32, 49, 56, 2, P.crm);                  // wall
    rect(g, 12, 33, 49, 35, P.grn);                      // trim band
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.8, 1.2);
    blush(g, CX - 13, 46); blush(g, CX + 13, 46);
  }});

S.push({ name: 'mousetrap', draw(g) {
    rrect(g, 12, 40, 52, 56, 3, P.brn);                  // wooden base shadow
    rrect(g, 12, 39, 50, 54, 3, P.org);                  // wooden base
    stroke(g, [[16, 42], [16, 24], [40, 24]], 1.6, 1.6, P.dgy); // spring bar
    disc(g, 16, 42, 2.4, P.lgy);                         // spring coil
    tri(g, 24, 51, 47, 51, 47, 33, P.yel);               // cheese wedge (face host)
    disc(g, 30, 47, 1.4, P.org); disc(g, 42, 45, 1.2, P.org); // holes
    eyes(g, 38, 41, 4);
    smileArc(g, 38, 46, 2.2, 1);
    blush(g, 31, 43); blush(g, 45, 43);
  }});

S.push({ name: 'watchman', draw(g) {
    ball(g, CX, 50, 10, 8, P.navy, P.navy);              // dark uniform
    ball(g, 25, 58, 3.8, 2.6, P.navy, P.navy);
    ball(g, 38, 58, 3.8, 2.6, P.navy, P.navy);
    ball(g, 20, 50, 3, 2.6, P.pch, P.brn);               // hand
    ball(g, 44, 49, 3, 2.6, P.pch, P.brn);               // lantern hand
    ball(g, CX, 27, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 15, 15, 3, P.dgy);                    // cap brim
    rrect(g, 22, 8, 41, 15, 3, P.dgy);                   // cap crown
    rect(g, 25, 11, 38, 12, P.yel);                      // cap band
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.6, 1.1);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
    stroke(g, [[45, 45], [47, 42], [50, 45]], 1, 1, P.dgy); // lantern bail
    rrect(g, 44, 45, 51, 55, 2, P.dgy);                  // lantern body
    disc(g, 47.5, 50, 2.4, P.yel);                       // glow
  }});

S.push({ name: 'jogging', draw(g) {
    ball(g, CX, 46, 10, 8, P.red, P.plum);               // running shirt
    ball(g, 24, 57, 3.6, 2.6, P.pch, P.brn);             // forward foot
    ball(g, 42, 55, 3.6, 2.6, P.pch, P.brn);             // back foot
    stroke(g, [[28, 52], [24, 57]], 2, 2, P.navy);       // legs
    stroke(g, [[35, 52], [42, 55]], 2, 2, P.navy);
    ball(g, 20, 44, 3, 2.4, P.pch, P.brn);               // pumping hands
    ball(g, 45, 47, 3, 2.4, P.pch, P.brn);
    ball(g, CX, 26, 12, 11, P.pch, P.brn);               // head
    ellipse(g, CX, 17, 12, 4, P.brn);                    // hair
    for (let x = 20; x <= 43; x++) { const t = (x - CX) / 12, y = 20 + Math.round(2 * t * t); g.set(x, y, P.sky); g.set(x, y + 1, P.sky); } // headband
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.6, 1.1);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
    rect(g, 6, 40, 12, 41, P.lgy); rect(g, 5, 48, 10, 49, P.lgy); // motion lines
  }});

S.push({ name: 'hanger', draw(g) {
    disc(g, CX, 11, 2.6, P.lgy); disc(g, CX, 11, 1.1, null); // hook loop
    stroke(g, [[CX, 13], [CX, 20]], 1.3, 1.3, P.lgy);    // hook stem
    stroke(g, [[CX, 20], [18, 32]], 2, 2, P.lgy);        // hanger arms
    stroke(g, [[CX, 20], [45, 32]], 2, 2, P.lgy);
    rrect(g, 17, 30, 46, 55, 5, P.plum);                 // shirt shadow
    rrect(g, 16, 29, 44, 53, 5, P.pnk);                  // shirt body
    rect(g, 12, 31, 18, 38, P.pnk); rect(g, 43, 31, 49, 38, P.pnk); // sleeves
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.1);
    blush(g, CX - 12, 44); blush(g, CX + 12, 44);
  }});

S.push({ name: 'waffle', draw(g) {
    ball(g, CX, 34, 20, 18, P.org, P.brn);               // round waffle
    clipTo(g, [P.org, P.brn], function () {              // grid holes
      for (let x = 18; x <= 46; x += 7) rect(g, x, 18, x + 1, 50, P.brn);
      for (let y = 20; y <= 48; y += 7) rect(g, 14, y, 50, y + 1, P.brn);
    });
    rrect(g, 34, 22, 42, 28, 1, P.yel);                  // butter pat
    disc(g, 40, 31, 1.6, P.brn);                         // syrup drip
    eyes(g, CX, 35, 6);
    smileArc(g, CX, 41, 2.6, 1.1);
    blush(g, CX - 12, 39); blush(g, CX + 12, 39);
  }});

S.push({ name: 'laboratory', draw(g) {
    rrect(g, 44, 30, 50, 54, 3, P.lgy);                  // test tube
    clipTo(g, [P.lgy], function () { rect(g, 44, 44, 50, 54, P.pnk); }); // tube liquid
    tri(g, 20, 52, 44, 52, 32, 22, P.lgy);               // erlenmeyer body
    rect(g, 28, 16, 35, 24, P.lgy);                      // neck
    ellipse(g, 31.5, 16, 3.8, 1.4, P.crm);               // rim
    clipTo(g, [P.lgy], function () { ellipse(g, 32, 48, 12, 7, P.lim); }); // liquid
    disc(g, 30, 12, 2, P.lim); disc(g, 36, 9, 1.4, P.lim); disc(g, 33, 6, 1, P.lim); // bubbles
    eyes(g, 30, 42, 5);
    smileArc(g, 30, 47, 2.4, 1);
    blush(g, 22, 45); blush(g, 38, 45);
  }});

S.push({ name: 'rhubarb', draw(g) {
    ball(g, 22, 20, 9, 7, P.grn, P.grn);                 // leaves
    ball(g, 40, 18, 9, 7, P.grn, P.grn);
    ball(g, CX, 15, 9, 7, P.lim, P.grn);
    stroke(g, [[26, 50], [24, 26]], 2.4, 2.4, P.red);    // stalks
    stroke(g, [[32, 52], [31, 24]], 2.4, 2.4, P.red);
    stroke(g, [[38, 50], [40, 26]], 2.4, 2.4, P.pnk);
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.1);
    blush(g, CX - 10, 44); blush(g, CX + 10, 44);
  }});

S.push({ name: 'pump', draw(g) {
    rrect(g, 26, 24, 38, 54, 3, P.lav);                  // column shadow
    rrect(g, 25, 23, 36, 52, 3, P.lgy);                  // pump column
    stroke(g, [[36, 28], [46, 30], [48, 36]], 2.4, 2.4, P.lav); // spout shadow
    stroke(g, [[35, 27], [45, 29], [47, 35]], 1.8, 1.8, P.lgy); // spout
    disc(g, 47, 38, 1.6, P.sky);                         // water drop
    stroke(g, [[26, 22], [14, 16]], 2, 2, P.dgy);        // lever handle
    disc(g, 13, 16, 2.2, P.dgy);                         // handle knob
    rrect(g, 20, 52, 42, 57, 2, P.brn);                  // base
    eyes(g, CX, 38, 5);
    smileArc(g, CX, 43, 2.4, 1);
    blush(g, 24, 41); blush(g, 38, 41);
  }});

S.push({ name: 'corkscrew', draw(g) {
    rrect(g, 16, 16, 47, 24, 4, P.plum);                 // T-handle shadow
    rrect(g, 16, 15, 45, 23, 4, P.red);                  // T-handle
    rect(g, 29, 22, 34, 30, P.lgy);                      // shaft
    for (let i = 0; i < 5; i++) { const y = 30 + i * 4, x = 31.5 + (i % 2 ? 4 : -4); disc(g, x, y, 1.8, P.lgy); } // spiral coil
    disc(g, 31.5, 52, 1.6, P.lav);                       // rounded tip
    eyes(g, 31, 19, 4);
    smileArc(g, 31, 22, 2, 0.9);
    blush(g, 24, 21); blush(g, 39, 21);
  }});

S.push({ name: 'hail', draw(g) {
    ball(g, 22, 28, 9, 8, P.lgy, P.lav);                 // cloud lobes
    ball(g, 42, 28, 10, 9, P.lgy, P.lav);
    ball(g, CX, 24, 13, 11, P.crm, P.lgy);
    ellipse(g, CX, 33, 20, 5, P.lgy);                    // flat base
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.6, 1.1);
    blush(g, CX - 12, 30); blush(g, CX + 12, 30);
    disc(g, 20, 46, 3, P.sky); ellipse(g, 18, 44, 1.2, 0.8, P.crm); // hailstones
    disc(g, 32, 52, 3, P.sky); ellipse(g, 30, 50, 1.2, 0.8, P.crm);
    disc(g, 44, 46, 3, P.sky); ellipse(g, 42, 44, 1.2, 0.8, P.crm);
  }});

S.push({ name: 'moth', draw(g) {
    ball(g, 16, 34, 12, 14, P.brn, P.plum);              // left wing
    ball(g, 47, 34, 12, 14, P.brn, P.plum);              // right wing
    ellipse(g, 15, 30, 4, 4, P.crm); ellipse(g, 48, 30, 4, 4, P.crm); // wing spots
    ellipse(g, 15, 30, 2, 2, P.org); ellipse(g, 48, 30, 2, 2, P.org);
    ball(g, CX, 36, 6, 12, P.lgy, P.lav);                // fuzzy body
    ball(g, CX, 24, 5, 4.5, P.lgy, P.lav);               // head
    stroke(g, [[28, 20], [22, 11]], 1.2, 0.8, P.dgy);    // antennae
    stroke(g, [[35, 20], [41, 11]], 1.2, 0.8, P.dgy);
    for (let i = 0; i < 4; i++) { g.set(24 - i, 13 + i * 2, P.dgy); g.set(39 + i, 13 + i * 2, P.dgy); } // barbs
    eyes(g, CX, 24, 4);
    smileArc(g, CX, 28, 2, 0.9);
    blush(g, CX - 6, 26); blush(g, CX + 6, 26);
  }});

S.push({ name: 'crank', draw(g) {
    rrect(g, 28, 12, 35, 40, 2, P.lav);                  // shaft shadow
    rrect(g, 27, 11, 33, 38, 2, P.lgy);                  // vertical shaft
    rrect(g, 27, 38, 50, 46, 3, P.lav);                  // arm shadow
    rrect(g, 26, 37, 48, 44, 3, P.lgy);                  // horizontal arm (L-bend)
    ball(g, 48, 41, 5, 6, P.red, P.plum);                // grip knob
    disc(g, 30, 12, 3, P.dgy);                           // mount cap
    eyes(g, 30, 24, 5);
    smileArc(g, 30, 29, 2.4, 1);
    blush(g, 23, 27); blush(g, 37, 27);
  }});

S.push({ name: 'pillar', draw(g) {
    rrect(g, 16, 12, 48, 20, 2, P.lav);                  // capital shadow
    rrect(g, 16, 11, 46, 18, 2, P.crm);                  // capital
    rrect(g, 22, 18, 42, 50, 2, P.lgy);                  // shaft shadow
    rrect(g, 22, 18, 40, 49, 2, P.crm);                  // shaft
    clipTo(g, [P.crm], function () { for (let x = 25; x <= 38; x += 4) rect(g, x, 20, x, 48, P.lgy); }); // flutes
    rrect(g, 16, 50, 48, 57, 2, P.lav);                  // base shadow
    rrect(g, 16, 49, 46, 56, 2, P.crm);                  // base
    eyes(g, 31, 32, 6);
    smileArc(g, 31, 39, 2.6, 1.1);
    blush(g, 22, 36); blush(g, 40, 36);
  }});

S.push({ name: 'baton', draw(g) {
    stroke(g, [[24, 44], [46, 16]], 1.8, 0.8, P.lgy);    // wand shadow
    stroke(g, [[23, 44], [45, 16]], 1.2, 0.5, P.crm);    // slim wand
    disc(g, 45, 15, 1.4, P.crm);                         // tip
    ball(g, 22, 46, 8, 8, P.brn, P.plum);                // cork grip (face host)
    eyes(g, 22, 45, 5);
    smileArc(g, 22, 50, 2.4, 1);
    blush(g, 15, 48); blush(g, 29, 48);
    disc(g, 40, 40, 1.6, P.navy); rect(g, 41, 34, 42, 40, P.navy); // music notes
    disc(g, 50, 44, 1.6, P.navy); rect(g, 51, 38, 52, 44, P.navy);
  }});

S.push({ name: 'sandbox', draw(g) {
    rrect(g, 8, 36, 56, 56, 2, P.brn);                   // wooden frame
    rect(g, 8, 36, 56, 39, P.org);                       // top rail
    ellipse(g, CX, 46, 22, 9, P.yel);                    // sand
    ellipse(g, 20, 44, 3, 2, P.org); ellipse(g, 42, 48, 3, 2, P.org); // sand texture
    rrect(g, 40, 34, 50, 46, 1, P.red);                  // bucket
    rect(g, 40, 34, 50, 36, P.pnk);
    stroke(g, [[41, 34], [45, 30], [49, 34]], 1, 1, P.red); // bucket handle
    stroke(g, [[16, 44], [14, 30]], 1.4, 1.4, P.sky);    // spade handle
    tri(g, 11, 44, 20, 44, 15, 50, P.sky);               // spade blade
    eyes(g, 28, 46, 5);
    smileArc(g, 28, 50, 2.2, 1);
    blush(g, 21, 48); blush(g, 35, 48);
  }});

S.push({ name: 'mink', draw(g) {
    ball(g, 38, 46, 15, 8, P.brn, P.plum);               // long sleek low body
    stroke(g, [[52, 48], [60, 39]], 3, 1, P.brn);        // long tail
    ball(g, 30, 55, 3, 2, P.plum, P.plum); ball(g, 44, 55, 3, 2, P.plum, P.plum); // feet
    ball(g, 20, 30, 12, 11, P.brn, P.plum);              // head
    ball(g, 12, 20, 3, 3, P.brn, P.plum); ball(g, 28, 20, 3, 3, P.brn, P.plum); // small ears
    ball(g, 20, 36, 5, 3.4, P.crm, P.lgy);               // muzzle
    disc(g, 20, 35, 1.4, P.navy);                        // nose
    eyes(g, 20, 30, 6);
    smileArc(g, 20, 37, 2, 0.9);
    blush(g, 12, 34); blush(g, 28, 34);
  }});

S.push({ name: 'sprinkler', draw(g) {
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + 0.7 * i / 8); disc(g, CX - Math.cos(a) * 24, 40 - Math.sin(a) * 22, 1.4, P.sky); } // spray fan
    rrect(g, 24, 36, 40, 48, 3, P.grn);                  // body
    rect(g, 28, 30, 36, 38, P.grn);                      // nozzle
    ellipse(g, CX, 30, 5, 2, P.lim);                     // spinner
    rrect(g, 16, 48, 48, 54, 2, P.dgy);                  // base sled
    disc(g, 22, 54, 2, P.lav); disc(g, 42, 54, 2, P.lav);
    eyes(g, CX, 42, 5);
    smileArc(g, CX, 46, 2.2, 1);
    blush(g, 26, 44); blush(g, 38, 44);
  }});

S.push({ name: 'canary', draw(g) {
    ball(g, CX, 42, 13, 12, P.yel, P.org);               // body
    ball(g, 45, 44, 6, 8, P.yel, P.org);                 // wing
    ball(g, CX, 25, 12, 11, P.yel, P.org);               // head
    tri(g, 25, 14, 33, 14, 29, 7, P.yel);                // crest tuft
    eyes(g, CX, 25, 6);
    tri(g, 29, 30, 34, 30, 31.5, 34, P.org);             // beak
    smileArc(g, CX, 37, 2, 0.9);
    blush(g, CX - 10, 30); blush(g, CX + 10, 30);
    ball(g, 27, 56, 2.4, 1.6, P.org); ball(g, 37, 56, 2.4, 1.6, P.org); // feet
  }});

S.push({ name: 'siren', draw(g) {
    rrect(g, 20, 44, 44, 54, 3, P.dgy);                  // base
    ball(g, CX, 34, 13, 12, P.red, P.plum);              // red beacon dome
    ellipse(g, 27, 28, 3, 4, P.pnk);                     // shine
    rect(g, 18, 43, 46, 45, P.lgy);                      // rim
    for (let i = 1; i <= 3; i++) {                       // friendly sound waves
      stroke(g, [[16 - i * 2, 27], [13 - i * 2, 34], [16 - i * 2, 41]], 1, 1, P.yel);
      stroke(g, [[48 + i * 2, 27], [51 + i * 2, 34], [48 + i * 2, 41]], 1, 1, P.yel);
    }
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.6, 1.1);
    blush(g, CX - 11, 38); blush(g, CX + 11, 38);
  }});

S.push({ name: 'spotlight', draw(g) {
    tri(g, 38, 20, 58, 4, 56, 30, P.yel);                // light beam
    ball(g, 26, 38, 14, 12, P.lgy, P.lav);               // housing drum
    disc(g, 38, 34, 7, P.yel); disc(g, 38, 34, 4, P.crm); // lens
    rect(g, 23, 50, 29, 56, P.dgy);                      // stand pole
    rrect(g, 15, 55, 37, 59, 2, P.dgy);                  // base
    eyes(g, 22, 38, 5);
    smileArc(g, 22, 43, 2.2, 1);
    blush(g, 15, 41); blush(g, 29, 41);
  }});

S.push({ name: 'cauliflower', draw(g) {
    ball(g, 16, 40, 8, 10, P.grn, P.grn);                // outer leaves
    ball(g, 47, 40, 8, 10, P.grn, P.grn);
    ball(g, 22, 50, 7, 6, P.lim, P.grn);
    ball(g, 42, 50, 7, 6, P.lim, P.grn);
    ball(g, CX, 34, 15, 13, P.crm, P.lgy);               // white head
    for (const b of [[24, 28], [33, 26], [40, 30], [22, 36], [40, 38], [27, 44], [37, 46]]) disc(g, b[0], b[1], 3.4, P.crm); // florets
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 41, 2.6, 1.1);
    blush(g, CX - 12, 38); blush(g, CX + 12, 38);
  }});

S.push({ name: 'apricot', draw(g) {
    ball(g, CX, 36, 17, 17, P.org, P.brn);               // fruit
    ellipse(g, 24, 28, 4, 6, P.yel);                     // sun blush
    rect(g, 31, 20, 32, 33, P.brn);                      // crease
    stroke(g, [[31, 20], [33, 12]], 1.4, 1.4, P.grn);    // stem
    ball(g, 39, 12, 4, 2.6, P.lim, P.grn);               // leaf
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 43, 2.6, 1.1);
    blush(g, CX - 12, 40); blush(g, CX + 12, 40);
  }});

S.push({ name: 'handprint', draw(g) {
    ball(g, CX, 42, 13, 11, P.sky, P.lav);               // palm
    ball(g, 18, 26, 3.4, 7, P.sky, P.lav);               // thumb
    ball(g, 25, 20, 3.4, 8, P.sky, P.lav);               // fingers
    ball(g, 32, 18, 3.6, 9, P.sky, P.lav);
    ball(g, 39, 20, 3.4, 8, P.sky, P.lav);
    ball(g, 45, 26, 3.2, 6, P.sky, P.lav);
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.6, 1.1);
    blush(g, CX - 11, 46); blush(g, CX + 11, 46);
  }});

S.push({ name: 'wildcat', draw(g) {
    tri(g,17,18,27,18,20,4,P.lgy); tri(g,37,18,47,18,44,4,P.lgy);   // pointed ears
    tri(g,19,16,25,16,21,7,P.pnk); tri(g,39,16,45,16,43,7,P.pnk);
    stroke(g,[[43,50],[52,46],[54,36]],2,1.4,P.lgy);                // tail
    clipTo(g,[P.lgy],()=>{ for(const y of [44,40,36]) rect(g,49,y,54,y+1,P.dgy); });
    ball(g,CX,48,11,9,P.lgy,P.lav);                                 // body
    ball(g,25,57,4,3,P.lgy,P.lav); ball(g,38,57,4,3,P.lgy,P.lav);
    ball(g,CX,25,15,13,P.lgy,P.lav,P.crm);                          // head
    clipTo(g,[P.lgy,P.lav],()=>{ rect(g,29,12,30,20,P.dgy); rect(g,33,12,34,20,P.dgy); rect(g,14,24,20,25,P.dgy); rect(g,43,24,49,25,P.dgy); });
    ball(g,CX,31,5,3.4,P.crm,P.lgy);                                // muzzle
    rect(g,30,29,33,30,P.pnk);                                      // nose
    stroke(g,[[26,32],[16,31]],0.6,0.3,P.dgy); stroke(g,[[37,32],[47,31]],0.6,0.3,P.dgy);
    eyes(g,CX,25,7);
    smileArc(g,CX,32,2.4,1);
    blush(g,CX-12,30); blush(g,CX+12,30);
  }});

S.push({ name: 'cube', draw(g) {
    tri(g,32,14,49,24,32,34,P.org); tri(g,32,14,32,34,15,24,P.org);   // top face
    tri(g,15,24,32,34,32,54,P.brn); tri(g,15,24,32,54,15,44,P.brn);   // left face
    tri(g,49,24,32,34,32,54,P.plum); tri(g,49,24,32,54,49,44,P.plum); // right face
    eyes(g,23,38,5);
    smileArc(g,23,45,2.4,1);
    blush(g,16,42); blush(g,30,42);
  }});

S.push({ name: 'wrestling', draw(g) {
    stroke(g,[[22,40],[15,30],[19,24]],3.5,3,P.pch);               // left arm flexing up
    stroke(g,[[41,40],[48,30],[44,24]],3.5,3,P.pch);               // right arm flexing up
    ball(g,20,27,5,5,P.pch,P.brn); ball(g,43,27,5,5,P.pch,P.brn);  // biceps
    rrect(g,22,38,41,56,4,P.sky);                                   // singlet
    rect(g,29,30,34,40,P.pch);                                      // chest
    rect(g,20,49,43,52,P.yel);                                      // belt
    disc(g,CX,50,2.5,P.org);                                        // buckle
    ball(g,CX,22,11,10,P.pch,P.brn);                                // head
    ellipse(g,CX,14,11,4,P.brn);                                    // hair
    eyes(g,CX,22,6);
    smileArc(g,CX,28,2.4,1);
    blush(g,23,26); blush(g,40,26);
  }});

S.push({ name: 'bumblebee', draw(g) {
    ellipse(g,20,22,10,8,P.crm); ellipse(g,44,22,10,8,P.crm);       // wings
    ellipse(g,20,22,7,5,P.sky); ellipse(g,44,22,7,5,P.sky);
    ball(g,CX,40,16,15,P.yel,P.org);                                // round body
    clipTo(g,[P.yel,P.org],()=>{ rect(g,17,33,47,36,P.navy); rect(g,17,44,47,47,P.navy); }); // stripes
    stroke(g,[[26,27],[22,17]],0.8,0.4,P.navy); stroke(g,[[38,27],[42,17]],0.8,0.4,P.navy); // antennae
    disc(g,22,16,1.6,P.navy); disc(g,42,16,1.6,P.navy);
    eyes(g,CX,39,7);
    smileArc(g,CX,45,2.6,1);
    blush(g,CX-11,43); blush(g,CX+11,43);
  }});

S.push({ name: 'yoga', draw(g) {
    ellipse(g,CX,54,20,5,P.lav);                                    // mat
    tri(g,14,54,32,44,32,54,P.pch); tri(g,50,54,32,44,32,54,P.pch); // crossed legs
    ball(g,CX,40,11,9,P.sky,P.lav);                                 // torso
    stroke(g,[[24,38],[15,44],[20,50]],2.5,2,P.pch);               // left arm to knee
    stroke(g,[[40,38],[49,44],[44,50]],2.5,2,P.pch);               // right arm to knee
    disc(g,17,45,2.5,P.pch); disc(g,47,45,2.5,P.pch);             // hands
    ball(g,CX,24,10,9,P.pch,P.brn);                                 // head
    ellipse(g,CX,17,10,4,P.brn); disc(g,CX,14,2.5,P.brn);          // hair + topknot
    eyes(g,CX,24,6);
    smileArc(g,CX,29,2.2,1);
    blush(g,23,28); blush(g,41,28);
  }});

S.push({ name: 'mousse', draw(g) {
    rrect(g,20,28,44,54,5,P.crm);                                  // glass
    rrect(g,20,32,44,54,5,P.brn);                                  // mousse fill
    ellipse(g,CX,32,12,4,P.plum);                                  // surface
    ball(g,CX,26,8,6,P.crm,P.lgy);                                 // cream swirl
    ball(g,CX,20,4,4,P.crm);
    disc(g,CX,17,3,P.red);                                          // cherry
    stroke(g,[[CX,15],[35,10]],0.7,0.4,P.grn);                     // stem
    rect(g,24,54,40,57,P.lgy);                                      // base
    eyes(g,CX,42,6);
    smileArc(g,CX,48,2.4,1);
    blush(g,24,46); blush(g,40,46);
  }});

S.push({ name: 'roadblock', draw(g) {
    rrect(g,8,24,56,36,3,P.crm);                                   // barrier board
    clipTo(g,[P.crm],()=>{ for(let x=8;x<56;x+=10){ tri(g,x,24,x+6,24,x,36,P.org); tri(g,x+6,24,x+6,36,x,36,P.org);} }); // diagonal stripes
    stroke(g,[[16,36],[12,56]],2,2,P.dgy); stroke(g,[[16,36],[24,56]],2,2,P.dgy); // A-frame legs
    stroke(g,[[48,36],[44,56]],2,2,P.dgy); stroke(g,[[48,36],[52,56]],2,2,P.dgy);
    eyes(g,CX,29,5);
    smileArc(g,CX,33,2.2,0.9);
    blush(g,20,32); blush(g,43,32);
  }});

S.push({ name: 'sledgehammer', draw(g) {
    stroke(g,[[26,54],[38,16]],3,2.5,P.brn);                       // handle
    rrect(g,16,10,48,24,3,P.lgy);                                  // steel head
    ellipse(g,16,17,4,7,P.dgy); ellipse(g,48,17,4,7,P.dgy);       // ends
    rect(g,30,10,34,24,P.crm);                                     // collar
    eyes(g,CX,16,5);
    smileArc(g,CX,20,2.4,1);
    blush(g,23,19); blush(g,42,19);
  }});

S.push({ name: 'limousine', draw(g) {
    rrect(g,4,34,60,48,4,P.dgy);                                   // long body
    rrect(g,12,26,50,36,4,P.lav);                                  // cabin
    for(let x=16;x<46;x+=8) rrect(g,x,28,x+5,34,1,P.sky);         // windows
    disc(g,16,49,5,P.blk); disc(g,16,49,2.5,P.lgy);               // wheels
    disc(g,48,49,5,P.blk); disc(g,48,49,2.5,P.lgy);
    disc(g,7,40,1.5,P.yel);                                         // headlight
    eyes(g,CX,40,6);
    smileArc(g,CX,45,2.6,1);
    blush(g,20,44); blush(g,44,44);
  }});

S.push({ name: 'zucchini', draw(g) {
    stroke(g,[[16,50],[46,16]],9,9,P.grn);                         // long body
    stroke(g,[[19,48],[44,19]],5,5,P.lim);                         // highlight ridge
    ball(g,47,14,3.5,3.5,P.grn,P.plum);                            // blossom tip
    stroke(g,[[15,52],[11,58]],1.6,0.9,P.brn);                     // stem
    eyes(g,30,34,6);
    smileArc(g,30,41,2.4,1);
    blush(g,23,39); blush(g,37,39);
  }});

S.push({ name: 'pipeline', draw(g) {
    stroke(g,[[6,44],[58,44]],7,7,P.lgy);                          // horizontal pipe
    stroke(g,[[6,46],[54,46]],3,3,P.crm);                          // highlight
    rect(g,20,36,26,52,P.lav); rect(g,40,36,46,52,P.lav);         // flanges
    stroke(g,[[50,44],[50,20]],7,7,P.lgy);                         // riser
    rect(g,42,24,58,30,P.lav);                                     // riser flange
    ellipse(g,50,17,7,5,P.dgy);                                    // opening
    eyes(g,26,44,5);
    smileArc(g,26,49,2.2,0.9);
    blush(g,19,47); blush(g,33,47);
  }});

S.push({ name: 'washer', draw(g) {
    rrect(g,10,10,54,56,5,P.lgy);                                  // body
    rect(g,13,13,51,20,P.lav);                                     // control panel
    disc(g,18,16,1.5,P.lim); disc(g,24,16,1.5,P.red);            // knobs
    rect(g,40,14,48,19,P.crm);                                     // dial slot
    disc(g,CX,38,15,P.dgy);                                        // door ring
    disc(g,CX,38,12,P.sky);                                        // glass
    disc(g,CX,38,8,P.crm);                                         // window light
    eyes(g,CX,36,6);
    smileArc(g,CX,42,2.4,1);
    blush(g,19,40); blush(g,44,40);
  }});

S.push({ name: 'stall', draw(g) {
    rect(g,10,20,54,30,P.crm);                                     // awning
    clipTo(g,[P.crm],()=>{ for(let x=10;x<54;x+=10) rect(g,x,20,x+5,30,P.red); }); // stripes
    for(let x=14;x<=50;x+=9) tri(g,x-4,30,x+4,30,x,35,P.red);     // valance scallops
    rect(g,12,30,15,54,P.brn); rect(g,49,30,52,54,P.brn);         // posts
    rect(g,10,42,54,52,P.org);                                     // counter
    eyes(g,CX,46,6);
    smileArc(g,CX,50,2.2,1);
    blush(g,20,49); blush(g,44,49);
  }});

S.push({ name: 'oat', draw(g) {
    ellipse(g,CX,44,20,12,P.lgy);                                  // bowl
    ellipse(g,CX,42,17,9,P.crm);                                   // bowl inner
    ellipse(g,CX,39,15,7,P.org);                                   // oatmeal mound
    for(const [x,y] of [[24,40],[40,40],[28,43],[36,43]]) ellipse(g,x,y,2,1.2,P.yel); // flakes
    stroke(g,[[44,40],[50,18]],1,0.6,P.org);                       // wheat stalk
    for(const y of [22,27,32]){ ellipse(g,47,y,2,1.2,P.yel); ellipse(g,53,y,2,1.2,P.yel);} // grains
    eyes(g,CX,39,6);
    smileArc(g,CX,45,2.4,1);
    blush(g,20,43); blush(g,42,43);
  }});

S.push({ name: 'llama', draw(g) {
    ball(g,CX,50,12,8,P.crm,P.lgy);                                // body
    ball(g,24,58,3.5,3,P.crm,P.lgy); ball(g,39,58,3.5,3,P.crm,P.lgy); // feet
    stroke(g,[[CX,48],[30,26]],5,4,P.crm);                         // long neck
    ball(g,29,22,9,8,P.crm,P.lgy);                                 // head
    tri(g,22,16,27,16,24,6,P.crm); tri(g,32,16,37,16,34,6,P.crm); // tall ears
    ball(g,27,26,4,3,P.pch,P.brn);                                 // muzzle
    ellipse(g,29,13,8,3,P.brn);                                    // fringe
    rect(g,25,25,26,26,P.navy); rect(g,29,25,30,26,P.navy);       // nostrils
    eyes(g,29,21,5);
    smileArc(g,27,27,2,0.9);
    blush(g,22,25); blush(g,35,25);
  }});

S.push({ name: 'vulture', draw(g) {
    ball(g,12,40,9,11,P.dgy,P.navy); ball(g,52,40,9,11,P.dgy,P.navy); // folded wings
    ball(g,CX,46,13,12,P.dgy,P.navy);                              // body
    ball(g,24,58,4,3,P.org,P.brn); ball(g,39,58,4,3,P.org,P.brn); // feet
    ellipse(g,CX,32,15,6,P.crm);                                   // thick feather ruff
    ellipse(g,CX,33,12,4,P.lgy);                                   // ruff shade
    ball(g,CX,22,9,9,P.pch,P.brn);                                 // bald head
    tri(g,28,26,36,26,32,32,P.org);                                // hooked beak
    disc(g,CX,29,1.4,P.brn);                                        // beak tip
    eyes(g,CX,21,6);
    smileArc(g,CX,27,2,0.8);
    blush(g,24,25); blush(g,40,25);
  }});

S.push({ name: 'pottery', draw(g) {
    ellipse(g,CX,52,15,5,P.plum);                                  // base ring
    ball(g,CX,38,17,18,P.brn,P.plum,P.org);                        // pot belly
    rect(g,22,20,42,24,P.brn);                                     // neck
    ellipse(g,CX,20,10,4,P.brn);                                   // rim
    ellipse(g,CX,19,9,3,P.plum);                                   // opening
    clipTo(g,[P.brn,P.plum,P.org],()=>{ rect(g,15,32,49,34,P.crm); rect(g,18,44,46,46,P.crm); }); // painted bands
    eyes(g,CX,37,6);
    smileArc(g,CX,43,2.4,1);
    blush(g,20,41); blush(g,44,41);
  }});

S.push({ name: 'anvil', draw(g) {
    rrect(g,10,22,50,32,3,P.dgy);                                  // top face
    tri(g,50,22,60,25,50,32,P.dgy);                                // horn
    rect(g,24,32,40,44,P.dgy);                                     // waist
    rrect(g,16,44,48,54,2,P.lgy);                                  // base
    rect(g,12,24,50,26,P.lgy);                                     // top highlight
    eyes(g,26,27,5);
    smileArc(g,26,31,2.2,0.9);
    blush(g,19,30); blush(g,33,30);
  }});

S.push({ name: 'poet', draw(g) {
    rrect(g,19,38,45,56,4,P.lav);                                  // robe
    rrect(g,20,44,44,54,2,P.crm);                                  // open scroll held in front
    rect(g,20,44,22,54,P.lgy); rect(g,42,44,44,54,P.lgy);         // scroll rollers
    disc(g,21,47,2,P.pch); disc(g,43,47,2,P.pch);                 // hands on scroll
    stroke(g,[[41,40],[49,26]],2,1.5,P.pch);                       // right arm up
    ball(g,50,22,1.8,1.8,P.dgy);                                    // ink nib
    stroke(g,[[50,22],[53,9]],2.4,0.6,P.crm);                       // quill plume
    stroke(g,[[51,20],[54,12]],1.1,0.4,P.lgy);                      // feather barb shade
    ball(g,CX,26,11,10,P.pch,P.brn);                               // head
    ellipse(g,CX,18,11,5,P.brn);                                   // hair
    eyes(g,CX,26,6);
    smileArc(g,CX,32,2.4,1);
    blush(g,23,30); blush(g,41,30);
  }});

S.push({ name: 'hockey', draw(g) {
    stroke(g,[[24,12],[42,42]],3,3,P.brn);                         // stick shaft
    rect(g,16,10,24,15,P.crm);                                     // grip tape
    stroke(g,[[42,42],[56,48]],3,4,P.brn);                         // blade heel
    rect(g,42,44,57,50,P.org);                                     // blade
    ellipse(g,20,52,11,7,P.dgy);                                   // puck body
    ellipse(g,20,49,11,4,P.lav);                                   // puck top
    eyes(g,20,52,6);
    smileArc(g,20,57,2.2,0.9);
    blush(g,12,55); blush(g,28,55);
  }});

S.push({ name: 'cocoon', draw(g) {
    stroke(g,[[8,10],[40,14]],1.5,1.2,P.brn);                      // branch
    ellipse(g,30,20,3,2,P.grn);                                    // leaf
    stroke(g,[[28,13],[30,20]],0.6,0.4,P.crm);                     // silk thread
    ball(g,CX,40,13,18,P.crm,P.lgy);                               // silk cocoon
    clipTo(g,[P.crm,P.lgy],()=>{ for(const y of [30,36,42,48]) stroke(g,[[20,y],[44,y+3]],0.7,0.7,P.lgy); }); // silk wraps
    eyes(g,CX,38,6);
    smileArc(g,CX,44,2.4,1);
    blush(g,23,42); blush(g,42,42);
  }});

S.push({ name: 'chef', draw(g) {
    rrect(g,20,40,44,56,4,P.crm);                                  // jacket
    rect(g,30,40,34,56,P.lgy);                                     // placket
    disc(g,30,44,1,P.dgy); disc(g,30,50,1,P.dgy);                 // buttons
    ball(g,CX,26,11,10,P.pch,P.brn);                               // head
    ellipse(g,CX,15,13,7,P.crm);                                   // toque base
    ellipse(g,CX,9,10,6,P.crm);                                    // puffy top
    rect(g,20,17,44,20,P.crm);                                     // hat band
    eyes(g,CX,26,6);
    smileArc(g,CX,32,2.4,1);
    blush(g,23,30); blush(g,41,30);
  }});

S.push({ name: 'periscope', draw(g) {
    ellipse(g,CX,56,16,4,P.sky);                                   // water line
    stroke(g,[[28,56],[28,20]],5,5,P.dgy);                         // vertical tube
    stroke(g,[[28,56],[28,20]],2.5,2.5,P.lgy);                     // highlight
    rrect(g,26,14,48,26,3,P.dgy);                                  // head housing
    rrect(g,27,15,46,25,2,P.lav);
    disc(g,44,20,4,P.sky); disc(g,44,20,2,P.crm);                 // lens
    eyes(g,32,20,4.5);
    smileArc(g,32,25,2,0.9);
    blush(g,26,23); blush(g,39,23);
  }});

S.push({ name: 'hummingbird', draw(g) {
    ellipse(g,12,30,11,7,P.lav); ellipse(g,52,30,11,7,P.lav);     // blurred wings
    ellipse(g,12,30,8,4,P.sky); ellipse(g,52,30,8,4,P.sky);
    stroke(g,[[42,40],[58,50]],1.4,1,P.grn);                       // tail
    ball(g,CX,38,11,10,P.grn,P.plum,P.lim);                        // body
    ellipse(g,CX,42,6,5,P.pnk);                                    // throat
    ball(g,CX,26,9,8,P.grn,P.plum,P.lim);                          // head
    stroke(g,[[CX,28],[CX,10]],1.3,0.4,P.dgy);                     // long beak
    eyes(g,CX,25,6);
    smileArc(g,CX,30,2,0.9);
    blush(g,24,29); blush(g,40,29);
  }});

S.push({ name: 'gondola', draw(g) {
    stroke(g,[[2,8],[62,14]],1,1,P.dgy);                           // cable
    stroke(g,[[CX,12],[CX,22]],1.5,1.5,P.dgy);                     // hanger arm
    disc(g,CX,12,2.5,P.lgy);                                        // grip wheel
    rrect(g,14,22,50,50,5,P.red);                                  // cabin
    rrect(g,18,26,46,40,3,P.sky);                                  // big window
    rect(g,18,44,46,47,P.crm);                                      // trim
    ellipse(g,CX,52,14,3,P.plum);                                   // base
    eyes(g,CX,33,6);
    smileArc(g,CX,38,2.4,1);
    blush(g,22,36); blush(g,44,36);
  }});

S.push({ name: 'stopwatch', draw(g) {
    rect(g,28,6,36,11,P.lgy);                                       // button stem
    ellipse(g,CX,10,5,3,P.dgy);                                     // crown
    stroke(g,[[24,12],[20,8]],1.5,1,P.lgy); stroke(g,[[40,12],[44,8]],1.5,1,P.lgy); // lugs
    disc(g,CX,36,20,P.lgy);                                         // case
    disc(g,CX,36,17,P.crm);                                         // dial
    for(let a=0;a<12;a++){const th=a/12*Math.PI*2; disc(g,CX+Math.cos(th)*15,36+Math.sin(th)*15,1,P.dgy);} // ticks
    disc(g,CX,36,1.5,P.navy);                                        // hub
    eyes(g,CX,34,6);
    smileArc(g,CX,42,2.4,1);
    blush(g,20,40); blush(g,44,40);
  }});

S.push({ name: 'tile', draw(g) {
    rrect(g,10,13,54,55,3,P.lav);                                  // bevel shadow
    rrect(g,10,11,54,53,3,P.sky);                                  // tile face
    ellipse(g,CX,32,14,14,P.crm);                                  // motif
    ellipse(g,CX,32,9,9,P.pnk);                                    // inner motif
    for(const [x,y] of [[16,17],[47,17],[16,47],[47,47]]) disc(g,x,y,2,P.yel); // corner dots
    eyes(g,CX,31,6);
    smileArc(g,CX,37,2.4,1);
    blush(g,20,35); blush(g,43,35);
  }});

S.push({ name: 'porridge', draw(g) {
    stroke(g,[[26,20],[24,10]],1,0.5,P.crm); stroke(g,[[34,20],[36,9]],1,0.5,P.crm); // steam
    stroke(g,[[30,20],[31,7]],1,0.5,P.crm);
    ellipse(g,CX,44,20,12,P.lgy);                                  // bowl
    ellipse(g,CX,41,17,9,P.crm);                                   // congee
    ellipse(g,CX,40,16,6,P.crm);
    disc(g,26,39,1,P.grn); disc(g,37,41,1,P.grn); disc(g,32,38,1,P.org); // toppings
    stroke(g,[[46,44],[52,26]],1.5,1,P.brn);                       // spoon handle
    ellipse(g,48,44,4,2.5,P.lgy);                                  // spoon bowl
    eyes(g,CX,40,6);
    smileArc(g,CX,45,2.4,1);
    blush(g,21,43); blush(g,42,43);
  }});

S.push({ name: 'stethoscope', draw(g) {
    stroke(g, [[16, 12], [18, 26], [26, 40]], 2, 2.4, P.dgy);   // left tube
    stroke(g, [[47, 12], [45, 26], [37, 40]], 2, 2.4, P.dgy);   // right tube
    ball(g, 15, 10, 3.2, 3, P.lgy, P.lav);                // left earpiece
    ball(g, 48, 10, 3.2, 3, P.lgy, P.lav);               // right earpiece
    ball(g, CX, 46, 12, 11, P.sky, P.lav);               // chest piece
    ellipse(g, CX, 46, 8, 7, P.lgy);                     // diaphragm
    eyes(g, CX, 44, 6);
    smileArc(g, CX, 50, 2.6, 1.2);
    blush(g, CX - 9, 48); blush(g, CX + 9, 48);
  }});

S.push({ name: 'amber', draw(g) {
    ball(g, CX, 34, 16, 19, P.org, P.brn, P.yel);        // amber gem
    ellipse(g, 24, 22, 3, 4, P.yel);                     // inner glow
    ball(g, CX, 29, 3.2, 2.4, P.brn, P.plum);            // trapped bug
    stroke(g, [[28, 28], [24, 25]], 0.8, 0.8, P.brn);    // bug legs
    stroke(g, [[35, 28], [39, 25]], 0.8, 0.8, P.brn);
    disc(g, 40, 44, 1.4, P.yel);                         // sparkle
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.2);
    blush(g, CX - 11, 44); blush(g, CX + 11, 44);
  }});

S.push({ name: 'flamingo', draw(g) {
    stroke(g, [[30, 40], [24, 30], [26, 20], [33, 16]], 2.4, 2, P.pnk); // S-neck
    ball(g, CX, 46, 12, 11, P.pnk, P.plum);              // body
    ball(g, 44, 44, 6, 5, P.pnk, P.plum);                // wing
    stroke(g, [[30, 56], [29, 60]], 1.4, 1, P.org);      // leg
    ball(g, 29, 61, 2.4, 1.4, P.org);                    // foot
    ball(g, 35, 13, 8, 7.5, P.pnk, P.plum);              // head
    tri(g, 40, 12, 48, 15, 41, 17, P.dgy);               // bent beak
    eyes(g, 35, 13, 5);
    smileArc(g, 35, 18, 1.8, 0.8);
    blush(g, 30, 16); blush(g, 40, 16);
  }});

S.push({ name: 'piston', draw(g) {
    rrect(g, 18, 12, 46, 44, 4, P.lav);                  // cylinder shadow
    rrect(g, 18, 12, 44, 42, 4, P.lgy);                  // piston body
    rect(g, 19, 20, 44, 22, P.lav);                      // ring groove
    rect(g, 19, 25, 44, 27, P.lav);                      // ring groove
    rect(g, 21, 14, 24, 40, P.crm);                      // shine
    rect(g, 28, 42, 35, 54, P.dgy);                      // connecting rod
    ball(g, CX, 57, 6, 5, P.lgy, P.lav);                 // rod cap
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.6, 1.2);
    blush(g, CX - 11, 35); blush(g, CX + 11, 35);
  }});

S.push({ name: 'bagpipes', draw(g) {
    stroke(g, [[22, 26], [18, 10]], 1.8, 1.4, P.brn);    // left drone pipe
    ball(g, 18, 8, 2.4, 2.4, P.crm, P.lgy);
    stroke(g, [[28, 24], [27, 8]], 1.8, 1.4, P.brn);     // mid drone
    ball(g, 27, 6, 2.4, 2.4, P.crm, P.lgy);
    stroke(g, [[34, 24], [36, 10]], 1.8, 1.4, P.brn);    // right drone
    ball(g, 36, 8, 2.4, 2.4, P.crm, P.lgy);
    stroke(g, [[46, 40], [56, 34]], 1.8, 1.4, P.brn);    // blowpipe
    ball(g, CX, 44, 16, 14, P.red, P.plum);              // tartan bag
    clipTo(g, [P.red, P.plum], () => {                   // tartan lines
      rect(g, 18, 40, 46, 41, P.grn); rect(g, 18, 48, 46, 49, P.grn);
      rect(g, 26, 32, 27, 56, P.grn); rect(g, 36, 32, 37, 56, P.grn);
    });
    eyes(g, CX, 43, 6);
    smileArc(g, CX, 49, 2.6, 1.2);
    blush(g, CX - 11, 47); blush(g, CX + 11, 47);
  }});

S.push({ name: 'mallet', draw(g) {
    ball(g, CX, 22, 15, 13, P.brn, P.plum, P.org);       // round mallet head
    ball(g, 24, 16, 4, 3, P.org);                        // head shine
    rrect(g, 28, 32, 35, 58, 2, P.brn);                  // handle
    rect(g, 29, 34, 30, 56, P.org);                      // handle shine
    eyes(g, CX, 22, 7);
    smileArc(g, CX, 28, 2.6, 1.2);
    blush(g, CX - 11, 26); blush(g, CX + 11, 26);
  }});

S.push({ name: 'courier', draw(g) {
    ball(g, CX - 3, 49, 9, 8, P.sky, P.lav);             // uniform
    ball(g, 24, 57, 4, 2.6, P.navy, P.blk); ball(g, 34, 57, 4, 2.6, P.navy, P.blk); // shoes
    ball(g, 44, 44, 7, 6, P.brn, P.plum);                // satchel
    rect(g, 40, 40, 48, 42, P.brn);                      // satchel flap
    ball(g, 40, 47, 3, 2.6, P.pch, P.brn);               // hand
    rrect(g, 34, 44, 44, 51, 1, P.crm);                  // envelope
    tri(g, 34, 44, 44, 44, 39, 48, P.lgy);               // envelope flap
    ball(g, CX - 3, 27, 13, 12, P.pch, P.brn);           // head
    ellipse(g, CX - 3, 18, 14, 5, P.sky);                // cap brim
    ball(g, CX - 3, 14, 9, 6, P.sky, P.lav);             // cap crown
    eyes(g, CX - 3, 29, 6);
    smileArc(g, CX - 3, 35, 2.4, 1.1);
    blush(g, CX - 12, 33); blush(g, CX + 6, 33);
  }});

S.push({ name: 'molasses', draw(g) {
    rrect(g, 18, 22, 46, 54, 6, P.plum);                 // jar shadow
    rrect(g, 18, 22, 44, 52, 6, P.brn);                  // syrup jar
    ellipse(g, CX, 22, 13, 3, P.brn);                    // rim
    rrect(g, 24, 12, 40, 20, 2, P.org);                  // lid
    stroke(g, [[46, 30], [48, 40], [46, 48]], 2, 1.4, P.brn); // drip
    ball(g, 47, 50, 2.4, 3, P.brn, P.plum);              // drip blob
    rect(g, 22, 26, 24, 48, P.org);                      // shine
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 42, 2.6, 1.2);
    blush(g, CX - 11, 39); blush(g, CX + 11, 39);
  }});

S.push({ name: 'triangle', draw(g) {
    stroke(g, [[14, 50], [CX, 14]], 2, 2, P.yel);        // left bar
    stroke(g, [[CX, 14], [50, 50]], 2, 2, P.yel);        // right bar
    stroke(g, [[16, 50], [42, 50]], 2, 2, P.yel);        // bottom bar (gap)
    stroke(g, [[CX, 11], [30, 6]], 1, 1, P.lgy);         // hanger string
    stroke(g, [[46, 26], [56, 20]], 1.6, 1.6, P.brn);    // striker beater
    ellipse(g, CX, 40, 6, 5, P.crm);                     // face backing
    eyes(g, CX, 40, 5);
    smileArc(g, CX, 45, 2.2, 1);
    blush(g, CX - 8, 43); blush(g, CX + 8, 43);
  }});

S.push({ name: 'turpentine', draw(g) {
    rrect(g, 18, 24, 46, 54, 3, P.lav);                  // can shadow
    rrect(g, 18, 24, 44, 52, 3, P.lgy);                  // metal tin
    rect(g, 20, 28, 22, 50, P.crm);                      // shine
    rrect(g, 28, 14, 38, 26, 2, P.dgy);                  // cap/spout
    ball(g, 47, 20, 3, 4, P.grn, P.plum);                // pine sprig
    stroke(g, [[47, 15], [47, 26]], 0.8, 0.8, P.grn);
    stroke(g, [[42, 18], [52, 18]], 0.8, 0.8, P.grn);
    stroke(g, [[43, 22], [51, 22]], 0.8, 0.8, P.grn);
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 2.6, 1.2);
    blush(g, CX - 11, 41); blush(g, CX + 11, 41);
  }});

S.push({ name: 'caboose', draw(g) {
    rrect(g, 10, 26, 54, 48, 3, P.plum);                 // car shadow
    rrect(g, 10, 26, 52, 46, 3, P.red);                  // car body
    rrect(g, 24, 12, 40, 26, 2, P.red);                  // cupola
    rect(g, 27, 16, 37, 22, P.sky);                      // cupola window
    rect(g, 14, 30, 22, 38, P.crm);                      // side windows
    rect(g, 42, 30, 50, 38, P.crm);
    rect(g, 10, 46, 52, 49, P.dgy);                      // underframe
    disc(g, 20, 52, 4, P.dgy); disc(g, 20, 52, 1.6, P.lgy); // wheels
    disc(g, 42, 52, 4, P.dgy); disc(g, 42, 52, 1.6, P.lgy);
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.6, 1.2);
    blush(g, CX - 13, 37); blush(g, CX + 13, 37);
  }});

S.push({ name: 'slate', draw(g) {
    rrect(g, 12, 16, 52, 52, 3, P.brn);                  // wood frame
    rect(g, 16, 20, 48, 48, P.dgy);                      // slate shadow
    rect(g, 16, 20, 46, 46, P.lav);                      // slate stone
    rect(g, 19, 23, 22, 43, P.lgy);                      // sheen streak
    rrect(g, 30, 50, 46, 54, 1, P.crm);                  // chalk stick
    rect(g, 44, 51, 46, 53, P.lgy);                      // chalk tip
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.6, 1.2);
    blush(g, CX - 11, 35); blush(g, CX + 11, 35);
  }});

S.push({ name: 'crossroads', draw(g) {
    rect(g, 4, 26, 59, 42, P.dgy);                       // horizontal road
    rect(g, 23, 6, 40, 58, P.dgy);                       // vertical road
    for (let x = 6; x < 20; x += 6) rect(g, x, 33, x + 3, 35, P.yel);  // dashes
    for (let x = 44; x < 58; x += 6) rect(g, x, 33, x + 3, 35, P.yel);
    for (let y = 8; y < 24; y += 6) rect(g, 30, y, 32, y + 3, P.yel);
    for (let y = 46; y < 58; y += 6) rect(g, 30, y, 32, y + 3, P.yel);
    stroke(g, [[50, 26], [50, 10]], 1.4, 1.4, P.brn);    // signpost
    rrect(g, 48, 8, 60, 14, 1, P.grn);                   // sign board
    eyes(g, CX, 33, 5);
    smileArc(g, CX, 38, 2.2, 1);
    blush(g, CX - 8, 36); blush(g, CX + 8, 36);
  }});

S.push({ name: 'frisbee', draw(g) {
    ellipse(g, CX, 40, 24, 11, P.plum);                  // rim underside
    ellipse(g, CX, 36, 24, 11, P.pnk);                   // disc top
    ellipse(g, CX, 35, 18, 7.5, P.red);                  // inner ring
    ellipse(g, CX, 34, 9, 4, P.pnk);                      // center
    ball(g, 18, 30, 3, 2, P.crm);                        // shine
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 41, 2.6, 1.1);
    blush(g, CX - 12, 39); blush(g, CX + 12, 39);
  }});

S.push({ name: 'director', draw(g) {
    ball(g, CX - 4, 49, 9, 8, P.plum, P.navy);           // jacket
    ball(g, 23, 57, 4, 2.6, P.dgy, P.blk); ball(g, 33, 57, 4, 2.6, P.dgy, P.blk); // shoes
    tri(g, 40, 40, 56, 34, 56, 48, P.org);               // megaphone cone
    tri(g, 40, 42, 52, 38, 52, 46, P.yel);               // cone light
    rrect(g, 38, 40, 42, 48, 1, P.red);                  // mouthpiece
    ball(g, 40, 44, 3, 2.6, P.pch, P.brn);               // hand
    ball(g, CX - 4, 27, 13, 12, P.pch, P.brn);           // head
    ellipse(g, CX - 4, 17, 12, 5, P.navy);               // beret
    ball(g, 21, 12, 2.4, 2, P.navy);                     // beret nub
    eyes(g, CX - 4, 29, 6);
    smileArc(g, CX - 4, 35, 2.4, 1.1);
    blush(g, CX - 13, 33); blush(g, CX + 5, 33);
  }});

S.push({ name: 'bishop', draw(g) {
    ball(g, CX, 50, 11, 9, P.plum, P.navy);              // robe
    ball(g, 25, 58, 4, 2.4, P.plum, P.navy); ball(g, 38, 58, 4, 2.4, P.plum, P.navy);
    rect(g, 29, 42, 34, 56, P.yel);                      // stole
    ball(g, CX, 30, 12, 11, P.pch, P.brn);               // face
    tri(g, 19, 27, 44, 27, CX, 4, P.lgy);                // mitre back
    tri(g, 21, 27, 42, 27, CX, 7, P.crm);                // mitre front
    rect(g, 30, 7, 33, 27, P.org);                       // mitre band vert
    rect(g, 21, 23, 42, 27, P.org);                      // mitre band horiz
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.4, 1.1);
    blush(g, CX - 10, 36); blush(g, CX + 10, 36);
  }});

S.push({ name: 'tights', draw(g) {
    rrect(g, 18, 14, 45, 26, 4, P.plum);                 // waist shadow
    rrect(g, 18, 14, 43, 24, 4, P.pnk);                  // waistband
    rect(g, 19, 12, 42, 16, P.lgy);                      // elastic top
    rrect(g, 19, 22, 30, 58, 4, P.plum);                 // left leg shadow
    rrect(g, 19, 22, 29, 56, 4, P.pnk);                  // left leg
    rrect(g, 33, 22, 44, 58, 4, P.plum);                 // right leg shadow
    rrect(g, 34, 22, 44, 56, 4, P.pnk);                  // right leg
    rect(g, 22, 28, 24, 50, P.pch);                      // sheen
    rect(g, 37, 28, 39, 50, P.pch);
    eyes(g, CX, 19, 5);
    smileArc(g, CX, 23, 2, 0.9);
    blush(g, CX - 9, 21); blush(g, CX + 9, 21);
  }});

S.push({ name: 'tablecloth', draw(g) {
    rect(g, 26, 44, 30, 58, P.brn);                      // table legs
    rect(g, 34, 44, 38, 58, P.brn);
    rrect(g, 10, 24, 54, 46, 3, P.plum);                 // cloth shadow
    rrect(g, 10, 24, 52, 44, 3, P.red);                  // draped cloth
    for (let x = 12; x < 52; x += 8) disc(g, x, 44, 3, P.red); // scalloped hem
    clipTo(g, [P.red], () => {                           // gingham checks
      rect(g, 10, 30, 52, 32, P.crm); rect(g, 10, 38, 52, 40, P.crm);
      rect(g, 18, 24, 20, 46, P.crm); rect(g, 34, 24, 36, 46, P.crm);
    });
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.6, 1.2);
    blush(g, CX - 13, 35); blush(g, CX + 13, 35);
  }});

S.push({ name: 'stake', draw(g) {
    rrect(g, 24, 8, 40, 46, 2, P.plum);                  // post shadow
    rrect(g, 24, 8, 38, 46, 2, P.brn);                   // wooden post
    tri(g, 22, 44, 42, 44, CX, 60, P.plum);              // point shadow
    tri(g, 24, 44, 40, 44, CX, 57, P.brn);               // rounded point
    rect(g, 27, 12, 29, 44, P.org);                      // grain shine
    stroke(g, [[31, 16], [34, 26]], 0.8, 0.8, P.plum);   // grain lines
    stroke(g, [[32, 30], [30, 40]], 0.8, 0.8, P.plum);
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 30, 2.4, 1.1);
    blush(g, CX - 8, 28); blush(g, CX + 8, 28);
  }});

S.push({ name: 'latte', draw(g) {
    rrect(g, 20, 20, 44, 56, 4, P.lgy);                  // glass shadow
    rrect(g, 20, 20, 42, 54, 4, P.crm);                  // glass
    rect(g, 22, 34, 42, 52, P.brn);                      // coffee layer
    rect(g, 22, 40, 42, 42, P.plum);                     // layer line
    ellipse(g, CX, 26, 11, 5, P.crm);                    // foam top
    tri(g, 28, 25, 35, 25, CX, 32, P.brn);               // leaf art
    rect(g, 30, 24, 33, 30, P.brn);
    ellipse(g, 46, 40, 5, 8, P.lgy);                     // handle
    ellipse(g, 46, 40, 2.4, 4.5, null);
    eyes(g, CX, 45, 6);
    smileArc(g, CX, 51, 2.6, 1.2);
    blush(g, CX - 11, 48); blush(g, CX + 11, 48);
  }});

S.push({ name: 'vaccine', draw(g) {
    stroke(g, [[CX, 14], [CX, 8]], 1, 0.8, P.lgy);       // blunt short needle
    rrect(g, 26, 14, 37, 20, 1, P.lgy);                  // needle hub
    rrect(g, 23, 20, 40, 48, 3, P.lav);                  // barrel shadow
    rrect(g, 23, 20, 38, 46, 3, P.crm);                  // glass barrel
    rect(g, 25, 30, 38, 44, P.sky);                      // vaccine liquid
    rect(g, 26, 30, 28, 44, P.crm);                      // shine
    rrect(g, 24, 46, 39, 52, 2, P.lgy);                  // plunger flange
    rect(g, 29, 52, 34, 60, P.dgy);                      // plunger rod
    eyes(g, CX, 36, 5);
    smileArc(g, CX, 41, 2.2, 1);
    blush(g, CX - 9, 39); blush(g, CX + 9, 39);
  }});

S.push({ name: 'intercom', draw(g) {
    stroke(g, [[24, 20], [20, 6]], 1.4, 1, P.dgy);       // antenna
    ball(g, 20, 5, 1.8, 1.8, P.red);                     // antenna tip
    rrect(g, 18, 18, 46, 56, 4, P.navy);                 // body shadow
    rrect(g, 18, 18, 44, 54, 4, P.dgy);                  // handset body
    rrect(g, 22, 22, 42, 30, 1, P.sky);                  // display
    for (let y = 34; y <= 44; y += 3) rect(g, 24, y, 40, y + 1, P.navy); // grille
    disc(g, 24, 50, 2, P.red); disc(g, 39, 50, 2, P.lim); // buttons
    eyes(g, 32, 26, 5);
    smileArc(g, 32, 30, 2, 0.9);
    blush(g, 25, 28); blush(g, 39, 28);
  }});

S.push({ name: 'printer', draw(g) {
    rrect(g, 20, 8, 44, 24, 1, P.crm);                   // paper sheet
    rect(g, 22, 12, 42, 13, P.lgy); rect(g, 22, 16, 42, 17, P.lgy); // print lines
    rrect(g, 12, 22, 52, 52, 4, P.lav);                  // printer shadow
    rrect(g, 12, 22, 50, 50, 4, P.sky);                  // printer body
    rect(g, 16, 20, 48, 26, P.lgy);                      // paper slot
    rrect(g, 18, 40, 46, 50, 1, P.lav);                  // output tray
    disc(g, 44, 30, 1.6, P.lim);                         // power light
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.6, 1.2);
    blush(g, CX - 12, 37); blush(g, CX + 12, 37);
  }});

S.push({ name: 'beanie', draw(g) {
    ball(g, CX, 12, 5, 5, P.crm, P.lgy);                 // pom-pom
    ball(g, CX, 30, 18, 15, P.red, P.plum);              // hat dome
    rrect(g, 12, 38, 52, 50, 4, P.pnk);                  // folded brim shadow
    rrect(g, 12, 38, 51, 48, 4, P.red);                  // brim
    clipTo(g, [P.red, P.plum], () => {                   // knit ribs
      for (let x = 16; x < 48; x += 5) rect(g, x, 18, x + 1, 38, P.plum);
    });
    for (let x = 15; x < 52; x += 5) rect(g, x, 38, x + 1, 48, P.pnk); // brim ribs
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.6, 1.2);
    blush(g, CX - 12, 35); blush(g, CX + 12, 35);
  }});

S.push({ name: 'starfish', draw(g) {
    for (let i = 0; i < 5; i++) {
      const th = -Math.PI / 2 + i * 2 * Math.PI / 5;
      stroke(g, [[CX, 33], [CX + Math.cos(th) * 22, 33 + Math.sin(th) * 22]], 8, 3, P.org);
    }
    ball(g, CX, 33, 11, 11, P.org, P.brn);               // center
    for (let i = 0; i < 5; i++) {
      const th = -Math.PI / 2 + i * 2 * Math.PI / 5;
      disc(g, CX + Math.cos(th) * 14, 33 + Math.sin(th) * 14, 1.4, P.yel);
    }
    disc(g, CX, 33, 1.4, P.yel);
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 39, 2.6, 1.2);
    blush(g, CX - 9, 37); blush(g, CX + 9, 37);
  }});

S.push({ name: 'eyeliner', draw(g) {
    tri(g, 12, 52, 20, 44, 22, 54, P.navy);              // fine brush tip
    stroke(g, [[10, 56], [16, 50]], 1.2, 0.8, P.navy);   // liner stroke
    rrect(g, 18, 40, 30, 52, 2, P.plum);                 // barrel lower shadow
    rrect(g, 19, 40, 30, 50, 2, P.pnk);                  // barrel lower
    rrect(g, 28, 18, 44, 44, 3, P.plum);                 // cap shadow
    rrect(g, 28, 18, 42, 42, 3, P.pnk);                  // cap
    rect(g, 30, 22, 32, 40, P.crm);                      // shine
    disc(g, 35, 16, 2.4, P.plum);                        // cap nub
    eyes(g, 35, 30, 5);
    smileArc(g, 35, 35, 2.2, 1);
    blush(g, 28, 33); blush(g, 42, 33);
  }});

S.push({ name: 'marmalade', draw(g) {
    rrect(g, 18, 24, 46, 54, 6, P.brn);                  // jar shadow
    rrect(g, 18, 24, 44, 52, 6, P.org);                  // marmalade
    rrect(g, 22, 14, 42, 24, 2, P.red);                  // lid
    rect(g, 24, 12, 40, 15, P.plum);                     // lid rim
    ellipse(g, CX, 24, 13, 3, P.yel);                    // top surface
    ball(g, 40, 44, 4, 4, P.yel, P.org);                 // orange slice
    for (let i = 0; i < 4; i++) {
      const th = i * Math.PI / 4;
      stroke(g, [[40, 44], [40 + Math.cos(th) * 3.5, 44 + Math.sin(th) * 3.5]], 0.6, 0.6, P.crm);
    }
    eyes(g, 26, 38, 5);
    smileArc(g, 26, 43, 2.2, 1);
    blush(g, 20, 41); blush(g, 32, 41);
  }});

S.push({ name: 'sphinx', draw(g) {
    rrect(g, 12, 42, 52, 56, 5, P.brn);                  // body shadow
    rrect(g, 12, 40, 50, 54, 5, P.org);                  // sandstone body
    ball(g, 14, 48, 5, 4, P.org, P.brn);                 // front paws
    rect(g, 10, 50, 20, 56, P.org);
    ball(g, CX, 26, 12, 12, P.pch, P.brn);               // human face
    tri(g, 17, 30, 22, 14, CX, 20, P.sky);               // left nemes flap
    tri(g, 46, 30, 41, 14, CX, 20, P.sky);               // right nemes flap
    ellipse(g, CX, 14, 13, 6, P.sky);                    // headdress crown
    clipTo(g, [P.sky], () => {                           // stripes
      rect(g, 14, 22, 20, 23, P.yel); rect(g, 14, 26, 20, 27, P.yel);
      rect(g, 43, 22, 49, 23, P.yel); rect(g, 43, 26, 49, 27, P.yel);
      rect(g, 25, 10, 38, 11, P.yel);
    });
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.4, 1.1);
    blush(g, CX - 9, 31); blush(g, CX + 9, 31);
  }});

S.push({ name: 'cardigan', draw(g) {
    ball(g, 13, 38, 5, 9, P.org, P.brn);                 // left sleeve
    ball(g, 50, 38, 5, 9, P.org, P.brn);                 // right sleeve
    ball(g, CX, 40, 13, 13, P.org, P.brn);               // knit torso
    tri(g, 24,27, 39,27, CX, 34, P.brn);                 // V-neck
    rect(g, 22,49, 41,54, P.brn);                        // ribbed hem band
    for (let x = 23; x < 41; x += 2) g.set(x, 52, P.org); // rib lines
    disc(g, 27,32, 1.3, P.yel); disc(g, 36,32, 1.3, P.yel); // collar buttons
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.1);
    blush(g, 21,44); blush(g, 42,44);
  }});

S.push({ name: 'microchip', draw(g) {
    for (const y of [26,31,36,41]) { rect(g, 10,y, 17,y+1, P.yel); rect(g, 47,y, 54,y+1, P.yel); } // side pins
    for (const x of [26,31,36,41]) { rect(g, x,10, x+1,17, P.yel); rect(g, x,47, x+1,54, P.yel); } // top/bottom pins
    rrect(g, 17,17, 47,47, 3, P.dgy);                    // chip body
    rrect(g, 20,20, 44,44, 2, P.navy);                   // dark surface
    disc(g, 23,23, 1.6, P.crm);                          // pin-1 dot
    rect(g, 24,41, 40,42, P.lav);                        // silk line
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 2.6, 1.1);
    blush(g, 23,35); blush(g, 40,35);
  }});

S.push({ name: 'pillowcase', draw(g) {
    rrect(g, 10,20, 53,48, 8, P.lgy);                    // shadow base
    rrect(g, 10,19, 53,46, 8, P.crm);                    // plump pillow front
    rect(g, 14,42, 49,44, P.lgy);                        // open hem line
    for (let x = 16; x < 48; x += 3) g.set(x, 43, P.crm); // stitch dashes
    stroke(g, [[14,23],[18,27]], 0.8,0.6, P.lgy);        // corner creases
    stroke(g, [[49,23],[45,27]], 0.8,0.6, P.lgy);
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 2.8, 1.2);
    blush(g, 20,35); blush(g, 43,35);
  }});

S.push({ name: 'tambourine', draw(g) {
    ball(g, CX, 34, 20, 20, P.brn, P.plum);              // wood frame
    disc(g, CX, 34, 15, P.crm);                          // drum skin
    ellipse(g, CX-4, 30, 6, 5, P.lgy);                   // skin sheen
    for (let a = 0; a < 8; a++) { const th = a/8*Math.PI*2; disc(g, CX+Math.cos(th)*20, 34+Math.sin(th)*20, 2.4, P.yel); } // jingles
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 39, 2.8, 1.2);
    blush(g, 21,37); blush(g, 42,37);
  }});

S.push({ name: 'rodent', draw(g) {
    stroke(g, [[42,50],[52,50],[57,42]], 1.4,0.7, P.pch); // long thin tail
    ball(g, CX, 46, 11, 10, P.lgy, P.lav);               // round body
    ellipse(g, CX, 49, 6, 6, P.crm);                     // belly
    ball(g, 25,56, 3,2.4, P.lgy, P.lav); ball(g, 38,56, 3,2.4, P.lgy, P.lav); // feet
    disc(g, 20,15, 7, P.lgy); disc(g, 20,15, 4, P.pnk);  // big ears
    disc(g, 43,15, 7, P.lgy); disc(g, 43,15, 4, P.pnk);
    ball(g, CX, 27, 12, 11, P.lgy, P.lav);               // head
    ball(g, CX, 33, 4, 3, P.crm);                        // snout
    ellipse(g, CX, 30, 1.4,1, P.pnk);                    // nose
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 33, 2, 1);
    blush(g, 21,30); blush(g, 42,30);
  }});

S.push({ name: 'binder', draw(g) {
    rect(g, 18,30, 46,52, P.crm);                        // paper stack behind
    for (const y of [36,42,48]) rect(g, 20,y, 44,y+1, P.lgy); // paper lines
    stroke(g, [[24,22],[18,13],[26,13]], 1.2,1.2, P.lgy); // left wire handle
    stroke(g, [[40,22],[38,13],[46,13]], 1.2,1.2, P.lgy); // right wire handle
    rrect(g, 20,22, 44,40, 2, P.navy);                   // clip body
    tri(g, 20,40, 44,40, CX, 24, P.dgy);                 // clip front bevel
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 35, 2.4, 1);
    blush(g, 22,33); blush(g, 41,33);
  }});

S.push({ name: 'tanker', draw(g) {
    ellipse(g, CX, 56, 26, 4, P.sky);                    // water
    rect(g, 12,40, 52,50, P.red);                        // hull
    tri(g, 6,40, 12,40, 12,50, P.red);                   // bow
    tri(g, 52,40, 58,40, 52,50, P.red);                  // stern
    rect(g, 12,36, 52,40, P.crm);                        // deck
    for (const x of [20,28,36]) rrect(g, x,28, x+4,36, 1, P.lgy); // cargo tanks
    rrect(g, 42,24, 50,36, 1, P.lav);                    // bridge tower
    rect(g, 44,27, 48,30, P.sky);                        // window
    eyes(g, 24, 44, 5);
    smileArc(g, 24, 48, 2.4, 1);
    blush(g, 17,47); blush(g, 31,47);
  }});

S.push({ name: 'eyeglasses', draw(g) {
    stroke(g, [[14,30],[6,26]], 1.4,1.2, P.dgy);         // left arm
    stroke(g, [[49,30],[57,26]], 1.4,1.2, P.dgy);        // right arm
    disc(g, 22,32, 11, P.dgy);                           // left frame
    disc(g, 22,32, 8.5, P.sky);                          // left lens
    disc(g, 41,32, 11, P.dgy);                           // right frame
    disc(g, 41,32, 8.5, P.sky);                          // right lens
    rect(g, 30,30, 33,33, P.dgy);                        // bridge
    ellipse(g, 19,29, 3,2, P.crm); ellipse(g, 38,29, 3,2, P.crm); // lens shine
    eye(g, 22, 33, 3); eye(g, 41, 33, 3);                // eyes in lenses
    smileArc(g, CX, 47, 3, 1.4);
    blush(g, 16,42); blush(g, 47,42);
  }});

S.push({ name: 'gel', draw(g) {
    rrect(g, 22,26, 41,54, 5, P.sky);                    // tube
    rect(g, 24,26, 27,54, P.crm);                        // tube shine
    rect(g, 26,20, 37,27, P.lav);                        // cap
    ball(g, CX, 16, 8, 6, P.lav, P.plum);                // squeezed gel blob
    ellipse(g, 29,13, 2.5,1.6, P.crm);                   // blob gloss
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.1);
    blush(g, 25,44); blush(g, 39,44);
  }});

S.push({ name: 'cookbook', draw(g) {
    rrect(g, 12,12, 50,55, 3, P.red);                    // cover
    rect(g, 12,12, 16,55, P.plum);                       // spine
    rect(g, 47,15, 50,52, P.crm);                        // page edges
    ball(g, 33,19, 7,5, P.crm, P.lgy);                   // chef hat puff
    rect(g, 27,23, 39,26, P.crm); rect(g, 27,26, 39,28, P.lgy); // hat band
    disc(g, 24,44, 2, P.yel); rect(g, 23.5,45, 24.5,50, P.yel); // spoon
    stroke(g, [[41,44],[41,50]], 1,1, P.yel); for (const x of [40,41,42]) g.set(x,43,P.yel); // fork
    eyes(g, 33, 36, 5.5);
    smileArc(g, 33, 42, 2.4, 1);
    blush(g, 25,40); blush(g, 41,40);
  }});

S.push({ name: 'clinic', draw(g) {
    rect(g, 10,24, 53,54, P.crm);                        // building
    rect(g, 10,24, 53,30, P.lgy);                        // roof band
    rect(g, 10,50, 53,54, P.lgy);                        // base shade
    rect(g, 26,13, 37,24, P.crm);                        // sign box
    rect(g, 29,16, 34,23, P.red); rect(g, 27,18, 36,21, P.red); // red cross
    rrect(g, 26,44, 37,54, 1, P.sky);                    // glass door
    rect(g, 14,34, 21,40, P.sky); rect(g, 42,34, 49,40, P.sky); // windows
    eyes(g, CX, 37, 6);
    smileArc(g, CX, 42, 2.4, 1);
    blush(g, 18,41); blush(g, 45,41);
  }});

S.push({ name: 'blizzard', draw(g) {
    ball(g, 22,24, 9,7, P.lgy, P.lav);                   // cloud puff
    ball(g, 40,22, 11,8, P.lgy, P.lav);
    ball(g, CX, 28, 15, 8, P.crm, P.lgy);                // cloud base
    for (const [x,y] of [[16,44],[26,52],[36,46],[46,54],[41,40],[21,54]]) { disc(g, x,y, 1.6, P.crm); g.set(x,y-2,P.sky); g.set(x,y+2,P.sky); g.set(x-2,y,P.sky); g.set(x+2,y,P.sky); } // snowflakes
    stroke(g, [[14,40],[24,42],[16,46]], 0.8,0.8, P.sky); // wind swirl
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.4, 1);
    blush(g, 20,31); blush(g, 43,31);
  }});

S.push({ name: 'potion', draw(g) {
    rect(g, 28,15, 35,22, P.lgy);                        // neck
    rrect(g, 27,10, 36,15, 1, P.brn);                    // cork
    ball(g, CX, 40, 15, 14, P.crm, P.lgy);               // round flask
    ellipse(g, CX, 44, 12, 10, P.pnk);                   // liquid
    ellipse(g, CX, 50, 11, 5, P.plum);                   // liquid shade
    for (const [x,y] of [[27,42],[35,38],[31,48]]) disc(g, x,y, 1.4, P.crm); // bubbles
    ellipse(g, 23,35, 3,5, P.crm);                       // glass shine
    g.set(39,20,P.yel); g.set(41,18,P.yel); g.set(40,22,P.yel); // sparkles
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.1);
    blush(g, 21,44); blush(g, 42,44);
  }});

S.push({ name: 'muskrat', draw(g) {
    stroke(g, [[40,52],[50,54],[57,50]], 2, 0.8, P.brn); // flat paddle tail
    ball(g, CX, 46, 12, 10, P.brn, P.plum);              // stocky body
    ellipse(g, CX, 49, 6, 6, P.pch);                     // belly
    ball(g, 25,56, 3,2.4, P.brn, P.plum); ball(g, 38,56, 3,2.4, P.brn, P.plum); // feet
    disc(g, 23,17, 4, P.brn); disc(g, 23,17, 2, P.plum); // small ears
    disc(g, 40,17, 4, P.brn); disc(g, 40,17, 2, P.plum);
    ball(g, CX, 28, 11, 10, P.brn, P.plum);              // head
    ball(g, CX, 34, 5, 3.5, P.pch);                      // blunt snout
    ellipse(g, CX, 31, 1.6,1.1, P.navy);                 // nose
    rect(g, 30,35, 33,38, P.crm);                        // friendly buck teeth
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2, 0.9);
    blush(g, 21,31); blush(g, 42,31);
  }});

S.push({ name: 'hive', draw(g) {
    ball(g, CX, 24, 14, 8, P.yel, P.org);                // top dome
    ball(g, CX, 33, 17, 8, P.yel, P.org);                // mid
    ball(g, CX, 43, 19, 9, P.yel, P.org);                // bottom
    for (const y of [28,38,48]) rect(g, 14,y, 49,y+1, P.org); // hive seams
    disc(g, CX, 50, 4, P.brn);                           // entrance hole
    ball(g, 48,13, 3.5,3, P.yel, P.org);                 // little bee
    rect(g, 47,12, 50,15, P.navy);                       // bee stripe
    ellipse(g, 45,11, 2,1.4, P.crm); ellipse(g, 51,11, 2,1.4, P.crm); // bee wings
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 40, 2.6, 1.1);
    blush(g, 18,38); blush(g, 45,38);
  }});

S.push({ name: 'hairspray', draw(g) {
    for (const [x,y] of [[38,10],[44,8],[42,14],[48,12]]) disc(g, x,y, 1.3, P.sky); // spray mist
    rrect(g, 22,24, 42,54, 4, P.pnk);                    // can
    rect(g, 24,24, 27,54, P.crm);                        // shine
    rect(g, 24,31, 40,37, P.crm);                        // label band
    rect(g, 27,16, 37,24, P.lgy);                        // nozzle base
    rect(g, 30,12, 34,17, P.dgy);                        // button
    eyes(g, CX, 43, 5.5);
    smileArc(g, CX, 48, 2.4, 1);
    blush(g, 24,46); blush(g, 40,46);
  }});

S.push({ name: 'crater', draw(g) {
    ball(g, CX, 40, 24, 16, P.lgy, P.lav);               // rocky mound
    ellipse(g, CX, 36, 16, 9, P.dgy);                    // crater bowl
    ellipse(g, CX, 37, 12, 6, P.lav);                    // inner shadow
    ellipse(g, CX, 39, 8, 3.5, P.navy);                  // deep center
    for (const [x,y] of [[14,44],[49,46],[20,52]]) disc(g, x,y, 1.6, P.lav); // small rocks
    disc(g, 44,30, 1.4, P.crm); disc(g, 22,30, 1.4, P.crm); // rim highlights
    eyes(g, CX, 34, 5.5);
    smileArc(g, CX, 41, 2.4, 1);
    blush(g, 19,39); blush(g, 44,39);
  }});

S.push({ name: 'talon', draw(g) {
    stroke(g, [[42,24],[36,34],[26,43],[17,51],[13,59]], 6.5,1.2, P.org); // big curved claw
    stroke(g, [[41,26],[35,35],[26,43],[18,50]], 2.6,0.6, P.yel); // claw ridge highlight
    stroke(g, [[16,52],[12,59]], 2,0.6, P.brn);          // dark claw tip
    ball(g, 40, 21, 10, 9, P.org, P.brn);                // scaly knuckle base
    for (const y of [15,19]) rect(g, 32,y, 47,y+1, P.brn); // scales
    eyes(g, 40, 21, 5);
    smileArc(g, 40, 26, 2, 0.9);
    blush(g, 32,24); blush(g, 47,24);
  }});

S.push({ name: 'musician', draw(g) {
    ball(g, CX, 46, 11, 9, P.sky, P.lav);                // shirt
    ball(g, 21,49, 3,2.6, P.pch, P.brn); ball(g, 43,49, 3,2.6, P.pch, P.brn); // hands
    ball(g, 41,49, 7,5, P.brn, P.plum);                  // guitar body
    rect(g, 26,45, 42,48, P.brn);                        // guitar neck
    for (const x of [30,34,38]) g.set(x,46,P.crm);       // frets
    ball(g, CX, 27, 12, 11, P.pch, P.brn);               // head
    ellipse(g, CX, 17, 13, 6, P.brn);                    // hair
    disc(g, 17,22, 2.5, P.navy); rect(g, 19,12, 20,23, P.navy); // music note
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.6, 1.1);
    blush(g, 21,32); blush(g, 42,32);
  }});

S.push({ name: 'flare', draw(g) {
    for (let a = 0; a < 8; a++) { const th = a/8*Math.PI*2; stroke(g, [[CX,16],[CX+Math.cos(th)*10,16+Math.sin(th)*10]], 1.4,0.6, P.yel); } // star burst rays
    disc(g, CX, 16, 6, P.org); disc(g, CX, 16, 4, P.yel); // bright flare star
    disc(g, 30,14, 1.4, P.crm);                          // spark glint
    rrect(g, 27,32, 37,56, 3, P.dgy);                    // handle tube
    rect(g, 29,32, 31,56, P.lgy);                        // shine
    rrect(g, 28,26, 36,33, 1, P.org);                    // igniter tip
    eyes(g, CX, 44, 5);
    smileArc(g, CX, 49, 2.2, 1);
    blush(g, 25,47); blush(g, 39,47);
  }});

S.push({ name: 'gavel', draw(g) {
    rrect(g, 12,42, 52,50, 3, P.brn);                    // sound block
    rect(g, 12,42, 52,45, P.org);                        // block highlight
    stroke(g, [[36,38],[52,20]], 2.4,2.4, P.brn);        // handle
    rrect(g, 16,14, 40,30, 4, P.brn);                    // mallet head
    rect(g, 16,14, 40,18, P.org);                        // head highlight
    rect(g, 20,20, 24,26, P.plum); rect(g, 32,20, 36,26, P.plum); // head bands
    eyes(g, 28, 22, 5);
    smileArc(g, 28, 27, 2.2, 1);
    blush(g, 21,25); blush(g, 35,25);
  }});

S.push({ name: 'gardener', draw(g) {
    ball(g, CX, 48, 11, 9, P.grn, P.plum);               // overalls
    rect(g, 28,42, 35,55, P.lim);                        // bib
    ball(g, 21,50, 3,2.6, P.pch, P.brn); ball(g, 43,50, 3,2.6, P.pch, P.brn); // hands
    rrect(g, 42,48, 49,54, 1, P.brn); tri(g, 42,49, 49,49, 45,40, P.lim); disc(g, 45,39, 2, P.red); // potted flower
    ball(g, CX, 27, 12, 11, P.pch, P.brn);               // head
    ellipse(g, CX, 18, 17, 4, P.yel);                    // straw hat brim
    ball(g, CX, 15, 9, 4, P.yel, P.org);                 // hat crown
    rect(g, 23,15, 40,17, P.brn);                        // hat band
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.6, 1.1);
    blush(g, 21,32); blush(g, 42,32);
  }});

S.push({ name: 'puddle', draw(g) {
    ball(g, 12, 18, 2, 2.6, P.sky, P.lav);                // splash droplets
    ball(g, 52, 16, 2, 2.6, P.sky, P.lav);
    ellipse(g, CX, 44, 22, 10, P.lav);                    // puddle rim
    ellipse(g, CX, 42, 21, 9, P.sky);                     // water
    ellipse(g, 20, 38, 5, 2, P.crm);                      // ripple shine
    ellipse(g, CX, 44, 12, 3.5, P.lav);                   // inner ripple
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 46, 2.8, 1.2);
    blush(g, CX - 12, 44); blush(g, CX + 12, 44);
  }});

S.push({ name: 'twig', draw(g) {
    ball(g, CX, 40, 5, 16, P.brn, P.plum);                // main stem
    stroke(g, [[CX, 30], [20, 20], [15, 12]], 3.5, 2, P.brn); // left fork
    stroke(g, [[CX, 28], [44, 18], [49, 10]], 3.5, 2, P.brn); // right fork
    ellipse(g, 14, 10, 5, 3, P.lim);                      // leaves
    ellipse(g, 50, 9, 5, 3, P.lim);
    disc(g, 24, 24, 1, P.plum);                           // knot
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.6, 1.1);
    blush(g, CX - 8, 46); blush(g, CX + 8, 46);
  }});

S.push({ name: 'blueprint', draw(g) {
    ellipse(g, 11, 33, 4, 13, P.lav);                     // roll ends
    ellipse(g, 53, 33, 4, 13, P.lav);
    rrect(g, 12, 18, 52, 48, 2, P.sky);                   // sheet
    clipTo(g, [P.sky], function () {                      // grid
      rect(g, 22, 18, 22, 48, P.lav); rect(g, 32, 18, 32, 48, P.lav); rect(g, 42, 18, 42, 48, P.lav);
      rect(g, 12, 30, 52, 30, P.lav); rect(g, 12, 40, 52, 40, P.lav);
    });
    rect(g, 26, 26, 38, 32, P.crm);                       // white house body
    tri(g, 24, 26, 40, 26, 32, 20, P.crm);                // roof
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 45, 2.4, 1);
    blush(g, CX - 11, 43); blush(g, CX + 11, 43);
  }});

S.push({ name: 'taillight', draw(g) {
    rrect(g, 10, 16, 54, 48, 6, P.lgy);                   // chrome housing
    rrect(g, 14, 20, 50, 44, 5, P.plum);                  // lens shadow
    rrect(g, 14, 20, 48, 42, 5, P.red);                   // red lens
    rect(g, 18, 23, 20, 39, P.pnk);                       // lens shine
    disc(g, 44, 24, 3, P.org);                            // amber blinker
    eyes(g, CX, 30, 7);
    smileArc(g, CX, 36, 2.8, 1.2);
    blush(g, CX - 12, 34); blush(g, CX + 12, 34);
  }});

S.push({ name: 'florist', draw(g) {
    ball(g, CX, 49, 11, 8, P.lim, P.grn);                 // apron
    rect(g, 27, 42, 36, 45, P.crm);                       // apron bib
    ball(g, 26, 59, 3.6, 2.4, P.dgy); ball(g, 37, 59, 3.6, 2.4, P.dgy); // shoes
    ball(g, 44, 48, 3.2, 2.8, P.pch, P.brn);              // right hand
    stroke(g, [[16, 50], [15, 38]], 1.4, 1, P.grn);       // bouquet stems
    stroke(g, [[20, 50], [20, 37]], 1.4, 1, P.grn);
    stroke(g, [[24, 50], [25, 38]], 1.4, 1, P.grn);
    disc(g, 15, 37, 3, P.pnk); disc(g, 15, 37, 1.3, P.crm);
    disc(g, 20, 35, 3, P.red); disc(g, 20, 35, 1.3, P.yel);
    disc(g, 26, 37, 3, P.yel); disc(g, 26, 37, 1.3, P.org);
    ball(g, 19, 49, 3.2, 2.8, P.pch, P.brn);              // left hand
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 15, 13, 6, P.brn);                     // hair
    eyes(g, CX, 27, 7);
    smileArc(g, CX, 34, 2.6, 1.1);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'accountant', draw(g) {
    ball(g, CX, 49, 11, 8, P.lav, P.plum);                // suit
    rect(g, 28, 42, 35, 55, P.crm);                       // shirt
    rect(g, 30, 42, 33, 49, P.red);                       // tie
    ball(g, 26, 59, 3.6, 2.4, P.dgy); ball(g, 37, 59, 3.6, 2.4, P.dgy);
    rrect(g, 15, 46, 30, 56, 2, P.brn);                   // abacus frame
    rect(g, 17, 49, 28, 49, P.dgy); rect(g, 17, 53, 28, 53, P.dgy);
    disc(g, 20, 49, 1.2, P.red); disc(g, 24, 49, 1.2, P.yel);
    disc(g, 22, 53, 1.2, P.sky); disc(g, 26, 53, 1.2, P.lim);
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 15, 13, 5, P.dgy);                     // hair
    disc(g, CX - 6, 27, 4, P.navy); disc(g, CX - 6, 27, 2.6, P.pch); // glasses
    disc(g, CX + 6, 27, 4, P.navy); disc(g, CX + 6, 27, 2.6, P.pch);
    rect(g, CX - 2, 26, CX + 2, 27, P.navy);              // bridge
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 34, 2.4, 1);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'chauffeur', draw(g) {
    ball(g, CX, 48, 11, 8, P.dgy, P.dgy);                 // dark suit
    rect(g, 28, 41, 35, 54, P.lgy);                       // shirt
    rect(g, 30, 41, 33, 49, P.sky);                       // tie
    ball(g, 26, 59, 3.6, 2.4, P.blk); ball(g, 37, 59, 3.6, 2.4, P.blk); // shoes
    disc(g, CX, 49, 7, P.navy); disc(g, CX, 49, 4, P.dgy); // steering wheel
    ball(g, 20, 49, 3, 2.6, P.crm);                       // gloved hands
    ball(g, 43, 49, 3, 2.6, P.crm);
    ball(g, CX, 27, 12, 11, P.pch, P.brn);                // head
    rrect(g, 19, 11, 44, 19, 3, P.dgy);                   // cap crown
    rect(g, 18, 19, 46, 21, P.blk);                       // brim band
    rect(g, 15, 21, 48, 23, P.dgy);                       // peak visor
    disc(g, 31.5, 15, 1.6, P.yel);                        // cap emblem
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.4, 1);
    blush(g, CX - 9, 32); blush(g, CX + 9, 32);
  }});

S.push({ name: 'flask', draw(g) {
    rect(g, 28, 10, 35, 30, P.lgy);                       // long neck
    rect(g, 27, 8, 36, 11, P.lgy);                        // lip
    tri(g, 31.5, 24, 14, 54, 49, 54, P.lav);              // cone body shadow
    tri(g, 31.5, 24, 16, 53, 47, 53, P.lgy);              // glass body
    tri(g, 22, 42, 41, 42, 31.5, 34, P.lim);              // liquid meniscus
    rect(g, 18, 42, 45, 52, P.lim);                       // liquid
    rrect(g, 16, 52, 47, 54, 1, P.grn);                   // base
    disc(g, 24, 30, 2, P.crm);                            // shine
    eyes(g, CX, 46, 6);
    smileArc(g, CX, 51, 2.4, 1);
    blush(g, 22, 49); blush(g, 41, 49);
  }});

S.push({ name: 'editor', draw(g) {
    ball(g, CX, 49, 11, 8, P.sky, P.lav);                 // shirt
    ball(g, 26, 59, 3.6, 2.4, P.dgy); ball(g, 37, 59, 3.6, 2.4, P.dgy);
    rrect(g, 13, 42, 26, 56, 1, P.crm);                   // manuscript page
    rect(g, 15, 45, 24, 45, P.lgy); rect(g, 15, 48, 24, 48, P.lgy); rect(g, 15, 51, 24, 51, P.lgy);
    rect(g, 16, 45, 20, 45, P.red);                       // red edit mark
    ball(g, 22, 47, 3, 2.6, P.pch, P.brn);                // left hand
    stroke(g, [[31, 53], [46, 40]], 2.4, 2.4, P.yel);     // pencil body
    rect(g, 30, 52, 33, 54, P.pnk);                       // eraser
    tri(g, 44, 38, 50, 36, 47, 44, P.pch);                // wood tip
    disc(g, 49, 37, 1.2, P.dgy);                          // graphite
    ball(g, 45, 44, 3, 2.6, P.pch, P.brn);                // right hand
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 15, 13, 5, P.brn);                     // hair
    disc(g, CX - 6, 27, 4, P.navy); disc(g, CX - 6, 27, 2.6, P.pch); // glasses
    disc(g, CX + 6, 27, 4, P.navy); disc(g, CX + 6, 27, 2.6, P.pch);
    rect(g, CX - 2, 26, CX + 2, 27, P.navy);
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 34, 2.4, 1);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'pawnshop', draw(g) {
    rrect(g, 10, 20, 54, 56, 2, P.brn);                   // building shadow
    rrect(g, 10, 20, 52, 54, 2, P.org);                   // facade
    tri(g, 6, 20, 58, 20, 32, 9, P.red);                  // roof
    disc(g, 25, 15, 3, P.yel); disc(g, 31.5, 15, 3, P.yel); disc(g, 38, 15, 3, P.yel); // pawn balls
    rect(g, 13, 26, 21, 34, P.sky); rect(g, 43, 26, 51, 34, P.sky); // windows
    rect(g, 24, 42, 40, 54, P.dgy);                       // door
    rect(g, 31, 42, 33, 54, P.lgy);                       // door split
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.1);
    blush(g, CX - 13, 34); blush(g, CX + 13, 34);
  }});

S.push({ name: 'banister', draw(g) {
    rrect(g, 8, 16, 56, 24, 3, P.brn);                    // handrail shadow
    rect(g, 8, 16, 56, 22, P.org);                        // rail lit
    for (let x = 28; x <= 48; x += 9) { rect(g, x, 24, x + 2, 50, P.brn); rect(g, x, 24, x + 1, 50, P.org); } // balusters
    rect(g, 6, 50, 56, 56, P.brn);                        // bottom rail
    rrect(g, 10, 30, 24, 56, 3, P.brn);                   // newel post shadow
    rrect(g, 10, 30, 22, 54, 3, P.org);                   // newel post
    ball(g, 16, 26, 4, 3, P.brn, P.plum);                 // ball cap
    eyes(g, 16, 40, 5);
    smileArc(g, 16, 46, 2.2, 1);
    blush(g, 10, 44); blush(g, 22, 44);
  }});

S.push({ name: 'prisoner', draw(g) {              // kid-safe: friendly striped costume
    ball(g, CX, 49, 11, 8, P.lgy, P.lav);                 // striped shirt
    clipTo(g, [P.lgy, P.lav], function () {
      rect(g, 20, 43, 43, 45, P.navy); rect(g, 20, 48, 43, 50, P.navy); rect(g, 20, 53, 43, 55, P.navy);
    });
    ball(g, 26, 59, 3.6, 2.4, P.dgy); ball(g, 37, 59, 3.6, 2.4, P.dgy);
    ball(g, 20, 48, 3.2, 2.8, P.pch, P.brn); ball(g, 43, 48, 3.2, 2.8, P.pch, P.brn); // hands
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                // head
    rrect(g, 19, 8, 44, 18, 3, P.lgy);                    // striped cap
    clipTo(g, [P.lgy], function () { rect(g, 19, 11, 44, 13, P.navy); rect(g, 19, 15, 44, 17, P.navy); });
    rect(g, 17, 18, 46, 20, P.lgy);                       // cap brim
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 34, 2.6, 1.1);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'beanbag', draw(g) {
    ball(g, CX, 40, 22, 18, P.pnk, P.plum);               // squishy bag
    ellipse(g, CX, 30, 14, 5, P.plum);                    // sitting dent
    ellipse(g, 20, 30, 4, 6, P.pch);                      // highlight
    stroke(g, [[CX, 22], [CX, 56]], 0.8, 0.8, P.plum);    // seams
    stroke(g, [[12, 42], [52, 42]], 0.8, 0.8, P.plum);
    disc(g, CX, 22, 2, P.plum);                           // top button
    eyes(g, CX, 42, 7);
    smileArc(g, CX, 48, 2.8, 1.2);
    blush(g, CX - 13, 46); blush(g, CX + 13, 46);
  }});

S.push({ name: 'warden', draw(g) {                // kid-safe: friendly officer with keys
    ball(g, CX, 49, 11, 8, P.lav, P.plum);                // uniform
    rect(g, 28, 42, 35, 55, P.lav);                       // shirt front
    disc(g, 31, 46, 1.2, P.yel); disc(g, 31, 50, 1.2, P.yel); // buttons
    disc(g, 24, 46, 2, P.yel);                            // badge
    ball(g, 26, 59, 3.6, 2.4, P.blk); ball(g, 37, 59, 3.6, 2.4, P.blk); // boots
    ball(g, 19, 49, 3.2, 2.8, P.pch, P.brn);              // hand
    ball(g, 44, 49, 3.2, 2.8, P.pch, P.brn);              // hand
    disc(g, 49, 53, 4, P.org); disc(g, 49, 53, 2, null);  // key ring
    rect(g, 51, 52, 55, 54, P.yel);                       // key
    ball(g, CX, 26, 12, 11, P.pch, P.brn);                // head
    rrect(g, 19, 9, 44, 17, 3, P.lav);                    // cap crown
    rect(g, 20, 12, 43, 14, P.plum);                      // band
    disc(g, 31.5, 13, 2, P.yel);                          // cap badge
    rect(g, 16, 17, 47, 19, P.dgy);                       // peak
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.4, 1);
    blush(g, CX - 9, 31); blush(g, CX + 9, 31);
  }});

S.push({ name: 'spy', draw(g) {
    ball(g, CX, 49, 11, 8, P.brn, P.plum);                // trenchcoat
    rect(g, 30, 42, 33, 56, P.plum);                      // coat seam
    tri(g, 22, 42, 28, 42, 25, 48, P.brn);                // collar
    tri(g, 41, 42, 35, 42, 38, 48, P.brn);
    ball(g, 26, 59, 3.6, 2.4, P.dgy); ball(g, 37, 59, 3.6, 2.4, P.dgy);
    ball(g, 19, 50, 3.2, 2.8, P.pch, P.brn);              // hand
    disc(g, 47, 46, 6, P.yel); disc(g, 47, 46, 4, P.sky); // magnifying glass
    stroke(g, [[50, 51], [55, 57]], 2, 1.6, P.brn);       // glass handle
    ball(g, CX, 26, 12, 11, P.pch, P.brn);                // head
    ellipse(g, CX, 16, 15, 3, P.dgy);                     // fedora brim
    rrect(g, 22, 6, 41, 15, 3, P.dgy);                    // crown
    rect(g, 22, 12, 41, 14, P.navy);                      // band
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.4, 1);
    blush(g, CX - 9, 31); blush(g, CX + 9, 31);
  }});

S.push({ name: 'tarantula', draw(g) {             // friendly fuzzy spider
    stroke(g, [[22, 40], [10, 30], [6, 22]], 2, 1.2, P.brn); // left legs
    stroke(g, [[22, 44], [8, 40], [3, 34]], 2, 1.2, P.brn);
    stroke(g, [[22, 48], [8, 48], [4, 44]], 2, 1.2, P.brn);
    stroke(g, [[24, 52], [12, 56], [8, 58]], 2, 1.2, P.brn);
    stroke(g, [[41, 40], [54, 30], [58, 22]], 2, 1.2, P.brn); // right legs
    stroke(g, [[41, 44], [56, 40], [61, 34]], 2, 1.2, P.brn);
    stroke(g, [[41, 48], [56, 48], [60, 44]], 2, 1.2, P.brn);
    stroke(g, [[39, 52], [52, 56], [56, 58]], 2, 1.2, P.brn);
    ball(g, CX, 46, 11, 10, P.brn, P.plum);               // abdomen
    disc(g, 24, 44, 2, P.plum); disc(g, 39, 48, 2, P.plum); disc(g, 30, 52, 2, P.plum); // fuzz
    ball(g, CX, 34, 9, 8, P.brn, P.plum);                 // head
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 39, 2.4, 1);
    blush(g, CX - 8, 37); blush(g, CX + 8, 37);
  }});

S.push({ name: 'trolley', draw(g) {
    stroke(g, [[10, 30], [10, 12]], 2, 2, P.lgy);         // handle post
    rect(g, 7, 10, 20, 13, P.red);                        // handle bar
    tri(g, 14, 22, 52, 22, 46, 46, P.lav);                // basket back shade
    rrect(g, 14, 22, 50, 46, 2, P.lgy);                   // basket body
    clipTo(g, [P.lgy], function () {                      // wire grid
      rect(g, 22, 22, 22, 46, P.lav); rect(g, 30, 22, 30, 46, P.lav); rect(g, 38, 22, 38, 46, P.lav);
      rect(g, 14, 30, 50, 30, P.lav); rect(g, 14, 38, 50, 38, P.lav);
    });
    disc(g, 22, 52, 4, P.navy); disc(g, 22, 52, 2, P.lgy); // wheels
    disc(g, 44, 52, 4, P.navy); disc(g, 44, 52, 2, P.lgy);
    eyes(g, 32, 32, 6);
    smileArc(g, 32, 38, 2.4, 1);
    blush(g, 25, 36); blush(g, 39, 36);
  }});

S.push({ name: 'pianist', draw(g) {
    rrect(g, 6, 46, 58, 58, 2, P.crm);                    // white keys board
    for (let x = 12; x <= 54; x += 6) rect(g, x, 46, x, 58, P.dgy); // key lines
    for (let x = 14; x <= 48; x += 6) rect(g, x, 46, x + 2, 52, P.navy); // black keys
    ball(g, CX, 40, 11, 8, P.plum, P.plum);               // dress torso
    stroke(g, [[24, 40], [18, 45]], 2.4, 2, P.plum);      // arms
    stroke(g, [[39, 40], [45, 45]], 2.4, 2, P.plum);
    ball(g, 18, 46, 3.2, 2.6, P.pch, P.brn);              // hands on keys
    ball(g, 45, 46, 3.2, 2.6, P.pch, P.brn);
    ball(g, CX, 22, 12, 11, P.pch, P.brn);                // head
    ellipse(g, CX, 12, 12, 5, P.dgy);                     // hair
    ball(g, CX, 8, 3, 2.6, P.dgy);                        // bun
    eyes(g, CX, 23, 7);
    smileArc(g, CX, 29, 2.4, 1);
    blush(g, CX - 9, 27); blush(g, CX + 9, 27);
  }});

S.push({ name: 'pager', draw(g) {
    rrect(g, 14, 12, 50, 54, 5, P.dgy);                   // body shadow
    rrect(g, 14, 12, 48, 52, 5, P.lav);                   // body
    rrect(g, 17, 18, 45, 40, 2, P.grn);                   // screen shadow
    rrect(g, 17, 17, 45, 38, 2, P.lim);                   // LCD screen
    disc(g, 22, 46, 2.5, P.red); disc(g, 31, 46, 2.5, P.sky); disc(g, 40, 46, 2.5, P.yel); // buttons
    rect(g, 48, 20, 53, 40, P.dgy);                       // belt clip
    eyes(g, 31, 26, 6);
    smileArc(g, 31, 32, 2.6, 1.1);
    blush(g, 21, 30); blush(g, 41, 30);
  }});

S.push({ name: 'mailman', draw(g) {
    ball(g, CX, 49, 11, 8, P.sky, P.lav);                 // uniform
    rect(g, 28, 42, 35, 55, P.lav);                       // shirt front
    ball(g, 26, 59, 3.6, 2.4, P.dgy); ball(g, 37, 59, 3.6, 2.4, P.dgy);
    stroke(g, [[24, 40], [44, 52]], 1, 1, P.brn);         // bag strap
    rrect(g, 38, 46, 52, 58, 2, P.brn);                   // mailbag
    rect(g, 38, 50, 52, 52, P.plum);                      // flap
    ball(g, 18, 48, 3.2, 2.8, P.pch, P.brn);              // hand
    rrect(g, 9, 44, 22, 52, 1, P.crm);                    // envelope
    tri(g, 9, 44, 22, 44, 15.5, 49, P.lgy);               // envelope flap
    ball(g, CX, 26, 12, 11, P.pch, P.brn);                // head
    rrect(g, 20, 10, 43, 18, 3, P.sky);                   // cap crown
    rect(g, 21, 13, 42, 15, P.navy);                      // band
    rect(g, 17, 18, 46, 20, P.lav);                       // peak
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.4, 1);
    blush(g, CX - 9, 31); blush(g, CX + 9, 31);
  }});

S.push({ name: 'kiwi', draw(g) {
    ball(g, CX, 33, 20, 20, P.brn, P.brn);                // fuzzy skin
    disc(g, CX, 33, 17, P.grn);                           // flesh shadow
    disc(g, CX - 1, 32, 16, P.lim);                       // lit flesh
    for (let a = 0; a < 14; a++) { const th = a / 14 * Math.PI * 2; disc(g, CX + Math.cos(th) * 11, 32 + Math.sin(th) * 11, 0.9, P.navy); } // seeds
    disc(g, CX, 30, 3, P.crm);                            // pale core
    eyes(g, CX, 31, 7);
    smileArc(g, CX, 38, 2.6, 1.1);
    blush(g, CX - 12, 36); blush(g, CX + 12, 36);
  }});

S.push({ name: 'snowboard', draw(g) {
    rrect(g, 22, 6, 42, 58, 9, P.plum);                   // board edge
    rrect(g, 22, 6, 40, 56, 9, P.red);                    // deck
    rect(g, 25, 10, 27, 52, P.pnk);                       // shine stripe
    clipTo(g, [P.red], function () {                      // graphic
      tri(g, 22, 26, 40, 32, 40, 22, P.yel);
      tri(g, 22, 38, 40, 44, 40, 34, P.sky);
    });
    rrect(g, 26, 20, 38, 26, 2, P.dgy);                   // bindings
    rrect(g, 26, 42, 38, 48, 2, P.dgy);
    ellipse(g, CX, 60, 18, 3, P.crm);                     // snow
    disc(g, 14, 54, 2, P.crm); disc(g, 50, 55, 2, P.crm); // flakes
    eyes(g, 31, 13, 5);
    smileArc(g, 31, 17, 2.2, 1);
    blush(g, 24, 15); blush(g, 38, 15);
  }});

S.push({ name: 'sewer', draw(g) {
    rrect(g, 20, 34, 56, 52, 5, P.dgy);                   // horizontal pipe shadow
    rrect(g, 20, 33, 54, 50, 5, P.lgy);                   // horizontal pipe
    ellipse(g, 21, 42, 4, 8, P.navy);                     // dark bore
    ellipse(g, 22, 42, 2.5, 5.5, P.plum);
    rrect(g, 22, 10, 42, 40, 5, P.dgy);                   // inlet shadow
    rrect(g, 22, 8, 40, 38, 5, P.lgy);                    // vertical inlet
    rect(g, 26, 12, 28, 34, P.crm);                       // shine
    ball(g, 12, 52, 2.4, 3, P.sky, P.lav);                // water drip
    ball(g, 8, 44, 1.8, 2.2, P.sky, P.lav);
    eyes(g, 35, 42, 5);
    smileArc(g, 35, 47, 2.2, 1);
    blush(g, 29, 45); blush(g, 43, 45);
  }});

S.push({ name: 'motorboat', draw(g) {
    ellipse(g, CX, 54, 30, 6, P.sky);                     // water
    ellipse(g, 12, 52, 4, 1.6, P.crm); ellipse(g, 52, 53, 4, 1.6, P.crm); // foam
    rrect(g, 6, 36, 52, 48, 4, P.plum);                   // hull shadow
    rrect(g, 6, 35, 50, 46, 4, P.red);                    // hull
    tri(g, 46, 35, 58, 35, 50, 47, P.plum);               // pointed bow
    rect(g, 8, 41, 50, 43, P.crm);                        // hull stripe
    rrect(g, 14, 24, 34, 36, 3, P.sky);                   // windshield
    rect(g, 16, 26, 32, 28, P.crm);                       // glass shine
    rect(g, 4, 28, 9, 40, P.dgy);                         // outboard motor
    disc(g, 6, 40, 2, P.navy);                            // prop
    eyes(g, 40, 40, 5);
    smileArc(g, 40, 45, 2.2, 1);
    blush(g, 34, 43); blush(g, 46, 43);
  }});

S.push({ name: 'scarecrow', draw(g) {             // friendly, not spooky
    rect(g, 8, 40, 56, 43, P.brn);                        // cross pole
    stroke(g, [[10, 41], [5, 36]], 1, 0.6, P.yel);        // straw hands
    stroke(g, [[12, 41], [8, 34]], 1, 0.6, P.yel);
    stroke(g, [[54, 41], [59, 36]], 1, 0.6, P.yel);
    stroke(g, [[52, 41], [56, 34]], 1, 0.6, P.yel);
    ball(g, CX, 47, 11, 9, P.brn, P.plum);                // burlap shirt
    rect(g, 24, 45, 27, 53, P.red);                       // patch
    ball(g, CX, 24, 12, 11, P.crm, P.lgy);                // burlap sack head
    stroke(g, [[18, 15], [16, 9]], 1, 0.6, P.yel);        // straw fringe
    stroke(g, [[25, 14], [24, 8]], 1, 0.6, P.yel);
    stroke(g, [[38, 14], [39, 8]], 1, 0.6, P.yel);
    stroke(g, [[45, 15], [47, 9]], 1, 0.6, P.yel);
    tri(g, 16, 16, 47, 16, 31.5, 2, P.org);               // pointed hat
    ellipse(g, CX, 16, 16, 3, P.brn);                     // hat brim
    rect(g, 22, 11, 41, 13, P.brn);                       // hat band
    eyes(g, CX, 25, 6);
    smileArc(g, CX, 31, 2.4, 1);
    blush(g, CX - 10, 29); blush(g, CX + 10, 29);
  }});

S.push({ name: 'governor', draw(g) {
    ball(g, CX, 49, 11, 8, P.dgy, P.dgy);                 // formal suit
    rect(g, 28, 42, 35, 56, P.crm);                       // shirt front
    clipTo(g, [P.dgy, P.crm], function () {               // sash
      stroke(g, [[24, 41], [40, 57]], 3, 3, P.red);
    });
    disc(g, 24, 50, 2.5, P.yel); disc(g, 24, 50, 1.2, P.org); // medal
    ball(g, 26, 59, 3.6, 2.4, P.blk); ball(g, 37, 59, 3.6, 2.4, P.blk); // shoes
    ball(g, 20, 49, 3.2, 2.8, P.pch, P.brn); ball(g, 43, 49, 3.2, 2.8, P.pch, P.brn); // hands
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 15, 13, 5, P.lgy);                     // grey hair
    eyes(g, CX, 27, 7);
    smileArc(g, CX, 34, 2.6, 1.1);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'armchair', draw(g) {
    rrect(g, 10, 16, 54, 50, 6, P.plum);                  // backrest shadow
    rrect(g, 12, 14, 52, 46, 6, P.red);                   // backrest
    rrect(g, 8, 34, 20, 54, 5, P.plum);                   // left arm shadow
    rrect(g, 8, 32, 20, 52, 5, P.red);                    // left arm
    rrect(g, 44, 34, 56, 54, 5, P.plum);                  // right arm shadow
    rrect(g, 44, 32, 56, 52, 5, P.red);                   // right arm
    rrect(g, 18, 40, 46, 54, 4, P.pnk);                   // seat cushion
    rect(g, 20, 43, 44, 44, P.plum);                      // cushion seam
    ellipse(g, CX, 57, 18, 3, P.plum);                    // base shadow
    eyes(g, CX, 26, 7);
    smileArc(g, CX, 33, 2.8, 1.2);
    blush(g, CX - 13, 31); blush(g, CX + 13, 31);
  }});

S.push({ name: 'headband', draw(g) {
    ball(g, CX, 34, 18, 17, P.pch, P.brn);                // round head
    rect(g, 14, 18, 49, 26, P.red);                       // band shadow
    rect(g, 14, 17, 49, 24, P.pnk);                       // band
    clipTo(g, [P.pnk], function () { rect(g, 14, 20, 49, 21, P.crm); }); // sporty stripe
    ball(g, 13, 26, 3, 5, P.red, P.plum);                 // side wraps
    ball(g, 50, 26, 3, 5, P.red, P.plum);
    tri(g, 44, 14, 50, 10, 50, 18, P.pnk);                // bow knot
    tri(g, 50, 14, 44, 10, 44, 18, P.pnk);
    disc(g, 47, 14, 1.4, P.red);
    eyes(g, CX, 36, 7);
    smileArc(g, CX, 43, 2.6, 1.1);
    blush(g, CX - 12, 41); blush(g, CX + 12, 41);
  }});

S.push({ name: 'lawnmower', draw(g) {          // 剪草機 zin2 cou2 gei1
    stroke(g, [[42,50],[52,20]], 1.6,1.2, P.dgy);       // handle bar
    stroke(g, [[45,50],[55,20]], 1.6,1.2, P.dgy);
    rect(g, 49,17,57,21, P.dgy);                        // grip
    disc(g, 20,52, 6, P.navy); disc(g, 20,52, 2.4, P.lgy); // rear wheel
    disc(g, 42,52, 6, P.navy); disc(g, 42,52, 2.4, P.lgy); // front wheel
    rrect(g, 12,34,46,52, 3, P.plum);                   // deck shadow
    rrect(g, 12,34,44,50, 3, P.red);                    // deck
    rrect(g, 24,24,42,36, 2, P.org);                    // engine block
    disc(g, 33,26, 2, P.yel);                           // fuel cap
    ellipse(g, 14,54, 5,2, P.lim); ellipse(g, 46,55, 5,2, P.lim); // grass clippings
    eyes(g, 26,42, 5);
    smileArc(g, 26,47, 2.4,1.1);
    blush(g, 19,45); blush(g, 34,45);
  }});

S.push({ name: 'airship', draw(g) {            // 飛艇 fei1 teng5
    tri(g, 48,26, 58,20, 58,32, P.lav);                 // tail fin
    tri(g, 48,26, 56,32, 50,34, P.sky);
    ball(g, CX, 26, 24, 13, P.sky, P.lav, P.crm);       // envelope
    ellipse(g, 12,26, 3,4, P.lav);                      // nose cap
    stroke(g, [[26,38],[26,42]], 0.8,0.8, P.dgy); stroke(g, [[38,38],[38,42]], 0.8,0.8, P.dgy); // rigging
    rrect(g, 24,42,41,50, 2, P.org);                    // gondola
    rect(g, 27,44,31,47, P.crm); rect(g, 34,44,38,47, P.crm); // windows
    eyes(g, CX, 24, 7);
    smileArc(g, CX, 31, 2.8,1.2);
    blush(g, CX-13, 29); blush(g, CX+13, 29);
  }});

S.push({ name: 'farmhouse', draw(g) {          // 農舍 nung4 se3
    rrect(g, 40,20,52,56, 1, P.lgy);                    // silo shadow
    rrect(g, 40,20,50,56, 1, P.crm);                    // silo body
    ellipse(g, 45,20, 5,3, P.red);                      // silo dome
    tri(g, 6,32, 40,32, 23,14, P.plum);                 // roof shadow
    tri(g, 6,32, 38,32, 22,15, P.red);                  // roof
    rrect(g, 10,32,38,56, 1, P.lgy);                    // wall shadow
    rrect(g, 10,32,36,56, 1, P.crm);                    // wall
    rrect(g, 18,44,28,56, 1, P.brn);                    // door
    rect(g, 13,36,18,41, P.sky);                        // window
    eyes(g, 24,40, 5);
    smileArc(g, 24,44, 2.2,1);
    blush(g, 17,43); blush(g, 31,43);
  }});

S.push({ name: 'toolbox', draw(g) {            // 工具箱 gung1 geoi6 soeng1
    rrect(g, 18,16,46,26, 4, P.dgy);                    // carry handle
    rrect(g, 22,20,42,27, 3, null);                     // handle opening
    rrect(g, 10,28,54,56, 3, P.brn);                    // box shadow
    rrect(g, 10,28,52,54, 3, P.red);                    // box body
    rect(g, 10,28,52,32, P.plum);                       // lid seam
    rrect(g, 41,37,49,45, 1, P.yel);                    // latch
    eyes(g, 26,41, 6);
    smileArc(g, 26,47, 2.6,1.1);
    blush(g, 18,45); blush(g, 34,45);
  }});

S.push({ name: 'auditorium', draw(g) {         // 音樂廳 jam1 ngok6 teng1
    tri(g, 6,26, 58,26, CX,10, P.plum);                 // pediment shadow
    tri(g, 8,26, 56,26, CX,12, P.red);                  // pediment
    rect(g, 8,26,56,30, P.yel);                         // entablature
    for (const x of [10,20,31,42,52]) { rect(g, x,30,x+4,50, P.crm); rect(g, x+3,30,x+4,50, P.lgy); } // columns
    rect(g, 6,50,58,56, P.lgy);                         // steps
    rect(g, 6,53,58,56, P.dgy);
    eyes(g, CX, 19, 5);
    smileArc(g, CX, 23, 2.2,1);
    blush(g, 22,22); blush(g, 41,22);
  }});

S.push({ name: 'sapphire', draw(g) {           // 藍寶石 laam4 bou2 sek6
    rect(g, 18,20,45,22, P.crm);                        // table
    tri(g, 16,22, 47,22, CX,54, P.sky);                 // gem body
    tri(g, 16,22, CX,22, CX,50, P.lav);                 // left facet shade
    tri(g, 22,22, 30,22, 26,40, P.crm);                 // sparkle facets
    tri(g, 34,22, 41,22, 37,40, P.crm);
    disc(g, 23,17, 1.6, P.crm); disc(g, 42,46, 1.4, P.crm); // sparkles
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 2.6,1.2);
    blush(g, 22,34); blush(g, 41,34);
  }});

S.push({ name: 'scrapbook', draw(g) {          // 剪貼簿 zin2 tip3 bou2
    rrect(g, 12,10,52,58, 2, P.plum);                   // cover shadow
    rrect(g, 14,10,52,56, 2, P.pnk);                    // cover
    rect(g, 14,10,20,56, P.plum);                       // spine
    rrect(g, 26,14,48,30, 1, P.crm);                    // taped photo
    ellipse(g, 37,22, 7,5, P.sky); disc(g, 33,26, 3, P.lim); // photo scene
    rect(g, 23,14,31,16, P.yel); rect(g, 43,28,49,30, P.yel); // tape corners
    disc(g, 24,46, 3, P.org);                           // sticker
    eyes(g, 36,40, 5);
    smileArc(g, 36,45, 2.4,1);
    blush(g, 29,43); blush(g, 44,43);
  }});

S.push({ name: 'silicon', draw(g) {            // 矽晶片 zik6 zing1 pin3
    for (const y of [22,30,38,46]) { rect(g, 8,y,16,y+3, P.lgy); rect(g, 48,y,56,y+3, P.lgy); } // pin legs
    rrect(g, 16,16,48,52, 3, P.navy);                   // chip shadow
    rrect(g, 16,16,46,50, 3, P.dgy);                    // chip body
    disc(g, 22,22, 2, P.lgy);                           // pin-1 dot
    clipTo(g, [P.dgy], function () { for (let x=24;x<=42;x+=6) for (let y=24;y<=44;y+=6) disc(g,x,y,1,P.lim); }); // traces
    eyes(g, 31,32, 6);
    smileArc(g, 31,38, 2.6,1.1);
    blush(g, 23,36); blush(g, 39,36);
  }});

S.push({ name: 'scientist', draw(g) {          // 科學家 fo1 hok6 gaa1
    ball(g, CX, 49, 10, 8, P.crm, P.lgy);               // lab coat
    ball(g, 26,57, 4,2.6, P.dgy, P.navy); ball(g, 37,57, 4,2.6, P.dgy, P.navy); // shoes
    ball(g, 20,48, 3.2,2.6, P.pch, P.brn); ball(g, 43,48, 3.2,2.6, P.pch, P.brn); // hands
    rrect(g, 40,42,49,52, 2, P.lim);                    // flask
    rect(g, 43,38,46,44, P.lgy);                        // flask neck
    rect(g, 31,42,32,54, P.sky);                        // coat placket
    ball(g, CX, 27, 13, 12, P.pch, P.brn);              // head
    ellipse(g, CX, 16, 13, 5, P.dgy);                   // hair
    rect(g, 22,28,42,30, P.lgy);                        // goggle strap
    disc(g, 26,29, 3, P.sky); disc(g, 37,29, 3, P.sky); // goggle lenses
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.8,1.1);
    blush(g, CX-11, 34); blush(g, CX+11, 34);
  }});

S.push({ name: 'oar', draw(g) {                // 槳 zoeng2
    stroke(g, [[26,52],[36,20]], 2.2,2.2, P.brn);       // shaft shadow
    stroke(g, [[27,52],[37,20]], 1.4,1.4, P.org);       // shaft
    ellipse(g, 40,14, 11, 9, P.brn);                    // blade shadow
    ellipse(g, 39,13, 9, 8, P.org);                     // blade
    ellipse(g, 37,11, 3, 2, P.yel);                     // blade sheen
    rrect(g, 22,50,32,56, 2, P.brn);                    // grip
    eyes(g, 39, 12, 5);
    smileArc(g, 39, 17, 2.4,1);
    blush(g, 33,15); blush(g, 45,15);
  }});

S.push({ name: 'piranha', draw(g) {            // 食人䱽 sik6 jan4 cong1
    tri(g, 8,20, 8,40, 22,30, P.grn);                   // tail fin back
    tri(g, 10,22, 10,38, 22,30, P.lim);                 // tail fin
    ball(g, 34,32, 18,15, P.lim, P.grn);                // round body
    ellipse(g, 36,40, 12,5, P.org);                     // orange belly
    tri(g, 30,17, 42,17, 36,9, P.grn);                  // dorsal fin
    ellipse(g, 34,44, 6,3, P.grn);                      // bottom fin
    ellipse(g, 40,40, 7,3, P.crm);                      // grin
    rect(g, 34,39,48,40, P.lim);                        // flatten grin top
    rect(g, 35,40,36,41, P.crm); rect(g, 40,41,41,42, P.crm); rect(g, 45,40,46,41, P.crm); // friendly teeth
    eyes(g, 40,30, 5);
    blush(g, 35,36); blush(g, 47,33);
  }});

S.push({ name: 'snowflake', draw(g) {          // 雪花 syut3 faa1
    for (let a=0;a<6;a++){ const th=a/6*Math.PI*2, ex=CX+Math.cos(th)*22, ey=32+Math.sin(th)*22;
      stroke(g, [[CX,32],[ex,ey]], 1.6,1.2, P.crm);     // six arms
      const mx=CX+Math.cos(th)*13, my=32+Math.sin(th)*13;
      stroke(g, [[mx,my],[mx+Math.cos(th+1)*5,my+Math.sin(th+1)*5]], 1,0.6, P.sky);
      stroke(g, [[mx,my],[mx+Math.cos(th-1)*5,my+Math.sin(th-1)*5]], 1,0.6, P.sky);
    }
    disc(g, CX, 32, 8, P.sky); disc(g, CX,32, 6, P.crm); // center
    eyes(g, CX, 31, 5);
    smileArc(g, CX, 36, 2.2,1);
    blush(g, 24,34); blush(g, 39,34);
  }});

S.push({ name: 'receipts', draw(g) {           // 單據 daan1 geoi3
    rect(g, 34,14,52,50, P.lgy);                        // second receipt behind
    rrect(g, 14,10,48,48, 1, P.lgy);                    // paper shadow
    rect(g, 14,10,46,46, P.crm);                        // paper
    for (let x=14;x<46;x+=4) tri(g, x,45, x+4,45, x+2,50, P.crm); // torn bottom
    for (const y of [32,37,42]) rect(g, 19,y,41,y+1, P.dgy); // item lines
    rect(g, 19,41,31,42, P.red);                        // total underline
    eyes(g, 30,20, 5);
    smileArc(g, 30,25, 2.2,1);
    blush(g, 23,23); blush(g, 37,23);
  }});

S.push({ name: 'monk', draw(g) {               // 僧人 zang1 jan4
    ball(g, CX, 50, 12, 10, P.org, P.brn);              // saffron robe
    tri(g, 20,58, 43,58, CX,44, P.org);                 // robe flare
    ball(g, 21,50, 3.2,2.6, P.pch, P.brn); ball(g, 42,50, 3.2,2.6, P.pch, P.brn); // hands
    rect(g, 22,42,41,46, P.yel);                        // sash
    ball(g, CX, 27, 13, 12, P.pch, P.brn);              // bald head
    ellipse(g, CX, 18, 10, 4, P.brn);                   // crown shade
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.8,1.2);
    blush(g, CX-11, 32); blush(g, CX+11, 32);
  }});

S.push({ name: 'extinguisher', draw(g) {       // 滅火筒 mit6 fo2 tung2
    rrect(g, 20,20,44,56, 8, P.plum);                   // tank shadow
    rrect(g, 20,20,42,54, 8, P.red);                    // tank body
    rect(g, 22,26,26,50, P.pnk);                        // sheen
    rrect(g, 26,12,38,22, 2, P.dgy);                    // valve head
    rrect(g, 24,10,40,14, 1, P.lgy);                    // handle lever
    stroke(g, [[38,16],[50,20],[50,34]], 1.4,1.2, P.blk); // hose
    ball(g, 50,35, 2.5,3, P.dgy, P.navy);               // nozzle
    rrect(g, 23,33,41,45, 1, P.crm);                    // label
    eyes(g, 31,37, 5);
    smileArc(g, 31,42, 2.2,1);
    blush(g, 24,40); blush(g, 39,40);
  }});

S.push({ name: 'townhouse', draw(g) {          // 排屋 paai4 uk1
    rrect(g, 8,22,24,56, 1, P.org);                     // left house
    tri(g, 6,22, 26,22, 16,12, P.brn);                  // left roof
    rrect(g, 24,18,40,56, 1, P.sky);                    // middle house (tall)
    tri(g, 22,18, 42,18, 32,8, P.lav);                  // middle roof
    rrect(g, 40,26,56,56, 1, P.pnk);                    // right house
    tri(g, 38,26, 58,26, 48,16, P.plum);                // right roof
    rect(g, 12,30,20,37, P.crm); rect(g, 44,34,52,41, P.crm); // side windows
    rrect(g, 28,44,36,56, 1, P.brn);                    // middle door
    eyes(g, 32,28, 5);
    smileArc(g, 32,33, 2.2,1);
    blush(g, 25,31); blush(g, 39,31);
  }});

S.push({ name: 'mongoose', draw(g) {           // 猸子 mei4 zi2
    stroke(g, [[44,50],[54,40],[55,26]], 3,1.4, P.brn); // long tail
    ball(g, CX, 46, 13, 9, P.brn, P.plum);              // body
    ellipse(g, CX, 47, 7,5, P.pch);                     // belly
    ball(g, 24,55, 3,2.4, P.brn, P.plum); ball(g, 39,55, 3,2.4, P.brn, P.plum); // feet
    ball(g, 24, 26, 11, 10, P.brn, P.plum);             // head
    disc(g, 17,17, 3.5, P.brn); disc(g, 30,16, 3.5, P.brn); // ears
    disc(g, 17,17, 1.8, P.pch); disc(g, 30,16, 1.8, P.pch);
    ball(g, 14, 31, 5, 3.5, P.pch, P.brn);              // pointed snout
    ellipse(g, 11,30, 1.6,1.2, P.navy);                 // nose
    eyes(g, 24, 26, 6);
    smileArc(g, 20, 32, 2,1);
    blush(g, 20,32); blush(g, 32,30);
  }});

S.push({ name: 'tinfoil', draw(g) {            // 錫箔 sek3 bok6
    ellipse(g, CX, 20, 22, 7, P.lav);                   // sheet shadow
    for (let x=12;x<52;x+=4) tri(g, x,14, x+4,14, x+2,18, P.lgy); // torn top edge
    rect(g, 10,18,54,24, P.lgy);                        // shiny sheet
    ellipse(g, 22,20, 3,2, P.crm); ellipse(g, 40,21, 3,2, P.crm); // sheen
    rrect(g, 10,24,54,54, 3, P.plum);                   // box shadow
    rrect(g, 10,24,52,52, 3, P.sky);                    // box body
    rect(g, 10,24,52,28, P.lav);                        // box top edge
    eyes(g, 31,38, 6);
    smileArc(g, 31,44, 2.6,1.1);
    blush(g, 23,42); blush(g, 39,42);
  }});

S.push({ name: 'angel', draw(g) {              // 天使 tin1 si3
    ball(g, 14, 40, 8, 10, P.crm, P.lgy);               // left wing
    ball(g, 49, 40, 8, 10, P.crm, P.lgy);               // right wing
    ball(g, CX, 50, 10, 8, P.crm, P.lgy);               // robe
    tri(g, 21,58, 43,58, CX,44, P.crm);                 // robe flare
    ball(g, 22,50, 3,2.4, P.pch, P.brn); ball(g, 41,50, 3,2.4, P.pch, P.brn); // hands
    ball(g, CX, 28, 12, 11, P.pch, P.brn);              // head
    ellipse(g, CX, 19, 12, 5, P.yel);                   // hair
    ellipse(g, CX, 11, 8, 3, P.yel); ellipse(g, CX, 11, 6, 2, null); // halo ring
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 2.6,1.1);
    blush(g, CX-10, 33); blush(g, CX+10, 33);
  }});

S.push({ name: 'cod', draw(g) {                // 鱈魚 syut3 jyu2
    tri(g, 8,22, 8,42, 22,32, P.dgy);                   // tail fin back
    tri(g, 10,24, 10,40, 22,32, P.lgy);                 // tail fin
    ball(g, 36,32, 19,14, P.lgy, P.dgy);                // fat body
    ellipse(g, 40,40, 12,4, P.crm);                     // pale belly
    tri(g, 28,17, 46,17, 37,10, P.dgy);                 // long dorsal fin
    ellipse(g, 34,44, 6,3, P.lgy);                      // pelvic fin
    clipTo(g, [P.lgy], function () { for (const p of [[30,24],[40,22],[46,30],[34,30]]) disc(g,p[0],p[1],1.4,P.dgy); }); // spots
    stroke(g, [[50,38],[52,44]], 1,0.6, P.pch);         // chin barbel
    eyes(g, 46,28, 5);
    smileArc(g, 49,34, 2.2,1);
    blush(g, 42,34); blush(g, 53,31);
  }});

S.push({ name: 'flagpole', draw(g) {           // 旗杆 kei4 gon1
    ball(g, 30, 6, 2.5,2.5, P.yel, P.org);              // finial ball
    rect(g, 29,8,32,50, P.lgy); rect(g, 31,8,32,50, P.lav); // tall pole
    rrect(g, 32,10,52,26, 1, P.red);                    // flag
    ball(g, 52,18, 3,8, P.plum);                        // flag wave
    ellipse(g, 40,16, 3,2, P.pnk);                      // flag shine
    ellipse(g, CX, 55, 16, 6, P.dgy);                   // base mound shadow
    ellipse(g, CX, 53, 14, 5, P.lgy);                   // base
    eyes(g, CX, 52, 4.5);
    smileArc(g, CX, 56, 2.2,0.9);
    blush(g, 22,54); blush(g, 41,54);
  }});

S.push({ name: 'headset', draw(g) {          // 耳筒 ji5 tung2
    stroke(g, [[15, 34], [15, 18], [CX, 9], [48, 18], [48, 34]], 2.6, 2.6, P.dgy); // headband arc
    ball(g, 14, 37, 8, 10, P.sky, P.lav);                // left ear cup
    ball(g, 49, 37, 8, 10, P.sky, P.lav);                // right ear cup
    ellipse(g, 14, 37, 4, 5.5, P.lav); ellipse(g, 49, 37, 4, 5.5, P.lav); // cushions
    stroke(g, [[14, 45], [20, 53], [27, 54]], 1.4, 1, P.dgy); // mic boom
    ball(g, 28, 54, 2.4, 2, P.dgy, P.navy);              // mic tip
    ball(g, CX, 38, 10, 11, P.crm, P.lgy);               // face yoke
    eyes(g, CX, 37, 6);
    smileArc(g, CX, 43, 2.4, 1);
    blush(g, CX - 8, 41); blush(g, CX + 8, 41);
  }});

S.push({ name: 'beret', draw(g) {            // 貝雷帽 bui3 leoi4 mou2
    ellipse(g, CX, 27, 22, 11, P.plum);                  // beret shadow
    ellipse(g, 29, 25, 21, 10, P.red);                   // tilted dome
    ellipse(g, 19, 21, 6, 3, P.pnk);                     // shine
    disc(g, 44, 16, 2, P.red);                           // stalk nub
    rrect(g, 16, 33, 47, 40, 3, P.brn);                  // headband rim
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 31, 2.4, 1);
    blush(g, CX - 11, 29); blush(g, CX + 11, 29);
  }});

S.push({ name: 'recorder', draw(g) {         // 直笛 zik6 dek2
    rrect(g, 26, 6, 39, 58, 5, P.lgy);                   // body tube shadow
    rrect(g, 26, 6, 37, 56, 5, P.crm);                   // body tube
    rrect(g, 24, 6, 40, 16, 3, P.lgy);                   // mouthpiece head
    rect(g, 24, 15, 40, 17, P.dgy);                      // window slot
    for (const y of [32, 38, 44, 50]) disc(g, 32, y, 1.6, P.navy); // finger holes
    disc(g, 32, 55, 1.4, P.navy);
    eyes(g, 32, 24, 4.5);
    smileArc(g, 32, 28, 2, 0.9);
    blush(g, 26, 26); blush(g, 38, 26);
  }});

S.push({ name: 'staircase', draw(g) {        // 樓梯 lau4 tai1
    rrect(g, 46, 18, 59, 58, 1, P.lav); rect(g, 46, 18, 59, 20, P.crm); // top step (back)
    rrect(g, 32, 28, 48, 58, 1, P.lgy); rect(g, 32, 28, 48, 30, P.crm);
    rrect(g, 18, 38, 34, 58, 1, P.lgy); rect(g, 18, 38, 34, 40, P.crm);
    rrect(g, 5, 47, 20, 58, 1, P.lgy); rect(g, 5, 47, 20, 49, P.crm);   // bottom step (front)
    eyes(g, 12, 51, 4);
    smileArc(g, 12, 55, 1.8, 0.8);
    blush(g, 7, 53); blush(g, 17, 53);
  }});

S.push({ name: 'snowman', draw(g) {          // 雪人 syut3 jan4
    ball(g, CX, 46, 14, 12, P.crm, P.lgy);               // bottom ball
    ball(g, CX, 26, 11, 11, P.crm, P.lgy);               // head ball
    stroke(g, [[19, 32], [8, 25]], 1.2, 0.8, P.brn);     // twig arm L
    stroke(g, [[44, 32], [55, 25]], 1.2, 0.8, P.brn);    // twig arm R
    rect(g, 21, 13, 42, 15, P.plum); ball(g, CX, 9, 8, 6, P.red, P.plum); // hat
    tri(g, 31, 25, 31, 29, 41, 27, P.org);               // carrot nose
    disc(g, 28, 44, 1.4, P.dgy); disc(g, CX, 48, 1.4, P.dgy); disc(g, 35, 44, 1.4, P.dgy); // buttons
    eyes(g, CX, 23, 5.5);
    smileArc(g, CX, 30, 2.2, 1);
    blush(g, CX - 8, 27); blush(g, CX + 8, 27);
  }});

S.push({ name: 'gingerbread', draw(g) {      // 薑餅 goeng1 beng2
    ball(g, CX, 44, 10, 9, P.brn, P.plum);               // body
    ball(g, 16, 40, 4.5, 4, P.brn, P.plum); ball(g, 47, 40, 4.5, 4, P.brn, P.plum); // arms
    ball(g, 24, 57, 4.5, 4, P.brn, P.plum); ball(g, 39, 57, 4.5, 4, P.brn, P.plum); // legs
    ball(g, CX, 24, 12, 11, P.brn, P.plum);              // head
    for (let x = 24; x <= 39; x += 3) { g.set(x, 39, P.crm); g.set(x + 1, 41, P.crm); } // icing collar
    disc(g, 27, 47, 1.4, P.crm); disc(g, 36, 47, 1.4, P.crm); // buttons
    disc(g, 27, 52, 1.4, P.pnk); disc(g, 36, 52, 1.4, P.pnk);
    eyes(g, CX, 23, 6);
    smileArc(g, CX, 29, 2.4, 1);
    blush(g, CX - 9, 27); blush(g, CX + 9, 27);
  }});

S.push({ name: 'forklift', draw(g) {         // 叉車 caa1 ce1
    rect(g, 40, 8, 43, 52, P.dgy);                       // mast
    rect(g, 43, 40, 59, 42, P.lgy); rect(g, 43, 48, 59, 50, P.lgy); // two forks
    rrect(g, 11, 30, 42, 52, 3, P.brn);                  // body shadow
    rrect(g, 11, 30, 40, 50, 3, P.org);                  // body
    rrect(g, 15, 15, 34, 32, 2, P.sky); rect(g, 17, 17, 32, 30, P.crm); // cab window
    ball(g, 20, 52, 5, 5, P.dgy, P.navy); ball(g, 34, 52, 5, 5, P.dgy, P.navy); // wheels
    disc(g, 20, 52, 2, P.lgy); disc(g, 34, 52, 2, P.lgy);
    disc(g, 13, 22, 2, P.yel);                           // beacon
    eyes(g, 24, 40, 5);
    smileArc(g, 24, 45, 2.2, 1);
    blush(g, 18, 43); blush(g, 30, 43);
  }});

S.push({ name: 'caramel', draw(g) {          // 焦糖 ziu1 tong4
    tri(g, 6, 26, 20, 32, 6, 42, P.yel);                 // left wrapper twist
    tri(g, 57, 26, 43, 32, 57, 42, P.yel);               // right wrapper twist
    rrect(g, 18, 22, 46, 46, 5, P.brn);                  // candy shadow
    rrect(g, 18, 22, 44, 44, 5, P.org);                  // caramel body
    ellipse(g, 24, 28, 5, 3, P.crm);                     // glossy shine
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 39, 2.4, 1);
    blush(g, CX - 11, 37); blush(g, CX + 11, 37);
  }});

S.push({ name: 'pine', draw(g) {             // 松 cung4
    rect(g, 29, 50, 34, 60, P.brn);                      // trunk
    tri(g, 12, 52, 51, 52, CX, 30, P.grn); tri(g, 15, 51, 48, 51, CX, 33, P.lim); // bottom tier
    tri(g, 16, 41, 47, 41, CX, 20, P.grn); tri(g, 19, 40, 44, 40, CX, 23, P.lim); // mid tier
    tri(g, 20, 29, 43, 29, CX, 10, P.grn); tri(g, 23, 28, 40, 28, CX, 13, P.lim); // top tier
    disc(g, CX, 9, 1.8, P.yel);                          // tip bud
    eyes(g, CX, 45, 5.5);
    smileArc(g, CX, 50, 2.2, 1);
    blush(g, CX - 9, 48); blush(g, CX + 9, 48);
  }});

S.push({ name: 'iguana', draw(g) {           // 鬣蜥 lip6 sik1
    for (const [x, y] of [[24, 14], [30, 10], [37, 11], [43, 15]]) tri(g, x - 2, y + 4, x + 2, y + 4, x, y, P.grn); // dorsal spines
    stroke(g, [[43, 42], [54, 43], [57, 52], [50, 58]], 2.4, 1, P.lim); // curling tail
    ball(g, CX, 46, 11, 9, P.lim, P.grn);                // body
    ball(g, 18, 50, 3.4, 2.6, P.lim, P.grn); ball(g, 45, 50, 3.4, 2.6, P.lim, P.grn); // legs
    ball(g, CX, 26, 12, 11, P.lim, P.grn);               // head
    ellipse(g, CX, 35, 6, 4, P.grn);                     // dewlap throat flap
    disc(g, 22, 30, 1.4, P.grn); disc(g, 41, 30, 1.4, P.grn); // cheek scales
    eyes(g, CX, 24, 7);
    smileArc(g, CX, 31, 2.4, 1);
    blush(g, CX - 10, 29); blush(g, CX + 10, 29);
  }});

S.push({ name: 'detergent', draw(g) {        // 洗滌劑 sai2 dik6 zai1
    disc(g, 13, 15, 3, P.crm); disc(g, 51, 20, 2.4, P.crm); disc(g, 47, 11, 2, P.crm); // bubbles
    disc(g, 13, 15, 1, P.sky); disc(g, 51, 20, 0.8, P.sky);
    rrect(g, 24, 7, 39, 16, 2, P.red);                   // cap
    rrect(g, 20, 16, 44, 56, 4, P.lav);                  // bottle shadow
    rrect(g, 20, 16, 42, 54, 4, P.sky);                  // bottle body
    rrect(g, 23, 32, 40, 46, 2, P.crm);                  // label
    disc(g, CX, 39, 4, P.sky); disc(g, CX, 39, 2, P.crm); // label bubble icon
    eyes(g, CX, 24, 5.5);
    smileArc(g, CX, 28, 2.2, 1);
    blush(g, CX - 9, 26); blush(g, CX + 9, 26);
  }});

S.push({ name: 'investigator', draw(g) {     // 探員 taam3 jyun4
    ball(g, CX, 49, 10, 8, P.brn, P.plum);               // trench coat
    rect(g, 29, 42, 34, 56, P.crm);                      // coat placket
    ball(g, 24, 57, 4, 2.6, P.dgy, P.navy); ball(g, 39, 57, 4, 2.6, P.dgy, P.navy); // shoes
    stroke(g, [[45, 46], [50, 42]], 1.4, 1.4, P.brn);    // magnifier handle
    disc(g, 50, 39, 6, P.lgy); disc(g, 50, 39, 4, P.sky); disc(g, 50, 39, 3, P.crm); // lens
    ball(g, 43, 47, 3, 2.6, P.pch, P.brn);               // hand
    ball(g, CX, 26, 13, 12, P.pch, P.brn);               // head
    disc(g, CX, 13, 5.5, P.brn); ellipse(g, CX, 16, 14, 4, P.brn); rect(g, 12, 15, 51, 17, P.brn); // deerstalker
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.4, 1);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

S.push({ name: 'hangar', draw(g) {           // 機庫 gei1 fu3
    ellipse(g, CX, 25, 26, 18, P.lav);                   // arched roof shadow
    ellipse(g, CX, 27, 25, 17, P.lgy);                   // half-dome roof
    rect(g, 6, 27, 57, 56, P.lgy);                       // walls
    rect(g, 6, 27, 57, 28, P.crm);                       // roof seam lit
    rect(g, 32, 30, 33, 56, P.lav); rect(g, 44, 30, 45, 56, P.lav); // corrugation (right only)
    rrect(g, 21, 34, 44, 56, 3, P.dgy);                  // big door opening
    tri(g, 26, 42, 39, 42, CX, 36, P.crm); ball(g, CX, 46, 6, 4, P.crm, P.lgy); // plane nose peeking
    ellipse(g, CX, 46, 2, 1.4, P.sky);                   // cockpit glass
    eyes(g, 14, 40, 4.5);
    smileArc(g, 14, 44, 2, 0.9);
    blush(g, 9, 42); blush(g, 20, 42);
  }});

S.push({ name: 'fondue', draw(g) {           // 奶酪火鍋 naai5 lok6 fo2 wo1
    stroke(g, [[47, 10], [40, 32]], 1.2, 1.2, P.lgy);    // fondue fork stem
    ball(g, 39, 33, 3, 2.6, P.crm, P.lgy);               // dipped bread cube
    rrect(g, 16, 30, 48, 50, 6, P.brn);                  // pot shadow
    rrect(g, 16, 28, 46, 48, 6, P.org);                  // pot body
    ellipse(g, CX, 30, 15, 5, P.yel);                    // melted cheese top
    ellipse(g, 24, 30, 4, 2, P.crm);                     // cheese shine
    tri(g, 22, 50, 41, 50, CX, 57, P.dgy);               // burner stand
    tri(g, 28, 57, 35, 57, CX, 51, P.org); tri(g, 30, 57, 34, 57, CX, 53, P.yel); // friendly flame
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 2.4, 1);
    blush(g, CX - 11, 42); blush(g, CX + 11, 42);
  }});

S.push({ name: 'cartridge', draw(g) {        // 墨盒 mak6 hap2
    tri(g, 26, 6, 37, 6, CX, 18, P.lav); tri(g, 27, 8, 36, 8, CX, 17, P.sky); // ink droplet on top
    rrect(g, 16, 18, 48, 52, 3, P.navy);                 // shell shadow
    rrect(g, 16, 18, 46, 50, 3, P.sky);                  // top face
    rect(g, 20, 44, 42, 50, P.lgy);                      // contacts strip
    for (let x = 22; x <= 40; x += 4) rect(g, x, 44, x + 1, 50, P.yel); // gold contacts
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.4, 1);
    blush(g, CX - 10, 34); blush(g, CX + 10, 34);
  }});

S.push({ name: 'candlestick', draw(g) {      // 燭臺 zuk1 toi4
    ball(g, CX, 12, 3, 5, P.org, P.red);                 // flame
    disc(g, CX, 10, 2, P.yel);                           // flame core
    rrect(g, 26, 17, 37, 45, 2, P.crm);                  // candle body
    rect(g, 28, 19, 29, 43, P.lgy);                      // wax edge
    ellipse(g, CX, 45, 12, 4, P.org);                    // holder dish shadow
    ellipse(g, CX, 43, 11, 3.4, P.yel);                  // brass dish
    rect(g, 29, 46, 34, 54, P.org);                      // stem
    ellipse(g, CX, 56, 9, 3, P.yel);                     // base
    ellipse(g, 46, 44, 5, 4, P.yel); ellipse(g, 46, 44, 2.6, 2, null); // ring handle
    eyes(g, CX, 29, 5.5);
    smileArc(g, CX, 34, 2.2, 1);
    blush(g, CX - 8, 32); blush(g, CX + 8, 32);
  }});

S.push({ name: 'spaceship', draw(g) {        // 太空船 taai3 hung1 syun4
    tri(g, 11, 44, 24, 34, 24, 52, P.red);               // left fin
    tri(g, 52, 44, 39, 34, 39, 52, P.red);               // right fin
    ball(g, CX, 30, 11, 20, P.lgy, P.lav);               // rocket body
    tri(g, 20, 16, 43, 16, CX, 2, P.red);                // nose cone
    rect(g, 21, 48, 42, 50, P.dgy);                      // engine ring
    tri(g, 24, 50, 39, 50, CX, 62, P.org); tri(g, 27, 50, 36, 50, CX, 58, P.yel); // flame
    disc(g, CX, 38, 8, P.sky); disc(g, CX, 38, 6.5, P.crm); // porthole window
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 43, 2.4, 1);
    blush(g, CX - 9, 41); blush(g, CX + 9, 41);
  }});

S.push({ name: 'eel', draw(g) {              // 鰻魚 maan4 jyu2
    stroke(g, [[30, 20], [46, 16], [52, 28], [44, 38], [50, 48], [40, 56]], 5, 2, P.grn); // wavy body shadow
    stroke(g, [[30, 20], [46, 16], [52, 28], [44, 38], [50, 48], [40, 56]], 3.6, 1.2, P.lim); // wavy body
    tri(g, 8, 30, 18, 34, 12, 40, P.grn);                // pectoral fin
    ball(g, 20, 24, 12, 11, P.lim, P.grn);               // big head
    ellipse(g, 14, 27, 5, 4, P.crm);                     // pale cheek
    eyes(g, 21, 22, 7);
    smileArc(g, 22, 29, 3, 1.2);
    blush(g, 12, 27); blush(g, 31, 25);
  }});

S.push({ name: 'locust', draw(g) {
    stroke(g, [[26, 13], [22, 5]], 1, 1, P.grn); stroke(g, [[37, 13], [41, 5]], 1, 1, P.grn); // antennae
    stroke(g, [[24, 34], [15, 42], [20, 52]], 3, 1.5, P.grn);                     // folded jump legs
    stroke(g, [[39, 34], [48, 42], [43, 52]], 3, 1.5, P.grn);
    ball(g, CX, 40, 10, 15, P.lim, P.grn);                                        // long body
    ellipse(g, CX + 3, 38, 6, 12, P.grn);                                         // wing case
    ball(g, CX, 20, 10, 9, P.lim, P.grn);                                         // head
    eyes(g, CX, 20, 6);
    smileArc(g, CX, 27, 2.4, 1.1);
    blush(g, CX - 8, 24); blush(g, CX + 8, 24);
  }});

S.push({ name: 'gazebo', draw(g) {
    tri(g, 7, 27, 56, 27, CX, 6, P.red); tri(g, 9, 27, 31, 27, 22, 11, P.pnk);    // roof + light
    disc(g, CX, 6, 2, P.yel);                                                     // finial
    rect(g, 13, 27, 17, 53, P.lgy); rect(g, 46, 27, 50, 53, P.lgy);               // corner posts
    rect(g, 13, 43, 50, 46, P.lgy);                                              // railing
    rect(g, 9, 52, 54, 57, P.crm); rect(g, 9, 52, 54, 53, P.lgy);                 // floor
    eyes(g, CX, 33, 6);
    smileArc(g, CX, 39, 2.6, 1.2);
    blush(g, CX - 11, 37); blush(g, CX + 11, 37);
  }});

S.push({ name: 'oregano', draw(g) {
    stroke(g, [[CX, 44], [25, 24]], 1.4, 1, P.grn); stroke(g, [[CX, 44], [38, 24]], 1.4, 1, P.grn);
    stroke(g, [[CX, 44], [CX, 17]], 1.4, 1, P.grn);                               // stems
    [[25, 24], [21, 30], [30, 29], [38, 24], [42, 30], [34, 29], [CX, 17], [27, 21], [36, 21]]
      .forEach(p => ball(g, p[0], p[1], 3, 2.6, P.lim, P.grn));                   // round leaves
    rrect(g, 22, 44, 41, 56, 3, P.brn); rect(g, 20, 43, 43, 46, P.org);           // pot + rim
    eyes(g, CX, 50, 5);
    smileArc(g, CX, 54, 2.2, 1);
    blush(g, 25, 52); blush(g, 38, 52);
  }});

S.push({ name: 'firefly', draw(g) {
    ellipse(g, CX, 50, 11, 8, P.yel); ellipse(g, CX, 50, 6, 4, P.crm);            // glow halo
    stroke(g, [[26, 14], [22, 6]], 1, 1, P.dgy); stroke(g, [[37, 14], [41, 6]], 1, 1, P.dgy); // antennae
    ball(g, 16, 30, 6, 4, P.sky, P.lav); ball(g, 47, 30, 6, 4, P.sky, P.lav);     // wings
    ball(g, CX, 36, 8, 11, P.brn, P.plum);                                        // body
    ball(g, CX, 48, 5, 4.5, P.yel, P.org);                                        // glowing lantern tail
    ball(g, CX, 22, 9, 8, P.brn, P.plum);                                         // head
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 28, 2.4, 1.1);
    blush(g, CX - 8, 25); blush(g, CX + 8, 25);
  }});

S.push({ name: 'calves', draw(g) {
    ball(g, CX, 47, 11, 8, P.crm, P.lgy);                                         // body
    clipTo(g, [P.crm], () => { ellipse(g, 25, 45, 3, 2.4, P.brn); ellipse(g, 38, 50, 3.4, 2.6, P.brn); }); // spots
    ball(g, 25, 56, 4, 2.6, P.crm, P.lgy); ball(g, 38, 56, 4, 2.6, P.crm, P.lgy); // legs
    ball(g, 17, 24, 5, 6, P.crm, P.lgy); ball(g, 46, 24, 5, 6, P.crm, P.lgy);     // ears
    disc(g, 20, 15, 2, P.crm); disc(g, 43, 15, 2, P.crm);                         // horn nubs
    ball(g, CX, 27, 14, 12, P.crm, P.lgy);                                        // head
    ball(g, CX, 33, 7, 5, P.pnk);                                                 // muzzle
    g.set(28, 33, P.plum); g.set(35, 33, P.plum);                                 // nostrils
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 35, 2.6, 1);
    blush(g, CX - 11, 31); blush(g, CX + 11, 31);
  }});

S.push({ name: 'monument', draw(g) {
    ellipse(g, CX, 13, 9, 9, P.lgy); rect(g, 23, 13, 40, 50, P.lgy);              // rounded-top slab
    rect(g, 23, 13, 26, 50, P.crm); ellipse(g, 26, 13, 6, 8, P.crm);              // lit left face
    rrect(g, 14, 50, 49, 58, 2, P.lav); rect(g, 14, 50, 49, 52, P.lgy);           // base plinth
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 40, 2.6, 1.2);
    blush(g, CX - 9, 38); blush(g, CX + 9, 38);
  }});

S.push({ name: 'hydrant', draw(g) {
    ball(g, CX, 14, 8, 6, P.red, P.plum); disc(g, CX, 8, 2, P.plum);              // dome cap + bolt
    rrect(g, 22, 18, 41, 50, 5, P.plum); rrect(g, 22, 18, 40, 49, 5, P.red);      // body
    ball(g, 16, 30, 5, 5, P.red, P.plum); ball(g, 47, 30, 5, 5, P.red, P.plum);   // side nozzles
    disc(g, 16, 30, 2, P.yel); disc(g, 47, 30, 2, P.yel);                         // nozzle caps
    rect(g, 16, 50, 47, 55, P.plum); rect(g, 16, 50, 47, 52, P.red);              // base flange
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 42, 2.6, 1.2);
    blush(g, CX - 9, 40); blush(g, CX + 9, 40);
  }});

S.push({ name: 'anthill', draw(g) {
    ellipse(g, CX, 54, 26, 5, P.brn);                                            // base spread
    tri(g, 6, 54, 57, 54, CX, 16, P.brn); tri(g, 10, 54, 32, 54, 24, 24, P.org);  // mound + light
    disc(g, CX, 20, 4, P.dgy); disc(g, CX, 21, 2.4, P.navy);                      // tunnel hole
    ball(g, 12, 44, 1.6, 1.4, P.navy); ball(g, 15, 42, 1.6, 1.4, P.navy);         // ants
    ball(g, 50, 40, 1.6, 1.4, P.navy); ball(g, 47, 42, 1.6, 1.4, P.navy);
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 45, 2.6, 1.2);
    blush(g, CX - 12, 42); blush(g, CX + 12, 42);
  }});

S.push({ name: 'gazelle', draw(g) {
    stroke(g, [[24, 12], [21, 3]], 1.6, 1, P.brn); stroke(g, [[39, 12], [42, 3]], 1.6, 1, P.brn); // curved horns
    ball(g, 18, 22, 4, 6, P.pch, P.brn); ball(g, 45, 22, 4, 6, P.pch, P.brn);     // ears
    ball(g, CX, 48, 10, 8, P.pch, P.brn);                                         // body
    ball(g, 25, 56, 3.4, 2.6, P.pch, P.brn); ball(g, 38, 56, 3.4, 2.6, P.pch, P.brn); // legs
    ball(g, CX, 27, 12, 12, P.pch, P.brn);                                        // head
    ellipse(g, CX, 34, 5, 4, P.crm);                                             // muzzle
    g.set(29, 34, P.plum); g.set(34, 34, P.plum);                                 // nostrils
    eyes(g, CX, 26, 7);
    smileArc(g, CX, 35, 2.4, 1);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

S.push({ name: 'grandson', draw(g) {
    ball(g, CX, 48, 9, 7.5, P.lim, P.grn);                                        // shirt
    rect(g, 28, 41, 30, 55, P.sky); rect(g, 33, 41, 35, 55, P.sky);               // suspenders
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn); ball(g, 37, 57, 4, 2.6, P.pch, P.brn); // legs
    ball(g, 21, 47, 3.2, 2.6, P.pch, P.brn); ball(g, 42, 47, 3.2, 2.6, P.pch, P.brn); // hands
    ball(g, CX, 26, 14, 13, P.pch, P.brn);                                        // head
    ellipse(g, CX, 17, 14, 6, P.dgy); ball(g, CX, 9, 2.6, 2.6, P.dgy);            // hair + tuft
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 3, 1.4);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'backboard', draw(g) {
    rrect(g, 11, 8, 52, 44, 2, P.lav); rrect(g, 11, 8, 51, 43, 2, P.crm);         // board
    rect(g, 24, 30, 39, 42, P.red); rect(g, 26, 32, 37, 40, P.crm);               // target square
    disc(g, CX, 47, 7, P.org); disc(g, CX, 47, 4.6, null);                        // hoop rim
    stroke(g, [[26, 48], [28, 56]], 1.2, 0.6, P.lgy); stroke(g, [[CX, 50], [CX, 57]], 1.2, 0.6, P.lgy);
    stroke(g, [[37, 48], [35, 56]], 1.2, 0.6, P.lgy);                             // net
    eyes(g, CX, 18, 5);
    smileArc(g, CX, 24, 2.6, 1.2);
    blush(g, CX - 11, 22); blush(g, CX + 11, 22);
  }});

S.push({ name: 'broomstick', draw(g) {
    rect(g, 30, 4, 33, 34, P.brn); rect(g, 30, 4, 31, 34, P.org);                 // handle
    disc(g, 31.5, 5, 2, P.dgy);                                                  // cap
    rect(g, 24, 32, 39, 38, P.dgy);                                              // binding collar
    tri(g, 16, 58, 47, 58, CX, 36, P.yel); tri(g, 18, 58, 35, 58, 27, 38, P.org); // bristle fan + shade
    for (let i = 0; i < 8; i++) { const x = 18 + i * 4; g.set(x, 57, P.brn); g.set(x, 56, P.brn); } // tips
    eyes(g, CX, 46, 6);
    smileArc(g, CX, 52, 2.6, 1.2);
    blush(g, 22, 50); blush(g, 41, 50);
  }});

S.push({ name: 'snowplow', draw(g) {
    disc(g, 30, 52, 6, P.dgy); disc(g, 30, 52, 2.4, P.lgy);                       // wheels
    disc(g, 48, 52, 5, P.dgy); disc(g, 48, 52, 2, P.lgy);
    rrect(g, 6, 30, 23, 54, 3, P.plum); rrect(g, 6, 30, 22, 53, 3, P.red);        // plow blade
    ellipse(g, 10, 56, 10, 4, P.crm); ellipse(g, 16, 51, 5, 3, P.lgy);            // pushed snow
    ball(g, 40, 37, 13, 11, P.org, P.brn, P.yel);                                 // cab
    disc(g, 47, 21, 3, P.yel); disc(g, 47, 21, 1.6, P.crm);                       // warning beacon
    eyes(g, 40, 35, 6);
    smileArc(g, 40, 41, 2.6, 1.2);
    blush(g, 32, 39); blush(g, 48, 39);
  }});

S.push({ name: 'radish', draw(g) {
    ball(g, 24, 16, 5, 6, P.lim, P.grn); ball(g, CX, 12, 5, 7, P.lim, P.grn); ball(g, 40, 16, 5, 6, P.lim, P.grn); // leaves
    stroke(g, [[CX, 24], [24, 16]], 1.4, 1, P.grn); stroke(g, [[CX, 24], [CX, 12]], 1.4, 1, P.grn);
    stroke(g, [[CX, 24], [40, 16]], 1.4, 1, P.grn);                               // stems
    ball(g, CX, 38, 15, 14, P.red, P.plum);                                       // round red root
    ellipse(g, 26, 33, 4, 5, P.pnk);                                             // highlight
    stroke(g, [[CX, 52], [CX, 60]], 2.4, 0.6, P.crm);                             // root tail
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 45, 2.8, 1.3);
    blush(g, CX - 11, 42); blush(g, CX + 11, 42);
  }});

S.push({ name: 'mermaid', draw(g) {
    tri(g, 18, 54, 30, 47, 26, 61, P.lim); tri(g, 45, 54, 33, 47, 37, 61, P.lim); // tail fluke
    ball(g, CX, 44, 8, 10, P.lim, P.grn);                                         // tail
    ball(g, CX, 30, 10, 9, P.pch, P.brn);                                         // torso
    ellipse(g, CX, 31, 8, 4, P.pnk);                                             // shell top
    ball(g, 20, 26, 4, 5, P.org, P.brn); ball(g, 43, 26, 4, 5, P.org, P.brn);     // flowing hair
    ball(g, CX, 17, 11, 10, P.pch, P.brn);                                        // head
    ellipse(g, CX, 9, 11, 5, P.org);                                             // hair top
    eyes(g, CX, 18, 6);
    smileArc(g, CX, 23, 2.4, 1.1);
    blush(g, CX - 8, 21); blush(g, CX + 8, 21);
  }});

S.push({ name: 'blackboard', draw(g) {
    rrect(g, 8, 10, 55, 50, 3, P.brn);                                          // wooden frame
    rect(g, 12, 14, 51, 46, P.grn);                                             // chalkboard
    stroke(g, [[16, 19], [22, 23], [16, 27]], 1, 1, P.crm);                      // chalk squiggle
    disc(g, 45, 21, 3, P.crm); disc(g, 45, 21, 1.6, P.grn);                       // chalk ring
    rect(g, 20, 47, 35, 50, P.yel); disc(g, 41, 48, 1.6, P.crm);                  // ledge + chalk stick
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 2.8, 1.3, P.crm);
    blush(g, CX - 11, 34); blush(g, CX + 11, 34);
  }});

S.push({ name: 'albatross', draw(g) {
    tri(g, 2, 34, 26, 30, 24, 44, P.lgy); tri(g, 62, 34, 38, 30, 40, 44, P.lgy);  // long wings
    tri(g, 2, 34, 14, 33, 10, 40, P.dgy); tri(g, 62, 34, 50, 33, 54, 40, P.dgy);  // wingtip darks
    ball(g, CX, 42, 9, 12, P.crm, P.lgy);                                         // body
    ball(g, 27, 56, 3, 2, P.org); ball(g, 36, 56, 3, 2, P.org);                   // webbed feet
    ball(g, CX, 24, 12, 13, P.crm, P.lgy);                                        // head
    eyes(g, CX, 22, 7);
    smileArc(g, CX, 28, 2, 1);
    tri(g, 28, 30, 35, 30, CX, 37, P.org); disc(g, CX, 32, 1.4, P.yel);           // hooked beak
    blush(g, CX - 9, 26); blush(g, CX + 9, 26);
  }});

S.push({ name: 'samurai', draw(g) {
    ball(g, CX, 44, 11, 9, P.red, P.plum);                                        // armor body
    rect(g, 20, 42, 43, 50, P.plum); rect(g, 20, 42, 43, 44, P.red);              // skirt plates
    ball(g, 26, 56, 4, 2.6, P.dgy, P.navy); ball(g, 38, 56, 4, 2.6, P.dgy, P.navy); // boots
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                                        // face
    ellipse(g, CX, 15, 14, 6, P.dgy); rect(g, 18, 15, 45, 18, P.dgy);             // helmet dome + brow
    tri(g, 20, 12, 30, 12, 25, 2, P.yel); tri(g, 43, 12, 33, 12, 38, 2, P.yel);   // horn crest
    disc(g, CX, 13, 2.6, P.yel);                                                 // crest boss
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.6, 1.2);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'kennel', draw(g) {
    tri(g, 8, 30, 55, 30, CX, 12, P.red); tri(g, 10, 30, 32, 30, 22, 16, P.pnk);  // roof + light
    disc(g, CX, 11, 2, P.brn);                                                   // peak knob
    rrect(g, 12, 30, 51, 56, 3, P.plum); rrect(g, 12, 30, 50, 55, 3, P.brn);      // house body
    rect(g, 20, 42, 43, 56, P.dgy); ellipse(g, CX, 42, 11, 7, P.dgy);             // arched doorway
    ball(g, CX, 46, 8, 7, P.org, P.brn);                                          // puppy head
    ball(g, 24, 42, 3, 4, P.brn); ball(g, 39, 42, 3, 4, P.brn);                   // floppy ears
    ellipse(g, CX, 52, 3, 2, P.crm); disc(g, CX, 50, 1.4, P.navy);                // snout + nose
    eyes(g, CX, 45, 5);
    smileArc(g, CX, 54, 2, 0.9);
    blush(g, 25, 50); blush(g, 39, 50);
  }});

S.push({ name: 'chestnut', draw(g) {
    tri(g, 27, 22, 36, 22, CX, 11, P.brn);                // pointed tip
    ball(g, CX, 37, 17, 16, P.brn, P.plum, P.org);        // glossy shell
    ellipse(g, CX, 45, 12, 7, P.org);                     // pale bottom patch
    ellipse(g, CX, 46, 9, 5, P.crm);
    eyes(g, CX, 35, 6);
    smileArc(g, CX, 42, 2.6, 1.1);
    blush(g, 21, 40); blush(g, 43, 40);
  }});

S.push({ name: 'housekeeper', draw(g) {
    ellipse(g, 20, 25, 4, 8, P.brn); ellipse(g, 43, 25, 4, 8, P.brn); // hair sides
    ball(g, CX, 49, 11, 9, P.lav, P.navy);                // dress
    rrect(g, 26, 42, 38, 57, 3, P.crm);                   // white apron
    ball(g, 20, 49, 3.2, 3, P.pch, P.brn);                // hands
    ball(g, 43, 49, 3.2, 3, P.pch, P.brn);
    ball(g, 25, 58, 3.5, 2.5, P.blk, P.navy);             // shoes
    ball(g, 38, 58, 3.5, 2.5, P.blk, P.navy);
    ball(g, CX, 28, 12, 11, P.pch, P.brn);                // head
    rrect(g, 22, 12, 41, 18, 3, P.crm);                   // frilly cap
    for (const x of [24, 30, 36]) disc(g, x, 12, 1.6, P.crm);
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 2.6, 1);
    blush(g, 21, 33); blush(g, 43, 33);
  }});

S.push({ name: 'punching', draw(g) {
    stroke(g, [[CX, 5], [CX, 11]], 1.4, 1.4, P.lgy);      // hang strap
    rrect(g, 25, 9, 38, 14, 2, P.dgy);                    // top cap
    rrect(g, 20, 13, 43, 55, 7, P.plum);                  // bag shadow
    rrect(g, 20, 13, 41, 53, 7, P.red);                   // bag body
    rect(g, 23, 22, 26, 46, P.pnk);                       // highlight strip
    rect(g, 20, 30, 43, 32, P.plum); rect(g, 20, 44, 43, 46, P.plum); // seams
    ellipse(g, CX, 54, 11, 3, P.plum);                    // bottom cap
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 38, 2.8, 1.2);
    blush(g, 23, 34); blush(g, 41, 34);
  }});

S.push({ name: 'foreman', draw(g) {
    ball(g, CX, 49, 11, 9, P.org, P.brn);                 // hi-vis vest
    rect(g, 21, 47, 42, 49, P.lgy);                       // reflective stripes
    rect(g, 25, 42, 27, 57, P.lgy); rect(g, 36, 42, 38, 57, P.lgy);
    ball(g, 20, 49, 3.2, 3, P.pch, P.brn);                // hands
    ball(g, 43, 49, 3.2, 3, P.pch, P.brn);
    ball(g, 25, 58, 4, 2.5, P.brn, P.blk);                // boots
    ball(g, 38, 58, 4, 2.5, P.brn, P.blk);
    ball(g, CX, 29, 12, 11, P.pch, P.brn);                // head
    ellipse(g, CX, 19, 13, 4, P.yel);                     // hard hat brim
    rrect(g, 23, 10, 40, 20, 6, P.yel);                   // hard hat dome
    rect(g, 30, 11, 33, 18, P.org);                       // hat ridge
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1);
    blush(g, 20, 34); blush(g, 43, 34);
  }});

S.push({ name: 'shipyard', draw(g) {
    stroke(g, [[11, 52], [11, 12]], 2.5, 2.5, P.dgy);     // crane mast
    stroke(g, [[11, 13], [46, 13]], 2, 2, P.dgy);         // jib arm
    stroke(g, [[41, 14], [41, 20]], 0.6, 0.6, P.lgy);     // cable
    tri(g, 38, 20, 44, 20, 41, 26, P.yel);                // hook
    rect(g, 22, 24, 40, 41, P.lgy);                       // cabin
    rect(g, 25, 25, 37, 30, P.sky);                       // cabin window
    tri(g, 16, 42, 48, 42, 44, 53, P.red);                // hull (trapezoid)
    tri(g, 16, 42, 44, 53, 20, 53, P.red);
    rect(g, 15, 40, 49, 43, P.plum);                      // deck line
    eyes(g, CX, 47, 5);
    smileArc(g, CX, 51, 2.4, 1);
    blush(g, 23, 50); blush(g, 40, 50);
  }});

S.push({ name: 'skylight', draw(g) {
    disc(g, CX, 9, 4, P.yel);                             // sun
    for (const [dx, dy] of [[-8, -1], [8, -1], [-5, -6], [5, -6], [0, -8]])
      stroke(g, [[CX, 9], [CX + dx, 9 + dy]], 0.7, 0.7, P.yel); // rays
    tri(g, 9, 50, 55, 50, CX, 22, P.brn);                 // roof
    tri(g, 16, 50, 48, 50, CX, 27, P.plum);               // roof shade
    rrect(g, 23, 29, 41, 47, 3, P.sky);                   // glass pane
    ellipse(g, 27, 33, 3, 2, P.crm);                      // glare
    eyes(g, CX, 37, 5);
    smileArc(g, CX, 43, 2.4, 1);
    blush(g, 25, 41); blush(g, 39, 41);
  }});

S.push({ name: 'clover', draw(g) {
    stroke(g, [[CX, 38], [CX, 56]], 1.7, 1, P.grn);       // stem
    for (const [lx, ly] of [[CX, 19], [21, 37], [42, 37]]) {
      ball(g, lx - 3.5, ly, 5, 5, P.lim, P.grn);          // heart leaf
      ball(g, lx + 3.5, ly, 5, 5, P.lim, P.grn);
      disc(g, lx, ly + 4, 4, P.lim);
    }
    disc(g, CX, 30, 6, P.grn);                            // center hub
    eyes(g, CX, 29, 5);
    smileArc(g, CX, 34, 2.4, 1);
    blush(g, 24, 32); blush(g, 40, 32);
  }});

S.push({ name: 'raccoon', draw(g) {
    stroke(g, [[42, 50], [52, 46], [54, 36]], 4, 2.5, P.lgy); // bushy tail
    disc(g, 50, 47, 2.5, P.dgy); disc(g, 53, 40, 2.5, P.dgy); // rings
    ball(g, CX, 48, 10, 8, P.lgy, P.lav);                 // body
    ellipse(g, CX, 49, 5.5, 5, P.crm);                    // belly
    ball(g, 25, 57, 4, 3, P.lgy, P.lav); ball(g, 38, 57, 4, 3, P.lgy, P.lav);
    disc(g, 20, 15, 5, P.lgy); disc(g, 20, 15, 2.6, P.dgy); // ears
    disc(g, 43, 15, 5, P.lgy); disc(g, 43, 15, 2.6, P.dgy);
    ball(g, CX, 26, 14, 12, P.lgy, P.lav);                // head
    ellipse(g, 24, 26, 6, 4, P.dgy); ellipse(g, 39, 26, 6, 4, P.dgy); // mask
    ellipse(g, CX, 32, 5, 3.5, P.crm);                    // muzzle
    ellipse(g, CX, 30, 1.6, 1.2, P.navy);                 // nose
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 34, 2.4, 1);
    blush(g, 20, 31); blush(g, 43, 31);
  }});

S.push({ name: 'bullfrog', draw(g) {
    ball(g, CX, 42, 18, 15, P.lim, P.grn);                // body/head
    ellipse(g, CX, 50, 12, 7, P.crm);                     // pale throat
    ball(g, 16, 54, 5, 3, P.lim, P.grn); ball(g, 47, 54, 5, 3, P.lim, P.grn); // feet
    ball(g, 21, 22, 6, 6, P.lim, P.grn); ball(g, 43, 22, 6, 6, P.lim, P.grn); // eye bumps
    disc(g, 21, 22, 3.6, P.crm); disc(g, 43, 22, 3.6, P.crm);
    disc(g, 22, 23, 2.2, P.navy); disc(g, 42, 23, 2.2, P.navy); // pupils
    g.set(20, 21, P.crm); g.set(41, 21, P.crm);           // sparkle
    g.set(28, 36, P.grn); g.set(36, 36, P.grn);           // nostrils
    smileArc(g, CX, 40, 9, 3);                            // huge grin
    blush(g, 17, 39); blush(g, 46, 39);
  }});

S.push({ name: 'sparks', draw(g) {
    for (const [dx, dy] of [[0, -18], [13, -13], [18, 0], [13, 13], [0, 18], [-13, 13], [-18, 0], [-13, -13]])
      stroke(g, [[CX, 32], [CX + dx, 32 + dy]], 2.4, 0.6, P.yel); // long rays
    for (const [dx, dy] of [[9, -9], [9, 9], [-9, 9], [-9, -9]])
      stroke(g, [[CX, 32], [CX + dx, 32 + dy]], 1.8, 0.5, P.org); // short rays
    disc(g, CX, 32, 10, P.org);                           // core
    disc(g, CX, 32, 7, P.yel);
    eyes(g, CX, 31, 5);
    smileArc(g, CX, 36, 2.4, 1);
    blush(g, 23, 35); blush(g, 41, 35);
  }});

S.push({ name: 'fender', draw(g) {
    ellipse(g, CX, 46, 21, 20, P.plum);                   // arch shadow
    ellipse(g, CX, 45, 20, 19, P.red);                    // fender arch
    rect(g, 0, 47, 63, 63, null);                         // cut below → dome
    ellipse(g, CX, 47, 13, 13, null);                     // hollow inner
    rrect(g, 41, 40, 49, 55, 2, P.dgy);                   // mud flap
    disc(g, CX, 50, 11, P.dgy); disc(g, CX, 50, 6, P.lgy); disc(g, CX, 50, 2.5, P.crm); // wheel
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 36, 2.6, 1);
    blush(g, 22, 34); blush(g, 42, 34);
  }});

S.push({ name: 'drawbridge', draw(g) {
    ellipse(g, CX, 58, 27, 4, P.sky);                     // water
    rect(g, 13, 14, 18, 50, P.brn); rect(g, 46, 14, 51, 50, P.brn); // towers
    rect(g, 13, 14, 15, 50, P.org); rect(g, 46, 14, 48, 50, P.org); // tower light
    stroke(g, [[16, 13], [CX, 32], [48, 13]], 1.2, 1.2, P.yel); // main cable
    for (const x of [23, 28, CX, 37, 42]) stroke(g, [[x, 20], [x, 38]], 0.5, 0.5, P.yel); // hangers
    rrect(g, 9, 38, 55, 46, 2, P.dgy);                    // deck
    rect(g, 9, 38, 55, 40, P.lgy);
    eyes(g, CX, 42, 4.5);
    smileArc(g, CX, 45, 2.2, 0.8);
    blush(g, 23, 44); blush(g, 41, 44);
  }});

S.push({ name: 'jackhammer', draw(g) {
    rect(g, 26, 10, 38, 16, P.red);                       // top handle bar
    rect(g, 23, 14, 28, 20, P.dgy); rect(g, 36, 14, 41, 20, P.dgy); // grips
    rrect(g, 25, 18, 39, 44, 4, P.org);                   // body shadow
    rrect(g, 25, 18, 37, 42, 4, P.yel);                   // body cylinder
    rect(g, 27, 22, 29, 38, P.crm);                       // highlight
    rect(g, 24, 44, 40, 48, P.dgy);                       // collar
    rect(g, 29, 48, 35, 58, P.lgy);                       // chisel bit
    disc(g, 25, 57, 1.5, P.yel); disc(g, 39, 57, 1.5, P.yel); // work sparks
    eyes(g, CX, 28, 5);
    smileArc(g, CX, 34, 2.4, 1);
    blush(g, 26, 32); blush(g, 38, 32);
  }});

S.push({ name: 'sauna', draw(g) {
    stroke(g, [[22, 16], [20, 10], [22, 5]], 1.3, 1, P.lgy); // steam
    stroke(g, [[32, 14], [34, 8], [32, 3]], 1.3, 1, P.lgy);
    stroke(g, [[42, 16], [40, 10], [42, 5]], 1.3, 1, P.lgy);
    tri(g, 10, 26, 54, 26, CX, 14, P.brn);                // roof
    rrect(g, 14, 26, 50, 54, 3, P.org);                   // cabin wall
    for (const y of [40, 48]) rect(g, 14, y, 50, y + 1, P.brn); // planks
    rrect(g, 27, 42, 38, 54, 2, P.brn);                   // door
    eyes(g, CX, 30, 5);
    smileArc(g, CX, 36, 2.4, 1);
    blush(g, 21, 34); blush(g, 43, 34);
  }});

S.push({ name: 'inhaler', draw(g) {
    rrect(g, 22, 38, 40, 52, 3, P.lav);                   // mouthpiece shadow
    rrect(g, 22, 38, 38, 50, 3, P.sky);                   // mouthpiece
    rect(g, 24, 42, 26, 48, P.crm);                       // highlight
    rrect(g, 28, 14, 38, 40, 3, P.lgy);                   // canister
    rect(g, 28, 14, 38, 18, P.red);                       // colored cap
    for (const [x, y, r] of [[16, 42, 3], [12, 40, 2.5], [10, 44, 2]]) disc(g, x, y, r, P.crm); // mist
    eyes(g, CX, 43, 5);
    smileArc(g, CX, 48, 2.2, 1);
    blush(g, 24, 46); blush(g, 39, 46);
  }});

S.push({ name: 'tangerine', draw(g) {
    ball(g, CX, 37, 17, 16, P.org, P.brn, P.yel);         // fruit
    ellipse(g, CX, 22, 3, 2, P.brn);                      // top dimple
    tri(g, 33, 21, 45, 12, 41, 21, P.grn);                // leaf
    ellipse(g, 39, 17, 4, 2, P.lim);
    stroke(g, [[CX, 23], [CX, 19]], 1, 1, P.brn);         // stem
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 44, 2.8, 1.2);
    blush(g, 21, 41); blush(g, 43, 41);
  }});

S.push({ name: 'overalls', draw(g) {
    rrect(g, 18, 36, 30, 56, 3, P.sky); rrect(g, 34, 36, 46, 56, 3, P.sky); // legs
    rect(g, 20, 50, 30, 56, P.lav); rect(g, 34, 50, 44, 56, P.lav); // leg shade
    rrect(g, 20, 20, 44, 42, 3, P.sky);                   // bib
    rect(g, 22, 10, 27, 22, P.sky); rect(g, 37, 10, 42, 22, P.sky); // straps
    rrect(g, 26, 28, 38, 40, 2, P.lav);                   // pocket
    rect(g, 26, 28, 38, 30, P.navy);
    disc(g, 24, 22, 1.5, P.yel); disc(g, 40, 22, 1.5, P.yel); // buttons
    eyes(g, CX, 23, 5);
    smileArc(g, CX, 26, 2.2, 0.9);
    blush(g, 24, 25); blush(g, 40, 25);
  }});

S.push({ name: 'medallion', draw(g) {
    tri(g, 22, 8, 31, 28, 19, 28, P.red);                 // ribbon tail
    tri(g, 42, 8, 33, 28, 45, 28, P.sky);
    rrect(g, 26, 6, 38, 14, 2, P.yel);                    // ribbon knot
    ball(g, CX, 42, 15, 15, P.yel, P.org, P.crm);         // gold medal
    disc(g, CX, 42, 12, P.org);                           // rim groove
    disc(g, CX, 42, 10.5, P.yel);
    eyes(g, CX, 41, 6);
    smileArc(g, CX, 47, 2.6, 1.2);
    blush(g, 24, 46); blush(g, 40, 46);
  }});

S.push({ name: 'jade', draw(g) {
    rect(g, 29, 10, 35, 16, P.yel);                       // gold bail
    disc(g, CX, 11, 3, P.yel); disc(g, CX, 11, 1.5, null);
    ball(g, CX, 38, 18, 18, P.grn);                       // jade cabochon
    ellipse(g, 27, 34, 11, 12, P.lim);                    // lit side
    ellipse(g, 22, 30, 3, 6, P.crm);                      // gloss streak
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 45, 2.6, 1.2);
    blush(g, 22, 43); blush(g, 42, 43);
  }});

S.push({ name: 'tadpole', draw(g) {
    stroke(g, [[38, 40], [48, 34], [54, 40], [52, 48]], 3, 0.6, P.dgy); // wiggly tail
    ball(g, 26, 38, 14, 13, P.dgy, P.navy);               // round head
    ellipse(g, 24, 42, 7, 5, P.lgy);                      // pale belly
    eyes(g, 24, 36, 5);
    smileArc(g, 24, 42, 2.4, 1);
    blush(g, 17, 40); blush(g, 31, 40);
  }});

S.push({ name: 'warthog', draw(g) {
    for (const x of [24, 31, 38]) tri(g, x, 14, x + 4, 14, x + 2, 4, P.dgy); // mane tuft
    ball(g, CX, 48, 11, 8, P.brn, P.plum);                // body
    ball(g, 25, 57, 4, 3, P.brn, P.plum); ball(g, 38, 57, 4, 3, P.brn, P.plum);
    disc(g, 18, 22, 4, P.brn); disc(g, 45, 22, 4, P.brn); // ears
    ball(g, CX, 28, 14, 12, P.brn, P.plum);               // head
    ball(g, CX, 34, 7, 5, P.pch);                         // snout
    g.set(29, 34, P.plum); g.set(34, 34, P.plum);         // nostrils
    stroke(g, [[26, 37], [24, 32]], 1.2, 1, P.crm); stroke(g, [[37, 37], [39, 32]], 1.2, 1, P.crm); // blunt tusks
    disc(g, 20, 32, 2, P.brn); disc(g, 43, 32, 2, P.brn); // warts
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 38, 2.2, 1);
    blush(g, 20, 30); blush(g, 43, 30);
  }});

S.push({ name: 'mechanic', draw(g) {
    stroke(g, [[44, 50], [50, 34]], 2, 1.4, P.lgy);       // wrench handle
    disc(g, 51, 32, 3.5, P.lgy); disc(g, 51, 31, 1.6, null); // wrench jaw
    ball(g, CX, 49, 11, 9, P.sky, P.lav);                 // jumpsuit
    rect(g, 30, 40, 33, 55, P.navy);                      // zipper
    ball(g, 20, 49, 3.2, 3, P.pch, P.brn);                // hand
    ball(g, 44, 49, 3.2, 3, P.pch, P.brn);                // wrench hand
    ball(g, 25, 58, 4, 2.5, P.brn, P.blk); ball(g, 38, 58, 4, 2.5, P.brn, P.blk); // boots
    ball(g, CX, 29, 12, 11, P.pch, P.brn);                // head
    ellipse(g, CX, 19, 13, 4, P.red);                     // cap brim
    rrect(g, 22, 11, 41, 20, 5, P.sky);                   // cap
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1);
    blush(g, 20, 34); blush(g, 43, 34);
  }});

S.push({ name: 'mantle', draw(g) {
    tri(g, CX, 16, 8, 56, 56, 56, P.plum);                // outer cloak
    tri(g, CX, 20, 14, 54, 52, 54, P.red);                // inner drape
    ball(g, CX, 22, 13, 12, P.plum);                      // hood
    disc(g, CX, 25, 8, P.pch);                            // face in hood
    disc(g, CX, 35, 2.5, P.yel);                          // clasp
    eyes(g, CX, 25, 5);
    smileArc(g, CX, 30, 2.2, 1);
    blush(g, 24, 28); blush(g, 40, 28);
  }});

S.push({ name: 'bungalow', draw(g) {
    tri(g, 6, 30, 58, 30, CX, 14, P.red);                 // wide low roof
    tri(g, 13, 30, 51, 30, CX, 18, P.plum);               // roof shade
    rect(g, 6, 29, 58, 32, P.brn);                        // eave
    rrect(g, 12, 32, 52, 54, 2, P.crm);                   // wall
    rect(g, 12, 50, 52, 54, P.lgy);                       // wall shade
    rrect(g, 28, 40, 37, 54, 2, P.brn);                   // door
    rrect(g, 16, 37, 24, 45, 1, P.sky); rrect(g, 40, 37, 48, 45, 1, P.sky); // windows
    eyes(g, CX, 22, 5);
    smileArc(g, CX, 26, 2.4, 1);
    blush(g, 24, 25); blush(g, 40, 25);
  }});

S.push({ name: 'eraser', draw(g) {
    rrect(g, 15, 24, 49, 52, 4, P.plum);                  // block shadow
    rrect(g, 15, 22, 47, 50, 4, P.pnk);                   // rubber body
    rect(g, 18, 26, 21, 46, P.crm);                       // highlight edge
    rect(g, 15, 42, 47, 48, P.sky);                       // paper sleeve
    rect(g, 15, 42, 47, 43, P.lav);
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1);
    blush(g, 22, 34); blush(g, 42, 34);
  }});

S.push({ name: 'sunscreen', draw(g) {
    rrect(g, 26, 8, 38, 20, 2, P.lgy);                    // cap
    rrect(g, 19, 18, 45, 56, 5, P.brn);                   // bottle shadow
    rrect(g, 19, 18, 43, 54, 5, P.org);                   // bottle
    rect(g, 22, 24, 24, 50, P.yel);                       // highlight
    rrect(g, 23, 28, 41, 50, 3, P.crm);                   // label
    for (const [dx, dy] of [[0, -9], [7, -7], [9, 0], [7, 7], [0, 9], [-7, 7], [-9, 0], [-7, -7]])
      disc(g, CX + dx * 0.7, 39 + dy * 0.7, 1.4, P.yel);  // sun rays
    disc(g, CX, 39, 7, P.yel);                            // sun face
    eyes(g, CX, 38, 4.5);
    smileArc(g, CX, 42, 2.2, 0.9);
    blush(g, 25, 41); blush(g, 39, 41);
  }});

S.push({ name: 'tornado', draw(g) {
    ellipse(g, CX, 14, 18, 5, P.lgy);                     // funnel top (wide)
    ellipse(g, CX, 22, 15, 4, P.lav);
    ellipse(g, CX, 29, 12, 4, P.lgy);
    ellipse(g, CX, 36, 9, 3.5, P.lav);
    ellipse(g, CX, 43, 6, 3, P.lgy);
    ellipse(g, CX, 49, 3.5, 2.5, P.lav);                  // narrow tip
    stroke(g, [[16, 16], [48, 22]], 0.6, 0.6, P.crm); stroke(g, [[20, 30], [44, 34]], 0.6, 0.6, P.crm); // swirl
    disc(g, 12, 20, 1.5, P.lim); disc(g, 52, 32, 1.5, P.lim); // leaves
    eyes(g, CX, 13, 5);
    smileArc(g, CX, 18, 2.4, 1);
    blush(g, 20, 16); blush(g, 43, 16);
  }});

S.push({ name: 'skiing', draw(g) {
    rrect(g, 10, 54, 32, 58, 2, P.red); rrect(g, 32, 54, 54, 58, 2, P.sky); // skis
    tri(g, 8, 55, 13, 55, 6, 50, P.red); tri(g, 51, 55, 56, 55, 58, 50, P.sky); // tips
    stroke(g, [[16, 30], [14, 53]], 0.8, 0.8, P.lgy); stroke(g, [[48, 30], [50, 53]], 0.8, 0.8, P.lgy); // poles
    ball(g, CX, 44, 10, 8, P.grn, P.plum);                // jacket
    ball(g, 20, 42, 3, 3, P.red, P.plum); ball(g, 44, 42, 3, 3, P.red, P.plum); // mittens
    rrect(g, 26, 50, 30, 55, 2, P.navy); rrect(g, 34, 50, 38, 55, 2, P.navy); // boots
    ball(g, CX, 26, 11, 10, P.pch, P.brn);                // head
    rrect(g, 21, 16, 43, 25, 4, P.red);                   // beanie
    disc(g, CX, 15, 3, P.crm);                            // pom
    disc(g, 14, 52, 2, P.crm); disc(g, 50, 52, 2, P.crm); // snow spray
    eyes(g, CX, 27, 5);
    smileArc(g, CX, 32, 2.4, 1);
    blush(g, 23, 30); blush(g, 41, 30);
  }});

S.push({ name: 'fairy', draw(g) {
    ball(g, 16, 32, 8, 11, P.pnk, P.plum); ball(g, 47, 32, 8, 11, P.pnk, P.plum); // wings
    ellipse(g, 16, 32, 5, 8, P.crm); ellipse(g, 47, 32, 5, 8, P.crm); // wing shine
    tri(g, CX, 36, 20, 56, 44, 56, P.lav);                // skirt
    ball(g, CX, 38, 7, 7, P.lav, P.plum);                 // torso
    ball(g, 27, 56, 3, 2.5, P.pch, P.brn); ball(g, 37, 56, 3, 2.5, P.pch, P.brn); // legs
    ball(g, CX, 26, 11, 10, P.pch, P.brn);                // head
    ellipse(g, CX, 17, 11, 5, P.yel);                     // hair
    stroke(g, [[44, 44], [52, 30]], 0.9, 0.9, P.brn);     // wand
    for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) disc(g, 52 + dx, 28 + dy, 1.2, P.yel); // star
    disc(g, 52, 28, 2, P.yel);
    eyes(g, CX, 26, 5);
    smileArc(g, CX, 31, 2.4, 1);
    blush(g, 23, 30); blush(g, 41, 30);
  }});

S.push({ name: 'stretcher', draw(g) {
    rrect(g, 7, 29, 57, 34, 2, P.brn);                    // top rail
    rrect(g, 7, 43, 57, 48, 2, P.brn);                    // bottom rail
    disc(g, 9, 31, 2.5, P.org); disc(g, 55, 31, 2.5, P.org); // handles
    disc(g, 9, 45, 2.5, P.org); disc(g, 55, 45, 2.5, P.org);
    rrect(g, 13, 31, 51, 46, 2, P.crm);                   // canvas bed
    rect(g, 13, 31, 51, 33, P.lgy);
    rrect(g, 15, 33, 25, 44, 2, P.sky);                   // pillow
    rect(g, 42, 36, 45, 42, P.red); rect(g, 40, 38, 47, 40, P.red); // red cross
    eyes(g, CX, 37, 5);
    smileArc(g, CX, 42, 2.4, 1);
    blush(g, 29, 40); blush(g, 38, 40);
  }});

S.push({ name: 'puck', draw(g) {
    ellipse(g, CX, 52, 17, 4, P.sky);                    // ice sheen
    rect(g, 16, 30, 47, 46, P.dgy);                      // cylinder side
    rect(g, 16, 42, 47, 46, P.blk);                      // lower shade
    ellipse(g, CX, 46, 15.5, 4, P.blk);                  // bottom rim
    ball(g, CX, 30, 15.5, 8, P.lgy, P.dgy);              // top cap face
    disc(g, 20, 50, 1, P.crm); disc(g, 43, 51, 1, P.crm);// sparkles
    eyes(g, CX, 30, 7);
    smileArc(g, CX, 36, 2.8, 1.2);
    blush(g, CX - 12, 34); blush(g, CX + 12, 34);
  }});

S.push({ name: 'admiral', draw(g) {
    ball(g, CX, 50, 11, 9, P.navy, P.navy);              // dark uniform
    rect(g, 22, 43, 41, 46, P.yel);                      // gold braid trim
    ball(g, 19, 47, 4, 3, P.yel, P.org);                 // epaulettes
    ball(g, 44, 47, 4, 3, P.yel, P.org);
    rect(g, 29, 44, 34, 58, P.crm);                      // shirt front
    ball(g, 20, 51, 3, 2.4, P.pch, P.brn);               // hands
    ball(g, 43, 51, 3, 2.4, P.pch, P.brn);
    ball(g, CX, 27, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 14, 14, 5, P.crm);                    // white peaked cap
    rect(g, 18, 18, 45, 21, P.navy);                     // cap brim
    rect(g, 26, 15, 37, 18, P.yel);                      // cap badge
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.6, 1.2);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'catcher', draw(g) {
    ball(g, CX, 49, 11, 9, P.grn, P.grn);                // chest protector
    clipTo(g, [P.grn], function () {
      rect(g, 21, 44, 43, 45, P.lim); rect(g, 21, 50, 43, 51, P.lim); // pad seams
    });
    ball(g, 26, 58, 4, 2.6, P.crm, P.lgy);               // shoes
    ball(g, 37, 58, 4, 2.6, P.crm, P.lgy);
    ball(g, 46, 46, 6, 6, P.brn, P.plum);                // big catcher's mitt
    ellipse(g, 46, 46, 3, 3.6, P.org);                   // mitt pocket
    ball(g, CX, 26, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 15, 13, 6, P.sky);                    // mask helmet dome
    clipTo(g, [P.pch], function () {                     // mask cage bars
      rect(g, 22, 24, 41, 24, P.dgy); rect(g, 22, 30, 41, 30, P.dgy);
      rect(g, 26, 20, 26, 34, P.dgy); rect(g, 37, 20, 37, 34, P.dgy);
    });
    eyes(g, CX, 27, 5.5);
    smileArc(g, CX, 33, 2.4, 1.1);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

S.push({ name: 'icing', draw(g) {
    rrect(g, 20, 40, 43, 56, 3, P.org);                  // cupcake wrapper
    clipTo(g, [P.org], function () {
      rect(g, 25, 40, 26, 56, P.brn); rect(g, 31, 40, 32, 56, P.brn); rect(g, 37, 40, 38, 56, P.brn);
    });
    ball(g, CX, 30, 14, 11, P.pnk, P.plum);              // icing swirl
    ball(g, CX, 22, 9, 7, P.pnk, P.plum);
    ball(g, CX, 15, 5, 4.5, P.pnk, P.plum);              // top peak
    disc(g, CX, 10, 1.6, P.red);                         // cherry
    disc(g, 22, 28, 1, P.yel); disc(g, 40, 26, 1, P.sky); disc(g, 30, 20, 1, P.lim);
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 11, 34); blush(g, CX + 11, 34);
  }});

S.push({ name: 'seesaw', draw(g) {
    tri(g, 16, 56, 47, 56, CX, 30, P.brn);               // fulcrum
    tri(g, 8, 32, 8, 27, 56, 21, P.red);                 // tilted plank
    tri(g, 8, 32, 56, 26, 56, 21, P.red);
    rect(g, 8, 30, 56, 31, P.plum);                      // plank underside shade
    ball(g, 11, 27, 4, 3, P.sky, P.lav);                 // low seat
    ball(g, 53, 21, 4, 3, P.yel, P.org);                 // high seat
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.4, 1.1);
    blush(g, CX - 9, 46); blush(g, CX + 9, 46);
  }});

S.push({ name: 'nanny', draw(g) {
    ball(g, CX, 49, 11, 9, P.lav, P.navy);               // dress
    rrect(g, 24, 43, 40, 57, 3, P.crm);                  // white apron
    ball(g, 18, 48, 3.4, 3, P.pch, P.brn);               // cradling arm
    ball(g, 44, 46, 6, 5.5, P.pnk, P.plum);              // baby blanket
    ball(g, 44, 43, 3.2, 3, P.pch, P.brn);               // baby head
    g.set(43, 43, P.navy); g.set(45, 43, P.navy);        // baby eyes
    smileArc(g, 44, 45, 1.4, 0.6);                       // baby smile
    ball(g, CX, 26, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 16, 12, 5, P.brn);                    // hair
    disc(g, CX, 11, 3, P.brn);                           // bun
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.6, 1.2);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

S.push({ name: 'dunk', draw(g) {
    rrect(g, 16, 10, 48, 29, 2, P.crm);                  // backboard
    rect(g, 16, 10, 48, 12, P.lgy);
    rect(g, 27, 17, 37, 24, P.red);                      // target square
    rect(g, 20, 29, 44, 32, P.org);                      // hoop rim
    for (const x of [23, 28, 33, 38, 42]) stroke(g, [[x, 32], [x, 43]], 0.8, 0.6, P.lgy); // net
    rect(g, 24, 39, 40, 40, P.lgy);
    ball(g, CX, 42, 10, 10, P.org, P.brn);               // basketball
    clipTo(g, [P.org, P.brn], function () {
      rect(g, 22, 41, 41, 42, P.brn); rect(g, 31, 32, 32, 52, P.brn);
      stroke(g, [[24, 34], [27, 42], [24, 50]], 0.8, 0.8, P.brn);
      stroke(g, [[39, 34], [36, 42], [39, 50]], 0.8, 0.8, P.brn);
    });
    eyes(g, CX, 41, 6);
    smileArc(g, CX, 47, 2.6, 1.2);
    blush(g, CX - 9, 45); blush(g, CX + 9, 45);
  }});

S.push({ name: 'parsley', draw(g) {
    rect(g, 30, 40, 33, 58, P.grn);                      // stems
    rect(g, 26, 46, 29, 58, P.grn); rect(g, 34, 46, 37, 58, P.grn);
    for (let a = 0; a < 9; a++) {                        // frilly leaf cluster
      const th = a / 9 * Math.PI * 2;
      ball(g, CX + Math.cos(th) * 12, 26 + Math.sin(th) * 11, 5, 5, P.lim, P.grn);
    }
    ball(g, CX, 26, 8, 8, P.lim, P.grn);                 // cluster core
    clipTo(g, [P.lim, P.grn], function () {
      disc(g, 22, 22, 1, P.grn); disc(g, 40, 22, 1, P.grn); disc(g, CX, 34, 1, P.grn);
    });
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.6, 1.2);
    blush(g, CX - 11, 30); blush(g, CX + 11, 30);
  }});

S.push({ name: 'gymnast', draw(g) {
    stroke(g, [[46, 14], [54, 20], [50, 30], [56, 38], [50, 46]], 1.4, 1.2, P.pnk); // ribbon swirl
    ball(g, CX, 48, 9, 8, P.red, P.plum);                // leotard
    stroke(g, [[24, 47], [19, 41]], 2.4, 2, P.pch);      // left arm up
    stroke(g, [[40, 47], [45, 35]], 2.4, 2, P.pch);      // right arm up
    ball(g, 19, 40, 3, 2.6, P.pch, P.brn);               // hands
    ball(g, 45, 34, 3, 2.6, P.pch, P.brn);
    ball(g, 27, 57, 3.4, 2.4, P.pch, P.brn);             // legs
    ball(g, 36, 57, 3.4, 2.4, P.pch, P.brn);
    ball(g, CX, 26, 12, 11, P.pch, P.brn);               // head
    ellipse(g, CX, 16, 11, 5, P.brn);                    // hair
    disc(g, CX, 12, 2.6, P.brn);                         // top bun
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.6, 1.2);
    blush(g, CX - 9, 31); blush(g, CX + 9, 31);
  }});

S.push({ name: 'almond', draw(g) {
    ball(g, CX, 34, 13, 18, P.pch, P.brn);               // teardrop body
    tri(g, 20, 22, 43, 22, CX, 10, P.pch);               // pointed top
    clipTo(g, [P.pch, P.brn], function () {
      stroke(g, [[CX, 16], [CX, 50]], 0.8, 0.8, P.brn);  // centre seam
      stroke(g, [[26, 20], [24, 46]], 0.6, 0.6, P.brn);
      stroke(g, [[38, 20], [40, 46]], 0.6, 0.6, P.brn);
    });
    ellipse(g, 24, 26, 2.4, 3, P.crm);                   // highlight
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.6, 1.2);
    blush(g, CX - 10, 38); blush(g, CX + 10, 38);
  }});

S.push({ name: 'railway', draw(g) {
    for (let y = 20; y <= 54; y += 7) rect(g, 14, y, 49, y + 3, P.brn); // sleepers
    rect(g, 20, 14, 25, 58, P.lgy);                      // left rail
    rect(g, 20, 14, 22, 58, P.crm);
    rect(g, 39, 14, 44, 58, P.lgy);                      // right rail
    rect(g, 39, 14, 41, 58, P.crm);
    eyes(g, CX, 30, 5.5);
    smileArc(g, CX, 36, 2.4, 1.1);
    blush(g, 27, 34); blush(g, 37, 34);
  }});

S.push({ name: 'hula', draw(g) {
    ball(g, CX, 32, 22, 22, P.pnk, P.plum);              // outer ring
    ellipse(g, CX, 32, 15, 15, null);                    // hole
    clipTo(g, [P.pnk, P.plum], function () {             // candy stripes
      for (let a = 0; a < 16; a++) {
        const th = a / 16 * Math.PI * 2;
        if (a % 2 === 0) disc(g, CX + Math.cos(th) * 18.5, 32 + Math.sin(th) * 18.5, 2.4, P.yel);
      }
    });
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 8, 34); blush(g, CX + 8, 34);
  }});

S.push({ name: 'drummer', draw(g) {
    rrect(g, 18, 42, 45, 58, 2, P.red);                  // drum shell
    rect(g, 18, 42, 45, 45, P.crm);                      // drum head
    clipTo(g, [P.red], function () {
      for (let x = 20; x < 45; x += 6) rect(g, x, 45, x + 1, 58, P.crm); // lacing
    });
    ball(g, 14, 34, 3, 2.4, P.pch, P.brn);               // hands
    ball(g, 49, 34, 3, 2.4, P.pch, P.brn);
    stroke(g, [[16, 34], [26, 42]], 1, 0.8, P.brn);      // sticks
    stroke(g, [[47, 34], [37, 42]], 1, 0.8, P.brn);
    ball(g, CX, 24, 12, 11, P.pch, P.brn);               // head
    ellipse(g, CX, 15, 11, 5, P.dgy);                    // hair
    eyes(g, CX, 25, 6);
    smileArc(g, CX, 31, 2.6, 1.2);
    blush(g, CX - 9, 29); blush(g, CX + 9, 29);
  }});

S.push({ name: 'rink', draw(g) {
    ball(g, CX, 40, 24, 16, P.red, P.plum);              // rink boards
    ellipse(g, CX, 40, 21, 13, P.sky);                   // ice surface
    ellipse(g, CX, 38, 19, 11, P.crm);                   // lighter ice
    rect(g, 12, 39, 51, 40, P.sky);                      // centre line
    disc(g, CX, 40, 3, P.sky);                           // centre circle
    ellipse(g, 22, 34, 3, 1.6, P.crm);                   // ice shine
    disc(g, 18, 44, 1, P.sky); disc(g, 44, 46, 1, P.sky);// sparkles
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 2.6, 1.2);
    blush(g, CX - 12, 42); blush(g, CX + 12, 42);
  }});

S.push({ name: 'corral', draw(g) {
    ellipse(g, CX, 46, 22, 10, P.lim);                   // paddock ground
    ellipse(g, CX, 46, 20, 8, P.grn);
    ellipse(g, CX, 30, 20, 7, P.brn); ellipse(g, CX, 31, 18, 6, null); // back rail
    rect(g, 10, 40, 53, 42, P.brn); rect(g, 10, 48, 53, 50, P.brn);    // front rails
    for (const x of [12, 24, 39, 51]) rect(g, x, 34, x + 2, 54, P.brn); // posts
    eyes(g, CX, 37, 6);
    smileArc(g, CX, 44, 2.4, 1.1);
    blush(g, CX - 9, 41); blush(g, CX + 9, 41);
  }});

S.push({ name: 'capsule', draw(g) {
    rrect(g, 12, 24, 33, 42, 9, P.red);                  // red half
    rect(g, 30, 24, 33, 42, P.red);
    rrect(g, 30, 24, 51, 42, 9, P.crm);                  // cream half
    rect(g, 30, 24, 33, 42, P.plum);                     // seam
    rect(g, 14, 38, 30, 41, P.plum);                     // red underside shade
    rect(g, 34, 38, 49, 41, P.lgy);                      // cream underside shade
    ellipse(g, 20, 29, 2.4, 3, P.pnk);                   // shine
    eyes(g, 22, 32, 5);                                  // face on red half
    smileArc(g, 22, 37, 2, 1);
    blush(g, 16, 35); blush(g, 28, 35);
  }});

S.push({ name: 'speedboat', draw(g) {
    stroke(g, [[8, 40], [16, 38], [14, 44], [20, 42]], 1.6, 1.2, P.sky); // spray
    disc(g, 10, 46, 2, P.crm); disc(g, 14, 50, 1.4, P.crm);
    tri(g, 12, 40, 52, 40, 48, 52, P.red);               // pointed hull
    rect(g, 14, 36, 50, 42, P.red);                      // hull body
    rect(g, 14, 40, 50, 42, P.plum);                     // waterline shade
    rrect(g, 24, 26, 44, 37, 3, P.sky);                  // cabin
    rect(g, 26, 28, 42, 30, P.crm);                      // glass
    rect(g, 44, 30, 48, 37, P.crm);                      // rear deck
    disc(g, 48, 22, 1.6, P.crm);                         // bow light
    eyes(g, 33, 46, 5.5);
    smileArc(g, 33, 51, 2.4, 1.1);
    blush(g, 24, 49); blush(g, 42, 49);
  }});

S.push({ name: 'drumstick', draw(g) {
    stroke(g, [[38, 34], [48, 22]], 2, 2, P.crm);        // bone shaft
    ball(g, 49, 20, 4, 4, P.crm, P.lgy);                 // knuckle knobs
    ball(g, 46, 17, 3, 3, P.crm, P.lgy);
    ball(g, 27, 40, 15, 14, P.org, P.brn);               // meaty club
    ball(g, 32, 30, 8, 7, P.org, P.brn);                 // shoulder to bone
    ellipse(g, 18, 33, 3, 3.5, P.yel);                   // crispy highlight
    clipTo(g, [P.org, P.brn], function () {
      disc(g, 30, 46, 1, P.brn); disc(g, 22, 44, 1, P.brn); disc(g, 34, 38, 1, P.brn);
    });
    eyes(g, 27, 40, 6);
    smileArc(g, 27, 46, 2.6, 1.2);
    blush(g, 16, 44); blush(g, 38, 44);
  }});

S.push({ name: 'dandelion', draw(g) {
    rect(g, 30, 34, 32, 58, P.grn);                      // stem
    ball(g, 44, 50, 3.4, 2, P.lim, P.grn);               // leaf
    for (let a = 0; a < 16; a++) {                       // seed puffs
      const th = a / 16 * Math.PI * 2;
      stroke(g, [[CX, 24], [CX + Math.cos(th) * 15, 24 + Math.sin(th) * 15]], 0.6, 0.6, P.lgy);
      disc(g, CX + Math.cos(th) * 16, 24 + Math.sin(th) * 16, 1.4, P.crm);
    }
    ball(g, CX, 24, 5, 5, P.lgy, P.lav);                 // seed core
    disc(g, 50, 12, 1.2, P.crm); disc(g, 12, 18, 1.2, P.crm); // drifting seeds
    eyes(g, CX, 24, 5);
    smileArc(g, CX, 29, 2.2, 1);
    blush(g, CX - 8, 27); blush(g, CX + 8, 27);
  }});

S.push({ name: 'undershirt', draw(g) {
    rrect(g, 18, 20, 45, 56, 4, P.crm);                  // shirt body
    tri(g, 26, 20, 37, 20, CX, 28, null);                // neck scoop
    rect(g, 22, 14, 27, 24, P.crm);                      // straps
    rect(g, 36, 14, 41, 24, P.crm);
    rect(g, 18, 50, 45, 56, P.lgy);                      // hem shade
    clipTo(g, [P.crm], function () {
      for (let x = 21; x < 45; x += 4) rect(g, x, 32, x, 54, P.lgy); // rib lines
    });
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 2.6, 1.2);
    blush(g, CX - 11, 42); blush(g, CX + 11, 42);
  }});

S.push({ name: 'buyer', draw(g) {
    ball(g, CX, 49, 10, 8, P.org, P.brn);                // coat
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn);               // feet
    ball(g, 37, 57, 4, 2.6, P.pch, P.brn);
    rrect(g, 8, 42, 20, 56, 1, P.red);                   // left bag
    stroke(g, [[10, 42], [11, 37], [15, 37], [16, 42]], 0.8, 0.8, P.plum);
    rrect(g, 44, 42, 56, 56, 1, P.sky);                  // right bag
    stroke(g, [[46, 42], [47, 37], [51, 37], [52, 42]], 0.8, 0.8, P.lav);
    ball(g, 19, 46, 3, 2.4, P.pch, P.brn);               // hands
    ball(g, 44, 46, 3, 2.4, P.pch, P.brn);
    ball(g, CX, 26, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 16, 12, 5, P.brn);                    // hair
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.6, 1.2);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

S.push({ name: 'drainpipe', draw(g) {
    rect(g, 26, 8, 36, 46, P.lgy);                       // vertical pipe
    rect(g, 26, 8, 29, 46, P.crm);                       // shine
    rect(g, 33, 8, 36, 46, P.lav);                       // shade
    rect(g, 24, 12, 38, 16, P.lgy);                      // upper band
    rect(g, 26, 44, 36, 52, P.lgy);                      // elbow
    rect(g, 34, 48, 48, 56, P.lgy);                      // horizontal spout
    rect(g, 34, 54, 48, 56, P.lav);
    ball(g, 52, 54, 3, 3.6, P.sky, P.lav);               // friendly water drop
    ellipse(g, 51, 53, 1, 1.4, P.crm);
    eyes(g, 31, 26, 5.5);
    smileArc(g, 31, 32, 2.4, 1.1);
    blush(g, 25, 30); blush(g, 37, 30);
  }});

S.push({ name: 'thunderstorm', draw(g) {
    ball(g, 22, 26, 9, 8, P.lgy, P.lav);                 // cloud puffs
    ball(g, 42, 26, 9, 8, P.lgy, P.lav);
    ball(g, CX, 22, 11, 9, P.lgy, P.lav);
    ball(g, CX, 30, 16, 8, P.lgy, P.lav);
    rect(g, 16, 30, 47, 34, P.lav);                      // cloud base shade
    tri(g, 30, 34, 38, 34, 26, 48, P.yel);               // lightning bolt
    tri(g, 26, 46, 34, 44, 32, 58, P.yel);
    clipTo(g, [P.yel], function () { rect(g, 24, 40, 38, 42, P.org); });
    stroke(g, [[18, 38], [16, 44]], 0.9, 0.9, P.sky);    // rain
    stroke(g, [[46, 38], [44, 44]], 0.9, 0.9, P.sky);
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 29, 2.4, 1.1);
    blush(g, 20, 27); blush(g, 43, 27);
  }});

S.push({ name: 'rolling', draw(g) {
    ellipse(g, CX, 50, 22, 6, P.crm);                    // dough slab
    clipTo(g, [P.crm], function () { disc(g, 20, 50, 1, P.lgy); disc(g, 42, 51, 1, P.lgy); });
    rect(g, 10, 28, 16, 32, P.org);                      // handles
    rect(g, 48, 28, 54, 32, P.org);
    ball(g, 12, 30, 2.6, 3, P.brn, P.plum);              // handle knobs
    ball(g, 52, 30, 2.6, 3, P.brn, P.plum);
    rrect(g, 16, 24, 48, 38, 6, P.org);                  // roller barrel
    rect(g, 16, 24, 48, 28, P.yel);                      // top highlight
    rect(g, 16, 34, 48, 38, P.brn);                      // lower shade
    clipTo(g, [P.org, P.yel, P.brn], function () {
      rect(g, 24, 24, 25, 38, P.brn); rect(g, 38, 24, 39, 38, P.brn); // grain
    });
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 35, 2.6, 1.2);
    blush(g, CX - 12, 33); blush(g, CX + 12, 33);
  }});

S.push({ name: 'yak', draw(g) {
    stroke(g, [[19, 20], [13, 16], [10, 20]], 1.6, 1, P.crm); // horns
    stroke(g, [[44, 20], [50, 16], [53, 20]], 1.6, 1, P.crm);
    ball(g, CX, 46, 16, 12, P.brn, P.plum);              // shaggy body
    for (let x = 17; x <= 46; x += 4) tri(g, x, 52, x + 4, 52, x + 2, 60, P.brn); // fringe
    ball(g, 24, 58, 3, 3, P.dgy, P.blk); ball(g, 39, 58, 3, 3, P.dgy, P.blk); // hooves
    ball(g, CX, 24, 13, 12, P.brn, P.plum);              // head
    ellipse(g, CX, 14, 12, 5, P.dgy);                    // forelock
    ball(g, CX, 30, 7, 5, P.lgy, P.lav);                 // muzzle
    g.set(29, 29, P.navy); g.set(34, 29, P.navy);        // nostrils
    eyes(g, CX, 23, 6);
    smileArc(g, CX, 32, 2.4, 1.1);
    blush(g, CX - 11, 29); blush(g, CX + 11, 29);
  }});

S.push({ name: 'convertible', draw(g) {
    ellipse(g, CX, 54, 24, 4, P.dgy);                    // shadow
    rrect(g, 6, 36, 58, 50, 5, P.red);                   // body
    rect(g, 6, 46, 58, 50, P.plum);                      // lower shade
    rrect(g, 30, 30, 50, 40, 3, P.plum);                 // open cockpit rim
    rect(g, 32, 32, 40, 39, P.brn);                      // seat
    rrect(g, 44, 24, 52, 40, 2, P.plum);                 // folded-down top
    tri(g, 24, 36, 32, 24, 32, 36, P.sky);               // windshield
    ball(g, 16, 50, 6, 6, P.dgy, P.blk); ellipse(g, 16, 50, 2.4, 2.4, P.lgy); // wheels
    ball(g, 46, 50, 6, 6, P.dgy, P.blk); ellipse(g, 46, 50, 2.4, 2.4, P.lgy);
    disc(g, 9, 40, 1.8, P.yel);                          // headlight
    eyes(g, 20, 42, 5);                                  // face on front
    smileArc(g, 20, 47, 2.2, 1);
    blush(g, 14, 45); blush(g, 27, 45);
  }});

S.push({ name: 'spindle', draw(g) {
    tri(g, 30, 8, 33, 8, 31.5, 3, P.brn);                // top point
    rect(g, 30, 8, 33, 56, P.brn);                       // shaft
    tri(g, 30, 56, 33, 56, 31.5, 61, P.brn);             // bottom point
    rect(g, 30, 8, 31, 56, P.org);                       // shaft highlight
    ellipse(g, CX, 46, 9, 3.4, P.plum);                  // whorl disc
    ellipse(g, CX, 45, 9, 3, P.pnk);
    ball(g, CX, 30, 9, 12, P.yel, P.org);                // wound yarn bulge
    clipTo(g, [P.yel, P.org], function () {
      for (let y = 20; y <= 40; y += 3) rect(g, 23, y, 40, y, P.org); // wound thread
    });
    eyes(g, CX, 30, 5.5);
    smileArc(g, CX, 35, 2.2, 1);
    blush(g, 24, 33); blush(g, 40, 33);
  }});

S.push({ name: 'author', draw(g) {
    ball(g, CX, 49, 11, 9, P.plum, P.navy);              // cardigan
    rect(g, 18, 46, 46, 58, P.crm);                      // open book pages
    rect(g, 31, 46, 32, 58, P.lgy);                      // spine
    tri(g, 18, 46, 31, 44, 31, 46, P.crm); tri(g, 46, 46, 32, 44, 32, 46, P.crm);
    clipTo(g, [P.crm], function () {
      for (let y = 49; y <= 56; y += 2) { rect(g, 21, y, 29, y, P.lgy); rect(g, 34, y, 43, y, P.lgy); }
    });
    ball(g, 16, 48, 3, 2.6, P.pch, P.brn);               // hands
    ball(g, 47, 48, 3, 2.6, P.pch, P.brn);
    ball(g, CX, 26, 13, 12, P.pch, P.brn);               // head
    ellipse(g, CX, 16, 12, 5, P.dgy);                    // hair
    rect(g, 40, 8, 42, 20, P.yel);                       // quill
    tri(g, 39, 6, 43, 6, 41, 10, P.crm);                 // feather tip
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 33, 2.6, 1.2);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

S.push({ name: 'hoe', draw(g) {
    stroke(g, [[24, 6], [34, 40]], 2, 2.4, P.brn);       // handle
    rect(g, 22, 4, 30, 8, P.crm);                        // grip
    rect(g, 32, 34, 38, 42, P.dgy);                      // socket
    rrect(g, 22, 40, 52, 56, 3, P.lgy);                  // wide blade
    rect(g, 22, 40, 52, 43, P.crm);                      // blade top edge
    rect(g, 22, 52, 52, 56, P.lav);                      // blade shade
    eyes(g, 37, 47, 6);
    smileArc(g, 37, 52, 2.4, 1.1);
    blush(g, 28, 50); blush(g, 46, 50);
  }});

S.push({ name: 'maple', draw(g) {
    rect(g, 30, 48, 33, 60, P.brn);                      // stem
    const mx = CX, my = 30;
    ball(g, mx, my, 11, 10, P.red, P.plum);              // core
    tri(g, mx, my, mx - 4, my - 18, mx + 4, my - 14, P.red); // top lobe
    tri(g, mx, my, mx - 18, my - 8, mx - 12, my - 2, P.red); // left upper
    tri(g, mx, my, mx + 18, my - 8, mx + 12, my - 2, P.red); // right upper
    tri(g, mx, my, mx - 14, my + 12, mx - 6, my + 6, P.red); // left lower
    tri(g, mx, my, mx + 14, my + 12, mx + 6, my + 6, P.red); // right lower
    tri(g, mx, my, mx - 3, my + 16, mx + 3, my + 12, P.red); // bottom
    clipTo(g, [P.red, P.plum], function () {
      stroke(g, [[mx, my], [mx, my - 16]], 0.6, 0.6, P.plum);
      stroke(g, [[mx, my], [mx - 13, my - 6]], 0.6, 0.6, P.plum);
      stroke(g, [[mx, my], [mx + 13, my - 6]], 0.6, 0.6, P.plum);
    });
    eyes(g, mx, my, 5);
    smileArc(g, mx, my + 5, 2.2, 1);
    blush(g, mx - 8, my + 3); blush(g, mx + 8, my + 3);
  }});

S.push({ name: 'bobcat', draw(g) {
    tri(g, 18, 16, 27, 14, 21, 4, P.brn);                // tufted ears
    tri(g, 45, 16, 36, 14, 42, 4, P.brn);
    stroke(g, [[21, 7], [20, 2]], 0.8, 0.8, P.dgy);      // ear tufts
    stroke(g, [[42, 7], [43, 2]], 0.8, 0.8, P.dgy);
    tri(g, 20, 14, 25, 13, 22, 8, P.pch);
    tri(g, 43, 14, 38, 13, 41, 8, P.pch);
    ball(g, 49, 46, 3.4, 3, P.brn, P.plum);              // short bob tail
    disc(g, 50, 44, 1.6, P.dgy);
    ball(g, CX, 48, 10, 8, P.brn, P.plum);               // body
    ellipse(g, CX, 49, 5.5, 5, P.crm);                   // belly
    ball(g, 25, 56, 4, 3, P.brn, P.plum);                // feet
    ball(g, 38, 56, 4, 3, P.brn, P.plum);
    ball(g, CX, 25, 14, 12, P.brn, P.plum);              // head
    tri(g, 17, 26, 24, 30, 20, 34, P.crm); tri(g, 46, 26, 39, 30, 43, 34, P.crm); // cheek ruff
    clipTo(g, [P.brn, P.plum], function () {
      disc(g, 22, 22, 1.4, P.dgy); disc(g, 41, 22, 1.4, P.dgy); disc(g, CX, 18, 1.2, P.dgy);
    });
    ball(g, CX, 30, 5, 3.4, P.crm);                      // muzzle
    rect(g, 30, 28, 33, 29, P.pnk);                      // nose
    eyes(g, CX, 24, 6);
    smileArc(g, CX, 31, 2.4, 1.1);
    blush(g, CX - 11, 28); blush(g, CX + 11, 28);
  }});

S.push({ name: 'pilgrim', draw(g) {
    ball(g, CX, 50, 11, 9, P.dgy, P.blk);                // dark coat
    rect(g, 22, 42, 41, 46, P.crm);                      // white collar
    tri(g, 27, 42, 36, 42, CX, 48, P.crm);
    ball(g, 20, 50, 3, 2.4, P.pch, P.brn);               // hands
    ball(g, 43, 50, 3, 2.4, P.pch, P.brn);
    ball(g, CX, 27, 13, 12, P.pch, P.brn);               // head
    rect(g, 14, 20, 49, 24, P.dgy);                      // hat brim
    rrect(g, 22, 6, 41, 22, 2, P.dgy);                   // tall crown
    rect(g, 22, 6, 41, 9, P.blk);                        // crown top shade
    rect(g, 26, 14, 37, 20, P.crm);                      // hatband
    rect(g, 29, 15, 34, 19, P.yel);                      // gold buckle
    rect(g, 30, 16, 33, 18, P.dgy);                      // buckle hole
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 2.6, 1.2);
    blush(g, CX - 10, 33); blush(g, CX + 10, 33);
  }});

S.push({ name: 'baron', draw(g) {
    ball(g,CX,50,13,9,P.plum,P.navy);                    // robe
    ellipse(g,CX,44,13,4,P.crm);                         // fur collar
    ball(g,CX,27,12,11,P.pch,P.brn);                     // head
    rect(g,21,13,42,17,P.yel);                           // coronet band
    for (const x of [24,31,39]) tri(g,x-3,14,x+3,14,x,7,P.yel); // points
    for (const x of [24,31,39]) disc(g,x,8,1.2,P.red);   // jewels
    eyes(g,CX,27,6);
    smileArc(g,CX,33,2.4,1);
    blush(g,23,31); blush(g,41,31);
  }});

S.push({ name: 'cobbler', draw(g) {
    ball(g,CX,50,12,9,P.sky,P.lav);                      // body
    rrect(g,24,42,40,57,3,P.brn);                        // apron
    ball(g,CX,25,12,11,P.pch,P.brn);                     // head
    ellipse(g,CX,15,12,5,P.brn);                         // hair
    ellipse(g,45,46,9,5,P.brn);                          // big shoe (held)
    ellipse(g,50,44,4,4,P.brn);                          // shoe toe cap
    ellipse(g,45,50,10,2.5,P.dgy);                       // sole
    rect(g,39,44,46,45,P.crm);                           // laces
    eyes(g,CX,25,6);
    smileArc(g,CX,31,2.4,1);
    blush(g,23,29); blush(g,41,29);
  }});

S.push({ name: 'newsstand', draw(g) {
    rect(g,12,26,52,55,P.brn);                           // stall body
    for (let x = 12; x < 52; x += 8) tri(g,x,20,x+8,20,x+4,14,x%16===12?P.red:P.crm); // awning scallops
    rect(g,10,18,54,22,P.red);                           // awning bar
    rrect(g,16,32,30,50,2,P.crm); rrect(g,34,32,48,50,2,P.crm); // papers
    for (const y of [36,40,44]) { rect(g,18,y,28,y,P.dgy); rect(g,36,y,46,y,P.dgy); }
    eyes(g,CX,28,4.5);
    smileArc(g,CX,31,2,0.8);
    blush(g,22,29); blush(g,42,29);
  }});

S.push({ name: 'batter', draw(g) {
    stroke(g, [[40,46],[55,13]], 2.8,1.8,P.brn);         // bat
    ball(g,55,11,5,5,P.brn,P.plum);                      // bat barrel end
    ball(g,CX,50,12,9,P.red,P.plum);                     // body
    disc(g,41,46,3.5,P.pch);                             // gripping hand
    ball(g,CX,26,13,11,P.pch,P.brn);                     // head
    ball(g,CX,20,13,8,P.sky,P.lav);                      // helmet
    rect(g,18,20,26,24,P.sky);                           // brim
    eyes(g,CX,27,6);
    smileArc(g,CX,33,2.4,1);
    blush(g,22,31); blush(g,42,31);
  }});

S.push({ name: 'clubhouse', draw(g) {
    stroke(g, [[CX,8],[CX,16]], 0.8,0.8,P.brn);          // flagpole
    tri(g,32,7,44,10,32,14,P.red);                       // flag
    tri(g,10,30,54,30,CX,14,P.red);                      // roof
    rect(g,15,30,49,55,P.brn);                           // walls
    rrect(g,27,40,37,55,2,P.yel);                        // door
    disc(g,35,48,1,P.navy);                              // knob
    rrect(g,18,35,25,42,1,P.sky); rrect(g,39,35,46,42,1,P.sky); // windows
    eyes(g,CX,47,4);
    smileArc(g,CX,51,1.8,0.7);
    blush(g,20,49); blush(g,44,49);
  }});

S.push({ name: 'referee', draw(g) {
    ball(g,CX,50,13,10,P.crm,P.lgy);                     // body
    clipTo(g,[P.crm,P.lgy],function(){                   // vertical stripes
      for (let x = 22; x <= 42; x += 6) rect(g,x,40,x+2,58,P.navy);
    });
    ball(g,CX,25,13,11,P.pch,P.brn);                     // head
    ellipse(g,CX,16,12,4,P.dgy);                         // cap
    disc(g,44,40,4,P.yel);                               // whistle
    rect(g,20,42,44,43,P.dgy);                           // lanyard
    eyes(g,CX,25,6);
    smileArc(g,CX,31,2.4,1);
    blush(g,23,29); blush(g,41,29);
  }});

S.push({ name: 'incinerator', draw(g) {
    rect(g,26,8,34,22,P.dgy);                            // chimney
    for (const y of [10,13]) ellipse(g,CX,y,7,2,P.lgy);  // smoke puffs
    rrect(g,14,20,50,56,4,P.dgy);                        // furnace body
    rect(g,12,52,52,56,P.navy);                          // base
    rrect(g,24,30,40,48,3,P.org);                        // door glow
    tri(g,28,46,36,46,32,32,P.yel);                      // friendly flame
    tri(g,30,46,34,46,32,38,P.crm);
    eyes(g,CX,25,4.5);
    smileArc(g,CX,28,2,0.8);
    blush(g,20,27); blush(g,44,27);
  }});

S.push({ name: 'quail', draw(g) {
    stroke(g, [[30,12],[26,4],[31,7]], 1.2,0.6,P.navy);  // topknot plume
    ball(g,CX,40,15,13,P.brn,P.plum);                    // plump body
    ellipse(g,CX,44,10,8,P.crm);                         // belly speckle
    for (const [x,y] of [[26,42],[34,46],[30,50]]) disc(g,x,y,1,P.brn);
    ball(g,30,22,10,9,P.brn,P.plum);                     // head
    tri(g,20,22,26,20,24,25,P.org);                      // beak
    ball(g,44,44,5,7,P.dgy,P.navy);                      // tail
    eyes(g,30,22,5);
    smileArc(g,26,27,1.6,0.7);
    blush(g,22,25); blush(g,37,25);
  }});

S.push({ name: 'mitten', draw(g) {
    ball(g,CX,32,15,17,P.red,P.plum);                    // mitt palm
    ball(g,15,30,5,8,P.red,P.plum);                      // thumb
    rrect(g,18,48,46,58,4,P.crm);                        // cuff
    ellipse(g,CX,24,7,4,P.pnk);                          // heart decor
    tri(g,27,26,37,26,CX,32,P.pnk);
    eyes(g,CX,33,6);
    smileArc(g,CX,40,2.4,1);
    blush(g,20,38); blush(g,44,38);
  }});

S.push({ name: 'payphone', draw(g) {
    rrect(g,14,10,50,58,4,P.sky);                        // booth
    rrect(g,19,15,45,50,2,P.lav);                        // window panel
    rrect(g,24,20,40,44,2,P.dgy);                        // phone face
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) disc(g,28+c*4,26+r*5,1,P.crm); // keypad
    stroke(g, [[20,22],[20,40]], 2,2,P.navy);            // handset
    ellipse(g,20,22,3,2,P.navy); ellipse(g,20,40,3,2,P.navy);
    eyes(g,CX,53,3.5);
    smileArc(g,CX,56,1.8,0.6);
    blush(g,22,54); blush(g,42,54);
  }});

S.push({ name: 'choir', draw(g) {
    ball(g,CX,48,14,11,P.lav,P.navy);                    // robe
    rect(g,28,40,35,58,P.crm);                           // stole
    ball(g,CX,25,12,11,P.pch,P.brn);                     // head
    ellipse(g,CX,16,12,4,P.brn);                         // hair
    rrect(g,22,46,42,56,1,P.crm);                        // songbook
    rect(g,31,46,32,56,P.lgy);
    eyes(g,CX,24,6);
    openMouth(g,CX,31,2.4,2.2);                          // singing
    blush(g,22,28); blush(g,42,28);
  }});

S.push({ name: 'lasso', draw(g) {
    for (let a = 0; a < 20; a++) {                       // rope loop
      const th = a / 20 * Math.PI * 2;
      disc(g,CX + Math.cos(th) * 17,36 + Math.sin(th) * 15,2,P.brn);
    }
    stroke(g, [[46,42],[54,50],[50,58]], 2,1,P.brn);     // trailing coil
    disc(g,CX,20,2,P.crm);                               // knot glint
    eyes(g,CX,34,6);
    smileArc(g,CX,41,2.4,1);
    blush(g,22,39); blush(g,42,39);
  }});

S.push({ name: 'cymbals', draw(g) {
    ball(g,22,34,15,15,P.org,P.brn,P.yel);               // left cymbal
    ball(g,42,34,15,15,P.yel,P.org);                     // right cymbal
    disc(g,22,34,4,P.brn); disc(g,42,34,4,P.brn);        // domes
    for (const [x,y] of [[CX,12],[10,20],[54,20],[CX,56]]) { // clash sparkles
      tri(g,x-2,y,x+2,y,x,y-4,P.crm); tri(g,x-2,y,x+2,y,x,y+4,P.crm);
    }
    eyes(g,CX,32,5);
    smileArc(g,CX,39,2.2,1);
    blush(g,22,37); blush(g,41,37);
  }});

S.push({ name: 'kumquat', draw(g) {
    stroke(g, [[34,16],[42,8]], 1,0.6,P.grn);            // stem
    ellipse(g,44,12,6,3,P.lim);                          // leaf
    ball(g,CX,38,15,18,P.org,P.brn,P.yel);               // oval fruit
    disc(g,CX,20,2,P.brn);                               // navel
    eyes(g,CX,38,6);
    smileArc(g,CX,45,2.6,1.1);
    blush(g,21,43); blush(g,43,43);
  }});

S.push({ name: 'shrine', draw(g) {
    rect(g,16,20,48,26,P.red);                           // upper beam
    tri(g,8,20,56,20,CX,8,P.plum);                       // pagoda roof
    ellipse(g,8,20,4,3,P.plum); ellipse(g,56,20,4,3,P.plum); // upturned eaves
    rect(g,20,26,26,56,P.red); rect(g,38,26,44,56,P.red); // pillars
    rrect(g,28,38,36,56,1,P.dgy);                        // doorway
    disc(g,CX,32,3,P.yel);                               // lantern
    eyes(g,CX,44,4);
    smileArc(g,CX,48,1.8,0.7);
    blush(g,25,46); blush(g,39,46);
  }});

S.push({ name: 'thimble', draw(g) {
    ball(g,CX,38,15,18,P.lgy,P.lav,P.crm);               // metal cap
    ellipse(g,CX,20,13,5,P.crm);                         // dome top
    rect(g,17,52,46,55,P.lav);                           // rim band
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) // dimples
      disc(g,22+c*6,25+r*6,1,P.lav);
    eyes(g,CX,40,6);
    smileArc(g,CX,47,2.4,1);
    blush(g,21,45); blush(g,43,45);
  }});

S.push({ name: 'ladybug', draw(g) {
    ball(g,CX,38,20,17,P.red,P.plum);                    // shell
    rect(g,30,22,33,55,P.navy);                          // wing split
    for (const [x,y] of [[22,32],[42,32],[24,45],[40,45],[CX,50]]) disc(g,x,y,3,P.navy); // spots
    ball(g,CX,20,10,8,P.navy,P.blk);                     // head
    stroke(g, [[27,13],[23,5]], 0.8,0.4,P.navy); stroke(g, [[37,13],[41,5]], 0.8,0.4,P.navy);
    disc(g,23,5,1.6,P.navy); disc(g,41,5,1.6,P.navy);    // antennae
    eyes(g,CX,20,5);
    smileArc(g,CX,25,2,0.9);
    blush(g,22,22); blush(g,42,22);
  }});

S.push({ name: 'housewife', draw(g) {
    ball(g,CX,50,13,10,P.sky,P.lav);                     // body
    rrect(g,24,42,40,58,3,P.pnk);                        // apron
    rect(g,22,42,42,44,P.pnk);                           // apron top band
    ball(g,CX,25,12,11,P.pch,P.brn);                     // head
    ellipse(g,CX,15,12,5,P.brn);                         // hair
    rrect(g,20,10,44,14,2,P.red);                        // headscarf band
    eyes(g,CX,26,6);
    smileArc(g,CX,32,2.4,1);
    blush(g,22,30); blush(g,42,30);
  }});

S.push({ name: 'sunflower', draw(g) {
    for (let a = 0; a < 12; a++) {                       // petals
      const th = a / 12 * Math.PI * 2;
      ellipse(g,CX + Math.cos(th) * 15,32 + Math.sin(th) * 15,4,3,P.yel);
    }
    ball(g,CX,32,11,11,P.brn,P.plum);                    // seed center
    stroke(g, [[CX,42],[CX,58]], 2,1.4,P.grn);           // stem
    ellipse(g,40,50,6,3,P.lim);                          // leaf
    eyes(g,CX,31,6);
    smileArc(g,CX,37,2.4,1);
    blush(g,22,35); blush(g,42,35);
  }});

S.push({ name: 'slime', draw(g) {
    ball(g,CX,40,20,14,P.lim,P.grn);                     // blob
    for (const [x,w] of [[20,4],[32,5],[44,4]]) ellipse(g,x,52,w,5,P.lim); // drips
    disc(g,20,55,2.5,P.lim); disc(g,44,55,2.5,P.lim);
    ellipse(g,24,32,5,3,P.crm);                          // gloss highlight
    eyes(g,CX,38,6);
    smileArc(g,CX,45,2.8,1.2);
    blush(g,20,43); blush(g,44,43);
  }});

S.push({ name: 'skyscraper', draw(g) {
    stroke(g, [[CX,14],[CX,8]], 0.6,0.6,P.dgy);          // antenna
    disc(g,CX,7,1.4,P.red);                              // beacon
    rect(g,22,14,42,58,P.lav);                           // tower
    rect(g,22,14,26,58,P.sky);                           // lit edge
    for (let r = 0; r < 8; r++) for (let c = 0; c < 3; c++) // windows
      rect(g,26+c*6,18+r*5,28+c*6,20+r*5,P.yel);
    eyes(g,CX,48,4);
    smileArc(g,CX,52,1.8,0.7);
    blush(g,24,50); blush(g,40,50);
  }});

S.push({ name: 'sling', draw(g) {
    ball(g,CX,50,12,9,P.brn,P.plum);                     // teddy body
    ball(g,CX,26,13,12,P.brn,P.plum);                    // head
    disc(g,20,14,5,P.brn); disc(g,44,14,5,P.brn);        // ears
    disc(g,20,14,2.4,P.pch); disc(g,44,14,2.4,P.pch);
    tri(g,20,40,42,40,20,56,P.crm);                      // sling triangle
    stroke(g, [[20,40],[36,30]], 1.2,1.2,P.crm);         // neck strap
    ball(g,26,50,4,4,P.brn,P.plum);                      // arm in sling
    eyes(g,CX,26,6);
    smileArc(g,CX,32,2.4,1);
    blush(g,21,30); blush(g,43,30);
  }});

S.push({ name: 'sherbet', draw(g) {
    tri(g,18,34,46,34,CX,58,P.crm);                      // cup
    for (const y of [40,46,52]) rect(g,20+(y-40),y,44-(y-40),y,P.lgy);
    ball(g,24,30,9,8,P.pnk,P.plum);                      // scoop
    ball(g,40,30,9,8,P.sky,P.lav);                       // scoop
    ball(g,CX,24,8,7,P.yel,P.org);                       // scoop
    stroke(g, [[42,24],[50,10]], 1.4,1,P.lgy);           // spoon
    ellipse(g,51,9,3,2,P.lgy);
    eyes(g,CX,30,5);
    smileArc(g,CX,35,2.2,1);
    blush(g,20,33); blush(g,44,33);
  }});

S.push({ name: 'toffee', draw(g) {
    ball(g,CX,36,15,13,P.org,P.brn,P.yel);               // candy body
    tri(g,17,28,17,44,4,36,P.org);                       // left twist
    tri(g,10,30,10,42,2,36,P.brn);
    tri(g,46,28,46,44,59,36,P.org);                      // right twist
    tri(g,53,30,53,42,61,36,P.brn);
    ellipse(g,25,30,4,3,P.crm);                          // wrapper gloss
    eyes(g,CX,36,6);
    smileArc(g,CX,42,2.4,1);
    blush(g,22,40); blush(g,42,40);
  }});

S.push({ name: 'sewing', draw(g) {
    rrect(g,10,48,54,58,3,P.brn);                        // base
    rect(g,44,18,52,50,P.sky);                           // upright
    rrect(g,12,18,52,26,4,P.sky);                        // overarm
    rrect(g,10,20,20,34,3,P.lav);                        // head
    stroke(g, [[15,34],[15,44]], 1,1,P.lgy);             // needle bar
    disc(g,15,45,1.4,P.navy);                            // needle
    disc(g,48,15,3,P.yel); rect(g,47,13,49,18,P.pnk);    // spool + thread
    ellipse(g,CX,52,10,3,P.crm);                         // cloth
    eyes(g,CX,52,4);
    smileArc(g,32,55,1.8,0.7);
    blush(g,22,53); blush(g,42,53);
  }});

S.push({ name: 'bookmark', draw(g) {
    rrect(g,24,8,40,50,2,P.red);                         // ribbon strip
    rect(g,26,8,29,50,P.pnk);                            // highlight edge
    tri(g,24,50,40,50,CX,42,null);                       // notched V bottom
    for (const y of [16,24,32]) rect(g,28,y,36,y,P.yel); // deco bands
    stroke(g, [[CX,50],[CX,58]], 1,0.6,P.brn);           // tassel cord
    for (const x of [28,32,36]) stroke(g, [[CX,56],[x,60]], 0.8,0.5,P.yel); // tassel
    eyes(g,CX,22,4);
    smileArc(g,CX,27,1.8,0.8);
    blush(g,26,25); blush(g,38,25);
  }});

S.push({ name: 'sidecar', draw(g) {
    disc(g, 45, 50, 6.5, P.navy); disc(g, 45, 50, 3, P.lgy);   // bike wheel
    disc(g, 18, 53, 6, P.navy); disc(g, 18, 53, 2.6, P.lgy);   // sidecar wheel
    rrect(g, 30, 34, 54, 47, 4, P.lav);                        // bike body shadow
    rrect(g, 30, 34, 52, 45, 4, P.sky);                        // bike body
    stroke(g, [[50, 36], [55, 31]], 1.2, 1.2, P.dgy);          // handlebar
    ball(g, 20, 40, 11, 8.5, P.red, P.plum);                   // sidecar pod
    ellipse(g, 20, 37, 6, 3, P.crm);                           // pod opening
    eyes(g, 20, 40, 6);
    smileArc(g, 20, 46, 2.6, 1.2);
    blush(g, 11, 44); blush(g, 29, 44);
  }});

S.push({ name: 'pheasant', draw(g) {
    stroke(g, [[40, 44], [52, 40], [61, 30]], 3, 1, P.brn);    // long tail
    stroke(g, [[40, 46], [54, 44], [62, 37]], 2, 0.8, P.org);
    stroke(g, [[41, 42], [52, 36], [58, 26]], 1.6, 0.6, P.yel);
    ball(g, CX, 42, 12, 11, P.brn, P.plum);                    // body
    ellipse(g, CX, 44, 7, 7, P.org);                           // breast
    ball(g, 26, 55, 3.2, 2, P.org); ball(g, 34, 55, 3.2, 2, P.org); // feet
    ball(g, 25, 24, 8, 8, P.grn, P.navy);                      // head
    disc(g, 22, 29, 2.6, P.red);                               // red wattle
    tri(g, 17, 22, 20, 26, 11, 24, P.yel);                     // beak
    eyes(g, 25, 23, 5);
    smileArc(g, 23, 28, 1.6, 0.8);
    blush(g, 30, 27);
  }});

S.push({ name: 'leeches', draw(g) {
    const seg = [[16, 48], [18, 38], [24, 30], [33, 27], [42, 30], [46, 38]];
    stroke(g, seg, 5.5, 4, P.grn);                             // body shadow
    stroke(g, seg, 4.5, 3, P.lim);                             // body
    for (let i = 0; i < seg.length; i++) ellipse(g, seg[i][0], seg[i][1], 1, 3, P.grn); // rings
    ball(g, 16, 48, 6, 6, P.lim, P.grn);                       // head end
    ball(g, 46, 40, 4.5, 4.5, P.grn, P.navy);                  // sucker tail
    eyes(g, 16, 47, 6);
    smileArc(g, 16, 53, 2.4, 1.1);
    blush(g, 9, 51); blush(g, 23, 51);
  }});

S.push({ name: 'sash', draw(g) {
    stroke(g, [[14, 54], [46, 14]], 6, 6, P.lav);              // sash band shadow
    stroke(g, [[13, 52], [45, 13]], 4.5, 4.5, P.sky);          // sash band
    tri(g, 10, 50, 18, 58, 8, 56, P.sky);                      // fishtail end
    for (let a = 0; a < 8; a++) { const th = a / 8 * Math.PI * 2; disc(g, 24 + Math.cos(th) * 7, 40 + Math.sin(th) * 7, 3, P.pnk); } // petals
    ball(g, 24, 40, 7, 7, P.red, P.plum);                      // rosette
    eyes(g, 24, 39, 6);
    smileArc(g, 24, 45, 2.4, 1.1);
    blush(g, 16, 43); blush(g, 32, 43);
  }});

S.push({ name: 'tripod', draw(g) {
    stroke(g, [[CX, 30], [16, 56]], 2.2, 1.4, P.dgy);          // left leg
    stroke(g, [[CX, 30], [48, 56]], 2.2, 1.4, P.dgy);          // right leg
    stroke(g, [[CX, 30], [CX, 54]], 2.2, 1.4, P.lgy);          // centre leg
    disc(g, 16, 56, 2, P.navy); disc(g, 48, 56, 2, P.navy); disc(g, CX, 54, 2, P.navy); // feet
    rrect(g, 20, 16, 44, 32, 4, P.lav);                        // camera shadow
    rrect(g, 20, 16, 43, 31, 4, P.sky);                        // camera body
    disc(g, 46, 22, 3, P.navy); disc(g, 46, 22, 1.6, P.lgy);   // lens
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 27, 2.6, 1.2);
    blush(g, 24, 25); blush(g, 39, 25);
  }});

S.push({ name: 'carburetor', draw(g) {
    tri(g, 20, 14, 43, 14, 39, 22, P.lgy);                     // funnel intake shadow
    tri(g, 22, 14, 41, 14, 38, 21, P.crm);
    rrect(g, 20, 22, 44, 44, 3, P.dgy);                        // metal body shadow
    rrect(g, 20, 22, 42, 42, 3, P.lgy);                        // metal body
    disc(g, 44, 34, 4, P.dgy); disc(g, 44, 34, 2, P.lav);      // side jet knob
    ball(g, CX, 50, 8, 6, P.lgy, P.dgy);                       // round float bowl
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, 23, 34); blush(g, 40, 34);
  }});

S.push({ name: 'penthouse', draw(g) {
    rrect(g, 22, 20, 42, 58, 2, P.lav);                        // tower shadow
    rrect(g, 22, 20, 40, 58, 2, P.sky);                        // tower body
    clipTo(g, [P.sky], function () {                           // windows
      for (let wy = 44; wy <= 54; wy += 6) for (let wx = 25; wx <= 37; wx += 6) rect(g, wx, wy, wx + 2, wy + 2, P.crm);
    });
    rrect(g, 18, 14, 46, 26, 3, P.org);                        // top floor (crowned)
    rrect(g, 18, 14, 44, 24, 3, P.yel);
    tri(g, 24, 14, 40, 14, 32, 6, P.grn);                      // roof-garden tree
    disc(g, 32, 6, 3, P.lim);
    eyes(g, CX, 19, 6);
    smileArc(g, CX, 23, 2.4, 1);
    blush(g, 24, 21); blush(g, 39, 21);
  }});

S.push({ name: 'ostrich', draw(g) {
    stroke(g, [[26, 58], [27, 44]], 2, 2, P.pch);              // legs
    stroke(g, [[34, 58], [33, 44]], 2, 2, P.pch);
    disc(g, 26, 58, 2.5, P.org); disc(g, 34, 58, 2.5, P.org);  // feet
    ball(g, CX, 40, 13, 11, P.dgy, P.navy);                    // fluffy body
    ellipse(g, 44, 34, 5, 6, P.dgy);                           // wing/tail fluff
    stroke(g, [[26, 32], [22, 22], [24, 14]], 2.4, 1.8, P.pch); // long neck
    ball(g, 24, 12, 7, 6.5, P.pch, P.brn);                     // head
    tri(g, 16, 12, 20, 15, 11, 14, P.org);                     // beak
    eyes(g, 25, 11, 5);
    smileArc(g, 23, 15, 1.6, 0.8);
    blush(g, 29, 14);
  }});

S.push({ name: 'doormat', draw(g) {
    rrect(g, 10, 26, 54, 50, 3, P.brn);                        // mat shadow
    rrect(g, 10, 26, 52, 48, 3, P.org);                        // mat
    rect(g, 14, 30, 48, 44, P.brn);                            // inner border
    rrect(g, 16, 32, 46, 42, 2, P.org);
    for (let x = 12; x <= 52; x += 4) rect(g, x, 48, x + 1, 52, P.brn); // bottom fringe
    for (let x = 12; x <= 52; x += 4) rect(g, x, 22, x + 1, 26, P.brn); // top fringe
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 41, 2.6, 1.2);
    blush(g, 22, 39); blush(g, 41, 39);
  }});

S.push({ name: 'dustpan', draw(g) {
    stroke(g, [[44, 38], [54, 18]], 2.4, 2, P.dgy);            // handle
    disc(g, 54, 16, 3, P.dgy); ellipse(g, 54, 16, 1.5, 1.5, null); // loop
    tri(g, 12, 34, 47, 34, 42, 52, P.plum);                    // pan shadow
    tri(g, 12, 34, 42, 52, 18, 52, P.plum);
    tri(g, 12, 33, 47, 33, 41, 50, P.red);                     // pan face
    tri(g, 12, 33, 41, 50, 18, 50, P.red);
    rect(g, 12, 31, 47, 34, P.pnk);                            // front lip
    eyes(g, 28, 41, 6);
    smileArc(g, 28, 46, 2.4, 1.1);
    blush(g, 20, 44); blush(g, 36, 44);
  }});

S.push({ name: 'thermos', draw(g) {
    rrect(g, 22, 14, 42, 22, 2, P.red);                        // cup cap
    rrect(g, 22, 14, 40, 20, 2, P.pnk);
    rect(g, 24, 22, 40, 24, P.dgy);                            // collar
    rrect(g, 21, 24, 43, 56, 5, P.lav);                        // body shadow
    rrect(g, 21, 24, 41, 56, 5, P.sky);                        // body
    rect(g, 25, 28, 27, 50, P.crm);                            // highlight stripe
    eyes(g, CX, 38, 6.5);
    smileArc(g, CX, 44, 2.6, 1.2);
    blush(g, 24, 42); blush(g, 39, 42);
  }});

S.push({ name: 'cantaloupe', draw(g) {
    ball(g, CX, 36, 18, 17, P.lim, P.grn);                     // melon
    clipTo(g, [P.lim, P.grn], function () {                    // net rind
      for (let i = -3; i <= 3; i++) stroke(g, [[CX + i * 5, 20], [CX + i * 5, 52]], 0.6, 0.6, P.crm);
      for (let j = -2; j <= 2; j++) stroke(g, [[16, 36 + j * 6], [47, 36 + j * 6]], 0.6, 0.6, P.crm);
    });
    tri(g, 40, 20, 52, 30, 42, 40, P.org);                     // orange wedge
    tri(g, 41, 23, 49, 30, 42, 37, P.yel);
    eyes(g, 26, 34, 6.5);
    smileArc(g, 26, 40, 2.6, 1.2);
    blush(g, 18, 38); blush(g, 34, 38);
  }});

S.push({ name: 'bookkeeper', draw(g) {
    ball(g, CX, 50, 10, 8, P.grn, P.navy);                     // vest
    ball(g, 22, 52, 3, 3, P.pch, P.brn); ball(g, 41, 52, 3, 3, P.pch, P.brn); // hands
    rrect(g, 22, 48, 42, 58, 1, P.brn);                        // ledger book
    rect(g, 24, 49, 40, 57, P.crm);                            // pages
    rect(g, 32, 49, 32, 57, P.brn);                            // spine
    ball(g, CX, 26, 14, 13, P.pch, P.brn);                     // head
    ellipse(g, CX, 16, 13, 5.5, P.dgy);                        // hair
    disc(g, 26, 27, 4, P.navy); disc(g, 26, 27, 2.6, null);    // glasses
    disc(g, 37, 27, 4, P.navy); disc(g, 37, 27, 2.6, null);
    rect(g, 30, 27, 33, 27, P.navy);                           // bridge
    eyes(g, CX, 27, 5.5);
    smileArc(g, CX, 33, 2.6, 1.2);
    blush(g, 20, 31); blush(g, 43, 31);
  }});

S.push({ name: 'muzzle', draw(g) {
    disc(g, 18, 15, 6, P.brn); disc(g, 18, 15, 3, P.pch);      // floppy ears
    disc(g, 45, 15, 6, P.brn); disc(g, 45, 15, 3, P.pch);
    ball(g, CX, 50, 10, 7.5, P.brn, P.plum);                   // body
    ball(g, 25, 57, 4, 2.6, P.brn, P.plum); ball(g, 38, 57, 4, 2.6, P.brn, P.plum);
    ball(g, CX, 27, 14, 13, P.brn, P.plum);                    // head
    ball(g, CX, 35, 7, 5, P.pch);                              // snout
    ellipse(g, CX, 37, 9, 6, P.sky);                           // basket muzzle
    ellipse(g, CX, 37, 6.5, 4, null);                          // open front
    rect(g, 23, 30, 40, 31, P.sky);                            // strap to face
    eyes(g, CX, 25, 8);
    ellipse(g, CX, 32, 1.8, 1.3, P.navy);                      // nose
    smileArc(g, CX, 36, 2.2, 0.9);
    blush(g, CX - 13, 30); blush(g, CX + 13, 30);
  }});

S.push({ name: 'sundae', draw(g) {
    tri(g, 20, 34, 44, 34, CX, 52, P.lav);                     // bowl shadow
    tri(g, 21, 34, 43, 34, CX, 50, P.crm);                     // bowl glass
    rect(g, 30, 50, 33, 56, P.lgy);                            // stem
    ellipse(g, CX, 57, 7, 2, P.lgy);                           // foot
    ball(g, 26, 30, 7, 6, P.pnk, P.plum);                      // strawberry scoop
    ball(g, 38, 30, 7, 6, P.crm, P.lgy);                       // vanilla scoop
    ball(g, CX, 22, 7, 6, P.brn, P.plum);                      // choc scoop
    disc(g, CX, 13, 3, P.red);                                 // cherry
    stroke(g, [[CX, 13], [33, 7]], 0.8, 0.8, P.grn);           // stem
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 43, 2.4, 1.1);
    blush(g, 24, 41); blush(g, 39, 41);
  }});

S.push({ name: 'pickup', draw(g) {
    disc(g, 19, 50, 6, P.navy); disc(g, 19, 50, 2.8, P.lgy);   // wheels
    disc(g, 45, 50, 6, P.navy); disc(g, 45, 50, 2.8, P.lgy);
    rrect(g, 9, 40, 55, 52, 2, P.plum);                        // chassis shadow
    rrect(g, 9, 38, 55, 50, 2, P.red);                         // body
    rect(g, 33, 30, 51, 39, P.red);                            // cab
    rrect(g, 35, 32, 49, 38, 1, P.sky);                        // window
    rect(g, 11, 32, 31, 40, P.plum);                           // open bed wall
    rect(g, 11, 32, 31, 34, P.pnk);
    eyes(g, CX, 44, 5.5);
    smileArc(g, CX, 48, 2.4, 1.1);
    blush(g, 22, 46); blush(g, 41, 46);
  }});

S.push({ name: 'trainer', draw(g) {
    ball(g, CX, 49, 10, 8, P.red, P.plum);                     // track jacket
    ball(g, 22, 50, 3, 3, P.pch, P.brn); ball(g, 41, 50, 3, 3, P.pch, P.brn); // hands
    rect(g, 26, 44, 37, 46, P.crm);                            // jacket stripe
    disc(g, 40, 46, 2.5, P.yel); ellipse(g, 40, 46, 1.2, 1.2, null); // whistle
    stroke(g, [[CX, 40], [40, 46]], 0.8, 0.8, P.dgy);          // cord
    ball(g, CX, 27, 14, 13, P.pch, P.brn);                     // head
    rrect(g, 18, 14, 45, 22, 3, P.grn);                        // cap crown
    rect(g, 14, 21, 30, 24, P.grn);                            // cap brim
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 2.6, 1.2);
    blush(g, 21, 33); blush(g, 43, 33);
  }});

S.push({ name: 'attendant', draw(g) {
    ball(g, CX, 49, 10, 8, P.sky, P.lav);                      // uniform
    ball(g, 22, 50, 3, 3, P.pch, P.brn); ball(g, 41, 50, 3, 3, P.pch, P.brn); // hands
    tri(g, 26, 42, 37, 42, CX, 50, P.red);                     // neckerchief
    ball(g, CX, 27, 14, 13, P.pch, P.brn);                     // head
    ellipse(g, CX, 18, 13, 6, P.dgy);                          // hair
    rrect(g, 22, 12, 42, 20, 2, P.red);                        // pillbox cap
    rect(g, 22, 18, 42, 20, P.plum);
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 2.6, 1.2);
    blush(g, 21, 33); blush(g, 43, 33);
  }});

S.push({ name: 'veil', draw(g) {
    ellipse(g, CX, 34, 22, 26, P.lav);                         // veil shadow
    ellipse(g, CX, 32, 20, 24, P.crm);                         // sheer veil
    ball(g, CX, 30, 13, 13, P.pch, P.brn);                     // face
    ellipse(g, CX, 20, 12, 5, P.brn);                          // hair fringe
    tri(g, 26, 14, 30, 14, 28, 9, P.yel); tri(g, 33, 14, 37, 14, 35, 9, P.yel); // tiara
    rect(g, 24, 14, 39, 15, P.yel);
    disc(g, CX, 12, 1.6, P.pnk);                               // gem
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 10, 34); blush(g, CX + 10, 34);
  }});

S.push({ name: 'blindfold', draw(g) {
    stroke(g, [[10, 30], [6, 34], [10, 38]], 1.6, 1.6, P.plum); // strap ties
    stroke(g, [[54, 30], [58, 34], [54, 38]], 1.6, 1.6, P.plum);
    rect(g, 6, 32, 58, 36, P.plum);                            // strap band
    rrect(g, 14, 24, 50, 44, 9, P.plum);                       // mask shadow
    rrect(g, 14, 24, 48, 42, 9, P.sky);                        // mask body
    rect(g, 16, 26, 20, 30, P.crm);                            // shine
    eyes(g, CX, 33, 8);
    smileArc(g, CX, 40, 2.8, 1.3);
    blush(g, 20, 37); blush(g, 43, 37);
  }});

S.push({ name: 'scone', draw(g) {
    ball(g, CX, 32, 17, 13, P.org, P.brn, P.yel);              // domed top
    rect(g, 14, 38, 48, 42, P.crm);                            // cream split
    ellipse(g, CX, 40, 17, 3, P.red);                          // jam
    ellipse(g, CX, 41, 15, 2, P.pnk);
    rrect(g, 15, 40, 48, 50, 4, P.brn);                        // bottom shadow
    rrect(g, 15, 40, 46, 49, 4, P.org);                        // bottom half
    disc(g, 24, 28, 1.5, P.plum); disc(g, 38, 30, 1.5, P.plum); disc(g, 31, 24, 1.5, P.plum); // raisins
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 35, 2.4, 1);
    blush(g, 22, 33); blush(g, 40, 33);
  }});

S.push({ name: 'sax', draw(g) {
    stroke(g, [[40, 22], [48, 13], [45, 6]], 2.4, 1.8, P.brn); // neck outline
    stroke(g, [[40, 22], [48, 13], [45, 6]], 1.3, 1, P.yel);   // brass neck
    rect(g, 42, 4, 48, 8, P.dgy);                              // mouthpiece
    ball(g, 30, 40, 11, 15, P.org, P.brn, P.yel);              // body tube
    tri(g, 16, 22, 44, 22, 30, 30, P.brn);                     // bell flare shadow
    ellipse(g, 30, 18, 15, 6, P.org);                          // flared bell rim
    ellipse(g, 30, 17, 12, 4, P.brn);                          // dark opening
    ellipse(g, 30, 16, 8, 2.4, P.plum);
    disc(g, 25, 38, 1.6, P.lgy); disc(g, 25, 44, 1.6, P.lgy); disc(g, 25, 50, 1.6, P.lgy); // keys
    eyes(g, 33, 42, 7);
    smileArc(g, 33, 48, 2.6, 1.2);
    blush(g, 25, 46); blush(g, 41, 46);
  }});

S.push({ name: 'beefsteak', draw(g) {
    ellipse(g, CX, 50, 22, 6, P.lgy);                          // plate shadow
    ellipse(g, CX, 49, 20, 5, P.crm);                          // plate
    ball(g, CX, 34, 18, 14, P.red, P.plum);                    // meat
    ellipse(g, CX, 34, 11, 8, P.pnk);                          // pink centre
    disc(g, 15, 30, 4, P.crm); disc(g, 15, 40, 4, P.crm);      // bone
    rect(g, 14, 30, 17, 40, P.crm);
    clipTo(g, [P.red, P.plum], function () {                   // grill marks
      stroke(g, [[22, 24], [40, 44]], 0.8, 0.8, P.plum);
      stroke(g, [[30, 22], [46, 40]], 0.8, 0.8, P.plum);
    });
    eyes(g, 34, 33, 6);
    smileArc(g, 34, 39, 2.4, 1.1);
    blush(g, 27, 37); blush(g, 43, 37);
  }});

S.push({ name: 'icicle', draw(g) {
    rect(g, 8, 8, 56, 14, P.lgy);                              // eave shadow
    rect(g, 8, 8, 56, 11, P.crm);                              // eave
    tri(g, 20, 14, 44, 14, CX, 56, P.lav);                     // ice shadow
    tri(g, 22, 14, 42, 14, CX, 52, P.sky);                     // ice body
    rect(g, 27, 16, 30, 44, P.crm);                            // shine
    tri(g, 12, 14, 18, 14, 15, 30, P.sky);                     // side icicles
    tri(g, 46, 14, 52, 14, 49, 26, P.sky);
    disc(g, CX, 57, 2.5, P.sky);                               // drip
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.4, 1.1);
    blush(g, 24, 30); blush(g, 39, 30);
  }});

S.push({ name: 'bookshelf', draw(g) {
    rrect(g, 12, 14, 52, 56, 2, P.brn);                        // frame shadow
    rrect(g, 12, 14, 50, 54, 2, P.org);                        // wood frame
    rect(g, 15, 30, 47, 32, P.brn);                            // middle shelf
    rect(g, 15, 46, 47, 48, P.brn);                            // lower shelf
    const cols = [P.red, P.sky, P.grn, P.yel, P.pnk, P.plum];
    for (let i = 0; i < 6; i++) rect(g, 16 + i * 5, 34, 20 + i * 5, 46, cols[i % 6]);       // book spines
    for (let i = 0; i < 6; i++) rect(g, 16 + i * 5, 50, 20 + i * 5, 54, cols[(i + 2) % 6]);
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 27, 2.6, 1.2);
    blush(g, 22, 25); blush(g, 41, 25);
  }});

S.push({ name: 'rhinoceros', draw(g) {
    ball(g, 20, 20, 3.4, 4, P.lgy, P.lav);                // small ears
    ball(g, 43, 20, 3.4, 4, P.lgy, P.lav);
    ball(g, CX, 48, 13, 9, P.lgy, P.lav);                 // stocky body
    ball(g, 25, 57, 4.5, 3, P.lgy, P.lav);                // feet
    ball(g, 38, 57, 4.5, 3, P.lgy, P.lav);
    ball(g, CX, 27, 14, 12, P.lgy, P.lav);                // head
    ball(g, CX, 39, 8, 5, P.lgy, P.lav);                  // wide snout
    tri(g, 27, 38, 36, 38, CX, 16, P.crm);                // big nose horn
    tri(g, 32, 38, 36, 38, CX + 0.6, 22, P.pch);          // horn shade
    eyes(g, CX, 24, 8);
    g.set(29, 40, P.navy); g.set(34, 40, P.navy);         // nostrils
    smileArc(g, CX, 43, 3, 1.1);
    blush(g, CX - 12, 33); blush(g, CX + 12, 33);
  }});

S.push({ name: 'orangutan', draw(g) {
    stroke(g, [[16, 32], [13, 52]], 4, 3.5, P.brn);       // long left arm
    stroke(g, [[47, 32], [50, 52]], 4, 3.5, P.brn);       // long right arm
    ball(g, 13, 53, 3.4, 2.8, P.brn, P.plum);             // left hand
    ball(g, 50, 53, 3.4, 2.8, P.brn, P.plum);             // right hand
    ball(g, CX, 48, 10, 8, P.org, P.brn);                 // body
    ball(g, 25, 57, 4, 3, P.brn, P.plum);                 // feet
    ball(g, 38, 57, 4, 3, P.brn, P.plum);
    ball(g, 14, 25, 5, 8, P.brn, P.plum);                 // shaggy cheek flange
    ball(g, 49, 25, 5, 8, P.brn, P.plum);
    ball(g, CX, 25, 14, 13, P.org, P.brn);                // head
    ellipse(g, CX, 29, 10, 9, P.pch);                     // wide flat face patch
    eyes(g, CX, 27, 6);
    ellipse(g, CX, 32, 2, 1.4, P.navy);                   // nose
    smileArc(g, CX, 35, 2.6, 1);
    blush(g, CX - 11, 32); blush(g, CX + 11, 32);
  }});

S.push({ name: 'projector', draw(g) {
    tri(g, 46, 34, 62, 24, 62, 44, P.yel);                // light beam
    ball(g, 22, 22, 4.5, 4, P.dgy, P.navy);               // top reel
    rrect(g, 12, 26, 47, 51, 4, P.lav);                   // body shadow
    rrect(g, 12, 26, 45, 49, 4, P.lgy);                   // body
    disc(g, 45, 34, 5.5, P.navy);                         // lens ring
    disc(g, 45, 34, 3.6, P.sky);                          // lens glass
    g.set(43, 32, P.crm); g.set(44, 32, P.crm);           // lens glint
    eyes(g, 25, 36, 6);
    smileArc(g, 25, 43, 2.6, 1.1);
    blush(g, 16, 40); blush(g, 34, 40);
  }});

S.push({ name: 'kneel', draw(g) {
    ball(g, CX, 39, 9.5, 8, P.sky, P.lav);                // torso
    ball(g, 20, 41, 3, 3.4, P.pch, P.brn);                // arms
    ball(g, 43, 41, 3, 3.4, P.pch, P.brn);
    ball(g, 16, 55, 2.6, 2, P.pch, P.brn);                // tucked feet behind
    ball(g, 47, 55, 2.6, 2, P.pch, P.brn);
    rrect(g, 20, 46, 30, 58, 5, P.brn);                   // left thigh to knee (down)
    rrect(g, 33, 46, 43, 58, 5, P.brn);                   // right thigh to knee (down)
    ellipse(g, 23, 49, 2.4, 2, P.pch);                    // knee highlight
    ellipse(g, 36, 49, 2.4, 2, P.pch);
    ball(g, CX, 22, 12, 11, P.pch, P.brn);                // head
    ellipse(g, CX, 15, 11.5, 5, P.brn);                   // hair
    eyes(g, CX, 23, 6);
    smileArc(g, CX, 29, 2.8, 1.2);
    blush(g, CX - 9, 27); blush(g, CX + 9, 27);
  }});

S.push({ name: 'kicking', draw(g) {
    ball(g, 28, 42, 9, 8, P.red, P.plum);                 // torso, leaning
    ball(g, 18, 40, 3, 3.4, P.pch, P.brn);                // arms
    ball(g, 37, 38, 3, 3.4, P.pch, P.brn);
    rrect(g, 23, 48, 29, 58, 3, P.dgy);                   // standing leg
    ball(g, 26, 58, 4, 2.8, P.pch, P.brn);                // standing foot
    stroke(g, [[33, 48], [43, 50], [50, 50]], 3, 2.4, P.dgy); // kicking leg
    ball(g, 51, 50, 4, 2.8, P.pch, P.brn);               // kicking foot
    ball(g, 58, 53, 5, 5, P.crm, P.lgy);                  // ball
    disc(g, 58, 53, 1.6, P.navy);                         // ball marking
    ball(g, 26, 22, 12, 11, P.pch, P.brn);                // head
    ellipse(g, 26, 15, 11.5, 5, P.brn);                   // hair
    eyes(g, 26, 23, 6);
    smileArc(g, 26, 29, 2.6, 1.1);
    blush(g, 18, 27); blush(g, 34, 27);
  }});

S.push({ name: 'easel', draw(g) {
    stroke(g, [[22, 18], [15, 59]], 2, 2, P.brn);         // left leg
    stroke(g, [[42, 18], [49, 59]], 2, 2, P.brn);         // right leg
    stroke(g, [[CX, 42], [CX, 61]], 2, 2, P.brn);         // back leg
    rect(g, 16, 45, 48, 47, P.brn);                       // crossbar
    rrect(g, 17, 14, 47, 44, 2, P.lgy);                   // canvas shadow
    rrect(g, 17, 14, 45, 42, 2, P.crm);                   // canvas
    disc(g, 39, 21, 3, P.yel);                            // little painted sun
    for (let a = 0; a < 6; a++) g.set(39 + Math.round(5 * Math.cos(a)), 21 + Math.round(5 * Math.sin(a)), P.org);
    eyes(g, 27, 28, 6);
    smileArc(g, 27, 35, 2.8, 1.2);
    blush(g, 18, 32); blush(g, 36, 32);
  }});

S.push({ name: 'boomerang', draw(g) {
    stroke(g, [[13, 22], [30, 45]], 5.5, 5, P.org);       // left arm
    stroke(g, [[30, 45], [51, 24]], 5.5, 5, P.org);       // right arm
    stroke(g, [[15, 24], [30, 43]], 2.4, 2, P.yel);       // inner shine
    stroke(g, [[30, 43], [49, 26]], 2.4, 2, P.yel);
    eyes(g, 30, 34, 5.5);
    smileArc(g, 30, 40, 2.4, 1);
    blush(g, 22, 38); blush(g, 38, 38);
  }});

S.push({ name: 'transmitter', draw(g) {
    stroke(g, [[CX, 28], [CX, 8]], 1.4, 1.1, P.dgy);      // antenna
    ball(g, CX, 7, 3, 2.6, P.red, P.plum);                // antenna tip
    stroke(g, [[37, 12], [41, 8]], 1.2, 1.2, P.yel);      // signal waves
    stroke(g, [[39, 16], [44, 11]], 1.2, 1.2, P.yel);
    stroke(g, [[26, 12], [22, 8]], 1.2, 1.2, P.yel);
    stroke(g, [[24, 16], [19, 11]], 1.2, 1.2, P.yel);
    rrect(g, 14, 28, 50, 53, 4, P.lav);                   // body shadow
    rrect(g, 14, 28, 48, 51, 4, P.lgy);                   // body
    disc(g, 41, 41, 4.5, P.navy);                         // speaker dial
    disc(g, 41, 41, 2.6, P.sky);
    eyes(g, 25, 38, 6);
    smileArc(g, 25, 45, 2.6, 1.1);
    blush(g, 16, 42); blush(g, 34, 42);
  }});

S.push({ name: 'muffler', draw(g) {
    rrect(g, 11, 22, 52, 40, 7, P.plum);                  // wrapped band shadow
    rrect(g, 11, 22, 50, 38, 7, P.red);                   // band
    rrect(g, 22, 37, 30, 57, 3, P.plum);                  // left tail shadow
    rrect(g, 22, 37, 29, 55, 3, P.red);
    rrect(g, 34, 37, 43, 57, 3, P.plum);                  // right tail shadow
    rrect(g, 35, 37, 42, 55, 3, P.red);
    clipTo(g, [P.red], () => {                            // knit ribs
      for (let x = 15; x <= 48; x += 5) rect(g, x, 22, x, 55, P.pnk);
    });
    for (let x = 22; x <= 42; x += 3) rect(g, x, 55, x, 58, P.crm); // fringe
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 34, 2.8, 1.2);
    blush(g, CX - 12, 32); blush(g, CX + 12, 32);
  }});

S.push({ name: 'wheelbarrow', draw(g) {
    disc(g, 17, 47, 8.5, P.dgy);                          // big front wheel
    disc(g, 17, 47, 4, P.lgy);
    disc(g, 17, 47, 1.6, P.dgy);                          // hub
    stroke(g, [[47, 30], [58, 33]], 1.8, 1.4, P.brn);     // handle
    stroke(g, [[44, 42], [49, 55]], 1.8, 1.4, P.brn);     // support leg
    rrect(g, 22, 26, 53, 44, 3, P.plum);                  // tub shadow
    rrect(g, 22, 26, 51, 42, 3, P.red);                   // tub
    rect(g, 25, 30, 27, 40, P.pnk);                       // highlight
    eyes(g, 34, 32, 6);
    smileArc(g, 34, 38, 2.6, 1.1);
    blush(g, 26, 35); blush(g, 42, 35);
  }});

S.push({ name: 'lavender', draw(g) {
    stroke(g, [[23, 57], [26, 30]], 1.4, 1.1, P.grn);     // stems
    stroke(g, [[CX, 59], [CX, 26]], 1.4, 1.1, P.grn);
    stroke(g, [[40, 57], [37, 30]], 1.4, 1.1, P.grn);
    for (let i = 0; i < 5; i++) ball(g, 26 - i * 0.4, 28 - i * 4, 3, 2.6, P.lav, P.plum); // left spike
    for (let i = 0; i < 6; i++) ball(g, CX, 24 - i * 4, 3.4, 3, P.lav, P.plum);           // centre spike
    for (let i = 0; i < 5; i++) ball(g, 37 + i * 0.4, 28 - i * 4, 3, 2.6, P.lav, P.plum); // right spike
    eyes(g, CX, 14, 5);
    smileArc(g, CX, 19, 2.2, 0.9);
    blush(g, CX - 8, 17); blush(g, CX + 8, 17);
  }});

S.push({ name: 'kale', draw(g) {
    rrect(g, 28, 44, 35, 59, 2, P.crm);                   // stem base
    ball(g, 19, 27, 8, 9, P.lim, P.grn);                  // leaf cluster
    ball(g, 45, 27, 8, 9, P.lim, P.grn);
    ball(g, CX, 20, 9, 10, P.lim, P.grn);
    ball(g, CX, 34, 12, 11, P.lim, P.grn);
    for (let a = 0; a < 12; a++) {                        // frilly ruffled edge
      const th = a / 12 * Math.PI * 2;
      ball(g, CX + 15 * Math.cos(th), 28 + 15 * Math.sin(th), 2.6, 2.6, P.lim, P.grn);
    }
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 38, 2.8, 1.2);
    blush(g, CX - 10, 35); blush(g, CX + 10, 35);
  }});

S.push({ name: 'teriyaki', draw(g) {
    stroke(g, [[CX, 8], [CX, 60]], 1.2, 1.2, P.crm);      // skewer stick
    ball(g, CX, 21, 9, 8, P.org, P.brn, P.yel);           // glazed piece
    ball(g, CX, 35, 9, 8, P.org, P.brn, P.yel);
    ball(g, CX, 49, 9, 8, P.org, P.brn, P.yel);
    g.set(28, 45, P.crm); g.set(35, 47, P.crm);           // sesame
    g.set(30, 18, P.crm); g.set(34, 22, P.crm);
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.6, 1.1);
    blush(g, CX - 11, 37); blush(g, CX + 11, 37);
  }});

S.push({ name: 'paperboy', draw(g) {
    ball(g, CX, 48, 9, 7.5, P.grn, P.navy);               // shirt
    ball(g, 26, 57, 4, 2.6, P.pch, P.brn);                // feet
    ball(g, 38, 57, 4, 2.6, P.pch, P.brn);
    ball(g, 20, 47, 3.2, 2.6, P.pch, P.brn);              // left hand
    ball(g, 44, 45, 3.2, 2.6, P.pch, P.brn);              // raised hand
    rrect(g, 45, 39, 57, 45, 2, P.crm);                   // rolled newspaper
    rect(g, 45, 42, 57, 42, P.lgy);                       // paper band
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 16, 13, 4.5, P.sky);                   // newsboy cap crown
    rect(g, 30, 18, 47, 20, P.sky);                       // cap brim
    eyes(g, CX, 28, 6);
    smileArc(g, CX, 34, 2.8, 1.2);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'mantis', draw(g) {
    ball(g, 41, 46, 6, 9, P.lim, P.grn);                  // abdomen
    ball(g, CX, 34, 5, 7, P.lim, P.grn);                  // thorax
    stroke(g, [[38, 44], [46, 52]], 1.4, 1.1, P.grn);     // back legs
    stroke(g, [[42, 48], [50, 55]], 1.4, 1.1, P.grn);
    stroke(g, [[26, 34], [18, 25], [25, 20]], 2.2, 1.6, P.lim); // folded praying arms
    stroke(g, [[37, 34], [45, 25], [38, 20]], 2.2, 1.6, P.lim);
    tri(g, 23, 23, 40, 23, CX, 11, P.lim);                // triangular head
    ball(g, CX, 20, 8, 6, P.lim, P.grn);                  // head fill
    stroke(g, [[28, 13], [24, 5]], 1, 1, P.grn);          // antennae
    stroke(g, [[35, 13], [39, 5]], 1, 1, P.grn);
    eyes(g, CX, 19, 6);
    smileArc(g, CX, 24, 2.2, 1);
    blush(g, CX - 8, 22); blush(g, CX + 8, 22);
  }});

S.push({ name: 'crayon', draw(g) {
    tri(g, 24, 24, 39, 24, CX, 7, P.pnk);                 // waxy tip
    rrect(g, 24, 24, 40, 57, 3, P.plum);                  // body shadow
    rrect(g, 24, 24, 38, 55, 3, P.red);                   // body
    rect(g, 23, 40, 40, 50, P.crm);                       // paper wrapper
    rect(g, 23, 40, 40, 41, P.lgy);
    rect(g, 23, 49, 40, 50, P.lgy);
    eyes(g, CX, 31, 5.5);
    smileArc(g, CX, 36, 2.6, 1.1);
    blush(g, CX - 9, 34); blush(g, CX + 9, 34);
  }});

S.push({ name: 'memo', draw(g) {
    rrect(g, 14, 14, 49, 52, 3, P.org);                  // paper shadow
    rrect(g, 13, 12, 47, 50, 3, P.yel);                  // sticky note
    rect(g, 17, 20, 40, 21, P.org); rect(g, 17, 25, 40, 26, P.org); // rule lines
    tri(g, 38, 50, 47, 50, 47, 41, P.org);               // dog-ear curl
    tri(g, 40, 48, 47, 48, 47, 43, P.crm);
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 43, 3, 1.4);
    blush(g, CX - 12, 40); blush(g, CX + 12, 40);
  }});

S.push({ name: 'rosary', draw(g) {
    for (let a = 0; a < 14; a++) {                        // ring of beads
      const th = a / 14 * Math.PI * 2;
      ball(g, CX + Math.cos(th) * 16, 30 + Math.sin(th) * 15, 2.8, 2.8, P.sky, P.lav);
    }
    rect(g, 30, 46, 33, 58, P.brn); rect(g, 27, 50, 36, 52, P.brn); // cross pendant
    ball(g, CX, 30, 10, 10, P.sky, P.lav);               // centre bead (face)
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 7, 33); blush(g, CX + 7, 33);
  }});

S.push({ name: 'signal', draw(g) {
    for (let a = 0; a < 8; a++) {                         // burst rays
      const th = a / 8 * Math.PI * 2;
      stroke(g, [[CX, 15], [CX + Math.cos(th) * 12, 15 + Math.sin(th) * 12]], 1.4, 0.6, P.yel);
    }
    ball(g, CX, 15, 6, 6, P.yel, P.org, P.crm);           // flare star
    rrect(g, 25, 27, 40, 57, 4, P.plum);                  // tube shadow
    rrect(g, 24, 26, 38, 55, 4, P.red);                   // flare tube
    rect(g, 27, 30, 28, 50, P.pnk);                       // highlight
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 47, 2.6, 1.2);
    blush(g, 25, 44); blush(g, 38, 44);
  }});

S.push({ name: 'wolverine', draw(g) {
    disc(g, 20, 14, 4, P.brn); disc(g, 20, 14, 2, P.pch); // ears
    disc(g, 43, 14, 4, P.brn); disc(g, 43, 14, 2, P.pch);
    ball(g, CX, 44, 15, 11, P.brn, P.plum);               // stocky body
    clipTo(g, [P.brn, P.plum], function () { ellipse(g, 19, 44, 4, 9, P.crm); ellipse(g, 44, 44, 4, 9, P.crm); }); // pale flank stripes
    ball(g, 22, 55, 4, 3, P.brn, P.plum); ball(g, 41, 55, 4, 3, P.brn, P.plum); // paws
    rect(g, 20, 57, 20, 59, P.crm); rect(g, 23, 57, 23, 59, P.crm); // claws
    rect(g, 39, 57, 39, 59, P.crm); rect(g, 42, 57, 42, 59, P.crm);
    ball(g, CX, 26, 13, 11, P.brn, P.plum);               // head
    clipTo(g, [P.brn, P.plum], function () { ellipse(g, 23, 22, 3.5, 4, P.crm); ellipse(g, 40, 22, 3.5, 4, P.crm); }); // pale brow mask
    ball(g, CX, 33, 6, 4, P.crm);                         // pointed snout
    ellipse(g, CX, 30, 1.8, 1.3, P.navy);                 // nose
    eyes(g, CX, 26, 7);
    smileArc(g, CX, 33, 2.4, 1);
    blush(g, CX - 10, 30); blush(g, CX + 10, 30);
  }});

S.push({ name: 'mural', draw(g) {
    rrect(g, 8, 12, 55, 50, 3, P.brn);                    // frame
    rect(g, 12, 16, 51, 46, P.sky);                       // painted sky
    ellipse(g, 44, 22, 4, 4, P.yel);                      // painted sun
    ellipse(g, 22, 45, 13, 8, P.grn);                     // painted hills
    ellipse(g, 40, 46, 11, 7, P.lim);
    eyes(g, CX, 29, 6);
    smileArc(g, CX, 35, 3, 1.4);
    blush(g, CX - 12, 33); blush(g, CX + 12, 33);
  }});

S.push({ name: 'magician', draw(g) {
    tri(g, 17, 22, 46, 22, CX, 3, P.plum);                // hat shadow
    tri(g, 17, 22, 44, 22, CX - 1, 3, P.lav);             // wizard hat
    ellipse(g, CX, 9, 2.4, 2.4, P.yel);                   // hat star
    rrect(g, 13, 22, 50, 27, 2, P.lav);                   // brim
    ball(g, CX, 52, 11, 8, P.sky, P.lav);                 // robe
    ball(g, CX, 36, 12, 11, P.pch, P.brn);                // face
    tri(g, 24, 44, 39, 44, CX, 58, P.crm);                // white beard
    eyes(g, CX, 35, 6);
    smileArc(g, CX, 41, 2.4, 1);
    disc(g, 50, 46, 2, P.yel);                            // wand star
    stroke(g, [[45, 54], [50, 46]], 1.2, 1, P.brn);       // wand
    blush(g, CX - 9, 39); blush(g, CX + 9, 39);
  }});

S.push({ name: 'sandpaper', draw(g) {
    rrect(g, 14, 13, 49, 51, 2, P.brn);                   // sheet edge
    rrect(g, 13, 12, 47, 49, 2, P.pch);                   // tan sheet
    clipTo(g, [P.pch], function () {
      for (let i = 0; i < 48; i++) { const h = (i * 2654435761) >>> 0; g.set(15 + (h % 33), 15 + ((h >> 8) % 33), P.brn); } // scattered grit
    });
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 37, 3, 1.4);
    blush(g, CX - 12, 34); blush(g, CX + 12, 34);
  }});

S.push({ name: 'clothesline', draw(g) {
    stroke(g, [[3, 15], [61, 13]], 1, 1, P.brn);          // line
    rrect(g, 45, 16, 51, 30, 2, P.pnk);                   // hanging sock
    rect(g, 47, 14, 48, 18, P.dgy);                       // sock peg
    rect(g, 24, 12, 25, 17, P.dgy); rect(g, 39, 12, 40, 17, P.dgy); // shirt pegs
    tri(g, 15, 20, 23, 18, 23, 30, P.lav);                // sleeves
    tri(g, 49, 20, 41, 18, 41, 30, P.lav);
    rrect(g, 22, 17, 42, 48, 3, P.lav);                   // shirt shadow
    rrect(g, 21, 16, 41, 46, 3, P.sky);                   // shirt
    eyes(g, CX - 1, 30, 6);
    smileArc(g, CX - 1, 36, 2.6, 1.2);
    blush(g, 21, 34); blush(g, 40, 34);
  }});

S.push({ name: 'cuckoo', draw(g) {
    stroke(g, [[38, 42], [50, 48], [57, 51]], 3.4, 1.4, P.brn); // long tail
    ball(g, CX, 40, 12, 12, P.lgy, P.lav);                // body
    ellipse(g, CX, 42, 6, 7, P.crm);                      // breast
    ellipse(g, 20, 40, 3.4, 5, P.lav);                    // wing
    ball(g, CX, 22, 11, 10, P.lgy, P.lav);                // head
    disc(g, CX, 10, 2.2, P.brn);                          // crest tuft
    tri(g, 28, 26, 35, 26, CX, 32, P.org);                // beak
    eyes(g, CX, 22, 7);
    smileArc(g, CX, 34, 1.8, 0.7);
    blush(g, CX - 9, 26); blush(g, CX + 9, 26);
  }});

S.push({ name: 'mouthwash', draw(g) {
    rrect(g, 27, 6, 36, 12, 1, P.lgy);                    // cap
    rect(g, 28, 12, 35, 16, P.crm);                       // neck
    rrect(g, 17, 16, 47, 56, 5, P.lav);                   // bottle shadow
    rrect(g, 16, 16, 45, 54, 5, P.sky);                   // bottle
    ellipse(g, 20, 24, 2, 4, P.crm);                      // shine
    disc(g, 40, 22, 1.6, P.crm); disc(g, 42, 47, 1.4, P.crm); // bubbles
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 41, 3, 1.4);
    blush(g, CX - 12, 38); blush(g, CX + 12, 38);
  }});

S.push({ name: 'cornflakes', draw(g) {
    for (let i = 0; i < 11; i++) ball(g, 18 + i * 3, 26 + ((i * 7) % 6) - (i % 3), 3.4, 2.6, P.org, P.brn); // flakes
    ellipse(g, CX, 34, 18, 6, P.crm);                     // milk surface
    rrect(g, 12, 34, 51, 52, 8, P.lgy);                   // bowl shadow
    rrect(g, 12, 33, 50, 50, 8, P.sky);                   // bowl
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 47, 3, 1.4);
    blush(g, CX - 13, 45); blush(g, CX + 13, 45);
  }});

S.push({ name: 'soybean', draw(g) {
    ball(g, CX, 32, 21, 9, P.lim, P.grn);                 // pod
    clipTo(g, [P.lim, P.grn], function () {
      for (const bx of [18, 30, 42]) { disc(g, bx, 32, 6, P.grn); disc(g, bx, 31, 4.5, P.lim); } // bean bulges
    });
    stroke(g, [[11, 30], [6, 24]], 1.2, 1, P.grn);        // stem
    eyes(g, CX, 30, 5.5);
    smileArc(g, CX, 35, 2.4, 1);
    blush(g, CX - 14, 34); blush(g, CX + 14, 34);
  }});

S.push({ name: 'streetlight', draw(g) {
    ellipse(g, CX, 18, 13, 11, P.yel);                    // glow halo
    rrect(g, 22, 10, 41, 22, 4, P.org);                   // lamp head shadow
    rrect(g, 22, 9, 40, 20, 4, P.yel);                    // lamp head
    ellipse(g, CX, 20, 8, 3, P.crm);                      // lens
    rect(g, 29, 20, 34, 54, P.dgy);                       // post
    rect(g, 30, 20, 32, 54, P.lgy);                       // post highlight
    ellipse(g, CX, 57, 10, 3, P.dgy);                     // base
    eyes(g, CX, 14, 5.5);
    smileArc(g, CX, 18, 2.2, 1);
    blush(g, CX - 8, 16); blush(g, CX + 8, 16);
  }});

S.push({ name: 'welder', draw(g) {
    ball(g, CX, 50, 11, 8, P.org, P.brn);                 // apron body
    ball(g, 20, 48, 3.4, 3, P.org, P.brn); ball(g, 43, 48, 3.4, 3, P.org, P.brn); // arms
    ball(g, CX, 26, 15, 14, P.lgy, P.lav);                // helmet
    rrect(g, 20, 24, 43, 34, 2, P.dgy);                   // visor window
    ellipse(g, CX - 6, 29, 3, 2.6, P.crm); ellipse(g, CX + 6, 29, 3, 2.6, P.crm); // visor eye slots
    eyes(g, CX, 29, 5.5);
    smileArc(g, CX, 33, 2.2, 1);
    disc(g, 12, 52, 1.8, P.yel); disc(g, 15, 56, 1.3, P.org); disc(g, 9, 55, 1, P.yel); // friendly sparks
    blush(g, CX - 12, 38); blush(g, CX + 12, 38);
  }});

S.push({ name: 'koala', draw(g) {
    ball(g, 15, 22, 8, 8, P.lgy, P.lav); disc(g, 15, 22, 4.5, P.crm); // fuzzy ears
    ball(g, 48, 22, 8, 8, P.lgy, P.lav); disc(g, 48, 22, 4.5, P.crm);
    ball(g, CX, 48, 11, 9, P.lgy, P.lav);                 // body
    ellipse(g, CX, 49, 6, 6, P.crm);                      // belly
    ball(g, 22, 52, 3.4, 3, P.lgy, P.lav); ball(g, 41, 52, 3.4, 3, P.lgy, P.lav); // feet
    ball(g, CX, 28, 14, 12, P.lgy, P.lav);                // head
    ellipse(g, CX, 33, 5.5, 6, P.dgy);                    // big nose
    ellipse(g, CX, 32, 4, 4.5, P.navy);
    eyes(g, CX, 26, 8);
    smileArc(g, CX, 40, 2.4, 1);
    blush(g, CX - 12, 34); blush(g, CX + 12, 34);
  }});

S.push({ name: 'maze', draw(g) {
    rrect(g, 10, 10, 53, 53, 3, P.lav);                   // border shadow
    rrect(g, 9, 9, 51, 51, 3, P.sky);                     // panel
    clipTo(g, [P.sky], function () {                      // walls
      rect(g, 16, 9, 17, 40, P.navy); rect(g, 16, 40, 40, 41, P.navy);
      rect(g, 24, 16, 25, 47, P.navy); rect(g, 32, 9, 33, 30, P.navy);
      rect(g, 40, 20, 41, 51, P.navy); rect(g, 24, 16, 47, 17, P.navy);
    });
    ellipse(g, CX, 30, 8, 7, P.sky);                      // clear a face cell
    eyes(g, CX, 28, 5);
    smileArc(g, CX, 34, 2.2, 1);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'unicycle', draw(g) {
    ball(g, CX, 42, 16, 16, P.dgy, P.lav);                // tyre
    disc(g, CX, 42, 11, P.lgy);                           // rim gap
    for (let a = 0; a < 8; a++) { const th = a / 8 * Math.PI * 2; stroke(g, [[CX, 42], [CX + Math.cos(th) * 11, 42 + Math.sin(th) * 11]], 0.8, 0.6, P.lav); } // spokes
    disc(g, CX, 42, 3, P.dgy);                            // hub
    rect(g, 30, 14, 33, 26, P.red);                       // seat post
    rrect(g, 24, 8, 39, 15, 3, P.red);                    // saddle
    rect(g, 22, 44, 26, 46, P.dgy); rect(g, 38, 44, 42, 46, P.dgy); // pedals
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.6, 1.2);
    blush(g, CX - 9, 44); blush(g, CX + 9, 44);
  }});

S.push({ name: 'shrubbery', draw(g) {
    for (let a = 0; a < 10; a++) { const th = a / 10 * Math.PI * 2; disc(g, CX + Math.cos(th) * 15, 34 + Math.sin(th) * 13, 5, P.grn); } // bumpy leaves
    ball(g, CX, 34, 16, 14, P.lim, P.grn);                // bush
    disc(g, 20, 24, 2.2, P.pnk); disc(g, 42, 40, 2.2, P.yel); disc(g, 40, 22, 2, P.pnk); // flowers
    ellipse(g, CX, 54, 12, 3, P.grn);                     // base
    eyes(g, CX, 34, 7);
    smileArc(g, CX, 41, 2.8, 1.2);
    blush(g, CX - 11, 38); blush(g, CX + 11, 38);
  }});

S.push({ name: 'spring', draw(g) {
    for (let i = 0; i < 6; i++) {
      const y = 16 + i * 6, dx = (i % 2) ? 2 : -2;
      ellipse(g, CX + dx, y, 13, 3.5, P.lgy);             // coil ring shadow
      ellipse(g, CX + dx, y - 1, 12, 2.6, P.crm);
    }
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 36, 2.6, 1.2);
    blush(g, CX - 12, 33); blush(g, CX + 12, 33);
  }});

S.push({ name: 'hedgehog', draw(g) {
    for (let a = 0; a < 13; a++) {                        // upper spikes
      const th = Math.PI * (1 + a / 12), bx = CX + Math.cos(th) * 12, by = 30 + Math.sin(th) * 12;
      tri(g, bx - 3, by + 2, bx + 3, by + 2, CX + Math.cos(th) * 20, 30 + Math.sin(th) * 20, P.brn);
    }
    ball(g, CX, 34, 15, 13, P.brn, P.plum);               // spiny dome
    ball(g, CX, 42, 12, 10, P.pch, P.brn);                // face
    ellipse(g, CX, 47, 2.2, 1.6, P.navy);                 // nose
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 45, 2.2, 1);
    blush(g, CX - 10, 44); blush(g, CX + 10, 44);
  }});

S.push({ name: 'splint', draw(g) {
    rrect(g, 23, 8, 40, 58, 3, P.brn);                    // board edge
    rrect(g, 22, 8, 38, 56, 3, P.pch);                    // wood board
    rect(g, 24, 12, 36, 13, P.brn); rect(g, 24, 50, 36, 51, P.brn); // grain
    rect(g, 18, 18, 42, 23, P.red);                       // strap 1
    rect(g, 18, 41, 42, 46, P.red);                       // strap 2
    eyes(g, CX, 31, 6);
    smileArc(g, CX, 37, 2.6, 1.2);
    blush(g, CX - 9, 35); blush(g, CX + 9, 35);
  }});

S.push({ name: 'turtleneck', draw(g) {
    rrect(g, 16, 32, 24, 52, 3, P.pnk); rrect(g, 40, 32, 48, 52, 3, P.pnk); // sleeves
    rrect(g, 22, 28, 42, 56, 4, P.plum);                  // sweater shadow
    rrect(g, 21, 27, 41, 54, 4, P.pnk);                   // sweater body
    rrect(g, 24, 12, 39, 27, 6, P.pnk);                   // rolled collar
    rect(g, 24, 21, 39, 27, P.plum);                      // collar fold
    ellipse(g, CX, 14, 7, 3, P.plum);                     // neck hole
    eyes(g, CX, 38, 6);
    smileArc(g, CX, 44, 2.8, 1.2);
    blush(g, CX - 11, 41); blush(g, CX + 11, 41);
  }});

S.push({ name: 'barricade', draw(g) {
    rect(g, 20, 42, 24, 58, P.brn); rect(g, 40, 42, 44, 58, P.brn); // legs
    rrect(g, 10, 26, 53, 42, 2, P.crm);                   // board
    clipTo(g, [P.crm], function () {
      for (let d = -20; d < 60; d += 10) tri(g, d, 26, d + 6, 26, d - 10, 42, P.org); // diagonal stripes
    });
    eyes(g, CX, 31, 5.5);
    smileArc(g, CX, 36, 2.4, 1);
    blush(g, 18, 34); blush(g, 45, 34);
  }});

S.push({ name: 'transcript', draw(g) {
    rrect(g, 15, 8, 50, 58, 3, P.lgy);                    // paper edge
    rrect(g, 14, 7, 47, 55, 3, P.crm);                    // report card
    rect(g, 19, 14, 42, 15, P.lgy); rect(g, 19, 20, 42, 21, P.lgy); // rule lines
    disc(g, 38, 46, 4, P.yel); disc(g, 38, 41, 2, P.yel); disc(g, 33, 45, 2, P.yel); // gold star
    disc(g, 43, 45, 2, P.yel); disc(g, 35, 50, 2, P.yel); disc(g, 41, 50, 2, P.yel);
    eyes(g, CX - 2, 30, 6);
    smileArc(g, CX - 2, 36, 2.6, 1.2);
    blush(g, 18, 34); blush(g, 42, 34);
  }});

S.push({ name: 'birdhouse', draw(g) {
    rect(g, 30, 4, 33, 12, P.dgy);                        // hanger post
    tri(g, 12, 26, 51, 26, CX, 10, P.plum);               // roof shadow
    tri(g, 14, 26, 49, 26, CX, 12, P.red);                // roof
    rrect(g, 18, 26, 46, 54, 2, P.brn);                   // body shadow
    rrect(g, 17, 26, 44, 52, 2, P.org);                   // wood body
    disc(g, CX, 30, 4, P.brn);                            // entrance hole
    rect(g, 30, 33, 33, 37, P.brn);                       // perch
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.6, 1.1);
    blush(g, 22, 46); blush(g, 42, 46);
  }});

S.push({ name: 'geisha', draw(g) {
    ellipse(g, CX, 18, 17, 12, P.blk);                    // hair pouf
    ellipse(g, 16, 28, 5, 8, P.blk); ellipse(g, 47, 28, 5, 8, P.blk); // side hair
    disc(g, 20, 12, 2.4, P.red); disc(g, 43, 12, 2.4, P.red); // hair flowers
    ball(g, CX, 50, 12, 8, P.pnk, P.plum);                // kimono
    tri(g, 20, 44, CX, 42, 20, 56, P.pnk); tri(g, 43, 44, CX, 42, 43, 56, P.pnk); // sleeves
    ball(g, CX, 32, 12, 12, P.crm);                       // white face
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 40, 1.8, 0.9, P.red);                 // red lips
    blush(g, CX - 9, 36); blush(g, CX + 9, 36);
  }});

S.push({ name: 'mullet', draw(g) {
    tri(g, 24, 54, 39, 54, CX, 62, P.lav);                // tail flukes
    ball(g, 20, 46, 4, 3, P.lav); ball(g, 43, 46, 4, 3, P.lav); // pectoral fins
    tri(g, 26, 12, 37, 12, CX, 4, P.lav);                 // dorsal fin
    ball(g, CX, 34, 15, 16, P.lgy, P.lav);                // body/head
    ellipse(g, CX, 40, 8, 8, P.crm);                      // belly
    ellipse(g, CX, 41, 3, 2, P.org);                      // fish lips
    eyes(g, CX, 32, 8);
    smileArc(g, CX, 43, 2.4, 1, P.org);
    blush(g, CX - 12, 38); blush(g, CX + 12, 38);
  }});

S.push({ name: 'wharf', draw(g) {
    rect(g, 4, 48, 60, 60, P.sky);                        // water
    for (let x = 8; x < 58; x += 8) ellipse(g, x, 52, 3, 1, P.crm); // ripples
    rect(g, 14, 40, 18, 58, P.brn); rect(g, 30, 40, 34, 58, P.brn); rect(g, 46, 40, 50, 58, P.brn); // posts
    rrect(g, 8, 30, 55, 42, 2, P.plum);                   // deck shadow
    rrect(g, 8, 28, 55, 40, 2, P.brn);                    // deck planks
    for (let x = 14; x < 52; x += 8) rect(g, x, 28, x + 1, 40, P.plum); // plank seams
    eyes(g, CX, 32, 6);
    smileArc(g, CX, 37, 2.6, 1.2);
    blush(g, CX - 13, 35); blush(g, CX + 13, 35);
  }});

S.push({ name: 'tinsel', draw(g) {
    stroke(g, [[6, 20], [20, 16], [34, 20], [48, 16], [58, 20]], 2.5, 2.5, P.lgy); // garland cord
    for (let x = 8; x < 58; x += 4) {                     // shiny strands
      const c = (x % 8 === 0) ? P.yel : P.crm;
      stroke(g, [[x, 20], [x + 1, 34 + ((x * 7) % 10)]], 1.4, 0.6, c);
    }
    disc(g, 14, 12, 1.6, P.yel); disc(g, 44, 11, 1.6, P.crm); // sparkles
    ellipse(g, CX, 18, 8, 5, P.lgy);                      // face node
    eyes(g, CX, 17, 5);
    smileArc(g, CX, 22, 2.2, 1);
    blush(g, CX - 8, 20); blush(g, CX + 8, 20);
  }});

S.push({ name: 'farmland', draw(g) {
    ellipse(g, CX, 40, 26, 20, P.brn);                    // field mound shadow
    ellipse(g, CX, 38, 25, 18, P.org);                    // soil
    for (let i = 0; i < 6; i++) ellipse(g, CX, 30 + i * 5, 22 - i, 1.4, P.brn); // furrow rows
    ellipse(g, 12, 12, 5, 5, P.yel);                      // sun
    rect(g, 44, 26, 44, 32, P.grn); disc(g, 41, 28, 1.6, P.lim); disc(g, 47, 27, 1.6, P.lim); // sprout
    eyes(g, CX, 40, 6);
    smileArc(g, CX, 46, 2.8, 1.2);
    blush(g, CX - 13, 44); blush(g, CX + 13, 44);
  }});

S.push({ name: 'horseradish', draw(g) {
    ball(g,CX,40,13,16,P.crm,P.lgy);
    ellipse(g,CX,54,4,6,P.crm);
    disc(g,22,33,2,P.brn); disc(g,40,44,2,P.brn); disc(g,26,47,1.6,P.brn);
    ellipse(g,24,14,4,8,P.lim); ellipse(g,CX,11,4,9,P.grn); ellipse(g,40,14,4,8,P.lim);
    eyes(g,CX,38,6);
    smileArc(g,CX,45,2.6,1.1);
    blush(g,22,42); blush(g,42,42);
  }});

S.push({ name: 'incubator', draw(g) {
    ellipse(g,CX,11,6,4,P.lgy);
    stroke(g,[[CX,13],[CX,19]],1,1,P.dgy);
    disc(g,CX,11,2.4,P.org);
    rrect(g,10,20,54,55,3,P.lav);
    rrect(g,10,20,53,54,3,P.crm);
    rrect(g,15,26,49,43,2,P.navy);
    rect(g,17,28,47,41,P.sky);
    ball(g,23,37,4,5,P.crm,P.lgy); ball(g,32,37,4,5,P.crm,P.lgy); ball(g,41,37,4,5,P.crm,P.lgy);
    eyes(g,CX,48,4);
    smileArc(g,CX,52,2.2,0.9);
    blush(g,21,50); blush(g,42,50);
  }});

S.push({ name: 'sap', draw(g) {
    tri(g,CX,8,22,32,42,32,P.org);
    ball(g,CX,40,17,16,P.org,P.brn,P.yel);
    ellipse(g,24,34,3,5,P.yel);
    ellipse(g,CX,56,10,3,P.brn);
    eyes(g,CX,40,6);
    smileArc(g,CX,47,2.8,1.2);
    blush(g,21,44); blush(g,43,44);
  }});

S.push({ name: 'paintbrush', draw(g) {
    rrect(g,27,8,37,40,4,P.org);
    rect(g,26,38,38,44,P.lgy);
    tri(g,25,44,39,44,CX,58,P.plum);
    tri(g,26,44,38,44,CX,56,P.sky);
    disc(g,CX,57,3,P.sky);
    disc(g,44,50,2.5,P.pnk);
    eyes(g,CX,22,5);
    smileArc(g,CX,29,2.4,1);
    blush(g,23,26); blush(g,40,26);
  }});

S.push({ name: 'leek', draw(g) {
    ellipse(g,CX,15,4,10,P.lim); ellipse(g,25,16,4,9,P.grn); ellipse(g,38,16,4,9,P.grn);
    rrect(g,27,24,37,52,4,P.crm);
    rect(g,28,24,36,40,P.lim);
    ball(g,CX,52,7,6,P.crm,P.lgy);
    stroke(g, [[29,56],[27,60]],0.6,0.3,P.crm); stroke(g, [[34,56],[36,60]],0.6,0.3,P.crm);
    eyes(g,CX,44,5);
    smileArc(g,CX,49,2.2,1);
    blush(g,23,47); blush(g,41,47);
  }});

S.push({ name: 'hyena', draw(g) {
    disc(g,20,14,5,P.brn); disc(g,43,14,5,P.brn);
    disc(g,20,14,2.5,P.pch); disc(g,43,14,2.5,P.pch);
    ball(g,34,49,11,8,P.org,P.brn);
    clipTo(g,[P.org,P.brn],function(){ for (const [x,y] of [[30,46],[38,44],[34,52],[41,50]]) disc(g,x,y,1.6,P.brn); });
    ball(g,24,56,3.4,2.4,P.org,P.brn); ball(g,40,56,3.4,2.4,P.org,P.brn);
    ball(g,CX,25,14,12,P.org,P.brn);
    ellipse(g,CX,16,10,4,P.dgy);
    clipTo(g,[P.org,P.brn],function(){ disc(g,25,22,2,P.brn); disc(g,39,20,1.6,P.brn); });
    ball(g,CX,31,6,4.5,P.crm,P.lgy);
    ellipse(g,CX,28.5,1.8,1.3,P.navy);
    eyes(g,CX,24,7);
    smileArc(g,CX,32,2.4,1);
    blush(g,21,29); blush(g,41,29);
  }});

S.push({ name: 'pamphlet', draw(g) {
    rrect(g,14,12,50,56,2,P.lgy);
    rrect(g,12,10,46,54,2,P.crm);
    rect(g,28,10,30,54,P.lgy);
    rrect(g,15,15,27,32,1,P.sky);
    for (const y of [40,44,48]) rect(g,16,y,26,y+1,P.lav);
    for (const y of [16,20,24,28,32,36,40,44,48]) rect(g,33,y,44,y+1,P.lav);
    eyes(g,21,23,4);
    smileArc(g,21,28,2,0.9);
    blush(g,15,26); blush(g,27,26);
  }});

S.push({ name: 'dressing', draw(g) {
    rrect(g,23,24,41,54,5,P.lgy);
    rrect(g,23,24,40,53,5,P.crm);
    clipTo(g,[P.crm],function(){ rect(g,20,40,44,55,P.org); });
    rrect(g,27,12,37,24,2,P.red);
    rect(g,29,8,35,13,P.red);
    disc(g,32,4,2,P.org); disc(g,28,6,1.4,P.org);
    eyes(g,CX,32,5);
    smileArc(g,CX,37,2.4,1);
    blush(g,25,35); blush(g,39,35);
  }});

S.push({ name: 'gerbil', draw(g) {
    stroke(g, [[42,52],[52,50],[55,40]],1.6,0.8,P.pch);
    disc(g,22,18,5,P.pch); disc(g,42,18,5,P.pch);
    disc(g,22,18,2.6,P.pnk); disc(g,42,18,2.6,P.pnk);
    ball(g,CX,46,11,9,P.org,P.brn);
    ellipse(g,CX,48,6,6,P.crm);
    ball(g,24,54,3,2.2,P.pch,P.brn); ball(g,39,54,3,2.2,P.pch,P.brn);
    ball(g,CX,28,12,11,P.org,P.brn);
    ball(g,CX,33,5,3.5,P.crm,P.lgy);
    ellipse(g,CX,30.5,1.6,1.2,P.pnk);
    eyes(g,CX,27,7);
    smileArc(g,CX,34,2,0.9);
    blush(g,22,31); blush(g,41,31);
  }});

S.push({ name: 'microwave', draw(g) {
    rrect(g,8,18,56,52,3,P.lgy);
    rrect(g,8,18,55,51,3,P.crm);
    rrect(g,12,22,40,48,2,P.navy);
    rrect(g,14,24,38,46,1,P.sky);
    rect(g,44,22,53,48,P.lav);
    for (const [x,y] of [[46,26],[50,26],[46,31],[50,31],[46,36],[50,36]]) disc(g,x,y,1.2,P.crm);
    eyes(g,26,33,5);
    smileArc(g,26,40,2.4,1);
    blush(g,18,37); blush(g,34,37);
  }});

S.push({ name: 'reins', draw(g) {
    stroke(g, [[15,9],[20,30],[CX,45]], 3,3, P.brn);
    stroke(g, [[48,9],[43,30],[CX,45]], 3,3, P.brn);
    stroke(g, [[15,9],[20,30],[CX,45]], 1.3,1.3, P.org);
    stroke(g, [[48,9],[43,30],[CX,45]], 1.3,1.3, P.org);
    rrect(g,13,17,22,25,1,P.lgy); rect(g,17,17,18,25,P.dgy);
    rrect(g,41,17,50,25,1,P.lgy); rect(g,45,17,46,25,P.dgy);
    disc(g,CX,47,5,P.lgy); disc(g,CX,47,2.4,P.lav);
    ball(g,CX,39,7,6,P.brn,P.plum);
    eyes(g,CX,38,4);
    smileArc(g,CX,42,2,0.9);
    blush(g,24,41); blush(g,40,41);
  }});

S.push({ name: 'yoke', draw(g) {
    stroke(g, [[9,30],[CX,20],[55,30]], 4,4, P.brn);
    stroke(g, [[9,30],[CX,20],[55,30]], 2,2, P.org);
    ball(g,CX,24,9,6,P.brn,P.plum);
    stroke(g, [[17,30],[15,46],[24,48],[27,36]], 2.2,2.2, P.dgy);
    stroke(g, [[41,36],[44,48],[53,46],[51,30]], 2.2,2.2, P.dgy);
    eyes(g,CX,23,5);
    smileArc(g,CX,28,2.4,1);
    blush(g,22,26); blush(g,42,26);
  }});

S.push({ name: 'plywood', draw(g) {
    rrect(g,10,20,54,44,2,P.brn);
    rect(g,10,44,54,52,P.org);
    for (const y of [45,47,49,51]) rect(g,10,y,54,y+1,P.brn);
    clipTo(g,[P.brn],function(){ for (const y of [24,30,36]) stroke(g,[[14,y],[50,y+1]],0.5,0.5,P.plum); });
    eyes(g,CX,30,6);
    smileArc(g,CX,37,2.6,1.1);
    blush(g,20,35); blush(g,44,35);
  }});

S.push({ name: 'suspenders', draw(g) {
    rrect(g,16,16,48,42,4,P.crm);
    rrect(g,18,40,46,57,3,P.navy);
    rect(g,21,14,27,42,P.red);
    rect(g,37,14,43,42,P.red);
    rect(g,20,12,28,16,P.dgy); rect(g,36,12,44,16,P.dgy);
    rrect(g,20,38,28,44,1,P.yel); rrect(g,36,38,44,44,1,P.yel);
    eyes(g,CX,26,5);
    smileArc(g,CX,32,2.4,1);
    blush(g,22,29); blush(g,42,29);
  }});

S.push({ name: 'athlete', draw(g) {
    ball(g,CX,48,10,8,P.red,P.plum);
    disc(g,CX,48,3,P.yel);
    ball(g,22,56,3.6,2.4,P.pch,P.brn); ball(g,40,58,3.6,2.4,P.pch,P.brn);
    ball(g,19,46,3,2.4,P.pch,P.brn); ball(g,44,46,3,2.4,P.pch,P.brn);
    ball(g,CX,26,13,12,P.pch,P.brn);
    ellipse(g,CX,16,12,5,P.brn);
    rect(g,20,17,43,20,P.sky);
    eyes(g,CX,27,6);
    smileArc(g,CX,33,2.6,1.1);
    blush(g,21,31); blush(g,41,31);
  }});

S.push({ name: 'switchboard', draw(g) {
    rrect(g,10,14,54,54,3,P.dgy);
    rrect(g,13,17,51,50,2,P.navy);
    for (const [x,y] of [[20,24],[28,24],[36,24],[44,24],[20,32],[28,32],[36,32],[44,32]]) disc(g,x,y,2,P.lgy);
    for (const [x,y] of [[20,24],[28,24],[36,24],[44,24],[20,32],[28,32],[36,32],[44,32]]) disc(g,x,y,1,P.blk);
    stroke(g, [[20,24],[16,42],[36,32]], 1,1, P.red);
    stroke(g, [[28,24],[24,44],[44,32]], 1,1, P.lim);
    disc(g,20,24,1.6,P.red); disc(g,36,32,1.6,P.red);
    disc(g,28,24,1.6,P.lim); disc(g,44,32,1.6,P.lim);
    eyes(g,CX,42,5);
    smileArc(g,CX,47,2.4,1);
    blush(g,22,45); blush(g,41,45);
  }});

S.push({ name: 'keyhole', draw(g) {
    rrect(g,18,10,46,56,6,P.org);
    rrect(g,18,10,45,55,6,P.yel);
    disc(g,21,15,1.4,P.brn); disc(g,43,15,1.4,P.brn);
    disc(g,21,51,1.4,P.brn); disc(g,43,51,1.4,P.brn);
    disc(g,CX,32,5,P.navy);
    tri(g,28,36,35,36,CX,48,P.navy);
    eyes(g,CX,20,4);
    smileArc(g,CX,24,2,0.9);
    blush(g,24,22); blush(g,40,22);
  }});

S.push({ name: 'vote', draw(g) {
    rrect(g,14,30,50,56,3,P.lav);
    rrect(g,14,30,49,55,3,P.sky);
    rect(g,22,28,42,32,P.navy);
    rrect(g,24,10,40,30,1,P.crm);
    stroke(g, [[27,20],[30,24],[37,15]], 1.2,1.2, P.grn);
    eyes(g,CX,44,5);
    smileArc(g,CX,49,2.4,1);
    blush(g,22,47); blush(g,42,47);
  }});

S.push({ name: 'hairnet', draw(g) {
    ball(g,CX,32,17,17,P.pch,P.brn);
    ellipse(g,CX,18,16,9,P.dgy);
    clipTo(g,[P.dgy],function(){
      for (let x=16;x<=48;x+=4) stroke(g,[[x,10],[x,26]],0.4,0.4,P.crm);
      for (let y=12;y<=24;y+=4) stroke(g,[[16,y],[48,y]],0.4,0.4,P.crm);
    });
    rect(g,15,10,48,11,P.lgy);
    eyes(g,CX,32,7);
    ellipse(g,CX,38,2,1.4,P.brn);
    smileArc(g,CX,44,3,1.3);
    blush(g,20,40); blush(g,44,40);
  }});

S.push({ name: 'librarian', draw(g) {
    ball(g,CX,49,10,8,P.plum);
    ball(g,26,57,4,2.6,P.pch,P.brn); ball(g,37,57,4,2.6,P.pch,P.brn);
    rrect(g,23,43,41,54,1,P.red); rect(g,31,43,32,54,P.crm);
    ball(g,20,46,3,2.4,P.pch,P.brn); ball(g,43,46,3,2.4,P.pch,P.brn);
    ball(g,CX,27,14,13,P.pch,P.brn);
    ellipse(g,CX,15,13,6,P.dgy); disc(g,CX,10,3,P.dgy);
    eyes(g,CX,29,6);
    rect(g,21,26,43,27,P.navy); rect(g,31,28,32,30,P.navy);
    smileArc(g,CX,36,2.6,1);
    blush(g,CX-11,33); blush(g,CX+11,33);
  }});

S.push({ name: 'glacier', draw(g) {
    ellipse(g,CX,55,24,4,P.sky);
    tri(g,9,52,55,52,CX,10,P.lav);
    tri(g,12,52,52,52,CX,14,P.sky);
    tri(g,22,30,40,30,CX,12,P.crm);
    stroke(g, [[24,52],[28,36]],0.6,0.6,P.lav);
    stroke(g, [[42,52],[36,34]],0.6,0.6,P.lav);
    ellipse(g,20,44,3,5,P.crm); ellipse(g,44,46,3,4,P.crm);
    eyes(g,CX,40,6);
    smileArc(g,CX,47,2.6,1.1);
    blush(g,21,45); blush(g,42,45);
  }});

S.push({ name: 'manhole', draw(g) {
    disc(g,CX,34,22,P.dgy);
    disc(g,CX,33,21,P.lgy);
    disc(g,CX,34,18,P.dgy);
    disc(g,CX,33,17,P.lav);
    for (let a=0;a<12;a++){ const th=a/12*Math.PI*2; stroke(g,[[CX+Math.cos(th)*6,34+Math.sin(th)*6],[CX+Math.cos(th)*15,34+Math.sin(th)*15]],0.6,0.6,P.dgy); }
    disc(g,CX,34,5,P.lgy);
    eyes(g,CX,32,5);
    smileArc(g,CX,38,2.4,1);
    blush(g,22,36); blush(g,41,36);
  }});

S.push({ name: 'termite', draw(g) {
    ball(g,CX,48,13,9,P.crm,P.lgy);
    ellipse(g,CX,40,7,5,P.crm);
    stroke(g, [[22,44],[14,50]],1,0.6,P.pch); stroke(g, [[42,44],[50,50]],1,0.6,P.pch);
    stroke(g, [[24,46],[16,54]],1,0.6,P.pch); stroke(g, [[40,46],[48,54]],1,0.6,P.pch);
    ball(g,CX,26,12,11,P.pch,P.brn);
    stroke(g, [[24,17],[19,12]],1,0.5,P.brn); stroke(g, [[40,17],[45,12]],1,0.5,P.brn);
    rect(g,26,16,30,18,P.brn); rect(g,33,16,37,18,P.brn);
    eyes(g,CX,26,6);
    smileArc(g,CX,32,2.4,1);
    blush(g,22,30); blush(g,41,30);
  }});

S.push({ name: 'shaved', draw(g) {
    tri(g,16,38,47,38,CX,58,P.lav);
    tri(g,18,38,45,38,CX,55,P.sky);
    ball(g,CX,30,17,13,P.crm,P.lgy);
    rect(g,15,36,48,40,P.lgy);
    clipTo(g,[P.crm,P.lgy],function(){
      ellipse(g,24,24,5,3,P.pnk); ellipse(g,40,28,5,3,P.sky); ellipse(g,32,20,4,3,P.red);
    });
    disc(g,CX,14,2.5,P.red); rect(g,31,10,32,14,P.grn);
    eyes(g,CX,31,6);
    smileArc(g,CX,37,2.6,1.1);
    blush(g,20,35); blush(g,43,35);
  }});

S.push({ name: 'magnolia', draw(g) {
    for (let a=0;a<6;a++){ const th=a/6*Math.PI*2; ball(g,CX+Math.cos(th)*13,32+Math.sin(th)*13,8,7,P.pnk,P.plum); }
    for (let a=0;a<6;a++){ const th=(a/6+0.08)*Math.PI*2; ball(g,CX+Math.cos(th)*7,32+Math.sin(th)*7,6,5,P.crm,P.lgy); }
    stroke(g, [[CX,44],[36,58]],1.6,1,P.grn);
    ellipse(g,42,52,5,2.6,P.lim);
    disc(g,CX,32,6,P.yel); disc(g,CX,33,5,P.org);
    eyes(g,CX,32,3.5);
    smileArc(g,CX,36,1.8,0.8);
    blush(g,26,35); blush(g,38,35);
  }});

S.push({ name: 'dominoes', draw(g) {
    rrect(g,22,10,46,58,3,P.lgy);
    rrect(g,18,8,42,56,3,P.crm);
    rect(g,18,31,42,33,P.dgy);
    eyes(g,30,20,5);
    smileArc(g,30,26,2.4,1);
    blush(g,22,23); blush(g,38,23);
    for (const [x,y] of [[24,40],[30,45],[36,50],[24,50],[36,40]]) disc(g,x,y,2.2,P.navy);
  }});

S.push({ name: 'paratrooper', draw(g) {                // 傘兵 saan3 bing1
    ball(g, CX, 15, 21, 11, P.red, P.plum);              // parachute canopy
    clipTo(g, [P.red, P.plum], function () {
      for (const x of [16, CX, 47]) stroke(g, [[CX, 4], [x, 26]], 0.7, 0.7, P.plum);
    });
    stroke(g, [[13, 22], [25, 37]], 0.8, 0.6, P.dgy);    // suspension lines
    stroke(g, [[50, 22], [38, 37]], 0.8, 0.6, P.dgy);
    ball(g, CX, 51, 8, 8, P.grn, P.dgy);                 // trooper body
    ball(g, 27, 58, 3.5, 2.6, P.grn, P.dgy); ball(g, 36, 58, 3.5, 2.6, P.grn, P.dgy); // boots
    ball(g, CX, 41, 7, 6, P.pch, P.brn);                 // head
    ellipse(g, CX, 37, 8, 4, P.grn);                     // helmet cap
    eyes(g, CX, 41, 5);
    smileArc(g, CX, 46, 2.4, 1);
    blush(g, CX - 8, 44); blush(g, CX + 8, 44);
  }});

S.push({ name: 'tortilla', draw(g) {                   // 墨西哥薄餅 mak6 sai1 go1 bok6 beng2
    ellipse(g, CX, 40, 20, 6, P.lgy);                    // plate
    ball(g, CX, 35, 20, 14, P.pch, P.brn);               // round flatbread
    clipTo(g, [P.pch, P.brn], function () {              // toasted speckles
      for (const [x, y] of [[20, 28], [42, 27], [24, 42], [40, 43], [31, 24], [30, 46]]) disc(g, x, y, 1.4, P.brn);
    });
    ellipse(g, 45, 30, 8, 9, P.crm);                     // folded-up flap
    stroke(g, [[38, 22], [50, 34]], 0.8, 0.8, P.brn);    // fold crease
    eyes(g, 28, 34, 6);
    smileArc(g, 28, 40, 2.4, 1);
    blush(g, 19, 38); blush(g, 37, 38);
  }});

S.push({ name: 'bib', draw(g) {                        // 圍兜 wai4 dau1
    rrect(g, 12, 18, 51, 56, 11, P.plum);                // cloth trim (shadow)
    rrect(g, 14, 20, 49, 53, 9, P.pnk);                  // terry cloth
    ellipse(g, CX, 19, 6, 4, null);                      // shallow neck notch
    clipTo(g, [P.pnk, P.plum], function () {             // polka dots
      for (const [x, y] of [[20, 30], [43, 30], [21, 46], [42, 46], [CX, 38]]) disc(g, x, y, 2.2, P.crm);
    });
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.4, 1);
    blush(g, CX - 13, 45); blush(g, CX + 13, 45);
  }});

S.push({ name: 'gelatin', draw(g) {                    // 果凍 gwo2 dung3
    ellipse(g, CX, 55, 20, 5, P.lgy);                    // plate
    ball(g, CX, 40, 18, 15, P.red, P.plum, P.pnk);       // wobbly base tier
    ball(g, CX, 27, 12, 8, P.red, P.plum, P.pnk);        // top tier
    ellipse(g, CX, 24, 6, 2, P.plum);                    // mold ring notch
    ellipse(g, 22, 34, 3.5, 6, P.pnk);                   // glossy shine
    eyes(g, CX, 41, 7);
    smileArc(g, CX, 48, 2.8, 1.2);
    blush(g, CX - 12, 45); blush(g, CX + 12, 45);
  }});

S.push({ name: 'somersault', draw(g) {                 // 跟斗 gan1 dau2
    for (let a = 0; a < 11; a++) {                       // motion swoosh ring
      const th = (-0.35 + a / 11 * 1.75) * Math.PI;
      disc(g, CX + Math.cos(th) * 21, 34 + Math.sin(th) * 20, 2 - a * 0.09, P.sky);
    }
    tri(g, 45, 12, 52, 18, 47, 20, P.sky);               // arrow head on trail
    ball(g, CX, 36, 15, 14, P.org, P.brn);               // tucked body
    ball(g, 40, 24, 4, 3.4, P.pch, P.brn);               // knee/leg out
    ball(g, 44, 31, 3.6, 3.6, P.red, P.plum);            // shoe
    stroke(g, [[26, 44], [34, 48]], 1.4, 1, P.org);      // hugging arm
    ball(g, 22, 42, 7, 6, P.pch, P.brn);                 // head tucked low-left
    eyes(g, 22, 42, 5);
    smileArc(g, 22, 47, 2.2, 1);
    blush(g, 15, 45); blush(g, 29, 45);
  }});

S.push({ name: 'lilac', draw(g) {                      // 紫丁香 zi2 ding1 hoeng1
    ellipse(g, 18, 46, 6, 3.4, P.lim); ellipse(g, 45, 48, 6, 3.4, P.lim); // leaves
    stroke(g, [[CX, 30], [CX, 58]], 1.4, 0.9, P.grn);    // stem
    for (const [x, y] of [[CX, 10], [24, 16], [39, 16], [19, 24], [CX, 24], [44, 24], [23, 32], [40, 32], [CX, 34]])
      { disc(g, x, y, 4, P.lav); disc(g, x - 1, y - 1, 1, P.plum); } // floret cone
    eyes(g, CX, 22, 6);
    smileArc(g, CX, 28, 2.4, 1);
    blush(g, 20, 26); blush(g, 43, 26);
  }});

S.push({ name: 'okra', draw(g) {                       // 秋葵 cau1 kwai4
    ball(g, CX, 33, 9, 18, P.lim, P.grn);                // pod body
    tri(g, 23, 44, 40, 44, CX, 58, P.lim);               // tapered pointed tip
    clipTo(g, [P.lim, P.grn], function () {              // ridged ribs
      for (const x of [27, CX, 36]) stroke(g, [[x, 20], [x, 52]], 0.6, 0.6, P.grn);
    });
    ball(g, CX, 17, 7, 5, P.grn, P.dgy);                 // cap
    stroke(g, [[CX, 14], [CX, 8]], 1, 0.6, P.grn);       // stem
    eyes(g, CX, 32, 5);
    smileArc(g, CX, 38, 2.2, 1);
    blush(g, 24, 36); blush(g, 39, 36);
  }});

S.push({ name: 'hairdryer', draw(g) {                  // 電風筒 din6 fung1 tung2
    for (const [x, y] of [[10, 18], [7, 26], [10, 34]]) { stroke(g, [[22, 26], [x, y]], 0.8, 0.5, P.sky); } // air puffs
    ball(g, 37, 27, 15, 12, P.pnk, P.plum);              // barrel
    rrect(g, 16, 20, 26, 34, 3, P.lav);                  // nozzle ring
    rrect(g, 28, 38, 42, 58, 4, P.pnk);                  // handle
    disc(g, 48, 27, 4, P.lav);                           // back vent
    eyes(g, 38, 26, 6);
    smileArc(g, 38, 32, 2.4, 1);
    blush(g, 30, 30); blush(g, 46, 30);
  }});

S.push({ name: 'hilltop', draw(g) {                    // 山頂 saan1 deng2
    tri(g, 6, 52, 58, 52, CX, 8, P.grn);                 // peak (shadow)
    tri(g, 6, 52, 42, 52, 25, 11, P.lim);                // lit face
    tri(g, 22, 22, 41, 22, CX, 8, P.crm);                // snow cap
    stroke(g, [[CX, 8], [CX, 2]], 0.9, 0.9, P.dgy);      // flag pole
    tri(g, 33, 2, 33, 8, 44, 5, P.red);                  // summit flag
    ellipse(g, CX, 52, 26, 4, P.grn);                    // ground
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 47, 3, 1.3);
    blush(g, CX - 12, 44); blush(g, CX + 12, 44);
  }});

S.push({ name: 'valet', draw(g) {                      // 泊車仔 paak3 ce1 zai2
    ball(g, CX, 48, 11, 9, P.red, P.plum);               // vest body
    rect(g, 30, 40, 33, 55, P.crm);                      // shirt front
    ball(g, 25, 57, 4, 3, P.navy); ball(g, 38, 57, 4, 3, P.navy); // shoes
    stroke(g, [[42, 44], [48, 34]], 1.6, 1.2, P.red);    // raised arm
    disc(g, 49, 30, 4, P.yel); disc(g, 49, 30, 2, P.crm); rect(g, 48, 30, 55, 32, P.yel); // key held up
    ball(g, CX, 26, 11, 10, P.pch, P.brn);               // head
    ellipse(g, CX, 17, 8, 4, P.red);                     // pillbox cap
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 32, 2.4, 1);
    blush(g, CX - 9, 30); blush(g, CX + 9, 30);
  }});

S.push({ name: 'pug', draw(g) {                        // 巴哥 baa1 go1
    stroke(g, [[43, 50], [50, 48], [50, 42], [45, 43]], 1.6, 1, P.pch); // curled tail
    ball(g, CX, 50, 10, 8, P.pch, P.brn);                // body
    ball(g, 25, 57, 4, 3, P.pch, P.brn); ball(g, 38, 57, 4, 3, P.pch, P.brn); // feet
    ball(g, CX, 27, 15, 13, P.pch, P.brn);               // big head
    tri(g, 15, 16, 23, 16, 17, 26, P.dgy); tri(g, 49, 16, 41, 16, 47, 26, P.dgy); // floppy ears
    ellipse(g, CX, 33, 9, 6, P.dgy);                     // squished dark muzzle
    stroke(g, [[26, 22], [31, 24]], 0.6, 0.6, P.brn); stroke(g, [[37, 22], [32, 24]], 0.6, 0.6, P.brn); // forehead wrinkles
    ellipse(g, CX, 30, 2, 1.4, P.navy);                  // nose
    eyes(g, CX, 25, 7);
    smileArc(g, CX, 35, 2.4, 1);
    blush(g, CX - 12, 31); blush(g, CX + 12, 31);
  }});

S.push({ name: 'dumpling', draw(g) {                   // 餃子 gaau2 zi2
    ball(g, CX, 42, 19, 13, P.crm, P.lgy);               // plump pouch
    ellipse(g, CX, 50, 15, 4, P.lgy);                    // browned base
    for (let i = 0; i < 6; i++) {                        // pleated top crest
      const x = 15 + i * 6.5;
      disc(g, x, 28 - Math.abs(i - 2.5) * 1.2, 3.4, P.crm);
    }
    clipTo(g, [P.crm], function () {
      for (let i = 0; i < 5; i++) stroke(g, [[18 + i * 6, 24], [18 + i * 6, 32]], 0.5, 0.5, P.lgy);
    });
    eyes(g, CX, 42, 6);
    smileArc(g, CX, 48, 2.6, 1.1);
    blush(g, CX - 12, 45); blush(g, CX + 12, 45);
  }});

S.push({ name: 'generator', draw(g) {                  // 發電機 faat3 din6 gei1
    stroke(g, [[18, 16], [46, 16]], 1.4, 1.4, P.dgy);    // top carry handle
    rrect(g, 12, 18, 52, 52, 4, P.lav);                  // box (shadow)
    rrect(g, 12, 18, 50, 50, 4, P.lgy);                  // box body
    disc(g, 44, 14, 3, P.dgy);                           // fuel cap
    rect(g, 14, 52, 20, 56, P.dgy); rect(g, 44, 52, 50, 56, P.dgy); // feet
    rrect(g, 30, 30, 47, 46, 2, P.crm);                  // panel
    tri(g, 40, 30, 34, 39, 39, 39, P.yel); tri(g, 39, 37, 44, 37, 37, 46, P.yel); // lightning bolt
    disc(g, 34, 24, 2, P.red); disc(g, 40, 24, 2, P.grn); // knobs
    eyes(g, 21, 33, 5);
    smileArc(g, 21, 39, 2.2, 1);
    blush(g, 15, 37); blush(g, 27, 37);
  }});

S.push({ name: 'trapeze', draw(g) {                    // 吊槓 diu3 gong3
    disc(g, CX, 7, 3, P.dgy);                            // top ring
    stroke(g, [[CX, 8], [15, 40]], 0.8, 0.7, P.brn);     // ropes
    stroke(g, [[CX, 8], [48, 40]], 0.8, 0.7, P.brn);
    disc(g, 15, 40, 2, P.yel); disc(g, 48, 40, 2, P.yel); // knots
    rrect(g, 11, 40, 52, 49, 4, P.brn);                  // swing bar
    ellipse(g, CX, 42, 16, 1.4, P.org);                  // bar highlight
    eyes(g, CX, 44, 5);
    smileArc(g, CX, 47, 2.2, 0.9);
    blush(g, 20, 46); blush(g, 43, 46);
  }});

S.push({ name: 'nutmeg', draw(g) {                     // 肉豆蔻 juk6 dau6 kau3
    ball(g, CX, 34, 15, 18, P.brn, P.plum, P.org);       // egg-shaped seed
    clipTo(g, [P.brn, P.plum, P.org], function () {      // marbled grooves
      stroke(g, [[24, 18], [22, 34], [26, 50]], 0.7, 0.7, P.plum);
      stroke(g, [[33, 17], [31, 33], [34, 51]], 0.7, 0.7, P.plum);
      stroke(g, [[41, 19], [43, 34], [39, 49]], 0.7, 0.7, P.plum);
    });
    ellipse(g, 24, 24, 3, 5, P.org);                     // shine
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 41, 2.4, 1);
    blush(g, CX - 11, 38); blush(g, CX + 11, 38);
  }});

S.push({ name: 'tightrope', draw(g) {                  // 鋼絲 gong3 si1
    stroke(g, [[4, 51], [60, 51]], 1.3, 1.3, P.lgy);     // taut wire
    disc(g, 6, 51, 2, P.dgy); disc(g, 57, 51, 2, P.dgy); // anchor posts
    ball(g, CX, 40, 7, 8, P.red, P.plum);                // balancer body
    ball(g, 27, 50, 3, 2.4, P.navy); ball(g, 36, 50, 3, 2.4, P.navy); // feet on wire
    stroke(g, [[7, 37], [56, 37]], 1, 1, P.dgy);         // long balance pole
    disc(g, 8, 37, 2, P.pch); disc(g, 55, 37, 2, P.pch); // hands gripping
    ball(g, CX, 29, 7, 6, P.pch, P.brn);                 // head
    eyes(g, CX, 29, 5);
    smileArc(g, CX, 34, 2.2, 1);
    blush(g, CX - 8, 32); blush(g, CX + 8, 32);
  }});

S.push({ name: 'boatman', draw(g) {
    ball(g, CX, 57, 17, 5, P.brn, P.plum);                // boat hull
    ellipse(g, CX, 55, 15, 2.5, P.org);                   // hull rim
    stroke(g, [[46, 30], [53, 44], [55, 54]], 1.4, 2.2, P.brn); // oar shaft
    ball(g, 55, 55, 4, 2.6, P.brn, P.plum);               // oar blade
    ball(g, CX, 46, 11, 7, P.sky, P.lav);                 // striped shirt
    clipTo(g, [P.sky, P.lav], () => { rect(g, 21, 42, 42, 43, P.crm); rect(g, 21, 47, 42, 48, P.crm); });
    ball(g, 45, 46, 3, 3, P.pch, P.brn);                  // hand on oar
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 14, 13, 4, P.crm);                     // sailor hat brim
    ball(g, CX, 10, 8, 5, P.crm, P.lgy);                  // hat crown
    disc(g, CX, 9, 2, P.red);                             // pompom
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 34, 2.6, 1.2);
    blush(g, CX - 9, 32); blush(g, CX + 9, 32);
  }});

S.push({ name: 'eucalyptus', draw(g) {
    rect(g, 29, 30, 34, 57, P.dgy);                       // trunk shadow
    rect(g, 29, 30, 32, 57, P.brn);                       // trunk
    ellipse(g, 18, 33, 2.5, 5.5, P.grn);                  // sickle leaves
    ellipse(g, 45, 33, 2.5, 5.5, P.grn);
    ball(g, 20, 20, 9, 9, P.sky, P.lav);                  // foliage clusters
    ball(g, 43, 20, 9, 9, P.sky, P.lav);
    ball(g, CX, 22, 14, 13, P.sky, P.lav);                // main canopy
    eyes(g, CX, 22, 7);
    smileArc(g, CX, 29, 2.6, 1.2);
    blush(g, CX - 11, 27); blush(g, CX + 11, 27);
  }});

S.push({ name: 'phonograph', draw(g) {
    ball(g, 47, 16, 12, 13, P.org, P.brn);                // horn bell
    ellipse(g, 47, 16, 8, 9, P.yel);                      // bell opening
    ellipse(g, 47, 16, 4, 4.5, P.org);                    // depth
    stroke(g, [[38, 44], [42, 34], [40, 26]], 2.2, 3, P.dgy); // horn neck
    rrect(g, 12, 38, 45, 58, 4, P.plum);                  // box shadow
    rrect(g, 12, 38, 43, 56, 4, P.brn);                   // wood box
    rect(g, 15, 41, 40, 42, P.org);                       // trim highlight
    eyes(g, 27, 47, 6);
    smileArc(g, 27, 53, 2.6, 1.2);
    blush(g, 18, 51); blush(g, 37, 51);
  }});

S.push({ name: 'vacuum', draw(g) {
    stroke(g, [[40, 32], [50, 26], [52, 16], [46, 10]], 2, 2, P.dgy); // hose
    rect(g, 42, 6, 48, 12, P.lgy);                        // wand handle
    ball(g, CX, 42, 15, 13, P.sky, P.lav);                // canister
    disc(g, CX, 42, 6, P.lgy); disc(g, CX, 42, 4.5, P.crm); // filter dial
    rect(g, 19, 54, 44, 58, P.dgy);                       // wheel bar
    disc(g, 22, 57, 3, P.navy); disc(g, 41, 57, 3, P.navy);
    eyes(g, CX, 38, 7);
    smileArc(g, CX, 46, 2.8, 1.2);
    blush(g, CX - 11, 43); blush(g, CX + 11, 43);
  }});

S.push({ name: 'token', draw(g) {
    ball(g, CX, 33, 18, 18, P.yel, P.org);                // coin
    for (let a = 0; a < 28; a++) { const th = a / 28 * Math.PI * 2; g.set(Math.round(CX + Math.cos(th) * 17), Math.round(33 + Math.sin(th) * 17), P.org); } // milled edge
    ellipse(g, CX, 33, 13, 13, P.yel);
    tri(g, CX, 18, 27, 24, 36, 24, P.org);                // star point
    tri(g, 27, 22, 36, 22, CX, 27, P.org);                // star base
    eyes(g, CX, 34, 6);
    smileArc(g, CX, 40, 2.6, 1.1);
    blush(g, CX - 10, 38); blush(g, CX + 10, 38);
  }});

S.push({ name: 'bridesmaid', draw(g) {
    tri(g, 20, 58, 43, 58, CX, 40, P.pnk);                // dress skirt
    ellipse(g, CX, 58, 12, 3, P.plum);                    // hem shadow
    ball(g, CX, 42, 8, 6, P.pnk, P.plum);                 // bodice
    ball(g, 20, 48, 3.5, 4, P.pnk, P.plum);               // arm
    ball(g, 43, 48, 3.5, 4, P.pnk, P.plum);
    ball(g, 45, 50, 4, 4, P.lim, P.grn);                  // bouquet greenery
    disc(g, 43, 48, 2, P.red); disc(g, 47, 50, 2, P.yel); disc(g, 44, 52, 2, P.org); // flowers
    ball(g, CX, 24, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 14, 13, 6, P.brn);                     // hair
    ellipse(g, 19, 24, 2.5, 5, P.brn); ellipse(g, 44, 24, 2.5, 5, P.brn);
    disc(g, 22, 16, 2.5, P.pnk);                          // hair flower
    eyes(g, CX, 26, 6);
    smileArc(g, CX, 33, 2.6, 1.2);
    blush(g, CX - 10, 31); blush(g, CX + 10, 31);
  }});

S.push({ name: 'bugler', draw(g) {
    ball(g, CX, 47, 10, 8, P.grn, P.plum);                // uniform
    ball(g, 25, 57, 4, 2.6, P.navy); ball(g, 38, 57, 4, 2.6, P.navy); // boots
    ball(g, 48, 42, 6, 6, P.yel, P.org);                  // bugle bell
    ellipse(g, 48, 42, 3.5, 3.5, P.org);                  // bell opening
    stroke(g, [[22, 46], [34, 48], [45, 43]], 1.6, 1.6, P.yel); // tube
    ball(g, 21, 46, 2.4, 2.4, P.yel, P.org);              // mouthpiece
    ball(g, 22, 47, 3, 3, P.pch, P.brn);                  // hand
    ball(g, CX, 25, 13, 12, P.pch, P.brn);                // head
    rect(g, 18, 16, 45, 18, P.dgy);                       // cap brim
    rrect(g, 19, 9, 44, 16, 2, P.grn);                    // cap
    disc(g, CX, 12, 2, P.yel);                            // cap badge
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 34, 2.6, 1.2);
    blush(g, CX - 9, 32); blush(g, CX + 9, 32);
  }});

S.push({ name: 'chameleon', draw(g) {
    stroke(g, [[42, 48], [50, 46], [53, 40], [50, 35], [45, 36]], 2.4, 1, P.lim); // curled tail
    ball(g, CX, 44, 12, 9, P.lim, P.grn);                 // body
    clipTo(g, [P.lim, P.grn], () => { disc(g, 26, 42, 2.5, P.yel); disc(g, 36, 47, 2.5, P.sky); disc(g, 31, 49, 2, P.pnk); }); // colour patches
    ball(g, 22, 56, 3, 2.4, P.lim, P.grn); ball(g, 40, 56, 3, 2.4, P.lim, P.grn); // feet
    ball(g, CX, 24, 13, 12, P.lim, P.grn);                // head
    tri(g, 24, 12, 30, 12, 27, 6, P.grn); tri(g, 30, 11, 36, 11, 33, 5, P.grn); // crest
    ball(g, 17, 22, 5, 5, P.lim, P.grn);                  // eye turret L
    ball(g, 46, 22, 5, 5, P.lim, P.grn);                  // eye turret R
    eye(g, 17, 22, 3); eye(g, 46, 22, 3);
    smileArc(g, CX, 30, 2.6, 1.2);
    blush(g, CX - 10, 28); blush(g, CX + 10, 28);
  }});

S.push({ name: 'buoy', draw(g) {
    ellipse(g, CX, 54, 18, 4, P.sky);                     // water
    ellipse(g, 14, 52, 3, 1.5, P.sky); ellipse(g, 49, 52, 3, 1.5, P.sky);
    rect(g, 30, 6, 33, 20, P.lgy);                        // mast
    tri(g, 33, 7, 44, 11, 33, 15, P.yel);                 // flag
    ball(g, CX, 34, 14, 15, P.red, P.plum);               // buoy body
    rect(g, 18, 30, 45, 34, P.crm);                       // white band
    disc(g, CX, 45, 3, P.dgy);                            // lamp base
    eyes(g, CX, 40, 7);
    smileArc(g, CX, 46, 2.8, 1.2);
    blush(g, CX - 11, 43); blush(g, CX + 11, 43);
  }});

S.push({ name: 'dashboard', draw(g) {
    rrect(g, 8, 30, 55, 58, 6, P.plum);                   // panel shadow
    rrect(g, 8, 30, 55, 56, 6, P.brn);                    // panel
    rect(g, 11, 32, 52, 33, P.org);                       // trim highlight
    disc(g, 22, 42, 8, P.lgy); disc(g, 22, 42, 6.5, P.crm); // left gauge (as eye)
    disc(g, 41, 42, 8, P.lgy); disc(g, 41, 42, 6.5, P.crm); // right gauge
    for (let a = 0; a < 5; a++) { const th = Math.PI * (0.15 + a * 0.175); g.set(Math.round(22 + Math.cos(th) * 7), Math.round(42 - Math.sin(th) * 7), P.dgy); g.set(Math.round(41 + Math.cos(th) * 7), Math.round(42 - Math.sin(th) * 7), P.dgy); } // ticks
    eye(g, 22, 42, 4); eye(g, 41, 42, 4);
    smileArc(g, CX, 51, 3, 1.3);
    blush(g, 14, 49); blush(g, 49, 49);
  }});

S.push({ name: 'pharaoh', draw(g) {
    rrect(g, 12, 28, 22, 56, 3, P.sky);                   // left lappet
    rrect(g, 41, 28, 51, 56, 3, P.sky);                   // right lappet
    clipTo(g, [P.sky], () => { for (let y = 30; y < 56; y += 4) rect(g, 10, y, 54, y + 1, P.yel); });
    ball(g, CX, 20, 15, 11, P.sky, P.lav);                // headdress crown
    clipTo(g, [P.sky, P.lav], () => { for (let x = 18; x < 46; x += 4) rect(g, x, 9, x + 1, 28, P.yel); });
    disc(g, CX, 10, 2.5, P.yel);                          // uraeus emblem
    ball(g, CX, 36, 12, 12, P.pch, P.brn);                // face
    eyes(g, CX, 36, 6);
    smileArc(g, CX, 43, 2.4, 1.1);
    rrect(g, 29, 47, 34, 56, 2, P.dgy);                   // false beard
    clipTo(g, [P.dgy], () => { rect(g, 29, 50, 34, 51, P.lgy); });
    blush(g, CX - 8, 41); blush(g, CX + 8, 41);
  }});

S.push({ name: 'crossword', draw(g) {
    rrect(g, 10, 10, 53, 53, 3, P.lgy);                   // paper shadow
    rrect(g, 10, 10, 51, 51, 3, P.crm);                   // paper
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const x = 14 + c * 8, y = 14 + r * 8; if ((r + c) % 3 === 0) rect(g, x, y, x + 6, y + 6, P.navy); }
    for (let i = 0; i <= 5; i++) { rect(g, 14, 14 + i * 8, 53, 14 + i * 8, P.lgy); rect(g, 14 + i * 8, 14, 14 + i * 8, 53, P.lgy); }
    eyes(g, CX, 30, 6);
    smileArc(g, CX, 38, 2.6, 1.2);
    blush(g, CX - 12, 35); blush(g, CX + 12, 35);
  }});

S.push({ name: 'centipede', draw(g) {
    for (let i = 0; i < 7; i++) { const x = 16 + i * 6; stroke(g, [[x, 40], [x - 2, 50]], 1, 1, P.brn); stroke(g, [[x, 40], [x + 2, 50]], 1, 1, P.brn); } // legs
    for (const p of [[16, 34], [22, 30], [29, 28], [36, 29], [43, 32], [49, 37]]) ball(g, p[0], p[1], 5, 5, P.org, P.brn); // segments
    ball(g, 13, 34, 7, 7, P.org, P.brn);                  // head
    stroke(g, [[10, 29], [7, 22]], 1, 1, P.brn); stroke(g, [[14, 28], [13, 21]], 1, 1, P.brn); // antennae
    eyes(g, 12, 34, 4, 2.6);
    smileArc(g, 12, 39, 2, 1);
    blush(g, 7, 37); blush(g, 18, 37);
  }});

S.push({ name: 'emu', draw(g) {
    rect(g, 30, 20, 34, 40, P.brn);                       // long neck
    ball(g, CX, 46, 13, 12, P.brn, P.plum);               // fluffy body
    clipTo(g, [P.brn, P.plum], () => { for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; ellipse(g, CX + Math.cos(a) * 9, 46 + Math.sin(a) * 9, 1.5, 3, P.dgy); } }); // shaggy
    stroke(g, [[27, 56], [26, 60]], 1.4, 1.4, P.org); stroke(g, [[36, 56], [37, 60]], 1.4, 1.4, P.org); // legs
    tri(g, 22, 60, 31, 60, 26, 63, P.org); tri(g, 32, 60, 41, 60, 37, 63, P.org); // feet
    ball(g, CX, 16, 8, 7, P.brn, P.plum);                 // small head
    tri(g, 30, 16, 36, 16, 40, 18, P.org);                // beak
    eyes(g, CX, 15, 4);
    smileArc(g, CX - 1, 19, 1.6, 0.8);
    blush(g, CX - 6, 17); blush(g, CX + 6, 17);
  }});

S.push({ name: 'tugboat', draw(g) {
    ellipse(g, CX, 56, 22, 4, P.sky);                     // water
    rect(g, 16, 20, 22, 40, P.yel);                       // smokestack
    rect(g, 15, 20, 23, 23, P.red);                       // stack cap
    ball(g, 19, 14, 3, 3, P.lgy, P.lav); ball(g, 22, 9, 2.4, 2.4, P.lgy, P.lav); // smoke
    rrect(g, 24, 24, 42, 40, 3, P.crm);                   // wheelhouse
    rect(g, 27, 28, 32, 34, P.sky); rect(g, 35, 28, 39, 34, P.sky); // windows
    rrect(g, 12, 40, 51, 54, 4, P.plum);                  // hull shadow
    rrect(g, 12, 40, 51, 52, 4, P.red);                   // hull
    rect(g, 14, 42, 49, 43, P.pnk);                       // hull stripe
    eyes(g, CX, 46, 5);
    smileArc(g, CX, 50, 2.6, 1.2);
    blush(g, CX - 10, 48); blush(g, CX + 10, 48);
  }});

S.push({ name: 'optometrist', draw(g) {
    ball(g, CX, 48, 10, 8, P.crm, P.lgy);                 // white coat
    rect(g, 30, 42, 33, 56, P.sky);                       // shirt
    ball(g, 21, 47, 3.2, 3, P.crm, P.lgy); ball(g, 43, 47, 3.2, 3, P.crm, P.lgy); // arms
    ball(g, 25, 56, 4, 2.6, P.navy); ball(g, 38, 56, 4, 2.6, P.navy); // shoes
    ball(g, CX, 25, 13, 12, P.pch, P.brn);                // head
    ellipse(g, CX, 15, 13, 5, P.dgy);                     // hair
    disc(g, 25, 26, 5.5, P.sky); disc(g, 25, 26, 4, P.crm); // glasses
    disc(g, 38, 26, 5.5, P.sky); disc(g, 38, 26, 4, P.crm);
    rect(g, 30, 25, 33, 26, P.dgy);                       // bridge
    eye(g, 25, 26, 3); eye(g, 38, 26, 3);
    smileArc(g, CX, 33, 2.6, 1.2);
    blush(g, CX - 11, 31); blush(g, CX + 11, 31);
  }});

S.push({ name: 'kiln', draw(g) {
    rect(g, 27, 16, 36, 22, P.dgy);                       // chimney
    ball(g, 31, 12, 2.4, 2.4, P.lgy, P.lav);              // smoke
    ball(g, CX, 38, 20, 18, P.brn, P.plum);               // brick dome
    clipTo(g, [P.brn, P.plum], () => { for (let y = 26; y < 54; y += 5) rect(g, 10, y, 54, y + 1, P.plum); for (let x = 16; x < 50; x += 8) rect(g, x, 24, x + 1, 54, P.plum); }); // bricks
    rect(g, 12, 52, 51, 58, P.brn);                       // base
    ball(g, CX, 45, 9, 8, P.red, P.plum);                 // fire glow
    ball(g, CX, 46, 6, 6, P.org);
    ball(g, CX, 47, 3.5, 3.5, P.yel);
    eyes(g, CX, 32, 6);
    blush(g, CX - 12, 36); blush(g, CX + 12, 36);
  }});

S.push({ name: 'kilt', draw(g) {
    rect(g, 20, 40, 43, 56, P.grn);                       // kilt
    clipTo(g, [P.grn], () => { for (let x = 22; x < 44; x += 5) rect(g, x, 40, x + 1, 56, P.navy); for (let y = 42; y < 56; y += 5) rect(g, 20, y, 43, y + 1, P.navy); rect(g, 26, 40, 27, 56, P.red); rect(g, 37, 40, 38, 56, P.red); }); // tartan
    rect(g, 20, 40, 43, 42, P.dgy);                       // waistband
    ball(g, CX, 46, 4, 4, P.crm, P.lgy);                  // sporran
    rect(g, 25, 56, 29, 60, P.pch); rect(g, 34, 56, 38, 60, P.pch); // legs
    ball(g, CX, 34, 8, 7, P.crm, P.lgy);                  // shirt
    ball(g, CX, 20, 12, 11, P.pch, P.brn);                // head
    ellipse(g, CX, 11, 12, 4, P.red);                     // tam hat
    disc(g, CX, 8, 2, P.dgy);                             // pom
    eyes(g, CX, 21, 6);
    smileArc(g, CX, 28, 2.4, 1.1);
    blush(g, CX - 9, 26); blush(g, CX + 9, 26);
  }});

S.push({ name: 'hairpin', draw(g) {
    for (let a = 0; a < 6; a++) { const th = a / 6 * 6.28; ball(g, CX + Math.cos(th) * 7, 18 + Math.sin(th) * 7, 3.5, 3.5, P.pnk, P.plum); } // petals
    ball(g, CX, 18, 5, 5, P.yel, P.org);                  // flower centre
    stroke(g, [[CX + 9, 22], [CX + 11, 30]], 0.8, 0.8, P.yel); // bead cord
    ball(g, CX + 11, 31, 2.2, 2.2, P.red, P.plum);        // bead
    rect(g, 30, 24, 33, 54, P.lgy);                       // pin shaft
    rect(g, 30, 24, 31, 54, P.crm);                       // shaft highlight
    tri(g, 30, 54, 33, 54, 31.5, 60, P.lgy);              // pin tip
    eyes(g, CX, 17, 4.5);
    smileArc(g, CX, 21, 2, 1);
    blush(g, CX - 6, 20); blush(g, CX + 6, 20);
  }});

S.push({ name: 'birdbath', draw(g) {
    rect(g, 27, 34, 36, 54, P.lgy);                       // pedestal
    rect(g, 27, 34, 30, 54, P.crm);                       // pedestal highlight
    ellipse(g, CX, 56, 12, 4, P.lgy);                     // base
    ball(g, CX, 30, 18, 8, P.lgy, P.lav);                 // bowl
    ellipse(g, CX, 27, 15, 4, P.sky);                     // water
    ellipse(g, CX, 26, 11, 2, P.crm);                     // water shine
    ball(g, 43, 24, 5, 4.5, P.yel, P.org);                // bird body
    ball(g, 42, 20, 3, 3, P.yel, P.org);                  // bird head
    tri(g, 45, 19, 49, 20, 45, 22, P.org);                // beak
    eye(g, 42, 20, 2);
    eyes(g, CX, 33, 5);
    smileArc(g, CX, 38, 2.4, 1.1);
    blush(g, CX - 9, 36); blush(g, CX + 9, 36);
  }});

S.push({ name: 'daffodil', draw(g) {
    rect(g, 30, 34, 33, 58, P.grn);                       // stem
    ellipse(g, 22, 48, 3, 9, P.grn); ellipse(g, 41, 50, 3, 8, P.grn); // leaves
    for (let a = 0; a < 6; a++) { const th = a / 6 * 6.28; ball(g, CX + Math.cos(th) * 11, 24 + Math.sin(th) * 11, 5, 6, P.yel, P.org); } // petals
    ball(g, CX, 24, 8, 8, P.org, P.brn);                  // trumpet corona
    ellipse(g, CX, 24, 5.5, 5.5, P.yel);                  // corona opening
    eyes(g, CX, 23, 5);
    smileArc(g, CX, 28, 2.4, 1.1);
    blush(g, CX - 8, 26); blush(g, CX + 8, 26);
  }});

S.push({ name: 'thyme', draw(g) {
    stroke(g, [[CX, 44], [CX, 24]], 1.2, 0.8, P.grn);     // sprig stems
    stroke(g, [[CX, 42], [24, 26]], 1, 0.8, P.grn);
    stroke(g, [[CX, 42], [39, 26]], 1, 0.8, P.grn);
    for (const p of [[CX, 30], [CX, 24], [26, 30], [24, 26], [37, 30], [39, 26], [CX - 4, 36], [CX + 4, 36]]) ellipse(g, p[0], p[1], 2, 1.3, P.lim); // leaves
    disc(g, CX - 8, 24, 2, P.lav); disc(g, CX, 22, 2.2, P.lav); disc(g, CX + 8, 24, 2, P.lav); // flowers
    rrect(g, 22, 44, 41, 58, 2, P.brn);                   // pot
    rect(g, 20, 42, 43, 46, P.org);                       // pot rim
    eyes(g, CX, 50, 5);
    smileArc(g, CX, 55, 2.4, 1.1);
    blush(g, CX - 9, 53); blush(g, CX + 9, 53);
  }});

S.push({ name: 'elf', draw(g) {
    ball(g, CX, 48, 9, 7, P.grn, P.plum);                 // tunic
    ball(g, 25, 57, 4, 2.6, P.brn); ball(g, 38, 57, 4, 2.6, P.brn); // boots
    ball(g, 21, 47, 3, 3, P.pch, P.brn); ball(g, 42, 47, 3, 3, P.pch, P.brn); // hands
    ball(g, CX, 26, 13, 12, P.pch, P.brn);                // head
    tri(g, 17, 22, 22, 24, 15, 30, P.pch); tri(g, 46, 22, 41, 24, 49, 30, P.pch); // pointy ears
    tri(g, 18, 16, 45, 16, CX, 2, P.red);                 // pointy hat
    ellipse(g, CX, 16, 15, 3, P.red);                     // hat brim
    disc(g, CX, 3, 2, P.yel);                             // hat bell
    ellipse(g, CX, 18, 12, 3, P.org);                     // hair fringe
    eyes(g, CX, 27, 6);
    smileArc(g, CX, 34, 2.6, 1.2);
    blush(g, CX - 10, 32); blush(g, CX + 10, 32);
  }});

S.push({ name: 'sesame', draw(g) {
    ball(g, 13, 46, 4.5, 3.5, P.pch, P.brn);              // companion seeds
    ball(g, 50, 44, 4.5, 3.5, P.pch, P.brn);
    ball(g, 33, 35, 15, 12, P.pch, P.brn);                // flat seed body
    tri(g, 20, 31, 20, 39, 11, 35, P.pch);                // pointed tip
    ellipse(g, 27, 29, 4, 2.3, P.crm);                    // sheen
    eyes(g, 34, 35, 6);
    smileArc(g, 34, 42, 2.6, 1.2);
    blush(g, 26, 40); blush(g, 43, 40);
  }});

  function renderGrid(name) {
    const item = S.find(s => s.name === name);
    const g = new Grid();
    item.draw(g);
    outline(g);
    return g.d;
  }
  function drawTo(ctx, name, silhouette) {
    const d = renderGrid(name);
    ctx.clearRect(0, 0, W, W);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const c = d[y * W + x];
      if (!c) continue;
      ctx.fillStyle = silhouette ? P.navy : c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const api = { P: P, names: S.map(s => s.name), renderGrid: renderGrid, drawTo: drawTo, SIZE: W };
  if (typeof window !== 'undefined') window.SPRITES = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
