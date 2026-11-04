// SALTO NOCHE piezas 3 y 4, en su propio módulo diferido (RunScene lo importa al crear la escena): fuera del JS inicial.
import { PAL, mix, rgba, rng } from './palette.js';
import { mk, cut } from './textures.js';

let C; // la config llega de RunScene: importarla aquí, junto con zanja.js, parte config en otro chunk y sube el JS inicial
const TAU = Math.PI * 2;
const frac = (k) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// Tono de la luz del farol: tope del rango de ESPEC-SALTO, papel + #FF6B35 25 % (director 3-nov 01:25; sin kraft).
const BASE_K = mix(PAL.paper, PAL.kraft, 0.5); // 1c variante K: base mitad papel, mitad kraft
const LUZ_FAROL = mix(BASE_K, PAL.accent, 0.2);

// SALTO NOCHE (pieza 2): farol de papel en poste de cartón, solo de noche. Canvas a 2x (se dibuja a escala 0.5).
// El farol es papel crema plano, no emite: la luz solo cae sobre superficies (canto del poste aquí, el suelo en farolLuz).
// Pie del poste abajo al centro del canto izquierdo (x 27); el farol cuelga del brazo en x 80.
function farolPoste() {
  const [c, x] = mk(128, 380);
  const r = rng(301);
  const lit = LUZ_FAROL;
  cut(x, (g) => g.rect(20, 36, 14, 344), { fill: mix(PAL.kraft, PAL.ink, 0.5), edgeW: 1.5, r, fiberCount: 30 });
  cut(x, (g) => g.rect(20, 36, 66, 12), { fill: mix(PAL.kraft, PAL.ink, 0.45), edgeW: 1.5, r, fiberCount: 10 });
  // canto del poste que mira al farol: la luz cae de arriba y se apaga hacia el pie
  const gl = x.createLinearGradient(0, 48, 0, 250);
  gl.addColorStop(0, rgba(lit, 0.7));
  gl.addColorStop(1, rgba(lit, 0));
  x.fillStyle = gl;
  x.fillRect(29, 48, 5, 202);
  x.fillStyle = rgba(PAL.ink, 0.7);
  x.fillRect(79, 48, 2, 22);
  // farol: óvalo de papel naranja tibio (base K + #FF6B35 50 %, para que empate con su luz; al 10-38 % se leía apagado) con borde rasgado,
  // costillas de kraft y tapas de cartón. Color plano, sin halo.
  const lamp = (g) => {
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU;
      const k = 1 + 0.025 * Math.sin(a * 9 + 1) + (r() - 0.5) * 0.02;
      g.lineTo(80 + Math.cos(a) * 26 * k, 112 + Math.sin(a) * 38 * k);
    }
    g.closePath();
  };
  cut(x, lamp, { fill: mix(BASE_K, PAL.accent, 0.5), edgeW: 2, shadow: { alpha: 0.25, blur: 4, dx: 2, dy: 3 }, r, fiberCount: 40 });
  x.save();
  x.beginPath();
  lamp(x);
  x.clip();
  x.strokeStyle = rgba(PAL.kraft, 0.55);
  x.lineWidth = 1.5;
  for (const dy of [-22, 0, 22]) {
    x.beginPath();
    x.ellipse(80, 112 + dy, 28, 5, 0, 0, Math.PI);
    x.stroke();
  }
  // el papel del farol más claro al centro (luz por dentro del papel, no en el aire): papel puro al centro
  const inn = x.createRadialGradient(80, 116, 0, 80, 116, 30);
  inn.addColorStop(0, rgba(PAL.paper, 0.95));
  inn.addColorStop(1, rgba(PAL.paper, 0));
  x.fillStyle = inn;
  x.fillRect(50, 72, 60, 80);
  x.restore();
  x.fillStyle = mix(PAL.kraft, PAL.ink, 0.5);
  x.fillRect(66, 70, 28, 7);
  x.fillRect(68, 147, 24, 6);
  return c;
}

// Mancha de luz del farol sobre el suelo: media elipse (empieza en el canto de atrás del suelo y cae hacia adelante),
// tono tibio derivado de tokens (LUZ_FAROL) y caída suave; sin nada por arriba del suelo.
// mid y edge: alfa al 45 % y al 75 % del radio (la de vertical, más opaca: a 375 apenas se veía).
function farolLuz(mid, edge) {
  const [c, x] = mk(256, 64);
  const g = x.createRadialGradient(128, 0, 0, 128, 0, 128);
  const lit = LUZ_FAROL;
  g.addColorStop(0, rgba(lit, 1));
  g.addColorStop(0.45, rgba(lit, mid));
  g.addColorStop(0.75, rgba(lit, edge));
  g.addColorStop(1, rgba(lit, 0));
  x.setTransform(1, 0, 0, 0.5, 0, 0);
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 128);
  // el canto de arriba entra suave (10 px): un corte recto en la línea del suelo se leía calcomanía (ciego 3)
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  const top = x.createLinearGradient(0, 0, 0, 10);
  top.addColorStop(0, 'rgba(0,0,0,0.25)');
  top.addColorStop(1, 'rgba(0,0,0,1)');
  x.fillStyle = top;
  x.fillRect(0, 0, 256, 64);
  return c;
}

// SALTO NOCHE pieza 3: primer plano oscuro, recortes de tinta (2 matas y una rama) con canto rasgado, sin halo.
// Canvas a 1x (a 2x tardaban de más en generarse: cuadros > 33 ms); el pie es el borde de abajo, que queda fuera de cuadro.
// Prueba B (director 3-nov 02:30): kraft oscuro desenfocado, como el pasto del día (groundPiece), en vez de tinta.
// La tinta (ciruela al 60 %) se leía como "manchas negras planas" en dos ciegos.
const TINTA = mix(PAL.kraft, PAL.ink, 0.46);
const BLUR = 'blur(2px)';
function ppMata(seed) {
  const [c, x] = mk(150, 85);
  const r = rng(seed);
  const ph = r() * 6;
  const path = (g) => {
    g.moveTo(0, 85);
    for (let i = 0; i <= 48; i++) {
      const u = i / 48;
      const k = Math.sin(Math.PI * u) ** 0.7 * (0.78 + 0.22 * Math.abs(Math.sin(u * 15 + ph)));
      g.lineTo(u * 150, 85 - 79 * k + (r() - 0.5) * 2.5);
    }
    g.closePath();
  };
  x.filter = BLUR;
  cut(x, path, { fill: TINTA, edgeW: 1.5, r, fiberCount: 30 });
  return c;
}
function ppRama() {
  const [c, x] = mk(170, 100);
  const r = rng(77);
  const path = (g) => {
    // tallo que sale de abajo a la izquierda y se adelgaza hacia arriba a la derecha
    const P = (t, s) => [t * 160 + s * 4.5 * (1 - t) * 0.6, 98 - 90 * t * (1.4 - 0.4 * t) + s * 4.5 * (1 - t)];
    for (let i = 0; i <= 12; i++) g.lineTo(...P(i / 12, 1));
    for (let i = 12; i >= 0; i--) g.lineTo(...P(i / 12, -1));
    g.closePath();
    for (let i = 1; i < 6; i++) {
      const [lx, ly] = P(i / 6, 0);
      const a = i % 2 ? -0.9 : 0.6;
      g.moveTo(lx, ly);
      g.ellipse(lx + Math.cos(a - 1.2) * 11, ly + Math.sin(a - 1.2) * 11, 13, 5, a - 1.2, 0, TAU);
    }
  };
  x.filter = BLUR;
  cut(x, path, { fill: TINTA, edgeW: 1.5, r, fiberCount: 30 });
  return c;
}

// SALTO NOCHE pieza 3 (ESPEC-SALTO §3): primer plano oscuro, recortes de tinta (4 en juego, de 3 dibujos) que corren a speed (> 1) pegados al borde
// de abajo. Nunca suben arriba de groundY + libre (no tapan a Moki, obstáculos ni piezas, que van sobre el suelo) y se
// hunden fuera de cuadro entre hunde[0] y hunde[1] del ancho: la composición queda abajo a la izquierda. Solo de noche.
const PP = ['ppMata0', 'ppRama', 'ppMata1'];
export class PrimerPlano {
  constructor(scene, config) {
    C = config;
    this.scene = scene;
    // texturas una por cuadro (todas juntas al cargar el módulo daban 2-8 cuadros > 33 ms en la primera partida)
    this.falta = [() => ppMata(401), ppRama, () => ppMata(402)];
    // texturas del farol: aquí y no en el chunk inicial (CAPAS: UNIR Y PISOS, tope de JS). Una por cuadro, antes de la noche; Faroles las espera
    this.luces = [['farolPoste', farolPoste], ['farolLuz', () => farolLuz(0.8, 0.25)], ['farolLuzV', () => farolLuz(0.95, 0.5)]];
    this.items = null;
  }

  update(dist, nt) {
    const F = C.atmosphere.night.primerPlano;
    const s = this.scene;
    const luz = this.luces.shift();
    if (luz) s.textures.exists(luz[0]) || s.textures.addCanvas(luz[0], luz[1]());
    this.cantos(nt);
    if (!F.on) return this.items && this.items.forEach((im) => im.setVisible(false)); // apagado: ni texturas ni recortes
    if (this.falta.length) {
      const i = 3 - this.falta.length;
      const fn = this.falta.shift();
      if (!s.textures.exists(PP[i])) s.textures.addCanvas(PP[i], fn());
      return;
    }
    // y se dibujan un cuadro fuera de pantalla para que la GPU ya los tenga antes de que se vean
    if (!this.items) return (this.items = [0, 1, 2, 3].map((i) => s.add.image(-2000, -2000, PP[i % 3]).setOrigin(0, 1).setDepth(20)));
    const P = F.cada;
    const d = dist * F.speed;
    const k0 = Math.floor((d - 150) / P);
    this.items.forEach((im, i) => {
      const k = k0 + i;
      im.setTexture(PP[((k % 3) + 3) % 3]);
      // escala: la de vertical o la de ancho, sin pasar de groundY + libre
      const sc = Math.min(s.midS !== 1 ? F.escalaV : F.escala, (s.bottom - C.world.groundY - F.libre) / im.height);
      const x = k * P + P * 0.3 * frac(k + 50) - d;
      const u = Math.min(1, Math.max(0, (x / s.vw - F.hunde[0]) / (F.hunde[1] - F.hunde[0])));
      im.setScale(sc).setPosition(x, s.bottom + 4 + im.height * sc * u * u * (3 - 2 * u)).setAlpha(nt)
        .setVisible(nt > 0 && u < 1 && x > -im.width * sc);
    });
  }

  // SALTO NOCHE pieza 4 (ESPEC-SALTO §4): cantos rasgados en las colinas. La máscara sale de la textura misma de la capa
  // (su borde de arriba, px de grueso, con huecos al azar) pintada de papel; un mosaico gemelo encima copia posición, tamaño
  // y desplazamiento de la capa cada cuadro. Solo de noche (alfa = nt); de día no se ve. Una textura por cuadro.
  cantos(nt) {
    const K = C.atmosphere.night.canto;
    const s = this.scene;
    if (!K.on || (nt <= 0 && !this.cv)) return;
    this.cv = this.cv || [];
    const capas = [[s.ridge, 'ridge', K.ridge, 1.91], [s.far, 'far', K.far, 2.06]];
    for (const [L, src, a, d] of capas) {
      const key = `canto-${src}`;
      let t = this.cv.find((q) => q.key === key);
      if (!t) {
        // la textura real de la capa por su clave (L.texture de un TileSprite es su lienzo interno, vacío en WebGL)
        if (!s.textures.exists(src)) return; // aún en la cola diferida
        if (!s.textures.exists(key)) s.textures.addCanvas(key, canto(s.textures.get(src).getSourceImage(), s.midS !== 1 ? K.pxV : K.px, src.length));
        this.cv.push((t = { key, im: s.add.tileSprite(0, 0, 8, 8, key).setOrigin(0, 0).setDepth(d).setVisible(false) }));
        return;
      }
      const im = t.im;
      if (im.width !== L.width || im.height !== L.height) im.setSize(L.width, L.height);
      im.setPosition(L.x, L.y).setTileScale(L.tileScaleX, L.tileScaleY).setAlpha(a * nt * L.alpha).setVisible(nt > 0);
      im.tilePositionX = L.tilePositionX;
    }
  }
}

// Canto rasgado: el borde de arriba de la silueta (px de grueso) con huecos a medio alfa, en papel.
function canto(src, px, seed) {
  const [c, x] = mk(src.width, src.height);
  const r = rng(500 + seed);
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'destination-out';
  x.drawImage(src, 0, px);
  // los huecos solo adelgazan el canto a la mitad: borrarlo entero dejaba ver el filo oscuro ("muescas oscuras", ciego p4)
  x.globalAlpha = 0.5;
  for (let i = 0; i < src.width / 9; i++) {
    x.beginPath();
    x.ellipse(r() * src.width, r() * src.height, 2 + r() * 6, 1 + r() * 2, 0, 0, TAU);
    x.fill();
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = PAL.paper;
  x.fillRect(0, 0, src.width, src.height);
  return c;
}

export { montar as montarTarde } from './atardecer.js'; // SALTO ATARDECER: viaja en este chunk diferido
