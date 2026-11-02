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
    this.nov = null; // lo nuevo de hoy (public/novedades.json), llega por import dinámico: el juego normal no lo carga
    this.nuevaVuelta();
    import('./novedades.js')
      .then((m) => m.cargar().then((n) => ((this.m = m), (this.nov = n))))
      .then(() => this.fase === 'titulo' && (this.sembrar(), this.m.mostrar(this.nov)))
      .catch(() => {}); // sin json: el guion de siempre
  }

  // Cada vuelta empieza igual: ayer jugó (racha de 3, saludo "¡Volviste! Día 4 seguido"), tutorial visto. Con ir_a
  // 'cuaderno' el nivel 1 va a 2 de 3 (falta 'Salta 3 cajas'): en la página 1 Moki sube de nivel y el tropiezo
  // enseña la tira con "Sigue: ..." antes de los 30 s. Sin novedades, Cuaderno vacío.
  sembrar() {
    const E = C.escaparate;
    const est = {
      'moki.primera': '1',
      'moki.tutorial': '1',
      'moki.modo': 'reto',
      'moki.racha': JSON.stringify({ v: 1, ultimo: diaLocal() - 1, racha: E.rachaAyer, perdon: null }),
    };
    if (this.irA()) est['moki.cuaderno'] = JSON.stringify({ v: 2, notas: ['cajas5', 'piezas15'], sellos: [] });
    sembrarMemoria(est);
  }

  irA() {
    return this.nov && this.nov.ir_a;
  }

  nuevaVuelta() {
    this.vuelta += 1;
    this.sembrar();
    if (this.nov) this.m.mostrar(this.nov);
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
      if (this.m) this.m.ocultar(); // el cartel vive en el título: en partida taparía el HUD a 375
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
    // Tropiezo: ya en la página 2, la siguiente caja se deja pasar sin saltar y sin red (una sola vez por vuelta).
    // Con ir_a 'cuaderno' va antes: en la página 1, en cuanto se tacha lo que faltaba del nivel 1 (la 3a caja, ~21 s de partida en el Reto del 1-nov).
    const ir = this.irA() && s.tramoIdx === 0 && s.partida && !s.porTachar.length; // ya se tachó lo que faltaba
    if (!this.tropezo && (ir || (s.tramoIdx === 1 && s.dist - lv.starts[1] > E.tropiezoSec * lv.tramos[1].speed))) {
      // con ir_a cae en lo que venga (caja o torre, ya cerca) para que la tira salga antes de los 30 s
      const o = s.obstacles.find((q) => !q.handled && (ir ? q.type !== 'viga' && q.x - s.px > 120 : q.type === 'caja' && q.x - s.px > 200));
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
