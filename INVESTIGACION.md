# INVESTIGACION.md · Moki: Un salto más

Investigador (estudio-investigador), 29-oct-2026. **v1 para el GDD del director.**
Fuentes: búsqueda web del 29-oct (cada dato lleva su URL), master `ccf3654` jugado en local (vite), DISENO.md, BITACORA.md y las medidas del probador en evidencia/REPORTE-FINAL.md. No cambié código.

Claves: **[H]** = dato anterior a 2024 (sirve para el diseño, no para leer el mercado de hoy). **[3ro]** = estimación de rastreador (AppMagic, Udonis, AppGoblin, Raijin), no cifra oficial. "Sin dato" = lo busqué y no lo encontré.

## 0. En corto

1. **La mecánica está bien; lo que falta es razón para volver.** Hoy hay un nivel fijo de 120 s, y lo único que se guarda es la mejor marca (`moki.best`) y si ya terminaste (`moki.done`). Lo que DISENO §6 pedía para la retención (barra con "tu mejor", sellos, Vuelta rápida) **no está construido**. Contra el mercado, ese es el hueco número uno.
2. Lo que sí funciona en el género hoy es **un toque con matiz + reintento instantáneo + una razón diaria para volver + colección sin presión**. Moki ya tiene lo primero. Lo segundo está a medias. Le faltan lo tercero y lo cuarto.
3. El terreno propio de Moki es el **papel que se comporta como papel**, igual que en Tearaway, aunque el encanto solo no vende (ver la tabla). Lo que manda es la mecánica.

## 1. Referentes

| Juego | Qué lo hace divertido | Qué retiene | Cómo monetiza | Dato (fuente, fecha) | Tomar | Evitar |
|---|---|---|---|---|---|---|
| Alto's Adventure / Odyssey | Tocar o mantener; trucos en cadena; calma | Metas de 3 en 3 hechas a mano, personajes, día y noche, modo Zen | Premium en iOS; gratis con anuncios en Android | Sin dato; Snowman solo dice "millones" ([blog](https://blog.builtbysnowman.com/tagged/alto's%20odyssey)) | Metas de 3 en 3, modo sin fallo, el clima como premio | Fiarse de que el arte lo cargue todo |
| Canabalt (2009) | Mantener para saltar más alto, arranque instantáneo | Solo el récord | Flash gratis y luego de pago | Sin dato de ventas [H] ([Wikipedia](https://en.wikipedia.org/wiki/Canabalt)) | El salto variable (ya lo tenemos) | Que el récord sea lo único que retiene (hoy es nuestro caso) |
| Chrome Dino | Cero fricción | Nada | No monetiza | 270 M de partidas al mes; fuerte en India, Brasil, **México** e Indonesia ([Google, 2018](https://blog.google/products/chrome/chrome-dino/)) [H] | Cero fricción; el público mexicano ya juega esto | No es un modelo de negocio |
| Jetpack Joyride | Mantener y soltar con inercia | **3 misiones activas a la vez** que suben de rango | Compras y anuncios | 14 M de descargas en 2012 ([Game Developer](https://gamedeveloper.com/business/halfbrick-s-em-jetpack-joyride-em-reaches-14-million-downloads)) [H]; 291.8 M de instalaciones en Android [3ro] ([AppGoblin](https://appgoblin.info/apps/com.halfbrick.jetpackjoyride)) | Las 3 misiones: la mejor máquina de "otra más" del género | La ruleta y los cofres con azar al morir |
| Subway Surfers | Velocidad, librarla por un pelo | Temporadas con ciudad nueva, personajes, misiones diarias | Anuncios y compras | ~16 M de descargas al mes del original y ~5 M de City en 10 días [3ro] ([Appfigures, 13-mar-2026](https://app.appfigures.com/resources/this-week-in-apps/20260313)) | Cambiar el escenario por temporada sin mecánica nueva | Tres carriles (otra mecánica) |
| Geometry Dash | Ritmo, memorizar, reintento en menos de 1 s | Editor, niveles de la comunidad, íconos | Pago único y versión Lite | Pico de 108,569 jugadores en Steam [3ro] ([Raijin, 4-jul-2026](https://raijin.gg/app/322170/Geometry_Dash)); repunte en 2026 por TikTok sin actualización ([Outlook Respawn](https://respawn.outlookindia.com/gaming/gaming-news/no-update-just-hype-inside-geometry-dashs-viral-2026-resurgence)) | Reintento instantáneo, obstáculos a ritmo, momentos para clip | La dificultad castigadora |
| Tearaway | El papel se rasga, se dobla y se pinta | Historia y coleccionables de papel | Premium | Unfolded: 81 en Metacritic pero debutó en el #33 de Reino Unido ([VideoGamer](https://www.videogamer.com/news/tearaway-unfolded-flops-in-the-uk)) [H] | Que el papel **se comporte** como papel | Creer que el encanto vende solo |
| Ori | Fluidez; luz y música que conmueven | Historia y habilidades | Premium y Game Pass | Serie con +15 M de copias ([KitGuru](https://www.kitguru.net/gaming/joao-silva/ori-series-surpasses-15-million-copies-sold/)) [H] | La emoción va en luz, música y tiempos, no en texto | La escala de producción |
| Crossy Road | Un toque = un paso; humor | +100 personajes con mundo propio; regalos por tiempo | Anuncios **opcionales** con premio y compra de personajes, sin cajas | +340 M de descargas; Atari lo compró por hasta $39.3 M ([PocketGamer.biz, 2026](https://www.pocketgamer.biz/atari-acquires-hipster-whale-in-deal-worth-up-to-393m/)) | Personajes o disfraces como colección; el modelo más sano para un estudio chico | Anuncios forzados |
| Flappy Bird | Simpleza que hace viral | Solo presumir | Banners | ~$50K al día según el autor, sin auditar ([TechSpot, 2014](https://www.techspot.com/news/55579-flappy-bird-earns-50000-per-day-in-ad-revenue-for-its-creator.html)) [H] | Simple = compartible | El diseño a base de rabia |
| Temple Run | Persecución | Monedas y mejoras | Compras | 1,000 M de descargas ([TIME, 2014](https://time.com/2822645/temple-run-one-billion-downloads)) [H] | Tensión narrativa suave (el viento se lleva los papeles) | La cámara en 3D |
| Stumble Guys | Caos físico y comedia | Pase de batalla y skins | Compras y pase | De $72 M (2022) a $23 M (2024) [3ro] ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/stumble-guys)) | La mascota torpe da risa | El pase de batalla |
| Suika Game | Una sola regla, caos tierno | "Una más" y streams | Pago único barato | +10 M de unidades ([Siliconera](https://siliconera.com/?p=1039259)) | Lo chiquito y tierno escala por clips | Nada |
| Duolingo | Mascota con personalidad | Racha con protector | Suscripción | 7 días de racha = 2.4 veces más probable volver al día siguiente; es correlación ([Duolingo](https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals)) | Racha **con perdón** y Moki que reacciona a ella | La culpa |
| Wordle / NYT | Un reto al día, el mismo para todos | Hábito y compartir sin spoilers | Suscripción NYT | 4,200 M de partidas en 2025 ([A Media Operator, 2026](https://www.amediaoperator.com/analysis/wordle-tv-show-new-york-times-games-jonathan-knight/)) | Carrera diaria con semilla y tarjeta para compartir | Limitar a una partida por día |

### Tendencias web 2025-2026 (lo que mide a un juego como Moki)
- **Vara concreta:** el lanzamiento básico de CrazyGames pide sesión de 10+ min, retención al día siguiente de 10-15%, que 80%+ juegue al menos 1 minuto, carga en menos de 10 s y menos de 20 MB ([docs, consultado 29-oct-2026](https://docs.crazygames.com/resources/basic-launch-metrics/)). **Nuestra partida dura 2 min y no hay nada que hacer después**: con la sesión y la retención no llegamos. Con la carga y el tamaño sí (dist ~1.5 MB).
- Poki: 625 M de jugadores y 11,100 M de partidas en 2025 ([Poki, 3-dic-2025](https://poki.com/blog/2025-at-poki-a-year-in-review)). En su encuesta, el 46% abandonó un juego web en el celular porque tardó en cargar ([GameDev Reports, 9-jul-2026](https://gamedevreports.substack.com/p/poki-web-gaming-perceptions-in-2026); la encuesta es de la propia plataforma).
- En portales lo normal son anuncios entre partidas y anuncios con premio opcionales; casi no hay compras. YouTube Playables no tiene compras dentro del juego. Telegram y el tap-to-earn se cayeron: **nada de cripto**.
- Saturación: ~15,000 juegos HTML5 en 2025, 2.7 veces más que el año anterior (no leí el reporte original de Playgama). Para destacar no basta lo genérico; hace falta un gancho propio.
- Huecos: no hay cifras actuales de Alto, Canabalt, Tearaway ni JJ2; el dato de Subway en 2025 (~$280 M en anuncios) no está confirmado en la fuente original; no encontré reglas oficiales de Poki sobre dónde y cada cuánto poner anuncios.

> Monetizar está fuera de alcance (BRIEF §7, CLAUDE.md: cero dinero). Lo dejo como referencia por si algún día se publica.

## 2. Nuestra versión jugada (master `ccf3654`)

Lo jugué en Chrome a 1290 px: demo → tutorial → primer choque y tarjeta → reintento. **Limitación honesta:** la pestaña automatizada corría lento (de 4 a 7 m en 10 s), así que **no juzgo el timing ni el feel fino**. Tampoco tengo oídos, así que no juzgo el audio. Lo cuantitativo es del probador (REPORTE-FINAL).

**Funciona (no tocar):**
- Demo que se juega solo y un solo toque para entrar: fricción mínima, al estilo de Dino.
- El tutorial congela el mundo frente a la caja con el letrero "Espacio": enseña sin castigar. Mejor que Dino y que Canabalt.
- "¡Eso!" al librar el primer obstáculo: buen premio inmediato.
- El salto variable sí decide: el bot que solo toca muere a los 7.4 s y el que siempre mantiene a los 62.1 s (probador). La mecánica núcleo cumple la pregunta del BRIEF.
- Las piezas en arco premian el salto bien medido.

**Hallazgos (crítico de jugador):**
1. **No hay "después".** Tras ganar, solo queda la mejor marca. El nivel es determinista, así que la segunda partida es idéntica: bueno para aprender, malo para volver. *(Retención; ver §4, puntos 1 a 3.)*
2. **La tarjeta de fallo se contradice y sermonea.** Título "La siguiente partida empieza con lo aprendido" y abajo "Empiezas de nuevo". Además tapa la esquina del HUD (el director de arte ya lo anotó para v2) y pide leer antes de reintentar. Geometry Dash demuestra que el reintento en menos de 1 s es el gancho. *(UX; pista útil, pero la tarjeta pesa.)*
3. **El choque no tiene gracia.** Moki se queda en tres cuartos y nada más. En 2026 los clips de fallos graciosos son el canal de descubrimiento (Geometry Dash revivió por TikTok sin actualizar). *(Feel; un "doblez" de cartón, una oreja que se dobla, algo así, sin violencia.)*
4. **El mundo es un solo tono de cartón.** Todo es beige; Moki y la cinta son el único color. El contraste se cumple (≥2.0 medido), pero visualmente las partidas se parecen. Las horas del día ayudan; la variación por tramo o por día sería el premio visual al estilo de Alto.
5. **Arranque:** el primer cuadro de la demo sale con el fondo vacío (solo cielo y suelo) antes de que entren los árboles. Lo vi una vez; hay que medirlo.
6. **El papel todavía no se comporta como papel.** Los obstáculos ya están en escena; no se despliegan ni se doblan. Es la diferencia que Tearaway prueba que se nota, y es barata en 2D.
7. **No hay nada para compartir.** Sin tarjeta de resultado no hay un "mira lo que hice".

**Medibles para el probador** (se los paso por cola):
- M1: tiempo desde la carga hasta el primer cuadro con el fondo completo en un celular de gama media (¿cuánto dura el fondo vacío?).
- M2: tiempo de choque a reintento en la tarjeta contra el criterio de 2 s, cronometrando **cuánto tarda en leerse** el texto, no solo el toque.
- M3: % de partidas con ruido humano que pasan de 60 s y de 90 s. Es nuestro "80% juega 1 minuto".

## 3. Tres ideas para combinar y volverlas de Moki

**A. "El papel del día"** (Wordle + Subway Surfers + niveles procedurales)
Cada día, una **pista con semilla diaria**, la misma para todos, armada con los bloques del diseñador de niveles. El diorama cambia de "papel" según el día: periódico el lunes, papel kraft, origami, cartón de huevo. Al terminar sale una **tarjeta para compartir** sin servidor: una fila de 4 sellos por tramo (sin choque, con choque, arco completo) y la fecha, copiada al portapapeles. La carrera libre sigue igual. Es lo único que da hábito diario sin cuentas ni tabla global.

**B. "El cuaderno de Moki"** (Jetpack Joyride + Alto + Duolingo con perdón)
Un cuaderno de papel con **3 notas pegadas** (misiones activas): "Libra 3 vigas con toque", "Arco completo en el tramo 2", "Llega sin caerte". Al cumplir una, sale un **sello de cartón** y entra otra nota. Rango por cuadernos llenos. Racha diaria **con perdón**: el primer día que faltas no se rompe, y Moki saluda distinto según tu racha, sin culpa. Todo en localStorage. Es el DISENO §6 extendido: los sellos ya estaban diseñados.

**C. "El libro pop-up"** (Tearaway + Ori + modo Zen de Alto)
El mundo es un libro desplegable: los obstáculos **se levantan del suelo** con un doblez al entrar en pantalla, el checkpoint es **pasar de página**, y al chocar el papel se arruga un poco y se alisa al reintentar, tierno y sin violencia. Lo acompaña un **modo Paseo** sin choques, la invulnerabilidad que ya existe para pruebas (`god`) convertida en modo de juego: para el jugador cozy o para un niño. La emoción va en el doblez y en la luz, no en texto.

Recomendación: **B primero** (alto impacto, bajo esfuerzo, ya diseñado), **C en el feel** (encaja con lo que hace la rama feel), **A cuando niveles entregue los bloques** (depende de su semilla).

## 4. Lista priorizada (alto impacto y bajo esfuerzo primero)

| # | Feature o mejora | Impacto | Esfuerzo | Dueño sugerido | Nota |
|---|---|---|---|---|---|
| 1 | Barra de progreso con banderines y la marca "tu mejor" | Alto | Bajo | base | Ya diseñada (DISENO §6); da meta visible en cada partida |
| 2 | 3 misiones activas y sellos de cartón (idea B, versión mínima: 6 a 9 misiones fijas) | Alto | Bajo-medio | base / director | El motor de "otra más" del género |
| 3 | Tarjeta de fallo más ligera: una línea de pista, sin título contradictorio, sin tapar el HUD, reintento sin leer | Alto | Bajo | feel / ux | Hallazgo 2 |
| 4 | Choque con gracia (Moki se dobla o arruga 300 ms) y aterrizaje de papel | Alto | Bajo-medio | feel | Hallazgo 3; da clips |
| 5 | Tarjeta de resultado para compartir (texto con emojis al portapapeles, sin servidor) | Alto | Bajo | base | Hallazgo 7. Compartir lo hace el jugador; nosotros no publicamos nada |
| 6 | Obstáculos que se despliegan (pop-up) al entrar en pantalla | Medio-alto | Medio | feel / animador | Idea C, hallazgo 6 |
| 7 | Modo Paseo (sin choques) en el menú | Medio | Bajo | base | Reusa `god`; abre la puerta al público cozy e infantil |
| 8 | Vuelta rápida (x1.12) desbloqueable | Medio | Bajo | base | Ya diseñada en DISENO §6 |
| 9 | Carrera diaria con semilla y papel del día (idea A) | Alto | Medio-alto | niveles | Depende de los bloques procedurales |
| 10 | Fondo completo desde el primer cuadro | Bajo | Bajo | base | Hallazgo 5; medir antes (M1) |
| 11 | Disfraces de papel coleccionables (Crossy Road sin tienda) | Alto | Alto | v2 | Necesita arte; sin espejar a Moki |

**No hacer** (por mercado y por marca): ruleta o cajas con azar, pase de batalla, anuncios forzados, cripto o tap-to-earn, castigo estilo Geometry Dash, racha con culpa, contadores falsos.
