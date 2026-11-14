# Casos de build-in-public

## caso k1 · regla 21 (Kaizen 14-nov)
- Entrada: bloque del día con `que_cambio` = "la caja ahora avisa antes de llegar" y `la_regamos` = "en MEGA las cajas salían casi sin aviso".
- Debe salir: primera línea con el problema que vio el jugador ("En MEGA las cajas llegaban casi sin aviso."), no con "ya se juega" ni "son N mejoras".
- Cómo se revisa: leer la primera línea; si nombra la novedad antes que el problema, FALLA.
