import Phaser from 'phaser';
import { CONFIG } from './config.js';
import { RunScene } from './scenes/RunScene.js';

const { width, height } = CONFIG.world;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width,
  height,
  backgroundColor: '#e9dcc3',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [RunScene],
});

// Para probar desde la consola / capturas.
window.__moki = game;
