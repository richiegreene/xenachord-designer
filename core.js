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

  function pythonLog(L) {
    const d = L.design, W = XM.WORLD;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const out = [];
    const p = (...a) => out.push(a.join(''));

    p('# =========================================================================');
    p('# XENACHORD DESIGNER — DESIGN LOG');
    p('# generated ', now, '  (paste into Blender\'s Text Editor and Run Script)');
    p('#');
    p('# Datum (matches ', W.file, '):');
    p('#   X_world = x + ', f(W.x0, 4), '     x = 0 at the leftmost white key\'s left edge');
    p('#   Y_world = ', f(W.y0, 4), ' - y     y = 0 at the spine front face, + toward the player');
    p('#   Z_world = z + ', f(W.z0, 5), '     z = 0 at the spine bottom face');
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
    p('# (name, type, x_centre, width, depth, world_x, world_y_back, world_z_bottom, foot_x)');
    p('# KEYS is always exactly 32 entries long. KEYS[i] belongs to FEET[i].');
    p('KEYS = [');
    for (const n of L.notes) {
      const r = n.ref;
      const spec = XM.KEY_TYPES[n.type];
      const depth = spec.depth;
      const zb = spec.kind === 'white' ? XM.Z.whiteBottom : XM.Z.accBottom;
      const nm = 'K' + String(n.index).padStart(2, '0') + '_' +
        (n.kind === 'white' ? 'W' + r.i + '_' + r.name
                            : 'A' + r.slot + '_' + (r.ord + 1));
      p('    ("', nm, '", "', n.type, '", ',
        f(r.cx), ', ', f(spec.kind === 'white' ? L.wW : L.aW), ', ', f(depth), ', ',
        f(r.cx + W.x0, 4), ', ', f(W.y0, 4), ', ', f(zb + W.z0), ', ',
        r.foot == null ? 'None' : f(r.foot + W.x0, 4), '),');
    }
    p(']');
    p('');

    /* --- spine + feet ------------------------------------------------- */
    p('# --- spine --------------------------------------------------------------');
    p('SPINE = {');
    p('    "y_back": ', f(XM.SPINE.yBack), ', "y_front": ', f(XM.SPINE.yFront), ',');
    p('    "layers": [');
    const layers = XM.SPINE.layers[L.spineKind];
    for (const lay of layers)
      p('        ("', lay.name, '", ', f(lay.z0), ', ', f(lay.z1), '),');
    p('    ],');
    p('    "halves": [           # 16 sensor feet each, and only ever these two');
    p('        ("A", ', f(XM.SPINE.halfA.x0), ', ', f(XM.SPINE.halfA.x1), '),');
    p('        ("B", ', f(XM.SPINE.halfB.x0), ', ', f(XM.SPINE.halfB.x1), '),');
    p('    ],');
    p('    "screws": [');
    for (const sc of XM.SPINE.screws)
      p('        (', f(sc.x), ', ', sc.big ? 'True' : 'False', '),');
    p('    ],');
    p('}');
    p('');
    p('# --- the 32 sensor feet (16 on half A, 16 on half B) --------------------');
    p('FEET = [');
    const fc = L.feet;
    for (let i = 0; i < fc.length; i += 8)
      p('    ', fc.slice(i, i + 8).map(v => f(v)).join(', '), ',');
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
    p(BUILDER);
    return out.join('\n');
  }

  const pyDict = (name, fn) => name + ' = {\n' +
    Object.keys(XM.KEY_TYPES).map(n => '    "' + n + '": ' + fn(XM.KEY_TYPES[n])).join(',\n') +
    ',\n}';

  const BUILDER = [
'# =========================================================================',
'# BUILDER',
'# Run this file in Blender.  If the "Key Type Categories" collection exists',
'# in the current .blend, its real meshes are duplicated and placed - that',
'# gives geometry identical to the drafting sandbox.  Otherwise proxy boxes',
'# are used so the layout is still readable.',
'#',
'# A duplicated category is scaled in X only.  That matches the size law',
'# (every horizontal dimension is linear in DESIGN["scale"]) for the outer',
'# envelope; the 0.65 / 1.0 / 1.544 mm edge detailing stretches with it, so',
'# re-cut those by hand if you are printing.',
'# =========================================================================',
'import bpy',
'from mathutils import Vector',
'',
'WORLD_X0 = ' + XM.WORLD.x0,
'WORLD_Y0 = ' + XM.WORLD.y0,
'WORLD_Z0 = ' + XM.WORLD.z0,
'',
'CATEGORY_COLLECTION = "Key Type Categories"',
'TARGET_COLLECTION   = "Xenachord Generated"',
'',
'',
'def to_world(x, y, z):',
'    return (x + WORLD_X0, WORLD_Y0 - y, z + WORLD_Z0)',
'',
'',
'def get_collection(name):',
'    c = bpy.data.collections.get(name)',
'    if c is None:',
'        c = bpy.data.collections.new(name)',
'        bpy.context.scene.collection.children.link(c)',
'    return c',
'',
'',
'def find_category(type_name):',
'    """Categories are named e.g. \'Full Sized Black (from 15)\'."""',
'    col = bpy.data.collections.get(CATEGORY_COLLECTION)',
'    if col is None:',
'        return None',
'    for ob in col.objects:',
'        if ob.name.split("(from")[0].strip() == type_name:',
'            return ob',
'    return None',
'',
'',
'def world_bbox(ob):',
'    ws = [ob.matrix_world @ Vector(c) for c in ob.bound_box]',
'    return (min(v.x for v in ws), max(v.x for v in ws),',
'            min(v.y for v in ws), max(v.y for v in ws),',
'            min(v.z for v in ws), max(v.z for v in ws))',
'',
'',
'def place_from_category(src, name, x_centre, width, coll):',
'    ob = src.copy()',
'    ob.data = src.data.copy()',
'    ob.name = name',
'    coll.objects.link(ob)',
'    x0, x1, y0, y1, z0, z1 = world_bbox(src)',
'    src_w = x1 - x0',
'    if src_w > 1e-9 and abs(width - src_w) > 1e-4:',
'        ob.scale = (ob.scale.x * (width / src_w), ob.scale.y, ob.scale.z)',
'    bpy.context.view_layer.update()',
'    nx0, nx1, ny0, ny1, nz0, nz1 = world_bbox(ob)',
'    ob.location.x += (x_centre + WORLD_X0) - (nx0 + nx1) / 2.0',
'    ob.location.y += WORLD_Y0 - ny1        # back face onto the spine front',
'    return ob',
'',
'',
'def proxy_box(name, x0, x1, y0, y1, z0, z1, coll):',
'    """x/y/z are DESIGN coordinates; converted to world here."""',
'    me = bpy.data.meshes.new(name)',
'    ob = bpy.data.objects.new(name, me)',
'    coll.objects.link(ob)',
'    vs = [to_world(a, b, c) for a in (x0, x1) for b in (y0, y1) for c in (z0, z1)]',
'    fs = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),',
'          (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]',
'    me.from_pydata(vs, [], fs)',
'    me.update()',
'    return ob',
'',
'',
pyDict('DEPTH', s => s.depth),
pyDict('Z_BOTTOM', s => (s.kind === 'white' ? XM.Z.whiteBottom : XM.Z.accBottom)),
pyDict('Z_TOP', s => (s.kind === 'white' ? XM.Z.whiteTop : s.peakZ)),
'',
'',
'def build():',
'    coll = get_collection(TARGET_COLLECTION)',
'    made, proxied = 0, 0',
'    for (name, ktype, cx, width, depth, wx, wy, wz, foot) in KEYS:',
'        src = find_category(ktype)',
'        if src is not None:',
'            place_from_category(src, name, cx, width, coll)',
'            made += 1',
'        else:',
'            proxy_box(name, cx - width / 2.0, cx + width / 2.0, 0.0, depth,',
'                      Z_BOTTOM[ktype], Z_TOP[ktype], coll)',
'            proxied += 1',
'',
'    for (hname, hx0, hx1) in SPINE["halves"]:',
'        for (lname, lz0, lz1) in SPINE["layers"]:',
'            proxy_box("Spine_%s_%s" % (hname, lname), hx0, hx1,',
'                      SPINE["y_back"], SPINE["y_front"], lz0, lz1, coll)',
'',
'    fw, fd, fz = ' + XM.FOOT.w + ', ' + XM.FOOT.d + ', ' + XM.FOOT.z,
'    fy = ' + XM.FOOT.yCentre,
'    for i, fx in enumerate(FEET):',
'        proxy_box("Foot_%03d" % i, fx - fw / 2.0, fx + fw / 2.0,',
'                  fy - fd / 2.0, fy + fd / 2.0, fz - 0.05, fz + 0.05, coll)',
'',
'    print("Xenachord: %d keys from Key Type Categories, %d proxies, %d feet."',
'          % (made, proxied, len(FEET)))',
'',
'',
'if __name__ == "__main__":',
'    build()'
  ].join('\n');

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
    whiteCount, widthAt, suggestScale
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).XD = api;
})();
