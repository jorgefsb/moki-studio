// Demo escaparate (?escaparate, BITACORA 31-oct 15:10): guion en bucle de ~2.5 min para la pantalla de Jorge que enseña
// lo de esta semana con una partida real del Reto del día jugada por el bot del demo:
// título con el saludo de racha -> página 1 de día -> página 2 (otro papel) -> tropiezo a propósito con tarjeta de fallo,
// tira del Cuaderno y sello nuevo -> tarde con Paseo (Moki cruza cajas fantasma) -> noche -> meta -> otra vuelta.
// Todo el estado vive en memoria (storage.js con SOLO_MEMORIA): no toca el localStorage del jugador. No cambia física,
// semilla ni bots; apagado por defecto, el demo público es el de siempre.
import { CONFIG as C } from './config.js';
import { SOLO_MEMORIA, sembrarMemoria } from './storage.js';
import { diaLocal } from './racha.js';

export const ESCAPARATE = SOLO_MEMORIA;

export class Escaparate {
  constructor(scene) {
    this.s = scene;
    this.vuelta = 0;
    this.nuevaVuelta();
  }

  // Cada vuelta empieza igual: ayer jugó (racha de 3, saludo "¡Volviste! Día 4 seguido"), tutorial visto, Cuaderno vacío.
  nuevaVuelta() {
    const E = C.escaparate;
    this.vuelta += 1;
    sembrarMemoria({
      'moki.primera': '1',
      'moki.tutorial': '1',
      'moki.modo': 'reto',
      'moki.racha': JSON.stringify({ v: 1, ultimo: diaLocal() - 1, racha: E.rachaAyer, perdon: null }),
    });
    const s = this.s;
    s.modo = 'reto';
    s.paseo = false;
    this.fase = 'titulo';
    this.ms = 0;
    this.tropezo = false;
    this.paseoCajas = 0;
    s.startDemo(); // título del demo de siempre; el saludo ya lee la racha sembrada
  }

  tick(dtMs) {
    const s = this.s;
    const E = C.escaparate;
    this.ms += dtMs;
    if (this.fase === 'titulo') {
      if (this.ms < E.tituloMs) return;
      s.startGame();
      s.god = true; // red de seguridad del bot, igual que en el demo; se quita solo para el tropiezo
      this.fase = 'partida';
      return;
    }
    if (s.screen === 'dead') {
      if (s.cardShown && s.deadFor >= E.falloMs) {
        s.respawn();
        s.god = true;
      }
      return;
    }
    if (s.screen === 'final') {
      if (s.finalShown && s.finalT >= 1200 + E.finalMs) this.nuevaVuelta();
      return;
    }
    if (s.screen !== 'play') return;
    this.guion();
    s.demoBot();
  }

  guion() {
    const s = this.s;
    const E = C.escaparate;
    const lv = s.level;
    // Tropiezo: ya en la página 2, la siguiente caja se deja pasar sin saltar y sin red (una sola vez por vuelta)
    if (!this.tropezo && s.tramoIdx === 1 && s.dist - lv.starts[1] > E.tropiezoSec * lv.tramos[1].speed) {
      const o = s.obstacles.find((q) => !q.handled && q.type === 'caja' && q.x - s.px > 200);
      if (o) {
        o.handled = true;
        s.god = false;
        this.tropezo = true;
      }
    }
    // Tarde = página 3: Paseo. Las cajas que nacen ya salen fantasma; Moki cruza las primeras sin saltar.
    const quierePaseo = s.tramoIdx === 2;
    if (quierePaseo !== s.paseoRun) {
      s.paseoRun = quierePaseo;
      s.paseoTagC.setVisible(quierePaseo);
    }
    if (s.paseoRun && this.paseoCajas < E.paseoCajas) {
      const o = s.obstacles.find((q) => !q.handled && q.type === 'caja' && q.sprite.alpha < 1 && q.x - s.px > 120);
      if (o) {
        o.handled = true;
        this.paseoCajas += 1;
      }
    }
  }
}
