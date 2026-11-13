---
name: moki-game-feel
description: Lo que Moki Studio aprendió del salto, el choque y el juice, con los números que lo probaron, para reutilizarlo en los siguientes juegos. Úsala al diseñar o ajustar salto, ventanas de perdón, tropiezo, efectos o sonido de impacto.
---
# Game feel de Moki · Moki Studio
Fuente: BITACORA y DECISIONES del 28 al 31-oct. Para la lista genérica de chequeo (delta time, cámara, colisiones) usa moki-chequeo-tecnico; aquí solo van lecciones propias. Cada regla trae el dato de Moki que la sostiene.

1. **La ventana de perdón se mide, no se siente.** Dato: la ventana de la caja era de 109 ms y se abrió a >=140 ms después del QA del piloto (líder, 29-oct 09:31). El toque libra la caja y nunca la torre; la torre pide mantener ≈200 ms: 133 ms aún muere, 200 ms libra (probador, 29-oct).
2. **Dos obstáculos, dos gestos, y que se lea cuál es cuál.** Dato: torre y caja son obstáculos distintos (60x84 y 60x56); el contraste de peligro se mide con una sonda y falló en noche hasta que la viga tuvo contorno de 4 px (viga 375 3.40-6.02; 31-oct 00:50).
3. **El tropiezo al chocar da información y se queda corto.** Dato: el director fijó 6° de inclinación y, si arte lo rechazaba, bajaba a 3.5°; se juzga en la QA final, no antes (29-oct 10:10).
4. **El juice sube por niveles, no de golpe.** Dato: feel 1 y 2 entraron en el sprint como doblez de choque y juice por niveles (REPORTE-SPRINT); en la racha, la respuesta de sonido crece pieza → quinta de racha → arco completo (GDD sonido).
5. **El bus de efectos no tapa la música.** Dato: se bajó ~1.5 dB con el pico de señal como meta <= -7 y la música intacta (líder, 29-oct 10:12).
6. **Perdonar también es feel.** Dato: el Paseo (sin choques) y la racha con perdón (un día por semana) nacen de que la gente no se frustre; la regla del GDD prohíbe racha con culpa o cobro y urgencia inventada.
7. **Un gesto corto se juzga con un ciego que lo alcance a ver.** Antes de decir que un gesto de ~125 ms "no se lee", cuenta cuántos de sus cuadros caen en la tira. Muestrea a ≤33 ms (con 40 ms el paso de 16.7 ms da 50 ms reales). Dato: el agachado al aterrizar salió "dudoso" 3 de 3 con un cuadro cada 90 ms (P37, 12-nov). A 33 ms, con 4 cuadros agachados por tira, master ya lo leía 3 de 3 a 1280, y bajar la cabeza 4 filas más no cambió nada (P4u cerrada sin cambio, 13-nov 03:18; herramientas/ciego-p4u.mjs).
8. **Lo que NO está probado:** nada de lo anterior se ha jugado con una persona real ni en un celular; el sonido no se ha escuchado a oído en esta versión (NO VERIFICADO, 31-oct). La primera ronda a ciegas de "sensación del salto" queda para la rotación del gauntlet.
