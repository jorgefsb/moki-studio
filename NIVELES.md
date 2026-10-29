# NIVELES.md: Moki: Un salto más (niveles por bloques)

Fuentes: BRIEF.md, DISENO.md §2-§8 y decisiones del líder, UX.md §4, ARTE.md §2, `src/tramos.js`, `src/config.js`, `src/jumpmodel.js`, `src/art/ambient.js`, `src/debug/bots.js`.
Alcance: ~1 h de código. Sin obstáculos ni arte nuevos: solo los códigos que ya entiende `expand()`.

## 0. Idea en corto
Cada partida arma sus 4 tramos de 30 s con **bloques escritos a mano** sorteados con semilla. Los inicios que enseñan (T1 0-12 s, T3 0-6 s) quedan fijos. Un validador puro (sin Phaser) revisa la física con `jumpmodel.js`; si un tramo no pasa, se vuelve a sortear de forma determinista y, como último recurso, se usa el tramo clásico de hoy.

## 1. Física de referencia (calculada con `jumpmodel.js`, no a mano en el código)
| Plan | Pico | Aire | Libra | Contra viga |
|---|---|---|---|---|
| tap (16 ms) | 62 px | ≈0.47 s | caja (exige 34) | pasa (choca sobre 104) |
| hold | 117.8 px | ≈0.655 s | caja y torre (exige 78) | **choca** |
| none | 0 | - | - | pasa por debajo |

El validador lee estos números de `planJump()` y `CONFIG`; la tabla sirve para diseñar.

## 2. Formato de bloque
```js
{ id, dur, ev: [[t, código], ...], dif, min, max, tags }
```
- `t` relativo al inicio del bloque. El primer evento siempre va en `t = 0`.
- `dur` incluye la **cola**: `dur - último t ≥ 1.2 s` (para CC y OLA se cuenta desde la última caja). Así el hueco entre bloques ya viene incluido y los bloques se pegan sin cálculo extra.
- `dif` 1-4. `min`/`max`: tramo (1-4) en el que puede salir.
- Tags: `descanso`, `premio`, `caja`, `torre`, `salto-largo`, `ritmo`, `viga`, `ensena-mantener`, `ensena-viga`, `sorpresa`, `alterna`.
- Contador de patrones: cada evento cuyo código **no** contiene `P5` suma 1; cualquier evento con `P5` (`P5`, `V+P5`) lo regresa a 0.

## 3. Biblioteca (24 bloques + 2 especiales), lista para copiar a `src/bloques.js`
```js
// t relativo al bloque; dur incluye la cola (>= 1.2 s); min/max = tramo 1-4
export const BLOQUES = [
  // descanso y premio (siempre permitidos, sin importar la dificultad del tramo)
  { id: 'respiro',      dur: 3,   ev: [[0, 'P5']],                              dif: 1, min: 1, max: 4, tags: ['descanso'] },
  { id: 'arco-corto',   dur: 4,   ev: [[0, 'C+A3'], [2, 'P5']],                 dif: 1, min: 1, max: 4, tags: ['descanso', 'premio'] },
  { id: 'arco-alto',    dur: 4.5, ev: [[0, 'C+Aup'], [2.5, 'P5']],              dif: 1, min: 1, max: 4, tags: ['descanso', 'premio', 'ensena-mantener'] },
  { id: 'viga-piezas',  dur: 4,   ev: [[0, 'V+P5'], [2.5, 'C']],                dif: 1, min: 3, max: 4, tags: ['descanso', 'viga'] },
  // caja
  { id: 'cajas-2',      dur: 4,   ev: [[0, 'C'], [2.5, 'C']],                   dif: 1, min: 1, max: 2, tags: ['caja'] },
  { id: 'cajas-3',      dur: 5.5, ev: [[0, 'C'], [2, 'C'], [4, 'C']],           dif: 2, min: 1, max: 3, tags: ['caja', 'ritmo'] },
  { id: 'par-cajas',    dur: 4,   ev: [[0, 'C.C'], [2.5, 'C']],                 dif: 2, min: 2, max: 4, tags: ['caja', 'ritmo'] },
  // torre
  { id: 'torre-caja',   dur: 4,   ev: [[0, 'T'], [2.5, 'C']],                   dif: 1, min: 1, max: 3, tags: ['torre', 'ensena-mantener'] },
  { id: 'alterna',      dur: 5.5, ev: [[0, 'C'], [2, 'T'], [4, 'C']],           dif: 2, min: 1, max: 3, tags: ['alterna'] },
  { id: 'torre-arco',   dur: 4,   ev: [[0, 'T+Aup'], [2.5, 'C']],               dif: 2, min: 1, max: 4, tags: ['torre', 'premio'] },
  // salto largo
  { id: 'largo',        dur: 4,   ev: [[0, 'CC'], [2.5, 'C']],                  dif: 2, min: 2, max: 4, tags: ['salto-largo'] },
  { id: 'largo-arco',   dur: 4.5, ev: [[0, 'CC+Aup'], [2.5, 'P5']],             dif: 2, min: 2, max: 4, tags: ['salto-largo', 'premio'] },
  // ritmo
  { id: 'tc-torre',     dur: 4,   ev: [[0, 'T.C'], [2.5, 'T']],                 dif: 3, min: 2, max: 4, tags: ['ritmo', 'torre'] },
  { id: 'ritmo-mixto',  dur: 5.5, ev: [[0, 'C.C'], [2, 'T'], [4, 'CC']],        dif: 3, min: 2, max: 4, tags: ['ritmo'] },
  // viga
  { id: 'viga-intro',   dur: 4,   ev: [[0, 'V'], [2.5, 'VC']],                  dif: 2, min: 3, max: 4, tags: ['viga', 'ensena-viga'] },
  { id: 'caja-viga',    dur: 4.5, ev: [[0, 'C.V'], [2.5, 'VC']],                dif: 3, min: 3, max: 4, tags: ['viga', 'ritmo'] },
  { id: 'torre-viga',   dur: 4,   ev: [[0, 'T.V'], [2.5, 'C']],                 dif: 3, min: 3, max: 4, tags: ['viga', 'torre'] },
  { id: 'viga-dura',    dur: 5.5, ev: [[0, 'T.V'], [2, 'C.V'], [4, 'VC']],      dif: 4, min: 3, max: 4, tags: ['viga', 'ritmo'] },
  { id: 'cc-viga',      dur: 6,   ev: [[0, 'CC'], [2.2, 'V'], [3.8, 'T.C']],    dif: 4, min: 3, max: 4, tags: ['viga', 'salto-largo'] },
  // sorpresas (1 por tramo; se colocan aparte, ver §4)
  { id: 'regalo7',      dur: 4,   ev: [[0, 'T+Aup7'], [2, 'P5']],               dif: 1, min: 1, max: 1, tags: ['sorpresa', 'premio'] },
  { id: 'ambar',        dur: 4.5, ev: [[0, 'T+AupAmb'], [2.5, 'C.C']],          dif: 2, min: 2, max: 3, tags: ['sorpresa', 'premio'] },
  { id: 'regalo-ambar', dur: 4,   ev: [[0, 'T+Aup7Amb'], [2, 'P5']],            dif: 2, min: 2, max: 4, tags: ['sorpresa', 'premio'] },
  { id: 'viga-arco',    dur: 3.5, ev: [[0, 'V+Adn'], [2, 'P5']],                dif: 2, min: 3, max: 4, tags: ['sorpresa', 'viga', 'premio'] },
  { id: 'ola',          dur: 6.5, ev: [[0, 'OLA']],                             dif: 4, min: 4, max: 4, tags: ['sorpresa', 'ritmo'] },
];

// Especiales (no se sortean)
export const T1_INTRO = [[2.5, 'C+A3'], [5, 'C'], [7.5, 'T+A3up'], [10, 'P5']]; // T1 0-12 s, absoluto: el tutorial depende de esto
export const RELLENO = (dur) => ({ id: 'relleno', dur, ev: [[0, 'P5']], dif: 1, tags: ['descanso'] }); // 1.5 a 4.5 s

export const SORPRESAS = { 1: [['regalo7', 1]], 2: [['ambar', 2], ['regalo-ambar', 1]], 3: [['viga-arco', 2], ['regalo-ambar', 1]], 4: [['ola', 3], ['viga-arco', 1]] };
```
Revisé a mano los huecos internos contra §5 (V1-V3): todos pasan. El validador lo confirma en cada build.

## 4. Gramática de unión y relleno de 30 s exactos
### Esqueleto de cada tramo
| Tramo | 0 a 2 s | Fijo | Sorpresa empieza en (s, múltiplo de 0.5) | Resto |
|---|---|---|---|---|
| 1 | calma | `T1_INTRO` hasta 12.0 | 19 a 24 (`regalo7`) | relleno por sorteo |
| 2 | calma | nada | 10 a 22 | sorteo |
| 3 | calma | `viga-intro` en 2.0 (hasta 6.0) | 12 a 22 | sorteo |
| 4 | calma | nada | 6 a 18 | sorteo |

Algoritmo por tramo: (1) sortear qué sorpresa sale (pesos de `SORPRESAS`) y en qué segundo `S`; (2) llenar `[inicio, S)` con `fill()`, que siempre cierra con `RELLENO` (así la sorpresa llega tras un respiro); (3) poner la sorpresa en `S`; (4) llenar `[S + dur, 30)` con `fill()` (el `RELLENO` final da la calma antes del checkpoint y la meta).

`fill(desde, hasta, ctx)`:
1. `rem = hasta - pos`. Si `rem ≤ 4.5`: poner `RELLENO(rem)` y terminar (queda entre 1.5 y 4.5 s).
2. Candidatos = bloques que cumplen G1 a G6 y `dur ≤ rem - 1.5`. Sacar uno con pesos (§6). Si no hay candidatos, poner `respiro` (dur 3; siempre cabe porque `rem > 4.5`).
3. Revisar la unión con V1-V3 (§5) contra el bloque anterior. Si falla, se quita de los candidatos y se vuelve a sacar **con el mismo rng** (determinista).

### Reglas
| # | Regla |
|---|---|
| G1 | `min ≤ tramo ≤ max`. Nada de viga antes de T3, nada de CC/C.C/T.C antes de T2, la OLA solo en T4. |
| G2 | Nunca dos bloques seguidos con `dif ≥ 3`. Después de un bloque `dif 4` (incluida la ola), el siguiente debe ser `descanso`. |
| G3 | Nunca más de 4 patrones seguidos sin `P5` (contador de §2, se arrastra entre bloques). |
| G4 | Nunca el mismo id dos veces seguidas. Máximo 2 veces por tramo (`respiro` sin límite). |
| G5 | Exactamente 1 `sorpresa` por tramo, colocada por el esqueleto; el sorteo normal nunca saca sorpresas. Máximo una pieza ámbar por tramo (sale de la sorpresa). |
| G6 | `dif` fuera de la ventana del tramo (§6) solo si el bloque es `descanso`. |
| G7 | Primer obstáculo ≥ 2.0 s y último obstáculo ≤ 28.0 s del tramo (`P5` hasta 28.5). |

## 5. Validador (función pura `validarTramo(entities, speed)` en `src/niveles.js`)
Corre sobre las entidades ya expandidas por `expand()` (así usa los mismos `plan` que el bot, incluido el cambio a `hold` cuando hay arco `Aup`). Las **3 alturas**: cada obstáculo se libra con su plan (`tap`, `hold` o `none` para la viga).

| # | Comprobación | Cómo |
|---|---|---|
| V1 | Sin saltos encimados | Ordena los obstáculos con plan `tap`/`hold` (el CC cuenta una vez, centrado en el par como en `bots.js`). Despegue = llegada − `airTravel/2`, aterrizaje = llegada + `airTravel/2`. Exige `despegue(i+1) − aterrizaje(i) ≥ 0.12 s × speed` (más que `jumpBufferMs`). |
| V2 | Cada salto libra su obstáculo | Con `riseAt(plan, speed, x)`: sobre la caja ≥ `cajaExige + 4`; sobre la torre ≥ `torreExige + 2` (mismas fórmulas que `jumpTable()`). |
| V3 | La viga no castiga al plan correcto | Para cada viga, en la ventana donde los hitbox de Moki y la viga se cruzan (medio ancho desde `CONFIG`, ≈47 px), la subida de cualquier salto en el aire debe ser ≤ `vigaChocaSobre − 4`. Atrapa un `hold` (arco `Aup`) junto a una viga. |
| V4 | Legibilidad | Entre llegadas de obstáculos distintos ≥ `minGapSec` (0.75 s), excepto dentro de VC (mismo punto) y CC (`skip`). Hold → hold ≥ 1.0 s. |
| V5 | Gramática | G2, G3, G5 y G7 vueltas a revisar sobre el tramo terminado. |
| V6 | Tutorial | T1: la primera caja es la de 2.5 s y la primera torre la de 7.5 s (o sea, `T1_INTRO` intacto). |
| V7 | Duración | Suma de `dur` = 30 − 2 (T1: 30 − 12) con tolerancia 1e-6. |

Velocidad de prueba: la del tramo (320/350/385/420). Es el peor caso: la rampa del checkpoint y el reaparecer al 85% solo separan más los saltos. Si después entra la Vuelta rápida, se valida a `speed × 1.12`.

**Si falla:** se re-sortea **el tramo** con `intento + 1` (semilla `hash(seed:tramo:intento)`), hasta 8 intentos; si los 8 fallan, ese tramo usa el guion clásico de hoy (`SCRIPTS[i]`, que ya pasa) y en `?debug` sale `console.warn('niveles: fallback', seed, tramo)`. Cada tramo tiene su propia semilla: re-sortear uno no mueve los demás.

## 6. Curva por tramo
| Tramo | Vel. (fija) | Ventana `dif` | Pesos por dif | Extra |
|---|---|---|---|---|
| 1 "Hola" | 320 | 1-2 | 1: ×3, 2: ×1 | intro fijo |
| 2 "Más alto" | 350 | 1-3 | 1: ×1, 2: ×3, 3: ×1 | sin viga |
| 3 "Cuidado arriba" | 385 | 2-4 | 2: ×2, 3: ×3, 4: ×1 | tag `viga` ×2; `viga-intro` fijo al inicio |
| 4 "Última vuelta" | 420 | 2-4 | 2: ×1, 3: ×3, 4: ×2 | ola ×3 en sorpresa |

Peso final = peso por dif × extras × 0.5 si ya salió en este tramo. La subida va por escalones (velocidad + ventana), con ±1 de variación dentro del tramo. Los `descanso` siempre se pueden sacar, con peso 1.

## 7. Semilla
| Modo | Semilla | Cuándo cambia |
|---|---|---|
| Reto del día (por defecto) | `hashStr('AAAA-MM-DD')` con la **fecha local** que hay al iniciar la partida | al día siguiente. "Otra vez" repite el mismo nivel |
| Libre | `crypto.getRandomValues(new Uint32Array(1))[0]` | cada "Nivel nuevo" |
| Debug | `?seed=123` o `?seed=2026-10-29`; `?nivel=clasico` usa los 4 tramos de hoy | - |

- PRNG: `rng(seed)` de `src/art/palette.js` (ya es mulberry32). Por tramo: `rng(hashStr(`${seed}:${tramo}:${intento}`))`, con `hashStr` = FNV-1a de 32 bits.
- El nivel se arma **una vez** en `startGame()` y queda en `this.level`. El reintento (`resetRun(this.level, cp.dist)`) ya usa el mismo nivel: mismo tramo, mismos obstáculos. Cruzar la medianoche a media partida no cambia nada.
- Cero `Math.random` en el generador. El fondo vivo conserva su semilla propia (`CONFIG.ambient.seed`): no se toca.

## 8. Biomas de papel (solo tinte del cielo y del plano lejano)
El ciclo de hora por tramo (`DAY` en `ambient.js`: mañana, mediodía, tarde, noche) se queda tal cual. El bioma es una **mezcla extra** sobre `sky` y `farVeil`. **No se tocan** la capa media, el suelo, los obstáculos, las piezas ni Moki: el contraste medido (≥ 2.0) vive en la capa media y no cambia.

| id | Nombre ES / EN | Mezcla con (paleta de ARTE §2) | k cielo | k lejano |
|---|---|---|---|---|
| kraft | Papel kraft / Kraft paper | #B99168 | 0.10 | 0.06 |
| cuaderno | Cuaderno / Notebook | #B7B3AD | 0.08 | 0.06 |
| periodico | Periódico / Newspaper | #8A7E70 | 0.10 | 0.08 |
| cartulina | Cartulina / Card stock | #F4E8D5 | 0.30 | 0 |

- Orden: un barajeo de los 4 con el rng de la semilla (`rng(hashStr(seed + ':bioma'))`), uno por tramo, sin repetir. En la noche (T4) `k × 0.5` para no lavarla.
- Nunca se mezcla con #FF6B35 (acción/peligro) ni con #FFA500 (solo checkpoint).
- Transición: el mismo crossfade de 6 s del checkpoint (150 ms con movimiento reducido), interpolando `k` y el color.
- Nombre: segunda línea chica (Inter) en la etiqueta del checkpoint, "Sigue: Cuaderno", 1.6 s. Claves i18n `bioma.<id>`. Al inicio de T1 no se muestra (el tutorial manda).

## 9. Qué NO se toca
Demo (`buildDemo` y sus variantes), tutorial (UX §4, `tutorialTick`), checkpoints cada 30 s, velocidades 320/350/385/420, física, `OBS`, `ARCS`, `expand()`, tabla `DAY`, capa media, suelo, texturas, fondo vivo y su semilla. Moki nunca se espeja.

## 10. Cambios para el constructor (en orden; P0 cabe en ~1 h)
| P | Archivo | Cambio |
|---|---|---|
| P0 | `src/bloques.js` (nuevo) | Copiar §3 tal cual. |
| P0 | `src/niveles.js` (nuevo) | `hashStr`, `semillaReto()`, `semillaLibre()`, `generarTramo(seed, i)` (esqueleto §4 + `fill`), `validarTramo()` (§5), `generarNivel(seed)` → `buildLevel([...])` con `{ speed, len: 30, script }` por tramo. Devuelve también `seed`, `modo` y `biomas`. |
| P0 | `src/tramos.js` | Exportar `SCRIPTS` (fallback y `?nivel=clasico`). `GAME_LEVEL` se queda para bots viejos y para `contrast.js`. |
| P0 | `src/scenes/RunScene.js` | `startGame(modo)` usa `generarNivel(seed)` en lugar de `GAME_LEVEL`. `playAgain()` conserva la semilla en Reto. `?seed` y `?nivel=clasico`. |
| P0 | `src/debug/bots.js` | `runBot(s, kind, maxSec, seed)`. Prueba: `adjust` termina los 120 s en 30 fechas (2026-10-29 a 2026-11-27) y en 30 semillas libres. `tap` muere hacia los 8 s y `hold` en T3, en todas. |
| P1 | `src/ui/ui.js` + i18n | En la pantalla final, botón secundario "Nivel nuevo" / "New level" (Libre) junto a "Otra vez", y una línea "Reto del 29-oct" o "Libre". |
| P1 | `src/art/ambient.js` | `setBiomas(lista)` y la mezcla de §8 dentro de `applyDay`. Etiqueta del checkpoint con "Sigue: …". |
| P1 | `src/debug/contrast.js` | Medir `torre` y `viga` en 4 biomas × 4 horas: mínimo ≥ 2.0. Si alguno baja, `k` a la mitad para ese bioma. |
| P2 | `src/niveles.js` | `?debug=niveles`: validar 365 fechas + 500 semillas; reporta % de fallback (debe ser 0%) y el histograma de bloques. |
| P2 | localStorage | `moki.reto` = `{ fecha, mejor }` (mejor del día). `moki.best` sigue igual. |

## 11. Criterio de revisión (lo que reviso cuando lo entregues)
`NIVELES: APROBADO` si: (1) mismo `?seed` = mismo nivel (comparar `entities` serializadas) y el reintento no cambia el tramo; (2) los 3 bots dan lo de P0 en las 60 semillas; (3) fallback 0% en 365 fechas; (4) el tutorial corre igual en el Reto de hoy (capturas de la lección 1 y 2); (5) contraste ≥ 2.0 en los 4 biomas; (6) capturas en 375 y 1280 de 2 semillas distintas en T3 y T4, jugadas a mano. Si algo falla: `NIVELES: AJUSTAR` con la regla que lo rompe.

## Resumen de decisiones
1. 24 bloques a mano con los códigos actuales; los tramos se arman con esqueleto fijo (calma 2 s, sorpresa con ventana, `RELLENO` flexible de P5) que da 30 s exactos.
2. T1 0-12 s fijo (`T1_INTRO`) para que el tutorial y el bot `tap` (muere a ~8 s) sigan igual; T3 siempre abre con `viga-intro` para que `hold` muera en la primera viga.
3. Curva por escalones: velocidad fija por tramo más ventana de dificultad con ±1; nunca dos duros seguidos, después de un 4 viene un descanso, máximo 4 patrones sin P5.
4. Reto del día = FNV-1a de la fecha local con mulberry32 (`rng` que ya existe); Libre = semilla aleatoria por partida; semilla por tramo e intento, todo determinista.
5. Validador puro con `jumpmodel` (sin saltos encimados, cada salto libra lo suyo, la viga no castiga, legibilidad, tutorial), 8 re-sorteos por tramo y luego el tramo clásico; los biomas solo tiñen el cielo y el plano lejano con la paleta de marca.
