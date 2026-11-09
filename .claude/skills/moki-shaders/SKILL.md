---
name: moki-shaders
description: Cómo meter shaders y efectos procedurales al juego de Moki (Phaser 3.90) con la skill shader-art-coding. Úsala en piezas de MUNDO VIVO, brillo del atardecer, viento en el pasto, parpadeo de estrellas, grano de papel, viñeta o bokeh.
---
# Shaders en Moki

Fuente: skill `shader-art-coding` (gokayfem/shader-skills, MIT, commit a56e773; copia completa en ~/Work/vendor/shader-skills). Esta skill solo dice cómo usarla aquí. Entró el 9-nov por Spark, pedido de Jorge ("no hay partículas ni shaders en ningún lado", P6).

## Antes de escribir un shader

1. Caso de una línea: qué efecto, en qué paisaje y qué gana el jugador. Gameplay va primero; un efecto nunca tapa a Moki, obstáculos, números ni botones.
2. Arma el efecto con la librería, no lo inventes: desde `.claude/skills/shader-art-coding` corre `python3 scripts/glsl_tools.py search <palabras>`, luego `bundle` y `check`. glslangValidator ya está en Omarchy, así que `check` compila de verdad.
3. Para papel y atardecer sirven: ruido, fBm, warp, Voronoi, viñeta cos4, grano y dithering (`post.glsl`, `noise.glsl`, `color.glsl`).

## Dos rutas: la barata primero

**A. Hornear (default en Omarchy).** El shader se pinta una vez a una textura o a una tira corta de cuadros, y el juego solo dibuja imágenes. Costo 0 en FPS. Sirve para grano de papel, cielo, viñeta, bokeh lento y manchas de acuarela. Es el mismo patrón que LUZ DE PAPEL.

**B. En vivo con `Phaser.GameObjects.Shader`.** Solo para lo que tiene que moverse y no se puede hornear (brillo que respira, estrellas que parpadean, viento). Phaser 3 corre en WebGL1 (GLSL ES 1.00) y la skill escribe GLSL ES 3.00, así que hay que portar:
- `texture()` pasa a `texture2D()` y la salida va a `gl_FragColor`.
- Envolver: `void main(){ mainImage(gl_FragColor, gl_FragCoord.xy); }` con `resolution` y `time` de Phaser en lugar de `iResolution` e `iTime`.
- Los hashes con `uint` y operaciones de bits no existen en ES 1.00: usar ruido horneado en textura o un hash sin enteros.
- NO VERIFICADO en moki-rig al 9-nov: el primer paso de la pieza es una prueba mínima de que compila en BUILD (regla 7 de moki-qa-antes-de-integrar).

## Puerta

- FPS a 375 y 390 no peor que master (12 contra 12 en la misma tanda), JS inicial dentro del tope, Clásico 2142 78/78, Reto x2, consola 0.
- Con movimiento reducido, el efecto en vivo se apaga.
- Ciego 2 de 3 contra master en la misma escena.
- Para el post: `herramientas/antes-despues.sh ANTES.png AHORA.png salida.mp4` da el video y el SSIM.
