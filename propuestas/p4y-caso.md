# P4y [feel] LA SOMBRA AVISA LA CAÍDA · caso (invitado game-feel, 14-nov, master 9ec44ad)

## Para quién y qué cree
Alguien abre el juego en el celular (390x844), le pica JUGAR y salta 6 u 8 veces en los primeros 15 s. Cree que "caer" es lo que pasa cuando Moki toca el piso. No sabe que el ojo lee la caída **antes**, por la sombra. Hoy la sombra casi no cambia: Moki sube y baja, pero el suelo no "se acerca".

## 1. Qué ya existe (leído en código; no se propone otra vez)
- **Coyote y búfer**: `coyoteMs: 90`, `jumpBufferMs: 110` (`src/config.js:17-18`), usados en `stepJump` (`RunScene.js:1660-1661`). Están en rango sano. El ciego no los ve: se descartan.
- **Choque**: freeze `art.hitStopMs: 60` (`RunScene.js:2653`), retroceso de 56 px y arco. La sacudida (`shake`, `RunScene.js:1029`) solo sale en Hardcore (regla de la skill). Además, en una partida normal no siempre hay choque en 15 s. Se descarta.
- **Sonido del despegue**: tiene tres capas (triangular de 330 a 520 Hz, bip de pulso y susurro de papel, `sfx.js:33-62`). **Aterrizaje**: ruido con lowpass de 1800 a 600 Hz, tok triangular y seno grave según la caída (`sfx.js:77-94`). **Caída de alto** (`caida`) y **salto alto** (`jumpHigh`) también existen. Pulir esto es fino y arriesga "imperceptible", como pasó en P4e. Se descarta.
- **Sombra de contacto de Moki** (`RunScene.js:2309-2315`): hoy `f = 1/(1 + aire/150)`, ancho `96·(0.5+0.5f)`, alto `22·(0.6+0.4f)` y alfa `0.28·(0.4+0.6f)`. **Esta es la esquina.**

## 2. Qué ve hoy el jugador (números de master, en px del mundo)
Salto mantenido: pico de 117.8 px, aterriza a 786 px/s. Toque: pico de 62 px, aterriza a 570 px/s (sale de `jumpG`/`fallG`).

| Momento (salto mantenido) | aire | ancho master | alfa master |
|---|---|---|---|
| Pico | 117.8 | 74.9 (78 %) | 0.206 |
| −100 ms antes de tocar | 65.5 | 81.4 (85 %) | 0.236 |
| −33 ms | 24.5 | 89.4 (93 %) | 0.265 |
| Contacto | 0 | 96 (+30 % de hundimiento) | 0.28 |

En corto: en los últimos 100 ms la sombra crece solo **15 % de su ancho**, y en los últimos 33 ms, 7 %. Con el toque, en el pico mide 82 px (85 %). Mantener y tocar casi no se distinguen por la sombra.

## 3. El cambio exacto
Solo en `stepMoki` (`src/scenes/RunScene.js:2310-2315`), con perillas en config. Física, hitboxes, tiempos y sonido no cambian.

```js
// src/config.js, junto a feelP4d
feelP4y: { sombra: [[150, 0.5, 0.4], [90, 0.42, 0.35], [55, 0.35, 0.3], [55, 0.35, 0.3]] }, // [k, ancho mín, alfa mín] por juice; reducido = [0]
```
```js
// RunScene.stepMoki
const [k, w0, a0] = C.feelP4y.sombra[this.reduced ? 0 : C.juice];
const f = 1 / (1 + air / k);
// ancho 96·(w0 + (1-w0)·f) · (1 + sink·0.3); alto 22·(0.6+0.4f) igual; alfa (0.28+nightSh)·(a0 + (1-a0)·f)
```
- **Nada y movimiento reducido** se quedan exactamente como master (fila 0). **Poquito** es intermedio. **Mucho** (el que trae el jugador nuevo) y **Hardcore** usan k 55.
- La rama `this.sobre` (encima de la caja) y la zanja (alfa 0) no se tocan.

**Qué se ve en Mucho:**

| Momento (mantenido) | ancho rama | alfa rama | master |
|---|---|---|---|
| Pico | 53.5 (56 %) | 0.146 | 74.9 / 0.206 |
| −100 ms | 62.0 (65 %) | 0.160 | 81.4 / 0.236 |
| −33 ms | 76.8 (80 %) | 0.218 | 89.4 / 0.265 |
| Contacto | 96 | 0.28 | igual |

- Ahora, en los últimos 100 ms la sombra crece **35 % de su ancho** (master: 15 %). En los últimos 33 ms crece 20 % (master: 7 %). El suelo "se cierra" sobre Moki justo antes del tok.
- Gradualidad: con el toque, en el pico mide 63 px (66 %). Con el mantenido, 53 px. Lo chico responde chico.
- A 390 (zoom ~0.85), en el pico mantenido la sombra mide ~45 px en pantalla contra ~64 de master.

## 4. Sabremos que estuvo bien si
- En el ciego, **2 de 3 críticos prefieren la rama a 390 y a 1280**, y al menos uno nombra la caída, la altura o el peso como razón, sin que se lo sugieran.
- Nadie dice "flota", "la sombra desaparece", "parpadea" ni "fantasma" (0 de 3).
- La sonda mide en pantalla: crecimiento en los últimos 100 ms **≥ 30 %** del ancho final (master: ~15 %) a 390 y a 1280.

## 5. Sonda que mide lo que ve el ojo (no la perilla)
`herramientas/sonda-p4y.mjs`, headless, con build + preview. Sigue la regla de las sondas: render manual y `toDataURL`, CONFIG importado por URL exacta y coordenadas corregidas por la cámara.
- Misma semilla y misma jugada: un salto mantenido y un toque en el tramo 1. Captura cuadros a **−200, −100, −33, 0 y +33 ms del contacto**, a 390x844 y a 1280x720, en master y en la rama.
- **Mide píxeles, no `displayWidth`**. En la franja de la sombra (de `groundY−2` a `groundY+12` en pantalla) se compara contra un cuadro sin Moki con el mismo fondo. Cuenta las columnas donde la luminancia baja ≥ 2 %. Eso da el **ancho visible** y el **contraste ΔL** máximo.
- Reporta, por tamaño y por salto: ancho visible en cada cuadro, % que crece en los últimos 100 ms y ΔL en el pico.
- **Vara**: crece ≥ 30 % en −100→0 (mantenido) en los dos tamaños. ΔL en el pico ≥ 3 % (si baja de eso, se lee como "desaparece" y se sube `a0`). En el toque, el ancho del pico es mayor que en el mantenido (gradualidad visible).
- **Ojo del instrumento**: también reporta cuántas columnas de la sombra tapan el polvo (P38) o la bota en −33 y 0 ms. Si el polvo tapa más de la mitad, el crecimiento "medido" no es el que se ve, y se mide el borde que sí queda libre (lección de P4q-c y P4q-d).

## 6. Diseño del ciego
- 3 críticos invitados, a ciegas, A/B barajados por crítico y por tamaño.
- **Video en movimiento** (no cuadros sueltos) de 2.5 s a 30 fps, a 390x844 y a 1280x720. La misma fase de la misma partida (semilla fija): un toque, un mantenido y un toque. Corre con build + preview headless.
- También una tira de 8 cuadros cada 33 ms alrededor del contacto del mantenido, para el que no reproduce video. Rama y master se miden igual.
- Pregunta neutra: "¿En cuál se siente mejor el salto y la caída de Moki? ¿Por qué? ¿Viste algo raro?". No se menciona la sombra.
- Pasa con 2 de 3 a favor de la rama en **cada** tamaño y 0 menciones de flotar, desaparecer, parpadear o fantasma.

## 7. Tope y puerta técnica
- Peso **≤ +60 B gz** (estimado: +35 a +50 B; el tope del pedido es +100).
- 6 bots (`bots-p15.mjs`) = master, porque la física no cambia. Consola 0. Se prueba en build y en todos los modos (Clásico, Reto, Libre y Paseo). Al probar el vuelo del trampolín, la sombra no puede bajar de `a0`.
- Jugador nuevo sin localStorage: se ve en **cualquier salto desde el segundo 1**. Cómo llegar: JUGAR y saltar.

## 8. Riesgos
- **Imperceptible** (el trauma de P4e y P4m). Se mitiga porque el cambio de los últimos 100 ms es 2.3 veces el de master y se mide en píxeles. Si el paso 1 sale "no noto diferencia", se para.
- **"Flota" o "la sombra se va"** en el pico, sobre todo de noche o en el atardecer kraft. La mitiga el alfa mínimo de 0.3, y la vara ΔL ≥ 3 % lo atrapa.
- **Choca con el polvo de P38** en el contacto: el contacto queda igual que master (ancho 96 y hundimiento), solo cambia el aire.
- **Trampolín y vuelo**: con aire muy alto, la sombra se queda en su piso (35 % de ancho, alfa 0.3·0.28) y no desaparece.
- No toca el sprite ni lo gira, no hay arte nuevo ni escala del cuerpo. No repite nada de lo que reprobó.

## 9. Paso 1 barato (≤ 15 min, puede parar la pieza)
1. Corre la sonda en **master** a 390: ancho visible y ΔL en el pico y en −100 ms. Si a 390 la sombra de master ya casi no se ve en el pico (ΔL < 3 %), bajar el alfa la borra. En ese caso la pieza cambia a "solo ancho" (`a0` = 0.4, como master) y se vuelve a medir.
2. Haz un micro-ciego de 1 crítico: rama de una línea en un worktree propio, sin vite nuevo (build + preview) y dos videos de 2.5 s a 390. Si no nota ninguna diferencia, **la pieza se para** antes de gastar constructor. Se anota en COLA como "lo que no entró" y se pasa a otra esquina.

## 10. Qué queda fuera
Coyote y búfer, la sacudida o el freeze del choque, los sonidos del despegue y del aterrizaje, el sprite, la estela (familia P4q estacionada), el squash y el casco.

---
Origen: la idea no viene de la calibración CCGS. Viene de la práctica de plataformas (la sombra como anticipación del aterrizaje) y de leer el código de master. Esta vez no se leyó una ficha de `~/Work/_referencias/ccgs`.
