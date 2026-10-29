# FEEL.md: Moki: Un salto más

Plan de game feel para el sprint (corte 10:30 CDMX, P1 cabe en ~50 min). Canon: skill game-feel, ARTE.md §10-§12, ANIMACION.md §5, DISENO.md, UX.md §6, AUDIO.md (sonido fuera del juice: no se toca). Líneas de `src/scenes/RunScene.js` salvo que diga otro archivo.

## 1. Estado actual

- Ya existe: anticipación de 90 ms y squash del cuerpo como traslación (`mokiRig.js:183`, `:365`, `squashPx 3.3` = 3%, casco rígido), pose de pico con |vy|<=120 (`mokiRig.js:192`), sombra que crece al aterrizar (`:950`).
- Partículas con reserva de 90 y reglas por nivel (`art/particles.js:73`): land (`:681`), collect (`:916`), confetti en checkpoint (`:847`), crash (`:1224`). Con `this.reduced` no se emite nada.
- Sonido completo: jump/jumpHigh/land/pickup en escala pentatónica por racha (`audio/sfx.js:94`, `index: combo-1` en `:906`), arc (`:911`), stingers checkpoint/fail/record/final. Hit-stop de 60 ms al chocar (`:1241`).
- Entorno: pajaritos en salto mantenido y arco, globo en checkpoint (`art/ambient.js:362`), sway de 1-2° al entrar piezas (`:492`).
- Falta lo que más pesa: **`CONFIG.juice` es una constante (`config.js:56`)**. No hay menú "Efectos", no se lee ni guarda `moki.juice`, no se llama `audio.setJuice`. Hoy Mucho y Hardcore no existen para el jugador.
- Falta: `burst('kick')` nunca se llama; sin onda al recoger; sin etiqueta x2/x3 (DISENO §64 la pide en Mucho); sin respuesta visual al arco completo ni al récord (solo audio); sin screenshake; sin háptica; botones sin estado de presión; tarjeta final entra seca (la de fallo sí tiene fundido, `ui/ui.js:114`).
- Ojo: el HUD (`hudL/hudR/hudC`, `:162`) vive en la cámara principal: `cameras.main.shake()` lo movería. El shake tiene que compensar el HUD.

## 2. Momentos

Niveles: N = Nada, P = Poquito (default), M = Mucho, H = Hardcore (abre con `moki.done`, ya se guarda en `:1321`). R = movimiento reducido: fuerza N visual y apaga háptica; el sonido sigue igual (AUDIO). Háptica solo si `this.coarse`, `navigator.vibrate` existe, ya hubo gesto y juice >= 1.

| Momento | Disparador | Respuesta por capa | Dur. | N / P / M / H / R |
|---|---|---|---|---|
| Despegue | `stepJump` `:657` | Timing: salto en el mismo cuadro (ya). Anticipación 90 ms (ya). Partículas: `kick` 1 chip kraft. Sonido `jump` (ya). | 90 ms | N: solo pose. P: igual. M: 1 chip. H: 2 chips. R: sin chips ni pose |
| Pico del salto | `vy` cruza 0 (`!this.apexDone && this.vy >= 0` en `stepJump`) | Pose de pico ya existe. Entorno: nada nuevo (no estorba la lectura). | - | Sin cambio en ningún nivel (ya se siente) |
| Aterrizaje | `:680` `impact > 260` | Squash 3% + sombra (ya). Polvo de papel por nivel (ya). Fuerte = `impact > 600`: H shake 1.5 px 90 ms; M/H pasto de papel cercano se dobla (`sway`). Sonido `land` (ya). Háptica 8 ms solo fuerte, M+. | 130 ms | N: squash. P: 3-5 chips. M: 6-8 + pasto. H: 10-12 + shake + pasto. R: nada |
| Pieza | `collect` `:894` | Pulso existente (200 ms). Contador del HUD hace pop 1.0→1.12→1.0. M+: onda de papel (anillo 1.5 px r 8→22, alpha .5→0, #B99168). M+: "x2"/"x3" en la ficha. Sonido: escala por racha (ya). Aleatoriedad: ángulo de chips (ya). | 120-220 ms | N: pieza desaparece. P: 3 chips + pop. M: 6 + onda + xN. H: 10 + onda + xN. R: fundido 120 ms (ya) |
| Arco completo | `:909` | Pop del contador 1.0→1.22→1.0. Partículas `arc`: abanico de papel #FF6B35/#FFA500/#F4E8D5 desde la última pieza. Sonido `arc` (ya). Entorno: pajaritos (ya). Háptica 12 ms. H: shake 1 px 80 ms. | 300 ms | N: nada. P: pop + 4 chips. M: 10 chips. H: 16 + shake. R: nada, solo audio |
| Checkpoint | `:836` | Bandera 280 ms + banner + hop (ya). Confeti M 16 / H 40 (ya). Banner entra con escala 0.9→1 Back.out. Háptica `[15,40,15]`. H: shake 2 px 120 ms. | 280 ms + 1.6 s banner | N: bandera y banner en fundido. P: + escala banner. M: + confeti. H: + shake. R: fundido 120-180 ms |
| Nueva mejor marca | `crash` `:1227` `isNew && prevBest>0`; `finish` `:1325` | Etiqueta "Nueva mejor marca" (`end.new`, `.ui-tag`) en tarjeta de fallo y final, con pop CSS 0.85→1.08→1 y borde que destella #FF6B35 160 ms (sin glow), sincronizado al stinger (1700/2600 ms ya). M+: confeti 16/40 sobre Moki al sonar. Háptica `[15,60,15,60,30]`. | 260 ms pop | N/R: etiqueta fija, sin pop. P: pop. M: + confeti. H: + confeti 40 |
| Fallo amable | `crash` `:1187` | Hit-stop 60 ms (ya; H 80 ms). Chips crash por nivel (ya). Retroceso 220 ms (ya). Tarjeta sube 250 ms (ya). Háptica 25 ms suave. H: shake 2 px 120 ms. Nada rojo, nada que regañe. | 60 + 220 ms | N: tarjeta en fundido. P: 3 chips. M: 6. H: 10 + shake + freeze 80. R: sin retroceso (ya) |
| Botón Jugar (tap del demo) | `startGame` `:350` | `.ui-demo` sale con fundido+bajada 140 ms en vez de desaparecer. Háptica 10 ms. | 140 ms | N/R: fundido 120 ms. P+: fundido + bajada |
| Botones y menús | `ui.css .ui-btn/.ui-pill/.ui-pausebtn/.ui-soundbtn` | `:active` baja 2 px y la sombra pasa de 3-6 px a 1 px (papel que se aprieta), 80 ms. Hover (solo `hover:hover`) sube 1 px. Pausa entra con fundido 140 ms. Sonido `ui` (ya). | 80 ms | N y R: sin transform, solo color/sombra. P+: completo |
| Final | `finish` `:1313` | Mundo frena 1 s + hop (ya). Tarjeta final con la misma entrada que la de fallo (opacity + translateY 18 px, 250 ms). M+: confeti 16/40 en la meta. Háptica `[20,40,40]`. | 1.2 s + 250 ms | N/R: fundido. P: entrada. M/H: + confeti |
| Entorno | aterrizaje fuerte, checkpoint | Pasto de papel (`this.fg` con textura `gp-grass*`, `:749`) a menos de 160 px de Moki: `sway()` 1-2° 520 ms. Nubes (`this.clouds`, `:99`) tiemblan 1 px en Y 120 ms en checkpoint y arco, solo M+. | 120-520 ms | N/P/R: nada. M/H: sí |

## 3. Lista de cambios

### P1 (entra en el sprint, ~48 min)

1. **Juice vivo y menú "Efectos" (12 min).** Desbloquea todo lo demás.
   - `RunScene.create()` tras `:50`: `C.juice = clamp(num('moki.juice', 1), 0, 3)`; si `load('moki.done') !== '1'` y juice es 3, baja a 2. `audio.setJuice(C.juice)`.
   - `ui.showPause()` (`ui/ui.js:235`): botón secundario `Efectos: Poquito` entre Sonido e Inicio. Al pulsar cicla 0→1→2→(3 si `ui.hardOpen`)→0, llama `ui.onJuice(l)` y reescribe su texto. Con `prefers-reduced-motion` muestra "Nada" fijo y `disabled`.
   - Escena: `this.ui.hardOpen = load('moki.done') === '1'`; `this.ui.onJuice = (l) => { C.juice = l; save('moki.juice', l); audio.setJuice(l); }`.
   - Candado: si Hardcore está cerrado, línea `.meta` bajo el botón: "Hardcore: llega a la meta una vez" / "Hardcore: reach the finish once".
   - `i18n.js`: `pause.fx` ("Efectos: {v}" / "Effects: {v}"), `fx.0..3` (Nada, Poquito, Mucho, Hardcore / None, A little, A lot, Hardcore), `pause.fx.lock`.
   - Verifica: pausa, cicla a Mucho, recoge piezas (6 chips), recarga y sigue en Mucho. Sin `moki.done` no aparece Hardcore.

2. **Helpers `fx` en RunScene (8 min).**
   - `buzz(pattern)`: `if (this.reduced || C.juice < 1 || !this.coarse || !navigator.vibrate || !audio.unlocked) return; navigator.vibrate(pattern)` dentro de try/catch.
   - `shake(px, ms)`: solo `C.juice === 3 && !this.reduced`. Guarda `this.shakeLeft = ms; this.shakeAmp = px`. En `update()` antes de `if (this.screen === 'pause') return`: si `shakeLeft > 0`, `k = shakeLeft/ms0`, `ox = (Math.random()*2-1)*amp*k`, `oy` igual; `cam.centerOn(this.vw/2 + ox, this.top + this.vh/2 + oy)` y **compensa el HUD**: `hudL/hudR/hudC/tutC` en su posición de `layout()` + `(ox, oy)`. Al llegar a 0 llama `this.layout()` una vez. Guarda las posiciones base en `layout()` (`this.hudBase`).
   - `pop(container, s, ms)`: tween `scale` base→base*s→base, `Back.easeOut`, `yoyo`, salta si juice 0 o reducido. Base = `hs / z` de `layout()`.
   - Verifica: en H con `?debug` el HUD queda quieto en una captura a mitad de shake; con reducido no vibra ni tiembla.

3. **Pieza, racha visible y onda (8 min).** `collect()` `:894`.
   - `this.pop(this.hudR, 1.12, 120)` en cada pieza (P+).
   - Ficha: `this.pieceLabel.set(mult > 1 && C.juice >= 2 ? `${this.pieces}  x${mult}` : String(this.pieces))`. Al cortarse la racha (`:629`) se vuelve a poner sin xN.
   - `particles.js`: tipo `ring` (M+): un `Graphics` reutilizado (2 en reserva), `lineStyle(1.5, 0xB99168)`, r 8→22 y alpha .5→0 en 220 ms, `Cubic.out`.
   - Verifica: arco de 7 a 320 px/s en Mucho: tonos suben, aparece x2 en la 3a y x3 en la 6a, desaparece 0.9 s después.

4. **Arco completo (5 min).** `:909`: `this.particles.burst('arc', k.x, k.y)`; `this.pop(this.hudR, 1.22, 160)`; `this.buzz(12)`; `this.shake(1, 80)`.
   - `particles.js` tipo `arc`: n = P 4 / M 10 / H 16, colores `['orange','amber','paper']`, vx `rand(-80,80)`, vy `-rand(140,240)`, g 420, vida 600, osc 8, fadeFrom .6. Detrás del HUD (depth 13 ya).
   - Verifica: completar el arco regalo se nota distinto de una pieza suelta; no tapa la ficha.

5. **Récord y final (7 min).**
   - `ui.showFail()` acepta `isNew`: agrega `.ui-tag` con `t('end.new')` en la cabeza de la tarjeta. `crash()` pasa `isNew && prevBest > 0` a `showFailCard()`.
   - `ui.css`: `@keyframes ui-pop { 0% {transform: scale(.85)} 60% {transform: scale(1.08)} 100% {transform: scale(1)} }` 260 ms; `@keyframes ui-edge { 50% { border-color: #ff6b35 } }` 160 ms en la tarjeta. Clase `.pop` se pone desde JS (`ui.popRecord()`) en el mismo `setTimeout` del stinger (`:1234`, `:1355`). Sin `box-shadow` de color: sin glow.
   - En ese mismo momento: `this.particles.burst('confetti', this.px, C.world.groundY - 120)` (M+) y `this.buzz([15,60,15,60,30])`.
   - `showFinal()`: misma entrada que `showFail` (opacity 0, translateY 18 px, 250 ms ease-out). `finish()`: `burst('confetti', this.px + 40, g - 150)` y `buzz([20,40,40])`.
   - Verifica: con `moki.best` = 1 en localStorage, choca: a 1.7 s la etiqueta salta con el stinger.

6. **Botones de papel (5 min).** `ui.css`.
   - `.ui-btn, .ui-pill, .ui-pausebtn, .ui-soundbtn { transition: transform 80ms ease-out, box-shadow 80ms ease-out; }`
   - `:active:not([disabled]) { transform: translateY(2px); box-shadow: 0 1px 0 rgba(34,33,31,.22); }` (`.ui-pausebtn` conserva su `translateX(-50%)`).
   - `@media (hover: hover) { :hover { transform: translateY(-1px); } }`.
   - `@media (prefers-reduced-motion: reduce)`: `transform: none !important; transition: none` y `animation: none` para `.pop`.
   - `hideDemo()`: clase `.out` (opacity 0, translateY 8 px, 140 ms) y quita el nodo al terminar.
   - Verifica: en 375 px con el dedo, el botón se hunde al tocar y no cambia de tamaño (no mueve el layout).

7. **Háptica y shake en el resto (3 min).** `crash()` `buzz(25)` + `shake(2,120)`; en H `hitStopMs` 80 (`C.juice === 3 ? 80 : C.art.hitStopMs` en `:1241` y `:1245`). Checkpoint `:841` `buzz([15,40,15])` + `shake(2,120)`. `startGame()` `buzz(10)`.

### P2 (solo si sobra tiempo, en este orden)

8. Despegue: `this.particles.burst('kick', this.px, g)` en `:666` (la regla M/H ya está en `particles.js:84`). 2 min.
9. Aterrizaje fuerte (`impact > 600`): `shake(1.5, 90)`, `buzz(8)` solo M+, y `sway()` a `this.fg` con `gp-grass` a <160 px de `this.px`. 6 min.
10. Nubes que tiemblan: en checkpoint y arco, M+, tween `this.clouds.y` ±1 px `yoyo`, 60 ms x2. 3 min.
11. Banner del checkpoint con escala 0.9→1 `Back.out` 180 ms en `showBanner()` `:440`. 2 min.

### Fuera del sprint

- Escombro de papel que se queda en Hardcore (necesita tope propio y revisión de ARTE).
- Sfx nuevo de Hardcore ("thump" 70 Hz y fanfarria 0.4 s, AUDIO §237): es de audio, no de feel. Si entra, por `SFX`/`STINGERS` existentes y con pico <= el de `land`.
- Medir sonrisas: SIN DATO hasta que se juegue con alguien.

## 4. Restricciones que no se tocan

- Física: `gravity`, `jumpVelocity`, `jumpHold*`, `jumpMinPx`, `coyoteMs`, `jumpBufferMs`, velocidades de tramo. El shake mueve solo la cámara: hitboxes y `this.y` no cambian.
- Hitboxes (`hitboxShrink*`, `pickupReach`) y las lecciones de diseño (Toca / Mantén / caja pegada / viga).
- Mezcla de audio calibrada (`CONFIG.audio`, master 0.125, buses, limitador). Sonido fuera del juice: `setJuice` solo guarda el nivel; ningún cambio aquí silencia o sube nada.
- Moki nunca se espeja: nada de `flipX`, escala negativa ni `scaleX` distinto a `scaleY` en el rig. Squash solo por `squashPx` (3%), casco rígido; `pop()` nunca se aplica a Moki.
- Paleta: chips #B99168 / #F4E8D5 / #FF6B35 / #FFA500; bordes #8A7E70 / #22211F. Cero glow, cero neón, cero rojo.
- Partículas siempre por `Particles` (techo 90). Nada tapa texto ni botones; el juice nunca bloquea clics ni retrasa el reintento (`retryLockoutMs` igual).
- Movimiento reducido: todo lo nuevo pregunta por `this.reduced` (o la media query en CSS) y se apaga, incluida la háptica. Hardcore apagado.
- Shake solo en Hardcore, máximo 2 px, nunca en el HUD ni en el DOM.

## 5. Estado del sprint (29-oct)

- Entrega 1 (a87cecf, en master 81be8d5): P1 1 a 7 del plan, menos el freeze de 80 ms en Hardcore (no se tocan tiempos, orden del líder) y la onda de anillo (la sustituyen los chips ámbar en racha). Poquito no vibra (director).
- Entrega 2: doblez de papel al chocar (6° en 120 ms, asentado 180 ms), obstáculo arrugado 2% hasta el reintento y estirón del 3% a los 80 ms del despegue. Con Nada queda la animación aprobada (T3b3).

FEEL: AJUSTAR (falta que el probador lo juegue)
