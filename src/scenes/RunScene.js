import Phaser from 'phaser';
import { CONFIG as C } from '../config.js';
import { PAL, TONE } from '../art/palette.js';
import { buildTextures } from '../art/textures.js';
import { buildMokiPieces, createMokiRig } from '../art/mokiRig.js';
import { Particles } from '../art/particles.js';
import { createUI } from '../ui/ui.js';
import { t } from '../i18n.js';
import { load, save, num } from '../storage.js';
import { GAME_LEVEL, buildDemo } from '../tramos.js';
import { airTravel, riseAt, planJump } from '../jumpmodel.js';
import mokiLado from '../../assets/moki/moki-lado.webp';
import mokiSaluda from '../../assets/moki/moki-saluda.webp';

const Q = new URLSearchParams(window.location.search);
const FIXED_SPEED = Number(Q.get('speed')) || 0; // ?speed=320|450|560 fija la velocidad (capturas comparables)
const ANIM_DEBUG = Q.get('anim') === 'debug';
const START_TUT = Q.get('tut') === '2' ? 2 : 0; // ?tut=2 salta a la lección 2
const START_SCREEN = Q.get('screen'); // ?screen=play salta el demo (pruebas)
const GOD = Q.has('god') && (import.meta.env.DEV || Q.has('debug')); // sin choques, solo para pruebas
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const FONT_UI = 'Inter, sans-serif';
const FONT_NUM = 'Outfit, sans-serif';
const KEY_JUMP = [' ', 'ArrowUp', 'w', 'W'];

// Física a mano (no Arcade): el salto se afina por perillas, sin sorpresas del motor.
// Pantallas: demo | play | dead | final | pause. El tutorial vive dentro de play (UX §4).
export class RunScene extends Phaser.Scene {
  constructor() {
    super('RunScene');
  }

  preload() {
    this.load.image('moki', mokiLado);
    this.load.image('mokiSaluda', mokiSaluda);
  }

  create() {
    buildTextures(this);
    buildMokiPieces(this);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = mq.matches;
    mq.addEventListener('change', (e) => (this.reduced = e.matches));
    this.coarse = window.matchMedia('(pointer: coarse)').matches;

    this.ui = createUI();
    this.ui.onPause = () => this.pauseGame();
    this.buildWorld();
    this.buildHud();
    this.buildTutorialUI();
    this.bindInput();

    this.scale.on('resize', () => this.layout());
    this.layout();
    this.demoVariant = 0;
    this.lastInputAt = 0;
    this.screen = 'demo';
    this.god = false;
    if (START_SCREEN === 'play') this.startGame();
    else this.startDemo();
  }

  // ---------- Construcción ----------

  buildWorld() {
    const a = (key, depth) => this.add.tileSprite(0, 0, 10, 10, key).setOrigin(0, 0).setDepth(depth);
    this.sky = a('paper', 0);
    this.skyGrad = this.add.image(0, 0, 'skyGrad').setOrigin(0, 0).setDepth(0.5);
    this.clouds = a('clouds', 1);
    // Velo de papel en el borde superior: las nubes se desvanecen en vez de cortarse en seco.
    this.topFade = this.add.image(0, 0, 'topFade').setOrigin(0, 0).setDepth(1.5);
    this.far = a('far', 2);
    this.mid = a('mid', 3);
    this.surface = a('groundSurface', 4);
    this.canto = a('groundCanto', 4);
    this.front = a('kraft', 4);
    this.shade = this.add.image(0, 0, 'groundShade').setOrigin(0, 0).setDepth(4.1);
    this.folds = [];

    this.px = C.player.xMax;
    this.mokiShadow = this.add.image(this.px, C.world.groundY, 'shadow').setDepth(9);
    // Moki es un títere recortado (src/art/mokiRig.js). Nunca espejado: ni flipX ni escala negativa.
    this.rig = createMokiRig(this);
    this.rig.debugOn = ANIM_DEBUG;
    this.particles = new Particles(this);
    this.strip = this.add.rectangle(0, 0, 10, 10, 0xf4e8d5, 1).setOrigin(0, 0).setDepth(11.9).setAlpha(0); // tira de papel del demo (bajo Moki)
    if (ANIM_DEBUG) {
      // Lectura de medición en el DOM (la cámara con zoom deformaría un texto del lienzo).
      this.debugEl = document.createElement('pre');
      this.debugEl.style.cssText = 'position:fixed;left:8px;bottom:8px;margin:0;padding:6px 8px;font:13px monospace;background:#F4E8D5;color:#22211F;border:2px solid #8A7E70;z-index:50;pointer-events:none';
      document.body.appendChild(this.debugEl);
    }

    this.obstacles = [];
    this.pickups = [];
    this.checkpoints = [];
    this.fg = [];
    this.meta = null;
  }

  // Etiqueta de papel del HUD. Sin palabras en juego (decisión del líder): número + unidad o ficha.
  makeLabel(container, align, iconKey) {
    const gfx = this.add.graphics();
    const icon = iconKey ? this.add.image(0, 0, iconKey).setScale(0.62).setOrigin(0, 0.5) : null;
    const val = this.add.text(0, 0, '', { fontFamily: FONT_NUM, fontStyle: '700', fontSize: '22px', color: PAL.ink });
    container.add(icon ? [gfx, icon, val] : [gfx, val]);
    const label = {
      set(text) {
        val.setText(text);
        const pad = 12;
        const iw = icon ? icon.displayWidth + 8 : 0;
        const h = 40;
        const w = pad + iw + val.width + pad;
        const x0 = align === 'right' ? -w : align === 'center' ? -w / 2 : 0;
        gfx.clear();
        gfx.fillStyle(0x22211f, 0.22);
        gfx.fillRoundedRect(x0 + 3, 5, w, h, 12);
        gfx.fillStyle(0xf4e8d5, 1);
        gfx.fillRoundedRect(x0, 0, w, h, 12);
        gfx.lineStyle(3, Phaser.Display.Color.HexStringToColor(TONE.kraftDark).color, 1);
        gfx.strokeRoundedRect(x0 + 1.5, 1.5, w - 3, h - 3, 11);
        if (icon) icon.setPosition(x0 + pad, h / 2);
        val.setPosition(x0 + pad + iw, (h - val.height) / 2);
      },
    };
    label.set('');
    return label;
  }

  buildHud() {
    this.hudL = this.add.container(0, 0).setDepth(100);
    this.hudR = this.add.container(0, 0).setDepth(100);
    this.hudC = this.add.container(0, 0).setDepth(101).setAlpha(0);
    this.distLabel = this.makeLabel(this.hudL, 'left');
    this.pieceLabel = this.makeLabel(this.hudR, 'right', 'token');
    this.banner = this.makeLabel(this.hudC, 'center');
    this.distLabel.set(`0 ${t('hud.m')}`);
    this.pieceLabel.set('0');
  }

  // Mano de papel, etiqueta, anillo y arco fantasma del tutorial (UX §4). Todo procedural.
  buildTutorialUI() {
    this.tutC = this.add.container(0, 0).setDepth(150).setVisible(false);
    this.tutRing = this.add.graphics();
    this.tutHand = this.add.image(0, 0, 'hand').setOrigin(0.5, 0.1);
    this.tutLabelC = this.add.container(0, 0);
    this.tutLabel = this.makeLabel(this.tutLabelC, 'right');
    this.tutC.add([this.tutRing, this.tutHand, this.tutLabelC]);
    this.tutArc = this.add.graphics().setDepth(14).setVisible(false);
  }

  bindInput() {
    const kb = this.input.keyboard;
    kb.on('keydown', (e) => {
      this.lastInputAt = this.time.now;
      const onButton = e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'A');
      if (this.ui.modalOpen) {
        if (onButton) return; // el botón enfocado se activa solo con Espacio/Enter
        if (KEY_JUMP.includes(e.key) || e.key === 'Enter') {
          e.preventDefault();
          this.ui.primary();
        }
        if (this.screen === 'pause' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) this.resumeGame();
        return;
      }
      if (this.screen === 'demo') {
        if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key) || e.key.startsWith('F')) return;
        e.preventDefault();
        this.startGame();
        return;
      }
      if (KEY_JUMP.includes(e.key) && !e.repeat) {
        e.preventDefault();
        this.coarse = false;
        this.press();
      }
      if (['Escape', 'p', 'P'].includes(e.key) && !e.repeat) this.pauseGame();
    });
    kb.on('keyup', (e) => {
      if (KEY_JUMP.includes(e.key)) this.release();
    });
    this.input.on('pointerdown', () => {
      this.lastInputAt = this.time.now;
      if (this.ui.modalOpen) return;
      this.coarse = true;
      if (this.screen === 'demo') this.startGame();
      else this.press();
    });
    this.input.on('pointerup', () => this.release());
    this.input.on('pointerupoutside', () => this.release());
    // Nada de salto "pegado" ni partida corriendo con la pestaña oculta.
    const lose = () => {
      this.release();
      if (this.screen === 'play') this.pauseGame();
    };
    window.addEventListener('blur', lose);
    document.addEventListener('visibilitychange', () => document.hidden && lose());
    window.addEventListener('pointerdown', () => (this.lastInputAt = this.time.now), true);
    window.addEventListener('keydown', () => (this.lastInputAt = this.time.now), true);
  }

  // La banda jugable (960x540) siempre se ve completa; si sobra pantalla en vertical,
  // el diorama se extiende arriba (cielo) y abajo (suelo de cartón).
  layout() {
    const W = this.scale.width;
    const H = this.scale.height;
    const g = C.world.groundY;
    const z = Math.min(H / C.world.height, W / C.world.minVisibleWidth);
    this.zoom = z;
    this.vw = W / z;
    this.vh = H / z;
    this.px = Math.round(Math.min(C.player.xMax, this.vw * C.player.xRatio));
    this.top = -Math.max(0, this.vh - C.world.height) * 0.6;
    this.bottom = this.top + this.vh;

    const cam = this.cameras.main;
    cam.setBackgroundColor(PAL.paper);
    cam.setZoom(z);
    cam.centerOn(this.vw / 2, this.top + this.vh / 2);

    this.sky.setPosition(0, this.top).setSize(this.vw, this.vh);
    this.skyGrad.setPosition(0, g - 320).setDisplaySize(this.vw, 320);
    this.clouds.setPosition(0, g - 900).setSize(this.vw, 900);
    this.topFade.setPosition(0, this.top).setDisplaySize(this.vw, 56);
    this.base = { far: g + 12 - 300, mid: g + 10 - 360 };
    this.far.setPosition(0, this.base.far).setSize(this.vw, 300);
    this.mid.setPosition(0, this.base.mid).setSize(this.vw, 360);
    this.surface.setPosition(0, g - 8).setSize(this.vw, 22);
    this.canto.setPosition(0, g + 14).setSize(this.vw, 6);
    const frontH = Math.max(40, this.bottom - (g + 20));
    this.front.setPosition(0, g + 20).setSize(this.vw, frontH);
    this.shade.setPosition(0, g + 20).setDisplaySize(this.vw, frontH);
    this.folds.forEach((f) => f.destroy());
    this.folds = [];
    for (let y = g + 62; y < this.bottom; y += 120) {
      this.folds.push(this.add.tileSprite(0, y, this.vw, 6, 'groundFold').setOrigin(0, 0).setDepth(4.2));
    }
    this.strip.setPosition(0, this.top).setSize(this.vw, this.vh);

    const m = 16 / z;
    this.hudL.setScale(1 / z).setPosition(m, this.top + m);
    this.hudR.setScale(1 / z).setPosition(this.vw - m, this.top + m);
    this.hudC.setScale(1 / z).setPosition(this.vw / 2, this.top + m + 52 / z);
    // Mano del tutorial: abajo a la derecha, en la zona del pulgar, fuera del carril de juego.
    this.tutC.setScale(1 / z).setPosition(this.vw - 46 / z, this.bottom - 22 / z);
    this.tutLabelC.setPosition(-64, -58);
  }

  // ---------- Estado de la partida ----------

  resetRun(level, dist0) {
    [...this.obstacles, ...this.pickups, ...this.checkpoints].forEach((e) => e.destroy());
    if (this.meta) this.meta.destroy();
    this.meta = null;
    this.obstacles = [];
    this.pickups = [];
    this.checkpoints = [];
    (this.fg || []).forEach((f) => f.sprite.destroy());
    this.fg = [];
    this.fgNext = 600; // primeras piezas de primer plano casi de inmediato
    this.gpNext = 400;
    this.fgSide = false;
    this.fgPick = 0;
    this.level = level;
    this.dist = dist0;
    this.tramoIdx = 0;
    while (this.tramoIdx + 1 < level.tramos.length && dist0 >= level.starts[this.tramoIdx + 1]) this.tramoIdx++;
    this.nextEnt = level.entities.findIndex((e) => e.D >= dist0);
    if (this.nextEnt < 0) this.nextEnt = level.entities.length;
    this.nextFlag = this.tramoIdx + 1; // siguiente bandera por colocar
    this.y = C.world.groundY;
    this.vy = 0;
    this.grounded = true;
    this.lastGroundedAt = 0;
    this.pressedAt = -1e9;
    this.holding = false;
    this.jumping = false;
    this.jumpStartAt = 0;
    this.takeoffAt = -1e9;
    this.landAt = -1e9;
    this.t = 0;
    this.dead = false;
    this.deadFor = 0;
    this.rampT = 1e9;
    this.metaDone = false;
    this.finalShown = false;
    this.arcGot = {};
    this.combo = 0;
    this.lastPickAt = -1e9;
    this.botRelease = -1;
    this.hideBanner(true);
    this.rig.reset();
    this.particles.clear();
    this.tutSetState('off');
    this.tutArc.setVisible(false);
  }

  startGame() {
    this.ui.hideDemo();
    this.ui.hideFinal();
    this.ui.hideAsi();
    this.ui.hideFail();
    this.ui.hidePause();
    this.demo = false;
    this.screen = 'play';
    this.god = GOD; // invulnerable solo en dev o con ?debug&god (igual que window.__moki)
    this.strip.setAlpha(0);
    this.hudL.setAlpha(1);
    this.hudR.setAlpha(1);
    this.events.emit('gesture'); // el primer gesto habilita el sonido (T3c)
    this.score0 = { pieces: 0, pieceValue: 0 };
    this.pieces = 0;
    this.pieceValue = 0;
    this.cp = { idx: 0, dist: 0, pieces: 0, pieceValue: 0 };
    this.resetRun(GAME_LEVEL, 0);
    this.speed = FIXED_SPEED || GAME_LEVEL.tramos[0].speed;
    this.accel = 0;
    this.tut = { stage: load('moki.tutorial') === '1' ? 4 : START_TUT, state: 'off' };
    this.ui.showPauseButton(true);
    this.distLabel.set(`0 ${t('hud.m')}`);
    this.pieceLabel.set('0');
    this.lastM = 0;
  }

  startDemo() {
    this.ui.hideFinal();
    this.ui.hideAsi();
    this.ui.hideFail();
    this.ui.hidePause();
    this.ui.showPauseButton(false);
    this.demo = true;
    this.screen = 'demo';
    this.god = true; // el bot juega bien; la invulnerabilidad es solo la red de seguridad
    const variant = ['A', 'B', 'C'][this.demoVariant % 3];
    this.pieces = 0;
    this.pieceValue = 0;
    this.cp = { idx: 0, dist: 0, pieces: 0, pieceValue: 0 };
    this.resetRun(buildDemo(variant), 0);
    this.speed = FIXED_SPEED || 320;
    this.accel = 0;
    this.tut = { stage: 4, state: 'off' };
    this.strip.setAlpha(0);
    this.hudL.setAlpha(1);
    this.hudR.setAlpha(1);
    this.distLabel.set(`0 ${t('hud.m')}`);
    this.pieceLabel.set('0');
    this.lastM = 0;
    this.ui.showDemo(this.coarse);
    this.demoStripping = false;
  }

  // Momento del puntaje (UX/DISENO): metros + piezas x 10
  get score() {
    return Math.floor(this.dist / 100) * C.scorePerMeter + C.scorePerPiece * this.pieceValue;
  }

  press() {
    if (this.dead || this.screen === 'final' || this.screen === 'pause') return;
    this.rig.cancelHop(); // la mecánica manda: la celebración se cancela
    this.holding = true;
    this.pressedAt = this.t;
    if (this.tut && (this.tut.state === 'decel' || this.tut.state === 'stopped')) this.tut.pressed = true;
  }

  release() {
    this.holding = false;
    // Tap: si suelta pronto mientras sube, recorta el salto.
    if (this.jumping && this.vy < 0 && this.t - this.jumpStartAt < C.jumpHoldMaxMs) {
      const rise = C.world.groundY - this.y;
      let cut = this.vy * C.jumpCutMultiplier;
      // Un toque rápido nunca baja de jumpMinPx de altura.
      if (rise + (cut * cut) / (2 * C.gravity) < C.jumpMinPx) cut = -Math.sqrt(2 * C.gravity * (C.jumpMinPx - rise));
      this.vy = Math.max(this.vy, cut);
      this.jumping = false;
    }
  }

  showBanner(text, ms) {
    this.tweens.killTweensOf(this.hudC);
    this.banner.set(text);
    this.tweens.add({ targets: this.hudC, alpha: 1, duration: 180, ease: 'Cubic.easeOut' });
    if (ms) this.time.delayedCall(ms, () => this.hideBanner());
  }

  hideBanner(instant) {
    this.tweens.killTweensOf(this.hudC);
    if (instant) this.hudC.setAlpha(0);
    else this.tweens.add({ targets: this.hudC, alpha: 0, duration: 160, ease: 'Cubic.easeIn' });
  }

  // ---------- Pausa ----------

  pauseGame() {
    if (this.screen !== 'play') return;
    this.pausedFrom = this.screen;
    this.screen = 'pause';
    this.release();
    this.tweens.pauseAll();
    this.ui.showPause({ onResume: () => this.resumeGame(), onHome: () => this.goHome() });
  }

  resumeGame() {
    if (this.screen !== 'pause') return;
    this.ui.hidePause();
    this.tweens.resumeAll();
    this.screen = this.pausedFrom || 'play';
    this.rampT = 0; // reanudar no cuenta como salto: el mundo acelera en 600 ms
  }

  goHome() {
    this.tweens.resumeAll();
    this.startDemo();
  }

  // ---------- Piezas del mundo ----------

  addShadow(x, w, alpha) {
    return this.add
      .image(x, C.world.groundY + 1, 'shadow')
      .setDepth(8)
      .setAlpha(alpha)
      .setDisplaySize(w, 18);
  }

  sway(sprite) {
    if (this.reduced) return;
    sprite.setAngle(Phaser.Math.FloatBetween(1, 2) * (Math.random() < 0.5 ? -1 : 1));
    this.tweens.add({ targets: sprite, angle: 0, duration: 520, ease: 'Sine.easeOut' });
  }

  spawnObstacle(e) {
    const g = C.world.groundY;
    const size = C.obstacleSizes[e.type];
    const x = this.px + e.D - this.dist;
    const o = { D: e.D, type: e.type, plan: e.plan, size, x, entered: false, passed: false, handled: false };
    if (e.type === 'viga') {
      const topY = g - size.hangBottom - size.height;
      o.sprite = this.add.image(x, topY - 2, 'viga').setOrigin(0.5, 0).setDepth(10);
      o.threads = [-28, 28].map((dx) => this.add.tileSprite(x + dx, this.top - 10, 6, 10, 'hilo').setOrigin(0.5, 0).setDepth(9.5));
      o.shadow = this.addShadow(x + 6, size.width * 1.2, 0.16);
      o.topY = topY;
    } else {
      o.sprite = this.add.image(x, g + 2, e.type).setOrigin(0.5, 1).setDepth(10);
      o.shadow = this.addShadow(x + 9, size.width * 1.45, 0.4); // sombra corta hacia abajo-derecha
    }
    o.destroy = () => {
      o.sprite.destroy();
      o.shadow.destroy();
      if (o.threads) o.threads.forEach((h) => h.destroy());
    };
    this.obstacles.push(o);
  }

  spawnPickup(e) {
    const g = C.world.groundY;
    const x = this.px + e.D - this.dist;
    const sprite = this.add.image(x, g - e.h, e.amber ? 'tokenAmber' : 'token').setDepth(11);
    const shadow = this.addShadow(x + 4, 26, 0.18);
    const k = { D: e.D, h: e.h, x, y: g - e.h, arc: e.arc, arcN: e.arcN, amber: !!e.amber, sprite, shadow, taken: false };
    k.destroy = () => {
      sprite.destroy();
      shadow.destroy();
    };
    this.pickups.push(k);
  }

  spawnFlag(D, isMeta) {
    const g = C.world.groundY;
    const x = this.px + D - this.dist;
    if (isMeta) {
      const arch = this.add.image(x, g + 2, 'metaArch').setOrigin(0.5, 1).setDepth(9);
      const shadow = this.addShadow(x + 10, 220, 0.3);
      this.meta = { D, x, arch, shadow, destroy() { arch.destroy(); shadow.destroy(); } };
      return;
    }
    const shadow = this.addShadow(x + 10, 110, 0.38);
    const base = this.add.image(x, g + 2, 'cpBase').setOrigin(0.5, 1).setDepth(10);
    const pole = this.add.image(x, g - 20, 'cpPole').setOrigin(0.5, 1).setDepth(10);
    const flag = this.add.image(x + 4, g - 20 - 112 + 6, 'cpFlag').setOrigin(0, 0.5).setDepth(10.1).setScale(0.12, 1);
    this.checkpoints.push({
      D,
      x,
      base,
      pole,
      flag,
      shadow,
      deployed: false,
      destroy() {
        [base, pole, flag, shadow].forEach((s) => s.destroy());
      },
    });
  }

  // ---------- Bucle ----------

  update(_time, deltaMs) {
    const dtMs = Math.min(deltaMs, 50);
    if (this.screen === 'pause') return;
    this.idleCheck();

    if (this.screen === 'dead') return this.updateDead(dtMs);
    if (this.screen === 'final') return this.updateFinal(dtMs);
    this.updateRun(dtMs);
  }

  // Después de la pantalla final, 20 s sin tocar vuelven al demo (no guarda récord).
  idleCheck() {
    if (this.screen === 'final' && this.finalShown && this.time.now - this.lastInputAt > C.demo.idleReturnMs) this.startDemo();
  }

  updateRun(dtMs) {
    const dt = dtMs / 1000;
    this.t += dtMs;
    this.rampT += dtMs;
    if (this.demo) this.demoBot();
    if (this.botRelease > 0 && this.t >= this.botRelease) {
      this.botRelease = -1;
      this.release();
    }

    const tutorial = this.tutorialTick(dtMs);
    if (!tutorial.frozen) this.controlSpeed(dt);
    const ramp = clamp(this.rampT / 600, 0, 1);
    const step = this.rewinding ? 0 : this.speed * dt * (tutorial.frozen ? 1 : ramp);
    this.dist += step;
    if (tutorial.shift) this.dist -= tutorial.shift;

    this.stepJump(dt);
    this.stepWorld(step);
    this.stepEntities(step, dtMs);
    this.particles.update(dtMs, step);
    this.stepMoki(dtMs);
    this.stepHud();

    if (this.demo && !this.demoStripping && this.dist >= this.level.end) this.demoRestart();
    else if (!this.demo && this.dist >= this.level.end && !this.dead) this.finish();
  }

  // Velocidad del tramo con rampa de 2 s al cambiar (sin rampa continua).
  controlSpeed(dt) {
    if (FIXED_SPEED) return;
    const target = this.level.tramos[this.tramoIdx].speed;
    if (this.accel === 0 && this.speed !== target) this.accel = Math.abs(target - this.speed) / C.tramoEaseSec;
    if (this.speed < target) this.speed = Math.min(target, this.speed + this.accel * dt);
    else if (this.speed > target) this.speed = Math.max(target, this.speed - this.accel * dt);
    if (this.speed === target) this.accel = 0;
  }

  stepJump(dt) {
    const canJump = this.grounded || this.t - this.lastGroundedAt <= C.coyoteMs;
    const buffered = this.t - this.pressedAt <= C.jumpBufferMs;
    if (canJump && buffered && !this.jumping) {
      this.vy = -C.jumpVelocity;
      this.grounded = false;
      this.jumping = true;
      this.jumpStartAt = this.t;
      this.takeoffAt = this.t;
      this.pressedAt = -1e9;
      // Ya lo soltó antes de que empezara el salto (tap muy corto con buffer).
      if (!this.holding) this.release();
    }

    this.vy += C.gravity * dt;
    const impact = this.vy;
    this.y += this.vy * dt;
    if (this.y >= C.world.groundY) {
      this.y = C.world.groundY;
      this.vy = 0;
      if (!this.grounded) {
        this.lastGroundedAt = this.t;
        this.landAt = this.t;
        if (impact > 260) this.particles.burst('land', this.px, C.world.groundY);
      }
      this.grounded = true;
      this.jumping = false;
    } else {
      if (this.grounded) this.lastGroundedAt = this.t;
      this.grounded = false;
    }
    if (this.vy > 0) this.jumping = false;
  }

  stepWorld(step) {
    const p = C.art.parallax;
    // Con movimiento reducido el fondo se queda quieto; el plano de juego sí corre (es la mecánica).
    this.clouds.tilePositionX = this.reduced ? 0 : this.dist * p.clouds;
    this.far.tilePositionX = this.reduced ? 0 : this.dist * p.far;
    this.mid.tilePositionX = this.reduced ? 0 : this.dist * p.mid;
    this.surface.tilePositionX = this.dist;
    this.canto.tilePositionX = this.dist;
    this.front.tilePositionX = this.dist;
    this.folds.forEach((f) => (f.tilePositionX = this.dist));

    // Profundidad con el salto: las capas lejanas bajan unos px cuando Moki sube (sin zoom de cámara).
    const V = C.art.vertical;
    const lift = this.reduced ? 0 : Math.max(0, C.world.groundY - this.y);
    this.far.y = this.base.far + Math.min(V.maxPx, lift * V.far);
    this.mid.y = this.base.mid + Math.min(V.maxPx, lift * V.mid);
    this.stepForeground(step);
  }

  // Primer plano a 1.3x: tiras de cartulina FUERA del carril (nunca entre groundY-130 y groundY+10).
  // En pantallas altas llenan el suelo vacío bajo el diorama.
  // Piezas chicas y distintas (pasto, piedras, cartón rasgado), más oscuras que el suelo: primer plano a 1.3x solo en
  // los 40 px inferiores y, en pantallas altas, decoración del suelo a 1.0x entre el carril y el primer plano.
  stepForeground(step) {
    const F = C.art.foreground;
    const g = C.world.groundY;
    for (const f of this.fg) {
      f.x -= step * f.speed;
      f.sprite.x = f.x;
    }
    this.fg = this.fg.filter((f) => (f.x < -90 ? (f.sprite.destroy(), false) : true));
    if (this.reduced || this.dead) return;
    const kinds = ['grass', 'stone', 'torn', 'grass', 'stone'];
    const pick = () => `gp-${kinds[this.fgPick % kinds.length]}${(this.fgPick++ >> 1) % 3}`;
    const x = this.vw + 90;
    if (this.t >= this.fgNext) {
      this.fgNext = this.t + F.minGapSec * 70 + Math.random() * 360; // 3 a 4 piezas repartidas a la vista en 1280
      const sprite = this.add.image(x, 0, pick()).setOrigin(0.5, 1).setDepth(20);
      // la pieza queda dentro de los 40 px de abajo: su borde superior no sube de bottom-40
      const yMin = this.bottom - 40 + sprite.height;
      sprite.y = Math.max(yMin, this.bottom + 8 - Math.random() * 14);
      this.fg.push({ x, sprite, speed: F.speed });
    }
    const room = this.bottom - (g + 24) - 56;
    if (room > 70 && this.t >= this.gpNext) {
      this.gpNext = this.t + 150 + Math.random() * 230;
      const sprite = this.add.image(x, 0, pick()).setOrigin(0.5, 1).setDepth(4.5);
      const sc = 1.25 + Math.random() * 0.45;
      sprite.setScale(sc);
      sprite.y = g + 36 + sprite.displayHeight + Math.random() * Math.max(0, room - sprite.displayHeight - 20);
      this.fg.push({ x, sprite, speed: 1 });
    }
  }

  // Todo lo que corre con el mundo: posición = punto de Moki + distancia que falta (el guion es por distancia).
  placeEntities() {
    const px = this.px;
    const dist = this.dist;
    for (const o of this.obstacles) {
      o.x = px + o.D - dist;
      o.sprite.x = o.x;
      o.shadow.x = o.x + (o.type === 'viga' ? 6 : 9);
      if (o.threads) {
        o.threads.forEach((h, i) => {
          h.x = o.x + (i ? 28 : -28);
          h.y = this.top - 10;
          h.setSize(6, Math.max(2, o.topY + 6 - (this.top - 10)));
        });
        if (!this.reduced) o.sprite.setAngle(Math.sin(this.t / 700 + o.D) * 1.2);
      }
      if (!o.entered && o.x < this.vw - 20) {
        o.entered = true;
        if (o.type !== 'viga') this.sway(o.sprite);
      }
    }
    for (const k of this.pickups) {
      k.x = px + k.D - dist;
      if (!k.taken) {
        k.sprite.x = k.x;
        k.shadow.x = k.x + 4;
      }
    }
    for (const cp of this.checkpoints) {
      cp.x = px + cp.D - dist;
      cp.base.x = cp.pole.x = cp.x;
      cp.flag.x = cp.x + 4;
      cp.shadow.x = cp.x + 8;
      if (!cp.deployed && cp.x < this.vw - 40) {
        cp.deployed = true;
        this.tweens.add({ targets: cp.flag, scaleX: 1, duration: C.art.checkpointFlagMs, ease: 'Cubic.easeOut' });
      }
      if (cp.deployed && !this.reduced) cp.flag.y = C.world.groundY - 20 - 112 + 6 + Math.sin(this.t / 420) * 1.5;
    }
    if (this.meta) {
      this.meta.x = px + this.meta.D - dist;
      this.meta.arch.x = this.meta.x;
      this.meta.shadow.x = this.meta.x + 10;
    }
  }

  stepEntities(step, dtMs) {
    const g = C.world.groundY;
    const lead = this.vw + 80 - this.px; // los elementos nacen justo fuera de la pantalla

    // Guion: entra cada entidad cuando le toca (por distancia, nada al azar)
    const ents = this.level.entities;
    while (this.nextEnt < ents.length && ents[this.nextEnt].D - this.dist <= lead) {
      const e = ents[this.nextEnt++];
      if (e.kind === 'obs') this.spawnObstacle(e);
      else this.spawnPickup(e);
    }
    const starts = this.level.starts;
    while (this.nextFlag < starts.length && starts[this.nextFlag] - this.dist <= lead + 40) this.spawnFlag(starts[this.nextFlag++], false);
    if (!this.meta && !this.metaDone && this.level.end - this.dist <= lead + 40 && !this.demo) this.spawnFlag(this.level.end, true);

    this.placeEntities();

    // Checkpoint: al cruzar el inicio de un tramo se guarda el aprendizaje
    while (this.tramoIdx + 1 < this.level.tramos.length && this.dist >= starts[this.tramoIdx + 1]) {
      this.tramoIdx++;
      this.speedFrom = this.speed;
      this.accel = 0; // se recalcula hacia la velocidad del tramo con rampa de 2 s
      this.cp = { idx: this.tramoIdx, dist: starts[this.tramoIdx], pieces: this.pieces, pieceValue: this.pieceValue };
      this.showBanner(t('hud.cp'), C.art.checkpointLabelMs);
      this.rig.startHop();
      this.particles.burst('confetti', this.px + 20, g - 20 - 112);
    }

    // Limpieza
    const outX = -140;
    this.obstacles = this.obstacles.filter((o) => (o.x < outX ? (o.destroy(), false) : true));
    this.pickups = this.pickups.filter((k) => (k.x < outX && !k.taken ? (k.destroy(), false) : !k.taken));
    this.checkpoints = this.checkpoints.filter((cp) => (cp.x < outX ? (cp.destroy(), false) : true));

    // Recoger piezas: la caja de recogida sigue el cuerpo de Moki (centro = salto + 46 px), no todo Moki
    const R = C.pickupReach;
    const bodyY = g - this.y + R.bodyCenter;
    for (const k of this.pickups) {
      if (k.taken) continue;
      if (Math.abs(k.x - this.px) < R.dx && Math.abs(k.h - bodyY) < R.dy) this.collect(k);
    }

    // Colisión (caja del jugador más chica que el dibujo)
    const pw = C.player.width - 6;
    const ph = C.player.height - 6;
    const pl = this.px - pw / 2;
    const pt = this.y - ph;
    const pb = this.y - 2;
    for (const o of this.obstacles) {
      if (o.x < this.px - 60) o.passed = true;
      if (this.rewinding || this.god) continue;
      const ol = o.x - o.size.width / 2 + C.hitboxShrink.x;
      const or = o.x + o.size.width / 2 - C.hitboxShrink.x;
      let ot;
      let ob;
      if (o.type === 'viga') {
        ob = g - o.size.hangBottom;
        ot = ob - o.size.height;
      } else {
        ot = g - o.size.height + C.hitboxShrink.top;
        ob = g;
      }
      if (pl < or && pl + pw > ol && pt < ob && pb > ot) {
        this.crash(o);
        break;
      }
    }
    void step;
    void dtMs;
  }

  collect(k) {
    const R = C.combo;
    k.taken = true;
    // Racha: cada pieza a menos de 0.9 s de la anterior suma
    if (this.t - this.lastPickAt > R.windowMs) this.combo = 0;
    this.combo += 1;
    this.lastPickAt = this.t;
    let mult = 1;
    for (const [from, v] of R.steps) if (this.combo >= from) mult = v;
    this.pieces += 1;
    this.pieceValue += (k.amber ? C.amberValue : 1) * mult;
    if (k.arc) {
      this.arcGot[k.arc] = (this.arcGot[k.arc] || 0) + 1;
      if (this.arcGot[k.arc] === k.arcN) this.pieceValue += C.arcBonus; // arco completo
    }
    this.pieceLabel.set(String(this.pieces));
    this.particles.burst('collect', k.x, k.y);
    this.tweens.add({
      targets: k.sprite,
      y: k.y - 12,
      scale: 0,
      duration: this.reduced ? 120 : C.art.collectMs,
      ease: 'Cubic.easeIn',
      onComplete: () => k.destroy(),
    });
    this.tweens.add({ targets: k.shadow, alpha: 0, duration: C.art.collectMs });
  }

  // Moki: el títere (src/art/mokiRig.js) hace todo el dibujo y la animación; aquí solo se le pasa el estado
  // y se dibuja la sombra de contacto, que marca la altura del salto.
  stepMoki(dtMs) {
    const g = C.world.groundY;
    this.rig.update(
      {
        x: this.px,
        y: this.y,
        grounded: this.grounded,
        vy: this.vy,
        speed: this.speed,
        t: this.t,
        takeoffAt: this.takeoffAt,
        landAt: this.landAt,
        dead: this.dead,
        reduced: this.reduced,
        dist: this.dist,
      },
      dtMs
    );

    let sink = 0; // hundimiento de aterrizaje (px), solo para ensanchar la sombra
    if (!this.reduced) {
      const ld = this.t - this.landAt;
      if (ld >= 0 && ld < C.art.landingMs) sink = 1 - easeOutCubic(ld / C.art.landingMs);
    }
    const air = Math.max(0, g - this.y);
    const f = 1 / (1 + air / 150);
    this.mokiShadow.setPosition(this.px + 8, g + 1);
    this.mokiShadow.setDisplaySize(96 * (0.5 + 0.5 * f) * (1 + sink * 0.12), 22 * (0.6 + 0.4 * f));
    this.mokiShadow.setAlpha(0.28 * (0.4 + 0.6 * f));

    if (this.debugEl) {
      const d = this.rig.debug;
      this.debugEl.textContent =
        `v ${this.speed.toFixed(0)} px/s  fase ${d.phi.toFixed(2)}\n` +
        `periodo ${(d.period * 1000).toFixed(0)} ms  ciclo ${d.cyclePx.toFixed(1)} px\n` +
        `deslizamiento apoyo ${d.slide.toFixed(2)} px  (ultimo ${d.lastSlide.toFixed(2)}, max ${d.maxSlide.toFixed(2)})\n` +
        `vaiven cadera ${d.bob.toFixed(2)} px  hundimiento pie ${d.sink.toFixed(2)} px`;
    }
  }

  stepHud() {
    const m = Math.floor(this.dist / 100);
    if (m !== this.lastM) {
      this.lastM = m;
      this.distLabel.set(`${m} ${t('hud.m')}`);
    }
  }

  // ---------- Tutorial (UX §4): el juego es el tutorial ----------

  tutSetState(state) {
    if (this.tut) this.tut.state = state;
    const on = state === 'decel' || state === 'stopped' || state === 'rewind';
    this.tutC.setVisible(on);
    this.tutArc.setVisible(on);
    this.rewinding = state === 'rewind';
  }

  // Devuelve { frozen, shift }: frozen = el tutorial manda sobre la velocidad; shift = px que rebobina esta vez.
  tutorialTick(dtMs) {
    const tut = this.tut;
    const T = C.tutorial;
    const out = { frozen: false, shift: 0 };
    if (!tut || this.demo || tut.stage >= 4) return out;

    // 1) Buscar el obstáculo de la lección
    if (tut.state === 'off' && (tut.stage === 0 || tut.stage === 2)) {
      const need = tut.stage === 0 ? 'caja' : 'torre';
      const o = this.obstacles.find((q) => q.type === need && q.x > this.px + 40);
      if (o) {
        const kind = tut.stage === 0 ? 'tap' : 'hold';
        const v = this.speed;
        const stopDist = airTravel(kind, v) / 2; // despegue a mitad del recorrido aéreo
        const decelPx = (v * (T.stopMs / 1000)) / 2;
        if (o.x - this.px <= stopDist + decelPx) {
          Object.assign(tut, { obs: o, kind, v0: v, stopDist, t: 0, handT: 0, pressed: false });
          tut.stage += 1;
          this.tutSetState('decel');
          this.drawTutArc();
          this.tutLabel.set(t(this.tutKey(kind)));
        }
      }
    }

    if (tut.state === 'decel' || tut.state === 'stopped') {
      out.frozen = true;
      tut.t += dtMs;
      tut.handT += dtMs;
      if (tut.pressed) {
        // Al presionar: el mundo vuelve a su velocidad, la mano se va y el salto ocurre en este cuadro.
        tut.pressed = false;
        this.speed = tut.v0;
        this.accel = 0;
        this.tutC.setVisible(false);
        this.tutArc.setVisible(false);
        tut.state = 'run';
        out.frozen = false;
        this.tutSetState('run');
        return out;
      }
      const u = this.reduced ? 1 : Math.min(1, tut.t / T.stopMs);
      this.speed = tut.v0 * (1 - u);
      if (u >= 1) {
        this.speed = 0;
        if (tut.state === 'decel') tut.state = 'stopped';
        // no pasa de la distancia ideal aunque se haya perdido un cuadro
        const gap = tut.obs.x - this.px - tut.stopDist;
        if (gap < 0) out.shift = gap;
      }
      this.stepTutHand();
    } else if (tut.state === 'rewind') {
      out.frozen = true;
      const rate = (tut.rewindPx * dtMs) / T.rewindMs;
      const take = Math.min(rate, tut.rewindLeft);
      tut.rewindLeft -= take;
      out.shift = take;
      this.speed = 0;
      if (tut.rewindLeft <= 0.01) {
        tut.state = 'stopped';
        this.tutSetState('stopped');
        this.tutC.setVisible(true);
        this.tutArc.setVisible(true);
        tut.handT = 0;
      }
    } else if (tut.state === 'run') {
      // La lección termina cuando Moki pasa el obstáculo sin chocar
      if (tut.obs.x < this.px - 40) {
        tut.state = 'off';
        this.showBanner(t('tut.ok'), T.okMs);
        if (tut.stage === 3) {
          tut.stage = 4;
          save('moki.tutorial', '1');
        } else tut.stage = 2;
      }
    }
    return out;
  }

  tutKey(kind) {
    return `tut.${kind === 'tap' ? 'tap' : 'hold'}.${this.coarse ? 'touch' : 'kbd'}`;
  }

  // Arco punteado de tinta desde Moki, sobre el obstáculo (el modelo de salto da la trayectoria)
  drawTutArc() {
    const tut = this.tut;
    const g = C.world.groundY;
    const gfx = this.tutArc;
    gfx.clear();
    gfx.fillStyle(Phaser.Display.Color.HexStringToColor(PAL.border).color, 1);
    const air = planJump(tut.kind).air;
    for (let tt = 0.02; tt < air; tt += 0.028) {
      const x = this.px + tt * tut.v0;
      const y = g - riseAt(tut.kind, tut.v0, tt * tut.v0) - C.pickupReach.bodyCenter;
      gfx.fillCircle(x, y, 2);
    }
  }

  // Mano de papel: pulsa 4 veces (cada 1.2 s) y se queda presionada; vuelve a pulsar cada 10 s.
  stepTutHand() {
    const tut = this.tut;
    const T = C.tutorial;
    const cycle = T.handPulseMs * T.handPulses;
    const ph = tut.handT % (cycle + T.repeatMs);
    const inPulses = ph < cycle;
    const hold = tut.kind === 'hold';
    let down = 0; // 0 arriba, 1 abajo
    let ring = 0;
    if (this.reduced || !inPulses) down = 1;
    else {
      const u = (ph % T.handPulseMs) / T.handPulseMs;
      down = hold ? clamp(u * 3, 0, 1) : u < 0.28 ? Math.sin((u / 0.28) * Math.PI * 0.5) : Math.max(0, 1 - (u - 0.28) * 4);
    }
    ring = hold ? clamp(((inPulses ? ph % T.handPulseMs : 400) / 400), 0, 1) * (down > 0.9 ? 1 : 0) : down > 0.5 ? 1 : 0;
    this.tutHand.setPosition(0, down * 14);
    this.tutHand.setScale(1 - down * 0.06);
    const gfx = this.tutRing;
    gfx.clear();
    gfx.lineStyle(4, 0x22211f, 0.2);
    gfx.strokeCircle(0, -4, 22);
    if (ring > 0) {
      gfx.lineStyle(4, 0x22211f, 0.45);
      gfx.beginPath();
      gfx.arc(0, -4, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (hold ? ring : 1), false);
      gfx.strokePath();
    }
  }

  // Bot del demo (DISENO "demo"): salta 60-80 ms antes del punto ideal; toque 80 ms; mantiene 240 ms en torres y arcos altos.
  demoBot() {
    if (this.botRelease > 0) return;
    const o = this.obstacles.find((q) => !q.handled && q.x > this.px - 4 && (q.plan === 'tap' || q.plan === 'hold'));
    if (!o) return;
    const kind = o.plan;
    // Dos cajas pegadas (CC): un salto largo centrado en el par
    const pair = this.obstacles.some((q) => q.plan === 'skip' && q.D > o.D && q.D - o.D < 120) ? C.cajaPegadaGapPx / 2 : 0;
    const lead = airTravel(kind, this.speed) / 2 + this.speed * 0.07 - pair; // despega más tarde: el apex cae en el centro del par
    if (o.x - this.px <= lead && this.grounded) {
      o.handled = true;
      this.press();
      this.botRelease = this.t + (kind === 'tap' ? 80 : 240);
    }
  }

  demoRestart() {
    this.demoStripping = true;
    this.rig.cancelHop();
    // Tira de papel que cubre mundo y HUD (no a Moki) y se retira: el reinicio no se nota
    const d = C.demo.stripMs;
    this.tweens.add({ targets: this.strip, alpha: 1, duration: d, onComplete: () => this.demoNext() });
    this.tweens.add({ targets: [this.hudL, this.hudR], alpha: 0, duration: d });
  }

  demoNext() {
    const keepSpeed = this.speed;
    this.demoVariant += 1;
    this.startDemo();
    this.speed = FIXED_SPEED || 320;
    void keepSpeed;
    this.strip.setAlpha(1);
    this.hudL.setAlpha(0);
    this.hudR.setAlpha(0);
    this.tweens.add({ targets: this.strip, alpha: 0, duration: C.demo.stripMs });
    this.tweens.add({ targets: [this.hudL, this.hudR], alpha: 1, duration: C.demo.stripMs });
  }

  // ---------- Fallo ----------

  crash(o) {
    const tut = this.tut;
    if (tut && !this.demo && (tut.state === 'run' || tut.state === 'stopped' || tut.state === 'decel') && (tut.stage === 1 || tut.stage === 3)) {
      // Fallar una lección no saca tarjeta: el obstáculo regresa a la espera y la mano reaparece.
      this.release();
      this.y = C.world.groundY;
      this.vy = 0;
      this.grounded = true;
      this.jumping = false;
      this.rig.reset();
      this.speed = 0;
      const want = this.px + tut.stopDist;
      tut.rewindPx = Math.max(0, want - tut.obs.x);
      tut.rewindLeft = tut.rewindPx;
      this.tutSetState('rewind');
      return;
    }
    this.dead = true;
    this.screen = 'dead';
    this.deadFor = 0;
    this.deadSpeed = this.speed;
    this.holding = false;
    this.cause = o.type;
    this.cardShown = false;
    this.particles.burst('crash', this.px + 12, this.y - 10);
    // La mejor marca se guarda también al fallar (no en el demo)
    if (!this.demo && this.score > num('moki.best', 0)) save('moki.best', this.score);
  }

  updateDead(dtMs) {
    const dt = dtMs / 1000;
    this.deadFor += dtMs;
    // Tropiezo (ANIMACION 3.4): hit-stop de 60 ms, luego el mundo frena en 220 ms y todo se asienta.
    if (this.deadFor >= C.art.hitStopMs || this.reduced) {
      this.t += dtMs;
      const u = Math.min(1, (this.deadFor - C.art.hitStopMs) / 220);
      this.speed = this.deadSpeed * (1 - easeOutCubic(this.reduced ? 1 : u));
      const step = this.speed * dt;
      this.dist += step;
      this.stepWorld(step);
      this.placeEntities();
      this.particles.update(dtMs, step);
      this.stepMoki(dtMs);
    }
    if (!this.cardShown && this.deadFor >= (this.reduced ? 150 : 250)) {
      this.cardShown = true;
      this.showFailCard();
    }
    if (this.cardShown && this.deadFor >= C.retryLockoutMs) this.ui.unlockFail();
  }

  failRect() {
    const W = this.scale.width;
    const H = this.scale.height;
    const z = this.zoom;
    const mokiX = this.px * z;
    const headY = (C.world.groundY - C.player.spriteHeight - this.top) * z;
    const wide = W >= 700 && W > H * 0.9;
    if (wide) {
      const left = Math.round(mokiX + 120);
      return { left, top: Math.max(76, Math.round(H * 0.1)), width: Math.min(480, W - left - 24), maxHeight: H - 100 };
    }
    return { left: 16, top: 76, width: Math.min(W - 32, 440), maxHeight: Math.max(150, Math.round(headY - 76 - 12)) };
  }

  showFailCard() {
    const idx = num('moki.lesson', 0) % 3;
    if (!this.demo) save('moki.lesson', idx + 1); // las 3 lecciones rotan en orden
    const pct = Math.min(99, Math.floor((100 * this.dist) / this.level.end));
    const meta = `${t('fail.pct', { n: pct })} · ${this.cp.idx > 0 ? t('fail.cp') : t('fail.start')}`;
    this.ui.showFail(
      { lesson: t(`fail.l${idx + 1}`), hint: t(`fail.hint.${this.cause}`), meta, prompt: t(this.coarse ? 'fail.go.touch' : 'fail.go.kbd'), rect: this.failRect() },
      () => this.respawn()
    );
  }

  // Reintento con un toque: Moki sale del inicio del tramo con lo guardado y 85% de velocidad que sube en 1 s.
  respawn() {
    this.ui.hideFail();
    const cp = this.cp;
    this.pieces = cp.pieces;
    this.pieceValue = cp.pieceValue;
    this.resetRun(this.level, cp.dist);
    this.screen = 'play';
    const target = this.level.tramos[this.tramoIdx].speed;
    this.speed = FIXED_SPEED || target * C.respawnSpeedMult;
    this.accel = FIXED_SPEED ? 0 : (target - this.speed) / C.respawnEaseSec;
    this.pieceLabel.set(String(this.pieces));
    this.lastM = -1;
    this.tut = { stage: this.tut.stage === 1 ? 0 : this.tut.stage === 3 ? 2 : this.tut.stage, state: 'off' };
    this.rig.reset();
  }

  // ---------- Final ----------

  finish() {
    this.screen = 'final';
    this.finalShown = false;
    this.finalT = 0;
    this.finalSpeed = this.speed;
    this.metaDone = true;
    this.release();
    this.rig.startHop();
    save('moki.done', '1'); // abre Hardcore (decisión del líder)
    const best = num('moki.best', 0);
    this.finalData = { isNew: this.score > best };
    if (this.score > best) save('moki.best', this.score);
    this.ui.showPauseButton(false);
  }

  updateFinal(dtMs) {
    const dt = dtMs / 1000;
    this.finalT += dtMs;
    this.t += dtMs;
    // El mundo frena en 1 s; Moki queda en pose de celebración
    const u = Math.min(1, this.finalT / 1000);
    this.speed = this.finalSpeed * (1 - easeOutCubic(this.reduced ? 1 : u));
    const step = this.speed * dt;
    this.dist += step;
    this.stepJump(dt);
    this.stepWorld(step);
    this.placeEntities();
    this.particles.update(dtMs, step);
    this.stepMoki(dtMs);
    if (!this.finalShown && this.finalT >= 1200) {
      this.finalShown = true;
      this.lastInputAt = this.time.now;
      this.showFinalCard();
    }
  }

  showFinalCard() {
    const rect = this.failRect();
    const wide = this.scale.width >= 700 && this.scale.width > this.scale.height * 0.9;
    const r = wide ? rect : { ...rect, maxHeight: this.scale.height - rect.top - 16 };
    this.ui.showFinal(
      {
        isNew: this.finalData.isNew,
        meters: Math.floor(this.dist / 100),
        pieces: this.pieces,
        piecesTotal: this.level.pieceTotal,
        score: this.score,
        best: num('moki.best', 0),
      },
      { onAgain: () => this.playAgain(), onHow: () => this.showAsi() },
      r
    );
  }

  showAsi() {
    this.ui.showAsi(C.jorgeInterventions, () => this.ui.hideAsi());
  }

  playAgain() {
    this.startGame();
    this.tut = { stage: 4, state: 'off' }; // "Otra vez": sin tutorial
    this.metaDone = false;
  }
}
