// Partículas de papel con reserva fija (ANIMACION.md §5): nunca más de POOL vivas, sin tweens por trozo.
import Phaser from 'phaser';
import { CONFIG as C } from '../config.js';

const POOL = 90;
const rand = (a, b) => a + Math.random() * (b - a);
const KEYS = { kraft: 'chipKraft', paper: 'chipPaper', orange: 'chipOrange', amber: 'chipAmber', casiP: 'chipCasiP', casiO: 'chipCasiO' };

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
    // Motas del casi-choque con canto (ARTE §4): crema con borde kraft y naranja con borde crema, para que se lean sobre
    // el casco crema, el traje naranja, el cielo del atardecer y la noche
    for (const [k, f, b] of [['chipCasiP', '#F4E8D5', '#B99168'], ['chipCasiO', '#FF6B35', '#F4E8D5']]) {
      if (scene.textures.exists(k)) continue;
      const t = scene.textures.createCanvas(k, 14, 12);
      const x = t.context;
      x.beginPath();
      x.moveTo(2, 2);
      x.lineTo(12, 1);
      x.lineTo(12, 10);
      x.lineTo(3, 11);
      x.closePath();
      x.fillStyle = f;
      x.fill();
      x.lineWidth = 2;
      x.strokeStyle = b;
      x.stroke();
      t.refresh();
    }
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
    p.estela = o.estela ? o.scale : 0; // escala inicial de la estela (0 = no es estela)
    p.sprite.setTexture(KEYS[color]).setPosition(x, y).setAngle(Math.random() * 360).setAlpha(1).setScale(o.scale || 1).setVisible(true);
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
      if (p.estela) s.setScale(p.estela * (1 - 0.5 * u));
    }
  }

  // Estela de papel (CRECE nivel 8): tope de vivas 3 en Poquito, 8 en Mucho, 12 en Hardcore. Solo toma lugares libres
  // del pool (nunca recicla): si falta lugar, gana el aterrizaje. Con movimiento reducido o Nada, nada.
  // v: velocidad del mundo. El recorte casi la iguala y se queda atrás 40-50 px/s: cinta de ~40 px que cabe a 375 (si
  // no, se va de cuadro en 0.3 s). Adelgaza con la edad (x2.4 a x1.2): punta delgada
  estela(x, y, v = 0) {
    const L = C.juice;
    if (this.scene.reduced || L <= 0) return;
    let n = 0;
    for (const q of this.items) if (q.alive && q.estela) n += 1;
    if (n >= [0, 3, 8, 12][L] || !this.items.some((q) => !q.alive)) return;
    this.k = (this.k || 0) + 1;
    const H = L >= 3 && C.crece.estelaHC; // Hardcore: más grande, vive más y más naranja que Mucho
    this.emit((H ? H.colores : ['paper', 'kraft', 'orange'])[this.k % 3], x + rand(-4, 4), y + rand(-3, 3), { vx: v - rand(...C.crece.estelaAtras), vy: rand(-4, 4), g: 30, life: rand(780, 940) * (H ? H.vida : 1), spin: rand(90, 220), osc: 2, fadeFrom: 0.55, scale: H ? H.escala : 2.4, estela: true });
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
    } else if (type === 'casi') {
      // Casi-choque: chispa de papel naranja y crema con canto, hacia arriba y apenas atrás de Moki (va adelante). Sin
      // ámbar (ARTE §4: es del checkpoint). Nace a 6-12 px de la esquina y vive 440-520 ms sin desvanecer hasta el 55 %:
      // a los 150-200 ms del premio está entera (antes vivía 220-300 ms y ya se apagaba)
      // Moki va a ~60 px del borde izquierdo: si la chispa se va hacia atrás con el mundo sale del cuadro en 100 ms
      // (recaptura 8-nov). Por eso se lleva la velocidad del mundo: en pantalla sube y se queda apenas detrás de la esquina
      const n = L === 1 ? 4 : L === 2 ? 7 : 10;
      const v = this.scene.speed || 0;
      for (let i = 0; i < n; i++) {
        this.emit(i % 3 === 2 ? 'casiP' : 'casiO', x - rand(2, 8), y - rand(4, 10), { vx: v - rand(20, 90), vy: -rand(160, 260), g: 260, life: rand(440, 520), fadeFrom: 0.55, spin: 240, scale: rand(1.5, 1.9) });
      }
    } else if (type === 'crash') {
      // Del punto de contacto hacia arriba y adelante, con fuerza desde el primer cuadro: hacia atrás le pasaban por la cara a Moki
      const n = L === 1 ? 4 : L === 2 ? 8 : 12;
      for (let i = 0; i < n; i++) {
        this.emit(mixColor(i), x, y, { vx: rand(20, 170), vy: -rand(200, 360), g: 760, life: 460, spin: 420, scale: rand(1.4, 2.2) });
      }
    }
  }
}
