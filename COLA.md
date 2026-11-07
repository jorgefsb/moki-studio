# COLA de piezas de Moki Studio

La lee el latido (script, sin IA) para que el estudio nunca se quede sin pieza.
Formato: `- [ ] PIEZA · origen · puerta`. Al integrar: `- [x]` con el commit. Si no se toma, se anota la razón en la misma línea.
El director decide el orden del día; esta cola solo evita el "sin pieza clara".
Regla de Jorge (7-nov 10:22): más divertido pesa más que más bonito. Las piezas de diversión van antes que las de arte y se miden con números de juego (bots, jugador simulado y el termómetro), no con críticos de arte.
Agregan: Jorge, Spark y el director. Creada 7-nov 09:45 por Spark.

- [ ] CIUDAD SE LEE VIEJA · Jorge 7-nov 09:32: vio el tramo Ciudad en la pantalla (cielo de día claro, pálido) y lo leyó como "una versión vieja" del juego. Es una calificación: caso en moki-mejora-skills. · Puerta: 3 críticos a ciegas contra el video norte; ninguno lo describe como deslavado o viejo, y gana 2 de 3 contra master b33f35b. · TOMADA 7-nov 09:37: v2/ciudad-viva 44f1f78 gana a master 3 de 3, ARTE PASS con defectos, espera PASS del probador para integrar; marcar [x] con el commit al integrar.
- [ ] DIVERSIÓN 1 · EL MURO DEL NIVEL 2 · Contador 1 al 7-nov: 18 de 25 choques son en el nivel 2 y solo 2 de 36 partidas ganan. Revisar la curva con la skill level-design: enseñar, practicar y luego probar; un respiro antes de cada cosa nueva. · Puerta: bot y jugador simulado pasan el nivel 2 más seguido sin que el nivel 1 se vuelva aburrido; luego se confirma con el termómetro de la pantalla en 7 días.
- [ ] DIVERSIÓN 2 · QUE NADIE SE SALGA EN LOS PRIMEROS 10 SEGUNDOS · 7 de 18 partidas del Reto se salen en el nivel 1 sin chocar. Que en los primeros 3 segundos pase algo que se sienta bien: un salto fácil con jugo, monedas en arco, sonido. Skill moki-game-feel y moki-hooked-juegos. · Puerta: 3 jugadores simulados y un invitado a ciegas dicen qué sintieron en los primeros 10 s; el termómetro baja el % que se sale.
- [ ] DIVERSIÓN 3 · "¿OTRA?" · Al morir: otra partida en un toque, bandera en el suelo donde llegaste la vez pasada y "te faltaron X m". Medir cuántos juegan otra: el contador anónimo necesita el número de intento en la sesión (sin cookies); Spark cambia el worker cuando el director lo pida. · Puerta: % de partidas que empiezan en menos de 10 s después de morir.
- [ ] DIVERSIÓN 4 · CASI-CHOQUE PREMIADO · Si Moki pasa a pocos píxeles de una caja: chispa, sonido y moneda extra. Premia el riesgo. · Puerta: jugador simulado lo provoca al menos una vez por partida y no rompe la regresión ni los FPS.
- [ ] LUZ DE PAPEL · DECISIONES 6-nov 21:46 (Spark/Jorge, Pixel Art Lighter en ~/Work/vendor/pixel-art-lighter): luz del atardecer horneada en mariposa, globo y obstáculos, costo 0 en el juego. · Puerta: 2 de 3 a ciegas contra el video norte; el beige toma la luz.
- [ ] NAVE DE NOCHE CON LUZ DE BORDE · v2/nave-a d4cebd0 no pasó contraste (1.88 a 1.95 contra 2.0). Probar luz de borde en obstáculos, después de LUZ DE PAPEL. · Puerta: contraste >= 2.0 y ciego 2 de 3.
- [ ] ESTRELLA DE PAPEL PARA LA NOCHE DEL NIVEL 2 · perdió 0 de 3 en el atardecer el 6-nov. · Puerta: 2 de 3 a ciegas en la noche.
- [ ] DEMO SIN PASEO, ALTERNANDO NIVEL 1 Y UN NIVEL ALTO · Jorge 5-nov. Falta resolver el tirón de arranque. · Puerta: PASS del probador y sin tirón nuevo.
- [ ] CLÁSICO TAMBIÉN CAMBIA · Jorge 6-nov: lo nuevo entra primero a Libre y Reto, y a Clásico la semana siguiente. Arranca lunes 9-nov. · Puerta: regresión de Clásico igual o mejor y PASS del probador.
- [ ] NOCHE CON TONO PROPIO · 2 intentos no pasaron el 7-nov (v2/noche-pulido, v2/noche-tono). Reintentar con LUZ DE PAPEL. · Puerta: 0 de 3 marcan choque de hora.
