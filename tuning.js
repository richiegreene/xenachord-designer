/* =====================================================================
 *  SCALE / TUNING  —  what pitch each key carries
 * =====================================================================
 *
 * Design says how the keyboard is ARRANGED; this says what it SOUNDS.  The
 * two are kept apart on purpose: a layout is a run of 32 keys with an equave
 * measured off the first seven whites and the gaps among them, and nothing in
 * it knows a frequency.  Here that run is handed a scale — an equal division
 * or a list of ratios — and every key comes away with a pitch, a name, and
 * the enumeration it already had to hang them on. A key shows one of the two
 * at a time: its position while you are in Design, its pitch while you are in
 * Play, because both at once is two numbers in twenty pixels.
 *
 * THE NOTATION IS NOT REIMPLEMENTED.  The spellers under ./notation are the
 * Notation app's own engines, copied across whole: the same Ups-and-Downs
 * table, the same C-anchored HEJI speller and the same Sagittal calculator,
 * drawing the same glyphs out of the same fonts at the same sizes the Tuner
 * draws them.  A name spelled here is the name that app would spell.
 *
 * WHAT A ROTATION IS.  Not a transposition and not a re-ordering: the scale
 * keeps its degrees in their order and keeps their frequencies, and the whole
 * run slides along the keyboard, so a different degree comes to rest under
 * key 0.  Sliding by a whole scale carries you up an equave, which is why the
 * offset is read as a signed index into an infinite ascending run rather than
 * folded first — key 0 at rotation N is an octave above key 0 at rotation 0.
 *
 * The pitches this settles are held on window.XTuning.freqs, keyed by the
 * enumeration, because sounding them is Play's next job and it will want them
 * without having to ask the strip.
 */

import {
  buildJiScale, edoName, hejiName, sagittalSpellings, ratioMonzo,
} from './notation/tuner-notation.js';

const $ = (id) => document.getElementById(id);
const mod = (n, m) => ((n % m) + m) % m;

const STORE = 'xenachord.tuning.v1';

const T = {
  nominal: 1, acc: 1, oct: 4,     // 1/1 is written C natural 4 ...
  hz: 261.6256,                   // ... and sounds here
  system: 'edo',
  edoRead: 'updown',
  edoHalves: 'exclude',
  edoRot: 0,
  jiRead: 'heji',
  sagPrecision: 'medium',
  sagFlavour: 'revo',
  scale: '1/1 9/8 5/4 4/3 3/2 5/3 15/8',
  jiRot: 0,
};

try { Object.assign(T, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
// Johnston was offered once and is not any more; a session that chose it comes
// back to the default rather than to a toggle with nothing pressed.
if (T.jiRead === 'johnston') T.jiRead = 'heji';
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(T)); } catch (e) {} };

const NOMINALS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const ACCS = ['♭', '♮', '♯'];

/* ---------------------------------------------------------------------
 *  The scale
 * ------------------------------------------------------------------ */

/**
 * How many notes there are in the scale before it repeats.
 *
 * Design's own control, read rather than asked for again: the EDO and the
 * arrangement are the same number, and a keyboard that repeats every N notes
 * has nowhere to put an N+1th degree.
 */
function equaveNotes() {
  const n = (typeof window.periodNow === 'function') ? window.periodNow() : 32;
  return ((n > 1) ? n : 32) * stackDepth();
}

/**
 * How many AKM320s deep the rig is stacked — 1, or 2.
 *
 * A stacked rig is not a second copy of the scale, it is the same equave read
 * twice as finely: the lower unit takes the even steps and the upper one the
 * odd steps between them, so two 17-note layouts standing one above the other
 * ARE 34-EDO. That has to be settled here rather than in the rig's geometry,
 * because it is the one thing about standing two devices together that
 * changes what the keys SOUND. Without it the interleaved numbering would
 * fold back into the design's own 17 and every key on the lower keyboard
 * would change pitch, which is precisely the reading the stack denies.
 *
 * Side-by-side is deliberately not here: setting a second unit beside the
 * first extends the register 32 notes higher and leaves the division alone.
 */
function stackDepth() {
  const d = (typeof window.rigStack === 'function') ? window.rigStack() : 1;
  return d > 1 ? d : 1;
}

/** The JI degrees, folded into one octave and sorted, as the Tuner builds them. */
function jiDegrees() {
  return buildJiScale('custom', { custom: T.scale });
}

/**
 * What key `i` carries.
 *
 * `slot` walks the scale from key 0 with the rotation applied; the degree is
 * that position folded into the scale and the equave is how many times it
 * wrapped, so pitch stays monotonic along the keyboard however far it is
 * rotated.
 */
function pitchOf(i, ji) {
  if (T.system === 'edo') {
    const N = equaveNotes();
    const slot = i + T.edoRot;
    const step = mod(slot, N), equave = Math.floor(slot / N);
    return { kind: 'edo', step, equave, edo: N,
             hz: T.hz * Math.pow(2, step / N + equave) };
  }
  const M = ji.length;
  if (!M) return null;
  const slot = i + T.jiRot;
  const deg = mod(slot, M), equave = Math.floor(slot / M);
  const d = ji[deg];
  return { kind: 'ji', deg, equave, num: d.num, den: d.den, supported: d.supported,
           hz: T.hz * (d.num / d.den) * Math.pow(2, equave) };
}

/* ---------------------------------------------------------------------
 *  The name that pitch is written with
 * ------------------------------------------------------------------ */

function nameHtml(p) {
  if (!p) return '';
  if (p.kind === 'edo') {
    if (T.edoRead === 'step') return String(p.step);
    const sp = edoName(p.step, p.edo, {
      showEnh: false,
      excludeHalves: T.edoHalves === 'exclude',
    }).spellings[0];
    if (!sp) return '';
    return `<span class="edo-name">${esc(sp.base)}${esc(sp.acc)}</span>`;
  }
  if (T.jiRead === 'ratio') return `${p.num}/${p.den}`;
  if (!p.supported) return `${p.num}/${p.den}`;   // outside the 89-limit: unspellable
  const monzo = ratioMonzo(p.num, p.den);
  if (T.jiRead === 'heji') {
    const n = hejiName(monzo);
    return n ? `${letter(n.letter)}${n.html}` : `${p.num}/${p.den}`;
  }
  const sp = sagittalSpellings(p.num, p.den, {
    precision: T.sagPrecision,
    useEvo: T.sagFlavour === 'evo',
    useUnicode: true,      // the glyph, never the ASCII transliteration
    showEnh: false,
  })[0];
  if (!sp) return `${p.num}/${p.den}`;
  return `${letter(sp.letter)}<span class="sag-symbol">${sp.symbol}</span>`;
}

/** Plain text for a tooltip, where the glyph fonts cannot reach. */
function nameText(p) {
  if (!p) return '';
  if (p.kind === 'edo') return `step ${p.step} of ${p.edo}` +
    (p.equave ? ` ${p.equave > 0 ? '+' : ''}${p.equave} equave` : '');
  return `${p.num}/${p.den}` +
    (p.equave ? ` ${p.equave > 0 ? '+' : ''}${p.equave} equave` : '');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* The nominal is set in Inter beside the glyph fonts, as it is in the Tuner —
 * not in whatever the strip happens to be set in. */
const letter = (s) => `<span class="tune-letter">${esc(s)}</span>`;

/* ---------------------------------------------------------------------
 *  Writing it onto the keyboard
 * ------------------------------------------------------------------ */

/**
 * Put a name inside every key of the strip.
 *
 * Called by buildStrip, which tears the strip down and builds it again from
 * the layout — so this both labels the keys and settles the frequency table,
 * and there is exactly one place where the two can fall out of step.
 */
function label() {
  const inner = document.getElementById('stripInner');
  if (!inner) return;
  /* Both rotations are folded before anything is computed off them, so what
   * the readout shows and what the keys carry can never be a pass apart. */
  const ji = jiDegrees();
  T.edoRot = mod(T.edoRot, equaveNotes());
  if (ji.length) T.jiRot = mod(T.jiRot, ji.length);
  syncUI(ji);
  const freqs = {};

  for (const el of inner.querySelectorAll('[data-note]')) {
    const i = +el.dataset.note;
    const p = pitchOf(i, ji);
    if (!p) continue;
    freqs[i] = p.hz;
    const span = document.createElement('span');
    span.className = 'kb-tune';
    span.innerHTML = nameHtml(p);
    el.appendChild(span);
    /* The title the key already carries says what it IS; this says what it
     * sounds. Appended rather than replaced so neither answer is lost. */
    el.title = (el.title ? el.title + '  ·  ' : '') +
      `${nameText(p)} · ${p.hz.toFixed(4)} Hz`;
  }
  window.XTuning.freqs = freqs;
  window.XTuning.notesEq = equaveNotes();
}

/**
 * Every control here comes through, and so does every rebuild of the layout.
 *
 * The strip is rebuilt rather than patched: a label lives inside the key it
 * names, and building the strip is the only thing that knows where the keys
 * are. buildStrip calls label on its way out, so this is one path, not two.
 */
function refresh() {
  save();
  if (typeof window.buildStrip === 'function') window.buildStrip();
  else label();
}

/* ---------------------------------------------------------------------
 *  Controls
 * ------------------------------------------------------------------ */

/** A segmented button group: pressing one turns the others off. */
function seg(id, key, after) {
  const box = $(id);
  if (!box) return;
  for (const b of box.querySelectorAll('button')) {
    b.classList.toggle('on', b.dataset.v === T[key]);
    b.onclick = () => {
      T[key] = b.dataset.v;
      for (const o of box.querySelectorAll('button')) o.classList.toggle('on', o === b);
      if (after) after();
      refresh();
    };
  }
}

/** What the controls say, brought back into step with what T holds. */
function syncUI(ji) {
  $('t-ref').textContent = NOMINALS[T.nominal] + ACCS[T.acc] + T.oct;
  $('t-edo').style.display = T.system === 'edo' ? '' : 'none';
  $('t-ji').style.display = T.system === 'ji' ? '' : 'none';
  $('t-sag').style.display = (T.system === 'ji' && T.jiRead === 'sagittal') ? '' : 'none';
  // The halves are a question about ups-and-downs spelling; a bare step number
  // has no accidental for the answer to land on.
  $('t-edo-halves').style.display = (T.edoRead === 'updown') ? '' : 'none';

  $('t-edo-n').textContent = equaveNotes();
  /* Where the number came from, when it is no longer just Design's own: the
   * stack doubled it, and that is worth saying beside it. */
  const rows = stackDepth(), base = equaveNotes() / rows;
  $('t-edo-rig').innerHTML = rows > 1
    ? `, <b>${base}</b> &times; <b>${rows}</b> stacked keyboards` : '';
  $('t-edo-rot-v').textContent = T.edoRot;
  $('t-ji-rot-v').textContent = T.jiRot;
  $('t-scale-read').innerHTML = ji.length
    ? `<b>${ji.length}</b> degree${ji.length === 1 ? '' : 's'} &mdash; ` +
      ji.map((d) => `${d.num}/${d.den}`).join(' ')
    : '<span style="color:var(--warn)">no ratios read from that scale</span>';
}

function bind() {
  for (const [id, key, cast] of [
    ['t-nominal', 'nominal', Number], ['t-acc', 'acc', Number],
    ['t-oct', 'oct', Number], ['t-system', 'system', String],
    ['t-sag-precision', 'sagPrecision', String],
  ]) {
    const el = $(id);
    el.value = String(T[key]);
    el.onchange = () => { T[key] = cast(el.value); refresh(); };
  }

  const hz = $('t-hz');
  hz.value = T.hz;
  hz.oninput = () => {
    const v = parseFloat(hz.value);
    if (isFinite(v) && v > 0) { T.hz = v; refresh(); }
  };

  const scale = $('t-scale');
  scale.value = T.scale;
  scale.oninput = () => { T.scale = scale.value; refresh(); };

  seg('t-edo-seg', 'edoRead');
  seg('t-edo-halves', 'edoHalves');
  seg('t-ji-seg', 'jiRead');
  seg('t-sag-flavour', 'sagFlavour');

  const rot = (id, key, span) => {
    $(id).onclick = () => { T[key] += span; refresh(); };
  };
  rot('t-edo-rot-up', 'edoRot', +1);
  rot('t-edo-rot-dn', 'edoRot', -1);
  rot('t-ji-rot-up', 'jiRot', +1);
  rot('t-ji-rot-dn', 'jiRot', -1);
}

window.XTuning = { label, refresh, settings: T, freqs: {}, notesEq: 32 };
bind();
/* The module is deferred, so the layout is already standing by the time it
 * runs and the strip has been built once without any names on it. */
refresh();
