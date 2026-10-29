# GDD.md · Moki: Un salto más · v1 (29-oct-2026, 09:45 CDMX)

Director de juego (estudio-director). Fuentes: PILOTO.md, DISENO.md, ARTE.md, REPORTE-FINAL.md, INVESTIGACION.md, y los insumos de diseño de juego, niveles, arte y feel pedidos hoy. Build de partida: 8ac54f0 (publicado en moki-prueba). Marca personal de Jorge. Moki nunca se espeja.

## En corto
La mecánica ya funciona: tocar o mantener decide algo, y fallar enseña. Le faltan tres cosas: **razón para volver** (no hay "después"), **belleza con luz y profundidad** (hoy se ve como una ilustración plana de un solo marrón) y **papel que se comporte como papel**. La v2 convierte el nivel único en **un libro de páginas de papel** que se recorre cada día distinto, con un cuaderno de notas que siempre deja algo chiquito por hacer.

Vara de calidad: **Alto's Odyssey**, solo como vara de belleza y feel. No copiamos su contenido (nada de sandboard, desierto, trucos ni personajes). Lo nuestro es el diorama de cartón.

## 1. Pilares
1. **Un botón, dos matices.** Tocar o mantener siempre decide algo; el reto se aprende con las manos.
2. **Fallar es aprender rápido.** Reintento en ≤1 s, sin regaño ni castigo.
3. **Papel que se comporta como papel.** El cartón se despliega, se dobla y se arruga; la luz es de lámpara sobre una mesa.
4. **Siempre una razón chiquita para otra.** Una nota por cumplir, un sello por ganar. Nunca presión ni culpa.

**Fantasía del jugador:** "Soy un mensajero de papel que recorre un libro desplegable, y cada vuelta me sale un poco mejor."

## 2. Loops
| Loop | Duración | v1 (piloto) | v2 |
|---|---|---|---|
| Micro | 1-3 s | Leer, decidir altura (toque/mantener/no saltar), aterrizar | Igual. Suma: choque con gracia (Moki se dobla 6° en 120 ms, el obstáculo se arruga y se alisa), estirón tras el despegue |
| Meso | 30 s (página) | Tramo guionizado + checkpoint ámbar | Página armada con bloques escritos a mano y semilla; checkpoint = pasar de página; una nota del cuaderno visible |
| Macro | 2-3 min (libro) | Un nivel fijo de 120 s | **Libro de 4 páginas**: "Clásico" (el nivel de hoy, sirve de tutorial y primera partida) + **"Papel del día"** (semilla por fecha, papel distinto) + **Libre** (semilla nueva cada vez) |
| Meta | días | Mejor marca | Cuaderno de 3 notas, sellos, racha con perdón, desbloqueos |

## 3. Progresión y metajuego (todo en localStorage, sin cuentas)
- **Barra de progreso** con 4 banderines y la marca de tinta "tu mejor" (DISENO §6, no construida).
- **Cuaderno de Moki:** 3 notas activas (modelo Jetpack Joyride, sin azar). Banco fijo de 9 notas: "3 vigas con toque", "arco completo en la página 2", "llega sin caerte", etc. Al cumplir una: sello de cartón y entra la siguiente.
- **Sellos:** Llegué, Sin caerme, Coleccionista (≥80% piezas), Arco completo (3 en una partida), más los de notas.
- **Racha con perdón:** días jugados; 1 perdón por semana; Moki saluda distinto según la racha. Sin cuenta regresiva ni culpa.
- **Desbloqueos honestos:** Hardcore al terminar una vez; Vuelta rápida (x1.12, techo 470 px/s) con Coleccionista; modo **Paseo** (sin choques, reusa `god`) desde el inicio para el público cozy e infantil.
- **Tarjeta para compartir:** texto con emojis al portapapeles (fila de sellos por página + fecha). La comparte el jugador; nosotros no publicamos nada.

## 4. Niveles procedurales (rama `sprint/niveles`, ver NIVELES.md)
- **Bloques escritos a mano** de 3 a 6.5 s, dificultad 1 a 4 (hoy 24 + 5 sorpresas), cada uno con su cola de ≥1.2 s.
- **Esqueleto por página de 30 s:** 2 s de calma, sorpresa en ventana fija, relleno de piezas para cerrar huecos.
- **Gramática:** nunca dos bloques de dificultad ≥3 seguidos; después de un 4, respiro; máximo 4 patrones sin fila de piezas; ningún bloque repetido seguido, máximo 2 por página.
- **Curva:** velocidad por página 320/350/385/420; dificultad en ventana 1-2, 1-3, 2-4, 2-4.
- **Semillas:** Clásico = guion fijo (primera partida de la vida); Del día = hash de la fecha **UTC** (igual para todos; se dice en pantalla que cambia a las 18:00 en México); Libre = `crypto`. Semilla por página: reintentar no cambia nada (el fallo sigue enseñando).
- **Reglas de justicia medibles (las verifica un bot):** ≥0.75 s entre obstáculos; ≥1.0 s entre dos que piden mantener; torre→viga ≥1.0 s, viga→torre ≥0.9 s, nunca juntas; ≥0.12 s entre aterrizar y despegar; holgura `minClear` ≥4 px; todo se libra con el despegue desplazado ±40 ms; bots tap/hold/adjust como hoy; 0% de caída al clásico en 365 fechas y 500 semillas.
- **Riesgo de monotonía:** medir histograma de bloques; las filas de piezas sueltas ≤20% de cada página.

## 5. Look and feel
### Diagnóstico (director de arte, crítico)
1. **Sin luz:** todo iluminado igual, sin fuente, volumen ni sombra larga.
2. **Un solo marrón:** cielo, colinas, árboles y suelo en 3-4 beiges; la noche es gris sucio.
3. **Profundidad de mapa, no de espacio:** sin perspectiva atmosférica, niebla ni primer plano.
4. **Sin escala ni variación:** mismo pino, casa y colina; sin hitos enormes; sin clima.
5. **Suelo muerto** y, en vertical, ~55% de cielo vacío (decisión C de hoy: suelo al ~66%, cerros más altos).

### Pilares visuales v2
1. **Luz de lámpara real:** halo cálido arriba a la izquierda, viñeta de tinta, sombras proyectadas hacia la derecha por capa.
2. **Perspectiva atmosférica con tokens:** cada capa se mezcla hacia el color del cielo según distancia (0.55 / 0.35 / 0.18).
3. **Escala:** un hito gigante (montaña de cartón a 0.05x, sol o luna de papel), ≥5 planos distinguibles, rango tonal de tinta casi negra a blanco cálido.
4. **Papeles por página/día:** kraft, cuaderno, periódico, cartulina, como tinte derivado de tokens. Colores nuevos (p. ej. índigo de noche) **solo con OK de Jorge**.
5. **Clima de papel finito:** recortes, papel de seda o copos; apagado en Nada y en movimiento reducido.
6. **Un solo foco naranja:** Moki y la acción; todo lo demás apagado.

### Feel (rama `sprint/feel`)
- Despegue en el mismo cuadro del toque (≤16.7 ms), coyote 90 ms, buffer 110 ms, estirón 3% en 80 ms después.
- Aterrizaje: hundimiento 3.3 px en 130 ms, asentado 120-180 ms, pasto que se dobla con impacto.
- Pieza/racha: pentatónica de Do; respuesta creciente pieza → 5ª de racha → arco completo.
- Choque: freeze 60 ms, retroceso 220 ms, doblez de papel de Moki, tarjeta ligera, reintento desde 550 ms.
- Checkpoint: bandera 280 ms, saltito, confeti, stinger, vibración `[15,40,15]` solo desde Mucho.
- Tarjeta de fallo: sin el título que contradice ("empieza con lo aprendido" + "Empiezas de nuevo"), sin tapar el HUD, una línea de pista, reintento sin tener que leer.

## 6. Audio
Base: AUDIO.md y el tema "Un saltito más" (96 BPM, Web Audio). Pico de sesión -7.9 a -8.1 dBFS; nadie lo ha oído.
- v2: una capa/timbre por papel (periódico más seco, cartulina más brillante), stinger de pasar página, sonido de doblez en el choque.
- **Primero oír:** Jorge escucha `evidencia/t3g2-audio-piezas-20s.wav` y `evidencia/reqa2-audio-sesion-53s.wav` antes de más mezcla.

## 7. Plataforma
- Celular vertical (390x844) como primera clase, sin cambiar el tiempo de reacción (389 unidades delante de Moki).
- Modo embed (iframe) para portales.
- Carga <3 s, 60 fps (p95 del cuadro ≤20 ms), 0 errores de consola, dist <20 MB (hoy ~1.5 MB).

## 8. Monetización posible (ideas; nada se implementa, cero dinero en el estudio)
- **Pago único** del libro completo, o gratis con las primeras páginas.
- **Disfraces de papel** solo estéticos, a precio directo (modelo Crossy Road sin cajas). Moki nunca espejado.
- **Páginas nuevas** como paquete con precio claro.
- **Anuncio opcional con premio estético**, nunca al morir ni con ventaja.
- **Prohibido:** ruletas y cajas con azar; pase de batalla; anuncios forzados o entre reintentos; contadores falsos y urgencia inventada; racha con culpa o con cobro; energía o vidas a la venta; dificultad que sube para vender ayuda; cripto y tap-to-earn; cuentas obligatorias o datos personales; ventaja pagada en el puntaje compartido.

## 9. Roadmap
### Sprint de hoy (hasta 11:00 CDMX, congelado 10:50)
| Asiento | Rama | Entrega (corte 10:30) |
|---|---|---|
| estudio-constructor | sprint/base | Celular vertical con composición C, modo embed, barra de progreso con "tu mejor", tarjeta de fallo ligera |
| estudio-niveles | sprint/niveles | Generador conectado en RunScene, 3 reglas de justicia que faltan, semilla del tutorial = clásico, selector Clásico / Del día / Libre, papeles como tinte |
| estudio-feel | sprint/feel | Commit de lo hecho, vibración de Poquito alineada, doblez de papel al chocar, estirón tras despegue |
| estudio-investigador | — | Capturas de referencia Alto's (sin navegador) y juicio a ciegas |
| estudio-probador | — | QA rápida por cada merge; QA final del sprint a las 10:50 → REPORTE-SPRINT.md |
| estudio-lider | master | Merges, bitácora, congelado |
| Director | — | Gauntlet a ciegas por pieza; luz y atmósfera (si sobra tiempo, a la rama base) |

### Siguientes 2 semanas
Cuaderno de 3 notas y sellos; racha con perdón; tarjeta para compartir; modo Paseo; Vuelta rápida; obstáculos pop-up; luz de lámpara, perspectiva atmosférica, hito gigante y clima; 40+ bloques; hueco en el suelo; papeles temáticos con arte nuevo; **pruebas con 3-5 personas reales en celular** (ms de toque, duración real, mezcla oída).

### v1 pública
Libro de 4 páginas + papel del día + cuaderno + racha; poses nuevas de Moki dibujadas por la marca; carga <3 s en gama media; métricas de portal (sesión 10+ min, D1 10-15%, 80% juega 1+ min) medidas en moki-prueba antes de cualquier portal. Spark publica; nada se publica desde el estudio.

## 10. Riesgos
1. **Profundidad:** una mecánica puede agotarse antes de que haya hábito. Mitigación: variedad del papel del día con bloques bien probados; un solo obstáculo nuevo (hueco) por fase.
2. **Procedural injusto o ilegible:** pierde el "fallar enseña". Mitigación: bloques a mano, semilla por página, bots con ±40 ms.
3. **Construir sobre supuestos:** nadie ha oído el juego ni lo ha jugado en un celular real. Medir con personas antes de crecer el metajuego.
4. **Belleza que pide colores fuera de marca** (índigo, noche): decisión de Jorge.
5. **Poses de Moki:** el títere recortado de `moki-lado` es el mayor hueco contra la vara; las poses las dibuja Jorge o la marca, no el estudio.
6. **Máquina al límite** (4 núcleos, <600 MB libres): todo lo pesado con `flock /tmp/moki-pesado.lock`, críticos sin navegadores en paralelo.

## 11. Gauntlet loop (vara medible)
- **Vara dura:** 0 errores de consola, 60 fps (p95 ≤20 ms), carga <3 s.
- **Vara de belleza y feel:** capturas oficiales de Alto's Odyssey (press kit en altosodyssey.com/press y thealtocollection.com/press), guardadas en `evidencia/referencia/` solo para uso interno.
- **Por pieza** (feel, niveles, fondo, menús, audio): el constructor construye; un crítico distinto, con contexto nuevo, recibe dos capturas sin etiqueta (A/B al azar), dice cuál gana y nombra la brecha más grande. Sin elogios. Se repite hasta que el nuestro gane o hasta el congelado, y se anota en BITACORA.
- **Criterios de "el nuestro gana" en captura fija:** luz legible con sombras coherentes; ≥5 planos con tono que aclara hacia el fondo; negro cercano y blanco cálido; un hito enorme con escala contra Moki; un elemento de atmósfera; un solo foco naranja; en vertical ningún tercio vacío.

## 12. Decisiones para Jorge (cuando pueda; nada bloquea el sprint)
1. ¿Papeles nuevos y un color de noche fuera de los 8 tokens? Recomiendo: sí, derivados de los tokens, y que los apruebe en una captura.
2. ¿Poses nuevas de Moki (zancada, salto, caída, aterrizaje)? Recomiendo: sí, es la brecha visual #1 contra la vara.
3. ¿El reto del día cambia a las 18:00 de México (UTC) o a medianoche local? Recomiendo: UTC, igual para todos.
