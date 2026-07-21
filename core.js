/* =========================================================================
 * Xenachord Cimbalo Cromatico Designer — geometry core
 *
 * Parametric generator for AKM320 replacement microtonal keyboards,
 * reverse-engineered from the Cimbalo Cromatico [17] and [19] STLs.
 *
 * Coordinate system (mm, assembled position):
 *   X: 0 at sensor #0 center, +X toward treble (sensor pitch 11.30)
 *   Y: 0 at spine back edge, +Y toward the player
 *   Z: 0 at bottom of the white spine plate (screw-boss plane), +Z up
 *
 * Each color layer (white / gray / black) is a one-piece "comb": a spine
 * plate at the back plus keys on thin flexing plates. Pieces are unions of
 * overlapping simple solids (boxes/prisms) exactly like the originals —
 * the slicer fuses overlapping shells at print time.
 *
 * Works in browser (window.XD) and node (module.exports).
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------- measured AKM320 constants (do not change) ----------- */
  const AKM = {
    PITCH: 11.3,          // sensor spacing
    NSENSORS: 32,
    XL: -13.3,            // keyboard left end (spine)
    XR: 359.1,            // keyboard right end (spine)
    FRONT_XL: -11.3,      // clamp for white key fronts
    FRONT_XR: 357.1,
    PAD: {                // sensor pressing / interlock pads
      halfW: 5.2,         // pad width 10.4 (cell is 11.3 -> 0.9 gaps)
      y0: 32.68, y1: 41.68,
      z0: 1.4,            // sensor dome contact level
      z1: 10.6,           // common top of the interlock row
      clr: 0.3,           // lateral clearance cut around foreign pads
      band0: 32.28, band1: 42.08 // Y band used when cutting foreign pad cells
    },
    SPINE: { y0: 0, y1: 15.7 },
    LAYER: {              // spine/flex plate Z bands per color
      white: { z0: 0.0,  z1: 1.9  },
      gray:  { z0: 2.39, z1: 3.76 },
      black: { z0: 4.26, z1: 6.66 }
    },
    // screw slot X centers (fixed by the AKM320 PCB standoffs)
    SLOTS: [-10.28, 3.84, 14.92, 54.92, 68.48, 82.15, 133.57, 151.86,
            191.76, 205.40, 218.98, 270.49, 289.46, 328.75, 342.39, 356.06],
    SLOT: { w: 4.3, d: 3.3, wBlack: 4.8, dBlack: 3.8, yc: 4.79 },
    SLOT_BIG: { index: 12, w: 5.9, d: 5.0, wBlack: 6.2, dBlack: 5.3, yc: 3.93 },
    SLOT_END: { indices: [0, 15], w: 5.4, d: 7.0, yc: 4.92 }, // black layer only
    NOTCH: { x0: 290.4, x1: 317.5, depth: 2.0 },  // spine back-edge clearance notch
    BLACK_WALLS: { backY0: 0, backY1: 1.5, frontY0: 8.5, frontY1: 10.0, z1: 9.64 }
  };

  /* ---------------- design parameters (faithful to originals) ----------- */
  const D = {
    frontGap: 2.5,                     // gap between white key fronts
    white: {
      frontY0: 63.3, frontY1: 93.9,    // wide touch area
      noseY: 91.9, noseZ: 4.7,         // sloped nose at the front edge
      top: 7.0, bottom: 0.5,
      fin: { halfW: 0.5, y0: 81.0, y1: 82.5, z1: 14.5, z0: 5.0 }, // guide fins
      shoulderY0: 45.5, shoulderY1: 63.8,
      shoulderClr: 0.75,               // to gap line when no accidental
      channelY0: 14.9, channelY1: 46.0,
      channelClr: 0.65,
      bodyClr: 0.6,                    // to accidental bodies
      ribW: 1.0, ribZ: 3.34            // stiffening ribs on the flex channel
    },
    gray: {
      w: 12.5, y0: 45.98, y1: 60.48,
      top: 3.7, z0: -1.0, skirtZ: -5.5, skirtY1: 57.5,
      stemHalfW: 3.35, stemY0: 14.9, stemY1: 46.5,
      stemZ0: 2.39, stemZ1: 3.5,
      stemMaxOff: 2.2                  // stem center clamp around body center
    },
    black: {
      w: 14.2, y0: 15.88, y1: 45.08,
      top: 6.15, capZ0: 4.6, reliefZ0: 5.3,
      wall: 1.4, skirtZ: -8.2, wallZ1: 4.8,
      frontWallY0: 43.68,
      chamferY: 2.5, chamferDrop: 1.15,
      stemHalfW: 2.25, stemZ0: 4.26,
      texRibW: 0.9, texRibStep: 2.4, texRibZ1: 6.55,
      texRibY0: 18, texRibY1: 43.5
    },
    spreadGap: 0.8,                    // extra gap when same-type accidentals share a slot
    minSplitWidth: 120                 // sanity bound for split search
  };

  /* ---------------- mesh helpers ---------------------------------------- */
  // tris: flat array of numbers, 9 per triangle (v0 v1 v2)
  function pushTri(tris, a, b, c) { tris.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }

  function pushQuad(tris, a, b, c, d) { pushTri(tris, a, b, c); pushTri(tris, a, c, d); }

  // hexahedron from 8 corners: bottom b0..b3 CCW seen from above, top t0..t3 above them
  function pushHex(tris, b0, b1, b2, b3, t0, t1, t2, t3) {
    pushQuad(tris, b3, b2, b1, b0);       // bottom (down)
    pushQuad(tris, t0, t1, t2, t3);       // top (up)
    pushQuad(tris, b0, b1, t1, t0);       // y0 side
    pushQuad(tris, b1, b2, t2, t1);       // x1 side
    pushQuad(tris, b2, b3, t3, t2);       // y1 side
    pushQuad(tris, b3, b0, t0, t3);       // x0 side
  }

  function pushBox(tris, x0, x1, y0, y1, z0, z1) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    pushHex(tris,
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  }

  // Axis-aligned rectangle minus rectangular holes -> emit(x0,x1,y0,y1) cover.
  function rectWithHoles(x0, x1, y0, y1, holes, emit) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) return;
    let h = null;
    for (const cand of holes) {
      const hx0 = Math.max(x0, cand.x0), hx1 = Math.min(x1, cand.x1);
      const hy0 = Math.max(y0, cand.y0), hy1 = Math.min(y1, cand.y1);
      if (hx1 - hx0 > 1e-4 && hy1 - hy0 > 1e-4) { h = { x0: hx0, x1: hx1, y0: hy0, y1: hy1 }; break; }
    }
    if (!h) { emit(x0, x1, y0, y1); return; }
    rectWithHoles(x0, h.x0, y0, y1, holes, emit);
    rectWithHoles(h.x1, x1, y0, y1, holes, emit);
    rectWithHoles(h.x0, h.x1, y0, h.y0, holes, emit);
    rectWithHoles(h.x0, h.x1, h.y1, y1, holes, emit);
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------------- layout ---------------------------------------------- */
  /**
   * params:
   *   k         notes per equave (pattern length)
   *   pattern   array of 'white' | 'black' | 'gray', length k
   *   rotation  which pattern degree sits on sensor 0
   *   split     sensor index starting piece A (null -> auto)
   *   texture   grip ridges on black key tops
   */
  function computeLayout(params) {
    const P = AKM.PITCH, NS = AKM.NSENSORS;
    const k = params.k, pattern = params.pattern;
    const rot = ((params.rotation || 0) % k + k) % k;
    const warnings = [];

    if (!pattern || pattern.length !== k) throw new Error('pattern length must equal k');
    const nWhitePerEq = pattern.filter(t => t === 'white').length;
    if (nWhitePerEq === 0) throw new Error('pattern needs at least one white key');

    // sensors -> keys
    const keys = [];
    for (let s = 0; s < NS; s++) {
      const deg = (s + rot) % k;
      keys.push({ sensor: s, x: s * P, deg, type: pattern[deg], equave: Math.floor((s + rot) / k) });
    }

    // white grid: even pitch, phase by least squares against sensor centers
    const wp = k * P / nWhitePerEq;
    const whites = keys.filter(kk => kk.type === 'white');
    whites.forEach((w, i) => { w.ord = i; });
    let phi = 0;
    for (const w of whites) phi += w.x - (w.ord + 0.5) * wp;
    phi /= whites.length;
    for (const w of whites) {
      w.frontC = phi + (w.ord + 0.5) * wp;
      w.frontL = w.frontC - (wp - D.frontGap) / 2;
      w.frontR = w.frontC + (wp - D.frontGap) / 2;
    }
    // clamp end keys to the keyboard
    if (whites.length) {
      const first = whites[0], last = whites[whites.length - 1];
      first.frontL = Math.max(first.frontL, AKM.FRONT_XL);
      last.frontR = Math.min(last.frontR, AKM.FRONT_XR);
      if (first.frontR - first.frontL < 12) warnings.push('First white key is very narrow after clamping to the keyboard edge.');
      if (last.frontR - last.frontL < 12) warnings.push('Last white key is very narrow after clamping to the keyboard edge.');
    }

    // accidental groups between whites
    const groups = [];
    let cur = null;
    for (const kk of keys) {
      if (kk.type === 'white') { if (cur) { groups.push(cur); cur = null; } }
      else { if (!cur) cur = { members: [] }; cur.members.push(kk); }
    }
    if (cur) groups.push(cur);
    for (const g of groups) {
      const sFirst = g.members[0].sensor, sLast = g.members[g.members.length - 1].sensor;
      const wl = whites.filter(w => w.sensor < sFirst).pop() || null;
      const wr = whites.find(w => w.sensor > sLast) || null;
      g.left = wl; g.right = wr;
      if (wl && wr) g.gap = (wl.frontR + wr.frontL) / 2;
      else {
        // edge group: center on its own sensors
        g.gap = (g.members[0].x + g.members[g.members.length - 1].x) / 2;
      }
      // spread same-type members around the gap line
      for (const type of ['black', 'gray']) {
        const list = g.members.filter(m => m.type === type);
        const w = (type === 'black' ? D.black.w : D.gray.w);
        list.forEach((m, j) => {
          m.bodyX = g.gap + (j - (list.length - 1) / 2) * (w + D.spreadGap);
          m.bodyX = clamp(m.bodyX, AKM.XL + w / 2 + 0.7, AKM.XR - w / 2 - 0.7);
          m.bodyL = m.bodyX - w / 2; m.bodyR = m.bodyX + w / 2;
        });
        if (list.length > 1) warnings.push(
          `${list.length} adjacent ${type} keys share one slot (sensors ${list.map(m => m.sensor).join(', ')}) — bodies are spread side by side.`);
      }
      // stems: kept close to the sensor so they stay inside their own pad cell
      for (const m of g.members) {
        m.stemX = clamp(clamp(m.x, m.bodyX - D.gray.stemMaxOff, m.bodyX + D.gray.stemMaxOff),
                        m.x - 1.8, m.x + 1.8);
        const half = (m.type === 'gray' ? D.gray.stemHalfW : D.black.stemHalfW);
        m.stemL = m.stemX - half; m.stemR = m.stemX + half;
        // gray keys may need a bridge plate from stem to body (in front of black walls)
        if (m.type === 'gray') {
          m.bridge = null;
          if (m.stemR < m.bodyL + 0.5 || m.stemL > m.bodyR - 0.5) {
            m.bridge = { x0: Math.min(m.stemL, m.bodyX - 2.0), x1: Math.max(m.stemR, m.bodyX + 2.0) };
          }
        }
      }
      // lateral extents the neighboring white keys must clear
      const ext = (list, pad) => list.length
        ? [Math.min(...list.map(v => v[0])) - pad, Math.max(...list.map(v => v[1])) + pad]
        : null;
      const grays = g.members.filter(m => m.type === 'gray');
      const blacks = g.members.filter(m => m.type === 'black');
      g.grayExt = ext(grays.flatMap(m => {
        const spans = [[m.bodyL, m.bodyR]];
        if (m.bridge) spans.push([m.bridge.x0, m.bridge.x1]);
        return spans;
      }), 0);
      g.blackExt = ext(blacks.map(m => [m.bodyL, m.bodyR]), 0);
      g.grayStemExt = ext(grays.map(m => [m.stemL, m.stemR]), 0.5);
      g.bodyL = Math.min(...g.members.map(m => m.bodyL));
      g.bodyR = Math.max(...g.members.map(m => m.bodyR));
    }

    // neighbor-aware white side limits
    for (const w of whites) {
      const gl = groups.find(g => g.right === w) || null;   // group to the left
      const gr = groups.find(g => g.left === w) || null;    // group to the right
      const gapL = gl ? gl.gap : (w.ord > 0 ? (whites[w.ord - 1].frontR + w.frontL) / 2 : AKM.XL + 0.4);
      const gapR = gr ? gr.gap : (w.ord < whites.length - 1 ? (w.frontR + whites[w.ord + 1].frontL) / 2 : AKM.XR - 0.4);
      w.shL = Math.max(gapL + D.white.shoulderClr, gl && gl.grayExt ? gl.grayExt[1] + D.white.bodyClr : -1e9);
      w.shR = Math.min(gapR - D.white.shoulderClr, gr && gr.grayExt ? gr.grayExt[0] - D.white.bodyClr : 1e9);
      w.chL = Math.max(gapL + D.white.channelClr,
        gl && gl.blackExt ? gl.blackExt[1] + D.white.bodyClr : -1e9,
        gl && gl.grayStemExt ? gl.grayStemExt[1] + 0.4 : -1e9);
      w.chR = Math.min(gapR - D.white.channelClr,
        gr && gr.blackExt ? gr.blackExt[0] - D.white.bodyClr : 1e9,
        gr && gr.grayStemExt ? gr.grayStemExt[0] - 0.4 : 1e9);
      // keep everything inside the keyboard
      w.shL = Math.max(w.shL, AKM.XL + 0.4); w.shR = Math.min(w.shR, AKM.XR - 0.4);
      w.chL = Math.max(w.chL, AKM.XL + 0.4); w.chR = Math.min(w.chR, AKM.XR - 0.4);
      if (w.shR - w.shL < 6) warnings.push(`White key at sensor ${w.sensor}: mid-section is very narrow (${(w.shR - w.shL).toFixed(1)} mm).`);
      if (w.chR - w.chL < 5) warnings.push(`White key at sensor ${w.sensor}: flex channel is very narrow (${(w.chR - w.chL).toFixed(1)} mm).`);
    }

    // split: piece B = sensors < split, piece A = sensors >= split
    let split = params.split;
    if (split == null) {
      // balance the two piece widths
      let best = null;
      for (let s = 4; s <= NS - 4; s++) {
        const boundary = (s - 0.5) * P;
        const wB = boundary + 4.0 - AKM.XL, wA = AKM.XR - (boundary + 5.2);
        const score = Math.abs(wA - wB);
        if (!best || score < best.score) best = { sensor: s, score };
      }
      split = best.sensor;
    }
    const boundary = (split - 0.5) * P;
    const pieces = {
      B: { x0: AKM.XL, x1: boundary + 4.0 },
      A: { x0: boundary + 5.2, x1: AKM.XR }
    };
    const widthB = pieces.B.x1 - pieces.B.x0, widthA = pieces.A.x1 - pieces.A.x0;
    if (Math.max(widthA, widthB) > 200) warnings.push(
      `A printed piece is ${Math.max(widthA, widthB).toFixed(0)} mm wide — check that it fits your printer bed.`);
    for (const kk of keys) kk.piece = kk.sensor < split ? 'B' : 'A';

    // sanity checks for exotic layouts
    for (const g of groups) for (const m of g.members) {
      const span0 = Math.min(m.stemL, m.bodyX - 2.0), span1 = Math.max(m.stemR, m.bodyX + 2.0);
      for (const o of g.members) {
        if (o === m || o.type !== m.type) continue;
        if (span1 > o.bodyL + 0.2 && span0 < o.bodyR - 0.2)
          warnings.push(`Keys at sensors ${m.sensor} and ${o.sensor} would fuse together (stem crosses the neighboring body) — change the key types or spacing.`);
      }
    }
    for (const w of whites) {
      const padL = w.x - AKM.PAD.halfW, padR = w.x + AKM.PAD.halfW;
      const ov = Math.min(padR, w.chR) - Math.max(padL, w.chL);
      if (ov < 2) warnings.push(`White key at sensor ${w.sensor}: pad barely connects to its key (overlap ${ov.toFixed(1)} mm).`);
    }

    return { params: { ...params, rotation: rot, split }, keys, whites, groups, wp, phi, pieces, warnings };
  }

  /* ---------------- mesh generation -------------------------------------- */
  function foreignPadHoles(layout, selfSensor) {
    // pad-cell holes (X intervals) to cut from anything crossing the pad Y band
    const holes = [];
    for (const kk of layout.keys) {
      if (kk.sensor === selfSensor) continue;
      holes.push({
        x0: kk.x - AKM.PAD.halfW - AKM.PAD.clr, x1: kk.x + AKM.PAD.halfW + AKM.PAD.clr,
        y0: AKM.PAD.band0, y1: AKM.PAD.band1
      });
    }
    return holes;
  }

  function buildSpine(tris, color, x0, x1) {
    const L = AKM.LAYER[color];
    const holes = [];
    AKM.SLOTS.forEach((sx, i) => {
      let w, d, yc;
      if (i === AKM.SLOT_BIG.index) {
        w = color === 'black' ? AKM.SLOT_BIG.wBlack : AKM.SLOT_BIG.w;
        d = color === 'black' ? AKM.SLOT_BIG.dBlack : AKM.SLOT_BIG.d;
        yc = AKM.SLOT_BIG.yc;
      } else if (color === 'black' && AKM.SLOT_END.indices.includes(i)) {
        w = AKM.SLOT_END.w; d = AKM.SLOT_END.d; yc = AKM.SLOT_END.yc;
      } else {
        w = color === 'black' ? AKM.SLOT.wBlack : AKM.SLOT.w;
        d = color === 'black' ? AKM.SLOT.dBlack : AKM.SLOT.d;
        yc = AKM.SLOT.yc;
      }
      holes.push({ x0: sx - w / 2, x1: sx + w / 2, y0: yc - d / 2, y1: yc + d / 2 });
    });
    holes.push({ x0: AKM.NOTCH.x0, x1: AKM.NOTCH.x1, y0: 0, y1: AKM.NOTCH.depth });
    rectWithHoles(x0, x1, AKM.SPINE.y0, AKM.SPINE.y1, holes,
      (a, b, c, d2) => pushBox(tris, a, b, c, d2, L.z0, L.z1));
    if (color === 'black') {
      const W = AKM.BLACK_WALLS;
      const wallHoles = holes.filter(h => h.y1 > W.backY0 && h.y0 < W.frontY1);
      rectWithHoles(x0, x1, W.backY0, W.backY1, wallHoles,
        (a, b, c, d2) => pushBox(tris, a, b, c, d2, L.z0, W.z1));
      rectWithHoles(x0, x1, W.frontY0, W.frontY1, wallHoles,
        (a, b, c, d2) => pushBox(tris, a, b, c, d2, L.z0, W.z1));
    }
  }

  function buildWhiteKey(tris, layout, w) {
    const W = D.white;
    // front slab + sloped nose
    pushBox(tris, w.frontL, w.frontR, W.frontY0, W.noseY, W.bottom, W.top);
    pushHex(tris,
      [w.frontL, W.noseY, W.bottom], [w.frontR, W.noseY, W.bottom],
      [w.frontR, D.white.frontY1, W.bottom], [w.frontL, D.white.frontY1, W.bottom],
      [w.frontL, W.noseY, W.top], [w.frontR, W.noseY, W.top],
      [w.frontR, D.white.frontY1, W.noseZ], [w.frontL, D.white.frontY1, W.noseZ]);
    // guide fins on both front side edges
    pushBox(tris, w.frontL - W.fin.halfW, w.frontL + W.fin.halfW, W.fin.y0, W.fin.y1, W.fin.z0, W.fin.z1);
    pushBox(tris, w.frontR - W.fin.halfW, w.frontR + W.fin.halfW, W.fin.y0, W.fin.y1, W.fin.z0, W.fin.z1);
    // shoulder
    pushBox(tris, w.shL, w.shR, W.shoulderY0, W.shoulderY1, W.bottom, W.top);
    // flex channel floor + ribs, cut around foreign pads
    const holes = foreignPadHoles(layout, w.sensor);
    rectWithHoles(w.chL, w.chR, W.channelY0, W.channelY1, holes,
      (a, b, c, d2) => pushBox(tris, a, b, c, d2, AKM.LAYER.white.z0, AKM.LAYER.white.z1));
    rectWithHoles(w.chL, Math.min(w.chL + W.ribW, w.chR), W.channelY0, W.channelY1, holes,
      (a, b, c, d2) => pushBox(tris, a, b, c, d2, AKM.LAYER.white.z1, W.ribZ));
    rectWithHoles(Math.max(w.chR - W.ribW, w.chL), w.chR, W.channelY0, W.channelY1, holes,
      (a, b, c, d2) => pushBox(tris, a, b, c, d2, AKM.LAYER.white.z1, W.ribZ));
    // pad
    pushBox(tris, w.x - AKM.PAD.halfW, w.x + AKM.PAD.halfW, AKM.PAD.y0, AKM.PAD.y1, AKM.PAD.z0, AKM.PAD.z1);
  }

  function buildGrayKey(tris, layout, m) {
    const G = D.gray;
    // body: upper block + skirt + front-bottom chamfer
    pushBox(tris, m.bodyL, m.bodyR, G.y0, G.y1, G.z0, G.top);
    pushBox(tris, m.bodyL, m.bodyR, G.y0, G.skirtY1, G.skirtZ, G.z0);
    pushHex(tris,
      [m.bodyL, G.skirtY1 - 0.2, G.skirtZ], [m.bodyR, G.skirtY1 - 0.2, G.skirtZ],
      [m.bodyR, G.skirtY1, G.skirtZ], [m.bodyL, G.skirtY1, G.skirtZ],
      [m.bodyL, G.skirtY1 - 0.2, G.z0], [m.bodyR, G.skirtY1 - 0.2, G.z0],
      [m.bodyR, G.y1, G.z0], [m.bodyL, G.y1, G.z0]);
    // stem (flex plate) + optional bridge to an offset body + pad
    pushBox(tris, m.stemL, m.stemR, G.stemY0, G.stemY1, G.stemZ0, G.stemZ1);
    if (m.bridge) pushBox(tris, m.bridge.x0, m.bridge.x1, 45.3, 47.0, G.stemZ0, G.stemZ1);
    pushBox(tris, m.x - AKM.PAD.halfW, m.x + AKM.PAD.halfW, AKM.PAD.y0, AKM.PAD.y1, AKM.PAD.z0, AKM.PAD.z1);
  }

  function buildBlackKey(tris, layout, m, texture) {
    const B = D.black;
    const padHoles = foreignPadHoles(layout, m.sensor);
    // gray stems passing under this cap -> relief corridors
    const corridors = [];
    for (const g of layout.groups) for (const gm of g.members) {
      if (gm.type !== 'gray') continue;
      const sx0 = gm.stemL - 0.5, sx1 = gm.stemR + 0.5;
      if (sx1 > m.bodyL && sx0 < m.bodyR) corridors.push({ x0: Math.max(sx0, m.bodyL), x1: Math.min(sx1, m.bodyR) });
    }
    corridors.sort((a, b) => a.x0 - b.x0);
    // cap: X strips (normal z0 vs relief z0), each cut around foreign pads,
    // with a chamfered front prism
    const capY1 = B.y1 - B.chamferY;
    const strips = [];
    let cx = m.bodyL;
    for (const c of corridors) {
      if (c.x0 > cx) strips.push({ x0: cx, x1: c.x0, z0: B.capZ0 });
      strips.push({ x0: c.x0, x1: c.x1, z0: B.reliefZ0 });
      cx = Math.max(cx, c.x1);
    }
    if (cx < m.bodyR) strips.push({ x0: cx, x1: m.bodyR, z0: B.capZ0 });
    for (const st of strips) {
      rectWithHoles(st.x0, st.x1, B.y0, capY1, padHoles,
        (a, b, c, d2) => pushBox(tris, a, b, c, d2, st.z0, B.top));
      // front chamfer prism (outside the pad band, no holes needed)
      pushHex(tris,
        [st.x0, capY1, st.z0], [st.x1, capY1, st.z0],
        [st.x1, B.y1, st.z0], [st.x0, B.y1, st.z0],
        [st.x0, capY1, B.top], [st.x1, capY1, B.top],
        [st.x1, B.y1, B.top - B.chamferDrop], [st.x0, B.y1, B.top - B.chamferDrop]);
    }
    // side walls (skirts), interrupted at the pad band if a foreign pad overlaps
    for (const side of [[m.bodyL, m.bodyL + B.wall], [m.bodyR - B.wall, m.bodyR]]) {
      rectWithHoles(side[0], side[1], B.y0, B.y1, padHoles,
        (a, b, c, d2) => pushBox(tris, a, b, c, d2, B.skirtZ, B.wallZ1));
    }
    // front wall with notches for gray stems
    const stemNotches = corridors.map(c => ({ x0: c.x0 - 0.2, x1: c.x1 + 0.2, y0: B.frontWallY0, y1: B.y1 }));
    rectWithHoles(m.bodyL, m.bodyR, B.frontWallY0, B.y1, stemNotches.concat(padHoles),
      (a, b, c, d2) => pushBox(tris, a, b, c, d2, B.skirtZ, B.wallZ1));
    // stem (flex plate at spine level), spanning from its sensor to the body if offset
    pushBox(tris, Math.min(m.stemL, m.bodyX - 2.0), Math.max(m.stemR, m.bodyX + 2.0),
      AKM.SPINE.y1 - 0.8, B.y0 + 1.5, B.stemZ0, B.top);
    pushBox(tris, m.x - AKM.PAD.halfW, m.x + AKM.PAD.halfW, AKM.PAD.y0, AKM.PAD.y1, AKM.PAD.z0, AKM.PAD.z1);
    // grip texture ridges
    if (texture) {
      for (let y = B.texRibY0; y < B.texRibY1; y += B.texRibStep) {
        for (const st of strips) {
          const rx0 = Math.max(st.x0 + 0.6, m.bodyL + 1.2), rx1 = Math.min(st.x1 - 0.6, m.bodyR - 1.2);
          if (y > capY1 - 1) continue;
          rectWithHoles(rx0, rx1, y, Math.min(y + D.black.texRibW, capY1), padHoles,
            (a, b, c, d2) => pushBox(tris, a, b, c, d2, B.top - 0.2, B.texRibZ1));
        }
      }
    }
  }

  function buildMeshes(layout) {
    const out = {};
    for (const color of ['white', 'gray', 'black']) {
      for (const piece of ['A', 'B']) {
        const tris = [];
        buildSpine(tris, color, layout.pieces[piece].x0, layout.pieces[piece].x1);
        for (const kk of layout.keys) {
          if (kk.piece !== piece || kk.type !== color) continue;
          if (color === 'white') buildWhiteKey(tris, layout, kk);
          else if (color === 'gray') buildGrayKey(tris, layout, kk);
          else buildBlackKey(tris, layout, kk, !!layout.params.texture);
        }
        out[`${color}-${piece}`] = tris;
      }
    }
    return out;
  }

  /* ---------------- binary STL ------------------------------------------- */
  function toSTL(tris, name) {
    const n = tris.length / 9;
    const buf = new ArrayBuffer(84 + n * 50);
    const dv = new DataView(buf);
    const header = 'Xenachord Designer - ' + (name || 'part');
    for (let i = 0; i < Math.min(79, header.length); i++) dv.setUint8(i, header.charCodeAt(i));
    dv.setUint32(80, n, true);
    let o = 84;
    for (let t = 0; t < n; t++) {
      const i9 = t * 9;
      const ax = tris[i9], ay = tris[i9 + 1], az = tris[i9 + 2];
      const bx = tris[i9 + 3], by = tris[i9 + 4], bz = tris[i9 + 5];
      const cx = tris[i9 + 6], cy = tris[i9 + 7], cz = tris[i9 + 8];
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true);
      dv.setFloat32(o + 12, ax, true); dv.setFloat32(o + 16, ay, true); dv.setFloat32(o + 20, az, true);
      dv.setFloat32(o + 24, bx, true); dv.setFloat32(o + 28, by, true); dv.setFloat32(o + 32, bz, true);
      dv.setFloat32(o + 36, cx, true); dv.setFloat32(o + 40, cy, true); dv.setFloat32(o + 44, cz, true);
      dv.setUint16(o + 48, 0, true);
      o += 50;
    }
    return buf;
  }

  /* ---------------- store-only ZIP --------------------------------------- */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  // files: [{name, data: ArrayBuffer}]
  function makeZip(files) {
    const encoder = new TextEncoder();
    const locals = [], centrals = [];
    let offset = 0;
    for (const f of files) {
      const nameB = encoder.encode(f.name);
      const data = new Uint8Array(f.data);
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameB.length + data.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
      lv.setUint16(6, 0, true); lv.setUint16(8, 0, true);
      lv.setUint16(10, 0, true); lv.setUint16(12, 0, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
      lv.setUint16(26, nameB.length, true); lv.setUint16(28, 0, true);
      local.set(nameB, 30); local.set(data, 30 + nameB.length);
      locals.push(local);
      const cent = new Uint8Array(46 + nameB.length);
      const cv = new DataView(cent.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameB.length, true);
      cv.setUint32(42, offset, true);
      cent.set(nameB, 46);
      centrals.push(cent);
      offset += local.length;
    }
    const centralSize = centrals.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    const total = offset + centralSize + 22;
    const outBytes = new Uint8Array(total);
    let p = 0;
    for (const l of locals) { outBytes.set(l, p); p += l.length; }
    for (const c of centrals) { outBytes.set(c, p); p += c.length; }
    outBytes.set(end, p);
    return outBytes.buffer;
  }

  /* ---------------- presets ---------------------------------------------- */
  function patternFromString(s) {
    // W=white, B=black (rear tall split), G=gray (front low split)
    return s.split('').map(c => c === 'W' ? 'white' : c === 'B' ? 'black' : 'gray');
  }
  const PRESETS = {
    'cimbalo-17': {
      label: 'Cimbalo Cromatico [17]  (7W + 5 split pairs)',
      k: 17, rotation: 0, texture: true,
      // E F F# Gb G G# Ab A A# Bb B C C# Db D D# Eb  (starts on E like the original)
      pattern: patternFromString('WWBGWBGWBGWWBGWBG')
    },
    'cimbalo-19': {
      label: 'Cimbalo Cromatico [19]  (7W + 5 pairs + E#, B#)',
      k: 19, rotation: 0, texture: true,
      // E E#/Fb F F# Gb G G# Ab A A# Bb B B#/Cb C C# Db D D# Eb
      pattern: patternFromString('WGWBGWBGWBGWGWBGWBG')
    },
    'standard-12': {
      label: 'Standard 12  (piano layout)',
      k: 12, rotation: 0, texture: true,
      // C C# D D# E F F# G G# A A# B
      pattern: patternFromString('WBWBWWBWBWBW')
    },
    'split-12': {
      label: 'Split 12 (every accidental as B/G pair, 19-EDO subset feel)',
      k: 12, rotation: 0, texture: true,
      pattern: patternFromString('WBWBWWBWBWBW').map((t, i) => t) // placeholder same as standard
    }
  };
  delete PRESETS['split-12'];

  const api = { AKM, D, computeLayout, buildMeshes, toSTL, makeZip, PRESETS, rectWithHoles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).XD = api;
})();