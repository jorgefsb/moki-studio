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
- **Bloques escritos a mano** de 3 a 6.5 s, dificultad 1 a 4 (hoy 50 + 5 sorpresas; pieza 5b y pop-up, validados uno a uno con `node scripts/bloques.mjs`), cada uno con su cola de ≥1.2 s.
- **Esqueleto por página de 30 s:** 2 s de calma, sorpresa en ventana fija, relleno de piezas para cerrar huecos.
- **Gramática:** nunca dos bloques de dificultad ≥3 seguidos; después de un 4, respiro; máximo 4 patrones sin fila de piezas; ningún bloque repetido seguido, máximo 2 por página.
- **Curva:** velocidad por página 320/350/385/420; dificultad en ventana 1-2, 1-3, 2-4, 2-4.
- **Semillas:** Clásico = guion fijo (primera partida de la vida); Del día = hash de la fecha **UTC** (igual para todos; se dice en pantalla que cambia a las 18:00 en México); Libre = `crypto`. Semilla por página: reintentar no cambia nada (el fallo sigue enseñando).
- **Reglas de justicia medibles (las verifica un bot):** ≥0.75 s entre obstáculos; ≥1.0 s entre dos que piden mantener; torre→viga ≥1.0 s, viga→torre ≥0.9 s, nunca juntas; ≥0.12 s entre aterrizar y despegar; holgura `minClear` ≥4 px; todo se libra con el despegue desplazado ±40 ms; bots tap/hold/adjust como hoy; 0% de caída al clásico en 365 fechas y 500 semillas.
- **Pop-up (U, rama v2/popup):** caja que sale del suelo, solo en bloques de dificultad ≥2 desde T2 (Reto y Libre; nunca clásico ni demo). Aviso (labio de 12 px que tiembla, sombra y corte naranja con tinta) a 0.85 s de llegar, sólida a 0.36 s: 490 ms de aviso. Reglas que verifica el bot: aviso ≥450 ms, la caja entera dentro de lo que se ve con el ancho mínimo, ≥1.4 s tras el obstáculo anterior y el despegue con la caja ya arriba.
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
4. **Papeles por página/día:** kraft, cuaderno, periódico, cartulina, como tinte derivado de tokens. Colores nuevos (p. ej. índigo de noche) los decide el equipo (canon "hecho es mejor que perfecto", 1-nov).
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

### Resultado del sprint (congelado 50cfe1d, REPORTE-SPRINT.md)
Entró: Reto del día y Libre con bloques y semilla (clásico intacto), papeles por página, celular vertical C y modo embed, feel 1 y 2 (doblez de choque, juice por niveles), tarjeta de fallo de una línea. QA final: PASA lo medido. **No medido:** 60 fps y carga <3 s (la máquina estuvo en AMARILLO/ROJO todo el sprint). **Se cayó:** sol, cordillera y atmósfera (gauntlet R1 sin mejora; la noche la rechazó arte y el contraste se midió con un instrumento que incluía posiciones fuera del lienzo).

### Siguientes 2 semanas, en este orden
1. **Instrumento primero:** `moki.contrast` mide solo posiciones dentro del lienzo; volver a medir la atmósfera de 2fce31a y que arte juzgue esa noche antes de rehacer nada.
2. **Fondo con magnitud** (receta en `evidencia/GAUNTLET.md`): valores de capa muy separados (lejos casi color de cielo, cerca casi tinta), halo que se derrama sobre el horizonte, suelo 2-3 pasos más oscuro y a la mitad de alto, sin línea blanca de contorno. Se gana el gauntlet contra la vara o no se integra; la legibilidad (8) no baja.
3. **60 fps y carga <3 s medidos** en una máquina sin carga o en un celular real.
4. **Personas reales:** 3 a 5 jugadores en celular; ms de toque, duración, y alguien que oiga la mezcla.

Pendientes que dejó la QA del sprint: el fondo no pone postes ni pinos detrás de un obstáculo (a 1280 un poste se leía como parte de la torre); mejor marca por modo si no entró hoy. Densidad del generado: hoy trae ~20% menos obstáculos y el doble de filas de piezas que el clásico (decisión A, amable); revisar con personas. Cuaderno de 3 notas y sellos; racha con perdón; tarjeta para compartir; modo Paseo; Vuelta rápida; obstáculos pop-up; luz de lámpara, perspectiva atmosférica, hito gigante y clima; 40+ bloques; hueco en el suelo; papeles temáticos con arte nuevo; **pruebas con 3-5 personas reales en celular** (ms de toque, duración real, mezcla oída).

### Pieza 5b de la v2: luz y tono de noche (31-oct, director)
Por qué: gauntlet R5 calentado (noche 1280 contra alto-04): luz 3, tono 4, contra 9 y 9. Es el hueco más grande y el faldón no lo mueve. Pilar que sirve: cartón legible y bonito de noche. Conflicto de pilares (anotado, no resuelto): "papel kraft cálido" contra "noche fría"; se resuelve con cielo frío y todo lo de papel/cartón cálido, y se lleva a Jorge si arte lo ve roto.
Qué cambia (solo perillas de `atmosphere.night` y el cielo de la hora noche en `ambient.js`):
1. Cielo: del marrón #A69682 a un azul-violeta de papel frío (arranque #6E7391 antes de mezclar con tinta; tinte sobre la textura, no color plano). `night.sky` se ajusta para que la cima quede la más oscura.
2. Horizonte: degradado de cielo frío arriba a papel cálido rosado tenue abajo (`horizon.color` de #B7B3AD a un cálido apagado tipo #C9A99A); esa es la luz de fondo.
3. Fuente de luz: el sol del cielo se vuelve luna de papel crema frío (#EDE6D6) con halo de dos anillos concéntricos de papel, alfa 0.12 y 0.06, arriba a la izquierda (donde está la lámpara). Sin elementos nuevos del tipo globos.
4. Acento cálido: el que ya hay (Moki naranja, cintas de la caja). No se añade otro.
No se toca: contorno de la viga (4 px + tinta), cordillera #625545, suelo, faldón, mañana (0 px), clásico.
Hecho = en captura calentada (>=240 updates) a 1280 y 375, gauntlet a ciegas con crítico nuevo: luz >=5 y tono >=5 (hoy 3 y 4; con ruido de ±2 solo cuenta si ambos suben >=2), legibilidad >=7, profundidad sin bajar de 4. Medidas: viga con sonda de arte >=2.0 a 375 y >=2.5 a 1280, torre/caja >=2.2 donde se pueda (torre 1280 ya está en 2.01-2.02 en la base, no se exige más), mañana a 0 px, clásico 78/78 y 2142 con ?nivel=clasico, consola 0.
Veredicto de arte esperado: AJUSTAR pero publicable; sigue "ni cerca" de Alto, el objetivo es subir luz y tono, no ganar.
Riesgo: un cielo más oscuro y frío puede bajar el contraste de la cordillera y la torre contra el fondo; medir antes de dar por buena.

### Pieza 5c de la v2: escalones de valor y luz sobre Moki (31-oct, director)
Por qué: gauntlet R5 y R6 (calentado, noche contra alto-04): luz 3-4 y profundidad 4-5 contra 9. Los tres críticos dicen lo mismo: cordillera, pino y casita tienen casi el mismo valor y no hay luz que caiga sobre algo. El color del cielo no ayudó (5b). Pilar: cartón legible y con volumen. Sin cambio de color de cielo ni de tokens (opción A; los 3 colores de 5b quedan fuera).
Rama nueva desde master 89775b1 (ecd9521 ya dentro), NO desde v2/noche-luz.
Qué cambia (primero las perillas que ya existen; nada de elementos nuevos):
1. Escalones: medir en captura calentada la luminancia de cada plano (horizonte, cordillera, casita lejana, pino medio, suelo) y dejar orden fondo claro a frente oscuro con >=6% de luminosidad HSL por paso (tope 8%) entre planos vecinos. Perillas: `night.planes.far`, `night.planes.mid`, `ground.dim`, `ridgeLight`. La cordillera se queda en #625545 (arte: si se aclara pierde la masa oscura); se oscurecen los de adelante, no se aclaran los de atrás.
2. Luz sobre Moki y el suelo: reencender y medir lo que ya existe antes de inventar: `moonRim` en Moki (alfa baja, la lámpara arriba a la izquierda) y un canto claro de papel de 2 px sobre el borde del suelo (alfa <=0.25, mismo color del horizonte actual #B7B3AD). Sombra de contacto de Moki coherente con esa luz.
No se toca: color del cielo, horizonte, luna, viga (4 px + tinta), faldón, mañana, clásico.
Hecho = captura calentada (>=240 updates) a 1280 y 375; gauntlet a ciegas con crítico nuevo contra alto-04: luz >=5 y profundidad >=6 (base calentada hoy 3 y 4; con ruido de +-2 solo cuenta si ambos suben >=2), legibilidad >=7. Medido: pasos de valor >=6% entre planos vecinos en las capturas; viga sonda de arte >=2.0 a 375 y >=2.5 a 1280; caja >=2.2; torre 1280 no peor que la base calentada (1.91); mañana a 0 px; clásico 78/78 y 2142 con ?nivel=clasico; consola 0.
Veredicto de arte esperado: AJUSTAR pero publicable; sigue 'ni cerca' de Alto.
Corte: una sola rama, un trabajo pesado a la vez (flock), una perilla por paso con captura calentada. Si tras dos pasadas completas del constructor (escalones; escalones + luz) el gauntlet no sube luz y profundidad >=2, se para y se anota 'no es de perillas': el siguiente paso sería arte nuevo (otra cordillera, no más valores) y eso se le plantea a Jorge. Para el corte de las 18:30 del 31-oct solo entra a master con PASS del probador y mi gauntlet sin retroceso; si no, sale lo que hay.

### Pieza 6 de la v2 (queda para el siguiente día de trabajo; rama v2/noche-escalera 61adfb4 guardada)
Origen: gauntlet R3/R4n ("ni cerca", sin movimiento fuera del ruido) y juicios de arte del 30-oct. Hecho = arte aprueba en foto fija, viga/torre/caja >=2.0 (torre 1280 D=260 con nubes fijas en la medida), mañana intacta, y el gauntlet de noche sube luz y profundidad a >=5 (el ruido de crítico es ±2: cuenta que arte lo vea).
1. Faldón con canto de papel de 2-3 px, borde superior ondulado, fibra ~0.06, 4-6% más claro bajo las colinas claras de la derecha; sin tocar el borde superior del suelo.
2. Tiras de horizonte DETRÁS de la cordillera, salto de valor de 6-8% entre contiguas (#B7B3AD, #A9A59F, #9C988F), alto mínimo 24 px a 1280 y 14 px a 375, canto claro arriba-izquierda y sombra 0.10 abajo. La cordillera oscura de la base se conserva.
3. Escalones de valor entre cordillera, pino y casita (hoy dentro de ~10%) y cielo distinto al de las colinas.
4. Suelo: bajar su altura (hoy >30% del cuadro) y quitar la textura de rasguños; el primer plano es lo más oscuro.
5. Canto del pino y la casita +1 px; sol separado de la etiqueta de piezas a 375.

Línea base de contraste con el instrumento nuevo (CONTRASTE, 7fa4950, 1-nov): torre a 1280 = 5.28 de día y 2.62 de noche (antes 5.11 y 2.56). El instrumento viejo da lo mismo en la misma página; la diferencia era el vaivén de entrada de la torre, no una regresión. Las 4 horas a 1280 miden en ~10 s con semáforo VERDE (11.9 s en AMARILLO).

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
- **Vara de flow (variedad, no solo justicia):** la mide `node scripts/flow-medir.mjs` sin navegador. Las definiciones están en NIVELES.md, "Flow y mecánicas (plan 1-nov)". La vara contra Alto's es un estimado; nadie la midió. Línea base medida en master 9a946d6 (1-nov) en `evidencia/v2-flow-base.json`: Clásico, 10 Retos (1 a 10-nov) y 10 Libres. Formato: promedio (mín-máx).

| Métrica | Vara | Clásico | Reto | Libre |
|---|---|---|---|---|
| F1 patrones distintos por minuto | ≥ 7 | 6.5 | 6.1 (5.5-7) | 6.3 (5.5-7) |
| F2a hueco más largo sin decisión | ≤ 4.5 s | 5.0 s | 7.9 s (6.5-9) | 6.5 s (5.3-8.5) |
| F2b % de la partida en huecos de más de 2.5 s | ≤ 12 % | 35.6 % | 46.9 % | 46.5 % |
| F3 tramo idéntico más largo repetido | ≤ 4 s | 0 s | 0.8 s (0-4.5) | 1.2 s (0-2) |
| F3b repeticiones pegadas | 0 | 0 | 0.1 (1 en 10) | 0 |
| F4 % de obstáculos con elección real | ≥ 20 % | 5.8 % | 12.7 % (4.5-19.5) | 14.8 % (4.7-25) |
| F6 segundos sin patrón nuevo | ≤ 30 s | 28.5 s | 28.2 s (24.5-32.7) | 30.7 s (24.5-43.7) |

  F4 sale de un modelo: las ecuaciones del salto del juego contra cajas de choque aproximadas. En las 21 partidas, el plan que asigna el nivel sobrevive en el modelo 100 %. Lo más lejos de la vara son los huecos: casi la mitad de la partida pasa sin decidir nada.

## 12. Decisiones del equipo (Jorge califica después)
1. Papeles nuevos y un color de noche fuera de los 8 tokens: **sí**, derivados de los tokens. Se juzgan en gauntlet a ciegas y Jorge califica en vivo. [decidido por el equipo, 1-nov]
2. Poses nuevas de Moki (zancada, salto, caída, aterrizaje): **sí**, desde las animaciones de Moki Pixel o Moki HD, con el canon intacto (parche en la oreja derecha, nunca espejo, nunca en T). Pieza macro del 2-nov. [decidido por el equipo, 1-nov]
3. El reto del día cambia a medianoche UTC (18:00 en México), igual para todos: **sí**. [decidido por el equipo, 1-nov]
