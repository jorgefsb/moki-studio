# Casos de prueba de moki-mejora-skills

## caso-001 · feedback de Jorge se vuelve skill
- Entrada: Jorge dice "las mariposas siguen con el look viejo".
- Debe salir: lección en la skill de arte responsable, caso nuevo en sus evals, parche de 10 líneas o menos, prueba a ciegas contra el video norte y commit con ganó/perdió.
- Se revisa: existen el caso y el commit; la bitácora tiene la línea.

## caso-003 · paisaje por tramo de Libre (caso-002 es de la nave, en v2/nave-a)
Escrito antes del código, 7-nov 00:24. Alcance: Libre, nivel 1 del Cuaderno.
- Entrada: 4 fotos a 375 de ancho, una a la mitad de cada tramo de una partida de Libre, revueltas, sin HUD quitado ni nombres de archivo que delaten el orden.
- Prueba: 3 críticos nuevos, sin leer espec ni código. Primero describen qué lugar ven en cada foto; luego asignan a cada foto uno de 4 lugares (Bosque, Ciudad, Playa, Noche). Pueden repetir lugar: si no, 3 de 4 sería imposible.
- Pasa: cada uno de los 3 acierta >= 3 de 4. Si uno solo falla, queda como PARCIAL y decide el director; si fallan 2 o 3, no pasa. Hoy 0: en master los 4 tramos son el mismo dibujo.
- Puertas: contraste >= 2.0 en cuerpo y borde de caja, torre y viga, en los 3 paisajes nuevos, 375, una corrida; FPS 375 >= 55; Clásico 2142 78/78; Reto 2362 x2; niveles.mjs VERDE; consola 0; JS inicial en bytes gz, diferido aparte.
- Regla: una sola pasada de corrección si falla el contraste o la lectura. Si un paisaje no pasa el contraste, ese tramo se queda con el fondo de hoy. La vara no se mueve.
- Se revisa: este commit es anterior al de código; evidencia/paisaje-tramo/RESULTADO.md trae las cifras y lo NO VERIFICADO.
