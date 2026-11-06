# Casos de prueba de moki-arte-copiar-combinar-transformar

## caso-001 · el ambiente del nivel 1 pasa a papel
Fuente: Jorge 5-nov ("ambiente a recortes de papel con luz de atardecer") y director 6-nov 08:10, pieza 4. Escrito antes de construir, sobre master 85fa03a.

- Entrada, separada en dos:
  - Nivel 1: mariposas y globo que hoy salen de textures.js (ambButterfly, ambBalloon), sobre el atardecer pintado.
  - Noche del nivel 2: estrella de textures.js (ambStar). El atardecer del nivel 1 no lleva estrellas: tiene la hora fija, no llega a la noche, y esta pieza no se las agrega.
- Debe salir: los 3 objetos como recortes de papel con canto rasgado, grueso, fibra y sombra propia, con luz de lado. Solo tokens de ARTE.md §4, sin glow ni aditivo (§13.3 y §13.4). Mismos tiempos de aparición, mismas zonas y misma semilla de ambiente: cambia cómo se ven, no cuándo ni dónde. Moki sin espejar y sin tocar.
- Se revisa:
  1. 3 críticos nuevos a ciegas, uno por ronda, con capturas A/B sin etiqueta a 375x667 y 1280x720, escogen el kit nuevo 3 de 3 como "más de papel y mejor acabado" (moki-gauntlet-a-ciegas). Mariposas y globo se comparan en el atardecer del nivel 1; la estrella, en la noche del nivel 2, contra el look actual en cada caso.
  2. 0 de 3 leen un objeto como obstáculo o ficha, y al menos 2 de 3 dicen papel o recorte sin que se les sugiera.
  3. FPS 375 >= 55 en Hardcore N8 con mariposas y globo en pantalla.
  4. Clásico 2142 78/78 y Reto 2362 dos veces, iguales a master, 0 errores de JS.
  5. JS inicial reportado, base y rama en la misma corrida.
  6. QA ligera del probador.
- Regla antes de ver: con 2 de 3 no entra a master. Queda en rama con toma en video para el cronista, y se anota qué pidieron los críticos.
