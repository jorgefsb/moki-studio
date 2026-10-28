# juice 1.2.0

Igual que 1.1.0, más:

- **Sonido prendido por defecto (opt-out).** `<html data-jz-sound="on">` arranca con sonido mientras la persona no lo haya apagado. El navegador igual espera el primer gesto (clic o tecla) para sonar. Si la persona lo apaga, se respeta para siempre en ese navegador.
- **Marco de invitación en «Juega».** Mientras la persona no haya abierto el menú, el botón trae un anillo de color que gira y una chispa en órbita. Ambos tienen un número fijo de vueltas (nada infinito) y se apagan con movimiento reducido o con `<html data-jz-invite="off">`. Al abrir el menú una vez, ya no vuelve a salir.
- **Cuarto nivel: Hardcore.** Nada · Poquito · Mucho · **Hardcore**. Viene con candado: se desbloquea al encontrar a todos los Mokis del día (o con `<html data-jz-hard="open">` en sitios sin Moki). El módulo `hardcore/` agrega screenshake del contenido, squash y stretch en lo que picas, partículas con gravedad que se quedan abajo como escombro (máximo 90), onda expansiva, combos (x2, x3… «¡Combo!» al x5), estela del cursor, tarjetas que se inclinan hacia el cursor y títulos que entran con golpe. Todo es finito y respeta movimiento reducido.
- **Mucho con cuerpo.** En Mucho el módulo `hardcore/` ya trabaja: los botones se acercan al cursor como imán y suenan un tic corto al llegar, lo que picas se aplasta y rebota, salen chispas y una onda chica, y las tarjetas se inclinan hacia el cursor. Sin escombro ni sacudida de pantalla: eso es de Hardcore.
- **Colores por marca.** `--jz-c1`, `--jz-c2`, `--jz-c3` en `:root` cambian las partículas del núcleo y de Hardcore. Así el mismo paquete sirve para cualquier marca del ecosistema.
- **Moki distinto en cada escondite.** Cada tipo de escondite tiene su grupo de poses y la página reparte poses sin repetir mientras alcancen (y nunca la misma que el vecino). Poses nuevas: jugando, compu, parado, bandera, verifica. Forzar una pose: `data-moki-pose="bandera"`. Los escondites del día nunca quedan pegados.
- **Fiesta más grande en Hardcore:** triple confeti, Moki baila con más poses y el mensaje avisa que se desbloqueó Hardcore.

## Instalar

```html
<html lang="es" data-jz-sound="on" data-moki-show="5">
<link rel="stylesheet" href="/juice/1.2.0/juice.css">
<link rel="stylesheet" href="/juice/1.2.0/juice-menu.css">
<link rel="stylesheet" href="/juice/1.2.0/hardcore/hardcore.css">
<link rel="stylesheet" href="/juice/1.2.0/moki/moki.css">
…
<script src="/juice/1.2.0/juice.js" defer></script>
<script src="/juice/1.2.0/juice-menu.js" defer></script>
<script src="/juice/1.2.0/hardcore/hardcore.js" defer></script>
<script src="/juice/1.2.0/moki/moki.js" defer></script>
```

Hardcore y Moki son opcionales. El screenshake mueve `main` (o lo que diga `data-jz-shake`), nunca el `body`, para que la barra fija no brinque.

## Grupos de poses

| Escondite | Poses |
|---|---|
| arriba | parche, frente, tres-cuartos, bandera, saluda, lado |
| saluda (de pie sobre el panel) | saluda, bandera, parado, jugando, compu, verifica, tres-cuartos |
| cuelga | frente, tres-cuartos, parado (al picarle se voltea: espalda) |
| asoma | asoma |

## Sonido

Prendido por defecto donde el sitio lo pida con `data-jz-sound="on"`, apagable desde el menú. Todo pasa por el volumen maestro de juice (0.125) y solo suena después de un gesto. Los golpes de Hardcore duran menos de 150 ms; la minifanfarria de Hardcore dura unos 0.4 s.

## Presupuestos (gzip -9)

- Núcleo < 6200 B (1.1.0: < 6000). Sube por los colores de marca y el nivel hard.
- Núcleo + menú < 9000 B (1.1.0: < 8000). Sube por el cuarto nivel con candado y el marco de invitación.
- Módulo fuerte (hardcore/) < 4200 B, aparte y opcional. Da imán, tic, squash y chispas en Mucho, y todo lo demás en Hardcore.

## Reglas

Moki nunca se espeja (el parche siempre en su oreja derecha), nunca tapa un botón y no usa loops permanentes. Hardcore nunca bloquea clics, no corre con movimiento reducido y no se imprime. Build y pruebas: `node tools/juice-1.2.0/build.mjs` y `node tools/juice-1.2.0/build.mjs --check`.
