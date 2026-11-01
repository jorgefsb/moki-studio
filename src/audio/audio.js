// Fachada del audio (AUDIO.md §2, §3 y §10): único punto de entrada para el juego.
// Nada suena antes del primer gesto: no se crea ningún AudioContext al cargar. Todo es síntesis en Web Audio.
import { CONFIG as C } from '../config.js';
import { load, save } from '../storage.js';
import { STEP, TRAMO_LEVEL, streakLevel } from './theme.js';
import { createMusic } from './music.js';
import { SFX, STINGERS } from './sfx.js';

const Q = new URLSearchParams(window.location.search);
const DEBUG = Q.get('audiodebug') === '1';

// Cadena (AUDIO §3):
//   música -> musicMix -> musicFilter -> duckGain -> musicBus ─┐
//   efectos -> sfxMix -> sfxBus ───────────────────────────────┴-> master (0.125) -> compresor -> destino
const REWARD = new Set(['pickup', 'amber', 'arc']);

// Encime de efectos (T3g2). Los picos de sesión no salían de un sonido solo, sino de piezas con racha + arco, o salto + piezas + bip.
// En vez de bajarlos todos: (1) el ping nuevo hace que el anterior ceda (baja a cfg.yield) y el arco completo reemplaza al último ping;
// (2) cada recompensa baja el canal de movimiento (cfg.duck) 200 ms. Sirve igual con cualquier AudioContext (el juego y el render offline).
export function routeSfx(ctx, bus, st, name, play, t, o, cfg = C.audio) {
  const reward = REWARD.has(name);
  const vg = ctx.createGain();
  vg.connect(reward ? bus.rewardCh : bus.motionCh);
  // el eco de cada voz sale por su propia ganancia, para que ceda junto con la voz (si no, los ecos de los pings se siguen sumando)
  const eg = ctx.createGain();
  if (o && o.echo) eg.connect(o.echo);
  if (reward) {
    const prev = st.lastReward;
    if (prev && t - prev.t < 0.35) {
      for (const g of [prev.vg, prev.eg]) {
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(name === 'arc' ? 0 : cfg.yield, t, 0.012);
      }
    }
    st.lastReward = { vg, eg, t };
    const m = bus.motionCh.gain;
    m.cancelScheduledValues(t);
    m.setTargetAtTime(cfg.duck, t, 0.01);
    m.setTargetAtTime(1, t + 0.2, 0.08);
  }
  play(ctx, vg, t, o && o.echo ? { ...o, echo: eg } : o);
}

export function createBuses(ctx, cfg = C.audio) {
  const master = ctx.createGain();
  master.gain.value = cfg.master;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -8;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.12;
  master.connect(comp);
  comp.connect(ctx.destination);

  const sfxMix = ctx.createGain();
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = cfg.sfxBus;
  // Limitador de efectos (T3g2): deja pasar los sonidos sueltos (el salto marca el techo) y solo actúa sobre las pilas
  // (piezas con racha + arco, salto + piezas + bip). Va antes del bus de efectos, así que no toca la música ni el master.
  const sfxLim = ctx.createDynamicsCompressor();
  sfxLim.threshold.value = cfg.limitDb;
  sfxLim.knee.value = cfg.limitKnee;
  sfxLim.ratio.value = cfg.limitRatio;
  sfxLim.attack.value = 0.003;
  sfxLim.release.value = 0.09;
  // el compresor de Web Audio sube solo la señal (+3.8 dB con umbral -8, ratio 10): se compensa para que los sonidos sueltos no cambien
  const limComp = ctx.createGain();
  limComp.gain.value = cfg.limitMakeup;
  sfxMix.connect(sfxLim);
  sfxLim.connect(limComp);
  limComp.connect(sfxBus);
  // Dos canales de efectos (T3g2): la recompensa (pieza, ámbar, arco) y el movimiento (salto, bip, aterrizaje, tropiezo, botón).
  // Cada efecto pasa por su propia ganancia, para poder cederse el paso entre ellos sin bajar el nivel de ninguno por separado.
  const rewardCh = ctx.createGain();
  const motionCh = ctx.createGain();
  rewardCh.connect(sfxMix);
  motionCh.connect(sfxMix);
  sfxBus.connect(master);

  const musicMix = ctx.createGain();
  const musicFilter = ctx.createBiquadFilter();
  musicFilter.type = 'lowpass';
  musicFilter.frequency.value = 8000;
  const duckGain = ctx.createGain();
  const musicBus = ctx.createGain();
  musicBus.gain.value = cfg.musicBus;
  musicMix.connect(musicFilter);
  musicFilter.connect(duckGain);
  duckGain.connect(musicBus);
  musicBus.connect(master);

  // capas de energía E1 a E3: ganancias que suben en el límite de compás
  const layer = [null, 1, 2, 3].map((k) => {
    if (!k) return null;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(musicMix);
    return g;
  });

  // eco cálido sincronizado (3 pasos): lowpass 1.8 kHz y highpass 180 Hz dentro del lazo, realimentación 0.25
  const echoIn = ctx.createGain();
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 3 * STEP;
  const elp = ctx.createBiquadFilter();
  elp.type = 'lowpass';
  elp.frequency.value = 1800;
  const ehp = ctx.createBiquadFilter();
  ehp.type = 'highpass';
  ehp.frequency.value = 180;
  const fb = ctx.createGain();
  fb.gain.value = cfg.echoFeedback;
  const wet = ctx.createGain();
  wet.gain.value = cfg.echoWet;
  echoIn.connect(delay);
  delay.connect(elp);
  elp.connect(ehp);
  ehp.connect(fb);
  fb.connect(delay);
  ehp.connect(wet);
  wet.connect(musicMix);

  // Eco de los stingers: mismo lazo, pero su salida va a sfxMix (el duck de la música no se la come)
  const stingerEcho = ctx.createGain();
  const sDelay = ctx.createDelay(1);
  sDelay.delayTime.value = 3 * STEP;
  const sLp = ctx.createBiquadFilter();
  sLp.type = 'lowpass';
  sLp.frequency.value = 1800;
  const sHp = ctx.createBiquadFilter();
  sHp.type = 'highpass';
  sHp.frequency.value = 180;
  const sFb = ctx.createGain();
  sFb.gain.value = cfg.echoFeedback;
  const sWet = ctx.createGain();
  sWet.gain.value = cfg.echoWet;
  stingerEcho.connect(sDelay);
  sDelay.connect(sLp);
  sLp.connect(sHp);
  sHp.connect(sFb);
  sFb.connect(sDelay);
  sHp.connect(sWet);
  sWet.connect(sfxMix);

  return { master, comp, sfxMix, sfxBus, rewardCh, motionCh, stingerEcho, musicMix, musicFilter, duckGain, musicBus, layer, echoIn, fb, echoWet: wet };
}

const prefMuted = () => load('moki.sound', '1') === '0' || Q.get('sound') === '0';

const A = {
  ctx: null,
  bus: null,
  music: null,
  state: 'title', // title | tutorial | playing | paused | dead | finished
  muted: prefMuted(),
  reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  juice: C.juice,
  tramoLevel: 0,
  streakN: 0,
  streakEff: 0,
  streakHold: 0,
  streakTimer: null,
  busyUntil: 0,
  busyPrio: 0,
  hidden: false,
  listeners: new Set(),
  pauseTimer: null,

  get unlocked() {
    return !!this.ctx;
  },
  get running() {
    return !!this.ctx && this.ctx.state === 'running';
  },
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  emit() {
    this.listeners.forEach((fn) => fn(this.muted));
  },
  log(...a) {
    if (DEBUG) console.log('[audio]', ...a);
  },

  // Primer gesto: crea el contexto, construye los buses y arranca (si no está silenciado)
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.bus = createBuses(this.ctx);
      this.music = createMusic(this.ctx, this.bus, { reduced: this.reduced });
      this.bus.duckGain.gain.value = 0;
      if (this.papelName) this.setPapel(this.papelName); // papel elegido antes del gesto
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        this.reduced = e.matches;
        if (this.music) this.music.setReduced(e.matches);
      });
      this.log('unlock', this.ctx.state, 'silenciado:', this.muted);
    }
    if (this.muted) {
      this.bus.master.gain.value = 0;
      this.ctx.suspend();
      return;
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
    this.hidden = false;
  },

  // La pausa por foco perdido (hide) deja el contexto suspendido hasta que la persona pulsa "Seguir"
  show() {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state !== 'running') this.ctx.resume();
    this.bus.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bus.master.gain.setTargetAtTime(C.audio.master, this.ctx.currentTime, 0.05);
    this.hidden = false;
  },
  hide() {
    if (!this.ctx || this.hidden) return;
    this.hidden = true;
    const t = this.ctx.currentTime;
    this.bus.master.gain.cancelScheduledValues(t);
    this.bus.master.gain.setTargetAtTime(0, t, 0.05);
    setTimeout(() => this.hidden && this.ctx.suspend(), 180);
  },

  rampSec(base, slow) {
    return this.reduced ? slow : base;
  },

  // nivel de la música (duckGain), filtro y rampa
  musicTo(level, filterHz, sec) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.bus.duckGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(level, t + sec);
    if (filterHz) {
      const f = this.bus.musicFilter.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(f.value, t);
      f.exponentialRampToValueAtTime(filterHz, t + sec);
    }
  },

  startMusic(fromStart, fadeSec) {
    if (!this.ctx || this.muted || !this.music) return;
    clearTimeout(this.pauseTimer);
    if (!this.music.state.running) this.music.start(fromStart);
    this.musicTo(1, 8000, fadeSec);
  },

  // Estados que le avisa RunScene (AUDIO §2.6 y §4.5)
  setState(next) {
    const prev = this.state;
    this.state = next;
    if (!this.ctx) return;
    this.log('estado', prev, '->', next);
    if (this.muted) return;
    const slow = this.reduced;
    switch (next) {
      case 'tutorial':
      case 'playing':
        if (prev === 'paused') this.startMusic(false, slow ? 0.9 : 0.6);
        else if (prev === 'dead') this.musicTo(1, 8000, slow ? 0.9 : 0.6);
        else this.startMusic(prev === 'title' || prev === 'finished', 0.8);
        break;
      case 'paused':
        this.musicTo(0, null, 0.25);
        clearTimeout(this.pauseTimer);
        this.pauseTimer = setTimeout(() => this.state === 'paused' && this.music.stop(), 280);
        break;
      case 'dead':
        this.musicTo(0.25, 900, slow ? 0.3 : 0.12);
        break;
      case 'finished':
        this.musicTo(0, null, 0.8);
        break;
      case 'title':
        if (!this.music.state.running) this.startMusic(true, 0.8);
        this.target(0);
        this.musicTo(0.6, 3000, 0.8);
        break;
      default:
    }
    if (next === 'tutorial' || next === 'playing') this.recalc();
  },

  // Tarjeta de lección visible: la música se mantiene a 30% con lowpass 1200 Hz
  cardUp() {
    this.musicTo(0.3, 1200, this.reduced ? 0.3 : 0.12);
  },
  // Tarjeta final: vuelve a 35%, solo capa base, lowpass 2.5 kHz
  finalCard() {
    if (!this.ctx || this.muted) return;
    this.target(0);
    this.startMusic(false, 0.1);
    this.musicTo(0.35, 2500, 1);
  },

  target(n) {
    if (this.music) this.music.setTarget(n);
  },
  setTramo(i) {
    this.tramoLevel = TRAMO_LEVEL[Math.min(i, TRAMO_LEVEL.length - 1)];
    this.recalc();
  },
  // Racha: x2 (3 a 5 seguidas) sube a E1 y x3 (6 o más) a E2; baja tras 5 s (2 compases) para que no parpadee
  setStreak(n) {
    this.streakN = n;
    this.recalc();
    clearTimeout(this.streakTimer);
    this.streakTimer = setTimeout(() => this.recalc(), 5100);
  },
  recalc() {
    const now = performance.now();
    const lvl = streakLevel(this.streakN);
    if (lvl > this.streakEff) {
      this.streakEff = lvl;
      this.streakHold = now + 5000;
    } else if (lvl < this.streakEff && now > this.streakHold) this.streakEff = lvl;
    const total = Math.max(this.tramoLevel, this.streakEff);
    this.target(total);
    this.log('energia', total);
  },
  setJuice(l) {
    this.juice = l;
  },

  // Efectos (AUDIO §5): suenan igual con cualquier juice; el juice solo agrega extras (racha, ámbar, arco)
  sfx(name, o = {}) {
    if (!this.running || this.muted || this.hidden) return;
    const fn = SFX[name];
    if (!fn) return;
    // El sonido va fuera del juice (decisión del líder): racha x2/x3, arco completo, ámbar y tarjeta suenan siempre.
    // Solo lo visual depende del juice.
    const extra = {};
    if (name === 'pickup') extra.tier = this.streakN >= 6 ? 2 : this.streakN >= 3 ? 1 : 0;
    routeSfx(this.ctx, this.bus, this.sfxState || (this.sfxState = {}), name, fn, this.ctx.currentTime + 0.003, { ...o, ...extra, reduced: this.reduced, echo: this.bus.echoIn });
    if (name === 'card') this.cardUp();
  },

  // Stingers: nunca se encimen más de uno
  stinger(name) {
    if (!this.running || this.muted || this.hidden) return;
    const fn = STINGERS[name];
    if (!fn) return;
    const prio = { final: 4, fail: 3, record: 3, checkpoint: 2 }[name] || 1; // el fallo corta al checkpoint
    const dur = { final: 3.0, record: 1.6, checkpoint: 1.2, fail: 1.0 }[name] || 1;
    const now = this.ctx.currentTime;
    if (now < this.busyUntil && prio <= this.busyPrio) return;
    this.busyUntil = now + dur;
    this.busyPrio = prio;
    const when = now + (name === 'fail' ? 0.08 : 0.005);
    fn(this.ctx, this.bus.sfxMix, when, { reduced: this.reduced, echo: this.bus.stingerEcho });
    // ducking breve de la música según el stinger
    if (name === 'checkpoint' || name === 'record') {
      const lvl = name === 'checkpoint' ? 0.55 : 0.45;
      const hold = name === 'checkpoint' ? 1.4 : 1.8;
      const g = this.bus.duckGain.gain;
      const t = now;
      const cur = g.value;
      g.cancelScheduledValues(t);
      g.setValueAtTime(cur, t);
      g.linearRampToValueAtTime(Math.min(cur, lvl), t + 0.08);
      g.setValueAtTime(Math.min(cur, lvl), t + hold);
      g.linearRampToValueAtTime(cur, t + hold + (name === 'checkpoint' ? 0.4 : 0.5));
    }
    this.log('stinger', name);
  },

  // Timbre por papel (pieza 6 v2): papel.js se descarga solo cuando hay papel y ya hubo gesto.
  // Sin papel (clásico, demo) no se carga nada y la mezcla queda igual.
  papel: null,
  papelName: null,
  papelLoading: null,
  loadPapel() {
    if (!this.papelLoading)
      this.papelLoading = import('./papel.js').then((m) => {
        this.papelMod = m;
        this.papel = m.createPapel(this.ctx, this.bus, C.audio);
        this.music.setPapel(this.papel);
        return m;
      });
    return this.papelLoading;
  },
  setPapel(name) {
    this.papelName = name || null;
    if (!this.ctx) return; // antes del gesto solo se recuerda
    if (this.papel) return this.papel.set(this.papelName);
    if (this.papelName) this.loadPapel().then(() => this.papel.set(this.papelName));
  },
  // Pasar página (cruce de tramo con papel): sustituye al stinger de checkpoint, misma prioridad y ducking más corto
  pagina(name) {
    this.setPapel(name);
    if (!this.running || this.muted || this.hidden) return;
    const now = this.ctx.currentTime;
    if (now < this.busyUntil && 2 <= this.busyPrio) return;
    this.busyUntil = now + 0.6;
    this.busyPrio = 2;
    const play = (m) => {
      const t = Math.max(this.ctx.currentTime, now) + 0.005;
      m.stingerPagina(this.ctx, this.bus.sfxMix, t, { reduced: this.reduced, papel: this.papelName });
      this.paginas = (this.paginas || 0) + 1;
      const g = this.bus.duckGain.gain;
      const cur = g.value;
      g.cancelScheduledValues(t);
      g.setValueAtTime(cur, t);
      g.linearRampToValueAtTime(Math.min(cur, 0.55), t + 0.08);
      g.setValueAtTime(Math.min(cur, 0.55), t + 0.6);
      g.linearRampToValueAtTime(cur, t + 1.0);
    };
    if (this.papelMod) play(this.papelMod);
    else this.loadPapel().then(play);
    this.log('stinger', 'pagina', name);
  },

  // Botón de sonido (AUDIO §8): se confirma antes de silenciar
  toggle() {
    if (!this.ctx) this.unlock();
    if (!this.muted) {
      if (this.running) SFX.ui(this.ctx, this.bus.sfxMix, this.ctx.currentTime + 0.003, { dir: 'down', reduced: this.reduced });
      setTimeout(() => this.setMuted(true), 80);
      this.muted = true;
      save('moki.sound', '0');
      this.emit();
    } else this.setMuted(false);
    return this.muted;
  },

  setMuted(m) {
    this.muted = m;
    save('moki.sound', m ? '0' : '1');
    if (!this.ctx) {
      this.emit();
      return;
    }
    const t = this.ctx.currentTime;
    if (m) {
      this.bus.master.gain.cancelScheduledValues(t);
      this.bus.master.gain.setTargetAtTime(0, t, 0.02);
      this.music.stop();
      setTimeout(() => this.muted && this.ctx.suspend(), 120);
    } else {
      this.ctx.resume().then(() => {
        const n = this.ctx.currentTime;
        this.bus.master.gain.cancelScheduledValues(n);
        this.bus.master.gain.setValueAtTime(0, n);
        this.bus.master.gain.linearRampToValueAtTime(C.audio.master, n + 0.3);
        SFX.ui(this.ctx, this.bus.sfxMix, n + 0.31, { dir: 'up', reduced: this.reduced });
        if (this.state !== 'paused' && this.state !== 'finished') {
          this.startMusic(false, 0.3);
          this.setState(this.state);
        }
      });
    }
    this.emit();
  },
};

export const audio = A;
export default A;
