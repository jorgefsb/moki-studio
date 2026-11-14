# Cinta, corte 1, y "un número por cosa" (invitado diseñador, 14-nov-2026)

Solo texto. Leído en src/: RunScene.js (collect, score, showPago, cobrarCinta, setPieceLabel), art/cinta.js, config.js. Nada se ejecutó ni se midió: donde digo "sin medir", falta medir.

## 0. Por qué P36n no cuadraba (causa, no síntoma)

En master hay TRES unidades en pantalla y ninguna es "el contador":
- El contador del HUD (`pieceLabel`) muestra `this.pieces`: piezas recogidas, +1 por pieza.
- Lo que flota (`+12`, `+5`, `x2 +8`) son puntos de papel (`pieceValue`): bono del arco + pieza con racha.
- El puntaje real es `metros + 10 * pieceValue` y no se ve en partida.
P36n cambió el texto de uno a la vez (píldora, tarjeta) y por eso el ciego siempre encontraba otro que no cuadraba. Vuelta 3: contador +7 con "A ras +5" (5 de bono + 2 de pieza con racha x2), y "x2 +8" no movía nada porque resume puntos YA contados. El chip "x2 +N" es el peor: suma otra vez lo que ya sumó.

## 1. Un número por cosa

REGLA ÚNICA: el contador del HUD es `pieceValue` (puntos de papel). Todo número que flota es el salto de ese contador en ese cobro: `delta = pieceValue_después - pieceValue_antes`, medido dentro de `collect()`. Un cobro = un contador que sube = un flotante (o ninguno). Nunca un número que no sea un delta.

| Fuente | Qué se muestra | Dónde |
|---|---|---|
| Pieza normal (x1) | Nada flota; el contador sube 1 y brinca | HUD derecha |
| Pieza con racha x2/x3 | Nada flota; el contador sube 2 o 3; el chip "xN" ya existe junto al contador (`setPieceLabel`) y explica el salto | HUD derecha |
| Pieza ámbar | Nada flota; sube 5 x mult | HUD |
| Bono arco alto ("Arriba") | UNA píldora = delta completo del cobro (bono x cinta + la pieza que lo cierra con su racha). Ej. "+15", no "+12" | Sobre la cabeza de Moki (`showPago`) |
| Bono arco a ras ("A ras") | Igual: UNA píldora = delta completo. Ej. "+7", no "+5" | Adelante de Moki (`pagoX` +80) |
| Cinta de racha de piezas (x2/x3 al cortar, cinta.js) | SE CALLA la cifra: queda solo "x2"/"x3" (el multiplicador que hubo), sin "+N". El valor ya está en el contador | Punta de la cinta / sobre Moki |
| Cinta de horquillas (nueva, corte 1) | Un solo sufijo de multiplicador en la píldora del bono: "Arriba x2  +24". El número es el delta | La misma píldora |
| Contador de piezas (cuenta) | Deja de ser el HUD. `pieces` queda interno para Cuaderno y logros (`maxPieces`, piezas15/30/50) | finalData, Cuaderno |
| Tarjeta final | Fila "Piezas" -> mismo número que el HUD (lo probó P36n: 180 = 180). Nómbrala "Papel" o deja "Piezas"; lo importante es que sea idéntica | Tarjeta fallo y final |
| Puntaje (metros + 10 x papel) | Sin cambio: sale al final con su récord | Pantalla final |

Qué se fusiona: bono del arco + pieza que lo cierra (un cobro, una cifra). Qué se calla: el "+N" de la cinta x2/x3 (resumen duplicado). Qué cambia de unidad: el contador pasa de monedas a puntos de papel.

Consecuencia honesta: el contador ahora salta más rápido y una "partida de 40 piezas" se ve como ~60-120. Los logros "junta 15/30/50 piezas" cuentan monedas y el contador ya no. Riesgo de que un jugador lea "logro 15" contra un HUD en 40. Sin medir. Mitigación barata: el texto del logro no dice "en el contador", y la sonda (§3) revisa la copia i18n de esos tres logros antes de integrar.

## 2. Corte 1 de Cinta (≤ 3 h de constructor)

Cinta de horquillas = racha de horquillas subidas seguidas. NO se llama cinta en pantalla para no chocar con la cinta de piezas (cinta.js, que es la racha de 0.9 s). Se queda como estado interno `hqRacha` y se ve solo como "x2/x3" en la píldora del bono.

Qué cambia:
1. Estado `this.hqRacha` (0 al iniciar intento; se reinicia al morir y al reintentar; no se guarda en checkpoint: no castiga, solo no regala).
2. En `collect()`, al cerrar un arco ALTO: `this.hqRacha += 1`; multiplicador `m = hq.steps` (1.ª subida x1, 2.ª seguida x2, 3.ª o más x3). El bono es `C.arcBonusAlto * m`. Al cerrar un arco A RAS: `hqRacha = 0`, bono sin cambio (5). Al chocar (`cobrarCinta(false)` en la muerte, línea ~2604): `hqRacha = 0`.
3. Nada se quita: ni puntos ya ganados ni el contador. Solo se deja de ganar de más.
4. Sin avión de papel, sin sprite nuevo, sin cinta nueva dibujada (eso es vuelta 2 si el corte funciona).
5. `showPago` y el aviso de la cinta de piezas reciben el delta ya calculado; se quita el "+N" de `Cinta.cobrar`.
6. HUD: `pieceLabel` muestra `pieceValue`; tarjeta con la misma cifra; `pieces` sigue en `finalData`.
7. Medición (2 enteros): `detalle.horqArriba` y `detalle.horqSeguidas` (racha máxima) junto a lo que P36m ya manda (`horq`, `altos`).

Archivos: `src/config.js` (nuevo `hq: { steps: [[1,1],[2,2],[3,3]], on: true }`), `src/scenes/RunScene.js` (collect, reset, muerte, setPieceLabel, showPago, labels del HUD/tarjeta), `src/art/cinta.js` (texto sin "+N"), `src/ui/ui.js` o donde se pinta la fila de la tarjeta, `src/i18n.js` si cambia el nombre de la fila. No tocar cuaderno.js ni logros.js (condición 2 del director en P36n; se verifica con `git diff`).

Valores en config: `hq.steps` arriba; `hq.on: true` como interruptor para apagar sin revertir. Cap en x3 (pago máximo por horquilla 36, el 3x que prometió la cartera). El primer arco de la 1.ª partida (P36k) vale x1 siempre: el jugador nuevo ve "Arriba +12" tal cual.

Peso: tope +800 B gz en el index (corte 1 sin sprite). Referencia real: P36n solo cambiar textos costó +66 B gz (+73 total); la cartera estimó +1.5 a 2 KB para cinta con sprite y avión, que aquí no entran. Si pasa de +800, avisar al líder ANTES de recortar o tocar otro código (regla de tope).

Qué se quita: el "+N" de la cinta x2/x3 y la cuenta de monedas como cifra del HUD. No se agrega ningún elemento a la pantalla.

## 3. Sabremos que estuvo bien si

Medibles por sonda/bots (antes de integrar, con flock, uno a la vez, sin ROJO):
1. Cuadre: la sonda de pago (la de P36n, 12/12/12 y 5/5/5, ampliada) cobra CADA ruta: arriba x1, arriba x2, arriba x3, a ras, pieza x2, pieza x3, ámbar, cierre de cinta de piezas. Pasa si el número flotante = delta del contador en el 100 % de los cobros (N >= 40, a 390 y a 1280), y ningún flotante ni chip trae un número que no sea delta (revisar texto: el chip x2/x3 no lleva dígitos tras la x).
2. Tarjeta: fila de papel = HUD final en 100 % de las partidas de la sonda (3 de 3 a 390 y 1280).
3. bots-p15 sin regresión en lo que NO es puntaje: metros medianos y causa de muerte dentro del ruido. El puntaje sube por diseño, no cuenta. Ruido aún sin medir: correr master dos veces primero y fijar la tolerancia con eso (propongo +/- 3 % de los metros medianos, a confirmar contra el ruido).
4. Ciego 3 invitados con tira del cobro y la pregunta "¿qué cuenta cada número?": 0 de 3 dicen "no cuadra". Si hay uno, el corte se descarta sin vuelta 5 (misma regla de P36n).
5. Consola 0, sin encimes (sonda p36lb), `git diff` sin tocar cuaderno.js ni logros.js, peso <= +800 B gz.
6. Tras publicar (semana 1, con P36m ya en master): horquillas subidas por partida >= 2X del valor de hoy (X = tasa de subida de P36m x horquillas por partida; hoy sin medir, §4 lo mide). Se mata si a ras sigue pasando de 80 % de las horquillas.

Riesgo para jugadores nuevos (27 de 150 en su 1.ª partida):
- Miedo a perder multiplicador y refugiarse a ras: la racha no quita puntos, solo deja de regalar; x2 empieza en la 2.ª horquilla seguida; la 1.ª partida siempre paga x1. Medición: tasa de subida de la 1.ª horquilla de nuevos no baja contra master (P36m).
- Contador más rápido que su memoria: ver §1, logros por piezas. Medición: ciego de nuevo sin localStorage preguntando "¿cuántas llevas?".
- Récords: los récords guardados se rompen más fácil (el bono sube hasta 3x). No se reescriben; se avisa en la bitácora. Sin medir cuánto.

## 4. Paso 1 barato (puede parar todo antes de gastar constructor)

Costo: 0 de constructor. Con el beacon P36m ya en master, sacar de las partidas de 7-14 nov, solo lectura:
- Horquillas vistas por partida (mediana y p75) y tasa de subida p = altos / horq.
- Por cuenta: P(2 seguidas) ~ p^2 y P(3 seguidas) ~ p^3 (aproximación, no es independencia real).
PARAR (o rediseñar a "cada subida paga +1 al bono" sin racha) si pasa CUALQUIERA de estas:
- la mediana de horquillas por partida es menor que 3: no hay material para una racha;
- p < 0.35: casi nadie vería x2 (menos de ~12 %) y la cinta sería decoración;
- la partida mediana dura menos de ~25 s y la 2.ª horquilla casi no llega.
Si no hay horquillas por partida en los datos (la mayoría de las 159 eran Reto/Clásico y no todas tienen horquilla), el paso 1 es contarlas en `niveles/generar.js` y `bloques.js` por modo, también en lectura. Los umbrales (3, 0.35, 25 s) son mi criterio, no medida: se ajustan si el dato dice otra cosa.
Paso 1b (10 minutos, antes de construir): lista de cobros posibles (arriba, a ras, pieza x1/x2/x3, ámbar, cierre de cinta, meta) y el delta esperado de cada uno, escrita en la nota de la rama: es la tabla de la sonda de §3.1.

Lo que no sé: cuántas horquillas ve una partida típica, si el cierre de un arco coincide con piezas de racha en el mismo cuadro (el delta lo cubre, pero la píldora se vería "+15" y no "+12") y si el contador en puntos asusta. Se sabe solo midiendo.
