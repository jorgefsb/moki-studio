// Capa DOM sobre el lienzo: botones reales (foco, teclado, aria) y tarjetas de papel. Todo texto sale de i18n.js.
import './ui.css';
import { CONFIG as C } from '../config.js';
import { t } from '../i18n.js';
import { EMBED } from '../embed.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function createUI() {
  const root = el('div');
  root.id = 'ui';
  document.body.appendChild(root);

  let primary = null; // acción del botón/gesto principal de la tarjeta abierta
  const state = { demo: null, fail: null, final: null, asi: null, pause: null, pauseBtn: null, soundBtn: null, pauseSound: null };

  // Todo botón suena (AUDIO §5): se engancha en la fase de captura, antes de que el botón actúe
  root.addEventListener(
    'click',
    (e) => {
      const b = e.target.closest && e.target.closest('button, a');
      if (b && !b.classList.contains('ui-soundbtn') && !(state.pauseSound && b === state.pauseSound) && ui.sfx) ui.sfx('ui');
    },
    true
  );

  // Bocina de papel: con ondas = prendido; con una cuerda tachada = apagado (el estado no depende solo del color)
  const iconSvg = (on) =>
    `<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" focusable="false"><path d="M4 11h5l6-5v16l-6-5H4z" fill="#22211F"/>${
      on
        ? '<path d="M18 10c2 2.5 2 5.5 0 8M21 7c3.6 4.2 3.6 9.8 0 14" fill="none" stroke="#22211F" stroke-width="2.2" stroke-linecap="round"/>'
        : '<path d="M19 10l7 8M26 10l-7 8" fill="none" stroke="#22211F" stroke-width="2.4" stroke-linecap="round"/>'
    }</svg>`;

  const ui = {
    root,
    sfx: null, // enganchado por la escena: sonido de botón
    soundOn: true,
    soundBtnEl: null,
    onSound: null,
    get modalOpen() {
      return !!(state.fail || state.final || state.asi || state.pause);
    },
    // Gesto "seguir" (Espacio, Enter, ↑) con una tarjeta abierta.
    primary() {
      if (primary) primary();
    },

    showDemo(coarse) {
      ui.hideDemo();
      const d = el('div', 'ui-demo');
      const b = el('b', '', t('demo.word'));
      d.append(b, document.createTextNode(` · ${t(coarse ? 'title.demo.touch' : 'title.demo.kbd')}`));
      root.appendChild(d);
      state.demo = d;
    },
    hideDemo() {
      if (state.demo) state.demo.remove();
      state.demo = null;
      ui.hideModo();
    },

    // Modo de la partida en el título (NIVELES.md §7): un toque al chip alterna Reto del día / Libre; el resto de la pantalla sigue arrancando.
    showModo(modo, onToggle) {
      ui.hideModo();
      const b = el('button', 'ui-modo');
      b.type = 'button';
      b.setAttribute('aria-label', t('modo.aria'));
      b.append(el('b', '', t(modo === 'libre' ? 'modo.libre' : 'modo.reto')), el('span', '', t(modo === 'libre' ? 'modo.libre.d' : 'modo.reto.d')));
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('keydown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (ui.sfx) ui.sfx();
        onToggle();
      });
      root.appendChild(b);
      state.modo = b;
    },
    hideModo() {
      if (state.modo) state.modo.remove();
      state.modo = null;
    },

    showPauseButton(on) {
      if (!on) {
        if (state.pauseBtn) state.pauseBtn.remove();
        state.pauseBtn = null;
        return;
      }
      if (state.pauseBtn) return;
      const b = el('button', 'ui-pausebtn');
      b.type = 'button';
      b.setAttribute('aria-label', t('aria.pause'));
      b.append(el('i'), el('i'));
      b.addEventListener('click', () => ui.onPause && ui.onPause());
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      root.appendChild(b);
      state.pauseBtn = b;
    },

    // Botón de sonido (AUDIO §8): 'title' arriba a la derecha, 'hud' a la izquierda del botón de pausa
    showSoundButton(mode) {
      if (state.soundBtn) state.soundBtn.remove();
      state.soundBtn = null;
      if (!mode) return;
      const b = el('button', `ui-soundbtn ${mode}`);
      b.type = 'button';
      b.setAttribute('aria-label', t('aria.sound'));
      b.addEventListener('click', () => ui.onSound && ui.onSound());
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      root.appendChild(b);
      state.soundBtn = b;
      ui.setSound(ui.soundOn);
    },
    setSound(on) {
      ui.soundOn = on;
      const b = state.soundBtn;
      if (b) {
        b.innerHTML = iconSvg(on);
        b.setAttribute('aria-pressed', String(on));
      }
      const p = state.pauseSound;
      if (p) p.textContent = t(on ? 'pause.sound.on' : 'pause.sound.off');
    },

    // Tarjeta de fallo (UX §7). rect: { left, top, width, maxHeight } en px de pantalla.
    showFail({ hint, meta, prompt, rect }, onGo) {
      ui.hideFail();
      const scrim = el('div', 'ui-scrim');
      scrim.style.background = 'transparent';
      const card = el('div', 'ui-card compact ui-fail');
      Object.assign(card.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, maxHeight: `${rect.maxHeight}px`, opacity: '0', transform: 'translateY(18px)', transition: 'opacity 250ms ease-out, transform 250ms ease-out' });
      card.append(el('h2', '', hint));
      if (meta) card.append(el('p', 'meta', meta));
      const pill = el('button', 'ui-pill', `↻ ${prompt}`);
      pill.type = 'button';
      pill.disabled = true;
      card.append(pill);
      scrim.append(card);
      root.appendChild(scrim);
      let fired = false;
      const go = () => {
        if (fired || pill.disabled) return;
        fired = true;
        onGo();
      };
      scrim.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        go();
      });
      pill.addEventListener('click', go);
      primary = go;
      state.fail = { scrim, card, pill };
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    },
    unlockFail() {
      if (!state.fail) return;
      state.fail.pill.disabled = false;
      state.fail.pill.focus({ preventScroll: true });
    },
    hideFail() {
      if (!state.fail) return;
      const { scrim, card } = state.fail;
      state.fail = null;
      primary = null;
      card.style.opacity = '0';
      card.style.transition = 'opacity 160ms ease-in';
      setTimeout(() => scrim.remove(), 170);
    },

    // Pantalla final (UX §8)
    showFinal(d, { onAgain, onHow }, rect) {
      ui.hideFinal();
      const scrim = el('div', 'ui-scrim');
      scrim.style.background = 'rgba(34,33,31,0.18)';
      const card = el('div', rect.compact ? 'ui-card compact' : 'ui-card');
      Object.assign(card.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, maxHeight: `${rect.maxHeight}px`, overflowY: 'auto' });
      const head = el('div', 'ui-head');
      head.append(el('h2', '', t('end.title')));
      if (d.isNew) head.append(el('span', 'ui-tag', t('end.new')));
      card.append(head);
      const rows = el('dl', 'ui-rows');
      const row = (k, v) => {
        rows.append(el('dt', '', k), el('dd', '', v));
      };
      row(t('end.dist'), `${d.meters} m`);
      row(t('end.pieces'), `${d.pieces} / ${d.piecesTotal}`);
      row(t('end.score'), String(d.score));
      row(t('end.best'), String(d.best));
      card.append(rows);
      const again = el('button', 'ui-btn primary', t('end.again'));
      again.type = 'button';
      const how = el('button', 'ui-btn secondary', t('end.how'));
      how.type = 'button';
      card.append(again, how);
      if (!EMBED) {
        // En embed la página padre ya trae la liga de regreso
        const link = el('a', 'ui-link', t('end.link'));
        link.href = 'https://jorgesuarez.com.mx';
        link.rel = 'noopener';
        card.append(el('br'), link);
      }
      scrim.append(card);
      root.appendChild(scrim);
      again.addEventListener('click', onAgain);
      how.addEventListener('click', onHow);
      primary = onAgain;
      state.final = { scrim, primary: onAgain };
      again.focus({ preventScroll: true });
    },
    hideFinal() {
      if (!state.final) return;
      state.final.scrim.remove();
      state.final = null;
      primary = null;
    },

    // "Así lo hicimos" (UX §8): fondo #0A0A0A, paneles #161616.
    showAsi(interventions, onBack) {
      ui.hideAsi();
      // Papel crema con tarjetas de cartón; el enlace y "Volver" quedan en una fila fija abajo (siempre visibles, sin scroll)
      const asi = el('div', 'ui-asi');
      const wrap = el('div', 'wrap');
      wrap.append(el('h2', '', t('how.title')), el('p', 'sub', t('how.sub')));
      for (const k of ['lider', 'constructor', 'probador', 'arte', 'animador', 'ux', 'diseno', 'audio']) {
        const p = el('div', 'panel');
        p.append(el('b', '', t(`how.${k}`)), el('span', '', t(`how.${k}.d`)));
        wrap.append(p);
      }
      const foot = el('div', 'foot');
      foot.append(el('p', 'jorge', t(interventions === 1 ? 'how.jorge.one' : 'how.jorge.many', { n: interventions })));
      const back = el('button', 'ui-btn primary', t('how.back'));
      back.type = 'button';
      back.addEventListener('click', onBack);
      if (!EMBED) {
        const link = el('a', 'ui-link', t('end.link'));
        link.href = 'https://jorgesuarez.com.mx';
        link.rel = 'noopener';
        foot.append(link);
      }
      foot.append(back);
      asi.append(wrap, foot);
      root.appendChild(asi);
      primary = onBack;
      state.asi = asi;
      back.focus({ preventScroll: true });
    },
    hideAsi() {
      if (!state.asi) return;
      state.asi.remove();
      state.asi = null;
      primary = state.final ? state.final.primary : null;
    },

    // Pausa (UX §6)
    showPause({ onResume, onHome }) {
      ui.hidePause();
      const scrim = el('div', 'ui-scrim pause');
      const card = el('div', 'ui-card ui-pause');
      card.style.position = 'relative';
      card.append(el('h2', '', t('pause.title')));
      const stack = el('div', 'stack');
      const resume = el('button', 'ui-btn primary', t('pause.resume'));
      resume.type = 'button';
      const home = el('button', 'ui-btn secondary', t('pause.home'));
      home.type = 'button';
      const snd = el('button', 'ui-btn secondary', t(ui.soundOn ? 'pause.sound.on' : 'pause.sound.off'));
      snd.type = 'button';
      snd.setAttribute('aria-pressed', String(ui.soundOn));
      snd.addEventListener('click', () => {
        if (ui.onSound) ui.onSound();
        snd.setAttribute('aria-pressed', String(ui.soundOn));
      });
      state.pauseSound = snd;
      resume.addEventListener('click', onResume);
      home.addEventListener('click', onHome);
      stack.append(resume, snd, home);
      card.append(stack);
      scrim.append(card);
      root.appendChild(scrim);
      primary = onResume;
      state.pause = scrim;
      resume.focus({ preventScroll: true });
    },
    hidePause() {
      if (!state.pause) return;
      state.pause.remove();
      state.pause = null;
      state.pauseSound = null;
      primary = null;
    },
    onPause: null,
    state,
  };
  void C;
  return ui;
}
