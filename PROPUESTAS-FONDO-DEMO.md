# Propuestas: fondo vivo y demo lindo

Pedido de Jorge (28-oct 22:56, ideas, no intervención): fondo vivo con eventos de papel aleatorios solo en capas 1-3, y modo demo lindo de observar. El guion de obstáculos sigue determinista.
Autores: diseñador de juego (sección 1), director de arte (sección 2). El líder elige al final (sección 3, manda).

## 1. Diseño de juego

### A) Demo de 38 s (guion fijo, determinista)
Tiempos = "llega a Moki" en s desde el inicio del demo. Vel. 320 hasta 30 s; 30-32 rampa a 350.

| t | Pasa | Qué luce |
|---|---|---|
| 0-2.0 | Moki ya corre, sin obstáculos | Calma. Letrero "Demo · Toca para jugar" entra a 0.5 s. |
| 2.5 y 5.0 | Dos cajas, toque 80 ms | Salto corto, dos veces para que se lea el ritmo. |
| 7.0 | Fila de 5 piezas en el suelo | Racha x2, respiro cobrando. |
| 9.5 | Torre, mantener 240 ms | Salto largo, aterrizaje con polvo de papel. |
| 10.5-12.5 | Nada | Respiro. |
| 13.0 | Caja con arco alto de 5 piezas | Arco cobrado, "Arco completo" (+5). |
| 15.5 | Fila de 5 piezas | Respiro cobrando. |
| 18.0 | Viga con 5 piezas debajo | Viga esquivada: no salta y cobra corriendo. |
| 20.0-21.0 | Nada | Respiro. |
| 21.5 | Dos cajas a 0.9 s | Salto-salto, único ritmo rápido. |
| 25.0 | Torre con arco de 7 piezas y pieza ámbar en el vértice | Clímax: racha x3 y ámbar. |
| 27.0-29.5 | Nada | Calma antes del checkpoint. |
| 30.0 | Bandera ámbar | Se despliega (280 ms), "Aprendizaje guardado" (1.6 s). Sube a 350. |
| 33.0 | Una caja, toque | Cierre fácil. |
| 34.0-36.4 | Nada | Calma. |

Reinicio sin corte: de 36.4 a 38 una tira de papel fundida (400 ms entra, 400 ms sale) cubre HUD y mundo, no a Moki. Moki sigue corriendo; bajo la tira se reinicia el guion y la velocidad vuelve a 320. HUD del demo a 0 en cada vuelta; no toca localStorage.

Variantes (vuelta 1 siempre A; rotan A, B, C):

| Ranura | A | B | C |
|---|---|---|---|
| 9.5 | Torre | CC (dos cajas pegadas, un salto largo) | Torre |
| 13.0 | Caja con arco alto | Caja con arco alto | Torre con arco alto |
| 18.0 | Viga con piezas debajo | Caja bajo viga (toque) | Viga con arco bajo (toque) |

La ranura 25.0 siempre lleva la pieza ámbar. Cambian también semillas de eventos de fondo, hora del día y lección del letrero.
Bot: salta 60-80 ms antes del punto ideal, mantiene 240 ms en torres y arcos altos. No falla, sin tarjeta.

### B) Fondo vivo: cuándo sí y cuándo no
- Solo capas 1-3, con generador aleatorio propio separado del guion.
- Máx. 1 evento activo, 6 s mínimo entre inicios, ≤4 s a vista.
- Evento como premio: 0.3-0.8 s después de un momento bueno, nunca encima; si coinciden, se descarta el segundo.

| Evento | Cuándo | Tope |
|---|---|---|
| Globo de papel | Tras el checkpoint, ya ido "Aprendizaje guardado" | 1 por checkpoint |
| Pajaritos de origami | Tras salto mantenido ≥220 ms o arco completo, si el siguiente obstáculo está a ≥1.5 s | 1 por tramo |
| Letrero con lección | Huecos tranquilos de T1 y T2, rota las 3 frases aprobadas | 1 por tramo, solo T1-T2 |
| Avioncito | En respiro, cruzando capa 1 | 1 por tramo, solo T1-T2 |
| Mariposas | Tras fila de piezas en T1-T2 | 1 por tramo, solo T1-T2 |
| Moki chiquito saludando | Respiro de mitad de T2 | 1 por partida |
| Nubes que se recortan | Siempre (capa 1 a 0.1x) | Sin tope |
| Hora del día | En la rampa de cada checkpoint: mañana, mediodía, tarde, atardecer | 3 cambios por partida |

Frecuencia máx. por tramo (sin nubes ni hora): T1 3, T2 3, T3 2, T4 1.

Nunca:
- T3-T4: solo en huecos ≥2.5 s (T3: fila de piezas del 19.5; T4: respiro tras la Ola 12.5-15.5). Nunca en T·V, C·V, VC, CC ni durante la Ola.
- T1: solo entre 4 y 19 s (no pisar las etiquetas de enseñanza).
- Nunca a <2 s de etiqueta de enseñanza, checkpoint o tarjeta de fallo; ninguno durante la tarjeta ni en los 2 s de calma del reintento.
- Movimiento reducido: sin eventos, nubes quietas, hora por fundido.
- Demo: máx. 1 evento cada 8 s.

Hora del día: tinte ≤12% solo en capas 1-3, de papel a kraft cálido, sin noche. Capa 4 (Moki, obstáculos, piezas) no cambia.

### C) Riesgos
1. Parecer pieza o peligro: sin naranja, ámbar ni círculos kraft; menos contraste que capa 4; pájaros y mariposas por encima de 200 px sobre el suelo (arco alto llega a 164).
2. Distraer: nada cruza la zona de lectura (x 151-620, 0-180 px de altura).
3. Letrero: solo las 3 frases aprobadas, sin verbos de acción, ≥16 px.
4. Moki chiquito: escala ≤30%, desaturado, pose saluda oficial, nunca espejado, 1 vez por partida.
5. Ningún evento da puntos, suena a premio ni cambia el HUD.
6. La viga sale a los 18 s en el demo y a los 60 s en el juego; el letrero "Demo" lo aclara.
7. Probar viga y torre en T3-T4 a 375 con la hora más oscura; si pierden lectura, tinte a 8%.
8. Determinismo PASS: mismo bot con eventos distintos = mismo puntaje y piezas.
9. Costo: un solo sprite de evento activo; si bajan los fps, se apagan los eventos.

Decisión pedida: ¿demo muestra la viga a los 18 s? Recomendación: sí.

## 2. Dirección de arte

Zona de vuelo: y < groundY-260 (cielo libre arriba de los árboles; en 375 hay ~250 px de cielo bajo el HUD). Nada usa naranja ni ámbar.

| # | Evento · capa | Frecuencia / duración | Movimiento | Paleta | Movimiento reducido |
|---|---|---|---|---|---|
| 1 | Nube que se recorta · L1 | cada 12-20 s, vive 14-20 s | 2-3 tijeretazos de 120 ms (grande→chica), 2° por corte, 2 trocitos caen y se apagan en 1 s | papel, canto border 2 px, sombra ink 12% | nubes fijas |
| 2 | Avioncito · L1 | cada 35-55 s, cruza en 6-8 s | anticipa -3°, planea ±4° senoidal, sale algo más alto | papel, pliegue kraft | no aparece |
| 3 | Pajaritos de origami · L1 | cada 25-40 s, 3 en V, 7 s | aleteo stop-motion de 2 poses a 6-8 cambios/s | papel/kraft, trazo ink 40% | bandada posada fija en la colina |
| 4 | Globo de papel · L2 | cada 70-110 s, 22-28 s | sube tras colinas, balanceo 1-2°, 0.3x | kraft claro y papel, cesta ink 40% | no aparece |
| 5 | Mariposas · L3 | cada 30-50 s, 1-2, 8 s | aleteo escalando ancho 100→40%, curva, y < groundY-200 | papel/kraft, cuerpo ink | no aparece |
| 6 | Letrero con lección · L3 | 1 por tramo desde 10 s, fuera del tutorial, 2-3 s | cartel en poste, asienta con 1° | papel, kraft, ink; Outfit 700 ≥16 px | fijo con fundido 150 ms en checkpoint |
| 7 | Moki chiquito saludando · L2 | asoma 2.5 s | moki-saluda.webp a 28-32 px, asoma tras colina 220 ms, se mece 2× ±1.5°, baja 180 ms | asset tal cual, velo papel 12% | fijo con fundido |
| 8 | Estrellas de papel · L1 | solo en noche de lámpara, 5-7, pop 150 ms | cuelgan de hilo, ±1.5° al entrar | papel, canto kraft | fijas |

Reglas: máx. 1 protagonista + 1 ambiente, 4 s entre inicios, ≤6 por minuto, pool ≤12 sprites. Nada sobre la banda de juego más contrastado que el fondo; fuera del HUD (16 px). Contraste de eventos 12-18% máx., siempre menor que obstáculos y piezas. Solo nacen en respiros >1.5 s leyendo el guion; nunca en tutorial, "Aprendizaje guardado" ni los 2 s tras reaparecer. PRNG propio con semilla. Evento que tape un obstáculo = ARTE: RECHAZADO.

Hora del día (por tramo, crossfade de 6 s tras el checkpoint, solo L1-L3; banda, HUD y Moki no cambian):

| Tramo | Momento | Cielo | Capas 2-3 | Sombras |
|---|---|---|---|---|
| 1 | Mañana | #F4E8D5 | sin velo | ink 12% |
| 2 | Mediodía | #EBDBC5 | kraft 8% | ink 14% |
| 3 | Tarde | #DFC9AF | kraft 12% | ink 18% |
| 4 | Noche de lámpara | #BEAF9B (piso de oscuridad) | ink 10% | ink 24% |

Lámpara: disco de papel arriba-izquierda con canto kraft 3 px y mancha de luz recortada 6% más clara, sin degradado ni glow. Nada de negro, azul ni morado en el cielo.

Demo: sin zoom ni paneo (ARTE §10). Letrero de papel #F4E8D5, canto kraft 3 px, radio 12, "Demo" Outfit 700 16 px + "· Toca para jugar" Inter 16 px, centrado sobre el suelo a 16 px del borde, entra 240 ms con 1.5° de asiento, vaivén de 2 px a los 6 s (máx. 3 veces). Eventos forzados con semilla fija: nube 1.5 s, pajaritos 6 s, avioncito 12 s, Moki chiquito 19 s, globo 24-30 s, silencio en checkpoint, Mañana→Tarde 31-37 s, mariposa 34 s. Movimiento reducido: nube y pajaritos fijos, hora quieta en Mañana.

## 3. Decisiones del líder (29-oct): mandan sobre 1 y 2
1. **Demo:** guion fijo de 38 s de diseño (sección 1A), con variantes A/B/C, bot que no falla y reinicio bajo la tira de papel. La viga sale a los 18 s. Letrero y eventos forzados según arte (sección 2), ajustados a 38 s: globo 22-29 s y Mañana→Tarde 31-36 s. Sin zoom ni paneo.
2. **Cupo de eventos:** 1 protagonista (avioncito, globo, letrero, Moki chiquito, pajaritos, mariposas) + nubes de ambiente. 6 s entre protagonistas. Topes por tramo de diseño: T1 3, T2 3, T3 2, T4 1. Demo: 1 cada 8 s, salvo los forzados.
3. **Cuándo:** solo en respiros, como premio 0.3-0.8 s después de un momento bueno, según la tabla 1B. Zona de vuelo y < groundY-260; zona de lectura libre (x 151-620, 0-180 px). PRNG con semilla, separado del guion.
4. **Hora del día:** las 4 de arte, con noche de lámpara y su piso #BEAF9B. El probador mide que el contraste obstáculo/fondo en T4 no baje del de Mañana; si baja, el tinte del tramo 4 se reduce.
5. **Moki chiquito:** 1 vez por partida (mitad de T2) y 1 por demo. Asset oficial tal cual a 28-32 px, nunca espejado. No se redibuja aunque el parche no se lea a ese tamaño. No se le pregunta a Jorge.
6. **Letreros:** solo las 3 lecciones aprobadas, en español, solo T1 y T2.
7. **Movimiento reducido:** versiones fijas de arte (nubes y pajaritos posados, cartel con fundido), sin eventos que viajen, hora con fundido de 150 ms en el checkpoint.
8. **Prioridad:**
   - P0: demo completo, nubes que se recortan, avioncito, pajaritos y hora del día.
   - P1: globo, Moki chiquito, letrero, mariposas y estrellas.
9. **PASS de determinismo:** mismo bot con semillas de fondo distintas da el mismo puntaje y las mismas piezas.
