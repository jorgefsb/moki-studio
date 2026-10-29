import '@fontsource/outfit/latin-700.css';
import '@fontsource/inter/latin-400.css';
import Phaser from 'phaser';
import { RunScene } from './scenes/RunScene.js';

// Las fuentes se piden antes de crear el juego para que el HUD mida bien desde el primer cuadro.
async function boot() {
  try {
    await Promise.all([document.fonts.load('700 22px Outfit'), document.fonts.load('400 16px Inter')]);
  } catch (e) {
    // sin fuentes sigue jugable con la de respaldo
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: '100%',
    height: '100%',
    backgroundColor: '#F4E8D5',
    scale: { mode: Phaser.Scale.RESIZE },
    scene: [RunScene],
  });

  // Para probar desde la consola / capturas: solo en dev o con ?debug (igual que el modo invulnerable).
  const q = new URLSearchParams(window.location.search);
  if (import.meta.env.DEV || q.has('debug') || q.get('anim') === 'debug') {
    game.moki = {
      // Bots de DISENO ('tap' | 'hold' | 'adjust') y tabla de alturas de salto; módulo aparte, solo en depuración.
      bot: (kind, maxSec) => import('./debug/bots.js').then((m) => m.runBot(game.scene.scenes[0], kind, maxSec)),
      jumpTable: () => import('./debug/bots.js').then((m) => m.jumpTable()),
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
