# AUDIO.md: Moki: Un salto más

**Revisión 29-oct: cozy chiptune por pedido de Jorge.** Se reemplaza la paleta de marimba/kalimba/ukulele por notas tiernas de juguete, como de cartón: ondas triangular y cuadrada suave, envolventes cortas y redondas, melodía alegre y tranquila, eco cálido.

Fuentes: PILOTO.md, DISENO.md (con decisiones del 29-oct), UX.md, ARTE.md §11 y §12, `src/config.js`, `src/scenes/RunScene.js`, `assets/juice/1.2.0/README.md`.
Solo marca personal de Jorge. Hoy el juego no tiene ningún sonido ni música (Jorge: "No tiene música"). Esto lo arregla.

## 0. Reglas de origen
- Todo es **síntesis en Web Audio** (osciladores, ondas periódicas, ruido filtrado) y un secuenciador propio. Cero archivos de audio, cero samples, cero CDNs, cero librerías de audio, cero llaves.
- Phaser no maneja audio: en `main.js` poner `audio: { noAudio: true }` para que no cree un segundo AudioContext.
- El paquete juice 1.2.0 no trae audio reutilizable para el juego (es para sitios web con `data-jz-sound`). Lo que sí heredamos como regla: sonido prendido por defecto con opt-out guardado para siempre, nada suena antes del primer gesto, volumen maestro 0.125, golpes de menos de 150 ms, fanfarria de Hardcore de 0.4 s o menos.
- **Paleta sonora: cozy chiptune.** Notas de juguete de cartón: triangular como voz principal, cuadrada y pulso al 25% solo como acompañante y con poco volumen, bajo triangular, percusión chiquita (tok, shaker de papel, tic). Alegre, tranquila, con ganas de "una más".
- **Reglas de la paleta (las revisa el probador):**
  1. Formas de onda permitidas: `triangle`, `sine` (solo para sub y campanitas), y `square`/pulso 25% **siempre detrás de un lowpass de 2.5 kHz o menos** y con pico de 0.14 o menos. **Prohibida `sawtooth`.** Prohibido el pulso al 12.5% (suena a insecto) y el bitcrush.
  2. Envolventes redondas: ataque de 3 a 6 ms (nunca 0), caída exponencial, sin sostenido plano. Ninguna nota termina en corte seco; el release mínimo es de 40 ms.
  3. Nada de arpegios rapidísimos de chip ni portamentos largos. Las notas son de juguete, tiernas, separadas.
  4. Casi nada de energía arriba de 4 kHz (ver criterio 23).
  5. Prohibido: dubstep, épica, chiptune estridente, ruido blanco fuerte como "canal de ruido" de consola.

## 1. Archivos que crea el constructor
```
src/audio/audio.js      fachada: unlock, buses, mute, juice, ducking, estados. Único punto de entrada.
src/audio/theme.js      datos del tema (acordes, melodía, patrones por capa). Solo datos.
src/audio/music.js      secuenciador (lookahead), capas y eco.
src/audio/voices.js     voces: carton, cuadrada, pulso, bajo, tok, shaker, tic, campana (recetas en 3.1).
src/audio/sfx.js        efectos y stingers (recetas de las secciones 5 y 6).
```
Todas las funciones de voz y de paso del secuenciador reciben `(ctx, destino, tiempo, ...)` y no leen nada global. Así el probador puede renderizarlas con `OfflineAudioContext` y medir.

## 2. Reglas de arranque, silencio y estados
1. **Nada suena antes del primer gesto.** No se crea `AudioContext` al cargar. `audio.unlock()` se llama en el primer `pointerdown`, `pointerup`, `touchend`, `click` o `keydown` (el que llegue primero; iOS exige `touchend`/`click`). Ahí se crea el contexto, se hace `ctx.resume()` y se construyen los buses. El primer gesto normal es "Jugar" (UX §3). Los `PeriodicWave` del pulso 25% se crean aquí, no antes.
2. **Botón de sonido visible** (ver §8). Preferencia en `localStorage` `moki.sound` = `1`/`0`, por defecto `1` (opt-out, como juice 1.2.0). Si la persona lo apaga, se respeta siempre en ese navegador; no se vuelve a prender solo.
3. **Silenciado** significa: master a 0 en 60 ms, secuenciador detenido y `ctx.suspend()`. Cero CPU. Al prender: `resume()`, subida de 300 ms y el secuenciador sigue del mismo paso.
4. **Pestaña oculta o ventana sin foco** (`visibilitychange`, `blur`): UX ya pausa el juego. El audio hace fade de 150 ms y `ctx.suspend()`. Al volver, el audio **no** se reanuda solo: espera a que la persona pulse "Seguir" (que además es un gesto).
5. **Pausa por el botón o Esc/P:** el contexto sigue vivo (los botones del panel suenan). La música baja a 0 en 250 ms y el secuenciador se detiene guardando el paso. El eco se deja morir solo (no se corta). Al "Seguir": sube en 600 ms (misma rampa que el mundo, UX §6) desde el mismo paso. Al ir a "Inicio" la música pasa al modo título (§4.5).
6. **Estados** que `RunScene` le avisa a `audio.setState()`: `title | tutorial | playing | paused | dead | finished`.
7. **Movimiento reducido** (`prefers-reduced-motion: reduce`, escuchado en vivo): el audio sigue, pero sin cambios bruscos. Ver §9.
8. **Nada depende del sonido para jugar.** Todo aviso importante ya tiene señal visual.

## 3. Mezcla
Cadena (el compresor va **después** del master para ver el nivel final):
```
voces de música -> musicMix -> musicFilter(lowpass) -> duckGain -> musicBus ----\
   (melodía y campanitas también -> eco cálido -> musicMix)                      >-> master (0.125) -> compresor suave -> destination
voces de efectos -> sfxMix --------------------------------> sfxBus -----------/
```
| Nodo | Valor |
|---|---|
| `master` | **0.125** (regla del juice). Es el único volumen general y no se toca. |
| `sfxBus` | Valor de partida **5.7**: con un pico de voz de 0.35 da -12 dBFS al final (0.35 x 5.7 x 0.125 = 0.25). Se calibra con el probador. |
| `musicBus` | Valor de partida **1.4**: con la suma de música en su pico (0.7) da -18 dBFS al final. Se calibra con el probador. |
| Compresor | threshold -8 dB, knee 10, ratio 4, attack 5 ms, release 120 ms. Solo protege picos, no da carácter. Ya está después del master, por eso los buses pueden pasar de 1.0 sin recortar. |
| `musicFilter` | lowpass 8 kHz en juego (la paleta ya es suave; el filtro solo recorta el aire sobrante) |
| `duckGain` | 1.0 en juego |

Reglas de calibración (decisión 1 del líder, §14): se suben o bajan **solo** `sfxBus` y `musicBus`, nunca `master`. La música queda 6 dB debajo de los efectos.

### 3.1 Voces y niveles de pico (antes de bus)
Pensado para que la suma de la música nunca pase de 0.7 y un efecto nunca pase de 0.6.

| Voz | Receta de síntesis | Pico |
|---|---|---|
| **carton** (melodía A, efectos de nota) | `triangle`. Ataque 4 ms, a 100% -> 35% en 60 ms, cola exponencial hasta 0.001 en `largo de nota + 80 ms`. Lowpass 3 kHz, Q 0.5. Además, una segunda `triangle` una octava arriba al 12% del volumen, con la misma envolvente 40% más corta: da el "tin" de juguete. Sin vibrato. | 0.30 |
| **cuadrada** (melodía B, contramelodía) | `square` -> lowpass 2 kHz (Q 0.7). Ataque 5 ms, 100% -> 30% en 80 ms, cola exponencial en `largo + 60 ms`. Mezclada 70/30 con una `triangle` del mismo tono para redondear. | 0.14 |
| **pulso** (acordes de energía, arpegio) | `PeriodicWave` de pulso al 25% (armónicos `b_n = (2/(n*pi)) * sin(n*pi*0.25)`, n hasta 12) -> lowpass 2.2 kHz. Ataque 4 ms, caída exponencial en 120 ms. | 0.10 por nota |
| **bajo** | `triangle` + `sine` una octava abajo al 40%. Ataque 6 ms, mantiene el largo, release 80 ms. Lowpass 700 Hz. | 0.38 |
| **tok de cartón** | `triangle` con barrido de 190 a 70 Hz en 70 ms, ataque 2 ms, caída 90 ms. Más un "clic" de ruido con lowpass 1.2 kHz de 8 ms al 20%. | 0.30 |
| **shaker de papel** | Ruido blanco -> bandpass 3 kHz, Q 0.8 -> lowpass 4 kHz. Ataque 3 ms, caída 45 ms. | 0.08 |
| **tic** (sustituye madera y snap) | Pulso 25% (como arriba) 880 -> 800 Hz, lowpass 2.5 kHz, ataque 3 ms, caída 40 ms. | 0.10 |
| **campana** | `triangle` en octava 6 + `sine` a 3x de frecuencia al 15%. Ataque 3 ms, caída exponencial 350 ms. Lowpass 4 kHz. | 0.10 |

**Ducking** (la música baja, no se corta):
| Evento | Música | Filtro | Rampa |
|---|---|---|---|
| Choque / fallo | a 25% (duckGain 0.25) | lowpass 900 Hz | baja en 120 ms |
| Tarjeta de lección visible | se mantiene a 30% | lowpass 1200 Hz | (ya está) |
| Reintento (toque) | vuelve a 100% | 8 kHz | sube en 600 ms |
| Stinger de checkpoint | a 55% durante 1.4 s | sin cambio | 80 ms bajar, 400 ms subir |
| Stinger de récord | a 45% durante 1.8 s | sin cambio | 80 ms / 500 ms |
| Meta alcanzada | a 0 | sin cambio | 800 ms |
| Tarjeta final | vuelve a 35%, solo capa base, lowpass 2.5 kHz | | 1 s |
| Tutorial con el mundo detenido | sin cambio | | |

**Objetivos medibles** con `OfflineAudioContext` (salida final con master 0.125; decisión 1 del líder): **picos de efectos principales ≈ -12 dBFS** (aceptado entre -15 y -10) y **música ≈ -18 dBFS de pico** con todas las capas (aceptado entre -20 y -16). La música queda al menos 4 dB debajo de los efectos cuando suenan juntos. Los efectos secundarios (botón, tic, tarjeta) pueden quedar más bajos por diseño.

## 4. Tema principal: "Un saltito más"

### 4.1 Forma
- Tono: **Do mayor**. Compás 4/4. **96 BPM**. Rejilla de semicorcheas (16 pasos por compás), 1 paso = 0.15625 s, 1 compás = 2.5 s.
- **32 compases = 80 s exactos** de loop. Un solo secuenciador continuo que cuenta pasos módulo 512: no hay "reinicio", por eso no hay costura. Las colas de las notas y las repeticiones del eco terminan solas, no se cortan en la vuelta (el nodo de eco no se reinicia).
- Esqueleto rítmico (tresillo juguetón 3+3+2+3+3+2): pasos **0, 3, 6, 8, 11, 14**. La melodía, el bajo y las capas de energía lo respetan.
- Cierre del loop: el compás 32 es G7 con un pickup (Do5, Re5) que lleva al Mi5 del compás 1. Ese es el único truco de la costura; no hay silencio ni cola larga ahí.
- Carácter: melodía tranquila y cantable, notas de duración corta a media, mucho aire entre frases (el eco llena los huecos). Sin swing nuevo; se conserva el esqueleto.

| Compases | Sección | Acordes (1 por compás) | Voz de melodía |
|---|---|---|---|
| 1 a 8 | A | C · Am · F · G · C · Am · F · G | carton (triangular) |
| 9 a 16 | B (respiro) | F · G · Em · Am · F · G · C · C | cuadrada (cuadrada suave + triángulo) |
| 17 a 24 | A' | igual que A (compás 24 con variante, ver abajo) | carton + cuadrada a la misma altura, velocidad 0.35, en energía 2 o más |
| 25 a 32 | B' | F · G · Em · Am · Dm · G · C · G7 | cuadrada |

### 4.2 Melodía (datos para `theme.js`)
Cada nota es `[paso, midi, largoEnPasos]`. MIDI: Do5 = 72, Re5 = 74, Mi5 = 76, Fa5 = 77, Sol5 = 79, La5 = 81, Si5 = 83, Do6 = 84, Re6 = 86, Mi6 = 88, Fa6 = 89, Sol6 = 91. Frecuencia: `440 * 2^((midi-69)/12)`. La melodía se conserva tal cual; con triangular y cuadrada suave suena a caja de música de juguete.

```js
// Sección A (compases 1 a 8). La sección A' repite estos mismos compases.
A = [
 /*1 C */ [[0,76,2],[3,79,2],[6,84,2],[8,79,2],[11,76,4]],
 /*2 Am*/ [[0,81,2],[3,79,2],[6,76,2],[8,72,3],[12,76,2]],
 /*3 F */ [[0,81,2],[3,84,2],[6,81,2],[8,77,3],[11,81,4]],
 /*4 G */ [[0,83,2],[3,86,2],[6,83,2],[8,79,3],[12,79,1],[14,83,2]],
 /*5 C */ [[0,84,3],[3,83,2],[6,79,2],[8,76,3],[11,79,4]],
 /*6 Am*/ [[0,81,2],[3,84,2],[6,88,2],[8,86,2],[10,84,2],[12,81,3]],
 /*7 F */ [[0,81,2],[3,79,2],[6,77,2],[8,81,3],[11,84,4]],
 /*8 G */ [[0,86,2],[3,83,2],[6,79,4],[12,74,2],[14,79,2]],
];
// Variante del compás 24 (solo en A'): cierra mirando hacia arriba.
A24 = [[0,86,2],[3,83,2],[6,79,2],[8,74,2],[11,79,2],[14,83,2]];

// Sección B (compases 9 a 16): más aire, notas largas.
B = [
 /*9  F */ [[0,84,4],[4,81,4],[8,77,4],[12,81,4]],
 /*10 G */ [[0,86,4],[4,83,4],[8,79,4],[12,83,4]],
 /*11 Em*/ [[0,88,4],[4,83,4],[8,79,4],[12,83,4]],
 /*12 Am*/ [[0,84,4],[4,88,4],[8,81,3],[12,84,3]],
 /*13 F */ [[0,81,2],[3,84,2],[6,89,2],[8,88,2],[10,84,2],[12,81,3]],
 /*14 G */ [[0,83,2],[3,86,2],[6,91,2],[8,89,2],[10,86,2],[12,83,3]],
 /*15 C */ [[0,88,4],[4,84,4],[8,79,4],[12,76,4]],
 /*16 C */ [[0,72,6],[12,72,2],[14,74,2]],          // pickup hacia el Mi5 del compás 17
];

// Sección B' (compases 25 a 32): compases 25 a 28 = compases 9 a 12 de B.
Bp = [
 /*29 Dm*/ [[0,86,2],[3,81,2],[6,77,2],[8,81,3],[11,86,4]],
 /*30 G */ [[0,83,2],[3,86,2],[6,79,2],[8,83,3],[12,89,3]],
 /*31 C */ [[0,84,2],[3,88,2],[6,91,2],[8,88,2],[12,84,4]],
 /*32 G7*/ [[0,86,2],[3,83,2],[6,79,4],[12,72,2],[14,74,2]],  // pickup Do5, Re5 hacia el Mi5 del compás 1
];
```
Velocidad de nota: 0.85 en los pasos del esqueleto (0, 3, 6, 8, 11, 14), 0.6 en los demás; variación aleatoria de ±6% y desfase de ±6 ms (humanizar). El largo audible de cada nota es `largo * 0.8` pasos como máximo: las notas se sueltan redondas antes de la siguiente, como piezas de cartón puestas una a una.

### 4.3 Acordes y bajo
| Acorde | Bajo (midi) | Quinta del bajo | Acorde de pulso (midi, de abajo hacia arriba) |
|---|---|---|---|
| C | 48 | 55 | 60 64 67 72 |
| Am | 45 | 52 | 57 60 64 69 |
| F | 41 | 48 | 57 60 65 69 |
| G | 43 | 50 | 59 62 67 71 |
| Em | 40 | 47 | 59 64 67 71 |
| Dm | 38 | 45 | 57 62 65 69 |
| G7 | 43 | 50 | 59 62 65 67 |

### 4.4 Capas: base y energía, y eco cálido
Son **dos capas**. La energía tiene tres grados (E1, E2, E3) para que el tema crezca sin cambiar de tempo ni de tema.

**Base (exploración, siempre encendida mientras se juega):**
| Voz | Patrón por compás (pasos 0 a 15) |
|---|---|
| Melodía | Sección A y A' con `carton`, B y B' con `cuadrada` (4.2) |
| Bajo | Fundamental en 0 (largo 6 pasos), fundamental corta en 10 |
| Tok de cartón | Pasos 0 y 8 (pico 0.30 y 0.22) |
| Shaker de papel | Pasos 2, 6, 10, 14 (contratiempos), pico 0.08 |
| Eco cálido | Solo melodía y campanitas, ver abajo |

**Eco cálido (delay):** `DelayNode` de 3 pasos (0.469 s, sincronizado con el tempo). Dentro del lazo de realimentación: `lowpass 1.8 kHz` y `highpass 180 Hz`, y luego ganancia de **realimentación 0.25**. Cada repetición suena más oscura y más baja que la anterior, como un cuarto de cartón. Mezcla húmeda 0.18 (la envía la melodía con `send` 0.5). La cola llega a -40 dB en unas 3 o 4 repeticiones (~1.7 s). El delay se crea una sola vez en `unlock()` y nunca se reinicia, así cruza la costura del loop sin cortes. Con realimentación máxima 0.3 es imposible que se acumule o se auto-oscile.

**Energía (se suma; cada grado incluye los anteriores):**
| Grado | Voces nuevas |
|---|---|
| E1 | Acorde de pulso corto (3 notas del acorde: las tres más graves de 4.3, 14 ms de separación, caída 120 ms, pico total 0.14) en pasos 4 y 12. Tic en 4 y 12. Arpegio de `pulso` en corcheas con las notas del acorde, octavas 4 y 5, pico 0.10 por nota. |
| E2 | Bajo en el esqueleto: fundamental en 0, 3, 8, 11 y quinta en 6, 14. Shaker a semicorcheas (pasos 0 a 15, alternando pico 0.05 y 0.08). Tok también en 4 y 12 (pico 0.18). `cuadrada` duplica la melodía de A y A' una octava arriba (midi +12, velocidad 0.30). |
| E3 | `campana` en pasos 2, 5, 9, 13 sobre notas del acorde en octava 6, pico 0.10 (pasan por el eco). Tic extra en pasos 6 y 14. Acorde de pulso añade un golpe más en el paso 10 (pico 0.10). |

**Qué grado suena** (`audio.setTramo(i)` y `audio.setStreak(n)`):
| Condición | Grado mínimo |
|---|---|
| Tramo 1, velocidad 320 | Solo base |
| Tramo 2, velocidad 350 | E1 |
| Tramo 3, velocidad 385 | E2 |
| Tramo 4, velocidad 420 | E3 |
| Racha x2 (3 a 5 piezas seguidas) | E1 como mínimo |
| Racha x3 (6 o más) | E2 como mínimo |

El grado efectivo es el máximo entre el del tramo y el de la racha. Cambia **solo en el límite de compás**, con rampa de 400 ms en la ganancia de cada voz nueva. Al terminar la racha baja con un retardo de 2 compases (5 s) para que no parpadee. Si la persona falla, tras la tarjeta se vuelve al grado del tramo. El cambio de velocidad de DISENO (rampa de 2 s al checkpoint) coincide con la entrada de la capa: sube en el compás siguiente al stinger de checkpoint.

### 4.5 Música fuera del juego
| Estado | Música |
|---|---|
| Antes del primer gesto | Silencio total |
| `title` (después de haber desbloqueado, por ejemplo al volver de Pausa > Inicio) | Solo base, lowpass 3 kHz, 60% |
| `tutorial` | Base, 100%. El mundo se detiene en las lecciones; la música sigue (es lo que marca "estoy esperando") |
| `playing` | Base + grado de energía que toque |
| `paused` | Fundido a 0, secuenciador detenido |
| `dead` | Ducking (§3) |
| `finished` | Ducking a 0, stinger de final, luego base a 35% |

Al entrar a `playing` desde un silencio, fade-in de 800 ms desde el paso 0 del compás 1 (arranque limpio en el primer salto, no a media frase).

## 5. Efectos (recetas)
Todos pasan por `sfxBus`. Regla: la **cola audible** (hasta caer a -40 dB) de todo efecto de esta sección dura **menos de 150 ms**, salvo los marcados como "especial". Ataque mínimo de 2 ms para no clickear. Los picos son antes del bus. Aleatorio: ±3% de afinación y ±8% de volumen en saltos, aterrizajes y piezas, para que no suenen a máquina. Las voces son las de 3.1 (triangular como base).

| Efecto | Receta | Duración | Pico |
|---|---|---|---|
| **Salto corto** (toque) | `triangle` con glissando exponencial 330 a 520 Hz en 90 ms; envolvente ataque 3 ms, caída a 0.001 en 110 ms. Más un pulso 25% una octava arriba al 20% del volumen (el "bip" de juguete, lowpass 2.5 kHz). Más un susurro de papel: ruido blanco con bandpass 2500 Hz, Q 1, 10 ms, pico 0.04. | 110 ms | 0.35 |
| **Salto alto** (mantenido) | Mismo despegue que el corto, y a los **140 ms** de mantener (cuando el salto ya pasa de ~84 px) suena un segundo "bip" que sube: `triangle` 520 Hz hasta `520 + 260 * (holdMs-140)/80` (tope 780 Hz) en 80 ms, caída 100 ms. El resultado suena a "bu-wip" ascendente. Si se suelta antes de 140 ms, no hay segundo bip. | 110 ms + 100 ms | 0.30 |
| **Aterrizaje (papel)** | Ruido blanco con lowpass que cae de 1800 a 600 Hz en 90 ms (envolvente ataque 2 ms, caída 100 ms), más un `tok` corto (triángulo 140 a 90 Hz en 60 ms). Escala: velocidad de caída / `jumpVelocity` entre 0.5 y 1.0 del pico. | 100 ms | 0.22 ruido + 0.25 tono |
| **Pieza recogida** | Nota `carton` (triángulo + octava al 12%) más una `cuadrada` a la misma altura al 25%, ataque 2 ms, caída exponencial 110 ms, lowpass 3.5 kHz. **Escala pentatónica ascendente según la racha**: pieza 1 a 5 de la racha = midi 84, 86, 88, 91, 93 (Do6, Re6, Mi6, Sol6, La6); la sexta y siguientes se quedan en 93. Se reinicia a 84 cuando pasan 0.9 s sin piezas (misma ventana que DISENO) o al chocar. | 110 ms | 0.35 |
| **Racha x2 / x3** (solo Mucho y Hardcore) | Se suma a la nota de la pieza que cambia de nivel: x2 (3ª pieza) agrega la quinta superior (midi +7) a ganancia 0.15; x3 (6ª pieza) agrega la quinta y la octava (+12) a 0.15. Misma envolvente, voz `carton`. | 140 ms | +0.15 |
| **Pieza ámbar** (especial, 5 puntos) | `campana` Sol5 (79) y 80 ms después Do6 + Mi6 (84 y 88) juntos; cola de 300 ms. Sin reverb extra; pasa por el eco cálido con envío 0.3. | 400 ms | 0.35 |
| **Tropiezo / choque suave** | Sin agudos. Ruido blanco con lowpass 900 a 300 Hz en 130 ms (ataque 5 ms) más `triangle` 110 a 70 Hz en 120 ms. Suena a "tum" de cartón. No es un golpe seco. Inmediatamente después empieza el ducking (§3) y a los 80 ms el stinger de fallo. | 130 ms | 0.25 ruido + 0.30 tono |
| **Botón de UI** (Jugar, Seguir, tarjetas, sonido) | `triangle` con glissando 700 a 520 Hz en 40 ms, caída 60 ms. Al activar el sonido sube (520 a 700 Hz); al apagarlo baja (700 a 400 Hz). Se reproduce **antes** de silenciar, para confirmar el apagado. | 60 ms | 0.20 |
| **Pausa / Seguir** | Dos notas `carton` de 60 ms con 60 ms de separación: Pausa baja (Sol5 a Mi5, 79 y 76), Seguir sube (Mi5 a Sol5). | 120 ms | 0.20 |
| **Tarjeta de lección entra** | Papel que se desliza: ruido blanco con bandpass que sube de 1000 a 2500 Hz en 200 ms, ataque 20 ms. Muy suave. | 200 ms (especial) | 0.08 |
| **Tutorial "¡Eso!"** | Dos notas `carton` (Sol5 y Do6), 60 ms de separación, 70 ms de caída. | 130 ms | 0.28 |
| **Pulso de la mano (tutorial)** | `tic` (pulso 25%, 880 a 800 Hz, caída 40 ms). Un tic por pulso. | 40 ms | 0.10 |
| **Pieza de la Ola / arco completo (bono)** | Además de las notas de pieza, al completar un arco suena la secuencia Do6, Mi6, Sol6 (60 ms entre notas) con `carton`. | 200 ms (especial) | 0.25 |

## 6. Stingers
Todos en pentatónica de Do (Do, Re, Mi, Sol, La), así quedan bien sobre cualquier acorde del tema. Se reproducen por `sfxBus`, sin cuantizar al compás. Usan `carton`, `cuadrada` y `campana`; el acorde final se hace con 3 notas de `pulso` con 14 ms de separación.

| Stinger | Cuándo | Receta | Duración |
|---|---|---|---|
| **Checkpoint (ámbar)** | Cuando la bandera se despliega (280 ms) y sale "Aprendizaje guardado" | Arpegio ascendente de `carton` Sol4, Do5, Mi5, Sol5 (67, 72, 76, 79) con 70 ms entre notas. Al final, `campana` Do6 (84) con cola de 600 ms y un acorde de `pulso` en Do (60, 64, 67). Debajo, un barrido de papel: ruido con bandpass 1500 a 3500 Hz en 280 ms, pico 0.08, sincronizado con el despliegue de la bandera. | 1.2 s |
| **Fallo (amable)** | A los 80 ms del choque, con el ducking ya bajando | Descenso lento que termina en la fundamental, para que suene a "ya casi", sin tono menor: `carton` Sol5, Mi5, Do5 (79, 76, 72) con 150 ms entre notas y velocidades 0.7, 0.55, 0.45; cola de 700 ms. Un "tok" suave (110 Hz) debajo de la última nota. Sin ruido agresivo ni disonancias. | 1.0 s |
| **Nueva mejor marca** | Al mostrar la etiqueta "Nueva marca" (en la tarjeta final, o 600 ms después del stinger de fallo si la marca se supera al fallar) | Subida de `carton` Do5, Mi5, Sol5, La5, Do6, Mi6 (72, 76, 79, 81, 84, 88) con 60 ms entre notas. Cierra con acorde sostenido Sol5 + Do6 + Mi6 (900 ms) de `cuadrada` con `carton`. `campana` Mi6 y Sol6 como destello (sin agudos arriba de Sol6). Rodillo de shaker: 8 golpes de ruido que se aceleran de 90 ms a 40 ms de separación, pico 0.08. | 1.6 s |
| **Final (meta)** | Al cruzar la meta; el mundo frena en 1 s y a los 1.2 s sale la tarjeta | Cita el motivo del tema: Mi5 (76), Sol5 (79), Do6 (84) en 0, 180 y 360 ms; Sol5 (79) a 540 ms; Mi6 (88) a 900 ms. Luego acorde de Do con `pulso` (60, 64, 67, 72), bajo Do3 (48) y `campana` Do6, Mi6, Sol6 (84, 88, 91) en arpegio con cola de 1.2 s. | 3.0 s |
| **Fanfarria Hardcore** | Solo en Hardcore: se suma al inicio de los stingers de checkpoint, récord y final | Acorde Do5 + Sol5 + Do6 (72, 79, 84) de `carton` + `cuadrada` en 0 ms, con "tok" y tic. Corte con caída de 0.4 s como máximo. | 0.4 s |

## 7. Juice y audio
Decisión 2 del líder: **el sonido va fuera del juice.** El audio solo lo controlan el botón de sonido (`moki.sound`) y `prefers-reduced-motion`. El juice Nada quita efectos visuales, no el audio. El juice solo decide cuántos extras suenan:

| Nivel | Música | Efectos |
|---|---|---|
| Nada | Base + energía por tramo | Salto (corto/alto), aterrizaje, pieza, tropiezo, botones, stingers de checkpoint, fallo y final |
| Poquito | Igual a Nada | Igual a Nada |
| Mucho | Igual, y la energía también sube por racha | Todo lo anterior, más: overlay de racha x2/x3, pieza ámbar, stinger de récord, arco completo, tarjeta que entra, tutorial "¡Eso!" y tic de la mano. Abre el filtro de música de 5 a 8 kHz en 2 s al cambiar de tramo. |
| Hardcore | Igual a Mucho | Todo lo de Mucho, más: fanfarria de 0.4 s en checkpoint/récord/final y un "thump" de aterrizaje extra (`sine` 70 Hz, 60 ms, pico 0.25). Se apaga con movimiento reducido. |

Si el juice cambia a mitad de partida (desde Pausa), aplica en el momento y la música sigue desde su paso.

## 8. Botón de sonido
- **Visible siempre**: en el título (esquina superior derecha, junto a la zona de idioma que ya no existe, UX §3), en el panel de Pausa (fila "Sonido: Sí / No") **y en el HUD de juego**, a la izquierda del botón de pausa. Papel con ícono de bocina: con ondas = prendido, con una cuerda tachada = apagado. El estado no depende solo del color.
- Mínimo 44 x 44 px (ideal 48), 8 px de separación con vecinos. Es un botón real (DOM o equivalente enfocable): `aria-label="Sonido"` y `aria-pressed="true|false"`. Atajo: tecla **M**.
- No dispara salto (UX §2, los botones de UI no saltan).
- Persistencia: `moki.sound`, con `try/catch` por modo privado.
- **Fuera del juice**: el ícono refleja solo `moki.sound`, sin importar el nivel de juice.
- Estado inicial, antes del primer gesto: el ícono ya refleja la preferencia guardada (prendido por defecto), pero no suena nada hasta el gesto.

## 9. Movimiento reducido
El audio **sigue**. Cambios para evitar sobresaltos:
- Todas las rampas de ducking y de capas se alargan: ducking de fallo 120 a 300 ms, capas de energía 400 a 1500 ms, volver de pausa 600 a 900 ms.
- No hay barrido de filtro al cambiar de tramo; el cambio es solo de ganancia.
- Ataque mínimo de efectos sube de 2 a 8 ms. Todos los efectos pasan por un lowpass de 3.5 kHz (la paleta ya es suave, así que casi no se nota la diferencia).
- Se quitan: el "thump" y la fanfarria de Hardcore (Hardcore apagado, ARTE §12), el rodillo de shaker del récord, el barrido de papel de la tarjeta, el humanizado de tiempo (se queda solo el de volumen).
- Los picos de los efectos bajan 20%. El eco mantiene su realimentación en 0.25 (no sube).
- Se escucha el cambio en vivo (`matchMedia(...).addEventListener('change')`).

## 10. Integración en `RunScene` (puntos de enlace)
| Dónde (hoy en `RunScene.js`) | Llamada |
|---|---|
| Primer `pointerdown`/`keydown` en título | `audio.unlock()` y luego `audio.setState('tutorial'` o `'playing')` |
| `press()` | `audio.sfx('jump')`; al pasar 140 ms mantenido: `audio.sfx('jumpHigh', {holdMs})` |
| `release()` | Nada (el segundo bip ya sonó o no) |
| Aterrizaje (donde sale `dust()`) | `audio.sfx('land', {fall})` |
| `collect(k)` | `audio.sfx(pickup.amber ? 'amber' : 'pickup', {streak})` y, si es el último de un arco, `audio.sfx('arc')` |
| `spawnCheckpoint()` al desplegarse la bandera | `audio.stinger('checkpoint')` y `audio.setTramo(i)` |
| Choque | `audio.sfx('stumble')`, `audio.setState('dead')` |
| Tarjeta de lección entra | `audio.sfx('card')`; sigue ducking |
| Toque de reintento | `audio.setState('playing')`, `audio.setStreak(0)` |
| Racha (cada pieza) | `audio.setStreak(n)` |
| Mejor marca | `audio.stinger('record')` |
| Meta | `audio.setState('finished')`, `audio.stinger('final')` |
| `togglePause()` | `audio.setState('paused')` / `'playing'` y `audio.sfx('pause')` |
| Botones de UI | `audio.sfx('ui')` |
| Cambio de juice o de sonido | `audio.setJuice(level)` (solo extras), `audio.setMuted(bool)` |
| `visibilitychange` / `blur` | `audio.hide()` (fade 150 ms y suspend) |

Parámetros de prueba para el probador (UX P2): `?sound=0` fuerza apagado; `?audiodebug=1` muestra en consola grado de energía, compás actual y estado del contexto.

## 11. Criterios PASS/FAIL (se comprueban jugando y con scripts)
Evidencia en `evidencia/audio-*`.

| # | Criterio | PASS |
|---|---|---|
| 1 | Nada antes del primer gesto | Con `addInitScript` que cuenta construcciones de `AudioContext`: 0 antes del primer gesto, 1 después. Ningún `AudioContext` tiene estado `running` antes. |
| 2 | Música al jugar | Tras "Jugar" se oye la base (triángulo y cuadrada suaves). Jorge deja de decir "no tiene música" |
| 3 | Loop sin costura | Render offline de 2 vueltas (160 s) con la misma función de pasos: sin muestras que salten más de 0.25 entre vecinas a ±10 ms de la vuelta; RMS del compás 32 y del 1 dentro de 3 dB; ningún silencio de más de 300 ms. Duración de vuelta = 80.0 s ±0.05. El eco cruza la vuelta sin corte (la cola del compás 32 sigue sonando en el 1) |
| 4 | Capas por tramo | En T1 solo base; entra E1 en T2, E2 en T3, E3 en T4, siempre en límite de compás y con rampa. Confirmable con `?audiodebug=1` |
| 5 | Racha | 3 piezas seguidas en T1 suben a E1; 6, a E2; vuelve a base unos 5 s después de que termina la racha |
| 6 | Escala de piezas | Piezas consecutivas suben por 84, 86, 88, 91, 93; con 0.9 s sin piezas o tras chocar, vuelve a 84 |
| 7 | Saltos distintos | Corto y alto suenan distinto: el alto tiene segundo bip más agudo; sin segundo bip si se suelta antes de 140 ms |
| 8 | Duración de efectos | Cola de salto, aterrizaje, pieza, racha, tropiezo y botón menor a 150 ms (medido a -40 dB en offline) |
| 9 | Mezcla (decisión 1 del líder) | Con `OfflineAudioContext` y master 0.125: pico de efectos principales ≈ -12 dBFS (entre -15 y -10); pico de música con todas las capas ≈ -18 dBFS (entre -20 y -16); música al menos 4 dB bajo los efectos; sin recortes en 5 min de juego; `master.gain.value === 0.125` y `sfxBus`/`musicBus` son los únicos que se calibran |
| 10 | Ducking | En el choque la música baja a 25% en 120 ms y vuelve en 600 ms tras el reintento; la tarjeta no queda con música a pleno volumen |
| 11 | Fallo amable | El stinger de fallo no usa tono menor ni disonancias; se escucha como "ya casi". Revisión humana del probador |
| 12 | Stingers | Checkpoint, fallo, récord y final suenan en su momento (con capturas de cada pantalla) y no se encimen más de 1 a la vez |
| 13 | Botón de sonido | Visible en título, HUD y pausa; ≥ 44 x 44 px (`getBoundingClientRect`); apaga y prende; `aria-pressed` cambia; atajo M |
| 14 | Persistencia | Apagar, recargar: sigue apagado y no suena nada ni tras el primer gesto |
| 15 | Pausa | Pausar baja la música a 0 en 250 ms y no suena nada; "Seguir" sube en 600 ms desde el mismo compás |
| 16 | Pestaña oculta | Al ocultar la pestaña el contexto queda `suspended`; al volver no suena hasta pulsar "Seguir" |
| 17 | Sonido fuera del juice | Con juice Nada, Poquito, Mucho y Hardcore la música y los efectos base suenan igual; el juice solo agrega o quita extras (racha, ámbar, récord, arco, fanfarria de 0.4 s o menos). Solo `moki.sound` silencia |
| 18 | Movimiento reducido | Con la preferencia activa: audio sigue, sin thump, sin barrido, ducking en 300 ms y capas en 1.5 s; sin cambios bruscos |
| 19 | Recursos externos con licencia (canon Jorge 8-nov) | Se permiten archivos de audio y assets de terceros si su licencia permite uso comercial y caben en el presupuesto de peso; sin peticiones de red de terceros en el juego |
| 20 | Consola | 0 errores y 0 avisos de "AudioContext was not allowed to start" |
| 21 | Rendimiento | La música no mueve la caída de cuadros: promedio de cuadros dentro de 5% con y sin audio (celular de gama media) |
| 22 | Suave al oído | Revisión humana a volumen normal: nada estridente, nada chillón, nada fatiga en 3 minutos de juego; suena a juguete de cartón, no a consola de 8 bits |
| 23 | Carácter cozy chiptune | Sin `sawtooth` en el código (`grep`); todo `square` o pulso va detrás de un lowpass ≤ 2.5 kHz; ninguna nota empieza con ataque menor a 2 ms ni termina sin release (≥ 40 ms). FFT del render offline de la música: menos del 3% de la energía arriba de 4 kHz y ningún pico espectral arriba de 6 kHz a más de -40 dB |
| 24 | Eco cálido | Realimentación del delay ≤ 0.3, lowpass ≤ 2 kHz dentro del lazo; el render de una nota sola muestra 3 a 4 repeticiones cada vez más bajas y oscuras (cada una ≥ 4 dB más baja que la anterior) que caen a -40 dB en menos de 2.5 s |

## 12. Lista de cambios para el constructor
**P0 (sin esto Jorge sigue sin música):**
1. `main.js`: agregar `audio: { noAudio: true }` a la configuración de Phaser. No importar nada de audio de Phaser.
2. Crear `src/audio/` con `audio.js`, `voices.js`, `theme.js`, `music.js`, `sfx.js` (sección 1). Cargar `theme.js` con los datos de la sección 4.2 y 4.3.
3. `audio.unlock()` en el primer gesto (sección 2.1). No crear el `AudioContext` antes.
4. Buses con master 0.125 fijo, `sfxBus` ≈ 5.7 y `musicBus` ≈ 1.4 de partida, compresor después del master (sección 3). Calibrar con el probador a -12 dBFS (efectos) y -18 dBFS (música).
5. Voces de la sección 3.1: carton, cuadrada, pulso, bajo, tok, shaker, tic, campana. Nada de `sawtooth`; todo `square`/pulso con lowpass.
6. Secuenciador con lookahead (revisar cada 25 ms, programar 120 ms adelante) usando `ctx.currentTime`, que cuente pasos módulo 512.
7. Eco cálido compartido (4.4), creado una sola vez en `unlock()`.
8. Capa base + energía E1 a E3 por tramo y racha (4.4).
9. Efectos de salto corto, salto alto, aterrizaje, pieza con escala, tropiezo, botón (sección 5).
10. Stinger de checkpoint y de fallo; ducking en fallo y en tarjeta (secciones 3 y 6).
11. Botón de sonido en el título y en Pausa con `moki.sound`; apagado detiene todo (secciones 2 y 8).
12. Pausa y pestaña oculta (sección 2.4 y 2.5).

**P1:**
13. Stinger de récord y de final; música a 35% en tarjeta final.
14. Botón de sonido en el HUD junto a pausa, con ícono de papel de ARTE y tamaño de UX (decisión 3 del líder).
15. Juice solo para extras (sección 7); el audio base no depende de él (decisión 2 del líder).
16. Movimiento reducido (sección 9), escuchado en vivo.
17. Tutorial: "¡Eso!" y tic de la mano.

**P2:**
18. Fanfarria Hardcore y "thump".
19. Parámetros `?sound=0` y `?audiodebug=1`.
20. Música de título al volver de Pausa > Inicio (4.5).
21. Script del probador que renderiza con `OfflineAudioContext` y mide criterios 3, 8, 9, 23 y 24.

**Pruebas que debe entregar el constructor:** script de Playwright con el contador de `AudioContext` (criterio 1), el render offline del loop (criterio 3), de los efectos (criterio 8), de la mezcla y el espectro (criterios 9 y 23), del eco (criterio 24), y capturas `audio-*` del botón de sonido en 375 y 1280 px.

## 13. Decisiones para el líder
1. **Volumen maestro 0.125 en celular.** Es muy bajo (efectos cerca de -19 dBFS). Se mantiene tal cual por la regla del juice. Propuesta: medir en un celular real y, si no se oye, subir `sfxBus` y `musicBus` juntos (mantener la distancia de 6 dB), nunca el master. ¿De acuerdo?
2. **Nada = silencio total, también la música**, como dice ARTE §11. Entonces, si Jorge deja el juice en Nada, el juego queda mudo. Propuesta: el botón de sonido, al pulsarlo con juice en Nada, sube a Poquito. Alternativa: dejar la música aparte del juice. ¿Cuál?
3. **Botón de sonido en el HUD de juego.** UX §5 solo lista pausa en el HUD. Pido el botón junto a pausa para cumplir "botón de sonido visible" siempre. Necesita ícono (bocina de papel) de ARTE y espacio de UX. ¿Aprobado?
4. **Tempo y largo.** 96 BPM y 32 compases (80 s) dentro del rango de 60 a 90 s. El tema no cambia de tempo ni de tonalidad entre tramos; solo suma capas. ¿Basta o quieren +4 BPM en T4? (Cambiar tempo en vivo agrega riesgo de costura; no lo recomiendo.)
5. **Música en el título antes del primer gesto:** imposible por regla del navegador y del proyecto. Entonces el título es silencioso hasta "Jugar". ¿De acuerdo? (La música de título de la sección 4.5 solo aplica al volver de Pausa.)
6. **Pieza ámbar, tarjeta y arco completo exceden 150 ms** (400, 200, 200 ms). Los marco como "especiales". ¿Aceptable? Si no, los recorto a 150 ms.

(Las seis se respondieron el 29-oct; ver "Decisiones del líder" al final. Esta sección queda como historial.)

## Veredicto
Hoy el juego no tiene audio y la implementación no existe. El diseño en cozy chiptune está completo y medible.

**AUDIO: AJUSTAR**

Se vuelve a revisar con los criterios de la sección 11 cuando el constructor cierre los P0 y P1.

## Decisiones del líder (29-oct)
1. Volumen: el maestro se queda fijo y se suben solo los buses. Meta medida con OfflineAudioContext: picos de efectos ≈ -12 dBFS y música ≈ -18 dBFS. El probador lo mide.
2. El sonido va fuera del juice. Solo lo controla el botón de sonido (moki.sound). El juice Nada quita efectos visuales, no el audio. ARTE §11 queda ajustado en esto.
3. Botón de sonido visible junto a la pausa, con ícono de papel según ARTE y tamaño de toque de UX.
4. Tempo fijo en 96 BPM, sin cambio de tonalidad. La energía crece por capas.
5. Título en silencio hasta el primer gesto.
6. Se aceptan los especiales de más de 150 ms (pieza ámbar, tarjeta, arco completo).

## Capas del Cuaderno y timbre de bici (CRECE corte 1, 2-nov)

Plan: AUDIO-CAPAS.md. Código: `src/audio/capas.js` (diferido, 1.4 KB gzip).
- Eje aparte de la energía: `createCapas` arma 5 ganancias (niveles 2 a 6) hacia un filtro propio y de ahí a `musicMix`. `music.js` llama `capas.step()` en cada paso. Las capas cambian solo al inicio de compás (rampa de 0.4 s, 1.5 s con movimiento reducido).
- Capas: 2 percusión de papel, 3 contracanto sostenido, 4 colchón, 5 bajo caminante y soplo, 6 brillo (campanitas y pulso).
- Noche (`audio.nt()`, que RunScene toma de `ambient.nt`; de noche si pasa de 0.5): las capas dejan fuera la tercera y el filtro baja de 8 kHz a 3.2 kHz en 4 s (con movimiento reducido: 8 s y no baja de 4.5 kHz).
- Mezcla: desde el nivel 4, E3 sube a 0.7 en vez de 1. El bus de música queda x0.9 en los niveles 4 y 5 y x0.81 en el 6.
- `audio.setNivel(n)` lo llama RunScene en cada arranque de tramo. Clásico y demo pasan 1, así que `capas.js` ni se descarga. Con el sonido apagado tampoco se pide; se pide al volver a encenderlo.
- `audio.sfx('timbre')`: campana de bici, ring-ring a 0 y 55 ms (1568 y 4330 Hz). Va por el canal de recompensa. Si `capas.js` aún no carga, suena la campanita de pieza más alta.
- Medición: `measureCapas()` en `src/debug/audioMeasure.js`; el script es `evidencia/crece-audio-medir.mjs`.
