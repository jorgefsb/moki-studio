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
  juice: 1, // 0 Nada, 1 Poquito, 2 Mucho, 3 Hardcore (el menú llega con el sonido)

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

  // Títere recortado de moki-lado.webp (ANIMACION.md §1). Cajas en píxeles de la fuente (134x260),
  // medidas con el overlay ?anim=debug sobre los bordes reales del dibujo.
  rig: {
    src: { w: 134, h: 260 },
    hip: { x: 66, y: 186 }, // pivote de las piernas (centro de la pelvis)
    body: { x0: 0, y0: 0, x1: 134, y1: 186, smile: 8 }, // casco, torso, mochila de fondo y disco-brazo; corte inferior en sonrisa
    leg: { x0: 40, y0: 164, x1: 97, y1: 240, stretchRow: 178, realFrom: 176 }, // sube 22 px sobre la cadera; y<176 es la lengüeta
    boot: { x0: 28, y0: 226, x1: 110, y1: 260, ankle: { x: 68, y: 232 } },
    pack: { x0: 0, y0: 115, x1: 40, y1: 186, pivot: { x: 38, y: 130 } },
    // Brazo: recorte del brazo que cuelga en moki-saluda.webp (arte oficial, sin espejar). En moki-lado el brazo
    // se ve de punta (el disco del pecho), por eso parecía en T. Mismo pivote de hombro que el disco.
    arm: {
      poly: [[10, 146], [36, 146], [44, 164], [44, 186], [37, 200], [34, 218], [3, 218], [2, 190], [6, 172], [8, 154]], // en px de moki-saluda
      box: { x0: 0, y0: 144, x1: 50, y1: 220 },
      pivot: { x: 24, y: 150 }, // hombro dentro del recorte (px de moki-saluda)
      shoulder: { x: 70, y: 146 }, // hombro en moki-lado
      maxDeg: 18,
      lagMs: 30, // retraso suave respecto a la pierna opuesta
    },
    sole: { x: 69, y: 256 }, // punto de la suela que se bloquea al suelo
    farTint: 0xc9bfb1, // pierna lejana: copia del recorte, papel en sombra
    farDxPx: -5,
    layerShadow: { dx: 1.5, dy: 2, alpha: 0.18 },
  },

  // Arte y animación (ARTE.md sección 10, ANIMACION.md)
  art: {
    anticipationMs: 90, // agacharse sin retrasar el despegue
    landingMs: 130, // hundimiento y asentado al aterrizar
    tiltMaxDeg: 6,
    theta0: 38, // ángulo del tobillo al contacto/despegue (grados). La bota pisa plana: el paso lo da el tobillo (46 src), no la pierna entera
    duty: 0.35, // fracción del ciclo que cada pierna pasa en apoyo
    cycleBobPx: 3, // subida de la cadera entre contacto y media pisada
    retractMax: 7, // px de recogida de la pierna en balanceo
    tiltRunDeg: 3,
    squashPx: 3.3, // hundimiento máximo (3% de 110)
    hopPx: 14,
    hitStopMs: 60,
    packLagHz: 11,
    reducedTheta0: 20,
    parallax: { clouds: 0.1, far: 0.3, mid: 0.6 },
    foreground: { speed: 1.3, minGapSec: 2.6 },
    vertical: { far: 0.02, mid: 0.04, ground: 0.06, maxPx: 4 },
    checkpointLabelMs: 1600,
    checkpointFlagMs: 280,
    collectMs: 200,
  },
};
