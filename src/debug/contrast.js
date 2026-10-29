// Contraste obstáculo/fondo medido en píxeles de pantalla (luminancia WCAG): mediana del cuerpo contra 8 puntos de fondo
// a ±62 px del centro y 20-95 px de altura. Solo con ?debug.
const lum = (c) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

export async function measureContrast(s, type = 'torre', days = [0, 1, 2, 3]) {
  const px = (x, y) => new Promise((res) => s.game.renderer.snapshotPixel(Math.round(x), Math.round(y), (c) => res([c.r, c.g, c.b])));
  const out = {};
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
    for (const D of [260, 330, 400, 470, 540]) {
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
      for (const dy of [hang + h * 0.3, hang + h * 0.55, hang + h * 0.8]) {
        for (const [edge, sg] of [[L, -1], [R, 1]]) {
          let dark = 9;
          for (let k = -3.5; k <= 0.5; k += 0.5) dark = Math.min(dark, lum(await px(sx(edge + sg * k), sy(440 - dy))));
          es.push(ratio(lum(await px(sx(edge + sg * 9), sy(440 - dy))), dark));
        }
      }
      for (const dy of type === 'viga' ? [hang + h * 0.5 - 24, hang + h * 0.5, hang + h * 0.5 + 24, hang + h * 0.5 + 48] : [20, 45, 70, 95]) for (const dx of [-62, 62]) rs.push(ratio(lum(await px(sx(o.x + dx), sy(440 - dy))), Lb));
    }
    out[['manana', 'mediodia', 'tarde', 'noche'][day]] = { min: +Math.min(...rs).toFixed(2), mean: +(rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(2), borde: +(es.reduce((a, b) => a + b, 0) / es.length).toFixed(2) };
  }
  return out;
}
