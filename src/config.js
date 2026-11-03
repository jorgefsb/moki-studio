// Perillas del juego. Todo lo que se "siente" se ajusta aquí (BRIEF.md sección 5).
export const CONFIG = {
  // Salto
  gravity: 2200, // px/s²
  jumpVelocity: 720, // px/s
  jumpHoldMaxMs: 220, // si se suelta antes de esto mientras sube, se corta el salto
  jumpCutMultiplier: 0.45, // vy *= esto al soltar antes
  jumpHoldRamp: { fromMs: 110, toMs: 145 }, // entre estos ms de mantener el corte se afloja hasta el salto completo
  // Teclado (bug P1 de Jorge, 1-nov): un toque de tecla dura más que un clic o un dedo; con la rampa de arriba la
  // flecha casi siempre daba salto largo. Solo cuando el salto empezó con tecla; mouse, táctil y bots no cambian.
  jumpHoldRampKey: { fromMs: 180, toMs: 215 },
  jumpMinPx: 62, // altura mínima de un toque: libra la caja (exige 38) y queda >= 15 px por debajo de la torre de 96 (exige 78)
  coyoteMs: 90,
  jumpBufferMs: 110,

  // Carrera: la velocidad la fija cada tramo y sube con una rampa de 2 s en el checkpoint
  runSpeedStart: 320, // px/s
  runSpeedMax: 470,
  tramos: [{ speed: 320 }, { speed: 350 }, { speed: 385 }, { speed: 420 }],
  tramoEaseSec: 2,
  respawnEaseSec: 1,
  respawnSpeedMult: 0.85,
  respawnCalmSec: 2,
  retryLockoutMs: 550, // la tarjeta de fallo no acepta toque antes (guarda contra el toque de pánico)
  tachadoMs: 1600, // Día 2: lo que dura en pantalla el aviso de encargo tachado a media partida

  // Guion (DISENO.md §3 y §8)
  cajaPegadaGapPx: 84,
  minGapSec: 0.75,
  pairGapSec: 0.9,
  waveGapSec: 0.8,
  // Pop-up (código U): caja que sale del suelo. Todo en segundos de llegada a Moki, a la velocidad de su tramo.
  // Aviso (labio de cartón que tiembla + sombra) desde warnSec; sube entre solidSec + riseSec y solidSec; sólida desde solidSec.
  // warnSec: la caja completa cabe en lo que se ve delante con minVisibleWidth a 420 px/s (389 px); reactSec: del aviso al despegue del bot.
  popup: { warnSec: 0.85, riseSec: 0.12, solidSec: 0.36, lipPx: 12, shakePx: 1.5, reactSec: 0.45, minGapBeforeSec: 1.4 },

  // Audio (AUDIO.md §3): el maestro es fijo; solo se calibran los dos buses
  // Calibrado con OfflineAudioContext: música con todas las capas = -18 dBFS de pico, efectos principales ≈ -12 dBFS
  audio: { master: 0.125, sfxBus: 5.7, yield: 0.3, duck: 0.63, limitDb: -8, limitKnee: 3, limitRatio: 10, limitMakeup: 0.646, musicBus: 0.78, echoWet: 0.33, echoFeedback: 0.25 },

  // Piezas y puntaje
  pickupReach: { dx: 30, dy: 34, bodyCenter: 46 }, // la caja de recogida sigue el cuerpo, no todo Moki
  combo: { windowMs: 900, steps: [[1, 1], [3, 2], [6, 3]] }, // [desde N piezas seguidas, valor]
  crece: { estelaV: 350, estelaMs: 120, estelaMsHC: 80, estelaAtras: [40, 50], estelaHC: { escala: 3.2, vida: 1.25, colores: ['orange', 'kraft', 'orange'] } }, // CRECE nivel 8: estela desde 350 px/s (tramo 2 en adelante), un recorte cada 120 ms (80 en Hardcore); se queda atrás 40-50 px/s; Hardcore x3.2, vida x1.25, 2 de 3 naranja
  arcBonus: 5,
  amberValue: 5,
  scorePerPiece: 10,
  scorePerMeter: 1,
  jorgeInterventions: __JORGE_INTERVENTIONS__, // cuenta de BITACORA.md al compilar

  // Nivel
  checkpointEverySec: 30,
  levelLengthSec: 120,

  // Fondo vivo (T3d): semilla propia, separada del guion; 1 protagonista a la vez, 6 s entre inicios (8 s en el demo)
  ambient: { seed: 20261029, minGapMs: 6000, demoGapMs: 8000 },

  // Tutorial (UX.md §4)
  vuelta: { speedMult: 1.12, scoreMult: 1.25 }, // Vuelta rápida (GDD §3, DISENO §81): tramos x1.12 con tope runSpeedMax y puntaje x1.25; solo Reto y Libre, se abre con el sello Coleccionista
  paseo: { obstacleAlpha: 0.5, edgeSoft: 0.5, dia: { darken: 0.3, soft: 1, ink: 1.5 }, lampDx: 110 }, // Modo Paseo: alfa de los obstáculos (cruzarlos se lee a propósito, no como fallo); edgeSoft: contorno, perfil y cinta bajan con el cartón para que no parezca vidrio (noche y viga); dia: caja y torre de día con cartón oscurecido, tinta x1.5 (perfil 0.6, canto 0.75) y cinta entera (a la mitad en pantalla)
  tutorial: { lookaheadPx: 240, stopMs: 450, handPulseMs: 1200, handPulses: 4, repeatMs: 10000, rewindMs: 180, okMs: 900 },
  // leadTap/leadHold: px extra respecto de la mitad del recorrido aéreo al despegar (se calibra contra la física real, sin god)
  demo: { idleReturnMs: 20000, stripMs: 400, leadTap: 0, leadHold: 0 },
  // ?escaparate (guion en bucle para la pantalla de Jorge): título con saludo, tropiezo en la página 2, Paseo en la tarde
  // tituloMs: título con el saludo de racha; tropiezoSec: segundos dentro de la página 2 antes de buscar la caja del
  // tropiezo; falloMs: tarjeta de fallo visible; paseoCajas: cajas fantasma que Moki cruza sin saltar; finalMs: tarjeta final
  escaparate: { tituloMs: 5000, tropiezoSec: 4, falloMs: 10000, paseoCajas: 2, finalMs: 6000, rachaAyer: 3 },

  // Moki
  squashMax: 0.03,
  juice: 1, // 0 Nada, 1 Poquito, 2 Mucho, 3 Hardcore (el menú llega con el sonido)

  // Escena: la banda jugable es 960x540 lógicos; en pantallas más altas el diorama se extiende arriba y abajo.
  // minVisibleWidth: en pantallas angostas se ve ese ancho lógico (Moki ≈76 px en 375, ARTE: 64-80).
  world: { width: 960, height: 540, groundY: 440, minVisibleWidth: 540 },
  // Moki mide ~20% de la banda (ARTE.md sección 6); la caja de colisión es más chica que el dibujo.
  // x: posición horizontal (28% del ancho visible, tope xMax) para dejar tiempo de reacción en celular.
  player: { xMax: 190, xRatio: 0.28, width: 38, height: 92, spriteHeight: 110 },
  obstacleSizes: {
    caja: { width: 60, height: 56 },
    torre: { width: 60, height: 92 }, // exige 76 de salto: se libra manteniendo desde ~130 ms; el toque (apex 62-72) no la libra
    viga: { width: 91, height: 32, hangBottom: 190 }, // colgante: 20% más ancha que antes; castiga saltar de más (pico > 94 px)
    tramp: { width: 88, height: 24 }, // trampolín de cartón (J): no choca; pisarlo lanza
  },
  // Trampolín (NIVELES.md flow, mecánica #1): pisarlo lanza con vy fija y gravedad flotada; vuelo ~1.25 s, pico ~234 px.
  // Libra un obstáculo a 0.9 s (el nudo; torre con >= 52 px a 320 px/s) y pide 0.75 s libres al caer. Solo en Libre desde el nivel 3 del Cuaderno.
  tramp: { velocity: 750, gravityK: 0.55, nudoSec: 0.9, caidaLibreSec: 0.75, nivel: 3 },
  // Viento (NIVELES.md "#2 Viento"): despegar dentro de una zona estira (favor) o encoge (contra) el salto en x: el mundo
  // avanza a speed * k mientras Moki está en el aire. Zona de D - antesSec a D + despuesSec; al aterrizar con k != 1,
  // lo siguiente a >= salidaSec. Solo en Libre desde el nivel 5 del Cuaderno.
  // contra 0.85 (no 0.8): con 0.8 la ventana de C< a 320 px/s mide 80 ms y no aguanta ±40 (scripts/viento-calibrar.mjs)
  // rampaSec: el mundo va de 1 a k (y de vuelta al aterrizar) en línea recta; a favor tarda 60 ms y en contra 30 (misma pendiente; con 80 el ciego a -40 ya no chocaba: scripts/viento-calibrar.mjs)
  viento: { favor: 1.3, contra: 0.85, antesSec: 0.7, despuesSec: 0.15, salidaSec: 0.75, rampaSec: 0.06, nivel: 5 },
  // Timbre (NIVELES.md §9): campana colgante a 1.0 s antes de una torre; si la toca el salto mantenido, la torre se
  // acuesta hacia adelante (retardo + caída) y deja 5 piezas de piso. Caja de 46 de ancho = el dibujo (líder, 2-nov).
  // lo 186 -> 190: el mantenido de 130 ms sube la cabeza a 189 y sonaba a medias; el completo llega a 202 (timbre-calibrar).
  // vuelta A (director, 2-nov 05:10): x1.3 con choque igual al dibujo (aro 46 x 1.3 = 60), torre a 0.9 s (a 385 queda
  // entera en los 389 px que se ven delante de Moki a 375: 346 + 30) y solo en tramos de <= vMax px/s
  timbre: { lo: 190, hi: 214, ancho: 60, escala: 1.3, torreSec: 0.9, vMax: 385, caidaSec: 0.3, libreSec: 0.75, nivel: 9 },
  hitboxShrink: { x: 18, top: 16 }, // torre y viga (la lección de Mantén no se toca)
  hitboxShrinkCaja: { x: 22, top: 20 }, // la caja perdona más (T3f): ventana de despegue de 109 a 156 ms y de dos cajas de 94 a ~134 ms a 320 px/s
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
      lagMs: 40, // tope del retraso (ms) y filtro de las transiciones del aire
      phaseLag: 0.07, // retraso respecto a la pierna opuesta, en fracción de ciclo
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
    cycleBobPx: 3.5, // subida de la cadera entre contacto y media pisada
    retractMax: 7, // px de recogida de la pierna en balanceo
    tiltRunDeg: 3,
    squashPx: 3.3, // hundimiento máximo (3% de 110)
    hopPx: 14,
    hitStopMs: 60,
    recoilPx: 28, // Moki retrocede esto tras el choque (Cubic.out, 220 ms): la hitbox es 18 px más chica que el dibujo, con 12 se veía atravesar la caja
    packLagHz: 11,
    reducedTheta0: 20,
    parallax: { clouds: 0.1, far: 0.3, mid: 0.6 },
    // Pinos y postes de la capa media nunca detrás de un obstáculo (BITACORA 29-oct 10:16): se desvanecen cuando la caja de
    // colisión de una caja, torre o viga (más marginPx de pantalla) se les acerca a fadePx; dentro del margen no se dibujan.
    midClear: { on: true, marginPx: 12, fadePx: 48 },
    foreground: { speed: 1.3, minGapSec: 2.6 },
    vertical: { far: 0.02, mid: 0.04, ground: 0.06, maxPx: 4 },
    checkpointLabelMs: 1600,
    checkpointFlagMs: 280,
    collectMs: 200,
  },

  // Celular vertical (ancho/alto <= maxAspect): se ve un mundo más angosto y Moki se corre a la izquierda,
  // de modo que lo que se ve por delante de Moki (tiempo de reacción) es igual que con world.minVisibleWidth.
  // visibleWidth 460 en 390x844: zoom 0.72 -> 0.85, Moki 79 -> 93 px, x de Moki 151 -> 71.
  // Composición (director, opción C): groundAt = altura del suelo en pantalla (0.66 = 66% desde arriba);
  // farScale/midScale agrandan los cerros lejanos y la capa media para llenar el cielo (el paralaje corre igual).
  portrait: { maxAspect: 0.75, visibleWidth: 460, groundAt: 0.66, farScale: 1.8, midScale: 1.3 },

  // Luz de lámpara (director, P1a): textura multiplicada sobre el cuadro, bajo el HUD.
  // halo: cuánto se acerca a #FFA500 el centro del halo (arriba a la izquierda); vignette: tinta en las esquinas.
  light: { on: true, halo: 0.14, vignette: 0.2 },
  // Perspectiva atmosférica (P1b): velo del color del cielo de la hora sobre cada capa (tintFill con la misma textura).
  // Las capas lejana y media ya traen 0.55 y 0.32 de papel en su color: estos velos se suman (de día ~0.64 / ~0.40).
  // near: el frente y el suelo van al revés, hacia tinta (gauntlet R0: frente oscuro), con alfa near.
  // on: false apaga velos, cordillera y sol de una vez (el fondo queda como en master).
  // night: valores de la hora noche (arte rechazó la noche deslavada): velos casi fuera, suelo más hacia tinta,
  // cielo 22% hacia tinta y cordillera rellena hacia #3a342d. Se mezclan con el fundido de la hora.
  // v2 (30-oct, director): atmósfera y luz de vuelta como en db209e9; de noche la viga se fundía con la cordillera a 375.
  // ridgeLight: cordillera nocturna más clara, kraft apagado (on false regresa a ridge #3a342d). Con #4a4036 la viga
  // quedaba en 1.26 a D=317 (la viñeta oscurece la orilla derecha); #625545 es lo mínimo que pasó en las 5 posiciones.
  // vigaDim: cuánto se oscurece la viga de noche hacia tinta (caja y torre siguen en 0.7).
  // vigaOutline: contorno de papel solo en la viga de noche (ARTE.md: todo peligro con contorno claro). 3 px al 100%
  // (director, 30-oct): a 375 el de 2 px al 88% se veía como línea fina. moki.contrast mide el píxel más claro del
  // contorno contra el fondo 9 px afuera, en el punto medio de los lados (lejos de las esquinas).
  // NO APAGAR vigaOutline de noche (director, 30-oct): sin contorno el cuerpo de la viga queda flojo contra el fondo
  // (sonda 'esquinas' 1.56-2.83 en 3 de 5 posiciones); la viga se lee gracias al contorno. Torre a 1280 de noche
  // pasa por 0.02 (2.02): no oscurecer nada de la noche antes del congelado.
  atmosphere: {
    on: true, far: 0.2, mid: 0.12, near: 0.16,
    night: {
      // SALTO NOCHE (3), perspectiva atmosférica de noche (GDD §5.2): cada capa más hacia el cielo ciruela mientras más
      // lejos. Antes far 0.08 y mid 0.05.
      far: 0.25, mid: 0.1, near: 0.26, ridge: 0x3a342d,
      // escalera de valores (gauntlet R3, 30-oct): #625545 -> #87755F, +12 puntos de luminosidad HSL (32.7% -> 44.7%), mismo
      // tono; sigue más oscura que el horizonte #B7B3AD. Torre a 1280 subió de 1.91-2.05 a 2.24 de mínimo en la misma página.
      // ajuste de arte (30-oct): a 375 la cordillera #87755F se fundía con el cielo de atrás (brecha medida 3.0 puntos de L).
      // Se queda #87755F y se aclara la banda del horizonte (horizon.band; antes glow). Oscurecerla a #77654F también daba 8.9 puntos,
      // pero bajaba la torre a 1280 D=540 a 2.18. Medidas en evidencia/v2-cordillera.md.
      // opción C (director, 30-oct): de vuelta a #625545. La #87755F perdió la masa oscura que daba profundidad a 1280.
      // SALTO NOCHE (3): #625545 al 40 % hacia el ciruela del cielo #41363E (la cordillera es la capa más lejana)
      ridgeLight: { on: true, color: 0x554942 },
      // ajuste 2 de arte (30-oct): a 1280 el contorno de 3 px se fundía con una nube clara detrás (viga 2.19-2.21).
      // 4 px (ARTE §3: canto de 4 a 6 px) y una línea de tinta de 1 px por fuera, solo en la viga.
      vigaOutline: { on: true, alpha: 1, width: 4, ink: { color: '#22211F', px: 1 } },
      vigaDim: 0.95,
      // v2 (30-oct, director): de noche los planos cercanos más oscuros que los lejanos y el horizonte más claro y frío.
      // ground: el velo del suelo y el frente toma el tono de la cordillera (color) con alfa alpha en vez de tinta a near;
      // dim baja ese tono hacia negro (0.08 = -8% de luminosidad, director 30-oct: el primer plano es lo más oscuro).
      // planes: cuánto se oscurecen (multiplicado) las casitas del plano lejano y el pino del medio; el medio más.
      // far 0.06 (director): casitas un paso más oscuras; el plano lejano trae los cerros detrás de la torre (far 0.12
      // la bajaba de 3.27 a 2.66).
      // fibers: fibras de papel encima del velo del suelo de noche (el velo al 70% las borraba), alfa a noche plena.
      // horizon: el degradado del cielo junto al horizonte (skyGrad, hasta 26%) pasa de kraft a papel frío (#B7B3AD).
      // ground.color se queda en el tono viejo de la cordillera (#625545) y dim 0.18 (escalera de valores): el suelo y el
      // canto de juego quedan más oscuros que cualquier plano de atrás.
      // opción C (director, 30-oct): dim de vuelta a 0.08 como la base d321e3b.
      // SALTO NOCHE pieza 1 (ESPEC-SALTO, 3-nov): escala de valores de noche de oscuro a claro, cielo < cordillera <
      // lejano < medio < suelo; el suelo es la capa más clara. Base técnica v2/fondo-luz 2c25198 (sky 0.7, mid 0, fibras
      // 0.12), pero el suelo ya no es el #CCBA9C gris de ahí: kraft cálido levantado hacia papel (kraft→papel 30 %, el de
      // la clave N2). skyTo: el cielo baja hacia ciruela oscuro de papel (no hay token ciruela: tinta→borde 30 % con un
      // toque violeta) en vez de tinta sola. Antes: sky 0.22 hacia tinta, ground #625545 0.7 dim 0.08, mid 0.24, fibras 0.09.
      sky: 0.96, skyTo: 0x41363e,
      // ciego día 1 (4 vistazos): con el suelo a 60 la luz del farol no se veía. Suelo un paso abajo (#CBAB89, kraft→papel
      // 30 %, al 0.8) y pino un paso abajo (mid 0.12): 24.5 / 31.8 / 40.8 / 47.5 / 57.3 a 1280, la mancha tiene de dónde subir.
      ground: { on: true, color: 0xcbab89, alpha: 0.8, dim: 0 },
      planes: { on: true, far: 0.06, mid: 0.12 },
      fibers: { on: true, alpha: 0.12 },
      // SALTO NOCHE pieza 2: farol de papel en poste de cartón detrás del suelo, cada (1 - jitter) a (1 + jitter) * cada
      // pantallas. luz: mancha sobre el suelo (w x h px de mundo, media elipse desde el canto de atrás), alfa a noche plena.
      // 300 x 48 al 0.55 casi no se percibía (ciego día 1) y 0.85 normal tampoco (el suelo ya es claro); aditiva saturaba el rojo y quedaba lima (ciego 3). Normal al 1
      // con el tono de farolLuz (papel + #FF6B35 25 %, día 1b: sin el kraft 15 % que lo apagaba).
      // luzV: la mancha en vertical (375), más alta y más opaca. clearPx: ningún poste de telégrafo de la capa media a menos
      // de esto (px de mundo) del farol; se desvanece con midClear.fadePx (regla de colocación del 31-oct).
      farol: { on: true, cada: 1.5, jitter: 0.33, clearPx: 70, rim: { alpha: 1, r: 240 }, luz: { key: 'farolLuz', w: 380, h: 64 }, luzV: { key: 'farolLuzV', w: 440, h: 120 } },
      // SALTO NOCHE pieza 3: primer plano de tinta. speed: parallax (> 1, como el primer plano de día 1.3); cada: separación
      // en px de mundo (igual en 375 y 1280: relativa al ancho se encimaban en vertical); escala/escalaV: tamaño a 1280 y en vertical (tope: nunca arriba de groundY + libre px de mundo);
      // hunde: entre esas fracciones del ancho el recorte se hunde fuera de cuadro (queda abajo a la izquierda).
      // decoNoche: alfa de la decoración del suelo (gp-* a 1.0x) a noche plena (1c: se leía como manchas borrosas)
      decoNoche: 0.25,
      // SALTO NOCHE pieza 4: canto rasgado de papel en el borde de arriba de la cordillera y de las colinas lejanas (alfa a
      // noche plena; px de grueso). Va en el módulo diferido.
      // pxV: en vertical (375) la capa va escalada 1.8x y 3 px se leían como halo borroso de 6-8 px (ciego p4)
      canto: { on: true, ridge: 0.35, far: 0.45, px: 3, pxV: 2 },
      primerPlano: { on: false, speed: 1.4, cada: 340, escala: 1, escalaV: 1.1, libre: 24, hunde: [0.3, 0.62] },
      // band: banda clara del horizonte detrás de la cordillera en tiras planas de papel (ajuste 2 de arte, 30-oct: el
      // degradado glow 0.85 se leía como niebla). strips = [alto sobre el pie de la cordillera en px de mundo (× farS), alfa
      // a noche plena], de abajo (la más clara) hacia arriba. canto: filo claro arriba de cada tira; shadow: sombra de contacto
      // tenue sobre la tira de atrás. Medidas en evidencia/v2-banda.md.
      horizon: {
        on: true, color: 0xb7b3ad,
        // opción C (director, 30-oct): band.on false; las tiras se leían como líneas finas tipo regla sin cuerpo.
        band: { on: false, strips: [[235, 0.27], [275, 0.2], [315, 0.14]], canto: { px: 2, alpha: 0.12 }, shadow: { px: 3, alpha: 0.1 } },
      },
      // moonRim: borde de luna de papel en el lado izquierdo (la lámpara está arriba a la izquierda): silueta de Moki
      // (cuerpo y mochila) corrida px a la izquierda detrás del títere, y línea de px por fuera del canto izquierdo de la
      // viga. alpha sigue al fundido de la noche. shadow: la sombra de contacto de Moki sube de 0.28 a 0.28 + shadow de noche.
      // viga: false (veredicto de arte, 30-oct): la viga ya tiene su contorno de 3 px; el filo de luna extra se apaga.
      // opción C (director, 30-oct): on false (sin borde de luna en Moki y sombra 0.28 igual que de día, como la base).
      moonRim: { on: false, px: 1.5, alpha: 0.85, shadow: 0.1, viga: false },
      // ridgeSkirt: faldón de la cordillera (de su pie al suelo) en el color de la cordillera, solo de noche. Tapa el hueco
      // de lift (34 px) donde asomaba una franja de cielo con borde duro a y~557 a 1280. Separado de horizon.band.
      ridgeSkirt: { on: true },
    },
  },
  // Gauntlet R0: cordillera extra detrás de los cerros (silueta de la capa lejana, más grande y casi color cielo)
  // y sol de papel bajo detrás de las colinas (de noche se apaga y queda la lámpara).
  // ridge.mix: cuánto del tono de los cerros lejanos conserva (0 = color del cielo). sun.x: fracción del ancho;
  // sun.y: px sobre el suelo (en vertical se multiplica por portrait.farScale, como los cerros).
  ridge: { scale: 1.45, mix: 0.3, parallax: 0.15, lift: 34 },
  sun: { x: 0.68, y: 270, r: 44 },
};
