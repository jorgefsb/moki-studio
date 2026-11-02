// MOKI SE MUEVE (DECISIONES 1-nov 18:15): 4 poses de Moki Pixel (kit moki-pixel, vista derecha 128 px, CC BY-NC
// "Moki por JorgeSuarez.com.mx"): zancada (ciclo de 7), salto (subida, 5), caída (5) y aterrizaje (6). Las tiras
// salen de la geometría 3D del kit con el parche ya en la oreja derecha: nunca se espejan (sin flipX, escala positiva).
// Se importa en diferido desde RunScene (el JS inicial no carga estas imágenes). Solo lee el estado de la escena: no
// toca física, hitbox ni azar. En calma (movimiento reducido o juice Nada), al chocar y en la meta queda el títere
// recortado de siempre (src/art/mokiRig.js).
import runUrl from '../../assets/moki/pixel/moki_run_right_strip7.png';
import riseUrl from '../../assets/moki/pixel/moki_jump_rise_right_strip5.png';
import fallUrl from '../../assets/moki/pixel/moki_jump_fall_right_strip5.png';
import landUrl from '../../assets/moki/pixel/moki_land_right_strip6.png';
import { CONFIG as C } from '../config.js';

const TIRAS = { 'pose-run': [runUrl, 7], 'pose-rise': [riseUrl, 5], 'pose-fall': [fallUrl, 5], 'pose-land': [landUrl, 6] };
// Caja opaca medida en las tiras: Moki ocupa y 21-123 de 128 y su centro está en x ~66. Escala para que mida lo mismo
// que el títere (C.player.spriteHeight); origen en los pies.
const ESCALA = C.player.spriteHeight / 102;
const ORIGEN = [66 / 128, 123 / 128];
const LAND_MS = 260; // los 6 cuadros del aterrizaje
const FPS_AIRE = 12; // como exporta el kit

export function montar(scene) {
  // El paquete de Phaser del estudio no trae el cargador de spritesheet: cada tira entra como imagen y los cuadros
  // de 128x128 se cortan a mano.
  for (const [key, [url]] of Object.entries(TIRAS)) scene.load.image(key, url);
  scene.load.once('complete', () => {
    for (const [key, [, n]] of Object.entries(TIRAS)) {
      const tx = scene.textures.get(key);
      for (let i = 0; i < n; i++) tx.add(i, 0, i * 128, 0, 128, 128);
      tx.setFilter(1); // NEAREST: pixel nítido
    }
    scene.poses = new MokiPoses(scene);
  });
  scene.load.start();
}

class MokiPoses {
  constructor(scene) {
    this.s = scene;
    // image, no sprite: el paquete de Phaser no trae Sprite y setFrame basta
    this.sprite = scene.add.image(0, 0, 'pose-run', 0).setOrigin(...ORIGEN).setScale(ESCALA).setDepth(12).setVisible(false);
    this.pose = null;
  }

  // Llamar después de rig.update. Devuelve true si la pose se ve (y el títere se esconde).
  update() {
    const s = this.s;
    const on = !s.calm && !s.dead && (s.screen === 'play' || s.screen === 'demo');
    this.sprite.setVisible(on);
    s.rig.setVisible(!on);
    if (!on) return false;
    let key = 'pose-run';
    let frame = 0;
    const ld = s.t - s.landAt;
    if (!s.grounded) {
      key = s.vy < 0 ? 'pose-rise' : 'pose-fall';
      frame = Math.floor((s.t * FPS_AIRE) / 1000) % 5;
    } else if (ld >= 0 && ld < LAND_MS) {
      key = 'pose-land';
      frame = Math.min(5, Math.floor((ld / LAND_MS) * 6));
    } else {
      // zancada por distancia: un ciclo de 7 cuadros cada lo que mide el paso del títere (los pies no patinan)
      const ciclo = (s.rig.debug && s.rig.debug.cyclePx) || 120;
      frame = ((Math.floor((s.dist / ciclo) * 7) % 7) + 7) % 7; // el rebobinado del tutorial baja dist
    }
    if (key !== this.pose) {
      this.sprite.setTexture(key, frame);
      this.pose = key;
    } else this.sprite.setFrame(frame);
    this.sprite.setPosition(s.px, s.y + 2);
    return true;
  }
}
