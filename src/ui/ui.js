// Capa DOM sobre el lienzo: botones reales (foco, teclado, aria) y tarjetas de papel. Todo texto sale de i18n.js.
import './ui.css';
import { CONFIG as C } from '../config.js';
import { t } from '../i18n.js';
import { feel, JUICE_NAMES } from '../feel.js';
import { EMBED } from '../embed.js';

const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

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
  const state = { demo: null, fail: null, final: null, cuaderno: null, asi: null, pause: null, pauseBtn: null, soundBtn: null, pauseSound: null };

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

  // Copiar: dos hojas de papel encimadas en tinta; copiado = palomita de tinta (el estado no depende del color)
  const copyIcon = (done) =>
    `<svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true" focusable="false">${
      done
        ? '<path d="M6 14.5l5 5 11-12" fill="none" stroke="#22211F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<rect x="9" y="4" width="14" height="17" rx="3" fill="#F4E8D5" stroke="#22211F" stroke-width="2.4"/><rect x="5" y="8" width="14" height="17" rx="3" fill="#F4E8D5" stroke="#22211F" stroke-width="2.4"/>'
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
      // Al dar Jugar la leyenda se va hacia abajo en 140 ms en vez de desaparecer en seco
      const d = state.demo;
      state.demo = null;
      ui.hideModo();
      if (!d) return;
      if (reducedMQ.matches || feel.level === 0) return d.remove();
      d.classList.add('out');
      setTimeout(() => d.remove(), 150);
    },

    // Modo de la partida en el título (NIVELES.md §7): un toque al chip alterna Reto del día / Libre; el resto de la pantalla sigue arrancando.
    // Al lado, el interruptor de Paseo (GDD §3): se combina con cualquiera de los dos modos.
    showModo(modo, onToggle, paseo, onPaseo) {
      ui.hideModo();
      const row = el('div', 'ui-modos');
      const tap = (b, fn) => {
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('keydown', (e) => e.stopPropagation());
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (ui.sfx) ui.sfx();
          fn();
        });
      };
      const b = el('button', 'ui-modo');
      b.type = 'button';
      b.setAttribute('aria-label', t('modo.aria'));
      b.append(el('b', '', t(modo === 'libre' ? 'modo.libre' : 'modo.reto')), el('span', '', t(modo === 'libre' ? 'modo.libre.d' : 'modo.reto.d')));
      tap(b, onToggle);
      row.append(b);
      if (onPaseo) {
        const p = el('button', 'ui-modo ui-paseo');
        p.type = 'button';
        p.setAttribute('aria-label', t('paseo.aria'));
        p.setAttribute('aria-pressed', String(!!paseo));
        const tx = el('div', 'tx');
        tx.append(el('b', '', t('paseo.name')), el('span', '', t('paseo.d')));
        p.append(el('i'), tx);
        tap(p, onPaseo);
        row.append(p);
      }
      root.appendChild(row);
      state.modo = row;
    },
    hideModo() {
      if (state.modo) state.modo.remove();
      state.modo = null;
      ui.hideSaludo();
    },

    // Saludo de Moki según la racha (GDD §3): una etiqueta de papel en el título, solo texto, sin cuenta regresiva
    showSaludo(text) {
      ui.hideSaludo();
      if (!text) return;
      const s = el('div', 'ui-saludo', text);
      root.appendChild(s);
      state.saludo = s;
    },
    hideSaludo() {
      if (state.saludo) state.saludo.remove();
      state.saludo = null;
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
    showFail({ hint, meta, prompt, rect, isNew }, onGo) {
      ui.hideFail();
      const scrim = el('div', 'ui-scrim');
      scrim.style.background = 'transparent';
      const card = el('div', 'ui-card compact ui-fail');
      Object.assign(card.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, maxHeight: `${rect.maxHeight}px`, opacity: '0', transform: 'translateY(18px)', transition: 'opacity 250ms ease-out, transform 250ms ease-out' });
      if (isNew) {
        // Nueva mejor marca también al fallar: la etiqueta brinca con el stinger (popRecord)
        const head = el('div', 'ui-head');
        head.append(el('h2', '', hint), el('span', 'ui-tag', t('end.new')));
        card.append(head);
      } else card.append(el('h2', '', hint));
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
    // Nueva mejor marca: la etiqueta brinca y el borde de la tarjeta destella en naranja (sin glow)
    popRecord() {
      const card = (state.fail && state.fail.card) || (state.final && state.final.card);
      if (!card) return;
      const tag = card.querySelector('.ui-tag');
      [tag, card].forEach((n) => {
        if (!n) return;
        n.classList.remove('pop');
        void n.offsetWidth; // reinicia la animación
        n.classList.add('pop');
      });
    },
    unlockFail() {
      if (!state.fail) return;
      state.fail.pill.disabled = false;
      state.fail.pill.classList.add('ready');
      state.fail.pill.focus({ preventScroll: true });
    },
    hideFail() {
      ui.hideCuaderno();
      if (!state.fail) return;
      const { scrim, card } = state.fail;
      state.fail = null;
      primary = null;
      card.style.opacity = '0';
      card.style.transition = 'opacity 160ms ease-in';
      setTimeout(() => scrim.remove(), 170);
    },

    // Tira del Cuaderno de Moki (GDD §3) bajo la tarjeta abierta: 3 notas activas con su avance y el sello nuevo.
    // Se coloca con la caja real de la tarjeta (sin el translateY de entrada), nunca encima de ella.
    showCuaderno(tira, zonas) {
      ui.hideCuaderno();
      const host = (state.fail || state.final);
      if (!host) return;
      const { card, scrim } = host;
      const strip = el('div', 'ui-cuaderno');
      strip.setAttribute('role', 'status');
      const head = el('div', 'cu-head');
      head.append(el('b', '', t('cu.title')), el('span', '', t('cu.count', { n: tira.total, de: tira.de })));
      strip.append(head);
      const list = el('ul');
      const row = (id, done, txt, isNew) => {
        const li = el('li', done ? 'done' : '');
        const stamp = el('span', isNew ? 'cu-stamp new' : 'cu-stamp');
        stamp.setAttribute('aria-hidden', 'true');
        li.append(stamp, el('span', 'cu-txt', t(`cu.nota.${id}`)), el('span', 'cu-val', txt));
        list.append(li);
      };
      // Primero lo recién cumplido (sellado), luego las activas; máximo 3 renglones para que la tira siga chica
      const nuevas = tira.nuevasNotas;
      const extra = nuevas.length > 3 ? nuevas.length - 2 : 0; // muchas de golpe: 2 sellos y "+N notas más"
      nuevas.slice(0, extra ? 2 : 3).forEach((id) => row(id, true, t('cu.hecho'), true));
      if (extra) list.append(el('li', 'done cu-mas', t('cu.mas', { n: extra })));
      tira.activas.slice(0, Math.max(0, 3 - list.children.length)).forEach((n) => row(n.id, false, n.goal > 1 ? `${n.val}/${n.goal}` : '', false));
      if (!list.children.length) list.append(el('li', 'done', t('cu.todo')));
      strip.append(list);
      if (tira.nuevosSellos.length) strip.append(el('p', 'cu-sellos', t('cu.sellos', { s: tira.nuevosSellos.map((id) => t(`cu.sello.${id}`)).join(' · ') })));
      strip.style.visibility = 'hidden';
      scrim.append(strip);
      // Caja de la tarjeta en px de pantalla (offset* ignora el transform de la animación de entrada)
      const W = scrim.clientWidth;
      const H = scrim.clientHeight;
      const c = { l: card.offsetLeft, t: card.offsetTop, w: card.offsetWidth, h: card.offsetHeight };
      const w = Math.min(W - 32, Math.max(c.w, 300));
      strip.style.width = `${w}px`;
      const sh = strip.offsetHeight;
      const left = Math.max(16, Math.min(c.l, W - 16 - w));
      // Debajo de la tarjeta si no tapa a Moki (en horizontal la tarjeta ya va a su derecha); si no, abajo sobre el
      // suelo de papel. Si no hay lugar sin traslape con la tarjeta ni con Moki, no se enseña: la tarjeta manda.
      let top = c.t + c.h + 10;
      if (!(top + sh <= H - 12 && (zonas.wide || top + sh <= zonas.headY - 6))) {
        top = H - 12 - sh;
        if (top < zonas.floorY + 4 || top < c.t + c.h + 6) {
          strip.remove();
          return;
        }
      }
      Object.assign(strip.style, { left: `${left}px`, top: `${top}px`, visibility: '' });
      state.cuaderno = strip;
    },
    hideCuaderno() {
      if (!state.cuaderno) return;
      state.cuaderno.remove();
      state.cuaderno = null;
    },

    // Pantalla final (UX §8)
    showFinal(d, { onAgain, onHow, onCopy }, rect) {
      ui.hideFinal();
      const scrim = el('div', 'ui-scrim');
      scrim.style.background = 'rgba(34,33,31,0.18)';
      const card = el('div', rect.compact ? 'ui-card compact' : 'ui-card');
      // Entra igual que la tarjeta de fallo: sube 18 px con fundido de 250 ms
      const still = reducedMQ.matches || feel.level === 0;
      Object.assign(card.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, maxHeight: `${rect.maxHeight}px`, overflowY: 'auto', opacity: '0', transform: still ? 'none' : 'translateY(18px)', transition: still ? 'opacity 150ms ease-out' : 'opacity 250ms ease-out, transform 250ms ease-out' });
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
      const head = el('div', 'ui-head');
      head.append(el('h2', '', t(d.paseo ? 'end.paseo' : 'end.title')));
      if (d.isNew && !d.paseo) head.append(el('span', 'ui-tag', t('end.new')));
      card.append(head);
      const rows = el('dl', 'ui-rows');
      const row = (k, v) => {
        rows.append(el('dt', '', k), el('dd', '', v));
      };
      row(t('end.dist'), `${d.meters} m`);
      row(t('end.pieces'), `${d.pieces} / ${d.piecesTotal}`);
      if (!d.paseo) {
        // Paseo no compite: sin puntaje ni mejor marca (director, pieza 4)
        row(t('end.score'), String(d.score));
        row(d.bestModo ? `${t('end.best')} · ${d.bestModo}` : t('end.best'), String(d.best)); // la marca es de este modo
      }
      if (d.modo) row(t('end.modo'), d.modo); // "Reto del 29 oct" o "Libre" (NIVELES.md §10)
      card.append(rows);
      const again = el('button', 'ui-btn primary', t('end.again'));
      again.type = 'button';
      const how = el('button', 'ui-btn secondary', t('end.how'));
      how.type = 'button';
      card.append(again, how);
      if (onCopy) {
        // Tarjeta para compartir (GDD §3): copia texto al portapapeles; el aviso es tinta sobre papel, sin naranja chico
        // En la tarjeta compacta (vertical) no cabe una segunda fila: el botón es un cuadro de 48 px con dos hojas
        // de papel (y palomita al copiar), en la misma fila que "Otra vez" y "Así lo hicimos".
        const icon = !!rect.compact;
        const copy = el('button', icon ? 'ui-btn secondary ui-copy icon' : 'ui-btn secondary ui-copy', icon ? undefined : t('share.btn'));
        copy.type = 'button';
        copy.setAttribute('aria-label', t('share.aria'));
        copy.title = t('share.btn');
        if (icon) copy.innerHTML = copyIcon(false);
        const live = el('span', 'ui-copied');
        live.setAttribute('role', 'status');
        copy.addEventListener('click', () => {
          Promise.resolve(onCopy()).then((ok) => {
            live.textContent = t(ok ? 'share.ok' : 'share.no');
            if (icon) copy.innerHTML = copyIcon(ok);
            else copy.textContent = live.textContent;
          });
        });
        card.append(copy, live);
      }
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
      state.final = { scrim, card, primary: onAgain };
      again.focus({ preventScroll: true });
    },
    hideFinal() {
      ui.hideCuaderno();
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
      // Efectos (UX §5): cicla Nada / Poquito / Mucho, y Hardcore cuando ya llegaste a la meta
      const juiceText = () => t('pause.juice', { n: t(`juice.${JUICE_NAMES[feel.level]}`) });
      const jz = el('button', 'ui-btn secondary', juiceText());
      jz.type = 'button';
      jz.addEventListener('click', () => {
        feel.cycle();
        jz.textContent = juiceText();
        feel.buzz(12, 2);
      });
      resume.addEventListener('click', onResume);
      home.addEventListener('click', onHome);
      stack.append(resume, snd, jz, home);
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
