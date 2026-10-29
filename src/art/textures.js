// Texturas procedurales de cartón y papel (ARTE.md secciones 3, 7 y 8).
// Todo se dibuja en canvas con semilla fija: sin imágenes externas, repetible y local.
import { PAL, TONE, mix, rgba, rng } from './palette.js';

const TAU = Math.PI * 2;

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// Fibras cortas y curvas; se repiten en los bordes para que la textura sea tileable.
function fibers(x, w, h, r, { count, color, alpha, len = [5, 20] }) {
  x.save();
  x.strokeStyle = rgba(color, alpha);
  x.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const px = r() * w;
    const py = r() * h;
    const l = len[0] + r() * (len[1] - len[0]);
    const a = r() * Math.PI;
    const ex = px + Math.cos(a) * l;
    const ey = py + Math.sin(a) * l;
    const bend = (r() - 0.5) * 8;
    for (const ox of [-w, 0, w]) {
      for (const oy of [-h, 0, h]) {
        x.beginPath();
        x.moveTo(px + ox, py + oy);
        x.quadraticCurveTo((px + ex) / 2 + ox + bend, (py + ey) / 2 + oy, ex + ox, ey + oy);
        x.stroke();
      }
    }
  }
  x.restore();
}

function specks(x, w, h, r, count, color, alpha) {
  x.fillStyle = rgba(color, alpha);
  for (let i = 0; i < count; i++) x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + Math.floor(r() * 2), 1);
}

// Recorte de papel: sombra de contacto suave, relleno con fibras y canto del mismo tono, más oscuro.
function cut(x, path, { fill, edgeW, shadow, r, fiberCount = 60 }) {
  const w = x.canvas.width;
  const h = x.canvas.height;
  x.save();
  if (shadow) {
    x.shadowColor = rgba(PAL.ink, shadow.alpha);
    x.shadowBlur = shadow.blur;
    x.shadowOffsetX = shadow.dx;
    x.shadowOffsetY = shadow.dy;
  }
  x.fillStyle = fill;
  x.beginPath();
  path(x);
  x.fill();
  x.restore();

  x.save();
  x.beginPath();
  path(x);
  x.clip();
  fibers(x, w, h, r, { count: fiberCount, color: PAL.ink, alpha: 0.07 });
  fibers(x, w, h, r, { count: fiberCount, color: PAL.paper, alpha: 0.16 });
  x.restore();

  if (!edgeW) return; // nubes: una sola silueta, sin trazo interno entre lóbulos
  x.save();
  x.beginPath();
  path(x);
  x.lineJoin = 'round';
  x.lineWidth = edgeW;
  x.strokeStyle = rgba(mix(fill, PAL.ink, 0.3), 0.55);
  x.stroke();
  x.restore();
}

function hillPath(x0, x1, base, peak, r) {
  const jit = [r() * 3, r() * 3, r() * 3];
  return (c) => {
    c.moveTo(x0, base);
    for (let px = x0; px <= x1; px += 12) {
      const u = (px - x0) / (x1 - x0);
      const y = base - peak * (0.5 - 0.5 * Math.cos(TAU * u)) - jit[0] * Math.sin(u * 19) - jit[1] * Math.sin(u * 41);
      c.lineTo(px, y);
    }
    c.lineTo(x1, base);
    c.closePath();
  };
}

// ---------- Fondos y suelo ----------

function paperTile() {
  const [c, x] = mk(256, 256);
  const r = rng(11);
  x.fillStyle = PAL.paper;
  x.fillRect(0, 0, 256, 256);
  fibers(x, 256, 256, r, { count: 340, color: '#FFFFFF', alpha: 0.5 });
  fibers(x, 256, 256, r, { count: 240, color: PAL.border, alpha: 0.1 });
  fibers(x, 256, 256, r, { count: 140, color: PAL.ink, alpha: 0.04 });
  specks(x, 256, 256, r, 120, PAL.border, 0.12);
  return c;
}

function kraftTile() {
  const [c, x] = mk(256, 256);
  const r = rng(12);
  x.fillStyle = PAL.kraft;
  x.fillRect(0, 0, 256, 256);
  fibers(x, 256, 256, r, { count: 420, color: TONE.kraftDark, alpha: 0.2 });
  fibers(x, 256, 256, r, { count: 320, color: PAL.paper, alpha: 0.2 });
  fibers(x, 256, 256, r, { count: 120, color: PAL.ink, alpha: 0.06 });
  specks(x, 256, 256, r, 160, PAL.ink, 0.1);
  return c;
}

function gradient(w, h, stops) {
  const [c, x] = mk(w, h);
  const g = x.createLinearGradient(0, 0, 0, h);
  stops.forEach(([t, col]) => g.addColorStop(t, col));
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  return c;
}

const ground = {
  // Carril por donde corre Moki, visto un poco desde arriba: papel kraft claro con borde de recorte.
  surface() {
    const [c, x] = mk(256, 22);
    const r = rng(21);
    x.fillStyle = TONE.kraftLight;
    x.fillRect(0, 0, 256, 22);
    fibers(x, 256, 22, r, { count: 70, color: PAL.ink, alpha: 0.08, len: [6, 26] });
    fibers(x, 256, 22, r, { count: 60, color: PAL.paper, alpha: 0.28, len: [6, 26] });
    x.strokeStyle = rgba(PAL.border, 0.28);
    x.lineWidth = 1.5;
    x.setLineDash([14, 12]);
    x.beginPath();
    x.moveTo(0, 12);
    x.lineTo(256, 12);
    x.stroke();
    x.setLineDash([]);
    // borde superior ligeramente irregular (periódico, para que repita sin costura)
    x.fillStyle = rgba(PAL.border, 0.6);
    for (let px = 0; px < 256; px++) {
      const wob = 1 + 0.7 * Math.sin((px / 256) * TAU * 3) + 0.5 * Math.sin((px / 256) * TAU * 7 + 1);
      x.fillRect(px, 0, 1, Math.max(1, wob));
    }
    return c;
  },
  canto() {
    const [c, x] = mk(256, 6);
    const r = rng(22);
    x.fillStyle = TONE.kraftDark;
    x.fillRect(0, 0, 256, 6);
    fibers(x, 256, 6, r, { count: 50, color: PAL.paper, alpha: 0.18, len: [4, 14] });
    x.fillStyle = rgba(PAL.paper, 0.22);
    x.fillRect(0, 0, 256, 1);
    x.fillStyle = rgba(PAL.ink, 0.25);
    x.fillRect(0, 5, 256, 1);
    return c;
  },
  fold() {
    const [c, x] = mk(256, 6);
    x.fillStyle = rgba(PAL.ink, 0.22);
    x.fillRect(0, 1, 256, 2);
    x.fillStyle = rgba(PAL.border, 0.8);
    x.fillRect(0, 2, 256, 1.5);
    x.fillStyle = rgba(PAL.paper, 0.4);
    x.fillRect(0, 3.5, 256, 1.5);
    return c;
  },
};

function shadowTex() {
  const [c, x] = mk(128, 32);
  x.translate(64, 16);
  x.scale(1, 0.25);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 64);
  g.addColorStop(0, rgba(PAL.ink, 1));
  g.addColorStop(0.7, rgba(PAL.ink, 0.85));
  g.addColorStop(1, rgba(PAL.ink, 0));
  x.fillStyle = g;
  x.fillRect(-64, -64, 128, 128);
  return c;
}

// ---------- Capas de parallax ----------

const WRAP = 1920;

function cloudsLayer() {
  const [c, x] = mk(WRAP, 900);
  const r = rng(31);
  const place = (cx, cy, s) => {
    const n = 4 + Math.floor(r() * 3);
    const path = (g) => {
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0.5 : i / (n - 1);
        const rad = s * (0.5 + 0.5 * Math.sin(Math.PI * (0.15 + 0.7 * u)) * (0.8 + r() * 0.3));
        const px = cx + (u - 0.5) * s * 3.2;
        g.moveTo(px - rad, cy);
        g.arc(px, cy, rad, Math.PI, 0);
        g.closePath();
      }
    };
    for (const off of [-WRAP, 0, WRAP]) {
      x.save();
      x.translate(off, 0);
      cut(x, path, {
        fill: TONE.cloud,
        edgeW: 0,
        shadow: { alpha: 0.1, blur: 12, dx: 6, dy: 9 },
        r,
        fiberCount: 40,
      });
      x.restore();
    }
  };
  for (let i = 0; i < 10; i++) place((i + 0.5) * (WRAP / 10) + (r() - 0.5) * 80, 500 + r() * 300, 22 + r() * 22);
  for (let i = 0; i < 8; i++) place((i + 0.5) * (WRAP / 8) + (r() - 0.5) * 120, 60 + r() * 320, 20 + r() * 20);
  return c;
}

function farLayer() {
  const H = 300;
  const [c, x] = mk(WRAP, H);
  const r = rng(32);
  const fill = TONE.kraftFar;
  const edge = { fill, edgeW: 2, shadow: { alpha: 0.12, blur: 6, dx: 3, dy: 4 }, r, fiberCount: 90 };
  const each = (fn) => {
    for (const off of [-WRAP, 0, WRAP]) {
      x.save();
      x.translate(off, 0);
      fn();
      x.restore();
    }
  };
  const hills = [
    [0, 700, 150],
    [520, 1180, 110],
    [980, 1640, 165],
    [1440, 1920 + 160, 120],
  ];
  hills.forEach(([a, b, p]) => {
    const path = hillPath(a, b, H + 4, p, r);
    each(() => cut(x, path, edge));
  });
  // casitas de cartón
  [180, 640, 1120, 1580].forEach((hx, i) => {
    const w = 62 + (i % 2) * 18;
    const bh = 46 + (i % 3) * 8;
    const base = H - 40 - (i % 2) * 18;
    each(() => {
      cut(x, (g) => g.roundRect(hx, base - bh, w, bh, 3), edge);
      cut(
        x,
        (g) => {
          g.moveTo(hx - 8, base - bh + 2);
          g.lineTo(hx + w / 2, base - bh - 30);
          g.lineTo(hx + w + 8, base - bh + 2);
          g.closePath();
        },
        { ...edge, fill: mix(fill, PAL.border, 0.22) },
      );
      cut(x, (g) => g.roundRect(hx + w / 2 - 7, base - 26, 14, 26, 2), { ...edge, fill: mix(fill, PAL.paper, 0.4), shadow: null });
    });
  });
  // arbustos redondos (nada de cajas: no se confunden con los obstáculos del plano de juego)
  [400, 880, 1340, 1790].forEach((bx, i) => {
    const path = hillPath(bx, bx + 96 + i * 8, H + 4, 30 + i * 3, r);
    each(() => cut(x, path, edge));
  });
  return c;
}

function midLayer() {
  const H = 360;
  const [c, x] = mk(WRAP, H);
  const r = rng(33);
  const fill = TONE.kraftMid;
  const base = H - 6;
  const edge = (f) => ({ fill: f, edgeW: 3, shadow: { alpha: 0.2, blur: 10, dx: 4, dy: 6 }, r, fiberCount: 110 });
  const each = (fn) => {
    for (const off of [-WRAP, 0, WRAP]) {
      x.save();
      x.translate(off, 0);
      fn();
      x.restore();
    }
  };
  // árboles de cartón: tronco + tres triángulos doblados
  [90, 520, 960, 1400, 1760].forEach((tx, i) => {
    const s = 0.9 + (i % 3) * 0.12;
    each(() => {
      cut(x, (g) => g.roundRect(tx - 7, base - 70 * s, 14, 70 * s, 2), edge(TONE.kraftDark));
      const leaf = mix(PAL.kraft, PAL.ink, 0.1);
      [0, 1, 2].forEach((k) => {
        const yb = base - 52 * s - k * 40 * s;
        const half = (58 - k * 14) * s;
        const tri = (g) => {
          g.moveTo(tx - half, yb);
          g.lineTo(tx, yb - 62 * s);
          g.lineTo(tx + half, yb);
          g.closePath();
        };
        cut(x, tri, edge(leaf));
        // pliegue central: mitad derecha más clara
        x.save();
        x.beginPath();
        tri(x);
        x.clip();
        x.fillStyle = rgba(PAL.paper, 0.14);
        x.fillRect(tx, yb - 62 * s, half + 4, 64 * s);
        x.strokeStyle = rgba(PAL.border, 0.65);
        x.lineWidth = 1.5;
        x.beginPath();
        x.moveTo(tx, yb - 62 * s);
        x.lineTo(tx, yb);
        x.stroke();
        x.restore();
      });
    });
  });
  // postes
  [300, 1180].forEach((px) => {
    each(() => {
      cut(x, (g) => g.roundRect(px - 4, base - 168, 8, 168, 2), edge(TONE.kraftDark));
      cut(x, (g) => g.roundRect(px - 26, base - 160, 52, 7, 2), edge(TONE.kraftDark));
    });
  });
  // arbustos de cartón (redondeados, claros): sin pilas de cajas/libros pegadas al suelo
  [740, 1580].forEach((bx, i) => {
    const path = hillPath(bx, bx + 120 + i * 20, base + 4, 40 + i * 6, r);
    each(() => cut(x, path, edge(mix(TONE.kraftMid, PAL.ink, 0.06))));
  });
  return c;
}

// ---------- Piezas del plano de juego ----------

function block(x, ox, oy, w, h, { body, tape, seed }) {
  const r = rng(seed);
  const W = x.canvas.width;
  const H = x.canvas.height;
  const path = (g) => g.roundRect(ox, oy, w, h, 6);
  // contorno claro (peligro siempre con contorno claro)
  x.save();
  x.beginPath();
  path(x);
  x.lineWidth = 4;
  x.strokeStyle = rgba(PAL.paper, 0.7);
  x.stroke();
  x.restore();
  x.fillStyle = body;
  x.beginPath();
  path(x);
  x.fill();
  x.save();
  x.beginPath();
  path(x);
  x.clip();
  fibers(x, W, H, r, { count: 90, color: PAL.ink, alpha: 0.1 });
  fibers(x, W, H, r, { count: 70, color: PAL.paper, alpha: 0.2 });
  // tapa: borde claro + canto de 6 px más oscuro (ARTE: 4 a 6 px en el plano de juego)
  x.fillStyle = mix(body, PAL.paper, 0.32);
  x.fillRect(ox, oy, w, 3);
  x.fillStyle = mix(body, PAL.ink, 0.34);
  x.fillRect(ox, oy + 3, w, 6);
  // pliegue central
  x.strokeStyle = rgba(PAL.border, 0.65);
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(ox + w * 0.62, oy + 9);
  x.lineTo(ox + w * 0.62, oy + h);
  x.stroke();
  x.strokeStyle = rgba(PAL.paper, 0.25);
  x.beginPath();
  x.moveTo(ox + w * 0.62 + 1.5, oy + 9);
  x.lineTo(ox + w * 0.62 + 1.5, oy + h);
  x.stroke();
  x.fillStyle = rgba(PAL.ink, 0.16);
  x.fillRect(ox, oy + h - 4, w, 4);
  // cinta naranja
  if (tape) {
    const tx = ox + w * 0.16;
    const tw = Math.round(w * 0.26);
    const th = h * 0.7;
    x.fillStyle = PAL.accent;
    x.beginPath();
    x.moveTo(tx, oy);
    x.lineTo(tx + tw, oy);
    x.lineTo(tx + tw, oy + th);
    x.lineTo(tx + tw * 0.75, oy + th - 4);
    x.lineTo(tx + tw * 0.5, oy + th);
    x.lineTo(tx + tw * 0.25, oy + th - 4);
    x.lineTo(tx, oy + th);
    x.closePath();
    x.fill();
    x.save();
    x.clip();
    fibers(x, W, H, r, { count: 40, color: PAL.ink, alpha: 0.12 });
    x.restore();
    x.fillStyle = rgba(PAL.paper, 0.45);
    x.fillRect(tx, oy, 2, th);
    x.fillRect(tx + tw - 2, oy, 2, th);
  }
  x.restore();
}

// Los dibujos miden 4 px más que la caja de juego (contorno claro de 2 px por lado).
function caja() {
  const [c, x] = mk(64, 60);
  block(x, 2, 2, 60, 56, { body: TONE.kraftDanger, tape: true, seed: 41 });
  return c;
}

function torre() {
  const [c, x] = mk(64, 88);
  block(x, 2, 44, 60, 42, { body: TONE.kraftDanger, tape: true, seed: 42 });
  x.save();
  x.translate(32, 44);
  x.rotate(-0.026);
  x.translate(-32, -44);
  block(x, 3, 2, 58, 42, { body: mix(TONE.kraftDanger, PAL.ink, 0.06), tape: true, seed: 43 });
  x.restore();
  return c;
}

function token() {
  const [c, x] = mk(36, 40);
  const r = rng(51);
  x.fillStyle = TONE.kraftDark;
  x.beginPath();
  x.arc(18, 21, 15, 0, TAU);
  x.fill();
  const face = (g) => g.arc(18, 18, 15, 0, TAU);
  x.fillStyle = PAL.kraft;
  x.beginPath();
  face(x);
  x.fill();
  x.save();
  x.beginPath();
  face(x);
  x.clip();
  fibers(x, 36, 40, r, { count: 50, color: PAL.ink, alpha: 0.1 });
  fibers(x, 36, 40, r, { count: 40, color: PAL.paper, alpha: 0.22 });
  x.restore();
  x.strokeStyle = TONE.kraftLight;
  x.lineWidth = 3;
  x.beginPath();
  x.arc(18, 18, 12.5, 0, TAU);
  x.stroke();
  x.strokeStyle = rgba(PAL.border, 0.75);
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(9, 22);
  x.quadraticCurveTo(18, 14, 27, 22);
  x.stroke();
  return c;
}

function checkpointBase() {
  const [c, x] = mk(80, 30);
  const r = rng(61);
  const path = (g) => g.roundRect(2, 4, 76, 24, 6);
  cut(x, path, { fill: PAL.kraft, edgeW: 3, shadow: null, r, fiberCount: 80 });
  x.save();
  x.beginPath();
  path(x);
  x.clip();
  x.fillStyle = mix(PAL.kraft, PAL.paper, 0.32);
  x.fillRect(2, 4, 76, 3);
  x.fillStyle = TONE.kraftDark;
  x.fillRect(2, 7, 76, 5);
  x.fillStyle = rgba(PAL.ink, 0.16);
  x.fillRect(2, 24, 76, 4);
  x.restore();
  return c;
}

function checkpointPole() {
  const [c, x] = mk(10, 118);
  const r = rng(62);
  cut(x, (g) => g.roundRect(1, 1, 8, 116, 3), { fill: TONE.kraftDark, edgeW: 2, shadow: null, r, fiberCount: 30 });
  x.fillStyle = rgba(PAL.paper, 0.3);
  x.fillRect(2, 3, 2, 112);
  return c;
}

function checkpointFlag() {
  const [c, x] = mk(60, 44);
  const r = rng(63);
  const hi = mix(PAL.warm, PAL.paper, 0.18);
  const lo = mix(PAL.warm, PAL.ink, 0.16);
  const tri = (g) => {
    g.moveTo(1, 2);
    g.lineTo(57, 14);
    g.lineTo(1, 42);
    g.closePath();
  };
  x.fillStyle = PAL.warm;
  x.beginPath();
  tri(x);
  x.fill();
  x.save();
  x.beginPath();
  tri(x);
  x.clip();
  // dos caras plegadas
  x.fillStyle = hi;
  x.beginPath();
  x.moveTo(1, 2);
  x.lineTo(57, 14);
  x.lineTo(1, 22);
  x.closePath();
  x.fill();
  x.fillStyle = lo;
  x.beginPath();
  x.moveTo(1, 22);
  x.lineTo(57, 14);
  x.lineTo(1, 42);
  x.closePath();
  x.fill();
  fibers(x, 60, 44, r, { count: 50, color: PAL.ink, alpha: 0.1 });
  fibers(x, 60, 44, r, { count: 40, color: PAL.paper, alpha: 0.2 });
  x.restore();
  x.strokeStyle = rgba(PAL.paper, 0.55);
  x.lineWidth = 1.5;
  x.beginPath();
  tri(x);
  x.stroke();
  return c;
}

// Primer plano (ARTE §7): tiras de cartulina y hojas con borde rasgado, fuera del carril de juego.
// ragged 'top' = asoma desde abajo; 'bottom' = cuelga desde arriba.
function fgStrip(w, h, seed, fill, ragged) {
  const pad = 8;
  const [c, x] = mk(w + pad * 2, h + pad * 2);
  const r = rng(seed);
  const n = Math.max(3, Math.round(w / 24));
  const edge = [];
  for (let i = 0; i <= n; i++) edge.push(3 + r() * 9);
  const path = (g) => {
    const x0 = pad;
    const x1 = pad + w;
    const y0 = pad;
    const y1 = pad + h;
    if (ragged === 'top') {
      g.moveTo(x0, y1);
      for (let i = 0; i <= n; i++) g.lineTo(x0 + (i * w) / n, y0 + edge[i]);
      g.lineTo(x1, y1);
    } else {
      g.moveTo(x0, y0);
      for (let i = 0; i <= n; i++) g.lineTo(x0 + (i * w) / n, y1 - edge[i]);
      g.lineTo(x1, y0);
    }
    g.closePath();
  };
  cut(x, path, { fill, edgeW: 3, shadow: { alpha: 0.28, blur: 8, dx: 0, dy: ragged === 'top' ? -2 : 3 }, r, fiberCount: 70 });
  return c;
}

function chip(color, seed) {
  const [c, x] = mk(10, 8);
  const r = rng(seed);
  x.fillStyle = color;
  x.beginPath();
  x.moveTo(1 + r() * 2, 1 + r());
  x.lineTo(8 + r(), 1 + r() * 2);
  x.lineTo(9 - r(), 6 + r());
  x.lineTo(2 + r() * 2, 7);
  x.closePath();
  x.fill();
  x.strokeStyle = rgba(PAL.ink, 0.25);
  x.lineWidth = 1;
  x.stroke();
  return c;
}

export function buildTextures(scene) {
  const add = (key, canvas) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
  };
  add('paper', paperTile());
  add('kraft', kraftTile());
  add('skyGrad', gradient(2, 320, [[0, rgba(PAL.kraft, 0)], [0.55, rgba(PAL.kraft, 0.06)], [1, rgba(PAL.kraft, 0.26)]]));
  add('topFade', gradient(2, 64, [[0, rgba(PAL.paper, 1)], [1, rgba(PAL.paper, 0)]]));
  add('groundShade', gradient(2, 256, [[0, rgba(PAL.ink, 0)], [1, rgba(PAL.ink, 0.34)]]));
  add('groundSurface', ground.surface());
  add('groundCanto', ground.canto());
  add('groundFold', ground.fold());
  add('shadow', shadowTex());
  add('clouds', cloudsLayer());
  add('far', farLayer());
  add('mid', midLayer());
  add('caja', caja());
  add('torre', torre());
  add('token', token());
  add('cpBase', checkpointBase());
  add('cpPole', checkpointPole());
  add('cpFlag', checkpointFlag());
  add('chipKraft', chip(PAL.kraft, 71));
  add('chipPaper', chip(PAL.paper, 72));
  add('fgUpA', fgStrip(150, 58, 81, PAL.kraft, 'top'));
  add('fgUpB', fgStrip(110, 48, 82, PAL.paper, 'top'));
  add('fgUpC', fgStrip(190, 44, 83, TONE.kraftDark, 'top'));
  add('fgDownA', fgStrip(150, 52, 84, PAL.kraft, 'bottom'));
  add('fgDownB', fgStrip(120, 44, 85, PAL.paper, 'bottom'));
  add('fgDownC', fgStrip(180, 40, 86, TONE.kraftDark, 'bottom'));
  add('chipOrange', chip(PAL.accent, 73));
  add('chipAmber', chip(PAL.warm, 74));
}
