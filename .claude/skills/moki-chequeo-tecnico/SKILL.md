---
name: moki-chequeo-tecnico
description: Lista de chequeo de game feel, sistemas y rendimiento para un juego 2D web en Phaser, con la prueba concreta en Moki para cada concepto. Úsala antes de integrar una pieza que toque salto, cámara, velocidad, partículas, colisiones o carga, y en la ronda semanal de rendimiento.
---
# Chequeo técnico de Moki

Fuente de los conceptos: Game Development Cheat Sheet de Nicolas Zu (gamedev-cheatsheet.com, consultado el 31-oct-2026). Allá cada concepto trae una frase para pegar en un prompt. Aquí está escrito con nuestras palabras y aterrizado a Moki. Dejamos fuera lo 3D (raycasting, normales, LOD, frustum, shaders, billboarding, cuaterniones, z-fighting) y lo que un juego de un solo carril no usa (A*, steering, chunk streaming).

Cómo usarla: para cada punto que toque tu pieza, corre la prueba y anota PASS o FAIL en tu evidencia. Si un punto no aplica, escribe "no aplica" con la razón.

## Sensación (game feel)
1. **Delta time**: el movimiento usa el tiempo del cuadro, no cuadros fijos. Prueba: a 30 y a 60 fps la distancia recorrida en 10 s es igual (±2%).
2. **Paso fijo**: la física y los bots corren con paso fijo y son deterministas. Prueba: los bots dan el mismo puntaje en 3 corridas.
3. **Coyote time**: se puede saltar unos milisegundos después de dejar el borde. Prueba: salto válido entre 60 y 100 ms tarde.
4. **Buffer de entrada**: un toque que llega un poco antes de aterrizar se respeta. Prueba: salto válido entre 80 y 120 ms antes de tocar suelo.
5. **Easing**: nada importante se mueve en línea recta (UI, cámara, tarjetas). Prueba: lista de tweens sin "Linear" en lo que ve el jugador.
6. **Sacudida de cámara**: solo en golpes, corta, y se puede apagar en movimiento reducido. Prueba: con prefers-reduced-motion no hay sacudida.
7. **Aplastar y estirar**: Moki se aplasta al aterrizar y se estira al saltar, sin deformar el parche MOKI ni el visor. Prueba: captura cuadro a cuadro.
8. **Zona muerta de cámara**: la cámara no tiembla con cada salto chico. Prueba: en un tramo plano la cámara no se mueve en vertical.
9. **Aceleración**: arrancar y frenar tienen curva, no saltos de velocidad. Prueba: gráfica de velocidad sin escalones.
10. **Hit stop**: al chocar, una pausa breve que se sienta (40 a 90 ms). Prueba: medir en el build.
11. **Invencibilidad breve** (si hay segunda oportunidad o perdón): se ve con parpadeo y dura lo mismo siempre.

## Sistemas
12. **Pool de objetos**: obstáculos, monedas y partículas se reciclan, no se crean en cada tramo. Prueba: el número de objetos vivos se mantiene estable en 5 min de bot.
13. **Máquina de estados**: Moki tiene estados claros (corriendo, saltando, cayendo, chocado, Paseo) y no hay dos a la vez. Prueba: el log de estados no tiene transiciones imposibles.
14. **Caja de choque justa**: la de Moki es un poco más chica que su dibujo y la del obstáculo no es más grande que el suyo. Prueba: captura con las cajas dibujadas en modo debug.
15. **Túneles**: a velocidad alta (Vuelta rápida, 470 px/s) Moki no atraviesa un obstáculo delgado entre dos cuadros. Prueba: bot a la velocidad tope con obstáculos de 8 px y 30 fps.
16. **Ruido con semilla**: el Reto del día sale igual para todos ese día. Prueba: misma semilla, mismo tramo, en dos navegadores.
17. **Partículas**: con tope de cantidad y que se apaguen en movimiento reducido.

## Rendimiento (móvil primero)
18. **Presupuesto de cuadro**: 16.6 ms a 60 fps en un celular de gama media. Prueba: perfil con CPU x4 en Chrome.
19. **Llamadas de dibujo**: las capas de papel se agrupan. Prueba: contar draw calls en una escena de tarde.
20. **Sobredibujo**: las capas transparentes de cielo, papel y niebla no se apilan de más. Prueba: a 375 px, menos de 4 capas a pantalla completa.
21. **Atlas de texturas**: sprites de Moki y obstáculos en un atlas. Prueba: peticiones de imagen en la carga.
22. **Repartir trabajo**: lo pesado (guardar, generar tramos) no cae todo en un cuadro. Prueba: sin picos de más de 33 ms en el perfil.
23. **Nunca un bot síncrono dentro de una medida de fps**: `moki.bot('adjust', ...)` simula los 40 s en un `while` síncrono, congela el hilo 0.9-1.6 s y después se mide la pantalla de muerte, no el juego. Prueba: medir con `?debug&god` sin bot (o con un bot que pulse en tiempo real) y comparar con una página vacía de control. Evidencia: evidencia/tirones-acfb533/RESULTADO.md (con bot Clásico 50.4 fps y cuadros de 1650 ms; sin bot 59.1 fps y 0 cuadros >33 ms).
