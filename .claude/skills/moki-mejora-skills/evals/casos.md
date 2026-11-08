# Casos de prueba de moki-mejora-skills

## caso-001 · feedback de Jorge se vuelve skill
- Entrada: Jorge dice "las mariposas siguen con el look viejo".
- Debe salir: lección en la skill de arte responsable, caso nuevo en sus evals, parche de 10 líneas o menos, prueba a ciegas contra el video norte y commit con ganó/perdió.
- Se revisa: existen el caso y el commit; la bitácora tiene la línea.

## caso-002 · las horas de la bitácora se estimaban, no se leían (Spark, 6-nov)
- Entrada: a las 16:16 reales BITACORA y DECISIONES ya traían líneas de 16:25, 16:50 y 18:30; las del director salían con hora adelantada o atrasada (14:25 escrita a las 15:20).
- Debe salir: regla en hecho-mejor-que-perfecto (la hora se saca con `date +%H:%M` al escribir, en el mismo comando que añade la línea, nunca estimada) y prueba de que se cumple.
- Se revisa: toda línea nueva de BITACORA o DECISIONES tiene hora <= la de `date` en ese momento. Prueba: añadir una línea con `echo "- $(date +'%-d-%b %H:%M') ..."` y comprobar que coincide; una línea con hora mayor a la del reloj falla.
- Estado: parche aplicado 6-nov, primera prueba en la bitácora de abajo. Las líneas viejas no se reescriben; se marcan con una corrección.

## caso-003 · paisaje por tramo de Libre (caso-002 es de la nave, en v2/nave-a)
Escrito antes del código, 7-nov 00:24. Alcance: Libre, nivel 1 del Cuaderno.
- Entrada: 4 fotos a 375 de ancho, una a la mitad de cada tramo de una partida de Libre, revueltas, sin HUD quitado ni nombres de archivo que delaten el orden.
- Prueba: 3 críticos nuevos, sin leer espec ni código. Primero describen qué lugar ven en cada foto; luego asignan a cada foto uno de 4 lugares (Bosque, Ciudad, Playa, Noche). Pueden repetir lugar: si no, 3 de 4 sería imposible.
- Pasa: cada uno de los 3 acierta >= 3 de 4. Si uno solo falla, queda como PARCIAL y decide el director; si fallan 2 o 3, no pasa. Hoy 0: en master los 4 tramos son el mismo dibujo.
- Puertas: contraste >= 2.0 en cuerpo y borde de caja, torre y viga, en los 3 paisajes nuevos, 375, una corrida; FPS 375 >= 55; Clásico 2142 78/78; Reto 2362 x2; niveles.mjs VERDE; consola 0; JS inicial en bytes gz, diferido aparte.
- Regla: una sola pasada de corrección si falla el contraste o la lectura. Si un paisaje no pasa el contraste, ese tramo se queda con el fondo de hoy. La vara no se mueve.
- Se revisa: este commit es anterior al de código; evidencia/paisaje-tramo/RESULTADO.md trae las cifras y lo NO VERIFICADO.

## caso-004 · suelo propio por tramo de Libre
Escrito antes del código, 7-nov 01:09. Alcance: Libre, nivel 1 del Cuaderno, sobre v2/paisaje-tramo 1d9091d. El tramo 1 sigue en atardecer con su suelo de hoy.
- Entrada: 4 fotos a 375 de ancho, una a la mitad de cada tramo de una partida de Libre, del build final, revueltas, con nombres de archivo que no delaten el orden.
- Prueba: 3 críticos NUEVOS, sin leer espec ni código, y los 3 corren. Reciben desde el primer mensaje las 2 preguntas juntas: (a) a cada foto asigna uno de 4 lugares (Bosque, Ciudad, Playa, Noche), se puede repetir lugar; (b) en cada foto, ¿la hora del día del cielo choca con el resto de la imagen, sí o no y por qué?
- Pasa: 0 de 3 críticos marcan choque de hora en alguna foto, y cada uno acierta >= 3 de 4. Cualquier otra cosa no pasa. Hoy (1d9091d, evidencia débil): 2 críticos, 4 de 4 en lugar, los 2 marcan choque en Playa y Noche por el suelo naranja; 1 de ellos vio un build anterior y la pregunta les llegó después.
- Puertas: contraste >= 2.0 en cuerpo y borde de caja, torre y viga en los 3 tramos, 375, una corrida; caja hundida de Playa (hoy 1.76 a 1.82, defecto de suelo con nombre) revisada y reportada, sin mover la vara; FPS 375 >= 55 medido; Clásico 2142 78/78; Reto 2362 x2; niveles.mjs VERDE; consola 0; JS inicial +300 B gz máx, diferido aparte; costo de hornear en el título medido en ms.
- Regla: una sola pasada de corrección si falla el contraste o la lectura, y no se le pide a los mismos críticos: la corrida que decide lleva fotos del build final. Si no pasa, queda en rama. La vara no se mueve.
- Se revisa: este commit es anterior al de código; evidencia/suelo-tramo/RESULTADO.md trae las cifras y lo NO VERIFICADO.

## caso-005 · Ciudad se lee vieja (Jorge la vio en pantalla, 7-nov)
Escrito antes del código, 7-nov 09:40 (15:40Z). Alcance: solo tramo 2 de Libre (Ciudad), sobre master b33f35b. Rama v2/ciudad-viva.
- Entrada: Jorge leyó Ciudad como "versión vieja". En caso-004 los 3 críticos nuevos ya la nombraron plana (3 de 3): muralla de cartón, ventanas sin contraste, franja gris muerta.
- Cambio: cielo con más cuerpo (azul más hondo y nubes de papel), capa lejos con canto de 2 px y sombra de contacto (ARTE §7 capa 2), ventanas con luz arriba de h 130, franja de banqueta con juntas y calle con rayas. Abajo de h 130 todo sigue entre L 0.111 y L 0.305.
- Prueba: 3 críticos NUEVOS a ciegas, foto del tramo 2 a 375 de este build contra la de master b33f35b, revueltas como A y B, con la vara del video norte (si no hay de Ciudad, Alto's de evidencia/GAUNTLET.md). Preguntas: ¿cuál se acerca más a la vara? ¿alguna se ve deslavada, pálida o vieja?
- Pasa: ninguno dice deslavado o viejo de la foto nueva, y la nueva gana 2 de 3 o más. Hoy 0: la foto de master es la que Jorge leyó vieja.
- Puertas: contraste >= 2.0 en caja, torre, caja hundida, viga y zanja del tramo 2, 375; Clásico 2142 78/78; Reto 2362 x2; JS inicial gz sin subir; carga CPU x4 mediana < 3.0 s y no peor que master; consola 0.
- Regla: una sola pasada. Si no pasa, queda en rama. La vara no se mueve.
- Se revisa: este commit es anterior al de código; evidencia/ciudad-viva/RESULTADO.md trae las cifras y lo NO VERIFICADO.
- Pasada B (orden del director, escrita antes del código 7-nov 10:01): la tanda 1 ganó a master 3 de 3, pero 2 de 3 la vieron "un poco deslavada" por falta de luz con dirección y de primer plano oscuro. Cambio: luz desde arriba a la derecha (lado que da la luz más claro, el otro más oscuro, en lejos y medio; sol de papel en el cielo) y calle que baja a casi tinta en el borde inferior. Franja y banqueta cercana sin cambio de rango. Prueba: 3 críticos NUEVOS que no vieron la tanda 1, misma pregunta y vara alto-03-palms, contra master. Pasa igual que arriba. Puertas igual que arriba, más FPS 375 en página 1 y en tramo 2. Si no pasa pero sigue ganando 3 de 3 a master, se integra como mejora parcial con el defecto escrito (decisión del director).

## caso-006 · MEDICIÓN 2 + DIVERSIÓN 1-PRE: el contador dice quién juega, en qué tramo y contra qué cae
Escrito antes del código, 7-nov 10:55 (16:55Z). Alcance: solo src/contador.js y las llamadas de RunScene.js, sobre master f1e574e. Rama v2/medicion-2.
- Entrada: hoy el beacon manda {juego, modo, nivel, motivo}. 'nivel' es el del Cuaderno, no el tramo; no hay causa; no se distingue público, equipo y bots. Hoy 0 de 5 campos nuevos (origen, intento, seg, tramo, causa).
- Prueba: build de producción servido como moki.jorgesuarez.com.mx contra un receptor local (host-resolver-rules a 127.0.0.1, nunca el worker real), headless. Partidas: (a) con ?debug, (b) normal con webdriver, (c) tras abrir ?equipo, (d) tras ?publico; en cada una choque, reintento y salir.
- Pasa: (a) 0 beacons; (b) todos con origen 'bot'; (c) origen 'equipo'; (d) vuelve a 'bot' (webdriver gana) y localStorage moki-equipo borrado; el reintento llega como intento+1; choque trae tramo 0-99 y causa en [a-z-]; seg entero >= 0; cada cuerpo < 300 bytes; 5 de 5 campos presentes.
- Puertas: Clásico 2142 78/78; Reto 2362 x2; FPS 375 y carga CPU x4 no peores que master; JS inicial sube solo unos bytes gz; consola 0.
- Regla: una sola pasada. No se manda nada al worker real desde pruebas.
- Se revisa: este commit es anterior al de código; evidencia/medicion-2/RESULTADO.md trae las cifras y lo NO VERIFICADO.

## caso-007 · DIVERSIÓN 2B: Mucho por defecto la primera vez
Escrito antes del código, 7-nov 11:55 (17:55Z). Alcance: un número en src/config.js (juice 1 → 2), sobre master ee9ea59. Rama v2/juice-mucho.
- Entrada: quien llega sin haber tocado el menú juega en Poquito: sin chispa al despegar, sin pasto, sin x2 en el contador, sin confeti y sin vibración. Hoy 0 de 5 de esos efectos en la primera partida.
- Mucho prende (leído del código): x2/x3 en el contador (RunScene.js:745), pasto que se dobla al aterrizar (RunScene.js:750), nubes que tiemblan en checkpoint y arco (:770), confeti en mejor marca, aterrizaje con 6-8 papelitos en vez de 3-5 (particles.js burst), estela con tope 8 en vez de 3 desde el nivel 8, y vibración en momentos importantes (feel.js buzz, solo táctil).
- Prueba: build de producción, headless. (a) jugador nuevo sin moki.juice: nivel efectivo 2; (b) con moki.juice = '1' guardado: sigue 1 (el menú manda); (c) con prefers-reduced-motion: reduce, sin moki.juice: escena.reduced = true y 0 partículas, sin x2 y sin vibración (el movimiento reducido manda); (d) el menú sigue ciclando Nada → Poquito → Mucho.
- Puertas: FPS a 390 con el bot no pierde más de 2 contra master (mismo bot, alternado, 3+3, sin fijar moki.juice); Clásico 2142 78/78; Reto 2362 x2; carga CPU x4 no peor que master (alternado 5+5, semáforo al empezar y terminar, tanda en ROJO no vale); JS inicial sube solo unos bytes; consola 0.
- Regla: una sola pasada. Si no pasa, queda en rama. Nada al worker real.
- Se revisa: este commit es anterior al de código; evidencia/juice-mucho/RESULTADO.md trae las cifras y lo NO VERIFICADO.

## caso-008 · DIVERSIÓN 4: casi-choque premiado
Escrito antes del código, 7-nov 13:35 (19:35Z). Alcance: src/scenes/RunScene.js (colisión), src/audio/sfx.js (sonido 'casi'), src/art/particles.js (chispa), src/config.js (perillas), sobre master 0b4724f. Rama v2/casi-choque.
- Entrada: hoy pasar raspando un obstáculo no da nada. Con el bot que salta tarde (sonda de evidencia/casi-choque), premios por partida hoy: 0 (no existe). La sonda también cuenta, por fuera del juego, cuántos obstáculos pasa a <= 8 px sin tocarlos (el oráculo).
- Regla: si la caja de Moki pasa a <= 8 px de la caja de choque de un obstáculo (la misma de obsBox) sin tocarla, al dejarlo atrás: chispa (solo con juice >= 1 y sin movimiento reducido) y sonido que sube con la racha de casi-choques (se corta al chocar o a los 4 s sin otro). Tope uno por obstáculo. No cuentan trampolín, timbre, zanja, torre acostada, demo ni paseo.
- Prueba: build de producción, headless, 390x844. Bot que salta tarde, ?debug&god, partidas de 30 s; juego y oráculo contados por separado.
- Pasa: rama 1 a 3 premios por partida con el bot; premios del juego = oráculo (nunca más que obstáculos pasados raspando); nunca dos por el mismo obstáculo; master 0; con juice 0 y con movimiento reducido 0 chispas (el sonido sigue mientras no esté silenciado).
- Puertas: FPS 390 y 375 no peores que master (alternado); carga CPU x4 no peor (alternado, semáforo al empezar y terminar); Clásico 2142 78/78; Reto 2362 x2; consola 0; JS inicial solo unos bytes más.
- Regla: una sola pasada. Si no pasa, queda en rama. Nada al worker real.
- Se revisa: este commit es anterior al de código; evidencia/casi-choque/RESULTADO.md trae las cifras y lo NO VERIFICADO.

## caso-009 · DIVERSIÓN 1: ¿el nivel 2 es un muro?
Escrito antes del código, 7-nov 22:35 CDMX (04:35Z). Rama v2/muro sobre master 7253359. Instrumento: scripts/muro-tramos.mjs (copia de src/niveles/validar.js con la misma física de jumpmodel y las mismas cajas, sin navegador; semilla fija). Bot humano: despega con error N(+15, 40) ms, toque de N(75, 25) ms, mantener N(320, 100) ms; novato N(+25, 60), toque N(90, 35), mantener N(260, 110); humanoApunta = humano que apunta al salto que de verdad hará. 40 partidas por nivel; Reto 14 fechas desde 8-nov, Libre 14 semillas de un jugador en nivel 2 del Cuaderno, Clásico.
- Ojo con el dato viejo: el "nivel 2" del contador 1 es el nivel del Cuaderno del jugador (nivel 2 = encargos de torres), no un lugar del mapa. El contador nuevo (MEDICIÓN 2) ya manda tramo y causa; datos públicos/equipo de /api/partidas?origen=todos no los tengo: si el director los trae, se suman.
- Entrada (master): % que muere en cada tramo empezando en su checkpoint, Reto: humano 52.7 / 60.9 / 36.4 / 35.7; humanoApunta 33.8 / 43.0 / 25.2 / 22.5; novato 83.9 / 92.5 / 86.1 / 84.6. Libre y Clásico, la misma forma: T2 es el pico en los 3 perfiles. Causa: caja 471 de 526 muertes (Reto humano). Por encuentro, la caja mata 7.5 % en T1 y 5.7 % en T2 contra 2.9 y 2.6 % en T3 y T4; la torre 1.7 a 3.0 %. T2 trae ~11 cajas por intento contra ~7 en T1, a 350 px/s, donde la ventana de la caja sigue cerrada (con toque humano de 75 ms: 142 ms a 320 y 155 a 350, contra 177 a 420).
- Regla rota (level-design): enseñar, practicar, probar. La página 2 (practicar) mata más que la 3 y la 4 (probar): la curva está al revés, y el obstáculo que enseña (la caja) perdona la mitad que la torre.
- Decisión: HAY sitio dominante (T2, caja). Arreglo chico: abrir la ventana de perdón de la caja con un número de src/config.js (hitboxShrinkCaja), medido antes y después con el mismo bot y la misma semilla.
- Pasa: con el bot humano, % que muere en T2 baja de forma clara (meta >= 8 puntos) y T2 deja de ser el pico o se acerca a T1; T1 no se vuelve trivial (humano sigue muriendo >= 25 % en T1 y novato >= 60 %: nivel 1 no aburre); la torre no cambia (la lección de Mantén no se toca).
- Puertas: FPS 390/375 y carga CPU x4 no peores que master; Clásico 2142 78/78 (explicar si cambia); Reto 2362 x2; consola 0; JS inicial solo unos bytes; scripts/niveles.mjs VERDE.
- Regla: una sola pasada. Si no pasa, queda en rama. Nada al worker real, sin push.
- Se revisa: este commit es anterior al de código; evidencia/diversion-1/RESULTADO.md trae las cifras y lo NO VERIFICADO.

## caso-010 · DIVERSIÓN 3: "¿Otra?" (bandera donde llegaste y "te faltaron X m")
Escrito antes del código, 8-nov 00:42 CDMX (06:42Z). Rama v2/otra sobre master 2282f02. Instrumento: evidencia/diversion-3/base.mjs (build de producción, headless, 390x844, bot pasivo que choca, entrada real con clics; mide toques, ms de pared y ms de juego desde el choque hasta que Moki corre otra vez).
- Dato público: no lo tengo (el contador nuevo manda intento; /api/partidas?origen=todos lo trae el director o Spark). **Todo lo de aquí es dato de bot, no de personas.** "% de partidas que empiezan otra" no se puede medir con bot: el bot siempre juega otra.
- Entrada (master, 15 muertes en Clásico, Reto y Libre): de morir a jugar otra es 1 toque. La tarjeta sale a los 267 ms de juego, el toque se acepta desde los 550 ms (C.retryLockoutMs, guarda contra el toque de pánico) y Moki vuelve a correr a los 550-600 ms de juego con un toque 350 ms después de ver la tarjeta. Los toques antes de 550 ms se tiran (diseño). Headless corre a 8-10 fps por la carga, así que los ms de pared (2.4-4.8 s) no valen; en un aparato a 60 fps, juego = pared.
- Lectura: el camino ya es corto; lo que falta es **motivo** para tocar otra vez. Hoy la tarjeta dice "Llegaste al N%" (un porcentaje abstracto) y al reintentar no hay nada en el mundo que diga hasta dónde llegaste.
- Cambio mínimo: (1) la tarjeta de fallo dice "Te faltaron X m para la meta" en lugar del %, con la misma regla (solo pasado el 10 %); (2) al reintentar, una bandera de papel (asta kraft, banderín papel con canto tinta, sombra de contacto tinta; nada ámbar, nada naranja) clavada en el suelo donde chocaste la vez pasada, quieta (sin vaivén: no es juice), igual con juice 0 y movimiento reducido. Sin pantallas ni botones nuevos.
- Pasa: toques y ms de juego de morir a jugar iguales a master (1 toque, <= 600 ms); la bandera existe en el reintento a la distancia del último choque; la tarjeta dice los metros; juice 0 y reducido: la bandera está y no se mueve.
- Puertas: Clásico 2142 78/78; Reto 2362 x2; FPS 390/375 no peores; consola 0; JS inicial pocos bytes (se dice cuántos).
- Regla: una sola pasada, tope 45 min. Sin push, nada al worker. La meta real (% que juega otra en menos de 10 s) se confirma con el contador público.
- Se revisa: este commit es anterior al de código; evidencia/diversion-3/RESULTADO.md trae las cifras y lo NO VERIFICADO.
