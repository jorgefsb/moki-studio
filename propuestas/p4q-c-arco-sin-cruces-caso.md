# P4q-c [feel] ARCO SIN CRUCES NI CORTE · caso (invitado game-feel, 13-nov; parte de v2/p4q-b 4ebbc68)

## 1. Qué ve hoy el jugador y por qué importa
- **Master (P4q, 37ed4fc)**: a 1280 la cinta cruza una caja o moneda en el **43 %** de los cuadros y el rastro sigue vivo **367 ms** después de aterrizar. Los 3 invitados la ven "cargada". El arco deja de dibujar el salto y se vuelve ruido sobre lo que se juega.
- **Rama 4ebbc68**: quita los cruces (0 %) y el rastro (133 ms), pero el ciego de P4q-b trajo dos defectos que master no tiene. 2 de 3 la ven "cortada de golpe" con un **trozo naranja suelto** a 1280. 2 de 3 ven **fragmentos grises junto a Moki** a 390.
- Por qué importa: el aterrizaje es un momento base. Si la cinta muere a medio camino o deja basura junto a la bota, el salto se siente roto justo cuando debía cerrar limpio.

## 2. Causa leída en el código de 4ebbc68 (`.worktrees/p4q-b/src/scenes/RunScene.js:2261-2273`)
- **Trozo suelto**: el recorte se brinca *cada* tramo que tenga una punta dentro de una caja (`qr.some(...) || lineStyle...`). Si una caja queda a media cinta, sobrevive el pedazo de atrás, separado de la bota. Eso es el fragmento huérfano.
- **Corte seco**: al aterrizar, `qa` baja lineal en 120 ms y en 0 hace `qp.length = 0`. Toda la cinta se apaga a la vez, incluida la parte pegada a la bota.
- **Gris a 390**: `qa` multiplica el alfa del canto crema `#F4E8D5` *y* el del relleno. A media transparencia, la crema sobre colinas o suelo oscuros (luminancia 0.11-0.24, evidencia/p4q/RESULTADO.md) se mezcla y sale un beige sucio, que se lee gris. En master no pasa porque solo se desvanece la cola vieja, lejos de Moki. Con `qa`, también se desvanece el tramo junto a la bota, que está encima del suelo. (Es hipótesis: la sonda del paso 1 la confirma o la tira.)
- **Tronido**: la caja de recorte sale de `o.sprite.getBounds()`. La zanja de Libre es un Graphics sin ese método. 4ebbc68 lo esquiva con un filtro, pero sigue dependiendo del tipo de sprite.

## 3. Hipótesis y cambio mínimo (solo el bloque P4q de `RunScene.js` y `feelP4q` de config)
1. **Caja desde los datos, no desde el sprite.** Obstáculos: `C.obstacleSizes[type]` centrado en `o.x`, con la misma geometría que `obsBox` (`RunScene.js:2116`) pero **sin** `hitboxShrink`, porque lo que importa es lo que se ve, no la caja de choque. Para `viga` se usa `hangBottom`. Se saltan `zanja`, `tramp` y `timbre`. Monedas: `k.x, k.y` con `C.pickupSize` (30), sin las que ya se tomaron (`taken`/`off`). Margen de 5 px. Cero `getBounds`, cero `setTo/contains`: son 4 comparaciones a mano.
2. **Una sola cinta continua.** Se recorre desde la bota hacia la cola y se para en el **primer** tramo que toca una caja. Nada detrás de una caja se dibuja. Así no puede haber trozo suelto. Los últimos 2-3 tramos antes del corte se afinan a 2 px, para que el corte se vea como punta y no como guillotina.
3. **Al aterrizar, se enrolla en vez de apagarse.** La cola se come hacia la bota en `corta` ms (propuesta: 140) con alfa 1, sin bajar la transparencia de toda la cinta. Lo que queda se acorta hasta desaparecer.
4. **Final sin gris.** El canto crema solo se pinta con alfa 1 (o con alfa², para que se vaya primero). El último tramo que muere es **naranja `#FF6B35` puro**, nunca crema translúcida. Paleta: solo naranja y papel (ARTE.md:26-28). Nada de ámbar ni gris.

## 4. Números de arranque y lo que falta
- **4ebbc68**: bots 6/6 = master en el build, cruces 0 %, rastro 133 ms, **+118 B gz**, consola 0 (según el constructor; la QA se canceló antes de correr).
- **Falta**: corregir el corte seco y el trozo suelto a 1280, y los grises a 390. Ningún probador ha dado PASS sobre 4ebbc68.

## 5. Puerta (sonda contra el BUILD: `vite build` + `vite preview`, nunca vite dev)
- **Ciego** con 3 invitados limpios (A/B), tiras de 6 cuadros cada 90 ms, rama contra master barajadas, a 1280 **y** 390, con un cuadro justo después de aterrizar. Pasa si 2 de 3 dicen "más limpia". **0 de 3** dicen "gris", "de golpe", "trozo suelto" o "se perdió la cinta".
- **Sonda** (se extiende `sonda-p4q.mjs`): cruces 0 % (tramo dibujado dentro de la caja visual + 5 px). Rastro tras aterrizar ≤ 160 ms. **Tramos dibujados que no tocan la bota: 0** (trozo suelto). **Píxeles grises** en la caja de 120 px junto a la bota en +0/40/80/120 ms tras aterrizar, con el criterio de `sonda-p39.mjs` (saturación baja y fuera de la paleta): **0**, con master como referencia.
- **Bots**: `bots-p15.mjs` 6 = master **contra el build**, en todos los modos, Libre con zanja incluida. Consola 0 en las 6 corridas. Nada y movimiento reducido: 0 px de cinta.
- **Peso**: tope **+130 B gz sobre master** (≤ +12 B sobre 4ebbc68). Razón: quitar `getBounds().setTo().contains` paga casi todo lo que cuestan la caja desde datos y el enrollado. Es pulido de una pieza que ya costó ~+474 B y no debe crecer otra vez. El +40 anterior fue a ojo y no aplica. Si pasa de +130, se para y se avisa al líder antes de recortar.
- **Jugador nuevo** sin localStorage: se ve en el primer salto que pasa sobre una caja. Cómo llegar: JUGAR y saltar.

## 6. Riesgos y qué NO tocar
- No se tocan física, hitbox, `obsBox`, `pickupReach`, azar ni nada que cobre el arco: puntaje, racha, `arcsByTramo`, `hq`/arco alto (P36m) ni la economía. La cinta solo es dibujo en `arcoG` (profundidad 9.8).
- Las píldoras de pago viven junto al arco: `sonda-p36ld.mjs` y `sonda-p36lb-pago.mjs` deben seguir en verde e iguales a master.
- Riesgo de que "se perdió la cinta": cortar en la primera caja puede dejarla corta al saltar una torre. Si el ciego lo dice, el corte se mueve a la caja *más cercana a la bota delante de la cola* y el margen baja a 3 px. Es una sola vuelta.
- Riesgo de coordenadas: los puntos del arco usan `this.y - pie` en mundo. El constructor confirma con `src/debug/overlaps.js` que la caja calculada coincide con lo que se ve antes de medir.
- Fuera: grosor, colores, largo en el aire, Poquito/Hardcore, el "doble" de P4r-b (arco junto con cinta de combo). Eso va en otra pieza si sigue.

## 7. Plan para el constructor (30 min, rama v2/p4q-c desde master, cherry-pick de 4ebbc68)
1. `flock /tmp/moki-pesado.lock` + build + preview de master y de 4ebbc68: sonda de cruces, rastro, trozo suelto y grises, para tener la línea base y confirmar el gris (si master y 4ebbc68 dan 0 gris en la sonda, se avisa: el instrumento no ve lo que vio el ciego).
2. Caja desde datos, cinta continua desde la bota y enrollado con final naranja (§3). Medir peso con gzip -9.
3. Con flock, sonda a 390 y 1280 + `bots-p15.mjs` en los 6 modos + p36ld/p36lb, todo contra el build. La QA se guarda en `.qa-p4q-c/` dentro del repo, no en /tmp.
4. Entregar al probador para el ciego. Regla de paro: una vuelta de valores (`corta`, margen). Si truena o el ciego falla dos veces, se cierra y P4q queda como está.
