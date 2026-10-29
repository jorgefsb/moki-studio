import '@fontsource/outfit/latin-700.css';
import '@fontsource/inter/latin-400.css';
import Phaser from 'phaser';
import { RunScene } from './scenes/RunScene.js';
import { CONFIG } from './config.js';
import { audio as audioFacade } from './audio/audio.js';

// Las fuentes se piden en paralelo con el arranque de Phaser (no lo frenan): al llegar, el HUD vuelve a medirse (ver RunScene).
async function boot() {
  try {
    document.fonts.load('700 22px Outfit');
    document.fonts.load('400 16px Inter');
  } catch (e) {
    // sin fuentes sigue jugable con la de respaldo
  }

  performance.mark('moki-boot');
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: '100%',
    height: '100%',
    backgroundColor: '#F4E8D5',
    scale: { mode: Phaser.Scale.RESIZE },
    audio: { noAudio: true }, // el sonido lo maneja src/audio (síntesis propia); Phaser no crea un segundo AudioContext
    scene: [RunScene],
  });

  // Para probar desde la consola / capturas: solo en dev o con ?debug (igual que el modo invulnerable).
  const q = new URLSearchParams(window.location.search);
  if (import.meta.env.DEV || q.has('debug') || q.get('anim') === 'debug') {
    game.moki = {
      contrast: (type, days) => import('./debug/contrast.js').then((m) => m.measureContrast(game.scene.scenes[0], type, days)),
      windows: (v) => import('./debug/windows.js').then((m) => m.measureWindows(game.scene.scenes[0], v)),
      overlaps: (v) => import('./debug/overlaps.js').then((m) => m.measureOverlaps(game.scene.scenes[0], v)),
      meter: (cmd) => import('./debug/meter.js').then((m) => (cmd === 'start' ? m.startMeter(audioFacade) : cmd === 'stop' ? m.stopMeter() : m.readMeter())),
      cfg: CONFIG, // perillas vivas, para barrer valores sin recargar
      // Tiempos de apertura (ms desde el inicio de la navegación): primer pintado, scripts listos, escena lista y primer cuadro con Moki
      timing() {
        const at = (n) => {
          const e = performance.getEntriesByName(n);
          return e.length ? Math.round(e[0].startTime) : null;
        };
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        const cm = {};
        ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'].forEach((k) => (cm[k] = at(k)));
        return { stages: cm, firstPaint: fcp ? Math.round(fcp.startTime) : null, boot: at('moki-boot'), ready: at('moki-ready'), run: at('moki-run') };
      },
      // Estado del audio (contexto, estado, silenciado, grado de energía, paso) para las pruebas del probador
      audioState: () =>
        Promise.resolve(audioFacade).then((a) => ({
          unlocked: a.unlocked,
          ctx: a.ctx ? a.ctx.state : null,
          muted: a.muted,
          state: a.state,
          energy: a.music ? a.music.state.target : null,
          layersOn: a.music ? a.music.state.layerOn.slice(1) : null,
          step: a.music ? a.music.state.step : null,
          playing: a.music ? a.music.state.running : false,
          master: a.bus ? a.bus.master.gain.value : null,
          sfxBus: a.bus ? a.bus.sfxBus.gain.value : null,
          musicBus: a.bus ? a.bus.musicBus.gain.value : null,
        })),
      // Bots de DISENO ('tap' | 'hold' | 'adjust') y tabla de alturas de salto; módulo aparte, solo en depuración.
      bot: (kind, maxSec) => import('./debug/bots.js').then((m) => m.runBot(game.scene.scenes[0], kind, maxSec)),
      jumpTable: () => import('./debug/bots.js').then((m) => m.jumpTable()),
      // Mediciones de audio con OfflineAudioContext (niveles, eco, costura del loop, wav de evidencia)
      audio: () => import('./debug/audioMeasure.js'),
      // Estado para que el probador mida sin adivinar: demo activo, pantalla actual y ángulos del títere.
      state() {
        const s = game.scene.scenes[0];
        return { demo: !!s.demo, screen: s.screen || 'juego', angles: s.rig ? s.rig.getAngles() : null };
      },
    };
    window.__moki = game;
  }
}

boot();
