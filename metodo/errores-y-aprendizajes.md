# Errores y aprendizajes

Cada error grave deja una regla. Lo más nuevo va arriba.

- **8-nov · Estrella de noche que tiraba los cuadros.** Los hilos y el cordel de las estrellas se dibujaban de nuevo en cada cuadro y a 390 px había tirones. Se hornean una vez en un lienzo y se miden doce partidas contra master en la misma tanda. Costó dos pasadas y 104 bytes de más, que el director aceptó a propósito. Regla: dibujo que no cambia se hornea una vez ([[puerta-de-integracion]]).
- **7-nov · Capturas que mentían.** Una chispa no se veía en 8 capturas y el error estaba en el script, que recortaba mal. Después sí había un fallo real: salía de la pantalla. Regla: antes de arreglar el juego, enmarca la cosa en la captura ([[gauntlet-a-ciegas]]).
- **8-nov · Avances que no se podían jugar.** Casi dos semanas anunciando mejoras que vivían donde el jugador no llega, con la portada del primer día. Regla: [[lo-nuevo-se-juega]] y puerta de QA antes de cada publicación.
- **8-nov · Sesión de IA vencida.** El estudio se paró 5 horas sin que nadie lo viera. Ahora el latido lo detecta y el tablero lo enseña en rojo.
- **8-nov · Estudio dormido con trabajo pendiente.** El latido solo despertaba si algo cambiaba; con el estudio quieto nada cambiaba. Ahora despierta si hay cola y pide un salto visible cada 4 horas.
- **8-nov · Esperar datos que no llegan.** El director esperaba 24 horas de datos y en ese tiempo jugó 1 persona. Regla: sin muestra, se mide con bots.
- **8-nov · Música repetitiva.** Un solo tema de 80 s en todos los niveles. Primero se quitó la repetición; el tema nuevo va después, con maquetas a ciegas.
- **8-nov · Luz horneada en cajas.** Tres intentos sin ganar a ciegas. Se paró: el problema era la luz de la escena, no la textura.
- **7-nov · Video con tres encabezados y la misma música.** Se arregló la plantilla y la música cambia cada día. No se borraron los videos publicados.
- **8-nov · Música que sí cambia, pero sin oído.** Se midió que el primer tramo ya no se repite antes de 300 s (antes 80 s). Aprendimos que "no repite" se prueba con números y "suena bien" no: eso lo dice el oído de Jorge. La primera versión repetía en 41 de 200 semillas y las guardas solas no bastaron; hubo que sumar una segunda nota del acorde.
