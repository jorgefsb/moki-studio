---
name: moki-capturas-con-invitado
description: Regla de la dieta de tokens. Los asientos fijos (director, productor, probador, cronista) no abren capturas ni imágenes en su propia sesión. Las revisa un invitado de contexto limpio y regresa el veredicto en texto. Úsala cada vez que haya que mirar una captura, un antes y después, una tarjeta o una prueba visual.
---
# Capturas con invitado

Fuente: Jorge, 31-oct-2026 22:00, sistema "capturas fuera de la memoria larga" de la dieta de tokens (spec en GBrain specs/moki-dieta-de-tokens-2026-10-31).

## Por qué
Una imagen que abres en tu sesión se queda en tu memoria y se vuelve a mandar en cada llamada siguiente. El 31-oct los asientos abrieron 237 capturas. Si las mira un invitado, la imagen muere con él y tú solo cargas su respuesta en texto.

## Cómo
1. No uses Read sobre .png, .jpg o .webp en tu sesión.
2. Lanza un subagente (herramienta Agent) con este brief:
   - Qué mirar: las rutas exactas de las imágenes (máximo 6).
   - Contra qué: la regla o referencia (ARTE.md §, la captura de antes, alto-0X.png).
   - Qué regresar: veredicto PASA o NO PASA, los números que midió y el hallazgo más grande, en 120 palabras o menos. Sin elogios.
3. Copia su respuesta a tu evidencia o a BITACORA.md tal cual, con la ruta de las imágenes.
4. Excepción: el invitado del gauntlet a ciegas ya es un invitado; él sí abre las imágenes.

## Prueba de que sirvió
La medición diaria (moki-dieta medir) baja "imagenes_en_asientos" hacia 0 y sube "imagenes_en_invitados".
