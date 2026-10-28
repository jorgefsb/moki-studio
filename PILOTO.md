# Piloto OpenRig: primer juego de Moki

Canon: registry/biblioteca-cosas-chidas (2026-10-28) · infra/papacitoos-mapa-roles-omarchy-hub (Omarchy = laboratorio).
Dueño del resultado: Jorge. Operación: Spark. Marca: personal (https://brandkit.jorgesuarez.com.mx/).

## Objetivo
Probar si un equipo de agentes con roles entrega un juego web pequeño de Moki, revisado y jugable,
con 2 intervenciones de Jorge o menos.

## Reglas de Moki
Usar el brandkit de marca personal y la biblia de Moki. Parche MOKI en la oreja derecha anatómica, nunca espejado.

## Entregable
Un juego web que abre en el navegador (index.html), una sola mecánica, de 1 a 3 minutos de partida.
La idea concreta del juego la decide Jorge antes de arrancar al equipo.

## Prueba de éxito
1. El juego abre y se puede jugar de principio a fin.
2. Hay captura de pantalla del juego corriendo y nota del revisor.
3. Jorge intervino 2 veces o menos.
4. Evidencia registrada en GBrain.

## Prueba de fallo
Más de 2 intervenciones, cambios fuera de esta carpeta, o no hay juego jugable al día 7.

## Límites
No publicar nada. No tocar otras empresas. No usar llaves ni dinero. Todo vive en esta carpeta.

## Reversa
Respaldo previo: ~/backups/openrig-pre-20261028-063834
Quitar: rig down <equipo>; rig daemon stop; npm uninstall -g @openrig/cli;
rm ~/.local/bin/rig ~/.local/bin/openrig-tui; restaurar archivos del respaldo; quitar bloque OpenRig de ~/.tmux.conf.

## Fecha límite
2026-11-04. Si no pasa, se mata y se revierte.
