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
    stroke(g, [[CX,58],[CX,10]], 2.2,1.5,P.brn);
    tri(g, 33,13, 33,45, 52,34, P.crm);
    tri(g, 30,16, 30,48, 12,38, P.lgy);
    rect(g, 29,10,34,14,P.brn);
    ellipse(g, CX,58, 15,3,P.brn);
    eyes(g,CX,31,5);
    smileArc(g,CX,37,2.4,1);
    blush(g,24,35); blush(g,39,35);
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
    stroke(g, [[40,9],[28,51]], 4,5,P.dgy);
    stroke(g, [[40,9],[28,51]], 2.2,3,P.brn);
    ellipse(g,25,55,10,5,P.dgy);
    ellipse(g,39,9,5,3,P.dgy);
    for (const [x,y] of [[36,20],[33,30],[30,40]]) disc(g,x,y,1.8,P.yel);
    eyes(g,32,35,5);
    smileArc(g,31,41,2,0.9);
    blush(g,25,39); blush(g,38,39);
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
