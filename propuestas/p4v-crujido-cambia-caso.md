# P4v [audio/feel] El crujido cambia · caso (director, 15-nov 21:10)

## Para quién y por qué
Un jugador que choca varias veces en una partida. Hoy cada tropiezo suena igual: el mismo "tum" de cartón y los mismos 3 granos de papel a 2.2 kHz (P4t, sfx.js `stumble`). Después del tercer choque el oído lo reconoce como un sonido grabado que se repite, no como Moki chocando con *esa* cosa. Jorge (8-nov): "los sonidos incidentales" son parte del feel base, que nunca se da por terminado. Hoy no entró ningún [feel]; P4 sigue bloqueada (COLA:34) y esta pieza no necesita arte ni datos.

## Qué cambia (decide el constructor el cómo)
1. **Tono por tipo de obstáculo**: el material manda (caja de cartón más grave y seca, obstáculo alto o de papel más agudo y largo; la zanja sigue sin crujir). Pocos grupos, no uno por tipo.
2. **Variación entre crujidos**: ningún par de tropiezos seguidos suena igual (número de granos 2 a 4, separación y tono con azar acotado). Que siga leyéndose como el mismo material.
3. **Fuerza según la velocidad**: más rápido = crujido más fuerte y más brillante; a velocidad base, igual que hoy.

## Paso 0
Medir el peso del completo (antes daba +174/+201 B gz) y qué se comparte con `sfx.js` (`noise`, `shape`, `lp`). Si no cabe en +150 B gz, entra 1 + 2 y la velocidad va a COLA.

## Sabremos que estuvo bien si
- Sonda determinista (ganchos de audio con AudioContext falso o registro de parámetros): en 20 tropiezos seguidos en Clásico, 0 pares consecutivos con los mismos parámetros de granos; los grupos de obstáculo dan frecuencia central distinta (>= 15 % entre grupos); la ganancia del crujido sube con la velocidad (x2.0 > base) y a velocidad base queda dentro de ±10 % de master.
- Zanja: 0 granos (igual que master).
- Bots = master, cobros 804/0, consola 0, +150 B gz máximo.
- Volumen pico del tropiezo no pasa el de master + 1.5 dB (no se vuelve molesto).

## Ciego
Los críticos son modelos y no oyen. El ciego de esta pieza es de **números**: un invitado recibe, sin clave, dos tablas de parámetros (rama y master, 20 tropiezos) y dice cuál "se repite". Vara: elige master como la repetida 3 de 3. El oído de Jorge califica después, en vivo (puerta de dos vías: se revierte con un commit).

## Fuera
Música, otros sonidos, sonido nuevo de aterrizaje. Tope 1 h.
