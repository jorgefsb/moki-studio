# Contrato de estilo: Moki: Un salto más

P5 corte TÍTULO, paso 0 (constructor, 9-nov). Una página. Lo que no se negocia en ninguna pieza visible, empezando por la pantalla de título. Fuentes: ARTE.md §4, §5, §6 y §13, biblia de Moki, brandkit personal (brandkit.jorgesuarez.com.mx), atardecer de papel del nivel 1 (`src/art/atardecer.js`, `TARDE`).

## 1. Moki (biblia)
- Parche MOKI en la oreja **derecha anatómica**. Nunca espejado: ni `flipX`, ni `scaleX < 0`, ni reflejo en shader. Si algo debe mirar al otro lado, se mueve el mundo.
- Nunca en pose T. Visor sin cara: un solo brillo, sin ojos ni boca.
- Casco rígido; squash solo en el cuerpo, máximo 3 %. Sombra de contacto siempre debajo.
- Solo poses de `assets/moki/` (y las tiras de `assets/moki/pixel/` que ya usa el juego). No se dibuja un Moki nuevo.

## 2. Marca
- Solo marca personal de Jorge Suárez. Nada de otras empresas ni marcas ajenas.
- Tokens: tinta #22211F, papel #F4E8D5, kraft #B99168, naranja #FF6B35 (acción), ámbar #FFA500 (solo checkpoint y recompensa). Sin rojo, azul puro, verde ni morado.
- Tipos: Outfit 700 en títulos, números y botones; Inter en cuerpo. Empacadas locales.

## 3. Mundo: diorama de papel
- Todo es papel o cartón recortado: canto visible, sombra de contacto corta hacia abajo-derecha, luz de arriba a la izquierda.
- Sin neón, glow, brillo plástico ni degradado brillante. La profundidad sale de capas planas y contraste.
- **Referencia de color: el atardecer de papel del nivel 1** (cielo #F79E52 → #FCB646, cordillera #F08A4E, colina media #C59A6E, sol de papel #FFD56B a la derecha, suelo kraft cálido, obstáculo #452B1C, lo más oscuro del paisaje).
- El beige liso de papel como cielo completo ya no es la cara del juego: se queda solo para tarjetas y paneles.

## 4. Pantalla de título
- El jugador nuevo ve el juego vivo detrás: Moki corriendo en el atardecer, no un fondo aparte.
- Encima, un solo panel de papel con JUGAR (naranja, alto ≥ 48 px) y el cartel "Lo nuevo de hoy". Un solo foco naranja dominante.
- Texto sobre papel con tinta #22211F; nada de texto naranja chico sobre papel. Legible a 375 px.
- Nada se encima: panel, Moki, HUD y sol no se tapan entre sí. JUGAR a más de 12 px del suelo en 660×372.

## 5. Cómo se califica
- **Identidad visual** y **jugabilidad** se califican por separado (método gokayfem, solo el método): un ciego dice cuál pantalla se ve más "Moki de papel" y, aparte, cuál deja más claro qué hacer.
- Una sola regla de ARTE.md §13 rota = RECHAZADO, aunque gane el ciego.
- Las capturas las mira un invitado, no el asiento fijo.
