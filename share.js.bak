/* =========================================================================
 * Xenachord Designer — SENDING A LAYOUT TO SOMEBODY ELSE
 *
 * A design is small.  Key types by slot, four class widths, the per-key
 * adjustments, the scale, the break on the playing edge — a few hundred
 * bytes of it, and none of it is geometry: the geometry is rebuilt from
 * these numbers by core.js at the other end, exactly as it is here.  So a
 * layout can travel as TEXT, and the two places text travels are a link
 * and a small file.
 *
 * WHY A LINK AND NOT A SERVER.  The app is a folder of files that runs by
 * opening index.html.  There is nothing to upload to and nothing to keep a
 * layout in, and adding one would make the app depend on it being up.  A
 * link that CARRIES the layout in its own address depends on nothing: it
 * works from a file:// copy, from a shared drive, from a web host, and the
 * layout is still there in ten years' time if the link is.
 *
 *   https://…/index.html#k=<payload>       one keyboard
 *   https://…/index.html#r=<payload>       a whole rig, devices and all
 *
 * THE PAYLOAD is the design as JSON, compacted and then base64url'd so it
 * survives being pasted into a chat window, an email, a spreadsheet cell.
 * Compaction is only renaming: the seven key types become their index in
 * TYPES and the design's long field names become one or two letters, so a
 * 17-note layout comes out around 250 characters rather than 900.  The
 * version tag `v` is written so a payload from an older build can still be
 * read by a newer one — nothing is dropped silently.
 *
 * WHAT IS AND IS NOT CARRIED.  Everything about the keyboard: the keys,
 * the widths, the ad-hoc per-key adjustments, the sensor-press blend, the
 * scale and the bevel.  Not what the device is CALLED — `noteBase` /
 * `noteStep` are a device's relationship to the others on the desk, and a
 * layout arriving from someone else's rig must not renumber yours.  Not
 * the preset name either: a layout you were sent is yours now, not a
 * pointer into a list you may not have.
 * ========================================================================= */
(function () {
  'use strict';

  const V = 1;

  /* the seven drafted key types, in a fixed order.  APPEND ONLY — an index
   * is what a link says, so moving one would re-read every link ever made. */
  const TYPES = [
    'Full Sized White', 'Full Sized Gray', 'Full Sized Black',
    'Split Black First', 'Split Black Second',
    'Split Gray Second', 'Split Gray First'
  ];
  const XMref = () => (typeof window !== 'undefined' ? window : globalThis).XM;

  /* design field -> short name.  Only fields that MEAN something to the
   * layout: `template` is rebuilt by migrate(), `preset` and the numbering
   * are deliberately left behind (see the header). */
  const FIELDS = [
    ['rotation',   'r'],
    ['slots',      'sl'],
    ['period',     'p'],
    ['scale',      'sc'],
    ['autoScale',  'a'],
    ['origin',     'o'],
    ['widths',     'w'],
    ['keyScale',   'k'],
    ['laneScale',  'l'],
    ['pressBase',  'pb'],
    ['pressBlend', 'pt'],
    ['bevel',      'b']
  ];

  /* ---- base64url over UTF-8, both directions ---- */
  function b64u(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    const s = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '='.repeat((4 - s.length % 4) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const packText = (obj) => b64u(new TextEncoder().encode(JSON.stringify(obj)));
  const unpackText = (str) => JSON.parse(new TextDecoder().decode(unb64u(str)));

  /* ---- a design, compacted ---- */
  function packSlots(slots) {
    if (!slots) return undefined;
    const out = {};
    for (const k of Object.keys(slots)) {
      const names = slots[k];
      if (!names || !names.length) continue;
      const codes = names.map(n => TYPES.indexOf(XMref().canonType(n)));
      if (codes.some(c => c < 0)) continue;      // a type this build cannot draw
      out[k] = codes;
    }
    return out;
  }
  function unpackSlots(sl) {
    const out = {};
    if (!sl) return out;
    for (const k of Object.keys(sl)) {
      const codes = sl[k];
      if (!Array.isArray(codes) || !codes.length) continue;
      const names = codes.map(c => TYPES[c | 0]).filter(Boolean);
      if (names.length) out[k] = names;
    }
    return out;
  }

  /** one keyboard -> the object a payload is made of */
  function packDesign(d) {
    const out = { v: V };
    for (const [long, short] of FIELDS) {
      let val = d[long];
      if (val === undefined || val === null) continue;
      if (long === 'slots') val = packSlots(val);
      if (val === undefined) continue;
      if (typeof val === 'object' && !Object.keys(val).length) continue;
      out[short] = val;
    }
    return out;
  }

  /** ... and back.  Anything the payload does not carry is simply absent,
   *  which is what the app's own migrate() is for. */
  function unpackDesign(o) {
    if (!o || typeof o !== 'object') return null;
    const d = {};
    for (const [long, short] of FIELDS) {
      if (o[short] === undefined) continue;
      d[long] = (long === 'slots') ? unpackSlots(o[short]) : o[short];
    }
    if (!d.slots) d.slots = {};
    d.template = [null, null, null, null, null, null, null];
    return d;
  }

  /** a rig -> payload.  The shape of the desk travels with the keyboards on
   *  it, so a stacked pair opens as a stacked pair. */
  function packRig(rig) {
    const units = {};
    for (const slot of Object.keys(rig.units || {}))
      if (rig.units[slot]) units[slot] = packDesign(rig.units[slot]);
    return { v: V, side: !!rig.side, stack: !!rig.stack, sel: rig.sel | 0, u: units };
  }
  function unpackRig(o) {
    if (!o || typeof o !== 'object' || !o.u) return null;
    const units = {};
    for (const slot of Object.keys(o.u)) {
      const d = unpackDesign(o.u[slot]);
      if (d) units[slot] = d;
    }
    if (!units[0]) return null;
    return { side: !!o.side, stack: !!o.stack, sel: o.sel | 0, units };
  }

  /* ---- AND WHAT THE KEYBOARD SOUNDS LIKE ---------------------------
   *
   * A LAYOUT WITHOUT ITS TUNING IS A PICTURE OF AN INSTRUMENT.  A 17-note
   * arrangement is 17 keys until somebody says what the 17 degrees sound,
   * and on a microtonal keyboard that is not a preference sitting beside
   * the design — it is half of what was designed.  So the whole of Play
   * travels with it, in one `x` section beside the keyboard:
   *
   *   t   Scale/Tuning — where 1/1 is written and what it sounds at, Auto
   *       or Custom, the reading conventions, the rotation, the fill list,
   *       every degree typed onto the strip, and the transposition.
   *   s   the synth — timbre and the ADSR envelope.
   *   m   how a controller is laid on the keys — the MIDI note that plays
   *       key 0, and whether velocity is taken.
   *
   * WHAT IS DELIBERATELY LEFT OUT is in midi.js: whether this browser has
   * been let at the MIDI ports (a consent, which is not transferable and
   * certainly not by opening a link) and which port it was listening to (a
   * socket on the machine it was saved on).  Nothing else about Play is
   * per-machine, so nothing else is withheld.
   *
   * The three sections are read back by the modules that own them —
   * XTuning.adopt, XPlay.adopt, XMidi.adopt — each of which normalises
   * what it is handed, because a payload is exactly as untrusted as a
   * stored session and gets the same repairs.
   */
  function playNow() {
    const W = (typeof window !== 'undefined') ? window : globalThis;
    const x = {};
    if (W.XTuning && W.XTuning.settings) x.t = W.XTuning.settings;
    if (W.XPlay && W.XPlay.settings) x.s = W.XPlay.settings;
    if (W.XMidi && W.XMidi.shared) x.m = W.XMidi.shared();
    return Object.keys(x).length ? JSON.parse(JSON.stringify(x)) : null;
  }

  /** hand each section to the module that owns it; returns what was taken */
  function applyPlay(x) {
    if (!x || typeof x !== 'object') return [];
    const W = (typeof window !== 'undefined') ? window : globalThis;
    const took = [];
    if (x.t && W.XTuning && W.XTuning.adopt && W.XTuning.adopt(x.t)) took.push('tuning');
    if (x.s && W.XPlay && W.XPlay.adopt && W.XPlay.adopt(x.s)) took.push('sound');
    if (x.m && W.XMidi && W.XMidi.adopt && W.XMidi.adopt(x.m)) took.push('MIDI');
    return took;
  }

  /* ---- what goes in an address bar ----
   * `x` is optional at both ends: a payload without it is a keyboard on
   * its own, which is what every link written before Play travelled is,
   * and it opens as one rather than as an error. */
  const withPlay = (obj, x) => (x ? Object.assign(obj, { x }) : obj);
  const encodeDesign = (d, x) => packText(withPlay(packDesign(d), x));
  const decodeDesign = s => unpackDesign(unpackText(s));
  const encodeRig = (r, x) => packText(withPlay(packRig(r), x));
  const decodeRig = s => unpackRig(unpackText(s));

  /** The link for a design or a rig: the page's own address, its query and
   *  hash replaced.  `many` decides which of the two forms it takes, and
   *  Play rides along in both. */
  function linkFor(what, many, x) {
    const base = location.href.split('#')[0];
    const play = x === undefined ? playNow() : x;
    return base + '#' + (many ? 'r=' + encodeRig(what, play)
                              : 'k=' + encodeDesign(what, play));
  }

  /**
   * What the address bar is asking for, if anything.  Returns
   *   { kind: 'design'|'rig', value }  or null,
   * and never throws: a truncated or mangled link is a link that did not
   * arrive, which the caller says out loud rather than dying on.
   */
  function fromHash(hash) {
    const h = (hash || (typeof location !== 'undefined' ? location.hash : '') || '')
      .replace(/^#/, '');
    if (!h) return null;
    const m = /(?:^|&)([kr])=([A-Za-z0-9_-]+)/.exec(h);
    if (!m) return null;
    try {
      const o = unpackText(m[2]);
      return m[1] === 'k'
        ? { kind: 'design', value: unpackDesign(o), play: o.x || null }
        : { kind: 'rig', value: unpackRig(o), play: o.x || null };
    } catch (e) { return null; }
  }

  /* ---- the same layout as a file ----
   * Readable JSON rather than the packed form: a file has no length to
   * fight, and one that can be opened and read is one that can be checked,
   * diffed and kept.  It carries the packed object too, so a file and a
   * link are the same thing said twice.
   */
  function fileFor(what, many, name, x) {
    const play = x === undefined ? playNow() : x;
    return JSON.stringify({
      format: 'xenachord-layout', version: V,
      kind: many ? 'rig' : 'keyboard',
      name: name || null,
      saved: new Date().toISOString().slice(0, 19).replace('T', ' '),
      data: withPlay(many ? packRig(what) : packDesign(what), play)
    }, null, 2);
  }

  /** read one back; returns { kind, value } or null */
  function fromFile(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { return null; }
    if (!o || typeof o !== 'object') return null;
    /* a bare design, a packed payload or the wrapper — all three are
     * layouts somebody meant to send, so all three are read */
    const body = o.data || o;
    const play = body.x || null;
    if (body.u) {
      const r = unpackRig(body);
      return r ? { kind: 'rig', value: r, play } : null;
    }
    if (body.sl !== undefined || body.r !== undefined) {
      const d = unpackDesign(body);
      return d ? { kind: 'design', value: d, play } : null;
    }
    if (body.slots || body.template)
      return { kind: 'design', value: body, play }; // a raw design, as presets are
    return null;
  }

  const api = { V, TYPES, encodeDesign, decodeDesign, encodeRig, decodeRig,
                packDesign, unpackDesign, packRig, unpackRig,
                playNow, applyPlay,
                linkFor, fromHash, fileFor, fromFile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).XShare = api;
})();
