// Cinta de combo (DECISIONES 1-nov 16:45): el combo de piezas (config.js combo) se ve como una tira de cinta kraft
// detrás de Moki que crece con cada pieza y sigue el camino de su salto. Al cortarse la ventana se cobra: un aviso
// breve de papel ("x3 +N") y la cinta se enrolla. Solo lee el estado de la escena: no toca puntaje, física ni azar.
// Va bajo los obstáculos (depth 9.8) y solo hacia atrás de Moki, así nunca tapa a Moki ni lo que viene.
import Phaser from 'phaser';
import { CONFIG as C } from '../config.js';
import { PAL, TONE } from './palette.js';

const hex = (h) => Phaser.Display.Color.HexStringToColor(h).color;
const INK = hex(PAL.ink);
const KRAFT = hex(PAL.kraft);
const DARK = hex(TONE.kraftDark);
const PAPER = hex(PAL.paper);
const K = {
  back: 14, // px detrás del centro de Moki donde se pega la cinta
  lift: 50, // altura del ancla sobre los pies (la espalda)
  base: 34, // largo con 1 pieza
  perPiece: 22, // lo que crece cada pieza
  max: 230,
  step: 6, // px por tramo del dibujo
  turn: 26, // radio de la curva cuando ya no cabe hacia atrás
  sway: 11, // vaivén en S del tramo que sube (una vuelta cada ~56 px)
  rollMs: 280,
  avisoMs: 900,
};

export class Cinta {
  constructor(scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(9.8);
    // el aviso es la misma etiqueta de papel del HUD (alineada a la derecha: termina sobre Moki)
    this.aviso = scene.add.container(0, 0).setDepth(99).setVisible(false);
    this.etiqueta = scene.makeLabel(this.aviso, 'right');
    this.trail = []; // [{ d, y }] camino reciente de Moki (por distancia recorrida)
    this.reset();
  }

  reset() {
    this.combo = 0;
    this.mult = 1;
    this.valor = 0;
    this.len = 0;
    this.rollT = -1;
    this.avisoT = -1;
    this.clock = 0;
    this.trail.length = 0;
    this.gfx.clear();
    this.aviso.setVisible(false);
  }

  // Cada pieza del combo: la cinta crece. valor = lo que esta pieza sumó (ya con el multiplicador).
  grow(combo, mult, valor) {
    if (this.rollT >= 0) this.rollT = -1; // una cinta nueva interrumpe el enrollado de la anterior
    if (combo === 1) this.valor = 0;
    this.combo = combo;
    this.mult = mult;
    this.valor += valor;
  }

  // Se corta el combo. Devuelve el multiplicador cobrado (0 si no había cinta). aviso=false: choque (sin cartel).
  cobrar(aviso) {
    if (!this.combo) return 0;
    const mult = this.mult;
    if (aviso && mult > 1) this.showAviso(`x${mult} +${this.valor}`);
    this.combo = 0;
    this.rollT = 0;
    this.rollFrom = this.len;
    return mult;
  }

  showAviso(text) {
    this.etiqueta.set(text);
    this.avisoText = text;
    this.aviso.setPosition(0, 0);
    this.avisoW = this.aviso.getBounds().width + 24; // getBounds solo mide el texto; +24 = relleno de la etiqueta
    this.avisoT = 0;
    this.aviso.setVisible(true);
  }

  // x, y = pies de Moki en el mundo; d = distancia recorrida; calma = sin ondas ni vuelo (reducido o Nada)
  update(dtMs, x, y, d, calma) {
    this.clock += dtMs;
    const T = this.trail;
    if (!T.length || d !== T[T.length - 1].d) T.push({ d, y });
    while (T.length > 2 && d - T[1].d > K.max + 40) T.shift();

    const want = this.combo ? Math.min(K.max, K.base + (this.combo - 1) * K.perPiece) : 0;
    if (this.rollT >= 0) {
      this.rollT += dtMs;
      const k = calma ? 1 : Math.min(1, this.rollT / K.rollMs);
      this.len = this.rollFrom * (1 - k * k);
      if (k >= 1) {
        this.rollT = -1;
        this.len = 0;
      }
    } else this.len += (want - this.len) * (calma ? 1 : Math.min(1, dtMs / 90));

    if (this.avisoT >= 0) {
      this.avisoT += dtMs;
      const k = this.avisoT / K.avisoMs;
      const top = y - C.player.spriteHeight - 28;
      // a 375 Moki queda cerca del borde: el aviso nunca sale de la pantalla (se recorre a la derecha)
      const borde = this.scene.cameras.main.worldView.x + 8 + this.avisoW;
      this.aviso.setPosition(Math.max(x - 4, borde), top - (calma ? 0 : 18 * k)).setAlpha(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      if (k >= 1) {
        this.avisoT = -1;
        this.aviso.setVisible(false);
      }
    }
    this.draw(x, y, d, calma);
  }

  // y del camino de Moki a s px detrás de él (el mundo corre a la izquierda: lo de atrás es donde estuvo)
  yAt(d, s, y) {
    const T = this.trail;
    const want = d - s;
    for (let i = T.length - 1; i > 0; i--) {
      if (T[i - 1].d <= want) {
        const a = T[i - 1];
        const b = T[i];
        const f = b.d === a.d ? 0 : (want - a.d) / (b.d - a.d);
        return a.y + (b.y - a.y) * f;
      }
    }
    return T.length ? T[0].y : y;
  }

  draw(x, y, d, calma) {
    const g = this.gfx;
    g.clear();
    const L = this.len;
    if (L < 2) return;
    const m = this.mult;
    const cam = this.scene.cameras.main;
    // Medio grosor en el mundo, con un mínimo en pantalla: a 375 la cámara aleja (zoom 0.8) y la cinta se veía de
    // 6 px, como un palito (invitado, 1-nov). Así mide 10/12/14 px de ancho en x1/x2/x3 a cualquier ancho.
    const half = Math.max(m >= 3 ? 6 : m >= 2 ? 5 : 4, (m >= 3 ? 7 : m >= 2 ? 6 : 5) / cam.zoom);
    const lw = Math.max(2, 2 / cam.zoom); // trazos de 2 px en pantalla
    const x0 = x - K.back;
    // Lo que cabe detrás de Moki en pantalla (a 375 la cámara lo deja cerca del borde): ahí la cinta deja de ir
    // hacia atrás y sube en curva, como serpentina, en vez de salirse de la pantalla.
    const room = x0 - (cam.worldView.x + 10 + half + K.sway);
    const R = Math.max(0, Math.min(L, room - K.turn));
    const xR = x0 - R;
    let yR = 0;
    const mid = [];
    for (let s = 0; ; s = Math.min(L, s + K.step)) {
      const f = s / L;
      const wave = calma ? 0 : Math.sin(s / 34 - this.clock / 170) * 4 * f;
      if (s <= R) {
        const cy = this.yAt(d, s, y) - K.lift + 6 * f; // la punta cae un pelo
        mid.push({ x: x0 - s, y: cy + wave });
        yR = cy;
      } else {
        // al subir se mece en S (serpentina); en calma queda la S quieta. Sin la S se leía como popote (invitado).
        const u = s - R;
        const arc = (K.turn * Math.PI) / 2;
        const phi = Math.min(u, arc) / K.turn;
        const sway = Math.sin(u / 9 - (calma ? 0 : this.clock / 220)) * K.sway * Math.min(1, u / 16);
        mid.push({ x: xR - K.turn * Math.sin(phi) + sway, y: yR - K.turn * (1 - Math.cos(phi)) - Math.max(0, u - arc), up: true });
      }
      if (s >= L) break;
    }
    // Bordes con la normal del camino (el tramo que sube conserva el grosor)
    const top = [];
    const bot = [];
    mid.forEach((p, i) => {
      const a = mid[Math.max(0, i - 1)];
      const b = mid[Math.min(mid.length - 1, i + 1)];
      const n = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      p.nx = ((a.y - b.y) / n) * half;
      p.ny = ((b.x - a.x) / n) * half;
      top.push({ x: p.x + p.nx, y: p.y + p.ny });
      bot.push({ x: p.x - p.nx, y: p.y - p.ny });
    });
    this.mid = mid; // centro del camino (las pruebas sacan de aquí la caja contra Moki y los obstáculos)
    const tip = mid[mid.length - 1];
    // Sombra suave (tinta 18%) y cuerpo kraft con canto oscuro; punta recta
    const pts = [...top, ...bot.reverse()];
    const poly = (dy) => pts.map((p) => ({ x: p.x, y: p.y + dy }));
    g.fillStyle(INK, 0.18);
    g.fillPoints(poly(4), true);
    g.fillStyle(KRAFT, 1);
    g.fillPoints(poly(0), true);
    g.lineStyle(lw, DARK, 1);
    g.strokePoints(poly(0), true);
    // x2: hilo de papel al centro; x3: además una marca de tinta por pieza
    if (m >= 2) {
      g.lineStyle(lw * 1.5, PAPER, 1);
      g.strokePoints(mid.slice(0, -1), false);
    }
    if (m >= 3) {
      g.lineStyle(lw, INK, 0.45);
      const n = Math.min(this.rollT >= 0 ? 0 : this.combo, Math.floor(L / 16));
      for (let i = 1; i <= n; i++) {
        const p = mid[Math.min(mid.length - 1, Math.round((i * 16) / K.step))];
        if (!p.up) g.lineBetween(p.x + p.nx * 0.7, p.y + p.ny * 0.7, p.x - p.nx * 0.7, p.y - p.ny * 0.7);
      }
    }
    // Al cobrarse la punta se vuelve un rollito de papel (canto y espiral) que llega a la espalda de Moki
    if (this.rollT >= 0) {
      const r = half + 3;
      g.fillStyle(KRAFT, 1);
      g.fillCircle(tip.x, tip.y, r);
      g.lineStyle(lw, DARK, 1);
      g.strokeCircle(tip.x, tip.y, r);
      g.lineStyle(lw, PAPER, 1);
      g.strokeCircle(tip.x, tip.y, r * 0.5);
    }
  }
}
