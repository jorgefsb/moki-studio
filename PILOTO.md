# Piloto Estudio Moki: "Moki: Un salto más"

Canon: GBrain state/openrig-piloto-moki-2026-10-28 · brandkit.jorgesuarez.com.mx 0.6 · Biblia de Moki 0.1.
Dueño: Jorge. Operación y publicación: Spark. Equipo: Estudio Moki (líder, constructor, probador).
Decisión de Jorge (28-oct-2026): juego Un salto más, estilo papercraft, liga abierta sin Google.

## Objetivo
Un juego web chiquito, divertido y bonito de Moki que demuestre que un equipo de agentes con roles
puede entregar algo jugable y revisado con 2 intervenciones de Jorge o menos.

## El juego
- Moki corre solo por un mundo de cartón y papel. El jugador toca la pantalla o la barra espaciadora
  para saltar; si deja presionado, salta más alto.
- Obstáculos de cartón y piezas de cartón que se recogen como puntos.
- Checkpoints color ámbar: "guardar el aprendizaje".
- Al fallar sale una tarjeta con una lección aprobada del brandkit y se vuelve al último checkpoint:
  "La siguiente partida empieza con lo aprendido", "Cada salto empieza por observar",
  "Fallar, ajustar y volver a intentar".
- Partidas de 1 a 3 minutos. Puntaje por distancia y piezas. Mejor marca guardada en el navegador.
- Pantalla final "Así lo hicimos": roles del equipo, cuántas veces intervino Jorge y liga a jorgesuarez.com.mx.

## Look and feel
- Papercraft tipo diorama: capas de cartón con parallax, fibras, pliegues, sombras de contacto.
- Moki como títere de papel con las poses aprobadas de assets/moki (sobre todo moki-lado y moki-jugando).
  Anticipa, actúa y asienta. Squash máximo 3%. Casco rígido. Nunca espejado.
- Paleta y tipografía de la skill moki-marca. Sin neón ni glow.
- Juice con niveles Nada/Poquito/Mucho/Hardcore; sonido tras el primer gesto; movimiento reducido respetado.

## Arte y animación (prioridad de Jorge)
Tiene que verse bonito y agradable. El director de arte escribe ARTE.md antes de producir y aprueba cada hito visual. Ningún juego se cierra sin ARTE: APROBADO.

## Tecnología
Phaser 3 + Vite, todo local, sin CDNs. Resultado estático en dist/. Funciona en celular y compu.

## Prueba de éxito
1. Se puede jugar de principio a fin en celular (375 px) y compu (1280 px), sin errores en consola.
2. Moki pasa la revisión de marca (no espejado, parche en su oreja derecha, visor sin cara).
3. Capturas y reporte de partida en evidencia/.
4. BITACORA.md cuenta quién hizo qué.
5. Jorge intervino 2 veces o menos.

## Prueba de fallo
Más de 2 intervenciones de Jorge, cambios fuera de esta carpeta, o no hay juego jugable al 2026-11-04.

## Límites
No publicar. No tocar otras empresas. Sin llaves ni dinero. Todo vive en esta carpeta.
Spark publica en moki-prueba.jorgesuarez.com.mx (noindex) cuando el probador dé PASS.

## Reversa
Respaldo previo: ~/backups/openrig-pre-20261028-063834
Apagar el equipo: rig down estudio-moki. Quitar OpenRig: ver state/openrig-piloto-moki-2026-10-28 en GBrain.

## Fecha límite
2026-11-04.
