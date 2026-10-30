// Contraste obstáculo/fondo medido en píxeles de pantalla (luminancia WCAG): mediana del cuerpo contra 8 puntos de fondo
// a ±62 px del centro y 20-95 px de altura. Solo con ?debug.
// Solo mide posiciones donde el obstáculo y sus muestras caen dentro del lienzo: a 375 en vertical se ven ~390 px
// delante de Moki, y fuera de cuadro snapshotPixel lee el mismo color de fondo y da 1.0 falsos.
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

// probe 'esquinas' repite la sonda de borde de 80fd671 en la viga (tres alturas), para comparar con la de los lados
export async function measureContrast(s, type = 'torre', days = [0, 1, 2, 3], probe = 'lados') {
  const px = (x, y) => new Promise((res) => s.game.renderer.snapshotPixel(Math.round(x), Math.round(y), (c) => res([c.r, c.g, c.b])));
  const out = {};
  let used;
  const skipped = [];
  for (const day of days) {
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
      const pb = document.querySelector('.ui-pausebtn');
      if (pb) pb.style.display = 'none';
      s.screen = 'pause';
      await new Promise((r) => setTimeout(r, 90));
      const cam = s.cameras.main;
      const z = s.zoom;
      const sx = (wx) => (wx - cam.worldView.x) * z;
      const sy = (wy) => (wy - cam.worldView.y) * z;
      const o = s.obstacles[0];
      const h = o.size.height;
      const hang = type === 'viga' ? o.size.hangBottom : 0; // la viga cuelga: sus alturas se miden desde el suelo
      const body = [];
      for (const dy of [hang + h * 0.3, hang + h * 0.55, hang + h * 0.8]) for (const dx of [-20, 20]) body.push(await px(sx(o.x + dx), sy(440 - dy)));
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
            const l = lum(await px(sx(edge + sg * k), sy(440 - dy)));
            dark = Math.min(dark, l);
            light = Math.max(light, l);
          }
          const bg = lum(await px(sx(edge + sg * 9), sy(440 - dy)));
          es.push(oneEdge ? ratio(bg, light) : ratio(bg, dark));
        }
      }
      porD.push(+(es.slice(e0).reduce((a, b) => a + b, 0) / (es.length - e0)).toFixed(2));
      for (const dy of type === 'viga' ? [hang + h * 0.5 - 24, hang + h * 0.5, hang + h * 0.5 + 24, hang + h * 0.5 + 48] : [20, 45, 70, 95]) for (const dx of [-62, 62]) rs.push(ratio(lum(await px(sx(o.x + dx), sy(440 - dy))), Lb));
    }
    out[['manana', 'mediodia', 'tarde', 'noche'][day]] = { min: +Math.min(...rs).toFixed(2), mean: +(rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(2), borde: +(es.reduce((a, b) => a + b, 0) / es.length).toFixed(2), porD };
  }
  out.posiciones = { D: used, fuera: [...new Set(skipped)], ancho: Math.round(s.vw), moki: s.px };
  return out;
}
