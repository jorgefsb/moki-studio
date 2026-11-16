// COOK 1 «Que se vea como juego publicado» (cook/SHOTS.md, receta 2-6): luz y aire de la página 1 sobre las capas pintadas.
// Sol con disco y halo aditivo que muerden los cerros, resplandor del horizonte, perspectiva atmosférica (los cerros lejanos se
// mezclan con el color del horizonte), niebla de valle detrás de Moki y un primer plano que baja a tinta. Todo en código: texturas
// horneadas una vez en canvas, cero imágenes. Solo existe con las capas pintadas (nivel 1, tarde): se apaga con su mismo alfa.
// Viaja en el chunk diferido del atardecer: el JS inicial no crece.
import { mk } from './textures.js';

// Perillas. y: px del mundo arriba del suelo (g). Colores: del horizonte de la tarde (TARDE.cieloHorizonte #FFD27A), nunca gris.
export const LUZ = {
  on: true,
  sol: { r: 60, dx: -0.12, disco: '#FFFFF6', canto: '#FFF3C2', halo: { k: 2.6 } }, // r01: grande, casi blanco y más adentro
  resplandor: { k: 0.7 }, // radio = k * alto de pantalla, aditivo detrás de todo menos el cielo
  horizonte: { de: 360, a: 90 }, // banda clara pegada al horizonte (de g-de a g-a)
  valle: { de: 190, a: -15 }, // niebla entre cerros y pinos
  frente: { de: 40 }, // el suelo baja a tinta hacia el borde de abajo (en vertical al 60 %)
  cima: { hasta: 0.55 }, // el cielo baja de color arriba hasta este tanto del alto: la luz queda pegada al horizonte
};
// Colores y alfas de cada capa: en HORA (abajo).

const RAD = 'luz_rad';
const VERT = 'luz_vert';
const DISCO = 'luz_disco';

function hornear(s) {
  if (!s.textures.exists(RAD)) {
    const n = 256;
    const [c, x] = mk(n, n);
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2 - 1);
    for (let i = 0; i <= 16; i++) {
      const q = i / 16;
      g.addColorStop(q, `rgba(255,255,255,${(1 - q) ** 2.2})`); // caída suave, sin aros
    }
    x.fillStyle = g;
    x.fillRect(0, 0, n, n);
    s.textures.addCanvas(RAD, c);
  }
  if (!s.textures.exists(VERT)) {
    // 3x250 y no 4x256: una textura potencia de 2 repite (REPEAT) y al estirarla el borde de abajo traía una raya del de arriba
    const [c, x] = mk(3, 250);
    const g = x.createLinearGradient(0, 0, 0, 250);
    for (let i = 0; i <= 8; i++) {
      const q = i / 8;
      g.addColorStop(q, `rgba(255,255,255,${q * q * (3 - 2 * q)})`); // 0 arriba, 1 abajo
    }
    x.fillStyle = g;
    x.fillRect(0, 0, 3, 250);
    s.textures.addCanvas(VERT, c);
  }
  if (!s.textures.exists(DISCO)) {
    const R = LUZ.sol.r;
    const E = Math.round(R * 1.3); // r01d: el borde se funde en 30 % del radio: sin aro de círculo dibujado
    const n = E * 2 + 2;
    const [c, x] = mk(n, n);
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, E);
    g.addColorStop(0, LUZ.sol.disco);
    g.addColorStop((R * 0.7) / E, LUZ.sol.disco);
    g.addColorStop(R / E, LUZ.sol.canto);
    g.addColorStop(1, 'rgba(255,243,194,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, n, n);
    s.textures.addCanvas(DISCO, c);
  }
}

// Colores de la página 1 (atardecer dorado). a: alfa; c: color; sobre: px arriba del suelo. Las páginas 2 y 3 de la 1.ª partida
// ya son otro lugar (Ciudad y Playa, paisajes.js), que tapa todo esto: la hora fría sobre la Ciudad se probó (r02a) y peleaba con
// sus edificios, se quitó (cook/ROUNDS.md, Decisiones r02).
const HORA = {
  cima: [0x7e3a3c, 0.62], horizonte: [0xffe2a6, 0.55], resplandor: [0xffd58a, 0.62], halo: [0xfff0b8, 0.9], sobre: 205, // r02: más alto, sobre las copas de los pinos cercanos
  lejos: [0xffc584, 0.6], valle: [0xffdcaa, 0.75], medio: [0xf0b07a, 0.3], cerca: [0x6a3a26, 0.72], frente: [0x1e0f0a, 0.62], tierra: [0x2a160e, 0.92], // r02: cerca y frente un paso más claros (crítico: «pesada»)
};
// Pinos cercanos: la misma capa pintada de pinos, más grande y más rápida, en un valor más oscuro; la de siempre queda como pinos
// lejanos con aire. Así la masa café se parte en dos planos (crítico r01). Nunca más oscuros que la caja (ARTE 2.0).
const CERCA = { k: 1.45, par: 0.82, pie: 60, dx: 1333 }; // r02b: más grande y corrida para no calcar el dibujo de los lejanos
// Primer plano propio: matas y piedras de tinta abajo de la línea del suelo (nunca entra a la banda de juego), a 1.5x. Solo en la
// página 1: en la Ciudad y la Playa no pega con el empedrado ni la arena (r02), se recorta al borde de la hoja que entra.
const TIERRA = { par: 1.5, arriba: 10, w: 1400, h: 220 };
const TIERRA_K = 'luz_tierra';

// Matas, pastos altos y piedras en silueta (blanco para teñir), con huecos: azar propio y fijo, sin tocar el del juego
function hornearTierra(s) {
  if (s.textures.exists(TIERRA_K)) return;
  const { w, h } = TIERRA;
  const [c, x] = mk(w, h);
  let a = 9173;
  const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  x.fillStyle = '#fff';
  x.fillRect(0, h - 5, w, 5); // r02b: pie corrido fino (26 px se leía franja negra)
  let px = 40;
  while (px < w - 160) {
    const tipo = r();
    const alto = h * (0.45 + r() * 0.55);
    if (tipo < 0.45) {
      // mata: lomas encimadas
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const rr = 26 + r() * 46;
        x.beginPath();
        x.ellipse(px + i * rr * 0.8, h - 20, rr * 1.1, Math.min(alto, rr * 2), 0, Math.PI, 0);
        x.fill();
      }
      px += n * 50;
    } else if (tipo < 0.8) {
      // pasto alto: hojas finas y curvas
      const n = 7 + Math.floor(r() * 8);
      for (let i = 0; i < n; i++) {
        const bx = px + i * 6 + r() * 4;
        const hh = alto * (0.5 + r() * 0.5);
        const ld = (r() - 0.35) * 40;
        x.beginPath();
        x.moveTo(bx - 3, h);
        x.quadraticCurveTo(bx + ld * 0.3, h - hh * 0.6, bx + ld, h - hh);
        x.quadraticCurveTo(bx + ld * 0.3 + 2, h - hh * 0.55, bx + 4, h);
        x.fill();
      }
      px += n * 6 + 30;
    } else {
      // piedra plana
      const pw = 60 + r() * 70;
      const ph = 24 + r() * 30;
      x.beginPath();
      x.moveTo(px, h);
      x.lineTo(px + pw * 0.12, h - ph * 0.8);
      x.lineTo(px + pw * 0.45, h - ph);
      x.lineTo(px + pw * 0.85, h - ph * 0.7);
      x.lineTo(px + pw, h);
      x.fill();
      px += pw + 10;
    }
    px += 60 + r() * 240; // hueco
  }
  s.textures.addCanvas(TIERRA_K, c);
}

export function montarLuz(s, c) {
  if (!LUZ.on || !c) return;
  let o = null;
  const crear = () => {
    hornear(s);
    hornearTierra(s);
    const img = (k, d, add) => {
      const v = s.add.image(0, 0, k).setDepth(d).setVisible(false);
      if (add) v.setBlendMode('ADD');
      return v;
    };
    const banda = (d) => s.add.image(0, 0, VERT).setOrigin(0, 0).setDepth(d).setVisible(false);
    const copia = (k, d) => s.add.tileSprite(0, 0, 10, 10, k).setOrigin(0, 0).setDepth(d).setVisible(false);
    o = {
      cima: banda(1.581).setFlipY(true),
      horizonte: banda(1.582),
      resplandor: img(RAD, 1.584, true),
      halo: img(RAD, 1.588, true),
      disco: img(DISCO, 1.59),
      lejos: copia('capa_lejos', 2.061),
      valle: banda(2.5),
      medio: copia('capa_medio', 3.061),
      cerca: copia('capa_medio', 3.5),
      frente: banda(4.64),
      tierra: s.add.tileSprite(0, 0, 10, 10, TIERRA_K).setOrigin(0, 0).setDepth(19.5).setVisible(false),
    };
  };
  const igual = (v, L) => {
    v.setPosition(L.x, L.y).setSize(L.width, L.height).setTileScale(L.tileScaleX, L.tileScaleY);
    v.tilePositionX = L.tilePositionX;
    v.tilePositionY = L.tilePositionY;
  };
  const tira = (v, y0, y1, a) => v.setPosition(0, y0).setDisplaySize(s.vw, Math.max(1, y1 - y0)).setAlpha(a);
  const orig = c.colocar;
  c.colocar = (g, st) => {
    orig(g, st);
    if (!c.cargadas) return;
    if (!o) crear();
    const on = st > 0;
    Object.values(o).forEach((v) => v.setVisible(on));
    if (!on) return;
    c.sol.setVisible(false); // la mancha vieja: ahora hay disco con halo
    const H = (n) => HORA[n];
    // Página con paisaje propio (paisajes.js, pila desde 3.07): tapa cielo, cerros y pinos de aquí, pero no los pinos cercanos (3.5)
    // ni el suelo a tinta (4.64). Mientras entra la hoja nueva por la derecha, esos dos llegan solo hasta su borde.
    const P = s.paisaje;
    const borde = P && P.lugar ? s.vw * (1 - Math.min(1, P.k)) : s.vw;
    const ms = s.midS || 1;
    const vh = s.vh;
    const x = c.sol.x + s.vw * LUZ.sol.dx;
    const y = g - HORA.sobre * ms;
    o.disco.setPosition(x, y).setScale(ms).setAlpha(st);
    const R = LUZ.sol.r * ms;
    const [hc, ha] = H('halo');
    o.halo.setTint(hc).setPosition(x, y).setDisplaySize(R * 2 * LUZ.sol.halo.k, R * 2 * LUZ.sol.halo.k).setAlpha(ha * st);
    const rr = vh * LUZ.resplandor.k * 2;
    const [rc, ra] = H('resplandor');
    o.resplandor.setTint(rc).setPosition(x, y).setDisplaySize(rr, rr).setAlpha(ra * st);
    const [cc, ca] = H('cima');
    tira(o.cima, s.top, s.top + (g - s.top) * LUZ.cima.hasta, ca * st).setTint(cc);
    const [zc, za] = H('horizonte');
    tira(o.horizonte, g - LUZ.horizonte.de * ms, g - LUZ.horizonte.a * ms, za * st).setTint(zc);
    const [lc, la] = H('lejos');
    igual(o.lejos, c.lejos);
    o.lejos.setTintFill(lc).setAlpha(la * st);
    const [vc, va] = H('valle');
    tira(o.valle, g - LUZ.valle.de * ms, g - LUZ.valle.a * ms, va * st).setTint(vc);
    const [mc, ma] = H('medio');
    igual(o.medio, c.medio);
    o.medio.setTintFill(mc).setAlpha(ma * st);
    // pinos cercanos: copia más grande y más rápida de la misma capa, teñida más oscura
    const M = c.medio;
    const kx = M.tileScaleX * CERCA.k;
    const ky = M.tileScaleY * CERCA.k;
    const alto = M.height * CERCA.k;
    const [ec, ea] = H('cerca');
    o.cerca.setPosition(0, g + CERCA.pie * ms - alto).setSize(Math.max(1, borde), alto).setVisible(borde > 0).setTileScale(kx, ky).setTintFill(ec).setAlpha(ea * st);
    o.cerca.tilePositionX = ((s.reduced ? 0 : s.dist * CERCA.par) + CERCA.dx) / kx;
    const vert = s.vh > s.vw; // en vertical hay ~280 px de suelo: con el mismo alfa quedaba un bloque casi negro
    const [fc, fa] = H('frente');
    tira(o.frente, g + LUZ.frente.de * ms, s.bottom + 2, fa * (vert ? 0.6 : 1) * st).setTintFill(fc);
    o.frente.setDisplaySize(Math.max(1, borde), o.frente.displayHeight).setVisible(borde > 0);
    // primer plano de tinta: de g + arriba al borde de abajo, a 1.5x; nunca sube a la banda de juego
    const ty = g + TIERRA.arriba * ms;
    const th = Math.max(1, s.bottom - ty + 2);
    const tk = Math.min(th, TIERRA.h * 0.85 * ms * (vert ? 1.4 : 1)) / TIERRA.h;
    const [tc, ta] = H('tierra');
    o.tierra.setPosition(0, s.bottom + 2 - TIERRA.h * tk).setSize(Math.max(1, borde), TIERRA.h * tk).setVisible(borde > 0).setTileScale(tk, tk).setTint(tc).setAlpha(ta * st);
    o.tierra.tilePositionX = (s.reduced ? 0 : s.dist * TIERRA.par) / tk;
  };
}
