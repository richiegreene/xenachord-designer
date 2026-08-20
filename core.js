/* =========================================================================
 * Xenachord Designer — DESIGN CORE
 *
 * Layout engine, mesh assembly, STL / ZIP export and the Blender Python log.
 * All geometry and sizing comes from model.js (XM), which is measured out of
 * Cimbalo_Cromatico_Drafting_Sandbox_Leveling.blend.
 *
 * THE INSTRUMENT IS FIXED AT 32 KEYS.  One AKM320: spine half A + half B,
 * 16 sensor feet on each, 32 feet in total, one key per foot, never more.
 * The white-key count is therefore DERIVED from the pattern, not chosen.
 *
 * A design is:
 *   scale      the size number s — every width is linear in it
 *   rotation   which of the seven period slots white #0 starts on
 *   template   7 entries, each null or an array of key-type names
 *   overrides  per-absolute-slot replacements  { slotIndex: names|null }
 * ========================================================================= */
(function () {
  'use strict';
  const XM = (typeof module !== 'undefined' && module.exports)
    ? require('./model.js')
    : (typeof window !== 'undefined' ? window : globalThis).XM;

  /* ------------------------------------------------------------------ *
   *  LAYOUT                                                             *
   * ------------------------------------------------------------------ */
  function presetDesign(edo) {
    const L = XM.LAYOUTS[edo];
    if (!L) throw new Error('no drafted layout for ' + edo);
    return {
      scale: edo,
      rotation: L.rotation || 0,
      template: L.slots.map(s => (s ? s.slice() : null)),
      overrides: {},
      preset: String(edo)
    };
  }

  /** how many notes one seven-white period holds */
  function notesPerPeriod(template) {
    return XM.SIZE.whitesPerPeriod +
      template.reduce((n, s) => n + (s ? s.length : 0), 0);
  }

  /** the layer stack a design needs: white + whichever accidental layers are used */
  function layerCount(template, overrides) {
    return XM.spineLayerCount(
      XM.spineKindForColours(templateColours(template, overrides)));
  }

  /** the colours a template *asks* for — a quick answer for the palette UI.
   *  The spine a design actually gets is decided by the keys it places, in
   *  computeLayout below, because the 32-note limit can cut a slot off. */
  function templateColours(template, overrides) {
    const used = new Set(['white']);
    const scan = s => { if (s) for (const n of s) used.add(XM.KEY_TYPES[n].layer); };
    (template || []).forEach(scan);
    Object.values(overrides || {}).forEach(scan);
    return used;
  }

  function computeLayout(design) {
    const s = design.scale;
    const wW = XM.whiteWidth(s), wP = XM.whitePitch(s);
    const aW = XM.accWidth(s), delta = XM.slotDelta(s);
    const warnings = [];
    const rot = ((design.rotation | 0) % 7 + 7) % 7;

    /* ------------------------------------------------------------------
     * The instrument is one AKM320: 32 sensor feet, therefore EXACTLY 32
     * keys.  White keys are not a free parameter — they fall out of the
     * pattern.  Lay notes down left to right (white i, then slot i, then
     * white i+1, ...) and stop the moment the 32nd note is placed.
     *
     * That order is already sorted in x: a slot centre is
     *   white_i.cx + pitch/2 + bias·δ,
     * and |bias·δ| ≤ s/6 < pitch/2, so every slot lands strictly between
     * its two whites.
     * ------------------------------------------------------------------ */
    const NOTES = XM.NOTES;
    const whites = [], slots = [];
    let placed = 0, cut = null;

    for (let i = 0; placed < NOTES; i++) {
      const wp = (i + rot) % 7;
      const x0 = i * wP;
      whites.push({
        i, x0, x1: x0 + wW, cx: x0 + wW / 2, w: wW,
        period: wp, name: XM.WHITE_NAMES[wp], type: 'Full Sized White'
      });
      placed++;
      if (placed >= NOTES) break;

      const p = (i + rot) % 7;
      const names = Object.prototype.hasOwnProperty.call(design.overrides, i)
        ? design.overrides[i]
        : design.template[p];
      const wanted = names || [];
      if (!wanted.length) {
        slots.push({
          i, period: p, cx: whites[i].cx + wP / 2 + XM.SLOT_BIAS[p] * delta,
          w: aW, names: names ? names.slice() : null, members: [],
          group: XM.SLOT_GROUP[p], name: XM.SLOT_NAMES[p],
          overridden: Object.prototype.hasOwnProperty.call(design.overrides, i)
        });
        continue;
      }

      const cx = whites[i].cx + wP / 2 + XM.SLOT_BIAS[p] * delta;
      const members = [];
      for (let k = 0; k < wanted.length && placed < NOTES; k++) {
        const spec = XM.KEY_TYPES[wanted[k]];
        if (!spec) throw new Error('unknown key type: ' + wanted[k]);
        members.push({
          type: wanted[k], spec, cx, w: aW,
          x0: cx - aW / 2, x1: cx + aW / 2, slot: i, ord: k
        });
        placed++;
      }
      if (members.length < wanted.length) cut = { slot: i, kept: members.length, wanted: wanted.length };
      slots.push({
        i, period: p, cx, w: aW, names: names ? names.slice() : null,
        members, group: XM.SLOT_GROUP[p], name: XM.SLOT_NAMES[p],
        truncated: members.length < wanted.length,
        overridden: Object.prototype.hasOwnProperty.call(design.overrides, i)
      });
    }
    // a trailing empty slot carries no notes and no geometry — drop it
    while (slots.length && slots[slots.length - 1].i >= whites.length - 1 &&
           !slots[slots.length - 1].members.length) slots.pop();

    /* ---- neighbour context + the clearance the accidentals cut out ----
     * The drafted whites carry different internal ribbing depending on which
     * slots sit either side of them and how those slots are biased, so the
     * context is part of a white's identity, not decoration.              */
    for (const w of whites) {
      const gl = slots[w.i - 1], gr = slots[w.i];
      w.ctxL = (gl && gl.members.length) ? XM.SLOT_BIAS[gl.period] : null;
      w.ctxR = (gr && gr.members.length) ? XM.SLOT_BIAS[gr.period] : null;
      w.profileExact = XM.profileFor(w.type, w.ctxL, w.ctxR).exact;
      w.shL = w.x0;
      w.shR = w.x1;
      if (gl && gl.members.length) w.shL = Math.max(w.shL, gl.cx + gl.w / 2 + 0.6);
      if (gr && gr.members.length) w.shR = Math.min(w.shR, gr.cx - gr.w / 2 - 0.6);
      if (w.shR - w.shL < 6) warnings.push(
        `White ${w.i} (${w.name}): mid-section only ${(w.shR - w.shL).toFixed(2)} mm wide.`);
    }

    /* ---- validity checks ---- */
    for (const sl of slots) {
      if (sl.members.length > 2) warnings.push(
        `Slot ${sl.i} (${sl.name}) holds ${sl.members.length} keys — a split slot takes at most two.`);
      const rears = sl.members.filter(m => m.spec.pairRole === 'rear').length;
      const fronts = sl.members.filter(m => m.spec.pairRole === 'front').length;
      if (rears > 1) warnings.push(`Slot ${sl.i} (${sl.name}) has ${rears} rear keys — they would collide.`);
      if (fronts > 1) warnings.push(`Slot ${sl.i} (${sl.name}) has ${fronts} front keys — they would collide.`);
      if (sl.members.length === 2 && (rears !== 1 || fronts !== 1)) warnings.push(
        `Slot ${sl.i} (${sl.name}) pairs two keys of the same depth — use one rear (Split Black) and one front (Split Grey/Gray).`);
      if (sl.members.length > 1 && sl.members.some(m => !m.spec.pairRole)) warnings.push(
        `Slot ${sl.i} (${sl.name}) mixes a full-sized key with a split key.`);
    }

    /* ---- sensors: exactly 32, one per key, no chaining ---- */
    const notesEq = notesPerPeriod(design.template);
    const total = whites.length + slots.reduce((n, sl) => n + sl.members.length, 0);
    const feet = XM.footCentres();

    if (cut) warnings.push(
      `The 32-note limit lands inside slot ${cut.slot} (${XM.SLOT_NAMES[(cut.slot + rot) % 7]}): ` +
      `${cut.kept} of ${cut.wanted} keys placed. Change the pattern or the rotation if you want a whole slot there.`);

    /* ---- one note per foot, left to right ---- */
    const notes = [];
    for (const w of whites) {
      notes.push({ kind: 'white', ref: w, cx: w.cx, type: w.type });
      const sl = slots.find(q => q.i === w.i);
      if (sl) for (const m of sl.members) notes.push({ kind: 'acc', ref: m, cx: m.cx, type: m.type });
    }
    notes.sort((a, b) => a.cx - b.cx || (a.kind === 'white' ? -1 : 1));
    let footDrift = 0, footDriftAt = null;
    notes.forEach((n, k) => {
      n.index = k;
      n.foot = feet[k];
      n.degree = k % notesEq;
      n.equave = Math.floor(k / notesEq);
      n.ref.noteIndex = k;
      n.ref.foot = n.foot;
      n.ref.degree = n.degree;
      n.ref.half = k < XM.FEET_PER_HALF ? 'A' : 'B';
      const d = Math.abs(n.cx - n.foot);
      if (d > footDrift) { footDrift = d; footDriftAt = k; }
    });

    const width = whites.length ? whites[whites.length - 1].x1 : 0;
    const overhang = width - XM.SPINE.halfB.x1;
    if (overhang > 0.5) warnings.push(
      `The 32 keys span ${width.toFixed(1)} mm but the A+B spine ends at ` +
      `${XM.SPINE.halfB.x1.toFixed(1)} mm — the last ${overhang.toFixed(1)} mm overhangs. ` +
      `Lower the size scale s to about ${suggestScale(design, s).toFixed(2)}.`);
    /* NOTE: a large key-to-foot X offset is expected, not an error.  The two
     * halves of a split pair share one X and still have to reach two adjacent
     * feet 11.3 mm apart; closing that gap is the bridge edge-loop, which is
     * deliberately out of scope.  The figure is reported as a statistic. */

    /* ---- which of the six drafted spines this design needs ----
     * One slab per key colour actually PLACED — not per colour the template
     * mentions, because the 32-note limit can cut a slot off before its keys
     * are laid down, and an override on a slot the run never reaches is not
     * part of the instrument.  Gray takes the full three-layer stack: its
     * tongue is the bottom band and black's sits above it, so a design that
     * uses gray at all needs the three-type spine.  See spineKindForColours
     * in model.js.                                                        */
    const colours = new Set(['white']);
    for (const sl of slots) for (const m of sl.members) colours.add(m.spec.layer);
    const spineKind = XM.spineKindForColours(colours);
    const layers = XM.spineLayerCount(spineKind);
    const spineColours = ['gray', 'black', 'white'].filter(c => colours.has(c));

    return {
      design, whites, slots, notes, feet, warnings,
      nUnits: XM.UNITS, wW, wP, aW, delta, notesEq, total,
      layers, spineKind, colours, spineColours,
      width, overhang, footDrift, footDriftAt, cut
    };
  }

  /** how many white keys the 32-note limit yields for this pattern */
  function whiteCount(design) {
    const rot = ((design.rotation | 0) % 7 + 7) % 7;
    let placed = 0, last = 0;
    for (let i = 0; placed < XM.NOTES; i++) {
      last = i; placed++;
      if (placed >= XM.NOTES) break;
      const names = Object.prototype.hasOwnProperty.call(design.overrides, i)
        ? design.overrides[i] : design.template[(i + rot) % 7];
      placed += Math.min((names || []).length, XM.NOTES - placed);
    }
    return last + 1;
  }
  /** width(s) = 1.5·(n−1) + (37/24)·s·n  — linear, so solvable in closed form */
  function widthAt(design, s) {
    const n = whiteCount(design);
    return (n - 1) * XM.whitePitch(s) + XM.whiteWidth(s);
  }
  /** the size scale s at which the 32 keys just reach the end of the A+B spine */
  function suggestScale(design, s) {
    const n = whiteCount(design);
    const b = XM.SIZE.whitePerUnit * n;
    const a = XM.SIZE.whiteGap * (n - 1);
    if (Math.abs(b) < 1e-9) return s;
    return Math.max(1, (XM.SPINE.halfB.x1 - a) / b);
  }

  /* ------------------------------------------------------------------ *
   *  BOUNDS + WORLD ORIGIN                                              *
   * ------------------------------------------------------------------ */
  /** bounding box of the whole instrument — keys, spine and feet — in design mm */
  function bounds(L) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity,
        z0 = Infinity, z1 = -Infinity;
    const grow = (a, b, c, d, e, g) => {
      x0 = Math.min(x0, a); x1 = Math.max(x1, b);
      y0 = Math.min(y0, c); y1 = Math.max(y1, d);
      z0 = Math.min(z0, e); z1 = Math.max(z1, g);
    };
    for (const w of L.whites) {
      const e = XM.keyExtent(w.cx, L.wW, w.type, w.ctxL, w.ctxR);
      grow(e.x0, e.x1, e.y0, e.y1, e.z0, e.z1);
    }
    for (const sl of L.slots) for (const m of sl.members) {
      const e = XM.keyExtent(m.cx, L.aW, m.type, null, null);
      grow(e.x0, e.x1, e.y0, e.y1, e.z0, e.z1);
    }
    for (const [hn, half] of XM.spineHalves()) {
      const ls = XM.SPINE.layers[L.spineKind][hn];
      grow(half.x0, half.x1, half.yBack, half.yFront,
           ls[0].z0, ls[ls.length - 1].z1);
    }
    grow(L.feet[0] - XM.FOOT.w / 2, L.feet[L.feet.length - 1] + XM.FOOT.w / 2,
         XM.FOOT.yCentre - XM.FOOT.d / 2, XM.FOOT.yCentre + XM.FOOT.d / 2,
         XM.FOOT.z - 0.05, XM.FOOT.z + 0.05);
    return { x0, x1, y0, y1, z0, z1,
             cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2,
             w: x1 - x0, d: y1 - y0, h: z1 - z0 };
  }

  /* Where the design frame lands in Blender's world.
   *   X_world = x + off.x0
   *   Y_world = off.y0 - y
   *   Z_world = z + off.z0                                              */
  const ORIGIN_MODES = {
    centre: 'model centre at the world origin (0, 0, 0)',
    spine:  'X centred on 0; Y = 0 at the spine front face; Z = 0 at the spine bottom face',
    sheet:  'the drafting sandbox world position (round-trips into the Leveling .blend)'
  };
  function worldOffset(L, mode) {
    const b = bounds(L);
    if (mode === 'sheet')
      return { x0: XM.WORLD.x0, y0: XM.WORLD.y0, z0: XM.WORLD.z0, mode: 'sheet', b };
    if (mode === 'spine')
      return { x0: -b.cx, y0: 0, z0: 0, mode: 'spine', b };
    // default: the whole instrument's bounding box is centred on (0, 0, 0)
    return { x0: -b.cx, y0: b.cy, z0: -b.cz, mode: 'centre', b };
  }

  /* ------------------------------------------------------------------ *
   *  MESHES                                                             *
   * ------------------------------------------------------------------ */
  function buildMeshes(L) {
    const out = { white: [], black: [], gray: [] };
    for (const w of L.whites)
      out.white.push(...XM.buildKey(w.cx, L.wW, w.type, w.ctxL, w.ctxR));
    for (const sl of L.slots) {
      for (const m of sl.members)
        out[m.spec.layer].push(...XM.buildKey(m.cx, L.aW, m.type, null, null));
    }
    const spine = XM.buildSpine(L.spineKind);
    out.spine = [];
    for (const k of Object.keys(spine)) out.spine.push(...spine[k]);
    out.feet = XM.buildFeet();
    return out;
  }

  /* ------------------------------------------------------------------ *
   *  BINARY STL                                                         *
   * ------------------------------------------------------------------ */
  function toSTL(tris, name) {
    const n = tris.length / 9;
    const buf = new ArrayBuffer(84 + n * 50);
    const dv = new DataView(buf);
    const h = 'Xenachord Designer - ' + (name || 'part');
    for (let i = 0; i < Math.min(79, h.length); i++) dv.setUint8(i, h.charCodeAt(i));
    dv.setUint32(80, n, true);
    let o = 84;
    for (let t = 0; t < n; t++) {
      const i9 = t * 9;
      const ax = tris[i9], ay = tris[i9+1], az = tris[i9+2];
      const bx = tris[i9+3], by = tris[i9+4], bz = tris[i9+5];
      const cx = tris[i9+6], cy = tris[i9+7], cz = tris[i9+8];
      const ux = bx-ax, uy = by-ay, uz = bz-az;
      const vx = cx-ax, vy = cy-ay, vz = cz-az;
      let nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx/len, true); dv.setFloat32(o+4, ny/len, true); dv.setFloat32(o+8, nz/len, true);
      dv.setFloat32(o+12, ax, true); dv.setFloat32(o+16, ay, true); dv.setFloat32(o+20, az, true);
      dv.setFloat32(o+24, bx, true); dv.setFloat32(o+28, by, true); dv.setFloat32(o+32, bz, true);
      dv.setFloat32(o+36, cx, true); dv.setFloat32(o+40, cy, true); dv.setFloat32(o+44, cz, true);
      dv.setUint16(o+48, 0, true);
      o += 50;
    }
    return buf;
  }

  /* ------------------------------------------------------------------ *
   *  STORE-ONLY ZIP                                                     *
   * ------------------------------------------------------------------ */
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(b) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function makeZip(files) {
    const enc = new TextEncoder(), locals = [], centrals = [];
    let off = 0;
    for (const f of files) {
      const nb = enc.encode(f.name);
      const data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
      const crc = crc32(data);
      const local = new Uint8Array(30 + nb.length + data.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
      lv.setUint16(26, nb.length, true);
      local.set(nb, 30); local.set(data, 30 + nb.length);
      locals.push(local);
      const cent = new Uint8Array(46 + nb.length);
      const cv = new DataView(cent.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, nb.length, true); cv.setUint32(42, off, true);
      cent.set(nb, 46);
      centrals.push(cent);
      off += local.length;
    }
    const cs = centrals.reduce((a, c) => a + c.length, 0);
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, cs, true); ev.setUint32(16, off, true);
    const bytes = new Uint8Array(off + cs + 22);
    let p = 0;
    for (const l of locals) { bytes.set(l, p); p += l.length; }
    for (const c of centrals) { bytes.set(c, p); p += c.length; }
    bytes.set(end, p);
    return bytes.buffer;
  }

  /* ------------------------------------------------------------------ *
   *  BLENDER PYTHON LOG                                                 *
   *                                                                     *
   *  A complete, runnable bpy script:  a readable data header first,     *
   *  then a builder that reproduces the design in Blender.  If the       *
   *  "Key Type Categories" collection is present it duplicates those     *
   *  real meshes (exact geometry); otherwise it drops proxy boxes.       *
   * ------------------------------------------------------------------ */
  const f = (v, n) => Number(v).toFixed(n == null ? 5 : n);

  /* Every number the generated builder computes with goes through pn().
   * String(v) is JavaScript's shortest decimal that round-trips to the very
   * same double, so Python's float() reads back the identical bits — which
   * is what makes the Blender build and the WebGL preview the same model
   * rather than two models that agree to a few decimals.  Display-only
   * columns still use f(); geometry never does.                           */
  const pn = v => {
    if (v == null) return 'None';
    if (!isFinite(v)) return String(v);
    const s = String(v);
    return /[.e]/.test(s) ? s : s + '.0';
  };

  function pythonLog(L, opts) {
    const d = L.design;
    const O = worldOffset(L, (opts && opts.origin) || 'centre');
    const W = O, b = O.b;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const out = [];
    const p = (...a) => out.push(a.join(''));
    const seen = usedProfiles(L);      // tags every note with its profile key

    p('# =========================================================================');
    p('# XENACHORD DESIGNER — DESIGN LOG');
    p('# generated ', now, '  (paste into Blender\'s Text Editor and Run Script)');
    p('#');
    p('# WORLD PLACEMENT: ', ORIGIN_MODES[O.mode]);
    p('#   the built keyboard spans');
    p('#     X  ', f(b.x0 + O.x0, 4), ' .. ', f(b.x1 + O.x0, 4), '   (', f(b.w, 4), ' mm)');
    p('#     Y  ', f(O.y0 - b.y1, 4), ' .. ', f(O.y0 - b.y0, 4), '   (', f(b.d, 4), ' mm)');
    p('#     Z  ', f(b.z0 + O.z0, 4), ' .. ', f(b.z1 + O.z0, 4), '   (', f(b.h, 4), ' mm)');
    p('#   centre ', f(b.cx + O.x0, 4), ', ', f(O.y0 - b.cy, 4), ', ', f(b.cz + O.z0, 4));
    p('#');
    p('# Design frame (x/y/z below) -> Blender world:');
    p('#   X_world = x + ', pn(O.x0), '     x = 0 at the leftmost white key\'s left edge');
    p('#   Y_world = ', pn(O.y0), ' - y     y = 0 at the spine front face, + toward the player');
    p('#   Z_world = z + ', pn(O.z0), '     z = 0 at the spine bottom face');
    p('#   (set ORIGIN below to \'sheet\' to get the drafting sandbox position instead)');
    p('#');
    p('# FIXED SPINE <-> FOOT RELATIONSHIP (never varies)');
    p('#   foot pad        ', f(XM.FOOT.w, 3), ' x ', f(XM.FOOT.d, 3), ' mm');
    p('#   foot pitch      ', f(XM.FOOT.pitch, 5), ' mm');
    p('#   foot centre     y = ', f(XM.FOOT.yCentre, 5), ' mm in front of the spine front face');
    p('#   foot plane      z = ', f(XM.FOOT.z, 5), ' mm below the spine bottom face');
    p('# =========================================================================');
    p('');
    p('DESIGN = {');
    p('    "scale":        ', d.scale, ',            # every width is linear in this');
    p('    "notes_equave": ', L.notesEq, ',');
    p('    "whites":       ', L.whites.length, ',            # derived, not a free parameter');
    p('    "rotation":     ', ((d.rotation | 0) % 7 + 7) % 7, ',            # white #0 sits on period slot this index');
    p('    "total_keys":   ', L.total, ',            # ALWAYS 32 — one per sensor foot');
    p('    "akm320_units": 1,            # always one: spine half A + half B');
    p('    "key_colours":  ', L.spineColours.length, ',            # ',
      L.spineColours.join(' + '));
    p('    "spine_type":   "', L.spineKind, ' type",   # ', L.layers,
      ' layer', L.layers === 1 ? '' : 's', ' — one per key colour',
      L.colours.has('gray')
        ? '; gray always takes all three' : '');
    p('    "white_width":  ', f(L.wW), ',');
    p('    "white_pitch":  ', f(L.wP), ',');
    p('    "acc_width":    ', f(L.aW), ',');
    p('    "slot_delta":   ', f(L.delta), ',');
    p('}');
    p('');
    p('# --- world placement -----------------------------------------------------');
    p('WORLD_X0 = ', pn(O.x0), '      # X_world = x + WORLD_X0');
    p('WORLD_Y0 = ', pn(O.y0), '      # Y_world = WORLD_Y0 - y');
    p('WORLD_Z0 = ', pn(O.z0), '      # Z_world = z + WORLD_Z0');
    p('ORIGIN   = "', O.mode, '"        # ', ORIGIN_MODES[O.mode]);
    p('');
    p('# --- repeating seven-slot template (one period = 7 white keys) ----------');
    p('TEMPLATE = [');
    for (let i = 0; i < 7; i++) {
      const t = d.template[i];
      const body = t ? '[' + t.map(n => '"' + n + '"').join(', ') + ']' : 'None';
      p('    ', body, ',', ' '.repeat(Math.max(1, 46 - body.length)),
        '# slot ', i, '  ', XM.SLOT_NAMES[i], '  bias ',
        XM.SLOT_BIAS[i] > 0 ? '+' : XM.SLOT_BIAS[i] < 0 ? '-' : ' ',
        XM.SLOT_BIAS[i] ? 'delta' : '0    ', '  (', XM.SLOT_GROUP[i], ')');
    }
    p(']');
    p('');

    /* --- key table ---------------------------------------------------- */
    p('# --- the 32 keys, left to right, one per sensor foot -------------------');
    p('# (name, type, x_centre, width, depth, profile,');
    p('#  world_x, world_y_back, world_z_bottom, foot_x)');
    p('# "profile" names the drafted key this one is instantiated from.  For a');
    p('# white it carries the neighbour context "<leftBias>|<rightBias>" ("n" =');
    p('# that slot is empty), because the drafted whites rib differently');
    p('# depending on what sits beside them.');
    p('# KEYS is always exactly 32 entries long. KEYS[i] belongs to FEET[i].');
    p('KEYS = [');
    for (const n of L.notes) {
      const r = n.ref;
      const spec = XM.KEY_TYPES[n.type];
      const white = spec.kind === 'white';
      const w = white ? L.wW : L.aW;
      const e = XM.keyExtent(r.cx, w, n.type, white ? r.ctxL : null, white ? r.ctxR : null);
      const nm = 'K' + String(n.index).padStart(2, '0') + '_' +
        (n.kind === 'white' ? 'W' + r.i + '_' + r.name
                            : 'A' + r.slot + '_' + (r.ord + 1));
      p('    ("', nm, '", "', n.type, '", ',
        pn(r.cx), ', ', pn(w), ', ', f(e.y1 - e.y0), ', "', n.profileKey, '", ',
        f(r.cx + W.x0, 4), ', ', f(W.y0, 4), ', ', f(e.z0 + W.z0), ', ',
        r.foot == null ? 'None' : f(r.foot + W.x0, 4), '),');
    }
    p(']');
    p('');

    /* --- spine + feet ------------------------------------------------- */
    p('# --- spine --------------------------------------------------------------');
    p('# This design places ', L.spineColours.length, ' key colour',
      L.spineColours.length === 1 ? '' : 's', ' (', L.spineColours.join(', '),
      '), so it takes the');
    p('# ', L.spineKind, '-type spine: one slab per colour, each key\'s rear tongue');
    p('# plugging into the layer belonging to its own colour.  Gray always takes');
    p('# all three layers — its tongue is the bottom band and black\'s sits above');
    p('# it, so the two are stacked rather than alternatives.');
    p('# Halves A and B were drafted separately and their layer bands differ by');
    p('# up to 0.011 mm, so each half carries its own faces and its own stack —');
    p('# read verbatim out of "', L.spineKind, ' type Spine - A" / "- B".');
    p('SPINE = {');
    p('    "y_back": ', pn(XM.SPINE.yBack), ', "y_front": ', pn(XM.SPINE.yFront),
      ',   # nominal; per-half faces below');
    p('    "halves": [   # (half, x0, x1, y_back, y_front, layers)');
    p('                  # 16 sensor feet each, and only ever these two');
    for (const [hn, half] of XM.spineHalves()) {
      p('        ("', hn, '", ', pn(half.x0), ', ', pn(half.x1), ', ',
        pn(half.yBack), ', ', pn(half.yFront), ', [');
      for (const lay of XM.SPINE.layers[L.spineKind][hn])
        p('            ("', lay.name, '", ', pn(lay.z0), ', ', pn(lay.z1), '),');
      p('        ]),');
    }
    p('    ],');
    p('    # the PCB channel: a full-length slot in the underside of each');
    p('    # half, open at both x ends, ceiling at z = ', pn(XM.SPINE.channel.zTop));
    p('    "channel": {   # half -> (y_back_edge, y_front_edge)');
    for (const [hn] of XM.spineHalves())
      p('        "', hn, '": (', pn(XM.SPINE.channel[hn].y0), ', ',
        pn(XM.SPINE.channel[hn].y1), '),');
    p('    },');
    p('    "channel_z": ', pn(XM.SPINE.channel.zTop), ',');
    p('    # 8 obround mounting holes per half — NOT rectangles.  The bottom');
    p('    # layer takes the wide bore, every layer above it the narrow one.');
    p('    "hole_r": (', pn(XM.SPINE.hole.rLower), ', ', pn(XM.SPINE.hole.rUpper), '),');
    p('    "hole_straight": ', pn(XM.SPINE.hole.straight), ',');
    p('    "hole_seg": ', XM.SPINE.hole.seg, ',');
    p('    # unit ring: (which half-circle, cos, sin), CCW — the browser\'s own doubles');
    p('    "hole_unit": [');
    for (const u of XM.HOLE_UNIT)
      p('        (', u[0], ', ', pn(u[1]), ', ', pn(u[2]), '),');
    p('    ],');
    for (const [tbl, nm] of [[XM.SPINE.holesLower, 'holes_lower'],
                             [XM.SPINE.holesUpper, 'holes_upper']]) {
      p('    "', nm, '": {');
      for (const [hn] of XM.spineHalves())
        p('        "', hn, '": [',
          tbl[hn].map(c => '(' + pn(c[0]) + ', ' + pn(c[1]) + ')').join(', '), '],');
      p('    },');
    }
    p('}');
    p('');
    p('# --- the 32 sensor feet (16 on half A, 16 on half B) --------------------');
    p('FEET = [');
    const fc = L.feet;
    for (let i = 0; i < fc.length; i += 8)
      p('    ', fc.slice(i, i + 8).map(v => pn(v)).join(', '), ',');
    p(']');
    p('assert len(KEYS) == 32, "this keyboard has exactly 32 keys"');
    p('assert len(FEET) == 32, "one AKM320: 16 feet on half A, 16 on half B"');
    p('');
    if (L.warnings.length) {
      p('# --- warnings on this design -------------------------------------------');
      for (const w of L.warnings) p('#   ! ', w);
      p('');
    }

    /* --- builder ------------------------------------------------------ */
    p(builderSource(L, seen));
    return out.join('\n');
  }
  /* ------------------------------------------------------------------ *
   *  THE GENERATED BUILDER                                              *
   *                                                                     *
   *  The Python below is a line-for-line port of the mesh code in        *
   *  model.js — the same code the WebGL preview runs.  Every constant    *
   *  is injected from XM rather than retyped, and every number goes      *
   *  through pn(), so Blender evaluates the identical doubles the        *
   *  browser did.  Run the log and you get the preview: same parts,      *
   *  same vertices, same faces.                                         *
   * ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ *
   *  THE GENERATED BUILDER                                              *
   *                                                                     *
   *  The Python below runs the same code the WebGL preview runs: the     *
   *  drafted key profiles instantiated at this design's widths, plus the *
   *  spine and feet.  Every number is written at full double precision,  *
   *  and the profile table is copied verbatim from profiles.js, so       *
   *  Blender evaluates the identical doubles the browser did.           *
   * ------------------------------------------------------------------ */

  /** the profiles this design actually uses, keyed for the Python table */
  function usedProfiles(L) {
    const seen = new Map();
    const idOf = (type, lb, rb) => {
      const key = type + '|' + XM.ctxKey(lb, rb);
      if (!seen.has(key))
        seen.set(key, { key, type, q: XM.profileFor(type, lb, rb) });
      return key;
    };
    for (const n of L.notes) {
      const r = n.ref;
      n.profileKey = n.kind === 'white'
        ? idOf(n.type, r.ctxL, r.ctxR)
        : idOf(n.type, null, null);
    }
    return seen;
  }

  function pyProfiles(seen) {
    const rows = [];
    for (const { key, q } of seen.values()) {
      rows.push('    "' + key + '": {');
      rows.push('        "nv": ' + q.p.nv + ', "mirror": ' + (q.mirror ? 'True' : 'False') + ',');
      rows.push('        "v": [' + Array.from(q.p.v).map(pn).join(',') + '],');
      rows.push('        "f": [' + Array.from(q.p.f).join(',') + '],');
      rows.push('    },');
    }
    return 'KEY_PROFILES = {\n' + rows.join('\n') + '\n}';
  }

  function pyLayers() {
    const rows = XM.TYPE_ORDER.map(n =>
      '    "' + n + '": "' + XM.KEY_TYPES[n].layer + '",');
    return 'KEY_LAYER = {\n' + rows.join('\n') + '\n}';
  }

  function pyColours() {
    const rows = Object.keys(XM.COLORS).map(k =>
      '    "' + k + '": (' + XM.COLORS[k].map(pn).join(', ') + '),');
    return 'COLOURS = {\n' + rows.join('\n') + '\n}';
  }

  function builderSource(L, seen) {
    return `# =========================================================================
# BUILDER — the designer's own geometry, as Python
#
# Key meshes are not modelled here and they are not modelled in the browser
# either: they ARE the drafted keys out of the 15 / 17 / 19 Layout
# collections, stored per vertex as
#
#     x = alpha + beta * width          y, z constant
#
# and instantiated at this design's widths.  Whites carry one profile per
# neighbour context, because the drafted whites rib differently depending on
# which slots sit either side of them.  Only the profiles this design uses
# are written out.
#
# Run this in Blender and you get the WebGL preview: the same parts, the same
# vertices, the same faces, in the same places.
#
# Set USE_BLEND_CATEGORIES = True to duplicate the sandbox's own objects
# instead.  That only works inside the drafting .blend, and it is no longer
# more accurate than building from the profiles — it is the same geometry.
# =========================================================================
import bpy
from mathutils import Vector

TARGET_COLLECTION    = "Xenachord Generated"
ROOT_EMPTY           = "Xenachord Root"
CATEGORY_COLLECTION  = "Key Type Categories"
USE_BLEND_CATEGORIES = False

# The drafting sandbox datum.  Used only by the USE_BLEND_CATEGORIES path,
# to lift the sheet's geometry onto whatever origin this log was cut for.
SHEET_X0, SHEET_Y0, SHEET_Z0 = ${pn(XM.WORLD.x0)}, ${pn(XM.WORLD.y0)}, ${pn(XM.WORLD.z0)}

FOOT_W, FOOT_D   = ${pn(XM.FOOT.w)}, ${pn(XM.FOOT.d)}
FOOT_YC, FOOT_Z  = ${pn(XM.FOOT.yCentre)}, ${pn(XM.FOOT.z)}
# The mounting holes are obrounds and the spine underside is channelled;
# both live in SPINE above, read verbatim out of the drafting sandbox.

${pyLayers()}

${pyColours()}

LAYER_PART = {"white": "Keys - White", "black": "Keys - Black", "gray": "Keys - Gray"}

# --- the drafted key profiles used by this design ------------------------
# "v" is [alpha, beta, y, z] per vertex; "f" is [n, i0..in-1] face runs.
${pyProfiles(seen)}


# =========================================================================
# FACE TRIANGULATION — ear clipping, NOT a fan
#
# The drafted faces are n-gons and many of them are CONCAVE: the step a
# white key takes around its neighbouring accidentals is cut into the key's
# own top, underside and shoulder faces, so those polygons have reflex
# corners by construction.  A fan from vertex 0 is only valid on a convex
# polygon; on these it lays triangles straight across the notch — a wall
# joining two corners that nothing joins in the sheet, and on a white key
# it paves over the very clearance the key is cut back to provide.
#
# This is a literal transliteration of triangulateFace() in model.js, so
# the Blender build, the WebGL preview and the exported STLs stay the same
# mesh, triangle for triangle.
# =========================================================================
TRI_EPS = 1e-9


def _tri2(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _in_tri2(p, a, b, c):
    # strictly inside — a point exactly on an edge does not block the ear
    return (_tri2(a, b, p) > TRI_EPS and
            _tri2(b, c, p) > TRI_EPS and
            _tri2(c, a, p) > TRI_EPS)


def triangulate_face(V, ring):
    """ring is a list of indices into V; returns index triples wound to
    match the face's own (Newell) normal."""
    m = len(ring)
    if m < 3:
        return []
    if m == 3:
        return [(ring[0], ring[1], ring[2])]

    nx = ny = nz = 0.0
    for i in range(m):
        a = V[ring[i]]
        b = V[ring[(i + 1) % m]]
        nx += (a[1] - b[1]) * (a[2] + b[2])
        ny += (a[2] - b[2]) * (a[0] + b[0])
        nz += (a[0] - b[0]) * (a[1] + b[1])
    ax, ay, az = abs(nx), abs(ny), abs(nz)

    # drop the dominant axis; the remaining pair is cyclic, so the sign of
    # the 2-D signed area is the sign of that axis' normal component
    if az >= ax and az >= ay:
        pick = lambda p: (p[0], p[1]); sign = nz
    elif ay >= ax:
        pick = lambda p: (p[2], p[0]); sign = ny
    else:
        pick = lambda p: (p[1], p[2]); sign = nx

    P = [pick(V[i]) for i in ring]
    flip = sign < 0.0
    poly = [(m - 1 - i) if flip else i for i in range(m)]
    out = []

    def emit(i0, i1, i2):
        if flip:
            out.append((ring[i2], ring[i1], ring[i0]))
        else:
            out.append((ring[i0], ring[i1], ring[i2]))

    guard = 4 * m * m + 16
    while len(poly) > 3 and guard > 0:
        guard -= 1
        clipped = False
        for i in range(len(poly)):
            n = len(poly)
            i0, i1, i2 = poly[i], poly[(i + 1) % n], poly[(i + 2) % n]
            a, b, c = P[i0], P[i1], P[i2]
            if _tri2(a, b, c) <= TRI_EPS:
                continue                       # reflex or degenerate
            blocked = False
            for j in range(n):
                q = poly[j]
                if q == i0 or q == i1 or q == i2:
                    continue
                if _in_tri2(P[q], a, b, c):
                    blocked = True
                    break
            if blocked:
                continue
            emit(i0, i1, i2)
            del poly[(i + 1) % n]
            clipped = True
            break
        if clipped:
            continue
        # No ear this pass — the drafted polygon is degenerate here (a
        # collinear run) or self-intersecting in its own plane, which a few
        # sheet faces are.  Clip the least-bad corner anyway and EMIT it: a
        # zero-area triangle costs nothing and keeps every boundary edge
        # paired, so the key stays watertight for the slicer.
        bi, bs = 0, -1e300
        for i in range(len(poly)):
            n = len(poly)
            s = _tri2(P[poly[i]], P[poly[(i + 1) % n]], P[poly[(i + 2) % n]])
            if s > bs:
                bs, bi = s, i
        n = len(poly)
        emit(poly[bi], poly[(bi + 1) % n], poly[(bi + 2) % n])
        del poly[(bi + 1) % n]
    if len(poly) == 3:
        emit(poly[0], poly[1], poly[2])
    else:
        for i in range(1, len(poly) - 1):
            emit(poly[0], poly[i], poly[i + 1])
    return out


# =========================================================================
# KEY GEOMETRY — a drafted profile, instantiated
# =========================================================================
def build_key(cx, w, prof):
    v, n, mirror = prof["v"], prof["nv"], prof["mirror"]
    x_left = cx - w / 2.0
    V = [None] * n
    for i in range(n):
        j = i * 4
        x = v[j] + v[j + 1] * w
        if mirror:
            x = w - x
        V[i] = (x_left + x, v[j + 2], v[j + 3])
    t = []
    f = prof["f"]
    k = 0
    while k < len(f):
        m = f[k]
        k += 1
        ring = list(f[k:k + m])
        k += m
        if mirror:
            ring = ring[::-1]          # mirroring flips face winding
        for (a, b, c) in triangulate_face(V, ring):
            t.append(V[a])
            t.append(V[b])
            t.append(V[c])
    return t


# =========================================================================
# SPINE + FEET GEOMETRY
# =========================================================================
def push_tri(t, a, b, c):
    t.append(a); t.append(b); t.append(c)


def push_quad(t, a, b, c, d):
    push_tri(t, a, b, c); push_tri(t, a, c, d)


def push_box(t, x0, x1, y0, y1, z0, z1):
    if x1 - x0 < 1e-5 or y1 - y0 < 1e-5 or z1 - z0 < 1e-5:
        return
    p = lambda x, y, z: (x, y, z)
    push_quad(t, p(x0,y0,z0), p(x0,y1,z0), p(x1,y1,z0), p(x1,y0,z0))   # -z
    push_quad(t, p(x0,y0,z1), p(x1,y0,z1), p(x1,y1,z1), p(x0,y1,z1))   # +z
    push_quad(t, p(x0,y0,z0), p(x1,y0,z0), p(x1,y0,z1), p(x0,y0,z1))   # -y
    push_quad(t, p(x1,y0,z0), p(x1,y1,z0), p(x1,y1,z1), p(x1,y0,z1))   # +x
    push_quad(t, p(x1,y1,z0), p(x0,y1,z0), p(x0,y1,z1), p(x1,y1,z1))   # +y
    push_quad(t, p(x0,y1,z0), p(x0,y0,z0), p(x0,y0,z1), p(x0,y1,z1))   # -x


def rect_with_holes(x0, x1, y0, y1, holes, emit):
    if x1 - x0 < 1e-4 or y1 - y0 < 1e-4:
        return
    hit = None
    for c in holes:
        a, b = max(x0, c[0]), min(x1, c[1])
        p, q = max(y0, c[2]), min(y1, c[3])
        if b - a > 1e-4 and q - p > 1e-4:
            hit = (a, b, p, q)
            break
    if hit is None:
        emit(x0, x1, y0, y1)
        return
    rect_with_holes(x0, hit[0], y0, y1, holes, emit)
    rect_with_holes(hit[1], x1, y0, y1, holes, emit)
    rect_with_holes(hit[0], hit[1], y0, hit[2], holes, emit)
    rect_with_holes(hit[0], hit[1], hit[3], y1, holes, emit)


# The unit obround: (which half-circle, cos, sin) per point, CCW.  These are
# the browser's own doubles, so no trig is re-run here and Blender lands on
# the identical vertices.
HOLE_UNIT = SPINE["hole_unit"]


def obround_ring(cx, cy, r, straight):
    """The drafted mounting hole: a 32-segment circle cut at +/-90 deg, the
    two halves held *straight* mm apart along x, closed with tangent lines
    top and bottom.  Rounded ends, flat sides — 34 points."""
    return [(cx + h * straight / 2.0 + r * cu, cy + r * su)
            for (h, cu, su) in HOLE_UNIT]


def spine_holes(half, upper):
    tbl = SPINE["holes_upper" if upper else "holes_lower"][half]
    r = SPINE["hole_r"][1 if upper else 0]
    s = SPINE["hole_straight"]
    out = []
    for (cx, cy) in tbl:
        out.append(dict(cx=cx, cy=cy, ring=obround_ring(cx, cy, r, s),
                        x0=cx - s / 2.0 - r, x1=cx + s / 2.0 + r,
                        y0=cy - r, y1=cy + r))
    return out


def hole_box_point(h, p):
    dx, dy = p[0] - h["cx"], p[1] - h["cy"]
    sx = (h["x1"] - h["cx"]) / dx if dx > 0 else ((h["x0"] - h["cx"]) / dx if dx < 0 else float("inf"))
    sy = (h["y1"] - h["cy"]) / dy if dy > 0 else ((h["y0"] - h["cy"]) / dy if dy < 0 else float("inf"))
    s = min(sx, sy)
    side = (0 if dx > 0 else 2) if sx <= sy else (1 if dy > 0 else 3)
    return (h["cx"] + dx * s, h["cy"] + dy * s), side


def push_hole_annulus(t, h, z, up):
    """the gap between a hole's bounding box and its obround ring"""
    C = [(h["x1"], h["y1"]), (h["x0"], h["y1"]), (h["x0"], h["y0"]), (h["x1"], h["y0"])]
    def tri(a, b, c):
        # the ring touches its own bounding box at four points, so a few of
        # these come out with no area at all — drop them rather than ship
        # slivers into the STL
        cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        if abs(cr) < 1e-12:
            return
        if up > 0:
            push_tri(t, (a[0], a[1], z), (b[0], b[1], z), (c[0], c[1], z))
        else:
            push_tri(t, (a[0], a[1], z), (c[0], c[1], z), (b[0], b[1], z))
    ring = h["ring"]
    n = len(ring)
    for i in range(n):
        a, b = ring[i], ring[(i + 1) % n]
        pa, sa = hole_box_point(h, a)
        pb, sb = hole_box_point(h, b)
        path = [pa]
        s = sa
        while s != sb:
            path.append(C[s])
            s = (s + 1) % 4
        path.append(pb)
        for j in range(len(path) - 1):
            tri(a, path[j], path[j + 1])
        tri(a, path[-1], b)


def push_hole_wall(t, h, z0, z1):
    ring = h["ring"]
    n = len(ring)
    for i in range(n):
        a, b = ring[i], ring[(i + 1) % n]
        push_quad(t, (a[0], a[1], z0), (a[0], a[1], z1),
                     (b[0], b[1], z1), (b[0], b[1], z0))


def push_spine_slab(t, x0, x1, y0, y1, z0, z1, holes):
    rect_with_holes(x0, x1, y0, y1,
                    [(h["x0"], h["x1"], h["y0"], h["y1"]) for h in holes],
                    lambda a, b, c, d: push_box(t, a, b, c, d, z0, z1))
    for h in holes:
        push_hole_annulus(t, h, z1, +1)
        push_hole_annulus(t, h, z0, -1)
        push_hole_wall(t, h, z0, z1)


def build_spine_slab(half, x0, x1, y_back, y_front, z0, z1, bottom):
    """One (half, layer).  The bottom layer carries the PCB channel: below
    the ceiling it is two strips, front and back; above it, the full section
    with the wide bore.  Every layer above takes the narrow bore."""
    t = []
    if bottom:
        zc = SPINE["channel_z"]
        cy0, cy1 = SPINE["channel"][half]
        push_box(t, x0, x1, y_back, cy0, z0, zc)
        push_box(t, x0, x1, cy1, y_front, z0, zc)
        push_spine_slab(t, x0, x1, y_back, y_front, zc, z1, spine_holes(half, False))
    else:
        push_spine_slab(t, x0, x1, y_back, y_front, z0, z1, spine_holes(half, True))
    return t


def build_foot(cx):
    t = []
    push_box(t, cx - FOOT_W / 2.0, cx + FOOT_W / 2.0,
             FOOT_YC - FOOT_D / 2.0, FOOT_YC + FOOT_D / 2.0,
             FOOT_Z - 0.05, FOOT_Z + 0.05)
    return t


# =========================================================================
# BLENDER PLUMBING
# =========================================================================
def to_world(x, y, z):
    return (x + WORLD_X0, WORLD_Y0 - y, z + WORLD_Z0)


def new_collection(name, parent):
    c = bpy.data.collections.new(name)
    parent.children.link(c)
    return c


def get_material(key):
    rgb = COLOURS[key]
    name = "Xenachord " + key
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        if getattr(m, "node_tree", None) is None:
            try:
                m.use_nodes = True      # removed in Blender 6; nodes are implicit
            except Exception:
                pass
        bsdf = m.node_tree.nodes.get("Principled BSDF") if m.node_tree else None
        if bsdf is not None:
            bsdf.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
            if "Roughness" in bsdf.inputs:
                bsdf.inputs["Roughness"].default_value = 0.45
    m.diffuse_color = (rgb[0], rgb[1], rgb[2], 1.0)
    return m


def make_mesh_object(name, tris, coll, mat):
    """tris is the flat triangle soup the browser hands to WebGL, in design
    coordinates.  design -> world flips Y, which mirrors handedness, so each
    face is emitted reversed to keep its normal pointing outward."""
    verts, faces, index = [], [], {}
    for i in range(0, len(tris), 3):
        face = []
        for k in (0, 2, 1):
            p = to_world(*tris[i + k])
            key = (round(p[0], 6), round(p[1], 6), round(p[2], 6))
            j = index.get(key)
            if j is None:
                j = len(verts)
                index[key] = j
                verts.append(p)
            face.append(j)
        if len(set(face)) == 3:
            faces.append(tuple(face))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate(verbose=False)
    me.update()
    if mat is not None:
        me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def make_root(coll):
    # An empty at the world origin.  Everything is parented to it, so the
    # keyboard as a whole is driven from (0, 0, 0).
    root = bpy.data.objects.new(ROOT_EMPTY, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 25.0
    root.location = (0.0, 0.0, 0.0)
    coll.objects.link(root)
    return root


# ---- the optional "duplicate the sandbox's own objects" path ------------
def world_bbox(ob):
    ws = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return (min(v.x for v in ws), max(v.x for v in ws),
            min(v.y for v in ws), max(v.y for v in ws),
            min(v.z for v in ws), max(v.z for v in ws))


def find_category(type_name):
    """Categories are named e.g. 'Full Sized Black (from 15)'."""
    col = bpy.data.collections.get(CATEGORY_COLLECTION)
    if col is None:
        return None
    for ob in col.objects:
        if ob.name.split("(from")[0].strip() == type_name:
            return ob
    return None


def place_from_category(src, name, x_centre, width, coll):
    ob = src.copy()
    ob.data = src.data.copy()
    ob.name = name
    coll.objects.link(ob)
    x0, x1, y0, y1, z0, z1 = world_bbox(src)
    src_w = x1 - x0
    if src_w > 1e-9 and abs(width - src_w) > 1e-9:
        ob.scale = (ob.scale.x * (width / src_w), ob.scale.y, ob.scale.z)
    bpy.context.view_layer.update()
    nx0, nx1, ny0, ny1, nz0, nz1 = world_bbox(ob)
    ob.location.x += (x_centre + WORLD_X0) - (nx0 + nx1) / 2.0
    ob.location.y += WORLD_Y0 - ny1          # back face onto the spine front
    ob.location.z += WORLD_Z0 - SHEET_Z0     # spine bottom face onto z = 0
    return ob


def copy_sheet_collection(src_name, dst_coll):
    """Duplicate a sandbox collection wholesale onto this log's origin."""
    col = bpy.data.collections.get(src_name)
    if col is None:
        return 0
    dx, dy, dz = WORLD_X0 - SHEET_X0, WORLD_Y0 - SHEET_Y0, WORLD_Z0 - SHEET_Z0
    n = 0
    for src in col.objects:
        ob = src.copy()
        if src.data is not None:
            ob.data = src.data.copy()
        dst_coll.objects.link(ob)
        ob.location = (ob.location.x + dx, ob.location.y + dy, ob.location.z + dz)
        n += 1
    return n


# =========================================================================
def build():
    scene = bpy.context.scene.collection
    root_coll = new_collection(TARGET_COLLECTION, scene)
    part = {}
    for nm in ("Keys - White", "Keys - Black", "Keys - Gray", "Spine", "Feet"):
        part[nm] = new_collection(nm, root_coll)
    root = make_root(root_coll)
    mats = dict((k, get_material(k)) for k in COLOURS)

    keys_from_sheet = 0
    for (name, ktype, cx, width, depth, profile,
         wx, wy, wz, foot) in KEYS:
        coll = part[LAYER_PART[KEY_LAYER[ktype]]]
        if USE_BLEND_CATEGORIES:
            src = find_category(ktype)
            if src is not None:
                place_from_category(src, name, cx, width, coll)
                keys_from_sheet += 1
                continue
        make_mesh_object(name, build_key(cx, width, KEY_PROFILES[profile]),
                         coll, mats[KEY_LAYER[ktype]])

    spine_from_sheet = feet_from_sheet = 0
    if USE_BLEND_CATEGORIES:
        kind = DESIGN["spine_type"].split()[0].capitalize()
        spine_from_sheet = (copy_sheet_collection(kind + " type Spine - A", part["Spine"]) +
                            copy_sheet_collection(kind + " type Spine - B", part["Spine"]))
        feet_from_sheet = (copy_sheet_collection("Feet - A", part["Feet"]) +
                           copy_sheet_collection("Feet - B", part["Feet"]))

    if not spine_from_sheet:
        for (hname, hx0, hx1, hy_back, hy_front, layers) in SPINE["halves"]:
            for li, (lname, lz0, lz1) in enumerate(layers):
                tris = build_spine_slab(hname, hx0, hx1, hy_back, hy_front,
                                        lz0, lz1, li == 0)
                make_mesh_object("Spine_%s_%s" % (hname, lname), tris,
                                 part["Spine"], mats["spine"])

    if not feet_from_sheet:
        for i, fx in enumerate(FEET):
            make_mesh_object("Foot_%s_%02d" % ("A" if i < 16 else "B", i % 16 + 1),
                             build_foot(fx), part["Feet"], mats["feet"])

    # parent everything to the root empty at (0, 0, 0), in place
    bpy.context.view_layer.update()
    inv = root.matrix_world.inverted()
    objects = [ob for c in [root_coll] + list(root_coll.children) for ob in c.objects]
    for ob in objects:
        if ob is root:
            continue
        ob.parent = root
        ob.matrix_parent_inverse = inv
    bpy.context.view_layer.update()

    # report where it actually landed
    meshes = [ob for ob in objects if ob.type == "MESH"]
    pts = [ob.matrix_world @ Vector(c) for ob in meshes for c in ob.bound_box]
    print("Xenachord: %d keys, %d spine parts, %d feet  (%s)"
          % (len(KEYS), len(part["Spine"].objects), len(part["Feet"].objects),
             "sandbox objects" if USE_BLEND_CATEGORIES else
             "drafted profiles — identical to the browser preview"))
    if pts:
        bx = (min(p.x for p in pts), max(p.x for p in pts))
        by = (min(p.y for p in pts), max(p.y for p in pts))
        bz = (min(p.z for p in pts), max(p.z for p in pts))
        print("Xenachord bbox  X %9.4f .. %9.4f   Y %9.4f .. %9.4f   Z %9.4f .. %9.4f"
              % (bx[0], bx[1], by[0], by[1], bz[0], bz[1]))
        print("Xenachord centre %.4f, %.4f, %.4f   (origin mode: %s)"
              % ((bx[0] + bx[1]) / 2.0, (by[0] + by[1]) / 2.0,
                 (bz[0] + bz[1]) / 2.0, ORIGIN))


if __name__ == "__main__":
    build()`;
  }

  /* ------------------------------------------------------------------ *
   *  PLAIN-TEXT SUMMARY (used in the UI status panel)                   *
   * ------------------------------------------------------------------ */
  function summary(L) {
    const counts = {};
    for (const n of L.notes) counts[n.type] = (counts[n.type] || 0) + 1;
    return { counts, notesEq: L.notesEq, total: L.total, width: L.width };
  }

  const api = {
    presetDesign, computeLayout, buildMeshes, toSTL, makeZip,
    pythonLog, summary, notesPerPeriod, layerCount, templateColours,
    whiteCount, widthAt, suggestScale,
    bounds, worldOffset, ORIGIN_MODES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).XD = api;
})();
