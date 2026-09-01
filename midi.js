/* =====================================================================
 *  MIDI I/O  —  a controller playing the keyboard on the screen
 * =====================================================================
 *
 * A hardware keyboard sends note NUMBERS. This keyboard has no note numbers:
 * it has keys, in a run, and Scale/Tuning says what pitch each one carries.
 * So the whole of the job here is a map from the one to the other, and every
 * decision below is about keeping that map honest.
 *
 * IT IS A RUN, NOT A PIANO. MIDI 60 is middle C only because a piano is laid
 * out in twelves; nothing about the number says twelve. Read as a plain
 * ascending count it maps straight onto an ascending run of keys, one number
 * per key — so a controller's 61 keys become 61 consecutive degrees of
 * whatever division is loaded, and the black notes are degrees like any
 * other. That is the only mapping that does not have to throw pitches away,
 * and it is the one a split-key Cimbalo is played with.
 *
 * WHICH IS WHY AN OCTAVE IS NOT TWELVE. Shifting a controller's octave button
 * moves it by 12, and 12 is a distance this instrument does not have: on a
 * 19-note keyboard, 12 degrees is a bare sixth. An octave here is however
 * many notes it takes to come back to the same pitch class — 17, 19, 34 on an
 * interchanged rig, or the length of a custom JI scale — and the shift moves
 * by exactly that. Shifted up one, the key under your hand sounds an octave
 * higher and every interval you can reach is the interval you could reach
 * before. Shifted by 12 it would not be, which is the whole reason the
 * controller's own octave button is the wrong control for this instrument.
 *
 * AND WHY THE SHIFT IS NOT KEPT HERE. It would have been enough, for MIDI
 * alone, to add 19 to the key number a MIDI note lands on: key 19 is an
 * equave above key 0, so the pitch would come out right. It would also have
 * been a lie — the strip would go on showing the untransposed pitches, a key
 * clicked with the mouse would sound one thing and the same key played from
 * the controller another, and shifting twice would push the top of the
 * controller off the end of a 32-key instrument for no reason.
 *
 * So the shift is a TRANSPOSITION, and it lives in Scale/Tuning where the
 * pitches are settled: XTuning.setEquaveShift moves every key by an equave
 * and relabels the strip. The map from a MIDI number to a KEY never moves —
 * your hand stays where it is on the controller and the whole keyboard stays
 * reachable — and the pitch that comes out is the same pitch the remap would
 * have given. What the panel below owns is the control, not the consequence.
 *
 * WHAT PERMISSION IS FOR. Web MIDI is asked for on a press, never on load:
 * the ports it hands back are every musical device attached to the machine,
 * and a page that reads that list because it happened to be opened has helped
 * itself to something it was not offered. The button is the offer. A session
 * that has already accepted is re-armed quietly on the next load, because
 * having said yes once to this page is what saying yes meant.
 *
 * NOTHING IS SOUNDED HERE. Every note goes through XPlay.midi, which is the
 * same press/release the strip and the 3D view go through — so a MIDI note
 * takes its pitch from the same table, lights the same key, and is caught by
 * the same pedal, by being the same thing rather than by being kept in step
 * with it.
 * ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);

const STORE = 'xenachord.midi.v1';

const M = {
  armed: false,      // has this page been let at the MIDI ports before?
  input: 'all',      // a port id, or every port at once
  origin: 60,        // the MIDI number that plays key 0
  velocity: true,    // let the controller say how hard, or take every note full
};
try { Object.assign(M, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(M)); } catch (e) {} };

/** The transposition, read from the one place that holds it. */
const shift = () => (window.XTuning?.settings?.equaveShift | 0);

let access = null;              // the MIDIAccess, once granted
const bound = new Set();        // ports already listened to, so none is twice

/* ---------------------------------------------------------------------
 *  What the keyboard currently is
 * ------------------------------------------------------------------ */

/** Notes to the equave in the scale as it stands — the size of one shift. */
function equave() {
  const n = window.XTuning?.scaleNotes | 0;
  return n > 1 ? n : 12;
}

/** The lowest and highest key the strip is currently offering, or null when
 *  there is no keyboard yet. */
function range() {
  const f = window.XTuning?.freqs;
  if (!f) return null;
  let lo = Infinity, hi = -Infinity;
  for (const k in f) { const n = +k; if (n < lo) lo = n; if (n > hi) hi = n; }
  return lo <= hi ? [lo, hi] : null;
}

/**
 * The key a MIDI number plays. May be off either end.
 *
 * The octave shift is deliberately absent: it transposes the keys rather than
 * choosing different ones, so this map is fixed and the same 32 keys stay
 * under the same 32 MIDI numbers however far the instrument is moved.
 */
const keyOf = (midi) => midi - M.origin;

/* ---------------------------------------------------------------------
 *  Notes
 * ------------------------------------------------------------------ */

/**
 * Which key each held MIDI note was given.
 *
 * Kept rather than recomputed, because the map can move underneath a held
 * note — the octave shifted, the scale re-read, a key deleted in Design — and
 * a note-off that recomputed would let go of a key the note-on never took,
 * leaving the real one sounding for ever. What went down is what comes up.
 */
const down = new Map();

const idOf = (ch, midi) => `midi:${ch}:${midi}`;

function noteOn(ch, midi, vel) {
  const note = keyOf(midi);
  const r = range();
  if (!r || note < r[0] || note > r[1]) { report(midi, null); return; }
  const id = idOf(ch, midi);
  down.set(id, note);
  window.XPlay?.midi?.press(id, note, M.velocity ? velCurve(vel) : 1);
  report(midi, note);
}

function noteOff(ch, midi) {
  const id = idOf(ch, midi);
  if (!down.has(id)) return;
  down.delete(id);
  window.XPlay?.midi?.release(id);
}

/**
 * 1–127 onto a loudness.
 *
 * Squared rather than straight: MIDI velocity is a blow, and the ear reads
 * amplitude, so a linear map spends most of the range near full and gives a
 * controller almost no quiet end to play in. The floor keeps the lightest
 * touch audible instead of silent.
 */
const velCurve = (v) => 0.08 + 0.92 * Math.pow(Math.min(127, Math.max(1, v)) / 127, 2);

/** Every held note let go of at once — a stuck note, a port unplugged, a
 *  panic. Only MIDI's own notes: a finger on the strip is not this to drop. */
function allNotesOff() {
  for (const id of down.keys()) window.XPlay?.midi?.release(id);
  down.clear();
}

/* ---------------------------------------------------------------------
 *  Reading the wire
 * ------------------------------------------------------------------ */

function onMessage(ev) {
  /* Only from the port being listened to. Every port is bound, and the
   * choice is applied here rather than by binding and unbinding, so a device
   * plugged in while another is selected is ready the moment it is chosen. */
  if (M.input !== 'all' && ev.target && ev.target.id !== M.input) return;

  const d = ev.data;
  if (!d || d.length < 2) return;
  const status = d[0];
  if (status >= 0xF0) return;                 // clock, sensing, sysex: not notes
  const cmd = status & 0xF0, ch = status & 0x0F;

  if (cmd === 0x90 && d[2] > 0) noteOn(ch, d[1], d[2]);
  // Note-off proper, and the note-on-with-zero-velocity that many controllers
  // send instead of one — the same event, and both have to let go.
  else if (cmd === 0x80 || cmd === 0x90) noteOff(ch, d[1]);
  else if (cmd === 0xB0) control(d[1], d[2]);
}

function control(cc, val) {
  if (cc === 64) window.XPlay?.midi?.pedal(val >= 64);   // sustain
  else if (cc === 120 || cc === 123) allNotesOff();      // all sound / notes off
}

/* ---------------------------------------------------------------------
 *  The ports
 * ------------------------------------------------------------------ */

function bindPorts() {
  if (!access) return;
  for (const port of access.inputs.values()) {
    if (bound.has(port.id)) continue;
    bound.add(port.id);
    port.onmidimessage = onMessage;
  }
}

function portName(p) {
  const maker = p.manufacturer && !(p.name || '').includes(p.manufacturer)
    ? ` (${p.manufacturer})` : '';
  return (p.name || 'unnamed input') + maker;
}

function renderPorts() {
  const sel = $('m-in');
  const ports = access ? [...access.inputs.values()] : [];
  sel.innerHTML = `<option value="all">All inputs${
    ports.length ? ` (${ports.length})` : ''}</option>` +
    ports.map((p) => `<option value="${esc(p.id)}">${esc(portName(p))}</option>`).join('');
  // A device unplugged takes its selection with it rather than leaving the
  // list pointing at a port that is not there and silently hearing nothing.
  if (M.input !== 'all' && !ports.some((p) => p.id === M.input)) M.input = 'all';
  sel.value = M.input;
  $('m-none').style.display = ports.length ? 'none' : '';
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/"/g, '&quot;');

/* ---------------------------------------------------------------------
 *  Asking
 * ------------------------------------------------------------------ */

/**
 * @param {boolean} asked  true when a person pressed the button. A quiet
 *   re-arm on load says nothing when it fails: a permission that has lapsed
 *   is not an error to report to somebody who has not asked for anything.
 */
async function arm(asked) {
  if (!navigator.requestMIDIAccess) {
    if (asked) {
      status('warn', 'This browser has no Web MIDI. Chrome, Edge and Opera have it; ' +
        'Safari and Firefox do not.');
    }
    return;
  }
  if (asked) status('', 'Waiting for permission…');
  try {
    // No sysex: nothing here needs to talk to a device's own settings, and
    // asking for it turns a small permission prompt into an alarming one.
    access = await navigator.requestMIDIAccess({ sysex: false });
  } catch (err) {
    if (asked) {
      status('warn', window.isSecureContext === false
        ? 'Web MIDI needs a secure page. Serve this over https or localhost.'
        : `MIDI permission was refused (${err && err.name ? err.name : 'error'}). ` +
          'Allow MIDI for this page in the browser’s site settings, then press again.');
    }
    return;
  }

  M.armed = true;
  save();
  /* Plugged in and unplugged while the page is open: the list is rebuilt and
   * the new port bound, so a controller connected after the fact plays
   * without a reload. */
  access.onstatechange = () => { bindPorts(); renderPorts(); syncUI(); };
  bindPorts();
  renderPorts();
  syncUI();
}

function status(kind, text) {
  const el = $('m-status');
  el.textContent = text;
  el.style.color = kind === 'warn' ? 'var(--warn)'
    : kind === 'ok' ? 'var(--ok)' : 'var(--dim)';
}

/* ---------------------------------------------------------------------
 *  The readout
 * ------------------------------------------------------------------ */

let pending = null, queued = false;

/** What the last note that arrived was taken as — the one place to look when
 *  a controller is plugged in and the wrong pitches are coming out. */
function report(midi, note) {
  pending = { midi, note };
  if (queued) return;
  queued = true;
  // Notes arrive faster than a screen refreshes, and a chord is six of them
  // in a millisecond; the readout is painted once per frame, not per note.
  requestAnimationFrame(() => {
    queued = false;
    const p = pending;
    if (!p) return;
    const el = $('m-last');
    if (p.note == null) {
      el.innerHTML = `<b>${p.midi}</b> &rarr; <span style="color:var(--warn)">` +
        'past the end of the keyboard</span>';
      return;
    }
    const hz = window.XTuning?.freqs?.[p.note];
    el.innerHTML = `<b>${p.midi}</b> &rarr; key <b>${p.note}</b>` +
      (hz > 0 ? ` &middot; ${hz.toFixed(2)} Hz` : '');
  });
}

/* ---------------------------------------------------------------------
 *  The panel
 * ------------------------------------------------------------------ */

function shiftBy(d) {
  const was = shift();
  /* Tuning clamps it and rebuilds the strip, and the rebuild comes back here
   * as a tuning event — so syncUI is not called from here. */
  const now = window.XTuning?.setEquaveShift?.(was + d) ?? was;
  if (now !== was) flashShift();
}

/* The shift can be moved from the keyboard while the panel is not even
 * looked at, so the number says so when it changes. */
function flashShift() {
  const el = $('m-oct-v');
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;      // restart the animation rather than let it run on
  el.classList.add('bump');
}

function syncUI() {
  const on = !!access;
  $('m-arm').style.display = on ? 'none' : '';
  $('m-live').style.display = on ? '' : 'none';
  if (on) {
    const n = access.inputs.size;
    status(n ? 'ok' : '', n
      ? `Listening · ${n} input${n === 1 ? '' : 's'} connected`
      : 'Connected to MIDI — nothing plugged in yet');
  }

  const N = equave(), sh = shift();
  $('m-oct-v').textContent = (sh > 0 ? '+' : '') + sh;
  /* What one press is worth, and — because the shift transposes rather than
   * remaps — what the whole instrument has moved by, in the notes of the
   * scale that is actually loaded. */
  $('m-oct-read').innerHTML =
    `one shift = <b>${N}</b> note${N === 1 ? '' : 's'}` +
    (sh ? ` &middot; whole keyboard <b>${sh > 0 ? '+' : ''}${sh * N}</b> notes` : '');

  const r = range();
  $('m-origin').value = M.origin;
  // Fixed, and it stays fixed under the shift: that is the point of a
  // transposition, and the readout would be lying if it moved.
  $('m-map').innerHTML = r
    ? `MIDI <b>${M.origin + r[0]}</b>&ndash;<b>${M.origin + r[1]}</b> plays keys ` +
      `<b>${r[0]}</b>&ndash;<b>${r[1]}</b>`
    : 'no keys on the keyboard yet';

  $('m-vel').checked = M.velocity;
}

function bind() {
  $('m-arm').onclick = () => arm(true);

  $('m-in').onchange = (ev) => {
    // Notes held on the port being left would never be told to stop.
    allNotesOff();
    M.input = ev.target.value;
    save();
  };

  $('m-oct-up').onclick = () => shiftBy(+1);
  $('m-oct-dn').onclick = () => shiftBy(-1);

  const origin = $('m-origin');
  origin.oninput = () => {
    const v = parseInt(origin.value, 10);
    if (!Number.isFinite(v) || v < 0 || v > 127) return;
    M.origin = v;
    save();
    syncUI();
  };

  $('m-vel').onchange = (ev) => { M.velocity = ev.target.checked; save(); };

  $('m-panic').onclick = () => { allNotesOff(); window.XPlay?.midi?.pedal(false); };

  /* ------------------------------------------------------------------
   *  The arrow keys are the octave
   *
   *  In Play, or with a controller connected in either mode — and not
   *  otherwise, because in Design with nothing plugged in the arrows orbit
   *  the 3D view, which is what they have always done and what they should
   *  go on doing for somebody who is not playing anything. ← and → are left
   *  orbiting throughout: the transposition needs two keys, not four.
   *
   *  Capture phase, and the event is stopped: the view's own handler sits on
   *  the window in the bubble phase and would otherwise tilt the camera on
   *  every shift.
   * --------------------------------------------------------------- */
  window.addEventListener('keydown', (ev) => {
    if (!access && !document.body.classList.contains('mode-play')) return;
    if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    // Inside a field the arrows belong to the field — stepping a number,
    // moving a caret through the custom scale.
    const el = document.activeElement;
    if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    ev.preventDefault();
    ev.stopPropagation();
    shiftBy(ev.key === 'ArrowUp' ? +1 : -1);
  }, true);

  /* Everything the panel reads is settled by a tuning pass: the size of a
   * shift, the transposition itself, the keys there are to land on. One
   * event, so the panel cannot be a pass behind what the strip is showing. */
  window.addEventListener('xenachord:tuning', () => syncUI());

  /* Leaving the page with keys held: the note-offs would arrive at a window
   * that is not listening, and come back to a chord nobody is playing. */
  window.addEventListener('blur', allNotesOff);

  /* Everything dropped from the other end — leaving Play does it. What is
   * held here is only a record of what was pressed, so it is forgotten
   * rather than released a second time. */
  window.addEventListener('xenachord:allnotesoff', () => down.clear());
}

bind();
syncUI();
status('', 'Not connected.');
/* Said yes before: taken up again without asking a second time. Quietly —
 * a permission that has since been withdrawn leaves the button, not a
 * complaint about something nobody just did. */
if (M.armed) arm(false);
