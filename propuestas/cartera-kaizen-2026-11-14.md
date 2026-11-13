# Cartera Kaizen, sábado 14-nov-2026

Invitado: diseñador de juego. Regla: metodo/dos-carriles.md (filtro de salto: las 3 deben ser sí; Jorge escoge una en 2 minutos).
Punto de partida (7-13 nov): 159 partidas (Reto 89, Clásico 56, Libre 13, Paseo 1); 123 de 150 fueron otra partida en la misma visita (82%). La horquilla ya existe: arriba paga 12 por pieza (`arcBonusAlto`), a ras paga 5; ratio 1.82. Hoy el contador NO guarda si se fue arriba o a ras: falta ese dato y es el primer corte de cualquier apuesta.
Honestidad: ningún número de "hoy" de abajo sobre la horquilla existe todavía. Donde digo "sin medir", la apuesta empieza midiéndolo.

---------------------------------------------------------------
## 1. MECÁNICA: "Cinta" (premios que crecen arriba)
Responde a la opción B de la encuesta, pero con ritmo, no solo con número más grande.

**Qué cambia para quien juega.** Cada vez que subes por arriba, una cinta de papel crece detrás de Moki (x2, x3, x4). Si vas a ras o chocas, la cinta se rompe. Con la cinta en x3, Moki se vuelve avión de papel 4 s y cruza la siguiente horquilla sin riesgo, cobrando arriba.

**Filtro de salto**
1. Se nota en 10 s sin explicar: SÍ. La cinta se ve crecer y romperse; no necesita letrero.
2. Cambia lo que el jugador hace: SÍ. Hoy a ras es la opción segura y no tiene costo de oportunidad; con la cinta, escoger "a ras" rompe una racha que ya llevas y duele un poco. Hace que la decisión de la horquilla pese entre una y otra.
3. Mueve un número al doble: SÍ, condicionado. Número: horquillas tomadas arriba por partida. Hoy: sin medir (el contador no lo guarda). Se mide con un campo `arriba` y `horquillas` en `detalle` (2 enteros). Umbral: si hoy es X, la apuesta sirve si llega a 2X. Segundo número que sí existe: pago máximo por horquilla, hoy 12; con cinta x3 sube a 36 (3x).

**Adelanto de 10 s (guion para maquetar en ≤45 min)**
- 0-2 s: Moki corre; aparece la horquilla con letreros "Arriba" y "A ras".
- 2-4 s: sube por arriba, +12, nace la cinta con "x2".
- 4-6 s: segunda horquilla, sube otra vez, la cinta se alarga, "x3", +36 volando.
- 6-8 s: Moki se vuelve avión de papel, cruza una zanja sin tocar suelo.
- 8-10 s: aterriza, la cinta se pliega en una estrella en el Cuaderno. Corte a negro.

**Riesgo mayor:** que el multiplicador haga a ras "aburrido" y los jugadores nuevos (27 de 150 en su 1.ª partida) se sientan castigados. Mitigación: x2 solo desde la 2.ª horquilla seguida y la cinta rota no quita puntos ya ganados.
**Primer corte (vuelta 1):** cinta x2 y x3 con su dibujo, ruptura al ir a ras o chocar, contador `arriba/horquillas`. Sin avión (queda para vuelta 2). Reusa las dos horquillas de master.
**Peso estimado:** +1.5 a 2 KB gz (un sprite de cinta y ~40 líneas; el avión sumaría ~1.5 KB más).
**Patrón/skill:** `patrones/combo-que-se-ve.md` (hoy "sin usar") y DESARMADO §8, Idea 3 (cinta que crece; avión de papel como el ala de Odyssey). Skill moki-hooked-juegos para la matriz de riesgo: la ruptura de racha no se castiga con puntos perdidos, solo con ganancia que no llega.

---------------------------------------------------------------
## 2. RAZÓN PARA VOLVER: "Camino secreto del día"
Responde a la opción C de la encuesta.

**Qué cambia para quien juega.** Una de cada tres horquillas del Reto del día esconde un tercer camino (una pista: una rayita de tinta, una esquina doblada del papel). Quien lo encuentra se lleva un sello "Lo encontré" en el Cuaderno y una corona distinta. Cada día el secreto cambia de lugar, igual para todos (semilla del día).

**Filtro de salto**
1. Se nota en 10 s: SÍ en el video (la esquina doblada se abre y Moki entra por ahí). Para quien juega sin saberlo, la pista es sutil: eso es a propósito, pero la primera vez no se nota en 10 s. Va como SÍ con la salvedad.
2. Cambia la razón para volver: SÍ. Hoy 82% repite en la misma visita pero nada pide volver mañana (la racha existe, el secreto da una pregunta nueva: "¿dónde está hoy?").
3. Mueve un número al doble: NO se sabe. Número: jugadores que vuelven otro día. Hoy: sin medir (el contador cuenta partidas por visita, no días por jugador). Hay que agregar un `dia` anónimo en local (sin identificar a nadie) y contar cuántos juegan en 2 o más días de 7. Si no se puede medir sin guardar datos de personas, la apuesta se baja a "partidas por visita": hoy ~1.0 repetidas por visita (123 otras contra 27 primeras).

**Adelanto de 10 s**
- 0-2 s: Moki corre; la horquilla muestra "Arriba" y "A ras" y una esquina de papel doblada.
- 2-4 s: Moki toca la esquina, se abre un pasillo oscuro de papel.
- 4-6 s: dentro, una fila de 5 piezas en forma de flecha.
- 6-8 s: sale, sello "Lo encontré" cae en el Cuaderno con sonido de pegamento.
- 8-10 s: la tarjeta final dice "Mañana el secreto está en otro lado".

**Riesgo mayor:** nadie lo encuentra y se siente trampa o vacío. Mitigación: pista visible en la 1.ª horquilla del día, y tras 3 partidas fallidas el Cuaderno dice "el secreto hoy está abajo", sin culpa (patrón fallar-barato).
**Primer corte:** un solo secreto fijo en una sola horquilla del Reto de hoy, con su sello. Sin rotar por día (vuelta 2).
**Peso estimado:** +3 KB gz (arte del pasillo, sello, 1 bloque escrito a mano).
**Patrón/skill:** `patrones/variedad-por-hora-y-clima.md` (momento raro) y DESARMADO "eventos del mundo" §3.11 (globos que aparecen); matriz moki-hooked-juegos: es curiosidad, no escasez falsa ni cuenta regresiva.

---------------------------------------------------------------
## 3. TRAER GENTE: "Mi marca, tu turno"
**Qué cambia para quien juega.** La tarjeta final genera una liga: tu amigo abre el Reto de ese día, ve en el fondo una banderita con "tu amigo llegó aquí" (el número, sin nombre) y juega para pasarla. No hace falta cuenta.

**Filtro de salto**
1. Se nota en 10 s: SÍ. La banderita ya aparece en el camino, a la distancia de la marca.
2. Cambia las ganas de compartir: SÍ. Hoy la tarjeta es texto con emojis que el jugador copia; esta le da un "reto" a quien la recibe, no solo presume.
3. Mueve un número al doble: NO se puede asegurar. Número: visitas nuevas por semana. Hoy solo se ve indirecto: 27 partidas "primera" en 150 con detalle, o sea ~27 visitas nuevas en 7 días (~4 al día). Duplicarlas a ~54 depende de que alguien comparta, y hoy no se mide cuántas tarjetas se comparten. Se cuenta con un parámetro `?desde=reto` en la liga: partidas con ese origen contra el total.

**Adelanto de 10 s**
- 0-2 s: tarjeta final con botón "Retar a un amigo".
- 2-4 s: se copia la liga; corte a otra pantalla (otro jugador).
- 4-6 s: Moki corre en el mismo Reto; a lo lejos una banderita "412 m".
- 6-8 s: pasa la banderita, confeti de papel, "¡Le ganaste a 412!".
- 8-10 s: botón "Retar de vuelta".

**Riesgo mayor:** nadie lo comparte aunque exista, o la liga abre un Reto de otro día. Mitigación: la liga lleva la semilla del día y vence con el día (sin cuenta regresiva en pantalla).
**Primer corte:** liga con semilla y marca; banderita en el camino; sin mensajes ni nombres.
**Peso estimado:** +1 KB gz (parser de parámetros, una banderita).
**Patrón/skill:** no hay patrón en el índice; lo hago a partir de la tarjeta de compartir de P36 y skill moki-hooked-juegos (reto social sin presión). Propongo ficha nueva `patrones/marca-del-amigo.md` tras medir.

---------------------------------------------------------------
## Recomendación (una): la 1, "Cinta"
Por qué: la decisión arriba-contra-a-ras ya está en master y es lo único que cambia lo que el jugador HACE en cada horquilla; con 82% de repeticiones, el juego ya engancha, así que el mejor premio es que la siguiente partida se sienta distinta. Es la más barata y la más segura de medir (el contador queda listo para las otras dos). Cubre la encuesta B sin dejar atrás A y C: la cinta pide más horquillas seguidas.

**Número de hoy que confirmaría o mataría cada apuesta**
- Cinta: horquillas arriba por partida (nuevo campo). Se confirma si pasa de X a 2X en la 1.ª semana; se mata si a ras sigue siendo más de 80% con la cinta.
- Camino secreto: días distintos de juego por jugador en 7. Se confirma si sube al doble; se mata si menos de 1 de cada 10 lo encuentra tras 3 días.
- Mi marca, tu turno: visitas con `?desde=reto` por semana. Se mata si en 3 días hay menos de 5 y se confirma con 30 o más (hoy el total de primeras visitas es ~27 por semana).
