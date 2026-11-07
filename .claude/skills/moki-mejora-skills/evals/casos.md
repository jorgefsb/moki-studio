# Casos de prueba de moki-mejora-skills

## caso-001 · feedback de Jorge se vuelve skill
- Entrada: Jorge dice "las mariposas siguen con el look viejo".
- Debe salir: lección en la skill de arte responsable, caso nuevo en sus evals, parche de 10 líneas o menos, prueba a ciegas contra el video norte y commit con ganó/perdió.
- Se revisa: existen el caso y el commit; la bitácora tiene la línea.

## caso-002 · las horas de la bitácora se estimaban, no se leían (Spark, 6-nov)
- Entrada: a las 16:16 reales BITACORA y DECISIONES ya traían líneas de 16:25, 16:50 y 18:30; las del director salían con hora adelantada o atrasada (14:25 escrita a las 15:20).
- Debe salir: regla en hecho-mejor-que-perfecto (la hora se saca con `date +%H:%M` al escribir, en el mismo comando que añade la línea, nunca estimada) y prueba de que se cumple.
- Se revisa: toda línea nueva de BITACORA o DECISIONES tiene hora <= la de `date` en ese momento. Prueba: añadir una línea con `echo "- $(date +'%-d-%b %H:%M') ..."` y comprobar que coincide; una línea con hora mayor a la del reloj falla.
- Estado: parche aplicado 6-nov, primera prueba en la bitácora de abajo. Las líneas viejas no se reescriben; se marcan con una corrección.
