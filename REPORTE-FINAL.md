# Reporte final del piloto · "Moki: Un salto más"

Estudio Moki · 28 y 29 de octubre de 2026 · fecha límite 4 de noviembre de 2026.

- **Commit final:** 8ac54f0 (juego), con la evidencia de la QA en 1a795bc. Solo commits locales, sin push.
- **Publicación:** nada se publicó desde aquí. Spark decide cuándo publicar `dist/`.

## En corto
Un runner de un botón en papercraft:
- Moki corre solo; tocar es un salto corto y mantener es un salto alto.
- 4 tramos con guion y de día a noche, piezas en arcos, checkpoints ámbar con lección de la marca.
- Un demo que se juega solo al abrir.
- Música cozy chiptune hecha en el navegador.
- Se juega en celular y en compu, todo local, sin CDN ni llaves.

Jorge intervino 2 veces.

Veredicto: **PASA.** La re-QA final de 8ac54f0 pasó todo, sin fallos. ARTE final del director: **ARTE: APROBADO**.

## Qué se hizo
| Hito | Qué entrega | Commit |
|---|---|---|
| T1 | Andamio Phaser 3 + Vite, salto variable con coyote y buffer, perillas en `src/config.js` | 48cc859 |
| T2 / T2b | Diorama de 4 capas de cartón, Moki oficial (moki-lado), cajas y torres, HUD de papel, fuentes locales | a5efe35, c9d617f |
| T3b / T3b2 / T3b3 | Moki títere recortado del arte oficial: pie plantado sin patinar (0.2-0.4 px), brazos en oposición ±18°, tropiezo en dos tiempos | ea40c9c, 917edb0, 5a84d84 |
| T3a / T3a2 / T3a3 / T3a4 / T3a5 | Demo con bot, tutorial Toca/Mantén dentro del juego, 4 tramos con viga, tarjeta de fallo, final, "Así lo hicimos", pausa; apertura a ~2 s; torre justa | f5a9ba8 … c419c1d |
| T3c / T3c2 / T3c3 | Tema "Un saltito más" de 96 BPM en Web Audio, capas por tramo y racha, efectos y stingers, botón de sonido; mezcla audible en celular | 0520baa … 4d5b192 |
| T3d / T3d2 / T3d3 | Fondo vivo con semilla propia (nubes, avioncito, pajaritos, globo, Moki chiquito, mariposas), 4 horas del día con noche de lámpara | c3fe878 … c88b5f3 |
| T3e | Perfil de tinta en obstáculos, Moki chiquito en cresta libre | 4c33454 |
| T3f | Borde legible en celular, caja más perdonadora (109 → 166 ms), 0 traslapes en el demo, docs en git | 0b8b544 |
| T3g / T3g2 | Pico de audio con margen sin perder la recompensa (control del encime de efectos), cinta de noche en #FF6B35 | 38f187f, 8ac54f0 |

El detalle cronológico está en `BITACORA.md`.

## Quién lo hizo
| Rol | Asiento | Aporte |
|---|---|---|
| Líder | estudio-lider | BRIEF.md, decisiones de cada documento, cola de trabajo, criterios de cierre, BITACORA |
| Constructor | estudio-constructor | Todo el código en `src/`, mediciones (bots, ventanas, contraste, medidor de audio) |
| Probador | estudio-probador | QA de cada hito sobre el commit exportado, en 375 y 1280, más Chrome/Edge con GPU; `evidencia/REPORTE-FINAL.md` |
| Director de arte | subagente | ARTE.md y veredicto ARTE en cada hito visual |
| Animador | subagente | ANIMACION.md: títere, ciclo de carrera, brazos, tropiezo |
| UX | subagente | UX.md: demo, tutorial, fallo, final, controles |
| Diseño de juego | subagente | DISENO.md: tramos, viga, bots que prueban el diseño, curva |
| Audio | subagente | AUDIO.md: tema, capas, recetas y mezcla |
| Spark | operación | Armó el estudio, relevó a Jorge, desatoró asientos |

## Prueba de éxito (PILOTO.md)
| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 1 | Se juega de principio a fin en 375 y 1280 sin errores en consola | PASA (8ac54f0: partida completa a 375 en 106 s, 78/78, vuelta al demo; consola limpia) | `evidencia/final-*`, `evidencia/REPORTE-FINAL.md` |
| 2 | Moki pasa la revisión de marca | PASA: ARTE: APROBADO final (sin espejo, casco rígido, visor sin cara, parche visible a 1280) | `evidencia/final-*`, `evidencia/reqa-*` |
| 3 | Capturas y reporte de partida en `evidencia/` | PASA | `evidencia/REPORTE-FINAL.md` |
| 4 | BITACORA.md cuenta quién hizo qué | PASA | `BITACORA.md` |
| 5 | Jorge intervino 2 veces o menos | PASA: 2 | BITACORA 28-oct 22:33 y 22:55 |

Prueba de fallo:
- Más de 2 intervenciones: no.
- Cambios fuera de la carpeta: no.
- Sin juego jugable al 4-nov: no; está jugable el 29-oct.

## Intervenciones de Jorge
1. **28-oct 22:33.**
   - Lo que dijo: no se mueven los piecitos, falta parallax, no hay música y no se entiende cómo se controla.
   - Lo que se hizo:
     - títere recortado del arte oficial;
     - especialistas de animación, UX, diseño y audio;
     - tutorial dentro del juego;
     - música.
2. **28-oct 22:55.**
   - Lo que dijo: brazos en oposición a las piernas y modo demo tipo maquinita al abrir.
   - Lo que se hizo: los dos. Desde aquí el equipo decidió solo.

Ideas sueltas de Jorge (22:56, no cuentan como intervención), todas hechas:
- cozy chiptune;
- fondo vivo solo en las capas de atrás;
- un demo lindo de ver.

## Números al cierre (de los bots y medidores del equipo)
- **Bots de diseño:**
  - solo-toca muere a 7.4 s (lección de Mantén);
  - siempre-mantén muere a 62.1 s (lección de la viga);
  - el que ajusta termina en 120.3 s con 78/78 piezas y 2142 puntos.
- **Bot "humano" del probador:** 145 s con ruido suave y 208 s con ruido fuerte. Es un modelo, no una persona.
- **Demo:** sin invulnerabilidad, 0 choques en sus 3 variantes.
- **Determinismo:** el mismo puntaje con 4 semillas de fondo.
- **Contraste del borde de los obstáculos en celular:** ≥2.0 en las 4 horas. El mínimo es la torre de noche, 2.17; las demás horas dan ≥2.55.
- **Audio:** pico de sesión real de 3 min en -7.9, -8.1 y -8.0 dBFS (límite -6), sin recortes. La pieza suena 2.7-3.9 dB sobre el pico de la música y el salto 4.2. WAV para oír: `evidencia/t3g2-audio-piezas-20s.wav` y `evidencia/reqa2-audio-sesion-53s.wav`.
- **Apertura:** portada a ~0.3 s y Moki corriendo a ~2 s.

## No verificado
- **Nadie ha oído el juego.** El audio está medido, no escuchado. Los WAV están en `evidencia/`. Es lo primero que debe hacer Jorge.
- Ninguna persona real ha jugado en un celular real.
- El parche de la oreja derecha no se distingue a 375 ni en Moki chiquito; se verificó a 1280.
- El cambio de textura al anochecer se juzgó en fotos fijas, no en movimiento.

## Pendientes para una v2
- **Oír y ajustar la mezcla con oídos humanos** en celular y bocinas. El margen de pico es delgado (≥0.6 dB bajo el objetivo interno).
- **Pruebas con personas:** ms reales de toque y mantener, y duración real de la partida (la meta es 1-3 min).
- **Del DISEÑO en P2:**
  - sellos;
  - Vuelta rápida;
  - Hardcore al terminar el nivel;
  - pistas como línea secundaria.
- **Arte, según el director:**
  - Poses oficiales nuevas de Moki (zancada, salto, caída, aterrizaje). Hoy el títere sale recortado de moki-lado y se siente algo rígido. Las dibujan Jorge o la marca, no aquí.
  - Bajar la tarjeta de fallo y la final, o atenuar el HUD mientras están abiertas: en `final-375-fallo` y `final-375-final` asoman etiquetas detrás.
  - Variar la fibra del cielo a 1280, que se repite, y calentar los grises fríos de la noche.
- **Mariposas y pajaritos como premio:** hoy salen poco por cupo.
- **Herramientas de depuración** (`?debug`): quedan fuera del juego normal. Revisar si se quitan del build publicado.
- **Publicación:** la hace Spark en moki-prueba.jorgesuarez.com.mx después de este cierre. Nada se publica desde el estudio.
