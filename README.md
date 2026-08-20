# Xenachord Cimbalo Cromatico Designer

A self-contained browser app for designing split-key microtonal ("cimbalo
cromatico") keyboards. **Open `index.html` in any browser** — no server, no
internet, no dependencies.

Every dimension in this app is inferred from
`Cleaning Cimbalo Designs for Automated Design/Cimbalo_Cromatico_Drafting_Sandbox_Leveling.blend`
— the spine, the sensor feet, the seven key type categories and the three
drafted layouts. Nothing here is guessed.

---

## The instrument is 32 keys. Always.

One AKM320: **spine half A + spine half B, 16 sensor feet on each, 32 feet in
total.** A design therefore has exactly 32 keys — one per foot — and the app
will not generate a 33rd, in the browser or in the Blender log. Nothing chains;
there is no multi-unit mode.

The consequence: **the white-key count is derived, not chosen.** Keys are laid
down left to right — white *i*, then slot *i*, then white *i+1* — and the run
stops the instant the 32nd note is placed. Change the pattern and the white
count moves with it:

| pattern | notes/equave | white keys | accidentals | span |
|---|---|---|---|---|
| 15-EDO | 15 | 15 | 17 | 367.9 mm |
| 17-EDO | 17 | 13 | 19 | 358.7 mm |
| 19-EDO | 19 | 12 | 20 | 368.0 mm |
| all-white | 7 | 32 | 0 | 983.8 mm |

If the 32nd note falls inside a split slot you get one half of the pair and a
warning saying so — the first note of the pair is the one kept, since that is
the one that comes next in scale order. Rotating with **Start on** moves where
the cut lands.

`FEET[i]` is the foot under `KEYS[i]`; the Python log asserts both are 32 long.

---

## Files

| file | what it is |
|---|---|
| `profiles.js` | The drafted keys themselves, as data — one profile per key type and, for whites, per neighbour context. Generated from the .blend; not hand-edited. |
| `model.js` | Everything measured out of the .blend: the datum, the spine (per half), the fixed foot relationship, the size law, the seven key types, the part colours, the three layouts, and the parametric mesh builders. |
| `core.js` | Layout engine (slot arithmetic, validity checks), mesh assembly, STL/ZIP writers, and the Blender Python log generator — which emits `model.js`'s mesh code as Python, so the Blender build and the preview are one model. Also loadable from node. |
| `index.html` | The app: drag-and-drop palette, period editor, keyboard strip, WebGL preview, export. |

The only layout controls are **size scale `s`** and **Start on** (rotation).
Everything else follows from the 32-key limit and the seven-slot template.

---

## Coordinate system

```
x : 0 at the LEFT EDGE of the leftmost white key, + toward the treble
y : 0 at the SPINE FRONT FACE (= the back face of every key), + toward the player
z : 0 at the SPINE BOTTOM FACE, + up
```

Mapping back to the .blend, exactly:

```
X_world = x + (-1403.764)
Y_world = (-134.106) - y
Z_world = z + 21.78566
```

---

## The fixed spine ↔ foot relationship

This never varies, in any layout, at any scale:

| quantity | value |
|---|---|
| foot pad | 10.40002 × 9.00005 mm (flat plane) |
| foot pitch | 11.30005 mm |
| foot centre | y = 27.37759 mm in front of the spine front face |
| foot plane | z = −1.01091 mm below the spine bottom face |
| feet per AKM320 unit | 32 (16 on half A, 16 on half B) |

Half A of the real PCB is not perfectly even (steps alternate 11.20899 /
11.39099 / 11.30018); half B is dead uniform at 11.30005. Both are stored
verbatim in `model.js`, so foot X positions are reproduced to the micron.

The spine is 9.84706 mm deep and ~7.1 mm tall, and the sandbox draws it three
ways, in six objects. **A design uses exactly one of them, and which one is not
a setting — it is the number of key colours the design places.** One slab per
colour, each key's rear tongue plugging into the layer belonging to its own
colour:

| colours placed | spine | layers | sandbox objects |
|---|---|---|---|
| white only | one type | 1 | `One type Spine - A` / `- B` |
| white + black | two type | 2 | `Two type Spine - A` / `- B` |
| **anything using gray** | three type | 3 | `Three type Spine - A` / `- B` |

**Gray always takes the full three-layer stack**, even in a design that places
no black key at all. The drafted gray tongue is z 4.08924 → 5.09074 and the
black one 5.08924 → 6.08924: they are stacked bands, not alternatives, so
reaching for gray means reaching for the bottom band of the three-layer spine
and the black band has to exist above it. A two-type spine merges those two
into a single 0 → 6.07832 slab, which is the white + black case and only that
one. The status panel names the colours it counted and the spine they chose.

The count is taken from the keys the design actually **places**, not from the
colours its template mentions — the 32-note limit can cut a slot off before its
keys are laid down, and an override on a slot the run never reaches is not part
of the instrument.

The bands, per spine type:

| spine | layer | z band (half A) | z band (half B) | tongue it takes |
|---|---|---|---|---|
| one | all | 0 → 7.10039 | −0.00006 → 7.08935 | white 6.08924 → 8.62804 |
| two | lower | 0 → 6.07832 | −0.00006 → 6.08932 | black 5.08924 → 6.08924 |
| two | upper | 6.07826 → 7.07833 | 6.08928 → 7.08936 | white 6.08924 → 8.62804 |
| three | gray | 0 → 5.08934 | −0.00006 → 5.07835 | gray 4.08924 → 5.09074 |
| three | black | 5.09072 → 6.10034 | 5.07829 → 6.08932 | black 5.08924 → 6.08924 |
| three | white | 6.07824 → 7.10034 | 6.08926 → 7.11137 | white 6.08924 → 8.62804 |

Every tongue engages its band over ~1.00 mm — its full thickness — in all three
spine types and on both halves, which is what makes the choice above the right
one rather than a convention.

Halves A and B were drafted separately and their layer bands differ by up to
0.011 mm. Both are stored verbatim (for all three spine types), so a generated
spine is a replica of the drafted one rather than an idealisation of it. Each
(half, layer) is built as its own object, matching the sandbox's own
decomposition of `<kind> type Spine - A` / `- B`.

### The channel and the mounting holes

The spine is not a plain slab, and its holes are **not rectangles**. Both
features are read straight out of `<kind> type Spine - A` / `- B`:

**The PCB channel.** The underside of each half is slotted end to end, open at
both x ends, leaving a 1.40005 mm wall at the front and the back:

| half | y band | z band |
|---|---|---|
| A | −8.44702 → −1.40005 | 0 → 2.911096 |
| B | −8.44696 → −1.39999 | 0 → 2.911096 |

That is where the AKM320 board sits. It is one continuous slot per half, not
three wide through-holes — an earlier reading of the sheet had it as the
latter, and that is now corrected.

**The 16 mounting holes** — eight per half — are **obrounds**: a 32-segment
circle cut at ±90° with the two halves held 1.0 mm apart along x and closed
with tangent lines top and bottom. Thirty-four points, rounded ends, flat
sides. There are exactly two bores in the sandbox:

| bore | radius | size | where |
|---|---|---|---|
| lower | 1.889789 | 4.779578 × 3.779578 | the layer that carries the channel, from z = 2.911096 up |
| upper | 1.619818 | 4.239636 × 3.239636 | every layer stacked above it, full height |

so the bore steps in by 0.269971 mm at the first layer seam. A one-type spine
has no seam and therefore only the lower bore, exactly as `One type Spine - A`
/ `- B` is drawn. The holes bottom out on the channel ceiling — they open
straight into it, so none of them is a blind counterbore.

Centres are stored per half **and per bore**, verbatim, because the drafted
upper bores do not sit dead on top of the lower ones; they wander by up to
0.008 mm and the app reproduces that rather than averaging it away.

---

## The size law

Read straight off the three drafted sheets. **Every horizontal dimension is
linear in the size number `s`; every vertical and front-to-back dimension is
constant.**

```
white key width  = s × 37/24     (1.5416667)
white key pitch  = white width + 1.5      (a constant 1.5 mm gap)
accidental width = s × 83/120    (0.6916667)
slot bias δ      = s / 6
```

| s | white width | white pitch | accidental width | δ |
|---|---|---|---|---|
| 15 | 23.1250 | 24.62500 | 10.37500 | 2.50000 |
| 17 | 26.2083 | 27.70833 | 11.75833 | 2.83333 |
| 19 | 29.2917 | 30.79167 | 13.14167 | 3.16667 |

`s` defaults to the EDO number but is an independent control — you can draw a
19-note layout at 15-size, or scale a 17 sheet up. Because the key count is
fixed at 32, `s` is what decides whether those 32 keys fit the A+B spine: the
**fit to spine** button sets `s` so the last white key ends exactly at
x = 373.30 mm. The status panel shows the span against the spine either way,
and warns on an overhang.

---

## Slots

Seven white keys per period, seven accidental slots between them. Slot *i*
sits between white *i* and white *i+1*, at the midpoint plus a bias of ±δ —
the classic piano grouping of three-then-two:

| slot | between | bias | group |
|---|---|---|---|
| 0 | F–G | −δ | three |
| 1 | G–A | 0 | three |
| 2 | A–B | +δ | three |
| 3 | B–C | 0 | single (diatonic semitone) |
| 4 | C–D | −δ | two |
| 5 | D–E | +δ | two |
| 6 | E–F | 0 | single (diatonic semitone) |

The three drafted defaults are just three fillings of those seven slots:

| | slot 0 | 1 | 2 | 3 | 4 | 5 | 6 | notes |
|---|---|---|---|---|---|---|---|---|
| **15** | full black | pair | pair | — | full black | pair | — | 7+1+2+2+1+2 = 15 |
| **17** | pair | pair | pair | — | pair | pair | — | 7+10 = 17 |
| **19** | pair | pair | pair | full gray | pair | pair | full gray | 7+10+2 = 19 |

The 17 and 19 sheets are drawn starting on F; the 15 sheet starts on C. The
**Start on** control rotates which white key lands on period slot 0.

---

## The keys are the drafted keys

Key geometry is not modelled analytically and never was worth modelling
analytically. Every key in the 15, 17 and 19 sheets was measured, and each key
type is stored once in `profiles.js` as a vertex/face profile in which every
vertex carries

```
x = alpha + beta * width        (x from the key's left edge)
y, z                            (invariant with scale)
```

`beta = 0` pins a feature to the left edge, `1` to the right edge, `0.5` to the
centreline. The drafted keys use exactly those three plus a quarter — the
0.65 / 0.99 / 1.0 / 1.55 mm edge detailing is edge-pinned and does **not**
scale, while the interior rides the centre. `alpha` and `beta` are least-squares
fits across every width the sheets draw the key at, so a single profile
reproduces all of them and interpolates sensibly between and beyond.

**Whites carry one profile per neighbour context.** The drafted whites rib
differently depending on which slots sit either side of them and how those
slots are biased: three internal ribs when both neighbours are occupied, two
when one is empty, and the whole rib group shifts with the left slot. The
sheets draw nine of the sixteen possible contexts; a design that asks for one
they never drew borrows the closest drafted white (occupancy first, then the
nearer bias) and the inspector says so.

The two left-handed categories are not stored at all — `Split Black First` is
the X-mirror of `Split Black Second` and `Split Gray Second` the X-mirror of
`Split Grey Second`, both verified against the sheet's own meshes at
**0.00000 mm**.

### The clearance around an accidental is part of the white key

A white key is not a slab. Its rear half is stepped back on whichever side has
an accidental beside it, and the step is what leaves the printed keys free of
each other. The step runs to the depth of the neighbour it clears — y = 54.07
beside a split pair (whose front half is 52.57 deep), y = 44.07 beside a
`Full Sized Gray` (42.57 deep) — and its X depends on that slot's bias, which
is why the whites carry one profile per neighbour context rather than one
profile. The gaps that fall out, measured surface to surface over every
overlapping (y, z):

| layout | white ↔ split pair | white ↔ full-sized gray |
|---|---|---|
| 15 | 0.875 mm | — |
| 17 | 0.892 mm | — |
| 19 | 0.908 mm | 1.146 mm |

They scale with `s`, since the step is pinned by `beta` to the key's own width.

**These steps are cut into concave faces**, and until they were triangulated
properly the preview, the STLs and the Blender build all paved straight across
them: a triangle fan is only valid on a convex polygon, and 138 of the 880
drafted faces are not convex. The fan laid down as much as 587 mm² of surface
that is not in the sheet — long triangles reaching corner to corner across a
key, which closed the clearance channel and read as a white key running full
width all the way back to the spine. `triangulateFace()` in `model.js` ear-clips
each face in its own plane instead, and the generated Blender log carries a
line-for-line transliteration of it, so the three outputs stay the same mesh.

What survives is 12.7 mm² on a handful of faces the sheet draws
self-intersecting or twisted in their own plane — the front face of
`Split Grey Second`, where vertex 27 sits 0.224 mm above the face's own top
edge, and five-sided side walls that twist along x. No triangulation can flatten
those; they are drafting artefacts, and they are listed here so they are not
mistaken for tessellation error.

## The seven Key Type Categories

Drag these from the palette into a slot. In the .blend they were pulled from
different sheets (19 and 15) and so carry different widths — here all seven
palette chips are the **same width**, and the real width comes from the size
law when the key is dropped. Chip swatch height shows the key's depth.

| category | layer | depth | peak z | role |
|---|---|---|---|---|
| Full Sized White | white | 85.0688 | 8.62804 | the white backbone |
| Full Sized Black | black | 52.5688 | 15.62804 | single full-depth accidental (15-EDO) |
| Full Sized Gray | gray | 42.5688 | 15.24484 | single mid accidental (19-EDO E♯/F♭, B♯/C♭) |
| Split Black First | black | 27.8188 | 14.94844 | rear half of a pair, left-hand detailing |
| Split Black Second | black | 27.8188 | 14.94844 | rear half of a pair, sheet default |
| Split Gray Second | gray | 52.5688 | 15.62804 | front half of a pair, left-hand detailing |
| Split Grey Second | gray | 52.5688 | 15.62804 | front half of a pair, sheet default |

A split slot takes exactly one **rear** and one **front**. A full-sized key
owns its slot alone. The app warns if you break that.

Where to drop:

* **Repeating period** panel — changes the pattern *everywhere* and clears
  per-slot overrides.
* **Keyboard strip** at the bottom — overrides just that one slot.
* Click any placed key to remove it.

---

## Viewing and inspecting the model

There is **no ground plane and no lower clamp on the camera** — you can orbit
right under the instrument and look up at the undersides, the tongues and the
foot clearance. Faces are shaded two-sided from the view direction, so nothing
goes black when you get beneath it, and back-face culling is off.

| action | control |
|---|---|
| orbit | drag (elevation runs the full −90°…+90°) |
| pan | shift-drag, middle-drag or right-drag — screen-space, so it works from any angle |
| zoom | wheel (8 mm to 20 m) |
| inspect a part | click it |
| clear the inspector | click ✕, double-click, or Esc |
| fit | `fit` button or **F** |
| straight down / straight up | **T** / **B** |
| nudge the orbit | arrow keys (shift = fine) |

View presets: `iso`, `top`, `bottom`, `front`, `back`, `left`, `right`,
`under-iso`. The readout at the top-left shows azimuth, elevation and distance,
and says so when you are below the instrument.

**Layer visibility** — the checkboxes at the bottom of the viewer switch the
white / black / gray combs, the spine and the feet on and off independently.
Hiding the whites is the quickest way to see how the accidental stems sit over
their sensor feet.

**Separate combs** — the slider lifts each comb apart along Z in assembly order
(feet, spine, gray, black, white), so you can see the three-layer stack the way
it comes apart.

**Key → foot reach** — the status panel reports the widest distance from a key's
centre to the centre of its sensor foot. Large values are expected, not errors:
the two halves of a split pair share one X and still have to reach two adjacent
feet 11.3 mm apart. Closing that gap is the bridge edge loop, which is out of
scope (see the last section).

**Click to inspect** — clicking a key highlights it and opens a readout with its
type, centre X, width, depth, Z range, spine layer, slot name, slot bias and
group, pair role, note index, degree, the X of the sensor foot under it, the
**key − foot** offset, and the full world coordinates. Clicking a sensor foot
reports its pad size, its spine half and index on that half, its step from the
previous foot (which is where the uneven half-A spacing shows up), and its
world X.

---

## Export

* **Copy Python Log** — puts a complete, runnable Blender script on the
  clipboard. See below.
* **Save design log (.py)** — the same thing as a file.
* **STL** per colour layer, plus the spine and the feet, or all of it as a zip
  (the zip includes the Python log). Face winding is consistent across every
  primitive, so exported normals point outward — slicers and Blender both read
  the solids the right way round.

### Where it lands in Blender

The **Blender world origin** dropdown in the Export panel decides where the
generated keyboard sits. Default is **model centre at 0, 0, 0**: the bounding
box of the whole instrument — 32 keys, both spine halves and all 32 feet — is
centred on the world origin.

| mode | X | Y | Z |
|---|---|---|---|
| **model centre** (default) | −186.65 … 186.65 | −47.46 … 47.46 | −10.77 … 10.77 |
| spine datum | −186.65 … 186.65 | −85.07 … 9.85 | −5.92 … 15.63 |
| drafting sandbox | −1403.76 … −1030.47 | −219.17 … −124.26 | 15.87 … 37.41 |

(figures for the 19-EDO default; the span follows the size scale)

*Model centre* is the one to use for new work. *Spine datum* centres X but keeps
Y = 0 on the spine front face and Z = 0 on the spine bottom face, which is handy
when you are measuring against the spine. *Drafting sandbox* reproduces the
original world position, so the build lands exactly on top of the 15/17/19
layouts inside `Cimbalo_Cromatico_Drafting_Sandbox_Leveling.blend`.

Whichever mode, the builder creates an empty called **Xenachord Root** at
(0, 0, 0) and parents every generated object to it, so the whole keyboard moves,
rotates and scales from the origin as one. On finishing it prints the bounding
box and centre it actually achieved, so you can check at a glance.

The exported STLs are unaffected — they stay in design coordinates (x from the
leftmost white key's left edge, z from the spine bottom face), which is what the
print workflow expects.

### The Python log

Paste it into Blender's Text Editor and press *Run Script*. Structure:

1. A readable header — the world placement it will build at (with the resulting
   bounding box), the design-frame datum, and the fixed spine↔foot relationship.
2. `DESIGN` — scale, notes per equave, derived white count, rotation, key count
   (always 32), AKM320 units (always 1), the key-colour count and the spine type
   it selected, and all four derived widths.
3. `TEMPLATE` — the seven-slot period, annotated with slot name, bias and group.
4. `KEYS` — the 32 keys, left to right: name (prefixed `K00`…`K31` by foot
   index), type, x centre, width, depth, the drafted profile it is instantiated
   from (for a white, including its neighbour context), world X, world Y (back
   face), world Z (bottom face), and the X of the sensor foot it sits over.
   `KEY_PROFILES` below carries those profiles, and only those.
5. `SPINE` and `FEET` — halves A and B, layers, the PCB channel, the two
   obround bores and their 16 centres, the 32 foot X
   values. Two asserts guarantee `len(KEYS) == len(FEET) == 32`.
6. Any warnings on the design, as comments.
7. `WORLD_X0 / WORLD_Y0 / WORLD_Z0 / ORIGIN` — the world placement, editable in
   place if you want to nudge it.
8. `build()` — the same code the WebGL preview runs: the drafted profiles
   instantiated at this design's widths. There are no proxy boxes, no
   stand-ins and no analytic approximation of a key.

   Output goes into a new collection, `Xenachord Generated`, split into
   `Keys - White` / `Keys - Black` / `Keys - Gray` / `Spine` / `Feet` and
   parented to a `Xenachord Root` empty at the origin: one object per key
   (named for its sensor foot), one per spine half and layer, one per foot.
   Materials carry the preview's own colours.

**The Blender build and the browser preview are the same model.** Every number
the builder computes with is written out at full double precision, so Python
reads back the exact bits the browser used. Vertex for vertex, face for face,
part for part, the two agree to **0.000000 mm** — verified across all three
presets, all three origin modes, all seven rotations, fractional size scales,
one- / two- / three-layer spines and per-slot overrides.

`USE_BLEND_CATEGORIES = True` at the top of the builder swaps the parametric
keys, spine and feet for the hand-modelled originals in the drafting sandbox
(`Key Type Categories`, `<kind> type Spine - A/B`, `Feet - A/B`), lifted onto
whatever origin the log was cut for. That is only meaningful inside the sandbox
.blend, and the interior detailing then no longer matches the preview — the
outer envelope, the layout and the datum are identical either way. Duplicated
categories are scaled in X only, which matches the size law for the outer
envelope; the 0.65 / 1.0 / 1.544 mm edge detailing stretches with it, so re-cut
those by hand before printing.

So the loop is: design here → copy the log → run it in a fresh Blender session
→ adjust → tell me what changed.

---

## Accuracy against the drafting sandbox

All three drafted layouts are reproduced from the size law alone (the sheets
run to 59–61 keys; the app generates the first 32 of each, which is the whole
instrument):

| layout | max white-centre error | max slot-centre error |
|---|---|---|
| 15 | 0.00036 mm | 0.00045 mm |
| 17 | 0.00240 mm | 0.00240 mm |
| 19 | 0.00033 mm | 0.00029 mm |

The 17 residual is drift in the sheet itself — its white keys are spaced
27.7081–27.7090 rather than a clean 27.708333, and that accumulates over 24
keys. The app uses the exact value.

**Surface accuracy, key by key.** Not bounding boxes — the real thing: for every
drafted key, the distance from each of its vertices to the generated surface and
from each generated vertex to the drafted surface, worst of the two.

| layout | keys compared | worst surface deviation |
|---|---|---|
| 15 | 30 | **0.126 mm** |
| 17 | 32 | **0.007 mm** |
| 19 | 32 | **0.003 mm** |

All of it inside 0.2 mm; two of the three layouts are inside 0.01 mm.

The 0.126 mm is not an approximation error — it is a disagreement between the
sheets themselves. The 15 sheet's `Split Black Second` is missing an edge loop
that the 17 and 19 ones have, at y = 22.57, z = 5.77. One profile cannot have
that loop and not have it; the profile keeps it, so the 15 layout differs there
by the height of the loop. Every other key in every layout is inside 0.02 mm.

(The 15 sheet is also missing the split pair in its slot 1 — two keys the
pattern calls for that were never drawn. The generator places them; they are
reported as unmatched rather than silently paired with a neighbour.)

**Spine and feet.** Not bounding boxes either — surface distance, measured in
Blender against `One / Two / Three type Spine - A`/`- B` and `Feet - A`/`- B`,
for every one of the three spine types:

| | worst drafted vertex → generated surface |
|---|---|
| half A | **0.011 mm** |
| half B | **0.000133 mm** |
| feet | 0.00002 mm |

Half B's 0.000133 mm is the sheet's own storage precision — the sandbox sits
~1400 mm from the world origin, where a float32 vertex coordinate steps in
0.00012 mm. Half A's 0.011 mm is the levelling: its layer faces are very
slightly tilted, and `model.js` stores one z per face. Built on the origin, as
the default `model centre` mode does, the generated model is the more exact of
the two.

Going the other way, a generated boundary vertex is at most **0.047 mm** from
the drafted surface, and every one of those sits on an obround's tangent line.
The sandbox's own rings omit one of the two tangent vertices — on the left in
some objects and on the right in others — so the drafted hole is a hair
narrower there, inconsistently. The app draws the symmetric obround.

(For the record: modelling the holes as axis-aligned rectangles, which is what
this app did before, put the worst drafted vertex **3.394 mm** off the
generated surface.)

`USE_BLEND_CATEGORIES = True` in the log still duplicates the sandbox's own
objects, but it is no longer more accurate than building from the profiles —
within the numbers above, it is the same geometry.

### Mesh integrity

Checked by pairing every edge across the 32 keys of the 19 layout: 5 948
triangles, **0 degenerate, 0 boundary edges, 0 non-manifold edges, 0 reversed
windings**. Every key is a closed solid, which is what the slicer wants. The
feet are clean too (384 triangles, closed).

**The spine is not, and that is a separate outstanding bug.** Each slab carries
**608 boundary edges and 32 non-manifold edges — 76 and 4 per mounting hole.**
`pushSpineSlab` decomposes the slab into closed boxes around each hole's
bounding box and then fills between that box and the obround with
`pushHoleAnnulus`, and the two tessellations do not share vertices along the
bounding box: the annulus subdivides each side at its ring projections while
the box wall is one quad. The doubled interior walls between adjacent boxes are
what the non-manifold count is. Nothing about it is visible in the shaded
preview, and slicers generally repair it, but the spine STL is not watertight
and the box seams show as spurious edges in Blender's wireframe. Fixing it means
capping each slab as one polygon with holes rather than as a pile of boxes.

---

## What this is not

This is a drafting and layout tool, not a finished MIDI controller design. In
particular the **bridge edge-loop that connects the sensor feet (Feet A / Feet
B) to the keys is deliberately not generated** — the feet are drawn as the
reference planes they are in the .blend, sitting at their fixed offset from the
spine, and nothing reaches down to them.
