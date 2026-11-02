// Escaparate que enseña lo nuevo (DECISIONES 1-nov 19:00). Solo se importa con ?escaparate (import dinámico desde
// escaparate.js): el juego normal ni baja este archivo ni pide public/novedades.json.
// novedades.json lo llena el cronista al integrar: { fecha, titulo, lineas: [1 a 3], ir_a }. ir_a = la pieza a la que
// va el guion en los primeros 30 s (hoy 'cuaderno'; 'encargos' es lo mismo). Si el json falta o viene roto, no pasa
// nada: el escaparate sigue con su guion de siempre.
const PIEZAS = new Set(['cuaderno', 'encargos']);

export async function cargar() {
  const r = await fetch(`${import.meta.env.BASE_URL}novedades.json`, { cache: 'no-store' });
  const d = await r.json();
  const lineas = Array.isArray(d.lineas) ? d.lineas.filter((x) => typeof x === 'string' && x.trim()).slice(0, 3) : [];
  return { titulo: typeof d.titulo === 'string' && d.titulo.trim() ? d.titulo : 'Lo nuevo de hoy', lineas, ir_a: PIEZAS.has(d.ir_a) ? d.ir_a : null };
}

let cartel = null;

// Cartel de papel arriba al centro, bajo la fila del HUD (a 16 px tapaba sonido y pausa) (tokens de ARTE.md: papel, tinta, canto kraft, radio de tarjeta 12)
export function mostrar(n) {
  if (!cartel) {
    cartel = document.createElement('div');
    cartel.className = 'ui-novedades';
    cartel.setAttribute('role', 'status');
    cartel.style.cssText =
      'position:fixed;left:0;right:0;top:76px;margin:0 auto;width:fit-content;z-index:40;max-width:min(440px,calc(100vw - 32px));' +
      'box-sizing:border-box;padding:12px 16px;background:#F4E8D5;color:#22211F;border:3px solid #8F7254;border-radius:12px;' +
      'box-shadow:3px 5px 0 rgba(34,33,31,.22);pointer-events:none;text-align:left;transition:opacity .3s';
    document.body.appendChild(cartel);
  }
  cartel.replaceChildren();
  const h = document.createElement('p');
  h.textContent = n.titulo;
  h.style.cssText = 'margin:0 0 4px;font:700 20px/24px Outfit,sans-serif';
  cartel.append(h);
  for (const l of n.lineas) {
    const p = document.createElement('p');
    p.textContent = l;
    p.style.cssText = 'margin:2px 0 0;font:400 16px/22px Inter,sans-serif';
    cartel.append(p);
  }
  cartel.style.opacity = '1';
}

export function ocultar() {
  if (cartel) cartel.style.opacity = '0';
}
