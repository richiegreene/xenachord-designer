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

    // Layer stack. A "one type" spine is one solid slab; a "two type" spine
    // splits it 2 ways; a "three type" spine 3 ways.  Each key's rear tongue
    // plugs into the layer belonging to its colour.
    layers: {
      one:   [{ name: 'all',   z0: 0.0,     z1: 7.10039 }],
      two:   [{ name: 'lower', z0: 0.0,     z1: 6.07832 },
              { name: 'upper', z0: 6.07826, z1: 7.07833 }],
      three: [{ name: 'gray',  z0: 0.0,     z1: 5.08934 },
              { name: 'black', z0: 5.09072, z1: 6.10034 },
              { name: 'white', z0: 6.07824, z1: 7.10034 }]
    },

    // One AKM320 unit = spine half A + spine half B (32 feet between them).
    halfA: { x0: 0.8493, x1: 183.4323 },   // length 182.583
    halfB: { x0: 184.7236, x1: 373.2951 }, // length 188.5715
    unitPitch: 373.2951 - 0.8493,          // repeat distance for a chained unit

    // Screw holes, x measured from the design origin.  "big" holes go all the
    // way through; the others are counterbores stopping at z = 2.91114.
    screws: [
      { x: 3.5805,   big: true  }, { x: 17.4975,  big: false },
      { x: 31.1310,  big: false }, { x: 70.4945,  big: true  },
      { x: 89.3770,  big: false }, { x: 140.8700, big: false },
      { x: 154.4605, big: false }, { x: 168.1025, big: false },
      { x: 184.0780, big: false }, { x: 208.2210, big: false },
      { x: 226.4535, big: false }, { x: 277.9210, big: false },
      { x: 291.5370, big: false }, { x: 305.1375, big: false },
      { x: 345.1375, big: false }, { x: 356.2370, big: false },
      { x: 370.6295, big: true  }
    ],
    screwStd: { w: 4.7795, d: 3.7795, yc: 5.05295, zFloor: 2.91114 },
    screwBig: { w: 5.9,    d: 7.047,  yc: 4.92350, zFloor: 0.0 }
  };

  /* ------------------------------------------------------------------ *
   * 3.  FEET  (the sensor pushers — fixed to the spine, forever)         *
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
   * 4.  SIZE LAW                                                        *
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
   * 5.  KEY TYPE CATEGORIES                                             *
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
   * 6.  THE THREE DRAFTED LAYOUTS                                       *
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
   * [x,z] pairs in consistent winding.  capA / capB close the ends.     */
  function loftRing(t, ringA, yA, ringB, yB, capA, capB) {
    const n = ringA.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      pushQuad(t,
        [ringA[i][0], yA, ringA[i][1]], [ringB[i][0], yB, ringB[i][1]],
        [ringB[j][0], yB, ringB[j][1]], [ringA[j][0], yA, ringA[j][1]]);
    }
    if (capA) fanCap(t, ringA, yA, true);
    if (capB) fanCap(t, ringB, yB, false);
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
   *  KEY GEOMETRY                                                        *
   * ==================================================================== */

  /** half-width of an accidental at height z (side draft above whiteTop) */
  function halfW(w, z) {
    return w / 2 - DRAFT * Math.max(0, z - Z.whiteTop);
  }

  /** top surface height of an accidental at y (y = 0 at the spine) */
  function accTopAt(spec, y) {
    if (y <= TONGUE_Y) return null;                    // tongue region
    if (y >= spec.peakY) {
      // nose ramp down to the front face: peakZ at peakY, noseZ at depth
      const f = (y - spec.peakY) / (spec.depth - spec.peakY);
      return spec.peakZ + (spec.noseZ - spec.peakZ) * f;
    }
    // rear draft: peak -> Z.accRearTop at y = TONGUE_Y
    const f = (spec.peakY - y) / (spec.peakY - TONGUE_Y);
    return spec.peakZ + (Z.accRearTop - spec.peakZ) * f;
  }

  /**
   * Build one accidental key.
   *   cx     centre x
   *   w      width (from the size law)
   *   spec   entry from KEY_TYPES
   * Returns a flat triangle array.
   */
  function buildAccidental(cx, w, spec) {
    const t = [];
    const arm = spec.arm || null;
    const bodyBackY = arm ? arm.startY : TONGUE_Y;

    // --- Y stations through the body, front (depth) back to bodyBackY ---
    const ys = [];
    const push = v => { if (v > bodyBackY + 1e-6 && v < spec.depth - 1e-6) ys.push(v); };
    ys.push(spec.depth);
    push(spec.peakY);
    // a few intermediate stations so the sloped top tessellates cleanly
    for (let i = 1; i < 6; i++) push(bodyBackY + (spec.peakY - bodyBackY) * i / 6);
    ys.push(bodyBackY);
    ys.sort((a, b) => b - a);            // front -> back

    const ringAt = y => {
      const top = accTopAt(spec, Math.max(y, bodyBackY + 1e-6)) ||
                  accTopAt(spec, bodyBackY + 1e-6);
      const zb = Z.accBottom;
      const hwT = halfW(w, top), hwB = w / 2;
      const shoulder = Math.min(top, Z.whiteTop);
      // outer ring, CCW seen from +y
      return [
        [cx - hwB, zb], [cx + hwB, zb],
        [cx + w / 2, shoulder], [cx + hwT, top],
        [cx - hwT, top], [cx - w / 2, shoulder]
      ];
    };
    for (let i = 0; i < ys.length - 1; i++) {
      loftRing(t, ringAt(ys[i]), ys[i], ringAt(ys[i + 1]), ys[i + 1],
               i === 0, i === ys.length - 2);
    }

    // --- hollow underside: a cavity inset by WALL, open at the bottom ---
    const cavFront = spec.depth - WALL, cavBack = bodyBackY + WALL;
    if (cavFront > cavBack + 0.2) {
      const cav = y => {
        const top = accTopAt(spec, y) || Z.accRearTop;
        const ct = Math.min(top - WALL, Z.whiteTop + 3.0);
        const hw = w / 2 - WALL;
        return [[cx - hw, Z.accBottom], [cx - hw, ct],
                [cx + hw, ct], [cx + hw, Z.accBottom]];
      };
      const cys = [cavFront];
      for (let i = 1; i < 5; i++) cys.push(cavFront + (cavBack - cavFront) * i / 5);
      cys.push(cavBack);
      for (let i = 0; i < cys.length - 1; i++) {
        loftRing(t, cav(cys[i]), cys[i], cav(cys[i + 1]), cys[i + 1],
                 i === 0, i === cys.length - 2);
      }
    }

    // --- thin rear arm (the deep "Second" gray keys) ---
    if (arm) {
      const hw = w / 2 - 0.6;
      const ring = z => [[cx - hw, Z.accBottom], [cx + hw, Z.accBottom],
                         [cx + hw, z], [cx - hw, z]];
      loftRing(t, ring(arm.startZ), arm.startY, ring(arm.endZ), arm.endY, true, true);
    }

    // --- rear tongue into the spine ---
    const tz = spec.layer === 'black' ? Z.blackTongue : Z.grayTongue;
    pushBox(t, cx - w / 2, cx + w / 2, 0, TONGUE_Y + 0.001, tz[0], tz[1]);

    return t;
  }

  /**
   * Build one white key.  Construction mirrors the .blend: a 1 mm top plate,
   * two 1 mm outer walls, two 1 mm inner ribs, one centred rib over the
   * sensor foot, a solid front block and a rear tongue that ramps down onto
   * the spine.
   */
  function buildWhite(cx, w, opts) {
    const t = [];
    const o = opts || {};
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const D = KEY_TYPES['Full Sized White'].depth;      // 85.0688
    const topZ = Z.whiteTop, plate = topZ - 1.0;

    const frontBlockY = D - 6.0;      // full-height nose
    const rampEndY = D - 19.527;      // underside reaches its cruising height
    const tongueY = 5.0688;

    // clearance the neighbouring accidentals need out of the mid section
    const shL = o.shL != null ? o.shL : x0;
    const shR = o.shR != null ? o.shR : x1;

    // ---- front block (solid) ----
    pushBox(t, x0, x1, frontBlockY, D, Z.whiteBottom, topZ);
    // ---- underside ramp: a true sloped prism from whiteUnder to whiteBottom --
    XM_loftPrism(t, x0, x1,
      rampEndY, Z.whiteUnder, frontBlockY, Z.whiteBottom, topZ);
    // ---- top plate over the whole body ----
    pushBox(t, shL, shR, tongueY, rampEndY, plate, topZ);
    // ---- outer walls ----
    pushBox(t, shL, shL + 1.0, tongueY, rampEndY, Z.whiteUnder, topZ);
    pushBox(t, shR - 1.0, shR, tongueY, rampEndY, Z.whiteUnder, topZ);
    // ---- inner ribs ----
    const inset = w * SIZE.ribInsetRatio;
    const rA = x0 + inset, rB = x1 - inset - 1.0;
    if (rA > shL + 1.0) pushBox(t, rA, rA + 1.0, tongueY, rampEndY, Z.whiteUnder, topZ);
    if (rB + 1.0 < shR - 1.0) pushBox(t, rB, rB + 1.0, tongueY, rampEndY, Z.whiteUnder, topZ);
    // ---- centred rib over the sensor foot ----
    pushBox(t, cx - 0.5, cx + 0.5, FOOT.yCentre - 6.0, FOOT.yCentre + 1.0,
            Z.whiteUnder, topZ);

    // ---- rear tongue, ramping down onto the spine ----
    const tz0 = Z.whiteTongue[0];
    const ringF = [[x0, tz0], [x1, tz0], [x1, topZ], [x0, topZ]];
    const ringB = [[x0, tz0], [x1, tz0], [x1, 7.08899], [x0, 7.08899]];
    loftRing(t, ringF, tongueY, ringB, 0, true, true);
    return t;
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

  /** screw holes of one AKM320 unit, shifted by `off` mm */
  function unitScrewHoles(off) {
    return SPINE.screws.map(s => {
      const g = s.big ? SPINE.screwBig : SPINE.screwStd;
      return {
        x0: s.x + off - g.w / 2, x1: s.x + off + g.w / 2,
        y0: SPINE.yFront - g.yc - g.d / 2, y1: SPINE.yFront - g.yc + g.d / 2,
        zFloor: g.zFloor
      };
    });
  }

  /** Build the spine for a design: `units` chained AKM320 units, `nLayers` deep */
  function buildSpine(nUnits, nLayers) {
    const key = nLayers >= 3 ? 'three' : nLayers === 2 ? 'two' : 'one';
    const layers = SPINE.layers[key];
    const out = {};
    for (const L of layers) out[L.name] = [];
    for (let u = 0; u < nUnits; u++) {
      const off = u * SPINE.unitPitch;
      const holes = unitScrewHoles(off);
      for (const half of [SPINE.halfA, SPINE.halfB]) {
        for (const L of layers) {
          const active = holes.filter(h => L.z1 > h.zFloor);
          rectWithHoles(half.x0 + off, half.x1 + off, SPINE.yBack, SPINE.yFront,
            active, (a, b, c, d) => pushBox(out[L.name], a, b, c, d, L.z0, L.z1));
        }
      }
    }
    return out;
  }

  /** X centres of every foot for `nUnits` chained AKM320 units */
  function footCentres(nUnits) {
    const out = [];
    for (let u = 0; u < nUnits; u++) {
      let x = FOOT.x0 + u * SPINE.unitPitch;
      out.push(x);
      for (let i = 0; i < 15; i++) { x += FOOT.stepsA[i]; out.push(x); }
      x += FOOT.gapAB; out.push(x);
      for (let i = 0; i < 15; i++) { x += FOOT.stepsB; out.push(x); }
    }
    return out;
  }

  function buildFeet(nUnits) {
    const t = [];
    for (const cx of footCentres(nUnits)) {
      const y0 = FOOT.yCentre - FOOT.d / 2, y1 = FOOT.yCentre + FOOT.d / 2;
      // a flat plane, exactly as in the .blend — given a hair of thickness
      // so it survives STL export
      pushBox(t, cx - FOOT.w / 2, cx + FOOT.w / 2, y0, y1,
              FOOT.z - 0.05, FOOT.z + 0.05);
    }
    return t;
  }

  /* ==================================================================== *
   *  EXPORT                                                              *
   * ==================================================================== */
  const api = {
    WORLD, SPINE, FOOT, SIZE, Z, DRAFT, WALL, TONGUE_Y,
    KEY_TYPES, TYPE_ORDER, LAYOUTS, SLOT_BIAS, SLOT_GROUP,
    WHITE_NAMES, SLOT_NAMES,
    whiteWidth, whitePitch, accWidth, slotDelta,
    pushTri, pushQuad, pushBox, loftRing, rectWithHoles,
    halfW, accTopAt, buildAccidental, buildWhite, buildSpine, buildFeet,
    footCentres, unitScrewHoles,
    toWorld: (x, y, z) => [x + WORLD.x0, WORLD.y0 - y, z + WORLD.z0]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).XM = api;
})();
