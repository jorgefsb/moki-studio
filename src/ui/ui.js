// Capa DOM sobre el lienzo: botones reales (foco, teclado, aria) y tarjetas de papel. Todo texto sale de i18n.js.
import './ui.css';
import { CONFIG as C } from '../config.js';
import { t } from '../i18n.js';
import { feel, JUICE_NAMES } from '../feel.js';
import { EMBED } from '../embed.js';
import festejoUrl from '../../assets/moki/pixel/moki_jump_rise_right_strip5.png';

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
  const siguienteTachado = () => {
    const sig = state.tachados.shift();
    if (sig === undefined) return (state.tachado = null);
    const { text, zona } = sig;
    const n = el('div', 'ui-tachado');
    n.setAttribute('role', 'status');
    const stamp = el('span', 'cu-stamp');
    stamp.setAttribute('aria-hidden', 'true');
    n.append(stamp, el('s', '', text));
    root.appendChild(n);
    // ENCARGOS-D: si cae sobre el sol de papel, baja 12 px bajo él, siempre que siga arriba de la zona de lectura
    // (offset* ignora el transform de la animación de entrada)
    const e = zona && zona.evita;
    if (e) {
      const a = { l: n.offsetLeft - n.offsetWidth / 2, t: n.offsetTop, r: n.offsetLeft + n.offsetWidth / 2 };
      const top = Math.round(e.b + 12);
      if (a.l < e.r + 8 && a.r > e.l - 8 && a.t < e.b + 8 && top + n.offsetHeight <= zona.limite) n.style.top = `${top}px`;
    }
    const still = reducedMQ.matches || feel.level === 0;
    const timer = setTimeout(() => {
      n.classList.add('out');
      state.tachado.timer = setTimeout(() => {
        n.remove();
        siguienteTachado();
      }, still ? 0 : 220);
    }, C.tachadoMs);
    state.tachado = { node: n, timer };
  };
  // P3c VOTO: liga al tablero de ideas en pestaña nueva (el iframe no navega); el juego se queda como estaba
  const votoLink = (v, cls) => {
    const a = el('a', cls);
    a.href = v.href;
    a.target = '_blank';
    a.rel = 'noopener';
    for (const ev of ['pointerdown', 'keydown']) a.addEventListener(ev, (e) => e.stopPropagation());
    a.addEventListener('click', (e) => {
      e.stopPropagation();
      if (v.onClick) v.onClick();
    });
    return a;
  };
  const state = { menu: null, homeBtn: null, demo: null, fail: null, final: null, cuaderno: null, asi: null, pause: null, pauseBtn: null, soundBtn: null, pauseSound: null, tachado: null, tachados: [] };

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
      return !!(state.fail || state.final || state.asi || state.pause || state.foto || state.logros);
    },
    // Gesto "seguir" (Espacio, Enter, ↑) con una tarjeta abierta.
    primary() {
      if (primary) primary();
    },

    // SELECTOR (PLAN-MENU v2, Jorge 8-nov 23:27): un solo panel de papel en el título con las tarjetas del menú.
    // m = { hero: { titulo, sub, onPick }, cards: [{ nombre, linea, nuevo, cerrado, hecho, pressed, onPick }], pie }
    // Los hijos van en flujo (nada absoluto adentro): lo que comparte panel no se encima. placeMenu lo pone donde no
    // toca a Moki ni al HUD. Tocar el lienzo fuera del panel sigue arrancando la partida.
    showMenu(m, zonas) {
      ui.hideMenu(true);
      const p = el('div', 'ui-menu');
      p.setAttribute('role', 'group');
      p.setAttribute('aria-label', t('menu.aria'));
      const tap = (b, fn) => {
        b.type = 'button';
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('keydown', (e) => e.stopPropagation());
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (ui.sfx) ui.sfx();
          fn();
        });
        return b;
      };
      const punto = () => el('em', 'mn-punto', t('menu.punto'));
      // P3e: aviso "Lo nuevo desde tu última visita" arriba del botón (texto, no botón: el toque va a Juega lo nuevo)
      if (m.aviso) {
        const av = el('div', 'mn-aviso');
        av.setAttribute('role', 'status');
        av.append(el('b', '', m.aviso.titulo));
        const ul = el('ul');
        for (const l of m.aviso.lineas) ul.append(el('li', '', l));
        av.append(ul);
        p.append(av);
      }
      const h = m.hero;
      const hero = tap(el('button', 'mn-hero'), h.onPick);
      hero.append(el('b', '', h.titulo));
      if (h.sub) hero.append(el('span', '', h.sub));
      p.append(hero);
      if (m.cards.length) {
        const grid = el('div', 'mn-grid');
        grid.addEventListener('pointerdown', (e) => e.stopPropagation()); // el carril se desliza sin arrancar
        for (const c of m.cards) {
          const b = tap(el('button', `mn-card${c.cerrado ? ' cerrado' : ''}${c.pressed !== undefined ? ' toggle' : ''}`), c.onPick);
          if (c.pressed !== undefined) {
            b.setAttribute('aria-pressed', String(c.pressed));
            b.append(el('i', 'mn-casilla'));
          }
          const tx = el('div', 'tx');
          const nom = el('b', '', c.nombre);
          if (c.hecho) nom.prepend(el('i', 'mn-hecho'));
          tx.append(nom, el('span', '', c.linea));
          b.title = c.linea; // P3d: misma línea como ayuda del mouse en escritorio
          b.append(tx);
          if (c.nuevo) b.append(punto());
          grid.append(b);
        }
        const carril = el('div', 'mn-carril');
        carril.append(grid);
        p.append(carril);
        // Carril (alto < 480): flecha en la orilla derecha que avisa "hay más" y lo corre una tarjeta; se va al llegar al final
        const mas = tap(el('button', 'mn-mas', '›'), () => grid.scrollBy({ left: 184, behavior: 'smooth' }));
        mas.setAttribute('aria-label', t('menu.mas'));
        const ve = () => mas.classList.toggle('fin', grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4);
        grid.addEventListener('scroll', ve, { passive: true });
        requestAnimationFrame(ve);
        carril.append(mas);
      }
      if (m.voto) {
        // P3c: fila tranquila de papel bajo las tarjetas (fuera del carril: se ve sin deslizar), sin punto NUEVO
        const v = votoLink(m.voto, 'mn-voto');
        const tx = el('div', 'tx');
        tx.append(el('b', '', t('voto.titulo')), el('span', '', t('voto.menu')));
        v.append(tx, el('em', 'mn-voto-ir', t('voto.btn')));
        v.title = t('voto.menu');
        p.append(v);
      }
      if (m.pie) {
        const pie = el('p', 'mn-pie', m.pie);
        if (m.pieTitle) pie.title = m.pieTitle;
        p.append(pie);
      }
      root.appendChild(p);
      state.menu = p;
      ui.placeMenu(zonas);
    },
    // Dónde va el panel (px de pantalla): 1) bajo la línea del suelo, a todo lo ancho; 2) a la derecha de Moki;
    // 3) arriba de su cabeza con aire para el salto del demo. Si nada alcanza, a la derecha con scroll.
    // Alto < 480 (660x372 embebido, 640x400): las tarjetas van en un carril horizontal.
    placeMenu(zonas) {
      const p = state.menu;
      if (!p || !zonas) return;
      const W = root.clientWidth;
      const H = root.clientHeight;
      const sb = state.soundBtn;
      const top0 = Math.max(72, (zonas.hudB || 0) + 10, sb ? sb.offsetTop + sb.offsetHeight + 12 : 0); // fila del HUD: sonido, metros y piezas
      p.classList.toggle('corto', H < 480);
      p.style.maxHeight = '';
      const pon = (left, width) => {
        Object.assign(p.style, { left: `${Math.round(left)}px`, width: `${Math.round(width)}px` });
        p.classList.toggle('una', width < 320); // columna angosta junto a Moki: una tarjeta por renglón, cada una en 1 línea
        return p.offsetHeight;
      };
      const full = Math.min(W - 32, 560);
      let h = pon((W - full) / 2, full);
      const piso = zonas.floorY + 22; // bajo la línea del suelo, con aire para el aplastado de Moki al aterrizar
      // con aire de sobra, a la mitad del hueco bajo el suelo (a 660x372 el botón solo quedaba pegado a la línea del suelo)
      if (piso + h <= H - 12) return (p.style.top = `${Math.round(piso + Math.max(0, Math.min(24, (H - 12 - piso - h) / 2)))}px`);
      const L = zonas.mokiR + 16;
      const wd = Math.min(W - L - 16, 880);
      if (wd >= 300) {
        h = pon(L + (W - L - 16 - wd) / 2, wd);
        const pie = H < 480 ? 8 : 12; // P5: en pantalla baja 4 px más de aire entre JUGAR y la línea del suelo
        if (h <= H - top0 - pie) return (p.style.top = `${Math.round(H - pie - h)}px`);
      }
      h = pon((W - full) / 2, full);
      const techo = zonas.mokiT - 90; // el demo salta: la cabeza sube ~80 px
      if (h <= techo - top0) return (p.style.top = `${Math.round(techo - h)}px`);
      if (wd >= 240) pon(L + (W - L - 16 - wd) / 2, wd);
      p.style.maxHeight = `${H - top0 - 12}px`;
      p.style.top = `${top0}px`;
    },
    hideMenu(now) {
      const p = state.menu;
      state.menu = null;
      if (!p) return;
      // Al dar Jugar el panel se va hacia abajo en 140 ms en vez de desaparecer en seco
      if (now || reducedMQ.matches || feel.level === 0) return p.remove();
      p.classList.add('out');
      setTimeout(() => p.remove(), 150);
    },
    hideDemo() {
      ui.hideMenu();
    },

    showPauseButton(on) {
      if (!on) {
        if (state.pauseBtn) state.pauseBtn.remove();
        if (state.homeBtn) state.homeBtn.remove();
        state.pauseBtn = state.homeBtn = null;
        return;
      }
      if (state.pauseBtn) return;
      // Punto 6 de Jorge: de cualquier modo se vuelve al menú en un toque (casita de tinta junto a la pausa,
      // también encima de la tarjeta de fallo)
      const hb = el('button', 'ui-homebtn');
      hb.type = 'button';
      hb.setAttribute('aria-label', t('menu.volver.aria'));
      hb.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M6 10v9h4.5v-5h3v5H18v-9" fill="none" stroke="#22211f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
      hb.addEventListener('pointerdown', (e) => e.stopPropagation());
      hb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (ui.onHome) ui.onHome();
      });
      root.appendChild(hb);
      state.homeBtn = hb;
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
    showFail({ hint, meta, prompt, rect, isNew, barra, bandera }, onGo, onBandera) {
      ui.hideFail();
      ui.hideTachado(); // la tira de la tarjeta ya enseña lo tachado
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
      if (Array.isArray(meta)) {
        const p = el('p', 'meta');
        meta.forEach((m) => p.append(el('span', '', m))); // un renglón cada uno: nunca 'checkpoint' huérfano
        card.append(p);
      } else if (meta) card.append(el('p', 'meta', meta));
      // P3b: barra de lo siguiente (perder también avanza). abrio = lo que esta caída acaba de abrir.
      if (barra) {
        const b = el('div', 'ui-barra');
        if (barra.abrio) b.append(el('b', 'abrio', t('barra.abrio', { r: t(`regalo.${barra.abrio}`) })));
        if (barra.sig) {
          const s = barra.sig;
          const fila = el('div', 'fila');
          const dib = el('span', `dib ${s.id}`); // dibujo de papel del regalo: fondo SVG en ui.css
          const txt = el('span', 'txt');
          txt.append(el('span', 'tit', t('barra.tit', { r: t(`regalo.${s.id}`) })), el('span', 'falta', t('barra.falta', { m: s.faltaM, p: s.faltaP })));
          fila.append(dib, txt);
          b.append(fila);
          const tubo = el('i', 'tubo');
          const lleno = el('i', 'lleno');
          lleno.style.width = `${Math.round((100 * s.pts) / s.meta)}%`;
          tubo.append(lleno);
          b.append(tubo);
        }
        card.append(b);
      }
      const pill = el('button', 'ui-pill', `↻ ${prompt}`);
      pill.type = 'button';
      pill.disabled = true;
      card.append(pill);
      // P3b ayuda tras 3 caídas en el mismo tramo: segundo botón, sin castigo; el toque en el fondo sigue siendo reintentar
      let alt = null;
      if (bandera && onBandera) {
        alt = el('button', 'ui-btn secondary ui-bandera', `⚑ ${bandera}`);
        alt.type = 'button';
        alt.disabled = true;
        alt.addEventListener('pointerdown', (e) => e.stopPropagation());
        card.append(alt);
      }
      scrim.append(card);
      root.appendChild(scrim);
      // Pantallas bajas (embed 660x372, 640x400): si el contenido no cabe en maxHeight, se aprieta por pasos para que el
      // botón de reintento siempre se vea: 1) barra en una línea, 2) sin la línea de meta, 3) la barra queda en texto
      // ("Lo siguiente: ..." o "¡Abriste ...!") sin dibujo ni tubo, 4) sin la barra. Con bandera, antes que nada los dos
      // botones van lado a lado (el alto lo topa la cabeza de Moki: la tarjeta no puede crecer)
      for (const k of [...(alt ? ['lado'] : []), 'apretada', 'apretada2', 'apretada3', 'apretada4']) {
        if (card.scrollHeight <= card.clientHeight + 1) break;
        card.classList.add(k);
      }
      let fired = false;
      const go = () => {
        if (fired || pill.disabled) return;
        fired = true;
        onGo();
      };
      if (alt)
        alt.addEventListener('click', () => {
          if (fired || alt.disabled) return;
          fired = true;
          onBandera();
        });
      scrim.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        go();
      });
      pill.addEventListener('click', go);
      primary = go;
      state.fail = { scrim, card, pill, alt };
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
      if (state.fail.alt) state.fail.alt.disabled = false;
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
      const tit = el('span', 'cu-tit');
      tit.append(el('span', 'cu-nivel', t('cu.nivel', { n: tira.nivel })), el('b', '', t('cu.title')));
      const cnt = el('span', '', t('cu.count', { n: tira.total, de: tira.de }));
      cnt.title = t('cu.count.d');
      head.append(tit, cnt);
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
      if (tira.subio) strip.append(el('p', 'cu-sellos cu-subio cu-sube', t(tira.completo ? 'cu.completo' : 'cu.subio', { n: tira.nivel })));
      // mecánica nueva del nivel (NIVELES.md flow §5)
      for (const m of ['tramp', 'viento', 'timbre']) if (tira.subio && tira.nivel === C[m].nivel) strip.append(el('p', 'cu-sellos cu-subio', t(`cu.${m}`)));
      // Día 4: qué sigue. Al cerrar un set de tres, el primer encargo del nivel nuevo (si no salió ya como renglón);
      // al llegar a la meta sin subir, cuántos encargos faltan para el siguiente nivel. En fallo sin subida, nada.
      let sigue = '';
      if (!tira.completo && tira.activas.length) {
        const k = tira.activas.length;
        const primero = tira.activas[0].id;
        const enRenglon = [...list.querySelectorAll('.cu-txt')].some((n) => n.textContent === t(`cu.nota.${primero}`));
        if (tira.subio) sigue = enRenglon ? '' : t('cu.sigue', { s: t(`cu.nota.${primero}`) });
        else if (host === state.final) sigue = t(`cu.${k === 1 ? 'falta' : 'faltan'}${tira.ultimo ? '.fin' : ''}`, { k, n: tira.nivel + 1 });
      }
      // Día 2: el sello del nivel recién completo va primero en la línea de sellos nuevos
      const sellosNuevos = [...(tira.selloNivel ? [t('cu.sello.nivel', { n: tira.selloNivel })] : []), ...tira.nuevosSellos.map((id) => t(`cu.sello.${id}`))];
      if (sellosNuevos.length) strip.append(el('p', 'cu-sellos', t('cu.sellos', { s: sellosNuevos.join(' · ') })));
      if (sigue) strip.append(el('p', 'cu-sigue', sigue)); // al final: se lee como cierre de la tira
      strip.style.visibility = 'hidden';
      scrim.append(strip);
      // Caja de la tarjeta en px de pantalla (offset* ignora el transform de la animación de entrada)
      const W = scrim.clientWidth;
      const H = scrim.clientHeight;
      const c = { l: card.offsetLeft, t: card.offsetTop, w: card.offsetWidth, h: card.offsetHeight };
      const w = Math.min(W - 32, Math.max(c.w, 300));
      strip.style.width = `${w}px`;
      const left = Math.max(16, Math.min(c.l, W - 16 - w));
      // Debajo de la tarjeta si no tapa a Moki (en horizontal la tarjeta ya va a su derecha); si no, abajo sobre el
      // suelo de papel. Si no hay lugar sin traslape con la tarjeta ni con Moki, no se enseña: la tarjeta manda.
      // ENCARGOS-D: 20 px de aire con el borde de abajo (era 12; a 375 la tira se veía pegada al borde)
      const aire = 20;
      const lugar = () => {
        const sh = strip.offsetHeight;
        const t0 = c.t + c.h + 14;
        if (t0 + sh <= H - aire && (zonas.wide || t0 + sh <= zonas.headY - 6)) return t0;
        const t1 = H - aire - sh;
        return t1 < zonas.floorY + 4 || t1 < c.t + c.h + 6 ? null : t1;
      };
      // Si no cabe (celular con subida de nivel), se recorta antes de esconderla: primero renglones desde abajo
      // (queda al menos uno), luego la línea de sellos de partida (E1b: el sello nuevo pesa más que una nota
      // activa). La subida de nivel es lo último que se va.
      let top = lugar();
      // Día 4: sin subida, lo primero que se va es la línea de qué sigue (la tira queda como antes); con subida va
      // después de renglones y sellos.
      const sobra = () =>
        tira.subio
          ? (list.children.length > 1 && list.lastElementChild) || strip.querySelector('.cu-sellos:not(.cu-subio)') || strip.querySelector('.cu-sigue')
          : strip.querySelector('.cu-sigue');
      for (let q = sobra(); top === null && q; q = sobra()) {
        q.remove();
        top = lugar();
      }
      if (top === null) {
        strip.remove();
        return;
      }
      Object.assign(strip.style, { left: `${left}px`, top: `${top}px`, visibility: '' });
      state.cuaderno = strip;
      // CRECE (DISENO.md, tabla final): del nivel 2 al 5 el sello nuevo trae recortes; desde el 6 se estampa con golpe
      // (tok y campanita) y sin confeti, para que se lea distinto (confeti = subiste, golpe = sello). Una subida desde
      // el 6 sin sello nuevo da el golpe chico en la línea de subida. Efectos: Poquito = poquito, Hardcore = más; Nada
      // o reducido = quieto.
      const fx = reducedMQ.matches ? 0 : feel.level;
      // CRECE nivel 10: Moki festeja en la línea de subida (cuadro de salto del kit pixel, brazo arriba, sin espejar) y
      // suena una cadena de campanitas. Mucho brinca 3 px, Hardcore 6; Poquito, Nada o reducido: pose fija y 2 notas.
      const sube = tira.subio && tira.nivel >= 10 && strip.querySelector('.cu-sube');
      if (sube) {
        const m = el('i', `cu-festejo fx${fx}`);
        m.setAttribute('aria-hidden', 'true');
        m.style.backgroundImage = `url(${festejoUrl})`;
        sube.prepend(m);
        setTimeout(() => state.cuaderno === strip && ui.sfx && ui.sfx('festejo', { n: fx >= 2 ? 4 : 2, hc: fx === 3 }), 700);
      }
      const golpe = tira.nivel >= 6;
      const sello = strip.querySelector('.cu-stamp.new') || (golpe && tira.subio && strip.querySelector('.cu-subio'));
      if (!sello) return;
      // cuando toca el papel: golpe 380 + 90 ms; el estampado grande (Hardcore en el 6, y el de siempre) ~610 ms
      const at = golpe && fx && fx < 3 ? 470 : 610;
      if (golpe) {
        strip.classList.add('cu-golpe', `fx${fx}`);
        if (!sello.classList.contains('cu-stamp')) sello.classList.add('cu-linea');
        setTimeout(() => {
          if (state.cuaderno !== strip) return;
          if (ui.sfx) ui.sfx('sello');
          if (fx === 3) card.animate([{ translate: '0 0' }, { translate: '0 2px' }, { translate: '0 0' }], 120);
        }, fx ? at : 380);
        return;
      }
      if (tira.nivel < 2 || !fx) return;
      // Los recortes nacen del sello en una capa DETRÁS de la tarjeta y de la tira: solo se ven fuera de sus cajas,
      // así nunca tapan texto. Saltan, abren hacia los lados y caen.
      const caja = el('div', 'cu-recortes');
      const W2 = strip.offsetWidth;
      const H2 = strip.offsetHeight;
      Object.assign(caja.style, { left: strip.style.left, top: strip.style.top, width: `${W2}px`, height: `${H2}px` });
      scrim.prepend(caja);
      const sx = sello.offsetLeft + 9;
      const sy = sello.offsetTop + 9;
      const n = [0, 4, 10, 16][fx];
      for (let i = 0; i < n; i++) {
        const c = el('i');
        const der = i % 5 > 1; // 3 de cada 5 a la derecha (el sello está a la izquierda)
        Object.assign(c.style, {
          left: `${sx}px`,
          top: `${sy}px`,
          background: ['#ff6b35', '#ffa500', '#f4e8d5'][i % 3],
          animationDuration: `${fx === 1 ? 500 : 800}ms`,
          animationDelay: `${at + (i % 4) * 25}ms`,
        });
        c.style.setProperty('--x', `${Math.round(der ? (W2 - sx) * (0.7 + Math.random() * 0.5) : -(sx + 16 + Math.random() * 40))}px`);
        c.style.setProperty('--u', `${-Math.round(30 + Math.random() * 50)}px`);
        c.style.setProperty('--y', `${Math.round(H2 - sy + 20 + Math.random() * 40)}px`);
        c.style.setProperty('--r', `${fx === 3 ? Math.round(Math.random() * 360 - 180) : Math.round(Math.random() * 60 - 30)}deg`);
        c.onanimationend = () => (c.remove(), caja.children.length || caja.remove());
        caja.append(c);
      }
    },
    // Tachado a media partida (Día 2): etiqueta de papel bajo el HUD con el encargo tachado y su sello. Sale, se
    // queda C.tachadoMs y se va; varios de golpe van en fila. Sin toque ni bloqueo: el juego nunca espera al aviso.
    showTachado(text, zona = null) {
      state.tachados.push({ text, zona });
      if (!state.tachado) siguienteTachado();
    },
    hideTachado() {
      state.tachados.length = 0;
      if (state.tachado) {
        clearTimeout(state.tachado.timer);
        state.tachado.node.remove();
      }
      state.tachado = null;
    },

    hideCuaderno() {
      if (!state.cuaderno) return;
      state.cuaderno.remove();
      state.cuaderno = null;
    },

    // Pantalla final (UX §8)
    showFinal(d, { onAgain, onHow, onCopy, onMenu }, rect) {
      ui.hideFinal();
      ui.hideTachado();
      const scrim = el('div', 'ui-scrim');
      scrim.style.background = 'rgba(34,33,31,0.18)';
      const card = el('div', `ui-card${rect.compact ? ' compact' : ''}${rect.corto ? ' corto' : ''}`);
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
      // LA SUMA A: al final dice qué sigue y lleva al menú en un toque
      // P3c: en la tarjeta corta la liga de voto ocupa el lugar de 'Qué sigue'; en la grande va debajo con su línea
      if (onMenu && !(d.voto && rect.corto)) card.append(el('p', 'ui-sigue', t('end.sigue')));
      let voto = null; // va después de los botones: nunca empuja a 'Otra vez' fuera de la tarjeta
      if (d.voto) {
        // corta (vertical y bajito): liga de texto en la misma fila que jorgesuarez.com.mx; la tarjeta no crece (P3c arreglo)
        const v = votoLink(d.voto, rect.corto ? 'ui-link ui-voto-c' : 'ui-btn secondary ui-voto');
        v.textContent = rect.corto ? t('voto.titulo') : `${t('voto.titulo')} · ${t('voto.btn')}`;
        v.addEventListener('click', () => (v.textContent = t('voto.gracias')));
        voto = rect.corto ? [v] : [el('p', 'ui-voto-sub', t('voto.sub')), v];
      }
      card.append(again);
      if (onMenu) {
        const menu = el('button', 'ui-btn secondary', t('menu.volver'));
        menu.type = 'button';
        menu.addEventListener('click', onMenu);
        card.append(menu);
      }
      card.append(how);
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
      const fila = voto && rect.corto; // la liga corta comparte renglón con la de regreso
      if (voto) card.append(...(fila ? [el('br')] : []), ...voto);
      if (!EMBED) {
        // En embed la página padre ya trae la liga de regreso
        const link = el('a', 'ui-link', t('end.link'));
        link.href = 'https://jorgesuarez.com.mx';
        link.rel = 'noopener';
        card.append(...(fila ? [] : [el('br')]), link);
      }
      card.append(el('p', 'meta', t('contador.nota')));
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
      foot.append(back, el('p', 'credito', t('how.credito'))); // licencia del arte de las poses (CC BY-NC)
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

    // P7 LOGROS: la pantalla y el aviso viven en un módulo diferido (logrosUi.js con su CSS y textos): el JS inicial
    // solo lleva estos ganchos. state.logros se marca al instante para que el teclado y el lienzo no arranquen la partida.
    showLogros(d, onBack) {
      ui.hideLogros();
      const tok = (state.logros = { tok: true });
      import('./logrosUi.js')
        .then((m) => {
          if (state.logros !== tok) return;
          const lg = m.pantalla(el, d, onBack);
          root.appendChild(lg);
          state.logros = lg;
          primary = onBack;
          lg.querySelector('button').focus({ preventScroll: true });
        })
        .catch(() => state.logros === tok && ((state.logros = null), onBack()));
    },
    hideLogros() {
      if (!state.logros) return;
      if (state.logros.remove) state.logros.remove();
      state.logros = null;
      primary = null;
    },
    get logrosOpen() {
      return !!state.logros;
    },
    avisoLogro(ids, zona) {
      if (!ids.length) return;
      import('./logrosUi.js')
        .then((m) => m.aviso(el, root, ids, ui.sfx, zona))
        .catch(() => {});
    },

    // Pausa (UX §6)
    showPause({ onResume, onHome, onFoto, zen, onZen }) {
      ui.hidePause();
      const scrim = el('div', 'ui-scrim pause');
      const card = el('div', 'ui-card ui-pause');
      card.style.position = 'relative';
      card.append(el('h2', '', t('pause.title')), el('p', 'ui-pause-hud', t('pause.hud'))); // P3d: el HUD es lienzo, se explica aquí
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
      // Modo foto (MAPA-SISTEMAS #3): cámara de tinta dibujada en CSS (ui.css); el cuadro limpio vive en src/foto.js (diferido)
      const foto = el('button', 'ui-btn secondary ui-foto-btn');
      foto.type = 'button';
      foto.append(el('i'));
      foto.append(t('pause.foto'));
      foto.addEventListener('click', onFoto);
      resume.addEventListener('click', onResume);
      home.addEventListener('click', onHome);
      stack.append(resume, foto, snd, jz);
      // Paseo: pantalla limpia (Zen) sin números arriba; se queda puesta mientras paseas
      if (onZen) {
        const zb = el('button', 'ui-btn secondary', t(zen ? 'pause.zen.on' : 'pause.zen.off'));
        zb.type = 'button';
        zb.setAttribute('aria-pressed', String(zen));
        zb.addEventListener('click', () => {
          zen = onZen();
          zb.textContent = t(zen ? 'pause.zen.on' : 'pause.zen.off');
          zb.setAttribute('aria-pressed', String(zen));
        });
        stack.append(zb);
      }
      stack.append(home);
      card.append(stack);
      if (!onZen) card.append(el('p', 'meta', t('contador.nota'))); // en Paseo el menú ya llena 390 px de alto; ahí la línea queda en la tarjeta final
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
    onHome: null,
    state,
  };
  void C;
  return ui;
}
