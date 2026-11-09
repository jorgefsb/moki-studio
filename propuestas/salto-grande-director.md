# Salto grande, no pasitos (director, 2-nov 19:55)

**1) ¿Hacemos algo con video-to-game?** Sí. Hoy lo usamos a medias: escogimos el video B como norte, pero solo le copiamos números. La propuesta es usarlo completo: el video es la meta de toda la escena y cada día se compara lado a lado contra él.

**2) Por qué hoy se siente gradual.** Lo provocamos nosotros, sin querer:
- Cada pieza cabe en un día y entra al master ese mismo día, así que sale chica y segura.
- Movemos perillas (colores, valores) cuando falta arte nuevo. El fondo con luz lo probó: 6 críticos no vieron mejora.
- Los topes (+1 KB, 30 min, una pieza) cuidan el juego, pero también achican la ambición.
- Después de cada pieza vienen 1 o 2 vueltas de pulido. Hoy se fue medio día en eso.

**Propuesta: un SALTO de 3 días, "Noche de papel" (3 al 5 de noviembre).**
- **Qué:** rehacer la noche completa como el video B: farol con luz que cae al suelo, primer plano oscuro de recortes, 4 capas, pétalos y luz en el borde de Moki. Es arte nuevo (imágenes clave con Codex, vía Spark) y luego código. Absorbe la pieza del fondo de noche.
- **Cambia, solo para el salto:** una rama (v2/salto-noche) que entra al master una sola vez, al final. No se integra cada día ni hay pulido mientras dura. El arte puede pesar hasta 300 KB si carga después y está declarado. Las puertas se miden al final, no en cada perilla.
- **No cambia:** canon de Moki, gauntlet a ciegas, QA del probador, un pesado a la vez en VERDE, Clásico y Reto idénticos, 55 fps o más, borde obstáculo/suelo de 2.0 o más, JS inicial con +1.5 KB o menos, sin push.
- **El corte diario sigue** con el master estable; el público ve cuadros del salto como "lo que viene".

**Cómo sabremos que fue salto.**
- 3 críticos nuevos, a ciegas, comparan master, salto y video B: luz y profundidad suben 3 puntos o más (no 2).
- Un invitado sin contexto escoge "la versión nueva" 3 de 3 veces y nombra 3 diferencias solo.
- Hay pares lado a lado contra B a los segundos 2, 5 y 8.

**Ritmo después:** un salto por semana; los otros días, piezas chicas y pulido.

**Primer paso de mañana (07:30):** saco cuadros clave del video B y escribo 3 prompts de imagen (farol con su luz en el suelo, primer plano, escena completa con Moki). Spark los genera de uno en uno. A las 12:00 un invitado de arte compara a ciegas el boceto contra master y contra B.
