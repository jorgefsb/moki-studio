// Demo escaparate (?escaparate, BITACORA 31-oct 15:10; DECISIONES 5-nov 09:50): guion en bucle para la pantalla de Jorge que enseña
// lo que el juego es hoy con una partida real de Libre en nivel alto, jugada por su propio bot:
// título con el saludo de racha y lo nuevo -> página 1 -> página 2 con viento y tropiezo a propósito con tarjeta de fallo, tira
// del Cuaderno y sello -> página 3 con timbre -> página 4 con zanja -> meta -> otra vuelta. El trampolín sale en el respiro.
// Todo el estado vive en memoria (storage.js con SOLO_MEMORIA): no toca el localStorage del jugador. No cambia física,
// semilla ni bots; apagado por defecto, el demo público es el de siempre.
import { CONFIG as C } from './config.js';
import { SOLO_MEMORIA, sembrarMemoria } from './storage.js';
import { diaLocal } from './racha.js';
import { NIVELES } from './cuaderno.js';
import { airTravel } from './jumpmodel.js';

export const ESCAPARATE = SOLO_MEMORIA && new URLSearchParams(window.location.search).has('escaparate'); // ?ir= también vive en memoria, pero no es el escaparate

export class Escaparate {
  constructor(scene) {
    this.s = scene;
    this.vuelta = 0;
    this.nov = null; // lo nuevo de hoy (public/novedades.json), llega por import dinámico: el juego normal no lo carga
    // Armar el nivel tarda ~1 s de un jalón: en startGame era Moki congelado al arrancar. Se arma al entrar al título y startGame lo toma.
    const hacer = scene.makeLevel;
    scene.makeLevel = (sd) => {
      const n = this.nivel;
      this.nivel = null;
      return n || hacer.call(scene, sd);
    };
    this.nuevaVuelta();
    import('./novedades.js')
      .then((m) => m.cargar().then((n) => ((this.m = m), (this.nov = n))))
      .then(() => this.fase === 'titulo' && this.m.mostrar(this.nov))
      .catch(() => {}); // sin json: el guion de siempre
  }

  // Cada vuelta empieza igual: ayer jugó (racha de 3, saludo "¡Volviste! Día 4 seguido"), tutorial visto y el Cuaderno hasta
  // el nivel que destraba todas las mecánicas.
  sembrar() {
    const E = C.escaparate;
    sembrarMemoria({
      'moki.primera': '1',
      'moki.tutorial': '1',
      'moki.modo': 'libre',
      'moki.racha': JSON.stringify({ v: 1, ultimo: diaLocal() - 1, racha: E.rachaAyer, perdon: null }),
      'moki.cuaderno': JSON.stringify({ v: 2, notas: NIVELES.slice(0, C.timbre.nivel - 1).flat().map((n) => n.id), sellos: [] }),
    });
  }

  nuevaVuelta() {
    this.vuelta += 1;
    this.sembrar();
    if (this.nov) this.m.mostrar(this.nov);
    const s = this.s;
    s.modo = 'libre';
    s.paseo = false;
    this.fase = 'titulo';
    this.ms = 0;
    this.tropezo = false;
    this.blanco = null;
    // La zanja es un módulo diferido: el nivel no se arma hasta que bajó, o saldría sin zanjas
    this.zanja = false;
    s.pedirZanja();
    Promise.resolve(s.zanjaLista).then(() => (this.zanja = true));
    s.startDemo(); // título del demo de siempre; el saludo ya lee la racha sembrada
  }

  tick(dtMs) {
    const s = this.s;
    const E = C.escaparate;
    this.ms += dtMs;
    if (this.fase === 'titulo') {
      if (this.zanja && !this.nivel) this.nivel = s.makeLevel();
      if (this.ms < E.tituloMs || !this.nivel) return;
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
        this.blanco = null;
      }
      return;
    }
    if (s.screen === 'final') {
      if (s.finalShown && s.finalT >= 1200 + E.finalMs) this.nuevaVuelta();
      return;
    }
    if (s.screen !== 'play') return;
    this.guion();
    this.bot();
  }

  // Juega como la ruta "arriba" del validador (src/niveles/validar.js), que es la que garantiza pasar a ±40 ms: despega con el
  // salto centrado, con el viento en la cuenta; pisa el trampolín (no salta) y lo de abajo se sobrevuela; toca el timbre con
  // el salto mantenido y su torre acostada ya no se salta. demoBot no sirve aquí: se adelanta 60-80 ms y no conoce el timbre.
  bot() {
    const s = this.s;
    if (s.botRelease > 0 || !s.grounded) return;
    const o = s.obstacles.find((q) => !q.handled && !q.caida && q.x > s.px - 4 && (q.plan === 'tap' || q.plan === 'hold' || q.type === 'timbre'));
    if (!o) return;
    const kind = o.plan === 'tap' ? 'tap' : 'hold';
    const pair = s.obstacles.some((q) => q.plan === 'skip' && q.D > o.D && q.D - o.D < 120) ? C.cajaPegadaGapPx / 2 : 0;
    if (o.x - s.px <= airTravel(kind, s.speed, s.zonaK(s.dist)) / 2 - pair) {
      o.handled = true;
      s.press();
      s.botRelease = s.t + (kind === 'tap' ? 16 : 400);
    }
  }

  guion() {
    const s = this.s;
    const E = C.escaparate;
    const lv = s.level;
    // Tropiezo: ya en la página 2, la siguiente caja se deja pasar sin saltar y sin red (una sola vez por vuelta).
    if (!this.tropezo && s.tramoIdx === 1 && s.dist - lv.starts[1] > E.tropiezoSec * lv.tramos[1].speed) {
      const o = s.obstacles.find((q) => !q.handled && q.type === 'caja' && q.x - s.px > 200);
      if (o) {
        o.handled = true;
        s.god = false;
        this.tropezo = true;
        this.blanco = o;
      }
    }
    // Si Moki ya venía en el aire y la libró, sin choque: regresa la red y busca otra
    if (this.blanco && this.blanco.x < s.px - 60) {
      s.god = true;
      this.tropezo = false;
      this.blanco = null;
    }
  }
}
