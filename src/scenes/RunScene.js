import Phaser from 'phaser';
import { CONFIG as C } from '../config.js';

// Física a mano (no Arcade): el salto se afina por perillas, sin sorpresas del motor.
export class RunScene extends Phaser.Scene {
  constructor() {
    super('RunScene');
  }

  create() {
    const { width, height, groundY } = C.world;

    this.add.rectangle(0, groundY, width, height - groundY, 0xb98f5e).setOrigin(0, 0);
    this.add.rectangle(0, groundY, width, 4, 0x7a5a38).setOrigin(0, 0);

    this.player = this.add
      .rectangle(C.player.x, groundY, C.player.width, C.player.height, 0xf2a900)
      .setOrigin(0.5, 1);

    this.obstacles = [];
    this.msg = this.add
      .text(width / 2, 60, '', { fontFamily: 'sans-serif', fontSize: '28px', color: '#4a3524' })
      .setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({
      space: 'SPACE',
      up: 'UP',
      w: 'W',
      esc: 'ESC',
      p: 'P',
    });
    this.input.keyboard.on('keydown', (e) => {
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key) && !e.repeat) this.press();
      if (['Escape', 'p', 'P'].includes(e.key) && !e.repeat) this.togglePause();
    });
    this.input.keyboard.on('keyup', (e) => {
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) this.release();
    });
    this.input.on('pointerdown', () => this.press());
    this.input.on('pointerup', () => this.release());

    this.restart();
  }

  restart() {
    this.obstacles.forEach((o) => o.destroy());
    this.obstacles = [];
    this.y = C.world.groundY; // pies
    this.vy = 0;
    this.grounded = true;
    this.lastGroundedAt = 0;
    this.pressedAt = -1e9;
    this.holding = false;
    this.jumping = false;
    this.jumpStartAt = 0;
    this.speed = C.runSpeedStart;
    this.nextSpawnIn = 600;
    this.dead = false;
    this.paused = false;
    this.t = 0; // ms de juego
    this.msg.setText('');
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
      this.vy *= C.jumpCutMultiplier;
      this.jumping = false;
    }
  }

  togglePause() {
    this.paused = !this.paused;
    this.msg.setText(this.paused ? 'PAUSA' : '');
  }

  spawnObstacle() {
    const size = Phaser.Utils.Array.GetRandom(C.obstacleSizes);
    const o = this.add
      .rectangle(C.world.width + size.width, C.world.groundY, size.width, size.height, 0x8b5a2b)
      .setOrigin(0.5, 1);
    this.obstacles.push(o);
  }

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

    // Carrera
    this.speed = Math.min(C.runSpeedMax, this.speed + C.runSpeedRampPerSec * dt);

    // Salto: coyote + buffer
    const canJump = this.grounded || this.t - this.lastGroundedAt <= C.coyoteMs;
    const buffered = this.t - this.pressedAt <= C.jumpBufferMs;
    if (canJump && buffered && !this.jumping) {
      this.vy = -C.jumpVelocity;
      this.grounded = false;
      this.jumping = true;
      this.jumpStartAt = this.t;
      this.pressedAt = -1e9;
      // Ya lo soltó antes de que empezara el salto (tap muy corto con buffer).
      if (!this.holding) this.release();
    }

    this.vy += C.gravity * dt;
    this.y += this.vy * dt;
    if (this.y >= C.world.groundY) {
      this.y = C.world.groundY;
      this.vy = 0;
      if (!this.grounded) this.lastGroundedAt = this.t;
      this.grounded = true;
      this.jumping = false;
    } else {
      if (this.grounded) this.lastGroundedAt = this.t;
      this.grounded = false;
    }
    if (this.vy > 0) this.jumping = false;
    this.player.y = this.y;

    // Obstáculos
    this.nextSpawnIn -= this.speed * dt;
    if (this.nextSpawnIn <= 0) {
      this.spawnObstacle();
      this.nextSpawnIn = Phaser.Math.Between(C.obstacleGapMin, C.obstacleGapMax);
    }
    for (const o of this.obstacles) o.x -= this.speed * dt;
    this.obstacles = this.obstacles.filter((o) => {
      if (o.x < -100) {
        o.destroy();
        return false;
      }
      return true;
    });

    // Colisión (caja del jugador un poco más chica que el dibujo)
    const pw = C.player.width - 8;
    const ph = C.player.height - 6;
    const pl = C.player.x - pw / 2;
    const pt = this.y - ph;
    for (const o of this.obstacles) {
      const ol = o.x - o.width / 2 + 3;
      const ot = o.y - o.height + 3;
      if (pl < ol + o.width - 6 && pl + pw > ol && pt < ot + o.height - 3 && pt + ph > ot) {
        this.dead = true;
        this.deadFor = 0;
        this.msg.setText('choque');
        break;
      }
    }
  }
}
