# ARTE.md: Moki: Un salto más

Fuentes: PILOTO.md, `assets/brand-tokens.css`, `assets/moki/`, `assets/juice/1.2.0/README.md`, brandkit marca personal 0.6, Biblia de Moki 0.1. Solo marca personal de Jorge.
Si algo no está aquí ni en los assets, no se inventa: se pregunta al líder.

## 1. Identidad en una frase
Un diorama de cartón y papel, con Moki como títere, donde el naranja siempre dice hacia dónde va la acción.

## 2. Mood
Cálido, artesanal, tranquilo y juguetón. Se siente como mover un títere sobre una mesa con luz de lámpara suave. Fallar no castiga: se aprende y se vuelve a intentar.

## 3. Formas
| Elemento | Regla |
|---|---|
| Siluetas | Simples y legibles a 375 px. Bloques de cartón, esquinas redondeadas, nada puntiagudo agresivo. |
| Grosor de cartón | Piezas del plano de juego: canto visible de 4 a 6 px (franja kraft más oscura bajo el borde superior). Fondos: canto de 2 a 3 px. |
| Cantos | Borde de papel ligeramente irregular (rasgado leve), sin trazo negro uniforme. |
| Radios | Usar los tokens: control 6, tarjeta 12, panel 18, editorial 24 px. Piezas de mundo: 6 a 12 px. |
| Escala | Todo al múltiplo de 4 px del sistema de espacio (`--brand-space-*`). |

## 4. Color (solo tokens, hex exactos)
| Token | Hex | Significado en el juego |
|---|---|---|
| `--brand-background` | #0A0A0A | Marco, pantallas de menú, fondo de "Así lo hicimos". Nunca como cielo del juego. |
| `--brand-surface` | #161616 | Paneles de UI sobre oscuro. |
| `--brand-accent` | #FF6B35 | Guía de acción: Moki, obstáculos principales, botón primario, siguiente paso. |
| `--brand-accent-warm` | #FFA500 | Checkpoint ámbar y recompensa especial (guardar lo aprendido). Es lo único ámbar del mundo. |
| `--brand-paper` | #F4E8D5 | Papel: cielo de diorama, tarjetas, texto sobre oscuro suave. |
| `--brand-kraft` | #B99168 | Cartón: suelo, cantos, plataformas, piezas recogibles. |
| `--brand-ink` | #22211F | Texto sobre papel, contornos suaves, visor de Moki, sombra base. |
| `--brand-text-muted` | #B7B3AD | Texto secundario sobre oscuro. |
| `--brand-border` | #8A7E70 | Bordes finos, pliegues, divisores. |
| `--brand-text-on-dark` | #FFFFFF | Texto sobre oscuro. |

- Peligro = cartón kraft oscurecido con una franja naranja (#FF6B35). No hay rojo. Recompensa = pieza kraft con canto claro. Checkpoint = ámbar #FFA500.
- Naranja con medida: máximo un foco naranja por zona de pantalla fuera de Moki. Si todo es naranja, nada guía.
- Sombras: tinta #22211F al 12 a 28% de opacidad. Nunca negro puro encima del papel.
- Cielo/fondo del diorama: papel #F4E8D5 con variación leve hacia kraft. Sin degradados brillantes.

## 5. Tipografía
| Uso | Fuente | Tamaño (desktop / <=580 px) |
|---|---|---|
| Títulos (H1) | Outfit 700 | 56/60 px / 36/40 px |
| Subtítulos (H2), nombre de lección | Outfit 700 | 40/46 px / 28/34 px |
| Cuerpo (texto de lección, créditos) | Inter 400 | 18/28 px |
| UI (botones, puntaje) | Inter 400 (números y botones en Outfit 700) | 16/24 px |
| Notas | Inter 400 | 14/20 px |

- Fuentes empacadas localmente, sin CDN. Si faltan los archivos, el líder los pide; no sustituir por otra familia.
- Contraste: texto sobre papel usa #22211F; texto sobre oscuro usa #FFFFFF o #B7B3AD (solo secundario). Nada de texto naranja pequeño sobre papel.
- HUD: puntaje y piezas con fuente mínima de 16 px, sobre una etiqueta de papel (no flotando sobre el fondo).

## 6. Moki
Poses disponibles en `assets/moki/` (mismos .webp que `assets/juice/1.2.0/moki/`). Todas mirando a la derecha o de frente, con parche visible solo donde corresponde.

| Estado | Pose | Archivo | Cómo se logra |
|---|---|---|---|
| Correr | Perfil | `assets/moki/moki-lado.webp` | Pose fija mirando a la derecha. Vida con vaivén vertical de 2 a 3 px en 2 tiempos por zancada y sombra de contacto que late. Sin pierna animada (no hay sprite). |
| Saltar (anticipar) | Perfil | `moki-lado.webp` | 80 a 100 ms de agachar: squash 2 a 3%, sombra se ensancha. |
| Saltar (en el aire) | Perfil | `moki-lado.webp` | Sube con ease-out, inclinación de 0 a -6 grados hacia adelante, sombra se aleja y se aclara. |
| Caer | Perfil | `moki-lado.webp` | Ease-in, inclinación de hasta +6 grados, sombra se acerca y se oscurece. |
| Aterrizar | Perfil | `moki-lado.webp` | Squash 2 a 3% por 100 a 140 ms, polvo de papel (3 a 5 trozos kraft), asienta con ease-out. |
| Fallar | Tres cuartos o parado | `moki-tres-cuartos.webp` (preferida) o `moki-parado.webp` | Corta a la pose, cae 6 a 10 px, sin rebote. Luego tarjeta de lección. |
| Checkpoint | Bandera | `moki-bandera.webp` | Entra sobre la base ámbar, asienta en 280 ms. |
| Inicio / saludo | Saluda | `moki-saluda.webp` | Pantalla de inicio y retorno tras fallar. |
| Récord / celebrar | Saluda o bandera | `moki-saluda.webp`, `moki-bandera.webp` | Sin brincos extra; confeti de papel según nivel de juice. |
| "Así lo hicimos" | Compu o verifica | `moki-compu.webp`, `moki-verifica.webp` | Acompaña roles del equipo. |
| Asomar (esconder detalle) | Asoma | `moki-asoma.webp` | Solo en pantallas de carga o menús, nunca en el plano de juego. |

Reglas de Moki
- **Nunca espejado.** Prohibido `flipX`, `scaleX = -1` o cualquier reflejo. Moki corre hacia la derecha; si el mundo debe cambiar de lado, cambia el mundo.
- **Parche MOKI en la oreja derecha de Moki** (referencia: `moki-referencia-parche.png`, `moki-parche-derecho.png`). Al mirar a la derecha, el parche queda visible sobre la oreja del lado que vemos. No pintar ni mover otro parche.
- **Visor sin cara.** Visor oscuro con un solo brillo pequeño. Sin ojos, boca ni emoji.
- **Casco rígido.** Cabeza y casco no se deforman. Squash solo en el cuerpo, máximo 3%.
- Escala en pantalla: Moki mide 18 a 22% de la altura del área de juego (referencia 96 a 120 px de alto en 1280 px, 64 a 80 px en 375 px). Misma escala en todos los estados.
- Sombra de contacto siempre presente bajo Moki (elipse #22211F al 20 a 28%). Es lo que lo "pega" al suelo.
- Hitbox más chico que el sprite: el jugador siente justo, no castigado.

## 7. Mundo: capas de parallax (4)
| Capa | Velocidad | Contenido | Tratamiento papercraft |
|---|---|---|---|
| 1. Fondo | 0.1x | Cielo de papel #F4E8D5, nubes de papel recortadas | Fibras suaves, sin canto fuerte. Muy poco contraste. |
| 2. Lejos | 0.3x | Siluetas de colinas, casitas, cajas de cartón (kraft claro) | Canto de 2 px, tono 10 a 15% más claro que el plano de juego. Sombra de contacto tenue contra la capa de atrás. |
| 3. Medio | 0.6x | Árboles de cartón, postes, pilas de libros | Pliegues dobles, canto de 3 px, sombra de contacto de 8 a 12 px de desenfoque. |
| 4. Juego | 1.0x | Suelo, obstáculos, piezas, checkpoints | Canto de 4 a 6 px, fibras visibles, pliegue central, mayor contraste. Moki vive aquí. |

- Primer plano opcional (0 a 2 elementos por pantalla, 1.3x): hojas o tiras de cartón, solo en bordes, nunca tapando obstáculos.
- Luz: una sola fuente, arriba a la izquierda. Sombras caen hacia abajo-derecha y son cortas y suaves.
- Material: fibras como textura de papel kraft multiplicada al 8 a 12%, pliegues como líneas finas #8A7E70, cantos como franja kraft más oscura. Texturas pequeñas, repetibles (tileables), cargadas localmente.
- La profundidad se hace con contraste y desenfoque de sombra, no con degradados brillantes.

## 8. Obstáculos, recogibles y checkpoints
| Pieza | Diseño | Notas |
|---|---|---|
| Caja baja | Bloque kraft con cinta naranja #FF6B35 | Salto corto. |
| Torre de cajas | 2 a 3 bloques apilados | Salto sostenido (mantener presionado). |
| Hueco en el suelo | Corte de cartón con canto visible y fondo kraft oscuro | Borde con 4 a 6 px de canto para leerse a 375 px. |
| Pieza recogible | Ficha circular de cartón kraft con canto claro y un pequeño pliegue | Sin brillo ni destello. Al recogerla: sube 12 px, se encoge y desaparece en 200 ms. |
| Checkpoint | Base de cartón con poste y bandera ámbar #FFA500 plegada | Texto "Aprendizaje guardado" en etiqueta de papel, 1.6 s, no bloquea. La bandera se despliega con ease-out en 280 ms. |
| Peligro | Siempre cartón con detalle naranja y contorno claro | Nunca ámbar (ámbar es solo checkpoint y recompensa especial). |

- Separar siempre obstáculo de fondo: más contraste y sombra de contacto fuerte que las capas 1 a 3.
- Espaciado: dejar siempre un camino ganable; el primer obstáculo aparece tras 2 s de calma.

## 9. UI y texto
| Pantalla | Reglas |
|---|---|
| Inicio | Título H1 en Outfit, Moki saluda, un solo botón primario naranja (radio 6 px, alto mín. 48 px). |
| HUD | Puntaje y piezas en etiqueta de papel arriba, margen 16 px, fuente >= 16 px. Distancia a la izquierda, piezas a la derecha. |
| Tarjeta de lección | Panel de papel #F4E8D5, radio 18 px, texto #22211F, canto kraft, sombra de contacto. Lección en Outfit 700 (28 a 40 px), nota de apoyo en Inter 18 px. Botón "Intentar de nuevo" naranja. Textos aprobados: "La siguiente partida empieza con lo aprendido", "Cada salto empieza por observar", "Fallar, ajustar y volver a intentar". |
| "Así lo hicimos" | Fondo #0A0A0A, paneles #161616 con radio 12 a 18 px. Roles del equipo (líder, constructor, probador, director de arte), cuántas veces intervino Jorge, liga a jorgesuarez.com.mx como botón claro. Moki en pose compu o verifica. |
| Menú de juice | Niveles Nada / Poquito / Mucho / Hardcore (Hardcore con candado hasta cumplir la condición). Usar `juice-menu` del paquete 1.2.0. |

- Jerarquía: un solo elemento naranja dominante por pantalla (el botón o Moki).
- Áreas táctiles >= 48 px. Todo el lienzo es el botón de salto.
- Entradas de UI: 180 a 320 ms, ease-out; salidas 140 a 200 ms, ease-in.

## 10. Animación: títere de papel
- **Anticipa, actúa, asienta.** Cada acción importante tiene los tres tiempos: agacharse 80 a 100 ms, acción, asentar 120 a 180 ms.
- Squash máximo 3% en el cuerpo. Casco rígido. Sin estiramientos de caricatura.
- Curvas con easing siempre. Nada lineal en personajes (permitido solo el avance constante del mundo).
- Rotaciones pequeñas (máximo 6 grados) para dar sensación de títere colgado de un hilo.
- Piezas del mundo: pequeños balanceos de 1 a 2 grados al entrar, con asentado.
- Cámara: sin sacudidas fuera de Hardcore. Sin zoom automático.
- Nada en loop infinito molesto: efectos decorativos tienen número de vueltas finito. Permitidos: avance del parallax, vaivén de carrera y vaivén sutil de checkpoint inactivo (máx. 2 px).
- Todo en una pieza de papel: no mezclar vectores lisos con fotos pegadas.

## 11. Niveles de juice
| Nivel | Qué ocurre |
|---|---|
| Nada | Sin partículas, sin sonido, sin shake. Solo transiciones esenciales. |
| Poquito | Polvo de papel al aterrizar, pequeño pulso al recoger pieza, sonido corto de papel. |
| Mucho | Lo anterior más confeti de papel en checkpoint, chispas kraft/naranja y onda chica; combo visible. |
| Hardcore | Screenshake pequeño (nunca en el HUD), escombro de papel (máx. 90 piezas), combos x2 a x5, fanfarria <= 0.4 s. Desbloqueable. Sin bloquear clics. |

- Partículas: trocitos de papel de #B99168, #F4E8D5, #FF6B35 y #FFA500. Nada de chispas brillantes ni destellos.
- Sonido: solo tras el primer gesto, apagable, volumen maestro bajo.
- Usar los colores de marca de juice: `--jz-c1`, `--jz-c2`, `--jz-c3` = #FF6B35, #FFA500, #F4E8D5.

## 12. Movimiento reducido
Con `prefers-reduced-motion: reduce`:
- Parallax estático o con desplazamiento mínimo; sin vaivén de Moki; sin shake, escombro, combos ni confeti.
- Transiciones de UI en fundido de 120 a 180 ms.
- Moki sigue corriendo (es la mecánica), pero sin squash ni rotaciones; la sombra marca el salto.
- Hardcore apagado.

## 13. Rechazo inmediato (revisión de capturas)
Una sola de estas basta para ARTE: RECHAZADO.
1. Moki espejado o parche fuera de su oreja derecha.
2. Cara, ojos o boca en el visor.
3. Neón, glow, brillo plástico o degradado brillante.
4. Colores fuera de la paleta (rojo, azul puro, verde, morado).
5. Fondo plano sin capas ni sombras de contacto (no parece diorama).
6. Moki deformado: casco aplastado o squash mayor al 3%.
7. Texto ilegible a 375 px o con contraste bajo.
8. Obstáculos que se confunden con el fondo o con piezas recogibles.
9. Mezcla visible de estilos (vector liso junto a fotos de cartón).
10. Elementos de otras marcas o empresas.

## 14. Huecos conocidos
- No hay poses de Moki para saltar, caer, aterrizar ni correr con piernas. Se cubre con `moki-lado.webp`, inclinación, sombra y squash <= 3%. Si el resultado se ve estático, el líder debe escalar la solicitud de poses nuevas (salto, caída, zancada) en vez de que alguien las dibuje.
- No hay pose de "fallo" dedicada: se usa `moki-tres-cuartos.webp` o `moki-parado.webp`.
- Sin texturas de cartón, fibras ni piezas de mundo en assets: el constructor las genera o dibuja procedurales en cartón/papel y el director de arte las revisa en el primer hito.
- Fuentes Outfit e Inter no vienen en `assets/`; deben incluirse localmente.

### Decisiones del líder (28-oct)
- Paleta verificada contra brandkit.jorgesuarez.com.mx 0.6 en vivo: los 8 colores coinciden. La cabecera "0.3" de brand-tokens.css es vieja; manda esta tabla.
- Poses: se arranca con moki-lado + inclinación + sombra + squash. En el primer hito visual el director juzga; si se ve estático, el líder escala a Jorge las poses nuevas (no se dibujan aquí).
- Fuentes: empacar local con los paquetes npm @fontsource/outfit (700) e @fontsource/inter (400). Nada de CDN.

### Decisiones del líder tras la QA final (29-oct)
- Tamaño de Moki: a 1280 mide ~145 px (§6 pedía 96-120). Se acepta: escala con la altura de la pantalla y a 375 queda en ~78 px. Manda el celular.
- "Así lo hicimos" va en papel crema con tarjetas de cartón, no en #0A0A0A (§9). Aceptado en T3a2.
- Legibilidad de obstáculos: borde del obstáculo contra el fondo pegado (moki.contrast) ≥2.0 en las 4 horas, medido a 375 px, que es el tamaño principal. Caja, torre y viga.
