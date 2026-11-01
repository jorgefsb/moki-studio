// Contraste obstáculo/fondo medido en píxeles de pantalla (luminancia WCAG): mediana del cuerpo contra 8 puntos de fondo
// a ±62 px del centro y 20-95 px de altura. Solo con ?debug.
// Solo mide posiciones donde el obstáculo y sus muestras caen dentro del lienzo: a 375 en vertical se ven ~390 px
// delante de Moki, y fuera de cuadro el lienzo no tiene píxel (daba 1.0 falsos).
// posiciones 'base': mide las mismas D que a 1280 (260-540) ensanchando el lienzo un rato con el mismo zoom, la misma
// x de Moki y el mismo corte vertical; al terminar todo vuelve a su tamaño.
// Lectura: un solo readPixels del cuadro por posición y los píxeles salen de memoria. Antes era un snapshotPixel
// por muestra, y cada uno espera un cuadro dibujado: en Edge headless (WebGL por software, ~6 fps) eran ~100 cuadros
// por posición y ~200 s por hora del día. Parecía colgado.
const BASE = [260, 330, 400, 470, 540];
const REACH = 72; // muestra más lejana a la derecha del centro: fondo a +62 y borde a +9 de la silueta (la torre mide ~120)
const NEAR = 160; // más cerca que esto el obstáculo se encima con Moki
const positions = (s) => {
  const maxD = Math.floor(s.vw - s.px - REACH);
  const fit = BASE.filter((D) => D <= maxD);
  if (fit.length === BASE.length) return fit;
  const hi = Math.max(NEAR, Math.min(maxD, BASE[BASE.length - 1]));
  return BASE.map((_, i) => Math.round(NEAR + ((hi - NEAR) * i) / (BASE.length - 1)));
};
const lum = (c) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// Siguiente cuadro dibujado, crudo de WebGL (filas de abajo hacia arriba), leído al cerrar el cuadro como lo hace
// snapshotPixel; sin pasar por PNG, que a 1280 costaba ~1.5 s por foto en headless
const grab = (R) =>
  new Promise((res) =>
    R.once('postrender', () => {
      const gl = R.gl;
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const d = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, d);
      res({ w, h, d });
    })
  );

// Ensancha el lienzo para que quepan las D base delante de Moki sin cambiar zoom, x de Moki ni corte vertical
const widen = async (s) => {
  const C = s.game.moki.cfg;
  const old = { maxAspect: C.portrait.maxAspect, visibleWidth: C.portrait.visibleWidth, xMax: C.player.xMax, px: s.px };
  const W = s.scale.width;
  const H = s.scale.height;
  const z = s.zoom;
  const portrait = W / H <= C.portrait.maxAspect;
  const need = Math.ceil((s.px + BASE[BASE.length - 1] + REACH + 4) * z);
  if (need <= W) return null;
  // En horizontal las D base ya caben desde 540 de ancho lógico; solo el vertical se ensancha
  if (!portrait) throw new Error('contrast base: solo hace falta en vertical');
  C.portrait.maxAspect = 1e9;
  C.portrait.visibleWidth = need / z;
  C.player.xMax = s.px;
  const el = s.scale.parent;
  const st = el.getAttribute('style');
  const ov = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden'; // sin barra de desplazamiento que le robe alto al lienzo
  // El contenedor sale de la ventana por la derecha (Phaser lo vuelve a leer cada 500 ms, así que el DOM también cambia);
  // setParentSize aplica ya el tamaño y se espera a que la escena se acomode (headless dibuja ~6 cuadros/s)
  const settle = async (w) => {
    if (w === W) {
      if (st === null) el.removeAttribute('style');
      else el.setAttribute('style', st);
    } else {
      el.style.right = 'auto';
      el.style.width = w + 'px';
    }
    s.scale.setParentSize(w, H);
    for (let i = 0; i < 40 && s.scale.width !== w; i++) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 120));
  };
  await settle(need);
  return {
    ok: Math.abs(s.zoom - z) < 1e-6 && s.scale.height === H && s.scale.width === need && s.px === old.px,
    got: { w: s.scale.width, h: s.scale.height, zoom: s.zoom, px: s.px, need, H, z },
    restore: async () => {
      Object.assign(C.portrait, { maxAspect: old.maxAspect, visibleWidth: old.visibleWidth });
      C.player.xMax = old.xMax;
      document.documentElement.style.overflow = ov;
      await settle(W);
    },
  };
};

// probe 'esquinas' repite la sonda de borde de 80fd671 en la viga (tres alturas), para comparar con la de los lados.
// Tercer argumento: 'lados' | 'esquinas', o { probe, posiciones: 'lienzo' | 'base' } (así main.js no cambia).
// Ej.: moki.contrast('viga', [3], { probe: 'lados', posiciones: 'base' })
export async function measureContrast(s, type = 'torre', days = [0, 1, 2, 3], opt = 'lados') {
  const { probe = 'lados', posiciones = 'lienzo' } = typeof opt === 'string' ? { probe: opt } : opt || {};
  const t0 = performance.now();
  const wide = posiciones === 'base' ? await widen(s) : null;
  if (wide && !wide.ok) {
    await wide.restore();
    throw new Error('contrast base: el lienzo ancho cambió zoom, alto o x de Moki ' + JSON.stringify(wide.got));
  }
  try {
    const out = await run(s, type, days, probe);
    out.posiciones.modo = wide ? 'base' : 'lienzo';
    out.ms = Math.round(performance.now() - t0);
    return out;
  } finally {
    if (wide) await wide.restore();
  }
}

async function run(s, type, days, probe) {
  let frame = null;
  // Misma fila que snapshotPixel de Phaser 3.90: la fila GL bufferHeight-y, que en el lienzo es la y-1 (un píxel arriba).
  // Todos los números registrados salieron así; se conserva para que sigan comparables (A/B en evidencia).
  const px = (x, y) => {
    const i = ((frame.h - Math.round(y)) * frame.w + Math.round(x)) * 4;
    return [frame.d[i], frame.d[i + 1], frame.d[i + 2]];
  };
  const out = {};
  let used;
  const skipped = [];
  const tm = { prep: 0, foto: 0 }; // ms por fase, para ver dónde se va el tiempo
  for (const day of days) {
    const tp = performance.now();
    s.screen = 'play';
    s.startGame();
    s.tut = { stage: 4, state: 'off' };
    s.god = true;
    s.resetRun(s.level, s.level.starts[day]);
    s.ambient.setDay(day, true);
    s.ambient.nextRoll = 1e9;
    s.ambient.cloudNext = 1e9;
    s.ambient.butterNext = 1e9;
    for (let i = 0; i < 30; i++) s.update(0, 16.667);
    tm.prep += performance.now() - tp;
    s.obstacles.forEach((o) => o.destroy());
    s.obstacles = [];
    s.nextEnt = 1e9;
    const rs = [];
    const es = []; // borde: el píxel del contorno de la silueta contra el fondo 6 px afuera
    const porD = []; // borde promedio en cada posición, para ver el rango
    used = positions(s);
    for (const D of used) {
      s.obstacles.forEach((o) => o.destroy());
      s.obstacles = [];
      s.spawnObstacle({ kind: 'obs', type, D: s.dist + D, plan: 'hold' });
      s.placeEntities();
      // Torre y caja entran con un vaivén al azar (sway: 1-2° que vuelven a 0 en 520 ms). La foto es de un solo cuadro,
      // así que se mide ya en reposo; el instrumento viejo lo esquivaba sin querer por tardar varios cuadros por posición.
      if (type !== 'viga') {
        s.obstacles[0].entered = true;
        s.tweens.killTweensOf(s.obstacles[0].sprite);
        s.obstacles[0].sprite.setAngle(0);
      }
      const pb = document.querySelector('.ui-pausebtn');
      if (pb) pb.style.display = 'none';
      s.screen = 'pause';
      // Sin espera fija: la foto es del primer cuadro dibujado después de colocar el obstáculo. La espera de 90 ms de
      // antes quedaba detrás de un cuadro por software (~900 ms a 1280) y no cambia ningún número (A/B en evidencia).
      const tf = performance.now();
      frame = await grab(s.game.renderer);
      tm.foto += performance.now() - tf;
      const cam = s.cameras.main;
      const z = s.zoom;
      const sx = (wx) => (wx - cam.worldView.x) * z;
      const sy = (wy) => (wy - cam.worldView.y) * z;
      const o = s.obstacles[0];
      const h = o.size.height;
      const hang = type === 'viga' ? o.size.hangBottom : 0; // la viga cuelga: sus alturas se miden desde el suelo
      const body = [];
      for (const dy of [hang + h * 0.3, hang + h * 0.55, hang + h * 0.8]) for (const dx of [-20, 20]) body.push(px(sx(o.x + dx), sy(440 - dy)));
      const Lb = body.map(lum).sort((a, b) => a - b)[3];
      const bb = o.sprite.getBounds();
      const L = bb.left + 2;
      const R = bb.right - 2;
      // Respaldo: si con el tamaño real alguna muestra sale del lienzo, la posición no cuenta
      const vx = cam.worldView;
      if (Math.min(o.x - 62, L - 9) < vx.x || Math.max(o.x + 62, R + 9) > vx.right) {
        skipped.push(D);
        continue;
      }
      const e0 = es.length;
      // viga (sonda aceptada por arte, 30-oct): el píxel más claro del contorno de papel contra el fondo 9 px afuera, en
      // el punto medio de los lados rectos (>= 10 px de las esquinas redondeadas). Torre y caja siguen igual que en 80fd671.
      const oneEdge = type === 'viga' && probe === 'lados';
      const edgeDy = oneEdge ? [hang + h * 0.5] : [hang + h * 0.3, hang + h * 0.55, hang + h * 0.8];
      for (const dy of edgeDy) {
        for (const [edge, sg] of [[L, -1], [R, 1]]) {
          let dark = 9;
          let light = 0;
          for (let k = -3.5; k <= 0.5; k += 0.5) {
            const l = lum(px(sx(edge + sg * k), sy(440 - dy)));
            dark = Math.min(dark, l);
            light = Math.max(light, l);
          }
          const bg = lum(px(sx(edge + sg * 9), sy(440 - dy)));
          es.push(oneEdge ? ratio(bg, light) : ratio(bg, dark));
        }
      }
      porD.push(+(es.slice(e0).reduce((a, b) => a + b, 0) / (es.length - e0)).toFixed(2));
      for (const dy of type === 'viga' ? [hang + h * 0.5 - 24, hang + h * 0.5, hang + h * 0.5 + 24, hang + h * 0.5 + 48] : [20, 45, 70, 95]) for (const dx of [-62, 62]) rs.push(ratio(lum(px(sx(o.x + dx), sy(440 - dy))), Lb));
    }
    out[['manana', 'mediodia', 'tarde', 'noche'][day]] = { min: +Math.min(...rs).toFixed(2), mean: +(rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(2), borde: +(es.reduce((a, b) => a + b, 0) / es.length).toFixed(2), porD };
  }
  out.posiciones = { D: used, fuera: [...new Set(skipped)], ancho: Math.round(s.vw), moki: s.px };
  out.fases = { prep: Math.round(tm.prep), foto: Math.round(tm.foto) };
  return out;
}
