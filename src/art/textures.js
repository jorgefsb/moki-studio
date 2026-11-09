// Texturas procedurales de cartón y papel (ARTE.md secciones 3, 7 y 8).
// Todo se dibuja en canvas con semilla fija: sin imágenes externas, repetible y local.
import { PAL, TONE, mix, rgba, rng } from './palette.js';
import { CONFIG as C } from '../config.js';

const TAU = Math.PI * 2;

export function mk(w, h) {
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
export function cut(x, path, { fill, edgeW, shadow, r, fiberCount = 60 }) {
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

// Luz de lámpara (sprint, GDD §9): se dibuja en modo MULTIPLY sobre todo el cuadro. Blanco = sin cambio.
// Halo cálido arriba a la izquierda (tinte #FFA500 muy rebajado) y viñeta de tinta hacia las orillas. Sin brillos: multiplicar solo oscurece.
function lightLayer(halo, vignette) {
  const S = 256;
  const [c, x] = mk(S, S);
  x.fillStyle = '#FFFFFF';
  x.fillRect(0, 0, S, S);
  const v = x.createRadialGradient(S * 0.5, S * 0.42, S * 0.3, S * 0.5, S * 0.42, S * 0.78);
  v.addColorStop(0, '#FFFFFF');
  v.addColorStop(1, mix('#FFFFFF', PAL.ink, vignette));
  x.fillStyle = v;
  x.fillRect(0, 0, S, S);
  x.globalCompositeOperation = 'multiply';
  const h = x.createRadialGradient(S * 0.1, S * 0.02, 0, S * 0.1, S * 0.02, S * 0.75);
  h.addColorStop(0, mix('#FFFFFF', PAL.warm, halo));
  h.addColorStop(1, '#FFFFFF');
  x.fillStyle = h;
  x.fillRect(0, 0, S, S);
  return c;
}

// Sol de papel (gauntlet R0): disco recortado cálido y dos anillos de halo más pálidos, sin degradados brillantes.
function paperSun(R) {
  const S = Math.ceil(R * 2 * 1.9 + 8);
  const [c, x] = mk(S, S);
  const o = S / 2;
  const r = rng(91);
  // sin anillos de halo: ARTE.md prohíbe el glow (rechazo de arte, sprint)
  cut(x, (g) => g.arc(o, o, R, 0, Math.PI * 2), { fill: mix(PAL.paper, PAL.warm, 0.42), edgeW: 2, shadow: { alpha: 0.1, blur: 6, dx: 2, dy: 3 }, r, fiberCount: 40 });
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
  // Fibras de papel sueltas para encima del velo del suelo de noche (el alfa lo pone Ambient: C.atmosphere.night.fibers).
  fibrasNoche() {
    const [c, x] = mk(256, 256);
    const r = rng(23);
    fibers(x, 256, 256, r, { count: 260, color: PAL.paper, alpha: 1, len: [6, 22] });
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

// Cordillera extra (gauntlet R0): solo cerros, sin casitas ni canto; el color lo pone el tintFill de la escena.
function ridgeLayer() {
  const H = 300;
  const [c, x] = mk(WRAP, H);
  const r = rng(34);
  const edge = { fill: '#FFFFFF', edgeW: 0, shadow: null, r, fiberCount: 0 };
  [[-200, 760, 175], [560, 1300, 140], [1150, 1980, 185], [1760, 2300, 150]].forEach(([a, b, p]) => {
    const path = hillPath(a, b, H + 4, p, r);
    [-WRAP, 0, WRAP].forEach((off) => {
      x.save();
      x.translate(off, 0);
      cut(x, path, edge);
      x.restore();
    });
  });
  return c;
}

// Pinos y postes de la capa media (en px de textura, pie en base = H - 6). Ya no van pintados en el mosaico:
// cada uno es su propio recorte para que RunScene lo esconda cuando un obstáculo le pasa delante (BITACORA 29-oct 10:16).
export const MID_H = 360;
export const MID_WRAP = WRAP;
const MID_PAD = 24; // la sombra de contacto (blur 10, dx 4, dy 6) no se corta
// ox, oy: esquina del recorte en la textura del mosaico (incluye la sombra); half y h: la silueta, sin sombra
const midProp = (p) => ({ ...p, ox: Math.floor(p.u - p.half - MID_PAD), oy: Math.floor(MID_H - 6 - p.h - MID_PAD) });
export const MID_PROPS = [
  ...[90, 520, 960, 1400, 1760].map((tx, i) => {
    const s = 0.9 + (i % 3) * 0.12;
    return midProp({ kind: 'pino', key: `midPino${i}`, u: tx, half: 58 * s, h: 194 * s, s });
  }),
  ...[300, 1180].map((px, i) => midProp({ kind: 'poste', key: `midPoste${i}`, u: px, half: 26, h: 168 })),
];

// Mismo dibujo y misma secuencia de la semilla 33 que el mosaico de antes: cada pino o poste se dibuja en un lienzo del
// ancho del mosaico (las fibras se reparten sobre todo el lienzo) y luego se recorta a su caja con la sombra.
function midLayer() {
  const H = MID_H;
  const [c, x] = mk(WRAP, H);
  const [pc, px0] = mk(WRAP, H);
  const r = rng(33);
  const fill = TONE.kraftMid;
  const base = H - 6;
  const edge = (f) => ({ fill: f, edgeW: 3, shadow: { alpha: 0.2, blur: 10, dx: 4, dy: 6 }, r, fiberCount: 110 });
  const each = (ctx, fn) => {
    for (const off of [-WRAP, 0, WRAP]) {
      ctx.save();
      ctx.translate(off, 0);
      fn(ctx);
      ctx.restore();
    }
  };
  const props = [];
  const crop = (p) => {
    const x0 = p.ox;
    const y0 = p.oy;
    const w = Math.ceil(p.half * 2 + MID_PAD * 2);
    const h = H - y0;
    const [oc, ox] = mk(w, h);
    ox.drawImage(pc, -x0, -y0);
    props.push([p.key, oc]);
    px0.clearRect(0, 0, WRAP, H);
  };
  // árboles de cartón: tronco + tres triángulos doblados
  MID_PROPS.filter((p) => p.kind === 'pino').forEach((p) => {
    const tx = p.u;
    const s = p.s;
    each(px0, (x) => {
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
    crop(p);
  });
  // postes
  MID_PROPS.filter((p) => p.kind === 'poste').forEach((p) => {
    each(px0, (x) => {
      cut(x, (g) => g.roundRect(p.u - 4, base - 168, 8, 168, 2), edge(TONE.kraftDark));
      cut(x, (g) => g.roundRect(p.u - 26, base - 160, 52, 7, 2), edge(TONE.kraftDark));
    });
    crop(p);
  });
  // arbustos de cartón (redondeados, claros): sin pilas de cajas/libros pegadas al suelo; se quedan en el mosaico
  [740, 1580].forEach((bx, i) => {
    const path = hillPath(bx, bx + 120 + i * 20, base + 4, 40 + i * 6, r);
    each(x, (ctx) => cut(ctx, path, edge(mix(TONE.kraftMid, PAL.ink, 0.06))));
  });
  return { base: c, props };
}

// ---------- Piezas del plano de juego ----------

export function block(x, ox, oy, w, h, { body: body0, tape, seed, dim = 0, soft = 1, ink = 1 }) {
  // dim: variante de noche (T3g): el cartón se oscurece hacia la tinta y la cinta/franjas conservan #FF6B35
  // soft: variante de Paseo: contorno, perfil de tinta y cinta bajan con el cartón para que la caja atenuada no parezca vidrio
  // ink: multiplica el perfil y el canto de tinta (Paseo de día: que la caja fantasma conserve borde y no se lea como sombra)
  const body = dim ? mix(body0, PAL.ink, dim) : body0;
  const r = rng(seed);
  const W = x.canvas.width;
  const H = x.canvas.height;
  const path = (g) => g.roundRect(ox, oy, w, h, 6);
  // contorno claro (peligro siempre con contorno claro)
  x.save();
  x.beginPath();
  path(x);
  x.lineWidth = 4;
  x.strokeStyle = rgba(PAL.paper, 0.7 * soft);
  x.stroke();
  x.restore();
  // perfil exterior de tinta #22211F (40%, 2 px), alrededor de la silueta (T3e): separa el cartón del fondo sin tocar la colina
  x.save();
  x.beginPath();
  x.roundRect(ox - 1, oy - 1, w + 2, h + 2, 7);
  x.lineWidth = 2; // T3f: a 375 px (zoom 0.69) el perfil de 1 px se diluía: 2 px y 40%
  x.strokeStyle = rgba(PAL.ink, Math.min(1, 0.4 * soft * ink));
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
    x.save();
    x.globalAlpha = soft;
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
    x.restore();
  }
  // canto interior de tinta (T3f): oscurece el borde del cartón para que a 375 px la silueta se separe del fondo
  x.strokeStyle = rgba(PAL.ink, Math.min(1, 0.5 * soft * ink));
  x.lineWidth = 3;
  x.beginPath();
  path(x);
  x.stroke();
  x.restore();
}

// Los dibujos miden 4 px más que la caja de juego (contorno claro de 2 px por lado).
function caja(dim = 0, soft = 1, ink = 1) {
  const [c, x] = mk(64, 60);
  block(x, 2, 2, 60, 56, { body: TONE.kraftDanger, tape: true, seed: 41, dim, soft, ink });
  return c;
}

// Torre de 100 px: dos cajas de 50, la de arriba ladeada medio grado como pila de cartón.
function torre(dim = 0, soft = 1, ink = 1) {
  const [c, x] = mk(64, 96);
  block(x, 2, 48, 60, 44, { body: TONE.kraftDanger, tape: true, seed: 42, dim, soft, ink });
  x.save();
  x.translate(32, 48);
  x.rotate(-0.026);
  x.translate(-32, -48);
  block(x, 3, 2, 58, 44, { body: mix(TONE.kraftDanger, PAL.ink, 0.06), tape: true, seed: 43, dim, soft, ink });
  x.restore();
  return c;
}

// Trampolín (J): tabla de PAPEL con contorno de tinta sobre un resorte de tinta y papel en zigzag y una base de tinta.
// P5c2 (director 9-nov): la tabla kraft se fundía con el suelo y los cerros (kraft sobre kraft); papel + tinta es el
// máximo contraste de la paleta sin naranja ni ámbar (no es peligro ni checkpoint). 88x24 de juego; al lanzar se aplasta.
function tramp(dim = 0) {
  const [c, x] = mk(100, 34);
  const k = (col) => mix(col, PAL.ink, dim * 0.35);
  x.fillStyle = PAL.ink;
  x.beginPath();
  x.roundRect(9, 26, 82, 7, 3);
  x.fill();
  x.lineJoin = 'round';
  x.beginPath();
  for (let i = 0; i <= 8; i++) x.lineTo(16 + i * 8.5, i % 2 ? 15 : 27);
  x.strokeStyle = PAL.ink;
  x.lineWidth = 9;
  x.stroke();
  x.strokeStyle = k(PAL.paper);
  x.lineWidth = 4;
  x.stroke();
  block(x, 2, 2, 96, 14, { body: k(PAL.paper), tape: false, seed: 61, dim, ink: 2.5 });
  x.strokeStyle = PAL.ink;
  x.lineWidth = 2.5;
  x.beginPath();
  x.roundRect(2, 2, 96, 14, 6);
  x.stroke();
  x.fillStyle = PAL.ink;
  x.fillRect(5, 12, 90, 3);
  return c;
}

// Viga colgante: tablón de cartón con franja naranja, colgado de dos hilos (títere). 76x32 de juego.
function viga(dim = 0, soft = 1) {
  const [c, x] = mk(95, 36);
  block(x, 2, 2, 91, 32, { body: TONE.kraftDanger, tape: false, seed: 91, dim, soft });
  x.save();
  x.beginPath();
  x.roundRect(2, 2, 91, 32, 6);
  x.clip();
  // franja naranja diagonal, en la forma de la cinta de las cajas
  x.globalAlpha = soft;
  x.fillStyle = PAL.accent;
  for (const ox of [0, 22, 44]) {
    x.beginPath();
    x.moveTo(20 + ox, 9);
    x.lineTo(34 + ox, 9);
    x.lineTo(28 + ox, 34);
    x.lineTo(14 + ox, 34);
    x.closePath();
    x.fill();
  }
  x.restore();
  // ojales donde se atan los hilos
  x.fillStyle = PAL.ink;
  for (const ox of [12, 81]) {
    x.beginPath();
    x.arc(ox, 8, 2.2, 0, TAU);
    x.fill();
  }
  // de noche, contorno de papel por dentro del canto para que no se funda con la cordillera
  const O = C.atmosphere.night.vigaOutline;
  if (dim && O.on) {
    x.strokeStyle = rgba(PAL.paper, O.alpha);
    x.lineWidth = O.width;
    x.beginPath();
    x.roundRect(2 + O.width / 2, 2 + O.width / 2, 91 - O.width, 32 - O.width, 6 - O.width / 2);
    x.stroke();
    // línea de tinta por fuera del contorno: separa el papel claro de una nube clara detrás (veredicto de arte, 30-oct)
    if (O.ink) {
      x.strokeStyle = O.ink.color;
      x.lineWidth = O.ink.px;
      x.beginPath();
      x.roundRect(2 - O.ink.px / 2, 2 - O.ink.px / 2, 91 + O.ink.px, 32 + O.ink.px, 6 + O.ink.px / 2);
      x.stroke();
    }
  }
  // borde de luna: filo de papel por fuera del canto izquierdo (del lado de la lámpara), lejos de las esquinas redondeadas
  const M = C.atmosphere.night.moonRim;
  if (dim && M.on && M.viga) {
    x.fillStyle = rgba(PAL.paper, M.alpha);
    x.fillRect(2 - M.px, 8, M.px, 20);
  }
  return c;
}

// Hilo de títere, tileable en vertical.
function hilo() {
  const [c, x] = mk(6, 16);
  x.fillStyle = rgba(PAL.border, 0.9);
  x.fillRect(2, 0, 2, 16);
  x.fillStyle = rgba(PAL.paper, 0.45);
  x.fillRect(2, 0, 1, 16);
  return c;
}

// Mano de papel (UX §4): papel #F4E8D5, canto kraft, índice que señala hacia arriba. Sin naranja.
function hand() {
  const [c, x] = mk(64, 84);
  const r = rng(95);
  const palm = (g) => {
    g.roundRect(14, 34, 38, 44, 12);
    g.roundRect(24, 6, 14, 40, 7); // índice
    g.roundRect(8, 44, 14, 24, 7); // pulgar
  };
  cut(x, palm, { fill: PAL.paper, edgeW: 0, shadow: { alpha: 0.28, blur: 6, dx: 1, dy: 3 }, r, fiberCount: 70 });
  x.strokeStyle = PAL.kraft;
  x.lineWidth = 3;
  x.lineJoin = 'round';
  x.beginPath();
  palm(x);
  x.stroke();
  // cuatro dedos plegados como líneas de doblez
  x.strokeStyle = rgba(PAL.border, 0.7);
  x.lineWidth = 1.5;
  for (const ox of [30, 38, 46]) {
    x.beginPath();
    x.moveTo(ox, 42);
    x.lineTo(ox, 52);
    x.stroke();
  }
  return c;
}

// Tecla "Espacio" de papel (tutorial con teclado): reemplaza al dedo
function keycap() {
  const [c, x] = mk(120, 60);
  const r = rng(96);
  cut(x, (g) => g.roundRect(6, 6, 108, 40, 10), { fill: PAL.paper, edgeW: 0, shadow: { alpha: 0.3, blur: 5, dx: 1, dy: 4 }, r, fiberCount: 50 });
  x.strokeStyle = PAL.kraft;
  x.lineWidth = 3;
  x.beginPath();
  x.roundRect(6, 6, 108, 40, 10);
  x.stroke();
  x.strokeStyle = rgba(PAL.border, 0.7);
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(30, 34);
  x.lineTo(90, 34);
  x.stroke();
  return c;
}

function tokenAmber() {
  const [c, x] = mk(36, 40);
  const r = rng(52);
  x.fillStyle = mix(PAL.warm, PAL.ink, 0.28);
  x.beginPath();
  x.arc(18, 21, 15, 0, TAU);
  x.fill();
  x.fillStyle = PAL.warm;
  x.beginPath();
  x.arc(18, 18, 15, 0, TAU);
  x.fill();
  x.save();
  x.beginPath();
  x.arc(18, 18, 15, 0, TAU);
  x.clip();
  fibers(x, 36, 40, r, { count: 50, color: PAL.ink, alpha: 0.1 });
  fibers(x, 36, 40, r, { count: 40, color: PAL.paper, alpha: 0.22 });
  x.restore();
  x.strokeStyle = mix(PAL.warm, PAL.paper, 0.45);
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

// Meta: arco de papel con bandera ámbar (la meta es checkpoint, ARTE §8).
function metaArch() {
  const [c, x] = mk(220, 190);
  const r = rng(97);
  const post = (px) => cut(x, (g) => g.roundRect(px, 22, 14, 164, 4), { fill: TONE.kraftDark, edgeW: 2, shadow: { alpha: 0.28, blur: 6, dx: 4, dy: 2 }, r, fiberCount: 40 });
  post(8);
  post(198);
  cut(x, (g) => g.roundRect(4, 14, 212, 26, 6), { fill: PAL.kraft, edgeW: 3, shadow: { alpha: 0.3, blur: 6, dx: 0, dy: 4 }, r, fiberCount: 80 });
  // cuerda que cuelga entre los dos postes con banderines ámbar (se ve el arco completo, no solo las puntas)
  const sag = (u) => 44 + 26 * Math.sin(Math.PI * u);
  x.strokeStyle = rgba(PAL.border, 0.95);
  x.lineWidth = 2;
  x.beginPath();
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const px = 15 + u * 190;
    i ? x.lineTo(px, sag(u)) : x.moveTo(px, sag(u));
  }
  x.stroke();
  for (let i = 1; i <= 7; i++) {
    const u = i / 8;
    const cx = 15 + u * 190;
    const cy = sag(u);
    x.fillStyle = i % 2 ? PAL.warm : mix(PAL.warm, PAL.paper, 0.3);
    x.beginPath();
    x.moveTo(cx - 11, cy);
    x.lineTo(cx + 11, cy);
    x.lineTo(cx, cy + 26);
    x.closePath();
    x.fill();
    x.strokeStyle = rgba(PAL.paper, 0.55);
    x.lineWidth = 1.5;
    x.stroke();
  }
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

// Piezas chicas de primer plano y de suelo: pasto de papel, piedras y bordes de cartón rasgado.
// Más oscuras que el suelo, con un poco de desenfoque y sombra de contacto (ARTE §7, T3b2).
function groundPiece(kind, seed) {
  const r = rng(seed);
  const dark = mix(PAL.kraft, PAL.ink, 0.46);
  const mid = mix(PAL.kraft, PAL.ink, 0.34);
  const W = kind === 'torn' ? 76 : kind === 'grass' ? 44 : 38;
  const H = kind === 'torn' ? 30 : kind === 'grass' ? 38 : 26;
  const [c, x] = mk(W, H);
  // sombra de contacto, tenue y desenfocada
  x.save();
  x.filter = 'blur(2px)';
  x.fillStyle = rgba(PAL.ink, 0.32);
  x.beginPath();
  x.ellipse(W / 2 + 2, H - 4, W * 0.4, 3.4, 0, 0, TAU);
  x.fill();
  x.restore();
  x.save();
  x.filter = 'blur(0.7px)';
  x.fillStyle = dark;
  x.strokeStyle = rgba(PAL.ink, 0.5);
  x.lineWidth = 1.5;
  x.lineJoin = 'round';
  if (kind === 'grass') {
    // papel de punta redonda, apenas más oscuro que el suelo y de la mitad de alto (nada de púas)
    const soft = mix(PAL.kraft, PAL.ink, 0.17);
    const softer = mix(PAL.kraft, PAL.ink, 0.1);
    const blades = 5 + Math.floor(r() * 3);
    for (let i = 0; i < blades; i++) {
      const bx = 8 + (i / (blades - 1)) * (W - 16);
      const h = 7 + r() * 7;
      const lean = (r() - 0.5) * 5;
      const bw = 4.2;
      x.fillStyle = i % 2 ? soft : softer;
      x.beginPath();
      x.moveTo(bx - bw, H - 6);
      x.lineTo(bx - bw + lean * 0.4, H - 6 - h);
      x.arc(bx + lean, H - 6 - h, bw, Math.PI, 0, false); // punta redonda
      x.lineTo(bx + bw, H - 6);
      x.closePath();
      x.fill();
    }
  } else if (kind === 'stone') {
    const w = W * (0.62 + r() * 0.3);
    const h = H * (0.5 + r() * 0.18);
    x.beginPath();
    x.ellipse(W / 2, H - 6 - h / 2, w / 2, h / 2, (r() - 0.5) * 0.3, 0, TAU);
    x.fill();
    x.stroke();
    x.fillStyle = rgba(PAL.paper, 0.18);
    x.beginPath();
    x.ellipse(W / 2 - w * 0.12, H - 6 - h * 0.65, w * 0.22, h * 0.16, -0.2, 0, TAU);
    x.fill();
  } else {
    // cartón rasgado: polígono irregular con canto más claro arriba
    const n = 9;
    x.beginPath();
    for (let i = 0; i <= n; i++) x.lineTo(5 + (i / n) * (W - 10), 6 + r() * 8);
    x.lineTo(W - 5, H - 6);
    x.lineTo(5, H - 6);
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = rgba(PAL.paper, 0.2);
    x.fillRect(8, 10, W - 16, 2);
  }
  x.restore();
  return c;
}

// ---------- Fondo vivo (T3d, PROPUESTAS-FONDO-DEMO §2): eventos de papel de las capas 1 a 3 ----------
// Sin naranja, ámbar ni círculos kraft; menos contraste que los obstáculos y las piezas.

// Nube de papel que se recorta: tres etapas, de grande a chica (sin trazo interno entre lóbulos)
function ambCloud(stage, seed) {
  const sets = [
    [[34, 40, 22], [62, 30, 28], [96, 36, 24], [120, 44, 17]],
    [[34, 40, 20], [62, 32, 24], [94, 40, 18]],
    [[40, 40, 18], [66, 36, 20]],
  ];
  const lobes = sets[stage];
  const [c, x] = mk(150, 74);
  const r = rng(seed);
  const path = (g) => {
    lobes.forEach(([cx, cy, rad]) => {
      g.moveTo(cx + rad, cy);
      g.arc(cx, cy, rad, 0, TAU);
    });
    const x0 = lobes[0][0] - lobes[0][2] * 0.7;
    const x1 = lobes[lobes.length - 1][0] + lobes[lobes.length - 1][2] * 0.7;
    g.rect(x0, 44, x1 - x0, 14);
  };
  cut(x, path, { fill: TONE.cloud, edgeW: 0, shadow: { alpha: 0.12, blur: 5, dx: 0, dy: 3 }, r, fiberCount: 40 });
  return c;
}

// Avioncito de papel: dardo con pliegue kraft
function ambPlane() {
  const [c, x] = mk(64, 36);
  const r = rng(131);
  const path = (g) => {
    g.moveTo(4, 17);
    g.lineTo(58, 5);
    g.lineTo(30, 18);
    g.lineTo(58, 29);
    g.closePath();
  };
  cut(x, path, { fill: PAL.paper, edgeW: 0, shadow: { alpha: 0.14, blur: 4, dx: 1, dy: 3 }, r, fiberCount: 20 });
  // pliegue kraft marcado (cara baja sombreada) y trazo de tinta al 45%
  x.fillStyle = rgba(PAL.kraft, 0.6);
  x.beginPath();
  x.moveTo(30, 18);
  x.lineTo(58, 29);
  x.lineTo(46, 20);
  x.closePath();
  x.fill();
  x.strokeStyle = PAL.kraft;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(4, 17);
  x.lineTo(30, 18);
  x.stroke();
  x.strokeStyle = rgba(PAL.ink, 0.45);
  x.lineWidth = 1.6;
  x.lineJoin = 'round';
  x.beginPath();
  path(x);
  x.stroke();
  return c;
}

// Pajarito de origami en dos poses (alas arriba y abajo) para el aleteo en stop-motion
function ambBird(pose, seed) {
  const [c, x] = mk(34, 26);
  const r = rng(seed);
  const wing = pose === 0 ? -9 : 9;
  const body = (g) => {
    g.moveTo(3, 15);
    g.lineTo(16, 12);
    g.lineTo(30, 14);
    g.lineTo(16, 19);
    g.closePath();
  };
  const wings = (g) => {
    g.moveTo(11, 14);
    g.lineTo(19, 14);
    g.lineTo(21, 14 + wing);
    g.closePath();
  };
  cut(x, body, { fill: PAL.paper, edgeW: 1.5, shadow: null, r, fiberCount: 10 });
  cut(x, wings, { fill: mix(PAL.paper, PAL.kraft, 0.55), edgeW: 1.5, shadow: null, r, fiberCount: 10 });
  x.strokeStyle = rgba(PAL.ink, 0.5);
  x.lineWidth = 1.5;
  x.beginPath();
  body(x);
  x.stroke();
  return c;
}

// Lámpara de la noche: disco de papel con canto kraft de 3 px y una mancha de luz recortada 6% más clara (sin degradado)
function ambLamp() {
  const [c, x] = mk(110, 130);
  const r = rng(191);
  x.strokeStyle = rgba(PAL.border, 0.95);
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(55, 0);
  x.lineTo(55, 26);
  x.stroke();
  cut(x, (g) => g.arc(55, 74, 40, 0, TAU), { fill: mix(PAL.paper, '#FFFFFF', 0.18), edgeW: 0, shadow: { alpha: 0.22, blur: 7, dx: 2, dy: 5 }, r, fiberCount: 50 });
  x.strokeStyle = PAL.kraft;
  x.lineWidth = 3;
  x.beginPath();
  x.arc(55, 74, 39, 0, TAU);
  x.stroke();
  return c;
}

// Bandas de fibra de papel para el tono de la tarde: capas de bordes rasgados, no un degradado liso
function ambBands() {
  const [c, x] = mk(960, 300);
  const r = rng(201);
  const rows = [[20, 74], [96, 156], [172, 220], [236, 272]];
  rows.forEach(([y0, y1], k) => {
    const path = (g) => {
      g.moveTo(0, y0 + 4);
      for (let i = 0; i <= 24; i++) g.lineTo((i * 960) / 24, y0 + r() * 10);
      g.lineTo(960, y1);
      for (let i = 24; i >= 0; i--) g.lineTo((i * 960) / 24, y1 - r() * 10);
      g.closePath();
    };
    cut(x, path, { fill: rgba(PAL.kraft, 0.1 + 0.025 * k), edgeW: 0, shadow: null, r, fiberCount: 90 });
  });
  return c;
}

// Estrella de papel colgada de un hilo (solo en la noche). Cara mate de papel con corte irregular, canto de cartón
// abajo-derecha (grosor) y sombra proyectada sobre el cielo: luz de arriba a la izquierda (ARTE §7). Sin facetas: dos valores se leían metal.
function ambStar() {
  const [c, x] = mk(56, 64);
  const r = rng(181);
  x.strokeStyle = rgba(PAL.border, 0.9);
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(24, 0);
  x.lineTo(24, 12);
  x.stroke();
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = (i % 2 ? 7.5 : 18) + (r() - 0.5) * 1.6; // corte a mano: puntas un poco desiguales
    pts.push([24 + Math.cos(a) * rad, 30 + Math.sin(a) * rad]);
  }
  const path = (dx, dy) => (g) => {
    pts.forEach(([u, v], i) => (i ? g.lineTo(u + dx, v + dy) : g.moveTo(u + dx, v + dy)));
    g.closePath();
  };
  cut(x, path(2, 2.5), { fill: TONE.kraftDark, edgeW: 0, shadow: { alpha: 0.3, blur: 4, dx: 4, dy: 6 }, r, fiberCount: 8 });
  cut(x, path(0, 0), { fill: PAL.paper, edgeW: 1.5, shadow: null, r, fiberCount: 18 });
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
  // Tiempos por textura (ms), solo con ?debug: sirve para ver qué retrasa la apertura
  const times = [];
  let last = performance.now();
  const add = (key, canvas) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
    const now = performance.now();
    times.push([key, Math.round(now - last)]);
    last = now;
  };
  if (/[?&]debug/.test(window.location.search)) window.__texTimes = times;
  // Lo que hace falta para el primer cuadro del demo se genera ya; el resto se genera después, un trozo por cuadro
  const lazy = [];
  const defer = (key, fn) => lazy.push([key, fn]);
  add('paper', paperTile());
  add('kraft', kraftTile());
  add('skyGrad', gradient(2, 320, [[0, rgba(PAL.kraft, 0)], [0.55, rgba(PAL.kraft, 0.06)], [1, rgba(PAL.kraft, 0.26)]]));
  add('topFade', gradient(2, 64, [[0, rgba(PAL.paper, 1)], [1, rgba(PAL.paper, 0)]]));
  add('groundShade', gradient(2, 256, [[0, rgba(PAL.ink, 0)], [1, rgba(PAL.ink, 0.34)]]));
  add('light', lightLayer(C.light.halo, C.light.vignette));
  add('sun', paperSun(C.sun.r));
  add('groundSurface', ground.surface());
  add('groundCanto', ground.canto());
  add('groundFold', ground.fold());
  add('groundFibers', ground.fibrasNoche());
  add('shadow', shadowTex());
  add('caja', caja());
  add('torre', torre());
  add('token', token());
  add('chipKraft', chip(PAL.kraft, 71));
  add('chipPaper', chip(PAL.paper, 72));
  // capas de fondo: entran con fundido apenas están listas
  defer('clouds', () => cloudsLayer());
  defer('ridge', () => ridgeLayer());
  defer('far', () => farLayer());
  defer('mid', () => {
    const m = midLayer();
    m.props.forEach(([k, cv]) => add(k, cv));
    return m.base;
  });
  defer('viga', () => viga());
  defer('caja_n', () => caja(0.7));
  defer('torre_n', () => torre(0.7));
  defer('viga_n', () => viga(C.atmosphere.night.vigaDim));
  defer('tramp', () => tramp());
  defer('tramp_n', () => tramp(0.7));
  defer('hilo', () => hilo());
  defer('hand', () => hand());
  defer('keycap', () => keycap());
  defer('tokenAmber', () => tokenAmber());
  defer('metaArch', () => metaArch());
  defer('cpBase', () => checkpointBase());
  defer('cpPole', () => checkpointPole());
  defer('cpFlag', () => checkpointFlag());
  ['grass', 'stone', 'torn'].forEach((kind, i) => {
    for (let v = 0; v < 3; v++) defer(`gp-${kind}${v}`, () => groundPiece(kind, 120 + i * 10 + v));
  });
  [0, 1, 2].forEach((st) => defer(`ambCloud${st}`, () => ambCloud(st, 141 + st)));
  defer('ambPlane', () => ambPlane());
  defer('ambBird0', () => ambBird(0, 151));
  defer('ambBird1', () => ambBird(1, 152));
  defer('ambLamp', () => ambLamp());
  defer('ambStar', () => ambStar());
  defer('ambBands', () => ambBands());
  defer('chipOrange', () => chip(PAL.accent, 73));
  defer('chipAmber', () => chip(PAL.warm, 74));
  // Paseo: cartón atenuado con contorno y cinta igual de suaves (se usan solo si el jugador prendió Paseo)
  // De día el cartón suave se perdía (gris sin borde a 1280, fundido con la casita a 375; ARTE del director 31-oct 15:05):
  // cartón más oscuro que la casita, tinta más firme y cinta entera; el alfa de la caja (obstacleAlpha) no cambia
  const soft = C.paseo.edgeSoft;
  const D = C.paseo.dia;
  defer('caja_p', () => caja(D.darken, D.soft, D.ink));
  defer('torre_p', () => torre(D.darken, D.soft, D.ink));
  defer('viga_p', () => viga(0, soft));
  defer('caja_n_p', () => caja(0.7, soft));
  defer('torre_n_p', () => torre(0.7, soft));
  defer('viga_n_p', () => viga(C.atmosphere.night.vigaDim, soft));
  return {
    lazy,
    // genera ya una textura pendiente por su clave (se salta la fila); nada si ya salió
    ya(key) {
      const i = lazy.findIndex((it) => it[0] === key);
      if (i >= 0) add(key, lazy.splice(i, 1)[0][1]());
    },
    // genera la siguiente textura pendiente; devuelve su clave o null cuando no queda ninguna
    next() {
      const item = lazy.shift();
      if (!item) return null;
      add(item[0], item[1]());
      return item[0];
    },
  };
}
