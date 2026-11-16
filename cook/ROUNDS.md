# Bitácora del Cook 1: «Que se vea como juego publicado»

Inicio: 2026-11-16 10:05 MX (16:05Z). Tiempo: piso 6 h (16:05 MX) | tope 10 h (20:05 MX)
Barra (0-10, crítico sin contexto, mediana): composición 8.5 | luz y atmósfera 8.5 | profundidad 8.5 | color 8.5 | lectura de Moki y obstáculos 8.5 | movimiento 8.5. Más el ciego 3/3 rama contra master.
Calibración: ninguna aún (manda el número de Jorge cuando lo dé).
Puerta: stills aprobados por Jorge [no] | video final 10 s [no empezado]
Mejor hasta ahora: ronda 00 = master 8b97696 (línea base)

## Arnés
- Stills: `flock /tmp/moki-pesado.lock node herramientas/cook-stills.mjs <url> cook/stills/rNN 1280x720` (reloj falso pauseAt, azar sembrado, bot 'adjust'; S01-S06 = sc.t 6, 19, 36, 49, 66, 80 s; M1-M6 = movimiento cada 100 ms desde 11 s). A/A medido: 12/12 PNG idénticos por md5 (16-nov 10:03).
- Lado a lado: `node .claude/skills/cook/scripts/side-by-side.mjs --out cook/compare/rNN/todas.jpg cook/refs/R01.png cook/stills/rNN/S01.png ...` y la tira de movimiento con ffmpeg (hstack/vstack 3x2).
- Referencias: cook/refs/R01-R06 = referencias/altos-odyssey/stills/ (press kit oficial; solo local, sin versionar, nunca se publican).
- Críticos: 3 subagentes Sonnet de contexto cero, solo imágenes y rúbrica; mediana por punto.

## Decisiones
- 10:00 Defaults de intake confirmados por el líder: capturas solo locales; «ningún asset externo» manda; rúbrica a 1280x720 y 390x844 solo FPS, lectura y UI; 3 páginas = tramos 0-2 de ?ir=primera; ciego final con 3 críticos Sonnet.
- 10:05 Tomas en tiempos de juego fijos de la 1.ª partida (no en eventos), porque el cook compara escenario y luz, no efectos de un evento.

## Comentarios de Jorge
(ninguno aún)

---
## Ronda 00 (línea base: master 8b97696)

Hora: 10:03 a 10:12 MX | transcurrido 0.1 h
Foco: medir de dónde partimos.
Stills: `cook/stills/r00-master/` | Lado a lado: `cook/compare/r00/todas.jpg`, `movimiento.jpg`

Calificación a ojo, mediana de 3 críticos Sonnet de contexto cero (sin calibrar):

| Toma | Comp | Luz | Prof | Color | Lectura |
|---|---|---|---|---|---|
| S01 | 5.5 | 4.5 | 5.5 | 6.0 | 5.0 |
| S02 | 5.0 | 4.0 | 5.0 | 5.0 | 5.0 |
| S03 | 5.5 | 5.0 | 5.5 | 6.5 | 5.5 |
| S04 | 5.0 | 3.5 | 5.0 | 4.0 | 5.0 |
| S05 | 5.0 | 3.5 | 5.0 | 4.5 | 5.0 |
| S06 | 5.5 | 4.0 | 5.0 | 5.5 | 5.0 |
Movimiento: 4.5 (4.5, 4.5, 5.0).

Lo que dijeron los 3 sin ponerse de acuerdo antes: (1) el más flojo es luz y atmósfera: no hay fuente de luz (sol o luna con halo), no hay neblina por distancia y las 6 tomas son el mismo naranja de mediodía, «un solo fondo de pantalla»; (2) profundidad: capas casi del mismo valor, sin primer plano oscuro que enmarque y sin capas lejanas aclaradas hacia el cielo; los pinos translúcidos «parecen error de alfa»; (3) Moki naranja sobre fondo naranja se pierde: falta contraluz o borde y separar el valor detrás; (4) movimiento: el paralaje casi no se nota y la estela es una barra rígida. Fuera del cook (UI y mecánica): letreros «Arco alto +15», píldora «Si chocas…», tamaño de Moki y el ciclo de correr.
Siguiente foco: luz y atmósfera de la página 1 (S01-S02): guion de hora por página, sol con halo, neblina por distancia y valores por capa.
