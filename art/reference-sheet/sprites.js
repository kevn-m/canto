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
