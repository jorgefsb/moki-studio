// Perillas del juego. Todo lo que se "siente" se ajusta aquí (BRIEF.md sección 5).
export const CONFIG = {
  // Salto
  gravity: 2200, // px/s²
  jumpVelocity: 720, // px/s
  jumpHoldMaxMs: 220, // si se suelta antes de esto mientras sube, se corta el salto
  jumpCutMultiplier: 0.45, // vy *= esto al soltar antes
  jumpMinPx: 55, // altura mínima de un toque (libra la caja de 44 con holgura; la de 64 pide mantener)
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

  // Escena: la banda jugable es 960x540 lógicos; en pantallas más altas el diorama se extiende arriba y abajo.
  world: { width: 960, height: 540, groundY: 440, minVisibleWidth: 640 },
  // Moki mide ~20% de la banda (ARTE.md sección 6); la caja de colisión es más chica que el dibujo.
  player: { x: 190, width: 38, height: 92, spriteHeight: 110 },
  obstacleSizes: [
    { key: 'caja', width: 48, height: 44 },
    { key: 'torre', width: 48, height: 64 },
  ],
  pickupSize: 30,

  // Arte y animación (ARTE.md sección 10)
  art: {
    anticipationMs: 100, // squash de despegue
    landingMs: 130, // squash y asentado al aterrizar
    tiltMaxDeg: 6,
    runBobPx: 2.5,
    parallax: { clouds: 0.1, far: 0.3, mid: 0.6 },
    checkpointLabelMs: 1600,
    checkpointFlagMs: 280,
    collectMs: 200,
  },
};
