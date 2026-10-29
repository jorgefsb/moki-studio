// Fondo vivo (T3d/T3d2, PROPUESTAS-FONDO-DEMO §1B y §2): eventos de papel en las capas 1 a 3 y hora del día.
// PRNG propio con semilla, separado del guion: nada de aquí toca la física, los obstáculos ni las piezas.
import { CONFIG as C } from '../config.js';
import { PAL, mix, rng } from './palette.js';
import { t } from '../i18n.js';

const hex = (s) => parseInt(s.slice(1), 16);
const lerpColor = (a, b, k) => {
  const A = [(a >> 16) & 255, (a >> 8) & 255, a & 255];
  const B = [(b >> 16) & 255, (b >> 8) & 255, b & 255];
  return (Math.round(A[0] + (B[0] - A[0]) * k) << 16) | (Math.round(A[1] + (B[1] - A[1]) * k) << 8) | Math.round(A[2] + (B[2] - A[2]) * k);
};
const PAPER = hex(PAL.paper);
const toTint = (target) => {
  const c = (k) => Math.min(255, Math.round((((target >> k) & 255) / ((PAPER >> k) & 255)) * 255));
  return (c(16) << 16) | (c(8) << 8) | c(0);
};

// Hora del día por tramo. farVeil tiñe colinas lejanas y nubes; la capa media (detrás de la banda de juego) no se toca:
// ahí el contraste obstáculo/fondo no baja del de la mañana (2.34). Solo el cielo y el plano lejano cambian.
export const DAY = [
  { name: 'manana', sky: hex('#F8ECD8'), farVeil: 0xffffff, farAlpha: 0.78, bands: 0, shadowK: 1.35, obs: 0xffffff }, // cálido y claro, colinas pálidas, sombras largas
  { name: 'mediodia', sky: hex('#EBDBC5'), farVeil: hex(mix('#FFFFFF', PAL.kraft, 0.08)), farAlpha: 1, bands: 0, shadowK: 0.85, obs: 0xe0e0e0 },
  { name: 'tarde', sky: hex('#DFC9AF'), farVeil: hex(mix('#FFFFFF', PAL.kraft, 0.12)), farAlpha: 1, bands: 1, shadowK: 1.5, obs: 0xd0d0d0 }, // bandas de fibra arriba
  { name: 'noche', sky: hex('#A69682'), farVeil: hex('#B3ADB0'), farAlpha: 1, bands: 0.7, shadowK: 1.0, obs: 0xffffff }, // marrón tinta; el plano lejano más frío
];

const NEED = { plane: 'ambPlane', birds: 'ambBird1', butterflies: 'ambButterfly', sign: 'paper', moki: 'mokiSaluda', balloon: 'ambBalloon' };

export class Ambient {
  constructor(scene, seed = C.ambient.seed) {
    this.scene = scene;
    this.seed = seed;
    this.r = rng(seed);
    this.active = null; // un solo protagonista a la vez
    this.slow = null; // globo (capa 2, 22-28 s): vive aparte del protagonista
    this.flutter = null; // mariposas: ambiente (como las nubes), no ocupan el cupo de protagonista
    this.cloud = null;
    this.chips = [];
    this.stars = [];
    this.butterNext = 9000;
    this.pending = []; // premios: nacen 0.3-0.8 s después de un momento bueno
    this.lamp = scene.add.image(0, 0, 'paper').setOrigin(0.5, 0).setDepth(1.3).setAlpha(0).setVisible(false);
    this.bands = scene.add.tileSprite(0, 0, 10, 10, 'paper').setOrigin(0, 0).setDepth(1.4).setAlpha(0);
    this.day = { from: 0, to: 0, t: 1, dur: 1 };
    this.obsTint = 0xffffff;
    this.night = false; // texturas de noche en los obstáculos (cartón oscuro, cinta y franjas en #FF6B35)
    this.resetState();
  }

  resetState() {
    this.lastStartAt = -1e9;
    this.cloudNext = 1500;
    this.butterNext = 9000;
    this.nextRoll = 0;
    this.perTramo = [{}, {}, {}, {}];
    this.fired = {};
    this.once = {};
    this.log = [];
    this.signIdx = 0;
    this.pending = [];
  }

  destroyAll() {
    [this.active, this.slow, this.cloud, this.flutter].forEach((e) => e && e.sprites.forEach((s) => s.destroy()));
    this.active = this.slow = this.cloud = this.flutter = null;
    this.chips.forEach((c) => c.s.destroy());
    this.stars.forEach((st) => st.s.destroy());
    this.chips = [];
    this.stars = [];
  }

  reset(seed) {
    if (seed !== undefined) this.seed = seed;
    this.r = rng(this.seed);
    this.destroyAll();
    this.resetState();
    this.setDay(0, true);
  }

  farAlpha() {
    const d = this.day;
    return DAY[d.from].farAlpha + (DAY[d.to].farAlpha - DAY[d.from].farAlpha) * d.t;
  }
  get shadowK() {
    const d = this.day;
    return DAY[d.from].shadowK + (DAY[d.to].shadowK - DAY[d.from].shadowK) * d.t;
  }

  // Crossfade de 6 s tras el checkpoint (150 ms con movimiento reducido)
  setDay(i, instant) {
    const d = this.day;
    d.from = instant ? i : d.to;
    d.to = i;
    d.t = instant ? 1 : 0;
    d.dur = instant ? 1 : this.scene.reduced ? 150 : 6000;
    this.applyDay(0);
  }

  applyDay(dtFrac) {
    const d = this.day;
    d.t = Math.min(1, d.t + dtFrac);
    const A = DAY[d.from];
    const B = DAY[d.to];
    const s = this.scene;
    const sk = lerpColor(A.sky, B.sky, d.t);
    const far = lerpColor(A.farVeil, B.farVeil, d.t);
    s.sky.setTint(toTint(sk));
    s.topFade.setTint(toTint(sk)); // el velo de arriba toma el color del cielo
    s.far.setTint(far);
    if (s.textures.exists('far')) s.far.setAlpha(this.farAlpha());
    s.mid.setTint(0xffffff);
    // contraste obstáculo/fondo >= 2.0 en cada hora (medido en pantalla): de día más claro el fondo, de noche el cartón se oscurece
    this.obsTint = lerpColor(A.obs, B.obs, d.t);
    s.obstacles.forEach((o) => o.sprite && o.sprite.setTint(this.obsTint));
    this.setNight(d.to === 3 ? d.t >= 0.5 : d.from === 3 ? d.t < 0.5 : false);
    s.clouds.setTint(lerpColor(0xffffff, far, 0.6));
    // bandas de fibra (tarde y, más tenues, noche): capas de papel, no un degradado liso
    const bandA = A.bands + (B.bands - A.bands) * d.t;
    if (s.textures.exists('ambBands') && this.bands.texture.key !== 'ambBands') this.bands.setTexture('ambBands');
    this.bands.setPosition(0, s.top).setSize(s.vw, 300).setAlpha(this.bands.texture.key === 'ambBands' ? bandA : 0);
    // lámpara: disco de papel crema con canto kraft, sombra suave e hilo corto; solo en la noche
    const lampOn = d.to === 3 ? d.t : d.from === 3 ? 1 - d.t : 0;
    if (s.textures.exists('ambLamp') && this.lamp.texture.key !== 'ambLamp') this.lamp.setTexture('ambLamp');
    this.lamp.setVisible(lampOn > 0.01 && this.lamp.texture.key === 'ambLamp').setAlpha(lampOn);
    this.lamp.setPosition(Math.max(70, s.vw * 0.12), s.top + (s.vw < 700 ? 74 / s.zoom : 4)); // en pantalla angosta cuelga bajo la fila del HUD
    // estrellas de papel: solo en la noche, cuando ya cayó del todo
    if (d.to === 3 && d.t >= 1 && !this.stars.length && !this.fired.stars && s.textures.exists('ambStar')) this.spawnStars();
  }

  // Cartón oscuro de noche conservando la cinta: se cambia la textura a mitad del fundido (a mano, como un cambio de escena de papel)
  setNight(on) {
    const s = this.scene;
    if (on === this.night) return;
    if (on && !s.textures.exists('caja_n')) return; // aún se genera: lo reintenta el siguiente cuadro
    this.night = on;
    s.obstacles.forEach((o) => o.sprite && o.sprite.setTexture(this.obsKey(o.type)));
  }
  obsKey(type) {
    return this.night && this.scene.textures.exists(`${type}_n`) ? `${type}_n` : type;
  }

  spawnStars() {
    const s = this.scene;
    this.fired.stars = true;
    const band = this.flightY();
    if (!band) return;
    const n = 5 + Math.floor(this.r() * 3);
    for (let i = 0; i < n; i++) {
      const x = s.vw * (0.2 + (0.78 * (i + this.r() * 0.6)) / n);
      const y = band[0] - 10 + this.r() * Math.max(10, (band[1] - band[0]) * 0.55);
      const sp = s.add.image(x, y, 'ambStar').setOrigin(0.5, 0).setDepth(1.25).setScale(0.001);
      this.stars.push({ s: sp, x0: x, d0: s.dist });
      if (s.reduced) sp.setScale(1);
      else {
        const rot = (this.r() < 0.5 ? -1 : 1) * 1.5;
        sp.setAngle(rot);
        s.tweens.add({ targets: sp, scale: 1, duration: 150, delay: i * 120, ease: 'Back.easeOut' });
        s.tweens.add({ targets: sp, angle: 0, duration: 600, delay: i * 120 });
      }
    }
  }

  // Cresta de la colina (capa lejana): fila del primer píxel opaco de cada columna, y las zonas planas (sin casas ni arbustos)
  crestData() {
    if (this._crest) return this._crest;
    const s = this.scene;
    if (!s.textures.exists('far')) return null;
    const img = s.textures.get('far').getSourceImage();
    const W = img.width;
    const H = img.height;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, W, H).data;
    const row = new Int16Array(W);
    for (let x = 0; x < W; x++) {
      row[x] = -1;
      for (let y = 0; y < H; y++) if (d[(y * W + x) * 4 + 3] > 140) { row[x] = y; break; }
    }
    this._crest = { W, row };
    return this._crest;
  }

  // Alfa de la capa media (árboles, postes): para no poner a Moki chiquito detrás de un pino
  midAlpha() {
    if (this._mid) return this._mid;
    const s = this.scene;
    if (!s.textures.exists('mid')) return null;
    const img = s.textures.get('mid').getSourceImage();
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    const cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0);
    this._mid = { W: img.width, H: img.height, d: cx.getImageData(0, 0, img.width, img.height).data };
    return this._mid;
  }

  // Busca, entre x0 y x1 de pantalla, la columna de la textura con la cresta más plana (±22 px): ahí se puede parar Moki chiquito
  flatCrest(x0, x1) {
    const c = this.crestData();
    if (!c) return null;
    const tp = this.scene.far.tilePositionX;
    // En vertical las capas van escaladas (RunScene.layout): pantalla x -> textura x / s + tilePosition, fila de textura -> fila * s
    const fs = this.scene.farS || 1;
    const ms = this.scene.midS || 1;
    let best = null;
    // obstáculos que aún pasarán por su zona: Moki se queda con la capa lejana (0.3x) y ellos corren a 1x, o sea 0.7x relativo durante 2.5 s
    const sc = this.scene;
    const reach = 2.6 * sc.speed * 0.7;
    const obsX = sc.level.entities.filter((e) => e.kind === 'obs' && e.D - sc.dist > -150 && e.D - sc.dist < 2200).map((e) => sc.px + e.D - sc.dist);
    for (let x = x0; x <= x1; x += 3) {
      if (obsX.some((ox) => ox > x - 70 && ox < x + reach + 70)) continue;
      const u = (((Math.round(x / fs + tp)) % c.W) + c.W) % c.W;
      let lo = 1e9;
      let hi = -1e9;
      for (let k = -22; k <= 22; k += 2) {
        const r = c.row[(u + k + c.W) % c.W];
        if (r < 0) { lo = -1e9; break; }
        lo = Math.min(lo, r);
        hi = Math.max(hi, r);
      }
      if (hi - lo > 5 || (best && hi - lo >= best.var)) continue;
      // la capa media (árboles, postes) no debe tapar los 36 px de Moki sobre la cresta ni 12 px a cada lado
      const m = this.midAlpha();
      // 60 px libres de pinos y postes al aparecer (con toda la deriva de la capa media casi nunca hay sitio: 42% contra 3%); si uno pasa
      // durante sus 2.5 s, Moki (depth 2.5, entre la capa lejana y la media) queda tapado por él: nunca posado entre sus ramas
      if (m) {
        const row = Math.round((lo + hi) / 2);
        const crestWorld = this.scene.far.y + row * fs;
        const um = (((Math.round(x / ms + this.scene.mid.tilePositionX)) % m.W) + m.W) % m.W;
        const yc = (crestWorld - this.scene.mid.y) / ms; // fila de la capa media a la altura de la cresta
        let blocked = false;
        for (let yy = Math.round(yc - 46 / ms); yy <= Math.round(yc + 2 / ms) && !blocked; yy += 2) {
          if (yy < 0 || yy >= m.H) continue;
          for (let k = -Math.round(60 / ms); k <= 60 / ms; k += 4) if (m.d[(yy * m.W + ((um + k + m.W) % m.W)) * 4 + 3] > 20) { blocked = true; break; }
        }
        if (blocked) continue;
      }
      best = { u, row: Math.round((lo + hi) / 2), var: hi - lo };
    }
    return best;
  }

  // ---------- zonas ----------
  flightY() {
    const s = this.scene;
    const top = s.top + 76 / s.zoom; // bajo el HUD
    const bottom = C.world.groundY - 262; // sobre los árboles, fuera de la zona de lectura (arco alto llega a 164)
    return bottom - top > 24 ? [top, bottom] : null;
  }
  // escala para leer a 375: avioncito ~55 px y pájaros ~24 px de pantalla
  px(target, w) {
    return Math.max(1, target / this.scene.zoom / w);
  }

  can(kind, tramo) {
    if (!this.scene.textures.exists(NEED[kind])) return false;
    if ((kind === 'plane' || kind === 'butterflies' || kind === 'sign') && tramo > 1) return false; // solo T1-T2
    if (kind === 'moki') return tramo === 1 && !this.once.moki;
    return true;
  }

  begin(kind, ms, tramo = 0) {
    const s = this.scene;
    const band = this.flightY();
    if (!band || !this.can(kind, tramo)) return false;
    const r = this.r;
    // el avioncito sube hasta 40 px y los pajaritos se abren ±18 px (+4 de vaivén): se reserva ese margen para no pisar el HUD ni la lectura
    const mg = kind === 'plane' ? [48, 12] : kind === 'birds' ? [26, 26] : [0, 0];
    const lo = band[0] + mg[0];
    const hi = Math.max(lo, band[1] - mg[1]);
    const y = lo + r() * (hi - lo);
    const ev = { kind, born: ms, life: 7000, sprites: [], y, tramo };
    if (kind === 'plane') {
      ev.sprites.push(s.add.image(-60, y, 'ambPlane').setDepth(1.6).setAlpha(0.95).setScale(this.px(55, 64)));
      ev.vx = (s.vw + 160) / 7;
    } else if (kind === 'birds') {
      const k = this.px(24, 34);
      for (let i = 0; i < 3; i++) ev.sprites.push(s.add.image(-40, y, 'ambBird0').setDepth(1.6).setAlpha(0.9).setScale(k));
      ev.vx = (s.vw + 180) / 7;
    } else if (kind === 'butterflies') {
      const n = 1 + Math.floor(r() * 2);
      const top = Math.min(C.world.groundY - 205, band[1]); // y < groundY-200
      const yy = Math.min(top, band[0] + (band[1] - band[0]) * 0.3 + r() * 20);
      for (let i = 0; i < n; i++) ev.sprites.push(s.add.image(s.vw + 20 + i * 40, yy, 'ambButterfly').setDepth(3.4).setAlpha(0.9).setScale(this.px(24, 36)));
      ev.life = 8000;
      ev.vx = -(48 + r() * 24);
      ev.y = yy;
      this.flutter = ev;
      this.log.push([Math.round(ms / 100) / 10, kind]);
      return true;
    } else if (kind === 'sign') {
      // cartel en poste (capa 3): solo las 3 lecciones aprobadas, Outfit 700 de 17 px de pantalla
      const z = s.zoom;
      const idx = this.signIdx++ % 3;
      const txt = s.add.text(0, 0, t(`fail.l${idx + 1}`), { fontFamily: 'Outfit, sans-serif', fontStyle: '700', fontSize: `${Math.ceil(17 / z)}px`, color: PAL.ink, wordWrap: { width: Math.min(240, s.scale.width - 32 - 24 - 8) / z }, align: 'center' }).setOrigin(0.5);
      const pad = 12 / z;
      const cw = txt.width + pad * 2;
      const ch = txt.height + pad * 1.6;
      const g = s.add.graphics();
      g.fillStyle(0x22211f, 0.18);
      g.fillRoundedRect(-cw / 2 + 3, -ch / 2 + 5, cw, ch, 12);
      g.fillStyle(0xf4e8d5, 1);
      g.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);
      g.lineStyle(3, 0xb99168, 1);
      g.strokeRoundedRect(-cw / 2 + 1.5, -ch / 2 + 1.5, cw - 3, ch - 3, 11);
      // entero en pantalla (borde derecho a >= 16 px), bajo el HUD y por encima de la zona de lectura (sobre groundY-196)
      const cyMin = s.top + 66 / z + ch / 2;
      const cy = Math.max(cyMin, Math.min(C.world.groundY - 250, C.world.groundY - 196 - ch / 2));
      const pole = s.add.rectangle(0, ch / 2, 6, C.world.groundY - (cy + ch / 2), 0x22211f, 0.4).setOrigin(0.5, 0);
      const box = s.add.container(s.vw - cw / 2 - 16 / z, cy, [pole, g, txt]).setDepth(3.2).setAngle(1);
      ev.sprites.push(box);
      ev.x0 = box.x;
      ev.d0 = s.dist;
      ev.life = 3200;
    } else if (kind === 'moki') {
      // Moki chiquito: asoma desde la cresta de la colina lejana (flat), con los pies en la línea de la cresta; sube y baja por el mismo sitio.
      // Asset oficial tal cual a 30 px, nunca espejado, tinte de velo de papel ~12%, 1 vez por partida.
      const cr = this.flatCrest(Math.max(s.vw * 0.3, s.px + 130), s.vw * 0.95);
      if (!cr) return false;
      const sp = s.add.image(0, 0, 'mokiSaluda').setOrigin(0.5, 1).setScale(30 / 260).setDepth(2.5).setTint(0xe6dfd2).setAlpha(0);
      ev.sprites.push(sp);
      ev.life = 2500;
      ev.u = cr.u;
      ev.row = cr.row;
      this.once.moki = true;
    } else if (kind === 'balloon') {
      // nace ya sobre la zona de lectura (su base queda sobre groundY-185, más arriba de las piezas más altas) y entra con un fundido: nunca cruza la banda de juego
      const sp = s.add.image(s.vw * (0.55 + r() * 0.25), C.world.groundY - 245, 'ambBalloon').setDepth(2.5).setAlpha(0);
      ev.sprites.push(sp);
      ev.life = 22000 + r() * 6000;
      ev.x0 = sp.x;
      ev.d0 = s.dist;
      ev.y0 = sp.y;
      ev.y1 = band[0] + (band[1] - band[0]) * (0.35 + r() * 0.3);
      this.slow = ev;
      this.log.push([Math.round(ms / 100) / 10, kind]);
      return true;
    }
    this.active = ev;
    this.lastStartAt = ms;
    this.log.push([Math.round(ms / 100) / 10, kind]);
    return true;
  }

  beginCloud(ms) {
    const s = this.scene;
    const band = this.flightY();
    if (!band || !s.textures.exists('ambCloud2')) return;
    const y = band[0] + this.r() * Math.max(10, (band[1] - band[0]) * 0.6);
    const sp = s.add.image(s.vw * (0.4 + this.r() * 0.5), y, 'ambCloud0').setDepth(1.2).setAlpha(0);
    this.cloud = { born: ms, life: 14000 + this.r() * 6000, sprites: [sp], stage: 0, x0: sp.x, d0: s.dist, cuts: [800 + this.r() * 400, 2200 + this.r() * 600] };
    s.tweens.add({ targets: sp, alpha: 0.95, duration: 500 });
  }

  chip(x, y) {
    const sp = this.scene.add.image(x, y, 'chipPaper').setDepth(1.25).setAngle(this.r() * 360);
    this.chips.push({ s: sp, vy: 10 + this.r() * 20, vx: (this.r() - 0.5) * 20, born: this.scene.t });
  }

  // Un momento bueno (checkpoint, salto mantenido, arco completo, fila de piezas): el premio nace 0.3-0.8 s después
  good(kind, ms) {
    const map = { checkpoint: 'balloon', hold: 'birds', arc: 'birds' };
    const ev = map[kind];
    if (!ev || this.pending.some((p) => p.ev === ev)) return;
    this.pending.push({ ev, at: ms + 300 + this.r() * 500 });
  }

  // update desde RunScene. ctx: { ms, sec, quiet, forced, tramo }
  update(dtMs, ctx) {
    const s = this.scene;
    if (this.day.t < 1) this.applyDay(dtMs / this.day.dur);
    else if (this.day.to === 3 && !this.night) this.setNight(true); // las texturas de noche se generan después: reintenta
    if (s.reduced) {
      this.stars.forEach((st) => (st.s.x = st.x0)); // versiones fijas: sin eventos que viajen
      return;
    }
    const ms = ctx.ms;
    // las estrellas cuelgan del cielo fijo (no se desplazan)
    this.updateCloud(ms);
    for (const k of this.chips) {
      k.s.x += k.vx * (dtMs / 1000);
      k.s.y += k.vy * (dtMs / 1000);
      k.vy += 90 * (dtMs / 1000);
      k.s.setAlpha(Math.max(0, 1 - (ms - k.born) / 1000));
    }
    this.chips = this.chips.filter((k) => (ms - k.born > 1000 ? (k.s.destroy(), false) : true));
    this.updateSlow(ms);
    this.updateFlutter(ms, ctx);
    this.updateActive(ms);

    // premios: nacen solo si el cupo lo permite y hay respiro; si coinciden con otro evento, se descartan
    const t0 = Math.min(3, ctx.tramo);
    const due = this.pending.filter((p) => ms >= p.at);
    if (due.length) {
      this.pending = this.pending.filter((p) => ms < p.at);
      for (const p of due) {
        const key = p.ev + t0;
        if (this.fired[key] || ctx.forced) continue;
        if (p.ev === 'balloon') {
          if (this.slow || !this.begin('balloon', ms, t0)) continue;
        } else {
          if (this.active || !ctx.quiet || ms - this.lastStartAt < C.ambient.minGapMs) continue;
          if (!this.begin(p.ev, ms, t0)) continue;
          this.perTramo[t0][p.ev] = 1;
        }
        this.fired[key] = 1;
      }
    }

    // forzados del demo (guion fijo) o azar con semilla en un respiro sin premio
    if (this.active) return;
    if (ctx.forced) {
      for (const f of ctx.forced) {
        if (ctx.sec >= f.at && !this.fired[f.kind + f.at]) {
          if (f.kind === 'balloon') {
            this.fired[f.kind + f.at] = true;
            if (!this.slow) this.begin('balloon', ms, 0);
          } else if (this.begin(f.kind, ms, f.kind === 'moki' ? 1 : 0)) {
            this.fired[f.kind + f.at] = true;
            return;
          } else if (ctx.sec > f.at + 7) this.fired[f.kind + f.at] = true; // sin sitio durante 7 s: no sale (nunca flotando)
        }
      }
      return;
    }
    if (!ctx.quiet || ms - this.lastStartAt < C.ambient.minGapMs || ms < this.nextRoll) return;
    this.nextRoll = ms + 1500 + this.r() * 3000;
    const caps = [3, 3, 2, 1][t0];
    if (Object.keys(this.perTramo[t0]).length >= caps) return;
    // mitad de T2: Moki chiquito, una vez por partida
    if (t0 === 1 && ctx.tsec > 10 && ctx.tsec < 28 && !this.once.moki && this.begin('moki', ms, 1)) {
      this.perTramo[t0].moki = 1;
      return;
    }
    const pool = t0 <= 1 ? ['plane', 'sign'] : ['birds'];
    const kind = pool[Math.floor(this.r() * pool.length)];
    if (this.perTramo[t0][kind] || (kind === 'sign' && ctx.tsec < 10)) return;
    if (this.begin(kind, ms, t0)) this.perTramo[t0][kind] = 1;
  }

  updateCloud(ms) {
    const s = this.scene;
    if (!this.cloud && ms >= this.cloudNext && this.flightY()) {
      this.beginCloud(ms);
      this.cloudNext = ms + 12000 + this.r() * 8000;
    }
    const c = this.cloud;
    if (!c) return;
    const age = ms - c.born;
    const sp = c.sprites[0];
    sp.x = c.x0 - (s.dist - c.d0) * C.art.parallax.clouds;
    const want = c.cuts.filter((tt) => age > tt).length;
    if (want > c.stage && s.textures.exists(`ambCloud${Math.min(2, want)}`)) {
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

  // Mariposas (T1-T2): ambiente, cada 18-30 s con semilla, sin esperar respiro; 1-2 mariposas, 8 s
  updateFlutter(ms, ctx) {
    const s = this.scene;
    if (!this.flutter && !ctx.forced && ctx.tramo <= 1 && ms >= this.butterNext && !ctx.tutorial) {
      this.butterNext = ms + 18000 + this.r() * 12000;
      this.begin('butterflies', ms, ctx.tramo);
    }
    const a = this.flutter;
    if (!a) return;
    const age = ms - a.born;
    a.sprites.forEach((sp, i) => {
      const dt = age / 1000;
      sp.x = s.vw + 20 + i * 40 + a.vx * dt;
      sp.y = a.y + i * 14 + Math.sin(dt * 2.2 + i * 2) * 14;
      sp.setScale(this.px(24, 36) * (0.4 + 0.6 * Math.abs(Math.sin(dt * 9 + i))), this.px(24, 36)); // aleteo: el ancho va de 100 a 40%
    });
    if (age > a.life) {
      a.sprites.forEach((sp) => sp.destroy());
      this.flutter = null;
    }
  }

  updateSlow(ms) {
    const b = this.slow;
    if (!b) return;
    const s = this.scene;
    const age = ms - b.born;
    const u = Math.min(1, age / b.life);
    const sp = b.sprites[0];
    sp.x = b.x0 - (s.dist - b.d0) * 0.08; // capa 2, mucho más lenta que a 0.3x para que dure sus ~24 s a la vista
    sp.y = b.y0 + (b.y1 - b.y0) * (1 - Math.pow(1 - Math.min(1, age / 9000), 2)) + Math.sin(age / 900) * 3; // sube tras las colinas
    sp.setAngle(Math.sin(age / 1400) * 1.5);
    sp.setAlpha(0.95 * Math.min(1, age / 1200) * (u > 0.92 ? 1 - (u - 0.92) / 0.08 : 1));
    if (age > b.life || sp.x < -120) {
      sp.destroy();
      this.slow = null;
    }
  }

  updateActive(ms) {
    const a = this.active;
    if (!a) return;
    const s = this.scene;
    const age = ms - a.born;
    const u = age / a.life;
    a.sprites.forEach((sp, i) => {
      if (a.kind === 'plane') {
        sp.x = -60 + a.vx * (age / 1000);
        sp.y = a.y - 40 * u + Math.sin(age / 700) * 8; // sale algo más alto
        const sway = Math.sin(age / 900) * 4; // anticipa -3° y asienta en el planeo (±4°)
        sp.setAngle(age < 350 ? -3 * (age / 350) : age < 800 ? -3 + (sway + 3) * ((age - 350) / 450) : sway);
      } else if (a.kind === 'birds') {
        const oy = i === 0 ? 0 : i === 1 ? -18 : 18;
        sp.x = -40 + a.vx * (age / 1000) - i * 26;
        sp.y = a.y + oy + Math.sin(age / 500 + i) * 4;
        sp.setTexture(`ambBird${Math.floor(age / 140 + i) % 2}`); // aleteo en stop-motion de 2 poses
      } else if (a.kind === 'sign') {
        sp.x = a.x0 - (s.dist - a.d0) * 0.04; // casi quieto: entero y con 16 px de margen a ambos lados durante sus 3 s
        sp.setAlpha(age > a.life - 400 ? Math.max(0, (a.life - age) / 400) : Math.min(1, age / 240));
        sp.setAngle(age < 240 ? 1 + (1 - age / 240) * 1.5 : 1); // asienta con 1°
      } else if (a.kind === 'moki') {
        const c = this.crestData();
        const W = c ? c.W : 1920;
        const tp = s.far.tilePositionX;
        const fs = s.farS || 1;
        sp.x = ((((a.u - tp) % W) + W) % W) * fs;
        const crestY = s.far.y + a.row * fs;
        const up = Math.min(1, age / 220); // asoma desde la cresta en 220 ms (solo se ve lo que está sobre la línea)
        const down = age > a.life - 180 ? (age - (a.life - 180)) / 180 : 0; // baja por el mismo sitio en 180 ms
        const rise = Math.max(0, up - down);
        sp.y = crestY + 30 * (1 - rise); // el recorte deja ver solo lo que está sobre la línea de la cresta
        sp.setCrop(0, 0, sp.width, Math.max(1, sp.height * rise));
        sp.setAlpha(0.88);
        sp.setAngle(age > 400 && age < a.life - 300 ? Math.sin((age - 400) / 280) * 1.5 : 0); // se mece 2 veces ±1.5°
      }
    });
    if (age > a.life) {
      a.sprites.forEach((sp) => sp.destroy());
      this.active = null;
    }
  }
}
