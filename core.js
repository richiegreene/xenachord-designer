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
    const used = new Set(['white']);
    const scan = s => { if (s) for (const n of s) used.add(XM.KEY_TYPES[n].layer); };
    template.forEach(scan);
    Object.values(overrides || {}).forEach(scan);
    return used.size;
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

    /* ---- clearance the accidentals cut out of each white ---- */
    for (const w of whites) {
      const gl = slots[w.i - 1], gr = slots[w.i];
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

    const layers = layerCount(design.template, design.overrides);
    const spineKind = layers >= 3 ? 'three' : layers === 2 ? 'two' : 'one';

    return {
      design, whites, slots, notes, feet, warnings,
      nUnits: XM.UNITS, wW, wP, aW, delta, notesEq, total, layers, spineKind,
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
    const W = XM.KEY_TYPES['Full Sized White'];
    for (const w of L.whites) grow(w.x0, w.x1, 0, W.depth, XM.Z.whiteBottom, XM.Z.whiteTop);
    for (const sl of L.slots) for (const m of sl.members)
      grow(m.x0, m.x1, 0, m.spec.depth, XM.Z.accBottom, m.spec.peakZ);
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
    for (const w of L.whites) {
      const t = XM.buildWhite(w.cx, w.w, { shL: w.shL, shR: w.shR });
      out.white.push(...t);
    }
    for (const sl of L.slots) {
      for (const m of sl.members) {
        const t = XM.buildAccidental(m.cx, m.w, m.spec);
        out[m.spec.layer].push(...t);
      }
    }
    const spine = XM.buildSpine(L.layers);
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
    p('    "spine_type":   "', L.spineKind, ' type",');
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
    p('# (name, type, x_centre, width, depth, clear_l, clear_r,');
    p('#  world_x, world_y_back, world_z_bottom, foot_x)');
    p('# clear_l / clear_r are the left and right edges of a white key\'s mid');
    p('# section once its neighbouring accidentals have taken their clearance;');
    p('# they are None on accidentals.  The builder needs them, so they are');
    p('# part of the record rather than something re-derived downstream.');
    p('# KEYS is always exactly 32 entries long. KEYS[i] belongs to FEET[i].');
    p('KEYS = [');
    for (const n of L.notes) {
      const r = n.ref;
      const spec = XM.KEY_TYPES[n.type];
      const depth = spec.depth;
      const white = spec.kind === 'white';
      const zb = white ? XM.Z.whiteBottom : XM.Z.accBottom;
      const nm = 'K' + String(n.index).padStart(2, '0') + '_' +
        (n.kind === 'white' ? 'W' + r.i + '_' + r.name
                            : 'A' + r.slot + '_' + (r.ord + 1));
      p('    ("', nm, '", "', n.type, '", ',
        pn(r.cx), ', ', pn(white ? L.wW : L.aW), ', ', pn(depth), ', ',
        white ? pn(r.shL) : 'None', ', ', white ? pn(r.shR) : 'None', ', ',
        f(r.cx + W.x0, 4), ', ', f(W.y0, 4), ', ', f(zb + W.z0), ', ',
        r.foot == null ? 'None' : f(r.foot + W.x0, 4), '),');
    }
    p(']');
    p('');

    /* --- spine + feet ------------------------------------------------- */
    p('# --- spine --------------------------------------------------------------');
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
    p('    "screws": [');
    for (const sc of XM.SPINE.screws)
      p('        (', pn(sc.x), ', ', sc.big ? 'True' : 'False', '),');
    p('    ],');
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
    p(builderSource());
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
  function pySpecs() {
    const rows = XM.TYPE_ORDER.map(n => {
      const s = XM.KEY_TYPES[n];
      const bits = ['"kind": "' + s.kind + '"', '"layer": "' + s.layer + '"',
                    '"depth": ' + pn(s.depth)];
      if (s.kind === 'white') {
        bits.push('"z0": ' + pn(XM.Z.whiteBottom), '"z1": ' + pn(XM.Z.whiteTop));
      } else {
        bits.push('"nose_z": ' + pn(s.noseZ), '"peak_y": ' + pn(s.peakY),
                  '"peak_z": ' + pn(s.peakZ),
                  '"arm": ' + (s.arm
                    ? '(' + [s.arm.startY, s.arm.startZ, s.arm.endY, s.arm.endZ]
                        .map(pn).join(', ') + ')'
                    : 'None'),
                  '"z0": ' + pn(XM.Z.accBottom), '"z1": ' + pn(s.peakZ));
      }
      return '    "' + n + '": {' + bits.join(', ') + '},';
    });
    return 'KEY_SPECS = {\n' + rows.join('\n') + '\n}';
  }

  function pyColours() {
    const rows = Object.keys(XM.COLORS).map(k =>
      '    "' + k + '": (' + XM.COLORS[k].map(pn).join(', ') + '),');
    return 'COLOURS = {\n' + rows.join('\n') + '\n}';
  }

  function builderSource() {
    const S = XM.SPINE.screwStd, B = XM.SPINE.screwBig;
    return `# =========================================================================
# BUILDER — a direct port of the designer's own mesh code
#
# Everything below is the arithmetic model.js runs for the WebGL preview,
# transcribed into Python.  Run this in Blender and you get the preview:
# the same parts, the same vertices, the same faces, in the same places.
# Nothing here is a stand-in box.
#
# Parts land in "${'Xenachord Generated'}" as one object per key (named for its
# sensor foot), one object per spine half and layer, and one object per
# foot — the same decomposition the drafting sandbox uses.
#
# USE_BLEND_CATEGORIES = True swaps the parametric keys, spine and feet for
# the hand-modelled originals.  That only works inside the drafting sandbox
# .blend, and the interior detailing then differs from the preview; the
# outer envelope, the layout and the datum are identical either way.
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

# --- constants, injected from the designer's model -----------------------
DRAFT            = ${pn(XM.DRAFT)}      # side draft above the white playing surface
WALL             = ${pn(XM.WALL)}      # shell wall thickness
TONGUE_Y         = ${pn(XM.TONGUE_Y)}   # every accidental's tongue runs y 0 .. this
RIB_INSET_RATIO  = ${pn(XM.SIZE.ribInsetRatio)}
Z_ACC_BOTTOM     = ${pn(XM.Z.accBottom)}
Z_WHITE_TOP      = ${pn(XM.Z.whiteTop)}
Z_WHITE_BOTTOM   = ${pn(XM.Z.whiteBottom)}
Z_WHITE_UNDER    = ${pn(XM.Z.whiteUnder)}
Z_ACC_REAR_TOP   = ${pn(XM.Z.accRearTop)}
GRAY_TONGUE      = (${pn(XM.Z.grayTongue[0])}, ${pn(XM.Z.grayTongue[1])})
BLACK_TONGUE     = (${pn(XM.Z.blackTongue[0])}, ${pn(XM.Z.blackTongue[1])})
WHITE_TONGUE     = (${pn(XM.Z.whiteTongue[0])}, ${pn(XM.Z.whiteTongue[1])})
FOOT_W, FOOT_D   = ${pn(XM.FOOT.w)}, ${pn(XM.FOOT.d)}
FOOT_YC, FOOT_Z  = ${pn(XM.FOOT.yCentre)}, ${pn(XM.FOOT.z)}
SCREW_STD        = (${pn(S.w)}, ${pn(S.d)}, ${pn(S.yc)}, ${pn(S.zFloor)})   # w, d, y centre, floor z
SCREW_BIG        = (${pn(B.w)}, ${pn(B.d)}, ${pn(B.yc)}, ${pn(B.zFloor)})

${pySpecs()}

${pyColours()}

LAYER_PART = {"white": "Keys - White", "black": "Keys - Black", "gray": "Keys - Gray"}


# =========================================================================
# MESH PRIMITIVES  (model.js: pushTri / pushQuad / pushBox / loftRing)
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


def fan_cap(t, ring, y, flip):
    for i in range(1, len(ring) - 1):
        a = (ring[0][0], y, ring[0][1])
        b = (ring[i][0], y, ring[i][1])
        c = (ring[i + 1][0], y, ring[i + 1][1])
        if flip:
            push_tri(t, a, c, b)
        else:
            push_tri(t, a, b, c)


def loft_ring(t, ring_a, ya, ring_b, yb, cap_a, cap_b):
    """Winding matters: push_box emits outward-facing quads, so the lofts
    have to as well.  Holds for back-to-front lofts (ya < yb) and for the
    clockwise rings that cut the hollow undersides."""
    n = len(ring_a)
    fwd = ya >= yb
    for i in range(n):
        j = (i + 1) % n
        ai = (ring_a[i][0], ya, ring_a[i][1]); aj = (ring_a[j][0], ya, ring_a[j][1])
        bi = (ring_b[i][0], yb, ring_b[i][1]); bj = (ring_b[j][0], yb, ring_b[j][1])
        if fwd:
            push_quad(t, ai, aj, bj, bi)
        else:
            push_quad(t, ai, bi, bj, aj)
    if cap_a:
        fan_cap(t, ring_a, ya, fwd)
    if cap_b:
        fan_cap(t, ring_b, yb, not fwd)


def loft_prism(t, x0, x1, ya, za, yb, zb, z_top):
    """a slab whose floor slopes from (ya, za) to (yb, zb) under a flat top"""
    ring_a = [(x0, za), (x1, za), (x1, z_top), (x0, z_top)]
    ring_b = [(x0, zb), (x1, zb), (x1, z_top), (x0, z_top)]
    loft_ring(t, ring_a, ya, ring_b, yb, True, True)


# =========================================================================
# KEY GEOMETRY  (model.js: halfW / accTopAt / buildAccidental / buildWhite)
# =========================================================================
def half_w(w, z):
    """half-width of an accidental at height z — side draft above the top"""
    return w / 2.0 - DRAFT * max(0.0, z - Z_WHITE_TOP)


def acc_top_at(spec, y):
    """top surface height of an accidental at y (y = 0 at the spine)"""
    if y <= TONGUE_Y:
        return None                                   # tongue region
    peak_y, peak_z, depth = spec["peak_y"], spec["peak_z"], spec["depth"]
    if y >= peak_y:
        # nose ramp down to the front face
        f = (y - peak_y) / (depth - peak_y)
        return peak_z + (spec["nose_z"] - peak_z) * f
    # rear draft: peak -> Z_ACC_REAR_TOP at y = TONGUE_Y
    f = (peak_y - y) / (peak_y - TONGUE_Y)
    return peak_z + (Z_ACC_REAR_TOP - peak_z) * f


def build_accidental(cx, w, spec):
    t = []
    arm = spec["arm"]
    depth, peak_y = spec["depth"], spec["peak_y"]
    body_back_y = arm[0] if arm else TONGUE_Y

    # --- Y stations through the body, front (depth) back to body_back_y ---
    ys = [depth]
    def add(v):
        if v > body_back_y + 1e-6 and v < depth - 1e-6:
            ys.append(v)
    add(peak_y)
    for i in range(1, 6):
        add(body_back_y + (peak_y - body_back_y) * i / 6.0)
    ys.append(body_back_y)
    ys.sort(reverse=True)                              # front -> back

    def ring_at(y):
        top = acc_top_at(spec, max(y, body_back_y + 1e-6))
        if not top:
            top = acc_top_at(spec, body_back_y + 1e-6)
        zb = Z_ACC_BOTTOM
        hw_t, hw_b = half_w(w, top), w / 2.0
        shoulder = min(top, Z_WHITE_TOP)
        # outer ring, CCW seen from +y
        return [(cx - hw_b, zb), (cx + hw_b, zb),
                (cx + w / 2.0, shoulder), (cx + hw_t, top),
                (cx - hw_t, top), (cx - w / 2.0, shoulder)]

    for i in range(len(ys) - 1):
        loft_ring(t, ring_at(ys[i]), ys[i], ring_at(ys[i + 1]), ys[i + 1],
                  i == 0, i == len(ys) - 2)

    # --- hollow underside: a cavity inset by WALL, open at the bottom ---
    cav_front, cav_back = depth - WALL, body_back_y + WALL
    if cav_front > cav_back + 0.2:
        def cav(y):
            top = acc_top_at(spec, y)
            if not top:
                top = Z_ACC_REAR_TOP
            ct = min(top - WALL, Z_WHITE_TOP + 3.0)
            hw = w / 2.0 - WALL
            return [(cx - hw, Z_ACC_BOTTOM), (cx - hw, ct),
                    (cx + hw, ct), (cx + hw, Z_ACC_BOTTOM)]
        cys = [cav_front]
        for i in range(1, 5):
            cys.append(cav_front + (cav_back - cav_front) * i / 5.0)
        cys.append(cav_back)
        for i in range(len(cys) - 1):
            loft_ring(t, cav(cys[i]), cys[i], cav(cys[i + 1]), cys[i + 1],
                      i == 0, i == len(cys) - 2)

    # --- thin rear arm (the deep "Second" gray keys) ---
    if arm:
        start_y, start_z, end_y, end_z = arm
        hw = w / 2.0 - 0.6
        ring = lambda z: [(cx - hw, Z_ACC_BOTTOM), (cx + hw, Z_ACC_BOTTOM),
                          (cx + hw, z), (cx - hw, z)]
        loft_ring(t, ring(start_z), start_y, ring(end_z), end_y, True, True)

    # --- rear tongue into the spine ---
    tz = BLACK_TONGUE if spec["layer"] == "black" else GRAY_TONGUE
    push_box(t, cx - w / 2.0, cx + w / 2.0, 0.0, TONGUE_Y + 0.001, tz[0], tz[1])
    return t


def build_white(cx, w, sh_l, sh_r):
    """1 mm top plate, two outer walls, two inner ribs, one rib centred over
    the sensor foot, a solid front block and a rear tongue onto the spine."""
    t = []
    x0, x1 = cx - w / 2.0, cx + w / 2.0
    D = KEY_SPECS["Full Sized White"]["depth"]
    top_z = Z_WHITE_TOP
    plate = top_z - 1.0

    front_block_y = D - 6.0            # full-height nose
    ramp_end_y    = D - 19.527         # underside reaches its cruising height
    tongue_y      = ${pn(XM.TONGUE_Y)}

    if sh_l is None:
        sh_l = x0
    if sh_r is None:
        sh_r = x1

    push_box(t, x0, x1, front_block_y, D, Z_WHITE_BOTTOM, top_z)
    loft_prism(t, x0, x1, ramp_end_y, Z_WHITE_UNDER,
               front_block_y, Z_WHITE_BOTTOM, top_z)
    push_box(t, sh_l, sh_r, tongue_y, ramp_end_y, plate, top_z)
    push_box(t, sh_l, sh_l + 1.0, tongue_y, ramp_end_y, Z_WHITE_UNDER, top_z)
    push_box(t, sh_r - 1.0, sh_r, tongue_y, ramp_end_y, Z_WHITE_UNDER, top_z)

    inset = w * RIB_INSET_RATIO
    r_a, r_b = x0 + inset, x1 - inset - 1.0
    if r_a > sh_l + 1.0:
        push_box(t, r_a, r_a + 1.0, tongue_y, ramp_end_y, Z_WHITE_UNDER, top_z)
    if r_b + 1.0 < sh_r - 1.0:
        push_box(t, r_b, r_b + 1.0, tongue_y, ramp_end_y, Z_WHITE_UNDER, top_z)

    push_box(t, cx - 0.5, cx + 0.5, FOOT_YC - 6.0, FOOT_YC + 1.0,
             Z_WHITE_UNDER, top_z)

    tz0 = WHITE_TONGUE[0]
    ring_f = [(x0, tz0), (x1, tz0), (x1, top_z), (x0, top_z)]
    ring_b = [(x0, tz0), (x1, tz0), (x1, 7.08899), (x0, 7.08899)]
    loft_ring(t, ring_f, tongue_y, ring_b, 0.0, True, True)
    return t


# =========================================================================
# SPINE + FEET GEOMETRY  (model.js: rectWithHoles / buildSpine / buildFeet)
# =========================================================================
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


def unit_screw_holes():
    out = []
    for (sx, big) in SPINE["screws"]:
        gw, gd, gyc, gzf = SCREW_BIG if big else SCREW_STD
        out.append((sx - gw / 2.0, sx + gw / 2.0,
                    SPINE["y_front"] - gyc - gd / 2.0,
                    SPINE["y_front"] - gyc + gd / 2.0, gzf))
    return out


def build_spine_slab(x0, x1, y_back, y_front, z0, z1):
    t = []
    active = [h for h in unit_screw_holes() if z1 > h[4]]
    rect_with_holes(x0, x1, y_back, y_front, active,
                    lambda a, b, c, d: push_box(t, a, b, c, d, z0, z1))
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
        if not getattr(m, "use_nodes", True):
            m.use_nodes = True          # a no-op from Blender 6 on
        bsdf = m.node_tree.nodes.get("Principled BSDF")
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


# ---- the optional "use the sandbox's own meshes" path -------------------
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
    for (name, ktype, cx, width, depth, clear_l, clear_r,
         wx, wy, wz, foot) in KEYS:
        spec = KEY_SPECS[ktype]
        coll = part[LAYER_PART[spec["layer"]]]
        if USE_BLEND_CATEGORIES:
            src = find_category(ktype)
            if src is not None:
                place_from_category(src, name, cx, width, coll)
                keys_from_sheet += 1
                continue
        if spec["kind"] == "white":
            tris = build_white(cx, width, clear_l, clear_r)
        else:
            tris = build_accidental(cx, width, spec)
        make_mesh_object(name, tris, coll, mats[spec["layer"]])

    spine_from_sheet = feet_from_sheet = 0
    if USE_BLEND_CATEGORIES:
        kind = DESIGN["spine_type"].split()[0].capitalize()
        spine_from_sheet = (copy_sheet_collection(kind + " type Spine - A", part["Spine"]) +
                            copy_sheet_collection(kind + " type Spine - B", part["Spine"]))
        feet_from_sheet = (copy_sheet_collection("Feet - A", part["Feet"]) +
                           copy_sheet_collection("Feet - B", part["Feet"]))

    if not spine_from_sheet:
        for (hname, hx0, hx1, hy_back, hy_front, layers) in SPINE["halves"]:
            for (lname, lz0, lz1) in layers:
                tris = build_spine_slab(hx0, hx1, hy_back, hy_front, lz0, lz1)
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
             "sandbox meshes" if USE_BLEND_CATEGORIES else
             "parametric — identical to the browser preview"))
    if keys_from_sheet or spine_from_sheet or feet_from_sheet:
        print("Xenachord: %d keys, %d spine parts and %d feet came from the sandbox."
              % (keys_from_sheet, spine_from_sheet, feet_from_sheet))
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
    pythonLog, summary, notesPerPeriod, layerCount,
    whiteCount, widthAt, suggestScale,
    bounds, worldOffset, ORIGIN_MODES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).XD = api;
})();
