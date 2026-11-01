# MAPA-SISTEMAS: Moki contra el desarmado de Alto's Odyssey
Fecha: 31-oct-2026, 17:50 CDMX. Autor: estudio-director (skill deconstructor-of-fun, pasos 3 a 5).
Fuente de la referencia: `referencias/altos-odyssey/DESARMADO.md` (§2 loops, §4 éxito, §6 no copiar, §8 ideas).
Estado de Moki según master `bc0dbbc`, leído en el código y la BITACORA de hoy, no jugado de nuevo para este mapa.
Impacto = efecto en querer otra partida (alto, medio, bajo). Costo S, M o L. Ambos son **lectura**, no medidos.
Orden = impacto entre costo.

| # | Sistema | Alto's Odyssey | Moki hoy | Estado | Impacto | Costo |
|---|---|---|---|---|---|---|
| 1 | Objetivos con nivel (meta loop) | 3 objetivos activos, 60 niveles, desbloqueo cada 10 | Cuaderno: 3 notas activas de un banco fijo de 9, 13 sellos. Sin nivel, sin escalada, sin desbloqueos. Se revisan solo al caer o llegar. | **Débil** | Alto | M |
| 2 | Combo visible (meso loop) | Multiplicador por trucos, alas con combo | Combo de piezas con x2 y x3 sobre el puntaje (`config.js:35`, ventana 900 ms) y una nota (racha5). No se ve crecer nada y no se cobra por técnica de salto. (Corregido tras el invitado: antes decía 'sin multiplicador'.) | Débil | Alto | S |
| 3 | Zen sin HUD + foto | Modo Zen y Modo Foto | Paseo sin colisiones, con HUD. Sin foto. | Débil | Medio | S |
| 4 | Momentos del cielo | Bono por amanecer, estrellas fugaces | Ciclo mañana, tarde y noche existe. No vale nada ni pide nada. | Débil | Medio | S |
| 5 | Zonas con mecánica propia | Biomas que rotan | Páginas y tramos con velocidad distinta. Sin mecánica propia por zona. | Falta | Alto | L |
| 6 | Persecución con salida | Ancianos y lemures | Nada. | Falta | Medio | M |
| 7 | Variantes con física | Personajes con una regla distinta | Nada. | Falta | Medio | M |
| 8 | Truco al mantener | Voltereta, riesgo y premio | Mantener ya cambia la altura del salto (`RunScene.js:594-606`), pero sin riesgo ni premio de velocidad al aterrizar. (Corregido tras el invitado: antes decía 'salto simple'.) | Débil | Medio | M |
| 9 | Meta por días | Sin racha, pero con objetivos largos | Racha con perdón y tarjeta para compartir. | **Tiene** | Alto | hecho |
| 10 | Modos | Zen y Explorer | Clásico, Reto del día, Libre, Paseo, Vuelta rápida. | **Tiene** | Medio | hecho |
| 11 | Arte, hora del día, clima | Paleta por hora | Cartón y papel con ciclo de hora. Gauntlet vivo. | Tiene | Alto | en curso |
| 12 | Audio en capas | Partitura de dos compositores | Sin capas ni sonido de página. | Falta | Medio | M |

## Qué sale de la tabla
- **La brecha de impacto alto con costo medio es el #1.** El Cuaderno ya es la mitad de "Encargos": hay 3 notas activas y sellos. Lo que falta es que no se acaben (9 notas se agotan en pocas partidas), que haya nivel, que se tachen durante la partida y que algo se desbloquee. Está construido sobre lo que ya existe.
- Hipótesis 1 y 2 de Hooked (DECISIONES de hoy) caen en el mismo sistema: el orden fijo del Cuaderno y "qué queda pendiente para mañana".
- **Cuidado heredado de la referencia (§6 punto 8):** un Encargo solo pide lo que el tramo garantiza. Hoy `cajas5`, `torres3` y `vigas3` salen de la inversión del generador; hay que listar lo que garantiza cada tramo y modo antes de escribir encargos.
- #5 (zonas) es el siguiente por impacto, pero cuesta L y triplica arte. No se abre mientras Encargos esté vigente (un pilar a la vez).

## Lo que no medí
- Nada del impacto ni del costo está medido. No hay prueba con personas. El primer número real sale de la prueba de 3 a 5 personas (necesita a Jorge).

## Revisión del invitado (disenador-de-juego, 31-oct, evidencia/gauntlet/invitado-mapa-sistemas-20261031.md)
Hallazgo: las 9 notas actuales son conteos de lo mismo; un banco de ~30 con las mismas verbos solo cambia cifras. Alto's funciona con verbos variados (trucos, combos, biomas, personajes). Regla añadida: el inventario del día 1 de Encargos lleva columna 'verbo'; si salen menos de 5 verbos distintos, el combo con aterrizaje (fila 2, costo S) entra al mismo pilar.
