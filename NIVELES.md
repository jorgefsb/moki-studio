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
**Reto del día:** sigue igual para todos, así que no usa mecánicas destrabadas (dependen del nivel de cada quien). Las mecánicas salen en Libre. `generarNivel(seed, modo, { mecanicas })` filtra los bloques por su campo `mec`. Pregunta para el director: ¿el Reto suma el trampolín para todos cuando cumpla una semana? Recomiendo que sí.

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
