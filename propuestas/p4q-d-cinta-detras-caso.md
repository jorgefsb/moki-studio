# P4q-d [feel] LA CINTA PASA DETRÁS, NO SE CORTA · caso (invitado game-feel, 14-nov; parte de master 33a4638)

## 1. Qué ve hoy el jugador y por qué importa
- **Master (P4q)**: la sonda de P4q-c cuenta cruces con cajas o monedas en el **43 %** de los cuadros a 1280. Aun así, el ciego de P4q-c prefirió master **3 de 3** antes que la cinta cortada (v2/p4q-c a1a6086). Cortar en la primera caja dejaba los cuadros 2-3 sin cinta, justo cuando Moki salta la caja, y quedaban tramos que aparecían solos. La lección: **la continuidad vale más que la limpieza**.
- **Defecto en ambos lados**: los 3 ciegos vieron **dos barras naranjas verticales junto a Moki al aterrizar**, en master y en la rama.
- Por qué importa: el aterrizaje es un momento base. Una barra gruesa que se queda parada junto al talón se lee como basura, no como el final del arco.

## 2. Causa leída en el código de master
**Profundidad (lo que pide la idea ya está hecho):**
- La cinta es `arcoG`, con profundidad **9.8** (`src/scenes/RunScene.js:223`). Queda bajo las cajas, torres y vigas (10, `:1334`, `:1329`), el timbre (10, `:1255`), la lámina (9.9, `:1303`), las monedas (11, `:1420`), Moki (12, `src/art/mokiRig.js:274` y `mokiPoses.js:51`) y las partículas (13, `particles.js:14`).
- O sea, **ninguna caja ni moneda queda pintada por la cinta hoy**. El 43 % es un cruce geométrico: la sonda cuenta tramos dentro de la caja, no píxeles tapados. Lo que el ojo ve es la cinta que entra por un lado y sale por el otro, ensartada. Un `setDepth` solo no cambia nada.
- **Una incoherencia real**: los hilos de la viga están en 9.5 (`:1330`), *debajo* de la cinta. La cinta pasa detrás de la viga, pero delante de los hilos que la cuelgan.
- Nada de suelo queda encima: las capas de suelo y velo llegan a 4.65 (`:206-214`). Las sombras están en 8 (`:1225`) y la sombra de Moki en 9 (`:218`).

**Las dos barras al aterrizar (`RunScene.js:2333-2338`):**
- Al aterrizar ya no entran puntos (`:2333`). Los que quedan se van del más viejo al más nuevo (`:2334`). Lo último que sobrevive es el final de la bajada, pegado al suelo.
- Ese tramo es casi vertical. Se cae a ~786 px/s (`fallG` 2621.5, 0.30 s de bajada) contra 320-470 px/s de carrera, así que la pendiente queda entre **59° y 68°**.
- El grosor depende del **índice** (`i / (qp.length - 1)`, `:2338`), no de la edad. Con 2-3 puntos vivos, el más nuevo sigue con el grosor completo W: 7-9 px, ×1.4 en salto alto, más 4 px de canto crema. Hasta ~17 px.
- La cinta está anclada al mundo (`qo`, `:2331`). Se queda donde aterrizó mientras Moki sigue corriendo, con alfa 1 hasta el 60 % de `qMs`: **144 a 228 ms** (`config.js:131`, `ms: [240, 380]`).
- **Por qué son "dos"** (hipótesis, la confirma la sonda): con 3 puntos vivos quedan dos tramos de grosor muy distinto (≈W/2 y W). `lineBetween` los dibuja como rectángulos sueltos, sin unión, y se leen como dos barras paralelas.
- El enrollado de P4q-c se comía la cola hacia la bota. Así conservaba justo este tramo, y por eso las barras salieron también en la rama. **No se reutiliza tal cual.**

## 3. Propuesta mínima (solo el bloque P4q de `RunScene.js` y `feelP4q`; tope +150 B gz)
1. **Grosor por edad, no por índice** (~0 B). En `:2338`, `i / (qp.length - 1)` se cambia por `1 - (this.t - b[2]) / qMs`. En el aire se ve igual que master, porque los puntos van parejos en el tiempo. Después de aterrizar, lo que queda adelgaza al envejecer en vez de quedarse con grosor W.
2. **Al aterrizar, la cinta se enrolla en grosor, toda junta** (~35-40 B). Con `grounded`, factor `f = max(0, 1 - (t - landAt) / Q.corta)`, con `corta: 120` en config. Multiplica el ancho del relleno y del canto. En f = 0 se hace `qp.length = 0`. No se toca el alfa: el canto crema nunca queda translúcido, así que no hay gris (la lección de P4q-b). No hay corte ni trozo suelto, porque la cinta entera se adelgaza a la vez, de la bota a la cola.
3. **Profundidad coherente** (0 B). `arcoG` pasa de 9.8 a **9.4**. Queda sobre las sombras (8 y 9) y bajo los hilos de la viga (9.5), el viento (9.6) y todo lo demás.
4. **Solo si la puerta lo pide** (~90-100 B, con la caja desde datos de a1a6086 sin el corte): en los tramos cuyo punto medio cae dentro de una caja o moneda + 9 px, se dibuja solo el relleno naranja a 2 px. Así la cinta "se mete" detrás, adelgazada y sin cambiar el alfa, y el trazo sigue entero. Entra **solo** si la sonda de píxeles o el ciego dicen "tapada" o "ensartada" después de los pasos 1-3.

Estimado de 1-3: **~40 B gz**. Con el 4: ~135 B. Se mide con gzip -9. Si pasa de 150, se para y se avisa al líder antes de recortar.

## 4. Riesgos
- **Detrás del suelo**: no puede pasar, el suelo está en ≤ 4.65. **Detrás de Moki**: ya lo está (12). La punta nueva queda bajo la bota, igual que hoy.
- **Cinta de combo** (`src/art/cinta.js:26`, también en 9.8): con 9.4, la cinta de combo queda siempre encima del arco. Puede cambiar el "doble" de P4r-b. El ciego lo mira; si estorba, se usa 9.79.
- **"De golpe"**: 120 ms de adelgazar puede leerse como corte. Única vuelta de valores: `corta` entre 120 y 160.
- **Aterrizar sobre una caja** (`sobre`): hay que confirmar que también pone `landAt`. Si no, la cinta se queda hasta `qMs`, como hoy (no empeora).
- No se tocan física, hitbox, `obsBox`, puntaje, racha, `arcsByTramo`, el arco alto (P36m) ni las píldoras (`sonda-p36ld`, `sonda-p36lb-pago` iguales a master).

## 5. Puerta (contra el BUILD: `vite build` + `vite preview`, con flock; nada hoy, la máquina está en ROJO)
- **Ciego** con 3 invitados limpios: tiras A/B barajadas contra master, a 1280 **y** 390, 5 cuadros del aire cada 90 ms y 2 a +40 y +80 ms de aterrizar. Preguntas: ¿la cinta se ve continua desde la bota durante todo el salto?, ¿alguna caja o moneda queda tapada o ensartada?, ¿ves algo raro junto a Moki al aterrizar?
- Pasa con **2 de 3 o mejor** a favor de la rama. Además: **0 de 3** dicen "barras", "cortada", "de golpe", "gris" o "trozo suelto".
- **Sonda** (se extiende `herramientas/sonda-p4qc.mjs`):
  - **Píxeles tapados**: se compara la caja visual de cada caja o moneda con y sin `arcoG`. Debe dar 0, y master como referencia (si master también da 0, queda probado que el problema nunca fue de capas).
  - **Tramos vivos a +40 y +80 ms** de aterrizar, con su ancho y su ángulo: rama ≤ 2 px de ancho a +80 ms y 0 tramos de más de 6 px y más de 50°.
  - Rastro ≤ 160 ms.
  - Gris junto a la bota ≤ master.
- **Bots**: `bots-p15.mjs` en los 6 modos = master, con Libre y zanja incluidas. **Consola 0** en todas las corridas.
- Nada y movimiento reducido: 0 px de cinta (el camino de `:2332` no cambia).
- **Jugador nuevo** sin localStorage: se ve en el primer aterrizaje. Cómo llegar: JUGAR y saltar la primera caja.

## 6. Plan para el constructor (30 min, rama v2/p4q-d desde master, cuando la máquina salga de ROJO)
1. Línea base de master con la sonda extendida (píxeles tapados y tramos tras aterrizar), para confirmar la causa de las barras antes de tocar nada.
2. Pasos 1-3 de §3, medir peso, sonda a 1280 y 390, bots, p36ld y p36lb.
3. Tiras al probador para el ciego. El paso 4 solo si el ciego o la sonda lo piden.
4. Regla de paro: una vuelta de `corta`. Si el ciego falla dos veces, se cierra y P4q queda como está en master.
