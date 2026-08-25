/* =========================================================================
 * Xenachord Designer — BLENDER MODEL
 *
 * Every constant in this file was measured directly out of
 *   Cleaning Cimbalo Designs for Automated Design/
 *   Cimbalo_Cromatico_Drafting_Sandbox_Leveling.blend
 * (collections: "Key Type Categories", "15/17/19 Layout", "Feet - A/B",
 *  "One/Two/Three type Spine - A/B").
 *
 * -------------------------------------------------------------------------
 * DESIGN COORDINATE SYSTEM (mm)
 *   x : 0 at the LEFT EDGE of the leftmost white key, + toward the treble
 *   y : 0 at the SPINE FRONT FACE (= the back face of every key),
 *       + toward the player.  The spine therefore occupies y < 0.
 *   z : 0 at the SPINE BOTTOM FACE, + up
 *
 * WORLD (Blender) MAPPING — exact, so the Python log round-trips:
 *   X_world = x + WORLD.x0          WORLD.x0 = -1403.764
 *   Y_world = WORLD.y0 - y          WORLD.y0 = -134.106
 *   Z_world = z + WORLD.z0          WORLD.z0 =   21.78566
 *
 * -------------------------------------------------------------------------
 * THE FIXED SPINE <-> FOOT RELATIONSHIP  (never varies, in any layout)
 *   foot pad          10.4 mm (X)  x  9.0 mm (Y),  flat plane
 *   foot pitch        11.30005 mm
 *   foot centre Y     27.37759 mm in front of the spine front face
 *   foot plane Z      1.01091 mm below the spine bottom face
 * ========================================================================= */
(function () {
  'use strict';

  /* The drafted key profiles, read out of the 15 / 17 / 19 Layout
   * collections.  Key geometry is not modelled analytically any more — it
   * IS the drafted geometry, with x = alpha + beta * width per vertex.   */
  const KP = (typeof module !== 'undefined' && module.exports)
    ? require('./profiles.js')
    : (typeof window !== 'undefined' ? window : globalThis).XKP;

  /* ------------------------------------------------------------------ *
   * 1.  WORLD DATUM                                                     *
   * ------------------------------------------------------------------ */
  const WORLD = {
    x0: -1403.764,        // Blender X of the leftmost white key's left edge
    y0: -134.106,         // Blender Y of the spine front face / key back face
    z0: 21.78566,         // Blender Z of the spine bottom face
    file: 'Cimbalo_Cromatico_Drafting_Sandbox_Leveling.blend'
  };

  /* ------------------------------------------------------------------ *
   * 2.  SPINE  (identical in every layout)                              *
   * ------------------------------------------------------------------ */
  const SPINE = {
    yBack: -9.84706,      // rear face
    yFront: 0.0,          // front face — keys butt against this
    depth: 9.84706,
    height: 7.10039,      // z 0 .. 7.10039

    // Layer stack, PER HALF.  A "one type" spine is one solid slab; a "two
    // type" spine splits it 2 ways; a "three type" spine 3 ways.  Each key's
    // rear tongue plugs into the layer belonging to its colour.
    //
    // Halves A and B were modelled separately in the sandbox and their layer
    // bands differ by up to 0.011 mm — read verbatim out of the collections
    // "One / Two / Three type Spine - A" and "- B" so that a generated spine
    // is an exact replica of the drafted one, not an idealisation of it.
    layers: {
      one: {
        A: [{ name: 'all',   z0:  0.0,     z1: 7.10039 }],
        B: [{ name: 'all',   z0: -0.00006, z1: 7.08935 }]
      },
      two: {
        A: [{ name: 'lower', z0:  0.0,     z1: 6.07832 },
            { name: 'upper', z0:  6.07826, z1: 7.07833 }],
        B: [{ name: 'lower', z0: -0.00006, z1: 6.08932 },
            { name: 'upper', z0:  6.08928, z1: 7.08936 }]
      },
      three: {
        A: [{ name: 'gray',  z0:  0.0,     z1: 5.08934 },
            { name: 'black', z0:  5.09072, z1: 6.10034 },
            { name: 'white', z0:  6.07824, z1: 7.10034 }],
        B: [{ name: 'gray',  z0: -0.00006, z1: 5.07835 },
            { name: 'black', z0:  5.07829, z1: 6.08932 },
            { name: 'white', z0:  6.08926, z1: 7.11137 }]
      }
    },

    // One AKM320 unit = spine half A + spine half B (32 feet between them).
    // x/yBack/yFront are the measured faces of each half.
    halfA: { x0: 0.84933,   x1: 183.43233, yBack: -9.84707, yFront: 0.00000 },
    halfB: { x0: 184.72359, x1: 373.29513, yBack: -9.84695, yFront: 0.00005 },
    span: 373.29513 - 0.84933,             // A + B, end to end

    /* ---------------------------------------------------------------- *
     * THE PCB CHANNEL                                                  *
     *                                                                  *
     * The underside of each half is slotted end to end — open at both  *
     * x ends — leaving a 1.4 mm wall front and back.  This is where    *
     * the AKM320 board sits.  Its ceiling, z = 2.911096, is the same   *
     * plane the mounting holes stop on: the holes open straight down   *
     * into it, so nothing here is a blind counterbore.                 *
     *                                                                  *
     * Read off the bottom faces and the z = 2.911 ceiling faces of     *
     * "<kind> type Spine - A / - B" in the sandbox.                    *
     * ---------------------------------------------------------------- */
    channel: {
      zTop: 2.911096,
      A: { y0: -8.44702, y1: -1.40005 },   // 7.04697 across, 1.40005 walls
      B: { y0: -8.44696, y1: -1.39999 }
    },

    /* ---------------------------------------------------------------- *
     * THE 16 MOUNTING HOLES — 8 per half, and they are NOT rectangles.  *
     *                                                                  *
     * Every one of them is an obround (a stadium slot): a 32-segment    *
     * circle cut in half at +/-90 deg and the two halves held           *
     * `straight` = 1.0 mm apart along x, joined by tangent lines top    *
     * and bottom.  There are exactly two radii in the sandbox:          *
     *                                                                  *
     *   lower  r = 1.889789   ->  4.779578 x 3.779578 mm                *
     *          the layer that carries the channel, z 2.911096 .. z1     *
     *   upper  r = 1.619818   ->  4.239636 x 3.239636 mm                *
     *          every layer stacked above it, full height                *
     *                                                                  *
     * so the bore steps in by 0.269971 mm at the first layer seam.      *
     * A one-type spine has no seam and therefore only the lower bore,   *
     * exactly as "One type Spine - A / - B" is drawn.                   *
     *                                                                  *
     * Centres are stored verbatim, per half and per bore, because the   *
     * drafted upper bores do not sit dead on top of the lower ones      *
     * (they wander by up to 0.008 mm).  y is the bore centre in the     *
     * design frame; the spine front face is y = 0.                      *
     * ---------------------------------------------------------------- */
    hole: {
      seg: 32,               // segments in the full circle
      straight: 1.0,         // straight run between the two half-circles
      rLower: 1.889789,
      rUpper: 1.619818
    },
    holesLower: {
      A: [[  3.92184, -5.05901], [ 17.49740, -5.05305], [ 31.13094, -5.05294],
          [ 71.16085, -5.05298], [ 89.37692, -5.05305], [140.86996, -5.05193],
          [154.46059, -5.05292], [168.10250, -5.05390]],
      B: [[208.22091, -5.05189], [226.45358, -5.05388], [277.92104, -5.05428],
          [291.53719, -5.05230], [305.13729, -5.05288], [345.13729, -5.05289],
          [356.23727, -5.05284], [370.35348, -5.05381]]
    },
    holesUpper: {
      A: [[  3.92324, -5.05283], [ 17.49758, -5.05283], [ 31.13076, -5.05286],
          [ 71.16067, -5.05284], [ 89.36868, -5.05292], [140.87832, -5.05242],
          [154.46070, -5.05284], [168.09451, -5.05326]],
      B: [[208.22911, -5.05251], [226.44538, -5.05328], [277.92912, -5.05364],
          [291.53719, -5.05240], [305.13723, -5.05284], [345.13729, -5.05284],
          [356.23729, -5.05283], [370.34536, -5.05326]]
    }
  };

  /* ------------------------------------------------------------------ *
   * 3.  HARD LIMITS OF THE INSTRUMENT                                    *
   *                                                                     *
   * This keyboard is one AKM320: one spine half A + one spine half B,    *
   * 16 sensor feet on each, 32 feet in total.  A design therefore has    *
   * EXACTLY 32 keys — one per foot — and never more.  Nothing chains.    *
   * ------------------------------------------------------------------ */
  const NOTES = 32;          // keys in a design; also the number of feet
  const UNITS = 1;           // AKM320 units; always one
  const FEET_PER_HALF = 16;

  /* ------------------------------------------------------------------ *
   * 4.  FEET  (the sensor pushers — fixed to the spine, forever)         *
   * ------------------------------------------------------------------ */
  const FOOT = {
    pitch: 11.30005,
    w: 10.40002,
    d: 9.00005,
    yCentre: 27.37759,    // in front of the spine front face
    z: -1.01091,          // below the spine bottom face
    perUnit: 32,          // 16 on half A + 16 on half B
    t: 0.0,               // the pad IS a plane — no body, no walls, no caps
    // x of foot #0's centre, relative to the design origin
    x0: 9.79531,
    // Half A of the real PCB is not perfectly even; half B is.  These are the
    // measured centre-to-centre steps for the 32 feet of one AKM320 unit.
    stepsA: [11.208985, 11.390990, 11.300175, 11.208860, 11.390870, 11.300170,
             11.208985, 11.390870, 11.300045, 11.208985, 11.391115, 11.208985,
             11.391115, 11.299925, 11.208985],
    gapAB: 11.390990,
    stepsB: 11.300050
  };

  /* ------------------------------------------------------------------ *
   * 5.  SIZE LAW                                                        *
   *                                                                     *
   * Read straight off the three drafted layouts.  Every horizontal       *
   * dimension is linear in the layout's "scale" number s (which is the   *
   * EDO number in the 15 / 17 / 19 sheets); every vertical and           *
   * front-to-back dimension is constant.                                *
   *                                                                     *
   *      s      white width   white pitch   accidental width   delta     *
   *     15        23.1250       24.62500        10.37500       2.50000   *
   *     17        26.2083       27.70833        11.75833       2.83333   *
   *     19        29.2917       30.79167        13.14167       3.16667   *
   * ------------------------------------------------------------------ */
  const SIZE = {
    whitePerUnit: 37 / 24,     // white width      = s * 1.5416667  (37/24)
    accPerUnit:   83 / 120,    // accidental width = s * 0.6916667  (83/120)
    whiteGap:     1.5,         // white pitch      = white width + 1.5
    deltaPerUnit: 1 / 6,       // slot bias        = s / 6
    whitesPerPeriod: 7,
    ribInsetRatio: 3.5625 / 29.291626   // 0.1216216 of the white width
  };

  const whiteWidth = s => s * SIZE.whitePerUnit;
  const whitePitch = s => s * SIZE.whitePerUnit + SIZE.whiteGap;
  const accWidth   = s => s * SIZE.accPerUnit;
  const slotDelta  = s => s * SIZE.deltaPerUnit;

  /* ------------------------------------------------------------------ *
   *  FOUR WIDTH CLASSES                                                 *
   *                                                                     *
   *  The sheet gives every accidental one width, whatever it is.  A     *
   *  design may want otherwise — a full black narrower than a full      *
   *  gray, a split pair wider than either — so width is a property of   *
   *  the CLASS a key belongs to, and there are four:                    *
   *                                                                     *
   *      white   the backbone                                           *
   *      black   Full Sized Black                                       *
   *      gray    Full Sized Gray                                        *
   *      split   both halves of either split pair, which share a gap    *
   *              and therefore share a width                            *
   *                                                                     *
   *  A class carries a RATIO, not a millimetre: its width relative to   *
   *  the white's.  Only the ratios are a design decision — the absolute *
   *  size is still solved for so the 32 keys end at the spine, so       *
   *  widening one class narrows the rest rather than running off the    *
   *  end.  The defaults are the sheet's own law, where every accidental *
   *  is 83/185 of a white.                                              *
   * ------------------------------------------------------------------ */
  const WIDTH_CLASSES = ['white', 'black', 'gray', 'split'];
  const CLASS_LABEL = { white: 'White', black: 'Black Full',
                        gray: 'Gray Full', split: 'Split' };
  const ACC_RATIO = SIZE.accPerUnit / SIZE.whitePerUnit;      // 83/185
  const WIDTH_RATIO_DEFAULT = Object.freeze({
    white: 1, black: ACC_RATIO, gray: ACC_RATIO, split: ACC_RATIO
  });
  /* how narrow a class may be squeezed, and how wide it may be pushed,
   * as a ratio of the white — a key thinner than its own two 1 mm walls
   * is not a key, and one wider than the pitch cannot sit in a gap */
  /* ------------------------------------------------------------------ *
   *  HOW WIDE AN ACCIDENTAL IS ALLOWED TO BE                            *
   *                                                                     *
   *  A white makes room for the keys beside it by cutting its rear back *
   *  by (classWidth/2 − whiteGap/2 + FIT.gap) on each side.  With both  *
   *  gaps full, the rear keeps                                          *
   *                                                                     *
   *      1 − ratio + 1.2/width      of its own width,                   *
   *                                                                     *
   *  and it has to keep MIN_REAR of that, so ratio ≤ 0.86 + 1.2/width.  *
   *  Dropping the size-dependent term leaves a bound that holds at any  *
   *  scale.  Past it there is nothing left to cut: the accidental is    *
   *  simply wider than the white it stands beside, and no rear inset    *
   *  can clear it.  So this is a LIMIT, not a warning — the width bar   *
   *  stops there rather than drawing a design that cannot be built.     *
   * ------------------------------------------------------------------ */
  const WIDTH_RATIO_MIN = 0.10;     // a key thinner than its own two walls
  const WIDTH_RATIO_MAX = 2.0;      // the white's own ceiling
  const ACC_RATIO_MAX   = 0.86;     // an accidental's, relative to the white

  /** the ratios a design is asking for, defaulted and made buildable */
  function widthRatios(design) {
    const r = {}, src = (design && design.widths) || {};
    for (const c of WIDTH_CLASSES) {
      const v = +src[c];
      r[c] = isFinite(v) && v > 0
        ? Math.min(WIDTH_RATIO_MAX, Math.max(WIDTH_RATIO_MIN, v))
        : WIDTH_RATIO_DEFAULT[c];
    }
    /* an accidental is measured against the white, so the white carries the
     * ceiling with it — widen the white and the others may follow */
    const cap = r.white * ACC_RATIO_MAX;
    for (const c of WIDTH_CLASSES) if (c !== 'white') r[c] = Math.min(r[c], cap);
    return r;
  }

  /** the widest an accidental class may go, beside a white of ratio `w` */
  const accCeiling = w => w * ACC_RATIO_MAX;
  /** the narrowest the white may go, given the accidentals beside it */
  const whiteFloor = r => Math.max(WIDTH_RATIO_MIN,
    Math.max(r.black, r.gray, r.split) / ACC_RATIO_MAX);

  /** the width one class takes at size `s` */
  const classWidth = (cls, s, r) =>
    s * SIZE.whitePerUnit * ((r || WIDTH_RATIO_DEFAULT)[cls] || ACC_RATIO);

  /** which of the four a key type belongs to */
  const classOfType = n => {
    const spec = KEY_TYPES[canonType(n)];
    return spec ? spec.widthClass : 'split';
  };

  /* ------------------------------------------------------------------ *
   *  THERE IS NO SLOT BIAS ANY MORE                                     *
   *                                                                     *
   *  The sheets lean each accidental slot -delta, 0 or +delta in the     *
   *  pattern three-single-two-single: the classic piano arrangement,    *
   *  and a NOTE-NAME idea, since which slot leans which way is decided  *
   *  by a seven-name diatonic spelling this instrument has not defined. *
   *                                                                     *
   *  It also made the keyboard uneven to play.  A white's waist is the  *
   *  gap between the accidentals either side of it, and with the lean   *
   *  that came out as wP - aW - 1.2 + (biasR - biasL)*delta — two       *
   *  different widths depending on which way its neighbours happened to *
   *  lean.  Running a scale across the whites met one width, then       *
   *  another, then back.                                                *
   *                                                                     *
   *  Every gap now sits at the plain midpoint between its two whites,   *
   *  so every waist is wP - aW - 1.2 and every white is the same key.   *
   *  delta survives only as a figure in the size law.                   *
   * ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ *
   * 6.  KEY TYPE CATEGORIES                                             *
   *                                                                     *
   * The seven categories drawn in the "Key Type Categories" collection.  *
   * In the .blend they were pulled from different sheets (19 and 15) and *
   * so carry different widths; here width always comes from the size law *
   * above, so all seven are directly comparable.                        *
   *                                                                     *
   * z values are design-z (0 = spine bottom face).                       *
   *   4.08924  underside of every accidental                            *
   *   8.62804  white playing surface  ( = where side draft begins )      *
   *  14.12804  rear top edge of every accidental                        *
   * ------------------------------------------------------------------ */
  const Z = {
    accBottom:   4.08924,
    whiteTop:    8.62804,
    whiteBottom: -5.91916,
    whiteUnder:  1.71694,   // underside of the white key's mid-body
    accRearTop: 14.12804,
    grayTongue:  [4.08924, 5.09074],   // plugs into spine layer 1
    blackTongue: [5.08924, 6.08924],   // plugs into spine layer 2
    whiteTongue: [6.08924, 8.62804]    // plugs into spine layer 3
  };

  /* Part colours.  One table, used by the WebGL preview and written into the
   * Blender log as materials, so the two renderings read the same.        */
  const COLORS = {
    white: [0.95, 0.95, 0.93], black: [0.16, 0.16, 0.19],
    gray:  [0.55, 0.55, 0.58], spine: [0.30, 0.31, 0.36],
    feet:  [0.24, 0.42, 0.60], press: [0.72, 0.45, 0.22]
  };

  const DRAFT = 0.1018;      // side draft above z = Z.whiteTop (5.8 degrees)
  const WALL  = 1.0;         // shell wall thickness
  const TONGUE_Y = 5.0688;   // every accidental's tongue runs y 0 .. 5.0688

  /* Each accidental category is described by
   *   depth       front face y
   *   peakY/peakZ apex of the sloped playing top
   *   noseZ       top of the front face, before the nose ramp
   *   arm         optional thin rear arm (the low "Second" gray keys)
   *   layer       which spine layer the tongue plugs into
   *   mirror      X-mirror of the detailing (First vs Second handedness)
   */
  const KEY_TYPES = {
    'Full Sized White': {
      id: 'full-white', kind: 'white', layer: 'white', widthClass: 'white',
      depth: 85.0688, css: 'white',
      label: 'Full Sized White',
      blurb: 'Natural. Full depth, plays at z 8.628.'
    },
    'Full Sized Gray': {
      id: 'full-gray', kind: 'acc', layer: 'gray', mirror: false, widthClass: 'gray',
      depth: 42.5688, noseZ: Z.whiteTop,
      peakY: 42.5688 - 5.4866, peakZ: 15.24484,
      css: 'gray',
      label: 'Full Sized Gray',
      blurb: 'Single mid-height accidental. 19-EDO uses it for E#/Fb and B#/Cb.'
    },
    'Full Sized Black': {
      id: 'full-black', kind: 'acc', layer: 'black', mirror: false, widthClass: 'black',
      depth: 52.5688, noseZ: Z.whiteTop,
      peakY: 52.5688 - 4.5, peakZ: 15.62804,
      css: 'black',
      label: 'Full Sized Black',
      blurb: 'Single full-depth accidental. 15-EDO uses it in the outer slots.'
    },
    'Split Black First': {
      id: 'split-black-1', kind: 'acc', layer: 'black', mirror: true, widthClass: 'split',
      depth: 27.8188, noseZ: Z.whiteTop,
      peakY: 27.8188 - 0.2303, peakZ: 14.94844,
      css: 'black', pairRole: 'rear',
      label: 'Split Black First',
      blurb: 'Rear (short, tall) half of a split pair — left-hand detailing.'
    },
    'Split Black Second': {
      id: 'split-black-2', kind: 'acc', layer: 'black', mirror: false, widthClass: 'split',
      depth: 27.8188, noseZ: Z.whiteTop,
      peakY: 27.8188 - 0.2303, peakZ: 14.94844,
      css: 'black', pairRole: 'rear',
      label: 'Split Black Second',
      blurb: 'Rear (short, tall) half of a split pair — the sheet default.'
    },
    'Split Gray Second': {
      id: 'split-gray-2', kind: 'acc', layer: 'gray', mirror: true, widthClass: 'split',
      depth: 52.5688, noseZ: Z.whiteTop,
      peakY: 52.5688 - 4.5, peakZ: 15.62804,
      arm: { startY: 29.8188, startZ: 7.84134, endY: TONGUE_Y, endZ: 5.09074 },
      css: 'gray', pairRole: 'front', armSide: 'right',
      label: 'Split Gray Second',
      blurb: 'Front (deep, low) half of a split pair — its rear arm runs back ' +
             'on the RIGHT, so the pair reads black → gray.'
    },
    'Split Gray First': {
      id: 'split-gray-1', kind: 'acc', layer: 'gray', mirror: false, widthClass: 'split',
      depth: 52.5688, noseZ: Z.whiteTop,
      peakY: 52.5688 - 4.5, peakZ: 15.62804,
      arm: { startY: 29.8188, startZ: 7.84134, endY: TONGUE_Y, endZ: 5.09074 },
      css: 'gray', pairRole: 'front', armSide: 'left',
      label: 'Split Gray First',
      blurb: 'Front (deep, low) half of a split pair — its rear arm runs back ' +
             'on the LEFT, so the pair reads gray → black.  The sheet default.'
    }
  };
  const TYPE_ORDER = [
    'Full Sized Black', 'Full Sized Gray', 'Full Sized White',
    'Split Black First', 'Split Black Second',
    'Split Gray Second', 'Split Gray First'
  ];

  /* Designs saved before the Gray First / Grey Second rename.  A stored
   * design, a pasted template or an old Python log still names the front
   * half "Split Grey Second"; it has always been the LEFT-armed one. */
  const TYPE_ALIASES = { 'Split Grey Second': 'Split Gray First' };
  const canonType = n => TYPE_ALIASES[n] || n;

  /* ------------------------------------------------------------------ *
   *  SPLIT PAIRS ARE ONE COMPONENT                                      *
   *                                                                     *
   *  A split slot is never half filled.  The rear (short, tall, black)  *
   *  half and the front (deep, low, gray) half are cut from each other: *
   *  the gray's thin rear arm runs back down ONE side of the slot and   *
   *  the black stands in what is left, so a black without its gray is   *
   *  a key with no neighbour to be split from, and a gray without its   *
   *  black is a slot with a hole in it.  They are placed together and   *
   *  removed together, and the palette offers them as one chip.         *
   *                                                                     *
   *  The two chips are the two HANDS of that arrangement, named for     *
   *  what the rear of the slot reads left to right:                     *
   *                                                                     *
   *    Split: Gray→Black   gray arm on the left   (the 15/17/19 sheets) *
   *    Split: Black→Gray   gray arm on the right  (the mirror)          *
   * ------------------------------------------------------------------ */
  const KEY_PAIRS = {
    'Split: Gray→Black': {
      id: 'pair-gray-black', members: ['Split Black Second', 'Split Gray First'],
      label: 'Split: Gray→Black', hand: 'left',
      blurb: 'Split Black Second (rear) + Split Gray First (front).  The ' +
             'gray arm runs back on the LEFT.  Every split slot on the ' +
             'drafted 15 / 17 / 19 sheets is this pair.'
    },
    'Split: Black→Gray': {
      id: 'pair-black-gray', members: ['Split Black First', 'Split Gray Second'],
      label: 'Split: Black→Gray', hand: 'right',
      blurb: 'Split Black First (rear) + Split Gray Second (front).  The ' +
             'gray arm runs back on the RIGHT — the mirror of the sheet pair.'
    }
  };
  const PAIR_ORDER = ['Split: Gray→Black', 'Split: Black→Gray'];

  /** the pair a member type belongs to, or null for a full-sized key */
  function pairOfType(name) {
    const n = canonType(name);
    for (const k of PAIR_ORDER)
      if (KEY_PAIRS[k].members.indexOf(n) >= 0) return k;
    return null;
  }

  /** the pair a slot's contents amount to, or null if it is not a pair */
  function pairOfSlot(names) {
    if (!names || names.length !== 2) return null;
    for (const k of PAIR_ORDER) {
      const m = KEY_PAIRS[k].members;
      if (names.every(n => m.indexOf(canonType(n)) >= 0)) return k;
    }
    return null;
  }

  /* what the palette can drop: the three full-sized keys, then the pairs */
  const PALETTE_ORDER = [
    'Full Sized Black', 'Full Sized Gray',
    'Split: Gray→Black', 'Split: Black→Gray'
  ];

  /* ------------------------------------------------------------------ *
   * 7.  THE THREE DRAFTED LAYOUTS                                       *
   *                                                                     *
   * Slot contents per seven-white period, read off the sheets.          *
   * null = no accidental in that slot.                                  *
   * ------------------------------------------------------------------ */
  const LAYOUTS = {
    15: {
      label: '15-EDO  (Cimbalo Cromatico [15])',
      slots: [
        ['Full Sized Black'],
        ['Split Black Second', 'Split Gray First'],
        ['Split Black Second', 'Split Gray First'],
        null,
        ['Full Sized Black'],
        ['Split Black Second', 'Split Gray First'],
        null
      ],
      notes: 15,
      // the 15 sheet is drawn starting on C, not F
      rotation: 4,
      whites: 29,
      sheetWhites: 29
    },
    17: {
      label: '17-EDO  (Cimbalo Cromatico [17])',
      slots: [
        ['Split Black Second', 'Split Gray First'],
        ['Split Black Second', 'Split Gray First'],
        ['Split Black Second', 'Split Gray First'],
        null,
        ['Split Black Second', 'Split Gray First'],
        ['Split Black Second', 'Split Gray First'],
        null
      ],
      notes: 17,
      whites: 25,
      sheetWhites: 25
    },
    19: {
      label: '19-EDO  (Cimbalo Cromatico [19])',
      slots: [
        ['Split Black Second', 'Split Gray First'],
        ['Split Black Second', 'Split Gray First'],
        ['Split Black Second', 'Split Gray First'],
        ['Full Sized Gray'],
        ['Split Black Second', 'Split Gray First'],
        ['Split Black Second', 'Split Gray First'],
        ['Full Sized Gray']
      ],
      notes: 19,
      whites: 23,
      sheetWhites: 23
    }
  };

  /* NOTE NAMES ARE NOT THIS APP'S TO GIVE.  The keyboard used to label its
   * whites F G A B C D E and its gaps F♯/G♭ and so on, which reads a
   * twelve-note diatonic spelling onto an instrument that is not one and
   * has no such spelling defined yet.  Keys are identified by their index
   * along the keyboard — the same number as the sensor foot they stand on
   * — and nothing else.                                                 */

  /* ==================================================================== *
   *  MESH PRIMITIVES                                                     *
   * ==================================================================== */
  function pushTri(t, a, b, c) {
    t.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }
  function pushQuad(t, a, b, c, d) { pushTri(t, a, b, c); pushTri(t, a, c, d); }

  function pushBox(t, x0, x1, y0, y1, z0, z1) {
    if (x1 - x0 < 1e-5 || y1 - y0 < 1e-5 || z1 - z0 < 1e-5) return;
    const p = (x, y, z) => [x, y, z];
    pushQuad(t, p(x0,y0,z0), p(x0,y1,z0), p(x1,y1,z0), p(x1,y0,z0));   // -z
    pushQuad(t, p(x0,y0,z1), p(x1,y0,z1), p(x1,y1,z1), p(x0,y1,z1));   // +z
    pushQuad(t, p(x0,y0,z0), p(x1,y0,z0), p(x1,y0,z1), p(x0,y0,z1));   // -y
    pushQuad(t, p(x1,y0,z0), p(x1,y1,z0), p(x1,y1,z1), p(x1,y0,z1));   // +x
    pushQuad(t, p(x1,y1,z0), p(x0,y1,z0), p(x0,y1,z1), p(x1,y1,z1));   // +y
    pushQuad(t, p(x0,y1,z0), p(x0,y0,z0), p(x0,y0,z1), p(x0,y1,z1));   // -x
  }

  /* Loft a ring of N points between two Y stations. Rings are given as
   * [x,z] pairs in consistent winding.  capA / capB close the ends.
   *
   * Winding matters: pushBox emits outward-facing quads, so the lofts have
   * to as well or the two halves of a key disagree about which side is the
   * outside.  For a ring wound counter-clockwise in (x, z) seen from +y the
   * quad below faces outward — and it stays outward when the caller lofts
   * back-to-front (yA < yB) or hands in a clockwise ring, which is how the
   * hollow undersides are cut.  That makes STL normals and Blender's shading
   * right; the preview shades two-sided and never noticed.               */
  function loftRing(t, ringA, yA, ringB, yB, capA, capB) {
    const n = ringA.length;
    const fwd = yA >= yB;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ai = [ringA[i][0], yA, ringA[i][1]], aj = [ringA[j][0], yA, ringA[j][1]];
      const bi = [ringB[i][0], yB, ringB[i][1]], bj = [ringB[j][0], yB, ringB[j][1]];
      if (fwd) pushQuad(t, ai, aj, bj, bi);
      else     pushQuad(t, ai, bi, bj, aj);
    }
    if (capA) fanCap(t, ringA, yA, fwd);
    if (capB) fanCap(t, ringB, yB, !fwd);
  }
  function fanCap(t, ring, y, flip) {
    for (let i = 1; i < ring.length - 1; i++) {
      const a = [ring[0][0], y, ring[0][1]];
      const b = [ring[i][0], y, ring[i][1]];
      const c = [ring[i + 1][0], y, ring[i + 1][1]];
      flip ? pushTri(t, a, c, b) : pushTri(t, a, b, c);
    }
  }

  /** a slab whose floor slopes from (yA,zA) to (yB,zB) under a flat top */
  function XM_loftPrism(t, x0, x1, yA, zA, yB, zB, zTop) {
    const ringA = [[x0, zA], [x1, zA], [x1, zTop], [x0, zTop]];
    const ringB = [[x0, zB], [x1, zB], [x1, zTop], [x0, zTop]];
    loftRing(t, ringA, yA, ringB, yB, true, true);
  }

  /* ==================================================================== *
   *  KEY GEOMETRY — instantiated from the drafted profiles               *
   *                                                                      *
   *  Every key in the 15 / 17 / 19 sheets was measured and reduced to one *
   *  profile per type (and, for whites, per neighbour context, because    *
   *  the drafted whites rib differently depending on what sits beside     *
   *  them).  Each vertex carries                                          *
   *                                                                      *
   *      x = alpha + beta * width      y, z constant                      *
   *                                                                      *
   *  so a profile spans every size scale: beta 0 pins a feature to the    *
   *  left edge, 1 to the right edge, 0.5 to the centreline.  Nothing here *
   *  is a reconstruction of the drafted shape; it is the drafted shape.   *
   * ==================================================================== */

  const ctxKey = (lb, rb) =>
    (lb == null ? 'n' : lb) + '|' + (rb == null ? 'n' : rb);

  /* ==================================================================== *
   *  THE WHITE KEY'S REAR IS DERIVED, NOT DRAFTED                        *
   *                                                                      *
   *  A white key is full width at the front, where you play it, and       *
   *  narrowed at the rear so the accidentals standing in the gaps either  *
   *  side have somewhere to be.  The sheets draw one such narrowing per   *
   *  neighbour case, and each one is drawn around a slot leaning +/- delta*
   *  away in the classic three-then-two piano arrangement.  That lean is  *
   *  a NOTE-NAME idea: it belongs to a seven-name diatonic spelling this  *
   *  instrument has not defined.  Without it every gap sits at the plain  *
   *  midpoint between its whites — and then none of the drafted rears     *
   *  fits, because every one of them was drawn around a lean.             *
   *                                                                      *
   *  So the rear is COMPUTED from where the accidentals actually are:     *
   *                                                                      *
   *      inset = accidentalWidth/2  -  whiteGap/2  +  FIT.gap             *
   *                                                                      *
   *  on each side that has an accidental, and NOTHING on a side that does *
   *  not — that side runs flush to the key's own edge.  A white with no   *
   *  accidental either side is therefore a plain rectangle in plan, which *
   *  is what a keyboard of 32 whites is made of.                          *
   *                                                                      *
   *  EVERY WHITE IS THE SAME SHAPE.  Same inset, same waist, same rear —  *
   *  so a scale run across the whites meets one width, not two.           *
   *                                                                      *
   *  IT COSTS NOTHING PER SIZE.  Accidental width and white width are     *
   *  both linear in s, so their ratio is fixed; the inset is therefore    *
   *  `alpha + beta * width` like every other drafted coordinate, and the  *
   *  four derived profiles are built once and hold at every scale.        *
   *                                                                      *
   *  THE TOPOLOGY THE SHEETS LEFT OUT.  The drafted white steps in on its *
   *  LEFT only — its rear runs flush to its right edge, shingled under    *
   *  the next key.  A rear that insets on BOTH sides needs a step on the  *
   *  right too, and the captured mesh has none: its right-hand outer and  *
   *  inner walls each run as ONE face from the rear all the way to the    *
   *  front.  twoSidedWhiteBase splits exactly those two faces at the step *
   *  planes, gives every right-hand vertex a rear twin and a front twin,  *
   *  and adds the two step faces — the mirror of what the left already    *
   *  has.  With no inset applied it reproduces the drafted key's volume   *
   *  to 0.002 mm3, which is how we know the split is geometry-neutral.    *
   * ==================================================================== */
  const STEP_Y_OUTER = 54.0688;      // where the outer wall steps out
  const STEP_Y_INNER = 55.0688;      // where the 1 mm inner wall follows
  const W_ROLE = {                   // the drafted betas, by what they are
    L_OUT: 0.337838, L_IN: 0.381081, C_L: 0.647297, C_R: 0.690541,
    R_IN:  0.956757, R_OUT: 1.0
  };
  const stepYOf = b => (b === W_ROLE.R_OUT ? STEP_Y_OUTER : STEP_Y_INNER);

  /**
   * Split the two right-hand walls at the step planes so the rear can move
   * independently of the front.  Returns the profile as editable arrays
   * plus `rearSet` — every vertex index that belongs to the rear — and the
   * corners of the two step faces that have to be added.
   */
  function twoSidedWhiteBase(p) {
    const V = [];
    for (let i = 0; i < p.nv; i++) {
      const j = i * 4;
      V.push({ a: p.v[j], b: +p.v[j + 1].toFixed(6),
               y: +p.v[j + 2].toFixed(4), z: +p.v[j + 3].toFixed(4) });
    }
    const F = [];
    for (let i = 0; i < p.f.length;) { const n = p.f[i]; F.push(p.f.slice(i + 1, i + 1 + n)); i += n + 1; }

    const rearOf = new Map(), frontOf = new Map(), rearSet = new Set();
    const add = v => (V.push(v), V.length - 1);
    const n0 = V.length;
    for (let i = 0; i < n0; i++) {
      if (V[i].b !== W_ROLE.R_OUT && V[i].b !== W_ROLE.R_IN) continue;
      rearOf.set(i, i); rearSet.add(i);            // the original is the rear
      frontOf.set(i, add(Object.assign({}, V[i]))); // and it gains a front twin
    }
    const side = i => !rearOf.has(i) ? i
      : (V[i].y <= stepYOf(V[i].b) + 1e-6 ? rearOf.get(i) : frontOf.get(i));
    const cross = (i, j, at) => {
      const A = V[i], B = V[j], t = (at - A.y) / (B.y - A.y);
      return { a: A.a, b: A.b, y: at, z: +(A.z + (B.z - A.z) * t).toFixed(4) };
    };

    const out = [], steps = [];
    for (const f of F) {
      const bs = new Set(f.map(v => V[v].b));
      const ys = f.map(v => V[v].y);
      const b = V[f[0]].b;
      const isWall = bs.size === 1 && (bs.has(W_ROLE.R_OUT) || bs.has(W_ROLE.R_IN));
      const at = stepYOf(b);
      const crosses = Math.min.apply(null, ys) < at - 1e-6 &&
                      Math.max.apply(null, ys) > at + 1e-6;

      if (isWall && crosses) {                     // one wall becomes two
        const rear = [], front = [];
        for (let n = 0; n < f.length; n++) {
          const i = f[n], j = f[(n + 1) % f.length];
          const yi = V[i].y, yj = V[j].y;
          if (Math.abs(yi - at) < 1e-6) {           // ON the plane: both loops
            rear.push(rearOf.get(i)); front.push(frontOf.get(i));
          } else (yi < at ? rear : front).push(yi < at ? rearOf.get(i) : frontOf.get(i));
          if ((yi < at - 1e-6 && yj > at + 1e-6) || (yi > at + 1e-6 && yj < at - 1e-6)) {
            const c = cross(i, j, at);
            const r = add(Object.assign({}, c)), fr = add(Object.assign({}, c));
            rearSet.add(r);
            if (yi < at) { rear.push(r); front.push(fr); }
            else { front.push(fr); rear.push(r); }
          }
        }
        out.push(rear); out.push(front);
        steps.push({ beta: b, rear: rear.slice(-2),
                     front: [front[0], front[front.length - 1]] });
        continue;
      }

      /* every other face keeps one loop; where it walks along a right-hand
       * wall from the rear to the front it gains the step's corner, so the
       * face still closes once the rear moves in */
      const ring = [];
      for (let n = 0; n < f.length; n++) {
        const i = f[n], j = f[(n + 1) % f.length];
        ring.push(side(i));
        if (!rearOf.has(i) || !rearOf.has(j) || V[i].b !== V[j].b) continue;
        const a2 = stepYOf(V[i].b), yi = V[i].y, yj = V[j].y;
        if (Math.abs(yi - a2) < 1e-6 && yj > a2 + 1e-6) { ring.push(frontOf.get(i)); continue; }
        if (Math.abs(yj - a2) < 1e-6 && yi > a2 + 1e-6) { ring.push(frontOf.get(j)); continue; }
        if ((yi < a2 - 1e-6 && yj > a2 + 1e-6) || (yi > a2 + 1e-6 && yj < a2 - 1e-6)) {
          const c = cross(i, j, a2);
          const r = add(Object.assign({}, c)), fr = add(Object.assign({}, c));
          rearSet.add(r);
          if (yi < a2) ring.push(r, fr); else ring.push(fr, r);
        }
      }
      out.push(ring);
    }
    return { V, F: out, w0: p.w0, widths: p.widths, rearSet, steps };
  }

  /**
   * One derived white: the base with its rear placed against whatever
   * stands beside it.  `left` / `right` say whether that gap holds an
   * accidental; where it does not, that side runs flush to the key edge.
   *
   * The rear's six x roles come out as [inset, inset+wall, centre-wall/2,
   * centre+wall/2, width-inset-wall, width-inset] — the 1 mm walls keep
   * their millimetre and the centre rib stays on the centreline, because
   * the rear is symmetric by construction.
   */
  const MIN_REAR = 0.14;    // the least of its own width a rear may keep

  function deriveWhiteProfile(base, halfL, halfR) {
    /* `halfL` / `halfR` are HALF the neighbouring class's width as a ratio
     * of this white's, or 0 for a gap with nothing in it.  A class can be
     * widened until the two insets would meet in the middle; past that the
     * pair is scaled back together, so a rear never inverts and the two
     * sides stay in proportion to the keys that caused them.            */
    let bL = Math.max(0, halfL || 0), bR = Math.max(0, halfR || 0);
    const room = 1 - MIN_REAR;
    if (bL + bR > room) { const k = room / (bL + bR); bL *= k; bR *= k; }
    const back = SIZE.whiteGap / 2 - FIT.gap;       // what the gap already gives
    const inset = b => b > 0 ? { a: -back, b } : { a: 0, b: 0 };
    const iL = inset(bL), iR = inset(bR);
    const put = {};
    put[W_ROLE.L_OUT] = { a: iL.a,        b: iL.b };
    put[W_ROLE.L_IN]  = { a: iL.a + WALL, b: iL.b };
    put[W_ROLE.C_L]   = { a: -WALL / 2,   b: 0.5 };
    put[W_ROLE.C_R]   = { a: +WALL / 2,   b: 0.5 };
    const rOut = { a: -iR.a,        b: 1 - iR.b };
    const rIn  = { a: -iR.a - WALL, b: 1 - iR.b };
    /* A SHELL WALL IS A MILLIMETRE, NOT A FRACTION.  The capture stored the
     * front's two inner faces as pure beta — 0.043243 and 0.956757 of the
     * drafted width — so they thinned and fattened with the key instead of
     * staying the 1 mm they are.  Restated here as alpha, which also makes
     * them share coordinates with the rear's walls wherever the two meet. */
    const fIn  = { a: WALL,  b: 0 };
    const fInR = { a: -WALL, b: 1 };

    const V = base.V.map(v => Object.assign({}, v));
    for (let i = 0; i < V.length; i++) {
      const v = V[i], q = put[v.b];
      if (q) { v.a = q.a; v.b = q.b; continue; }
      if (!base.rearSet.has(i)) {                   // a front face
        if (Math.abs(v.b - 0.043243) < 1e-6) { v.a = fIn.a;  v.b = fIn.b; }
        else if (Math.abs(v.b - W_ROLE.R_IN) < 1e-6) { v.a = fInR.a; v.b = fInR.b; }
        continue;
      }
      if (Math.abs(v.b - W_ROLE.R_OUT) < 1e-9) { v.a = rOut.a; v.b = rOut.b; }
      else if (Math.abs(v.b - W_ROLE.R_IN) < 1e-6) { v.a = rIn.a; v.b = rIn.b; }
    }
    /* the two right-hand step faces, wound to match the left's: the outer
     * step faces back toward the spine, the inner one forward */
    const F = base.F.map(f => f.slice());
    for (const st of base.steps)
      F.push(st.beta === W_ROLE.R_OUT
        ? [st.rear[1], st.rear[0], st.front[0], st.front[1]]
        : [st.front[0], st.front[1], st.rear[1], st.rear[0]]);

    /* WELD.  Where a side takes no inset its rear twin lands exactly on its
     * front twin, and the wall the split opened closes again into a
     * zero-width sliver.  Welding on (alpha, beta, y, z) — which is
     * size-independent, so two vertices welded here are coincident at every
     * scale — removes the sliver and the faces that collapsed with it, and
     * the mesh comes back out as tidy as the sheet's own.               */
    const canon = new Map(), keep = [], remap = new Array(V.length);
    for (let i = 0; i < V.length; i++) {
      const k = V[i].a.toFixed(6) + ',' + V[i].b.toFixed(6) + ',' +
                V[i].y.toFixed(4) + ',' + V[i].z.toFixed(4);
      if (!canon.has(k)) { canon.set(k, keep.length); keep.push(V[i]); }
      remap[i] = canon.get(k);
    }
    const faces = [];
    for (const r of F) {
      const q = [];
      for (const i of r) { const c = remap[i]; if (q[q.length - 1] !== c) q.push(c); }
      while (q.length > 1 && q[0] === q[q.length - 1]) q.pop();
      if (new Set(q).size >= 3) faces.push(q);
    }
    const v = [], f = [];
    for (const q of keep) v.push(q.a, q.b, q.y, q.z);
    for (const r of faces) { f.push(r.length); for (const i of r) f.push(i); }
    return { w0: base.w0, widths: base.widths, nv: keep.length, nf: faces.length,
             v, f, derived: true };
  }

  /**
   * The base as captured, unsplit: the drafted topology, which already
   * steps on the LEFT and runs flush on the right.  A white that needs no
   * RIGHT inset needs no right step either, so it is derived on this — one
   * fewer seam, and the mesh comes out as tidy as the sheet's own.
   */
  function plainWhiteBase(p) {
    const V = [];
    for (let i = 0; i < p.nv; i++) {
      const j = i * 4;
      V.push({ a: p.v[j], b: +p.v[j + 1].toFixed(6),
               y: +p.v[j + 2].toFixed(4), z: +p.v[j + 3].toFixed(4) });
    }
    const F = [];
    for (let i = 0; i < p.f.length;) { const n = p.f[i]; F.push(p.f.slice(i + 1, i + 1 + n)); i += n + 1; }
    return { V, F, w0: p.w0, widths: p.widths, rearSet: new Set(), steps: [] };
  }

  let WHITE_BASE = null, WHITE_BASE_2 = null;
  const DERIVED_WHITE = {};
  /**
   * The white for a given pair of neighbours.  `halfL` / `halfR` are half
   * the neighbouring class's width as a ratio of this white's — 0 for an
   * empty gap — so a design that gives its blacks and its splits different
   * widths gets a different white beside each.  Everything is still a pure
   * ratio, so one profile per pair of ratios holds at every size; they are
   * built on demand and cached by that pair.
   */
  function whiteProfile(halfL, halfR) {
    const q = v => (Math.round((v || 0) * 1e5) / 1e5).toFixed(5);
    const k = q(halfL) + '|' + q(halfR);
    if (!DERIVED_WHITE[k]) {
      const src = KP.P[KP.INDEX['Full Sized White']['n|n']];
      const base = halfR > 0
        ? (WHITE_BASE_2 || (WHITE_BASE_2 = twoSidedWhiteBase(src)))
        : (WHITE_BASE   || (WHITE_BASE   = plainWhiteBase(src)));
      DERIVED_WHITE[k] = deriveWhiteProfile(base, halfL, halfR);
    }
    return DERIVED_WHITE[k];
  }

  /** the profile for a key type in a given neighbour context */

  function profileFor(type, lb, rb) {
    let mirror = false, t = type;
    if (KP.MIRROR[t]) { mirror = true; t = KP.MIRROR[t]; }
    const table = KP.INDEX[t];
    if (!table) throw new Error('no drafted profile for key type: ' + type);
    const want = ctxKey(lb, rb);
    /* a white is never picked from the sheet any more — it is derived from
     * what actually stands beside it.  See whiteProfile above.          */
    if (t === 'Full Sized White')
      return { p: whiteProfile(lb, rb), mirror, exact: true };
    if (table[want] != null) return { p: KP.P[table[want]], mirror, exact: true };
    /* The sheets draw nine of the sixteen possible neighbour contexts.  For
     * one they never drew, borrow the drafted white whose context is
     * closest — occupancy first, then the nearer slot bias.               */
    let best = null, bestScore = Infinity;
    for (const k of Object.keys(table)) {
      const parts = k.split('|');
      const al = parts[0] === 'n' ? null : +parts[0];
      const bl = parts[1] === 'n' ? null : +parts[1];
      let sc = ((al === null) === (lb === null) ? 0 : 10) +
               ((bl === null) === (rb === null) ? 0 : 10);
      if (al !== null && lb !== null) sc += Math.abs(al - lb);
      if (bl !== null && rb !== null) sc += Math.abs(bl - rb);
      if (sc < bestScore) { bestScore = sc; best = table[k]; }
    }
    return { p: KP.P[best], mirror, exact: false };
  }

  /** the profile's vertex positions at width w, left edge at xLeft */
  function profilePoints(p, mirror, w, xLeft) {
    const v = p.v, n = p.nv, out = new Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      let x = v[j] + v[j + 1] * w;
      if (mirror) x = w - x;
      out[i] = [xLeft + x, v[j + 2], v[j + 3]];
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   *  FACE TRIANGULATION — ear clipping, NOT a fan                        *
   *                                                                     *
   *  The drafted faces are n-gons and a great many of them are CONCAVE:  *
   *  the step a white key takes around its neighbouring accidentals is   *
   *  cut into the key's own top, underside and shoulder faces, so those  *
   *  polygons have reflex corners by construction.  A triangle fan from  *
   *  vertex 0 is only valid on a convex polygon; run it on these and it  *
   *  lays triangles straight across the notch, which is exactly the      *
   *  "wall connecting two corners" artefact — and on a white key it      *
   *  paves over the very clearance the key is cut back to provide, so    *
   *  the white reads as full width all the way to the spine.            *
   *                                                                     *
   *  Ear clipping in the face's own plane reproduces the drafted outline *
   *  instead.  The algorithm is deterministic and is duplicated verbatim *
   *  in the generated Blender log, so the browser, the STLs and the      *
   *  Blender build stay the same mesh.                                   *
   * ------------------------------------------------------------------ */
  const TRI_EPS = 1e-9;

  /** signed area of (a, b, c) in the projected plane */
  function tri2(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }

  /** strictly inside — a point exactly on an edge does not block the ear */
  function inTri2(p, a, b, c) {
    return tri2(a, b, p) > TRI_EPS &&
           tri2(b, c, p) > TRI_EPS &&
           tri2(c, a, p) > TRI_EPS;
  }

  /**
   * Triangulate one face.
   *   V     3-D vertex positions
   *   ring  vertex indices, in the drafted winding
   * Returns index triples wound to match the face's own normal.
   */
  function triangulateFace(V, ring) {
    const m = ring.length, out = [];
    if (m < 3) return out;
    if (m === 3) return [[ring[0], ring[1], ring[2]]];

    /* Newell normal — robust for the near-planar drafted faces */
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < m; i++) {
      const a = V[ring[i]], b = V[ring[(i + 1) % m]];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);

    /* drop the dominant axis; the remaining pair is cyclic, so the sign of
     * the 2-D signed area is the sign of that axis' normal component */
    let pick, sign;
    if (az >= ax && az >= ay)      { pick = p => [p[0], p[1]]; sign = nz; }
    else if (ay >= ax)             { pick = p => [p[2], p[0]]; sign = ny; }
    else                           { pick = p => [p[1], p[2]]; sign = nx; }

    const P = ring.map(i => pick(V[i]));          // 2-D, indexed by ring slot
    const flip = sign < 0;                        // make the working loop CCW
    let poly = [];
    for (let i = 0; i < m; i++) poly.push(flip ? m - 1 - i : i);

    const emit = (i0, i1, i2) => out.push(flip
      ? [ring[i2], ring[i1], ring[i0]]
      : [ring[i0], ring[i1], ring[i2]]);

    let guard = 4 * m * m + 16;
    while (poly.length > 3 && guard-- > 0) {
      let clipped = false;
      for (let i = 0; i < poly.length; i++) {
        const n = poly.length;
        const i0 = poly[i], i1 = poly[(i + 1) % n], i2 = poly[(i + 2) % n];
        const a = P[i0], b = P[i1], c = P[i2];
        if (tri2(a, b, c) <= TRI_EPS) continue;   // reflex or degenerate
        let blocked = false;
        for (let j = 0; j < n; j++) {
          const q = poly[j];
          if (q === i0 || q === i1 || q === i2) continue;
          if (inTri2(P[q], a, b, c)) { blocked = true; break; }
        }
        if (blocked) continue;
        emit(i0, i1, i2);
        poly.splice((i + 1) % n, 1);
        clipped = true;
        break;
      }
      if (clipped) continue;
      /* No ear this pass — the drafted polygon is degenerate here (collinear
       * run) or self-intersecting in its own plane, which a few sheet faces
       * are.  Clip the least-bad corner anyway and EMIT it: a zero-area
       * triangle costs nothing and keeps every boundary edge paired, so the
       * key stays watertight for the slicer.                              */
      let bi = 0, bs = -Infinity;
      for (let i = 0; i < poly.length; i++) {
        const n = poly.length;
        const s = tri2(P[poly[i]], P[poly[(i + 1) % n]], P[poly[(i + 2) % n]]);
        if (s > bs) { bs = s; bi = i; }
      }
      const n = poly.length;
      emit(poly[bi], poly[(bi + 1) % n], poly[(bi + 2) % n]);
      poly.splice((bi + 1) % n, 1);
    }
    if (poly.length === 3) emit(poly[0], poly[1], poly[2]);
    else for (let i = 1; i + 1 < poly.length; i++) emit(poly[0], poly[i], poly[i + 1]);
    return out;
  }

  /* ------------------------------------------------------------------ *
   *  CUTTING A LOOP INTO A DRAFTED FACE                                 *
   *                                                                     *
   *  Kept for the seats argument, which nothing passes any more: a pair *
   *  face is a floating loop lying in the deck plane, not a weld, so    *
   *  loop, so the two share solid along that loop.  Two coplanar faces   *
   *  pressed together are exactly what a boolean union gets wrong, and   *
   *  what used to leave connectors behind as loose parts.               *
   * ------------------------------------------------------------------ */
  /** XY signed area (twice) of an index ring — sign is the winding */
  function ringArea2(V, idx) {
    let s = 0;
    for (let i = 0; i < idx.length; i++) {
      const a = V[idx[i]], b = V[idx[(i + 1) % idx.length]];
      s += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return s;
  }

  /** do ab and cd properly cross?  touching at a shared endpoint does not */
  function segCross(a, b, c, d) {
    const s1 = tri2(a, b, c), s2 = tri2(a, b, d);
    const s3 = tri2(c, d, a), s4 = tri2(c, d, b);
    return ((s1 > TRI_EPS && s2 < -TRI_EPS) || (s1 < -TRI_EPS && s2 > TRI_EPS)) &&
           ((s3 > TRI_EPS && s4 < -TRI_EPS) || (s3 < -TRI_EPS && s4 > TRI_EPS));
  }

  /** is p inside the XY polygon `poly` (array of 3-D points)? */
  function pointInPoly2(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) &&
          p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0])
        inside = !inside;
    }
    return inside;
  }

  /**
   * Triangulate one face with loops cut out of it.  Each hole is folded
   * into the outer loop along the shortest cut edge that crosses nothing,
   * leaving one simple ring for the existing ear-clipper — the same fan
   * the drafted example's deck is built from.  `V` is extended in place
   * with the hole vertices, so `ring`'s indices stay valid.
   */
  function triangulateFaceWithHoles(V, ring, holes) {
    let outer = ring.slice();
    const oSign = Math.sign(ringArea2(V, outer)) || 1;
    for (const hole of holes) {
      const start = V.length;
      const hi = hole.map((q, i) => { V.push([q[0], q[1], q[2]]); return start + i; });
      if (Math.sign(ringArea2(V, hi)) === oSign) hi.reverse();   // holes run against
      const edges = [];
      const addEdges = idx => {
        for (let i = 0; i < idx.length; i++)
          edges.push([idx[i], idx[(i + 1) % idx.length]]);
      };
      addEdges(outer); addEdges(hi);
      let best = null;
      for (let i = 0; i < outer.length; i++)
        for (let j = 0; j < hi.length; j++) {
          const a = V[outer[i]], b = V[hi[j]];
          const d = (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);
          if (best && d >= best.d) continue;
          let blocked = false;
          for (const e of edges) {
            if (e[0] === outer[i] || e[1] === outer[i] ||
                e[0] === hi[j] || e[1] === hi[j]) continue;
            if (segCross(a, b, V[e[0]], V[e[1]])) { blocked = true; break; }
          }
          if (!blocked) best = { i, j, d };
        }
      if (!best) best = { i: 0, j: 0 };
      const merged = outer.slice(0, best.i + 1);
      for (let k = 0; k <= hi.length; k++) merged.push(hi[(best.j + k) % hi.length]);
      merged.push(outer[best.i]);
      outer = merged.concat(outer.slice(best.i + 1));
    }
    return triangulateFace(V, outer);
  }

  /** is this face the down-facing deck plane one seat's loop lies in? */
  function faceHoldsSeat(P, seat) {
    let z0 = Infinity, z1 = -Infinity;
    for (const p of P) { if (p[2] < z0) z0 = p[2]; if (p[2] > z1) z1 = p[2]; }
    if (z1 - z0 > 1e-4 || Math.abs(z0 - seat.z) > 1e-4) return false;
    for (const q of seat.ring) if (!pointInPoly2(q, P)) return false;
    return true;
  }

  /**
   * One key, as a triangle soup.
   *   cx     centre x            w   width (from the size law)
   *   type   key type name
   *   lb/rb  bias of the occupied slot to the left / right, or null
   *   seats  kept for callers that still pass it; the pair face is a
   *          floating loop now, so nothing is cut into the deck
   */
  function buildKey(cx, w, type, lb, rb, seats) {
    const q = profileFor(type, lb, rb);
    const V = profilePoints(q.p, q.mirror, w, cx - w / 2);
    const f = q.p.f, t = [];
    /* DEGENERATE TRIANGLES ARE DROPPED, NOT EMITTED.  A drafted face can
     * collapse to a line once a profile is rectified — the plain white's
     * step wall does exactly that, because a rectangle has no step — and a
     * zero-area triangle is not a surface: it contributes a directed edge
     * twice and breaks the watertight test that a printable part has to
     * pass.  Dropping it leaves the two faces that met at the wall meeting
     * each other, which is what a rectified key actually is.            */
    const emit = tris => {
      for (const tri of tris) {
        const a = V[tri[0]], b = V[tri[1]], c = V[tri[2]];
        const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
        const vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
        const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
        if (nx*nx + ny*ny + nz*nz < 1e-18) continue;      // zero area
        t.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      }
    };
    /* index the faces so a seat can claim a whole coplanar REGION of them —
     * a belly is a dozen fragments, and the loop is cut into the merged
     * outline, never into whichever fragment it happens to start in */
    const faces = [];
    for (let k = 0; k < f.length;) {
      const m = f[k++];
      const ring = f.slice(k, k + m); k += m;
      if (q.mirror) ring.reverse();          // mirroring flips face winding
      faces.push(ring);
    }
    /* a key's two bars land on the SAME belly, so the seats are grouped by
     * their plane and cut in together — one merge, one triangulation, both
     * loops as holes */
    const claimed = new Set();
    const byZ = new Map();
    for (const sea of (seats || [])) {
      const kz = Math.round(sea.z * 1e4);
      (byZ.get(kz) || (byZ.set(kz, []), byZ.get(kz))).push(sea);
    }
    for (const group0 of byZ.values()) {
      const z = group0[0].z, group = [];
      for (let i = 0; i < faces.length; i++) {
        const P = faces[i].map(j => V[j]);
        let z0 = Infinity, z1 = -Infinity;
        for (const p of P) { if (p[2] < z0) z0 = p[2]; if (p[2] > z1) z1 = p[2]; }
        if (z1 - z0 > 1e-4 || Math.abs(z0 - z) > 1e-4) continue;
        if (polyArea2(P) >= 0) continue;               // down-facing only
        group.push(i);
      }
      if (!group.length) continue;
      const loops = mergeCoplanar(group.map(i => faces[i].map(j => V[j])));
      const outers = loops.filter(R => polyArea2(R) < 0);
      const holes  = loops.filter(R => polyArea2(R) >= 0);
      const fit = new Map();                           // outer loop -> its seats
      for (const sea of group0) {
        const R = outers.filter(o => sea.ring.every(p => pointInPoly2(p, o)))
                        .sort((a, b) => polyArea2(a) - polyArea2(b))[0];
        if (R) (fit.get(R) || (fit.set(R, []), fit.get(R))).push(sea);
      }
      if (!fit.size) continue;                         // seats hang off the belly
      for (const i of group) claimed.add(i);
      const lift = R => R.map(pt => [pt[0], pt[1], z]);
      for (const R of outers) {
        const idx = lift(R).map(pt => (V.push(pt), V.length - 1));
        const cut = (fit.get(R) || []).map(sea => sea.ring);
        const own = holes.filter(h => h.every(p => pointInPoly2(p, R))).map(lift);
        emit(triangulateFaceWithHoles(V, idx, own.concat(cut)));
      }
    }
    for (let i = 0; i < faces.length; i++)
      if (!claimed.has(i)) emit(triangulateFace(V, faces[i]));
    return t;
  }

  /** the same key as the drafted polygons, un-triangulated (for Blender) */
  function keyPolygons(cx, w, type, lb, rb) {
    const q = profileFor(type, lb, rb);
    const V = profilePoints(q.p, q.mirror, w, cx - w / 2);
    const f = q.p.f, out = [];
    for (let k = 0; k < f.length;) {
      const m = f[k++];
      const ring = f.slice(k, k + m); k += m;
      if (q.mirror) ring.reverse();
      out.push(ring.map(i => V[i]));
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   *  THE KEY'S BELLY IS NOT ONE FACE                                    *
   *                                                                     *
   *  A drafted key's underside comes off the sheet as a dozen coplanar   *
   *  faces meeting on shared edges — so "the deck" is a REGION, not a    *
   *  polygon, and seating a pair face on it and reading its extent      *
   *  into it have to work on the merged outline rather than on whichever *
   *  fragment happened to be biggest.                                    *
   *                                                                     *
   *  Merging is exact and cheap here: the key is edge-manifold, so every *
   *  seam between two coplanar faces appears twice, once in each         *
   *  direction.  Cancel those and what is left is the region's own       *
   *  boundary, which chains straight into loops.                        *
   * ------------------------------------------------------------------ */
  const MERGE_Q = 1e5;

  /**
   * Merge a set of coplanar polygons into their boundary loops (XY, wound
   * as the input was).
   *
   * Cancel every edge that also appears reversed — those are the seams
   * between two fragments — and walk what is left.  The walk cannot just
   * follow "any unused edge out": a belly pinches, and a pinch vertex has
   * several edges out, so following the wrong one splices two unrelated
   * parts of the boundary into one nonsense loop.  At each vertex it
   * therefore takes the next edge CLOCKWISE from the one it arrived on,
   * which is the standard planar-subdivision face walk and separates the
   * loops correctly at every pinch.
   */
  function mergeCoplanar(polys) {
    const key = p => Math.round(p[0] * MERGE_Q) + ',' + Math.round(p[1] * MERGE_Q);
    const pos = new Map(), cnt = new Map();
    for (const P of polys)
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        const ka = key(a), kb = key(b);
        if (ka === kb) continue;
        pos.set(ka, a); pos.set(kb, b);
        const e = ka + '>' + kb;
        cnt.set(e, (cnt.get(e) || 0) + 1);
      }
    /* surviving directed edges, grouped by tail, each with its heading */
    const out = new Map();
    for (const [e, c] of cnt) {
      const i = e.indexOf('>'), a = e.slice(0, i), b = e.slice(i + 1);
      const n = c - (cnt.get(b + '>' + a) || 0);          // seams cancel
      if (n <= 0) continue;
      const pa = pos.get(a), pb = pos.get(b);
      const l = out.get(a) || (out.set(a, []), out.get(a));
      for (let k = 0; k < n; k++)
        l.push({ to: b, ang: Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), used: false });
    }
    const TAU = Math.PI * 2;
    const loops = [];
    for (const [start, list] of out)
      for (const first of list) {
        if (first.used) continue;
        first.used = true;
        const loop = [start];
        let from = start, edge = first, guard = 0;
        while (guard++ < 8192) {
          loop.push(edge.to);
          if (edge.to === start) break;
          const cands = out.get(edge.to);
          if (!cands) break;
          const back = edge.ang + Math.PI;
          let pick = null, bestA = Infinity;
          for (const c of cands) {
            if (c.used) continue;
            let d = (back - c.ang) % TAU;               // clockwise from the
            if (d <= 1e-9) d += TAU;                    // edge we came in on
            if (d < bestA) { bestA = d; pick = c; }
          }
          if (!pick) break;
          pick.used = true;
          from = edge.to; edge = pick;
        }
        if (loop.length >= 4 && loop[loop.length - 1] === start)
          loops.push(loop.slice(0, -1).map(k => pos.get(k)));
      }
    return loops;
  }

  /** XY signed area (twice) of a point ring */
  function polyArea2(R) {
    let s = 0;
    for (let i = 0; i < R.length; i++) {
      const a = R[i], b = R[(i + 1) % R.length];
      s += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return s;
  }

  /**
   * The key's down-facing planar regions, merged, lowest first.  The
   * lowest one is the belly a pair face lies in; `loops` are its
   * merged boundaries, `polys` the drafted fragments they replace.
   */
  function keyDecks(cx, w, type, lb, rb) {
    const groups = new Map();
    for (const P of keyPolygons(cx, w, type, lb, rb)) {
      let z0 = Infinity, z1 = -Infinity;
      for (const p of P) { if (p[2] < z0) z0 = p[2]; if (p[2] > z1) z1 = p[2]; }
      if (z1 - z0 > 1e-4) continue;
      if (polyArea2(P) >= 0) continue;                    // down-facing only
      const kz = Math.round(z0 * 1e4);
      const g = groups.get(kz) || (groups.set(kz, { z: z0, polys: [] }), groups.get(kz));
      g.polys.push(P);
    }
    const out = [];
    for (const g of groups.values())
      out.push({ z: g.z, polys: g.polys, loops: mergeCoplanar(g.polys) });
    out.sort((a, b) => a.z - b.z);
    return out;
  }

  /** the key's true extent, straight off the profile */
  function keyExtent(cx, w, type, lb, rb) {
    const q = profileFor(type, lb, rb);
    const V = profilePoints(q.p, q.mirror, w, cx - w / 2);
    const r = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
    for (const p of V) {
      r[0] = Math.min(r[0], p[0]); r[1] = Math.max(r[1], p[0]);
      r[2] = Math.min(r[2], p[1]); r[3] = Math.max(r[3], p[1]);
      r[4] = Math.min(r[4], p[2]); r[5] = Math.max(r[5], p[2]);
    }
    return { x0: r[0], x1: r[1], y0: r[2], y1: r[3], z0: r[4], z1: r[5] };
  }

  /* ==================================================================== *
   *  SPINE + FEET GEOMETRY                                               *
   * ==================================================================== */
  function rectWithHoles(x0, x1, y0, y1, holes, emit) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) return;
    let h = null;
    for (const c of holes) {
      const a = Math.max(x0, c.x0), b = Math.min(x1, c.x1);
      const p = Math.max(y0, c.y0), q = Math.min(y1, c.y1);
      if (b - a > 1e-4 && q - p > 1e-4) { h = { x0: a, x1: b, y0: p, y1: q }; break; }
    }
    if (!h) { emit(x0, x1, y0, y1); return; }
    rectWithHoles(x0, h.x0, y0, y1, holes, emit);
    rectWithHoles(h.x1, x1, y0, y1, holes, emit);
    rectWithHoles(h.x0, h.x1, y0, h.y0, holes, emit);
    rectWithHoles(h.x0, h.x1, h.y1, y1, holes, emit);
  }

  /* ------------------------------------------------------------------ *
   *  THE MOUNTING HOLES ARE OBROUNDS                                    *
   *                                                                     *
   *  A 32-segment circle split at +/-90 deg, the halves held `straight`  *
   *  apart along x and closed with tangent lines: 34 points, CCW.  The   *
   *  sandbox draws exactly this, to 0.0001 mm.                          *
   * ------------------------------------------------------------------ */
  /**
   * The unit obround: [halfSign, cos, sin] per point, CCW, computed once so
   * that the Python log can carry these doubles verbatim and Blender never
   * has to re-run a trig function the browser already ran.
   *   point = [cx + halfSign * straight / 2 + r * cos, cy + r * sin]
   */
  const HOLE_UNIT = (function (n) {
    const q = n / 4, out = [];
    for (let k = -q; k <= q; k++) {          // right half, -90 .. +90
      const a = 2 * Math.PI * k / n;
      out.push([+1, Math.cos(a), Math.sin(a)]);
    }
    for (let k = q; k <= 3 * q; k++) {       // left half, +90 .. +270
      const a = 2 * Math.PI * k / n;
      out.push([-1, Math.cos(a), Math.sin(a)]);
    }
    return out;
  })(SPINE.hole.seg);

  function obroundRing(cx, cy, r, straight, unit) {
    return (unit || HOLE_UNIT).map(u =>
      [cx + u[0] * straight / 2 + r * u[1], cy + r * u[2]]);
  }

  /**
   * The 8 mounting holes of one spine half, as rings plus their bounding
   * boxes.  `upper` picks the narrower bore that every layer above the
   * channel-carrying one is drawn with.
   */
  function spineHoles(half, upper) {
    const tbl = upper ? SPINE.holesUpper[half] : SPINE.holesLower[half];
    const r = upper ? SPINE.hole.rUpper : SPINE.hole.rLower;
    const s = SPINE.hole.straight;
    return tbl.map(([cx, cy]) => ({
      cx, cy, r, ring: obroundRing(cx, cy, r, s),
      x0: cx - s / 2 - r, x1: cx + s / 2 + r,
      y0: cy - r,         y1: cy + r
    }));
  }

  /** where a ring point lands on the hole's bounding box, on the centre ray */
  function holeBoxPoint(h, p) {
    const dx = p[0] - h.cx, dy = p[1] - h.cy;
    const sx = dx > 0 ? (h.x1 - h.cx) / dx : dx < 0 ? (h.x0 - h.cx) / dx : Infinity;
    const sy = dy > 0 ? (h.y1 - h.cy) / dy : dy < 0 ? (h.y0 - h.cy) / dy : Infinity;
    const s = Math.min(sx, sy);
    // side index, CCW: 0 = +x, 1 = +y, 2 = -x, 3 = -y
    const side = sx <= sy ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
    return { p: [h.cx + dx * s, h.cy + dy * s], side };
  }

  /**
   * Fill the gap between a hole's bounding box and its obround ring, as a
   * cap at height z.  `up` is +1 for a face that looks up, -1 for one that
   * looks down.  This is what turns the rectangular decomposition below
   * into a rounded hole.
   */
  function pushHoleAnnulus(t, h, z, up) {
    const C = [[h.x1, h.y1], [h.x0, h.y1], [h.x0, h.y0], [h.x1, h.y0]];
    const tri = (a, b, c) => {
      // the ring touches its own bounding box at four points, so a few of
      // these come out with no area at all — drop them rather than ship
      // slivers into the STL
      const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(cr) < 1e-12) return;
      if (up > 0) pushTri(t, [a[0], a[1], z], [b[0], b[1], z], [c[0], c[1], z]);
      else        pushTri(t, [a[0], a[1], z], [c[0], c[1], z], [b[0], b[1], z]);
    };
    const n = h.ring.length;
    for (let i = 0; i < n; i++) {
      const a = h.ring[i], b = h.ring[(i + 1) % n];
      const pa = holeBoxPoint(h, a), pb = holeBoxPoint(h, b);
      const path = [pa.p];
      for (let s = pa.side; s !== pb.side; s = (s + 1) % 4) path.push(C[s]);
      path.push(pb.p);
      for (let j = 0; j < path.length - 1; j++) tri(a, path[j], path[j + 1]);
      tri(a, path[path.length - 1], b);
    }
  }

  /** the inside wall of one hole, z0 .. z1, normals pointing into the bore */
  function pushHoleWall(t, h, z0, z1) {
    const n = h.ring.length;
    for (let i = 0; i < n; i++) {
      const a = h.ring[i], b = h.ring[(i + 1) % n];
      pushQuad(t, [a[0], a[1], z0], [a[0], a[1], z1],
                  [b[0], b[1], z1], [b[0], b[1], z0]);
    }
  }

  /**
   * One slab of spine: the rectangle x0..x1 by y0..y1, from z0 to z1, with
   * the given obround holes bored through it.  The bulk is decomposed into
   * boxes around the holes' bounding boxes (rectWithHoles), then each hole
   * gets its annulus caps and its bore wall.
   */
  /**
   * A slab.  NOT watertight on its own: rectWithHoles subdivides
   * recursively, so neighbouring sub-rectangles meet at T-junctions rather
   * than edge to edge, and the obround annulus does not close against them
   * either — 608 boundary edges per spine part.  A union of the comb closes
   * it (the black comb comes out with none), but the raw spine STL is not
   * solid on its own.  Capping each slab as one polygon-with-holes is the
   * fix and is the outstanding item here; tiling the sub-rectangle caps was
   * tried and is worse (808), because the T-junctions then show up as
   * cracks instead of as doubled walls.
   */
  function pushSpineSlab(t, x0, x1, y0, y1, z0, z1, holes) {
    rectWithHoles(x0, x1, y0, y1, holes,
      (a, b, c, d) => pushBox(t, a, b, c, d, z0, z1));
    for (const h of holes) {
      pushHoleAnnulus(t, h, z1, +1);
      pushHoleAnnulus(t, h, z0, -1);
      pushHoleWall(t, h, z0, z1);
    }
  }

  // Spine band colours are pinned to COLORS.gray / .black / .white — the
  // exact same swatches the keys and the sensor presses render in, so a
  // spine band and the key/press sitting on it read as one material.
  const SPINE_LAYER_COLORS = {
    /* A ONE-TYPE SPINE CARRIES ONE COLOUR OF KEY, AND THAT COLOUR IS
     * WHITE.  spineKindForColours only ever returns 'one' when the design
     * places no gray and no black — a keyboard of plain whites — so its
     * single slab prints in the white filament with them, not in black. */
    one:   { all:   { srgb: COLORS.white, linear: [0.8900, 0.8900, 0.8481],
                      material: null } },
    two:   { lower: { srgb: COLORS.black, linear: [0.0220, 0.0220, 0.0301],
                      material: 'Material.003' },
             upper: { srgb: COLORS.white, linear: [0.8900, 0.8900, 0.8481],
                      material: null } },
    three: { gray:  { srgb: COLORS.gray,  linear: [0.2634, 0.2634, 0.2954],
                      material: 'Material.002' },
             black: { srgb: COLORS.black, linear: [0.0220, 0.0220, 0.0301],
                      material: 'Material.003' },
             white: { srgb: COLORS.white, linear: [0.8900, 0.8900, 0.8481],
                      material: null } }
  };

  /** the drafted colour of one spine layer; `space` is 'srgb' (default)
   *  or 'linear'.  Falls back to the flat spine grey if unknown.        */
  function spineLayerColor(spine, layerName, space) {
    const k = SPINE_LAYER_COLORS[spineKindOf(spine)];
    const e = k && k[layerName];
    return e ? e[space === 'linear' ? 'linear' : 'srgb'] : COLORS.spine;
  }

  /** the material the drafting sandbox gives that layer, or null */
  function spineLayerMaterial(spine, layerName) {
    const k = SPINE_LAYER_COLORS[spineKindOf(spine)];
    return k && k[layerName] ? k[layerName].material : null;
  }

  /** the drafted spine for a set (or array) of key colours */
  function spineKindForColours(used) {
    const s = (used instanceof Set) ? used : new Set(used || []);
    if (s.has('gray')) return 'three';
    if (s.has('black')) return 'two';
    return 'one';
  }

  /** how many layers that spine is drawn in */
  const spineLayerCount = kind => SPINE.layers[kind].A.length;

  /** accepts a kind ('one'/'two'/'three') or a plain layer count */
  const spineKindOf = n => (typeof n === 'string')
    ? n
    : (SPINE_KIND_BY_LAYERS[n] || (n >= 3 ? 'three' : n === 2 ? 'two' : 'one'));

  /** the halves of the one and only spine, in build order */
  const spineHalves = () => [['A', SPINE.halfA], ['B', SPINE.halfB]];

  /**
   * The one and only spine, as one part per (half, layer) — the same
   * decomposition the drafting sandbox uses, so each generated part has a
   * one-to-one counterpart in "<kind> type Spine - A / - B".
   * `spine` is a kind name or a layer count.
   */
  /**
   * The drafted bands, pushed apart so that no two of them share solid.
   * Half A drafts black 5.09072..6.10034 and white 6.07824..7.10034 — they
   * genuinely overlap.  Each band above the first is lifted to clear the one
   * below it by FIT.gap; the band below keeps its drafted top, so the datum
   * a key's tongue reads against does not move.
   */
  function spineBands(kind, hn) {
    const src = SPINE.layers[kind][hn];
    const out = [];
    let prevTop = -Infinity;
    for (const L of src) {
      const z0 = Math.max(L.z0, prevTop + FIT.gap);
      const z1 = Math.max(L.z1, z0 + 0.2);
      out.push({ name: L.name, z0, z1, z0Drafted: L.z0, z1Drafted: L.z1 });
      prevTop = z1;
    }
    return out;
  }

  /**
   * One spine.  `keySpans` is optional: [{ layer, x0, x1 }] for every key in
   * the design.  Given it, each band grows a FIT.engage boss forward over
   * the x span of the keys that share its colour, so key and band become one
   * solid when the comb is unioned.  Bands of other colours stay at y = 0
   * and so keep clear of those keys.
   */
  function spineParts(spine, keySpans) {
    const kind = spineKindOf(spine);
    const zc = SPINE.channel.zTop;
    const parts = [];
    for (const [hn, half] of spineHalves()) {
      const ch = SPINE.channel[hn];
      const layers = spineBands(kind, hn);
      /* the band's front face is recessed by FIT.gap so that a key of
       * ANOTHER colour never lies coincident with it — coplanar faces are
       * what leaves a union non-manifold — and only the boss reaches
       * forward, into the keys that share this band's colour. */
      const yF = half.yFront - FIT.gap;
      layers.forEach((L, i) => {
        const tris = [];
        if (i === 0) {
          /* The bottom layer carries the PCB channel.  Below the ceiling it
           * is two strips, front and back; above it, the full section with
           * the wide bore.  The channel runs out through both x ends.     */
          pushBox(tris, half.x0, half.x1, half.yBack, ch.y0, L.z0, zc);
          pushBox(tris, half.x0, half.x1, ch.y1, yF, L.z0, zc);
          pushSpineSlab(tris, half.x0, half.x1, half.yBack, yF,
                        zc, L.z1, spineHoles(hn, false));
        } else {
          pushSpineSlab(tris, half.x0, half.x1, half.yBack, yF,
                        L.z0, L.z1, spineHoles(hn, true));
        }
        /* the boss: FIT.engage of this band, carried forward into every key
         * of its own colour that stands on this half */
        if (keySpans) for (const k of keySpans) {
          if (k.layer !== L.name) continue;
          const a = Math.max(k.x0, half.x0), b = Math.min(k.x1, half.x1);
          if (b - a <= 1e-4) continue;
          /* only over the z the key's own tongue occupies — a band that
           * bossed its full height would run into the key of the colour
           * stacked next to it, which is the whole reason the tongues are
           * banded in the first place */
          const T = TONGUE_Z[L.name] || [L.z0, L.z1];
          const z0 = Math.max(L.z0, T[0]), z1 = Math.min(L.z1, T[1]);
          if (z1 - z0 <= 1e-4) continue;
          pushBox(tris, a, b, yF, half.yFront + FIT.engage, z0, z1);
        }
        /* The two AKM320 halves are drafted 1.3 mm apart.  A comb has to
         * come off the bed as ONE object, so each band carries a coupler
         * across that gap — built onto half A so it appears once. */
        if (hn === 'A') {
          const other = spineHalves().find(([n]) => n === 'B');
          if (other) {
            const g0 = half.x1, g1 = other[1].x0;
            if (g1 > g0 + 1e-4)
              pushBox(tris, g0, g1, half.yBack, yF, L.z0, L.z1);
          }
        }
        parts.push({
          name: 'Spine_' + hn + '_' + L.name, half: hn, layer: L.name,
          x0: half.x0, x1: half.x1, yBack: half.yBack, yFront: half.yFront,
          z0: L.z0, z1: L.z1, tris
        });
      });
    }
    return parts;
  }

  /** the spine's design-frame z extent for a given kind or layer count */
  function spineZRange(spine) {
    const kind = spineKindOf(spine);
    let z0 = Infinity, z1 = -Infinity;
    for (const [hn] of spineHalves()) {
      const ls = SPINE.layers[kind][hn];
      z0 = Math.min(z0, ls[0].z0);
      z1 = Math.max(z1, ls[ls.length - 1].z1);
    }
    return [z0, z1];
  }

  /** Build the one and only spine: half A + half B, for a kind or count */
  function buildSpine(spine, keySpans) {
    const out = {};
    for (const p of spineParts(spine)) out[p.name] = p.tris;
    return out;
  }

  /** X centres of the 32 feet — 16 on half A, 16 on half B. Always 32. */
  function footCentres() {
    const out = [];
    let x = FOOT.x0;
    out.push(x);
    for (let i = 0; i < FEET_PER_HALF - 1; i++) { x += FOOT.stepsA[i]; out.push(x); }
    x += FOOT.gapAB; out.push(x);
    for (let i = 0; i < FEET_PER_HALF - 1; i++) { x += FOOT.stepsB; out.push(x); }
    return out;
  }

  /* ------------------------------------------------------------------ *
   *  A FOOT IS TWO FLOATING FACES, AND NOTHING ELSE                     *
   *                                                                     *
   *  PAD FACE    the drafted "-| |-" exactly as "Feet - A" / "Feet - B"  *
   *              draw it, flat at z = FOOT.z.  No thickness, no walls,   *
   *              no caps — the face the sensor sees, and only that.      *
   *  PAIR FACE   the SAME 16 vertices, same order, same winding, lying   *
   *              in the plane of the key's own underside deck.  Its      *
   *              stems reach PAIR.stem past the drafted pad before it is *
   *              seated, so the pair spans the deck rather than perching *
   *              in the middle of it; seatTransform then fits it, and a  *
   *              stem that runs off the deck is SHORTENED there.         *
   *                                                                     *
   *  Nothing joins the two.  There is no bridge, no plinth, no ramp and  *
   *  no weld into the key: they are a pair of loops that describe the    *
   *  relationship, and the relationship is all this stage produces.      *
   * ------------------------------------------------------------------ */

  /** emit one flat n-gon as triangles in the plane z, keeping its winding */
  function pushFlatFace(t, ring, z) {
    const V = ring.map(p => [p[0], p[1], 0]);
    const idx = ring.map((_, k) => k);
    for (const tri of triangulateFace(V, idx)) {
      const a = ring[tri[0]], b = ring[tri[1]], c = ring[tri[2]];
      pushTri(t, [a[0], a[1], z], [b[0], b[1], z], [c[0], c[1], z]);
    }
  }

  /**
   * one part per sensor foot, named to match "Feet - A" / "Feet - B".
   *
   * `keys` is optional and is the list pairKeys() builds — when it is
   * given, each foot also carries the pairing face for the key that foot
   * belongs to.  Without it a foot is just its pad face, which is what the
   * feet-only previews want.
   */
  function footParts(keys) {
    const byFoot = new Map();
    for (const k of (keys || [])) byFoot.set(Math.round(k.foot * 1e4), k);
    return footCentres().map((cx, i) => {
      const tris = [];
      const pad = footOutline(cx);
      for (const ring of pad) pushFlatFace(tris, ring, FOOT.z);

      const k = byFoot.get(Math.round(cx * 1e4));
      const pair = k ? pairFaces(k.cx, k.w, k.type, k.lb, k.rb, cx, k.sib) : null;
      if (pair) for (const f of pair) pushFlatFace(tris, f.ring, f.z);

      return {
        name: 'Foot_' + (i < FEET_PER_HALF ? 'A' : 'B') + '_' +
              String(i % FEET_PER_HALF + 1).padStart(2, '0'),
        index: i, half: i < FEET_PER_HALF ? 'A' : 'B', cx,
        pad, pair, tris
      };
    });
  }

  function buildFeet(keys) {
    const t = [];
    for (const p of footParts(keys)) t.push(...p.tris);
    return t;
  }


  /* ==================================================================== *
   *  FOOT LOOP PAIRS  —  sensor foot "-| |-"  ->  the SAME "-| |-"        *
   *                      lying in the key's underside deck                *
   *                                                                      *
   *  KEYS[i] belongs to FEET[i], but the two are not over one another: a  *
   *  split pair shares one x and still has to reach two feet 11.3 mm      *
   *  apart.  The loop pair STATES that relationship; it does not close    *
   *  it.  Nothing is built between the two loops.                        *
   *                                                                      *
   *    PAD FACE    the drafted ring itself, flat at the sensor pad — the  *
   *                shape "Feet - A" / "Feet - B" actually draw, vertex    *
   *                for vertex, so the face that presses the sensor is     *
   *                the drafted one.                                      *
   *    PAIR FACE   the same 8 vertices in the same order and winding,     *
   *                lying in the key's own underside deck plane.          *
   *                                                                      *
   *  Both are FLOATING FACES: no thickness, no walls, no caps, no band    *
   *  between them and no weld into the key.  The 1 mm stem and the 2 mm   *
   *  dome window survive the move, because both loops are the drafted     *
   *  shape rather than a bounding box of it.                             *
   *                                                                      *
   *  WHAT THE PAIR FACE IS ALLOWED TO DO.  Its stems reach PAIR.stem      *
   *  past the drafted pad first; the seat then fits it to the key's own   *
   *  belly, shrinking only in x and snapping to the deck edge in y.  So   *
   *  a stem with nowhere to go is SHORTENED at that end alone, and the    *
   *  shape is never re-centred or scaled.  See stemExtend and seatAxis.   *
   * ==================================================================== */
  /* ==================================================================== *
   *  PRINT FIT                                                           *
   *                                                                      *
   *  The instrument comes off the bed as THREE objects — one per filament *
   *  colour — and each one has to be a single closed solid.  Two rules    *
   *  follow, and both are enforced here rather than left to the slicer:   *
   *                                                                      *
   *    CONNECT   a key must genuinely overlap the spine band of its OWN   *
   *              colour, not merely touch it.  The drafted key backs and  *
   *              the spine front face are both at y = 0, so a union of    *
   *              coplanar faces is exactly the case a boolean solver gets *
   *              wrong.  Each band therefore grows a BOSS of FIT.engage   *
   *              forward, over the x span of every key of its colour.     *
   *                                                                      *
   *    CLEAR     nothing of one colour may interfere with another.  The   *
   *              drafted spine bands overlap each other slightly (half A  *
   *              has black topping out at 6.10034 and white starting at   *
   *              6.07824 — 0.0221 mm of solid in common, 11.35 mm3 of it),*
   *              which is invisible on the sheet and fatal to a print.    *
   *              Bands are pushed apart to leave FIT.gap.                 *
   * ==================================================================== */
  /* which z band each colour's tongue occupies — see Z above */
  const TONGUE_Z = { gray: Z.grayTongue, black: Z.blackTongue,
                     white: Z.whiteTongue, all: null, lower: null, upper: null };

  const FIT = {
    engage: 0.4,     // how far a band reaches into its own keys, to fuse
    gap:    0.15     // clearance between anything of different colours
  };

  /* ------------------------------------------------------------------ *
   *  THE FOOT IS NOT A RECTANGLE                                        *
   *                                                                     *
   *  "Feet - A" / "Feet - B" draw all 32 feet as ONE shape, and it is    *
   *  the "-| |-": two mirrored T's, each a full-width CROSSBAR with a    *
   *  1.0 mm central STEM reaching out to the pad edge, with a 1.99978 mm *
   *  window between the two bars.  16 vertices, 2 n-gon faces, flat at   *
   *  z = FOOT.z.  Stored verbatim as (x from the pad's left edge, y from *
   *  the pad's BACK edge) in design y, so y grows toward the player.     *
   * ------------------------------------------------------------------ */
  const FOOT_SHAPE = {
    v: [[10.400028, 6.501869], [10.400028, 5.499901], [10.400028, 3.500008],
        [10.400024, 2.500008], [0.000000, 2.500008], [0.000004, 3.500008],
        [0.000004, 5.499901], [0.000004, 6.501869], [5.700024, 0.000000],
        [4.700024, 0.000000], [5.700027, 9.000046], [4.700027, 9.000046],
        [4.700027, 6.501869], [5.700027, 6.501869], [5.700024, 2.499992],
        [4.700024, 2.499992]],
    f: [[7, 6, 1, 0, 13, 10, 11, 12],      // bar + stem, toward the player
        [5, 4, 15, 9, 8, 14, 3, 2]]        // bar + stem, toward the spine
  };

  /** the drafted foot outline, in design coordinates, for the foot at cx */
  function footOutline(cx) {
    const x0 = cx - FOOT.w / 2, y0 = FOOT.yCentre - FOOT.d / 2;
    const V = FOOT_SHAPE.v.map(p => [x0 + p[0], y0 + p[1]]);
    return FOOT_SHAPE.f.map(ring => ring.map(i => V[i]));
  }

  /**
   * The "-| |-" is drawn as two separate bar+stem rings (see FOOT_SHAPE.f)
   * with an empty window between them for the dome.  A connector that fills
   * that window solid for any part of its height — even one meant to step
   * in to the true shape only at the very tip — walls off the dome's own
   * clearance where the dome has to sit.  So the pair
   * face is built as two independent loops, one per ring, each confined
   * to its own ring's y band; the window between them is never filled.
   */
  function footIslands(cx) {
    return footOutline(cx).map(ring => {
      let y0 = Infinity, y1 = -Infinity;
      for (const p of ring) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      return { ring, y0, y1 };
    });
  }

  const PAIR = {
    travel: 2.0,     // AKM320 rubber-dome travel
    margin: 0.5,     // air on top of the travel
    stem:   1.0,     // width of the "-| |-" stem, drafted
    split:  0.99387  // the gap between the two halves of a split pair
  };

  /* ------------------------------------------------------------------ *
   *  THE RAISED FOOT PAIR IS DRAFTED, NOT DERIVED                       *
   *                                                                     *
   *  Read verbatim out of the "Raised Feet (Pair)" collection: the face *
   *  popped off each key's own underside deck.  Every one of the 32 is  *
   *  the same "-| |-" — a CROSSBAR spanning the full width of that      *
   *  key's deck, a 1 mm central STEM reaching out of each bar, and the  *
   *  2 mm dome window between them — and every one of them uses one of  *
   *  exactly TWO y profiles.  So the profile is stored, like            *
   *  FOOT_SHAPE, rather than fitted.                                    *
   *                                                                     *
   *  Each profile is six design-y values, back to front:                *
   *    y0  back stem tip                                                *
   *    y1  back bar, back edge      y2  back bar, front edge            *
   *    y3  front bar, back edge     y4  front bar, front edge           *
   *    y5  front stem tip                                               *
   *                                                                     *
   *    full   the standard 14.0 mm shape: 5 mm stem, 1 mm bar, 2 mm     *
   *           window, 1 mm bar, 5 mm stem.  Used by every white key,    *
   *           by both full-width accidentals and by the Second half of  *
   *           a split pair — anything whose deck reaches y 35.3776.     *
   *    split  the Second half of a split pair: the same 14.0 mm reach,  *
   *           but drawn with slightly heavier bars and a 1.902 mm       *
   *           window rather than 1/2/1.                                 *
   *    short  the 10.25 mm shape the First half of a split pair gets:   *
   *           its key ends at y 27.8189, so the front stem is 1.25 mm.  *
   * ------------------------------------------------------------------ */
  const PAIR_SHAPE = {
    full:  [21.3777, 26.3777, 27.3777, 29.3776, 30.3776, 35.3776],
    split: [21.3777, 26.3777, 27.4659, 29.3682, 30.4147, 35.3776],
    short: [17.5688, 22.5669, 23.5688, 25.5687, 26.5687, 27.8189]
  };

  /**
   * `snap` picks which of the two rules this axis obeys.
   *
   *   false (x)  SHRINK ONLY.  The ring keeps its drafted width and makes
   *              the LEAST move that lands it on the deck; it is pulled in
   *              only when the deck cannot hold it.  In x the outermost
   *              coordinates are the crossbar ends, and the bar is drafted
   *              at the pad's true width, so widening it would mean the
   *              pair face no longer describes the pad.
   *   true  (y)  SNAP TO THE DECK.  The outermost coordinate at each end
   *              goes to the deck's own edge, out as well as in.  In y the
   *              outermost coordinates are the stem tips, and a stem is
   *              exactly the part that is meant to reach — so the pair
   *              face spans the key's belly instead of perching in the
   *              middle of it, and a stem that has nowhere to go is
   *              shortened rather than the whole shape being re-centred.
   *
   * Either way every INTERIOR coordinate merely rides along on the same
   * translation: the 1 mm stem keeps its 1 mm in x, and the bar thickness
   * and the 2 mm dome window keep theirs in y.
   */
  function seatAxis(ring, k, lo, hi, snap) {
    let r0 = Infinity, r1 = -Infinity;
    for (const p of ring) { if (p[k] < r0) r0 = p[k]; if (p[k] > r1) r1 = p[k]; }
    let a0 = lo, a1 = hi;
    if (!snap) {                                    // x insets, y does not
      a0 = lo + PAIR.bite; a1 = hi - PAIR.bite;
    }
    if (a1 - a0 < PAIR.minSeat) {                   // deck too narrow to inset
      const c = (lo + hi) / 2, h = Math.max(PAIR.minSeat, hi - lo) / 2;
      a0 = c - h; a1 = c + h;
    }
    if (snap) {
      /* A STEM REACHES PAIR.stem, AND NEVER FURTHER.  The window the tips
       * snap to is capped at the extended ring's own span, so a deep belly
       * cannot drag the stems out across the whole key — it just leaves
       * them at full length.  Where the belly is shallower than that, the
       * cap does nothing and one tip is shortened to the deck edge, which
       * is the whole point of snapping in y. */
      if (a1 - a0 > r1 - r0) {
        const w = r1 - r0;
        a0 = Math.min(Math.max(r0, a0), a1 - w); a1 = a0 + w;
      }
      const d = (a0 + a1) / 2 - (r0 + r1) / 2;
      return v => Math.abs(v - r0) < SEAT_EPS ? a0
                : Math.abs(v - r1) < SEAT_EPS ? a1
                : v + d;
    }
    const span = Math.min(r1 - r0, a1 - a0);        // shrink only, never grow
    /* the LEAST move that lands it, not a re-centring: a belly can run the
     * whole depth of the key, and centring in it would drag the seat off
     * the sensor entirely.  Where the ring already fits, it does not move
     * at all. */
    const t0 = Math.min(Math.max(r0, a0), a1 - span), t1 = t0 + span;
    const d = (t0 + t1) / 2 - (r0 + r1) / 2;
    return v => Math.abs(v - r0) < SEAT_EPS ? t0
              : Math.abs(v - r1) < SEAT_EPS ? t1
              : v + d;
  }

  /**
   * THE STEMS REACH FIRST, THE SEAT FITS SECOND.
   *
   * The drafted "-| |-" is 9 mm deep, which is the sensor pad's depth, not
   * the key's.  Before it is seated, both stem tips are pushed PAIR.stem
   * further out in y, so the pair face has something to lose when the deck
   * is short.  seatTransform then does the fitting, and because it is a
   * least-move shrink it takes that length back off ONE end — the end that
   * actually runs off the deck — instead of re-centring the whole shape.
   * That is why a key like the split black keeps a full-length stem on one
   * side and a clipped one on the other.
   *
   * x is never extended: in x the outermost coordinates are the crossbar
   * ends, and the bar is drafted at the pad's true width.
   */
  function stemExtend(rings) {
    let y0 = Infinity, y1 = -Infinity;
    for (const r of rings) for (const p of r) {
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    return ring => ring.map(p => [p[0],
      Math.abs(p[1] - y0) < SEAT_EPS ? y0 - PAIR.stem :
      Math.abs(p[1] - y1) < SEAT_EPS ? y1 + PAIR.stem : p[1]]);
  }

  /**
   * The seat transform for one whole "-| |-".  It is built from BOTH bars
   * at once and then applied to each of them, so the 2 mm dome window and
   * the offset between the bars survive the move: seat each bar on its own
   * and they would both centre on the same land and close the window.
   */
  function seatTransform(rings, land) {
    const all = [].concat.apply([], rings);
    const fx = seatAxis(all, 0, land.x0, land.x1, false);
    const fy = seatAxis(all, 1, land.y0, land.y1, true);
    return ring => ring.map(p => [fx(p[0]), fy(p[1])]);
  }

  /** the drafted ring, moved onto `land` — see seatAxis */
  function seatRing(ring, land) { return seatTransform([ring], land)(ring); }

  /** the x span a key presents at the spine face — where its band must boss */
  function keyBackSpan(cx, w, type, lb, rb) {
    let x0 = Infinity, x1 = -Infinity;
    for (const P of keyPolygons(cx, w, type, lb, rb)) {
      const Q = clipToBand(P, 0, 0.5);
      if (!Q) continue;
      for (const p of Q) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; }
    }
    return isFinite(x0) ? { x0, x1 } : null;
  }

  /**
   * What the key offers directly over its sensor pad: the x span it covers
   * there, the highest down-facing plane (the deck the plinth can sit under)
   * and the top of the key (the ceiling on how high the ramp may reach).
   */
  /** Sutherland-Hodgman clip of a 3-D polygon against a y slab */
  function clipToBand(P, y0, y1) {
    const cut = (poly, keep, at) => {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const ka = keep(a), kb = keep(b);
        if (ka) out.push(a);
        if (ka !== kb) {
          const t = (at - a[1]) / (b[1] - a[1]);
          out.push([a[0] + (b[0] - a[0]) * t, at, a[2] + (b[2] - a[2]) * t]);
        }
      }
      return out;
    };
    let q = cut(P, p => p[1] >= y0 - 1e-9, y0);
    if (q.length < 3) return null;
    q = cut(q, p => p[1] <= y1 + 1e-9, y1);
    return q.length >= 3 ? q : null;
  }

  /**
   * What the key offers directly over a y band (the whole pad, or just one
   * "-| |-" island's band): the x and y it covers there, the highest
   * down-facing plane (the deck the connector can sit under) and the top of
   * the key (the ceiling on how high the ramp goes).
   */
  function keyPadSection(cx, w, type, lb, rb, padY0, padY1) {
    let x0 = Infinity, x1 = -Infinity, ky0 = Infinity, ky1 = -Infinity;
    let zTop = -Infinity, zDeck = -Infinity, deck = null;
    for (const P of keyPolygons(cx, w, type, lb, rb)) {
      const Q = clipToBand(P, padY0, padY1);
      if (!Q) continue;
      let lz = Infinity, hz = -Infinity, qx0 = Infinity, qx1 = -Infinity;
      for (const p of Q) {
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < ky0) ky0 = p[1]; if (p[1] > ky1) ky1 = p[1];
        if (p[2] > zTop) zTop = p[2];
        if (p[2] < lz) lz = p[2]; if (p[2] > hz) hz = p[2];
        if (p[0] < qx0) qx0 = p[0]; if (p[0] > qx1) qx1 = p[0];
      }
      if (hz - lz > 1e-4) continue;
      let nz = 0;
      for (let i = 0; i < Q.length; i++) {
        const a = Q[i], b = Q[(i + 1) % Q.length];
        nz += (a[0] - b[0]) * (a[1] + b[1]);
      }
      if (nz >= 0) continue;                        // down-facing only
      if (lz > zDeck) zDeck = lz;                   // the deepest pocket
    }
    if (!isFinite(zTop)) return null;
    /* THE LAND.  What a pair face actually lies in: the key's own
     * belly — the LOWEST down-facing region, merged out of the drafted
     * fragments (keyDecks), and of that region the biggest loop reaching
     * across this band.  A connector climbing from the sensor meets that
     * one first, and it is the only surface wide enough to seat the
     * drafted "-| |-" on. */
    for (const g of keyDecks(cx, w, type, lb, rb)) {
      let best = null;
      for (const R of g.loops) {
        const a = polyArea2(R);
        if (a >= 0) continue;                       // a hole in the belly
        let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
        for (const p of R) {
          if (p[0] < bx0) bx0 = p[0]; if (p[0] > bx1) bx1 = p[0];
          if (p[1] < by0) by0 = p[1]; if (p[1] > by1) by1 = p[1];
        }
        if (by1 < padY0 - 1e-6 || by0 > padY1 + 1e-6) continue;
        if (!best || -a > best.area)
          best = { x0: bx0, x1: bx1, y0: by0, y1: by1, z: g.z,
                   area: -a, loop: R };
      }
      if (best) { deck = best; break; }
    }
    return { x0, x1, y0: ky0, y1: ky1, padY0, padY1, deck,
             zTop, zDeck: isFinite(zDeck) ? zDeck : zTop };
  }

  /**
   * The lowest down-facing surface a key presents, per x, inside a y band.
   * This is what a neighbour's connector could actually hit — a bounding
   * box is useless here, because the two halves of a split pair share an x
   * span and an overlapping y span and only differ in z.
   */
  function keyUnderProfile(cx, w, type, lb, rb, yb0, yb1, x0, step, n) {
    const out = new Array(n).fill(Infinity);
    for (const P of keyPolygons(cx, w, type, lb, rb)) {
      const Q = clipToBand(P, yb0, yb1);
      if (!Q) continue;
      let lz = Infinity, hz = -Infinity, qx0 = Infinity, qx1 = -Infinity;
      for (const p of Q) {
        if (p[2] < lz) lz = p[2]; if (p[2] > hz) hz = p[2];
        if (p[0] < qx0) qx0 = p[0]; if (p[0] > qx1) qx1 = p[0];
      }
      if (hz - lz > 1e-4) continue;
      let nz = 0;
      for (let i = 0; i < Q.length; i++) {
        const a = Q[i], b = Q[(i + 1) % Q.length];
        nz += (a[0] - b[0]) * (a[1] + b[1]);
      }
      if (nz >= 0) continue;                        // want down-facing only
      const i0 = Math.max(0, Math.ceil((qx0 - x0) / step));
      const i1 = Math.min(n - 1, Math.floor((qx1 - x0) / step));
      for (let i = i0; i <= i1; i++) if (lz < out[i]) out[i] = lz;
    }
    return out;
  }

  /**
   * THE LAND: the x span of the key's own underside deck.
   *
   * That is all the pair face takes from the key — the popped faces in
   * "Raised Feet (Pair)" are each exactly as wide as the deck they came
   * off, and their y comes from PAIR_SHAPE rather than from the key.
   *
   * The one thing the drafted belly cannot tell us is where a SPLIT PAIR
   * divides.  Both halves share one slot, and the deeper half's belly loop
   * is drawn across the whole of it, so the two would come out on top of
   * one another.  `sib` is the other half's land when there is one: this
   * half then takes the rest of the slot, less PAIR.split of air.
   */
  function pairLand(cx, w, type, lb, rb, sib) {
    const K = keyPadSection(cx, w, type, lb, rb,
                            FOOT.yCentre - FOOT.d / 2, FOOT.yCentre + FOOT.d / 2);
    if (K == null) return null;
    const deck = K.deck
      ? { x0: K.deck.x0, x1: K.deck.x1, y1: K.deck.y1, z: K.deck.z, seated: true }
      : { x0: K.x0, x1: K.x1, y1: K.y1, z: K.zDeck, seated: false };
    if (sib && sib.x1 - sib.x0 < (deck.x1 - deck.x0) * 0.75) {
      /* the sibling holds one end of the slot; take the other */
      if (sib.x0 - deck.x0 > deck.x1 - sib.x1) deck.x1 = sib.x0 - PAIR.split;
      else                                     deck.x0 = sib.x1 + PAIR.split;
      deck.trimmed = true;      // this is the Second half — see PAIR_SHAPE
    }
    return deck;
  }

  /**
   * THE PAIR RING IS THE PAD RING, VERTEX FOR VERTEX.
   *
   * Rather than draw the popped shape independently, map the drafted pad
   * ring onto the pair's coordinates by ROLE: each x is one of the four
   * the "-| |-" uses (bar end, stem edge, stem edge, bar end) and each y
   * is one of three (the bar's inner edge, its outer edge, the stem tip).
   * The result is the same 8 points in the same order and the same winding
   * as the pad ring it belongs to, which is what lets the two loft into a
   * closed solid with nothing to match up: vertex i bridges to vertex i.
   */
  function mapRingToPair(ring, lx0, lx1, sc, s1, inner, outer, tip) {
    /* CLUSTER, do not round.  The drafted pad carries a few ten-thousandths
     * of noise — 5.700024 against 5.700027 on one stem edge — and a fixed
     * rounding can split one role in two.  Group within a tenth of a
     * millimetre instead: far below the smallest real feature here (the
     * 1 mm stem) and far above the noise. */
    const TOL = 0.1;
    const cluster = vals => {
      const out = [];
      for (const v of vals.slice().sort((p, q) => p - q))
        if (!out.length || v - out[out.length - 1] > TOL) out.push(v);
      return out;
    };
    const nearest = (v, cs) => {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < cs.length; i++) {
        const d = Math.abs(v - cs[i]);
        if (d < bd) { bd = d; bi = i; }
      }
      return bi;
    };
    const xs = cluster(ring.map(p => p[0]));
    const ys = cluster(ring.map(p => p[1]));
    const X = [lx0, sc, s1, lx1];
    /* which drafted y is which: the bar edge nearer the pad's centre is
     * the inner one, the far extreme is the stem tip, and what is left is
     * the outer edge the stem leaves from. */
    const byNear = ys.slice().sort((p, q) =>
      Math.abs(p - FOOT.yCentre) - Math.abs(q - FOOT.yCentre));
    const Y = new Map();
    Y.set(byNear[0], inner); Y.set(byNear[1], outer); Y.set(byNear[2], tip);
    return ring.map(p => [X[nearest(p[0], xs)], Y.get(ys[nearest(p[1], ys)])]);
  }

  /**
   * The pairing faces for one key: the popped "-| |-", rebuilt.
   *
   * Two flat loops, one per bar, in the plane of the key's own underside
   * deck.  The crossbar spans the land; the stem is PAIR.stem wide and
   * centred on it; the y values are the drafted profile, so the bar
   * thickness, the 2 mm dome window and the stem reach are the ones the
   * sheet draws rather than anything fitted here.
   *
   * A key whose deck stops short of the full profile's front stem gets the
   * short profile; the Second half of a split pair gets its own.  Each
   * ring comes back in its pad ring's order — see mapRingToPair.
   */
  /* ------------------------------------------------------------------ *
   *  X COMPENSATION CLEARANCE                                           *
   *                                                                     *
   *  The raised key foot is drafted at the width of the KEY's belly, and *
   *  the sensor foot is drafted at the width of the AKM320 PAD.  Those   *
   *  are two different widths, so on most keys the raised loop overhangs *
   *  the pad loop at one end or both — and a press lofted between them   *
   *  then leans out over its neighbour's slot instead of standing over   *
   *  its own sensor.                                                     *
   *                                                                      *
   *  THE RULE.  Neither end of the raised key foot may sit outside the   *
   *  sensor foot in x.  Where the raised loop's X-MOST vertices are      *
   *  greater in x than the sensor foot's, they are forced to equal the   *
   *  sensor foot's; where its X-LEAST vertices are lesser, likewise.     *
   *  Verbatim, as drafted by hand in "X compensation clearance.blend".   *
   *                                                                      *
   *  ONLY THE EXTREMES MOVE.  The two crossbar ends are the only         *
   *  vertices touched: the 1 mm stem keeps its width AND its x, so the   *
   *  press is never re-centred and the dome window never shifts.  The    *
   *  bar is pulled in around a stem that stays where the key put it.     *
   *                                                                      *
   *  THE STEM IS RESCUED, NOT SEVERED.  On the 15 and 17 sheets a key    *
   *  can sit far enough off its foot that the clamped bar no longer      *
   *  reaches the stem at all.  The stem is then slid — rigidly, both     *
   *  edges together, by the LEAST distance — back inside the clamped     *
   *  bar, so it keeps its 1 mm width and the dome window keeps its own.  *
   *  Nothing on the 19 sheet needs this, which is why the hand-drafted   *
   *  file shows no example of it.                                        *
   *                                                                      *
   *  WHEN IT IS NOT APPLIED.  A raised loop can miss its pad entirely —  *
   *  the last Split Black Second of the 19 sheet reaches a foot 11.3 mm  *
   *  away and clears the pad completely.  With less than a stem's width  *
   *  of overlap there is nothing to stand a bar on, so the clamp is      *
   *  skipped and the drafted loop stands: a zero-width or inverted bar   *
   *  is worse than an overhang.  That key is a LAYOUT problem, not a     *
   *  clearance one, and pairAudit still reports the overhang.           *
   * ------------------------------------------------------------------ */
  const PAIR_X_EPS = 1e-6;
  /* the least shoulder a clamped crossbar keeps either side of its stem —
   * without it a rescued stem can land exactly on the bar end and collapse
   * the loop into a degenerate, unprintable face */
  const PAIR_X_SHOULDER = 0.2;

  /**
   * Clamp the x extremes of a raised "-| |-" (both bars together, so the
   * pair keeps one common bar span) into the sensor pad's own x span.
   * Mutates the rings in place and returns the span it settled on, or null
   * when the clamp was skipped — see the guard above.
   */
  function clampPairToPadX(rings, pad) {
    let p0 = Infinity, p1 = -Infinity;
    for (const r of pad) for (const q of r) {
      if (q[0] < p0) p0 = q[0]; if (q[0] > p1) p1 = q[0];
    }
    let r0 = Infinity, r1 = -Infinity;
    for (const r of rings) for (const q of r) {
      if (q[0] < r0) r0 = q[0]; if (q[0] > r1) r1 = q[0];
    }
    const a0 = Math.max(r0, p0), a1 = Math.min(r1, p1);
    /* a bar has to be wide enough to carry its stem with a shoulder either
     * side; anything less is a degenerate loop, not a press */
    if (a1 - a0 < PAIR.stem + 2 * PAIR_X_SHOULDER) return null;
    /* the stem is every interior x of the ring — it does not move unless
     * the clamped bar would leave it behind, and then only as far as it
     * must, rigidly, so the 1 mm stays 1 mm */
    let s0 = Infinity, s1 = -Infinity;
    for (const r of rings) for (const q of r) {
      if (q[0] - r0 > PAIR_X_EPS && r1 - q[0] > PAIR_X_EPS) {
        if (q[0] < s0) s0 = q[0]; if (q[0] > s1) s1 = q[0];
      }
    }
    let shift = 0;
    if (isFinite(s0)) {
      const b0 = a0 + PAIR_X_SHOULDER, b1 = a1 - PAIR_X_SHOULDER;
      if (s0 < b0) shift = b0 - s0;
      else if (s1 > b1) shift = b1 - s1;
    }
    for (const r of rings) for (const q of r) {
      if (Math.abs(q[0] - r0) < PAIR_X_EPS) q[0] = a0;
      else if (Math.abs(q[0] - r1) < PAIR_X_EPS) q[0] = a1;
      else q[0] += shift;
    }
    return { x0: a0, x1: a1, stemShift: shift };
  }

  function pairFaces(cx, w, type, lb, rb, footX, sib) {
    const land = pairLand(cx, w, type, lb, rb, sib);
    if (land == null) return null;
    const P = land.y1 < PAIR_SHAPE.full[5] - 1e-3 ? PAIR_SHAPE.short
            : land.trimmed                        ? PAIR_SHAPE.split
                                                  : PAIR_SHAPE.full;
    const x0 = land.x0, x1 = land.x1;
    const sc = (x0 + x1) / 2 - PAIR.stem / 2, s1 = sc + PAIR.stem;
    const pad = footOutline(footX);
    /* pad ring 0 reaches toward the player, ring 1 toward the spine — the
     * front half of the drafted profile and the back half respectively */
    const rings = [
      mapRingToPair(pad[0], x0, x1, sc, s1, P[3], P[4], P[5]),
      mapRingToPair(pad[1], x0, x1, sc, s1, P[2], P[1], P[0])
    ];
    /* X compensation clearance — the raised loop never overhangs the pad */
    const clamp = clampPairToPadX(rings, pad);
    return [
      { z: land.z, seated: land.seated, clamp, ring: rings[0] },
      { z: land.z, seated: land.seated, clamp, ring: rings[1] }
    ];
  }

  /* ==================================================================== *
   *  THE SENSOR PRESS  —  the loop pair, closed into a solid              *
   *                                                                      *
   *  One prism per bar of the "-| |-": the drafted pad ring at the        *
   *  bottom, its pair ring in the key's deck plane at the top, ONE quad   *
   *  band between them vertex i to vertex i, and BOTH ends capped.  Each  *
   *  bar is therefore a closed watertight solid — every directed edge     *
   *  used exactly once — and the face that presses the sensor is the      *
   *  drafted pad ring itself rather than an approximation of it.          *
   *                                                                      *
   *  TWO PRISMS, NOT ONE.  The window between the bars is where the       *
   *  rubber dome sits.  Lofting the pair as one ring would close it;      *
   *  lofting each bar on its own leaves it open at every height, which is *
   *  why the pad is drafted as two n-gons rather than one to begin with.  *
   *                                                                      *
   *  Nothing is stepped and nothing is squared off.  The 1 mm stem and    *
   *  the 2 mm window survive the whole climb, because both loops are the  *
   *  drafted shape rather than a bounding box of it.                      *
   * ==================================================================== */

  /**
   * A closed prism between two equal-length rings, `bot` at z0 and `top`
   * at z1.  Both are normalised to CCW together, so vertex i still bridges
   * to vertex i; the caps are then wound to CLOSE the walls rather than by
   * convention, which is what makes the result watertight instead of a
   * shell with two lids facing the wrong way.
   */
  function pushPrism(t, bot, top, z0, z1) {
    let B = bot, T = top;
    if (polyArea2(B) < 0) { B = B.slice().reverse(); T = T.slice().reverse(); }
    const m = B.length;
    for (let k = 0; k < m; k++) {
      const j = (k + 1) % m;
      pushQuad(t, [B[k][0], B[k][1], z0], [B[j][0], B[j][1], z0],
                  [T[j][0], T[j][1], z1], [T[k][0], T[k][1], z1]);
    }
    const V = B.map(p => [p[0], p[1], 0]);
    const idx = B.map((_, k) => k);
    for (const tri of triangulateFace(V, idx)) {
      const i = tri[0], j = tri[1], k = tri[2];
      pushTri(t, [B[i][0], B[i][1], z0], [B[k][0], B[k][1], z0],
                 [B[j][0], B[j][1], z0]);                       // down-facing
      pushTri(t, [T[i][0], T[i][1], z1], [T[j][0], T[j][1], z1],
                 [T[k][0], T[k][1], z1]);                       // up-facing
    }
  }

  /**
   * One key's sensor press: two closed prisms, one per bar of the
   * "-| |-", from the drafted pad up to the key's own deck plane.
   */
  function buildPress(cx, w, type, lb, rb, footX, sib) {
    const faces = pairFaces(cx, w, type, lb, rb, footX, sib);
    if (faces == null) return [];
    const pad = footOutline(footX);
    const t = [];
    for (let i = 0; i < faces.length; i++)
      pushPrism(t, pad[i], faces[i].ring, FOOT.z, faces[i].z);
    return t;
  }

  /** one press part per key, named and coloured to match its key */
  function pressParts(keys) {
    const out = [];
    for (const k of (keys || [])) {
      const tris = buildPress(k.cx, k.w, k.type, k.lb, k.rb, k.foot, k.sib);
      if (!tris.length) continue;
      out.push({ name: 'Press_' + String(k.index).padStart(2, '0'),
                 index: k.index, layer: k.layer, foot: k.foot, tris });
    }
    return out;
  }

  /**
   * Is a triangle soup closed?  Every DIRECTED edge has to appear exactly
   * once and its opposite exactly once.  A bare undirected count would
   * pass a cap wound the wrong way; this does not.
   */
  function isWatertight(tris) {
    const k4 = v => Math.round(v * 1e4);
    const key = (t, i, j) => k4(t[i]) + ',' + k4(t[i+1]) + ',' + k4(t[i+2]) +
                       '|' + k4(t[j]) + ',' + k4(t[j+1]) + ',' + k4(t[j+2]);
    const dir = new Map();
    for (let i = 0; i < tris.length; i += 9)
      for (let k = 0; k < 3; k++) {
        const e = key(tris, i + k * 3, i + ((k + 1) % 3) * 3);
        dir.set(e, (dir.get(e) || 0) + 1);
      }
    let bad = 0;
    for (const e of dir.keys()) {
      const p = e.split('|');
      if (dir.get(e) !== 1 || (dir.get(p[1] + '|' + p[0]) || 0) !== 1) bad++;
    }
    return { closed: bad === 0, badEdges: bad, edges: dir.size };
  }

  /** signed volume of a closed soup — positive when the normals face out */
  function meshVolume(tris) {
    let v = 0;
    for (let i = 0; i < tris.length; i += 9)
      v += (tris[i]   * (tris[i+4] * tris[i+8] - tris[i+7] * tris[i+5])
          - tris[i+1] * (tris[i+3] * tris[i+8] - tris[i+6] * tris[i+5])
          + tris[i+2] * (tris[i+3] * tris[i+7] - tris[i+6] * tris[i+4])) / 6;
    return v;
  }

  /** the pair face's plan, for the audit */
  function pairPlan(cx, w, type, lb, rb, footX, sib) {
    const faces = pairFaces(cx, w, type, lb, rb, footX, sib);
    if (faces == null) return null;
    const ext = (R, k) => {
      let a = Infinity, b = -Infinity;
      for (const q of R) { if (q[k] < a) a = q[k]; if (q[k] > b) b = q[k]; }
      return [a, b];
    };
    const islands = faces.map(f => ({
      top: f.ring, zPad: FOOT.z, zDeck: f.z, rise: f.z - FOOT.z,
      topX: ext(f.ring, 0), topY: ext(f.ring, 1), seated: f.seated,
      ok: f.z - FOOT.z >= PAIR.travel + PAIR.margin - 1e-9
    }));
    return {
      islands, zDeck: faces[0].z,
      seated: islands.every(p => p.seated),
      ok: islands.every(p => p.ok)
    };
  }

  /**
   * What the pairing actually achieves, measured rather than assumed.
   * With nothing built between the loops there is no ramp and no slope to
   * audit; what is left is the relationship itself:
   *
   *   seated        every pair face found a real down-facing deck on its
   *                 key to lie in, rather than falling back to a bounding
   *                 box of the key's section
   *   minRise       the least air between a pad face and its own pair
   *                 face — the dome has to travel through it, so it must
   *                 beat PAIR.travel + PAIR.margin
   *   minGap        narrowest air in x between two different keys' pair
   *                 faces, compared bar-to-bar (same island index), since
   *                 islands of a different index sit at disjoint y bands
   *   overForeign   least air above a sensor pad that is not its own
   *   watertight    every press came out a closed solid, right way out
   *   pressVolume   how much filament the 32 presses add, in mm3
   */
  function pairAudit(keys) {
    /* the press is the deliverable now, so audit the solid, not just the
     * loops: every one has to come out closed and right way out, or it is
     * not a part a slicer can do anything with. */
    let leaky = null, inverted = null, volume = 0;
    for (const k of keys) {
      const tris = buildPress(k.cx, k.w, k.type, k.lb, k.rb, k.foot, k.sib);
      if (!tris.length) continue;
      if (leaky == null && !isWatertight(tris).closed) leaky = k.index;
      const v = meshVolume(tris);
      if (inverted == null && v <= 0) inverted = k.index;
      volume += v;
    }
    const plans = keys.map(k => ({
      k, p: pairPlan(k.cx, k.w, k.type, k.lb, k.rb, k.foot, k.sib)
    })).filter(o => o.p);

    let minRise = Infinity, riseAt = null;
    let minGap = Infinity, gapAt = null;
    let overForeign = Infinity;

    for (const { k, p } of plans)
      for (const isl of p.islands)
        if (isl.rise < minRise) { minRise = isl.rise; riseAt = k.index; }

    /* pair faces of two different keys, bar for bar, in the same plane */
    for (let i = 0; i < plans.length; i++)
      for (let j = i + 1; j < plans.length; j++) {
        const A = plans[i], B = plans[j];
        for (let n = 0; n < Math.min(A.p.islands.length, B.p.islands.length); n++) {
          const a = A.p.islands[n], b = B.p.islands[n];
          if (Math.abs(a.zDeck - b.zDeck) > 1e-4) continue;
          if (a.topY[1] < b.topY[0] - 1e-9 || b.topY[1] < a.topY[0] - 1e-9) continue;
          const gap = a.topX[0] > b.topX[1] ? a.topX[0] - b.topX[1]
                    : b.topX[0] > a.topX[1] ? b.topX[0] - a.topX[1]
                    : -Math.min(a.topX[1] - b.topX[0], b.topX[1] - a.topX[0]);
          if (gap < minGap) { minGap = gap; gapAt = [A.k.index, B.k.index]; }
        }
      }

    /* a pair face must not hang over a sensor pad that is not its own */
    const feet = footCentres();
    for (const { k, p } of plans)
      for (const isl of p.islands)
        for (const fx of feet) {
          if (Math.abs(fx - k.foot) < 1e-6) continue;
          if (isl.topX[1] < fx - FOOT.w / 2 || isl.topX[0] > fx + FOOT.w / 2) continue;
          const air = isl.zDeck - FOOT.z;
          if (air < overForeign) overForeign = air;
        }

    /* X COMPENSATION CLEARANCE, measured.  After clampPairToPadX every
     * raised loop should sit inside its own pad in x.  What is left over
     * is a key that misses its foot so badly the clamp had to stand down —
     * a layout fault, and it is named here rather than left silent. */
    let xOver = 0; const xOverAt = [];
    for (const k of keys) {
      const faces = pairFaces(k.cx, k.w, k.type, k.lb, k.rb, k.foot, k.sib);
      if (!faces) continue;
      let p0 = Infinity, p1 = -Infinity, r0 = Infinity, r1 = -Infinity;
      for (const r of footOutline(k.foot)) for (const q of r) {
        if (q[0] < p0) p0 = q[0]; if (q[0] > p1) p1 = q[0];
      }
      for (const f of faces) for (const q of f.ring) {
        if (q[0] < r0) r0 = q[0]; if (q[0] > r1) r1 = q[0];
      }
      const d = Math.max(p0 - r0, r1 - p1, 0);
      if (d > 1e-4) { xOverAt.push(k.index); if (d > xOver) xOver = d; }
    }

    const unseated = plans.find(o => !o.p.seated);
    return {
      keys: plans.length,
      xClear: xOverAt.length === 0,
      xOverhang: xOver, xOverhangAt: xOverAt,
      watertight: leaky == null && inverted == null,
      leakyAt: leaky, invertedAt: inverted,
      pressVolume: volume,
      seated: plans.every(o => o.p.seated),
      unseatedAt: unseated ? unseated.k.index : null,
      minRise: isFinite(minRise) ? minRise : null, riseAt,
      minGap: isFinite(minGap) ? minGap : null, gapAt,
      overForeign: isFinite(overForeign) ? overForeign : null,
      clearsTravel: (!isFinite(minRise) || minRise >= PAIR.travel + PAIR.margin)
                 && (!isFinite(overForeign) || overForeign >= PAIR.travel)
    };
  }

  /* ==================================================================== *
   *  EXPORT                                                              *
   * ==================================================================== */
  const api = {
    WORLD, SPINE, FOOT, SIZE, Z, COLORS, DRAFT, WALL, TONGUE_Y,
    NOTES, UNITS, FEET_PER_HALF,
    KEY_TYPES, TYPE_ORDER, LAYOUTS,
    whiteProfile, twoSidedWhiteBase, deriveWhiteProfile,
    KEY_PAIRS, PAIR_ORDER, PALETTE_ORDER, TYPE_ALIASES,
    canonType, pairOfType, pairOfSlot,
    whiteWidth, whitePitch, accWidth, slotDelta,
    WIDTH_CLASSES, CLASS_LABEL, WIDTH_RATIO_DEFAULT, ACC_RATIO,
    WIDTH_RATIO_MIN, WIDTH_RATIO_MAX, ACC_RATIO_MAX, accCeiling, whiteFloor,
    widthRatios, classWidth, classOfType,
    pushTri, pushQuad, pushBox, rectWithHoles,
    ctxKey, profileFor, profilePoints, buildKey, keyPolygons,
    triangulateFace, triangulateFaceWithHoles, pointInPoly2, faceHoldsSeat,
    keyDecks, mergeCoplanar, polyArea2, keyExtent,
    buildSpine, buildFeet,
    PAIR, FOOT_SHAPE,
    /* --- shims, so a page written against the old attaching-element API
     * keeps loading.  There are no attaching elements any more: the
     * builders return nothing and BRIDGE/bridgeAudit are PAIR/pairAudit
     * under their old names.  Prefer the PAIR names in new code. --- */
    BRIDGE: PAIR, bridgeAudit: pairAudit,
    bridgeSeats: () => [], buildBridge: () => [], footOutline, footIslands,
    keyBackSpan, keyPadSection,
    pairPlan, pairFaces, pairLand, pairAudit, PAIR_SHAPE, pushFlatFace,
    mapRingToPair, buildPress, pressParts, pushPrism, isWatertight, meshVolume,
    spineKindOf, spineKindForColours, spineLayerCount,
    SPINE_LAYER_COLORS, spineLayerColor, spineLayerMaterial,
    spineHalves, spineParts, spineBands, spineZRange, footParts,
    FIT,
    footCentres, obroundRing, spineHoles, holeBoxPoint, HOLE_UNIT,
    pushHoleAnnulus, pushHoleWall, pushSpineSlab,
    toWorld: (x, y, z) => [x + WORLD.x0, WORLD.y0 - y, z + WORLD.z0]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).XM = api;
})();
