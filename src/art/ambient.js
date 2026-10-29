// Fondo vivo (T3d, PROPUESTAS-FONDO-DEMO §1B y §2): eventos de papel en las capas 1 a 3 y hora del día.
// PRNG propio con semilla, separado del guion: nada de aquí toca la física, los obstáculos ni las piezas.
import Phaser from 'phaser';
import { CONFIG as C } from '../config.js';
import { PAL, mix, rng } from './palette.js';

const hex = (s) => parseInt(s.slice(1), 16);
const lerpColor = (a, b, t) => {
  const A = [(a >> 16) & 255, (a >> 8) & 255, a & 255];
  const B = [(b >> 16) & 255, (b >> 8) & 255, b & 255];
  return (Math.round(A[0] + (B[0] - A[0]) * t) << 16) | (Math.round(A[1] + (B[1] - A[1]) * t) << 8) | Math.round(A[2] + (B[2] - A[2]) * t);
};

// Hora del día por tramo (ARTE): cielo y velo sobre las capas 2-3. El tinte de Phaser multiplica, así que
// cada tinte es "color objetivo / color base" por canal.
const PAPER = hex(PAL.paper);
const toTint = (target) => {
  const c = (k) => Math.min(255, Math.round((((target >> k) & 255) / ((PAPER >> k) & 255)) * 255));
  return (c(16) << 16) | (c(8) << 8) | c(0);
};
export const DAY = [
  { name: 'manana', sky: hex('#F4E8D5'), veil: 0xffffff, ink: 0.12 },
  { name: 'mediodia', sky: hex('#EBDBC5'), veil: hex(mix('#FFFFFF', PAL.kraft, 0.08)), ink: 0.14 },
  { name: 'tarde', sky: hex('#DFC9AF'), veil: hex(mix('#FFFFFF', PAL.kraft, 0.12)), ink: 0.18 },
  { name: 'noche', sky: hex('#BEAF9B'), veil: hex(mix('#FFFFFF', PAL.ink, 0.1)), ink: 0.24 },
];

export class Ambient {
  constructor(scene, seed = C.ambient.seed) {
    this.scene = scene;
    this.seed = seed;
    this.r = rng(seed);
    this.active = null; // un solo protagonista a la vez
    this.cloud = null; // nube de ambiente (siempre)
    this.chips = [];
    this.lastStartAt = -1e9;
    this.cloudNext = 1500;
    this.nextRoll = 0;
    this.perTramo = [0, 0, 0, 0];
    this.fired = {};
    this.day = { from: 0, to: 0, t: 1 };
    this.lamp = scene.add.image(0, 0, 'paper').setDepth(1.3).setAlpha(0).setVisible(false);
    this.log = [];
  }

  reset(seed) {
    if (seed !== undefined) this.seed = seed;
    this.r = rng(this.seed);
    [this.active, this.cloud].forEach((e) => e && e.sprites.forEach((s) => s.destroy()));
    this.active = null;
    this.cloud = null;
    this.chips.forEach((c) => c.s.destroy());
    this.chips = [];
    this.lastStartAt = -1e9;
    this.cloudNext = 1500;
    this.perTramo = [0, 0, 0, 0];
    this.fired = {};
    this.log = [];
    this.setDay(0, true);
  }

  // Hora del día: crossfade de 6 s tras el checkpoint (150 ms con movimiento reducido)
  setDay(i, instant) {
    const d = this.day;
    d.from = instant ? i : d.to;
    d.to = i;
    d.t = instant ? 1 : 0;
    d.dur = instant ? 1 : this.scene.reduced ? 150 : 6000;
    this.applyDay(1);
  }

  applyDay(dtFrac) {
    const d = this.day;
    d.t = Math.min(1, d.t + dtFrac);
    const A = DAY[d.from];
    const B = DAY[d.to];
    const sk = lerpColor(A.sky, B.sky, d.t);
    const veil = lerpColor(A.veil, B.veil, d.t);
    const s = this.scene;
    s.sky.setTint(toTint(sk));
    s.far.setTint(veil);
    s.mid.setTint(veil);
    s.clouds.setTint(lerpColor(0xffffff, veil, 0.6));
    // lámpara de la noche: solo en el tramo 4
    const lampOn = d.to === 3 ? d.t : d.from === 3 ? 1 - d.t : 0;
    this.lamp.setVisible(lampOn > 0.01).setAlpha(lampOn);
    if (this.scene.textures.exists('ambLamp') && this.lamp.texture.key !== 'ambLamp') this.lamp.setTexture('ambLamp');
    this.lamp.setPosition(Math.max(70, s.vw * 0.12), s.top + Math.max(140, s.vh * 0.2));
    this.lamp.setScale(1);
  }

  get busy() {
    return !!this.active;
  }

  // ---------- eventos ----------
  flightY() {
    const s = this.scene;
    const top = s.top + 76 / s.zoom; // bajo el HUD
    const bottom = C.world.groundY - 262; // zona de vuelo: sobre los árboles, fuera de la lectura (arco alto llega a 164)
    return bottom - top > 24 ? [top, bottom] : null;
  }

  begin(kind, ms, extra = {}) {
    const s = this.scene;
    const band = this.flightY();
    if (!band && kind !== 'cloud') return false;
    const r = this.r;
    const ev = { kind, born: ms, life: 0, sprites: [], ...extra };
    const y = band ? band[0] + r() * (band[1] - band[0]) : 0;
    if (kind === 'plane') {
      const sp = s.add.image(-60, y, 'ambPlane').setDepth(1.6).setAlpha(0.95);
      ev.sprites.push(sp);
      ev.life = 7000;
      ev.y = y;
      ev.vx = (s.vw + 140) / 7;
    } else if (kind === 'birds') {
      for (let i = 0; i < 3; i++) ev.sprites.push(s.add.image(-40, y, 'ambBird0').setDepth(1.6).setAlpha(0.9));
      ev.life = 7000;
      ev.y = y;
      ev.vx = (s.vw + 160) / 7;
    }
    this.active = ev;
    this.lastStartAt = ms;
    this.log.push([Math.round(ms / 100) / 10, kind]);
    return true;
  }

  beginCloud(ms) {
    const s = this.scene;
    const band = this.flightY();
    if (!band) return;
    const y = band[0] + this.r() * Math.max(10, (band[1] - band[0]) * 0.6);
    const sp = s.add.image(s.vw * (0.4 + this.r() * 0.5), y, 'ambCloud0').setDepth(1.2).setAlpha(0);
    this.cloud = { born: ms, life: 14000 + this.r() * 6000, sprites: [sp], stage: 0, x0: sp.x, d0: s.dist, cuts: [800 + this.r() * 400, 2200 + this.r() * 600] };
    s.tweens.add({ targets: sp, alpha: 0.95, duration: 500 });
  }

  chip(x, y) {
    const sp = this.scene.add.image(x, y, 'chipPaper').setDepth(1.25).setAngle(this.r() * 360);
    this.chips.push({ s: sp, vy: 10 + this.r() * 20, vx: (this.r() - 0.5) * 20, born: this.scene.t });
  }

  // update desde RunScene. ctx: { ms, quiet, forced: [{at, kind}], tramo }
  update(dtMs, ctx) {
    const s = this.scene;
    if (s.reduced) {
      // versiones fijas: sin eventos que viajen; solo la hora cambia con fundido
      if (this.day.t < 1) this.applyDay(dtMs / this.day.dur);
      return;
    }
    if (this.day.t < 1) this.applyDay(dtMs / this.day.dur);
    else if (DAY[this.day.to].name === 'noche') this.applyDay(0);
    const ms = ctx.ms;

    // nube de ambiente: siempre, sin tope (capa 1 a 0.1x)
    if (!this.cloud && ms >= this.cloudNext && this.flightY()) {
      this.beginCloud(ms);
      this.cloudNext = ms + 12000 + this.r() * 8000;
    }
    if (this.cloud) {
      const c = this.cloud;
      const age = ms - c.born;
      const sp = c.sprites[0];
      sp.x = c.x0 - (s.dist - c.d0) * C.art.parallax.clouds;
      const want = c.cuts.filter((t) => age > t).length;
      if (want > c.stage && this.scene.textures.exists(`ambCloud${Math.min(2, want)}`)) {
        c.stage = want;
        sp.setTexture(`ambCloud${Math.min(2, want)}`).setAngle((this.r() - 0.5) * 4);
        s.tweens.add({ targets: sp, angle: 0, duration: 120 });
        this.chip(sp.x + 20, sp.y + 24);
        this.chip(sp.x - 10, sp.y + 30);
      }
      if (age > c.life || sp.x < -170) {
        sp.destroy();
        this.cloud = null;
      }
    }
    for (const k of this.chips) {
      k.s.x += k.vx * (dtMs / 1000);
      k.s.y += k.vy * (dtMs / 1000);
      k.vy += 90 * (dtMs / 1000);
      k.s.setAlpha(Math.max(0, 1 - (ms - k.born) / 1000));
    }
    this.chips = this.chips.filter((k) => (ms - k.born > 1000 ? (k.s.destroy(), false) : true));

    // protagonista activo
    const a = this.active;
    if (a) {
      const age = ms - a.born;
      const u = age / a.life;
      a.sprites.forEach((sp, i) => {
        if (a.kind === 'plane') {
          sp.x = -60 + a.vx * (age / 1000);
          sp.y = a.y - 40 * u + Math.sin(age / 700) * 8; // sale algo más alto
          sp.setAngle(age < 700 ? -3 * (age / 700) : Math.sin(age / 900) * 4);
        } else {
          const ox = -i * 26;
          const oy = (i === 0 ? 0 : i === 1 ? -18 : 18);
          sp.x = -40 + a.vx * (age / 1000) + ox;
          sp.y = a.y + oy + Math.sin(age / 500 + i) * 4;
          const pose = Math.floor(age / 140 + i) % 2; // aleteo en stop-motion de 2 poses
          sp.setTexture(`ambBird${pose}`);
        }
      });
      if (age > a.life) {
        a.sprites.forEach((sp) => sp.destroy());
        this.active = null;
      }
    }

    // ¿nace uno nuevo? forzados del demo o azar en un respiro
    if (this.active) return;
    if (ctx.forced) {
      for (const f of ctx.forced) {
        if (ctx.sec >= f.at && !this.fired[f.kind + f.at]) {
          this.fired[f.kind + f.at] = true;
          if (this.begin(f.kind, ms)) return;
        }
      }
      if (ms - this.lastStartAt < C.ambient.demoGapMs) return;
      return; // el demo solo muestra los forzados (guion fijo, cada uno con su momento)
    }
    if (!ctx.quiet || ms - this.lastStartAt < C.ambient.minGapMs || ms < this.nextRoll) return;
    this.nextRoll = ms + 1500 + this.r() * 3000;
    const t = Math.min(3, ctx.tramo);
    const cap = [3, 3, 2, 1][t];
    if (this.perTramo[t] >= cap) return;
    const pool = t <= 1 ? ['plane', 'birds'] : ['birds'];
    const kind = pool[Math.floor(this.r() * pool.length)];
    if (kind === 'plane' && this.fired['plane' + t]) return;
    if (kind === 'birds' && this.fired['birds' + t]) return;
    if (this.begin(kind, ms)) {
      this.fired[kind + t] = true;
      this.perTramo[t] += 1;
    }
  }
}

export const _lerpColor = lerpColor;
void Phaser;
