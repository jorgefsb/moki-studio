// COOK 1 «Que se vea como juego publicado» (cook/SHOTS.md, receta 2-6): luz y aire de la página 1 sobre las capas pintadas.
// Sol con disco y halo aditivo que muerden los cerros, resplandor del horizonte, perspectiva atmosférica (los cerros lejanos se
// mezclan con el color del horizonte), niebla de valle detrás de Moki y un primer plano que baja a tinta. Todo en código: texturas
// horneadas una vez en canvas, cero imágenes. Solo existe con las capas pintadas (nivel 1, tarde): se apaga con su mismo alfa.
// Viaja en el chunk diferido del atardecer: el JS inicial no crece.
import { mk } from './textures.js';

// Perillas. y: px del mundo arriba del suelo (g). Colores: del horizonte de la tarde (TARDE.cieloHorizonte #FFD27A), nunca gris.
export const LUZ = {
  on: true,
  sol: { r: 60, sobre: 168, dx: -0.12, disco: '#FFFFF6', canto: '#FFF3C2', halo: { k: 2.6, a: 0.9, color: 0xfff0b8 } }, // r01b: más grande y casi blanco (ronda 01: 'pálido, lee como ficha')
  resplandor: { k: 0.7, a: 0.62, color: 0xffd58a }, // radio = k * alto de pantalla, aditivo detrás de todo menos el cielo
  horizonte: { de: 360, a: 90, alfa: 0.55, color: 0xffe2a6 }, // banda clara pegada al horizonte (de g-de a g-a)
  lejos: { velo: 0.6, color: 0xffc584 }, // r01d: más naranja-aire; el pintado tira a malva gris a la izquierda // perspectiva atmosférica: los cerros lejanos toman el color del aire
  valle: { de: 190, a: -15, alfa: 0.75, color: 0xffdcaa }, // niebla entre cerros y pinos
  medio: { velo: 0.3, color: 0x3c1a0e }, // r01b: los pinos bajan hacia café-tinta (más oscuros que el traje de Moki, más claros que la caja)
  bajo: { de: 115, a: -10, alfa: 0.0, color: 0xffdcaa }, // r01b: apagada; aclaraba justo detrás del traje // niebla al pie de los pinos: lo que queda detrás de Moki
  frente: { de: 40, alfa: 0.74, color: 0x1e0f0a }, // el suelo baja a tinta hacia el borde de abajo: primer plano oscuro (r01c: menos fango)
  cima: { a: 0.62, hasta: 0.55, color: 0x7e3a3c }, // el cielo baja a vino arriba (R03): la luz queda pegada al horizonte
};

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

export function montarLuz(s, c) {
  if (!LUZ.on || !c) return;
  let o = null;
  const crear = () => {
    hornear(s);
    const img = (k, d, add) => {
      const v = s.add.image(0, 0, k).setDepth(d).setVisible(false);
      if (add) v.setBlendMode('ADD');
      return v;
    };
    const banda = (d, color) => s.add.image(0, 0, VERT).setOrigin(0, 0).setDepth(d).setTint(color).setVisible(false);
    const copia = (k, d, color) => s.add.tileSprite(0, 0, 10, 10, k).setOrigin(0, 0).setDepth(d).setTintFill(color).setVisible(false);
    o = {
      cima: banda(1.581, LUZ.cima.color).setFlipY(true),
      horizonte: banda(1.582, LUZ.horizonte.color),
      resplandor: img(RAD, 1.584, true).setTint(LUZ.resplandor.color),
      halo: img(RAD, 1.588, true).setTint(LUZ.sol.halo.color),
      disco: img(DISCO, 1.59),
      lejos: copia('capa_lejos', 2.061, LUZ.lejos.color),
      valle: banda(2.5, LUZ.valle.color),
      medio: copia('capa_medio', 3.061, LUZ.medio.color),
      bajo: banda(3.07, LUZ.bajo.color),
      frente: s.add.image(0, 0, VERT).setOrigin(0, 0).setDepth(4.64).setTintFill(LUZ.frente.color).setVisible(false),
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
    const ms = s.midS || 1;
    const vh = s.vh;
    const x = c.sol.x + s.vw * LUZ.sol.dx; // r01d: más adentro, en el hueco sobre los cerros y no tras el pino de la orilla
    const y = g - LUZ.sol.sobre * ms;
    o.disco.setPosition(x, y).setScale(ms).setAlpha(st);
    const R = LUZ.sol.r * ms;
    o.halo.setPosition(x, y).setDisplaySize(R * 2 * LUZ.sol.halo.k, R * 2 * LUZ.sol.halo.k).setAlpha(LUZ.sol.halo.a * st);
    const rr = vh * LUZ.resplandor.k * 2;
    o.resplandor.setPosition(x, y).setDisplaySize(rr, rr).setAlpha(LUZ.resplandor.a * st);
    tira(o.cima, s.top, s.top + (g - s.top) * LUZ.cima.hasta, LUZ.cima.a * st);
    tira(o.horizonte, g - LUZ.horizonte.de * ms, g - LUZ.horizonte.a * ms, LUZ.horizonte.alfa * st);
    igual(o.lejos, c.lejos);
    o.lejos.setAlpha(LUZ.lejos.velo * st);
    tira(o.valle, g - LUZ.valle.de * ms, g - LUZ.valle.a * ms, LUZ.valle.alfa * st);
    igual(o.medio, c.medio);
    o.medio.setAlpha(LUZ.medio.velo * st);
    tira(o.bajo, g - LUZ.bajo.de * ms, g - LUZ.bajo.a * ms, LUZ.bajo.alfa * st);
    const vert = s.vh > s.vw; // en vertical hay ~280 px de suelo: con el mismo alfa quedaba un bloque casi negro
    tira(o.frente, g + LUZ.frente.de * ms, s.bottom + 2, LUZ.frente.alfa * (vert ? 0.6 : 1) * st);
  };
}
