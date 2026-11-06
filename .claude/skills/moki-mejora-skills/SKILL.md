---
name: moki-mejora-skills
description: Convierte cada calificación de Jorge, cada gate a ciegas que reprueba y cada bug que llega a master en una mejora probada de la skill responsable. Úsala al recibir feedback de Jorge o de la gente, al reprobar un gate contra el video norte, cuando una lección se repite en la bitácora, y cada viernes en la poda.
---
# Mejora de skills · Moki Studio
Fuente: pedido de Jorge 6-nov 08:15 ("algo que cuando califique de mejora vaya haciéndolos"). Regla de los 30 minutos y "hecho es mejor que perfecto" aplican.

La idea en una línea: **una lección no cuenta hasta que vive en una skill, trae su caso de prueba y le gana a la versión vieja a ciegas.**

## Cuándo se dispara
1. Jorge califica o comenta algo del juego, la demo, la pantalla o una publicación.
2. Un gate a ciegas reprueba contra el video norte (moki-gauntlet-a-ciegas).
3. Un bug llega a master o a la demo (Moki trabado, Paseo atravesando cajas).
4. La misma lección aparece 2 veces en BITACORA.md.
5. Un comentario de la gente en publicar/sugerencias.md se repite 3 veces.

## El ciclo (máximo 30 min por mejora)
1. **Ubica la skill responsable.** ¿Qué skill guiaba esa pieza? Si ninguna, anota "hueco" y crea skill nueva solo si el patrón ya pasó 2 veces.
2. **Escribe la lección como regla** con el formato de la casa: regla en negritas, porqué y dato con fecha ("Dato: 12 de 16 choques en nivel 2, contador 5-nov").
3. **Escribe el caso de prueba** en `evals/casos.md` de esa skill: entrada, qué debe salir, cómo se revisa. Un caso por lección. Los casos viejos no se borran: son la regresión.
4. **Parcha poquito.** Máximo 10 líneas. Antes de agregar, busca qué regla vieja sobra o choca y bórrala (Ley 6).
5. **Prueba a ciegas.** Corre el caso con la skill vieja y con la nueva, cada una en contexto fresco. Un crítico distinto, sin saber cuál es cuál, escoge. Para skills de arte o juego, el crítico compara contra el video norte, no contra master. Usa moki-gauntlet-a-ciegas o la comparación a ciegas de skill-creator.
6. **Decide.** Gana la nueva o empata y además pasa el caso: se queda. Pierde: se revierte y la lección queda como "pendiente" con la razón.
7. **Deja evidencia.** Commit en moki-rig con mensaje `skill: <nombre> · <lección> · caso <id> · ganó/perdió`. Línea en BITACORA.md. Spark copia al repo moki-studio-skills.

## Viernes: poda y marcador
- Cuenta mejoras de la semana: probadas, ganadas, revertidas.
- Skill sin uso en 14 días: se propone borrar (con respaldo).
- Revisa que cada descripción diga cuándo usarla; una skill que no se dispara no existe.
- Lo que se revirtió entra a la serie "Lo que no entró".

## Límites
- Máximo 3 parches de skill por día. Más que eso es ruido.
- Las skills canónicas de la casa (escritura-humana, impeccable, game-feel, papacito-juice, video-norte) no se editan desde el estudio: se le propone el cambio a Spark con la evidencia.
- Las skills importadas (level-design, procedural-gen, platformer) no se reescriben. La corrección va en su sección "Nota Moki Studio" o en una skill moki-*.
- Nada de esto toca dinero, cuentas, secretos ni a otras empresas.
