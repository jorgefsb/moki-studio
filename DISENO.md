# DISENO.md: Moki: Un salto más

Fuentes: PILOTO.md, BRIEF.md, ARTE.md, `src/config.js`, `src/scenes/RunScene.js` (commit c9d617f). Sin cambiar la mecánica núcleo (correr y saltar con altura variable).

## 0. Diagnóstico: por qué hoy es plano
1. **Todo se libra con "mantener siempre".** El salto máximo (118 px) libra caja y torre. La altura variable no se usa para nada.
2. **Obstáculos al azar** (`GetRandom` + `Between(420, 900)`): sin ritmo, sin patrones que se aprendan, y al reintentar cambian.
3. **Las piezas no premian nada.** La caja de recogida cubre todo el cuerpo de Moki (de `y-107` a `y+15`), así que las piezas a 30, 66 y 98 px se recogen corriendo.
4. **Un solo tipo de reto, un solo ritmo.** Velocidad de 320 a 560 con rampa lineal: no hay escalones, respiros ni sorpresas.
5. **Morir manda a 0, sin tarjeta** (`restart()` reinicia todo). El checkpoint hoy no sirve de nada.

## 1. Los tres loops
**Micro (1 a 3 s): leer, decidir la altura, aterrizar.** La decisión es cuánto mantener. Toque corto = 70 a 76 px. Mantener 140 ms = ~84 px. Mantener 220 ms o más = 118 px. Hay tres alturas útiles porque se agrega **una sola novedad**: la **viga colgante**, que castiga saltar de más. Así tocar, mantener y no saltar son tres respuestas distintas.

**Meso (un tramo de 30 s): aprender un patrón y cobrar.** Cada tramo tiene un tema, 10 a 12 patrones escritos a mano, un respiro con piezas, **un momento sorpresa** y termina en checkpoint ámbar. Al fallar se vuelve al inicio de ese tramo y los patrones son **los mismos**, en el mismo orden. Se aprende.

**Macro (1 a 3 min): llegar a la meta.** 4 tramos, 120 s sin fallar; con fallos, hasta unos 3 min. Al final: puntaje, mejor marca, sellos de cartón y la pantalla "Así lo hicimos". Razón para volver: ver el sello que falta, subir el puntaje y desbloquear la "Vuelta rápida".

## 2. Tramos
Los tiempos de los patrones son "llega a Moki a los X s" desde el inicio del tramo. El constructor coloca cada pieza en `x = xMoki + velocidad * (tLlegada - t)`.

| Tramo | Tiempo | Vel. px/s | Fase | Patrones | Novedad y sorpresa |
|---|---|---|---|---|---|
| 1 "Hola" | 0 a 30 s | 320 | Enseñar | Solo caja hasta 20 s (casi imposible perder). Primera torre a los 21 s. Separación de 2.2 a 3 s. | Etiqueta "Toca para saltar" a los 2 s. A los 12.5 s un arco alto sobre una caja: se libra tocando, pero mantener cobra 5 piezas (enseña sin castigar). Etiqueta "Mantén para saltar más alto" a los 20 s. **Sorpresa a los 26 s:** torre con arco regalo de 7 piezas. |
| 2 "Más alto" | 30 a 60 s | 350 | Practicar | Mezcla de caja, torre y **CC** (dos cajas pegadas, se libran con un solo salto largo). Separación de 1.5 a 2.5 s. | Pares con ritmo "salto-salto" (0.9 s). **Sorpresa a los 52 s:** una **pieza ámbar** (vale 5) en el vértice de un arco alto sobre una torre. |
| 3 "Cuidado arriba" | 60 a 90 s | 385 | Combinar | Entra la **viga**. Combos: caja bajo viga (VC), torre y luego viga (T·V), caja y luego viga (C·V). Separación de 1.3 a 2.2 s. | Etiqueta "La viga: salta bajito o no saltes" a los 62 s. **Sorpresa a los 81.5 s:** viga con arco bajo de piezas (se cobra tocando; mantener choca con la viga). |
| 4 "Última vuelta" | 90 a 120 s | 420 | Sorpresa y cierre | Mezcla de todo lo anterior con separación de 1.2 a 2 s. A partir del segundo 117 hay 3 s de calma y el arco de la meta. | **Sorpresa a los 98.5 s: "Ola"**, 6 cajas con ritmo fijo de 0.8 s y una pieza sobre cada una. Después un respiro de 3.5 s. Meta: arco de papel con bandera ámbar y Moki en pose bandera. |

### Guion por tramo (tiempo de llegada a Moki en s desde el inicio del tramo)
Claves: C caja, T torre, CC dos cajas pegadas (centros a 84 px), C·C dos cajas a 0.9 s, V viga sola, VC caja bajo viga, T·V torre y viga 1.0 s después, C·V caja y viga 0.9 s después, P5 fila de 5 piezas en el suelo, A↑ arco alto (5 piezas), A↓ arco bajo (4 piezas).

- **T1:** 2.5 C · 5.0 C · 7.5 C · 10.0 P5 · 12.5 C+A↑ · 15.5 C · 18.0 C · 21.0 T · 23.5 T · 26.0 T+A↑ de 7 (sorpresa) · 28.0 P5.
- **T2:** 2.0 C · 4.0 T · 6.0 C·C · 9.0 T · 11.0 CC+A↑ · 13.5 P5 · 15.5 T·C · 18.0 CC · 20.5 C · 22.0 T+A↑ con pieza ámbar (sorpresa) · 24.5 C·C · 27.0 T.
- **T3:** 2.0 V · 4.5 VC · 7.0 V+P5 bajo la viga · 9.5 T · 11.5 T·V · 14.5 C·V · 17.0 VC · 19.5 P5 · 21.5 V+A↓ (sorpresa) · 24.0 CC · 26.0 T·C.
- **T4:** 2.0 VC · 4.0 T·V · 6.5 CC · 8.5 Ola de 6 C cada 0.8 s (sorpresa) · 15.5 P5 · 17.5 T · 19.5 C·V · 22.0 CC · 24.0 T·C · 26.0 VC · 27.5 P5 hacia la meta.

Reglas del guion:
- Separación mínima entre elementos de un patrón: 0.75 s (excepto CC pegadas). Un salto corto dura ~0.5 s y necesita 0.25 s para leer.
- Tensión y respiro: nunca más de 4 patrones seguidos sin una P5 o 1.5 s extra de calma.
- Determinista: mismo tramo, mismo orden y mismos tiempos. Sin `Math.random` en el guion (solo en adornos, como el balanceo).
- Cambio de velocidad: se sube en el checkpoint con una rampa de 2 s, sin rampa lineal continua.

## 3. Obstáculos
| Pieza | Medidas | Se libra con | Cambio |
|---|---|---|---|
| Caja | 60 x 56 (igual) | Toque o mantener | Hitbox más indulgente: `hitboxShrink.x` 14 a 18 |
| Torre | 60 x **100** (hoy 84) | Mantener 140 ms o más (pico de 84 a 118 px) | Más alta para que el toque ya no la libre (hoy hay zona gris: 66 a 73 px contra 68 px) |
| CC | dos cajas, centros a 84 px | Un salto largo (mantener) | Patrón nuevo con sprites que ya existen |
| **Viga colgante** (nueva) | 76 x 32, borde inferior del hitbox a 180 px del suelo, con hilos hasta arriba | Correr debajo o salto de pico menor a 94 px (toque o soltar antes de 140 ms) | Una textura nueva; ARTE: cartón con franja naranja, colgada de hilos (títere) |

**Hueco en el suelo: no en esta ronda.** No suma una decisión nueva (sigue siendo "salta"), cuesta dibujar el suelo con corte y la caída, y duplicaría la novedad. Si sobra tiempo: anchos de 110 px (cualquier salto) y 170 px (mantener, solo a 385 px/s o más).

**Qué se quita para meter la viga:** el azar de `spawnObstacle`, `obstacleGapMin/Max` y `pickupChance`.

## 4. Recompensas
**Piezas en arcos.** Los arcos siguen la trayectoria del cuerpo de Moki (centro del cuerpo = salto + 46 px). Alturas de las piezas sobre el suelo:
- Fila en suelo (P5): 46. Se cobra corriendo.
- A↓ (se cobra tocando): 91, 113, 113, 91. Separadas 48 px.
- A↑ (solo se cobra mantenido): 104, 146, 164, 146, 104. Separadas 44 px. Centrada sobre el obstáculo.
- Arco regalo de 7 piezas: A↑ más dos laterales de 104.

**Nueva caja de recogida:** `|dx| < 30` y `|alturaPieza - (salto + 46)| < 34`. Sin esto, el arco no premia nada (ver diagnóstico 3).

**Racha de piezas:** cada pieza a menos de 0.9 s de la anterior suma a la racha. Valor de la pieza: x1 (1 a 2), x2 (3 a 5), x3 (6 o más). Se reinicia al pasar 0.9 s sin piezas o al chocar. Arco completo (todas las piezas de un arco): +5 piezas de bono. Pieza ámbar: vale 5. La etiqueta "x2" o "x3" solo se ve en juice Mucho o superior.

**Puntaje:** `metros + 10 * valorDePiezas`. La etiqueta de piezas del HUD muestra el conteo real; la pantalla final muestra "n de N" con N calculado por el guion, no inventado.

**Checkpoints como logro:** la bandera ámbar se despliega (280 ms), aparece "Aprendizaje guardado" (1.6 s) y se llena un banderín en la barra de progreso. Se guarda puntaje, piezas y velocidad del tramo. Con juice Mucho: confeti de papel.

## 5. Fallar sin frustrar
Choque, Moki en pose tres cuartos, caída de 6 a 10 px, sin rebote. En ≤400 ms aparece la **tarjeta** con una de las 3 lecciones aprobadas (rotan en orden) y el porcentaje avanzado ("Llegaste al 58%").

Debajo, una línea de pista según la causa (nota de apoyo, Inter 18): caja "La caja se libra con un toque."; torre "La torre pide mantener un poquito más."; viga "La viga pide un salto bajito."

**Reintento en menos de 2 s.** Un toque en cualquier parte, con 300 ms de bloqueo para que el toque con que se falló no lo salte. Moki reaparece en el inicio del tramo (saluda), con puntaje y piezas del checkpoint, y arranca a 85% de velocidad subiendo en 1 s. Los primeros 2 s son de calma. Sin pérdida de mejor marca, sin vidas, sin cuenta atrás.

## 6. Razones para otra partida (sin tienda ni cuentas, todo en localStorage)
- **Meta visible:** tira de papel arriba, bajo el HUD, con 4 banderines ámbar (checkpoints y meta), un marcador de Moki y una **marca de tinta "tu mejor"** (hasta dónde llegó en la mejor partida).
- **Mejor marca** de puntaje y de distancia, con Moki saludando al batirla.
- **Sellos de cartón** (se guardan; aparecen en "Así lo hicimos"): "Llegué" (terminar), "Sin caerme" (terminar sin chocar), "Coleccionista" (80% o más de las piezas), "Arco completo" (completar 3 arcos altos en una partida).
- **Desbloqueos honestos:** juice Hardcore con "Llegué"; **Vuelta rápida** con "Coleccionista". La Vuelta rápida es el mismo nivel con velocidades x1.12 (techo 470) y puntaje x1.25.

## 7. Momentos de deleite
Arco regalo de 7 piezas, la pieza ámbar, la Ola a ritmo fijo, la bandera que se despliega, la meta con Moki en pose bandera, el aterrizaje con polvo de papel, y la tarjeta que no regaña. Todo según nivel de juice (Nada, Poquito, Mucho, Hardcore) y movimiento reducido de ARTE §11 y §12.

## 8. Perillas propuestas para `src/config.js`
```js
jumpMinPx: 70,                     // antes 66
hitboxShrink: { x: 18, top: 16 },  // antes x: 14
obstacleSizes: [
  { key: 'caja', width: 60, height: 56 },
  { key: 'torre', width: 60, height: 100 },          // antes 84
  { key: 'viga', width: 76, height: 32, hangBottom: 180 }, // nuevo
],
cajaPegadaGapPx: 84,
pickupReach: { dx: 30, dy: 34, bodyCenter: 46 },    // nuevo; reemplaza la caja de recogida actual
// se eliminan: obstacleGapMin/Max, pickupChance, runSpeedRampPerSec
runSpeedStart: 320, runSpeedMax: 470,               // 470 solo en Vuelta rápida
tramos: [
  { speed: 320 }, { speed: 350 }, { speed: 385 }, { speed: 420 },
],
tramoEaseSec: 2, respawnEaseSec: 1, respawnSpeedMult: 0.85, respawnCalmSec: 2,
retryLockoutMs: 300,
minGapSec: 0.75, pairGapSec: 0.9, waveGapSec: 0.8,
combo: { windowMs: 900, steps: [[1, 1], [3, 2], [6, 3]] },
arcBonus: 5, amberValue: 5, scorePerPiece: 10, scorePerMeter: 1,
fastLap: { speedMult: 1.12, scoreMult: 1.25 },
spawnAheadPx: 80,   // ya existe como vw + 80
```
Se mantienen: `gravity` 2200, `jumpVelocity` 720, `jumpHoldMaxMs` 220, `jumpCutMultiplier` 0.45, `coyoteMs` 90, `jumpBufferMs` 110, `checkpointEverySec` 30, `levelLengthSec` 120, `squashMax` 0.03.

**Comprobación de números** (para que el probador y el constructor los puedan verificar):
- Alturas de salto: toque ≈ 70 a 76 px; soltar a 100 ms ≈ 73; a 150 ms ≈ 90; desde 220 ms = 118 px.
- Torre efectiva = 100 menos 16 de `hitboxShrink.top` = 84 px. Exige mantener ≥ 140 ms y deja 34 px de margen con el salto completo.
- Viga: se choca si el pico supera 94 px. El toque (70 a 76) pasa con 18 px de margen y el salto completo (118) choca.
- Visibilidad en celular (375 px, ancho visible 540): el obstáculo nace a 620 px y Moki está a 151 px, o sea 469 px de reacción. A 420 px/s son 1.1 s.
- No se combinan torre y viga en el mismo punto: la ventana sería de ~10 px.

## 9. Criterios PASS/FAIL (jugando)
| # | Criterio | PASS |
|---|---|---|
| 1 | Primeros 20 s | 3 de 3 partidas de un jugador nuevo sin chocar antes de los 20 s |
| 2 | Bot que solo toca | Muere en la primera torre (~21 s); nunca llega a los 40 s |
| 3 | Bot que siempre mantiene | Muere a los 70 s o antes (en T3, viga) |
| 4 | Bot que ajusta altura por obstáculo | Termina los 120 s |
| 5 | Altura variable útil | Un arco A↑ da 5 de 5 piezas con salto mantenido y 2 o menos con toque |
| 6 | Determinismo | Fallar y reintentar el mismo tramo muestra los mismos patrones en el mismo orden |
| 7 | Reintento | De choque a Moki corriendo de nuevo en ≤ 2 s con un toque (cronometrar 5 veces) |
| 8 | Checkpoint | Fallar en T2 vuelve a los 30 s con puntaje y piezas del checkpoint |
| 9 | Duración | Sin fallos: 120 s ± 3. Con 6 fallos o menos: ≤ 3 min |
| 10 | Dificultad | Probador nuevo termina en ≤ 8 fallos totales |
| 11 | Lectura en 375 px | Cada obstáculo se ve ≥ 1.0 s antes del impacto a 420 px/s |
| 12 | Marca | El ámbar solo aparece en checkpoint, meta y pieza ámbar; sin rojo, sin texto de violencia |
| 13 | Mejor marca | Persiste al recargar; el marcador "tu mejor" aparece en la barra |
| 14 | Honestidad | "n de N" piezas coincide con las que existen en el guion |
| 15 | Movimiento reducido | Jugable, sin parallax ni combo animado |

## 10. Qué NO hacer
- Varios niveles, tienda, cuentas, tabla global, monedas con dinero, anuncios.
- Contadores falsos: ni racha ni "n de N" inventados; ni "vas ganando" sin base.
- Doble salto, dash, agacharse, enemigos que persiguen: otra mecánica.
- Azar puro en el guion; más de una novedad por tramo; velocidad mayor a 470.
- Ámbar en peligros (ARTE §8); rojo; luz de neón.
- Regañar en la tarjeta o poner contadores de "intento número N".
- Hueco en el suelo en esta ronda.
- Cambiar piezas, poses o parche de Moki; espejarlo.

## 11. Cambios concretos para el constructor (en orden de prioridad)
**P0 (sin esto no hay diversión):**
1. Crear `src/tramos.js` con los 4 guiones de la sección 2 (lista de patrones con tiempo de llegada) y reemplazar `spawnObstacle`/`nextSpawnIn` por un lector de guion por tramo.
2. Checkpoints reales: al fallar, volver al inicio del tramo (no a 0) conservando puntaje y piezas. Hoy `restart()` borra todo.
3. Tarjeta de lección con las 3 frases aprobadas, bloqueo de toque de 300 ms y reintento con un toque.
4. Torre a 100 de alto, `jumpMinPx` 70, `hitboxShrink.x` 18.
5. Velocidad por tramo con rampa de 2 s al checkpoint (quitar `runSpeedRampPerSec`).
6. Cambiar la caja de recogida: `pickupReach` (ahora cobra todo el cuerpo) y generar piezas con alturas de arco (P5, A↓, A↑).
7. Meta al segundo 120: arco de papel, pantalla final con puntaje, mejor marca ("Así lo hicimos").

**P1 (el diseño completo):**
8. Viga: textura nueva (ARTE §8, naranja, hilos), hitbox con borde inferior a 180 px y choque cuando el pico sube de 94 px.
9. CC (dos cajas pegadas), C·C, T·V, C·V, VC y la Ola como patrones del guion.
10. Racha y puntaje; pieza ámbar; arco completo con bono.
11. Tira de progreso con 4 banderines y marca "tu mejor".
12. Etiquetas de enseñanza (3, solo la primera vez, guardadas en localStorage).

**P2 (si hay tiempo):**
13. Sellos y desbloqueos (Hardcore, Vuelta rápida).
14. Pista de causa en la tarjeta.
15. Hueco en el suelo (anchos de la sección 3).

**Pruebas que debe entregar el constructor:** un bot "toca siempre", otro "mantiene siempre" y otro "ajusta altura" que verifiquen los criterios 2, 3 y 4, y captura de cada tramo en 375 y 1280 px.

## 12. Decisiones para el líder
1. ¿Se aprueba la **viga colgante** como única novedad (textura nueva para el director de arte)? Sin ella, mantener sigue ganando siempre.
2. ¿Las líneas de pista de la tarjeta ("La torre pide mantener un poquito más.") necesitan aprobación de marca o basta con las 3 lecciones?
3. ¿La Vuelta rápida y los sellos entran en esta ronda o después del 4-nov? Propuesta: P2.
4. Condición de desbloqueo de Hardcore (ARTE lo deja abierto): propuesta, terminar una vez.
5. ¿Se aplica ayuda silenciosa tras 3 fallos seguidos en el mismo tramo (velocidad -10%)? No está en el guion; sería mentirle poco al jugador, así que solo con un aviso honesto en pantalla.

## Decisiones del líder (29-oct)
1. Se aprueba la viga colgante como única novedad. El constructor la hace procedural con materiales de ARTE.md (cartón colgado de hilo) y el director de arte la aprueba en el hito.
2. Las líneas de pista van como línea secundaria chica bajo la lección. La lección es siempre una de las 3 aprobadas. Las pistas, cortas y en español, las revisa UX.
3. Sellos y Vuelta rápida son P2: solo entran si P0 y P1 tienen PASS antes del 2-nov.
4. Hardcore se abre al terminar el nivel una vez.
5. Sin ayuda silenciosa. No hay ayuda tras fallos seguidos.
6. Checkpoint = inicio de tramo (cada 30 s), coherente con UX.md.

## Bot "demo" (Jorge, intervención 2): para el modo demo de UX.md
- Usa los tramos 1 y 2 reales. Si no salen solos los 5 momentos del guion (salto corto, salto largo, arco cobrado, viga, checkpoint), el demo usa un guion fijo de 30 a 40 s con esos momentos y el checkpoint cerca del segundo 30.
- El bot salta con timing perfecto y cobra los arcos: debe lucir lo divertido, no jugar al límite.

## Decisiones del líder tras revisar T3a (29-oct)
1. En T1 la caja de 7.5 s pasa a torre (lección 2 hacia los 8 s, como pide UX). La torre de 21 s se queda como práctica. El bot que solo toca debe morir hacia los 8 s; ese es el criterio nuevo.
2. T4: [22, CC] pasa a [22, P5] para que no haya 5 patrones seguidos.
3. Torre de 96 px: la efectiva baja a 80 y se libra manteniendo unos 120 ms. El margen del toque debe seguir en 15 px o más; se mide.
4. retryLockoutMs pasa a 550.
5. El bot del demo cobra 27 de 27 piezas y los 2 arcos completos.
6. Se quita pieceValueTotal de tramos.js.
7. El probador registra los ms de mantén en cada choque con torre. Si más del 15% cae entre 100 y 120 ms, la torre baja a 92.
