// MOKI SE MUEVE (DECISIONES 1-nov 18:15): 4 poses de Moki Pixel (kit moki-pixel, vista derecha 128 px, CC BY-NC
// "Moki por JorgeSuarez.com.mx"): zancada (ciclo de 7), salto (subida, 5), caída (1) y aterrizaje (6). La caída es el
// cuadro 10 del clip 'jump' del kit: manos a 26° y 29° bajo el hombro (anclas del atlas). La tira 'jump_fall' abría
// los dos brazos casi rectos a los lados, en T (director de arte, 2-nov). Las tiras
// salen de la geometría 3D del kit con el parche ya en la oreja derecha: nunca se espejan (sin flipX, escala positiva).
// Se importa en diferido desde RunScene (el JS inicial no carga estas imágenes). Solo lee el estado de la escena: no
// toca física, hitbox ni azar. En calma (movimiento reducido o juice Nada), al chocar y en la meta queda el títere
// recortado de siempre (src/art/mokiRig.js).
import runUrl from '../../assets/moki/pixel/moki_run_right_strip7.png';
import riseUrl from '../../assets/moki/pixel/moki_jump_rise_right_strip5.png';
import fallUrl from '../../assets/moki/pixel/moki_jump_fall_right_strip1.png';
import landUrl from '../../assets/moki/pixel/moki_land_right_strip6.png';
import { CONFIG as C } from '../config.js';

const TIRAS = { 'pose-run': [runUrl, 7], 'pose-rise': [riseUrl, 5], 'pose-fall': [fallUrl, 1], 'pose-land': [landUrl, 6] };
// Caja opaca medida en las tiras: Moki ocupa y 21-123 de 128 y su centro está en x ~66. Escala para que mida lo mismo
// que el títere (C.player.spriteHeight); origen en los pies.
const ESCALA = C.player.spriteHeight / 102;
const ORIGEN = [66 / 128, 123 / 128];
const LAND_MS = 260; // los 6 cuadros del aterrizaje
const FPS_AIRE = 12; // como exporta el kit
// SALTO NOCHE pieza 5, vuelta final (ciego p5): el filo cálido solo de la cadera para arriba (fila 92 de 128; antes bajaba
// hasta la suela), 1 px en vez de 2 (con 2 se leía como contorno de calcomanía y dejaba 3-4 px sueltos en el pecho y el
// brazo) y solo en ancho: en vertical (375) sin farol a la vista se leía como error.
const RIM_Y = 92;
const RIM_PX = 1;

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
    // SALTO NOCHE pieza 5: borde cálido. La misma pose, en el color de la luz del farol (variante K), detrás de Moki y
    // corrida RIM_PX hacia el farol (a la izquierda); el alfa lo calcula Faroles en s.rimA. Las poses se ven y el títere
    // se esconde, así que el borde del títere (setRim) nunca se dibujaba en juego.
    this.rim = scene.add.image(0, 0, 'pose-run', 0).setOrigin(...ORIGEN).setScale(ESCALA).setDepth(11.99).setTintFill(0xeb946a).setAlpha(0);
    this.pose = null;
  }

  // Llamar después de rig.update. Devuelve true si la pose se ve (y el títere se esconde).
  update() {
    const s = this.s;
    const on = !s.calm && (s.dead ? s.screen === 'dead' : s.screen === 'play' || s.screen === 'demo');
    this.sprite.setVisible(on);
    s.rig.setVisible(!on);
    this.rim.setVisible(on && !s.dead && s.rimA > 0 && s.scale.width / s.scale.height > C.portrait.maxAspect);
    if (!on) return false;
    if (s.dead) return this.golpe();
    this.y0 = null;
    this.sprite.setScale(ESCALA).setAngle(0);
    let key = 'pose-run';
    let frame = 0;
    const ld = s.t - s.landAt;
    if (!s.grounded) {
      key = s.vy < 0 ? 'pose-rise' : 'pose-fall';
      frame = Math.floor((s.t * FPS_AIRE) / 1000) % TIRAS[key][1];
    } else if (ld >= 0 && ld < LAND_MS) {
      key = 'pose-land';
      frame = Math.min(5, Math.floor((ld / LAND_MS) * 6));
    } else {
      // zancada por distancia: un ciclo de 7 cuadros cada lo que mide el paso del títere (los pies no patinan)
      const ciclo = (s.rig.debug && s.rig.debug.cyclePx) || 120;
      // s.trote: la zancada de la transición de entrada (boceto.js), con la partida parada; se queda de fase y no hay salto de pose
      frame = ((Math.floor(((s.dist + (s.trote || 0)) / ciclo) * 7) % 7) + 7) % 7; // el rebobinado del tutorial baja dist
    }
    if (key !== this.pose) {
      this.sprite.setTexture(key, frame);
      this.pose = key;
    } else this.sprite.setFrame(frame);
    this.sprite.setPosition(s.px, s.y + 2);
    this.rim.setTexture(key, frame).setCrop(0, 0, 128, RIM_Y).setPosition(s.px - RIM_PX, s.y + 2).setAlpha(s.rimA || 0);
    return true;
  }

  // CHOQUE: Moki sigue siendo el mismo dibujo. Durante el hit-stop se aplasta contra el obstáculo, sale en arco (la caída
  // del kit) mientras el mundo retrocede, y se asienta agachado (primer cuadro del aterrizaje). Solo visual: s.y no cambia.
  golpe() {
    const s = this.s;
    const K = C.art.choque;
    const g = C.world.groundY;
    if (this.y0 === null || this.y0 === undefined) {
      this.y0 = s.y;
      this.polvo = false;
    }
    if (s.cause === 'zanja') return this.dibuja('pose-fall', 0, s.y, 0, 1, 1);
    const t = s.deadFor - C.art.hitStopMs;
    if (t < 0) return this.dibuja('pose-land', 0, this.y0, -2, K.aplastado[0], K.aplastado[1]);
    const dur = K.arcoMs + Math.min(300, (g - this.y0) * 0.7); // desde el aire tarda más en bajar
    const u = t / dur;
    if (u < 1) {
      const k = Math.min(1, u / 0.3);
      const sx = K.aplastado[0] + (1 - K.aplastado[0]) * k;
      const sy = K.aplastado[1] + (1 - K.aplastado[1]) * k;
      return this.dibuja('pose-fall', 0, this.y0 + (g - this.y0) * u * u - K.saltoPx * Math.sin(Math.PI * u), K.giroDeg * Math.sin(Math.PI * u), sx, sy);
    }
    if (!this.polvo) {
      this.polvo = true;
      s.particles.burst('land', s.px, g);
    }
    const v = 1 - Math.pow(1 - Math.min(1, (t - dur) / K.asientaMs), 3);
    return this.dibuja('pose-land', 0, g, 0, K.asentado[0] + (1 - K.asentado[0]) * v, K.asentado[1] + (1 - K.asentado[1]) * v);
  }

  dibuja(key, frame, y, ang, sx, sy) {
    if (key !== this.pose) {
      this.sprite.setTexture(key, frame);
      this.pose = key;
    } else this.sprite.setFrame(frame);
    this.sprite.setPosition(this.s.px, y + 2).setAngle(ang).setScale(ESCALA * sx, ESCALA * sy); // escala siempre positiva: nunca espejado
    return true;
  }
}
