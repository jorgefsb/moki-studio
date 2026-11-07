---
name: hecho-mejor-que-perfecto
description: Úsala SIEMPRE que vayas a pedirle a Jorge una decisión, un OK o una autorización, o que vayas a escribir "esto lo decide Jorge" o "sin pieza cerrable sin Jorge". El equipo decide, implementa, publica y hace postmortem; Jorge califica después, ya en vivo.
---

# Hecho es mejor que perfecto (canon de Jorge, 1-nov-2026 18:00)

Jorge, textual: "quiero que el director y TODOS tengan la libertad de hacer y no se detengan a pedirme decisiones o autorizaciones. Si el equipo decide que algo serviría para mejorar, que se haga. Luego postmortem de su implementación; ya estando en vivo doy calificación y feedback, aprendemos y corregimos o cambiamos, pero DESPUÉS de que ya lo vimos implementado. Esperar a que autorice algo NO aporta valor."

Canon en GBrain: critical-context/moki-studio-hecho-mejor-que-perfecto-2026-11-01 (extiende critical-context/sin-miedo-a-fallar-2026-10-19).

## La regla

1. **Nadie le pide permiso a Jorge para mejorar el juego.** Diseño, arte, colores, papeles, poses, sonido, niveles, horarios del reto, textos: lo decide el equipo.
2. **Si hay una recomendación escrita, esa es la decisión.** Ejemplo: GDD §12 dice "Recomiendo: sí" → ya es sí.
3. **Se decide con evidencia y se prueba en vivo.** La mejor prueba es verlo implementado, no discutirlo antes.
4. **Siempre con red:** rama o SHA anotado antes de integrar, y una línea de cómo revertir.
5. **Siempre postmortem** después de publicar.
6. **Jorge califica después**, del 1 al 5, ya que lo vio. Su feedback entra a la siguiente vuelta.

## Cómo se aplica (cada vez que te tiente preguntarle a Jorge)

1. Escribe tu recomendación en una línea, con el porqué.
2. Esa es tu decisión. Anótala en DECISIONES.md con la marca `[decidido por el equipo]`.
3. Implementa en rama, pasa por el probador e integra a master. El probador sigue revisando, pero ya no es puerta para cosas que se pueden revertir.
4. Publícalo en el ciclo normal (avance o cierre). El cronista lo cuenta con antes, después y número.
5. Postmortem en BITACORA.md: qué salió, SHA y cómo revertir, qué salió bien, qué quedó flojo, qué cambias la próxima vez, y `Calificación de Jorge: pendiente`.

## Lo único que NO decide el equipo (no tiene rollback o es regla dura)

- Mover dinero, cobrar, precios, contratos.
- Borrar sin respaldo. Exponer claves o secretos.
- Otras empresas de Jorge o sus marcas en cualquier pieza de Moki.
- Personas reales sin su permiso.
- Romper el canon de Moki: parche MOKI en la oreja derecha anatómica, nunca espejado, nunca en pose de T.

Todo lo demás se hace.

## Frases prohibidas en el estudio

- "Sin pieza cerrable: lo que queda es de Jorge."
- "Espero el OK de Jorge."
- "Solo con OK de Jorge."

Si lo vas a escribir, aplica esta skill y decide tú.

## Regla de los 30 minutos (Jorge, 6-nov 08:11: canon)
- Nada espera a Jorge. Si Spark o el director le preguntan algo y en 30 minutos no contesta, se avanza con la opción recomendada. Jorge la ajusta después, en vivo, con su feedback.
- Toda pregunta a Jorge lleva su opción recomendada y la hora límite: "Si no contestas a las HH:MM, hago X".
- Pueden aplicar el silencio-es-sí: Spark y el director.
- Puertas que piden "personas": se cubren con invitados a ciegas y bots. Jorge califica después, en vivo.
- Fuera de la regla (siempre esperan a Jorge): dinero, contratos, borrar sin respaldo, secretos, cruzar empresas y personas reales sin permiso.
- Salto visible: cada día a las 18:30 algo que se ve entra a master y a la demo. La pantalla enseña alarma roja si el juego pasa 6 h sin cambios.

## Horas de la bitácora (Spark, 6-nov, caso-002)
- Cada línea de BITACORA.md y DECISIONES.md se escribe SOLO con el comando `bitacora "Rol · texto"` (o `bitacora --decision "Rol · texto"`), que pone fecha y hora reales. Nunca con echo ni a mano: el 7-nov las horas seguían saliendo inventadas (06:42 a las 11:47).
- Si una hora ya quedó mal, no se reescribe: se agrega una línea de corrección con la hora real.
