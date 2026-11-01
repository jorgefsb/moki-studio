---
name: lectura-facil
description: Revisa y reescribe todo lo que sale en público (posts, tarjetas, entradas de la bitácora pública, guiones de video) para que lo entienda cualquier persona sin conocimientos técnicos. Úsala antes de publicar cualquier pieza de build in public y junto con escritura-humana.
---
# Lectura fácil para build in public

Fuente: Jorge, 31-oct-2026 22:00: nada de lo de building in public debe ser difícil de leer, tiene que ser fácil para gente no técnica.

## La prueba (corre las dos antes de publicar)
1. `python3 herramientas/legible.py texto.txt` (o con el texto por stdin). Da el índice de lectura de Fernández Huerta (de 0 a 100; más alto es más fácil), frases largas y palabras técnicas. PASA con índice de 70 o más, ninguna frase de más de 25 palabras y cero palabras técnicas sin explicar.
2. Un lector invitado de contexto limpio lee el post sin saber nada del estudio y responde en 3 líneas: qué entendió, qué no entendió y qué palabra le estorbó. Si algo no entendió, se reescribe.

## Cómo escribir
- Frases cortas. Una idea por frase.
- Palabras de todos los días. Si hace falta una técnica, se explica en la misma frase con algo de la vida diaria: "tokens, las palabras que lee la IA".
- Un número por pieza, el que más importa, y comparado con algo: "de 5 a 2.8 segundos".
- Antes y después siempre.
- Nada de siglas sin explicar (QA, FPS, gzip, CPU, commit, API, merge).
- Termina con un solo paso: jugar en moki.jorgesuarez.com.mx.

## Palabras que se cambian
- QA, probar → "revisar"; build → "versión"; commit → "cambio guardado"; merge, integrar → "entró al juego"; bug → "error"; gzip, kB → "pesa"; fps → "qué tan fluido se mueve"; CPU → "procesador"; tokens → "palabras que lee la IA"; contexto → "memoria de la conversación"; subagente → "ayudante que entra y sale"; deploy → "publicar".

## Imagen o video
- Diario: tarjeta con imagen y gráfica.
- Video corto (15 a 30 s, subtítulos grandes, sin tecnicismos) cuando el cambio se ve mejor en movimiento (algo nuevo para jugar) y uno explicativo por semana. Los videos para YouTube Shorts pasan por Jorge antes de salir en público.
