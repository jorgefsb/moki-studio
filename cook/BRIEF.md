/cook

# Brief del Cook 1 de Moki Studio: «Que se vea como juego publicado»

Pedido de Jorge (16-nov-2026, 08:20): «Se ve igualito, ninguna mejora sustancial». Escogió el Cook y, por la regla de los 30 minutos, va la opción A. Lo redactó Spark. Canon: metodo/dos-carriles.md (carril salto), critical-context/sin-miedo-a-fallar-2026-10-19 (puertas de dos vías) y la biblia de Moki.

## Qué se construye

Las primeras 3 páginas de «Un salto más» (Clásico y la primera partida, ?ir=primera) en Phaser, como hoy, pero que una persona que no nos conoce diga «esto es un juego publicado». Se trabaja el escenario, la luz, la profundidad, el color, el clima y la hora del día, y cómo se lee Moki contra el fondo. Las mecánicas no se tocan.

## Barra

- **Referencia real:** Alto's Odyssey. Saca de 5 a 6 capturas reales de las páginas oficiales del juego (tienda o press kit) y guárdalas en referencias/altos-odyssey/stills/. Antes de construir, cada captura se vuelve una toma con notas de qué tomar: capas de paralaje, perspectiva atmosférica, degradados de cielo, siluetas, cambio de luz.
- **Nada de esas capturas se publica nunca.** Son solo para comparar en el estudio.
- **Rúbrica, de 0 a 10 en cada punto:** composición, luz y atmósfera, profundidad (capas), color, lectura de Moki y de los obstáculos, movimiento (secuencia de 6 cuadros).
- **Meta:** 8.5 o más en cada punto, calificado por un crítico sin contexto que ve la referencia y lo nuestro lado a lado (scripts/side-by-side.mjs de la skill cook). Los modelos se califican de más, así que si Jorge da un número, manda el de Jorge.
- **Segunda prueba, a ciegas:** 3 personas o críticos nuevos comparan rama contra master y escogen la que «parece juego publicado». Tiene que ganar 3 de 3.

## Reglas

- Moki según su biblia: parche MOKI en la oreja derecha anatómica, nunca espejado, nunca en T. Moki no tapa números, botones ni texto.
- Paleta y tipografía de brandkit.jorgesuarez.com.mx. La paleta de Alto's es referencia de cómo se usa la luz, no se copia. Nada de grises lavados ni colores sobresaturados.
- Fondos, cielo, capas y efectos se hacen en código o con el arte propio del estudio. Ningún asset externo y nada copiado de Alto's.
- Rendimiento: 60 fps a 390 px en celular; el peso nuevo se reporta en gz contra master.
- La máquina es vieja: trabajo pesado con `flock /tmp/moki-pesado.lock`, respetar el semáforo /tmp/moki-recursos.txt, y en ROJO se pausa.
- Opus solo para el constructor; críticos y probador en Sonnet.
- Todo en la rama v2/cook-mundo. Nada entra a master sin el PASS del probador, el ciego 3 de 3 y el sí de Jorge viendo los stills.
- Mientras corre el Cook, el carril chico baja a 1 pieza al día como máximo, para darle la máquina al salto.

## Tiempo

- Piso de 6 horas de trabajo real. Si termina en 2, algo está mal.
- Tope de 10 horas.
- Profundidad antes que amplitud: primero una página excepcional, luego las otras dos.

## Proceso

1. Rondas: stills en las tomas de referencia, lado a lado, crítico sin contexto, arreglar lo más flojo, anotar la ronda en cook/ROUNDS.md y repetir.
2. Después de cada ronda, la hoja lado a lado va a evidencia/cook-mundo/ y a la bitácora, para que Spark se la mande a Jorge. Sin pausar.
3. Al terminar: video de 10 segundos de la rama contra master y contra Alto's, para que Jorge decida.

Las preguntas van ahora, al director. Después no se vuelve a preguntar hasta terminar. A cocinar.
