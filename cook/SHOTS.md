# SHOTS del Cook 1: «Que se vea como juego publicado»

Meta: las 3 primeras páginas de la 1.ª partida se ven como juego publicado, al nivel de Alto's Odyssey en luz, profundidad, color, clima y hora. Mecánicas intactas. Nada se copia de Alto's: se toma el método. Todo en código (Phaser: Graphics, gradientes, texturas generadas, shaders chicos) o con arte propio. Paleta: marca personal (accent #FF6B35, warm #FFA500, paper #F4E8D5, kraft #B99168, ink #22211F).

Nota de lectura: R06 es la misma escena de R01 en otra resolución; la uso como segunda lección de la misma hora. Los 6 stills de master (S01-S06) son hoy CASI IDÉNTICOS: mismo cielo ámbar, mismos cerros, mismos pinos; solo cambian cajas, fichas y globos. Esa es la brecha mayor: no hay "hora" ni "lugar" por página.

## Plan de horas por página

| Página | Stills | Hora y clima propuestos | Referencias que la guían | Cielo (arriba a horizonte) |
|---|---|---|---|---|
| 1 | S01-S02 | Atardecer dorado, aire limpio, sol grande bajo | R03 (color y sol), R01/R06 (capas) | #7A3F3A, #E2724A, #F59A52, #FFD27A |
| 2 | S03-S04 | Mediodía claro con bruma fría y lluvia fina al final | R05 (luz y bruma), R02 (lluvia y niebla) | #3F7FA8, #7FB4D0, #BFE0EA |
| 3 | S05-S06 | Crepúsculo a noche: violeta, luna, estrellas | R04 (noche), R01/R06 (rosa del horizonte) | #1F2250, #4A4F96, #8B5E96, #D98A8F |

Cada página cambia de hora con un tween de 4 a 6 s en la costura de página (ya existe el cruce de hoja de papel, 600 ms; el tween del cielo corre debajo). Mantener la textura de papel encima en todas: es lo que nos hace nosotros y no una copia.

---

## R01 <-> S01 (página 1: atardecer dorado, aire limpio)

R01 es el crepúsculo rosa; de él tomo el MÉTODO de capas, no el color (el color de la página 1 viene de R03).

Qué tomar:
- 5 capas de paralaje, de lejos a cerca, por valor tonal (L aprox., 0 negro, 100 blanco): cielo L70 en horizonte; cerros lejanos L52 (casi del color del cielo); cerros medios L44; cerros cercanos con siluetas L36; primer plano L14 (casi negro con tinte).
- Perspectiva atmosférica: lo lejano tiene el color del cielo mezclado (60 a 75 %) y poco contraste; lo cercano tiene casi su color propio y mucho contraste. Hay una banda de niebla clara entre capas.
- Degradado de cielo con el color MÁS claro y saturado pegado al horizonte, detrás del sol, y más oscuro arriba. Hex a ojo: arriba #5A3550, medio #B8567C, horizonte #F98BA0 (solo como guía de proporción; en la página 1 se traduce a ámbar).
- Siluetas: formas simples, planos rectos, una torre distintiva en el centro que corta el sol (silueta contra el disco). Una sola cosa "importante" lejos.
- Luz: disco blanco pálido con halo grande (radio de halo = 4 a 5 veces el disco) en degradado suave.

Qué le falta hoy a S01:
- Cielo (y 0-300): ya es bonito, pero NO hay sol ni halo. El horizonte (y 300) no es más claro que el resto: se ve una sola nube de papel difuminada, no un punto de luz.
- Cerros (y 350-560): una sola banda de cerros mauve con pinos del MISMO valor encima. Hay 2 planos donde Alto's tiene 4-5. Pinos y cerros casi igual de oscuros: no se separan.
- Niebla: ninguna entre planos; el color de la capa media no se acerca al del cielo.
- Primer plano (y 560-720): hay un suelo kraft con canto, pero nada oscuro por delante o por encima; falta una silueta cercana casi negra que dé escala (rama, pasto alto, roca).
- Moki (x 210-300, y 450-590): cuerpo naranja sobre fondo naranja; solo el casco blanco y negro lee. Ver "Lectura de Moki".

## R02 <-> S02 (página 2: mediodía claro con lluvia fina y bruma; S02 pertenece a la página 1, ver nota)

S02 es todavía página 1 (60 m). Lo uso para la segunda lección de la página 1: que el fondo avance. Qué tomar de R02 para la página 2 (S03-S04):
- Degradado turquesa a azul: arriba #3F8FA6, centro #6FD0B4, abajo #3B6E93 y bruma gris-azul en el pie #8FA6B0.
- Paralaje con 3 cerros muy lavados (L58, L52, L46) casi del color del cielo, más 2 planos cercanos verde-oliva oscuro (L30 y L16). Sol/luna pálido (disco #8FEBD0, sin borde duro) y halo ancho.
- Lluvia: rayas diagonales largas, de 8 a 12 % de opacidad, ángulo aprox. 80 grados, 2 velocidades (cerca más rápido y más gruesa).
- Niebla de piso: gradiente vertical que nace en el suelo y sube 25 % de la pantalla, color gris-azul #7C98A6 al 60 %.
- Siluetas: una torre alta cercana a la derecha que ocupa 55 % de la altura (da escala y bloquea paralaje); rocas con cantos duros.

Qué le falta hoy a S02 (y por extensión a la página 1 completa):
- Dos pinos de cartón translúcido aparecen y se encienden de golpe (x 20-100 y 880-1010): se leen como sticker, no como capa de paralaje con su valor.
- Cruz-poste (x 620-690, y 365-500): mismo valor que los cerros; es un adorno suelto sin función de profundidad.
- No hay cambio ninguno respecto a S01 en 41 m de recorrido: sin deriva de nubes, sin cambio de luz. Hoy el único movimiento de fondo es el paralaje; falta una luz que cambie lento.

## R03 <-> S03 (página 1 y arranque de la 2: atardecer dorado de referencia)

R03 es el mejor modelo de color para la página 1 y de SILUETA OSCURA contra cielo claro.

Qué tomar:
- 4 capas de dunas ya muy parecidas a nuestros cerros: L58 (casi cielo), L50, L42, L33; cada una un paso más oscura y más saturada hacia el café. El mismo matiz naranja en todo, el valor lo hace todo.
- Degradado de cielo: arriba #8A4A45 (vino, no negro), medio #E8794E, horizonte #F9A85C, sol #FFF08A con halo #FFD27A. Hex a ojo.
- Palmas altas negro-café (L12) en primer plano, a 3 distancias distintas: son la lección de escala y de contraste de valor. Troncos finos, copas con plumas duras.
- Luz: sol con borde ligeramente "mordido" por la duna (el sol se esconde detrás de la capa), halo cálido sobre las capas medias (aclara sus bordes superiores).
- Globos aerostáticos pequeños y translúcidos a media distancia, con L cercana al cielo: aire vivo con muy poco costo.

Qué le falta hoy a S03:
- Sol: no existe en pantalla (es el SOL de capas.js que baja en el nivel; en S03 no se ve). Es el punto focal de Alto's y aquí falta. Región: centro-derecha, y 330-560.
- Contraste de valor: todo el fondo está en una banda estrecha (L40 a L62). No hay un negro. Alto's usa 5 a 6 pasos de L12 a L70. Falta el extremo oscuro delante (palmas/pinos grandes casi ink #22211F con 8 % de naranja) y el extremo claro (sol).
- Los pinos de fondo se leen como una tira horizontal homogénea (y 290-560); falta escalonarlos: unos grandes y oscuros cerca (altura 60 % pantalla), otros pequeños y pálidos lejos.
- Globo (x 560-645, y 100-230): grisáceo, con rótulo encima; su valor es el del cielo, por eso se lava. Puede ser más cálido y más oscuro (L45).
- Mariposas (x 870-950, y 120-190): chicas, grises; sin función, se parecen a basura de textura.

## R04 <-> S04 (página 3: crepúsculo a noche azul-violeta)

Qué tomar:
- Cielo con 4 paradas: cima #1B2152 (azul tinta), centro #4C4F9A, banda violeta #8A5E96, horizonte #D98A8A (rosa muy chico, 15 % de la altura). La noche no es negra: es azul con un único calor en el horizonte.
- Paralaje: cerros en 3 planos azul-violeta, L45, L38, L30; el último casi del color del suelo. Los lejanos tienen fantasma de arquitectura (arcos, torres) a muy baja opacidad: relleno narrativo sin costo.
- Luna: disco #E9E6F5 con cráteres suaves y halo #6A6FB8 al 35 %. Estrellas: 60 a 120 puntos, 3 tamaños, parpadeo lento por tween de alfa, más densas arriba y casi ninguna en el horizonte.
- Estrellas fugaces: 1 cada 15-25 s, raya fina que cruza en 600 ms.
- Luz propia: globo con brasa naranja (#FF8A3C) que es la ÚNICA mancha cálida; ancla el ojo y compite con el cielo frío.
- Valor: suelo y primer plano L8 a L14, casi negro azulado; Moki y sus obstáculos van claros contra eso solo si llevan un borde de luz.

Qué le falta hoy a S04:
- Toda la imagen es todavía atardecer ámbar (nada de noche). La noche existe en el juego (nivel 2) pero no en las 3 primeras páginas.
- Cielo (y 0-290): ámbar-papel, sin estrellas, sin luna, sin banda violeta.
- Suelo y capas: no hay tono azul-noche. El kraft claro del suelo se mantiene; en la noche debe bajar a L25 con tinte azul pero conservar el canto crema donde pisa Moki.
- Luz cálida puntual: no hay ninguna. Las fichas (x 910-1090, y 335-520) podrían brillar (halo naranja 8-10 px) solo en esta hora.

## R05 <-> S05 (página 2: mediodía claro con bruma)

R05 es el mediodía cian con sol blanco y agua; de él tomo luz y aire, no el agua.

Qué tomar:
- Cielo azul profundo arriba #2E6191, medio #6AA6D0, horizonte #B8DEF0, cercano al sol casi blanco #EAF8FF. Contraste entre arriba y horizonte grande (L35 a L88).
- Sol blanco con DOBLE halo: uno chico a 1.5 r (casi blanco) y otro grande a 5 r (celeste a 20 %), más una luna fantasma a baja opacidad (6 %). Un destello cruzado muy tenue (cuadrícula de 4 gajos a 3 % de alfa) es parte del look.
- Capas lejanas casi sin contraste: castillo y cerros en gris-azul #7A8FA0 sobre el cielo #A8D0E6: la atmósfera se come el valor (diferencia de L de apenas 10).
- Primer plano muy diferente en color (arena #E0A98C, verde pino oscuro #28372E, ladrillo #5A3A44): contraste por TEMPERATURA además de valor.
- Pájaros blancos chicos (3) y globos grises: detalles de vida lejana.

Qué le falta hoy a S05:
- Es la misma escena ámbar. No hay una hora clara ni un cielo frío que cambie la lectura de Moki.
- No hay bruma entre capas ni halo. El suelo kraft y las cajas con canto crema funcionarían MUY bien contra un cielo azul-claro (contraste cálido sobre frío); hoy no lo aprovechan porque todo es cálido.
- Los cartones translúcidos (x 540-700, y 330-510) que cruzan en esta toma parecen pinos fantasmas; deben quedar como pinos con valor propio, de 3 distancias.
- La caja colgante (x 1050-1175, y 290-335) con cables finos cae sobre un pino y un cielo del mismo valor: ver "Lectura de Moki".

## R06 <-> S06 (página 3: crepúsculo con halo rosa y estrellas)

R06 (versión chica de R01). Segunda lección de la página 3: el HALO.

Qué tomar:
- Halo radial rosa-magenta muy ancho (radio 40 % del alto de pantalla): centro #F987A4, borde #5A3A6E. Detrás del sol/horizonte y por encima de TODAS las capas lejanas: tiñe los bordes superiores de las siluetas.
- Siluetas de cerros con borde superior ligeramente más claro (rim light) en la capa que está justo bajo el halo; la parte baja de cada capa se oscurece (gradiente vertical por capa, 12 a 18 puntos de L).
- Niebla entre planos: capas lejanas fundidas con el cielo y valle oscuro entre el segundo y tercer plano.
- Fichas/luces pequeñas cálidas (5 puntos naranja con halo de 4 px) como guía visual de ruta y recompensa.
- Trazo curvo del patinador en el cielo: la estela es una línea fina, nuestra cinta de Moki puede hacer lo mismo y funciona como "firma" del salto.

Qué le falta hoy a S06:
- Sin halo alrededor del punto de luz: la luz viene "plana" del cielo.
- Nada de rim light: las siluetas de pinos (x 350-1280, y 280-570) no brillan por arriba; las cajas y fichas son lo único con canto claro.
- Las capas no tienen degradado vertical por plano; Alto's las oscurece hacia abajo para que la niebla entre planos se lea.
- Cinta de Moki (x 80-220, y 515-540): ok, pero blanca-naranja sobre fondo naranja; a la noche debe ser el elemento más claro de la pantalla.

---

## Lectura de Moki

Cómo lo hace Alto's:
1. Valor primero, color después: el patinador es una silueta casi negra (L8-L14) sobre un cielo claro (L55 a L85). Contraste de L de 40 a 70 puntos. Nunca se pierde.
2. La silueta es pequeña pero muy limpia: sin interior. El único detalle de color es la bufanda o el trazo del salto (una línea fina y clara).
3. Lo que está CERCA del jugador es oscuro y plano; lo que está LEJOS es claro y bajo en contraste. El jugador vive en la franja más oscura y nada del fondo compite con su valor ahí.
4. Obstáculos: misma lógica, siluetas oscuras con borde duro. Colectables: las ÚNICAS cosas luminosas (halo) en una escena apagada.
5. El fondo directamente detrás del personaje se vuelve más homogéneo (niebla, un solo plano) y desciende de contraste.

Qué aplica a Moki:
- Hoy el cuerpo naranja (#FF6B35 con blancos) se pierde sobre cerros y pinos naranja-café (diferencia de matiz casi 0, valor cercano). Solo el casco lee. Soluciones sin tocar el personaje: (a) subir contraste del fondo detrás de él: cerros y pinos 10 a 15 puntos de L más CLAROS y menos saturados detrás de x 150-350 (niebla de valle), de modo que Moki (más oscuro y saturado) separe; (b) un borde de luz cálida 1-2 px (rim) en Moki del lado del sol, ya compatible con cantoPapel; (c) en página 2 (cielo frío), el naranja de Moki gana por temperatura; en página 3 el cuerpo claro y la cinta blanca ganan por valor.
- Reglas de valor para las páginas: franja de juego (altura de Moki y obstáculos, y 400-590) con diferencia mínima de L 25 entre el fondo y Moki; cajas con cuerpo #452B1C y canto crema ya cumplen la regla de ARTE (2.0), mantenerla.
- Las fichas deben ser lo único que BRILLA: halo suave aditivo 6 a 8 px, solo en la hora oscura (página 3) y más tenue de día.

---

## Receta en código

Presupuesto: 60 fps en celular a 390 px. Reglas: una sola textura horneada por capa/hora (nada de redibujar Graphics cada frame), gradientes generados con canvas en carga y cacheados, shaders solo para halo/viñeta si el canvas no alcanza, partículas máximo 40 vivas. Coste en "draw calls" y fillrate relativo.

1. **Cielo en degradado por página con tween de hora** (impacto: muy alto). Textura canvas de 4 paradas por hora (tabla de arriba), 1 sprite de pantalla completa; el cruce entre horas = dos sprites con alfa tween 4 a 6 s, o un uniform "mezcla" en un shader trivial. Costo: 1 draw call extra durante el tween, 0 fuera. Reusa Ambient.applyDay/DAY.

2. **Sol y luna con halo, y que lo corte el horizonte** (muy alto). Sprite de disco + 2 sprites de halo radiales (gradiente radial horneado, blend ADD, alfa 0.25 y 0.10), detrás de la capa de cerros más lejana. Sol (p1) dorado, mediodía blanco (p2), luna con cráteres (p3). Costo: 3 sprites, ADD sobre ~25 % de pantalla: bajo-medio; en móvil bajar el halo a 256 px y escalar.

3. **N=5 capas de cerros con tinte atmosférico por distancia** (muy alto). Cerros generados con ruido 1D (suma de 3 octavas, semilla por página) a 4 distancias: cada capa = color propio mezclado con el color del horizonte del cielo (mix 0.75, 0.55, 0.35, 0.15 hacia el cerca) y degradado vertical interno (-12 a -18 L hacia abajo). Parallax 0.1, 0.2, 0.35, 0.6, 1. Ya hay mosaicos de capas; se reemplazan por texturas por hora y se tiñen con setTint al cambiar de hora (setTint no cuesta). Costo: 4 sprites tileSprite, bajo.

4. **Niebla de base y de valle** (alto). 2 bandas gradiente verticales (sprites de 1 x 256 estirados): una pegada al suelo (alfa 0.35, color de horizonte) y otra entre capas 2-3 (alfa 0.25). Deriva horizontal muy lenta (tilePositionX). Costo: 2 sprites, bajo. Esta es la que hace que Moki lea.

5. **Capa cercana oscura y escalonada de siluetas** (alto). Palmas/pinos grandes casi ink (L10-14, con 8 % del color del cielo) a 2 profundidades, altos 55-65 % de pantalla en los bordes (x 0-15 % y 85-100 %) para no tapar la acción; parallax 1.15 y 1.4. Reusa pinos de cartón de primerPlano.js: re-tintar, no redibujar. Costo: 4 a 6 sprites, bajo. Nunca pasan delante de Moki ni de obstáculos (zona libre y 380-590).

6. **Rim light y tinte de hora sobre el suelo y los obstáculos** (alto). setTint por hora sobre suelo y cajas (tintTo ya existe en atardecer.js) y 1 sprite de canto claro en el borde superior de capas cercanas, con color de luz. Moki: 1 sprite de borde cálido 1-2 px (ya hay conSombra/cantoPapel). Costo: ~0 (tint) más 1 sprite.

7. **Estrellas, estrella fugaz y brillo de fichas (solo p3)** (medio-alto). 80 puntos en una sola textura estática (generada con rng palette.js), alfa parpadea con 3 grupos (3 tweens, no 80); estrella fugaz: 1 sprite que cruza cada 15-25 s; halo ADD de 6 px en fichas solo cuando hora == noche. Costo: 1 textura, 3 tweens, 1 sprite: bajo.

8. **Clima ligero ligado a la página** (medio). P2: lluvia fina = emisor de 30-40 partículas (rayas 1x14 px, ángulo 80 grados, alfa 0.10, 2 velocidades) + niebla algo más densa; p1: polvo dorado muy sutil (12 motas, 2 px, ADD); p3: ninguno o luciérnagas (10 puntos). Un solo ParticleEmitter por página, desactivado al salir. Costo: medio-bajo (≤40 partículas); desactivar con `reducedMotion` ya existente.

9. **Deriva de nubes de papel y globos con valor por distancia** (medio). Nubes: 2 capas, parallax 0.03 y 0.05, tinte hacia el horizonte de la hora; globos: 3 a 4 tamaños, el más lejano de valor casi igual al cielo y el más cercano 20 puntos más oscuro. Costo: 6 a 8 sprites: bajo.

10. **Grano de papel y viñeta final** (medio, ya existe parte en papelShader.js). Viñeta radial 10-14 % de alfa y grano a 4 % que se queda en todas las horas: es lo que une cielo, cerros y juego y mantiene la marca. Costo: 1 sprite de pantalla, bajo. No subir el grano en móvil (fillrate).

Orden de ejecución sugerido: 1 -> 3 -> 2 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10. Medir FPS a 390 px (bots-p15 VP=390x844) después de cada paso; si cae de 58 fps, quitar primero 8 y 2 (halo grande).

---

## Qué NO hacer

- Copiar formas o composiciones de Alto's 1:1 (castillo con bandera, acueducto de arcos, palmas con esa copa, globos con rayas): tomamos CÓMO usan luz y capas, no sus dibujos. Nuestras siluetas son pinos, cerros, postes y cartón de Moki.
- Grises lavados: si una capa lejana se ve gris es porque se le bajó la saturación en vez de mezclarla con el color del cielo. Siempre mezclar hacia el color del horizonte de la hora, nunca hacia #888.
- Sobresaturar: el naranja ya es el color de la marca; que las horas 2 y 3 sean frías ayuda a que el naranja de Moki y las fichas respire. No poner acento #FF6B35 en el fondo.
- Fondos más oscuros que Moki y los obstáculos en la franja de juego (y 400-590): la regla de contraste de ARTE manda.
- Partículas decorativas sin sentido: cada una tiene función (lluvia = la hora 2, polvo = el calor de la 1, estrellas = la 3). Nada de confeti, hojas o luces que compitan con las fichas, que son lo único que brilla.
- Tocar mecánicas, hitboxes o ritmo de obstáculos: ninguna capa nueva pasa delante de la zona de juego.
- Redibujar Graphics cada frame, shaders pesados a pantalla completa en celular, o más de 40 partículas vivas.
- Tomar assets externos: todo sale de código o de arte propio (Jorge permite el origen, pero este cook es de código).
