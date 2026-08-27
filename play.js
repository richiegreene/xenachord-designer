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
  adsr: { a: 0.008, d: 0.12, s: 0.7, r: 0.25 },
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

/** Which pointer is holding which key, so a release lets go of the right one. */
const held = new Map();

function keyEls(note) {
  return document.querySelectorAll(`#stripInner [data-note="${note}"]`);
}

function press(pointerId, note) {
  if (note == null || held.get(pointerId) === note) return;
  release(pointerId);
  const hz = window.XTuning?.freqs?.[note];
  if (!(hz > 0)) return;
  held.set(pointerId, note);
  voice.noteOn(note, hz);
  for (const el of keyEls(note)) el.classList.add('sounding');
}

function release(pointerId) {
  const note = held.get(pointerId);
  if (note == null) return;
  held.delete(pointerId);
  // Only stop the note if no other finger is still on that same key.
  if (![...held.values()].includes(note)) {
    voice.noteOff(note);
    for (const el of keyEls(note)) el.classList.remove('sounding');
  }
}

function releaseAll() {
  for (const id of [...held.keys()]) release(id);
  voice.allOff();
  for (const el of document.querySelectorAll('#stripInner .sounding')) {
    el.classList.remove('sounding');
  }
}

/* ---------------------------------------------------------------------
 *  The strip, in Play
 * ------------------------------------------------------------------ */

const strip = $('strip');

/** The key under a point — the accidental wins, being drawn on top. */
function noteAt(ev) {
  const el = document.elementFromPoint(ev.clientX, ev.clientY);
  const key = el && el.closest('[data-note]');
  return key ? +key.dataset.note : null;
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

window.XPlay = {
  /** @returns true when this press has been taken as a note. */
  press(ev) {
    if (!inPlay() || typeof window.rayPick !== 'function') return false;
    const hit = window.rayPick(ev);
    const note = hit && hit.ref ? hit.ref.noteIndex : null;
    if (note == null) return false;
    press(ev.pointerId, note);
    return true;
  },
  release(ev) {
    if (!held.has(ev.pointerId)) return false;
    release(ev.pointerId);
    return true;
  },
  releaseAll,
};
