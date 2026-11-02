# AUDIO-CAPAS: plan de capas de "CRECE Corte 1"

Autor: invitado de audio, 2-nov. Decisión de origen: DECISIONES.md l.139 (música que crece con el Cuaderno) y l.155-156 (el mundo crece contigo).

## 1. Cómo está hecho el audio hoy (verificado en src/audio/)

- Todo es síntesis con Web Audio. No hay un solo archivo de sonido. Se puede seguir así: cero descargas, cero derechos.
- Tema de 32 compases (80 s) en Do mayor, 96 BPM, en `theme.js` y `music.js`. Hay una base (melodía, bajo, tok, shaker) y tres capas de energía E1, E2, E3 (`bus.layer[1..3]`).
- Esas tres capas de energía suben por tramo y por racha de piezas (`recalc()` en `audio.js`), NO por nivel del Cuaderno. Hoy el nivel del Cuaderno no llega al audio.
- Voces reutilizables en `voices.js`: carton, cuadrada, pulso, bajo, tok, shaker, tic, campana. Los efectos están en `sfx.js`.
- Cadena: música -> musicMix -> filtro -> duck -> musicBus (0.78) -> master 0.125 -> compresor (umbral -8 dB). Efectos -> sfxBus 5.7 -> master. Ya existe el patrón de módulo diferido (`papel.js` se carga con `import()` tras el primer gesto).
- El timbre hoy suena con `audio.sfx('pickup', { index: 11 })` (RunScene.js l.820): la campanita de pieza en su nota más alta.
- El día y la noche viven en `ambient.nt` (0 a 1), solo visual. El audio no lo lee.

Consecuencia de diseño: las capas del Cuaderno son un eje NUEVO, separado de la energía. Se llaman `cuad[2..6]`, con su propia ganancia, y no tocan E1 a E3 ni la física.

## 2. Tope y qué entra

Tope realista para una pieza de 1.5 h o menos: **6 niveles de música = base + 5 capas** (niveles 2 a 6). Más allá de 6 se vuelve ruido y el oído ya no distingue.

Corte 1 (esta pieza): las 5 capas, el cambio día/noche por filtro y notas, y el sonido propio del timbre. Todo reutiliza voces que ya existen, así que cada capa es solo un patrón corto.

Después (no entra): capas para niveles 7 a 9 (la 9 puede cerrar con el timbre), tempo distinto de noche, una segunda sección B para capas, capas distintas por papel.

Si el reloj aprieta, se corta de arriba: primero la capa 6, luego la 5. En ese caso la prueba (a) se hace con niveles 1, 3 y 5.

## 3. Las capas

Volumen relativo: 1.0 = la melodía de la base. El bus del Cuaderno suma por rampa de 0.4 s (1.5 s con movimiento reducido), solo al inicio de compás, igual que hoy.

| Nivel | Capa | Instrumento / síntesis | Figura | Vol. | Noche | Bytes (min+gzip, estimado) |
|---|---|---|---|---|---|---|
| 1 | Base (ya existe) | carton, cuadrada, bajo, tok, shaker | tema actual | 1.0 | sin cambio | 0 |
| 2 | Percusión de papel | ruido filtrado (voz `shaker`, otro filtro a 4.5 kHz) + `tok` sordo | frote en los pasos 4 y 12, semicorcheas suaves en los impares, tok sordo en el 14. Evita los pasos 2, 6, 10 y 14 del shaker de la base | 0.35 | solo pasos 4 y 12, el resto se calla | 180 |
| 3 | Contracanto | triangular suave (voz `carton` a una octava abajo de la melodía) | dos notas largas por compás, en los pasos 4 y 10, tomadas del acorde del compás (tercera y quinta). Cae en los huecos de la melodía, que está en 0, 3, 6, 8 y 11 | 0.55 | solo quinta y fundamental (sin tercera ni sexta): suena más abierto | 260 |
| 4 | Colchón | dos triangulares con ataque lento (120 ms) y cola larga | una nota por compás, fundamental y quinta del acorde, subiendo con la rampa | 0.4 | filtro más cerrado, sin cambio de notas | 200 |
| 5 | Bajo caminante y soplo | `bajo` en negras (fundamental, quinta, fundamental, tercera) + ruido con filtro que barre despacio durante 2 compases | es la capa del VIENTO (nivel 5): el soplo se oye aunque el viento esté lejos | bajo 0.3, soplo 0.12 | soplo con filtro 30% más bajo | 320 |
| 6 | Brillo | `pulso` estrecho y `campana` en corcheas | tres campanitas por compás en el acorde, en los pasos 2, 9 y 13 (distintas de las de E3, que van en 2, 5, 9 y 13 y suben solo con la racha) | 0.3 | una octava abajo y la mitad de notas | 260 |

Total estimado de las 5 capas más el timbre: **1.6 KB gzip** en un módulo `capas.js` que carga diferido. No es un pedazo de la tabla de arriba: es la suma de las filas más el sonido del timbre (sección 5) y ~190 B de pegamento interno.

### Día y noche

- Escala/tempo: el tempo NO cambia (el reloj de pasos y el cierre del loop dependen de él). Cambia la escala: de noche las capas dejan fuera la tercera y la sexta (sonido de pentatónica abierta, más tranquilo) y se cierra el filtro de todo el bus del Cuaderno de 8 kHz a 3.2 kHz.
- Se lee `ambient.nt` en cada inicio de compás: `nt > 0.5` es noche. Las notas cambian en el límite de compás; el filtro se mueve con rampa de 4 s para no dar salto.
- Con movimiento reducido: el audio sigue, pero la rampa es de 8 s y el filtro no baja de 4.5 kHz.
- El timbre por papel (`papel.js`) se queda igual y se sigue sumando a la melodía.

### Interacción con la energía y la mezcla

- La energía (E1 a E3, por racha) sigue igual. Para que no se amontonen: con Cuaderno nivel 4 o más, E3 baja a 0.7 y el bus de música baja un 0.9 por cada dos capas del Cuaderno encendidas (0.9 en nivel 4 y 5, 0.81 en nivel 6).
- La música sigue por debajo de los efectos (hoy musicBus 0.78 contra sfxBus 5.7).
- Tarjeta de lección: `cardUp()` ya baja la música a 30% con filtro de 1200 Hz. Las capas viven dentro de musicMix, así que bajan con ella, sin código nuevo.
- Mute del jugador: no se crea ninguna capa si está apagado, y los nodos de `cuad` se detienen con `stop()` igual que la música.
- Nada suena antes del primer gesto: el módulo `capas.js` solo se pide después del gesto (mismo patrón de `loadPapel`).

## 4. Qué se cambia en el JS inicial (tope 1 KB)

Estimado: **~0.4 KB gzip** en `audio.js`:
- en `createBuses`: crear 5 ganancias `cuad[2..6]` en 0 hacia `musicMix` (unas 5 líneas);
- `setNivel(n)`: guarda el nivel y, si n >= 2, pide `import('./capas.js')` una sola vez;
- `music.js` llama a `capas.step(s, bar, chord, t)` si existe;
- `RunScene.js` llama `audio.setNivel(n)` donde ya cambia el nivel del Cuaderno.
Si al medir pasa de 1 KB, se mueve el cuerpo de `setNivel` a `capas.js` y en el inicial queda solo el `import()`.

## 5. Sonido propio del timbre

Hoy: campanita de pieza (cartón, nota 11). Debe sonar a "timbre de bici de juguete", no a pieza.
- Síntesis: dos senoidales inarmónicas a 1568 Hz y 4330 Hz (razón 2.76, la de las campanas metálicas), con caída exponencial. El segundo parcial al 30%.
- Figura: dos golpes, a 0 y 55 ms ("ring-ring"). Cola total 140 ms. Un clic de ruido de 8 ms al inicio, con filtro a 3 kHz.
- Volumen: pico 0.25 (lo de la campanita de hoy es 0.22 a 0.3), va por el canal de recompensa, así cede y baja el movimiento igual que una pieza.
- Movimiento reducido: un solo golpe, con el filtro de 3.5 kHz que ya pone `prep()`.
- Si `capas.js` todavía no cargó (jugador muy rápido): se queda con la campanita de hoy como respaldo, sin error.
- Bytes: ~230 B gzip, dentro del módulo diferido. El timbre es un efecto, no una capa: suena aunque el nivel de música sea el 6.

El nivel 9 (timbre) no tiene capa de música propia en este corte. Su "capa" es este efecto. La capa 7 a 9 queda para después.

El nivel del trampolín: no lo verifiqué en el código. Su efecto `boing` ya existe y se puede dejar tal cual; no necesita capa.

## 6. Sabremos que estuvo bien si

(a) Un invitado a ciegas distingue nivel 1, 3 y 6 en **3 de 3** clips de 20 s. Procedimiento: se renderiza offline con `audioMeasure.js` (ya existe `OfflineAudioContext`) cada nivel con energía fija en 0, compases 1 a 8 (misma melodía), en orden aleatorio. El invitado dice cuál es el 1, el 3 y el 6. Se repite de noche y de día. Falla si se equivoca en uno solo.

(b) Peso: JS inicial **+0.4 KB gzip como esperado, tope 1.0 KB**. `capas.js` diferido **<= 2.0 KB gzip** (esperado 1.6 KB). Se mide con el mismo método que usaron para los 1489 B de timbre.

(c) Mezcla: pico de muestra **<= -6 dBFS** en el render offline de nivel 6 con energía 3, racha x3, un salto, una pieza y el timbre al mismo tiempo, de día y de noche. Medida con `meter.js`/`audioMeasure.js` sobre la salida del compresor del master. Los efectos siguen por encima de la música.

(d) Clásico idéntico: **78/78 y 2142** sin cambio, porque no se toca la física. Además, la prueba de audio de Clásico (sin nivel del Cuaderno) debe dar el mismo pico que antes: `capas.js` ni se descarga ahí.

Extras baratos: sin `console.error`; con el sonido apagado, 0 nodos de `cuad` activos; con movimiento reducido, sin salto de ganancia mayor a 3 dB en menos de 1 s.

## 7. Mayor riesgo

Que la suma de capas más la racha y los efectos sature el master y el compresor lo aplaste (se oiría "lleno" y menos limpio, y se pasaría de -6 dBFS). Se controla con la rebaja de bus de la sección 3 y se verifica con (c) antes de integrar. Segundo riesgo: el nivel 6 debe sonar distinto al 3 y no solo "más fuerte"; por eso cada capa trae un timbre y una figura distintos y la prueba ciega es obligatoria.

## 8. Lista de cambios para el constructor

1. `src/audio/capas.js` (nuevo, diferido): patrones de las capas 2 a 6, función `timbre`, ambos sin globales y con `(ctx, destino, t, ...)` para renderizar offline.
2. `src/audio/audio.js`: crear `bus.cuad[2..6]`, `setNivel(n)`, carga diferida tras el gesto, rebaja de bus por capas, lectura de `ambient.nt` por compás, SFX `timbre` con respaldo a la campanita.
3. `src/audio/music.js`: gancho `S.capas.step(...)` en `scheduleStep`; opción `cuad` para el render offline fijo.
4. `src/scenes/RunScene.js`: `audio.setNivel(...)` al cambiar el nivel del Cuaderno; l.820 pasa a `audio.sfx('timbre')`.
5. `src/debug/audioMeasure.js`: render de nivel 1, 3 y 6 (20 s, día y noche) y de la prueba de pico.
6. `AUDIO.md`: documentar las capas del Cuaderno y el nuevo efecto.
