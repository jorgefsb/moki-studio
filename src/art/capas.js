// SALTO CAPAS (DECISIONES 4-nov 03:56): el fondo del nivel 1 en 4 capas pintadas que repiten en mosaico. Viaja en el chunk diferido del atardecer y sus
// webp solo se piden si el jugador está en el nivel 1; si no cargan, se queda el fondo de código. Encima siguen obstáculos, fichas, Moki, hojas y bokeh.
// Las sale de evidencia/salto-capas/herramientas/hacer-capas.py: solo fondo. Moki nunca pasa por ahí.
import cieloUrl from '../../assets/capas/capa-cielo.webp';
import lejosUrl from '../../assets/capas/capa-lejos.webp'; // interruptor de los cerros: capa-lejos.webp (cálidos) o capa-lejos-malva.webp (0c94591)
import medioUrl from '../../assets/capas/capa-medio.webp';
import sueloUrl from '../../assets/capas/capa-suelo.webp';

const TEX = { w: 2048, h: 512 };
// ancho y alto: px del mundo que ocupa una repetición. par: parallax contra el piso. pie: px del mundo bajo el suelo donde acaba la capa.
const CAPAS = {
  cielo: { url: cieloUrl, depth: 1.58, ancho: 1139, par: 0.03 },
  lejos: { url: lejosUrl, depth: 2.06, ancho: 929, alto: 200, par: 0.3, pie: 15 },
  medio: { url: medioUrl, depth: 3.06, ancho: 1100, alto: 261, par: 0.6, pie: 22 },
  suelo: { url: sueloUrl, depth: 4.62, ancho: 1147, alto: 236, par: 1 }, // debajo de la gemela de lápiz del suelo (4.7)
};
// El sol no va en el mosaico: repetía cada 1139 px y salían dos (CAPAS: CERROS, PINOS Y SOL). Es uno solo y baja de 'en' a 'hasta' del ancho de pantalla en todo el nivel 1 (fin); en Libre, más allá de fin, se queda.
// r: radio en px del mundo. y: parte del cielo, con sube, donde cae su centro. sube: px del mundo que el cielo va arriba, para que el sol asome sobre los cerros.
const SOL = { en: 0.8, hasta: 0.2, fin: 44254, r: 59, y: 0.665, sube: 110, color: '#FFEEC4', depth: 1.59 };
const SUELO_ARRIBA = 12; // px del mundo que el canto del suelo pintado queda arriba de groundY: Moki pisa la franja crema
const SUELO_MARGEN = 6; // px de la textura, ya en el mundo, entre el borde de la textura y ese canto

export function montarCapas(s) {
  const c = { cargando: true, cargadas: false, activa: false };
  s.capas = c;
  const llave = (n) => `capa_${n}`;
  const nombres = Object.keys(CAPAS);
  const pon = (L, x, y, w, h, kx, ky, tile) => {
    L.setPosition(x, y).setSize(w, h).setTileScale(kx, ky);
    L.tilePositionX = tile / kx;
  };

  // Posición de cada cuadro. El mismo tamaño de pantalla da siempre el mismo dibujo; la vertical agranda como las capas de siempre.
  c.colocar = (g, st) => {
    if (!c.cargadas) return;
    const ms = s.midS || 1;
    const quieto = s.reduced;
    const d = (n) => (quieto ? 0 : s.dist * CAPAS[n].par);
    const anchoCielo = CAPAS.cielo.ancho * ms;
    const hCielo = g + 12 - s.top;
    pon(c.cielo, 0, s.top, s.vw, hCielo, anchoCielo / TEX.w, (hCielo + SOL.sube) / TEX.h, d('cielo'));
    c.cielo.tilePositionY = SOL.sube / c.cielo.tileScaleY;
    const avance = quieto ? 0 : Math.min(s.dist / SOL.fin, 1);
    c.sol.setPosition(s.vw * (SOL.en + (SOL.hasta - SOL.en) * avance), s.top + SOL.y * (hCielo + SOL.sube) - SOL.sube).setScale(ms);
    c.sol.setVisible(st > 0).setAlpha(st);
    const plano = (L, n, esc, baja) => {
      const P = CAPAS[n];
      const alto = P.alto * esc;
      pon(L, 0, g + P.pie - alto + baja, s.vw, alto, (P.ancho * esc) / TEX.w, alto / TEX.h, d(n));
    };
    plano(c.lejos, 'lejos', ms, s.far.y - s.base.far); // en vertical, con farS tapaban todo el cielo y el sol
    plano(c.medio, 'medio', ms, s.mid.y - s.base.mid);
    const altoS = CAPAS.suelo.alto * ms;
    const yS = g - SUELO_ARRIBA - SUELO_MARGEN * ms;
    pon(c.suelo, 0, yS, s.vw, Math.min(altoS, s.bottom - yS + 2), (CAPAS.suelo.ancho * ms) / TEX.w, altoS / TEX.h, s.dist);
    nombres.forEach((n) => c[n].setVisible(st > 0).setAlpha(st));
  };

  const listas = () => nombres.every((n) => s.textures.exists(llave(n)));
  const fin = () => {
    c.cargando = false;
    if (!listas()) return; // sin red o sin webp: sigue el fondo de código
    nombres.forEach((n) => {
      c[n] = s.add.tileSprite(0, 0, 10, 10, llave(n)).setOrigin(0, 0).setDepth(CAPAS[n].depth).setVisible(false);
    });
    if (!s.textures.exists('capa_sol')) {
      const t = s.textures.createCanvas('capa_sol', SOL.r * 2 + 2, SOL.r * 2 + 2);
      const x = t.getContext();
      x.fillStyle = SOL.color;
      x.beginPath();
      x.arc(SOL.r + 1, SOL.r + 1, SOL.r, 0, Math.PI * 2);
      x.fill();
      t.refresh();
    }
    c.sol = s.add.image(0, 0, 'capa_sol').setDepth(SOL.depth).setVisible(false);
    c.cargadas = true;
    // Con una transición ya corriendo no se cambia el dibujo a medias: colocar la activa al terminar
    if (!s.boceto) c.activa = true;
  };
  nombres.forEach((n) => {
    if (!s.textures.exists(llave(n))) s.load.image(llave(n), CAPAS[n].url);
  });
  s.load.once('complete', fin);
  s.load.start();
  return c;
}
