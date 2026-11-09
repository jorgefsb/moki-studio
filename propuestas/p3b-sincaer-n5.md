# P3b · Partir el encargo sinCaer del N5 (diseño, sin tocar src)

Base: CURVA-N5.md. Obstáculos iguales en N4/N5/N6; el muro es el requisito (cero choques en 4 páginas): bot humano limpia 18.6% Clásico, 11.7% Reto, 8.2% Libre; novato ~0%. En src (cuaderno.js:46) `sinCaer` = `finished && crashes === 0`; el mismo criterio vive en el sello `sinCaerme` (línea 85). Ya existe `st.crashesByTramo`, así que por página no pide dato nuevo. Ojo: ya existe `sinCaerP1` (50-63%), la página 1 no es el problema.

## (a) Variantes
**V1 · Máx. 2 choques en la meta.** `finished && crashes <= 2`. Efecto: sube de "una de 5-12" a más o menos la mitad (estimo con Poisson sobre 2.1 choques medios, no medido: 55-65% Clásico). Logro: el nombre cambia a "Llega casi sin caerte" y el sello `sinCaerme` (perfecto) se queda en 0 choques como sello aparte y raro. El premio del N5 se gana, el brillo del perfecto no se regala.
**V2 · Por página, sello parcial.** Encargo = 3 de 4 páginas limpias (o 4 páginas, cada una sella una esquina del cuaderno, ya cuentan P2-P4 en cuaderno.js:56-74). Efecto: premia lo que se aprende tramo a tramo; un choque solo cuesta esa página. Logro: se ve el avance (1/4, 2/4...) en vez de perder todo en la página 4. Cuesta más código y texto (i18n, UI de cuaderno).
**V3 · Ayuda tras 3 choques.** Al 3.er choque de la partida baja `respawnSpeedMult` de 0.85 a ~0.75 en los reinicios y/o abre un respiro de 1 s; `sinCaer` sigue en 0 choques. Efecto: ayuda a quien se parece al novato, pero NO baja el requisito: quien ya chocó 3 veces no limpia igual. Casi no mueve el muro de `sinCaer`. Rompe "no bajamos la dificultad" si se aplica al recorrido.

## (b) Número que debe medir el probador (script curva-n5.mjs, mismas 2000 partidas/celda, semilla fija, perfiles humano, humanoApunta y novato, 3 modos)
- V1: distribución de choques por partida completa: P(≤1), P(≤2), P(≤3) y partidas por completar. Decisión: umbral buscado 40-60% para humano y >=10% para novato en Clásico.
- V2: P(página k limpia) por página 1-4 y P(>=3 de 4 limpias), P(4 de 4); más tasa de completar por perfil.
- V3: choques esperados hasta el 3.º, y con el multiplicador 0.75 la tasa de choque por obstáculo en reinicios (tabla A repetida) + `sinCaer` resultante; si no cambia >5 puntos, descartar.
- Para todas: añadir 3 semillas distintas (hoy 1) y reportar intervalo; así se separa señal de semilla.
- Referencia a vencer en novato: hoy 0.1% Clásico / 0% Reto / 0% Libre.

## (c) Recomendación
V1 como arreglo primario, con el perfecto como sello aparte (`sinCaerme` intacto): una línea de config (`sinCaerMax: 2`), mueve el número que sí es el muro y no toca obstáculos. Si el bot novato sigue <10% con V1, sumar V2 en una segunda vuelta. V3 la descartaría: no ataca el requisito. Quito: nada nuevo; V1 reemplaza el criterio, no añade mecánica.

## (d) Riesgos y lo no verificado
- Los bots no son gente. Los 18.6/11.7/8.2% son del bot humano (error 15±40 ms). No sé qué modo juega Jorge en N5 ni cuántos reintenta antes de abandonar.
- Estimé 55-65% de V1 con Poisson; la dispersión real es mayor (limpias 18.6% frente a 12% Poisson), así que puede salir distinto. Solo el probador da el número.
- No verifiqué si `sinCaer` se usa fuera de cuaderno.js:46 y :85 (sellos, novedades, texto i18n "Llega sin caerte" habría que cambiarlo a "máx. 2 caídas").
- Riesgo de regalar: si el premio de N9 se siente lejos, es un problema aparte (CURVA punto 5); V1 no lo arregla.
- No revisé qué pasa con progresos ya guardados en localStorage (quien ya tiene N5 hecho no se ve afectado, supuesto).
