# Bitácora del Cook 1: «Que se vea como juego publicado»

Inicio: 2026-11-16 10:05 MX (16:05Z). Tiempo: piso 6 h (16:05 MX) | tope 10 h (20:05 MX)
Barra (0-10, crítico sin contexto, mediana): composición 8.5 | luz y atmósfera 8.5 | profundidad 8.5 | color 8.5 | lectura de Moki y obstáculos 8.5 | movimiento 8.5. Más el ciego 3/3 rama contra master.
Calibración: ninguna aún (manda el número de Jorge cuando lo dé).
Puerta: stills aprobados por Jorge [no] | video final 10 s [no empezado]
Mejor hasta ahora: ronda 00 = master 8b97696 (línea base)

## Arnés
- Stills: `flock /tmp/moki-pesado.lock node herramientas/cook-stills.mjs <url> cook/stills/rNN 1280x720` (reloj falso pauseAt, azar sembrado, bot 'adjust'; S01-S06 = sc.t 6, 19, 36, 49, 66, 80 s; M1-M6 = movimiento cada 100 ms desde 11 s). A/A medido: 12/12 PNG idénticos por md5 (16-nov 10:03).
- Lado a lado: `node .claude/skills/cook/scripts/side-by-side.mjs --out cook/compare/rNN/todas.jpg cook/refs/R01.png cook/stills/rNN/S01.png ...` y la tira de movimiento con ffmpeg (hstack/vstack 3x2).
- Referencias: cook/refs/R01-R06 = referencias/altos-odyssey/stills/ (press kit oficial; solo local, sin versionar, nunca se publican).
- Críticos: 3 subagentes Sonnet de contexto cero, solo imágenes y rúbrica; mediana por punto.

## Decisiones
- 10:00 Defaults de intake confirmados por el líder: capturas solo locales; «ningún asset externo» manda; rúbrica a 1280x720 y 390x844 solo FPS, lectura y UI; 3 páginas = tramos 0-2 de ?ir=primera; ciego final con 3 críticos Sonnet.
- 10:05 Tomas en tiempos de juego fijos de la 1.ª partida (no en eventos), porque el cook compara escenario y luz, no efectos de un evento.
- 11:20 (constructor, r01) La luz va en un módulo propio, src/art/luz.js, montado sobre las capas pintadas (envuelve capas.colocar) en el chunk diferido del atardecer: el JS inicial no crece y con st = 0 nada existe. Se pinta ENCIMA de los webp con velos (copia de la capa con setTintFill) y bandas de degradado, en vez de repintar los webp: es reversible con LUZ.on = false.
- 11:20 (constructor, r01) Los «pinos translúcidos» eran los recortes sueltos de la capa media de código (stepMidProps), que seguían dibujándose con la capa media oculta detrás de los pinos pintados. Se apagan cuando s.mid no se ve. Fuera de las capas pintadas no cambia nada.
- 11:20 (constructor, r01) Niebla al pie de los pinos apagada (alfa 0): aclaraba justo detrás del traje y le quitaba valor a Moki. Lo que separa a Moki es bajar los pinos a café-tinta y un borde de luz.
- 19:15 (constructor, r05) Ciudad y Playa repintadas EN SUS CAPAS (paisajes.js, TRAMOS), no con velo. Ojo: la textura lejana de la Ciudad (paisaje1_lejos) y las capas de la Playa (paisaje2_*) las comparten sus variantes de otra hora (cA, cB, pA, pB) en otros niveles; esas variantes también cambian. No se revisaron en stills.
- 19:15 (constructor, r05) Al repintar, los velos de la tabla ATM se bajaron (Ciudad 0.15, Playa bruma 0.18). La banda honda de la Playa sube encima del mar cercano (profundidad d + 0.0012); abajo de la capa media no se veía nada (en r03 y r04 tampoco se veía, por eso «el mar no cambia»).
- 17:30 (constructor, r04) Primer plano de matas QUITADO. En r03 eran lomas rellenas (manchas o agujeros); en r04 pasaron a pasto en abanico y se leyeron como arbustos de hoja ancha a 1280 y casi invisibles a 390. Mejor sin primer plano que con agujeros (foco del director).
- 17:30 (constructor, r04) Elipse detrás de Moki QUITADA, medida con números (traje L 0.29, mediana del anillo de fondo, contraste de luminancia): master S01 1.86 / S02 1.25; aire claro r03 1.36 / 1.10, r04a 1.12 / 1.23; sombra oscura r04b 2.88 / 1.65, pero el invitado la vio como «aura» que ensucia el pino. Sin elipse (r02 y r04): S01 2.38, S02 1.01. Acortar la niebla de valle no movió S02 (1.01), así que lo que queda detrás del traje en S02 no viene de la niebla; queda abierto.
- 17:30 (constructor, r04) La franja café dura de abajo a 390 en S03 y S05 viene de master: la rama y r00b-master-390 son idénticas pixel a pixel en y 784-844 (MAE 0). Línea base vertical nueva: cook/stills/r00b-master-390.
- 13:20 (constructor, r02) ARNÉS: los stills de r00 y r01 tenían el fondo CONGELADO. El bot llama a update(0, DT) a mano y Phaser no emite 'postupdate', que es donde se colocan capas pintadas, luz, bokeh, hojas, vida y paisajes: entre M1 y M6 el suelo no se movía ni 1 px, y S01-S06 mostraban el fondo del arranque. Además la Playa (página 3) nunca se horneaba, porque se hornea en ratos libres (requestIdleCallback) y el bot no deja ninguno. Se arregló en herramientas/cook-stills.mjs (emite postupdate cuando a === 0 y hornea los 4 paisajes antes del bot), no en src/. Nueva línea base de master con el arnés arreglado: cook/stills/r00b-master. Las notas de r00 y r01 sobre movimiento y sobre que las 6 tomas son el mismo fondo salen de ese defecto.
- 13:20 (constructor, r02) Paralaje: el juego ya estaba escalonado (cielo 0.03, cerros 0.3, pinos 0.6, suelo 1.0). A 320 px/s en 500 ms son 5, 48, 96 y 160 px. Se agregan los pinos cercanos (0.82, 131 px) y las matas de tinta (1.5, 240 px; medido 213 px entre M1 y M6).
- 13:20 (constructor, r02) La hora fría de la página 2 se probó (r02a) y se QUITÓ: con el arnés arreglado, la página 2 de la 1.ª partida es la Ciudad y la 3 es la Playa (paisajes.js, RUTA[0] = 0, c, p, n), que ya son otro lugar. El azul sobre los edificios cálidos daba tres temperaturas peleadas. La luz de luz.js queda solo en la página 1. Los pinos cercanos y el suelo a tinta, que van encima de la pila del paisaje, se recortan al borde de la hoja que entra.
- 11:40 (constructor, r01) Borde de luz de Moki: PROBADO Y QUITADO. Una copia de la pose teñida (setTintFill y luego silueta dura de la tira) detrás de Moki salió como bulto crema grande junto a espalda, mano y casco (invitado con recortes x3, r01 contra r01b), no como contraluz de 1.5 px. Sin causa raíz todavía (sospecha: cuadro o escala de la copia no coincide con la pose). Va a la ronda 02 si el foco sigue en la lectura de Moki; la ronda 01 sale sin borde.
- 11:20 (constructor, r01) Texturas de degradado en 3x250 (no potencia de 2): la de 4x256 repetía y dejaba rayas de 1 px en el borde de cada banda (y 106 y 322 en r01b).
- 10:59 MODO AHORRO hasta jue 19-nov 11:00 (Jorge vía Spark): 1 crítico por ronda, máximo 1 ronda cada 2 h, ninguna de 22 a 8 h; constructor en Sonnet desde la ronda 02 (Opus solo si Sonnet falla 2 veces). El piso de 6 h y el tope de 10 h se leen como horas de reloj del cook, no de trabajo continuo.

## Comentarios de Jorge
(ninguno aún)

---
## Ronda 00 (línea base: master 8b97696)

Hora: 10:03 a 10:12 MX | transcurrido 0.1 h
Foco: medir de dónde partimos.
Stills: `cook/stills/r00-master/` | Lado a lado: `cook/compare/r00/todas.jpg`, `movimiento.jpg`

Calificación a ojo, mediana de 3 críticos Sonnet de contexto cero (sin calibrar):

| Toma | Comp | Luz | Prof | Color | Lectura |
|---|---|---|---|---|---|
| S01 | 5.5 | 4.5 | 5.5 | 6.0 | 5.0 |
| S02 | 5.0 | 4.0 | 5.0 | 5.0 | 5.0 |
| S03 | 5.5 | 5.0 | 5.5 | 6.5 | 5.5 |
| S04 | 5.0 | 3.5 | 5.0 | 4.0 | 5.0 |
| S05 | 5.0 | 3.5 | 5.0 | 4.5 | 5.0 |
| S06 | 5.5 | 4.0 | 5.0 | 5.5 | 5.0 |
Movimiento: 4.5 (4.5, 4.5, 5.0).

Lo que dijeron los 3 sin ponerse de acuerdo antes: (1) el más flojo es luz y atmósfera: no hay fuente de luz (sol o luna con halo), no hay neblina por distancia y las 6 tomas son el mismo naranja de mediodía, «un solo fondo de pantalla»; (2) profundidad: capas casi del mismo valor, sin primer plano oscuro que enmarque y sin capas lejanas aclaradas hacia el cielo; los pinos translúcidos «parecen error de alfa»; (3) Moki naranja sobre fondo naranja se pierde: falta contraluz o borde y separar el valor detrás; (4) movimiento: el paralaje casi no se nota y la estela es una barra rígida. Fuera del cook (UI y mecánica): letreros «Arco alto +15», píldora «Si chocas…», tamaño de Moki y el ciclo de correr.
Siguiente foco: luz y atmósfera de la página 1 (S01-S02): guion de hora por página, sol con halo, neblina por distancia y valores por capa.

---
## Ronda 01 (constructor): luz y aire de la página 1

Hora: 10:30 a 11:30 MX | Rama v2/cook-mundo | Stills: `cook/stills/r01/`, `cook/stills/r01-390/` | Iteraciones internas r01a, r01b, r01c (descartadas, en disco)
Qué cambió: `src/art/luz.js` (nuevo) y una línea en `src/art/atardecer.js` que lo monta; `src/scenes/RunScene.js` stepMidProps (fantasmas fuera).
- Sol: disco casi blanco (r 60) con borde que se funde, halo aditivo de 2.6 r y resplandor aditivo de 0.7 del alto de pantalla, más adentro que la mancha vieja y apenas sobre la cresta.
- Cielo: baja a vino arriba (#7E3A3C al 62 %, hasta el 55 % del alto) y banda clara pegada al horizonte.
- Capas: cerros lejanos con velo del color del aire (#FFC584 al 60 %), niebla de valle entre cerros y pinos, pinos bajados a café-tinta (#3C1A0E al 30 %).
- Primer plano: el suelo baja a tinta hacia abajo (al 74 %; en vertical al 60 %, si no era un bloque negro).
- Moki: sin borde de luz (se probó y salió mal; ver Decisiones). Lo separa el valor: pinos a café-tinta y sin niebla clara detrás de él.
Lectura de los invitados Sonnet internos (no son los críticos del director): S01 subió de ~5 a ~7 en luz, color y lectura. Lo que sigue flojo: pinos medios y cercanos con el mismo valor, el sol sin brillo que se derrame sobre cerros y copas, y las nubes pintadas con cortes secos (son del webp del cielo y no se tocaron).

### Guion de hora de las páginas 2 y 3 (sin pulir, para la ronda que toque)
Mecánica propuesta: `LUZ.horas[tramo]` con las mismas perillas de arriba (cima, horizonte, resplandor, sol, velos y niebla). En la costura de página se mezclan en 5 s (lerp de color y alfa por cuadro, 0 objetos nuevos). Las capas pintadas (webp) se tiñen con setTint hacia la hora (multiplicar no cuesta). TARDE.horaFija sigue en true: es la luz encima la que cambia, no el ciclo de Ambient.
- Página 2 (tramo 1, mediodía con bruma fría): cima #2E6191 al 55 %; horizonte #EAF8FF; sol blanco #FFFFFF r 46 más alto (sobre 300) con doble halo celeste #BFE0EA; velo de cerros #A8D0E6 al 70 % (la atmósfera se come el valor); pinos con tinte #28372E; capas pintadas setTint #C8DCE8 (enfriar el ámbar); niebla de valle #BFE0EA. El naranja de Moki y el kraft ganan por temperatura. Lluvia fina de la receta 8 queda para después.
- Página 3 (tramo 2, crepúsculo a noche): cima #1F2250 al 80 %; banda violeta #8B5E96; horizonte #D98A8F al 15 % del alto; luna #E9E6F5 con halo #6A6FB8 al 35 % en lugar del sol; capas pintadas setTint #6A6FB8 (cerros) y #3A3460 (pinos); suelo a L 25 con canto crema intacto; 80 estrellas en una textura y 3 grupos de parpadeo; fichas con halo aditivo de 6 px solo aquí; borde de luz de Moki en lila claro.
- Riesgo a medir: los obstáculos (#452B1C con canto crema) contra pinos azul-noche: se necesita la sonda de contraste de ARTE 2.0 en cada hora.

## Ronda 01 · críticos (director)

Commit e5884e4. Lado a lado: cook/compare/r01/todas.jpg y movimiento.jpg. 1 crítico Sonnet de contexto cero (modo ahorro), a ojo, sin calibrar:

| Toma | Comp | Luz | Prof | Color | Lectura | vs r00 (mediana de 3) |
|---|---|---|---|---|---|---|
| S01 | 5.0 | 6.0 | 4.0 | 5.5 | 6.0 | luz +1.5, lectura +1, prof −1.5 |
| S02 | 4.5 | 5.5 | 3.5 | 4.5 | 6.0 | luz +1.5, lectura +1, prof −1.5 |
| S03 | 5.5 | 6.5 | 4.5 | 6.0 | 6.0 | |
| S04 | 4.5 | 3.5 | 3.5 | 3.5 | 5.5 | |
| S05 | 5.0 | 5.0 | 3.5 | 4.5 | 6.0 | |
| S06 | 5.0 | 5.5 | 3.5 | 4.5 | 5.5 | |
Movimiento: 4.0.

Ojo: un solo crítico; la baja de profundidad puede ser ruido de crítico (r00 tuvo 3). Lo que sí es claro: luz y lectura subieron en la página 1. Lo más flojo ahora: profundidad (pinos medios y cercanos son una sola masa café; no hay primer plano casi negro; el crítico dice que en 600 ms las capas no se mueven) y que las 6 tomas son el mismo fondo.
Foco ronda 02: profundidad de la página 1 (partir la masa de pinos en 2-3 valores con aire entre ellas, silueta cercana oscura propia, revisar con números que el paralaje de cada capa se mueva) y aplicar el guion de hora a la página 2 (S03-S04) para que deje de ser el mismo fondo.

---
## Ronda 02 (constructor): profundidad de la página 1 y arnés

Hora: 13:00 a 14:00 MX | Commit en v2/cook-mundo | Stills: `cook/stills/r02/`, `r02-390/` | Master con el arnés arreglado: `cook/stills/r00b-master/` | Lado a lado: `cook/compare/r02/todas.jpg`, `movimiento.jpg`
Qué cambió: `src/art/luz.js` (pinos cercanos, matas de tinta, recorte al borde del paisaje, sol más alto) y `herramientas/cook-stills.mjs` (postupdate y horneado de paisajes; ver Decisiones r02).
- Pinos en dos planos: los lejanos (capa_medio de siempre) toman aire (#F0B07A al 30 %). Los cercanos son una copia de la misma capa a 1.45x, corrida para no calcar el dibujo, con paralaje 0.82 y café-tinta #6A3A26 al 72 %. Nunca quedan más oscuros que la caja.
- Primer plano propio: matas, pasto alto y piedras en silueta café-tinta, abajo de la línea del suelo +10 px (nunca entran a la banda de juego), a 1.5x. Solo en la página 1.
- Páginas 2 y 3: son la Ciudad y la Playa. La franja de abajo de S03, S05 y S06 es igual a master pixel a pixel (MAE 0).
Invitado Sonnet interno (1 solo, en las 3 vueltas): S01 rama 8 / 8 / 7.5 / 7.5 / 7.5 contra master con el arnés arreglado 7 / 6.5 / 7.5 / 8 / 8.5 (comp / luz / prof / color / lectura). Movimiento: rama 7.5 y master 6.5.

---
## Ronda 02 · críticos (director)

Commit a4710de. El arnés estaba congelando el fondo en r00 y r01 (no se emitía postupdate y la Playa no se horneaba); los arregló el constructor y la línea base honesta es `cook/stills/r00b-master`. Las notas de r00 y r01 no se comparan con estas.
1 crítico Sonnet de contexto cero (modo ahorro), a ciegas: X = r02, Y = r00b-master; la clave se abrió después de su respuesta. A ojo, sin calibrar.

| Toma | r02 Comp/Luz/Prof/Color/Lect | r00b-master |
|---|---|---|
| S01 | 5 / 6 / 6 / 6 / 7 | 4 / 6 / 4 / 6 / 7 |
| S02 | 5 / 6 / 6 / 6 / 7 | 4 / 6 / 4 / 6 / 7 |
| S03-S04 | 4 / 4 / 3 / 4 / 6 | idénticas |
| S05-S06 | 3 / 4 / 3 / 5 / 6 | idénticas |
Movimiento: r02 6, master 5. Prefiere r02, confianza media (solo la página 1 cambia; profundidad +2 y composición +1).

Defectos de r02 según el crítico: (1) Ciudad y Playa (S03-S06) muy por debajo de la referencia: pared de cajas marrones de un solo valor, playa como muro azul plano, sin sol, sin niebla, sin capas que se pierdan en bruma. (2) Página 1: el primer plano de matas casi no se lee; falta encuadre con siluetas oscuras grandes a los lados; el suelo es una línea recta. (3) Página 1: el sol es un parche difuso sin disco; pinos de un café casi igual al cielo; la separación de planos es solo por opacidad. Master hace mejor: suelo de papel rasgado más claro y con textura; pinos más suaves que dejan el cielo limpio.
Coincide con lo que el constructor marcó como más flojo (lectura de Moki contra pinos cercanos, sol tras el pino, Ciudad y Playa planas).

Foco ronda 03: atmósfera de la Ciudad y la Playa (las 4 de 6 tomas en 3-4 de profundidad y luz): sol o fuente de luz con disco, bruma entre planos que aclare hacia el cielo y al menos 3 valores por paisaje. En la página 1, poco: disco al sol con hueco fijo y pinos cercanos más claros en la franja de Moki.

---
## Ronda 03 (constructor): aire y luz de la Ciudad y la Playa

Hora: 15:00 a 16:00 MX | Stills: `cook/stills/r03/`, `r03-390/` (iteraciones r03a y r03b en disco) | Lado a lado contra r00b-master: `cook/compare/r03/todas.jpg` (izquierda master, derecha rama), `movimiento.jpg`
Qué cambió:
- `src/art/paisajes.js`, tabla ATM, solo los lugares base c y p (sus variantes de otra hora y la Noche no cambian). Encima de cada pila de paisaje, recortado a su hoja:
  - Ciudad: conserva su sol nítido con un resplandor aditivo tenue, velo del color del horizonte sobre los edificios lejanos (solo sus formas), velo ligero sobre las casitas y niebla baja entre planos.
  - Playa: sol con resplandor arriba del horizonte, bruma que sube del mar al cielo sin borde, el agua cercana se oscurece hacia abajo y niebla baja.
- `src/art/luz.js` (página 1): el sol queda en un hueco fijo (x 0.62, arriba de las copas de los pinos cercanos) y ya no viaja con la mancha vieja. Lleva aire claro detrás de Moki, una elipse fija en pantalla bajo cajas y Moki.
Decisiones:
- r03 Ciudad: nuestro disco grande se leía «mancha beige» contra el disco nítido de master, así que se queda su sol y solo se suma resplandor (0.16).
- r03 Playa: con la bruma en un solo degradado (alfa 1 arriba) quedaba un borde duro sobre el cielo; ahora sube del horizonte al cielo con el mismo alfa, sin escalón.
- r03 «3 valores» en la Ciudad: lejos se aclara bien; las casitas y la banqueta siguen casi en el mismo café (el velo de 0.2 sobre las casitas no alcanza a separarlas).
Invitado Sonnet interno (1 solo, en 3 vueltas), rama / master (comp, luz, prof, color, lectura):
- S01: 7/8/7/7/7 contra 6/6/6/6/7.
- S03: 6/6/6/6/7 contra 6/5/5/6/7.
- S05: 6/6/5/6/8 contra 5/3/4/6/8.

---
## Ronda 03 · críticos (director)

Commit c859522. 1 crítico Sonnet de contexto cero (modo ahorro), a ciegas: X = r00b-master, Y = r03 (orden invertido contra la 02); clave abierta después. A ojo, sin calibrar.

| Toma | r03 Comp/Luz/Prof/Color/Lect | r00b-master |
|---|---|---|
| S01-S02 | 6 / 7 / 6 / 7 / 7 | 5 / 4 / 4 / 6 / 8 |
| S03-S04 | 4 / 4 / 3 / 4 / 8-7 | 4 / 3 / 3 / 4 / 8-7 |
| S05-S06 | 4 / 4 / 3 / 6 / 8 | 4 / 3 / 3 / 6 / 8 |
Movimiento: r03 5, master 4. Prefiere r03, confianza ALTA (página 1: sol real, halo, pinos en dos planos).

Lo que no funcionó: la tabla ATM de Ciudad y Playa casi no se ve (+1 de luz, profundidad igual en 3): edificios de un solo marrón, playa con tres azules/arena que chocan sin fondo lejano, sol de Ciudad sin halo y el de Playa como parche borroso. Un velo encima no crea valores: hay que cambiar el valor de cada plano.
Defectos nuevos: (1) las matas de tinta abajo de la página 1 se leen como manchas o agujeros, peor a 390 (S02, una mancha de ~330 px; S01 con un destello circular dentro). (2) Lectura de Moki en la página 1 baja 8→7: pinos cercanos marrón sobre marrón detrás de Moki (S02, x 0-250). (3) A 390: franja marrón dura abajo en S03 y S05 (y ≈ 785-844), suelo enorme y vacío en S03; el cartel «Si chocas…» tapa el sol (fuera del cook: UI). No hay línea base de master a 390 para saber qué viene de master.

Foco ronda 04: (1) matas: que se lean como plantas y no como agujeros (tamaño máximo, forma con huecos, valor) a 1280 y sobre todo a 390; (2) Ciudad y Playa con valores por plano de verdad (lejano claro hacia el cielo, medio, cercano oscuro), olas por distancia en la Playa y banqueta/casitas separadas en la Ciudad; (3) sacar r00b-master-390 para tener la línea base vertical.

---
## Ronda 04 (constructor): matas fuera, valores por plano en Ciudad y Playa

Hora: 17:00 a 18:00 MX | Stills: `cook/stills/r04/`, `r04-390/` (r04a y r04b en disco) | Lado a lado contra master: `cook/compare/r04/todas.jpg` (izquierda master), `vertical.jpg` (390), `movimiento.jpg`
Qué cambió:
- `src/art/luz.js`: fuera el primer plano de matas y la elipse detrás de Moki (ver Decisiones r04).
- `src/art/paisajes.js` (ATM):
  - Ciudad: edificios lejanos aclarados hacia el cielo (silueta al 55 %), banqueta multiplicada un paso abajo (#A89A88) y halo chico y marcado en su sol.
  - Playa: la bruma cubre solo la mitad lejana del mar, el agua cercana se va a hondo (#1F5878 al 72 %) y el disco del sol tiene borde casi duro.
FPS (fps-p6d con ?ir=ciudad, 375x812): 60.0 de promedio, p95 16.7 ms, 0 cuadros largos en 840.
Invitado Sonnet interno (1 solo): rama / master (comp, luz, prof, color, lectura):
- S01: 6/6/6/7/6 contra 7/7/6/8/8.
- S03: 6/6/6/7/7 contra 6/6/6/7/7.
- S05: 6/7/6/7/7 contra 6/6/6/7/7.
OJO: su última lectura de S01 dice que «siguen la sombra y las matas». Los pixeles lo contradicen: la franja de abajo de r04 difiere 3 % de r03 (matas rellenas) y la zona de Moki difiere 3 % de r04b (sombra). Lo oscuro de hoja ancha que ve abajo son, probablemente, las piezas de pasto y piedra del suelo que ya trae master (gp-*, profundidad 20). Su S01 queda en duda.

---
## Ronda 04 · críticos (director)

Commit 2d4c059. 1 crítico Sonnet de contexto cero (modo ahorro), a ciegas: X = r04, Y = r00b-master, con verticales de las dos; clave abierta después. A ojo, sin calibrar.

| Toma | r04 Comp/Luz/Prof/Color/Lect | r00b-master |
|---|---|---|
| S01-S02 | 5 / 6 / 5 / 6 / 6 | 4 / 4 / 3 / 5 / 6 |
| S03-S04 | 4 / 4 / 4 / 5 / 7 | 4 / 3 / 3 / 5 / 7 |
| S05-S06 | 4 / 5 / 3 / 5 / 8 | 4 / 3 / 2 / 5 / 8 |
Movimiento 5 y 5 (solo miró M3: no vale). Vertical: r04 5, master 4. Prefiere r04, confianza media.

Ojo con el ruido: es otro crítico; master sacó aquí 3-4 donde el de la 03 le puso 4-5. Lo que se repite en 3 rondas y 3 críticos: (1) Ciudad y Playa siguen planas; teñir capas ya pintadas no crea valores (el constructor llegó a lo mismo); (2) falta el primer plano oscuro grande que enmarque (las matas se quitaron porque se leían como agujeros); (3) en el bosque el traje naranja se come contra pinos y cielo naranja-café, y solo el casco lo salva (S02 contraste 1.01 medido).
La franja dura de abajo a 390 en S03 y S05 y el suelo vacío de S03 vienen de master (MAE 0): fuera del cook.

Foco ronda 05 (la última antes del tope de 20:05): Ciudad y Playa repintando capas en código (mar en 3 bandas que aclaran con la distancia y horizonte que se pierde en bruma; palmas en 2 valores; edificios lejanos claros con ventanas en otro valor, cercanos oscuros). La página 1 se congela en r04.

---
## Ronda 05 (constructor, última): Ciudad y Playa repintadas en código

Hora: 19:00 a 19:30 MX | Stills: `cook/stills/r05/`, `r05-390/` (r05a en disco) | Lado a lado contra master: `cook/compare/r05/todas.jpg` (izquierda master), `vertical.jpg`, `movimiento.jpg`. La página 1 es idéntica a r04 (MAE 0 en S01 y S02).
Qué cambió (src/art/paisajes.js, TRAMOS):
- Ciudad, edificios lejanos: claros y fríos, teñidos al cielo (#BDC4C3, caras #D5DAD7 / #A9B1B2), con ventanas en otro valor (crema #F7EBD2 o gris azul #8C99A0) y sombra de mosaico más tenue.
- Playa:
  - mar en bandas que aclaran con la distancia: #A9D2DE arriba, #8CC0D2 y el cercano #5496B8, más la banda honda encima;
  - horizonte: línea fina #7FB2C4 donde se apoyan los veleros, con bruma pegada debajo;
  - palmas lejanas claras del color del aire (#86AFB5) y palmas cercanas un paso más oscuras (#2C6170);
  - cascos de los veleros un paso hacia el aire.

Valor medio por plano (mediana de luminancia relativa por franja, x 400-1260, a 1280; master -> r05):

| Toma | Plano | master | r05 |
|---|---|---|---|
| S03 Ciudad | edificios lejanos (y 320-360) | 0.33-0.38 | 0.42-0.43 |
| S03 Ciudad | casitas (y 380-560) | 0.16-0.19 | 0.16-0.19 (sin cambio) |
| S03 Ciudad | banqueta y calle (y 600-700) | 0.10-0.13 | 0.04-0.05 |
| S05 Playa | cielo junto al horizonte (y 340) | 0.71 | 0.67 |
| S05 Playa | mar lejano, 3 franjas (y 360-400) | 0.40 / 0.41 / 0.40 | 0.58 / 0.49 / 0.42 |
| S05 Playa | mar cercano (y 420-560) | 0.25 a 0.22 | 0.21 a 0.15 |
| S05 Playa | arena (y 580-700) | 0.18-0.23 | 0.18-0.23 (sin cambio) |
Invitado Sonnet interno (1 solo), rama / master (comp, luz, prof, color, lectura):
- S03: 6/6/7/6/7 contra 5/5/4/5/6.
- S05: 6/7/6/7/7 contra 6/6/6/6/7.
Medidas: bots = master (6 corridas), consola 0, +2380 B gz diferido contra master (inicial -5 B). FPS en la Playa (?ir=libre-playa, 375x812, build r05a): 58.9 de promedio, p95 16.8 ms, 10 cuadros de más de 33 ms en 824 (sin comparar contra master).

## Ronda 05 · críticos (director) y cierre del Cook 1

Commit 393b112. 1 crítico Sonnet de contexto cero (modo ahorro), a ciegas y con el orden invertido: X = r00b-master, Y = r05. Vio las 12 S horizontales, M1/M3/M6 y las verticales S01/S03/S05. A ojo, sin calibrar.

| Toma | r05 Comp/Luz/Prof/Color/Lect | r00b-master |
|---|---|---|
| S01-S02 | 7 / 8 / 7 / 7 / 7 | 6 / 4 / 4 / 6 / 7 |
| S03-S04 | 6 / 5 / 6 / 5 / 7 | 6 / 3 / 4 / 5 / 7 |
| S05-S06 | 6 / 6 / 6 / 6 / 7 | 5 / 3 / 3 / 6 / 7 |
Movimiento 6 contra 5; vertical 6 contra 5. Prefiere r05, confianza ALTA. Primera ronda en que Ciudad y Playa suben de profundidad (4→6 y 3→6), coherente con la tabla de valores del constructor.

Defectos de r05 según el crítico: (1) el disco del sol en S01, S02 y M3 se ve blanco quemado, con halo amarillo-verdoso y grano: compite con Moki y no se lee como papel; (2) en la Ciudad el cielo frío y plano contra edificios cafés sin luz cálida, y los rascacielos lejanos sin contorno; en la vertical S03 el sol casi desaparece; (3) los árboles de primer plano semitransparentes en S02, M3 y M6 hacen manchas detrás de Moki. Menores: el polvo del aterrizaje tapa parte de la caja en S03; el borde del sol en la vertical S01 se ve duro. Moki no aparece espejado ni ilegible.

**Cierre (19:15 MX, antes del tope de 20:05):** no hay ronda 06, porque el modo ahorro permite una ronda cada 2 h. Resultado: r05 le gana a master en luz y profundidad en las 3 páginas, con lo mejor en 6-8. La meta de 8.5 en cada punto NO se alcanzó: solo la luz de la página 1 llega a 8. Tampoco se corrió el ciego 3/3 (modo ahorro: 1 crítico por ronda). Nada entra a master sin el sí de Jorge con stills: cook/compare/r05/todas.jpg (master a la izquierda), vertical.jpg y movimiento.jpg. Antes de integrar faltan: QA del probador, revisar las variantes de otra hora (cA, cB, pA, pB), que comparten capas y no se vieron en stills, y FPS de la Playa contra master. Para un Cook 2: sol que se lea como papel, luz cálida en la Ciudad, primer plano opaco que enmarque sin manchar.
