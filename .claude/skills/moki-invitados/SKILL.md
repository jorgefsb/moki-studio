---
name: moki-invitados
description: Cómo entran y salen del equipo de Moki Studio los especialistas (roles de Claude-Code-Game-Studios, críticos del gauntlet, constructor) sin ahogar una máquina chica. Úsala cada vez que una pieza necesite un rol que no está sentado en el equipo fijo, y antes de abrir un asiento o subagente nuevo.
---
# Invitados: entran, ayudan y se van

Fuente: Jorge, 31-oct-2026 17:38: los agentes y personajes entran y salen del equipo indie de Moki Studio porque la máquina tiene poca capacidad, pero hay que hacer el mejor juego posible, y con gauntlet loop para los skills y para el juego.

## El equipo
- **Fijos (4)**: director de juego, productor (líder), probador y cronista. Son los únicos que viven todo el día.
- **Constructor**: entra solo cuando hay una pieza despachada y sale al entregarla.
- **Invitados**: cualquier rol de CCGS (game-designer, economy-designer, level-designer, sound-designer, ux-designer, art-director, etc.) y los críticos del gauntlet. Son subagentes de contexto limpio que lanza un asiento fijo: leen su ficha, hacen una sola tarea y se van.

## Antes de invitar
1. Mira `/tmp/moki-recursos.txt`. Solo en VERDE. En AMARILLO, uno a la vez y nada pesado. En ROJO, nadie entra.
2. Máximo 1 invitado y 1 constructor al mismo tiempo. Lo pesado (build, navegador de pruebas) va con `flock /tmp/moki-pesado.lock`.
3. Busca primero en `patrones/` y en los skills nuestros. Si ya está resuelto, no invites a nadie.

## Cómo entra un invitado
Brief de 6 líneas, nada más:
1. Rol: el archivo de CCGS que debe leer (por ejemplo `~/Work/_referencias/ccgs/.claude/agents/economy-designer.md`), según moki-calibrar-con-ccgs.
2. Tarea: una sola, con su entregable.
3. Contexto: solo los archivos que necesita (GDD §, MAPA-SISTEMAS.md, el desarmado y la sección que toca).
4. Barra: contra qué se compara (la referencia real, nunca una descripción).
5. Límite: 20 minutos o 1 entrega.
6. Salida: su entrega en un archivo y una línea en BITACORA.md con su nombre de rol.

## Cómo sale
Entrega, cierra su navegador si abrió uno, y el asiento que lo invitó anota qué se tomó. Nadie se queda "por si acaso".

## Gauntlet para piezas y para skills
- **Pieza del juego**: crítico invitado de contexto limpio, A/B a ciegas contra la referencia (moki-gauntlet-a-ciegas), y un solo hallazgo: el más grande. Se repite hasta que el crítico elige lo nuestro o hasta el corte del día.
- **Skill nuevo o cambiado**: un invitado que no lo escribió lo aplica a un caso real del juego. Otro invitado compara el resultado a ciegas contra la referencia que corresponda (por ejemplo, nuestro desarmado contra un desarmado publicado de Deconstructor of Fun). Si pierde, se anota el hueco más grande y se corrige el skill. Un skill sin un gauntlet ganado queda marcado "en prueba".

## Prueba de que sirvió
- En BITACORA.md cada invitado tiene entrada y salida el mismo día.
- El semáforo no pasó a ROJO por un invitado.
- Cada skill trae su estado: "en prueba" o "ganó gauntlet (fecha)".
