---
name: moki-qa-antes-de-integrar
description: Condiciones para integrar una pieza a master en Moki Studio (PASS del probador más ARTE del director leyendo ARTE.md) y cómo se reporta lo que no se midió. Úsala antes de pedir o dar una integración.
---
# QA antes de integrar · Moki Studio
Fuente: BITACORA y DECISIONES (29-oct a 31-oct), calibración CCGS (qa-tester, qa-lead).

1. **Se integra solo con PASS del probador.** Dato: ecd9521 se integró a master (89775b1) el 31-oct 00:50 con PASS (viga 375 3.40-6.02, 1280 3.05-4.49) y gauntlet sin retroceso; el 29-oct 11:46 no se integró 80fd671 hasta confirmarlo.
2. **Las cifras del constructor se repiten con otra mano.** Dato: el probador repitió el "antes" del fondo (56 y 1309 encimes a 375) y confirmó 0 en nueve casos; aun así quedó dicho que no hubo un segundo instrumento de píxeles.
3. **ARTE lee ARTE.md antes de aprobar y dice qué secciones leyó y qué capturas miró.** Dato: el director aprobó con salvedades citando §4-§6 y §9/§13 y 5 o 6 capturas (31-oct 13:50, 14:35), y nombró lo que no vio (390, movimiento, texto copiado). Esas salvedades pasan al probador.
4. **Cada hallazgo lleva severidad S1-S4, frecuencia, build, plataforma y captura.** El probador describe, no arregla; S1 o S2 se escala al líder (30-oct 09:35).
5. **Lo que no se midió va como NO VERIFICADO con su motivo**, nunca como PASA. Dato: fps, celular real, 4G real, iOS y persona real siguen NO VERIFICADOS (31-oct).
6. **Regresión fija en cada pieza:** clásico 78/78 y 2142, bots (7.4/62.1/120.3 s), Reto 2282, Libre 2112, determinismo idéntico a master y consola en 0 (criterios del director, 31-oct).
7. **Pieza de Phaser nueva = importarla en src/phaser-moki.js y probar en BUILD**, no solo en dev (advertencia del líder, 31-oct 13:22).
8. **El commit congelado es la versión.** Master se congela a las 18:30 CDMX; sin PASS sale el commit anterior, y un nombre de versión nunca se reasigna a otro commit (30-oct 09:35).
9. **Mutantes: la prueba también se prueba.** Cuando nace o cambia una puerta (regresión, FPS, solapes, contraste), el probador rompe algo a propósito en una copia desechable (hitbox en 0, gravedad x2, contador apagado, botón encimado) y la puerta TIENE que fallar. Si pasa, la puerta no mide nada y se arregla antes de usarla. Método de video-to-css (gokayfem, MIT), tomado el 9-nov por Spark.
