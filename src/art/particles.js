// Partículas de papel con reserva fija (ANIMACION.md §5): nunca más de POOL vivas, sin tweens por trozo.
import Phaser from 'phaser';
import { CONFIG as C } from '../config.js';

const POOL = 90;
const rand = (a, b) => a + Math.random() * (b - a);
const KEYS = { kraft: 'chipKraft', paper: 'chipPaper', orange: 'chipOrange', amber: 'chipAmber' };

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    for (let i = 0; i < POOL; i++) {
      const sprite = scene.add.image(0, 0, 'chipKraft').setDepth(13).setVisible(false);
      this.items.push({ sprite, alive: false, born: 0, age: 0, life: 1, vx: 0, vy: 0, g: 0, spin: 0, osc: 0, fadeFrom: 0.6 });
    }
    this.cursor = 0;
    this.clock = 0;
  }

  get alive() {
    return this.items.reduce((n, p) => n + (p.alive ? 1 : 0), 0);
  }

  clear() {
    for (const p of this.items) {
      p.alive = false;
      p.sprite.setVisible(false);
    }
  }

  emit(color, x, y, o) {
    // Se reutiliza la más vieja si no hay libres.
    let p = this.items.find((q) => !q.alive);
    if (!p) p = this.items.reduce((a, b) => (a.born <= b.born ? a : b));
    p.alive = true;
    p.born = this.clock;
    p.age = 0;
    p.life = o.life;
    p.vx = o.vx;
    p.vy = o.vy;
    p.g = o.g;
    p.spin = o.spin;
    p.osc = o.osc || 0;
    p.fadeFrom = o.fadeFrom ?? 0.6;
    p.sprite.setTexture(KEYS[color]).setPosition(x, y).setAngle(Math.random() * 360).setAlpha(1).setVisible(true);
    return p;
  }

  update(dtMs, worldStep) {
    this.clock += dtMs;
    const dt = dtMs / 1000;
    for (const p of this.items) {
      if (!p.alive) continue;
      p.age += dtMs;
      if (p.age >= p.life) {
        p.alive = false;
        p.sprite.setVisible(false);
        continue;
      }
      p.vy += p.g * dt;
      const s = p.sprite;
      s.x += p.vx * dt - worldStep; // se mueven con el mundo: nada flota en el aire
      s.y += p.vy * dt;
      if (p.osc) s.x += Math.sin((p.age / 1000) * Math.PI * 6) * p.osc * dt * 6;
      s.angle += p.spin * dt;
      const u = p.age / p.life;
      s.setAlpha(u < p.fadeFrom ? 1 : Math.pow(1 - (u - p.fadeFrom) / (1 - p.fadeFrom), 3));
    }
  }

  // Reglas por nivel de juice (ANIMACION.md §5). Con movimiento reducido no se emite nada.
  burst(type, x, y, opt = {}) {
    if (this.scene.reduced) return;
    const L = C.juice;
    if (L <= 0) return;
    const g = C.world.groundY;
    const mixColor = (i) => (L >= 3 && i % 3 === 0 ? 'orange' : i % 2 ? 'kraft' : 'paper');
    if (type === 'land') {
      const n = L === 1 ? Phaser.Math.Between(3, 5) : L === 2 ? Phaser.Math.Between(6, 8) : Phaser.Math.Between(10, 12);
      for (let i = 0; i < n; i++) {
        this.emit(mixColor(i), x - 14 + Math.random() * 16, g - 2, { vx: -rand(40, 110), vy: -rand(60, 130), g: 520, life: rand(320, 380), spin: rand(90, 360) });
      }
    } else if (type === 'kick') {
      if (L < 2) return;
      this.emit('kraft', x - 10, g - 2, { vx: -60, vy: -50, g: 520, life: 240, spin: 180 });
    } else if (type === 'collect') {
      // En racha (Mucho o más) la pieza suelta más papel y se cuela el ámbar: lo chico responde chico, la racha crece
      const streak = L >= 2 ? Math.min(3, Math.floor(((opt.combo || 1) - 1) / 2)) : 0;
      const n = (L === 1 ? 3 : L === 2 ? 6 : 10) + streak * 2;
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(60, 120) * (1 + streak * 0.12);
        const col = streak && i % 4 === 0 ? 'amber' : i % 2 ? 'kraft' : 'paper';
        this.emit(col, x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 400, life: 280, spin: 180 });
      }
    } else if (type === 'arc') {
      // Arco completo: abanico de papel naranja, ámbar y crema hacia arriba (ARTE §11, colores --jz-c1..c3)
      const n = L === 1 ? 4 : L === 2 ? 10 : 16;
      for (let i = 0; i < n; i++) {
        this.emit(['orange', 'amber', 'paper'][i % 3], x, y, { vx: rand(-80, 80), vy: -rand(140, 240), g: 420, life: 600, spin: 300, osc: 8, fadeFrom: 0.6 });
      }
    } else if (type === 'confetti') {
      if (L < 2) return;
      const n = L === 2 ? 16 : 40;
      for (let i = 0; i < n; i++) {
        this.emit(['amber', 'paper', 'kraft', 'orange'][i % 4], x, y, { vx: rand(-60, 120), vy: -rand(180, 300), g: 380, life: 900, spin: 360, osc: 12, fadeFrom: 0.67 });
      }
    } else if (type === 'crash') {
      const n = L === 1 ? 3 : L === 2 ? 6 : 10;
      for (let i = 0; i < n; i++) {
        this.emit(mixColor(i), x, y, { vx: rand(-40, 140), vy: -rand(80, 200), g: 520, life: 420, spin: 270 });
      }
    }
  }
}
