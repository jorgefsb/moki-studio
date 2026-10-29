// Secuenciador del tema (AUDIO.md §4): un solo contador de pasos módulo 512 con lookahead; las capas de energía
// son nodos de ganancia que cambian solo en el límite de compás. Recibe (ctx, bus): sirve igual con OfflineAudioContext.
import { STEP, BAR_STEPS, LOOP_STEPS, SKELETON, CHORD_OF_BAR, MELODY, CHORDS } from './theme.js';
import { carton, cuadrada, pulso, bajo, tok, shaker, tic, campana } from './voices.js';

const LOOKAHEAD = 0.12;
const TICK_MS = 25;

export function createMusic(ctx, bus, opts = {}) {
  const S = {
    step: 0,
    nextTime: 0,
    running: false,
    timer: null,
    target: opts.level || 0,
    layerOn: [true, false, false, false],
    layerOffUntil: [0, 0, 0, 0],
    reduced: !!opts.reduced,
    fixed: opts.level !== undefined, // render offline: grados fijos desde el primer paso
  };
  if (S.fixed) for (let k = 1; k <= 3; k++) S.layerOn[k] = S.target >= k;
  const rnd = (a) => (Math.random() * 2 - 1) * a;

  const rampSec = () => (S.reduced ? 1.5 : 0.4);

  // Cambia las capas solo al inicio de compás, con rampa en la ganancia de cada voz nueva
  function applyLevel(time) {
    if (S.fixed) return;
    for (let k = 1; k <= 3; k++) {
      const want = S.target >= k;
      if (want === S.layerOn[k]) continue;
      const g = bus.layer[k].gain;
      g.cancelScheduledValues(time);
      g.setValueAtTime(g.value, time);
      g.linearRampToValueAtTime(want ? 1 : 0, time + rampSec());
      S.layerOn[k] = want;
      if (!want) S.layerOffUntil[k] = time + rampSec() + 0.2;
    }
  }

  function scheduleStep(step, time) {
    const bar = Math.floor(step / BAR_STEPS) % 32;
    const s = step % BAR_STEPS;
    if (s === 0) applyLevel(time);
    const live = (k) => S.layerOn[k] || S.layerOffUntil[k] > time;
    const jit = S.reduced ? 0 : rnd(0.006); // desfase de ±6 ms (se quita en movimiento reducido)
    const t = Math.max(time + jit, ctx.currentTime);
    const echo = bus.echoIn;
    const chord = CHORDS[CHORD_OF_BAR[bar]];
    const mix = bus.musicMix;
    const skel = SKELETON.includes(s);

    // --- melodía ---
    const m = MELODY[bar];
    for (const [st, midi, len] of m.notes) {
      if (st !== s) continue;
      const vel = (skel ? 0.85 : 0.6) * (1 + rnd(0.06));
      const dur = len * 0.8 * STEP;
      if (m.voice === 'carton') carton(ctx, mix, t, midi, dur, 0.3 * vel, { echo, send: 0.5 });
      else cuadrada(ctx, mix, t, midi, dur, 0.14 * vel, { echo, send: 0.5 });
      if (m.layer2 && live(2)) cuadrada(ctx, bus.layer[2], t, midi, dur, 0.14 * 0.35, { echo, send: 0.5 });
      if (m.aSection && live(2)) cuadrada(ctx, bus.layer[2], t, midi + 12, dur, 0.14 * 0.3, { echo, send: 0.5 });
    }

    // --- base: bajo, tok, shaker ---
    if (s === 0) bajo(ctx, mix, t, chord[0], 6 * STEP, 0.38);
    if (s === 10) bajo(ctx, mix, t, chord[0], 2 * STEP, 0.3);
    if (s === 0) tok(ctx, mix, t, 0.3);
    if (s === 8) tok(ctx, mix, t, 0.22);
    if (s === 2 || s === 6 || s === 10 || s === 14) shaker(ctx, mix, t, 0.08);

    // --- E1: acorde de pulso corto, tic y arpegio en corcheas ---
    if (live(1)) {
      const L = bus.layer[1];
      if (s === 4 || s === 12) {
        chord[2].slice(0, 3).forEach((n, i) => pulso(ctx, L, t + i * 0.014, n, 0.047));
        tic(ctx, L, t, 0.1);
      }
      if (s % 2 === 0) {
        const i = (s / 2) % 4;
        pulso(ctx, L, t, chord[2][i] + (s % 4 === 2 ? 12 : 0), 0.1);
      }
    }
    // --- E2: bajo en el esqueleto, shaker a semicorcheas, tok extra ---
    if (live(2)) {
      const L = bus.layer[2];
      if ([3, 8, 11].includes(s)) bajo(ctx, L, t, chord[0], 2 * STEP, 0.3);
      if (s === 6 || s === 14) bajo(ctx, L, t, chord[1], 2 * STEP, 0.3);
      if (s === 4 || s === 12) tok(ctx, L, t, 0.18);
      if (![2, 6, 10, 14].includes(s)) shaker(ctx, L, t, s % 2 ? 0.05 : 0.08);
    }
    // --- E3: campanitas, tics y un golpe más de pulso ---
    if (live(3)) {
      const L = bus.layer[3];
      if ([2, 5, 9, 13].includes(s)) {
        const n = chord[2][(s + bar) % 4];
        campana(ctx, L, t, 84 + (n % 12), 0.1, { echo, send: 0.5 });
      }
      if (s === 6 || s === 14) tic(ctx, L, t, 0.1);
      if (s === 10) chord[2].slice(0, 3).forEach((n, i) => pulso(ctx, L, t + i * 0.014, n, 0.033));
    }
  }

  function tick() {
    while (S.nextTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(S.step % LOOP_STEPS, S.nextTime);
      S.nextTime += STEP;
      S.step += 1;
    }
  }

  return {
    state: S,
    scheduleStep,
    bar: () => Math.floor((S.step % LOOP_STEPS) / BAR_STEPS),
    setTarget(n) {
      S.target = n;
    },
    setReduced(v) {
      S.reduced = v;
    },
    // fromStart: arranca limpio en el paso 0 (primer salto, no a media frase); si no, sigue del mismo paso
    start(fromStart) {
      if (S.running) return;
      S.running = true;
      if (fromStart) S.step = 0;
      S.nextTime = ctx.currentTime + 0.06;
      tick();
      S.timer = setInterval(tick, TICK_MS);
    },
    stop() {
      S.running = false;
      if (S.timer) clearInterval(S.timer);
      S.timer = null;
    },
  };
}
