# P4z [feel] LA SOMBRA SE VE EN EL AIRE · caso (invitado game-feel, 14-nov, solo texto)

## Para quién y qué cree
Alguien juega en el celular (390x844) o en la laptop (1280x720), salta y mira a Moki. Cree que la sombra "es parte del dibujo". Cuando Moki sube, la sombra se funde con el pasto dorado y el ojo pierde dónde va a caer. Los 3 críticos de P4y lo dijeron igual en master: **en el aire la sombra no se ve**, a 390 y a 1280. El problema no es el tamaño ni el alfa bajo (P4y lo probó): es que la sombra **no contrasta** con el pasto.

## 1. Dónde se dibuja hoy y por qué se pierde
- Textura: `src/art/textures.js` `shadowTex()` (línea ~218). Elipse 128x32, degradado radial de **tinta #22211F**: alfa 1 en el centro, 0.85 al 70 % del radio, 0 en la orilla. Es suave: un tercio exterior es rampa.
- La comparte todo: Moki, cajas, timbres, bandera (`addShadow`). Cambiarla cambia todas las sombras.
- Moki: `src/scenes/RunScene.js` (~2322-2329, en p40), con `f = 1/(1 + aire/150)`:
  - ancho `96·(0.5+0.5f)·(1+sink·0.3)`, alto `22·(0.6+0.4f)`;
  - alfa `(0.28 + nightSh)·(0.4+0.6f)` (nightSh = 0 porque moonRim está apagado); 0 sobre la zanja; encima de la caja, rama aparte (56x10, 0.28).
- Pico del salto mantenido (aire ≈ 118 px, f ≈ 0.56): ancho ≈ 75 px, alto ≈ 17 px, **alfa ≈ 0.21**.
- Fondo: cae en `y = groundY+1`, abajo del canto crema (el suelo pintado `capa-suelo.webp` sube 12 px sobre groundY). Ahí está el pasto dorado con textura. En el código no hay hex del pasto (es webp). **Estimo #C8A050** (L* ≈ 68), con su textura variando unos ±8 a 12 L* (hay que medirlo en el paso 1).
- Cuenta (mezcla sRGB, como pinta Phaser):
  - pasto #C8A050 → L* ≈ 68;
  - tinta al 0.21 encima → ≈ #A68646 (165,134,70) → L* ≈ 58. **ΔL* ≈ 10 en el centro**, menos en la rampa.
  - Esa caída cabe dentro de lo que ya varía la textura del pasto (±8-12). Por eso el ojo no la separa: la sombra es "una parte más oscura del pasto", no una mancha con forma.
- Además el tono: tinta neutra encima de dorado da un café **agrisado** (baja la saturación). ARTE.md pide sombra cálida sin gris y atardecer ya lo corrigió así (`atardecer.js`: `sombra: '#5A2410'` porque la tinta "agrisaba el kraft"). Gris sobre dorado texturizado = camuflaje.

## 2. Propuesta: sombra de papel quemado con núcleo duro
Cambiar **color y forma del degradado**, no el tamaño. Solo la sombra de Moki: textura nueva `shadowMoki`, sin tocar `shadow` (cajas, timbres y bandera se quedan como master).

- **Color: café quemado #3A1A0C.** Su luminancia (Y ≈ 0.017) es la misma de la tinta (0.015): oscurece igual, pero es cálido y saturado y no agrisa. Es de la familia de `#5A2410` (sombra de tarde) y `0x56260e` (orilla del suelo), ya del juego.
- **Núcleo duro (recorte de papel, sin glow):** paradas del degradado radial 0 → 1, 0.6 → 1, 0.85 → 0.75, 1 → 0. El 60 % del radio va lleno: se lee como forma con borde, no como neblina. Nada de contorno aparte (eso se lee como hoyo).
- **Ancho: igual que master**, `96·(0.5+0.5f)·(1+sink·0.3)`. No se angosta arriba (P4y). Alto: `22·(0.7+0.3f)` (pico ≈ 19 px contra 17): un poco más de cuerpo para el núcleo.
- **Alfa: casi parejo.** `0.30·(0.85+0.15f)`: en el suelo 0.30 (master 0.28), en el pico 0.28 (master 0.21), con aire muy alto (trampolín) baja a 0.26 y nunca a 0.
- Cuenta en el pico (pasto estimado #C8A050): (158,121,60) → L* ≈ 53. **ΔL* ≈ 15** en todo el núcleo, contra ≈ 10 de master solo en el centro. Tono cálido.
- Gradualidad: la sombra sigue achicándose al subir (el ancho de master) y la del toque sigue siendo más ancha que la del mantenido. Lo que cambia es que **siempre se ve**.
- Movimiento reducido y Nada: la misma sombra (es dato, no juice). No va por nivel de juice.
- Se quedan como master: la zanja (alfa 0), la rama `this.sobre` (encima de la caja usa la textura nueva con su 0.28 y 56x10; café sobre kraft se ve bien), la profundidad (9 / 10.5).
- **Peso: ≤ +60 B gz.** Es un `shadowTex(color, paradas)` con parámetros (~+20-30 B) y dos números en config (`feelP4z: { color: 0x3a1a0c, a: [0.30, 0.85], alto: 0.7 }`, ~+25 B). Si pasa de 60, se pregunta al líder antes de recortar.

## 3. Sonda: lo que ve el ojo
`herramientas/sonda-p4z.mjs`, copia de `sonda-p4y.mjs` (misma semilla mulberry32, 60 fps con `sys.step`, god, Clásico, juice 2, render manual, cámara corregida, 3 saltos mantenidos + 3 toques, a 390x844 y 1280x720). Build + preview, headless, con flock.

Por cuadro, en **-200, -100, -33 ms y pico** (los del aire; 0 y +33 solo para ver que el contacto no cambió):
- Pasar los píxeles a **CIELAB L*** (no luminancia relativa: L* es lo que el ojo ordena).
- **Núcleo**: píxeles dentro del 60 % central de la elipse geométrica de la sombra (centro `sh.x, sh.y`, semiejes `displayWidth/2, displayHeight/2` por zoom).
- **Anillo**: misma franja de alto, de 1.2 a 2.0 semiejes hacia los lados, **en el cuadro con la sombra pintada** (es el pasto real que rodea, con su textura). Quitar del anillo los píxeles de Moki, polvo y monedas (contar alfa con `getPixelAlpha`, no `getBounds`).
- Reporta: `dL = media L*(anillo) − media L*(núcleo)`, `sigma = desviación de L*(anillo)`, `snr = dL / sigma`, y `tono = b*/a* del núcleo` (para el "sin gris": croma C* del núcleo ≥ croma del anillo × 0.8).
- **Umbral (pasa si en los 4 cuadros del aire, en los 6 saltos, en los 2 tamaños):**
  - `dL ≥ 12` **y** `snr ≥ 2.0`;
  - croma del núcleo ≥ 0.8 × croma del anillo (no agrisa);
  - en el contacto (0 ms) `dL` ≤ master + 6 (no se vuelve hoyo en el suelo).
- **No tapa**: con la sombra prendida y apagada, cuántos píxeles opacos de Moki y de monedas cambian (con `getPixelAlpha` sobre sus sprites). Debe ser **0** (la profundidad no cambia, así que por construcción da 0; la sonda lo confirma).
- Consola 0 errores, igual que siempre.

## 4. Paso 1 barato que la puede parar
Antes de tocar `src/`: correr la sonda **en master** (solo las medidas nuevas, sin cambio de juego) a 390 y 1280.
- Si master **ya da** `dL ≥ 12` y `snr ≥ 2` en el aire: el contraste no es el problema (lo es otra cosa, quizá el polvo o el ángulo de Moki). **Se para la pieza** y se anota.
- Si master da `snr < 2` (lo que espero: dL ≈ 8-10, sigma ≈ 5-8): sigue. De ahí sale también el **hex real del pasto** y su sigma; si el pasto real es más oscuro que #C8A050 (L* < 60), se sube el alfa del pico a 0.32 una sola vez y se vuelve a medir.
- Alternativa aún más barata (sin navegador): leer `assets/capas/capa-suelo.webp` con un script de 20 líneas, sacar media y sigma de L* en la franja donde cae la sombra, y hacer la cuenta de la sección 2 con esos números. Si con #3A1A0C a 0.28 la cuenta no llega a `snr ≥ 2`, no vale la pena construir.

Luego, la puerta de siempre: ciego en movimiento con 3 críticos a 390 y 1280, pregunta "¿dónde va a caer Moki?". Pasa con 2 de 3 que vean la sombra en el aire y 0 que digan "hoyo", "mancha", "sucio" o "flota".

## 5. Riesgos
- **Hoyo**: un núcleo duro y oscuro en el suelo puede leerse como agujero. Lo frenan el color cálido (un hoyo se ve negro-frío), el borde que sí se desvanece (0.85 → 0.75 → 0) y el tope de la sonda en el contacto (dL ≤ master + 6). Si el ciego dice "hoyo", se suaviza la parada 0.6 → 0.5 antes de bajar el alfa.
- **Mancha sucia**: café saturado sobre pasto puede verse como lodo. Por eso #3A1A0C y no un café más claro y anaranjado: muy oscuro, se lee sombra; claro, se lee mancha.
- **Noche**: el suelo está oscuro y la sombra café casi no se distingue de la tinta. No empeora a master (misma luminancia). Si moonRim se prende algún día, su `nightSh` suma igual que hoy.
- **Atardecer y otros paisajes por tramo**: en atardecer el suelo ya va con `#5A2410` y piezas multiplicadas a café; la sombra de Moki café queda de la misma familia (bien). En paisajes muy claros (papel crema) el núcleo duro puede verse más fuerte: correr la sonda también en un tramo claro y en atardecer (`?nivel=` del paisaje) y exigir el tope del contacto ahí.
- **Desentonar con las otras sombras**: Moki café y cajas en tinta. Es a propósito (Moki es el protagonista), pero si el director lo ve raro, la misma textura se puede pasar a cajas en otra pieza [arte], no en esta.
- **Paseo**: la sombra se ve aunque Moki no esté apoyado (`paseoRun`). Sin cambio de lógica; la textura nueva aplica igual.

## Lo que NO se repite
Alfa más bajo arriba, angostarla arriba, estirón, pose, rodillas redibujadas, estela recortada o adelgazada.
