// Perillas del juego. Todo lo que se "siente" se ajusta aquí (BRIEF.md sección 5).
export const CONFIG = {
  // Salto
  gravity: 2200, // px/s²
  jumpVelocity: 720, // px/s
  jumpHoldMaxMs: 220, // si se suelta antes de esto mientras sube, se corta el salto
  jumpCutMultiplier: 0.62, // vy *= esto al soltar antes (toque rápido ≈55 px: libra la caja de 44; la de 64 pide mantener)
  coyoteMs: 90,
  jumpBufferMs: 110,

  // Carrera
  runSpeedStart: 320, // px/s
  runSpeedMax: 560,
  runSpeedRampPerSec: 2, // px/s²

  // Obstáculos
  obstacleGapMin: 420, // px entre obstáculos
  obstacleGapMax: 900,
  pickupChance: 0.6, // por hueco

  // Nivel
  checkpointEverySec: 30,
  levelLengthSec: 120,

  // Moki
  squashMax: 0.03,

  // Escena (placeholders de T1)
  world: { width: 960, height: 540, groundY: 440 },
  player: { x: 190, width: 40, height: 56 },
  obstacleSizes: [
    { width: 36, height: 44 },
    { width: 44, height: 64 },
  ],
};
