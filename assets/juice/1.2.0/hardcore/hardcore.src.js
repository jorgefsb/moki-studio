/* juice 1.2.0 · módulo «fuerte»: da cuerpo a Mucho y todo a Hardcore · genérico para cualquier marca (colores por --jz-c1..c3).
   Mucho: botones con imán al cursor, tic al pasar, squash al picar, chispas y onda chica, tarjetas que se inclinan.
   Hardcore (level === 'hard'): además screenshake, combos, escombro que se queda, estela y títulos con golpe.
   Nada corre con movimiento reducido. Todo es finito: nada se queda en loop.
   Principios (Forestié, Unite 2019; Jonasson y Purho, «Juice it or lose it»; Nijman, «The art of screenshake»):
   trigger + feedback, capas (primaria + secundaria + ambiente), anticipación, squash y stretch, screenshake,
   partículas que se quedan (permanencia), aleatoriedad, combos y reacción del entorno. */
(function (w, d) {
  'use strict';
  var H = d.documentElement;
  var cs = getComputedStyle(H);
  var C = [cs.getPropertyValue('--jz-c1').trim() || '#FF6B35', cs.getPropertyValue('--jz-c2').trim() || '#22211F', cs.getPropertyValue('--jz-c3').trim() || '#F4E8D5'];
  var T = { es: { on: '¡Hardcore!', combo: '¡Combo!' }, en: { on: 'Hardcore!', combo: 'Combo!' } };
  var layer, debris, combo = 0, comboT, lastTrail = 0, trailN = 0, debrisN = 0;
  var fine = w.matchMedia && w.matchMedia('(pointer: fine)').matches;

  function L() { return T[H.lang === 'en' ? 'en' : 'es']; }
  function on() { return w.JZ && w.JZ.level === 'hard' && !(w.JZ.red && w.JZ.red()); }
  function mucho() { return w.JZ && (w.JZ.level === 'hard' || w.JZ.level === 'full') && !(w.JZ.red && w.JZ.red()); }
  var BTN = 'a.btn,button.btn,.btn,.button,.ds-button,[data-jz],.chip,.ds-chip,.social,.row__cta,.lang-switcher a,.tag--link,.hud__nav a,.vframe__play';
  var lastTick = 0;
  function tick() {
    var a = audio(), now = performance.now(); if (!a || now - lastTick < 90) return; lastTick = now;
    try { tone(a, 1900 * rnd(0.94, 1.06), 1500, a.ctx.currentTime, 0.035, 'triangle', 0.16); } catch (e) {}
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ensure() {
    if (layer) return;
    layer = d.createElement('div'); layer.className = 'jzh-layer'; layer.setAttribute('aria-hidden', 'true');
    debris = d.createElement('div'); debris.className = 'jzh-debris'; debris.setAttribute('aria-hidden', 'true');
    d.body.appendChild(layer); d.body.appendChild(debris);
  }
  function clear() { if (layer) layer.textContent = ''; if (debris) debris.textContent = ''; debrisN = 0; trailN = 0; }

  function audio() { return w.JZ && w.JZ.audio ? w.JZ.audio() : null; }
  function tone(a, f0, f1, t0, dur, type, vol) {
    var c = a.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.out); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function thump(n) {
    var a = audio(); if (!a) return;
    try { var t = a.ctx.currentTime, p = 1 + Math.min(n, 8) * 0.06; tone(a, 160 * p, 55, t, 0.12, 'sine', 0.9); tone(a, 1400 * p * rnd(0.95, 1.05), 700, t, 0.05, 'square', 0.18); } catch (e) {}
  }
  function fanfareMini() {
    var a = audio(); if (!a) return;
    try { var t = a.ctx.currentTime; [392, 523, 659, 784, 1047].forEach(function (f, i) { tone(a, f, f, t + i * 0.07, 0.12, 'square', 0.25); }); } catch (e) {}
  }

  /* Screenshake del contenido (no del body: así los elementos fijos no brincan) */
  function shake(power) {
    var el = d.querySelector(H.getAttribute('data-jz-shake') || 'main') || d.querySelector('main');
    if (!el || !el.animate) return;
    var p = Math.min(power, 3), k = [];
    for (var i = 0; i < 6; i++) k.push({ transform: 'translate(' + rnd(-5, 5) * p + 'px,' + rnd(-4, 4) * p + 'px) rotate(' + rnd(-0.3, 0.3) * p + 'deg)' });
    k.push({ transform: 'none' });
    el.animate(k, { duration: 220 + 40 * p, easing: 'ease-out' });
  }
  /* Squash and stretch del elemento que recibió el clic */
  function squash(el) {
    if (!el || !el.animate) return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12,.86)' }, { transform: 'scale(.94,1.08)' }, { transform: 'scale(1.03,.98)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  }
  /* Partículas con gravedad; algunas caen y se quedan abajo (permanencia) */
  function burst(x, y, n, keepIt) {
    ensure();
    for (var i = 0; i < n; i++) {
      var s = d.createElement('i'), a = rnd(0, Math.PI * 2), v = rnd(60, 190), dx = Math.cos(a) * v, dy = Math.sin(a) * v - rnd(40, 120);
      s.className = 'jzh-p'; s.style.cssText = 'left:' + x + 'px;top:' + y + 'px;background:' + C[i % 3] + ';width:' + rnd(5, 10).toFixed(0) + 'px;height:' + rnd(4, 9).toFixed(0) + 'px';
      layer.appendChild(s);
      var an = s.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + (dy + 260) + 'px) rotate(' + rnd(-540, 540) + 'deg)', opacity: 0.9 }], { duration: rnd(700, 1100), easing: 'cubic-bezier(.2,.6,.6,1)' });
      (function (s, dx, keep) { an.onfinish = function () { s.remove(); if (keep) rest(x + dx); }; })(s, dx, keepIt && i % 3 === 0);
    }
  }
  function rest(x) {
    if (!debris) return;
    if (debrisN >= 90) { var f = debris.firstChild; if (f) { f.remove(); debrisN--; } }
    var b = d.createElement('i'); b.className = 'jzh-b';
    b.style.cssText = 'left:' + Math.max(4, Math.min(innerWidth - 10, x)) + 'px;background:' + C[(Math.random() * 3) | 0] + ';transform:rotate(' + rnd(-60, 60) + 'deg);bottom:' + rnd(0, 6).toFixed(0) + 'px';
    debris.appendChild(b); debrisN++;
  }
  function ring(x, y, big) {
    ensure();
    var r = d.createElement('i'); r.className = 'jzh-ring'; r.style.cssText = 'left:' + x + 'px;top:' + y + 'px;border-color:' + C[0];
    layer.appendChild(r);
    r.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(' + (big ? 9 : 4) + ')', opacity: 0 }], { duration: big ? 700 : 420, easing: 'ease-out' }).onfinish = function () { r.remove(); };
  }
  function pop(x, y, text, big) {
    ensure();
    var t = d.createElement('b'); t.className = 'jzh-pop' + (big ? ' is-big' : ''); t.textContent = text; t.style.cssText = 'left:' + x + 'px;top:' + y + 'px';
    layer.appendChild(t);
    t.animate([{ transform: 'translate(-50%,-30%) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-120%) scale(1.15)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-190%) scale(1)', opacity: 0 }], { duration: big ? 1100 : 750, easing: 'ease-out' }).onfinish = function () { t.remove(); };
  }

  d.addEventListener('click', function (e) {
    if (!mucho() || !e.isTrusted) return;
    var el = e.target.closest && e.target.closest('a,button,[role=button],.btn,.chip,[data-jz],[class*=card],.moki');
    if (!el || el.closest('.jz-panel,.jz-dock')) return;
    var x = e.clientX, y = e.clientY;
    if (!el.classList.contains('moki')) squash(el);
    if (!on()) { burst(x, y, 10, false); ring(x, y, false); thump(1); return; }
    combo = Date.now() - (comboT || 0) < 900 ? combo + 1 : 1; comboT = Date.now();
    shake(1 + combo * 0.3);
    burst(x, y, 14 + Math.min(combo, 6) * 3, true);
    ring(x, y, combo >= 5);
    thump(combo);
    if (combo >= 2) pop(x, y, 'x' + combo, combo >= 5);
    if (combo === 5) { pop(x, y - 30, L().combo, true); fanfareMini(); }
  }, true);

  /* Estela del cursor (solo con mouse); se apaga sola al dejar de moverlo */
  d.addEventListener('pointermove', function (e) {
    if (!fine || !on() || e.pointerType !== 'mouse') return;
    var now = performance.now(); if (now - lastTrail < 38 || trailN > 28) return; lastTrail = now;
    ensure();
    var s = d.createElement('i'); s.className = 'jzh-t'; s.style.cssText = 'left:' + e.clientX + 'px;top:' + e.clientY + 'px;background:' + C[(now / 38 | 0) % 3];
    layer.appendChild(s); trailN++;
    s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 0.85 }, { transform: 'translate(-50%,-50%) translateY(14px) scale(.2)', opacity: 0 }], { duration: 480, easing: 'ease-out' }).onfinish = function () { s.remove(); trailN--; };
  }, { passive: true });

  /* Botones con imán: se acercan al cursor y suenan un tic al llegar (Mucho y Hardcore) */
  var mag = null;
  d.addEventListener('pointermove', function (e) {
    if (!fine || !mucho() || e.pointerType !== 'mouse') return;
    var b = e.target.closest && e.target.closest(BTN);
    if (b && b.closest('.jz-panel,.jz-dock')) b = null;
    if (mag && mag !== b) { mag.style.translate = ''; mag.style.scale = ''; mag.classList.remove('jzh-mag'); mag = null; }
    if (!b) return;
    if (mag !== b) { mag = b; b.classList.add('jzh-mag'); tick(); }
    var r = b.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5, k = on() ? 9 : 5;
    b.style.translate = (px * k).toFixed(1) + 'px ' + (py * k * 0.7).toFixed(1) + 'px';
    b.style.scale = on() ? '1.07' : '1.04';
  }, { passive: true });
  d.addEventListener('pointerleave', function () { if (mag) { mag.style.translate = ''; mag.style.scale = ''; mag.classList.remove('jzh-mag'); mag = null; } }, true);

  /* El entorno reacciona: tarjetas que se inclinan hacia el cursor */
  var TILT = '.topic,.show,.stage,.item,.photo,[class*=card],.asset,.tile';
  d.addEventListener('pointermove', function (e) {
    if (!fine || !mucho()) return;
    var c = e.target.closest && e.target.closest(TILT); if (!c || c.matches(BTN)) return;
    var k2 = on() ? 1 : 0.6;
    var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = 'perspective(800px) rotateX(' + (-py * 5 * k2).toFixed(2) + 'deg) rotateY(' + (px * 6 * k2).toFixed(2) + 'deg) translateZ(0)';
    c.classList.add('jzh-tilt');
  }, { passive: true });
  d.addEventListener('pointerout', function (e) {
    var c = e.target.closest && e.target.closest('.jzh-tilt'); if (!c || (e.relatedTarget && c.contains(e.relatedTarget))) return;
    c.style.transform = ''; c.classList.remove('jzh-tilt');
  }, { passive: true });

  /* Los títulos entran con golpe la primera vez que se ven */
  if ('IntersectionObserver' in w) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (!x.isIntersecting || !on() || x.target.getAttribute('data-jzh')) return;
        x.target.setAttribute('data-jzh', '1');
        if (x.target.animate) x.target.animate([{ transform: 'scale(.9)', opacity: 0.4 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      });
    }, { threshold: 0.6 });
    [].slice.call(d.querySelectorAll('h2')).forEach(function (h) { io.observe(h); });
  }

  /* Al entrar a Hardcore: onda expansiva desde el botón */
  if (w.MutationObserver) new MutationObserver(function () {
    if (!mucho()) { clear(); [].slice.call(d.querySelectorAll('.jzh-tilt')).forEach(function (c) { c.style.transform = ''; c.classList.remove('jzh-tilt'); }); if (mag) { mag.style.translate = ''; mag.style.scale = ''; mag = null; } return; }
    if (!on()) { if (debris) { debris.textContent = ''; debrisN = 0; } return; }
    var b = d.querySelector('.jz-lvl:not([hidden]),.jz-feel'), r = b ? b.getBoundingClientRect() : { left: innerWidth / 2, top: 60, width: 0, height: 0 };
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    ring(x, y, true); burst(x, y, 30); pop(x, y + 40, L().on, true); fanfareMini(); shake(2);
  }).observe(H, { attributes: true, attributeFilter: ['data-jz-level'] });

  w.JZH = { version: '1.2.0', burst: burst, shake: shake, ring: ring, pop: pop };
})(window, document);
