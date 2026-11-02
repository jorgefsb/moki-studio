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
