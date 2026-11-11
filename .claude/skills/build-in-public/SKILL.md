---
name: build-in-public
description: Cómo documentar y contar en público la construcción de Moki Studio (bitácora diaria, decisiones, tarjetas con gráfico). Úsala al escribir BITACORA, DECISIONES.md, la línea PARA PUBLICAR HOY o el borrador de la entrada pública.
---
# Build in public · Moki Studio

Canon: GBrain specs/moki-studio-build-in-public-2026-10-29 y critical-context/amedios-marca-personal-2026-10-27. Escritura: escritura-humana, español mexicano, sin guiones largos ni relleno. Marca personal de Jorge: Moki es su avatar para experimentar con IA.

## Las reglas (de las fuentes, aterrizadas a Moki)
1. **Cadencia que se sostiene.** Una entrada pública al día, aunque sea chica. Mejor diario y corto que bonito y esporádico.
2. **Siempre visual.** Cada entrada lleva una captura real y un gráfico con números reales. Nunca solo texto. Antes/después cuando se pueda.
3. **Muestra el progreso desde feo.** No esperes a que se vea bien. El viaje de prototipo a pulido es la historia.
4. **Cuenta lo que falló.** Derrotas del gauntlet, cosas que se tiraron, bugs raros. Eso conecta más que las victorias.
5. **Un objetivo y un siguiente paso por pieza.** Hoy: jugar en moki.jorgesuarez.com.mx. Nada de dos llamados.
6. **Cero tono de anuncio.** Habla como Jorge contándole a un amigo, no como comunicado.
7. **Tres pilares fijos:** (a) Moki y su juego, (b) cómo trabaja un estudio de agentes de IA, (c) lo que aprendimos (LCA con ancla real).
8. **Comunidad.** Una vez por semana, una pregunta o encuesta para que la gente decida algo chico (color de noche, nombre de un modo). Después muestra cómo su respuesta cambió el juego.
9. **Analítica semanal.** Los viernes, revisa qué piezas funcionaron (si Spark o Eco dejaron números en GBrain) y ajusta el ángulo.
10. **Reutiliza.** Una captura o un clip sirve para varias redes; las tarjetas 1080x1350 salen de bitacora.json.
11. **Nunca:** rutas, empresas, clientes, montos de terceros, secretos ni nombres de terceros. Los shorts salen sin esperar revisión de Jorge (regla 17). El gasto del propio estudio SÍ se cuenta, con la regla 14.

12. **Cada post enseña la iteración.** Todo post y toda tarjeta dicen qué había antes, qué hay ahora y un número que lo pruebe (carga, partidas, choques, fps, puntaje del gauntlet). Si la pieza no tiene antes y después medible, el post cuenta la decisión y lo que se aprendió. Revisa el post de ayer: el de hoy tiene que enseñar algo que ese no.
13. **La organización también es historia.** Cuando cambia el equipo (alguien entra, sale, cambia de rol o hay regla nueva), agrega un objeto a `historia` en el equipo.json del sitio por medio de `publicar/AAAA-MM-DD-equipo.json` (fecha, version, equipo, titulo{es,en}, texto{es,en}) y sale un post con la tarjeta `t=equipo`. Página: moki.jorgesuarez.com.mx/equipo/
14. **Gasto sin confundir** (Jorge, 31-oct 23:09: no debe parecer que gasto un chorro). El estudio NO tiene costo propio: corre con la cuota que sobra del plan fijo de Claude (Max, 200 USD al mes) que Jorge ya paga para TODO su trabajo. El costo extra del estudio es 0 USD (campo `extra_usd` en equipo.json; si algún día se prende el consumo extra, ahí va lo pagado de más). Nunca le cargues al estudio el plan completo ni el plan prorrateado por día (nada de 6.67 USD al día ni sumas tipo 27 USD). Los tokens por día salen de la herramienta de gasto. El valor a precio de API solo aparece como valor, junto a la frase "no se paga". Nunca escribas que el estudio costó ese valor.
15. **La mejora se mide en el método también.** Una vez por semana, el post de los viernes dice qué cambió en cómo trabaja el estudio (skills nuevos, reglas, organización) y si mejoró algo medible.

16. **Fácil de leer para cualquiera.** Todo lo público pasa por la skill lectura-facil y por `python3 herramientas/legible.py` (índice de 70 o más, sin frases de más de 25 palabras, sin palabras técnicas sin explicar). Diario va imagen con gráfica; video corto cuando el cambio se ve mejor en movimiento, y uno explicativo por semana. Los Shorts salen directo (regla 17).

17. **Publica primero, califica después** (Jorge, 31-oct 22:15: velocidad, done is better than perfect). Los Shorts y videos salen en público en cuanto están listos, sin esperar revisión de Jorge. A las 24 h, un invitado de contexto limpio los califica: gancho de los primeros 2 segundos, se entiende sin sonido, lectura fácil, marca correcta, y los números (vistas, retención y likes, si hay). Deja UNA lección en `publicar/aprendizajes-videos.md` y el siguiente video la aplica. Lo único que sí frena un video antes de salir son las reglas duras: nada de otras empresas (otras empresas) ni sus etiquetas, nada de secretos, ni personas reales sin permiso. Si algo sale muy mal, Jorge pide el cambio y se corrige en vivo.

18. **Moki vivo en los videos** (Jorge, 31-oct 22:42). En videos pixel art, Moki sale del kit Moki Pixel (moki.jorgesuarez.com.mx/pixel/, manifest en /pixel/dist/manifest.json, 43 clips a 12 fps) y cambia de pose por escena: `wave` al entrar, `idle` mientras hay texto, `think` o `idea` al explicar, `run` y `jump` en el juego, `celebrate` en el logro, `point` en la invitación. Nunca parado en posición T ni congelado más de 2 s. Sin espejo: la vista izquierda sale del kit. Recado y lista de clips: GBrain inbox/spark-a-falcon-2026-10-31-moki-animado-en-shorts.

## Tus archivos
- **DECISIONES.md** (raíz del repo): una fila por decisión, la más nueva arriba. `fecha hora · quién · decisión · por qué · qué descartamos · evidencia`. Incluye cuando el director elige pieza, cuando algo no se integra y cuando se congela.
- **BITACORA.md:** a las 18:30 CDMX, una línea que empiece con `PARA PUBLICAR HOY:` con 3 cambios en lenguaje no técnico, la mejor captura (ruta en evidencia/), un dato numérico real para el gráfico y una lección.
- **publicar/AAAA-MM-DD.json:** borrador de la entrada pública con el mismo formato que `entradas[]` de bitacora.json del sitio (id, fecha, titulo{es,en}, historia[3]{es,en}, aprendimos, sigue, imagen, imagen_alt, grafico{titulo, unidad?, barras[]}) y un arreglo `decisiones` con 1 a 3 decisiones del día explicadas sin tecnicismos.
- **publicar/AAAA-MM-DD-posts.md:** 1 o 2 textos listos para redes, cada uno con su tarjeta sugerida.

## Límites
No publicas ni empujas nada: Spark publica desde la laptop. No tocas código del juego. Números solo si los puedes verificar en git, BITACORA, evidencia o el log del conserje; si no, escribe NO VERIFICADO.

## Fuentes
- https://www.strayspark.studio/blog/devlog-marketing-build-wishlists
- https://www.wayline.io/blog/top-7-devlog-mistakes-indie-devs-avoid
- https://www.pulse.bot/gaming/news/a-practical-guide-to-indie-comms-how-studios-can-build-visibility-without-burning-out-fd5736c1-cd15-42fd-96e1-35b68b071d0c

## Marketing (desde 30-oct: eres cronista y marketing)
Contexto compartido: `.agents/product-marketing.md` (léelo antes de escribir cualquier pieza; si aprendes algo con evidencia, agrégalo en Learnings y súbele versión).
Referencia: ~/Work/_referencias/marketingskills/skills (coreyhaines31, MIT). Úsala como consejo de un experto, adaptada a Moki Studio y a la marca personal, nunca copiada:
- **social** y **content-strategy:** pilares, calendario, formato por red.
- **marketing-loops:** que el marketing corra solo cada día.
- **marketing-council:** antes de proponer un post, pásalo por un panel crítico con contexto nuevo (subagente) que lo compare a ciegas contra un post de referencia y nombre la brecha más grande. Sin elogios.
- **launch:** plan del lanzamiento de la v2 como evento.
- **directory-submissions:** lista de portales y directorios (itch.io, portales de juegos web, directorios de "hecho con IA"). Solo propones; Spark y Jorge deciden.
- **community-marketing:** una pregunta o encuesta por semana y cómo cambió el juego por ella.
- **copywriting** y **marketing-psychology:** un solo siguiente paso, claridad.
- **analytics:** los viernes, lee los números que dejen Spark, Eco y Falcon en GBrain y ajusta.
- **ai-seo / schema:** que el sitio se entienda para buscadores con IA (propones; Spark publica).
Para después, solo con OK de Jorge: correo y lead magnets, prensa, precios y ofertas.

Entregables extra:
- `publicar/AAAA-MM-DD-posts.md` trae, por pieza: red, texto, tarjeta, por qué funciona según el contexto y el veredicto del crítico.
- `MARKETING.md` en la raíz: calendario de 2 semanas, embudo (post → moki.jorgesuarez.com.mx → jugar → seguir a Jorge) y la lista de directorios propuestos.

## Las 5 series (Jorge, 3-nov 21:36: "adelante con todas")
Además de la entrada diaria, cada pieza pública cae en una de estas series. Máximo una serie al día encima del recap, y máximo UNA encuesta por semana (la segunda encuesta del 2-nov no tuvo votos porque salió 8 h después de la primera).

1. **El estudio por dentro** (cada vez que cambia la estructura). Agrega un objeto a `historia` en equipo.json con el campo `cambio`: `antes[]`, `ahora[]`, `ganamos` (con número) y `fallo` (lo que no salió). Tarjeta: `bitacora/tarjeta.html?t=cambio&l=es|en` (toma el último cambio; `&v=v6` elige versión). Primer ejemplo: v6 del 3-nov. Página: /equipo.
2. **Lo que no entró** (viernes). Una cosa que probamos y no entró: qué probamos, qué esperábamos, qué pasó y qué regla nueva salió. Con número y captura del intento. Es la pieza más honesta: nunca la escondas ni la suavices.
3. **Decidimos** (cuando hay una decisión grande). Las opciones con imagen, cuál ganó, cuáles descartamos y por qué, y quién decidió: Jorge, el director, el público o los críticos a ciegas.
4. **Lo que nos dijeron** (viernes). Lee `publicar/sugerencias.md`. Cuenta 2 o 3 sugerencias de la gente y qué pasó con cada una. Nunca prometas: el estado dice anotada, probando, entró o no por ahora, siempre con la razón.
5. **Radar** (viernes, lo prepara el investigador). Un hallazgo de mercado con fuente y fecha: qué está pegando en juegos casuales de navegador y celular, qué piden los jugadores de runners, un hueco que podríamos llenar. Más nuestro propio dato: cuántas partidas hubo y de qué modo (el campo `nivel` es el nivel del Cuaderno, no qué tan lejos llegó la persona) (`/api/partidas?dias=7`). Termina con la pregunta "¿hacia dónde lo llevamos?". Es la encuesta de la semana. Sin etiquetas de otras empresas.

## Sugerencias de la gente (`publicar/sugerencias.md`)
- Cada comentario con una idea va a la tabla: fecha, red, quién (usuario público, nunca datos personales), la sugerencia en sus palabras, estado y razón.
- Estados: **anotada** (la leímos), **probando** (hay una rama o un invitado viéndola), **entró** (está en master, con la fecha), **no por ahora** (con la razón honesta).
- En la red se contesta corto: "Anotada. [razón o qué sigue]". Nunca "lo vamos a hacer".
- Las sugerencias no saltan la fila: el director las considera al elegir pieza, igual que cualquier otra idea.

## Medición anónima de partidas (Jorge, 3-nov)
El sitio cuenta partidas por día, modo, nivel y motivo de fin. No guarda IP, cookies ni nada de la persona. Resumen público: https://moki.jorgesuarez.com.mx/api/partidas?dias=7. Úsalo en Radar y en las entradas ("17 de 26 partidas fueron del Reto"; no uses `nivel` para decir hasta dónde llega la gente: es el nivel del Cuaderno). Si el total es menor a 30 partidas, dilo: "todavía son pocas para sacar conclusiones".

## Cada publicación invita a jugar y dice que medimos (Jorge, 7-nov 10:36)
Toda pieza pública cierra con dos cosas, en palabras sencillas:
1. Dónde jugar: moki.jorgesuarez.com.mx
2. Que medimos de forma anónima cómo se juega para mejorarlo: "Contamos las partidas sin datos tuyos. Entre más juegues, mejor sabemos qué arreglar."
Cuando haya un número de juego nuevo (cuántos se salen, cuántos pasan el nivel 2, cuántos juegan otra), se cuenta con su antes y después. Solo números de público: nunca mezclar partidas del equipo ni de bots.

## Bitácora con historia y gráficos (Jorge, 8-nov 23:32)

Cada entrada usa papacitoos-storytelling y llena, además de titulo, historia, aprendimos, sigue, imagen y grafico: `graficos` (al menos una gráfica más), `imagenes` (antes y después cuando aplique, con `pie`), `disyuntiva` ({titulo, a, b, elegimos: "a"|"b", porque}), `la_regamos`, `pregunta` y `juega` ({href directo a lo nuevo, texto}). Todos en {es, en}. Ejemplo vivo: entrada 2026-11-08-noche de bitacora.json.

## 19. Cada post, una toma distinta (Jorge, 11-nov 01:07)
"Todos los posts deben de ser diferentes." Si todas las imágenes son el mismo plano naranja con Moki chiquito a la izquierda, la gente sigue scrolleando aunque el aprendizaje sea bueno. El revisor ya compara cada imagen con las últimas 4 publicadas y frena la que se ve casi igual (regla dura "toma repetida"), y frena el texto que arranca igual que uno de los últimos 10.

Menú de tomas. Nunca la misma dos veces seguidas y máximo una de cada tipo por día:
1. **Primer plano.** Moki ocupa la mitad del cuadro haciendo lo nuevo (patada, inclinación, aterrizaje). Captura con zoom de cámara, no recorte borroso.
2. **Antes y después.** Dos mitades con la misma escena y una etiqueta grande: Antes / Hoy.
3. **El número manda.** Un solo dato enorme (metros, partidas, votos, fps) sobre fondo del brandkit, con la gráfica chiquita abajo.
4. **En movimiento.** Clip de 3 a 6 s del momento exacto, en bucle, en vez de foto fija.
5. **En tu cel.** El juego dentro de un teléfono, para que se entienda que se juega ahí.
6. **El estudio por dentro.** El tablero, la cola o una decisión del director, pasada por la frontera (sin rutas ni nombres de máquinas).
7. **Lo que no entró.** La captura del intento con el sello NO ENTRÓ y el número que lo tumbó.
8. **Interfaz en macro.** Un botón, un sello del Cuaderno o la tarjeta final, bien de cerca.
9. **Otro mundo.** Noche, ciudad, nieve: el nivel o la paleta que menos ha salido.
10. **¿A o B?** Dos opciones lado a lado para que voten en /ideas/.

Gancho de la primera mirada: lo más importante se entiende en un segundo sin leer; texto encima de 6 palabras máximo y grande; formato 4:5 (1080x1350) para el feed en vez de 16:9 chiquito.
