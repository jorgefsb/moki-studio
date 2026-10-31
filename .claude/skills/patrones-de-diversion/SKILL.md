---
name: patrones-de-diversion
description: Biblioteca de patrones de diseño de juegos sacados de desarmados de referencias. Cada patrón es una ficha reutilizable para este juego y los siguientes, con etiqueta diversión o negocio. Úsala al diseñar una pieza nueva (busca primero si ya hay patrón), al terminar un desarmado y al empezar un juego nuevo.
---
# Patrones de diversión

Fuente: pedido de Jorge del 31-oct-2026: convertir lo aprendido de los juegos de referencia en patrones y skills para Moki y los juegos que sigan, guardados siempre en GBrain y en GitHub.

## Dónde viven
- Repo: `patrones/<slug>.md` (una ficha por patrón) y el índice `patrones/INDICE.md`.
- GitHub: jorgefsb/moki-studio-skills (privado), carpeta patrones/.
- GBrain: `knowledge/gamedev/patrones/<slug>`. Spark los sube junto con los skills.

## Formato de ficha
```
# <Nombre corto en español>
Etiqueta: diversión o negocio.
Problema: qué le pasa al jugador sin este patrón.
Mecanismo: qué hace el juego, en 2 a 4 líneas.
Loop que mueve: micro, meso, macro o meta.
Evidencia: juego, sistema y liga con fecha.
Cómo lo hicimos nuestro: copiar, combinar, transformar (si ya se usó).
Cómo se mide: número o prueba.
Riesgo: dónde se vuelve manipulación (matriz de moki-hooked-juegos) y cómo lo evitamos.
Usado en: juego y versión, o "sin usar".
```

## Reglas
1. Antes de diseñar algo nuevo, busca en INDICE.md. Si ya existe el patrón, úsalo y anota el uso.
2. Un patrón entra solo con evidencia de al menos un juego real.
3. Si medimos que no funcionó, se queda la ficha con el resultado. Nada se borra.
