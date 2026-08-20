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

  /* Seven accidental slots per seven-white period.  Slot i lives between
   * white i and white i+1.  bias is in units of delta = s/6 mm.
   * Pattern: a group of three, a single, a group of two, a single —
   * exactly the classic piano arrangement.                             */
  const SLOT_BIAS = [-1, 0, +1, 0, -1, +1, 0];
  const SLOT_GROUP = ['three', 'three', 'three', 'single', 'two', 'two', 'single'];

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
    feet:  [0.24, 0.42, 0.60]
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
      id: 'full-white', kind: 'white', layer: 'white',
      depth: 85.0688, css: 'white',
      label: 'Full Sized White',
      blurb: 'Natural. Full depth, plays at z 8.628.'
    },
    'Full Sized Gray': {
      id: 'full-gray', kind: 'acc', layer: 'gray', mirror: false,
      depth: 42.5688, noseZ: Z.whiteTop,
      peakY: 42.5688 - 5.4866, peakZ: 15.24484,
      css: 'gray',
      label: 'Full Sized Gray',
      blurb: 'Single mid-height accidental. 19-EDO uses it for E#/Fb and B#/Cb.'
    },
    'Full Sized Black': {
      id: 'full-black', kind: 'acc', layer: 'black', mirror: false,
      depth: 52.5688, noseZ: Z.whiteTop,
      peakY: 52.5688 - 4.5, peakZ: 15.62804,
      css: 'black',
      label: 'Full Sized Black',
      blurb: 'Single full-depth accidental. 15-EDO uses it in the outer slots.'
    },
    'Split Black First': {
      id: 'split-black-1', kind: 'acc', layer: 'black', mirror: true,
      depth: 27.8188, noseZ: Z.whiteTop,
      peakY: 27.8188 - 0.2303, peakZ: 14.94844,
      css: 'black', pairRole: 'rear',
      label: 'Split Black First',
      blurb: 'Rear (short, tall) half of a split pair — left-hand detailing.'
    },
    'Split Black Second': {
      id: 'split-black-2', kind: 'acc', layer: 'black', mirror: false,
      depth: 27.8188, noseZ: Z.whiteTop,
      peakY: 27.8188 - 0.2303, peakZ: 14.94844,
      css: 'black', pairRole: 'rear',
      label: 'Split Black Second',
      blurb: 'Rear (short, tall) half of a split pair — the sheet default.'
    },
    'Split Gray Second': {
      id: 'split-gray-2', kind: 'acc', layer: 'gray', mirror: true,
      depth: 52.5688, noseZ: Z.whiteTop,
      peakY: 52.5688 - 4.5, peakZ: 15.62804,
      arm: { startY: 29.8188, startZ: 7.84134, endY: TONGUE_Y, endZ: 5.09074 },
      css: 'gray', pairRole: 'front',
      label: 'Split Gray Second',
      blurb: 'Front (deep, low) half of a split pair — left-hand detailing.'
    },
    'Split Grey Second': {
      id: 'split-grey-2', kind: 'acc', layer: 'gray', mirror: false,
      depth: 52.5688, noseZ: Z.whiteTop,
      peakY: 52.5688 - 4.5, peakZ: 15.62804,
      arm: { startY: 29.8188, startZ: 7.84134, endY: TONGUE_Y, endZ: 5.09074 },
      css: 'gray', pairRole: 'front',
      label: 'Split Grey Second',
      blurb: 'Front (deep, low) half of a split pair — the sheet default.'
    }
  };
  const TYPE_ORDER = [
    'Full Sized Black', 'Full Sized Gray', 'Full Sized White',
    'Split Black First', 'Split Black Second',
    'Split Gray Second', 'Split Grey Second'
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
        ['Split Black Second', 'Split Grey Second'],
        ['Split Black Second', 'Split Grey Second'],
        null,
        ['Full Sized Black'],
        ['Split Black Second', 'Split Grey Second'],
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
        ['Split Black Second', 'Split Grey Second'],
        ['Split Black Second', 'Split Grey Second'],
        ['Split Black Second', 'Split Grey Second'],
        null,
        ['Split Black Second', 'Split Grey Second'],
        ['Split Black Second', 'Split Grey Second'],
        null
      ],
      notes: 17,
      whites: 25,
      sheetWhites: 25
    },
    19: {
      label: '19-EDO  (Cimbalo Cromatico [19])',
      slots: [
        ['Split Black Second', 'Split Grey Second'],
        ['Split Black Second', 'Split Grey Second'],
        ['Split Black Second', 'Split Grey Second'],
        ['Full Sized Gray'],
        ['Split Black Second', 'Split Grey Second'],
        ['Split Black Second', 'Split Grey Second'],
        ['Full Sized Gray']
      ],
      notes: 19,
      whites: 23,
      sheetWhites: 23
    }
  };

  /* The sheets start on F, so slot 3 (B-C) and slot 6 (E-F) are the two
   * diatonic semitone gaps — which is why they carry the single keys.   */
  const WHITE_NAMES = ['F', 'G', 'A', 'B', 'C', 'D', 'E'];
  const SLOT_NAMES = [
    'F♯/G♭', 'G♯/A♭', 'A♯/B♭',
    'B♯/C♭', 'C♯/D♭', 'D♯/E♭', 'E♯/F♭'
  ];

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

  /** the drafted profile for a key type in a given neighbour context */
  function profileFor(type, lb, rb) {
    let mirror = false, t = type;
    if (KP.MIRROR[t]) { mirror = true; t = KP.MIRROR[t]; }
    const table = KP.INDEX[t];
    if (!table) throw new Error('no drafted profile for key type: ' + type);
    const want = ctxKey(lb, rb);
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

  /**
   * One key, as a triangle soup.
   *   cx     centre x            w   width (from the size law)
   *   type   key type name
   *   lb/rb  bias of the occupied slot to the left / right, or null
   */
  function buildKey(cx, w, type, lb, rb) {
    const q = profileFor(type, lb, rb);
    const V = profilePoints(q.p, q.mirror, w, cx - w / 2);
    const f = q.p.f, t = [];
    for (let k = 0; k < f.length;) {
      const m = f[k++];
      const ring = f.slice(k, k + m); k += m;
      if (q.mirror) ring.reverse();          // mirroring flips face winding
      for (let i = 1; i < m - 1; i++) {
        const a = V[ring[0]], b = V[ring[i]], c = V[ring[i + 1]];
        t.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      }
    }
    return t;
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
  function pushSpineSlab(t, x0, x1, y0, y1, z0, z1, holes) {
    rectWithHoles(x0, x1, y0, y1, holes,
      (a, b, c, d) => pushBox(t, a, b, c, d, z0, z1));
    for (const h of holes) {
      pushHoleAnnulus(t, h, z1, +1);
      pushHoleAnnulus(t, h, z0, -1);
      pushHoleWall(t, h, z0, z1);
    }
  }

  const spineKindOf = n => (n >= 3 ? 'three' : n === 2 ? 'two' : 'one');

  /** the halves of the one and only spine, in build order */
  const spineHalves = () => [['A', SPINE.halfA], ['B', SPINE.halfB]];

  /**
   * The one and only spine, `nLayers` deep, as one part per (half, layer) —
   * the same decomposition the drafting sandbox uses, so each generated part
   * has a one-to-one counterpart in "<kind> type Spine - A / - B".
   */
  function spineParts(nLayers) {
    const kind = spineKindOf(nLayers);
    const zc = SPINE.channel.zTop;
    const parts = [];
    for (const [hn, half] of spineHalves()) {
      const ch = SPINE.channel[hn];
      const layers = SPINE.layers[kind][hn];
      layers.forEach((L, i) => {
        const tris = [];
        if (i === 0) {
          /* The bottom layer carries the PCB channel.  Below the ceiling it
           * is two strips, front and back; above it, the full section with
           * the wide bore.  The channel runs out through both x ends.     */
          pushBox(tris, half.x0, half.x1, half.yBack, ch.y0, L.z0, zc);
          pushBox(tris, half.x0, half.x1, ch.y1, half.yFront, L.z0, zc);
          pushSpineSlab(tris, half.x0, half.x1, half.yBack, half.yFront,
                        zc, L.z1, spineHoles(hn, false));
        } else {
          pushSpineSlab(tris, half.x0, half.x1, half.yBack, half.yFront,
                        L.z0, L.z1, spineHoles(hn, true));
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

  /** the spine's design-frame z extent for a given layer count */
  function spineZRange(nLayers) {
    const kind = spineKindOf(nLayers);
    let z0 = Infinity, z1 = -Infinity;
    for (const [hn] of spineHalves()) {
      const ls = SPINE.layers[kind][hn];
      z0 = Math.min(z0, ls[0].z0);
      z1 = Math.max(z1, ls[ls.length - 1].z1);
    }
    return [z0, z1];
  }

  /** Build the one and only spine: half A + half B, `nLayers` deep */
  function buildSpine(nLayers) {
    const out = {};
    for (const p of spineParts(nLayers)) out[p.name] = p.tris;
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

  /** one part per sensor foot, named to match "Feet - A" / "Feet - B" */
  function footParts() {
    const y0 = FOOT.yCentre - FOOT.d / 2, y1 = FOOT.yCentre + FOOT.d / 2;
    return footCentres().map((cx, i) => {
      const tris = [];
      // a flat plane, exactly as in the .blend — given a hair of thickness
      // so it survives STL export
      pushBox(tris, cx - FOOT.w / 2, cx + FOOT.w / 2, y0, y1,
              FOOT.z - 0.05, FOOT.z + 0.05);
      return {
        name: 'Foot_' + (i < FEET_PER_HALF ? 'A' : 'B') + '_' +
              String(i % FEET_PER_HALF + 1).padStart(2, '0'),
        index: i, half: i < FEET_PER_HALF ? 'A' : 'B', cx, tris
      };
    });
  }

  function buildFeet() {
    const t = [];
    for (const p of footParts()) t.push(...p.tris);
    return t;
  }

  /* ==================================================================== *
   *  EXPORT                                                              *
   * ==================================================================== */
  const api = {
    WORLD, SPINE, FOOT, SIZE, Z, COLORS, DRAFT, WALL, TONGUE_Y,
    NOTES, UNITS, FEET_PER_HALF,
    KEY_TYPES, TYPE_ORDER, LAYOUTS, SLOT_BIAS, SLOT_GROUP,
    WHITE_NAMES, SLOT_NAMES,
    whiteWidth, whitePitch, accWidth, slotDelta,
    pushTri, pushQuad, pushBox, rectWithHoles,
    ctxKey, profileFor, profilePoints, buildKey, keyExtent,
    buildSpine, buildFeet,
    spineKindOf, spineHalves, spineParts, spineZRange, footParts,
    footCentres, obroundRing, spineHoles, holeBoxPoint, HOLE_UNIT,
    pushHoleAnnulus, pushHoleWall, pushSpineSlab,
    toWorld: (x, y, z) => [x + WORLD.x0, WORLD.y0 - y, z + WORLD.z0]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).XM = api;
})();
