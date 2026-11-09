# La Ruta de Moki (plan de una página, corte 1 = SELECTOR)
Diseñador de juego, 8-nov. Calibrado con game-designer.md (CCGS), adaptado a Phaser web, cartón y marca personal. Mecánica núcleo intacta (correr y saltar). Quito: los letreros sueltos del inicio; la Ruta los reemplaza, no se suma.

## Los 3 loops
- Micro (1-3 s): salto que se siente bien. No se toca.
- Meso (20-40 s): un tramo con meta. En la Ruta, cada nodo promete algo que se ve ANTES de llegar.
- Macro (1-3 min): una partida termina en un nodo: "esto abriste, esto sigue". Razón de volver = ver el siguiente nodo, no pagar una deuda.

## Nodos (mapa de papel, un camino; todo nodo se puede tocar y probar)
| Nodo | Qué abre | Qué se ve nuevo | Liga |
|---|---|---|---|
| 1 Atardecer | Cajas, torres, Cuaderno (3 encargos) | Cielo naranja, colinas de cartón | ?ir=nivel2 abre el 2; el 1 es el inicio normal |
| 2 Noche con estrellas | Vigas, página 3 | Estrellas de papel con cordel (novedades 8-nov) | ?ir=noche |
| 3 Ciudad | Trampolín (config: nivel 3 del Cuaderno) | Skyline, luces de ventana | ?ir=ciudad, ?ir=trampolin |
| 4 Playa | Viento (config hoy: nivel 5; se mueve a 4 si el constructor/niveles lo validan) | Olas y sol bajo de papel | ?ir=viento |
| 5 Noche de Libre | Libre sin fin, formas, timbre | Noche plena | ?ir=libre, ?ir=formas, ?ir=timbre |
| Reto del día | Misma semilla para todos | Sello del día en el mapa | ?ir=reto |
| Clásico | Recorrido fijo de referencia | Récord por tramo | sin ?ir= hoy (pendiente) |
Cada nodo muestra: miniatura de su paisaje, nombre, sus 3 encargos y el "se abre con..." si está cerrado (cerrado = se puede probar, no se oculta). Ojo: el Cuaderno real tiene 10 niveles de 3 encargos (cuaderno.js); la Ruta muestra 5 al inicio y el resto como camino que sigue.

## Razón de volver, sin culpa
Modelo Hooked, gate ya dicho en DECISIONES: entretenedor, no manipulador. Reglas:
1. Disparador externo = lo nuevo, no una alarma: "Esta semana se abre: [nodo]" y una etiqueta NUEVO (punto naranja) en lo que cambió en 7 días, leída de public/novedades.json.
2. Racha de días sin castigo: si faltas, no se pierde nada; el mapa dice "Moki te esperaba" y las piezas ganadas quedan. Nada de contadores falsos ni "te quedan 3 h".
3. Recompensa variable honesta: un momento sorpresa por nodo (pieza rara, cambio de luz, canción nueva), sin probabilidades ocultas.
4. Inversión: sellos y piezas que se quedan en el Cuaderno.
5. Fallar enseña (lección del brandkit) y reintenta en <2 s; desde el nodo, "otra" es un toque.

## Cualidades prestadas, TRANSFORMADAS
- Alto's Odyssey: encargos de 3 que suben de nivel -> nuestros 3 del Cuaderno, visibles en el nodo, pero con sellos de papel y no con XP. No copio el Zen: Paseo ya cubre calma.
- Mario Run: mapa con nodos y monedas que invitan a repetir -> nuestro camino de papel y piezas por tramo; sin monedas de colores ni pago de desbloqueo.
- Celeste: capítulo con arte propio y secretos -> cada nodo con su paisaje y un rincón escondido; sin dificultad como mensaje ("modo asistente" ya lo cubre el Paseo).
- Crossy Road: desbloqueos y regalo diario -> un traje o poncho de Moki por nodo (Pixel o HD, siempre con parche MOKI en la oreja derecha, nunca espejado); regalo diario = el Reto del día, sin gachapon ni dinero.

## Cómo se mide (sin esperar datos públicos)
- Bots (src/debug/bots.js): un bot abre cada tarjeta por su ?ir= y verifica que cae donde dice; un bot nuevo y uno de nivel 5 llegan a lo nuevo en 1 toque.
- Jugador simulado: perfiles novato / medio / experto recorren la Ruta; meta: novato no pierde en los primeros 20 s, tasa de "otra" tras fallo en el termómetro de diversión (el canon del 7-nov), >= la de la versión previa.
- Termómetro: tiempo a primer salto, % de partidas "otra", reintento <2 s, nodos probados por sesión simulada. Contador anónimo de vuelta al día siguiente, solo como señal tardía.

## Lo que necesita el menú (SELECTOR, 3 estados)
- Nuevo: tarjeta JUEGA LO NUEVO grande y primera; nodo 1 resaltado; sin textos de candado; 0 culpa.
- Vuelve: si cambió la versión desde la última visita (localStorage), "Lo nuevo desde tu última visita" con 3 líneas y botón; etiqueta NUEVO en los nodos tocados.
- Nivel 5: mapa completo con Libre, Reto y Clásico; "Esta semana se abre" con el siguiente nodo.
- Datos: campo "donde" (nodo + ?ir=) por línea en novedades.json; lista de nodos con paisaje, 3 encargos y "se abre con"; lectura del Cuaderno (notas/sellos) para marcar hecho.
- Parser ?ir= en main.js (hoy NO existe en src: solo hay ?escaparate y ?debug); valores nivel2|noche|libre|reto|ciudad|trampolin|viento|timbre|formas. ?ir= debe saltarse el candado de progreso (Ley de la última versión §3) y el candado por fecha de tramp.reto '2026-11-09'.
- Encaje en 660x372, 390x844 y 1280x720 sin encimarse. Un nodo = un toque.

## NO verificado
No jugué nada, no abrí navegador ni capturas. No confirmé si ya existe algún parser ?ir= fuera de src (solo busqué en src). No leí GDD.md ni medí tramos; la tabla de nodos sale del config y del COLA, y "Playa", "Ciudad" y su orden de aperturas no están confirmados en el código. Los umbrales del termómetro no tienen número medido. Cómo se siente el mapa en celular, nadie lo ha visto.
