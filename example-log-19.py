# =========================================================================
# XENACHORD DESIGNER — DESIGN LOG
# generated 2026-08-20 10:06:41  (paste into Blender's Text Editor and Run Script)
#
# WORLD PLACEMENT: model centre at the world origin (0, 0, 0)
#   the built keyboard spans
#     X  -186.6476 .. 186.6476   (373.2951 mm)
#     Y  -47.4579 .. 47.4579   (94.9159 mm)
#     Z  -10.7736 .. 10.7736   (21.5472 mm)
#   centre 0.0000, 0.0000, 0.0000
#
# Design frame (x/y/z below) -> Blender world:
#   X_world = x + -186.647565     x = 0 at the leftmost white key's left edge
#   Y_world = 37.610865 - y     y = 0 at the spine front face, + toward the player
#   Z_world = z + -4.85444     z = 0 at the spine bottom face
#   (set ORIGIN below to 'sheet' to get the drafting sandbox position instead)
#
# FIXED SPINE <-> FOOT RELATIONSHIP (never varies)
#   foot pad        10.400 x 9.000 mm
#   foot pitch      11.30005 mm
#   foot centre     y = 27.37759 mm in front of the spine front face
#   foot plane      z = -1.01091 mm below the spine bottom face
# =========================================================================

DESIGN = {
    "scale":        19,            # every width is linear in this
    "notes_equave": 19,
    "whites":       12,            # derived, not a free parameter
    "rotation":     0,            # white #0 sits on period slot this index
    "total_keys":   32,            # ALWAYS 32 — one per sensor foot
    "akm320_units": 1,            # always one: spine half A + half B
    "spine_type":   "three type",
    "white_width":  29.29167,
    "white_pitch":  30.79167,
    "acc_width":    13.14167,
    "slot_delta":   3.16667,
}

# --- world placement -----------------------------------------------------
WORLD_X0 = -186.647565      # X_world = x + WORLD_X0
WORLD_Y0 = 37.610865      # Y_world = WORLD_Y0 - y
WORLD_Z0 = -4.85444      # Z_world = z + WORLD_Z0
ORIGIN   = "centre"        # model centre at the world origin (0, 0, 0)

# --- repeating seven-slot template (one period = 7 white keys) ----------
TEMPLATE = [
    ["Split Black Second", "Split Grey Second"],   # slot 0  F♯/G♭  bias -delta  (three)
    ["Split Black Second", "Split Grey Second"],   # slot 1  G♯/A♭  bias  0      (three)
    ["Split Black Second", "Split Grey Second"],   # slot 2  A♯/B♭  bias +delta  (three)
    ["Full Sized Gray"],                           # slot 3  B♯/C♭  bias  0      (single)
    ["Split Black Second", "Split Grey Second"],   # slot 4  C♯/D♭  bias -delta  (two)
    ["Split Black Second", "Split Grey Second"],   # slot 5  D♯/E♭  bias +delta  (two)
    ["Full Sized Gray"],                           # slot 6  E♯/F♭  bias  0      (single)
]

# --- the 32 keys, left to right, one per sensor foot -------------------
# (name, type, x_centre, width, depth, clear_l, clear_r,
#  world_x, world_y_back, world_z_bottom, foot_x)
# clear_l / clear_r are the left and right edges of a white key's mid
# section once its neighbouring accidentals have taken their clearance;
# they are None on accidentals.  The builder needs them, so they are
# part of the record rather than something re-derived downstream.
# KEYS is always exactly 32 entries long. KEYS[i] belongs to FEET[i].
KEYS = [
    ("K00_W0_F", "Full Sized White", 14.645833333333334, 29.291666666666668, 85.0688, 0.0, 19.704166666666666, -172.0017, 37.6109, -10.77360, -176.8523),
    ("K01_A0_1", "Split Black Second", 26.875, 13.141666666666666, 27.8188, None, None, -159.7726, 37.6109, -0.76520, -165.6433),
    ("K02_A0_2", "Split Grey Second", 26.875, 13.141666666666666, 52.5688, None, None, -159.7726, 37.6109, -0.76520, -154.2523),
    ("K03_W1_G", "Full Sized White", 45.4375, 29.291666666666668, 85.0688, 34.045833333333334, 53.6625, -141.2101, 37.6109, -10.77360, -142.9521),
    ("K04_A1_1", "Split Black Second", 60.833333333333336, 13.141666666666666, 27.8188, None, None, -125.8142, 37.6109, -0.76520, -131.7432),
    ("K05_A1_2", "Split Grey Second", 60.833333333333336, 13.141666666666666, 52.5688, None, None, -125.8142, 37.6109, -0.76520, -120.3524),
    ("K06_W2_A", "Full Sized White", 76.22916666666667, 29.291666666666668, 85.0688, 68.00416666666666, 87.62083333333334, -110.4184, 37.6109, -10.77360, -109.0522),
    ("K07_A2_1", "Split Black Second", 94.79166666666667, 13.141666666666666, 27.8188, None, None, -91.8559, 37.6109, -0.76520, -97.8432),
    ("K08_A2_2", "Split Grey Second", 94.79166666666667, 13.141666666666666, 52.5688, None, None, -91.8559, 37.6109, -0.76520, -86.4523),
    ("K09_W3_B", "Full Sized White", 107.02083333333333, 29.291666666666668, 85.0688, 101.9625, 115.24583333333334, -79.6267, 37.6109, -10.77360, -75.1523),
    ("K10_A3_1", "Full Sized Gray", 122.41666666666666, 13.141666666666666, 42.5688, None, None, -64.2309, 37.6109, -0.76520, -63.9433),
    ("K11_W4_C", "Full Sized White", 137.8125, 29.291666666666668, 85.0688, 129.58749999999998, 142.87083333333337, -48.8351, 37.6109, -10.77360, -52.5522),
    ("K12_A4_1", "Split Black Second", 150.04166666666669, 13.141666666666666, 27.8188, None, None, -36.6059, 37.6109, -0.76520, -41.3432),
    ("K13_A4_2", "Split Grey Second", 150.04166666666669, 13.141666666666666, 52.5688, None, None, -36.6059, 37.6109, -0.76520, -29.9521),
    ("K14_W5_D", "Full Sized White", 168.60416666666669, 29.291666666666668, 85.0688, 157.2125, 179.99583333333337, -18.0434, 37.6109, -10.77360, -18.6522),
    ("K15_A5_1", "Split Black Second", 187.16666666666669, 13.141666666666666, 27.8188, None, None, 0.5191, 37.6109, -0.76520, -7.4432),
    ("K16_A5_2", "Split Grey Second", 187.16666666666669, 13.141666666666666, 52.5688, None, None, 0.5191, 37.6109, -0.76520, 3.9478),
    ("K17_W6_E", "Full Sized White", 199.39583333333334, 29.291666666666668, 85.0688, 194.3375, 207.62083333333337, 12.7483, 37.6109, -10.77360, 15.2478),
    ("K18_A6_1", "Full Sized Gray", 214.79166666666669, 13.141666666666666, 42.5688, None, None, 28.1441, 37.6109, -0.76520, 26.5479),
    ("K19_W7_F", "Full Sized White", 230.18750000000003, 29.291666666666668, 85.0688, 221.9625, 235.2458333333334, 43.5399, 37.6109, -10.77360, 37.8479),
    ("K20_A7_1", "Split Black Second", 242.4166666666667, 13.141666666666666, 27.8188, None, None, 55.7691, 37.6109, -0.76520, 49.1480),
    ("K21_A7_2", "Split Grey Second", 242.4166666666667, 13.141666666666666, 52.5688, None, None, 55.7691, 37.6109, -0.76520, 60.4480),
    ("K22_W8_G", "Full Sized White", 260.9791666666667, 29.291666666666668, 85.0688, 249.58750000000003, 269.20416666666665, 74.3316, 37.6109, -10.77360, 71.7481),
    ("K23_A8_1", "Split Black Second", 276.375, 13.141666666666666, 27.8188, None, None, 89.7274, 37.6109, -0.76520, 83.0481),
    ("K24_A8_2", "Split Grey Second", 276.375, 13.141666666666666, 52.5688, None, None, 89.7274, 37.6109, -0.76520, 94.3482),
    ("K25_W9_A", "Full Sized White", 291.7708333333333, 29.291666666666668, 85.0688, 283.54583333333335, 303.16249999999997, 105.1233, 37.6109, -10.77360, 105.6482),
    ("K26_A9_1", "Split Black Second", 310.3333333333333, 13.141666666666666, 27.8188, None, None, 123.6858, 37.6109, -0.76520, 116.9483),
    ("K27_A9_2", "Split Grey Second", 310.3333333333333, 13.141666666666666, 52.5688, None, None, 123.6858, 37.6109, -0.76520, 128.2483),
    ("K28_W10_B", "Full Sized White", 322.5625, 29.291666666666668, 85.0688, 317.50416666666666, 330.78749999999997, 135.9149, 37.6109, -10.77360, 139.5484),
    ("K29_A10_1", "Full Sized Gray", 337.9583333333333, 13.141666666666666, 42.5688, None, None, 151.3108, 37.6109, -0.76520, 150.8484),
    ("K30_W11_C", "Full Sized White", 353.3541666666667, 29.291666666666668, 85.0688, 345.12916666666666, 358.41249999999997, 166.7066, 37.6109, -10.77360, 162.1485),
    ("K31_A11_1", "Split Black Second", 365.5833333333333, 13.141666666666666, 27.8188, None, None, 178.9358, 37.6109, -0.76520, 173.4485),
]

# --- spine --------------------------------------------------------------
# Halves A and B were drafted separately and their layer bands differ by
# up to 0.011 mm, so each half carries its own faces and its own stack —
# read verbatim out of "three type Spine - A" / "- B".
SPINE = {
    "y_back": -9.84706, "y_front": 0.0,   # nominal; per-half faces below
    "halves": [   # (half, x0, x1, y_back, y_front, layers)
                  # 16 sensor feet each, and only ever these two
        ("A", 0.84933, 183.43233, -9.84707, 0.0, [
            ("gray", 0.0, 5.08934),
            ("black", 5.09072, 6.10034),
            ("white", 6.07824, 7.10034),
        ]),
        ("B", 184.72359, 373.29513, -9.84695, 0.00005, [
            ("gray", -0.00006, 5.07835),
            ("black", 5.07829, 6.08932),
            ("white", 6.08926, 7.11137),
        ]),
    ],
    "screws": [
        (3.5805, True),
        (17.4975, False),
        (31.131, False),
        (70.4945, True),
        (89.377, False),
        (140.87, False),
        (154.4605, False),
        (168.1025, False),
        (184.078, False),
        (208.221, False),
        (226.4535, False),
        (277.921, False),
        (291.537, False),
        (305.1375, False),
        (345.1375, False),
        (356.237, False),
        (370.6295, True),
    ],
}

# --- the 32 sensor feet (16 on half A, 16 on half B) --------------------
FEET = [
    9.79531, 21.004295, 32.395285, 43.69546, 54.90432, 66.29518999999999, 77.59535999999999, 88.80434499999998,
    100.19521499999999, 111.49525999999999, 122.70424499999999, 134.09535999999997, 145.30434499999998, 156.69545999999997, 167.99538499999997, 179.20436999999998,
    190.59535999999997, 201.89540999999997, 213.19545999999997, 224.49550999999997, 235.79555999999997, 247.09560999999997, 258.39565999999996, 269.69570999999996,
    280.99575999999996, 292.29580999999996, 303.59585999999996, 314.89590999999996, 326.19595999999996, 337.49600999999996, 348.79605999999995, 360.09610999999995,
]
assert len(KEYS) == 32, "this keyboard has exactly 32 keys"
assert len(FEET) == 32, "one AKM320: 16 feet on half A, 16 on half B"

# --- warnings on this design -------------------------------------------
#   ! The 32-note limit lands inside slot 11 (C♯/D♭): 1 of 2 keys placed. Change the pattern or the rotation if you want a whole slot there.

# =========================================================================
# BUILDER — a direct port of the designer's own mesh code
#
# Everything below is the arithmetic model.js runs for the WebGL preview,
# transcribed into Python.  Run this in Blender and you get the preview:
# the same parts, the same vertices, the same faces, in the same places.
# Nothing here is a stand-in box.
#
# Parts land in "Xenachord Generated" as one object per key (named for its
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
SHEET_X0, SHEET_Y0, SHEET_Z0 = -1403.764, -134.106, 21.78566

# --- constants, injected from the designer's model -----------------------
DRAFT            = 0.1018      # side draft above the white playing surface
WALL             = 1.0      # shell wall thickness
TONGUE_Y         = 5.0688   # every accidental's tongue runs y 0 .. this
RIB_INSET_RATIO  = 0.12162179047349574
Z_ACC_BOTTOM     = 4.08924
Z_WHITE_TOP      = 8.62804
Z_WHITE_BOTTOM   = -5.91916
Z_WHITE_UNDER    = 1.71694
Z_ACC_REAR_TOP   = 14.12804
GRAY_TONGUE      = (4.08924, 5.09074)
BLACK_TONGUE     = (5.08924, 6.08924)
WHITE_TONGUE     = (6.08924, 8.62804)
FOOT_W, FOOT_D   = 10.40002, 9.00005
FOOT_YC, FOOT_Z  = 27.37759, -1.01091
SCREW_STD        = (4.7795, 3.7795, 5.05295, 2.91114)   # w, d, y centre, floor z
SCREW_BIG        = (5.9, 7.047, 4.9235, 0.0)

KEY_SPECS = {
    "Full Sized Black": {"kind": "acc", "layer": "black", "depth": 52.5688, "nose_z": 8.62804, "peak_y": 48.0688, "peak_z": 15.62804, "arm": None, "z0": 4.08924, "z1": 15.62804},
    "Full Sized Gray": {"kind": "acc", "layer": "gray", "depth": 42.5688, "nose_z": 8.62804, "peak_y": 37.0822, "peak_z": 15.24484, "arm": None, "z0": 4.08924, "z1": 15.24484},
    "Full Sized White": {"kind": "white", "layer": "white", "depth": 85.0688, "z0": -5.91916, "z1": 8.62804},
    "Split Black First": {"kind": "acc", "layer": "black", "depth": 27.8188, "nose_z": 8.62804, "peak_y": 27.5885, "peak_z": 14.94844, "arm": None, "z0": 4.08924, "z1": 14.94844},
    "Split Black Second": {"kind": "acc", "layer": "black", "depth": 27.8188, "nose_z": 8.62804, "peak_y": 27.5885, "peak_z": 14.94844, "arm": None, "z0": 4.08924, "z1": 14.94844},
    "Split Gray Second": {"kind": "acc", "layer": "gray", "depth": 52.5688, "nose_z": 8.62804, "peak_y": 48.0688, "peak_z": 15.62804, "arm": (29.8188, 7.84134, 5.0688, 5.09074), "z0": 4.08924, "z1": 15.62804},
    "Split Grey Second": {"kind": "acc", "layer": "gray", "depth": 52.5688, "nose_z": 8.62804, "peak_y": 48.0688, "peak_z": 15.62804, "arm": (29.8188, 7.84134, 5.0688, 5.09074), "z0": 4.08924, "z1": 15.62804},
}

COLOURS = {
    "white": (0.95, 0.95, 0.93),
    "black": (0.16, 0.16, 0.19),
    "gray": (0.55, 0.55, 0.58),
    "spine": (0.3, 0.31, 0.36),
    "feet": (0.24, 0.42, 0.6),
}

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
    tongue_y      = 5.0688

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
    build()