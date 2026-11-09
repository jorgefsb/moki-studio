# El loop diario

1. **La cola:** COLA.md tiene las piezas pendientes en orden. El director toma la primera que no esté bloqueada.
2. **El latido:** cada hora un script revisa el estudio sin gastar IA. Si hay piezas y nadie se mueve, despierta al director.
3. **Salto visible cada 4 horas:** si el juego lleva 4 horas sin un cambio que se note, el latido pide la pieza visible más chica que no dependa de datos. Esperar datos no frena todo.
4. **Caso, construcción y prueba:** ver [[caso-antes-de-construir]], [[gauntlet-a-ciegas]] y [[puerta-de-integracion]].
5. **Corte a las 18:00:** master se congela para la publicación.
6. **Publicación a las 19:00:** versión del día, entrada de bitácora y recap en video. Ver [[construir-en-publico]].
7. **Avances a las 12:58 y 15:58:** lo que entró durante el día sale publicado sin esperar la noche.

El tablero del estudio enseña en vivo el juego de master, lo que viene y las alarmas: juego sin cambiar, máquina en rojo o sesión vencida.
