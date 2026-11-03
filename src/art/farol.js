// SALTO NOCHE DE PAPEL, pieza 2 (ESPEC-SALTO.md): faroles de papel en poste de cartón al fondo del suelo, cada 1 a 2
// pantallas, con su mancha de luz SOBRE el suelo. Solo de noche (siguen al fundido nt); de día no se crean ni se dibujan.
// Posición pura de la distancia (sin PRNG): no toca la física, el guion ni la semilla del fondo.
import { CONFIG as C } from '../config.js';

const frac = (k) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export class Faroles {
  constructor(scene) {
    this.scene = scene;
    this.items = null; // se crean la primera vez que cae la noche (las texturas salen de la cola diferida de buildTextures)
  }

  make() {
    const s = this.scene;
    const F = C.atmosphere.night.farol;
    this.items = [0, 1, 2].map(() => ({
      // pie del poste escondido tras el canto de atrás del suelo (depth 4): el farol queda detrás del suelo
      poste: s.add.image(0, 0, 'farolPoste').setOrigin(27 / 128, 1).setScale(0.5).setDepth(3.9).setVisible(false),
      luz: s.add.image(0, 0, 'farolLuz').setOrigin(0.5, 0).setDepth(4.7).setVisible(false),
    }));
  }

  // x en pantalla del pie de los 3 faroles que pueden verse (pura de la distancia; la usa también stepMidProps)
  xs(dist) {
    const F = C.atmosphere.night.farol;
    const P = this.scene.vw * F.cada;
    const k0 = Math.floor((dist - 200) / P);
    // separación entre faroles de (1 - jitter) a (1 + jitter) * cada pantallas
    return [k0, k0 + 1, k0 + 2].map((k) => k * P + P * F.jitter * frac(k) - dist);
  }

  // dist: distancia del mundo (la misma que corre el suelo); nt: cuánto es de noche
  update(dist, nt) {
    const F = C.atmosphere.night.farol;
    if (!F.on || (nt <= 0 && !this.items)) return;
    if (!this.items) {
      if (!this.scene.textures.exists('farolLuzV')) return; // texturas diferidas (buildTextures): aún no listas
      this.make();
      // un cuadro con las dos manchas fuera de pantalla para que la GPU ya las tenga (al nacer con su poste daban 4-7 cuadros > 33 ms)
      this.items.forEach((it, i) => it.luz.setTexture(i ? 'farolLuzV' : 'farolLuz').setPosition(-2000, 0).setVisible(true));
      return;
    }
    const s = this.scene;
    const g = C.world.groundY;
    // en vertical (375) la mancha es más alta y más opaca: a lo ancho ya llena casi la pantalla (ciego día 1)
    const L = s.midS !== 1 ? F.luzV : F.luz;
    const xs = this.xs(dist);
    this.items.forEach((it, i) => {
      const x = xs[i];
      const on = nt > 0 && x > -150 && x < s.vw + 150;
      it.poste.setVisible(on).setAlpha(nt).setPosition(x, g - 6);
      // la mancha nace y muere con su poste: solo con el poste en pantalla (de x - 14 a x + 51), con rampa de 60 px en los
      // bordes; antes asomaba sin poste a la vista (luz sin fuente, ciego 1c)
      const a = Math.min(1, Math.max(0, Math.min(x + 51, s.vw - x + 14) / 60));
      it.luz.setVisible(on && a > 0).setTexture(L.key).setDisplaySize(L.w, L.h).setAlpha(nt * a).setPosition(x + 26, g - 8);
    });
  }
}
