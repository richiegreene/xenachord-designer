# Xenachord Cimbalo Cromatico Designer

A self-contained web app for designing microtonal split-key ("cimbalo cromatico")
replacement keyboards for the **midiplus AKM320** and exporting them as
3D-printable STL files.

**To use it: open `index.html` in any browser.** No server, no internet, no
dependencies — everything (3D preview, geometry, STL/ZIP export) runs locally.

## What it makes

Six printable pieces per design, exactly like the original Cimbalo Cromatico
[17] and [19] kits:

| piece | what it is |
|---|---|
| `white A/B` | bottom layer — naturals, spine plate 0.0–1.9 mm |
| `gray A/B`  | middle layer — front (low, tucked-in) split keys, spine 2.39–3.76 mm |
| `black A/B` | top layer — rear (tall) split keys, spine 4.26–6.66 mm |

All AKM320-critical geometry is fixed and measured from the working originals:

- 32 sensor pads at **11.30 mm** pitch (10.4 × 9.0 mm pads, contact at Z 1.4 mm,
  interlock row top at Z 10.6 mm)
- 16 screw slots at the AKM320 PCB standoff positions
- spine back-edge clearance notch at X 290.4–317.5
- A/B split so both halves fit a typical printer bed

## Controls

- **Notes per equave** — where the key pattern repeats (e.g. 17, 19, 12, 24).
- **Key type per degree** — click a degree chip to cycle
  white → black → gray. Black = rear tall split key (sharp in the originals);
  gray = front low split key (flat). A black+gray pair on adjacent degrees
  recreates the classic split accidental; a lone gray makes a tucked-in single
  key like the 19-tone B♯/C♭.
- **Rotate pattern** — which degree lands on the leftmost sensor (the originals
  start on E).
- **A/B split** — where the keyboard divides into two printable halves.
- Warnings appear for layouts that would truncate, collide, or fuse keys.

## Printing & assembly

Export the six STLs (or the ZIP), print each piece flat side down, and follow
the original *Cimbalo [17 and 19] Build Instructions* PDF: stack the combs
white → gray → black so their square pads interlock into one straight row over
the sensors, then fasten with the AKM320's silver screws, tightening gradually
while testing velocity. Pieces are exported in assembled position, in mm.

Like the originals, each piece is a union of overlapping simple solids — the
slicer fuses them automatically (tested convention from the source STLs).

## Files

- `index.html` — the app (UI, WebGL preview, 2D plan, export)
- `core.js` — measured constants + layout engine + mesh generator + STL/ZIP
  writers; also loadable from node (`require('./core.js')`) for scripting.
