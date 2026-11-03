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
      luz: s.add.image(0, 0, 'farolLuz').setOrigin(0.5, 0).setDisplaySize(F.luz.w, F.luz.h).setDepth(4.7).setVisible(false),
    }));
  }

  // dist: distancia del mundo (la misma que corre el suelo); nt: cuánto es de noche
  update(dist, nt) {
    const F = C.atmosphere.night.farol;
    if (!F.on || (nt <= 0 && !this.items)) return;
    if (!this.items) {
      if (!this.scene.textures.exists('farolLuz')) return; // texturas diferidas (buildTextures): aún no listas
      this.make();
    }
    const s = this.scene;
    const g = C.world.groundY;
    const P = s.vw * F.cada;
    const k0 = Math.floor((dist - 200) / P);
    this.items.forEach((it, i) => {
      const k = k0 + i;
      const x = k * P + P * F.jitter * frac(k) - dist; // separación entre faroles de (1 - jitter) a (1 + jitter) * cada pantallas
      const on = nt > 0 && x > -150 && x < s.vw + 150;
      it.poste.setVisible(on).setAlpha(nt).setPosition(x, g - 6);
      it.luz.setVisible(on).setAlpha(F.luz.alpha * nt).setPosition(x + 26, g - 8);
    });
  }
}
