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

## Flow y mecánicas (plan 1-nov)
Invitado de niveles, para DECISIONES 1-nov 20:15. Diagnóstico en corto: cada obstáculo tiene **una sola respuesta** (caja = tocar, torre = mantener, viga = no saltar) y la dificultad sube **entre** páginas, pero es plana **dentro** de cada una (`fill()` sortea con los mismos pesos de 2 s a 30 s). Por eso se siente predecible. Lo que viene es papel, nada medido.

### 1. Métrica de flow (función pura `medirFlow(level)` en `src/debug/flow.js`, la usan `bots.js` y `?debug=flow`)
**Decisión** = obstáculo o arco de piezas donde algún plan de `{none, tap, hold}` (y `tramp` cuando exista) cambia el resultado. Cuentan C, T, V, U, VC (1 vez), CC (1 vez), cada caja de OLA y los arcos `A3/Aup`. Las filas `P5` en el suelo no cuentan. Tiempo = llegada a la x de Moki.
**Patrón** = el código sin piezas (`C+A3` → `C`, `T.V`, `CC`, `U`…).
| # | Métrica | Cómo se calcula |
|---|---|---|
| F1 | Patrones distintos por minuto | Ventanas de 60 s (0-60, 60-120): cuántos patrones distintos hay en cada una. Se reporta el promedio. Aparte: F1b = tipos base distintos (caja, torre, viga, pop-up, salto largo, trampolín…). |
| F2 | Segundos sin decisión | F2a = hueco más largo entre dos decisiones seguidas, sin contar los 2 s después de cada checkpoint. F2b = % de la partida dentro de huecos de más de 2.5 s. |
| F3 | Tramo idéntico más largo | Cada decisión es una ficha `patrón@hueco` (hueco con la anterior, redondeado a 0.25 s). Busca la secuencia de fichas más larga que sale 2 veces o más sin encimarse, en toda la partida. Reporta sus segundos. F3b = cuántas veces se repite una secuencia de 2 fichas o más **pegada** a sí misma (debe ser 0). |
| F4 | Formas de pasar | Para cada decisión, prueba los planes con `jumpmodel` a ±40 ms. Elección real = 2 planes o más sobreviven **y** dan distinto resultado (piezas cobradas o combo). F4 = % de decisiones con elección real. F4b = promedio de planes que sobreviven (dato, no meta). |
| F5 | Forma de la curva | Decisiones por cada 5 s dentro de cada página. Pasa si pico ≥ 1.6 × calma y respiro ≤ subida. |
| F6 | Tiempo sin novedad | Segundos más largos sin un patrón que no había salido antes en esa partida. |
Se reporta en Clásico, Reto y Libre (30 fechas y 30 semillas). La línea base es master; esa la mide el bot, no yo.

### 2. Vara contra Alto's (estimada de DESARMADO.md §2.2, §3.9 y §3.11; nadie la midió)
Alto's cambia de terreno sin parar, casi todo se puede pasar de 2 maneras (grind o saltar, voltereta o no) y cada bioma trae un elemento propio.
| Métrica | Alto's (estimado) | Meta Moki | Hoy (mi estimado, lo confirma el bot) |
|---|---|---|---|
| F1 patrones/min | 6-8 | **≥ 7** | ~5 |
| F2a hueco máximo | ~3-4 s | **≤ 4.5 s** (F2b ≤ 12%) | hasta 4.5 s en cada relleno |
| F3 tramo repetido | ≤ 3 s | **≤ 4 s**, F3b = 0 | sin medir |
| F4 elección real | 50-70% | **≥ 20%** desde el nivel 3 del Cuaderno | < 10% |
| F6 sin novedad | ~60 s (bioma) | **≤ 30 s** (una novedad por página) | sin medir |

### 3. Curva de flow por página (30 s)
| Fase | Segundos | Dificultad | Qué va |
|---|---|---|---|
| Calma | 0-4 | 1 | descanso o premio, 1 o 2 decisiones; llega el checkpoint |
| Subida | 4-14 | de `lo` a `lo+1` | el patrón de la página (viga en T3, mecánica nueva cuando la haya) en su forma fácil |
| Pico | 14-24 | de `hi-1` a `hi` | ritmo y combinados; aquí va la sorpresa (ventana 14-20); un solo `dif 4` |
| Respiro | 24-30 | 1 | arcos de premio, nada que mate después del segundo 28 |
T1 conserva `T1_INTRO` (0-12 s = calma y subida). T3 conserva `viga-intro` como inicio de la subida.
**No repetir:** (a) nunca dos bloques seguidos con el mismo tema (tema = primer tag que no sea `premio`); (b) el pico de una página no repite la **firma** (lista de temas del pico) del pico anterior; (c) un id no sale en la misma fase de dos páginas seguidas.
**Dónde entra:** `src/niveles/generar.js`. `SORPRESA_EN` y `VENTANA` se cambian por `FASES[tramo] = [{ fase, desde, hasta, lo, hi }]`; `generarTramo` llama a `fill()` una vez por fase con su ventana; `ctx` guarda `prevTema` (regla a) y `generarNivel` pasa `firmaPrev` y los ids por fase de la página anterior (b y c). `validar.js` suma V8 = F5 y F3b; si falla, re-sortea dentro de los 8 intentos. Siguen intactos: tope de 20% de filas, G2, G3, el Clásico (78/78) y la justicia (bot ±40 pasa, pasivo falla). El Reto usa esta curva igual para todos.

### 4. Mecánicas que se destraban (orden por impacto entre costo)
| # | Mecánica | Qué cambia al jugar | Costo | Arte nuevo | Nivel |
|---|---|---|---|---|---|
| 1 | **Trampolín de cartón** (`J`) | Pisarlo te lanza alto sobre un nudo de obstáculos, con un arco de piezas. Si lo saltas con un toque, pasas el nudo a mano y sumas combo. Decides: piezas seguras arriba o combo abajo. | M | 1 sprite chico + sonido "boing" | 3 |
| 2 | Viento (ráfaga de papel) | Una zona marcada alarga o acorta el salto; la misma caja pide tocar antes o después. Más variedad (F1, F6), pero no más formas de pasar. | S-M | partículas del pool actual | 5 |
| 3 | Repisas de cartón (camino arriba y abajo) | Una repisa donde Moki sí cae: se sube con el trampolín o con un salto mantenido. Arriba, piezas y huecos; abajo, cajas. Dos caminos de verdad. | M-L (pisar superficies, el bot elige ruta) | repisa | 7 |
| 4 | Timbre que se activa | Un timbre en el aire: si lo tocas con un salto mantenido, se cae la torre que sigue. Si no, la pasas a mano. | M | timbre + torre que cae | 9 |
| 5 | Repisa de papel que se dobla | Se dobla 0.6 s después de pisarla: hay que saltar a tiempo. | L (necesita la #3) | doblez | 10 |
| - | Rampa y deslizar | Deslizar pide un gesto nuevo, y aquí todo se juega con un dedo (como en Alto's, §3.1). La rampa sola es un trampolín sin elección. **Descartada.** Puede volver como dibujo distinto del trampolín. | - | - | - |
**#1 = trampolín, recortado.** Mantengo la apuesta del director, pero el corte 1 **no lleva plataformas**: el "camino de arriba" es el vuelo del lanzamiento, no un piso. Por qué: (1) es lo único barato que sube F4 de casi 0 a ~20% (un nudo de 2 o 3 decisiones se vuelve elección); (2) da la misma pregunta que Alto's, "¿piezas seguras o alargo el combo?" (§2.2), y usa la cinta de combo que ya existe; (3) no pide gesto nuevo ni chocar contra superficies: para `jumpmodel` es un plan más (`tramp`, con su velocidad de subida fija); (4) las repisas (#3) se apoyan en el trampolín después. Moki no se espeja: solo se estira y se aplasta al despegar.
Reglas del trampolín: nunca antes del segundo 12 de T1, ni en Clásico. Bajo el vuelo no puede haber vigas (V3). Al caer, 0.75 s libres como mínimo. Arriba no se suma combo, pero tampoco se rompe. 5 bloques: `tramp-intro` (sin nudo, enseña), `tramp-nudo` (`C.C` abajo), `tramp-torre` (`T.C`), `tramp-viga` (viga después de caer: castiga el salto mantenido por reflejo), `tramp-doble`.
**Reto del día:** sigue igual para todos, así que no usa mecánicas destrabadas (dependen del nivel de cada quien). Las mecánicas salen en Libre. `generarNivel(seed, modo, { mecanicas })` filtra los bloques por su campo `mec`. Pregunta para el director: ¿el Reto suma el trampolín para todos cuando cumpla una semana? Recomiendo que sí. **Hecho (5-nov, rama v2/reto):** cada mecánica lleva `reto: 'AAAA-MM-DD'` en `config.js` y el Reto de esa fecha en adelante la trae para todos, sin importar el nivel; la fecha sale de la semilla. `null` la saca. Trampolín y viento: 9-nov.

#### #2 Viento, especificación (2-nov)
Invitado de niveles. Los números con "≈" los calculé a mano con las perillas de `config.js` y no los corrí. El constructor los confirma con la prueba de calibración del punto 4 antes de tocar el juego.

**1. Física: el viento estira o encoge el salto en horizontal, y nada más.**
- Si Moki **despega** dentro de una zona, todo ese salto (hasta que aterriza) avanza a `speed × k`. En el juego es el paso del mundo (`RunScene`, línea ~984: `step = speed × dt × vientoK`). En el suelo, `k = 1` siempre. El `k` se fija al despegar y vuelve a 1 al aterrizar, al morir o al reaparecer.
- A favor, `k = 1.3`. En contra, `k = 0.8`. Van en `config.js`: `viento: { favor: 1.3, contra: 0.8, antesSec: 0.7, despuesSec: 0.15, salidaSec: 0.75, nivel: 5 }`.
- **Por qué esta variante y no otra.** (a) Si cambia la gravedad, cambia la altura del pico: la viga y la torre dejan de medir lo mismo y hay que simular otra curva. Estirar en x deja igual la curva vertical (`simulateJump`), así que no hace falta una simulación nueva. `jumpmodel` solo suma `k` a lo que ya existe: `airTravel(kind, v, k = 1)` y `riseAt(kind, v, x, k = 1)` usan `v × k`. Es más simple que `simulateBounce`. (b) Si cambia la velocidad del mundo también en el suelo, el momento de tocar **no cambia**: la caja llega antes, pero el salto también va más rápido y se compensan. Solo cambiar el aire mueve el momento de tocar de verdad.
- **Qué pide al jugador (y una corrección al encargo).** Con viento a favor el salto es más largo: hay que despegar **más lejos**, o sea **tocar antes**, y además se perdona tocar temprano. Con viento en contra el salto es más corto: hay que **tocar después**, más cerca de la caja. Es al revés de lo que decía el encargo, porque así sale la física, y la tarjeta y la prueba a ciegas se escriben con este sentido. Caja con toque, a 320 px/s (≈): sin viento se libra despegando entre 42 y 96 px antes de la caja. A favor, entre 48 y 138 px. En contra, entre 38 y 72 px. Quien toca "como siempre" con viento en contra (≈75 px) choca. Ahí está la mecánica.
- Las piezas no cambian de altura. Los arcos sobre un obstáculo con viento abren su separación `× k` (`gap × k`) y el centro queda en el mismo lugar.

**2. Cómo se ve y se oye.**
- La zona va de `D − 0.7 s` a `D + 0.15 s` del primer y del último obstáculo (`antesSec`, `despuesSec`, en segundos a la velocidad del tramo). Así cubre cualquier despegue útil: el toque despega ≈0.2 s antes de la caja y el salto mantenido ≈0.42 s antes con `k` de 1.3.
- **Marca principal (sin partículas):** comillas de tinta pintadas sobre el suelo a lo largo de la zona, `»»»` a favor y `«««` en contra. Son 3 trazos por cada 60 px, con 3 px de grosor, en la tinta #22211F de día y en papel claro de noche, todo con `Graphics` y sin textura nueva. Se ven en cuanto la zona entra a pantalla: a 375 px hay 389 px por delante, o sea ≥ 0.9 s antes de la caja a 420 px/s. Se lee por la dirección y no por el color, así que sirve también para daltónicos.
- **Marca de apoyo:** las tiras de papel del pool actual (6 a la vez como máximo). A favor vuelan **hacia la derecha**, y nada más en pantalla se mueve hacia allá, así que se nota al instante. En contra vuelan hacia la izquierda al doble de la velocidad del suelo. Empiezan a salir 1.2 s antes de que la zona llegue a Moki.
- **Moki** se inclina 3° hacia adelante en el aire a favor y 3° hacia atrás en contra, con el `tilt` que ya existe. No se espeja.
- **Sonido "soplido":** sale al despegar dentro de la zona (es cuando el viento actúa). Ruido filtrado de 260 ms, con el filtro de 800 a 2000 Hz a favor (sube) y de 2000 a 700 Hz en contra (baja), 6 dB por debajo del boing.
- **Movimiento reducido:** sin tiras y sin inclinación. Las comillas se quedan, porque son la mecánica. La prueba a ciegas se hace también con movimiento reducido.

**3. Bloques.** En `tramos.js`, un sufijo `>` (a favor) o `<` (en contra) sobre un código base de `OBS`: `C>`, `C<`, `T>`. `expand()` quita el sufijo, arma el obstáculo de siempre y agrega `{ kind: 'viento', D0, D1, k }`. Dos zonas seguidas con el mismo `k` y a menos de 0.3 s se juntan en una.
| id | dur | ev | dif | tags | mec |
|---|---|---|---|---|---|
| `viento-intro` | 3 | `[[0, 'C>+Aup']]` | 1 | viento, premio | viento |
| `viento-contra` | 3 | `[[0, 'C<']]` | 2 | viento | viento |
| `viento-torre` | 3 | `[[0, 'T>+Aup']]` | 2 | viento, torre | viento |
| `viento-par` | 4 | `[[0, 'C>'], [1.5, 'C<']]` | 3 | viento, ritmo | viento |
| `viento-ritmo` | 4 | `[[0, 'C<'], [1.0, 'C<'], [2.2, 'C<']]` | 3 | viento, ritmo | viento |
- `viento-par` es la firma de la mecánica: la misma caja dos veces, primero hay que tocar antes y luego después. `viento-ritmo` usa huecos de 1.0 y 1.2 s para no regalar una repetición a F3. Las dos cajas de `C>+Aup` y `T>+Aup` dejan elegir: con toque pasas, con salto mantenido cobras el arco estirado. Así F4 no baja.
- **Fases:** nunca en calma (0-4 s) ni en T1. La primera vez en la partida sale `viento-intro` al abrir la subida (como `viga-intro`) y `viento-contra` en esa misma página. `par` y `ritmo` solo van en el pico. En el respiro solo `viento-intro`, y nada con viento después del segundo 26. Como máximo 2 bloques de viento por página.
- **No se mezcla:** dentro de una zona y hasta 1 s después de `D1` no van vigas, pop-ups (`U`), filas `P5`, trampolines ni `OLA`. Ningún trampolín a menos de vuelo + 0.75 s antes de `D0` (en `FIN`, `J` ya cubre 2.2 s). La regla (a) ya separa el tema `viento` del tema `trampolin`. Solo Libre, desde el nivel 5 del Cuaderno o con `?mec=viento` (que acepte lista: `?mec=tramp,viento`). El Clásico y el Reto no cambian, y el Reto lo recibe una semana después, igual que el trampolín. La tarjeta del nivel 5 dice "Ahora hay viento en Libre" (`cu.viento`; generalizar `ui.js:343`, que hoy solo mira `C.tramp.nivel`).

**4. Justicia (`validar.js`).**
- El bot busca la zona en la `dist` donde despega y apunta con `airTravel(plan, speed, kZona) / 2`. Mientras está en el aire avanza `dist += speed × jump.k × DT`.
- **Aire libre al salir:** cuando aterriza un salto con `k ≠ 1`, el siguiente obstáculo debe quedar a ≥ 0.75 s (`salidaSec`, a velocidad de suelo). Si no, `cause: 'viento-salida'` y se vuelve a sortear, igual que con `caida` en el trampolín.
- **Pasa:** el bot con viento a −40, 0 y +40 ms, en las 4 velocidades de tramo y en vuelta rápida (×1.12, hasta 470). Siguen las dos rutas del trampolín, y el pasivo falla en todas.
- **Prueba del instrumento** (en la prueba de `validar`, no en cada nivel): un bot **ciego al viento** (apunta con `k = 1` pero sufre la física) debe chocar con `C<` aislada a 320 y 350 px/s. Si la libra, el viento es pura decoración y la mecánica no pasa.
- **Calibración primero:** con el centrado de `air/2`, `C<` a 320 queda justa (≈ ±44 a 52 ms). Si el bot con viento no pasa a ±40, sube `contra` a 0.85 y repite. Si con 0.85 el ciego ya no choca, ve al punto 6.
  - **Resultado (2-nov, decisión A del director, DECISIONES 2-nov 01:10):** `contra` = 0.85. El bot con viento pasa ±40 en 320-470 px/s; el bot ciego centrado libra `C<` por 11 px, y a -40 ms choca a 320 y queda con 1 px a 350. Vara del ciego relajada a "-40 choca" (medido en `scripts/viento-calibrar.mjs`, `evidencia/v2-viento-calibracion.json`). La justicia ±40 manda sobre cualquier mecánica.

**5. Sabremos que estuvo bien si** (Libre, nivel ≥ 5, 30 semillas, contra master `f068d24`):
- F1 sube de ≈8.3 a **≥ 9.3** (son 4 patrones nuevos: `C>`, `C<`, `T>` y los pares). F6 baja de 28 a **≤ 24 s**.
- No se rompe nada más: F2a ≤ 4.5 s, F2b ≤ 12 %, F3 ≤ 4.0 s y F3b = 0, F4 ≥ 20 % (hoy 23.6 %). Justicia sin fallas en 465 niveles, fallback 0 %, Clásico idéntico (78/78 y 2142).
- Peso ≤ +1.5 KB gzip (estimo ≈1.1 KB: configuración, sufijo, 2 parámetros en jumpmodel, validador, comillas, soplido). 375 px a ≥ 55 fps en Hardcore.
- **Invitado a ciegas:** ve dos capturas a 375 px (antes de la zona y con Moki en el aire dentro de ella), primero a favor y luego en contra, también con movimiento reducido. Debe decir "viento" (o "empuja"/"frena") y su dirección sin pista, en las dos.

**6. Riesgo #1: que el cambio de paso del mundo en el aire se sienta como lag y no como viento.** Con `k = 0.8`, el fondo se frena justo al despegar, y en un celular viejo eso parece que el juego se trabó. Si el invitado a ciegas o 2 de 5 personas dicen "se trabó" o "lag", se corta así: (1) suavizar el cambio de `k` en 60 ms, con el mismo suavizado en el validador; (2) más tiras y comillas más gruesas; (3) bajar a 1.2/0.85 si el ciego todavía choca. Si sigue fallando, `C.viento.nivel = 99` apaga la mecánica sin borrar nada y el nivel 5 se queda con la música, como hoy.

**¿Viento o Repisas?** Vale el viento primero: es S-M (≈1.1 KB, sin superficies que pisar) y ataca F6 (28 s contra un tope de 30, la métrica más justa). Repisas ataca F4, que ya pasa (23.6 % ≥ 20), y cuesta M-L con más de 1.5 KB probables.

#### #3 Repisas, especificación (2-nov)
Invitado de niveles. Los "≈" salen a mano de `config.js` (gravedad 2200, salto 720, trampolín 750 con ×0.55, Moki de 92 con caja de 86, viga en 190) y no los corrí. El constructor los confirma con la prueba del punto 5 antes de tocar el juego.

**1. Recorte: una repisa alta que solo se sube con el trampolín.**
- **Se cae el salto mantenido para subir.** Es geometría, no gusto: el salto mantenido llega a 118 px y Moki mide 92. Una repisa que se alcance así tendría el piso a 100 px como mucho, y abajo Moki no cabe parado. No hay forma de tener a la vez "se sube saltando" y "se pasa por debajo". El trampolín llega a ≈232 px y sí deja las dos cosas. (Para después: un escalón de caja para subir con salto mantenido. No va en este corte.)
- **Medidas:** cara de abajo a **176 px** sobre el suelo, grosor 14, piso a **190 px**. Va en `config.js`: `repisa: { alto: 190, grosor: 14, nivel: 7 }`. La cara de abajo funciona como una **viga larga**. El toque pasa por debajo (cabeza a ≈148, 28 px de holgura) y el salto mantenido choca (cabeza a ≈204). Es la misma lección que la viga, que ya se enseñó: "bajo techo, toque corto".
- **Largo:** se mide en segundos desde el `J`, igual que todo lo demás. Empieza en **+0.45 s** y termina en **+3.3 s**. El trampolín lanza en `J − 20 px`. Los pies pasan los 190 px de subida a ≈+0.35 s y de bajada a ≈+0.83 s. Así Moki cruza la orilla con ≈27 px de aire y cae sobre la repisa a ≈+0.83 s, a cualquier velocidad de 320 a 470.
- **Subir:** solo pisando el `J`. **Bajar:** se acaba la repisa (o hay un hueco) y Moki cae solo. Son 190 px en ≈0.42 s y no hay gesto nuevo. **Canto:** no hay pared que se choque de frente. Lo único que mata es la cara de abajo (la caja `{ lo: 176, hi: 190 }` en todo el largo), y solo si saltas mantenido debajo de ella.

**2. Física y modelo.**
- **RunScene:** `pisoEn(x)` devuelve `groundY − 190` si los pies de Moki (`x ± 16`) tocan un tramo de repisa y venía por encima. Si no, devuelve `groundY`. `stepJump` usa ese piso en lugar de `C.world.groundY` en las líneas 1067, 1075, 1076 y 1086. Solo se aterriza **desde arriba**: `vy ≥ 0 && yPrev ≤ piso && y ≥ piso` (la repisa no frena al que sube desde abajo, a ese lo mata la cara de abajo). Si Moki está en el suelo y `pisoEn` baja, entonces `grounded = false`, `lastGroundedAt = t` (el coyote de 90 ms vale) y `vy = 0`. Al aterrizar en la repisa se apaga `vuelo` con el mismo bloque de código que ya existe. La sombra y las partículas van en el piso. Sin repisas en pantalla, `pisoEn` regresa `groundY` sin hacer cuentas, y por eso el Clásico queda idéntico.
- **Combo:** mientras `enRepisa`, se trata igual que el vuelo: no suma ni rompe, y la ventana corre desde que Moki cae al suelo.
- **jumpmodel (sin simulación nueva):** `cruzaVuelo(h)` saca de `simulateBounce().pts` (que ya está en caché) los dos tiempos en que el vuelo pasa por `h`. `caidaSec(h, v0 = 0)` da la caída en forma cerrada: `(−v0 + √(v0² + 2gh)) / g`. `tramos.js` los usa para afirmar al armar cada bloque: `orilla ≥ sube + 16/v + 0.03` y `orilla ≤ baja − 0.1`.
- **validar.js:** el salto lleva `base` (0 o 190) y la altura es `base + pts.rise`. Cada cuadro, si va bajando y cruza `sueloEn(dist)`, aterriza ahí. Si se acaban los `pts` con `base > 0` y abajo no hay repisa, sigue la caída cerrada `alt = base − vL·τ − 1100·τ²`. Las repisas van en una lista aparte (como mucho una viva), y su cara de abajo se revisa por tramo `[D0 − 16, D1 + 16]`, no por centro. El bot **no** usa coyote, para quedar del lado seguro.

**3. Arriba y abajo (el trato).**
- **Arriba (seguro, sin combo):** 7 piezas a `h = 236` (190 + 46): una fila de 5 de +1.0 a +1.6 s y 2 más después del hueco. Valen 7. El riesgo es un **hueco** de 0.3 s en la repisa: si no lo saltas, caes al carril de abajo vivo y pierdes las 2 últimas piezas. El toque lo libra con una ventana de ≈270 ms a 320 y ≈240 ms a 470, más el coyote.
- **Abajo (combo con riesgo):** 3 cajas con toque bajo techo a +0.85, +1.65 y +2.45 s, cada una con 1 pieza a `h = 95` (como `OLA`), y 3 piezas de suelo (`h = 46`) entre ellas. Son 6 piezas a 0.4 s una de otra, dentro de la ventana de 900 ms. Si arrancas en cero valen 1+1+2+2+2+3 = **11**. El riesgo es mantener por reflejo bajo el techo, y eso mata.
- **Reparto:** con combo en cero, 7 contra 11 (arriba 39 %, abajo 61 %). Con combo ya en ×3, 7 contra 18 (abajo 72 %). Ninguna pasa del 75 %. Las piezas de un carril no se alcanzan desde el otro (`dy` 34 contra más de 100 px de distancia).

**4. Bloques.** Hay códigos nuevos en `tramos.js`. `R<seg>` es un tramo de repisa de `t` a `t + seg` (`{ kind: 'repisa', D0, D1 }`). Dos `R` separados por menos de 0.6 s forman un **hueco**, que es un pseudoobstáculo `{ type: 'hueco', plan: 'tap', arriba: true }` sin choque. `+A1` es una pieza a 95 sobre la caja, `p` una pieza de suelo y `PR5`/`PR2` una fila sobre la repisa (48 px). `buildLevel` marca `bajo` todo lo que queda bajo `[D0, D1]` (como hoy con el nudo).
| id | dur | ev | dif | tags | mec |
|---|---|---|---|---|---|
| `repisa-intro` | 5 | `[[0,'J'],[0.45,'R2.85'],[0.85,'C+A1'],[1.25,'p'],[1.65,'C+A1'],[1.0,'PR5']]` | 2 | repisa, premio | repisa |
| `repisa-hueco` | 5 | `[[0,'J'],[0.45,'R2.1'],[2.85,'R0.45'],[0.85,'C+A1'],[1.25,'p'],[1.65,'C+A1'],[2.05,'p'],[2.45,'C+A1'],[2.85,'p'],[1.0,'PR5'],[3.0,'PR2']]` | 3 | repisa | repisa |
| `repisa-pop` | 5 | igual que `hueco`, pero la caja de +1.65 es `U+A1` | 3 | repisa, sorpresa | repisa |
| `repisa-salida` | 5.5 | `repisa-hueco` + `[4.6,'T']` | 4 | repisa, torre | repisa |
- `repisa-salida` cambia "bajo techo, toque" por "torre, mantén" justo al salir, con 0.85 s libres desde el aterrizaje más tardío. Es el único `dif 4` del pico.
- **Fases:** nunca en calma ni en T1. La primera vez sale `repisa-intro` al abrir la subida. `hueco` y `pop` van en la subida o en el pico, y `salida` solo en el pico. En el respiro no hay ninguna (duran 5 s y nada mata después del 28). Como mucho 1 bloque de repisa por página, y el mismo id no sale en dos páginas seguidas (protege F3).
- **Con el trampolín:** el `J` de la repisa es suyo. No va ningún otro `J` a menos de 2 s antes (vuelo más 0.75 s). Nada de `Avu`, porque el vuelo se corta al caer en la repisa. La regla (a) separa el tema `repisa` del tema `trampolin`. **Con el viento:** no hay zona de viento dentro del bloque ni hasta 1 s después de `+3.3`. Si el viento se apaga, no cambia nada.
- Solo en Libre, desde el nivel 7 o con `?mec=repisa`. El Clásico y el Reto no cambian. La tarjeta dice "Ahora hay repisas en Libre", con la misma generalización de `ui.js` que el viento.

**5. Justicia (`validar.js`).**
- **Rutas:** `arriba` (pisa el `J`, cae en la repisa, salta el hueco), `abajo` (salta el `J` con un toque y toca las 3 cajas bajo techo) y una nueva, `cae` (arriba sin saltar el hueco). Las tres deben pasar con ±40 ms en las 4 velocidades y en la vuelta rápida (hasta 470). `cae` cuesta una bandera: `salta(hueco) = false`.
- **Aire libre:** al tocar suelo después de caer de la repisa (por la orilla o por el hueco), el siguiente obstáculo queda a ≥ 0.75 s. Si no, `cause: 'caida'`, como en el trampolín. Con los números de la tabla, el peor caso por el hueco cae a ≈+3.0, y la caja de +2.45 ya quedó 0.075 s atrás.
- **El pasivo falla:** pisa el `J`, cae arriba y luego al suelo, pero no pasa la página. Esto ya se prueba hoy.
- **Prueba del instrumento:** (1) el bot forzado a `hold` bajo la repisa debe morir con `cause: 'repisa'`; (2) en `arriba`, el aterrizaje sobre la repisa cae a +0.83 s ±1 cuadro a 320 y a 470. Si el (2) falla, se corrige la orilla y no el validador.
- **375 px:** hay ≈389 px por delante. El techo y la primera caja de abajo se ven ≥ 0.8 s antes del despegue a 470, y el hueco ≥ 0.8 s antes visto desde arriba. **Límite conocido:** a 420 o más, la orilla aparece ≈0.3 s antes del `J`. Nadie muere por no verla (las dos rutas viven), pero esa elección se toma a ciegas. Por eso `repisa-intro` solo sale en tramos de 385 o menos.
- **Arte:** se dibuja en canvas una tabla de cartón (marrón medio, borde claro arriba y las ondas del corrugado en las dos puntas), dos hilos de tinta de 1 px hacia arriba y una **sombra** de 40 % sobre el suelo bajo todo el largo, que es lo que marca el techo en el carril de abajo. Sin naranja. Al caer encima, la repisa baja 2 px durante 80 ms y suena el "tok" hueco de la tabla del punto 5. Con movimiento reducido no baja, y el tok se queda. Moki no se espeja.

**6. Sabremos que estuvo bien si** (Libre, nivel ≥ 7, 30 semillas, contra master `f068d24` o contra el viento si ya entró):
- **F4 sube de 23.6 % a ≥ 27 %.** Cada bloque suma 2 elecciones reales (el `J` y el hueco: las dos rutas viven y dan distintas piezas). `medirFlow` cuenta el hueco como decisión y las cajas bajo techo como decisión de un solo plan.
- No se rompe nada: F1 ≥ 8.3, F2a ≤ 4.5 s, F2b ≤ 12 %, **F3 ≤ 4.0 s** con F3b = 0, F6 ≤ 28 s. Justicia con 0 fallos en 465 niveles y las 3 rutas, fallback 0 %, Clásico idéntico (78/78 y 2142), y peso **≤ +1.5 KB** gzip (estimo ≈1.35 KB). A 375 px, ≥ 55 fps en Hardcore. Hay que revisar en una captura que el salto mantenido desde arriba (cabeza a ≈394 px del suelo) no se corte por arriba a 375 px.
- **Invitado a ciegas:** ve 2 capturas a 375 px de la misma repisa, una con Moki cayendo sobre ella y otra con Moki abajo saltando una caja bajo la sombra. Debe nombrar los dos caminos ("arriba y abajo", "por encima o por debajo") sin pista, también con movimiento reducido.

**7. Riesgo #1: el techo mata por reflejo.** Quien viene de torres mantiene bajo la repisa y muere, y lo siente injusto, peor a 375 px y rápido. Si 2 de 5 personas (o el bot del demo) mueren ahí más que en la viga, el corte va en este orden: (1) primera caja de abajo a +1.1 y sombra al 60 %; (2) repisas solo en tramos de 385 o menos; (3) `C.repisa.nivel = 99` la apaga sin borrar nada.
**Costo: ≈3 h, justo en el tope.** Config, códigos y bloques 0.5 h; `pisoEn`, aterrizaje y combo en RunScene 0.8 h; validador con base y caída cerrada más ruta `cae` 0.8 h; sprite, sombra y tok 0.4 h; métricas y prueba del instrumento 0.5 h. Para que cupiera **recorté** el subir con salto mantenido, el escalón, `Avu` en la repisa y la repisa que se dobla (#5). Si se pasa de 3 h, sale con `intro` y `hueco` nada más, y `pop` y `salida` van en la siguiente vuelta.

### 5. La tabla de DISENO.md se reacomoda (no se tira)
Las mecánicas caen en niveles impares, que ya tienen su capa de música. Cada una trae además su sonido propio, chico y sintetizado. Los efectos visuales se quedan en los pares, como estaban.
| Nv | Mundo | Música (se queda) | Sonido de la mecánica | Efecto (se queda) |
|---|---|---|---|---|
| 3 | Trampolín | bajo | boing de cartón | - |
| 5 | Viento | contracanto | soplido (se pasa aquí desde la estela del 8) | - |
| 7 | Repisas | arpegio | tok hueco al pisar | - |
| 9 | Timbre | segunda voz | campanita del timbre | - |
| 10 | Repisa que se dobla | campanas | crujido de doblez (el del choque) | festejo |
Los niveles 2, 4, 6 y 8 se quedan igual. La tarjeta de los niveles impares anuncia la mecánica primero ("Ahora hay trampolines") y la música después.

### 6. Trampolín: sabremos que estuvo bien si
- F4 ≥ 20% en Libre con el nivel 3 o más (30 semillas), contra la línea base de master. F1 sube 1 o más.
- Justicia intacta: Clásico 78/78; bot ±40 termina 30 fechas y 30 semillas Libre **con las dos rutas forzadas** (siempre arriba y siempre abajo); el pasivo falla en todas; fallback 0% en 365 fechas y 500 semillas.
- Con 3 a 5 personas: ninguna ruta pasa del 75% de los usos, y al menos 3 de 5 dicen sin pista que "hay dos caminos".
- Invitado a ciegas: nombra el trampolín y las 4 fases en el video de una página. Peso ≤ +1.5 KB gzip. 375 px sin bajar de 55 fps en Hardcore.

### 7. Viento: calibración medida (constructor, 2-nov; DECISIONES 2-nov 01:10)
- `node scripts/viento-calibrar.mjs [contra]`: `C<`, `C>`, `T>` (y con `+Aup`) aislados a 320, 350, 385, 420 y 470 px/s.
- Con `contra` 0.8, la ventana de despegue de `C<` a 320 mide 80 ms (de −45 a +35 ms sobre el centrado `air/2`): no aguanta ±40 con 4 px. Con 0.85 mide 110 ms y el bot con viento pasa a ±40 en las 5 velocidades. Queda **0.85** (opción A del director).
- El bot ciego (apunta con `k = 1`) despega (1 − k) × 233 ms temprano: 35 ms con 0.85. Centrado libra `C<` por 11 px, así que la vara del instrumento queda relajada a **"−40 choca"**: a −40 ms choca a 320 y a 350 se queda con 1 px, bajo la holgura de 4 px de la justicia. El viento en contra quita el perdón de tocar temprano; no castiga el toque centrado.

### 8. Repisas, retoma: largo finito (2-nov)
Invitado de niveles, sobre `v2/repisas` 7058eab. El arte reprobó porque la tabla de hoy (R2.1 = 672 a 987 px) es más ancha que lo que se ve a 375 px. En vertical se ven **460 px de mundo** (`portrait.visibleWidth`): 71 detrás de Moki y 389 delante. Ninguna orilla y ningún hilo suelto quedaban en pantalla. Los "≈" salen a mano (alto 196, caída √(2·196/2200) = 0.42 s, toque ≈0.49 s en el aire) y el constructor los confirma.

**1. Largo en segundos, con tope en px.** La repisa aparece en Libre desde el nivel 7: tramos de 320, 350, 385 y 420, y la vuelta rápida llega hasta 470.
- **R1 = 0.75 s** (de +0.45 a +1.20 desde el `J`): 240, 263, 289, 315 y 353 px. **Hueco** de 0.3 s (de +1.20 a +1.50). **R2 = 0.5 s** (de +1.50 a +2.00): 160 a 235 px.
- **Las dos orillas se ven juntas** durante (460 − L)/v: R1 se ve completa 0.69 s a 320, 0.56 a 350, 0.44 a 385, 0.35 a 420 y 0.23 a 470. R2 se ve completa ≥ 0.48 s a cualquier velocidad. A 320 y 350, R1 entra entera antes del `J` (en t = 1.20 − 389/v ≤ 0.09 s).
- **Regla para `tramos.js`:** ningún `R` pasa de 0.8 s, porque 0.8 × 470 = 376 deja ≥ 84 px de margen. Si alguien pide más, se afirma al armar el bloque: `seg·v ≤ 380`.
- **Arriba sigue funcionando:** cae en R1 a ≈+0.83 y tiene ventana para saltar el hueco con despegue entre +1.01 y +1.29 (≈280 ms, más 90 ms de coyote). Cae en R2 a ≈+1.5–1.9 y se baja sola en +2.0, tocando suelo a ≈+2.47.

**2. Piezas y cajas.** Las 3 cajas no caben bajo un techo de ≤ 0.8 s, porque cada caja pide 0.8 s de separación. Tampoco puede ir caja bajo R2: la ruta `cae` toca suelo a ≈+1.67 y la siguiente caja tendría que estar a ≥ +2.42. Por eso:
- **Abajo:** queda **1 caja** bajo R1 (`C+A1` en +0.85) y 4 piezas de suelo `p` en +0.45, +1.25, +1.65 y +2.05, a 0.4 s una de otra: 5 piezas = 1+1+2+2+2 = **8**. El riesgo de mantener bajo el techo sigue en la caja de +0.85.
- **Arriba:** `PR2` en +0.90 sobre R1 y `PR3` en +1.55 sobre R2 = **5**. Si cae por el hueco, pierde las 3 de R2 y entra abajo después de +1.67, con ≤ 2 piezas.
- **Trato:** 5 contra 8 = **38/62** con combo en cero. Con combo ×3, 5 contra 15 = **75.0 %**, justo en el borde: se mide y no debe pasar de 75. Si pasa, la pieza de +0.45 sale y queda 5 contra 7 (42/58, con ×3 71 %).
- **Bloques:** `hueco` = `[[0,'J'],[0.45,'R0.75'],[1.5,'R0.5'],[0.85,'C+A1'],[0.45,'p'],[1.25,'p'],[1.65,'p'],[2.05,'p'],[0.9,'PR2'],[1.55,'PR3']]`. `intro` = solo R1 (`R0.75`), con caja y piezas en +0.45, +0.85 y +1.25, y `PR2` (ahí 2 contra 4). Nada en el suelo de +1.4 a +2.4, porque arriba cae en ≈+1.66. `salida` = `hueco` + `[3.4,'T']`. Lo siguiente a todo bloque va en ≥ **+3.22** (2.47 + 0.75). `dur` baja de 5 a 4.

**3. Orillas (≤ 100 B gzip).** Se **quitan los 2 hilos**. Cada punta lleva un corte de cartón (2 px de tinta `#22211F` que cierran la cara) y **escuadras de esquina**: una "L" de 8 px con trazo de 2 px en las 4 esquinas, dentro del grosor de 20 px. Nada cuelga bajo la cara de abajo, así que los 29 px libres sobre la cabeza no cambian. La sombra del 40 % se queda, y ahora se ve corta y con sus dos puntas. Va en un solo `for` sobre `[0, w]` × `[0, h]`.

**4. Se re-mide** (Libre nivel ≥ 7, 30 semillas, contra el viento integrado, 9d4a97c):
- Las 3 rutas (`arriba`, `abajo`, `cae`) con el bot ±40 a 320, 350, 385, 420 y 470: 0 fallos en 465 niveles.
- El pasivo falla. El bot que mantiene bajo R1 muere con `cause: 'repisa'`. Al caer, 0.75 s libres en las dos caídas (orilla de R2 y hueco).
- F1, F2a, F2b, F3 (F3b = 0) y F6 sin moverse respecto a 7058eab. F4 con la regla única y la vara aceptada (≥ 21.9 %). Clásico y Reto idénticos (78/78 y 2142).

**5. Sabremos que estuvo bien si:**
- Un **invitado de arte nuevo** da **≥ 4/5 en "se pisa"** y **≥ 4/5 en "techo"** viendo 5 capturas a 375×812: (a) arriba, (b) abajo bajo R1, (c) noche, (d) movimiento reducido y (e) trampolín y R1 juntos con las dos orillas en cuadro (a 350, t ≈ +0.05).
- 0 fallos de justicia. Los 5 tiempos de "orillas juntas" del punto 1, medidos en pantalla, quedan a ±0.05 s.
- ≥ 55 fps en Hardcore a 375.

**6. Tope: 1.5 h** (bloques 0.3, orillas 0.3, re-medir 0.5, capturas e invitado 0.4). **Peso:** volver a **≤ +1.5 KB**. Hoy está en +1632.
- Fuera los hilos y el `repisa-pop` muerto (≈−45).
- Las afirmaciones de orilla de `tramos.js` van tras `import.meta.env.DEV` (≈−60).
- `salida` se arma como `[...hueco.ev, [3.4,'T']]` (≈−40).
- Bloques más cortos (≈−20).
- Las orillas suman (≈+90).
- Neto ≈ +1557. Si no baja de 1536, se quita la bajada de 2 px al pisar (se queda el tok, ≈−35). Si aun así no llega, vale el tope de 1.6 KB que ya está aceptado.
- **Riesgos:** el trato queda en 75.0 % justo con ×3. Con una sola caja abajo hay menos tentación de mantener, y el "techo" se puede leer más débil. A 470, R1 completa solo se ve 0.23 s. F4 puede bajar un poco porque el bloque es más corto.

### 9. #4 Timbre, especificación (2-nov)
Invitado de niveles. Los "≈" salen a mano de `config.js` (gravedad 2200, salto 720, toque con pico de 62 a 72, salto mantenido con pico de 118, caja de Moki de 86, torre de 92) y no los corrí. El constructor los confirma antes de tocar el juego.

**1. Qué cambia al jugar y qué pregunta hace.** Un timbre de cartón flota a 1.0 s antes de una torre. Si lo tocas con un salto mantenido, suena y la torre se acuesta hacia adelante (lejos de Moki): ya no tienes que saltarla y sus piezas caen al piso. Si no lo tocas, la torre sigue de pie y la pasas a mano, con salto mantenido. La pregunta: "¿piezas seguras o subo el combo?".
- **Tocar (seguro, sin combo):** las 3 piezas del arco caen con la torre y salen 2 más: 5 piezas a ras de piso (`h = 46`). Tumbar la torre no cuenta como pasarla, así que el combo se pausa (no suma ni rompe, igual que el vuelo). Valen **5**.
- **A mano (combo con riesgo):** el arco `A3up` sobre la torre de pie, con el combo subiendo: 1+1+2 = **4**. Con combo en ×3: **9**.
- **Reparto:** con combo en cero, 5 contra 4 (56/44). Con ×3, 5 contra 9 (36/64). Ninguna ruta pasa del 75 %.

**2. Física y tiempos.**
- **Altura:** la caja del timbre va de **186 a 214 px** sobre el suelo, mide 28 px de ancho y no mata. El toque sube la cabeza hasta ≈158 (28 px por debajo: nunca suena). El salto mantenido la sube hasta ≈204 (la mete 18 px) y la deja ≥ 186 durante ≈0.255 s (82 px a 320). Con ±40 ms solo cambia la x en 13 a 19 px, así que suena siempre. Va en `config.js`: `timbre: { lo: 186, hi: 214, ancho: 28, torreSec: 1.0, retardo: 0.1, caidaSec: 0.3, nivel: 9 }`.
- **Torre:** a +1.0 s del timbre (como `T.V`). Si suena, la torre empieza a caer 0.1 s después (primero la campanita y luego el golpe) y tarda 0.3 s. Queda acostada a ≤ +0.51 s, o sea **≥ 0.45 s antes** de que llegue Moki, a cualquier velocidad. Acostada mide 92×20, es solo dibujo y no tiene choque. A 470, la torre entra a pantalla a +0.17 s, así que se ve casi toda la caída.
- Para saber si se tocó: en `RunScene`, si se cruzan la caja de Moki y la del timbre, se pone `torre.caida = true` y deja de chocar. Es lo mismo que el `used` del trampolín.

**3. Bloques.** En `tramos.js`, `B` es el timbre solo y `C+B` es una caja con el timbre encima. `expand()` enlaza el timbre con la primera `T` que venga ≤ 1.2 s después (`{ type: 'timbre', plan: 'hold', torre: i }`). Ese `A3up` lleva `cae: 5`.
| id | dur | ev | dif | tags | mec |
|---|---|---|---|---|---|
| `timbre-intro` | 3 | `[[0,'B'],[1.0,'T+A3up']]` | 2 | timbre, premio | timbre |
| `timbre-caja` | 3 | `[[0,'C+B'],[1.0,'T+A3up']]` | 2 | timbre | timbre |
| `timbre-tc` | 4 | `[[0,'C+B'],[1.0,'T.C+A3up']]` | 3 | timbre, ritmo | timbre |
| `timbre-viga` | 4 | `[[0,'C+B'],[1.0,'T+A3up'],[2.2,'V']]` | 3 | timbre, viga | timbre |
- `timbre-viga` castiga mantener por reflejo después de tocar el timbre. `timbre-tc` deja de pie la caja de `T.C`.
- **Unión:** nunca en calma, en el respiro ni en T1. La primera vez sale `timbre-intro` al abrir la subida, y `tc` y `viga` solo en el pico. Como mucho 1 por página, y el mismo id no sale en dos páginas seguidas. No va dentro de una zona de viento ni 1 s después (el viento mueve la x del toque), ni bajo una repisa (el techo corta el salto mantenido), ni bajo el vuelo de un trampolín (≥ 2.2 s después de un `J`). La regla (a) separa el tema `timbre`. Después del salto que toca el timbre, 0.75 s libres antes de algo que mate. Solo en Libre, desde el nivel 9 o con `?mec=timbre`. El Clásico y el Reto no cambian. La tarjeta dice "Ahora hay timbres en Libre" (con el `ui.js` generalizado del viento).

**4. Bot (`validar.js`).** Se reusa `ruta`. `arriba` = **toca** (plan `hold` en el timbre: si se cruzan las cajas, la torre pasa a `caida` y se salta como el `tramp` de la línea 118). `abajo` = **a mano** (`tap` o `none` en el timbre, y la torre de pie con `hold`). Las dos rutas pasan con ±40 ms en 320, 350, 385 y 420, y en la vuelta rápida hasta 470. El pasivo falla. **Prueba del instrumento:** (1) el toque nunca suena, a ninguna velocidad; (2) el salto mantenido suena a −40, 0 y +40; (3) `simulateJump(130)`, el mantenido más corto que libra la torre, se mide y se reporta: si suena a medias según la velocidad, se sube `lo` hasta que quede de un solo lado.

**5. Vara de F4, calculada antes de fijarla (regla única).** Hoy master en Libre da 21.9 %. Supongo ≈18 decisiones por página (0.69 por segundo en 26 s activos), o sea ≈3.94 con elección. Cada bloque de timbre trae 2 o 3 decisiones y **1 elección** (el timbre: `hold` cobra 5 y `tap` cobra 0 en `flow-medir`, como el `tramp` de la línea 140). La torre o la caja que siguen ya están decididas y cuentan como 1 plan. Un bloque de timbre reemplaza a uno medio de 3.5 s (≈2.4 decisiones y 0.53 elecciones): +0.47. Si desplaza a un trampolín (1 de 2), suma +0. Con 2 a 4 por partida (≈0.5 por página) y 1 de cada 3 desplazando a un trampolín: +0.16 por página, o sea (3.94 + 0.16) / 18.05 = **22.7 %**. **Vara: F4 ≥ 22.7 % (+0.8).** El techo, si saliera en cada página sin desplazar nada, es ≈24.4 %. **Paso 0 del constructor:** medir decisiones por página y desplazamiento en master con `flow-medir`, y rehacer esta cuenta con esos datos antes de tocar el juego.
- **Las demás varas:** F1 ≥ master + 0.3 (salen `B`, `C+B` y la torre acostada). F2a ≤ 4.5 s. F2b ≤ 12 %. F3 ≤ 4.0 s, con F3b = 0. F6 no sube respecto a master. Justicia con 0 fallos en 465 niveles y las 2 rutas. Fallback 0 %. Clásico idéntico (78/78 y 2142). Peso ≤ +1.5 KB gzip (estimo ≈1.2 KB: config 60 B, códigos 120, validador 250, choque y caída 400, dibujo 250, campanita 120). A 375, ≥ 55 fps en Hardcore.

**6. Boceto antes del código (lo pide el invitado de arte).** Son 3 cuadros estáticos a 375×812, de día y de noche, en cartón y tinta `#22211F`, sin naranja. (a) Moki corre hacia una caja con el timbre encima y la torre detrás. (b) Moki estirado en el salto mantenido toca el timbre, con 3 rayitas de "suena", y la torre se inclina hacia adelante. (c) La torre acostada con sus 5 piezas encima. El timbre es una campanita redonda de mostrador (28 px, kraft claro, botón de tinta) que cuelga de un hilo con un moño. Tiene que verse distinta de la viga: redonda, de un tercio de su ancho y **sin el contorno claro de peligro** (ARTE.md: ese contorno solo lo llevan las cosas que matan). La torre cae lejos de Moki, nunca hacia él. Moki no se espeja. **Pasa si** un invitado a ciegas responde "se cae la torre" a "¿qué pasa si tocas eso?" y no dice "peligro", con ≥ 4/5 en "se toca" y ≥ 4/5 en "no mata".

**7. Riesgos y orden de recorte.**
- **#1. El timbre se lee como una viga o como peligro.** Cuelga en la misma franja (la viga cuelga a 190), así que la gente lo esquiva con un toque y la ruta a mano pasa del 75 %. Se recorta en este orden: (1) piezas brillando junto al timbre y campanita al pasar cerca; (2) solo `intro` y `caja` (sin la viga en el bloque); (3) `C.timbre.nivel = 99`.
- **#2. La torre que cae se lee como "algo me cae encima", o cae fuera de pantalla a 420-470.** Se recorta en este orden: (1) que caiga solo hacia adelante, con el golpe de cartón ya acostada; (2) timbres solo en tramos de 385 o menos; (3) apagar.

**8. Sabremos que estuvo bien si:** F4 ≥ 22.7 % con la regla única (Libre, nivel ≥ 9, 30 semillas, contra master). Las demás varas del punto 5 sin romperse. Con 3 a 5 personas, ninguna ruta pasa del 75 % de los usos. Un invitado a ciegas, con 2 capturas a 375 (antes y después del timbre, también con movimiento reducido), dice "tocas la campana y se cae la torre" sin pista.
**Tope: 2.5 h.** Boceto e invitado 0.4. Config, códigos y bloques 0.4. Choque, caída y combo en `RunScene` 0.7. Validador, rutas e instrumento 0.5. `flow-medir` y métricas 0.3. Campanita 0.2. Si se pasa, sale con `intro` y `caja` solamente, y `tc` y `viga` van en la siguiente vuelta.

#### Arte del timbre (boceto)
Invitado de arte, 2-nov. Desarrolla el punto 6 de la §9. Referencias leídas: `ARTE.md` §4 y §8, `src/art/palette.js` (`TONE`), `block()`, `torre()` y `tramp()` de `src/art/textures.js`. Medidas en px lógicos (960×540); a 375 de ancho el zoom es ≈ 0.69, así que 1 px lógico ≈ 0.7 px de pantalla. Todo con primitivas, sin imágenes nuevas. Los hex salen de mezclar tokens, como `TONE`. Dos cambios al punto 6: el timbre es una **campana colgante con badajo** (no de mostrador con botón: a 25 px de pantalla un botón redondo se lee como bola o foco) y **no usa `block()`**, porque `block()` dibuja siempre el contorno claro de 4 px al 70 %, que es la marca de peligro.

**1. Silueta del timbre (día).** Origen en el centro de la caja de choque (altura 200 sobre el suelo; la caja sigue siendo de 28×28, de 186 a 214). Las y son hacia abajo, en px lógicos.
| Parte | Forma y medida | Color |
|---|---|---|
| Domo | `roundRect` de 38×28, de x −19 a 19 e y −14 a 14, radio 16 arriba y 3 abajo | cuerpo `#CEAF8E` (kraftLight) |
| Luz | franja de 6×18 en el lado izquierdo del domo, y sombra de 8×18 a la derecha | `#F4E8D5` al 45 % y `#B99168` |
| Aro (labio) | `rect` de 46×7, de x −23 a 23 e y +14 a +21, esquinas de 3 | `#8F7254` (kraftDark), canto superior de 2 px en `#B99168` |
| Badajo | círculo de radio 4.5 en (0, +26), pegado al aro con un palito de 2×5 | `#22211F` |
| Soporte | "grapa" de cartón de 14×6 sobre el domo, de y −20 a −14, con un ojal de 3 px | `#8F7254`, ojal `#22211F` |
| Hilo | línea de 1.5 px, de y −20 a −66 (46 px; unos 32 px de pantalla), recta | `#22211F` al 80 % |
| Remate | anillo de papel de radio 5 en (0, −71), trazo de 2 px, sin relleno | `#22211F` al 80 % |
| Perfil | trazo de 2 px alrededor del domo y el aro (no del hilo) | `#22211F` al 40 %, como `block()` |
| Fibras | 2 trazos cortos de 0.8 px en el domo | `#22211F` al 10 % |
- **Tamaño total del dibujo:** 46 de ancho × 47 de alto sin el hilo (≈ 32×33 px de pantalla a 375), 118 con hilo y anillo (≈ 82 px). El domo mide 38×28 lógicos, o sea 26×19 en pantalla. Es el mínimo que acepto; no bajarlo.
- **Contraste con la viga y las cajas:** más claro que ellas (kraftLight contra kraftDanger `#866B4F`), redondo, 46 de ancho contra 91, **sin naranja, sin cinta y sin contorno claro**. Pesa más hacia arriba y se balancea; la viga es un tablón horizontal con rayas.
- **Cómo se ve en el aire sin parecer viga:** (1) el hilo único, vertical y largo, que termina en un anillo en vez de apoyarse en nada; (2) una sombra de contacto suave en el suelo, elipse de 40×6 con `#22211F` al 14 %, **sin borde duro**, bien separada del timbre (que cuelga a 140 px del piso) y alineada con su x; (3) el badajo, que cuelga abajo y es la parte que se mueve.
- **Noche:** cada color pasa por `mix(col, #22211F, 0.245)`, la misma fórmula que `tramp(dim)`: domo `#A48C73`, aro y soporte `#745E47`, cuerpo/sombra `#947656`. El perfil sube al 55 % y se añade **un solo canto de luz de 1.5 px**, `#F4E8D5` al 55 %, solo en la curva superior izquierda del domo (no es un contorno completo y no brilla). El hilo y el anillo suben a `#B7B3AD` al 70 % para que se lean sobre la cordillera `#625545`.
- **Dibujo:** ≈ 12 primitivas (4 `roundRect`/`rect`, 2 círculos, 3 líneas y la elipse). **Estimo ≈ 260 B**; el constructor lo mide. Si pasa de 300, se quita primero la elipse del suelo y luego las fibras.

**2. Estado "tocado" (3 cuadros, 320 ms en total, easing `quadOut`, sin loop).** Gira sobre el anillo (0, −71). Ningún cuadro usa glow ni cambia de tamaño; el timbre no se comprime.
| Cuadro | Tiempo | Giro | Badajo | Extra |
|---|---|---|---|---|
| T1 | 0 a 70 ms | −14° (se aleja de Moki) | +8 px hacia la derecha, golpea el aro | domo con `#F4E8D5` al 25 % plano, y **3 rayitas de "suena"** de 2 px y 8 px de largo en `#22211F` al 70 %, a −60°, 0° y +60° desde el domo |
| T2 | 70 a 170 ms | +9° | −5 px | solo 2 rayitas, más cortas (5 px) y al 40 % |
| T3 | 170 a 320 ms | −3° y luego 0° | vuelve a 0 | sin rayitas |
- Después se queda quieto y "usado": igual que el normal, pero domo `#B99168` (un tono más apagado). Con movimiento reducido: solo T1 estático durante 120 ms, sin giro, y luego el estado usado.
- La rayita 0° va hacia arriba; las otras dos, a los lados. Nada de ondas ni círculos concéntricos (se leerían como radar o glow).

**3. Torre de pie y acostada.**
- **De pie:** sin cambios. Sigue siendo `torre()` (60×92, `#866B4F` con cinta naranja): todavía mata.
- **Cae hacia adelante** (a la derecha, lejos de Moki), girando sobre su **esquina inferior derecha** (el pie delantero), en el sentido de las agujas del reloj. 0 a 0.24 s, de 0° a 90°, `quadIn` (arranca lenta y acelera, como cartón que se vence). Al sonar el timbre, la **cinta naranja baja de alfa 1 a 0 durante toda la caída**, y el cuerpo pasa de `#866B4F` a `#B99168`. Así se ve que dejó de ser peligro. Solo en el último giro hay un contorno de papel, y nunca el de 4 px al 70 %.
- **Aplastado (0.24 a 0.30 s):** la torre caída (92×60) se cruza en 60 ms con la lámina acostada de abajo. El golpe de cartón (0.1 s antes de llegar al piso) sale aquí.
- **Acostada (puente/piso), 92×20, sin choque:** `rect` de 92×20 con esquinas de 5, tapa de 3 px `#CEAF8E`, canto de 6 px `#8F7254`, cuerpo `#B99168`. Una línea de pliegue en el centro (`#8A7E70` al 65 %, 1.5 px, más la línea clara de 1.5 px a su lado) que marca que son las 2 cajas de 46. Donde estaba la cinta queda un parche `#8F7254` al 50 % de 12×20, sin naranja. Perfil de tinta al 40 %. Sombra de contacto `#22211F` al 22 %, 4 px, pegada debajo. Noche: la misma fórmula de 0.245, o sea `#947656` y `#745E47`.
- **Piezas:** 5 fichas (las del arco `cae: 5`) a h = 46, separadas 28 px lógicos en x y centradas sobre la lámina. Las 3 del medio quedan encima de la lámina y las 2 de los lados, sobre el piso. No hay que dibujar nada nuevo; se usan las fichas actuales. Con 26 px de ficha y 28 de separación se ven una por una.
- La lámina es solo decoración: Moki la cruza sin choque. Si la lámina midiera más de 20 de alto, Moki parecería atravesar una caja.

**4. Boceto: 3 cuadros a 375×812, día y noche (6 imágenes).** Fondo y cordillera: los valores de día y de noche que ya trae `config.js`, sin inventar. Suelo en y = 540 de pantalla. Moki con las poses aprobadas de correr, salto y caída del juego (sin inventar poses), a su escala actual, y **nunca espejado**. Todo lo que se mueve avanza hacia la derecha; el mundo viene de la derecha hacia Moki, que está en x ≈ 72.
| Cuadro | Qué se ve (px de pantalla) |
|---|---|
| (a) Acercándose | Moki corriendo en x = 72. Caja de 60 lógicos (41 de pantalla) en x = 120 con el timbre encima: centro del timbre a y = 540 − 138 = 402, hilo y anillo hasta y ≈ 335. La torre de pie en x = 341 (a 1.0 s a 320 px/s caen 221 px): ocupa de x = 321 a 362, entera. Sombra del timbre en el suelo bajo x = 120. |
| (b) Tocando | Moki estirado en el salto mantenido, con la mano arriba, en x = 72. El timbre en x = 84, en T1 (−14°, 3 rayitas, badajo a la derecha). La torre, a 221 px del timbre, en x = 305, inclinada 35° hacia la derecha sobre su pie delantero, con la cinta ya al 60 %. Le quedan ≈ 40 px de aire a la derecha de la pantalla. |
| (c) Torre acostada | Moki cayendo, a media altura, en x = 72. El timbre ya salió por la izquierda (si queda, que se vea solo el hilo, x < 0). La lámina de 92×20 lógicos (63×14 de pantalla) en x = 186 a 249, y las 5 fichas encima, desde x ≈ 177 hasta 257, a 32 px sobre el suelo. Sombra de contacto debajo. Sin cinta ni naranja. |
- **Naranja:** solo el visor/Moki, si ya lo lleva su pose, y la cinta de la torre de pie en (a) y (b). Ninguno en el timbre ni en la lámina.
- Al menos una captura de (a) con la distancia real de 1.0 s para que se vea la torre entera. A velocidades de 385 o más la torre no cabe junto al timbre. Eso ya lo cubre el riesgo #2.

**5. Cómo se aprueba el boceto (5 criterios, de 0 a 5).** Lo revisa un invitado a ciegas con las 6 imágenes, sin pistas. Se le pregunta primero "¿qué es eso colgado?" y "¿qué pasa si lo tocas?".
| # | Criterio | Mide | Pasa con |
|---|---|---|---|
| 1 | **Se lee como timbre** | dice "campana/timbre/campanita" sin que se le sugiera, a 375 y a tamaño real, de día y de noche | **≥ 4** |
| 2 | **No parece peligro** | no dice peligro/pincho/trampa/viga; la ve menos amenazante que la caja y la viga; sin naranja ni contorno claro | **≥ 4** |
| 3 | Silueta completa y legible | el domo, el aro, el badajo y el hilo se distinguen a 375; ninguna parte sale de pantalla; en la noche se separa del fondo sin brillar | ≥ 3 |
| 4 | Consistencia con las cajas y el trampolín | mismo cartón, perfil de tinta al 40 %, canto, fibras y sombra de contacto; no parece plástico ni de otro juego | ≥ 3 |
| 5 | Torre: cae lejos de Moki y queda como piso | en (b) y (c) entiende "se cae hacia adelante" y en (c) "ya se puede pasar"; las 5 fichas se ven una por una | ≥ 3 |
- **Aprueba** si 1 y 2 sacan ≥ 4 en el día y en la noche, y los otros tres ≥ 3. Si 1 o 2 bajan de 4: se cambia la forma (más alto el domo, badajo más grande, hilo más largo) y se repite el boceto, no se mete al juego. Hasta 3 vueltas; si no pasa a la tercera, `C.timbre.nivel = 99` y se archiva, como las repisas.
- Marca "ARTE: AJUSTAR" lo que quede entre 2 y 3 en 1 o 2, y "RECHAZADO" lo que quede en 0 o 1.

**6. Riesgos del arte.**
- **Tamaño.** A 375 el domo mide 26×19 px de pantalla. Si el invitado no lo lee, la solución es agrandar el dibujo (domo 46×34, aro 56), no ponerle detalles. Entonces la caja de choque de 28 queda muy chica contra un dibujo de 56; el líder decide si sube el choque a 36.
- **Dibujo 46 contra choque 28.** Moki puede rozar el aro y no sonar. Es lo que más frustra; que el constructor lo pruebe con el salto mantenido en el bot.
- **La caída de 90° a 20 de alto (aplastado en 60 ms)** puede verse como un truco. Si lo parece, la torre cae al ras en 0.3 s sin aplastar y la lámina se dibuja de golpe al final, con el golpe de cartón.
- **Las 5 fichas sobre una lámina de 92.** Si se superponen con la que ya está en el piso, bajar la separación a 24 o dejar solo la lámina y las fichas ordenadas.
- **Torre fuera de pantalla** a 385 o más con 1.0 s de separación (221 px a 320, 266 a 385). El boceto se hace a 320. Si hace falta, el líder decide acortar `torreSec`.
- **Poses.** No se inventó ninguna. Si la pose de salto no tiene la mano arriba al tocar, hay que avisar al líder para que lo escale.

### 10. Hueco en el suelo (zanja), especificación (3-nov)
Invitado de niveles. Sale del pendiente "hueco en el suelo" de GDD.md §9. Los números salen de `config.js` (gravedad 2200, salto 720, corte 0.45, `jumpMinPx` 62, coyote 90 ms, Moki de 38 de ancho) pasados por las ecuaciones de `jumpmodel.js` a mano. Los "≈" no los corrí: el constructor los confirma con la prueba del punto 4 antes de tocar el juego.
**Nombre en el código: `zanja` (tipo) y `Z`/`ZZ` (códigos).** "Hueco" ya significa otra cosa en `generar.js` (`HUECO_MAX`, huecos de novedad, F2b "huecos sin decisión") y en la §8 de repisas. Para el jugador se sigue llamando hueco.

**1. Qué es en el juego.**
- Un tramo del carril sin suelo. Moki tiene que saltarlo. Si no lo salta, cae y pierde **igual que hoy al chocar**: se llama a `crash()` con `cause: 'zanja'`, sale la tarjeta de fallo y reintenta desde la última página. No hay vidas nuevas ni castigo distinto.
- **Dos anchos, nada más:** `Z` (corto, cualquier salto lo pasa) y `ZZ` (largo, pide salto mantenido). Es la primera vez que "mantén" sirve para ir **lejos** y no para ir **alto**.
- **Cuándo se cae.** Moki se apoya si sus pies (`x ± pie`, con `pie = 10`) tocan algo de suelo. Si sale de la orilla sin saltar, el coyote de 90 ms sigue valiendo (`lastGroundedAt` ya se pone al dejar el suelo, línea ~1199). Si pasan esos 90 ms sin saltar, Moki cae. Al bajar 30 px bajo el suelo (≈0.165 s) se llama a `crash()`. Si aterriza en la orilla de enfrente hasta 10 px por debajo del suelo (lo que se baja en el coyote: ≈8.9 px), se sube al suelo. Si va más abajo, ya no se salva.
- **Cómo se ve, solo con el cartón que ya existe y sin arte generado.** Es un corte en el carril dibujado con `Graphics` a profundidad ≈4.7 (encima de la superficie, el canto y los dobleces, que están en 4 a 4.2, y debajo de Moki, en 10). Va de `groundY − 8` (la línea que se ve del suelo) hasta abajo de la pantalla.
  - **Fondo:** de `kraftDark` en la orilla a `#22211F` al 90 % en 40 px. Es oscuro hacia abajo, sin textura nueva.
  - **Orilla de cerca (rasgada):** el mismo borde irregular que `ground.surface()` (la suma de senos), en vertical, con 3 fibras claras de papel colgando.
  - **Orilla de lejos (doblada):** se ve la cara del corte, una banda de 6 px de `kraftDark` con las ondas del corrugado y una solapa de papel de 8 px doblada hacia adentro.
  - **Marca de peligro:** un contorno claro de 3 px (`#F4E8D5` al 70 %) en las dos orillas de arriba. Es el mismo idioma de ARTE.md, donde el contorno claro solo lo llevan las cosas que matan. **Sin naranja.**
  - Sobre el hueco no se dibujan piezas de suelo (`groundPiece`), pasto ni la sombra de Moki. La sombra se apaga mientras Moki va encima.
- **Que se lea:** a 375×667 y a 1280×720 se ven 389 px de mundo por delante de Moki (`minVisibleWidth`, `portrait.visibleWidth`). `Z` a 420 mide 143 px y entra entera a pantalla 0.59 s antes de que Moki llegue a la orilla. `ZZ` a 420 mide 235 px y entra entera 0.37 s antes. Contraste estimado entre el fondo del hueco y la superficie: ≈7.8:1 de día (`#22211F` contra `kraftLight`) y ≈5:1 de noche (con la mezcla 0.245 de la §9).

**2. Física y anchos (calculados, no a ojo).**
- **Aire del toque** (16 ms, sube con el mínimo de 62 px): ≈0.016 + 0.215 + 0.237 = **0.468 s**. **Aire del salto mantenido** (sin corte, pico 117.8): 2·720/2200 = **0.6545 s**. Coinciden con la §1 (≈0.47 y ≈0.655).
- **Ventana de despegue** del bot, que no usa coyote: `(aire·v + 2·pie − W) / v`. Se pide **≥ 100 ms** para tener ±40 con margen. El ancho va en segundos, como todo lo demás (`W = ancho·v`, con `v` la velocidad del tramo que usa `expand()`).

| Código | Ancho | px a 350 / 385 / 420 | Ventana a velocidad normal | En Vuelta rápida (392 / 431 / 470) | Sin saltar |
|---|---|---|---|---|---|
| `Z` | 0.34 s | 119 / 131 / 143 | toque ≈185 / 180 / 175 ms | toque ≈216 / 210 / 206 ms | 283 a 293 ms sin apoyo, más que el coyote: siempre cae |
| `ZZ` | 0.56 s | — / 216 / 235 | mantenido ≈145 / 143 ms; al toque le faltan ≈16 / 18 px | mantenido ≈200 / 197 ms; el toque **sí** pasa por ≈5 px | cae |

- **Límites de `Z`:** el máximo es `0.468 − 0.1 + 20/v` ≈ 0.416 s a 420. El mínimo, para que nunca se pase caminando con el coyote, es `0.09 + 20/v + margen` ≈ 0.19 s. Elegí 0.34 para que sea más fácil que la caja (de 109 a 156 ms en `config.js`) y sirva para estrenar.
- **Límites de `ZZ`:** el mínimo, para que el toque sin coyote quede corto por ≥ 10 px, es `0.468 + 30/v` ≈ 0.546 s a 385. El máximo, para que el mantenido tenga ≥ 100 ms, es `0.5545 + 20/v` ≈ 0.602 s a 420. Elegí **0.56**. `ZZ` no va a 350, porque ahí el mínimo y el máximo casi se tocan.
- **Fugas conocidas.** (a) Un toque en el último cuadro del coyote suma hasta 0.09·v (≈35 px) y cruza `ZZ`. Es premio para quien apura, no una puerta: el bot no lo usa. (b) En la Vuelta rápida el nivel se juega ×1.12 con los mismos px, y `ZZ` se puede pasar con un toque. Allá la lección de mantener se diluye. La justicia no se rompe, porque las ventanas crecen.
- **Al reaparecer** Moki sale al 85 % de velocidad, y en `ZZ` la ventana bajaría a ≈69 ms. Por eso no hay zanjas en la calma (de 0 a 4 s de página). Eso también cubre el cambio de velocidad entre tramos (`tramoEaseSec` 2).

**3. Dónde aparece y cómo se une.**
- **Modos:** solo Reto del día y Libre. **Clásico, demo, escaparate y tutorial nunca** (usan `SCRIPTS`/`GAME_LEVEL` y no pasan por `generarNivel`). No se ata a un nivel del Cuaderno, porque no pide un gesto nuevo: es saltar. Por eso puede entrar al Reto para todos a la vez. **Ojo, es una excepción** a "el Reto no usa mecánicas destrabadas" (§4). La decide el director.
  - Bloques con `mec: 'zanja'`. `generarNivel` agrega `'zanja'` a `mecanicas` en Reto y en Libre.
  - En el Reto, solo desde la fecha `C.zanja.retoDesde` (`'AAAA-MM-DD'`, el día siguiente a integrar), para que el Reto de un día no cambie a media jornada. Las fechas anteriores rearman su nivel sin zanja.
- **Desde cuándo:** `Z` desde la página 2, al abrir la subida (s ≥ 4 de T2, D ≥ 9600 + 4·350 ≈ 11000 px). La primera vez de la partida sale siempre `zanja-intro`. `ZZ` desde la página 3 y solo en el pico. **Nunca en T1** (ahí están las lecciones), ni en la calma (0-4 s), ni en el respiro, ni después del segundo 26.
- **Frecuencia:** como mucho 2 bloques de zanja por página y 1 `ZZ`. Peso normal, **no** `PESO_MEC` 5. Meta: de 1 a 2 por página, o sea **de 3 a 6 por partida** (se mide en 50 semillas: un promedio entre 3 y 6, y ninguna página con más de 2). La regla (a) ya separa el tema `zanja`, así que no salen dos bloques de zanja seguidos.
- **Bloques** (`bloques.js`, `dur` incluye la cola de ≥ 1.2 s):

| id | dur | ev | dif | min-max | tags | extra |
|---|---|---|---|---|---|---|
| `zanja-intro` | 2.5 | `[[0,'Z+A3']]` | 1 | 2-4 | zanja, premio | `soloEstreno` |
| `zanja` | 2 | `[[0,'Z']]` | 2 | 2-4 | zanja | |
| `zanja-caja` | 3 | `[[0,'C'],[1.2,'Z']]` | 2 | 2-4 | zanja, ritmo | |
| `zanja-larga` | 3 | `[[0,'ZZ+Aup']]` | 3 | 3-4 | zanja, salto-largo | `soloPico` |
| `zanja-torre` | 3.5 | `[[0,'T'],[1.5,'ZZ']]` | 4 | 3-4 | zanja, torre | `soloPico` |
  - Las piezas en arco sobre la zanja sirven de guía: dicen "aquí se salta y de este largo". `A3` (de 91 a 113) se alcanza con el toque. `Aup` (164 arriba) solo se alcanza completo con el salto mantenido (62 + 80 de alcance = 142, que no llega a 164).
  - `zanja-torre` encadena dos "mantén" de distinto tipo (alto y luego lejos). La orilla de la zanja queda a 1.5 − 0.28 = 1.22 s de la torre, y el aterrizaje de la torre cae a ≈+0.33 s: quedan ≈0.89 s libres.
- **`expand()`:** `Z` y `ZZ` arman `{ kind: 'obs', type: 'zanja', D, W, plan: 'tap' | 'hold' }` con `W = ancho·speed` y la meten también en `level.zanjas = [{ H0, H1 }]` (H0 = D − W/2 y H1 = D + W/2). Sin zanjas, `level.zanjas` queda vacío.
- **Reglas de unión** (en el generador; el validador las vuelve a probar):
  - **Aterrizaje limpio:** después del salto que cruza la zanja, lo siguiente que mata queda a ≥ `C.zanja.libreSec` = 0.75 s. Nunca una caja, torre, viga, pop-up u otra zanja en la zona de aterrizaje.
  - **Llegada limpia:** del centro del obstáculo anterior a H0 hay ≥ 1.0 s.
  - **Viga:** ninguna de 0.7 s antes de H0 a 0.5 s después de H1. El salto mantenido sube la cabeza a ≈210 y la viga cuelga en 190.
  - **Viento:** ninguna zanja dentro de una zona ni hasta 1 s después. En contra (0.85), `ZZ` deja al mantenido con ≈48 ms de ventana.
  - **Trampolín:** ninguna zanja bajo el vuelo ni en los 0.75 s después de caer (≥ 2.2 s después de un `J`). Cruzarla volando sería gratis, y la caída podría ser dentro.
  - **Timbre:** ninguna zanja dentro de su bloque ni en los 0.75 s después del salto que lo toca.
  - **Pop-up `U`:** a ≥ 1.4 s después de H1 (`popup.minGapBeforeSec`).
  - **Filas `P5` y `OLA`:** no van encima de la zanja. `P5` sí puede ir después de la zona de aterrizaje.
  - **Repisas:** no están en el código. Si regresan, nada de zanjas bajo una repisa.
  - **Checkpoint:** ninguna zanja a menos de 1 s de la orilla de la página.

**4. Justicia (`validar.js`).**
- **Regla nueva V-zanja (muerte por caída):** en cada cuadro en que Moki está en el suelo (`rise === 0`: sin salto, o con el salto ya terminado), si `[dist − pie, dist + pie]` cae completo dentro de algún `[H0, H1]`, devuelve `{ ok: false, cause: 'zanja' }`. El bot **no** usa coyote, para quedar del lado seguro.
- **Cómo apunta:** la zanja es un `obs` con `plan`, así que el bot ya despega con `D − airTravel(plan, v)/2` centrado. En el ciclo de choque se salta como el `tramp` (no tiene caja que choque). Cuenta como "algo que mata" para `sig`, de modo que `caida`, `viento-salida` y `timbre-salida` ya la respetan.
- **`zanja-salida`:** al aterrizar del salto que cruzó una zanja, lo siguiente que mata queda a ≥ 0.75 s. Si no, se vuelve a sortear.
- **Margen de orilla:** el reporte suma `minOrilla`, la menor distancia en px entre el aterrizaje y H1 − pie y entre H0 + pie y el despegue. Sirve para ver qué tan justa queda cada zanja.
- **Pasa:** bot con −40, 0 y +40 ms, en 320, 350, 385 y 420, y en la Vuelta rápida (×1.12, hasta 470), en Reto (30 fechas) y Libre (50 semillas). **Cruza el 100 % de las zanjas.**
- **Prueba del instrumento** (en la prueba de `validar`, no en cada nivel):
  1. El pasivo (`force 'none'`) muere con `cause: 'zanja'` en la primera `Z`.
  2. `force 'tap'` muere en toda `ZZ` a 385 y 420 (no en Vuelta, por la fuga b).
  3. Un bot "tarde" (+70 ms) cae en `ZZ`: la zanja castiga de verdad.
  4. Cada ventana medida queda a ±10 ms de la tabla del punto 2. Si no, se corrige el ancho, no el validador.

**5. Modo Paseo (sin choques).** **Las zanjas se rellenan; no se quitan.** Así el nivel, la semilla y el RNG quedan idénticos a los de la partida normal, y no hace falta generar otro nivel. Con `paseoRun` (y con `god`), `apoyado()` regresa `true` siempre. El hueco se dibuja tapado con un parche de la superficie que ya existe (`groundSurface` encima del tramo) y con el contorno del hueco al 50 % (`paseo.obstacleAlpha`). Se lee como "aquí había hueco y está tapado", igual que los obstáculos atenuados de Paseo. Moki corre encima sin saltar.

**6. Cambios en `RunScene` (para estimar el costo).**
- `apoyado(dist)`: si `level.zanjas` está vacío (Clásico), regresa `true` sin hacer cuentas. Así el Clásico queda idéntico byte a byte en su recorrido.
- En `stepJump` (línea ~1174), la condición `y >= groundY` pasa a `y >= groundY && apoyado()`, con la subida si va ≤ 10 px abajo. Si no hay apoyo, sigue cayendo. Con `y ≥ groundY + 30` se llama a `crash(zanja)`.
- En `crash()` (línea ~1951), la zanja se salta el cálculo de penetración, igual que la viga, porque no tiene `size.width`. La pista de la tarjeta, `fail.hint.zanja`, dice "Brinca antes de la orilla. Si es ancho, mantén.", y pasa por lectura-fácil.
- `bots.js` (el demo) apunta igual que el validador.

**7. Sabremos que estuvo bien si:**
- El bot cruza el **100 % de las zanjas en 50 semillas** de Libre y 30 fechas de Reto, a ±40 ms, en las 4 velocidades y en la Vuelta rápida. Fallback 0 %. Las 4 pruebas del instrumento del punto 4 pasan.
- **Clásico idéntico: bot con 2142 puntos y 78/78.** Sin zanjas, `apoyado()` no cambia ni un cuadro.
- **JS inicial ≤ +600 B gzip.** Estimo ≈550 a 650: config 50, códigos y `expand` 80, bloques 110, reglas del generador 90, validador 110, `apoyado` + caída + `crash` 130, dibujo 130, parche de Paseo 30 y pista 30. Si pasa de 600, primero sale `zanja-caja` y luego la solapa doblada.
- **≥ 55 FPS a 375 en N8 (Hardcore).** Cada zanja se dibuja una vez en un `Graphics` que se mueve con el mundo, y en pantalla hay 2 como mucho.
- **A ciegas, a 375 y a 1280:** un invitado nuevo ve 3 capturas (una `Z` de día, una `ZZ` de noche y una con movimiento reducido) y nombra la zanja como peligro ("hoyo", "hueco", "me caigo") sin pista **en las 3**. Además ve una cuarta de Paseo y dice "tapado" o "se puede pasar".
- **Contraste** con `herramientas/medidor-contraste.mjs`: orilla (contorno claro y canto) contra el fondo del hueco **≥ 2.0**, y el fondo del hueco contra la superficie **≥ 2.0**, de día y de noche.
- Promedio de 3 a 6 zanjas por partida, y F2a, F2b, F3 (F3b = 0) y F6 sin empeorar respecto a master.

**8. Riesgos y qué queda fuera.**
- **Riesgo #1: suma poca decisión.** `Z` funciona como una caja (cualquier salto) y `ZZ` como una torre (mantener). F4 no sube: no hay elección nueva, solo una forma nueva y otra manera de fallar. Lo que aporta es variedad (F1 sube ≈+2 patrones) y un peligro que se entiende al instante en cualquier corredor.
- **Riesgo #2: "mantén para ir lejos" se aprende mal.** Por el coyote y la Vuelta rápida, un toque a veces pasa `ZZ`. Si 2 de 5 personas no notan la diferencia, `ZZ` sale solo en el pico de T4. Si aun así no la notan, se queda solo `Z`.
- **Riesgo #3: caer se siente injusto si Moki "pisa" la orilla y se cae.** Con `pie = 10`, Moki parado en la orilla con medio cuerpo afuera sigue apoyado. Si la gente dice "pisé y me caí", sube `pie` a 14. Las ventanas crecen 8 px.
- **Riesgo #4: el Reto cambia para todos.** Hay que rehacer la línea base de Reto y Libre (15/15 y 10/10) y avisar en la novedad del día.
- **Apagado:** `C.zanja.on = false` quita los bloques sin borrar nada. Clásico y Paseo no dependen de eso.
- **Fuera de este corte:** zanjas dobles (`Z.Z`), zanja con trampolín (cruzarla volando), zanja con viento, zanjas que se abren de pronto (como el pop-up), caer "a otro piso", una pared que se choque dentro del hueco, sonido propio (por ahora usa el de fallo), y que la Vuelta rápida tenga sus propios anchos.
- Va en `config.js`: `zanja: { corto: 0.34, largo: 0.56, pie: 10, caePx: 30, subePx: 10, libreSec: 0.75, retoDesde: 'AAAA-MM-DD', on: true }`.

### 11. Zonas, corte 1 (5-nov)
Invitado de niveles. Sale de MAPA-SISTEMAS #5. Leí el código pero no pude correr nada: ningún número de este punto está medido, salvo los que el director midió en master 827cfd0. Los "≈" son cuentas a mano. Las bases las toma el constructor en el paso 0.

**Idea.** Cada página deja de mezclar las tres mecánicas y se queda con una. No hay arte, sprites, sonidos ni bloques nuevos: solo cambian pesos y reglas de `generar.js`.

**Por qué hoy una página se parece a otra (código).**
- `generar.js` l.88: todas las mecánicas pesan igual (`PESO_MEC` 5) en todas las páginas.
- l.288: cada respiro de T2 a T4 trae un trampolín forzado.
- l.434: castiga a T2 y T3 si no traen timbre.
- l.66 y l.68: los topes (2 de viento, 1 de timbre) ya se llenan con los estrenos (l.268-271). T2 no puede tener más viento que su estreno, aunque quisiera.
- El bioma no ayuda: se baraja con su propia semilla (l.456-461), no se relaciona con lo que pide la página, tiñe poco (k 0.06 a 0.10, salvo cartulina) y su nombre ("Sigue: ...", §8) no está en el código.

**1. Carácter por página.**
| Página | Velocidad | Carácter | Por qué ahí |
|---|---|---|---|
| T1 | 320 | Sin zona. Igual que hoy, con su trampolín si sale. | Ahí vive el tutorial. Quitar el `J` deja T1 solo con `C` y `T`, y el siguiente patrón nuevo llegaría ≈25 s después (F6). |
| T2 | 350 | **Viento** | Ya se estrena aquí. `NO_VIENTO` prohíbe vigas cerca del viento, y T2 no tiene vigas: es la página donde menos estorba. |
| T3 | 385 | **Timbre** (junto a las vigas, que ya pesan doble) | Ya se estrena aquí, y 385 es el máximo del timbre (`vMax`). |
| T4 | 420 | **Trampolín, zanja y ola** | La zanja ya se estrena aquí con todo destrabado (`zanja.js` l.43). El timbre no cabe a 420. |

Quién ve qué (RunScene l.556-557: trampolín en nivel 3, viento en 5, timbre en 9, zanja en Libre si ya bajó su módulo):
| Destrabadas (sin contar zanja) | Nivel | Qué pasa |
|---|---|---|
| 0 | 1-2 | Sin zonas. Nivel idéntico a hoy. |
| 1 (trampolín) | 3-4 | Sin zonas. Nivel idéntico a hoy: una sola mecánica no tiene contra qué contrastar, y quien la acaba de destrabar debe verla pronto. |
| 2 (trampolín, viento) | 5-8 | T2 viento, T3 trampolín, T4 trampolín. |
| 3 | 9+ | T2 viento, T3 timbre, T4 trampolín. |

La zanja no entra en la regla: conserva sus topes, su peso y su estreno.

**Modos.** Clásico no pasa por `generarNivel`. Reto recibe `mecanicas = []`, así que `zonaDe` da `null` y no cambian ni el nivel ni el uso del RNG. Paseo usa el mismo nivel que la partida normal, y las zonas no leen nada de Paseo.

**2. Cambio en `generar.js`.**
```js
const ZONA = { 2: 'viento', 3: 'timbre', 4: 'tramp' };
const PESO_ZONA = 10;  // doble de PESO_MEC; la regla (a) sigue alternando con bloques sin mecánica
const TOPE_ZONA = { viento: 4, timbre: 2 };
export const zonaDe = (tramo, m) => {
  if (tramo < 2 || ['tramp', 'viento', 'timbre'].filter((x) => m.includes(x)).length < 2) return null;
  return m.includes(ZONA[tramo]) ? ZONA[tramo] : m.includes('tramp') ? 'tramp' : null;
};
```
- **`generarTramo`:** `ctx.zona = zonaDe(tramo, mecanicas)`.
- **Filtro de `fill()`:** si hay `ctx.zona`, se descarta el bloque con `b.mec` de `tramp`, `viento` o `timbre` que no sea `ctx.zona`. La zanja pasa.
- **l.66:** tope de viento `ctx.zona === 'viento' ? TOPE_ZONA.viento : 2`.
- **l.68 y l.104:** `nTimbre` pasa a ser contador. Tope `ctx.zona === 'timbre' ? TOPE_ZONA.timbre : 1`. Es una excepción a §9.3 ("máx. 1 por página"), que el director debe aprobar.
- **l.88:** el último factor pasa a `(q.mec ? (q.mec === ctx.zona ? PESO_ZONA : q.peso || PESO_MEC) : 1)`.
- **l.252:** con `ctx.zona === 'tramp'` y `tramo === 4`, la sorpresa siempre es `ola`, sin saltarse el `pick` para que el uso del RNG no cambie. Sin esto, una de cada 4 semillas no estrena nada en T4 cuando no hay zanja.
- **l.288:** el trampolín forzado del respiro solo sale con `!ctx.zona || ctx.zona === 'tramp'`.
- **l.434 (obligatorio):** el castigo de +6 solo aplica con `!zonaDe(i + 1, mecanicas) || zonaDe(i + 1, mecanicas) === 'timbre'`. Si no se cambia, T2 nunca podrá librarlo: agotará los 16 intentos y elegirá peor.

**Sin bloques nuevos:** los 14 que hay bastan. **Sin señal al jugador en este corte:** si la mecánica no se nota por sí sola, un letrero solo tapa el problema, y además falsearía la prueba a ciegas. Si la prueba falla pero FZ1 cumple, la señal de reserva, y solo esa, es cambiar `hud.cp` por "Página de viento", "Página de timbres" o "Página de trampolines" en la l.1478 de `RunScene`, en esas páginas, y repetir la prueba con críticos nuevos.

**3. Sabremos que estuvo bien si.**

**Paso 0, antes de tocar el juego (10 min).**
- `flow-medir.mjs` no conoce la zanja: no la importa, y `Z` truena en `PARTES` (l.135). Por eso los números de hoy no miden el Libre real. Se le agrega, solo con `zanja` en la lista, `await import('../src/zanja.js')`, `Z` y `ZZ` en `PARTES` y un caso sin elección como el de `tramp`. `niveles.mjs` necesita el mismo import.
- Se mide master con `tramp,viento,timbre` y con `tramp,viento,timbre,zanja`.
- Se agregan las métricas de abajo y se anota su base. **Si en master FZ1 ya cumple su meta en T2, T3 y T4, la hipótesis es falsa: se para y se avisa.**

**Métricas nuevas de carácter (en `flow-medir`, sobre `tr.script`, sin `P5`).**
- **FZ1, mecánica propia:** % de eventos de la página que son de su zona. Viento = sufijo `<` o `>`; trampolín = `J`; timbre = `B` o `+B`. Se calcula también en master, con la misma tabla `ZONA`.
- **FZ2, página contra página:** cada página es un vector de % por tipo (caja, torre, viga, pop-up, salto largo, ola, trampolín, viento, timbre, zanja). FZ2 es la distancia promedio entre T2, T3 y T4, con `0.5 × Σ|a − b|` (0 = iguales, 1 = nada en común).

| Vara (Libre, 3 mecánicas, 50 semillas, salvo que se indique) | Hoy | Meta |
|---|---|---|
| FZ1 T2 / T3 / T4 | por medir (≈15 / 8 / 12 a mano) | **≥ 25 / 12 / 20** |
| FZ2 | por medir | **≥ base × 1.3** |
| F1 | 10.93 | ≥ 9 (vara 7) |
| F2a / F2b | 4.5 / 4.63 | ≤ 4.5 s / ≤ 12 % |
| F3 / F3b | por medir | ≤ 4 s / 0 |
| F4 | 22.64 (mín. 18.5) | promedio ≥ 20, mínimo ≥ 17 |
| F6 | 19.36 | promedio ≤ 24, máximo ≤ 30 |
| Tiempo de `generarNivel` en Node | por medir | ≤ base × 1.5 (cada rechazo vuelve a correr el validador) |
| JS inicial | - | **≤ +300 B gzip** (≈200 a 260 a mano) |

**Justicia y modos.**
- **Bot:** `niveles.mjs` con 50 semillas, con `tramp,viento`, con `tramp,viento,timbre` y con esas 3 más `zanja`. Las dos rutas pasan a −40, 0 y +40 con holgura ≥ 4 px. Pasivo, solo toque y solo mantener mueren. Respaldo 0.
- **Idénticos a master:** Clásico (2142, 78/78) y Reto (2362). Además, los `entities` serializados de 30 fechas de Reto y de 30 semillas con `[]`, `['tramp']` y `['zanja']`. Esta comparación vale más que los puntajes.
- **T1 con 3 mecánicas:** su guion en el intento 0 es igual al de master.
- **Paseo:** una partida en Libre con `?mec=tramp,viento,timbre` llega al final sin choques.

**Prueba a ciegas (3 críticos nuevos, según `moki-gauntlet-a-ciegas`).**
- **Qué ven:** dos juegos sin etiqueta, A (master) y B (zonas), con la misma semilla, otra para cada crítico. De cada uno, T2, T3 y T4 en desorden, con 6 capturas a 375 por página, una cada 5 s, sacadas con el bot y en headless.
- **Qué se les pregunta:** (1) "En una frase, ¿qué te pide cada página que no te piden las otras?". (2) "Del 1 al 10, ¿qué tanto se sienten como lugares distintos las páginas de este juego?".
- **Pasa si:** al menos 2 de 3 críticos nombran el elemento correcto (rachas o viento, campana, trampolín) en al menos 2 de las 3 páginas de B, **y** B le gana a A por 2 puntos o más en al menos 2 de 3. La diferencia menor a 2 no cuenta.
- **Límite:** las capturas miden si se distingue, no si se siente fresco. Eso solo lo dice jugar: cierra Jorge con `?mec=tramp,viento,timbre`.

**4. Riesgos.**
- **Quién lo ve (el mayor).** La primera partida es Clásico (RunScene l.549) y el modo por defecto es Reto (l.57). Este corte solo llega a Libre desde el nivel 5. Si el "monótono" de Jorge viene del Reto, esto no lo arregla. Para eso ya está la pieza del Reto en 4 fases (DECISIONES 1-nov). El Reto con zonas queda fuera de este corte, porque pide que las mecánicas salgan para todos, y eso lo decide el director.
- **Orden fijo.** Viento, timbre y trampolín siempre en ese orden se aprende, pero también se predice. Dentro de cada página el sorteo sigue variando. Barajar el orden es otro corte, porque choca con `vMax` y con los estrenos.
- **F4 baja.** T2 se queda sin trampolín ni timbre, y el viento no da elección. A mano queda ≈1 punto abajo. Si queda bajo 20, se devuelve el trampolín al respiro de T2.
- **Más rechazos.** Más viento choca con `NO_VIENTO` y más trampolines con las reglas de la zanja. Eso puede dar más intentos, respaldos o tiempo. Si pasa, `TOPE_ZONA.viento` baja a 3 y `PESO_ZONA` a 8.
- **T4 demasiado dura.** A 420 se juntan ola, zanja y trampolín. Si un crítico o Jorge lo marca, sale el `tramp-doble` de T4.
- **Timbre repetido.** Dos por página cansan si se lee como viga (§9.7). Si pasa, el tope regresa a 1.

**Si se pasa de 90 min, se recorta en este orden:**
1. Tope de timbre: regresa a 1. T3 se queda con su estreno y sus vigas.
2. `ola` forzada: fuera, y se anota el F6 de las semillas sin ola.
3. Tope de viento de 4 a 3.
4. FZ2: se reporta sin meta.
5. La prueba a ciegas pasa a la siguiente vuelta, con la pieza **sin integrar**.

No se recorta: el filtro por zona, las l.288 y l.434, FZ1, el bot y la comparación de idénticos. `C.zonas = false` lo apaga todo sin borrar nada.
