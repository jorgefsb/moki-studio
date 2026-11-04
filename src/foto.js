// Modo foto (MAPA-SISTEMAS #3, DECISIONES 3-nov 10:25). Módulo diferido: RunScene lo pide con import() al tocar
// "Tomar foto" en la pausa, así el JS inicial no paga nada de esto. El juego ya está quieto (pausa); aquí se esconde
// el HUD del lienzo y del DOM, se enseña la marca y dos botones, y "Guardar foto" baja un PNG local (nada se sube).
import { feel } from './feel.js';

// Textos del modo foto: viven aquí y no en i18n.js para no sumar al JS inicial (pasan por lectura-fácil igual)
const TXT = {
  guardar: 'Guardar foto',
  volver: 'Volver',
  marca: 'Moki · moki.jorgesuarez.com.mx',
  aria: 'Foto: el juego está quieto y sin números',
};
const t = (k) => TXT[k.slice(5)];

const INK = '#22211F';
const PAPEL = '#F4E8D5';
const KRAFT = '#8A7E70';

// Marca de la esquina: papel crema, tinta y Outfit 700 (marca personal). Mide en px de pantalla; k escala al PNG.
const MARCA = { size: 15, padX: 12, h: 32, borde: 3, margen: 14 };
// En vertical angosto la marca baja a 11 px de letra (a 375 ocupaba 2/3 del ancho); desde ~500 px de ancho va completa
const escalaMarca = (ancho) => Math.min(15, Math.max(11, ancho * 0.03)) / 15;

function dibujarMarca(ctx, W, H, k) {
  const m = MARCA;
  if (!ctx.roundRect) ctx.roundRect = (x, y, w, h) => ctx.rect(x, y, w, h); // navegadores viejos: esquinas rectas
  ctx.font = `700 ${m.size * k}px Outfit, sans-serif`;
  const txt = t('foto.marca');
  const w = ctx.measureText(txt).width + 2 * m.padX * k;
  const h = m.h * k;
  const x = W - m.margen * k - w;
  const y = H - m.margen * k - h;
  ctx.fillStyle = 'rgba(34, 33, 31, 0.22)';
  ctx.beginPath();
  ctx.roundRect(x + 2 * k, y + 3 * k, w, h, 10 * k);
  ctx.fill();
  ctx.fillStyle = PAPEL;
  ctx.strokeStyle = KRAFT;
  ctx.lineWidth = m.borde * k;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10 * k);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, x + m.padX * k, y + h / 2 + 1 * k);
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

let css = false;
function estilos() {
  if (css) return;
  css = true;
  const s = document.createElement('style');
  s.textContent = `
.ui-foto { position: absolute; inset: 0; pointer-events: none; }
.ui-foto .barra { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; pointer-events: auto; }
.ui-foto .ui-btn { margin: 0; white-space: nowrap; box-shadow: 0 3px 0 rgba(34, 33, 31, 0.22); }
.ui-foto .ui-btn + .ui-btn { margin-left: 0; }
.ui-foto canvas.marca { position: absolute; right: 0; bottom: 0; }
.ui-foto .flash { position: absolute; inset: 0; background: ${PAPEL}; opacity: 0; transition: opacity 220ms ease-out; }`;
  document.head.appendChild(s);
}

// Cuadro limpio: del lienzo se esconden el HUD, el tutorial, el aviso de la cinta y el dibujo de depuración
function esconderHud(scene) {
  const piezas = [scene.hudL, scene.hudR, scene.hudC, scene.tutC, scene.cinta && scene.cinta.aviso].filter(Boolean);
  const antes = piezas.map((p) => p.visible);
  piezas.forEach((p) => p.setVisible(false));
  const dbg = scene.debugEl;
  if (dbg) dbg.style.visibility = 'hidden';
  return () => {
    piezas.forEach((p, i) => p.setVisible(antes[i]));
    if (dbg) dbg.style.visibility = '';
  };
}

// PNG del cuadro tal cual (sin HUD) más la marca en la esquina inferior derecha
export function guardarFoto(scene) {
  return new Promise((ok) => {
    scene.game.renderer.snapshot((img) => {
      const W = img.width;
      const H = img.height;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      // El lienzo WebGL trae alfa < 1 donde hay papel translúcido; en pantalla se compone sobre el fondo de la página.
      // Se compone igual aquí para que el PNG se vea como el juego (sin esto, pinos y casas salen lavados)
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);
      dibujarMarca(ctx, W, H, (W / scene.scale.width) * escalaMarca(scene.scale.width));
      c.toBlob((blob) => {
        if (!blob) return ok(null);
        const a = document.createElement('a');
        const d = new Date();
        const f = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
        a.download = `moki-foto-${f}.png`;
        a.href = URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        ok(blob);
      }, 'image/png');
    });
  });
}

export function abrirFoto(scene, onVolver) {
  estilos();
  const ui = scene.ui;
  const root = ui.root;
  const reponer = esconderHud(scene);
  root.classList.add('foto');

  const capa = el('div', 'ui-foto');
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', t('foto.aria'));
  const barra = el('div', 'barra');
  const guardar = el('button', 'ui-btn primary', t('foto.guardar'));
  guardar.type = 'button';
  const volver = el('button', 'ui-btn secondary', t('foto.volver'));
  volver.type = 'button';
  barra.append(guardar, volver);
  barra.addEventListener('pointerdown', (e) => e.stopPropagation());

  // La marca también se ve en pantalla, igual que en el PNG: lo que ves es lo que guardas
  const marca = el('canvas', 'marca');
  const pintarMarca = () => {
    const dpr = window.devicePixelRatio || 1;
    const W = Math.ceil(root.clientWidth);
    const H = 70;
    marca.width = W * dpr;
    marca.height = H * dpr;
    marca.style.width = `${W}px`;
    marca.style.height = `${H}px`;
    dibujarMarca(marca.getContext('2d'), W * dpr, H * dpr, dpr * escalaMarca(W));
  };
  pintarMarca();
  window.addEventListener('resize', pintarMarca);

  const flash = el('div', 'flash');
  capa.append(marca, flash, barra);
  root.appendChild(capa);
  ui.state.foto = capa;

  let ocupado = false;
  guardar.addEventListener('click', async () => {
    if (ocupado) return;
    ocupado = true;
    // La marca de pantalla se quita del DOM, pero el DOM nunca entra al PNG: el snapshot es solo el lienzo
    await guardarFoto(scene);
    // Obturador: destello de papel, nunca con movimiento reducido ni con Efectos en Nada
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches || feel.level === 0;
    if (!quieto) {
      flash.style.transition = 'none';
      flash.style.opacity = '0.7';
      void flash.offsetWidth;
      flash.style.transition = '';
      flash.style.opacity = '0';
    }
    feel.buzz(12, 2);
    ocupado = false;
  });
  volver.addEventListener('click', onVolver);

  scene.fotoFin = () => {
    window.removeEventListener('resize', pintarMarca);
    capa.remove();
    root.classList.remove('foto');
    ui.state.foto = null;
    reponer();
  };
  guardar.focus({ preventScroll: true });
}
