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
