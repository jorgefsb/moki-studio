# Esquema del wiki del Moki Method

Este wiki sigue el patrón LLM Wiki de Andrej Karpathy: las fuentes crudas no se tocan, un agente las compila en páginas cortas y enlazadas, y el wiki crece con cada cosa que aprendemos.

## Las tres capas

1. **Fuentes crudas:** DECISIONES.md, BITACORA.md, CLAUDE.md, COLA.md, GDD.md, las skills del estudio y la carpeta evidencia/. Nadie las reescribe para el wiki.
2. **El wiki:** esta carpeta, `metodo/`. Una página por idea, con ligas `[[pagina]]` entre ellas, un `index.md` y un `log.md`.
3. **Este esquema:** dice cómo se mantiene. Si cambia la forma de trabajar, se cambia aquí primero.

## Quién lo mantiene

El cronista. Después de cada decisión de Jorge, cada integración a master y cada postmortem, hace una pasada de ingesta.

## Ingesta (cada vez que aprendemos algo)

1. Lee lo nuevo en DECISIONES y BITACORA desde la última línea de `log.md`.
2. Decide qué página cambia. Si la idea es nueva, crea una página nueva con nombre corto en minúsculas y guiones.
3. Escribe en español mexicano claro, con escritura-humana: frases cortas, sin jerga, con el número o la evidencia que lo prueba.
4. Si algo contradice una página, gana lo más reciente y lo dice: "Antes hacíamos X. Desde el 8-nov hacemos Y porque...".
5. Actualiza `index.md` (una línea por página) y agrega una línea a `log.md` con fecha y qué cambió.

## Revisión (lint, una vez al día con la publicación)

Páginas sin liga desde el índice, ideas repetidas en dos páginas, reglas que ya no se cumplen en el estudio, y datos sin fecha. Se arreglan en la misma pasada.

## Qué no va aquí

Secretos, datos de jugadores, nombres de otras empresas y estado del día. El estado vive en BITACORA; aquí va el método que sobrevive.

## Dónde se lee

En https://moki.jorgesuarez.com.mx/metodo/. Se hornea sola con cada publicación desde esta carpeta (herramientas/metodo-pagina.py en la laptop).
