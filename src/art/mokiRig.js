// Moki como títere de papel recortado de moki-lado.webp (ANIMACION.md). Arte oficial, nada nuevo, nunca espejado.
// Todo el rig vive aquí: RunScene solo le pasa el estado y lee el resultado.
import { CONFIG as C } from '../config.js';

const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sineIO = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const rot = (a, x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// ---------- Recortes ----------

export function buildMokiPieces(scene) {
  const img = scene.textures.get('moki').getSourceImage();
  const R = C.rig;
  const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true;
    return [c, x];
  };
  const add = (key, c) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, c);
  };

  // Cuerpo: casco, visor, oreja con parche, torso, mochila de fondo y disco-brazo en UNA pieza rígida.
  {
    const b = R.body;
    const w = b.x1 - b.x0;
    const h0 = b.y1 - b.y0;
    const [c, x] = mk(w, h0 + b.smile);
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(w, 0);
    x.lineTo(w, h0);
    x.quadraticCurveTo(w / 2, h0 + b.smile * 2, 0, h0);
    x.closePath();
    x.clip();
    x.drawImage(img, -b.x0, -b.y0);
    add('moki-body', c);
  }
  // Pierna: sube sobre la cadera con una lengüeta (la fila naranja estirada) que queda tapada por el cuerpo.
  {
    const l = R.leg;
    const w = l.x1 - l.x0;
    const [c, x] = mk(w, l.y1 - l.y0);
    x.drawImage(img, l.x0, l.stretchRow, w, 1, 0, 0, w, l.realFrom - l.y0 + 1);
    x.drawImage(img, l.x0, l.realFrom, w, l.y1 - l.realFrom, 0, l.realFrom - l.y0, w, l.y1 - l.realFrom);
    add('moki-leg', c);
  }
  // Bota: gira sobre el tobillo y pisa plana.
  {
    const b = R.boot;
    const [c, x] = mk(b.x1 - b.x0, b.y1 - b.y0);
    x.drawImage(img, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, 0, 0, b.x1 - b.x0, b.y1 - b.y0);
    add('moki-boot', c);
  }
  // Brazo: del brazo que cuelga en moki-saluda (arte oficial). Va en oposición a las piernas.
  if (scene.textures.exists('mokiSaluda')) {
    const a = R.arm;
    const src = scene.textures.get('mokiSaluda').getSourceImage();
    const [c, x] = mk(a.box.x1 - a.box.x0, a.box.y1 - a.box.y0);
    x.beginPath();
    a.poly.forEach(([px, py], i) => (i ? x.lineTo(px - a.box.x0, py - a.box.y0) : x.moveTo(px - a.box.x0, py - a.box.y0)));
    x.closePath();
    x.clip();
    x.drawImage(src, -a.box.x0, -a.box.y0);
    add('moki-arm', c);
  }
  // Mochila: copia encima del cuerpo (el original queda debajo de relleno).
  {
    const p = R.pack;
    const [c, x] = mk(p.x1 - p.x0, p.y1 - p.y0);
    x.drawImage(img, p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0, 0, 0, p.x1 - p.x0, p.y1 - p.y0);
    add('moki-pack', c);
  }
}

// ---------- Geometría (unidades de la fuente, relativas a la cadera) ----------

function geometry() {
  const R = C.rig;
  const ANK = { x: R.boot.ankle.x - R.hip.x, y: R.boot.ankle.y - R.hip.y };
  const CR = { x: R.sole.x - R.boot.ankle.x, y: R.sole.y - R.boot.ankle.y };
  return { ANK, CR, L: Math.hypot(ANK.x + CR.x, ANK.y + CR.y), hipRestY: R.hip.y - R.sole.y };
}

// theta: grados con signo "hacia adelante positivo" (ANIMACION.md). retract en unidades de la fuente.
function chain(G, thDeg, retract, bwDeg) {
  const th = thDeg * D2R;
  const [ax, ay] = rot(-th, G.ANK.x, G.ANK.y);
  const lx = -Math.sin(th) * retract;
  const ly = -Math.cos(th) * retract;
  const [sx, sy] = rot(bwDeg * D2R, G.CR.x, G.CR.y);
  return { lx, ly, ax: lx + ax, ay: ly + ay, cx: lx + ax + sx, cy: ly + ay + sy, legDeg: -thDeg };
}

function solveTheta(G, targetCx, bw, r = 0) {
  let lo = -80;
  let hi = 80;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (chain(G, mid, r, bw).cx < targetCx) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Ciclo de carrera (unidades de la fuente salvo cyclePx, que son px lógicos de suelo).
// Apoyo: la suela se bloquea al suelo (cx avanza lineal con el mundo) y la cadera pone la altura:
// la pierna se desliza por la pelvis (r) para que la suela pise exactamente el suelo.
// Balanceo: Sine.inOut de despegue a contacto con recogida que nunca deja el pie bajo el suelo.
// El pie pisa plano, así que el recorrido lo da el tobillo (46 src), no la pierna entera (70 src).
function makeRunner(G, theta0, roll) {
  const k = C.player.spriteHeight / C.rig.src.h;
  const duty = C.art.duty;
  const lAnk = Math.hypot(G.ANK.x, G.ANK.y);
  const cx0 = lAnk * Math.sin(theta0 * D2R);
  const bwAt = (s) => (roll ? lerp(-6, 10, s) : 0); // talón al contacto, punta al despegue
  const retractMax = roll ? C.art.retractMax / k : 0;
  const cyContact = chain(G, solveTheta(G, cx0, bwAt(0)), 0, bwAt(0)).cy;
  const hLow = cyContact + 0.5;
  const hAmp = roll ? C.art.cycleBobPx / k : 0;
  const hFlight = roll ? 0.7 * hAmp : 0;
  const hFixed = chain(G, solveTheta(G, cx0, 0), 0, 0).cy;

  const stanceAt = (s, h) => {
    const bw = bwAt(s);
    const cx = cx0 * (1 - 2 * s);
    let r = 0;
    let th = solveTheta(G, cx, bw, 0);
    for (let i = 0; i < 3; i++) {
      r = (chain(G, th, 0, bw).cy - h) / Math.cos(th * D2R);
      th = solveTheta(G, cx, bw, r);
    }
    return { th, r, bw };
  };
  const th0 = stanceAt(0, hLow).th;
  const th1 = stanceAt(1, hLow).th;

  return {
    duty,
    thMax: Math.max(Math.abs(th0), Math.abs(th1), 1), // amplitud máxima de la pierna (para normalizar el brazo)
    // píxeles lógicos de suelo por ciclo completo (dos pasos): D / duty
    cyclePx: (2 * cx0 * k) / duty,
    // altura de la cadera sobre la suela (src): sube a media pisada, baja al contacto
    hip(phi) {
      if (!roll) return hFixed;
      const near = phi < duty ? phi / duty : -1;
      const far = phi >= 0.5 && phi < 0.5 + duty ? (phi - 0.5) / duty : -1;
      const s = near >= 0 ? near : far;
      if (s >= 0) return hLow + hAmp * Math.sin(Math.PI * s);
      const u = phi < 0.5 ? (phi - duty) / (0.5 - duty) : (phi - 0.5 - duty) / (0.5 - duty);
      return hLow + hFlight * Math.sin(Math.PI * clamp(u, 0, 1));
    },
    at(phi, h) {
      if (phi < duty) {
        const s = phi / duty;
        return { ...stanceAt(s, h), stance: true, s };
      }
      const u = (phi - duty) / (1 - duty);
      const e = sineIO(u);
      const th = lerp(th1, th0, e);
      const bw = lerp(bwAt(1), bwAt(0), e);
      const c = chain(G, th, 0, bw);
      const r = Math.max(retractMax * Math.sin(Math.PI * u), (c.cy - h + 3) / Math.cos(th * D2R));
      return { th, r: Math.max(0, r), bw, stance: false, s: 1 };
    },
  };
}

// ---------- Poses de aire (ANIMACION.md 3.2) ----------

function airTarget(vy, tMs) {
  const r = clamp(-vy / 720, 0, 1);
  const f = clamp(vy / 700, 0, 1);
  if (tMs < 90 && vy <= 0) {
    const a = tMs / 90;
    return { nT: lerp(32, 14, a), nR: 3 * a, nB: 0, fT: lerp(-26, -14, a), fR: 3 * a, fB: 0, dy: C.art.squashPx * Math.sin(Math.PI * a), tilt: lerp(3, 0, a) };
  }
  if (tMs < 150 && vy < 0) {
    const a = (tMs - 90) / 60;
    return { nT: lerp(14, 28, a), nR: 0, nB: 8 * a, fT: lerp(-14, -22, a), fR: 2 * a, fB: 4 * a, dy: -2 * a, tilt: lerp(0, 2, a) };
  }
  if (vy < -120) {
    return { nT: 38, nR: 6, nB: lerp(12, 18, r), fT: -22, fR: 4, fB: lerp(8, 14, r), dy: lerp(-1, -2, r), tilt: 2 + r };
  }
  if (vy <= 120) {
    return { nT: 30, nR: 5, nB: 8, fT: -8, fR: 4, fB: 4, dy: 0, tilt: 1 };
  }
  return { nT: lerp(30, 34, f), nR: lerp(5, 0, f), nB: lerp(-4, -10, f), fT: lerp(-8, -28, f), fR: lerp(4, 0, f), fB: lerp(-2, -6, f), dy: 0, tilt: lerp(3, C.art.tiltMaxDeg, f) };
}

// Brazos en el aire: un poco arriba al subir (nunca pasan de la horizontal), abiertos 10° al caer.
function armAir(vy, tMs) {
  const f = clamp(vy / 700, 0, 1);
  if (tMs < 90 && vy <= 0) return { nA: -8, fA: -8 };
  if (vy < -120) return { nA: 35, fA: 35 };
  if (vy <= 120) return { nA: 28, fA: 28 };
  return { nA: lerp(28, 10, f), fA: lerp(28, -10, f) };
}

function deadTarget(tMs) {
  const a = clamp((tMs - C.art.hitStopMs) / 220, 0, 1);
  const e = easeOutCubic(a);
  // Botas separadas (cercana adelante, lejana atrás) para leer "se atoró"
  return { nT: lerp(30, 46, e), nR: 0, nB: -8 * e, fT: lerp(-20, -33, e), fR: 4 * e, fB: 10 * e, dy: 9.5 * e, tilt: lerp(3, C.art.tiltMaxDeg, e) };
}

// ---------- El rig ----------

export function createMokiRig(scene) {
  const A = C.art;
  const R = C.rig;
  const k = C.player.spriteHeight / R.src.h;
  const G = geometry();
  const runFull = makeRunner(G, A.theta0, true);
  const runReduced = makeRunner(G, A.reducedTheta0, false);

  const tex = (key) => scene.textures.get(key).getSourceImage();
  const piece = (key, pivotX, pivotY) => {
    const t = tex(key);
    return scene.add.image(0, 0, key).setOrigin(pivotX / t.width, pivotY / t.height);
  };
  const shadow = (key, pivotX, pivotY) => piece(key, pivotX, pivotY).setTintFill(0x22211f).setAlpha(R.layerShadow.alpha);

  const legPivot = [R.hip.x - R.leg.x0, R.hip.y - R.leg.y0];
  const bootPivot = [R.boot.ankle.x - R.boot.x0, R.boot.ankle.y - R.boot.y0];
  const bodyPivot = [R.hip.x - R.body.x0, R.hip.y - R.body.y0];
  const packPivot = [R.pack.pivot.x - R.pack.x0, R.pack.pivot.y - R.pack.y0];

  const legFar = piece('moki-leg', ...legPivot).setTint(R.farTint);
  const bootFar = piece('moki-boot', ...bootPivot).setTint(R.farTint);
  const shLeg = shadow('moki-leg', ...legPivot);
  const shBoot = shadow('moki-boot', ...bootPivot);
  const legNear = piece('moki-leg', ...legPivot);
  const bootNear = piece('moki-boot', ...bootPivot);
  const shBody = shadow('moki-body', ...bodyPivot);
  const body = piece('moki-body', ...bodyPivot);
  const shPack = shadow('moki-pack', ...packPivot);
  const pack = piece('moki-pack', ...packPivot);

  // Brazos: el lejano va detrás del cuerpo (mismo tinte que la pierna lejana), el cercano delante.
  const hasArm = scene.textures.exists('moki-arm');
  const armPivot = [R.arm.pivot.x - R.arm.box.x0, R.arm.pivot.y - R.arm.box.y0];
  const armFar = hasArm ? piece('moki-arm', ...armPivot).setTint(R.farTint) : null;
  const shArm = hasArm ? shadow('moki-arm', ...armPivot) : null;
  const armNear = hasArm ? piece('moki-arm', ...armPivot) : null;

  const layers = [legFar, bootFar, armFar, shLeg, shBoot, legNear, bootNear, shBody, body, shPack, pack, shArm, armNear].filter(Boolean);
  const root = scene.add.container(0, 0, layers).setDepth(12).setScale(k);

  // Celebración: saluda (arte oficial, brazo arriba) en fundido sobre el títere.
  let saluda = null;
  if (scene.textures.exists('mokiSaluda')) {
    const t = tex('mokiSaluda');
    saluda = scene.add.image(0, 0, 'mokiSaluda').setOrigin(R.hip.x / t.width, 1).setDepth(12.1).setScale(k).setAlpha(0);
  }

  const st = {
    phi: 0,
    w: 1,
    wasGrounded: true,
    air: { nT: 32, nR: 0, nB: 0, fT: -26, fR: 3, fB: 0, dy: 0, tilt: 3, nA: 0, fA: 0 },
    armAirN: 0, // brazos en el aire (filtrados); en carrera salen de la fase de la pierna opuesta
    armAirF: 0,
    packAng: 0,
    packDy: 0,
    lastHip: null,
    hopT: -1,
    deadT: -1,
    sal: 0,
  };
  const debug = { slide: 0, maxSlide: 0, lastSlide: 0, sink: 0, period: 0, cyclePx: runFull.cyclePx, bob: 0, phi: 0, contact: null };
  let stanceRef = null;
  let stanceMax = 0;
  let bobMin = 1e9;
  let bobMax = -1e9;
  let gfx = null;

  const rig = {
    container: root,
    debug,
    // Ángulos actuales en grados (adelante positivo) para medir sin adivinar.
    getAngles() {
      return { ...debug.angles };
    },
    get hopping() {
      return st.hopT >= 0;
    },
    startHop() {
      if (st.hopT < 0) st.hopT = 0;
    },
    cancelHop() {
      st.hopT = -1;
    },
    reset() {
      st.phi = 0;
      st.w = 1;
      st.hopT = -1;
      st.deadT = -1;
      st.wasGrounded = true;
      st.packAng = 0;
      st.packDy = 0;
      st.lastHip = null;
      st.sal = 0;
      st.armAirN = 0;
      st.armAirF = 0;
      if (saluda) saluda.setAlpha(0);
      root.setAlpha(1);
    },
    setVisible(v) {
      root.setVisible(v);
      if (saluda && !v) saluda.setAlpha(0);
    },
    // s: { x, y (pies), grounded, vy, speed, t, takeoffAt, landAt, dead, deadAt, reduced, dist }
    update(s, dtMs) {
      const dt = dtMs / 1000;
      const reduced = s.reduced;
      const runner = reduced ? runReduced : runFull;

      if (s.dead) {
        if (st.deadT < 0) st.deadT = 0;
        else st.deadT += dtMs;
      } else st.deadT = -1;

      // Fase del ciclo: ligada a la velocidad del mundo.
      const landed = s.grounded && !st.wasGrounded;
      st.wasGrounded = s.grounded;
      if (landed) st.phi = 0;
      if (s.grounded && !s.dead && st.hopT < 0) st.phi = (st.phi + (s.speed * dt) / runner.cyclePx) % 1;

      // Celebración (saltito cosmético, cancelable por el jugador).
      let hopY = 0;
      let hopping = false;
      if (st.hopT >= 0) {
        st.hopT += dtMs;
        if (!s.grounded || s.dead || reduced || st.hopT > 520) st.hopT = -1;
        else {
          hopping = true;
          const u = st.hopT - 80;
          if (u > 0 && u < 225) {
            const sec = u / 1000;
            hopY = Math.max(0, 248 * sec - 0.5 * C.gravity * sec * sec);
          }
        }
      }
      const salTarget = hopping && st.hopT > 120 && st.hopT < 450 ? 1 : 0;
      st.sal = lerp(st.sal, salTarget, Math.min(1, dtMs / 83));

      // Pose de carrera
      // Hundimiento de aterrizaje: la cadera baja y las piernas se recogen lo mismo (los pies no se mueven)
      let sq = 0;
      if (!reduced) {
        const ld = s.t - s.landAt;
        if (ld >= 0 && ld < A.landingMs) sq = A.squashPx * (1 - easeOutCubic(ld / A.landingMs));
        if (hopping && st.hopT < 80) sq = Math.max(sq, 2 * Math.sin((Math.PI * st.hopT) / 160));
      }
      const hRun = runner.hip(st.phi) - sq / k;
      const near = runner.at(st.phi, hRun);
      const far = runner.at((st.phi + 0.5) % 1, hRun);
      const runHip = -hRun;
      const runTilt = reduced ? 0 : A.tiltRunDeg + 0.4 * Math.cos(4 * Math.PI * st.phi);

      // Pose de aire / caída / celebración, suavizada
      let tgt;
      if (s.dead) tgt = deadTarget(st.deadT);
      else if (hopping) tgt = airTarget(clamp(-248 + C.gravity * (st.hopT - 80) / 1000, -248, 248), st.hopT);
      else tgt = airTarget(s.vy, s.t - s.takeoffAt);
      if (reduced) tgt = { ...tgt, dy: s.dead ? 8 : 0, tilt: 0, nR: 0, fR: 0, nB: 0, fB: 0 };
      // Tropiezo: el brazo cercano ~20° adelante; el lejano casi pegado (<= 6°) para que no asome como cinta
      Object.assign(tgt, s.dead ? { nA: 20, fA: 4 } : hopping ? armAir(-200, st.hopT) : armAir(s.vy, s.t - s.takeoffAt));
      if (reduced) {
        tgt.nA *= 0.5;
        tgt.fA *= 0.5;
      }
      const a = 1 - Math.exp(-dtMs / 55);
      for (const key of Object.keys(tgt)) st.air[key] += (tgt[key] - st.air[key]) * a;
      const air = st.air;

      // Mezcla aire <-> carrera
      const onGround = s.grounded && !s.dead && !hopping;
      st.w = clamp(st.w + (onGround ? dtMs / 60 : -dtMs / 40), 0, 1);
      const w = st.w;
      const nTh = lerp(air.nT, near.th, w);
      const fTh = lerp(air.fT, far.th, w);
      const nR = lerp(air.nR / k, near.r, w);
      const fR = lerp(air.fR / k, far.r, w);
      const nBw = lerp(air.nB, near.bw, w);
      const fBw = lerp(air.fB, far.bw, w);
      const airHip = G.hipRestY + air.dy / k;
      const hipY = lerp(airHip, runHip, w);
      const tilt = lerp(air.tilt, runTilt, w);

      // Brazos: cada uno en oposición a la pierna de su lado (el cercano va con la pierna lejana),
      // ±18° y un retraso suave de 1 a 2 cuadros. Nunca pasan de la horizontal.
      // En carrera cada brazo sale de la fase de la pierna opuesta, retrasada d de ciclo (tope lagMs): senoide de
      // péndulo, sin filtro, así conserva ±18° a toda velocidad. El filtro queda solo para el aire y la transición.
      const maxA = R.arm.maxDeg * (reduced ? 0.5 : 1);
      const period = runner.cyclePx / Math.max(s.speed, 60); // s por ciclo
      const dLag = Math.min(R.arm.phaseLag, R.arm.lagMs / 1000 / period);
      const wrap = (ph) => ((ph % 1) + 1) % 1;
      const pend = (ph) => clamp(runner.at(wrap(ph), hRun).th / runner.thMax, -1, 1); // pierna opuesta con la fase retrasada
      const armRunN = maxA * pend(st.phi + 0.5 - dLag);
      const armRunF = maxA * pend(st.phi - dLag);
      const lag = 1 - Math.exp(-dtMs / R.arm.lagMs);
      st.armAirN += (air.nA - st.armAirN) * lag;
      st.armAirF += (air.fA - st.armAirF) * lag;
      const armN = clamp(lerp(st.armAirN, armRunN, w), -40, 40);
      const armF = clamp(lerp(st.armAirF, armRunF, w), -40, 40);

      // Mochila con retraso (resorte sobreamortiguado)
      const hipWorld = hipY * k - hopY;
      if (st.lastHip === null) st.lastHip = hipWorld;
      const vel = (hipWorld - st.lastHip) / Math.max(dt, 0.001);
      st.lastHip = hipWorld;
      if (reduced) {
        st.packAng = 0;
        st.packDy = 0;
      } else {
        const lag = Math.min(1, dt * A.packLagHz);
        st.packAng += (clamp(-0.8 * vel, -2.5, 2.5) - st.packAng) * lag;
        st.packDy += (clamp(-vel * 0.015, -1.5, 1.5) - st.packDy) * lag;
      }

      // Colocación (unidades de la fuente; el contenedor escala por k)
      const n = chain(G, nTh, nR, nBw);
      const f = chain(G, fTh, fR, fBw);
      const fdx = R.farDxPx / k;
      const so = { x: R.layerShadow.dx / k, y: R.layerShadow.dy / k };

      legFar.setPosition(f.lx + fdx, hipY + f.ly).setAngle(f.legDeg);
      bootFar.setPosition(f.ax + fdx, hipY + f.ay).setAngle(fBw);
      legNear.setPosition(n.lx, hipY + n.ly).setAngle(n.legDeg);
      bootNear.setPosition(n.ax, hipY + n.ay).setAngle(nBw);
      shLeg.setPosition(n.lx + so.x, hipY + n.ly + so.y).setAngle(n.legDeg);
      shBoot.setPosition(n.ax + so.x, hipY + n.ay + so.y).setAngle(nBw);
      body.setPosition(0, hipY).setAngle(tilt);
      shBody.setPosition(so.x, hipY + so.y).setAngle(tilt);
      const [pox, poy] = rot(tilt * D2R, R.pack.pivot.x - R.hip.x, R.pack.pivot.y - R.hip.y);
      const packY = hipY + poy + st.packDy / k;
      pack.setPosition(pox, packY).setAngle(tilt + st.packAng);
      shPack.setPosition(pox + so.x, packY + so.y).setAngle(tilt + st.packAng);

      if (hasArm) {
        // Hombro: el disco del pecho de moki-lado. El brazo cuelga y gira sobre él; rotación = inclinación del cuerpo - ángulo.
        const [sox, soy] = rot(tilt * D2R, R.arm.shoulder.x - R.hip.x, R.arm.shoulder.y - R.hip.y);
        const sy2 = hipY + soy;
        armNear.setPosition(sox, sy2).setAngle(tilt - armN);
        shArm.setPosition(sox + so.x, sy2 + so.y).setAngle(tilt - armN);
        armFar.setPosition(sox + 1.5 / k, sy2).setAngle(tilt - armF); // hombro lejano 1.5 px adelante para que asome
      }
      debug.angles = { nearLeg: nTh, farLeg: fTh, nearArm: armN, farArm: armF, tilt };

      // Escala SIEMPRE positiva y uniforme (nunca espejado)
      root.setScale(k);
      root.setPosition(s.x, s.y + 2 - 2 * k - hopY);

      if (saluda) {
        const sal = st.sal;
        saluda.setPosition(s.x, s.y + 2 - hopY).setAlpha(sal);
        root.setAlpha(1 - sal * 0.999);
      }

      // Medición (siempre calculada; se muestra con ?anim=debug)
      debug.phi = st.phi;
      debug.hip = hipWorld;
      debug.stance = near.stance;
      debug.nTh = nTh;
      debug.fTh = fTh;
      debug.period = runner.cyclePx / Math.max(s.speed, 1);
      debug.cyclePx = runner.cyclePx;
      if (onGround && near.stance) {
        // Punto visible: el centro de la suela de la bota dibujada (no el modelo). Se mide contra el suelo que corre.
        const [vx, vy] = rot(nBw * D2R, R.sole.x - R.boot.ankle.x, R.src.h - 2 - R.boot.ankle.y);
        const gx = s.x + (n.ax + vx) * k + (s.dist || 0);
        if (stanceRef === null) {
          stanceRef = gx;
          stanceMax = 0;
        }
        stanceMax = Math.max(stanceMax, Math.abs(gx - stanceRef));
        debug.slide = stanceMax;
        // Penetración: la esquina más baja de la bota contra la línea del suelo (positivo = bajo el suelo)
        let low = -1e9;
        for (const [cxl, cyl] of [[R.boot.x0 + 3 - R.boot.ankle.x, R.src.h - 2 - R.boot.ankle.y], [R.boot.x1 - 4 - R.boot.ankle.x, R.src.h - 2 - R.boot.ankle.y]]) {
          const [ex, ey] = rot(nBw * D2R, cxl, cyl);
          void ex;
          low = Math.max(low, (hipY + n.ay + ey) * k + (s.y + 2 - 2 * k) - (s.y + 2));
        }
        debug.sink = low;
      } else if (stanceRef !== null) {
        debug.lastSlide = stanceMax;
        debug.maxSlide = Math.max(debug.maxSlide, stanceMax);
        stanceRef = null;
      }
      if (onGround && !reduced) {
        bobMin = Math.min(bobMin, hipWorld);
        bobMax = Math.max(bobMax, hipWorld);
        debug.bob = bobMax - bobMin;
      }
      if (rig.debugOn) rig.drawDebug(s, n, f, hipY, k);
    },
    // Solo para capturas: congela la fase del ciclo (el estado del mundo no cambia).
    setPhi(p) {
      st.phi = p;
      st.w = 1;
    },
    resetBob() {
      bobMin = 1e9;
      bobMax = -1e9;
      debug.maxSlide = 0;
      debug.bob = 0;
    },
    debugOn: false,
    drawDebug(s, n, f, hipY, kk) {
      if (!gfx) gfx = scene.add.graphics().setDepth(200);
      gfx.clear();
      const ox = s.x;
      const oy = s.y + 2 - 2 * kk;
      const dot = (x, y, color) => {
        gfx.fillStyle(color, 1);
        gfx.fillCircle(ox + x * kk, oy + y * kk, 2);
      };
      dot(0, hipY, 0x00ffff); // cadera
      dot(n.ax, hipY + n.ay, 0xffff00); // tobillo cercano
      dot(n.cx, hipY + n.cy, 0xff00ff); // suela cercana (punto bloqueado)
      dot(f.ax + R.farDxPx / kk, hipY + f.ay, 0x88aa00);
      dot(f.cx + R.farDxPx / kk, hipY + f.cy, 0xaa00aa);
    },
    destroy() {
      root.destroy();
      if (saluda) saluda.destroy();
      if (gfx) gfx.destroy();
    },
  };
  return rig;
}
