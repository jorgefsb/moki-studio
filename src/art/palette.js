// Tokens de marca (ARTE.md sección 4). Los tonos derivados salen de mezclar tokens, nunca de colores nuevos.
export const PAL = {
  accent: '#FF6B35',
  warm: '#FFA500',
  paper: '#F4E8D5',
  kraft: '#B99168',
  ink: '#22211F',
  border: '#8A7E70',
};

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export function mix(a, b, t) {
  const ra = toRgb(a);
  const rb = toRgb(b);
  return toHex(ra.map((v, i) => v + (rb[i] - v) * t));
}

export function rgba(hex, alpha) {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const TONE = {
  kraftLight: mix(PAL.kraft, PAL.paper, 0.35),
  kraftFar: mix(PAL.kraft, PAL.paper, 0.55),
  kraftMid: mix(PAL.kraft, PAL.paper, 0.32),
  kraftDark: mix(PAL.kraft, PAL.ink, 0.28),
  kraftDanger: mix(PAL.kraft, PAL.ink, 0.34), // peligro: cartón mucho más oscuro que el fondo
  cloud: mix(PAL.paper, '#FFFFFF', 0.45),
};

// Generador pseudoaleatorio con semilla: las texturas salen igual en cada carga.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
