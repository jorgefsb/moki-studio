# Casos de prueba de moki-arte-copiar-combinar-transformar

## caso-001 · el ambiente del nivel 1 pasa a papel
Fuente: Jorge 5-nov ("ambiente a recortes de papel con luz de atardecer") y director 6-nov 08:10, pieza 4. Escrito antes de construir, sobre master 85fa03a.

- Entrada: mariposas, estrellas y globo que hoy salen de textures.js (ambButterfly, ambStar, ambBalloon), sobre el atardecer pintado del nivel 1. Las estrellas solo salen de noche: el nivel 1 tiene la hora fija y no llega a la noche, así que se comparan en la noche del nivel 2.
- Debe salir: los 3 objetos como recortes de papel con canto rasgado, grueso, fibra y sombra propia, con luz cálida de lado. Solo tokens de ARTE.md §4, sin glow ni aditivo (§13.3 y §13.4). Mismos tiempos de aparición, mismas zonas y misma semilla de ambiente: cambia cómo se ven, no cuándo ni dónde. Moki sin espejar y sin tocar.
- Se revisa:
  1. 3 críticos nuevos a ciegas, uno por ronda, con capturas A/B sin etiqueta a 375x667 y 1280x720, escogen el kit nuevo 3 de 3 como "más de papel y mejor acabado" (moki-gauntlet-a-ciegas).
  2. 0 de 3 leen un objeto como obstáculo o ficha, y al menos 2 de 3 dicen papel o recorte sin que se les sugiera.
  3. FPS 375 >= 55 en Hardcore N8 con los 3 objetos en pantalla.
  4. Clásico 2142 78/78 y Reto 2362 dos veces, iguales a master, 0 errores de JS.
  5. JS inicial reportado, base y rama en la misma corrida.
  6. QA ligera del probador.
- Regla antes de ver: con 2 de 3 no entra a master. Queda en rama con toma en video para el cronista, y se anota qué pidieron los críticos.
