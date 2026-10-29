# Reporte del sprint · QA final sobre master congelado 50cfe1d

Probador (estudio-probador), 29-oct-2026, 10:50 CDMX. Cada commit se probó exportado con `git archive`, compilado y servido en :4185, nunca desde un worktree. Todo lo pesado corrió con `flock /tmp/moki-pesado.lock`, un navegador a la vez.

**Veredicto: PASA lo medido.** La noche falló en 0e51af9; con el respaldo del líder en 50cfe1d pasa contraste y arte. Lo que no alcancé a medir está abajo, marcado como NO VERIFICADO, no como PASA.

## Qué cambió contra 8ac54f0 (piloto)

- **Niveles:** cada partida arma sus 4 tramos con bloques hechos a mano y una semilla.
  - Modos: Reto del día (mismo nivel para todos hoy) y Libre (nivel nuevo cada partida), con un chip abajo al centro en la portada.
  - Cada tramo tiene su papel: kraft, cuaderno, periódico o cartulina.
  - La primera partida de la vida es el clásico.
  - Hay mejor marca por modo.
- **Feel:** selector de Efectos (Nada, Poquito, Mucho y Hardcore), botones que se hunden, ficha de pieza con x2/x3, abanico, pasto, tropiezo de 6° al chocar y vibración solo en táctil.
- **Base:** composición vertical C en celular (Moki de 93 px pegado a la izquierda, suelo al 66%), `?embed=1`, sol y cordillera lejana, y tarjeta de fallo de una línea con ↻.
- **Atmósfera y luz:** están en el código, pero apagadas en el congelado (respaldo de 50cfe1d).

## PASS/FAIL por punto (sobre 50cfe1d salvo donde se dice)

| # | Punto | Resultado | Cifras |
|---|---|---|---|
| 1 | Noche: contraste del borde a 375 | **PASA** | Con posiciones visibles (ver hallazgo del instrumento). Torre 2.89–3.75, caja 3.17–3.63 y viga 4.35–5.23 con cartulina; viga 3.76–4.51 con cuaderno. Meta ≥2.0. |
| 1 | Noche: arte | **PASA** | ARTE: APROBADO. Cielo gris pardo como el piloto, cordillera más oscura que el cielo, 7 estrellas a 1280 y 6 a 390. Capturas `evidencia/final-50cfe1d-{390,1280}-noche.png`. |
| — | Noche en 0e51af9 (antes del respaldo) | FALLA | Deslavada; la cordillera salía más clara que el cielo y quedaba 1 estrella a 1280. Arte la rechazó y se resolvió con el respaldo de 50cfe1d. |
| 1b | Contraste de día a 375 (0e51af9) | PASA | Torre: 2.59 mañana / 2.60 mediodía / 2.54 tarde. Caja de mañana: 2.72. Esas cifras salieron de `moki.contrast`, que mezcla posiciones fuera del lienzo, así que el contraste real es mayor. |
| 2 | Regresión `?nivel=clasico` | **PASA** | Bots 7.4 s (torre) / 62.1 s (viga, T3) / 120.3 s, 78/78 y 2142, dos veces igual. También igual en Nada y Hardcore (86cb4ae y 81be8d5) y a 375 en vertical. |
| 2 | Demo A/B/C sin modo dios | **PASA** | 0 choques en 40 s por variante, a 375 (también en 0e51af9). |
| 3 | Consola y recursos externos | PASA (parcial) | 0 errores en todas las corridas de 50cfe1d. No volví a comprobar en 50cfe1d el "Blocked call" de vibración con `?screen=play` a 375 en Hardcore (en 86cb4ae salía; el arreglo fix-gesto va en 2fce31a). |
| 4 | Pico de audio ≤ −6 dBFS | **PASA** (medida fuera de línea) | Peor apilado −8.5 (aterrizaje), arcos −8.6 y −9.0, WAV de 20 s con pico −8.3 (`evidencia/final-50cfe1d-audio-piezas-20s.wav`). Música −17.2; con pasa-altos 300 Hz −18.0. La sesión viva de 3 min no se midió. |
| 5 | Tarjeta de fallo (0e51af9 a 390) | PASA | Pista en una línea ("La caja se libra con un toque."), tarjeta de y 76 a 227 (no tapa el HUD) y ↻ con un toque. Sale a los 250 ms de juego y acepta el toque desde los 550 ms. "Nueva marca" en la tarjeta de fallo y la tarjeta a 1280: NO VERIFICADO. |
| 6 | Mejor marca por modo | NO VERIFICADO | — |
| 7 | Primera partida (0e51af9) | PASA | Sin `moki.primera` sale el clásico (78 piezas) y la siguiente es el Reto del día. Faltaba que la tarjeta final dijera el nivel; eso lo agregó 446a811 y no lo comprobé. |
| — | Reto y Libre de punta a punta a 375 (86cb4ae) | PASA | Reto: semilla 2026-10-29 al empezar y tras el botón real "Otra vez", 106 s, 128/128. Libre: 106 s, 131/131, y "Otra vez" da otra semilla. Chip, guardado al recargar, checkpoint con los mismos obstáculos, `?seed` y `?nivel` también pasan. |
| — | Vertical C a 390 (86cb4ae) | PASA | Suelo al 65%, Moki de unos 93 px en x ≈ 60, sin huecos. Botón de sonido visible y chip abajo sin tapar a Moki (0e51af9). |
| 8 | Feel: selector, movimiento reducido, choque a 0/120/300 ms | NO VERIFICADO | — |
| 9 | `?embed=1` | NO VERIFICADO | — |
| 10 | 60 fps p95 y carga <3 s | NO MEDIBLE EN ESTA MÁQUINA | Carga de 6 a 33 en 4 núcleos y semáforo en AMARILLO o ROJO casi todo el sprint. Tarjeta de fallo: 11.8 s reales en headless, cuando en tiempo de juego son 250 ms. |
| 11 | Gauntlet final | Listo | `evidencia/gauntlet/50cfe1d-{390,1280}.png`: nivel clásico, primera torre a 245 px delante de Moki (6.73 s, 404 cuadros), sin la capa de UI. El HUD del lienzo sí sale. |

## Hallazgo del instrumento (importante)

`src/debug/contrast.js` coloca el obstáculo a 260, 330, 400, 470 y 540 px delante de Moki. A 375 en vertical (desde 86cb4ae) solo se ven unos 360 px, así que las posiciones 400 a 540 caen **fuera del lienzo**; en la viga dos de ellas valen 1.0 por definición.

- Por eso, todas las cifras de `moki.contrast` a 375 desde 86cb4ae subestiman el borde.
- El 1.27 de la viga de noche en 2fce31a fue el instrumento y no el juego: con la misma fórmula solo en posiciones visibles, la viga de 50cfe1d da 4.35–5.23.
- Mis cifras de la tabla usan solo posiciones visibles, entre 160 y 330 px.
- **Para v2:** que `contrast.js` elija las posiciones según el ancho visible.

## Cómo se siente

- **Reto del día:** le da a la portada una razón para volver mañana.
- **Libre:** hace que "Otra vez" sea otra partida y no la misma.
- **Tarjeta de fallo:** la nueva es corta y deja reintentar a ciegas; Moki vuelve a correr a los 0.55 s.
- **Marcas entre modos:** los niveles generados traen de 123 a 166 piezas contra 78 del clásico, y puntajes de 2862 a 3792 contra 2142. La mejor marca por modo de 446a811 lo resuelve; no lo verifiqué jugando.
- **Tiempo de lectura (M2 del investigador):** leer solo la pista toma de 1.75 a 2.0 s, justo en el límite de ≤2 s. Leer también la línea de abajo, de 2.75 a 4.0 s.
- **Sensación del feel:** sin juzgar. Ninguna persona lo jugó a mano en esta QA; todo fue con bots y toques sintéticos.

## Notas para v2

- **Arte:** la noche queda plana con la atmósfera apagada; conviene reintroducirla sin aclarar los cerros.
- **Arte:** falta una captura con el sol en cuadro para confirmar que no hay halo.
- **Arte:** a 1280 una estrella queda pegada a la nube.
- **Arte:** a 1280, un poste del fondo queda justo encima de la torre y se lee como parte del obstáculo.
- **Instrumento:** `contrast.js` con posiciones según el ancho visible (arriba).
- **Gauntlet:** el HUD del lienzo no se puede ocultar desde fuera. Si el director quiere capturas sin HUD, hace falta una perilla de debug.

## No verificado

- Mejor marca por modo.
- "Nueva marca" en la tarjeta de fallo.
- Tarjeta de fallo a 1280.
- Feel: selector de Efectos, movimiento reducido y choque a 0, 120 y 300 ms.
- `?embed=1`.
- "Blocked call" en 50cfe1d.
- Sesión de audio en vivo.
- fps y tiempo de carga.
- M1 y M3 del investigador: M1 no cerró por la carga; M3 no se corrió.
- Una persona real en un celular real.

## Evidencia

- `evidencia/final-50cfe1d-{390,1280}-noche.png`, `final-50cfe1d-375-noche-viga.png`, `sprint-50cfe1d-{390,1280}-fondo-*.png`
- `evidencia/gauntlet/{86cb4ae,50cfe1d}-{390,1280}.png`
- `evidencia/sprint-0e51af9-*.png` (incluida la noche rechazada), `sprint-{reto,libre}-375-*.png`, `sprint-niv-375-*.png`
- `evidencia/final-50cfe1d-audio-piezas-20s.wav`
