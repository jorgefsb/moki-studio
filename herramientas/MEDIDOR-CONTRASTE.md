# Medidor de contraste repetible

GDD §9 punto 1, DECISIONES 3-nov 06:25. Script: `herramientas/medidor-contraste.mjs`. Evidencia: `evidencia/medidor/`.

## La causa de la variación (3-nov)

El mismo build 961ae2a dio caja/torre de noche a 375 **4.69/5.63** en una corrida y **4.27/5.34** en otra. No era ruido:
**eran dos tamaños de pantalla distintos.**

| Pantalla | Zoom | caja@suelo noche | torre@suelo noche |
|---|---|---|---|
| 375x812 | otro | 4.69 | 5.63 |
| 375x667 | 0.8152 | 4.27 | 5.34 |

Con 375 de ancho el alto cambia el zoom, y con él las posiciones D que caben y los píxeles que caen en cada sonda.
En evidencia/salto-noche se usaron las dos (375x667 y 375x812). Archivos: `prueba-rama-375x812-libre.json` y
`prueba-rama-375-libre1.json`.

Las otras sospechas no movieron nada en esta máquina: azar libre, bucle vivo, nubes y estrellas, vaivén y calentamiento dan
los mismos números en modo `libre` que en modo `fijo`. Igual quedan fijadas, porque cuestan poco.

## Cómo correrlo

1. Compila cada build a su carpeta, sin tocar el worktree de nadie (`flock`, uno a la vez):
   `flock /tmp/moki-pesado.lock npx vite build <raíz-del-worktree> --outDir <sitio>/master --emptyOutDir`
   Pasa siempre la raíz. Sin ella, vite compila la carpeta donde estás parado. Eso me pasó una vez.
2. Sirve la carpeta: `python3 -m http.server 5193 --bind 127.0.0.1 --directory <sitio>` (no es vite y no toca :5180).
3. Mide (headless, un navegador, una pestaña a la vez, se cierra solo):
   `flock /tmp/moki-pesado.lock node herramientas/medidor-contraste.mjs http://127.0.0.1:5193/master/,http://127.0.0.1:5193/rama/ 375 667 salida.json 0,1,2,3`
   Si separas varias URLs con coma, se miden en la misma corrida. Cuánto tarda: 375 ~20 s y 1280 ~70 s por build, con las 4 horas.

## Qué fija

- **Tamaño**: solo 375x667 y 1280x720. Con otro tamaño avisa "no es canónico". La salida anota el lienzo, el zoom y las D.
- **Azar**: `Math.random` sembrado antes de cargar y vuelto a sembrar en cada hora (semilla 1 + hora). Afecta el vaivén y los adornos.
- **Reloj**: el bucle de Phaser se duerme. La escena avanza a mano con `sys.step(T, 16.667)`: tweens, animaciones y update,
  sin dibujar. La foto sale de `game.step(T, 0)`, que dibuja sin mover nada. Ya no depende de cuántos cuadros por segundo
  da Edge por software.
- **Calentamiento**: antes de medir pasa por las 4 horas con el bucle vivo, espera a que la red quede quieta y luego un
  segundo más. El arte de noche de la rama llega en un archivo diferido.
- **El mismo instrumento para cualquier build**: las sondas son una copia de `run()` de `src/debug/contrast.js` de
  v2/salto-noche (incluye la sonda `suelo` de 2-nov) y se inyectan en la página. No dependen del src del build, así que
  master, que no tiene la sonda `suelo`, se mide igual que la rama. Las fórmulas no cambiaron.
- `src/` del juego no se tocó.

## Qué mide cada número

Todo es razón de contraste WCAG con luminancia por píxel. Hay 5 posiciones D delante de Moki (a 375: 160-317; a 1280: 260-540).

| Línea | Número de la puerta | Qué es |
|---|---|---|
| `torre@suelo`, `caja@suelo` | **bordeMin** | El canto del obstáculo contra el suelo, 4 px sobre groundY. Es el peor de los dos lados en las 5 D. **Es la puerta de noche (caja/torre).** `porD` es el peor lado en cada D. |
| `viga` | **porD** (borde) | Lo más claro del contorno de papel contra el fondo 9 px afuera, a media altura, de los dos lados. Es la sonda de borde aceptada por arte el 30-oct. **Ojo: el primer número, `min`, NO es el borde.** `min` es el peor punto INTERIOR del cuerpo contra el fondo (el 1.07/1.29 de la falsa alarma de las 04:23). |
| `torre`, `caja` (lados) | porD | El borde de la silueta contra el FONDO, a tres alturas. Es informativo y no es puerta. |
| `pieMin` | (no cuenta) | El cuerpo contra el suelo bajo el pie. Ahí cae la sombra de contacto. |

## Cuánto se mueve

- 3 corridas seguidas sobre master, cada una con la página recargada, a 375x667 y 1280x720, con las 4 horas y las 5 líneas:
  **los números salen idénticos al centésimo (0 %)**. Archivos: `master-375-x3.json` y `master-1280-x3.json`.
  Otro proceso aparte (`master-1280-c1.json`) también da idéntico.
- En la tabla se midió master antes y después de la rama en la misma corrida, y también dio idéntico.
- El modo `libre` (instrumento viejo) también repitió idéntico sobre la rama a 375x667. Lo que se movía era el tamaño de
  pantalla, no la corrida.

## Tabla master contra 961ae2a (v2/salto-noche), misma corrida, 3-nov

Archivos: `tabla-375.json` y `tabla-1280.json` (orden master, rama, master; las dos de master salen iguales).
De día (mañana, mediodía y tarde) master y rama son **idénticos** en todas las líneas. Abajo va solo la noche.

**375x667** (zoom 0.8152, D 160,199,239,278,317)

| Noche | master | 961ae2a |
|---|---|---|
| caja@suelo bordeMin | 1.89 | **4.27** |
| torre@suelo bordeMin | 2.33 | **5.34** |
| viga borde porD | 3.43, 6.02, 4.99, 4.92, 5.90 | 6.14, 7.22, 5.36, 5.97, 7.04 |
| viga min (interior) | 1.03 | 1.14 |
| caja lados porD | 2.90-3.14 | 2.41-2.66 |
| torre lados porD | 2.61-3.01 | 2.30-2.61 |

**1280x720** (zoom 1.3333, D 260,330,400,470,540)

| Noche | master | 961ae2a |
|---|---|---|
| caja@suelo bordeMin | 1.96 | **4.37** |
| torre@suelo bordeMin | 2.28 | **5.15** |
| viga borde porD | 4.43, 4.49, 3.07, 3.10, 3.11 | 7.26, 7.33, 7.64, 7.65, 7.65 |
| viga min (interior) | 1.28 | 1.44 |
| caja lados porD | 2.41-3.20 | 2.02-2.60 |
| torre lados porD | 2.30-2.91 | 2.05-2.70 |

Lectura: de noche, la rama queda **igual o mayor que master** en la puerta caja/torre@suelo y en el borde de la viga, en
las 5 D y en los dos tamaños. Las sondas de lados contra el fondo (no son puerta) bajan entre 0.2 y 0.6 en la rama. Es
lo mismo que el constructor ya había nombrado ("2.02 y 2.05 a 1280").

## Lo que NO está verificado

- Solo se probó en Edge headless con WebGL por software, en la Omarchy. No hay celular ni GPU real.
- Solo con la semilla de nivel 1 (`?seed=1`) y la semilla de azar 1.
- 375x812 y otros altos no están en la tabla. Si alguien mide a 375x812, no puede comparar contra esto.
- La copia de las sondas tiene que seguir igual a `src/debug/contrast.js`. Si alguien cambia esa sonda en src, aquí hay
  que copiar el cambio a mano.
