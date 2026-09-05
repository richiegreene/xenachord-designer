/*
 * PARITY HARNESS — does the generated Blender log still build the browser's
 * meshes?  pythonLog() writes a PARITY dict of per-object checksums taken off
 * model.js's own triangles, and the generated builder recomputes each as it
 * goes; if the two have drifted the log dies in Blender on the first object
 * that differs.  That is a bad place to find out.
 *
 * This writes a log per design into a scratch directory; _verify_parity.py
 * runs one under a stubbed bpy and reports whether every object matched AND
 * that every object built was actually covered by a PARITY entry.
 *
 *   node _verify_parity.js /tmp/xd
 *   for f in /tmp/xd/*.py; do python3 _verify_parity.py "$f"; done
 *
 * The designs below cover all three spine kinds (one / two / three colours),
 * which is what the spine builder branches on.
 */
const path = require('path');
const fs = require('fs');
const XD = require(path.join(__dirname, 'core.js'));

const dir = process.argv[2] || '.';
fs.mkdirSync(dir, { recursive: true });

const designs = [];
for (const edo of [15, 17, 19]) designs.push(['preset' + edo, XD.presetDesign(edo)]);
designs.push(['cleared', XD.clearedDesign(0)]);          // whites only -> "one"
const uniform = {
  black: ['Full Sized Black'],
  gray: ['Full Sized Gray'],
  splitblack: ['Split Black First', 'Split Black Second'],
  splitgray: ['Split Gray First', 'Split Gray Second'],
  mixed: ['Split Gray First', 'Split Black Second'],
};
for (const [nm, val] of Object.entries(uniform)) {
  const d = XD.presetDesign(17);
  for (const k of Object.keys(d.slots)) d.slots[k] = val.slice();
  designs.push(['uniform_' + nm, d]);
}

for (const [nm, d] of designs) {
  const L = XD.computeLayout(d);
  fs.writeFileSync(path.join(dir, nm + '.py'), XD.pythonLog(L));
  console.log(nm, '\tlayers', L.layers, '\tspine', L.spineKind, '\tnotes', L.total);
}
