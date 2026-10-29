# UX.md: Moki: Un salto más

Fuentes: PILOTO.md, BRIEF.md, ARTE.md, `src/` y capturas `evidencia/t2b-*` (commit c9d617f).
Solo marca personal de Jorge. Moki nunca espejado. Sin neón ni glow.

## 0. Diagnóstico (por qué "no sabes cómo se controla")
Revisado en código y capturas:
1. No hay inicio: `RunScene` corre al cargar. El primer obstáculo llega a los ~3 s y el jugador no sabe que existe el salto.
2. No hay una sola instrucción en pantalla (ni gesto dibujado ni texto).
3. "Mantener = salto alto" no se enseña. La torre (84 px) solo se libra manteniendo; el jugador nunca lo descubre.
4. Al chocar sale "Choque" y a los 500 ms reinicia solo desde 0: no hay lección, no hay checkpoint, no hay "un salto más".
5. No hay pausa visible (solo Esc/P), ni final, ni mejor marca, ni ES/EN.

Principio de diseño: el juego es el tutorial. Un solo gesto (tocar), dos intensidades. Se aprende haciendo, con el mundo esperando al jugador.

## 1. Flujo
```
INICIO (demo viva) --Jugar--> TUTORIAL (2 lecciones dentro del juego) --> JUEGO
JUEGO --choque--> FALLO (tarjeta) --1 toque--> JUEGO desde checkpoint
JUEGO --meta (~2 min)--> FINAL --Otra vez--> JUEGO desde 0 (sin tutorial)
FINAL --Así lo hicimos--> ASÍ LO HICIMOS --Volver--> FINAL
FINAL / ASÍ LO HICIMOS --jorgesuarez.com.mx--> sale del juego
JUEGO --Esc / P / botón--> PAUSA --Seguir--> JUEGO
```
Estados de `RunScene` sugeridos: `title | tutorial | playing | paused | dead | finished`.

## 2. Controles (iguales en todas las pantallas)
| Entrada | Acción |
|---|---|
| Toque en cualquier parte del lienzo | Saltar. Tocar = corto, mantener = alto |
| Clic izquierdo | Igual que el toque |
| Espacio / ↑ / W | Igual que el toque |
| Esc / P / botón de pausa | Pausa |
| Espacio / Enter / toque / clic (en tarjetas) | Seguir |
| Tab + Enter/Espacio | Recorre y activa botones |

Reglas de entrada:
- El salto se dispara en `pointerdown`/`keydown`, nunca en `click` (sin 300 ms de retraso).
- `touch-action: none`, `user-select: none`, sin zoom por doble toque, sin scroll, sin menú de clic derecho. `preventDefault` en Espacio y flechas.
- Soltar al perder foco (`blur`, `visibilitychange`) y en `pointerupoutside`: nada de salto "pegado".
- Cualquier dedo cuenta. Los botones de UI no disparan salto.
- Detección de dispositivo para el texto: `pointer: coarse` = toque; si no, compu. Si llega una entrada del otro tipo, el texto cambia.

## 3. Pantalla de inicio
Fondo: el diorama real en modo demo (Moki corre en acción con `moki-lado`). Cada ~4 s salta solo una caja (corto) y luego una torre (alto), con el arco fantasma de la sección 4. Con movimiento reducido: Moki quieto y los dos arcos dibujados fijos.

Composición (375 px, vertical): tarjeta de papel arriba con el título; botón "Jugar" en el tercio medio; Moki corriendo sobre el suelo; banda con el gesto dibujado sobre el cartón de abajo. En 1280 px: lo mismo, más ancho, Moki a la izquierda del centro.

| Elemento | ES | EN |
|---|---|---|
| Título (H1 Outfit 700) | Moki: Un salto más | Moki: One more jump |
| Botón primario (naranja, texto tinta, mín. 56 de alto, ancho mín. 200) | Jugar | Play |
| Gesto, toque (con dibujo) | Toca para saltar · Mantén para saltar alto | Tap to jump · Hold to jump high |
| Gesto, compu (con dibujo) | Espacio o clic para saltar · Mantén para saltar alto | Space or click to jump · Hold to jump high |
| Botón idioma (44+ px, esquina sup. der.) | English | Español |
| Botón sonido (44+ px, junto al idioma) | aria: Sonido | aria: Sound |

- Gesto dibujado: dos pictogramas de papel lado a lado. (a) mano que toca + arco corto. (b) mano que se queda abajo + arco alto. En compu, la mano se sustituye por una tecla "Espacio" de papel. Tinta y kraft, sin naranja.
- Arranque: botón "Jugar", Espacio, Enter o un toque en cualquier parte que no sea idioma/sonido. Es el primer gesto: desbloquea el audio.
- Idioma por defecto: `navigator.language` que empiece con "en" = EN; todo lo demás = ES. Se guarda. Actualizar `<html lang>`.
- Único foco naranja: el botón "Jugar" (Moki también es naranja, pero es la acción).

## 4. Cómo se enseña (tutorial dentro del juego)
Regla: nunca más de 4 palabras de instrucción a la vez. Dos lecciones, ambas obstáculos reales, sin tarjetas ni pantallas aparte. Si `moki.tutorial=1` en localStorage, se salta.

Elementos del aviso (todo se dibuja en procedural, papel y tinta, sin assets nuevos):
- Mano de papel (#F4E8D5, canto kraft 3 px, sombra tinta 22%) abajo a la derecha, en zona del pulgar.
- Anillo de toque: círculo de tinta al 12 a 20%.
- Arco fantasma: línea punteada #8A7E70 (3 px) desde Moki, pasando sobre el obstáculo, con las piezas sobre el arco.
- Etiqueta de papel con la palabra.

| Lección | Obstáculo | Cuándo | Mano y etiqueta ES / EN | Arco |
|---|---|---|---|---|
| 1 | Caja baja | Primer obstáculo, ~2 s de calma antes | Toca / Tap (compu: Espacio / Space) | Corto, 3 piezas encima |
| 2 | Torre | Segundo obstáculo, ~600 px después | Mantén / Hold (compu: Mantén Espacio / Hold Space) | Alto, 3 piezas arriba |

Comportamiento del mundo:
1. Cuando el obstáculo está a ~240 px lógicos de Moki, el mundo desacelera a 0 en 450 ms (parallax y suelo). Moki se queda en su pose, sin vaivén.
2. Se detiene con el obstáculo a la distancia ideal de despegue (≈ mitad del recorrido aéreo del salto de esa lección; calcular con las perillas). Debe pasar: presionar de inmediato al detenerse libra el obstáculo con holgura mayor a 15 px, en las dos lecciones.
3. No hay cuenta ni timeout: espera al jugador. La mano pulsa cada 1.2 s, 4 veces; si no actúa, se queda fija en "presionada" y repite 4 pulsos cada 10 s (nada de loop infinito).
4. Lección 2: la mano baja y se queda abajo; el anillo se llena en ~400 ms (mantener). Un toque corto contra la torre no la libra (la altura mínima de toque, 66 px, queda por debajo del tope de la torre, 68 px).
5. Al presionar: el mundo vuelve a velocidad normal, la mano y el arco se desvanecen en 140 ms, y el salto ocurre en ese mismo cuadro.
6. Éxito (pasa sin chocar): banner "¡Eso!" / "Nice!" 900 ms en el banner superior que ya existe. Se recogen las piezas del arco.
7. Fallo en tutorial: no hay tarjeta. Moki se frena, el obstáculo "regresa" (se desliza atrás 180 ms) a la posición de espera y la mano reaparece. Sin penalización ni conteo.
8. Salto temprano durante la desaceleración es válido: si pasa, cuenta como éxito.
9. Al terminar la lección 2: `moki.tutorial=1`. Los primeros 3 obstáculos reales alternan caja, torre, caja, con huecos de 520 a 700 px.

Movimiento reducido: la mano queda fija en pose presionada, el anillo y el arco fijos, parada instantánea (sin desaceleración), cambios en fundido de 120 ms.

## 5. Indicadores en pantalla (juego)
| Elemento | Dónde | Detalle |
|---|---|---|
| Distancia | Arriba izquierda, etiqueta de papel, margen 16 | "8 m" (Outfit 700 22 px) |
| Piezas | Arriba derecha, etiqueta de papel | Icono de ficha + "0" |
| Pausa | Arriba centro, etiqueta de papel 44 x 44 mín. | Icono de dos barras. aria: Pausa / Pause |
| Banner | Arriba centro, bajo la pausa | "¡Eso!", "Aprendizaje guardado" (1.6 s, no bloquea) |
| Altura del salto | Sombra de contacto (ya existe) | Se aleja y aclara al subir. No se agrega medidor |

Para respetar el máximo de 4 palabras, el HUD en juego quita las palabras "Distancia" y "Piezas" y deja número + unidad o icono. Las palabras completas se usan en el final (decisión 1).
Sin barra de progreso a la meta en esta versión (opcional P2: riel kraft fino con una ficha como marcador; nunca una miniatura de Moki).

## 6. Pausa
- Entra con Esc, P, botón de pausa y automáticamente al perder foco. Detiene mundo, física, tweens y audio.
- Panel de papel (radio 18) centrado, sobre velo de tinta al 40% (no negro puro).
- Botones apilados, 48 de alto, 8 de separación:

| ES | EN | Nota |
|---|---|---|
| Pausa | Paused | Título del panel (H2) |
| Seguir | Resume | Primario naranja, foco inicial |
| Sonido: Sí / No | Sound: On / Off | Alterna |
| Efectos: Poquito | Effects: A little | Cicla Nada / Poquito / Mucho. Hardcore con candado (condición por definir) |
| English | Español | Idioma |
| Inicio | Home | Regresa al título; pierde la partida |

- Reanudar: no cuenta como salto. El mundo acelera de 0 a velocidad normal en 600 ms. Si estaba en lección, vuelve a la espera.
- Esc/P otra vez también reanuda.

## 7. Fallo: tarjeta del brandkit y reintento en 1 toque
Cronología desde el choque (t = 0):

| t | Qué pasa |
|---|---|
| 0 ms | Moki cambia a `moki-tres-cuartos`, cae 8 px, sin rebote. Mundo se frena en 100 ms. Suena "papel" bajo |
| 250 ms | Entra la tarjeta (250 ms, ease-out). Con movimiento reducido: fundido 150 ms |
| 500 ms | Tarjeta completa y "Toca para seguir" visible |
| 700 ms | Acepta toque (guarda contra toques de pánico). Antes de eso el pill se ve atenuado |
| Toque | Tarjeta sale 160 ms. Moki sale del último checkpoint con 1.2 s de calma sin obstáculos |

Tarjeta: papel #F4E8D5, radio 18, canto kraft, sombra de contacto, texto #22211F. Lección en Outfit 700 (28/34 en 375, 40/46 en compu). Una línea de apoyo en Inter 18. Pill naranja con texto tinta: "Toca para seguir". La tarjeta nunca tapa a Moki ni al obstáculo con el que chocó: en vertical va entre el HUD y la cabeza de Moki; en pantalla ancha va a la derecha de Moki. Todo el lienzo y la tarjeta aceptan el toque; también Espacio, Enter y ↑.

| ES | EN |
|---|---|
| La siguiente partida empieza con lo aprendido | The next run starts with what you learned |
| Cada salto empieza por observar | Every jump starts by watching |
| Fallar, ajustar y volver a intentar | Fail, adjust, and try again |
| Apoyo con checkpoint: Sigues desde el checkpoint | Back at your checkpoint |
| Apoyo sin checkpoint: Empiezas de nuevo | Starting over |
| Prompt, toque: Toca para seguir | Tap to continue |
| Prompt, compu: Espacio para seguir | Press Space to continue |

- Las 3 lecciones rotan en orden (no al azar) y el índice se guarda en `moki.lesson`. Los EN son provisionales (decisión 3).
- Reintento: puntaje, piezas y velocidad vuelven a los del checkpoint. Sin checkpoint, empieza en 0 (sin tutorial si ya lo hizo).
- Se quita el banner "Choque" y el auto-reinicio de 500 ms.
- Se guarda la mejor marca también al fallar.

## 8. Final y "Así lo hicimos"
Al cruzar la meta (~2 min): el mundo frena en 1 s, Moki en `moki-bandera`, y a 1.2 s aparece la tarjeta de resultados (papel, radio 18) sobre el diorama.

| Elemento | ES | EN |
|---|---|---|
| Título (H2) | ¡Llegaste! | You made it! |
| Fila | Distancia: 512 m | Distance: 512 m |
| Fila | Piezas: 23 | Pieces: 23 |
| Fila | Mejor marca: 540 m | Best: 540 m |
| Etiqueta si se superó | Nueva marca | New best |
| Botón primario naranja | Otra vez | Again |
| Botón secundario (papel, borde kraft) | Así lo hicimos | How we made it |
| Enlace de texto, 44+ px alto | jorgesuarez.com.mx | jorgesuarez.com.mx |

- "Mejor marca" = metros más lejanos en `moki.best` (decisión 2).
- "Otra vez": empieza en 0, sin tutorial, con 2 s de calma.

Pantalla "Así lo hicimos" (fondo #0A0A0A, paneles #161616 radio 12 a 18, `moki-compu` o `moki-verifica`):

| ES | EN |
|---|---|
| Así lo hicimos (H2) | How we made it |
| Un equipo de agentes, un juego | A team of agents, one game |
| Líder: Planea y decide | Lead: Plans and decides |
| Constructor: Hace el juego | Builder: Builds the game |
| Probador: Lo juega y lo revisa | Tester: Plays and checks it |
| Dirección de arte: Cuida el papel | Art direction: Looks after the paper |
| UX: Que se entienda en 3 segundos | UX: Makes it clear in 3 seconds |
| Jorge intervino N veces (1 = vez) | Jorge stepped in N times (1 = time) |
| Botón claro: jorgesuarez.com.mx | jorgesuarez.com.mx |
| Botón secundario: Volver | Back |

- N sale de una constante en `config.js` (`jorgeInterventions`), con el número real de BITACORA.md.
- El enlace es un `<a href="https://jorgesuarez.com.mx" rel="noopener">` real en la misma pestaña (es el regreso). Texto #FFFFFF sobre #0A0A0A.

## 9. Primer minuto, segundo a segundo
Jugador nuevo, en celular, que responde en ~1.2 s.

| t | Qué ve | Texto en pantalla |
|---|---|---|
| Antes | Título con demo viva y gesto dibujado. 3 s bastan para leerlo | Título + frase del gesto |
| 0.0 | Toca "Jugar". Se desbloquea el audio. La UI sale en 180 ms | none |
| 0.2 a 2.2 | Calma: Moki corre, solo HUD. Sin sorpresas | "0 m", ficha 0 |
| 2.2 | Entra la caja desde la derecha | none |
| ~3.0 | Mundo desacelera y se detiene. Aparecen mano, arco y 3 piezas | Toca |
| ~4.2 | Toca. Salto corto, piezas recogidas | none |
| 4.2 a 5.1 | Banner de éxito | ¡Eso! |
| 5.1 a 6.5 | Calma con piezas | none |
| ~7.0 | Entra y se detiene la torre. Mano abajo, anillo se llena, arco alto | Mantén |
| ~8.2 | Mantiene. Salto alto, piezas altas | none |
| 8.2 a 9.1 | Banner de éxito. Tutorial guardado | ¡Eso! |
| 10 a 30 | Caja, torre, caja con huecos amplios. Ya sin guía | none |
| 30 | Bandera ámbar se despliega (280 ms). Se guarda el aprendizaje | Aprendizaje guardado |
| 30 a 60 | Obstáculos aleatorios. Si falla: tarjeta (sección 7) y 1 toque | Lección (solo en tarjeta) |

Metas de tiempo: aviso 1 a más tardar a 4.0 s de tocar "Jugar"; aviso 2 a más tardar 6 s después de resolver el 1. Sin muertes antes de la lección 2.

## 10. Accesibilidad
- Toque: todos los botones de UI son al menos 48 x 48 CSS px (piso duro 44), con 8 px entre ellos. Todo el lienzo es el botón de salto.
- Contraste (medido con los hex del kit):
  - #22211F sobre #F4E8D5: 13:1. Texto sobre papel siempre en tinta.
  - #FFFFFF sobre #0A0A0A: ~19:1. #B7B3AD sobre #0A0A0A: ~9.4:1 (solo secundario).
  - #22211F sobre #FF6B35: ~5.6:1. El texto en botones naranja es tinta, nunca blanco (blanco sobre naranja da 2.8:1, no pasa).
  - No poner texto sobre kraft ni texto naranja pequeño sobre papel.
- Tipografía: UI mínimo 16 px, botones y números en Outfit 700, cuerpo en Inter 400. Locales, sin CDN.
- Movimiento reducido (`prefers-reduced-motion: reduce`, y se escucha el cambio en vivo): sin parallax, sin vaivén ni inclinación de Moki, sin confeti ni shake, sin pulso de mano (queda fija), transiciones en fundido de 120 a 180 ms. El juego sigue jugable. Hardcore apagado.
- Foco visible: borde de 3 px tinta (sobre papel) o papel (sobre oscuro) con separación de 2 px. Sin glow ni sombra de color.
- Teclado: se puede jugar de inicio a fin sin mouse (Espacio, Enter, Tab, Esc). Los botones deben ser DOM reales o equivalentes enfocables, con `aria-label` en los que son iconos (pausa, sonido, idioma) y `<html lang>` actualizado.
- Color no es la única señal: obstáculos por forma y cinta, piezas por forma circular, checkpoint por bandera.
- Sonido: solo tras el primer gesto, apagable, volumen bajo. Nada depende del sonido para jugar.

## 11. Textos exactos: resumen de claves (ES / EN)
Tabla única en `src/i18n.js`. Además de las de secciones 3 a 8:

| Clave | ES | EN |
|---|---|---|
| tut.tap.touch | Toca | Tap |
| tut.tap.kbd | Espacio | Space |
| tut.hold.touch | Mantén | Hold |
| tut.hold.kbd | Mantén Espacio | Hold Space |
| tut.ok | ¡Eso! | Nice! |
| hud.cp | Aprendizaje guardado | Learning saved |
| hud.m | m | m |
| aria.pause | Pausa | Pause |
| aria.sound | Sonido | Sound |
| aria.lang | Cambiar idioma | Change language |

Regla: todo texto de UI sale de la tabla. Ninguna cadena en español o inglés queda fija en una escena.

## 12. Cambios para el constructor
P0 (sin esto el feedback de Jorge sigue vigente):
1. Crear `TitleScene` (demo viva, botón Jugar, gesto dibujado, idioma, sonido). `RunScene` deja de arrancar al cargar.
2. Tutorial de 2 lecciones en `RunScene` (sección 4): congelar el mundo, mano, arco, etiqueta, rebobinar sin tarjeta, bandera `moki.tutorial`.
3. Tarjeta de fallo (sección 7): quitar "Choque" y el `restart()` a 500 ms en `update`; guardar checkpoint (dist, piezas, velocidad); reintento con 1.2 s de calma.
4. `src/i18n.js` con ES/EN y detección de idioma; todo texto sale de ahí.
5. Entradas (sección 2): `pointerupoutside`, `blur`/`visibilitychange`, `preventDefault`, `touch-action: none`.
6. Final y "Así lo hicimos" (sección 8): meta en `levelLengthSec`, `moki.best`, enlace real.

P1:
7. Botón y estado de pausa (sección 6), auto-pausa al perder foco, reanudar con rampa de 600 ms.
8. HUD sin palabras en juego (número + unidad, ficha con icono) y botón de pausa de 44 px.
9. Movimiento reducido en tutorial, tarjeta y títulos (sección 10).
10. Foco visible y `aria-label` en botones; botones DOM sobre el lienzo (recomendado) o equivalentes enfocables.
11. Patrón fijo caja, torre, caja en los primeros 30 s.
12. Verificar con el script del probador que, con los valores actuales (`jumpMinPx` 66 contra tope de torre 68), tocar nunca libra la torre y mantener la libra con más de 20 px de holgura.

P2: riel de progreso a la meta; sonido mínimo (salto, ficha, bandera, fallo); parámetros de prueba `?lang=en`, `?rm=1`, `?tut=2` (saltar a la lección 2) para el probador.

Persistencia (try/catch por modo privado): `moki.best`, `moki.lang`, `moki.sound`, `moki.juice`, `moki.tutorial`, `moki.lesson`.

## 13. Criterios PASS/FAIL (se comprueban jugando)
Cada uno: PASS o FAIL con captura en `evidencia/ux-*`.

| # | Criterio | PASS si |
|---|---|---|
| 1 | Entendimiento en 3 s | Alguien que no lo ha visto mira solo el inicio 3 s y dice qué hace tocar y qué hace mantener |
| 2 | Inicio | Título, Moki en movimiento, botón "Jugar" y frase del gesto en 375 y 1280, sin scroll |
| 3 | Arranque | Jugar arranca con clic, toque, Espacio y Enter |
| 4 | Lección 1 | El mundo se detiene con la caja a la vista; mano y "Toca" aparecen a ≤ 4.0 s de Jugar |
| 5 | Lección 2 | Igual con la torre y "Mantén"; aparece a ≤ 6 s tras resolver la 1 |
| 6 | Dos alturas | Tocar y mantener dan alturas claramente distintas; tocar no libra la torre; mantener sí |
| 7 | Sin muerte en lecciones | Fallar una lección no saca tarjeta y la mano vuelve |
| 8 | Primer salto | El jugador nuevo salta a ≤ 8 s de tocar Jugar, con 0 muertes |
| 9 | Texto en juego | En cualquier cuadro de juego hay ≤ 4 palabras de instrucción visibles |
| 10 | Fallo | Tarjeta con lección completa a ≤ 600 ms del choque; "Toca para seguir" visible < 2 s |
| 11 | Reintento | 1 toque y Moki corre desde el checkpoint, con puntaje del checkpoint, y la tarjeta no tapa a Moki |
| 12 | Final | Muestra distancia, piezas, mejor marca, "Otra vez", "Así lo hicimos" y enlace; la mejor marca sobrevive a recargar |
| 13 | Así lo hicimos | Roles, intervenciones de Jorge y enlace a jorgesuarez.com.mx que abre la página correcta |
| 14 | Pausa | Esc, P y botón pausan; reanudar no salta; se pausa solo al perder foco |
| 15 | Toque | Todo botón mide ≥ 44 x 44 CSS px (medir con `getBoundingClientRect`) |
| 16 | Contraste | Texto en tinta sobre papel y blanco sobre oscuro; texto de botones naranja en tinta |
| 17 | Movimiento reducido | Con la preferencia activada: parallax quieto, sin vaivén/shake/confeti, mano fija, juego jugable |
| 18 | Teclado | De inicio a final sin mouse; foco visible |
| 19 | ES/EN | Cambiar idioma traduce todo, incluso en pausa y tarjeta, sin cadenas fijas |
| 20 | Marca | Moki nunca espejado, sin neón ni glow, sin colores fuera de paleta |
| 21 | Consola | 0 errores en toda la partida |
| 22 | Dispositivos | Se juega de inicio a final en 375 px (toque) y 1280 px (Espacio y clic) |

Capturas que el probador guarda (375 y 1280): `ux-inicio`, `ux-leccion1`, `ux-leccion2`, `ux-exito`, `ux-fallo`, `ux-pausa`, `ux-final`, `ux-asi`; más `ux-inicio-en`, `ux-fallo-en`, `ux-leccion1-reducido`.

## 14. Veredicto
Revisadas `evidencia/t2b-375-*` y `t2b-1280-*` (commit c9d617f). El arte funciona, pero las capturas solo muestran la carrera con HUD: no hay inicio, ni lección, ni tarjeta de fallo, ni final, ni pausa. Un jugador nuevo no puede saber cómo se controla.

**UX: AJUSTAR**

Se vuelve a revisar con las capturas de la sección 13 cuando el constructor cierre los P0.

## Decisiones del líder (29-oct)
1. HUD sin palabras: metros con su número y ficha de pieza con número. ARTE §9 queda ajustado en esto.
2. Puntaje y mejor marca: puntaje = metros + piezas × N (PILOTO pide distancia y piezas). N lo fija DISENO.md. La mejor marca guarda ese puntaje.
3. Solo español. No hay textos en inglés en esta versión.
4. Tarjeta de fallo: "Toca para seguir" (en compu, "Espacio para seguir"). ARTE §9 queda ajustado en esto.
5. "Así lo hicimos": todos los roles (líder, constructor, probador, director de arte, animador, UX, diseño de juego, audio) y las intervenciones de Jorge contadas de BITACORA.md al cierre. Hoy va 1. Hardcore lo define DISENO.md.
6. La mano de papel sale procedural y la aprueba el director de arte en el hito.

## Modo demo / attract (Jorge, intervención 2, 28-oct 22:55): reemplaza la "demo viva" del inicio
- Al abrir: Moki juega solo con un bot que salta bien, en el nivel real. Letrero chico "Demo · Toca para jugar" (en compu, "Demo · Toca o presiona una tecla"). El texto EN "Demo · Tap to play" queda guardado en config para una versión en inglés.
- Guion del bot: en 30 a 40 s el demo muestra al menos un salto corto sobre caja, un salto largo sobre torre, un arco de piezas cobrado, la viga esquivada y un checkpoint con "Aprendizaje guardado". Luego reinicia el demo. Lo diseña DISENO.md (bot "demo").
- Cualquier toque, clic o tecla empieza la partida real desde el inicio, con el tutorial Toca/Mantén. Ese gesto es también el que habilita el sonido.
- El demo no guarda récord ni puntaje, no suena antes del primer gesto y no muestra la tarjeta de fallo (el bot no falla).
- Después de una partida terminada (pantalla final), si pasan 20 s sin interacción, vuelve al demo.
- Con movimiento reducido el demo va más calmado: velocidad del tramo 1, sin parallax ni partículas extra.
- PASS: al abrir, en ≤1 s Moki ya corre en el demo; en 40 s se ven los 5 momentos del guion; un toque inicia la partida real con el tutorial; tras 20 s sin tocar en la pantalla final vuelve al demo; localStorage no cambia durante el demo.

## Cambio aceptado (29-oct)
- "Así lo hicimos" va en papel crema con tarjetas de cartón, no en oscuro: decisión del director de arte para no romper el diorama (ARTE §13.9). Esto reemplaza lo que pedía UX §8.
