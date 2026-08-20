# Xenachord Cimbalo Cromatico Designer

A self-contained browser app for designing split-key microtonal ("cimbalo
cromatico") keyboards. **Open `index.html` in any browser** — no server, no
internet, no dependencies.

Every dimension in this app is inferred from
`Cleaning Cimbalo Designs for Automated Design/Cimbalo_Cromatico_Drafting_Sandbox_Leveling.blend`
— the spine, the sensor feet, the seven key type categories and the three
drafted layouts. Nothing here is guessed.

---

## Files

| file | what it is |
|---|---|
| `model.js` | Everything measured out of the .blend: the datum, the spine, the fixed foot relationship, the size law, the seven key types, the three layouts, and the parametric mesh builders. |
| `core.js` | Layout engine (slot arithmetic, validity checks), mesh assembly, STL/ZIP writers, and the Blender Python log generator. Also loadable from node. |
| `index.html` | The app: drag-and-drop palette, period editor, keyboard strip, WebGL preview, export. |

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

The spine is 9.84706 mm deep, 7.10039 mm tall, and splits into 1, 2 or 3
stacked layers depending on how many key colours the design uses. Each key's
rear tongue plugs into its own layer:

| layer | z band | tongue |
|---|---|---|
| gray | 0 → 5.08934 | 4.08924 → 5.09074 |
| black | 5.09072 → 6.10034 | 5.08924 → 6.08924 |
| white | 6.07824 → 7.10034 | 6.08924 → 8.62804 |

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
19-note layout at 15-size, or scale a 17 sheet up.

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

## Export

* **Copy Python Log** — puts a complete, runnable Blender script on the
  clipboard. See below.
* **Save design log (.py)** — the same thing as a file.
* **STL** per colour layer, plus the spine and the feet, or all of it as a zip
  (the zip includes the Python log).

### The Python log

Paste it into Blender's Text Editor and press *Run Script*. Structure:

1. A readable header — the datum, the fixed spine↔foot relationship.
2. `DESIGN` — scale, notes per equave, white count, rotation, key count,
   AKM320 units, spine type, and all four derived widths.
3. `TEMPLATE` — the seven-slot period, annotated with slot name, bias and group.
4. `KEYS` — every key on screen, left to right: name, type, x centre, width,
   depth, world X, world Y (back face), world Z (bottom face), and the X of the
   sensor foot it sits over.
5. `SPINE` and `FEET` — halves, layers, screw positions, every foot X.
6. Any warnings on the design, as comments.
7. `build()` — if the current .blend has a **Key Type Categories** collection it
   duplicates those real meshes and places them; otherwise it drops proxy boxes.
   Output goes into a new collection, `Xenachord Generated`.

The duplicate-and-place path has been verified against the drafted 19 Layout:
every axis of every key lands within **0.0004 mm** of the original. Duplicated
categories are scaled in X only, which matches the size law for the outer
envelope; the 0.65 / 1.0 / 1.544 mm edge detailing stretches with it, so re-cut
those by hand before printing.

So the loop is: design here → copy the log → run it in a fresh Blender session
→ adjust → tell me what changed.

---

## Accuracy against the drafting sandbox

All three drafted layouts are reproduced from the size law alone:

| layout | max white-centre error | max slot-centre error |
|---|---|---|
| 15 | 0.00036 mm | 0.00045 mm |
| 17 | 0.00240 mm | 0.00240 mm |
| 19 | 0.00033 mm | 0.00029 mm |

The 17 residual is drift in the sheet itself — its white keys are spaced
27.7081–27.7090 rather than a clean 27.708333, and that accumulates over 24
keys. The app uses the exact value.

The generated *meshes* are parametric reconstructions, not vertex copies: the
outer envelope, top slope, nose ramp, side draft, wall thickness, tongue and
foot datum are all exact, while the hand-modelled interior detailing of the
originals is simplified. For vertex-exact geometry, use the Python log's
duplicate-and-place path.

---

## What this is not

This is a drafting and layout tool, not a finished MIDI controller design. In
particular the **bridge edge-loop that connects the sensor feet (Feet A / Feet
B) to the keys is deliberately not generated** — the feet are drawn as the
reference planes they are in the .blend, sitting at their fixed offset from the
spine, and nothing reaches down to them.
