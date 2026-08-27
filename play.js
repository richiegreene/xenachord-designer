/* =====================================================================
 *  PLAY — the keyboard as an instrument
 * =====================================================================
 *
 * Two jobs, and the second is the reason the first is worth having.
 *
 * THE SYNTH. Engrave's Playback timbre area, brought over whole: the same two
 * families, the same slider over the same four shapes, the same drawn wave,
 * built by the same createTimbrePicker so the list cannot drift. Beneath it an
 * ADSR editor in the same idiom, because the fold that makes the filtered
 * family bright is driven by amplitude — so the envelope is not a level
 * applied to the timbre, it is part of it, and the two belong in one panel
 * drawn one way.
 *
 * WHICH MODE OWNS THE POINTER. A key is two different things depending on
 * what you are doing, and it must never be both at once:
 *
 *   In Design the strip is a drawing you edit. Clicking a key removes it,
 *   dragging its edge resizes it, a gap takes a drop. Nothing sounds.
 *
 *   In Play the keyboard is an instrument. Pressing a key sounds the pitch
 *   Scale/Tuning assigned it and releasing it lets go; nothing about the
 *   arrangement can be changed by touching it, on the strip or in the 3D
 *   view. A stray click cannot cost you a layout.
 *
 * That is enforced here rather than by disabling each design handler in turn:
 * these listeners sit in the capture phase, ahead of every one of them, and in
 * Play they take the event and stop it. One place to read, and no way for a
 * new design handler added later to quietly become reachable from Play.
 * ------------------------------------------------------------------ */

import { createTimbrePicker, FILTERED_MIN } from './synth/timbre.js';
import { drawAdsr, attachAdsrEditor } from './synth/adsr.js';
import * as voice from './synth/voice.js';

const $ = (id) => document.getElementById(id);
const inPlay = () => document.body.classList.contains('mode-play');

const STORE = 'xenachord.synth.v1';
const S = {
  timbre: FILTERED_MIN + 200,          // filtered saw, the default
  adsr: { a: 0.016, d: 0.067, s: 0.38, r: 0.544 },
};
try { Object.assign(S, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} };

/* ---------------------------------------------------------------------
 *  The panel
 * ------------------------------------------------------------------ */

const LINE = '#7ee0c0', AXIS = '#222a34';

const picker = createTimbrePicker(
  { family: $('s-family'), slider: $('s-timbre'), ticks: $('s-ticks'),
    label: $('s-label'), canvas: $('s-wave') },
  {
    value: S.timbre,
    line: LINE,
    axis: AXIS,
    onInput: (v) => { S.timbre = v; voice.setTimbre(v); },
    onChange: save,
  },
);

const adsrEditor = attachAdsrEditor(
  $('s-adsr'),
  () => S.adsr,
  (next) => { S.adsr = next; voice.setAdsr(next); showAdsr(); save(); },
  { line: LINE, axis: AXIS },
);

/** The four numbers under the curve, in the units they are set in. */
function showAdsr() {
  const e = S.adsr;
  const ms = (v) => (v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`);
  $('s-a').textContent = `A ${ms(e.a)}`;
  $('s-d').textContent = `D ${ms(e.d)}`;
  $('s-s').textContent = `S ${Math.round(e.s * 100)}%`;
  $('s-r').textContent = `R ${ms(e.r)}`;
}

voice.setTimbre(S.timbre);
voice.setAdsr(S.adsr);
showAdsr();

/* The two canvases have no size until they are laid out, and the panel starts
 * collapsed — so they are drawn again when the panel actually opens. */
const ro = new ResizeObserver(() => { picker.refresh(); adsrEditor.redraw(); });
ro.observe($('s-wave'));
ro.observe($('s-adsr'));

/* ---------------------------------------------------------------------
 *  Sounding a key
 * ------------------------------------------------------------------ */

/* ---------------------------------------------------------------------
 *  What is sounding
 *
 *  Three things can hold a note down, and they are kept apart because they
 *  come and go independently: a finger, the pedal, and — between them — what
 *  the synth has actually been told. A note stops only when nothing wants it
 *  any more, which is the one rule that makes a pedal a pedal.
 * ------------------------------------------------------------------ */

/** Which pointer is holding which key, so a release lets go of the right one. */
const held = new Map();

/** Notes the pedal caught: let go of by hand, still ringing. */
const sustained = new Set();

/** What the synth currently has on, so it is told only about changes. */
let ringing = new Set();

let pedal = false;

function keyEls(note) {
  return document.querySelectorAll(`#stripInner [data-note="${note}"]`);
}

/**
 * Bring the sound and both displays into line with what is being asked for.
 *
 * Every path goes through here rather than stopping notes itself: with a
 * finger, a pedal and several pointers all able to want the same note, "is
 * anything still asking for this?" is a question about the whole state and
 * cannot be answered from inside one release.
 */
function settle() {
  const want = new Set([...held.values(), ...sustained]);

  for (const n of ringing) if (!want.has(n)) voice.noteOff(n);
  ringing = want;

  for (const el of document.querySelectorAll('#stripInner .sounding')) {
    el.classList.remove('sounding');
  }
  for (const n of want) for (const el of keyEls(n)) el.classList.add('sounding');
  /* The strip takes a class and the 3D view is handed the set to build
   * highlight geometry from — different mechanisms, one list, so a key
   * cannot be blue in one view and not the other. */
  if (typeof window.setSounding === 'function') window.setSounding(want);
}

function press(pointerId, note) {
  if (note == null || held.get(pointerId) === note) return;
  release(pointerId);
  const hz = window.XTuning?.freqs?.[note];
  if (!(hz > 0)) return;
  // Struck again while the pedal was holding it: the finger takes it back,
  // and the note is re-struck rather than left ringing from before.
  sustained.delete(note);
  held.set(pointerId, note);
  voice.noteOn(note, hz);
  settle();
}

function release(pointerId) {
  const note = held.get(pointerId);
  if (note == null) return;
  held.delete(pointerId);
  if (pedal) sustained.add(note);
  settle();
}

function releaseAll() {
  held.clear();
  sustained.clear();
  pedal = false;
  settle();
  voice.allOff();
  ringing = new Set();
}

/* ---------------------------------------------------------------------
 *  Shift is the sustain pedal
 *
 *  Held down, letting go of a key leaves it ringing; let it up and everything
 *  the pedal was holding stops together, exactly as lifting a damper pedal
 *  does. Keys still under a finger are untouched — they are not the pedal's
 *  to release.
 *
 *  Only in Play. In Design, shift is the 3D view's pan modifier and nothing
 *  is sounding for it to hold.
 * ------------------------------------------------------------------ */

function setPedal(down) {
  if (pedal === down) return;
  pedal = down;
  if (!pedal) { sustained.clear(); settle(); }
}

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Shift' && inPlay()) setPedal(true);
});
window.addEventListener('keyup', (ev) => {
  if (ev.key === 'Shift') setPedal(false);
});
/* A pedal cannot be let up on a window that is not listening: leaving the
 * page with it down would come back to a keyboard holding notes with nothing
 * pressing them. */
window.addEventListener('blur', () => setPedal(false));

/* ---------------------------------------------------------------------
 *  The strip, in Play
 * ------------------------------------------------------------------ */

const strip = $('strip');

/**
 * The key under a point.
 *
 * TWO THINGS, IN ORDER. First whatever key the point is actually on, taken
 * off the whole stack rather than off the topmost element — a gap is drawn as
 * a box over the keys and would otherwise swallow every press aimed at what
 * is inside it. The accidental still wins where there is one, being nearest
 * the top of that stack.
 *
 * Then, if the point is on no key at all: the nearest white. The strip draws
 * a gap as a space between two whites, but on the instrument that space is
 * the raised rear the whites weave through and the accidental stands on —
 * there is no hole in the keyboard there, so there should be no dead ground
 * here either. An empty gap, and the margins either side of a key in a filled
 * one, sound the white they are nearer to, which is the key a finger landing
 * there would actually be on.
 */
function noteAt(ev) {
  for (const el of document.elementsFromPoint(ev.clientX, ev.clientY)) {
    if (el.dataset && el.dataset.note != null) return +el.dataset.note;
    if (el.id === 'strip' || el === document.body) break;
  }
  let best = null, bd = Infinity;
  for (const el of document.querySelectorAll('#stripInner .kb-white[data-note]')) {
    const r = el.getBoundingClientRect();
    if (ev.clientY < r.top || ev.clientY > r.bottom) continue;
    const d = ev.clientX < r.left ? r.left - ev.clientX
            : ev.clientX > r.right ? ev.clientX - r.right : 0;
    if (d < bd) { bd = d; best = +el.dataset.note; }
  }
  return best;
}

/* Capture phase, and the event is consumed: in Play nothing downstream of
 * this — the width grips, the click-to-remove, the gap's drop target — ever
 * sees the pointer. */
strip.addEventListener('pointerdown', (ev) => {
  if (!inPlay()) return;
  ev.preventDefault();
  ev.stopPropagation();
  const note = noteAt(ev);
  if (note == null) return;
  try { strip.setPointerCapture(ev.pointerId); } catch (e) {}
  press(ev.pointerId, note);
}, true);

strip.addEventListener('pointermove', (ev) => {
  if (!inPlay() || !held.has(ev.pointerId)) return;
  ev.stopPropagation();
  // Sliding along the keyboard sounds what it passes over, as a finger does.
  const note = noteAt(ev);
  if (note != null) press(ev.pointerId, note);
}, true);

for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  strip.addEventListener(type, (ev) => {
    if (!inPlay()) return;
    ev.stopPropagation();
    release(ev.pointerId);
  }, true);
}

/* A click is dispatched after the pointer sequence and is what the design
 * handlers are actually bound to, so it is stopped in its own right. */
for (const type of ['click', 'dragover', 'drop', 'dragstart']) {
  strip.addEventListener(type, (ev) => {
    if (!inPlay()) return;
    ev.preventDefault();
    ev.stopPropagation();
  }, true);
}

/* ---------------------------------------------------------------------
 *  The 3D view, in Play
 *
 *  Press and hold works here too, which costs one thing: while you are in
 *  Play a drag begun ON a key sounds it rather than orbiting. Orbiting from
 *  anywhere else still works, and an instrument that cannot be held down is
 *  not an instrument.
 * ------------------------------------------------------------------ */

/**
 * What a hit in the 3D view sounds.
 *
 * On a rig the answer is not the key's number on its own device: the same key
 * is note 6 on the lower keyboard and note 7 on the upper one, and the cast
 * knows which unit it landed on. `hit.note` is that reading; the key's own
 * index is the fallback for a single keyboard, where the two are equal.
 */
function noteOfHit(hit) {
  if (!hit) return null;
  if (hit.note != null) return hit.note;
  return hit.ref ? hit.ref.noteIndex : null;
}

window.XPlay = {
  /** @returns true when this press has been taken as a note. */
  press(ev) {
    if (!inPlay() || typeof window.rayPick !== 'function') return false;
    const note = noteOfHit(window.rayPick(ev));
    if (note == null) return false;
    press(ev.pointerId, note);
    return true;
  },
  /** A held press dragged onto another key changes to that key. */
  move(ev) {
    if (!held.has(ev.pointerId) || typeof window.rayPick !== 'function') return false;
    const note = noteOfHit(window.rayPick(ev));
    // Dragged off the keyboard: the note it was on holds, rather than
    // cutting out over the background and coming back on the far side.
    if (note != null) press(ev.pointerId, note);
    return true;
  },
  release(ev) {
    if (!held.has(ev.pointerId)) return false;
    release(ev.pointerId);
    return true;
  },
  releaseAll,
};
