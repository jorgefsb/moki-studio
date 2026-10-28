(function (d) {
  'use strict';
  var I = {
    es: { snd: 'Sonido y juego', rm: 'Movimiento reducido: apagado.', lock: '🔒 Encuentra a todos los Mokis de hoy para desbloquear Hardcore.' },
    en: { snd: 'Sound and play', rm: 'Reduced motion: off.', lock: "🔒 Find all of today's Mokis to unlock Hardcore." }
  };
  function hardOpen() { if (d.documentElement.getAttribute('data-jz-hard') === 'open') return true; try { return localStorage.getItem('jz-hard') === '1'; } catch (e) { return false; } }
  function seen() { try { return localStorage.getItem('jz-menu-seen') === '1'; } catch (e) { return true; } }
  function loc() { return I[d.documentElement.lang === 'en' ? 'en' : 'es']; }
  var sfx = d.querySelector('.juice-sfx');
  var host = (sfx && sfx.parentNode) || d.querySelector('.hud__right') || d.querySelector('header') || d.body;
  if (d.querySelector('.jz-dock')) { if (window.JZ) window.JZ.paint(); return; }
  var dock = d.createElement('div');
  dock.className = 'jz-dock';
  if (sfx) host.insertBefore(dock, sfx); else host.appendChild(dock);
  if (!sfx) { sfx = d.createElement('button'); sfx.type = 'button'; sfx.className = 'juice-sfx'; }
  dock.appendChild(sfx);
  dock.insertAdjacentHTML('beforeend', '<button type="button" class="jz-lvl" aria-expanded="false" aria-controls="jz-panel"></button><button type="button" class="jz-feel" aria-expanded="false" aria-controls="jz-panel"></button>');
  var panel = d.createElement('div');
  panel.className = 'jz-panel';
  panel.id = 'jz-panel';
  panel.hidden = true;
  panel.innerHTML = '<p class="jz-panel__note" hidden></p><button type="button" class="juice-sfx jz-panel__sfx"></button><fieldset><legend data-jz-lab="juice">Juega</legend><label><input type="radio" name="jz-level" value="off"> <span data-jz-lab="off"></span></label><label><input type="radio" name="jz-level" value="subtle"> <span data-jz-lab="subtle"></span></label><label><input type="radio" name="jz-level" value="full"> <span data-jz-lab="full"></span></label><label class="jz-hard"><input type="radio" name="jz-level" value="hard"> <span data-jz-lab="hard"></span></label><p class="jz-panel__note jz-hard__lock" hidden></p></fieldset>';
  dock.appendChild(panel);
  if (window.JZ) {
    window.JZ.hook(function () {
      var t = window.JZ.t(), lv = window.JZ.level, red = window.JZ.red();
      var lab = { off: t[4], subtle: t[5], full: t[6], juice: t[7], hard: t[10] }, open = hardOpen();
      [].slice.call(d.querySelectorAll('.jz-lvl')).forEach(function (b) {
        var lvlLab = t[7] + ': ' + lab[lv];
        b.innerHTML = '<span aria-hidden="true">🎮</span><span class="jz-lvl__label">' + lvlLab + '</span>';
        b.setAttribute('aria-label', lvlLab);
      });
      [].slice.call(d.querySelectorAll('.jz-feel')).forEach(function (b) {
        var feelLab = loc().snd;
        b.innerHTML = '<span aria-hidden="true">🎮</span><span class="jz-feel__label">' + feelLab + '</span>';
        b.setAttribute('aria-label', feelLab);
      });
      [].slice.call(d.querySelectorAll('input[name=jz-level]')).forEach(function (r) {
        r.checked = r.value === lv;
        r.disabled = red || (r.value === 'hard' && !open);
      });
      [].slice.call(d.querySelectorAll('.jz-panel__note')).forEach(function (n) {
        n.hidden = !red;
        n.textContent = loc().rm;
      });
      [].slice.call(d.querySelectorAll('.jz-hard__lock')).forEach(function (n) { n.hidden = open || red; n.textContent = loc().lock; });
      [].slice.call(d.querySelectorAll('.jz-hard')).forEach(function (n) { n.classList.toggle('is-locked', !open); });
      [].slice.call(d.querySelectorAll('[data-jz-lab]')).forEach(function (el) {
        el.textContent = lab[el.getAttribute('data-jz-lab')] || el.textContent;
      });
    });
    window.JZ.paint();
  }
  var opener = null;
  function panelEl() { return d.getElementById('jz-panel'); }
  function closeP(esc) {
    var panel = panelEl();
    if (!panel) return;
    panel.hidden = 1;
    [].slice.call(d.querySelectorAll('.jz-lvl,.jz-feel')).forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
    });
    if (esc && opener) opener.focus();
    opener = null;
  }
  function openP(b) {
    var panel = panelEl();
    if (!panel) return;
    try { localStorage.setItem('jz-menu-seen', '1'); } catch (e) {}
    [].slice.call(d.querySelectorAll('.jz-invite')).forEach(function (x) { x.classList.remove('jz-invite'); });
    opener = b;
    panel.hidden = 0;
    b.setAttribute('aria-expanded', 'true');
    var f = panel.querySelector('input:not([disabled]),button');
    f && f.focus();
  }
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeP(1);
  });
  d.addEventListener('click', function (e) {
    var t = e.target;
    var lb = t.closest && t.closest('.jz-lvl,.jz-feel');
    var panel = panelEl();
    if (lb) {
      panel && !panel.hidden && lb.getAttribute('aria-expanded') === 'true' ? closeP() : openP(lb);
      return;
    }
    if (panel && !panel.hidden && !(t.closest && t.closest('.jz-dock'))) closeP();
    var rd = t.closest && t.closest('input[name=jz-level]');
    if (rd && !rd.disabled && window.JZ) window.JZ.setLevel(rd.value);
  });
  if (!seen() && d.documentElement.getAttribute('data-jz-invite') !== 'off') [].slice.call(d.querySelectorAll('.jz-lvl,.jz-feel')).forEach(function (b) { b.classList.add('jz-invite'); });
  d.addEventListener('jz:unlock-hard', function () { if (window.JZ) window.JZ.paint(); });
  var off = document.documentElement.getAttribute('data-jz-off') || '';
  if (off.indexOf('anticipation') < 0 && !(window.JZ_CONFIG && window.JZ_CONFIG.anticipation === false)) {
    [].slice.call(d.querySelectorAll('.btn--primary,.jz-try,.hud__cta,.hud__nav-cta,.home-card,.ia-card[href],a.ia-card')).forEach(function (el) {
      el.classList.add('jz-antic');
    });
  }
})(document);
