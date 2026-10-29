# ANIMACION.md: Moki titere recortado ("Un salto mas")

Autor: animador del Estudio. Fecha: 2026-10-28. Base: commit c9d617f (T2b).
Arte: solo `assets/moki/moki-lado.webp` (y `moki-saluda.webp` para celebrar). Nada de arte nuevo. Nunca espejado. Parche en la oreja derecha (disco naranja con anillo, ya impreso en el casco). Visor sin cara. Casco rigido. Squash del cuerpo maximo 3%.

Unidades: "px" = pixeles logicos del mundo (banda 960x540, Moki mide 110 px, `k = 110/260 = 0.423` de la fuente). "src" = pixeles de moki-lado.webp. Angulos: positivo = horario = Moki inclinado/pateando hacia adelante (derecha). Tiempos en ms; referencia de 24 fps = 41.7 ms por cuadro.

## 0. Diagnostico del estado actual (por que Jorge lo ve deslizarse)

- `RunScene.stepMoki` (lineas 499-543) mueve UNA imagen: bob `|sin|`, tilt y `setScale(sx, sy)`. No hay piernas que cambien de forma: nada que el ojo lea como "paso".
- El squash escala la imagen completa, casco incluido (`sx = 1 + squash*0.6`): contradice "casco rigido". Con el titere, el squash deja de ser escala (ver 2.3).
- `runPhase += dt*speed/48` solo alimenta el bob; no hay relacion pie-suelo.
- Al chocar, `update` hace `return` y congela todo; no hay tropiezo. No hay celebracion en checkpoint. `dust()` es unico, sin niveles de juice.

## 1. Plan de recorte de moki-lado.webp

### 1.1 Lo que SI y NO hay en la imagen (hallazgos de la vista lado)

- Se ve UNA sola pierna (la cercana) con rodillera beige y bota negra con suela kraft. La pierna lejana esta oculta tras ella. Hueco confirmado, resuelto en 1.4.
- El brazo, en perfil, esta escorzado: es el disco gris con anillo naranja sobre el torso. No es un brazo que se pueda balancear; se deja en el cuerpo (opcional: ver Nivel 2).
- La mochila (caja kraft con boton negro) queda a la izquierda del torso; el torso detras de ella no esta dibujado (por eso la mochila se DUPLICA, no se arranca: ver 1.3).
- El disco-oreja con parche naranja y la etiqueta MOKI estan dentro del casco: viajan con el cuerpo rigido. Nunca se recortan aparte.

### 1.2 Piezas y cajas (EN LA FUENTE)

Medidas tomadas a ojo sobre la imagen de ~130x260 src. Tolerancia +-8 px. OBLIGATORIO: el constructor lee el ancho/alto reales con `this.textures.get('moki').getSourceImage()`, convierte con las fracciones de la tabla, y revisa con un overlay de depuracion (`?anim=debug`, ver 6.4) antes de dar por buenos los cortes. La regla manda sobre los numeros: cortar siguiendo costuras y cantos del propio dibujo.

| # | Pieza | Caja src (x0,y0 - x1,y1) | Fraccion (W,H) | Pivote src | Notas de corte |
|---|---|---|---|---|---|
| 1 | CUERPO (casco + visor + oreja con parche + etiqueta MOKI + torso + cinturon + mochila de fondo + disco-brazo) | 0,0 - 130,190 | 0-1 x 0-0.73 | cadera (72,186) | Corte inferior por el borde de abajo del cinturon/pelvis, ligeramente curvo (sonrisa) de 190 a 196. UNA sola pieza rigida: el casco jamas se mueve respecto al torso. |
| 2 | PIERNA CERCANA (muslo + rodillera + bota) | 35,164 - 107,260 | 0.27-0.82 x 0.63-1.00 | cadera (72,186) = local (37,22) | Arranca 26 src por encima del pivote para tener "lengueta" oculta bajo el cuerpo (ver 1.5). Contorno por poligono (sin recoger cuerpo ni mochila). |
| 3 | PIERNA LEJANA | copia de la pieza 2 | igual | cadera (72,186) | No existe en el dibujo: ver 1.4. |
| 4 | MOCHILA (sobrepuesta, copia) | 0,115 - 40,190 | 0-0.31 x 0.44-0.73 | union con la correa (38,130) | Copia ENCIMA del cuerpo; el original queda debajo como relleno. Ver 1.3. |
| 5 | BOTA (Nivel 2) | 29,226 - 107,260 | 0.22-0.82 x 0.87-1.00 | tobillo (68,232) | Solo si el Nivel 2 se aprueba: la bota gira sobre el tobillo (talon/punta). La pierna se corta justo arriba del puno de la bota y llega 8 src dentro de ella. |
| 6 | DISCO-BRAZO (Nivel 2, opcional) | 44,120 - 96,166 | 0.34-0.74 x 0.46-0.64 | centro (70,143) | Copia sobre el cuerpo; solo se desplaza +-1.5 px en contrafase con la pierna cercana. Si se ve pegado, se omite. |

Nivel 1 (obligatorio): piezas 1, 2, 3, 4. Es suficiente para un ciclo de correr legible con 4 piezas moviles.
Nivel 2 (recomendado, +2 a 3 horas): bota separada (5) en ambas piernas y disco-brazo (6). Da talon-punta y rodado de pie.
Sin rodilla: las piernas son tubos de relleno sin articulacion. NO se corta por la rodilla (la rodillera beige partida se veria mal). La "rodilla" se simula con la recogida (retract, ver 2.1).

### 1.3 La mochila (copia, no recorte)

No se arranca: se copia. El cuerpo conserva su mochila original (relleno estatico) y la pieza 4 va encima con el mismo pixel exacto. Se mueve con retraso (+-2.5 grados, +-1.5 px). Como es el mismo dibujo, cualquier rendija que asome es la misma pieza: se lee como grosor de cartulina, no como hueco. Sombra de capa de 2 px (ver 1.5) debajo de la pieza 4 para que se lea como pegada con cinta.

### 1.4 La pierna lejana (hueco) sin inventar arte

Solucion A (por defecto): la pieza 3 es el MISMO recorte de la pierna cercana (arte oficial), con estas diferencias:
- Detras de la cercana y detras del cuerpo (orden en 1.6).
- `setTint(0xC9BFB1)` (multiplica ~78%): "papel en sombra". Es un tono derivado del propio traje, no un color nuevo; verificar que no vira a rojo/gris azulado.
- Desplazada -5 px en x y +0 en y respecto a la cercana, para que no se vea como una sola pierna.
- Contrafase exacta de 4 cuadros respecto a la cercana.
- Sombra de capa de 2 px entre ambas piernas.
Solucion B (si el director rechaza el tinte): pierna de papel dibujada en canvas con el naranja del traje (el naranja dominante de la pierna cercana, muestreado de la imagen) y bota #22211F con canto kraft #B99168 de 2 px. Solo si A falla en revision; el borde de B sera mas liso que la foto, y eso rompe "no mezclar vectores lisos con fotos". Por eso A primero.

### 1.5 Como se tapan las uniones (cero huecos)

- Cadera: la pieza 2/3 sube 26 src (11 px) por encima del pivote, DETRAS del cuerpo. El cuerpo termina en "sonrisa" y cubre la lengueta. A +-35 grados la lengueta no asoma porque queda dentro del ancho de la pelvis (verificar con overlay).
- Lengueta: las filas superiores de la pierna (y 164-176 src) se rellenan estirando hacia arriba la fila y=178 src (clamp-to-edge): es naranja del traje, nunca rayas de cinturon. Si el corte arrastra teal del cinturon, recortar el poligono mas abajo.
- Recogida de pierna (retract): la pierna se DESLIZA hacia arriba por dentro de la pelvis (maximo 6 px). La lengueta de 11 px lo permite.
- Sombras de capa (luz arriba-izquierda, sombra abajo-derecha): una silueta de cada pieza superior, tintada #22211F al 18%, desplazada (+1.5, +2) px, dibujada justo debajo de ella. Es el canto de cartulina. Maximo 4 sombras de capa por Moki (cuerpo sobre piernas, pierna cercana sobre lejana, mochila sobre cuerpo, bota sobre pierna).
- Antialias: recortar a resolucion fuente con poligono suavizado 0.5 src; no recortar a la rejilla; la pieza se escala despues con filtro lineal.

Cortar siempre en canvas al cargar: `ctx.save(); clip(poligono); drawImage(lado, -x0, -y0); textures.addCanvas('moki-leg', canvas)`. Un modulo `src/art/mokiRig.js` lo hace una vez en `create()`.

### 1.6 Orden de capas (de atras hacia adelante) y jerarquia

Contenedor raiz `mokiRoot` en (px, y_pies), depth 12, sin escala ni flip. Hijos en este orden:

1. `legFar` (+ `bootFar` Nivel 2), depth local 0, con tinte
2. sombra de capa de `legNear` sobre `legFar`
3. `legNear` (+ `bootNear`)
4. sombra de capa del cuerpo sobre las piernas
5. `body` (casco, torso y mochila de fondo)
6. sombra de capa de la mochila
7. `packSwing`
8. (Nivel 2) `armDisc`

`mokiShadow` (sombra de contacto, depth 9) y las particulas (depth 13) quedan fuera del contenedor.

Implementacion: cada pieza es un `Image` con `setOrigin(pivotX/ancho, pivotY/alto)` y se posiciona en la cadera (o union) en coordenadas del contenedor; asi `setAngle()` rota alrededor del pivote sin matematicas extra. Escala unica del contenedor `k = 110/260`. Posicion de pies: el fondo de la bota queda en `groundY + 2` como hoy. La hitbox (`player.width/height`) NO cambia.

## 2. Reglas comunes de animacion

### 2.1 Estructura de pose

```
pose = {
  nearTheta, nearRetract, nearBoot,   // grados, px (>=0 hacia arriba, 0..6), grados
  farTheta,  farRetract,  farBoot,
  bodyDy,                              // px, + = hacia abajo (hundir). Rango -2..+3.3
  bodyTilt,                            // grados, cuerpo entero sobre la cadera, max +6
  packAngle, packDy                    // controlados por retraso (2.4), no por tabla
}
```

Cada estado entrega una `poseObjetivo`; la pose mostrada es `mezcla(poseAnterior, poseObjetivo, easeOutCubic(t/blendMs))`. Nunca saltos de una pose a otra. Cada columna se interpola con Sine.inOut entre keyframes salvo el apoyo (2.2).

### 2.2 Apoyo sin patinar (la formula)

Se llama "apoyo" al tramo en que la pierna toca el suelo. El suelo corre hacia atras a `v` (px/s, `this.speed`, el mismo que mueve `this.dist`). Para que el pie no se deslice, durante el apoyo el tobillo se bloquea al suelo:

```
L        = 30           // px: cadera al fondo de la bota (70 src * 0.423)
theta0   = 32 deg       // angulo de contacto/despegue (dentro de 25-35)
D        = 2 * L * sin(theta0)  // = 31.8 px: recorrido del pie en apoyo
duty     = 0.375        // apoyo = 3 de 8 cuadros por pierna (el resto: vuelo y balanceo)
CICLO_PX = D / duty     // = 84.8 px de suelo por ciclo completo (dos pasos)

fase (ciclos):   phi += v * dt / CICLO_PX
periodo (s):     T = CICLO_PX / v
```

Razon: el apoyo de cada pierna dura `duty * T` y en ese tiempo el suelo avanza `v * duty * T`, que debe ser igual a `D`; de ahi `T = D / (duty * v)`. Resultado a las velocidades del juego:

| v (px/s) | T ciclo | cuadros a 24 fps | pasos/s |
|---|---|---|---|
| 320 (inicio) | 265 ms | 6.4 | 7.5 |
| 450 | 188 ms | 4.5 | 10.6 |
| 560 (maximo) | 151 ms | 3.6 | 13.2 |

Nota para el lider: el brief pide "8 cuadros por zancada". Con piernas de 30 px, 8 cuadros a 24 fps (333 ms) solo se cumplen si v = 255 px/s, menos que la velocidad inicial. Prevalece "los pies no patinan": la cadencia sigue a la velocidad. Si el director juzga la cadencia frenetica a v alta, las perillas son `theta0` (hasta 35) y `duty` (hasta 0.42), no la desincronizacion del suelo.

Posicion del tobillo durante el apoyo (s va de 0 a 1 linealmente en el tiempo, NO con easing: el avance constante del mundo es la unica excepcion permitida a "nada lineal"):

```
x_tobillo(s) = L*sin(theta0) - s * D             // relativo a la cadera, px
theta(s)     = asin( x_tobillo(s) / L )          // angulo de la pierna
```

Con theta0 = 32: contacto +32, mitad 0, despegue -32. La bota rueda encima (Nivel 2): -12 grados (talon) al contacto, +4 en el paso, +28 al despegue; se acepta un error residual de hasta 3 px.

Balanceo (el pie en el aire): theta va de -32 a +32 con Sine.inOut en el tiempo restante del ciclo, con `retract` de 0 a 7 y de vuelta a 0 (ver tabla 3.1).

### 2.3 Squash que respeta casco rigido

NO se escala el cuerpo ni el casco (`scale` del cuerpo siempre 1.0, sin `sx`). El 3% maximo se traduce en hundimiento: `bodyDy <= 3.3 px` (3% de 110) con las piernas recogiendo la misma cantidad (`retract` +3) para que los pies sigan en el suelo. Estiron de despegue: `bodyDy` hasta -2 px (2%), nada mas.

### 2.4 Balanceo de mochila con retraso

`packAngle` y `packDy` siguen al movimiento del cuerpo, no a la tabla:

```
objetivoAngulo = -0.8 * velocidadVerticalCuerpo   // px/s -> grados, saturado a +-2.5
packAngle += (objetivoAngulo - packAngle) * min(1, dt * 11)   // retraso ~2 cuadros (80 ms)
packDy    += (-bodyDyVel * 0.015 - packDy) * min(1, dt * 11)  // saturado a +-1.5 px
```

En el aire: apex +1 px (flota) y al caer baja +2 px con retraso. Sin rebote (ya esta amortiguado, resorte sobreamortiguado).

### 2.5 Inclinacion

`bodyTilt` rota solo el cuerpo (pieza 1 + mochila) sobre la cadera; las piernas no se inclinan con el. Correr: +3 grados constantes y +-0.8 con el bob. Aire: ver tabla de salto. Maximo +6 (ARTE.md seccion 10). Ya no se usa el tilt sobre la imagen completa.

## 3. Ciclos y tablas

### 3.1 CORRER (8 cuadros por ciclo; 24 fps de referencia)

Pierna cercana. La lejana es la misma tabla desfasada +4 cuadros. Angulo en grados, retract en px, bota en grados (Nivel 2).

| Cuadro | Fase | theta | retract | bota | bodyDy (px) | bodyTilt | Nota |
|---|---|---|---|---|---|---|---|
| 0 | Contacto (cercana al frente) | +32 | 0 | -12 | +0.5 | +3.0 | Talon toca. Polvo opcional (Mucho) |
| 1 | Bajada | +10 | 0 | -3 | +1.5 | +3.4 | Cuerpo en su punto mas bajo |
| 2 | Paso (apoyo vertical) | -10 | 0 | +4 | 0 | +3.0 | Pierna lejana cruza adelante |
| 3 | Subida / despegue | -32 | 0 | +28 | -1.5 | +2.6 | Punta empuja; cuerpo en lo mas alto; vuelo |
| 4 | Balanceo atras | -26 | 3 | +22 | +0.5 | +3.0 | Contacto de la lejana |
| 5 | Balanceo | -8 | 6 | +10 | +1.5 | +3.4 | Pie recogido |
| 6 | Balanceo / paso | +8 | 7 | +2 | 0 | +3.0 | Maxima recogida, cruza |
| 7 | Alcance | +24 | 3 | -8 | -1.5 | +2.6 | Punta arriba, listo para contacto |

- Cuerpo: `bodyDy` peak-to-peak 3 px (cae en contacto, sube en el paso; en rango de 2 a 4).
- Curvas: apoyo (cuadros 0 a 3) lineal ligado a `v` (2.2). Balanceo (3 a 8): Sine.inOut por segmento. `bodyDy` y `bodyTilt`: `cos(2*pi*2*phi)`, es decir Sine, dos latidos por ciclo.
- Limites de apoyo: el dibujo ya no depende de `dt` sino de `phi`, para que a v distintas la cadencia suba sola.
- Despegue de carrera tras aterrizar: `phi = 0` (contacto de la cercana).
- Mochila: segun 2.4.

### 3.2 SALTAR (la fisica manda: sin retrasar la entrada)

La anticipacion NO retrasa el despegue (la velocidad vertical empieza en `press`). Se superpone en los primeros 90 ms, como hoy.

| t desde despegue (ms) | Estado | near theta / retract | far theta / retract | bodyDy | bodyTilt | Easing | blendMs |
|---|---|---|---|---|---|---|---|
| 0 a 90 | Anticipar (agacharse) | +32 -> +14 / 0 -> 3 | -26 -> -14 / 3 -> 3 | 0 -> +3.3 -> 0 (Sine) | +3 -> 0 | Sine.inOut | 40 |
| 90 a 150 | Estiron de despegue | +14 -> +28 / 0 | -14 -> -22 / 0 -> 2 | 0 -> -2 | 0 -> +2 | Cubic.out | 60 |
| 150 a apex | Subida (piernas recogidas) | +38 / 6 | -22 / 4 | -2 -> -1 | +2 -> +3 | Cubic.out (por `r = -vy/720`) | 80 |
| apex (|vy| < 120) | Apex (flotar) | +30 / 5 | -8 / 4 | -1 -> 0 | +1 | Sine.inOut | 80 |
| caida | Caida (apertura) | +30 -> +34 / 5 -> 0 | -8 -> -28 / 4 -> 0 | 0 | +3 -> +6 (por `vy/700`) | Cubic.in | 60 |

Notas:
- Subida y apex se dirigen por velocidad (`r = clamp(-vy/720, 0, 1)` y `f = clamp(vy/700, 0, 1)`), no por tiempo, porque el salto es variable (toque corto o mantener).
- Bota (Nivel 2): subida +14/+20 (punta abajo), apex +8/+12, caida -6/-10 (punta arriba, se prepara).
- Mochila: ver 2.4.
- Salto corto (tap): la subida dura poco; la pose salta de estiron a caida sin apex largo. Nunca forzar mas de 150 ms de estiron.

### 3.3 ATERRIZAR

| t desde contacto (ms) | Que pasa | Valores | Curva |
|---|---|---|---|
| 0 | Contacto: la mezcla entra a `corrida cuadro 0` | near +30, far -20 / 5, bodyDy +3.3, retract +3 en ambas | blend 60 ms Cubic.out |
| 0 a 130 | Aplastar y asentar (squash = hundimiento, 2.3) | bodyDy 3.3 -> 0, retract 3 -> 0, bodyTilt 6 -> 3 | Cubic.out |
| 0 | Polvo de papel (seccion 5) y sombra crece | sombra: ancho x1.12 -> x1.0 en 130 ms | Cubic.out |
| 130 | Retoma ciclo de correr con `phi = 0` | pie cercano en contacto | - |

La sombra de contacto: en el aire se encoge y aclara (formula actual `f = 1/(1 + air/150)` sirve); al caer crece. Se conserva el codigo.

### 3.4 FALLAR (tropiezo de titere, sin violencia)

ARTE.md seccion 6 pide cortar a `moki-tres-cuartos.webp`. Decision del lider para esta tarea: titere. Se deja el corte a la pose oficial como opcion del director (ver Huecos).

| t desde choque (ms) | Que pasa | Valores | Curva |
|---|---|---|---|
| 0 a 60 | Hit-stop: todo congelado (mundo y Moki) | - | - |
| 60 a 280 | Tropiezo: la punta se atora y el cuerpo gira hacia adelante sobre las botas | pivote del cuerpo = suelo bajo la bota cercana; bodyTilt 0 -> +6 (maximo ARTE); near theta +38, far theta -18 / 4; bodyDy +8 (cae 6 a 10 px) | Cubic.out |
| 60 a 280 | El mundo frena | v -> 0 en 220 ms | Cubic.out |
| 280 a 500 | Se asienta, sin rebote | quieto; la tarjeta de leccion aparece segun UI | - |

- No hay giro de mas de 6 grados (ARTE.md: rotaciones maximas 6). El "giro corto" lo da el pivote en las botas y el hundimiento de 8 px, no un voltereta.
- El juego hoy hace `return` en `update` cuando `dead`. Debe seguir llamando a `stepMoki`/`stepWorld` con la desaceleracion; solo se detiene la entrada y las colisiones.
- Movimiento reducido: sin hit-stop ni rotacion; solo hundir 8 px y quedar.

### 3.5 CELEBRAR (checkpoint)

Saltito cosmetico (no cambia `this.y` ni la hitbox) cuando `cp.passed` se activa:

| t (ms) | Que pasa | Valores |
|---|---|---|
| 0 a 80 | Agacharse | bodyDy +2, retract +2 |
| 80 a 330 | Saltito de 14 px | `vy0 = sqrt(2*2200*14) = 248 px/s`, tiempo de vuelo 225 ms, pose de salto al 60% de amplitud |
| ~120 (cerca del apex) | Cambio a `moki-saluda.webp` (arte oficial, brazo arriba), fundido cruzado de 2 cuadros (83 ms) | escala para que la altura total quede en 110 px y los pies en el mismo suelo |
| 330 a 450 | Aterriza, aplastar 2 px, asentar | segun 3.3 |
| 450 a 520 | Vuelve al titere con fundido cruzado de 2 cuadros | `phi = 0` |

- Si Moki esta en el aire al pasar el checkpoint o el jugador presiona salto durante el saltito: cancelar la celebracion de inmediato y volver al titere (la mecanica manda).
- `moki-bandera.webp` NO se usa: trae la pila de libros y una bandera propias, chocan con el checkpoint del mundo.
- `moki-saluda.webp` mira a la derecha y trae el parche en su sitio; nunca se espeja. Si el cambio de pose parece "pop", el director puede pedir la variante solo-saltito (sin pose).
- Sin confeti en Nada/Poquito; Mucho 16, Hardcore 40 (seccion 5).

## 4. Movimiento reducido (`prefers-reduced-motion: reduce`)

- Se mantienen las piernas corriendo (es la mecanica; si no, Moki desliza), con amplitud `theta0 = 20` y sin recogida (`retract` 0) ni bota.
- Se apagan: bodyDy de carrera, bodyTilt (queda 0), balanceo de mochila, squash/hundimiento, estiron, hit-stop, giro del tropiezo, saltito, particulas.
- La sombra marca el salto (se conserva). Sin cambio de pose en el checkpoint.
- Aviso: si el director interpreta "sin rotaciones" como incluir las piernas, la alternativa es alternar dos poses de pierna a 6 Hz sin interpolar. Peor para la lectura; solo si lo pide.

## 5. Particulas de papel por nivel de juice

Colores: `#B99168` (kraft), `#F4E8D5` (papel), `#FF6B35`, `#FFA500` (solo checkpoint/recompensa). Texturas: `chipKraft`, `chipPaper` existentes; agregar `chipOrange` y `chipAmber` procedurales en `textures.js`. Formas: rectangulos de 3x5 a 4x7 px con canto 1 px mas oscuro (nada de circulos brillantes ni destellos). Sin glow. Reserva (pool) de 90 piezas; si se agota, se reutiliza la mas vieja. No mas de 90 vivas en total (techo de Hardcore).

Configuracion: `CONFIG.juice` con 0=Nada, 1=Poquito (por defecto hasta que el menu exista), 2=Mucho, 3=Hardcore.

| Evento | Nada | Poquito | Mucho | Hardcore |
|---|---|---|---|---|
| Aterrizaje (impacto > 260 px/s) | 0 | 3 a 5 chips kraft/papel | 6 a 8 chips + 1 nubecita de papel (rectangulo 10x4 que se desvanece) | 10 a 12 chips, algunos naranjas |
| Patada al despegar de carrera | 0 | 0 | 1 chip cada 2 pasos | 2 chips cada paso |
| Recoger pieza | 0 | pulso existente (200 ms) + 3 chips | 6 chips + onda chica (anillo de 1.5 px que crece r 8 a 22 en 220 ms, alpha .5 a 0) | 10 chips + onda + combo x2..x5 |
| Checkpoint | 0 | bandera se despliega (280 ms) | confeti de 16 trozos desde la punta de la bandera | confeti de 40 + escombro ligero |
| Choque / fallo | 0 | 3 chips en el punto de choque | 6 chips | 10 chips + shake corto |
| Screenshake | 0 | 0 | 0 | 2 px, 120 ms, nunca en HUD |

Parametros de fisica (logicos, por particula):

| Tipo | Origen | Velocidad inicial | Gravedad | Vida | Giro | Curva de alpha |
|---|---|---|---|---|---|---|
| Polvo de aterrizaje | atras del talon, en el suelo (x-14..x+2, y=g-2) | vx -40..-110 (derivado con el mundo), vy -60..-130 | 520 | 320 a 380 ms | 90 a 360 grados/s | 1 hasta 60% de la vida, luego Cubic.in a 0 |
| Patada | punta del pie al despegar | vx -60, vy -50 | 520 | 240 ms | 180 | igual |
| Recoger | centro de la ficha | radial 60..120 | 400 | 280 ms | 180 | igual |
| Confeti | punta de la bandera | vy -180..-300, vx -60..+120 | 380 + oscilacion lateral sine (+-12 px, 3 Hz) | 900 ms | 360 | Cubic.in en los ultimos 300 ms |

- Todas las particulas se mueven ademas con el mundo (`x -= step`) para no flotar en el aire.
- Ningun efecto en loop infinito; todo termina por vida.
- Con movimiento reducido: ninguna particula (el pulso de ficha sigue, 120 ms).
- Hoy `dust()` y `collect()` usan tweens por trozo; migrar a un pool con una sola actualizacion en `update` (menos recoleccion de basura en celular).

## 6. Parallax: mas profundidad (en coordinacion con ARTE.md seccion 7)

ARTE.md fija 4 capas y permite primer plano de 0 a 2 elementos a 1.3x. Lo siguiente respeta eso; los puntos 3 y 4 piden OK del director de arte porque amplian la seccion 7.

1. Primer plano a 1.3x (ya permitido por ARTE). Tiras de cartulina y hojas de papel, 2 por pantalla como maximo, separadas por mas de 2.5 s. Zona permitida: debajo del suelo (y >= groundY+24, altura 40 a 70 px, saliendo del borde inferior) y colgando del borde superior (y <= top+70). NUNCA entre `groundY-130` y `groundY+10` (carril de obstaculos y Moki). Mismo canto de papel y sombra suave; sin transparencia.
2. Pasar por delante de Moki sin taparlo: una tira baja puede cruzar el area de los pies solo si queda >= 24 px por debajo de `groundY` (no toca la bota). Con la lectura de salto intacta. Con movimiento reducido: apagado.
3. Parallax vertical con el salto (profundidad real): las capas se desplazan abajo al subir Moki: `capa.y += (groundY - y_moki) * f`, con f = 0.02 (lejos), 0.04 (medio), 0.06 (suelo trasero). Maximo +-4 px. Sin zoom de camara (ARTE lo prohibe). Apagado en reducido.
4. Dividir la capa media en dos bandas (0.45x y 0.7x) con la banda cercana 6% mas oscura. Mas escalones de profundidad con los mismos recursos; mismo tamano de textura.
5. Variantes para evitar repeticion: 3 arboles + 2 postes + 1 pila de libros por tira; hoy la misma tira se repite y se nota.
6. Sombra de contacto del terreno medio contra el lejano: una sombra horizontal blanda de 8 a 12 px (ARTE ya la define; revisar que este activa en la capa medio).
7. Las capas siguen a `v`: ya usan `dist * factor`. Con `this.speed` creciente el mundo acelera parejo; no requiere cambio.
8. Cuidar el cosido de la tira: seam visible a 375 px.

## 7. Lista de cambios para el constructor

1. Nuevo `src/art/mokiRig.js`: recorta `moki-lado` en texturas (cuerpo, pierna, mochila, bota, disco), crea el contenedor de piezas con pivotes, tinte de la pierna lejana y sombras de capa; exporta `createMokiRig(scene)`, `updateMokiRig(rig, state, dt)`, `applyPose(rig, pose)`.
2. `RunScene.preload/create`: mantener `load.image('moki', ...)`; en `create`, llamar `createMokiRig`; cargar `moki-saluda.webp` como `mokiSaluda`.
3. `RunScene.stepMoki` (499-543): reemplazar por `updateMokiRig` con el estado `{grounded, vy, speed, landAt, takeoffAt, dead, celebrating, reduced}`. Quitar `setScale(sx,sy)`, `runPhase/48`, `|sin|` y el tilt de imagen entera.
4. `restart()`: reiniciar `phi=0`, pose, `hop`, `deadFor` y las particulas.
5. `update()` (314-334): cuando `dead`, seguir llamando `stepWorld` con `speed` decreciente y `stepMoki` (para el tropiezo) y retrasar `restart` ~500 ms como hoy.
6. `CONFIG.art`: agregar `legLen:30`, `theta0:32`, `duty:0.375`, `cycleBobPx:3`, `tiltRunDeg:3`, `hopPx:14`, `hitStopMs:60`, `packLagHz:11`, `reducedTheta0:20`. Quitar `tiltRiseDeg`/`runBobPx` si quedan sin uso. `CONFIG.juice` nuevo.
7. Particulas: pool de 90 en `src/art/particles.js`; sustituir `dust()` y `collect()`; agregar chips naranja y ambar en `textures.js`.
8. Parallax: primer plano, offset vertical por salto y variantes (seccion 6) cuando el director de arte de el OK de los puntos 3 y 4.
9. Depuracion: query `?anim=debug` que dibuja pivotes (puntos), cajas de corte, y escribe en pantalla `deslizamiento` (px por apoyo) y `phi`. Query `?speed=320|450|560` fija `v` para capturas comparables. Sin esto el probador no puede medir.
10. No tocar: hitbox, fisica del salto, texturas del mundo, HUD.

## 8. Criterios PASS/FAIL para revisar capturas o GIF

Como capturar: GIF/video de 2 s a 24 fps en 1280 y en 375, con `?speed=320`, `?speed=560`, un salto corto, un salto largo, un aterrizaje, un choque y un checkpoint. Revisar cuadro a cuadro.

| # | Criterio | PASS | FAIL |
|---|---|---|---|
| 1 | Piernas alternan | Cercana y lejana en contrafase (4 cuadros); angulos entre +-25 y +-35 | Las dos iguales o una quieta |
| 2 | Sin patinar | Con `?speed=...`, el pie en apoyo se mueve con el suelo: deslizamiento <= 3 px por apoyo (lectura de `?anim=debug`); a ojo, un guijarro del suelo tapado por la bota no se arrastra | El pie se arrastra sobre el suelo o corre a otra velocidad que las tiras del suelo |
| 3 | Cadencia con la velocidad | Periodo ~ 85/v s (265 ms a 320, 151 ms a 560) +-15% | Ciclo fijo sin importar v |
| 4 | Cuerpo vive | Baja en contacto y sube en el paso, 2 a 4 px | Sin vaivén o con mas de 5 px |
| 5 | Mochila | Retraso de 1 a 3 cuadros, +-2.5 grados; sin rendijas visibles a 2x | Mochila pegada o rota |
| 6 | Cero huecos | A 4x de zoom, en todos los cuadros no se ve fondo entre piezas ni la lengueta de la pierna asoma | Hueco, linea clara, teal del cinturon en la pierna |
| 7 | Casco rigido y squash | Escala del cuerpo exactamente 1.0; hundimiento <= 3.3 px; casco sin deformacion | Cualquier escala del casco; hundimiento > 3.3 px |
| 8 | Nunca espejado | Parche MOKI/oreja en el casco a la derecha en todos los cuadros; visor sin cara | Cualquier flip, parche en otro sitio, ojos o boca |
| 9 | Salto | Anticipacion 80 a 100 ms sin retrasar el despegue; piernas recogidas arriba; apertura al caer; tilt <= 6 | Piernas iguales que al correr; anticipacion que retrasa la entrada |
| 10 | Aterrizaje | Polvo (segun juice), sombra crece, asienta en 130 ms, sin rebote ni salto de pose (>6 grados de un cuadro a otro) | Pop de pose o rebote |
| 11 | Fallo | Hit-stop 60 ms, tropiezo con giro <= 6 y caida 6 a 10 px, sin rebote, el mundo frena | Mundo y Moki se congelan en seco, o voltereta |
| 12 | Celebrar | Saltito 14 px; con pose saluda y sin pop; si hay salto del jugador se cancela | Hop que cambia la hitbox o impide saltar |
| 13 | Sombra de contacto | Presente siempre; se encoge y aclara en el aire | Moki sin sombra |
| 14 | Movimiento reducido | Piernas siguen, sin bob/tilt/squash/particulas | Efectos activos |
| 15 | 60 fps | Sin saltos de rendimiento en gama media; <= 90 particulas | Tirones o > 90 |
| 16 | Parallax | Primer plano fuera del carril; capas con 4 px max de offset vertical | Primer plano tapa obstaculos |

Veredicto con formato `ANIM: APROBADO` o `ANIM: AJUSTAR` con maximo 8 puntos. Un FAIL en 1, 2, 6, 7 u 8 es AJUSTAR automatico.

## 9. Revision de la version actual (commit c9d617f, evidencia/t2b-*)

Vi `t2b-1280-correr.jpg` y `t2b-375-aire.png`. No ejecute el juego; la lectura del codigo confirma lo que muestran las capturas.

ANIM: AJUSTAR

1. Piernas inmoviles: una sola imagen en todo el ciclo; ningun pie cambia. Causa del comentario de Jorge. Resolver con la seccion 1 y 3.1.
2. El pie no marca el suelo: `runPhase` no esta atado a `v` ni al contacto. Resolver con la formula 2.2.
3. Squash sobre la imagen completa incluyendo casco (`setScale(sx, sy)`): contradice casco rigido. Resolver con 2.3.
4. Aire (375): Moki inclinado pero con la misma silueta; sin piernas recogidas ni apertura. Resolver con 3.2.
5. Aterrizaje: solo squash y 3 a 5 chips; falta el cuadro de contacto de piernas y la mezcla con el ciclo. Resolver con 3.3.
6. Choque: el juego congela mundo y Moki y a los 500 ms reinicia; no hay tropiezo. Resolver con 3.4 y el cambio 5 de la lista.
7. Sin celebracion en checkpoint ni niveles de juice; Poquito/Mucho/Hardcore no existen. Resolver con 3.5 y la seccion 5.
8. Parallax: 4 capas correctas, pero sin primer plano ni parallax vertical; el diorama aun se ve plano al saltar. Seccion 6.

## 10. Huecos y decisiones abiertas

- Pierna lejana: no existe en el dibujo. Se usa la copia de la cercana con tinte (1.4). Pedir al director de arte que mire el tinte en la primera captura; si no convence, solucion B (pierna de papel dibujada) o escalar a Jorge una pose de zancada (ARTE.md 14).
- Cajas de corte: estimadas a ojo; deben verificarse con overlay antes de codificar la animacion (1.2).
- Rodilla: no hay articulacion; la recogida desliza la pierna bajo la pelvis. Si se ve rigido, el limite es del arte oficial.
- Cadencia vs. 8 cuadros: ver nota en 2.2; el lider decide si prima la cadencia de 8 cuadros o el no patinar.
- Fallo: ARTE.md pide pose tres-cuartos o parado; aqui se hace con el titere. El director puede pedir el corte a `moki-tres-cuartos.webp` a mitad del tropiezo.
- Celebrar: se propone `moki-saluda.webp`; pedir OK del director si el cambio de pose se ve como "pop".
- Movimiento reducido: la lectura de "sin rotaciones" para las piernas queda como decision del director (seccion 4).
- Parallax: los puntos 3 y 4 amplian ARTE.md seccion 7 y necesitan OK del director.

## Decisiones del líder (29-oct)
1. Va el nivel 1 del títere (4 piezas). El nivel 2 (botas, disco-brazo) entra solo si el nivel 1 tiene PASS y queda tiempo.
2. Pierna lejana: copia de la cercana con tinte 0xC9BFB1 y desfase de 4 cuadros, provisional. El director de arte la juzga con capturas. Si la rechaza, se escala la pose de zancada; no se dibuja aquí.
3. Las cajas de corte se miden con overlay sobre moki-lado.webp antes de animar. Las medidas quedan en src/config.js.
4. Manda no patinar. La cadencia sube con la velocidad.
5. Fallo con el títere. Celebración con moki-saluda en fundido; si se ve brusco, queda en saltito.
6. Movimiento reducido: las piernas siguen con amplitud menor (no es movimiento de cámara). Sin parallax ni inclinación.
7. Primer plano a 1.3x, solo fuera del carril. Nunca tapa a Moki, los obstáculos ni las piezas. El offset vertical de ±4 px no aplica con movimiento reducido. El director lo aprueba en el hito.

## Brazos (Jorge, intervención 2, 28-oct 22:55): manda sobre lo anterior
- Hoy Moki corre con los brazos en T. No se aceptan brazos rígidos abiertos.
- Los brazos se recortan del arte oficial y se mueven como títere, en oposición a las piernas: pierna izquierda adelante va con brazo derecho adelante.
- Van pegados al cuerpo, con poco recorrido (sugerido ±18°) y un retraso suave de 1 a 2 cuadros respecto a la pierna opuesta.
- Brazo lejano detrás del cuerpo con el mismo tinte que la pierna lejana. Brazo cercano delante del cuerpo.
- En el aire: brazos un poco arriba al subir y abiertos 10° al caer. Al aterrizar asientan con el hundimiento.
- Si el recorte no queda limpio: piezas de papel con los colores exactos del traje y guante negro, detrás o delante del cuerpo según el lado. Esto ya no se escala a Jorge.
- Criterio PASS: en la secuencia de 8 cuadros ningún brazo pasa de la horizontal y cada brazo va siempre en oposición a su pierna contraria.
