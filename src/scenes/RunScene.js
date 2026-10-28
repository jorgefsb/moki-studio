import Phaser from 'phaser';
import { CONFIG as C } from '../config.js';
import { PAL, TONE } from '../art/palette.js';
import { buildTextures } from '../art/textures.js';
import mokiLado from '../../assets/moki/moki-lado.webp';

const MOKI_PX_H = 260; // alto del .webp de moki-lado
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const FONT_UI = 'Inter, sans-serif';
const FONT_NUM = 'Outfit, sans-serif';

// Física a mano (no Arcade): el salto se afina por perillas, sin sorpresas del motor.
export class RunScene extends Phaser.Scene {
  constructor() {
    super('RunScene');
  }

  preload() {
    this.load.image('moki', mokiLado);
  }

  create() {
    buildTextures(this);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = mq.matches;
    mq.addEventListener('change', (e) => (this.reduced = e.matches));

    this.buildWorld();
    this.buildHud();
    this.bindInput();

    this.scale.on('resize', () => this.layout());
    this.layout();
    this.restart();
  }

  // ---------- Construcción ----------

  buildWorld() {
    const a = (key, depth) => this.add.tileSprite(0, 0, 10, 10, key).setOrigin(0, 0).setDepth(depth);
    this.sky = a('paper', 0);
    this.skyGrad = this.add.image(0, 0, 'skyGrad').setOrigin(0, 0).setDepth(0.5);
    this.clouds = a('clouds', 1);
    this.far = a('far', 2);
    this.mid = a('mid', 3);
    this.surface = a('groundSurface', 4);
    this.canto = a('groundCanto', 4);
    this.front = a('kraft', 4);
    this.shade = this.add.image(0, 0, 'groundShade').setOrigin(0, 0).setDepth(4.1);
    this.folds = [];

    this.mokiShadow = this.add.image(C.player.x, C.world.groundY, 'shadow').setDepth(9);
    this.moki = this.add.image(C.player.x, C.world.groundY, 'moki').setDepth(12);
    // Nunca espejado: sin flipX ni escala negativa en ningún punto del código.
    this.mokiScale = C.player.spriteHeight / MOKI_PX_H;

    this.obstacles = [];
    this.pickups = [];
    this.checkpoints = [];
  }

  makeLabel(container, caption, align) {
    const gfx = this.add.graphics();
    const cap = this.add.text(0, 0, caption, { fontFamily: FONT_UI, fontSize: '16px', color: PAL.ink });
    const val = this.add.text(0, 0, '', { fontFamily: FONT_NUM, fontStyle: '700', fontSize: '22px', color: PAL.ink });
    container.add([gfx, cap, val]);
    const label = {
      set(text) {
        val.setText(text);
        const pad = 12;
        const gap = caption ? 8 : 0;
        const h = 40;
        const w = pad + cap.width + gap + val.width + pad;
        const x0 = align === 'right' ? -w : align === 'center' ? -w / 2 : 0;
        gfx.clear();
        gfx.fillStyle(0x22211f, 0.22);
        gfx.fillRoundedRect(x0 + 3, 5, w, h, 12);
        gfx.fillStyle(0xf4e8d5, 1);
        gfx.fillRoundedRect(x0, 0, w, h, 12);
        gfx.lineStyle(3, Phaser.Display.Color.HexStringToColor(TONE.kraftDark).color, 1);
        gfx.strokeRoundedRect(x0 + 1.5, 1.5, w - 3, h - 3, 11);
        cap.setPosition(x0 + pad, (h - cap.height) / 2);
        val.setPosition(x0 + pad + cap.width + gap, (h - val.height) / 2);
      },
    };
    label.set('');
    return label;
  }

  buildHud() {
    this.hudL = this.add.container(0, 0).setDepth(100);
    this.hudR = this.add.container(0, 0).setDepth(100);
    this.hudC = this.add.container(0, 0).setDepth(101).setAlpha(0);
    this.distLabel = this.makeLabel(this.hudL, 'Distancia', 'left');
    this.pieceLabel = this.makeLabel(this.hudR, 'Piezas', 'right');
    this.banner = this.makeLabel(this.hudC, '', 'center');
    this.distLabel.set('0 m');
    this.pieceLabel.set('0');
  }

  bindInput() {
    const jumpKeys = [' ', 'ArrowUp', 'w', 'W'];
    this.input.keyboard.on('keydown', (e) => {
      if (jumpKeys.includes(e.key) && !e.repeat) this.press();
      if (['Escape', 'p', 'P'].includes(e.key) && !e.repeat) this.togglePause();
    });
    this.input.keyboard.on('keyup', (e) => {
      if (jumpKeys.includes(e.key)) this.release();
    });
    this.input.on('pointerdown', () => this.press());
    this.input.on('pointerup', () => this.release());
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
    this.top = -Math.max(0, this.vh - C.world.height) * 0.6;
    this.bottom = this.top + this.vh;

    const cam = this.cameras.main;
    cam.setBackgroundColor(PAL.paper);
    cam.setZoom(z);
    cam.centerOn(this.vw / 2, this.top + this.vh / 2);

    this.sky.setPosition(0, this.top).setSize(this.vw, this.vh);
    this.skyGrad.setPosition(0, g - 320).setDisplaySize(this.vw, 320);
    this.clouds.setPosition(0, g - 900).setSize(this.vw, 900);
    this.far.setPosition(0, g + 12 - 300).setSize(this.vw, 300);
    this.mid.setPosition(0, g + 10 - 360).setSize(this.vw, 360);
    this.surface.setPosition(0, g - 8).setSize(this.vw, 22);
    this.canto.setPosition(0, g + 14).setSize(this.vw, 6);
    const frontH = Math.max(40, this.bottom - (g + 20));
    this.front.setPosition(0, g + 20).setSize(this.vw, frontH);
    this.shade.setPosition(0, g + 20).setDisplaySize(this.vw, frontH);
    this.folds.forEach((f) => f.destroy());
    this.folds = [];
    for (let y = g + 62; y < this.bottom; y += 120) {
      this.folds.push(this.add.tileSprite(0, y, this.vw, 4, 'groundFold').setOrigin(0, 0).setDepth(4.2));
    }

    const m = 16 / z;
    this.hudL.setScale(1 / z).setPosition(m, this.top + m);
    this.hudR.setScale(1 / z).setPosition(this.vw - m, this.top + m);
    this.hudC.setScale(1 / z).setPosition(this.vw / 2, this.top + m + 52 / z);
  }

  // ---------- Estado ----------

  restart() {
    [...this.obstacles, ...this.pickups, ...this.checkpoints].forEach((e) => e.destroy());
    this.obstacles = [];
    this.pickups = [];
    this.checkpoints = [];
    this.y = C.world.groundY; // pies
    this.vy = 0;
    this.grounded = true;
    this.lastGroundedAt = 0;
    this.pressedAt = -1e9;
    this.holding = false;
    this.jumping = false;
    this.jumpStartAt = 0;
    this.takeoffAt = -1e9;
    this.landAt = -1e9;
    this.tilt = 0;
    this.runPhase = 0;
    this.speed = C.runSpeedStart;
    this.nextSpawnIn = 640; // calma inicial: el primer obstáculo llega tras ~2 s
    this.nextCheckpointAt = C.checkpointEverySec * 1000;
    this.dist = 0;
    this.pieces = 0;
    this.dead = false;
    this.god = false;
    this.paused = false;
    this.t = 0; // ms de juego
    this.distLabel.set('0 m');
    this.pieceLabel.set('0');
    this.hideBanner(true);
  }

  press() {
    if (this.dead) return;
    this.holding = true;
    this.pressedAt = this.t;
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

  togglePause() {
    this.paused = !this.paused;
    if (this.paused) this.showBanner('Pausa', 0);
    else this.hideBanner();
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

  // ---------- Piezas del mundo ----------

  addShadow(x, w, alpha) {
    return this.add
      .image(x, C.world.groundY + 1, 'shadow')
      .setDepth(8)
      .setAlpha(alpha)
      .setDisplaySize(w, 14);
  }

  sway(sprite) {
    if (this.reduced) return;
    sprite.setAngle(Phaser.Math.FloatBetween(1, 2) * (Math.random() < 0.5 ? -1 : 1));
    this.tweens.add({ targets: sprite, angle: 0, duration: 520, ease: 'Sine.easeOut' });
  }

  spawnObstacle() {
    const size = Phaser.Utils.Array.GetRandom(C.obstacleSizes);
    const x = this.vw + 80;
    const sprite = this.add.image(x, C.world.groundY, size.key).setOrigin(0.5, 1).setDepth(10);
    const shadow = this.addShadow(x + 6, size.width * 1.5, 0.3);
    const o = {
      x,
      size,
      sprite,
      shadow,
      entered: false,
      destroy() {
        sprite.destroy();
        shadow.destroy();
      },
    };
    this.obstacles.push(o);
    return o;
  }

  spawnPickups(fromX, toX) {
    const offs = Phaser.Utils.Array.GetRandom([30, 66, 98]);
    const n = Phaser.Math.Between(1, 3);
    const mid = (fromX + toX) / 2;
    for (let i = 0; i < n; i++) {
      const x = mid + (i - (n - 1) / 2) * 52;
      const sprite = this.add.image(x, C.world.groundY - offs, 'token').setDepth(11);
      const shadow = this.addShadow(x + 4, 26, 0.18);
      this.pickups.push({
        x,
        y: C.world.groundY - offs,
        sprite,
        shadow,
        taken: false,
        destroy() {
          sprite.destroy();
          shadow.destroy();
        },
      });
    }
  }

  spawnCheckpoint() {
    const g = C.world.groundY;
    const x = this.vw + 120;
    const shadow = this.addShadow(x + 8, 110, 0.3);
    const base = this.add.image(x, g + 2, 'cpBase').setOrigin(0.5, 1).setDepth(10);
    const pole = this.add.image(x, g - 20, 'cpPole').setOrigin(0.5, 1).setDepth(10);
    const flag = this.add.image(x + 4, g - 20 - 112 + 6, 'cpFlag').setOrigin(0, 0.5).setDepth(10.1).setScale(0.12, 1);
    const cp = {
      x,
      base,
      pole,
      flag,
      shadow,
      deployed: false,
      passed: false,
      destroy() {
        [base, pole, flag, shadow].forEach((s) => s.destroy());
      },
    };
    this.checkpoints.push(cp);
    return cp;
  }

  // ---------- Bucle ----------

  update(_time, deltaMs) {
    if (this.paused) return;
    const dtMs = Math.min(deltaMs, 50);
    const dt = dtMs / 1000;

    if (this.dead) {
      this.deadFor += dtMs;
      if (this.deadFor > 500) this.restart();
      return;
    }
    this.t += dtMs;
    this.speed = Math.min(C.runSpeedMax, this.speed + C.runSpeedRampPerSec * dt);
    const step = this.speed * dt;
    this.dist += step;

    this.stepJump(dt);
    this.stepWorld(step, dt);
    this.stepEntities(step, dt);
    this.stepMoki(dt);
    this.stepHud();
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
        if (impact > 260) this.dust();
      }
      this.grounded = true;
      this.jumping = false;
    } else {
      if (this.grounded) this.lastGroundedAt = this.t;
      this.grounded = false;
    }
    if (this.vy > 0) this.jumping = false;
  }

  stepWorld(step, dt) {
    const p = C.art.parallax;
    // Con movimiento reducido el fondo se queda quieto; el plano de juego sí corre (es la mecánica).
    this.clouds.tilePositionX = this.reduced ? 0 : this.dist * p.clouds;
    this.far.tilePositionX = this.reduced ? 0 : this.dist * p.far;
    this.mid.tilePositionX = this.reduced ? 0 : this.dist * p.mid;
    this.surface.tilePositionX = this.dist;
    this.canto.tilePositionX = this.dist;
    this.front.tilePositionX = this.dist;
    this.folds.forEach((f) => (f.tilePositionX = this.dist));
  }

  stepEntities(step, dt) {
    const g = C.world.groundY;
    const outX = -120;

    // Obstáculos y piezas
    this.nextSpawnIn -= step;
    if (this.nextSpawnIn <= 0) {
      const o = this.spawnObstacle();
      const gap = Phaser.Math.Between(C.obstacleGapMin, C.obstacleGapMax);
      if (Math.random() < C.pickupChance) this.spawnPickups(o.x + 80, o.x + gap - 80);
      this.nextSpawnIn = gap;
    }
    // Checkpoint cada checkpointEverySec: se despeja la zona para que se lea.
    if (this.t >= this.nextCheckpointAt) {
      this.nextCheckpointAt += C.checkpointEverySec * 1000;
      this.spawnCheckpoint();
      this.nextSpawnIn = Math.max(this.nextSpawnIn, 520);
    }

    for (const o of this.obstacles) {
      o.x -= step;
      o.sprite.x = o.x;
      o.shadow.x = o.x + 6;
      if (!o.entered && o.x < this.vw - 20) {
        o.entered = true;
        this.sway(o.sprite);
      }
    }
    for (const k of this.pickups) {
      k.x -= step;
      if (!k.taken) {
        k.sprite.x = k.x;
        k.shadow.x = k.x + 4;
      }
    }
    for (const cp of this.checkpoints) {
      cp.x -= step;
      cp.base.x = cp.pole.x = cp.x;
      cp.flag.x = cp.x + 4;
      cp.shadow.x = cp.x + 8;
      if (!cp.deployed && cp.x < this.vw - 40) {
        cp.deployed = true;
        this.tweens.add({ targets: cp.flag, scaleX: 1, duration: C.art.checkpointFlagMs, ease: 'Cubic.easeOut' });
      }
      if (cp.deployed && !this.reduced) cp.flag.y = g - 20 - 112 + 6 + Math.sin(this.t / 420) * 1.5;
      if (!cp.passed && cp.x < C.player.x - 30) {
        cp.passed = true;
        this.showBanner('Aprendizaje guardado', C.art.checkpointLabelMs);
      }
    }

    // Limpieza
    this.obstacles = this.obstacles.filter((o) => (o.x < outX ? (o.destroy(), false) : true));
    this.pickups = this.pickups.filter((k) => (k.x < outX && !k.taken ? (k.destroy(), false) : k.taken ? false : true));
    this.checkpoints = this.checkpoints.filter((cp) => (cp.x < outX ? (cp.destroy(), false) : true));

    // Recoger piezas
    const px = C.player.x;
    const half = C.pickupSize / 2 + C.player.width / 2 - 4;
    const top = this.y - C.player.height;
    for (const k of this.pickups) {
      if (k.taken) continue;
      if (Math.abs(k.x - px) < half && k.y > top - half / 2 && k.y < this.y + half / 2) this.collect(k);
    }

    // Colisión (caja del jugador más chica que el dibujo)
    if (this.god) return;
    const pw = C.player.width - 6;
    const ph = C.player.height - 6;
    const pl = px - pw / 2;
    const pt = this.y - ph;
    const pb = this.y - 2;
    for (const o of this.obstacles) {
      const ol = o.x - o.size.width / 2 + 5;
      const or = o.x + o.size.width / 2 - 5;
      const ot = g - o.size.height + 5;
      if (pl < or && pl + pw > ol && pt < g && pb > ot) {
        this.dead = true;
        this.deadFor = 0;
        this.showBanner('Choque', 0);
        break;
      }
    }
  }

  collect(k) {
    k.taken = true;
    this.pieces += 1;
    this.pieceLabel.set(String(this.pieces));
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

  dust() {
    if (this.reduced) return;
    const g = C.world.groundY;
    const n = Phaser.Math.Between(3, 5);
    for (let i = 0; i < n; i++) {
      const chip = this.add
        .image(C.player.x - 10 + Math.random() * 16, g - 2, i % 2 ? 'chipKraft' : 'chipPaper')
        .setDepth(13)
        .setAngle(Math.random() * 360);
      const up = 10 + Math.random() * 14;
      this.tweens.add({ targets: chip, y: g - up, duration: 170, yoyo: true, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: chip, x: chip.x - 14 - Math.random() * 26, angle: chip.angle + 90, duration: 340, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: chip, alpha: 0, delay: 200, duration: 160, onComplete: () => chip.destroy() });
    }
  }

  // Moki: títere de papel. Anticipa, actúa, asienta. Squash ≤ 3%, nunca espejado.
  stepMoki(dt) {
    const A = C.art;
    const S = C.squashMax;
    const g = C.world.groundY;
    const grounded = this.grounded;

    let squash = 0;
    let tilt = 0;
    let bob = 0;
    if (!this.reduced) {
      const tk = this.t - this.takeoffAt;
      if (tk >= 0 && tk < A.anticipationMs) squash = S * Math.sin((Math.PI * tk) / A.anticipationMs);
      const ld = this.t - this.landAt;
      if (ld >= 0 && ld < A.landingMs) squash = Math.max(squash, S * (1 - easeOutCubic(ld / A.landingMs)));

      let target = 0;
      if (!grounded) {
        target = this.vy < 0 ? -A.tiltMaxDeg * Math.min(1, -this.vy / C.jumpVelocity) : A.tiltMaxDeg * Math.min(1, this.vy / 700);
      }
      this.tilt += (target - this.tilt) * Math.min(1, dt * 14);
      tilt = this.tilt;

      if (grounded) {
        this.runPhase += (dt * this.speed) / 48;
        bob = -Math.abs(Math.sin(this.runPhase)) * A.runBobPx;
      }
    }

    const k = this.mokiScale;
    const sy = 1 - squash;
    const sx = 1 + squash * 0.6;
    const h = C.player.spriteHeight * sy;
    this.moki.setScale(k * sx, k * sy);
    this.moki.setAngle(tilt);
    this.moki.setPosition(C.player.x, this.y + bob - h / 2 + 2);

    // Sombra de contacto: siempre presente; marca la altura del salto.
    const air = Math.max(0, g - this.y);
    const f = 1 / (1 + air / 150);
    const widen = 1 + squash * 6;
    this.mokiShadow.setPosition(C.player.x + 5, g + 1);
    this.mokiShadow.setDisplaySize(86 * (0.5 + 0.5 * f) * widen, 16 * (0.6 + 0.4 * f));
    this.mokiShadow.setAlpha(0.28 * (0.4 + 0.6 * f) * (grounded && bob < -1 ? 0.92 : 1));
  }

  stepHud() {
    const m = Math.floor(this.dist / 100);
    if (m !== this.lastM) {
      this.lastM = m;
      this.distLabel.set(`${m} m`);
    }
  }
}
