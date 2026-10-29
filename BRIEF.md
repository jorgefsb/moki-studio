# BRIEF · Moki: Un salto más

Contrato: PILOTO.md. Arte: ARTE.md. Fecha límite: 2026-11-04.

## 1. Pregunta del prototipo
¿Un solo botón con salto variable, en un diorama de papel, se siente tan bien que dan ganas de "un salto más" tras fallar?

## 2. Mecánica núcleo
Moki corre solo. Única acción: saltar. Tocar = salto corto; mantener = salto más alto (hasta un tope). Esquiva obstáculos de cartón y recoge piezas de cartón.

## 3. Controles
| Entrada | Acción |
|---|---|
| Barra espaciadora / ↑ / W | Saltar (mantener = más alto) |
| Toque en pantalla | Saltar (mantener = más alto) |
| Clic del mouse | Saltar (mantener = más alto) |
| Esc / P | Pausa |

## 4. Loop (1 a 3 minutos)
- **Inicio:** pantalla título, un toque arranca. El sonido se activa con ese primer gesto.
- **Reto:** la velocidad sube poco a poco; obstáculos y piezas en patrones; checkpoint ámbar cada ~30 s.
- **Fallo:** choque → tarjeta con una lección aprobada del brandkit (rota entre las 3 de PILOTO.md).
- **Reintento:** un toque y Moki sale desde el último checkpoint, con puntaje del checkpoint.
- **Final:** al llegar a la meta (~2 min a buen ritmo) → puntaje, mejor marca (localStorage) y pantalla "Así lo hicimos".

## 5. Perillas (todas en `src/config.js`)
| Perilla | Inicial |
|---|---|
| `gravity` | 2200 px/s² |
| `jumpVelocity` | 720 px/s |
| `jumpHoldMaxMs` | 220 ms |
| `jumpCutMultiplier` | 0.45 (al soltar antes) |
| `coyoteMs` | 90 ms |
| `jumpBufferMs` | 110 ms |
| `runSpeedStart` | 320 px/s |
| `runSpeedMax` | 560 px/s |
| `runSpeedRampPerSec` | 2 px/s² |
| `obstacleGapMin` / `obstacleGapMax` | 420 / 900 px |
| `pickupChance` | 0.6 por hueco |
| `checkpointEverySec` | 30 s |
| `levelLengthSec` | 120 s |
| `squashMax` | 0.03 |

## 6. Criterios de aceptación (PASS/FAIL jugando)
1. Tocar vs. mantener da dos alturas de salto claramente distintas.
2. Se juega de inicio a final en 375 px y 1280 px, sin errores en consola.
3. Al fallar sale la tarjeta de lección y se vuelve al último checkpoint en ≤1 toque.
4. Una partida completa dura entre 1 y 3 minutos.
5. Mejor marca persiste al recargar la página.
6. Moki nunca espejado, parche en oreja derecha, visor sin cara, squash ≤3% (revisión con captura).
7. Con movimiento reducido activado no hay parallax ni sacudidas; el juego sigue jugable.
8. "Así lo hicimos" muestra roles, intervenciones de Jorge y liga a jorgesuarez.com.mx.

## 7. Fuera de alcance
Varios niveles, tienda, cuentas, tabla global de puntajes, analítica, música compuesta, más personajes, publicación.
