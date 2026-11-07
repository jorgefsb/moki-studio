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
