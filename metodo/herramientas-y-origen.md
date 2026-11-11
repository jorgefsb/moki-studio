# Cualquier herramienta, cualquier origen

Canon de Jorge del 8-nov-2026: "No importa si no lo hicimos nosotros. Lo que importa es que hagamos nosotros lo que sea que se necesite para hacer el juego, no importa con qué."

- Arte, música, sonidos, código o datos pueden venir de bancos de assets, datasets, IA o librerías.
- Siguen como puerta: licencia con uso comercial, sin marcas ajenas, la biblia de Moki y que no baje la fluidez del juego.
- Antes de usar algo nuevo se anota en la Biblioteca de Cosas Chidas.
- Preferimos scripts y software a gastar IA cuando se puede.

## Lo que tomamos de gokayfem (9-nov-2026)

Spark revisó los repos públicos de gokayfem (Head of Creative Engineering en fal). Casi todo pide fal de pago o Blender, así que entró poco y barato:

- **shader-art-coding** (shader-skills, MIT): librería GLSL probada para efectos de papel, luz y cielo. Se usa con la skill moki-shaders.
- **Antes y después con número** (idea de DualView, MIT): `herramientas/antes-despues.sh` hace el video de barrida y da el SSIM, con ffmpeg y sin navegador.
- **Mutantes** (método de video-to-css, MIT): una puerta se prueba rompiendo algo a propósito; si no falla, no mide nada.
- **Contrato de estilo** (método de reference-to-game, MIT): lo innegociable del look se escribe antes de crecer el mundo y se compara una escena chica contra la referencia.
- **No entró:** image-to-sculpt (fal de pago), lo de Blender y los demos de H3 Max. Detalle en la Biblioteca de Cosas Chidas.

## Lo que no se usa, se archiva (11-nov-2026)

Del 9 al 11-nov vimos que lo que entró a la COLA se hizo (el primer shader, P6a, quedó en master el mismo día) y lo que solo quedó como regla casi no se usó: el video de antes y después nunca salió en un post y los mutantes se usaron una vez.

Por eso cada herramienta o método que adopta el estudio entra a `herramientas/ADOPTADAS.tsv` con su dueño y cuándo se usa. Cada viernes, sin IA, `herramientas/uso-herramientas.sh --cola` cuenta su uso de la semana. Lo que esté en 0 entra a la COLA como pieza KAIZEN: o una pieza lo usa con evidencia, o el director lo archiva con su razón. Así ninguna herramienta vive de adorno.
