// Perillas del juego. Todo lo que se "siente" se ajusta aquí (BRIEF.md sección 5).
export const CONFIG = {
  // Salto
  gravity: 2200, // px/s²
  jumpVelocity: 720, // px/s
  jumpHoldMaxMs: 220, // si se suelta antes de esto mientras sube, se corta el salto
  jumpCutMultiplier: 0.45, // vy *= esto al soltar antes
  jumpMinPx: 66, // altura mínima de un toque (libra la caja baja de 56 con holgura; la torre de 84 pide mantener)
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
  // minVisibleWidth: en pantallas angostas se ve ese ancho lógico (Moki ≈76 px en 375, ARTE: 64-80).
  world: { width: 960, height: 540, groundY: 440, minVisibleWidth: 540 },
  // Moki mide ~20% de la banda (ARTE.md sección 6); la caja de colisión es más chica que el dibujo.
  // x: posición horizontal (28% del ancho visible, tope xMax) para dejar tiempo de reacción en celular.
  player: { xMax: 190, xRatio: 0.28, width: 38, height: 92, spriteHeight: 110 },
  obstacleSizes: [
    { key: 'caja', width: 60, height: 56 },
    { key: 'torre', width: 60, height: 84 },
  ],
  hitboxShrink: { x: 14, top: 16 }, // las cajas castigan menos de lo que se ven
  pickupSize: 30,

  // Arte y animación (ARTE.md sección 10)
  art: {
    anticipationMs: 100, // squash de despegue
    landingMs: 130, // squash y asentado al aterrizar
    tiltMaxDeg: 6,
    runBobPx: 3,
    tiltRiseDeg: 4, // inclinación hacia adelante en el aire (sin poses de salto, ARTE.md §14)
    parallax: { clouds: 0.1, far: 0.3, mid: 0.6 },
    checkpointLabelMs: 1600,
    checkpointFlagMs: 280,
    collectMs: 200,
  },
};
