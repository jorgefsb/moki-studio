---
name: moki-calibrar-con-ccgs
description: Mapa para usar Claude-Code-Game-Studios (Donchitos) según lo que queramos mejorar del estudio o del juego. Dice qué agente o skill de CCGS leer, qué tomar y qué ignorar. Úsala cada vez que una pieza o un rol necesite más calibración, al elegir el pilar macro y en la retrospectiva del sábado.
---
# Calibrar con Claude-Code-Game-Studios

Fuente: Jorge, 30-oct 09:18 y 31-oct 17:32: tomar de CCGS lo que haga falta según lo que queramos mejorar, sin copiarlo literal y adaptado a nuestra arquitectura, y volver a él cada vez que necesitemos calibrar un rol.

Copia local: `~/Work/_referencias/ccgs/.claude/` (agents/ y skills/). Solo se lee.

## Cómo se usa
1. Ubica en la tabla lo que quieres mejorar.
2. Lee el agente o el skill de CCGS que toca. Quédate con sus preguntas, checklists, criterios y teoría (MDA, loops, sumideros y fuentes, etc.).
3. Ignora tres cosas: lo de Godot, Unity y Unreal; el flujo de pedir permiso por cada sección (aquí decide el director y queda en DECISIONES.md), y las rutas de archivos de CCGS.
4. Si lo que tomaste sirve para más de una pieza, vuélvelo skill nuestro (`moki-<tema>`) o ficha en `patrones/`, y anótalo en BITACORA.md con la fuente.

## Qué leer según lo que quieras mejorar
| Quiero mejorar | Agentes de CCGS | Skills de CCGS | Nuestro skill que lo usa |
|---|---|---|---|
| Diseño macro: loops, sistemas, por qué volver | game-designer, systems-designer, creative-director | map-systems, design-review, review-all-gdds, propagate-design-change | deconstructor-of-fun |
| Progresión, recompensas, sellos, monedas | economy-designer | balance-check | patrones-de-diversion |
| Volver mañana: racha, reto del día, eventos | live-ops-designer | team-live-ops | moki-hooked-juegos |
| Sensación del salto y pulido | technical-artist, gameplay-programmer | team-polish | moki-chequeo-tecnico, FEEL.md |
| Tramos y dificultad | level-designer, world-builder | team-level | |
| Arte y consistencia visual | art-director, technical-artist | art-bible, asset-audit, asset-spec, consistency-check | moki-arte-copiar-combinar-transformar |
| Sonido y música | audio-director, sound-designer | team-audio | |
| Primeros 60 s, menús, accesibilidad | ux-designer, ui-programmer, accessibility-specialist | ux-design, ux-review, team-ui | |
| Voz y textos de Moki | narrative-director, writer | team-narrative | |
| Calidad y regresiones | qa-lead, qa-tester | qa-plan, regression-suite, smoke-check, soak-test, test-flakiness, playtest-report | moki-qa-antes-de-integrar |
| Carga y fps | performance-analyst, engine-programmer | perf-profile | moki-chequeo-tecnico |
| Medir lo que pasa con jugadores | analytics-engineer | playtest-report | |
| Prototipar una idea grande | prototyper | prototype, vertical-slice, quick-design | |
| Alcance, ritmo y prioridades | producer | scope-check, estimate, sprint-plan, milestone-review, retrospective | |
| Publicar y contar | release-manager, community-manager | changelog, patch-notes, launch-checklist, release-checklist | build-in-public |
| Mejorar nuestros propios skills | | skill-improve, skill-test | |

## Prueba de que sirvió
La entrada de BITACORA.md de la pieza dice qué archivo de CCGS se leyó y qué se tomó, y el resultado pasó el PASS del probador.
