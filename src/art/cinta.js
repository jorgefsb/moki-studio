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
  rollMs: 280,
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
  // Opción C (invitado game-feel, 2-nov): x3 = aviso completo "x3 +N" sobre Moki, 700 ms; x2 = solo "+N" a media
  // escala junto a la punta de la cinta, 350 ms, y se calla si x2ok es falso (checkpoint o meta con mejor marca).
  cobrar(aviso, x2ok) {
    if (!this.combo) return 0;
    const mult = this.mult;
    if (aviso && (mult > 2 || (mult > 1 && x2ok))) this.showAviso(mult > 2 ? `x${mult} +${this.valor}` : `+${this.valor}`, mult > 2);
    this.combo = 0;
    this.rollT = 0;
    this.rollFrom = this.len;
    return mult;
  }

  showAviso(text, grande) {
    this.etiqueta.set(text);
    this.grande = grande;
    // chico: mitad de escala, pero nunca menos de 12 px de letra en pantalla (a 375 la cámara aleja)
    const s = grande ? 1 : Math.max(0.5, 12 / (22 * this.scene.cameras.main.zoom));
    this.avisoAt = this.mid && this.mid[this.mid.length - 1]; // punta de la cinta al cobrar (draw crea puntos nuevos)
    this.aviso.setScale(s).setPosition(0, 0);
    this.avisoW = this.aviso.getBounds().width + 24 * s; // getBounds ya trae la escala pero solo mide el texto; +24 = relleno
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
      const k = this.avisoT / (this.grande ? 700 : 350);
      const a = this.avisoAt;
      const G = this.grande || !a;
      // grande: sobre la cabeza y sube; chico: quieto, centrado arriba de la punta de la cinta
      const ax = G ? x - 4 : a.x + this.avisoW / 2;
      const ay = G ? y - C.player.spriteHeight - 28 - (calma ? 0 : 18 * k) : a.y - 12 - 40 * this.aviso.scaleY;
      // a 375 Moki queda cerca del borde: el aviso nunca sale de la pantalla (se recorre a la derecha)
      const borde = this.scene.cameras.main.worldView.x + 8 + this.avisoW;
      this.aviso.setPosition(Math.max(ax, borde), ay).setAlpha(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
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
    // Solo hacia atrás y hasta 14 px de pantalla antes del borde. A 375 la cámara deja a Moki cerca del borde: la
    // serpentina que subía se leía como gusano (probador, 2-nov); ahí la cinta es corta y crece en grosor, hilo y marcas.
    // Solo hacia atrás y hasta 14 px de pantalla antes del borde. A 375 la cámara deja ~38 px detrás de Moki: ahí la
    // cinta es corta. Subirla en S, inclinarla o curvarla se leyó como gusano, bastón o gancho (invitados, 1 y 2-nov).
    const Lv = Math.min(L, x0 - cam.worldView.x - 14 / cam.zoom - half);
    if (Lv < 2) return;
    const mid = [];
    for (let s = 0; ; s = Math.min(Lv, s + K.step)) {
      const f = s / L;
      const wave = calma ? 0 : Math.sin(s / 34 - this.clock / 170) * 4 * f;
      mid.push({ x: x0 - s, y: this.yAt(d, s, y) - K.lift + 6 * f + wave }); // la punta cae un pelo
      if (s >= Lv) break;
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
    // marcas de tinta de x3: casi opacas y de 3 px (al 45% no se veían, probador 2-nov)
    if (m >= 3 && this.rollT < 0) {
      g.lineStyle(lw * 1.5, INK, 0.85);
      for (let i = 2; i < mid.length; i += 3) {
        const p = mid[i];
        g.lineBetween(p.x + p.nx * 0.8, p.y + p.ny * 0.8, p.x - p.nx * 0.8, p.y - p.ny * 0.8);
      }
    }
  }
}
