// P36k: ¿qué nivel arma cada entrada? ?ir=primera (jugador nuevo: horquilla 1, tutorial), ?nivel=clasico y ?ir=mega (sin horquilla),
// y la 1.ª partida sin liga ni localStorage. Edge headless; consola. Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36k.mjs <url-base> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const casos = [];
async function corre(nombre, q, vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?debug${q}`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene, null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  const r = await page.evaluate(() => {
    const s = window.__moki.scene.scenes[0];
    if (s.screen !== 'play') s.startGame();
    const l = s.level;
    const caja = l.entities.find((e) => e.kind === 'obs' && Math.abs(e.D - 4000) < 1);
    // vuelta B: avanza sin tutorial ni choques hasta que la caja de 4000 px entra y lee sus rótulos
    s.tut = { stage: 4, state: 'off' };
    s.god = true;
    // y desde que entra la caja hasta que sale: ¿la píldora pisa alguna pieza?, ¿queda bajo Moki y las piezas?
    const caja4 = () => s.obstacles.find((q) => Math.abs(q.D - 4000) < 1);
    for (let i = 0; i < 4000 && !(caja4() && caja4().x < s.vw - 60); i++) s.update(0, 1000 / 60);
    const o = caja4();
    const rot = o && o.rot ? o.rot.map((r) => ({ dx: Math.round(r.x - o.x), y: Math.round(r.y), txt: r.list[1].text, vis: r.visible, depth: r.depth, w: Math.round(r.getBounds().width) })) : null;
    let pisaPieza = 0;
    const toca = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
    const mokiDepth = Math.max(...s.children.list.filter((c) => c.texture && /^moki/.test(c.texture.key)).map((c) => c.depth), -1);
    if (o && o.rot)
      for (let i = 0; i < 400 && o.x > -200; i++) {
        s.update(0, 1000 / 60);
        for (const r of o.rot) for (const k of s.pickups) if (Math.abs(k.D - 4000) < 100 && toca(r.getBounds(), k.sprite.getBounds())) pisaPieza++;
      }
    return { rot, pisaPieza, mokiDepth, piezaDepth: 11, vw: s.vw, screen: s.screen, horq: (l.horq || []).length, altos: l.entities.filter((e) => e.alto).length, piezas: l.pieceTotal, caja4000: !!caja, tutStage: s.tut && s.tut.stage, modo: l.modo || 'clasico' };
  });
  console.log(nombre, JSON.stringify(r));
  casos.push({ caso: nombre, ...r });
  await ctx.close();
}
try {
  await corre('ir=primera 390', '&ir=primera', { width: 390, height: 844 });
  await corre('ir=primera 375x667', '&ir=primera', { width: 375, height: 667 });
  await corre('ir=primera 1280', '&ir=primera', { width: 1280, height: 720 });
  await corre('nuevo sin liga 1280', '', { width: 1280, height: 720 });
  await corre('nivel=clasico', '&nivel=clasico', { width: 1280, height: 720 });
  await corre('ir=mega', '&ir=mega', { width: 1280, height: 720 });
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ base, casos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
