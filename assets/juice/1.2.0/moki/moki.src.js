/* Moki escondido · juice 1.2.0 · BrandKit de JorgeSuarez.com.mx · sin dependencias.
   Niveles de juice: Nada (o movimiento reducido) = Moki quieto que solo cambia de pose; Poquito = se asoma y reacciona;
   Mucho = más brincos, chispas y fiesta. Sonido solo si el botón de sonido está prendido y después de un gesto.
   Cada día los Mokis cambian de lugar (si hay más escondites que data-moki-show) y el contador es «Mokis de hoy».
   1.2.0: cada escondite saca una pose distinta de su grupo (nunca la misma pose dos veces en la página si alcanza),
   los escondites del día nunca quedan pegados, y encontrar a todos desbloquea el nivel Hardcore de Juega. */
(function (w, d) {
  'use strict';
  var H = d.documentElement;
  var me = d.currentScript && d.currentScript.src;
  var BASE = me ? me.replace(/[^/]*$/, '') : 'juice/1.2.0/moki/';
  var KEY = 'moki-escondido';
  var POSE = { arriba: 'parche', saluda: 'saluda', cuelga: 'frente', asoma: 'asoma' };
  /* Grupos de poses por escondite. Ninguna se refleja: el parche siempre queda en la oreja derecha de Moki. */
  var POOL = {
    arriba: ['parche', 'frente', 'tres-cuartos', 'bandera', 'saluda', 'lado'],
    saluda: ['saluda', 'bandera', 'parado', 'jugando', 'compu', 'verifica', 'tres-cuartos'],
    cuelga: ['frente', 'tres-cuartos', 'parado'],
    asoma: ['asoma']
  };
  /* Ancho entre alto de cada pose (las imágenes miden 260 px de alto) para que nada se recorte */
  var AR = { asoma: 0.85, bandera: 0.97, compu: 1.49, espalda: 0.99, frente: 0.95, jugando: 0.76, lado: 0.52, parado: 0.6, parche: 1.02, saluda: 0.77, 'tres-cuartos': 0.9, verifica: 1.36 };
  var DANCE = ['espalda', 'saluda', 'bandera', 'jugando', 'parado', 'saluda', 'tres-cuartos', 'bandera'];
  var COL = ['#FF6B35', '#FFA500', '#F4E8D5', '#B99168'];
  var TXT = {
    es: {
      ay: ['¡Ay!', '¡Ay, mis pompis!', '¡Oye, eso pica!', '¡Cosquillas no!', '¡Uy, qué susto!', 'Jijiji', '¡Me encontraste!'],
      label: 'Moki está escondido aquí. Pícale.',
      drag: 'Moki cuelga de un hilo. Pícale o jálalo para moverlo.',
      count: function (n, t) { return 'Mokis de hoy: ' + n + ' de ' + t; },
      again: 'Ya lo habías encontrado hoy.',
      win: function (t) { return '¡Encontraste los ' + t + ' Mokis de hoy!'; },
      winSub: 'Mañana se esconden en otros lugares. ¿Te animas a volver?',
      hard: 'Desbloqueaste el nivel Hardcore en Juega. Pruébalo.',
      streak: function (n) { return n > 1 ? 'Llevas ' + n + ' días seguidos.' : ''; }
    },
    en: {
      ay: ['Ouch!', 'Hey, my bum!', 'Hey, that tickles!', 'No tickling!', 'Yikes!', 'Hee hee', 'You found me!'],
      label: 'Moki is hiding here. Poke him.',
      drag: 'Moki hangs from a thread. Poke him or drag him to move him.',
      count: function (n, t) { return "Today's Mokis: " + n + ' of ' + t; },
      again: 'You already found this one today.',
      win: function (t) { return 'You found all ' + t + " of today's Mokis!"; },
      winSub: 'Tomorrow they hide somewhere else. Come back?',
      hard: 'You unlocked Hardcore in Play. Try it.',
      streak: function (n) { return n > 1 ? n + ' days in a row.' : ''; }
    }
  };
  var reduce = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var mokis = [], chip, chipT, ownCtx, lastPhrase = -1, party = null;
  var day = (function () { var t = new Date(); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); })();
  var state = load();

  function L() { return TXT[H.lang === 'en' ? 'en' : 'es']; }
  function lvl() { if (reduce.matches) return 'off'; var v = w.JZ ? w.JZ.level : (H.getAttribute('data-jz-level') || 'subtle'); return v === 'off' || v === 'full' || v === 'hard' ? v : 'subtle'; }
  function still() { return lvl() === 'off'; }
  function mucho() { var v = lvl(); return v === 'full' || v === 'hard'; }
  function hard() { return lvl() === 'hard'; }
  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY + ':v2') || '{}') || {}; } catch (e) {}
    if (s.day !== day) { s.day = day; s.found = []; s.won = false; }
    s.found = s.found || []; s.streak = s.streak || 0; s.pos = s.pos || {};
    return s;
  }
  function save() { try { localStorage.setItem(KEY + ':v2', JSON.stringify(state)); } catch (e) {} }

  /* PRNG con semilla del día: los escondites cambian cada día y son iguales todo ese día */
  function seeded(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* Sonido: usa el audio de juice (respeta su botón y su volumen); si no hay juice, uno propio y discreto */
  function audio() {
    if (w.JZ && w.JZ.audio) return w.JZ.audio() || null;
    var b = d.querySelector('.juice-sfx'), on = false;
    if (b) on = b.getAttribute('aria-pressed') === 'true'; else { try { on = localStorage.getItem('gamedev_sfx') === 'on'; } catch (e) {} }
    if (!on) return null;
    var A = w.AudioContext || w.webkitAudioContext; if (!A) return null;
    if (!ownCtx) { var c = new A(), g = c.createGain(); g.gain.value = 0.125; g.connect(c.destination); ownCtx = { ctx: c, out: g }; }
    if (ownCtx.ctx.state === 'suspended') ownCtx.ctx.resume();
    return ownCtx;
  }
  function tone(a, f0, f1, t0, dur, type, vol) {
    var c = a.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = type; f.type = 'lowpass'; f.frequency.value = 2600;
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(f); f.connect(g); g.connect(a.out); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function sndAy(first) {
    var a = audio(); if (!a) return;
    try {
      var t = a.ctx.currentTime, p = 0.92 + Math.random() * 0.16;
      if (first) { tone(a, 1318, 1318, t, 0.08, 'triangle', 0.5); tone(a, 1760, 1760, t + 0.07, 0.12, 'triangle', 0.45); t += 0.12; }
      tone(a, 520 * p, 900 * p, t, 0.07, 'sawtooth', 0.55);
      tone(a, 900 * p, 300 * p, t + 0.07, 0.24, 'sawtooth', 0.6);
      tone(a, 240 * p, 520 * p, t + 0.36, 0.09, 'sine', 0.5);
      tone(a, 260 * p, 560 * p, t + 0.5, 0.09, 'sine', 0.5);
    } catch (e) {}
  }
  function sndFanfare() {
    var a = audio(); if (!a) return;
    try {
      var t = a.ctx.currentTime + 0.05, n = [523, 659, 784, 1047], i;
      for (i = 0; i < 4; i++) { tone(a, n[i], n[i], t + i * 0.13, 0.16, 'square', 0.32); tone(a, n[i] / 2, n[i] / 2, t + i * 0.13, 0.16, 'triangle', 0.4); }
      t += 0.58;
      for (i = 0; i < 6; i++) tone(a, i % 2 ? 1175 : 1047, i % 2 ? 1175 : 1047, t + i * 0.07, 0.08, 'square', 0.22);
      t += 0.5;
      [523, 659, 784, 1047].forEach(function (f) { tone(a, f, f, t, 0.9, 'triangle', 0.32); tone(a, f * 1.002, f * 1.002, t, 0.9, 'square', 0.08); });
      tone(a, 130, 65, t, 0.5, 'sine', 0.6);
    } catch (e) {}
  }

  function sparks(el, n) {
    if (still()) return;
    var r = el.getBoundingClientRect(), host = d.body, i;
    for (i = 0; i < n; i++) {
      var s = d.createElement('span'), a = Math.PI * 2 * i / n + Math.random() * 0.5, di = 26 + Math.random() * 30;
      s.className = 'moki__spark';
      s.style.cssText = 'position:fixed;z-index:65;left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + Math.min(r.height, 80) / 2) + 'px;background:' + COL[i % 4] + ';--dx:' + (Math.cos(a) * di).toFixed(1) + 'px;--dy:' + (Math.sin(a) * di).toFixed(1) + 'px';
      host.appendChild(s);
      s.addEventListener('animationend', function () { this.remove(); });
    }
  }

  function showCount(sub) {
    var t = mokis.length; if (!t) return;
    if (!chip) {
      chip = d.createElement('div'); chip.className = 'moki-count'; chip.setAttribute('role', 'status');
      chip.innerHTML = '<img src="' + BASE + 'moki-parche.webp" alt="" width="30" height="30"><span><b></b><small hidden></small></span>';
      d.body.appendChild(chip);
    }
    var n = mokis.filter(function (m) { return state.found.indexOf(m.id) >= 0; }).length;
    chip.querySelector('b').textContent = L().count(n, t);
    var sm = chip.querySelector('small'); sm.textContent = sub || ''; sm.hidden = !sub;
    chip.classList.toggle('is-still', still());
    chip.classList.add('is-on'); clearTimeout(chipT);
    chipT = setTimeout(function () { chip.classList.remove('is-on'); }, 2600);
    return n >= t;
  }

  /* Fiesta del 5 de 5: el contador viaja al centro, explota confeti y Moki sale bailando de atrás */
  function celebrate() {
    if (party) return;
    var t = mokis.length;
    if (state.lastWin !== day) { state.streak = isYesterday(state.lastWin) ? (state.streak || 0) + 1 : 1; state.lastWin = day; }
    state.won = true; save();
    var wrap = d.createElement('div'); wrap.className = 'moki-party';
    wrap.innerHTML = '<canvas aria-hidden="true"></canvas><img class="moki-party__moki" src="' + BASE + 'moki-saluda.webp" alt=""><button type="button" class="moki-party__card" role="status"><b></b><span></span></button>';
    d.body.appendChild(wrap); party = wrap;
    var card = wrap.querySelector('.moki-party__card'), mk = wrap.querySelector('.moki-party__moki');
    card.querySelector('b').textContent = L().win(t);
    var unlock = false;
    try { unlock = localStorage.getItem('jz-hard') !== '1'; localStorage.setItem('jz-hard', '1'); } catch (e) {}
    card.querySelector('span').textContent = (L().streak(state.streak) + ' ' + L().winSub + (unlock ? ' ' + L().hard : '')).trim();
    try { d.dispatchEvent(new CustomEvent('jz:unlock-hard')); } catch (e) {}
    if (chip) { clearTimeout(chipT); chip.classList.remove('is-on'); }
    var calm = still();
    if (!calm && card.animate) {
      var cr = card.getBoundingClientRect();
      var fromX = 16 + 140 - (cr.left + cr.width / 2), fromY = (innerHeight - 40) - (cr.top + cr.height / 2);
      card.animate([
        { transform: 'translate(calc(-50% + ' + fromX + 'px), calc(-50% + ' + fromY + 'px)) scale(.45)', opacity: 0.6 },
        { transform: 'translate(-50%,-50%) scale(1.06)', opacity: 1, offset: 0.75 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
      ], { duration: 650, easing: 'cubic-bezier(.2,.9,.25,1.2)', fill: 'both' });
      requestAnimationFrame(function () { wrap.classList.add('is-in'); });
      var k = 0;
      (function dance() { if (!party || k > 7) return; k++; setTimeout(function () { if (!party) return; mk.src = BASE + 'moki-' + DANCE[k % DANCE.length] + '.webp'; dance(); }, hard() ? 330 : 470); })();
      setTimeout(function () { confetti(wrap.querySelector('canvas'), hard() ? 3 : mucho() ? 2 : 1); }, 380);
    } else { mk.style.opacity = '1'; mk.style.transform = 'translateY(-140%)'; }
    sndFanfare();
    if (w.JZ && w.JZ.hap) w.JZ.hap('success');
    function close() {
      if (!party) return;
      party = null;
      if (!calm && card.animate) { var an = wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'both' }); an.onfinish = function () { wrap.remove(); }; }
      else wrap.remove();
      d.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    card.addEventListener('click', close);
    d.addEventListener('keydown', onKey);
    setTimeout(close, 6500);
  }
  function isYesterday(s) {
    if (!s) return false;
    var p = s.split('-'), a = new Date(+p[0], +p[1] - 1, +p[2]), b = new Date(); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 864e5) === 1;
  }
  function confetti(cv, power) {
    var ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return;
    var dpr = Math.min(w.devicePixelRatio || 1, 2), W = innerWidth, Hh = innerHeight;
    cv.width = W * dpr; cv.height = Hh * dpr; ctx.scale(dpr, dpr);
    var ps = [], i, N = power > 2 ? 260 : power > 1 ? 170 : 90, life = power > 2 ? 3400 : 2600;
    function burst(x, y, n, spread, up) {
      for (i = 0; i < n; i++) {
        var a = (up ? -Math.PI / 2 : 0) + (Math.random() - 0.5) * spread, v = 7 + Math.random() * 9;
        ps.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (up ? 0 : 4), r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, c: COL[i % 4] });
      }
    }
    burst(W / 2, Hh / 2, N, Math.PI * 2, false);
    if (power > 1) { burst(0, Hh, 60, 0.9, true); burst(W, Hh, 60, 0.9, true); ps.slice(-60).forEach(function (p) { p.vx = -Math.abs(p.vx); }); ps.slice(-120, -60).forEach(function (p) { p.vx = Math.abs(p.vx); }); }
    if (power > 2) { burst(W * 0.25, Hh * 0.35, 70, Math.PI * 2, false); burst(W * 0.75, Hh * 0.35, 70, Math.PI * 2, false); }
    var t0 = performance.now();
    (function frame(now) {
      var el = now - t0; ctx.clearRect(0, 0, W, Hh);
      ps.forEach(function (p) {
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - el / life); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (el < life && cv.isConnected) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, Hh);
    })(t0);
  }

  function phrase() {
    var a = L().ay, i;
    do { i = Math.floor(Math.random() * a.length); } while (a.length > 1 && i === lastPhrase);
    lastPhrase = i; return a[i];
  }

  function poke(m) {
    if (m.busy) return; m.busy = true;
    var el = m.el, first = state.found.indexOf(m.id) < 0;
    clearTimeout(m.t);
    el.classList.add('is-out');
    el.classList.toggle('is-still', still());
    el.classList.toggle('is-mucho', mucho());
    m.bubble.textContent = first && Math.random() < 0.5 ? L().ay[L().ay.length - 1] : phrase();
    if (m.kind === 'cuelga') { m.img.src = BASE + 'moki-espalda.webp'; kick(m, (Math.random() < 0.5 ? -1 : 1) * (mucho() ? 3.2 : 2)); }
    void el.offsetWidth; el.classList.add('is-ay');
    sndAy(first);
    sparks(el, hard() ? 20 : mucho() ? 12 : 6);
    if (w.JZ && w.JZ.hap) w.JZ.hap('tap');
    if (first) { state.found.push(m.id); save(); }
    var all = showCount(first ? '' : L().again);
    if (all && first) setTimeout(celebrate, still() ? 200 : 900);
    setTimeout(function () {
      el.classList.remove('is-ay');
      if (m.kind === 'cuelga') m.img.src = BASE + 'moki-' + m.pose + '.webp';
      m.busy = false;
      if (m.kind === 'asoma' && !still()) { el.classList.remove('is-out'); m.t = setTimeout(function () { out(m); }, 2600); }
    }, mucho() ? 1950 : 1600);
  }

  /* Péndulo con resorte para el Moki que cuelga: se jala, se columpia y se queda donde lo sueltas */
  function swingTo(m) { m.swing.style.transform = 'rotate(' + (m.th * 57.2958).toFixed(2) + 'deg)'; }
  function kick(m, w0) { if (still()) return; m.om += w0; run(m); }
  function run(m) {
    if (m.raf || still()) return;
    var last = performance.now();
    function step(now) {
      var dt = Math.min((now - last) / 1000, 0.033); last = now;
      if (!m.dragging) {
        var Lp = Math.max(m.rope + m.size * 0.5, 40);
        m.om += (-(2400 / Lp) * Math.sin(m.th) - 1.7 * m.om) * dt;
        m.th += m.om * dt;
      }
      swingTo(m);
      if (m.dragging || Math.abs(m.th) > 0.002 || Math.abs(m.om) > 0.004) m.raf = requestAnimationFrame(step);
      else { m.th = 0; m.om = 0; swingTo(m); m.raf = 0; }
    }
    m.raf = requestAnimationFrame(step);
  }
  function setRope(m, px) { m.rope = Math.max(m.size * 0.35, Math.min(px, m.size * 2.4)); m.el.style.setProperty('--rope', m.rope.toFixed(0) + 'px'); }
  function physics(m) {
    m.th = 0; m.om = 0; m.size = parseFloat(getComputedStyle(m.el).getPropertyValue('--moki')) || 96;
    var saved = state.pos[m.id];
    var r0 = parseFloat(m.el.style.getPropertyValue('--rope'));
    setRope(m, saved ? saved.r : (r0 > 0 ? r0 : m.size * 0.75));
    if (saved && m.el.parentElement) { m.el.style.right = 'auto'; m.el.style.left = saved.x + '%'; }
    var sx, sy, ox, moved, lx, lt, vx;
    m.el.addEventListener('pointerdown', function (e) {
      if (e.button || still()) return;
      sx = e.clientX; sy = e.clientY; moved = false; lx = e.clientX; lt = performance.now(); vx = 0;
      var hr = m.el.parentElement.getBoundingClientRect(), er = m.el.getBoundingClientRect();
      ox = er.left + er.width / 2 - hr.left;
      m.ropeStart = m.rope;
      try { m.el.setPointerCapture(e.pointerId); } catch (x) {}
    });
    m.el.addEventListener('pointermove', function (e) {
      if (sx === undefined) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) { moved = true; m.dragging = true; m.el.classList.add('is-drag', 'is-out', 'is-down'); clearTimeout(m.t); run(m); }
      var hr = m.el.parentElement.getBoundingClientRect(), now = performance.now();
      var x = Math.max(m.size, Math.min(hr.width - m.size, ox + dx));
      m.el.style.right = 'auto'; m.el.style.left = ((x - m.el.offsetWidth / 2) / hr.width * 100).toFixed(2) + '%';
      setRope(m, m.ropeStart + dy);
      vx = (e.clientX - lx) / Math.max(now - lt, 1) * 1000; lx = e.clientX; lt = now;
      m.th = Math.max(-0.9, Math.min(0.9, -vx / 2200));
    });
    function end(e) {
      if (sx === undefined) return;
      sx = undefined;
      try { m.el.releasePointerCapture(e.pointerId); } catch (x) {}
      if (!moved) return;
      m.dragging = false; m.el.classList.remove('is-drag'); m.om = -vx / 900; m.skipClick = true; setTimeout(function () { m.skipClick = false; }, 60);
      state.pos[m.id] = { x: parseFloat(m.el.style.left) || 0, r: m.rope }; save();
      run(m);
    }
    m.el.addEventListener('pointerup', end);
    m.el.addEventListener('pointercancel', end);
  }

  function out(m) {
    if (m.busy) return;
    m.el.classList.add('is-out');
    if (m.kind === 'saluda') { m.el.classList.remove('is-wave'); void m.el.offsetWidth; m.el.classList.add('is-wave'); }
    if (m.kind === 'cuelga') { setTimeout(function () { if (m.el.classList.contains('is-out')) { m.el.classList.add('is-down'); kick(m, 1.2); } }, still() ? 0 : 720); }
    if (still()) return;
    /* De vez en cuando se esconde y vuelve a salir; en Mucho sale más seguido */
    clearTimeout(m.t);
    var stay = (hard() ? 4000 : mucho() ? 6000 : 7000) + Math.random() * (hard() ? 5000 : 8000);
    m.t = setTimeout(function () {
      if (m.busy || m.dragging || m.el.matches(':hover') || d.activeElement === m.el) { out(m); return; }
      if (m.kind === 'cuelga' && state.pos[m.id]) { kick(m, 1); out(m); return; }
      m.el.classList.remove('is-out', 'is-down');
      m.t = setTimeout(function () { if (m.seen) out(m); }, (hard() ? 1500 : mucho() ? 3000 : 5000) + Math.random() * (hard() ? 3000 : 8000));
    }, stay);
  }

  function label() {
    mokis.forEach(function (m) { m.el.setAttribute('aria-label', m.kind === 'cuelga' ? L().drag : L().label); });
    if (chip && chip.classList.contains('is-on')) showCount();
  }

  /* Reparte poses: primero las que nadie trae en la página; si se acaban, la menos usada y nunca igual a la del vecino */
  var used = {}, prevPose = '', rp = seeded('pose' + day + location.pathname);
  function choose(kind, forced) {
    if (forced && AR[forced]) return forced;
    var pool = POOL[kind].slice(), i, j, t, best = null;
    for (i = pool.length - 1; i > 0; i--) { j = Math.floor(rp() * (i + 1)); t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    pool.forEach(function (p) { if (p === prevPose && pool.length > 1) return; if (best === null || (used[p] || 0) < (used[best] || 0)) best = p; });
    return best || pool[0];
  }
  function build(span, i) {
    var kind = POSE[span.getAttribute('data-moki')] ? span.getAttribute('data-moki') : 'arriba';
    var pose = choose(kind, span.getAttribute('data-moki-pose'));
    used[pose] = (used[pose] || 0) + 1; prevPose = pose;
    var id = span.getAttribute('data-moki-id') || (location.pathname + '#' + i);
    var b = d.createElement('button');
    b.type = 'button';
    b.className = 'moki moki--' + kind + (span.className ? ' ' + span.className : '');
    if (span.getAttribute('style')) b.setAttribute('style', span.getAttribute('style'));
    b.setAttribute('data-moki-pose', pose);
    b.setAttribute('data-moki-spot', id);
    b.style.setProperty('--moki-ar', AR[pose]);
    var src = BASE + 'moki-' + pose + '.webp';
    var img = '<img class="moki__img" src="' + src + '" alt="" loading="lazy" decoding="async" draggable="false">';
    b.innerHTML = (kind === 'cuelga'
      ? '<span class="moki__clip"><span class="moki__rig"><span class="moki__swing"><span class="moki__thread"></span>' + img + '</span></span></span>'
      : '<span class="moki__clip">' + img + '</span>') +
      (kind === 'arriba' || kind === 'saluda' ? '<img class="moki__actor" src="' + BASE + 'moki-espalda.webp" alt="" loading="lazy" decoding="async" draggable="false">' : '') +
      '<span class="moki__bubble" aria-hidden="true"></span>';
    var host = span.parentElement;
    if (host && getComputedStyle(host).position === 'static') host.style.position = 'relative';
    span.replaceWith(b);
    var m = { el: b, id: id, kind: kind, pose: pose, img: b.querySelector('.moki__img'), bubble: b.querySelector('.moki__bubble'), swing: b.querySelector('.moki__swing') };
    b.addEventListener('click', function () { if (m.skipClick) { m.skipClick = false; return; } poke(m); });
    b.addEventListener('focus', function () { out(m); });
    b.addEventListener('pointerenter', function () { if (!m.el.classList.contains('is-out')) out(m); });
    if (kind === 'cuelga') physics(m);
    return m;
  }

  /* Escoge n escondites del día. Reglas: nunca dos cerca uno del otro en la página (si caben) y nunca más
     escondites de un tipo que poses tiene su grupo. «Cerca» es por distancia real, no por orden en el HTML.
     Semilla del día: cambia cada día y es igual todo ese día. */
  function pick() {
    var all = [].slice.call(d.querySelectorAll('[data-moki]:not(.moki)'));
    var n = parseInt(H.getAttribute('data-moki-show'), 10);
    if (!(n > 0) || n >= all.length) return all;
    var r = seeded(day + location.pathname), gap = Math.max(260, (w.innerHeight || 800) * 0.45);
    var y = all.map(function (s) { var h = s.parentElement || s; var b = h.getBoundingClientRect(); return b.top + (w.scrollY || 0); });
    function kindOf(s) { var k = s.getAttribute('data-moki'); return POOL[k] ? k : 'arriba'; }
    function near(i, j) { return Math.abs(y[i] - y[j]) < gap; }
    var best = null, bestBad = 1e9, t, i, j, x;
    for (t = 0; t < 60 && bestBad > 0; t++) {
      var a = all.map(function (_, k) { return k; });
      for (i = a.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); x = a[i]; a[i] = a[j]; a[j] = x; }
      var keep = [], per = {}, bad = 0;
      [0, 1].forEach(function (pass) {
        a.forEach(function (k) {
          if (keep.length >= n || keep.indexOf(k) >= 0) return;
          var kd = kindOf(all[k]), full = !all[k].getAttribute('data-moki-pose') && (per[kd] || 0) >= POOL[kd].length;
          var close = keep.some(function (q) { return near(q, k); });
          if (pass === 0 && (full || close)) return;
          if (full) bad += 3; if (close) bad += 2;
          keep.push(k); per[kd] = (per[kd] || 0) + 1;
        });
      });
      if (bad < bestBad) { best = keep; bestBad = bad; }
    }
    var chosen = best.map(function (k) { return all[k]; });
    all.forEach(function (s) { if (chosen.indexOf(s) < 0) s.remove(); });
    return all.filter(function (s) { return chosen.indexOf(s) >= 0; });
  }

  function init() {
    mokis = pick().map(build);
    if (!mokis.length) return;
    label();
    if (w.MutationObserver) {
      new MutationObserver(label).observe(H, { attributes: true, attributeFilter: ['lang'] });
      new MutationObserver(function () {
        mokis.forEach(function (m) {
          m.el.classList.toggle('is-still', still());
          if (still()) { if (m.raf) { cancelAnimationFrame(m.raf); m.raf = 0; } m.th = 0; m.om = 0; if (m.swing) swingTo(m); out(m); }
        });
      }).observe(H, { attributes: true, attributeFilter: ['data-jz-level'] });
    }
    if (still() || !('IntersectionObserver' in w)) { mokis.forEach(function (m) { m.el.classList.add('is-still'); out(m); }); }
    if (!('IntersectionObserver' in w)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var m = mokis.filter(function (x) { return x.el === e.target; })[0]; if (!m) return;
        m.seen = e.isIntersecting;
        if (still()) return;
        if (e.isIntersecting && !m.el.classList.contains('is-out')) { clearTimeout(m.t); m.t = setTimeout(function () { out(m); }, (mucho() ? 400 : 700) + Math.random() * 2200); }
        if (!e.isIntersecting && !m.dragging) { clearTimeout(m.t); if (!m.busy) m.el.classList.remove('is-out', 'is-wave', 'is-down'); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    mokis.forEach(function (m) { io.observe(m.el); });
  }

  w.Moki = {
    version: '1.2.0',
    poses: function () { return mokis.map(function (m) { return m.pose; }); },
    found: function () { return state.found.slice(); },
    reset: function () { state.found = []; state.won = false; state.pos = {}; save(); },
    poke: function (id) { var m = mokis.filter(function (x) { return x.id === id; })[0]; if (m) poke(m); },
    celebrate: celebrate
  };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(window, document);
