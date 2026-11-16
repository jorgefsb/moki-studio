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
