import Phaser from 'phaser';
import { CONFIG as C } from '../config.js';
import { PAL, TONE } from '../art/palette.js';
import { buildTextures } from '../art/textures.js';
import { buildMokiPieces, createMokiRig } from '../art/mokiRig.js';
import { Particles } from '../art/particles.js';
import { Ambient } from '../art/ambient.js';
import { MID_PROPS, MID_WRAP, MID_H } from '../art/textures.js';
import { createUI } from '../ui/ui.js';
import { audio } from '../audio/audio.js';
import { t } from '../i18n.js';
import { feel } from '../feel.js';
import { load, save, num } from '../storage.js';
import { nuevaPartida, revisar, leerCuaderno, nivelDe, TOTAL_SELLOS } from '../cuaderno.js';
import { registrarDia, saludo, leerRacha } from '../racha.js';
import { ESCAPARATE, Escaparate } from '../escaparate.js';
import { textoTarjeta, copiar } from '../tarjeta.js';
import { GAME_LEVEL, buildDemo } from '../tramos.js';
import { generarNivel, semillaReto, semillaLibre } from '../niveles/generar.js';
import { airTravel, riseAt, planJump } from '../jumpmodel.js';
import mokiLado from '../../assets/moki/moki-lado.webp';
import mokiSaluda from '../../assets/moki/moki-saluda.webp';

const Q = new URLSearchParams(window.location.search);
const FIXED_SPEED = Number(Q.get('speed')) || 0; // ?speed=320|450|560 fija la velocidad (capturas comparables)
const ANIM_DEBUG = Q.get('anim') === 'debug';
const START_TUT = Q.get('tut') === '2' ? 2 : 0; // ?tut=2 salta a la lección 2
const START_SCREEN = Q.get('screen'); // ?screen=play salta el demo (pruebas)
const SEED = Q.get('seed'); // ?seed=2026-10-29 | 123 fija el nivel; ?nivel=clasico usa los 4 tramos escritos a mano
const CLASICO = Q.get('nivel') === 'clasico';
// Vuelta rápida se abre con el sello Coleccionista (>=80% de las piezas al terminar; cuaderno.js)
const vueltaAbierta = () => leerCuaderno().sellos.includes('coleccionista');
const GOD = Q.has('god') && (import.meta.env.DEV || Q.has('debug')); // sin choques, solo para pruebas
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const FONT_UI = 'Inter, sans-serif';
const FONT_NUM = 'Outfit, sans-serif';
const KEY_JUMP = [' ', 'ArrowUp', 'w', 'W'];

// Física a mano (no Arcade): el salto se afina por perillas, sin sorpresas del motor.
// Pantallas: demo | play | dead | final | pause. El tutorial vive dentro de play (UX §4).
export class RunScene extends Phaser.Scene {
  constructor() {
    super('RunScene');
  }

  preload() {
    this.load.image('moki', mokiLado);
    this.load.image('mokiSaluda', mokiSaluda);
  }

  create() {
    this.modo = load('moki.modo') === 'libre' ? 'libre' : 'reto'; // Reto del día por defecto (NIVELES.md §7)
    this.paseo = load('moki.paseo') === '1'; // Modo Paseo (GDD §3): opción del jugador, no la bandera ?god de pruebas
    this.paseoRun = false; // Paseo activo en la partida en curso (el demo nunca lo usa)
    this.vuelta = load('moki.vuelta') === '1'; // Vuelta rápida (GDD §3): opción del jugador; solo cuenta con el sello Coleccionista
    this.vueltaOn = false; // pedida para la partida en curso; vueltaRun además exige Reto o Libre
    performance.mark('c0');
    this.texQueue = buildTextures(this); // lo esencial ya; el resto se genera después, una textura por cuadro
    performance.mark('c1');
    buildMokiPieces(this);
    performance.mark('c2');

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = mq.matches;
    mq.addEventListener('change', (e) => (this.reduced = e.matches));
    this.coarse = window.matchMedia('(pointer: coarse)').matches;

    this.ui = createUI();
    this.ui.onPause = () => this.pauseGame();
    // Botón de sonido (moki.sound): refleja solo la preferencia, sin importar el juice
    this.ui.onSound = () => audio.toggle();
    this.ui.sfx = (n) => audio.sfx(n);
    this.ui.soundOn = !audio.muted;
    audio.onChange((muted) => this.ui.setSound(!muted));
    performance.mark('c3');
    this.buildWorld();
    performance.mark('c4');
    this.buildHud();
    this.buildTutorialUI();
    this.bindInput();

    performance.mark('c5');
    this.scale.on('resize', () => this.layout());
    this.layout();
    performance.mark('c6');
    this.demoVariant = 0;
    this.lastInputAt = 0;
    this.screen = 'demo';
    this.god = false;
    if (ESCAPARATE) this.esc = new Escaparate(this); // ?escaparate: el guion arranca su propio título
    else if (START_SCREEN === 'play') this.startGame();
    else this.startDemo();
    // La portada HTML se retira cuando la escena ya está lista (Moki corriendo en el siguiente cuadro)
    // Las fuentes pueden llegar después del primer cuadro: el HUD se vuelve a medir cuando están listas
    document.fonts.ready.then(() => {
      this.lastM = -1;
      this.pieceLabel.set(String(this.pieces || 0));
      this.distLabel.set(`${Math.floor((this.dist || 0) / 100)} ${t('hud.m')}`);
    });
    performance.mark('moki-ready');
    const boot = document.getElementById('boot');
    if (boot) {
      boot.classList.add('gone');
      setTimeout(() => boot.remove(), 320);
    }
  }

  // ---------- Construcción ----------

  buildWorld() {
    const a = (key, depth) => this.add.tileSprite(0, 0, 10, 10, key).setOrigin(0, 0).setDepth(depth);
    this.sky = a('paper', 0);
    this.skyGrad = this.add.image(0, 0, 'skyGrad').setOrigin(0, 0).setDepth(0.5);
    // noche: banda del horizonte en tiras planas de papel (la dibuja Ambient.drawBand detrás de la cordillera)
    this.skyBand = this.add.graphics().setDepth(0.5).setVisible(false);
    // capas de fondo: nacen invisibles con un papel de relleno y entran con fundido cuando su textura está lista
    this.clouds = a('paper', 1).setAlpha(0);
    // Velo de papel en el borde superior: las nubes se desvanecen en vez de cortarse en seco.
    this.topFade = this.add.image(0, 0, 'topFade').setOrigin(0, 0).setDepth(1.5);
    // Gauntlet R0: sol de papel bajo y cordillera extra (silueta de la capa lejana casi color cielo), detrás de los cerros
    const atm = C.atmosphere.on;
    this.sun = this.add.image(0, 0, 'sun').setDepth(1.8).setVisible(atm);
    this.ridge = a('paper', 1.9).setAlpha(0).setTintFill(0xf4e8d5).setVisible(atm);
    this.far = a('paper', 2).setAlpha(0);
    // noche: faldón de la cordillera (de su pie al suelo) para que no asome por el hueco una franja clara de cielo con borde duro
    this.ridgeSkirt = this.add.rectangle(0, 0, 10, 10, 0, 1).setOrigin(0, 0).setDepth(1.9).setAlpha(0).setVisible(atm);
    this.mid = a('paper', 3).setAlpha(0);
    // Perspectiva atmosférica: la misma capa pintada del color del cielo (tintFill) encima, con alfa baja (C.atmosphere).
    // Solo cubre las siluetas, así el papel del cielo no se aplana. El color lo pone Ambient.applyDay según la hora.
    this.farVeil = a('paper', 2.05).setAlpha(0).setTintFill(0xf4e8d5).setVisible(atm);
    this.midVeil = a('paper', 3.05).setAlpha(0).setTintFill(0xf4e8d5).setVisible(atm);
    // El frente y el suelo van hacia tinta (no hacia el cielo): el plano cercano es el más oscuro
    this.nearVeil = this.add.rectangle(0, 0, 10, 10, Phaser.Display.Color.HexStringToColor(PAL.ink).color, 1).setOrigin(0, 0).setDepth(4.6).setAlpha(C.atmosphere.near).setVisible(atm);
    // Fibras del suelo de noche, encima del velo cercano (alfa 0 de día, lo sube Ambient)
    this.groundFibers = this.add.tileSprite(0, 0, 10, 10, 'groundFibers').setOrigin(0, 0).setDepth(4.65).setAlpha(0).setVisible(atm);
    // Luz de lámpara: halo cálido y viñeta de tinta, multiplicados sobre todo menos el HUD
    this.light = this.add.image(0, 0, 'light').setOrigin(0, 0).setDepth(30).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(C.light.on);
    this.surface = a('groundSurface', 4);
    this.canto = a('groundCanto', 4);
    this.front = a('kraft', 4);
    this.shade = this.add.image(0, 0, 'groundShade').setOrigin(0, 0).setDepth(4.1);
    this.folds = [];

    this.px = C.player.xMax;
    this.mokiShadow = this.add.image(this.px, C.world.groundY, 'shadow').setDepth(9);
    // Moki es un títere recortado (src/art/mokiRig.js). Nunca espejado: ni flipX ni escala negativa.
    this.rig = createMokiRig(this);
    this.rig.debugOn = ANIM_DEBUG;
    this.particles = new Particles(this);
    this.ambient = new Ambient(this, Number(Q.get('amb')) || C.ambient.seed); // ?amb=N cambia la semilla del fondo (prueba de determinismo)
    this.strip = this.add.rectangle(0, 0, 10, 10, 0xf4e8d5, 1).setOrigin(0, 0).setDepth(11.9).setAlpha(0); // tira de papel del demo (bajo Moki)
    if (ANIM_DEBUG) {
      // Lectura de medición en el DOM (la cámara con zoom deformaría un texto del lienzo).
      this.debugEl = document.createElement('pre');
      this.debugEl.style.cssText = 'position:fixed;left:8px;bottom:8px;margin:0;padding:6px 8px;font:13px monospace;background:#F4E8D5;color:#22211F;border:2px solid #8A7E70;z-index:50;pointer-events:none';
      document.body.appendChild(this.debugEl);
    }

    this.obstacles = [];
    this.pickups = [];
    this.checkpoints = [];
    this.fg = [];
    this.meta = null;
  }

  // Etiqueta de papel del HUD. Sin palabras en juego (decisión del líder): número + unidad o ficha.
  makeLabel(container, align, iconKey) {
    const gfx = this.add.graphics();
    const icon = iconKey ? this.add.image(0, 0, iconKey).setScale(0.62).setOrigin(0, 0.5) : null;
    const val = this.add.text(0, 0, '', { fontFamily: FONT_NUM, fontStyle: '700', fontSize: '22px', color: PAL.ink });
    container.add(icon ? [gfx, icon, val] : [gfx, val]);
    const label = {
      set(text) {
        val.setText(text);
        const pad = 12;
        const iw = icon ? icon.displayWidth + 8 : 0;
        const h = 40;
        const w = pad + iw + val.width + pad;
        const x0 = align === 'right' ? -w : align === 'center' ? -w / 2 : 0;
        gfx.clear();
        gfx.fillStyle(0x22211f, 0.22);
        gfx.fillRoundedRect(x0 + 3, 5, w, h, 12);
        gfx.fillStyle(0xf4e8d5, 1);
        gfx.fillRoundedRect(x0, 0, w, h, 12);
        gfx.lineStyle(3, Phaser.Display.Color.HexStringToColor(TONE.kraftDark).color, 1);
        gfx.strokeRoundedRect(x0 + 1.5, 1.5, w - 3, h - 3, 11);
        if (icon) icon.setPosition(x0 + pad, h / 2);
        val.setPosition(x0 + pad + iw, (h - val.height) / 2);
      },
    };
    label.set('');
    return label;
  }

  buildHud() {
    this.hudL = this.add.container(0, 0).setDepth(100);
    this.hudR = this.add.container(0, 0).setDepth(100);
    this.hudC = this.add.container(0, 0).setDepth(101).setAlpha(0);
    this.distLabel = this.makeLabel(this.hudL, 'left');
    this.pieceLabel = this.makeLabel(this.hudR, 'right', 'token');
    this.banner = this.makeLabel(this.hudC, 'center');
    this.distLabel.set(`0 ${t('hud.m')}`);
    this.pieceLabel.set('0');
    // Paseo activo: etiqueta de papel bajo los metros (tinta #22211F, sin naranja chico; ARTE §5). La pide el líder tras QA de la pieza 4
    this.paseoTagC = this.add.container(0, 48).setVisible(false);
    this.hudL.add(this.paseoTagC);
    this.makeLabel(this.paseoTagC, 'left').set(t('paseo.name'));
    // Vuelta rápida activa: misma etiqueta de papel en el mismo lugar (nunca coinciden con Paseo)
    this.vueltaTagC = this.add.container(0, 48).setVisible(false);
    this.hudL.add(this.vueltaTagC);
    this.makeLabel(this.vueltaTagC, 'left').set(t('vuelta.name'));
  }

  // Mano de papel, etiqueta, anillo y arco fantasma del tutorial (UX §4). Todo procedural.
  buildTutorialUI() {
    this.tutC = this.add.container(0, 0).setDepth(150).setVisible(false);
    this.tutHalo = this.add.graphics(); // fondo de papel claro: la mano se lee sobre cielo, colina o suelo
    this.tutRing = this.add.graphics();
    this.tutHand = this.add.image(0, 0, 'token').setOrigin(0.5, 0.1); // la mano y la tecla se generan después; stepTutHand cambia la textura
    this.tutLabelC = this.add.container(0, 0);
    this.tutLabel = this.makeLabel(this.tutLabelC, 'left');
    this.tutC.add([this.tutHalo, this.tutRing, this.tutHand, this.tutLabelC]);
    this.tutArc = this.add.graphics().setDepth(14).setVisible(false);
  }

  bindInput() {
    const kb = this.input.keyboard;
    kb.on('keydown', (e) => {
      if (this.esc) return; // el escaparate se mira, no se juega
      this.lastInputAt = this.time.now;
      if (e.key === 'm' || e.key === 'M') {
        audio.toggle();
        return;
      }
      const onButton = e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'A');
      if (this.ui.modalOpen) {
        // Esc, p y P reanudan la pausa aunque el foco esté en un botón (se revisan antes que el botón enfocado)
        if (this.screen === 'pause' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          this.resumeGame();
          return;
        }
        if (onButton) return; // el botón enfocado se activa solo con Espacio/Enter
        if (KEY_JUMP.includes(e.key) || e.key === 'Enter') {
          e.preventDefault();
          this.ui.primary();
        }
        return;
      }
      if (this.screen === 'demo') {
        if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key) || e.key.startsWith('F')) return;
        e.preventDefault();
        this.startGame();
        return;
      }
      if (KEY_JUMP.includes(e.key) && !e.repeat) {
        e.preventDefault();
        this.coarse = false;
        this.press();
      }
      if (['Escape', 'p', 'P'].includes(e.key) && !e.repeat) this.pauseGame();
    });
    kb.on('keyup', (e) => {
      if (KEY_JUMP.includes(e.key)) this.release();
    });
    this.input.on('pointerdown', () => {
      if (this.esc) return;
      this.lastInputAt = this.time.now;
      if (this.ui.modalOpen) return;
      this.coarse = true;
      if (this.screen === 'demo') this.startGame();
      else this.press();
    });
    this.input.on('pointerup', () => this.release());
    this.input.on('pointerupoutside', () => this.release());
    // Primer gesto (pointerdown, pointerup, touchend, click o keydown): ahí nace el AudioContext, nunca antes.
    const firstGesture = () => {
      audio.unlock();
      if (audio.unlocked) ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((n) => window.removeEventListener(n, firstGesture, true));
    };
    ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((n) => window.addEventListener(n, firstGesture, true));
    // Nada de salto "pegado" ni partida corriendo con la pestaña oculta; el audio hace fade y se suspende.
    const lose = () => {
      this.release();
      audio.hide();
      if (this.screen === 'play') this.pauseGame();
    };
    window.addEventListener('blur', lose);
    document.addEventListener('visibilitychange', () => document.hidden && lose());
    window.addEventListener('pointerdown', () => (this.lastInputAt = this.time.now), true);
    window.addEventListener('keydown', () => (this.lastInputAt = this.time.now), true);
  }

  // La banda jugable (960x540) siempre se ve completa; si sobra pantalla en vertical,
  // el diorama se extiende arriba (cielo) y abajo (suelo de cartón).
  layout() {
    const W = this.scale.width;
    const H = this.scale.height;
    const g = C.world.groundY;
    const P = C.portrait;
    const portrait = W / H <= P.maxAspect;
    const minW = C.world.minVisibleWidth;
    const z = Math.min(H / C.world.height, W / (portrait ? P.visibleWidth : minW));
    this.zoom = z;
    this.vw = W / z;
    this.vh = H / z;
    // Lo que se ve delante de Moki nunca baja de lo que se ve con minVisibleWidth (misma reacción).
    const ahead = minW - Math.min(C.player.xMax, minW * C.player.xRatio);
    this.px = Math.round(Math.min(C.player.xMax, this.vw * C.player.xRatio, this.vw - ahead));
    const spare = Math.max(0, this.vh - C.world.height);
    // En vertical el suelo queda a groundAt del alto, sin sacar de cuadro ninguna parte de la banda jugable
    this.top = portrait ? Math.min(0, Math.max(-spare, g - P.groundAt * this.vh)) : -spare * 0.6;
    this.farS = portrait ? P.farScale : 1;
    this.midS = portrait ? P.midScale : 1;
    this.bottom = this.top + this.vh;

    const cam = this.cameras.main;
    cam.setBackgroundColor(PAL.paper);
    cam.setZoom(z);
    cam.centerOn(this.vw / 2, this.top + this.vh / 2);

    this.sky.setPosition(0, this.top).setSize(this.vw, this.vh);
    this.skyGrad.setPosition(0, g - 320).setDisplaySize(this.vw, 320);
    this.clouds.setPosition(0, g - 900).setSize(this.vw, 900);
    this.topFade.setPosition(0, this.top).setDisplaySize(this.vw, 56);
    // Las capas escaladas conservan su pie sobre el suelo; crecen hacia arriba
    this.base = { far: g + 12 - 300 * this.farS, mid: g + 10 - 360 * this.midS };
    this.far.setPosition(0, this.base.far).setSize(this.vw, 300 * this.farS).setTileScale(this.farS);
    this.mid.setPosition(0, this.base.mid).setSize(this.vw, 360 * this.midS).setTileScale(this.midS);
    const R = C.ridge;
    this.ridgeS = this.farS * R.scale;
    this.base.ridge = g + 12 - R.lift - 300 * this.ridgeS;
    this.ridge.setPosition(0, this.base.ridge).setSize(this.vw, 300 * this.ridgeS).setTileScale(this.ridgeS);
    // la banda del horizonte termina en el pie de la cordillera: debajo no asoma su borde (corte duro a 1280)
    this.bandBox = { foot: g + 12 - R.lift, w: this.vw, s: this.farS };
    this.ridgeSkirt.setPosition(0, g + 12 - R.lift).setSize(this.vw, R.lift);
    this.bandKey = null;
    if (this.ambient) this.ambient.drawBand(C.atmosphere.night.horizon, this.ambient.nt || 0); // al cambiar de tamaño de noche
    this.sun.setPosition(this.vw * C.sun.x, g - C.sun.y * this.farS);
    this.farVeil.setPosition(0, this.base.far).setSize(this.vw, 300 * this.farS).setTileScale(this.farS);
    this.midVeil.setPosition(0, this.base.mid).setSize(this.vw, 360 * this.midS).setTileScale(this.midS);
    this.light.setPosition(0, this.top).setDisplaySize(this.vw, this.vh);
    this.surface.setPosition(0, g - 8).setSize(this.vw, 22);
    this.canto.setPosition(0, g + 14).setSize(this.vw, 6);
    const frontH = Math.max(40, this.bottom - (g + 20));
    this.nearVeil.setPosition(0, g - 8).setSize(this.vw, this.bottom - (g - 8));
    this.groundFibers.setPosition(0, g - 8).setSize(this.vw, this.bottom - (g - 8));
    this.front.setPosition(0, g + 20).setSize(this.vw, frontH);
    this.shade.setPosition(0, g + 20).setDisplaySize(this.vw, frontH);
    this.folds.forEach((f) => f.destroy());
    this.folds = [];
    for (let y = g + 62; y < this.bottom; y += 120) {
      this.folds.push(this.add.tileSprite(0, y, this.vw, 6, 'groundFold').setOrigin(0, 0).setDepth(4.2));
    }
    this.strip.setPosition(0, this.top).setSize(this.vw, this.vh);

    const m = 16 / z;
    const hs = W < 420 ? 0.88 : 1; // en 375 las fichas se achican un poco: >= 8 px de aire con el botón de sonido
    this.hudScale = hs / z;
    this.hudL.setScale(hs / z).setPosition(m, this.top + m);
    this.hudR.setScale(hs / z).setPosition(this.vw - m, this.top + m);
    this.hudC.setScale(1 / z).setPosition(this.vw / 2, this.top + m + 52 / z);
    // Mano del tutorial: abajo a la derecha, en la zona del pulgar, fuera del carril de juego.
    // Mano y etiqueta junto a Moki, sobre su cabeza (no en la esquina): ahí está la mirada del jugador.
    this.tutC.setScale(1 / z).setPosition(this.px - 34 / z, g - 232 - 60 / z); // 60 px de pantalla más arriba y a la izquierda: ni Moki ni el arco quedan tapados
    this.tutLabelC.setPosition(62, 0);
    if (this.ui && this.rig) this.ui.placeSaludo(this.saludoZonas());
  }

  saludar() {
    const hola = saludo();
    this.ui.showSaludo(t(hola.key, { n: hola.n }), nivelDe(leerCuaderno()).nivel, this.saludoZonas());
  }

  // E1b: zonas en px de pantalla para que la pastilla del saludo no toque la bota ni cruce la línea del suelo.
  // La línea que se ve es el borde de la superficie de cartón (groundY - 8, ver layout), no groundY.
  // El borde derecho de Moki sale de su títere, medido desde su x (en un resize el títere aún no se movió).
  saludoZonas() {
    const z = this.zoom;
    const c = this.rig.container;
    const b = c.getBounds();
    return { floorY: (C.world.groundY - 8 - this.top) * z, mokiR: (this.px + b.right - c.x) * z };
  }

  // ---------- Estado de la partida ----------

  resetRun(level, dist0) {
    [...this.obstacles, ...this.pickups, ...this.checkpoints].forEach((e) => e.destroy());
    if (this.meta) this.meta.destroy();
    this.meta = null;
    this.obstacles = [];
    this.pickups = [];
    this.checkpoints = [];
    (this.fg || []).forEach((f) => f.sprite.destroy());
    this.fg = [];
    this.fgNext = 600; // primeras piezas de primer plano casi de inmediato
    this.gpNext = 400;
    this.fgSide = false;
    this.fgPick = 0;
    this.level = level;
    this.dist = dist0;
    this.tramoIdx = 0;
    while (this.tramoIdx + 1 < level.tramos.length && dist0 >= level.starts[this.tramoIdx + 1]) this.tramoIdx++;
    this.nextEnt = level.entities.findIndex((e) => e.D >= dist0);
    if (this.nextEnt < 0) this.nextEnt = level.entities.length;
    this.nextFlag = this.tramoIdx + 1; // siguiente bandera por colocar
    this.y = C.world.groundY;
    this.vy = 0;
    this.grounded = true;
    this.lastGroundedAt = 0;
    this.pressedAt = -1e9;
    this.holding = false;
    this.jumping = false;
    this.jumpStartAt = 0;
    this.takeoffAt = -1e9;
    this.landAt = -1e9;
    this.t = 0;
    this.dead = false;
    this.deadFor = 0;
    this.rampT = 1e9;
    this.metaDone = false;
    this.finalShown = false;
    this.arcGot = {};
    this.combo = 0;
    this.lastPickAt = -1e9;
    this.botRelease = -1;
    this.hideBanner(true);
    this.rig.reset();
    this.particles.clear();
    this.tutSetState('off');
    this.tutArc.setVisible(false);
    if (this.ambient) this.ambient.reset();
    if (this.ambient) this.ambient.biomas = this.demo ? null : level.biomas || null; // biomas de papel por tramo (NIVELES.md §8)
    if (this.ambient) this.ambient.setDay(this.demo ? 0 : this.tramoIdx, true);
  }

  showModo() {
    this.ui.showModo(this.modo, () => {
      this.modo = this.modo === 'libre' ? 'reto' : 'libre';
      save('moki.modo', this.modo);
      this.showModo();
      this.saludar();
    }, this.paseo, () => {
      this.paseo = !this.paseo;
      save('moki.paseo', this.paseo ? '1' : '0');
      // Paseo y Vuelta rápida no se combinan (director, pieza 5): prender uno apaga el otro
      if (this.paseo && this.vuelta) {
        this.vuelta = false;
        save('moki.vuelta', '0');
      }
      this.showModo();
      this.saludar();
    }, { on: this.vuelta && vueltaAbierta(), locked: !vueltaAbierta() }, () => {
      if (!vueltaAbierta()) return; // bloqueada: el candado ya explica cómo se abre, el toque no hace nada
      this.vuelta = !this.vuelta;
      save('moki.vuelta', this.vuelta ? '1' : '0');
      if (this.vuelta && this.paseo) {
        this.paseo = false;
        save('moki.paseo', '0');
      }
      this.showModo();
      this.saludar();
    });
  }

  // Vuelta rápida en la partida en curso: pedida al empezar y solo en Reto del día o Libre (el clásico no cambia)
  get vueltaRun() {
    return this.vueltaOn && !this.demo && !!(this.level && this.level.modo);
  }

  // Velocidad objetivo del tramo: x1.12 con tope de 470 px/s en Vuelta rápida
  tramoSpeed(i) {
    const v = this.level.tramos[i].speed;
    return this.vueltaRun ? Math.min(C.runSpeedMax, v * C.vuelta.speedMult) : v;
  }

  // Línea de la tarjeta final: "Reto del 29 oct" o "Libre"; nada con ?nivel=clasico
  modoLabel() {
    const l = this.level;
    if (!l || !l.modo) return null;
    if (l.modo === 'libre') return t('modo.libre');
    const [y, m, d] = l.seed.split('-').map(Number);
    if (!d) return t('modo.reto');
    const mes = new Date(y, m - 1, d).toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
    return t('end.modo.reto', { d: `${d} ${mes}` });
  }

  // Mejor marca por modo (director): clásico, reto del día y libre no se comparan entre sí.
  // La marca vieja (moki.best, de antes de separar por modo) se copia a moki.best.clasico la primera vez (decisión del director).
  bestMode() {
    const m = this.level && this.level.modo;
    const base = !m ? 'clasico' : m === 'libre' ? 'libre' : 'dia';
    return this.vueltaRun ? `${base}.rapida` : base; // Vuelta rápida: marca aparte (moki.best.dia.rapida / libre.rapida)
  }
  bestKey() {
    if (load('moki.best.clasico') === null && load('moki.best') !== null) save('moki.best.clasico', load('moki.best'));
    return `moki.best.${this.bestMode()}`;
  }

  // Nivel de la partida (NIVELES.md §7): Reto del día = fecha local; Libre = semilla nueva por partida.
  // Se arma una vez aquí; el reintento desde el checkpoint reusa this.level.
  makeLevel(seed) {
    if (CLASICO) return GAME_LEVEL;
    // La primera partida de la vida es la clásica (director): el tutorial y la primera impresión, siempre iguales
    if (!seed && !SEED && load('moki.primera') !== '1') {
      save('moki.primera', '1');
      return GAME_LEVEL;
    }
    const modo = this.modo;
    return generarNivel(seed || SEED || (modo === 'libre' ? semillaLibre() : semillaReto()), modo);
  }

  startGame() {
    this.ui.hideDemo();
    this.ui.hideFinal();
    this.ui.hideAsi();
    this.ui.hideFail();
    this.ui.hidePause();
    this.demo = false;
    this.screen = 'play';
    this.god = GOD; // invulnerable solo en dev o con ?debug&god (igual que window.__moki)
    this.strip.setAlpha(0);
    this.hudL.setAlpha(1);
    this.hudR.setAlpha(1);
    this.events.emit('gesture'); // el primer gesto habilita el sonido (T3c)
    this.score0 = { pieces: 0, pieceValue: 0 };
    this.pieces = 0;
    this.pieceValue = 0;
    this.cp = { idx: 0, dist: 0, pieces: 0, pieceValue: 0 };
    // Paseo: sin choques y sin mérito (no avanza el Cuaderno ni escribe mejor marca); la decisión es del director, pieza 4
    this.paseoRun = this.paseo;
    this.paseoTagC.setVisible(this.paseoRun);
    this.partida = this.paseoRun ? null : nuevaPartida(); // Cuaderno de Moki: avance de esta partida (los reintentos siguen en la misma)
    registrarDia(); // Racha con perdón: jugar cuenta el día local, también en Paseo (brief del director, pieza 4, decisión b); el demo no cuenta
    this.vueltaOn = this.vuelta && !this.paseoRun && vueltaAbierta(); // sin el sello (cuaderno borrado) no aplica aunque esté guardada
    this.resetRun(this.makeLevel(), 0);
    this.vueltaTagC.setVisible(this.vueltaRun);
    this.speed = FIXED_SPEED || this.tramoSpeed(0);
    this.accel = 0;
    // En Paseo no hay lección: sin choques no hay nada que enseñar y la mano detendría al que nunca salta
    this.tut = { stage: load('moki.tutorial') === '1' || this.paseoRun ? 4 : START_TUT, state: 'off' };
    this.ui.showPauseButton(true);
    this.ui.showSoundButton('hud');
    this.buzz(10); // "Jugar" se siente en la mano (feel.gestured lo pone el primer gesto real, ver feel.js)
    audio.unlock(); // el gesto que arranca la partida habilita el sonido
    audio.setTramo(0);
    audio.setStreak(0);
    audio.setState(this.tut.stage < 4 ? 'tutorial' : 'playing');
    this.distLabel.set(`0 ${t('hud.m')}`);
    this.pieceLabel.set('0');
    this.lastM = 0;
  }

  startDemo() {
    this.ui.hideFinal();
    this.ui.hideAsi();
    this.ui.hideFail();
    this.ui.hidePause();
    this.ui.showPauseButton(false);
    this.ui.showSoundButton('title');
    audio.setState('title'); // si ya hubo gesto, el demo suena en modo título; antes del gesto no suena nada
    this.demo = true;
    this.screen = 'demo';
    this.partida = null; // el demo no cuenta para el cuaderno
    this.paseoRun = false;
    this.paseoTagC.setVisible(false);
    this.vueltaOn = false;
    this.vueltaTagC.setVisible(false);
    this.god = true; // el bot juega bien; la invulnerabilidad es solo la red de seguridad
    const variant = ['A', 'B', 'C'][this.demoVariant % 3];
    this.pieces = 0;
    this.pieceValue = 0;
    this.cp = { idx: 0, dist: 0, pieces: 0, pieceValue: 0 };
    this.resetRun(buildDemo(variant, this.reduced), 0);
    this.speed = FIXED_SPEED || 320;
    this.accel = 0;
    this.tut = { stage: 4, state: 'off' };
    this.strip.setAlpha(0);
    this.hudL.setAlpha(1);
    this.hudR.setAlpha(1);
    this.distLabel.set(`0 ${t('hud.m')}`);
    this.pieceLabel.set('0');
    this.lastM = 0;
    this.ui.showDemo(this.coarse);
    this.showModo();
    this.saludar(); // Moki saluda según la racha
    this.demoStripping = false;
  }

  // Momento del puntaje (UX/DISENO): metros + piezas x 10
  get score() {
    const s = Math.floor(this.dist / 100) * C.scorePerMeter + C.scorePerPiece * this.pieceValue;
    return this.vueltaRun ? Math.floor(s * C.vuelta.scoreMult) : s;
  }

  press() {
    if (this.dead || this.screen === 'final' || this.screen === 'pause') return;
    this.rig.cancelHop(); // la mecánica manda: la celebración se cancela
    this.holding = true;
    this.pressedAt = this.t;
    if (this.tut && (this.tut.state === 'decel' || this.tut.state === 'stopped')) this.tut.pressed = true;
  }

  release() {
    this.holding = false;
    // Tap: si suelta pronto mientras sube, recorta el salto.
    if (this.jumping && this.vy < 0 && this.t - this.jumpStartAt < C.jumpHoldMaxMs) {
      const rise = C.world.groundY - this.y;
      // Entre fromMs y toMs el corte se afloja hasta 1 (salto completo): 120 ms de mantener ya libra la torre
      const held = this.t - this.jumpStartAt;
      const f = clamp((held - C.jumpHoldRamp.fromMs) / (C.jumpHoldRamp.toMs - C.jumpHoldRamp.fromMs), 0, 1);
      let cut = this.vy * (C.jumpCutMultiplier + (1 - C.jumpCutMultiplier) * f);
      // Un toque rápido nunca baja de jumpMinPx de altura.
      if (rise + (cut * cut) / (2 * C.gravity) < C.jumpMinPx) cut = -Math.sqrt(2 * C.gravity * (C.jumpMinPx - rise));
      this.vy = Math.max(this.vy, cut);
      this.jumping = false;
    }
  }

  showBanner(text, ms) {
    this.tweens.killTweensOf(this.hudC);
    this.banner.set(text);
    this.tweens.add({ targets: this.hudC, alpha: 1, duration: 180, ease: 'Cubic.easeOut' });
    // Entra como papel que se asienta (0.9 -> 1, Back.out); con Nada o movimiento reducido, solo fundido
    const s = 1 / this.zoom;
    this.hudC.setScale(this.calm ? s : s * 0.9);
    if (!this.calm) this.tweens.add({ targets: this.hudC, scale: s, duration: 180, ease: 'Back.easeOut' });
    if (ms) this.time.delayedCall(ms, () => this.hideBanner());
  }

  hideBanner(instant) {
    this.tweens.killTweensOf(this.hudC);
    if (instant) this.hudC.setAlpha(0);
    else this.tweens.add({ targets: this.hudC, alpha: 0, duration: 160, ease: 'Cubic.easeIn' });
  }

  // ---------- Feel (FEEL.md): solo visual y háptico, nunca toca física, hitboxes ni tiempos ----------

  get calm() {
    return this.reduced || C.juice <= 0;
  }

  // Vibración corta en móvil (feel.js decide si se puede). Nunca en el demo: ahí no juega nadie.
  buzz(pattern, minLevel = 2) {
    if (this.demo || this.reduced) return;
    feel.buzz(pattern, minLevel);
  }

  // Sacudida solo en Hardcore, máx. 2 px. Mueve la cámara y compensa el HUD para que las fichas no tiemblen.
  shake(px, ms) {
    if (this.demo || this.reduced || C.juice < 3) return;
    this.shakeAmp = Math.min(2, px);
    this.shakeMs = ms;
    this.shakeLeft = ms;
  }

  stepShake(dtMs) {
    if (!this.shakeLeft) return;
    this.shakeLeft = Math.max(0, this.shakeLeft - dtMs);
    const k = this.shakeLeft / this.shakeMs;
    const ox = this.shakeLeft ? (Math.random() * 2 - 1) * this.shakeAmp * k : 0;
    const oy = this.shakeLeft ? (Math.random() * 2 - 1) * this.shakeAmp * k : 0;
    const cam = this.cameras.main;
    cam.centerOn(this.vw / 2 + ox, this.top + this.vh / 2 + oy);
    const m = 16 / this.zoom;
    this.hudL.setPosition(m + ox, this.top + m + oy);
    this.hudR.setPosition(this.vw - m + ox, this.top + m + oy);
    this.hudC.setPosition(this.vw / 2 + ox, this.top + m + 52 / this.zoom + oy);
  }

  // Brinco de una ficha del HUD (escala base -> base*s -> base). Nunca se aplica a Moki.
  pop(target, s, ms) {
    if (this.calm) return;
    const base = this.hudScale || target.scaleX;
    this.tweens.killTweensOf(target);
    target.setScale(base);
    this.tweens.add({ targets: target, scale: base * s, duration: ms / 2, ease: 'Sine.easeOut', yoyo: true, onComplete: () => target.setScale(this.hudScale || base) });
  }

  // Ficha de piezas con la racha visible (DISENO §64: x2 / x3 solo en Mucho o más)
  setPieceLabel(mult = 1) {
    this.pieceLabel.set(mult > 1 && C.juice >= 2 && !this.reduced ? `${this.pieces}  x${mult}` : String(this.pieces));
  }

  // Pasto de papel cerca de Moki que se dobla al aterrizar fuerte (Mucho o más)
  bendGrass() {
    if (this.calm || C.juice < 2) return;
    for (const f of this.fg) {
      const key = f.sprite.texture.key;
      if (key.startsWith('gp-grass') && Math.abs(f.x - this.px) < 160) {
        this.tweens.killTweensOf(f.sprite);
        f.sprite.setAngle(-(4 + Math.random() * 3));
        this.tweens.add({ targets: f.sprite, angle: 0, duration: 520, ease: 'Back.easeOut' });
      }
    }
  }

  // Nueva mejor marca: la etiqueta de la tarjeta brinca y destella al mismo tiempo que el stinger, confeti en Mucho o más
  celebrateRecord() {
    this.ui.popRecord();
    this.particles.burst('confetti', this.px, C.world.groundY - 120);
    this.buzz([15, 60, 15, 60, 30]);
  }

  // Nubes de papel que tiemblan un pelo (Mucho o más): checkpoint y arco completo
  shiver() {
    if (this.calm || C.juice < 2 || this.demo || this.shivering) return;
    const y0 = C.world.groundY - 900;
    this.shivering = true; // no se mata el tween de la nube: puede estar entrando con fundido
    this.tweens.add({ targets: this.clouds, y: y0 - 2, duration: 60, ease: 'Sine.easeInOut', yoyo: true, repeat: 1, onComplete: () => ((this.clouds.y = y0), (this.shivering = false)) });
  }

  // ---------- Pausa ----------

  pauseGame() {
    if (this.screen !== 'play') return;
    this.pausedFrom = this.screen;
    this.screen = 'pause';
    this.release();
    audio.setState('paused');
    audio.sfx('pause');
    this.tweens.pauseAll();
    this.ui.showPause({ onResume: () => this.resumeGame(), onHome: () => this.goHome() });
  }

  resumeGame() {
    if (this.screen !== 'pause') return;
    this.ui.hidePause();
    this.tweens.resumeAll();
    this.screen = this.pausedFrom || 'play';
    this.rampT = 0; // reanudar no cuenta como salto: el mundo acelera en 600 ms
    audio.show(); // "Seguir" es un gesto: el audio vuelve aquí (no se reanuda solo al volver a la pestaña)
    audio.setState(this.tut && this.tut.stage < 4 ? 'tutorial' : 'playing');
    audio.sfx('pause', { resume: true });
  }

  goHome() {
    this.tweens.resumeAll();
    this.startDemo();
  }

  // ---------- Piezas del mundo ----------

  addShadow(x, w, alpha) {
    return this.add
      .image(x, C.world.groundY + 1, 'shadow')
      .setDepth(8)
      .setAlpha(alpha)
      .setDisplaySize(w, 18);
  }

  sway(sprite) {
    if (this.reduced) return;
    sprite.setAngle(Phaser.Math.FloatBetween(1, 2) * (Math.random() < 0.5 ? -1 : 1));
    this.tweens.add({ targets: sprite, angle: 0, duration: 520, ease: 'Sine.easeOut' });
  }

  obsTex(type) {
    if (this.ambient) return this.ambient.obsKey(type);
    return this.paseoRun && this.textures.exists(`${type}_p`) ? `${type}_p` : type;
  }

  spawnObstacle(e) {
    const g = C.world.groundY;
    const size = C.obstacleSizes[e.type];
    const x = this.px + e.D - this.dist;
    const o = { D: e.D, type: e.type, plan: e.plan, size, x, entered: false, passed: false, handled: false };
    if (e.type === 'viga') {
      const topY = g - size.hangBottom - size.height;
      o.sprite = this.add.image(x, topY - 2, this.obsTex('viga')).setOrigin(0.5, 0).setDepth(10);
      o.threads = [-34, 34].map((dx) => this.add.tileSprite(x + dx, this.top - 10, 6, 10, 'hilo').setOrigin(0.5, 0).setDepth(9.5));
      o.shadow = this.addShadow(x + 6, size.width * 1.15, 0.3);
      o.topY = topY;
    } else {
      o.sprite = this.add.image(x, g + 2, this.obsTex(e.type)).setOrigin(0.5, 1).setDepth(10);
      const sk = this.ambient ? this.ambient.shadowK : 1; // mañana y tarde: sombras largas y suaves; mediodía: cortas
      o.shadow = this.addShadow(x + 9 * sk, size.width * 1.45 * sk, 0.4 / Math.max(1, sk * 0.9)); // sombra hacia abajo-derecha
    }
    if (this.ambient) o.sprite.setTint(this.ambient.obsTint);
    // Paseo: el obstáculo se dibuja atenuado para que cruzarlo se lea a propósito y no como un error de colisión
    if (this.paseoRun) [o.sprite, o.shadow, ...(o.threads || [])].forEach((g) => g.setAlpha(g.alpha * C.paseo.obstacleAlpha));
    o.destroy = () => {
      o.sprite.destroy();
      o.shadow.destroy();
      if (o.threads) o.threads.forEach((h) => h.destroy());
    };
    this.obstacles.push(o);
  }

  spawnPickup(e) {
    const g = C.world.groundY;
    const x = this.px + e.D - this.dist;
    const sprite = this.add.image(x, g - e.h, e.amber ? 'tokenAmber' : 'token').setDepth(11);
    const shadow = this.addShadow(x + 4, 26, 0.18);
    const k = { D: e.D, h: e.h, x, y: g - e.h, arc: e.arc, arcN: e.arcN, amber: !!e.amber, sprite, shadow, taken: false };
    k.destroy = () => {
      sprite.destroy();
      shadow.destroy();
    };
    this.pickups.push(k);
  }

  spawnFlag(D, isMeta) {
    const g = C.world.groundY;
    const x = this.px + D - this.dist;
    if (isMeta) {
      const arch = this.add.image(x, g + 2, 'metaArch').setOrigin(0.5, 1).setDepth(9);
      const shadow = this.addShadow(x + 10, 220, 0.3);
      this.meta = { D, x, arch, shadow, destroy() { arch.destroy(); shadow.destroy(); } };
      return;
    }
    const shadow = this.addShadow(x + 10, 110, 0.38);
    const base = this.add.image(x, g + 2, 'cpBase').setOrigin(0.5, 1).setDepth(10);
    const pole = this.add.image(x, g - 20, 'cpPole').setOrigin(0.5, 1).setDepth(10);
    const flag = this.add.image(x + 4, g - 20 - 112 + 6, 'cpFlag').setOrigin(0, 0.5).setDepth(10.1).setScale(0.12, 1);
    this.checkpoints.push({
      D,
      x,
      base,
      pole,
      flag,
      shadow,
      deployed: false,
      destroy() {
        [base, pole, flag, shadow].forEach((s) => s.destroy());
      },
    });
  }

  // ---------- Bucle ----------

  // Genera la siguiente textura pendiente (una por cuadro) y hace entrar con fundido las capas de fondo
  stepTextures() {
    if (!this.texQueue || this.frames < 3) return;
    const key = this.texQueue.next();
    if (!key) {
      this.texQueue = null;
      return;
    }
    // Paseo empezado antes de que llegara su cartón suave: las cajas ya en pantalla lo toman en cuanto existe
    if (this.paseoRun && key.endsWith('_p')) this.obstacles.forEach((o) => o.sprite.setTexture(this.obsTex(o.type)));
    const layer = { clouds: this.clouds, ridge: this.ridge, far: this.far, mid: this.mid }[key];
    if (layer) {
      layer.setTexture(key);
      this.tweens.add({ targets: layer, alpha: layer === this.far && this.ambient ? this.ambient.farAlpha() : 1, duration: 320, ease: 'Sine.easeOut' });
      const veil = { far: this.farVeil, mid: this.midVeil }[key];
      if (veil) {
        veil.setTexture(key);
        const k = C.atmosphere[key] * (key === 'far' && this.ambient ? this.ambient.farAlpha() : 1);
        this.tweens.add({ targets: veil, alpha: k, duration: 320, ease: 'Sine.easeOut' });
      }
    }
  }

  update(_time, deltaMs) {
    this.frames = (this.frames || 0) + 1;
    this.stepTextures();
    if (!this.firstRun) {
      this.firstRun = true;
      performance.mark('moki-run');
    }
    const dtMs = Math.min(deltaMs, 50);
    if (this.screen === 'pause') return;
    this.stepShake(dtMs);
    if (this.esc) this.esc.tick(dtMs); // el guion del escaparate maneja pantallas y bot
    else this.idleCheck();

    if (this.screen === 'dead') return this.updateDead(dtMs);
    if (this.screen === 'final') return this.updateFinal(dtMs);
    this.updateRun(dtMs);
  }

  // Después de la pantalla final, 20 s sin tocar vuelven al demo (no guarda récord).
  idleCheck() {
    if (this.screen === 'final' && this.finalShown && this.time.now - this.lastInputAt > C.demo.idleReturnMs) this.startDemo();
  }

  updateRun(dtMs) {
    const dt = dtMs / 1000;
    this.t += dtMs;
    this.rampT += dtMs;
    if (this.demo) this.demoBot();
    if (this.botRelease > 0 && this.t >= this.botRelease) {
      this.botRelease = -1;
      this.release();
    }

    const tutorial = this.tutorialTick(dtMs);
    if (!tutorial.frozen) this.controlSpeed(dt);
    const ramp = clamp(this.rampT / 600, 0, 1);
    const step = this.rewinding ? 0 : this.speed * dt * (tutorial.frozen ? 1 : ramp);
    this.dist += step;
    if (tutorial.shift) this.dist -= tutorial.shift;

    this.stepJump(dt);
    // Salto alto: al mantener 140 ms suena el segundo "bip" que sube (AUDIO §5)
    if (this.jumping && this.holding && !this.highPlayed && this.t - this.jumpStartAt >= C.jumpHoldRamp.fromMs + 10) {
      this.highPlayed = true;
      audio.sfx('jumpHigh', { holdMs: this.t - this.jumpStartAt });
    }
    if (this.jumping && this.holding && !this.highGood && this.t - this.jumpStartAt >= 220) {
      this.highGood = true;
      if (!this.demo) this.ambient.good('hold', this.t); // salto mantenido >= 220 ms: pajaritos
    }
    // La racha se acaba a los 0.9 s sin piezas
    if (this.combo > 0 && this.t - this.lastPickAt > C.combo.windowMs) {
      this.combo = 0;
      audio.setStreak(0);
      this.setPieceLabel(1);
    }
    this.stepWorld(step);
    this.stepEntities(step, dtMs);
    this.stepMidProps();
    this.particles.update(dtMs, step);
    this.stepMoki(dtMs);
    this.stepHud();
    this.stepAmbient(dtMs);

    if (this.demo && !this.demoStripping && this.dist >= this.level.end) this.demoRestart();
    else if (!this.demo && this.dist >= this.level.end && !this.dead) this.finish();
  }

  // Velocidad del tramo con rampa de 2 s al cambiar (sin rampa continua).
  controlSpeed(dt) {
    if (FIXED_SPEED) return;
    const target = this.tramoSpeed(this.tramoIdx);
    if (this.accel === 0 && this.speed !== target) this.accel = Math.abs(target - this.speed) / C.tramoEaseSec;
    if (this.speed < target) this.speed = Math.min(target, this.speed + this.accel * dt);
    else if (this.speed > target) this.speed = Math.max(target, this.speed - this.accel * dt);
    if (this.speed === target) this.accel = 0;
  }

  stepJump(dt) {
    const canJump = this.grounded || this.t - this.lastGroundedAt <= C.coyoteMs;
    const buffered = this.t - this.pressedAt <= C.jumpBufferMs;
    if (canJump && buffered && !this.jumping) {
      this.vy = -C.jumpVelocity;
      this.grounded = false;
      this.jumping = true;
      this.jumpStartAt = this.t;
      this.takeoffAt = this.t;
      this.pressedAt = -1e9;
      this.highPlayed = false;
      this.highGood = false;
      audio.sfx('jump');
      this.particles.burst('kick', this.px, C.world.groundY); // chip de cartón al despegar (Mucho o más)
      // Ya lo soltó antes de que empezara el salto (tap muy corto con buffer).
      if (!this.holding) this.release();
    }

    this.vy += C.gravity * dt;
    const impact = this.vy;
    this.y += this.vy * dt;
    if (this.y >= C.world.groundY) {
      this.y = C.world.groundY;
      this.vy = 0;
      if (!this.grounded) {
        this.lastGroundedAt = this.t;
        this.landAt = this.t;
        if (impact > 260) {
          this.particles.burst('land', this.px, C.world.groundY);
          audio.sfx('land', { fall: impact / C.jumpVelocity });
          // Aterrizaje fuerte (salto mantenido): el pasto cercano se dobla, vibra un pelo y, en Hardcore, tiembla la cámara
          if (impact > 600) {
            this.bendGrass();
            this.buzz(8, 2);
            this.shake(1.5, 90);
          }
        }
      }
      this.grounded = true;
      this.jumping = false;
    } else {
      if (this.grounded) this.lastGroundedAt = this.t;
      this.grounded = false;
    }
    if (this.vy > 0) this.jumping = false;
  }

  stepWorld(step) {
    const p = C.art.parallax;
    // Con movimiento reducido el fondo se queda quieto; el plano de juego sí corre (es la mecánica).
    this.clouds.tilePositionX = this.reduced ? 0 : this.dist * p.clouds;
    // tilePosition va en px de textura (Phaser lo multiplica por tileScale): se divide para que el paralaje no cambie
    this.far.tilePositionX = this.reduced ? 0 : (this.dist * p.far) / this.farS;
    this.mid.tilePositionX = this.reduced ? 0 : (this.dist * p.mid) / this.midS;
    this.ridge.tilePositionX = this.reduced ? 0 : (this.dist * C.ridge.parallax) / this.ridgeS;
    this.farVeil.tilePositionX = this.far.tilePositionX;
    this.midVeil.tilePositionX = this.mid.tilePositionX;
    this.surface.tilePositionX = this.dist;
    this.canto.tilePositionX = this.dist;
    this.front.tilePositionX = this.dist;
    this.groundFibers.tilePositionX = this.dist;
    this.folds.forEach((f) => (f.tilePositionX = this.dist));

    // Profundidad con el salto: las capas lejanas bajan unos px cuando Moki sube (sin zoom de cámara).
    const V = C.art.vertical;
    const lift = this.reduced ? 0 : Math.max(0, C.world.groundY - this.y);
    this.far.y = this.base.far + Math.min(V.maxPx, lift * V.far);
    this.mid.y = this.base.mid + Math.min(V.maxPx, lift * V.mid);
    this.farVeil.y = this.far.y;
    this.midVeil.y = this.mid.y;
    this.stepForeground(step);
  }

  // Fondo vivo: solo en respiros (el siguiente obstáculo a >= 1.5 s), nunca en tutorial, tarjeta, banner ni los 2 s tras reaparecer
  stepAmbient(dtMs) {
    const amb = this.ambient;
    const next = this.obstacles.find((o) => o.x > this.px - 50);
    const lead = next ? (next.x - this.px) / Math.max(this.speed, 1) : 9;
    const tut = this.tut && !this.demo && this.tut.stage < 4;
    const sec = this.t / 1000;
    const quiet = lead >= 1.5 && !tut && this.t > 2000 && this.hudC.alpha < 0.05 && !(this.tramoIdx === 0 && (sec < 4 || sec > 19));
    // Demo: guion fijo (nube 1.5 s, pajaritos 6 s, avioncito 12 s) y Mañana a Tarde entre 31 y 37 s
    // demo: >= 8 s entre inicios (globo 2, pajaritos 10, avioncito 18, Moki chiquito 26 o en cuanto haya cresta libre); las mariposas son ambiente
    const forced = this.demo ? [{ at: 2, kind: 'balloon' }, { at: 10, kind: 'birds' }, { at: 18, kind: 'plane' }, { at: 26, kind: 'moki' }] : null;
    if (this.demo && sec >= 31 && !amb.fired.tarde) {
      amb.fired.tarde = true;
      amb.setDay(2);
    }
    if (this.demo && sec >= 1.5 && !amb.cloud && !amb.fired.cloud1) {
      amb.fired.cloud1 = true;
      amb.cloudNext = 0;
    }
    const tsec = (this.dist - this.level.starts[this.tramoIdx]) / Math.max(1, this.tramoSpeed(this.tramoIdx)); // segundos dentro del tramo
    amb.update(dtMs, { ms: this.t, sec, tsec, quiet, forced, tutorial: tut, tramo: this.tramoIdx });
  }

  // Primer plano a 1.3x: tiras de cartulina FUERA del carril (nunca entre groundY-130 y groundY+10).
  // En pantallas altas llenan el suelo vacío bajo el diorama.
  // Piezas chicas y distintas (pasto, piedras, cartón rasgado), más oscuras que el suelo: primer plano a 1.3x solo en
  // los 40 px inferiores y, en pantallas altas, decoración del suelo a 1.0x entre el carril y el primer plano.
  stepForeground(step) {
    const F = C.art.foreground;
    const g = C.world.groundY;
    for (const f of this.fg) {
      f.x -= step * f.speed;
      f.sprite.x = f.x;
    }
    this.fg = this.fg.filter((f) => (f.x < -90 ? (f.sprite.destroy(), false) : true));
    if (this.reduced || this.dead) return;
    const kinds = ['grass', 'stone', 'torn', 'grass', 'stone'];
    const pick = () => `gp-${kinds[this.fgPick % kinds.length]}${(this.fgPick++ >> 1) % 3}`;
    if (!this.textures.exists('gp-grass0') || !this.textures.exists('gp-torn2')) return; // aún se están generando
    const x = this.vw + 90;
    if (this.t >= this.fgNext) {
      this.fgNext = this.t + F.minGapSec * 70 + Math.random() * 360; // 3 a 4 piezas repartidas a la vista en 1280
      const sprite = this.add.image(x, 0, pick()).setOrigin(0.5, 1).setDepth(20);
      // la pieza queda dentro de los 40 px de abajo: su borde superior no sube de bottom-40
      const yMin = this.bottom - 40 + sprite.height;
      sprite.y = Math.max(yMin, this.bottom + 8 - Math.random() * 14);
      this.fg.push({ x, sprite, speed: F.speed });
    }
    const room = this.bottom - (g + 24) - 56;
    if (room > 70 && this.t >= this.gpNext) {
      this.gpNext = this.t + 150 + Math.random() * 230;
      const sprite = this.add.image(x, 0, pick()).setOrigin(0.5, 1).setDepth(4.5);
      const sc = 1.25 + Math.random() * 0.45;
      sprite.setScale(sc);
      sprite.y = g + 36 + sprite.displayHeight + Math.random() * Math.max(0, room - sprite.displayHeight - 20);
      this.fg.push({ x, sprite, speed: 1 });
    }
  }

  // Todo lo que corre con el mundo: posición = punto de Moki + distancia que falta (el guion es por distancia).
  placeEntities() {
    const px = this.px;
    const dist = this.dist;
    for (const o of this.obstacles) {
      o.x = px + o.D - dist;
      o.sprite.x = o.x;
      o.shadow.x = o.x + (o.type === 'viga' ? 6 : 9);
      if (o.threads) {
        o.threads.forEach((h, i) => {
          h.x = o.x + (i ? 34 : -34);
          h.y = this.top - 10;
          h.setSize(6, Math.max(2, o.topY + 6 - (this.top - 10)));
        });
        if (!this.reduced) o.sprite.setAngle(Math.sin(this.t / 700 + o.D) * 1.2);
      }
      if (!o.entered && o.x < this.vw - 20) {
        o.entered = true;
        if (o.type !== 'viga') this.sway(o.sprite);
      }
    }
    for (const k of this.pickups) {
      k.x = px + k.D - dist;
      if (!k.taken) {
        k.sprite.x = k.x;
        k.shadow.x = k.x + 4;
      }
    }
    for (const cp of this.checkpoints) {
      cp.x = px + cp.D - dist;
      cp.base.x = cp.pole.x = cp.x;
      cp.flag.x = cp.x + 4;
      cp.shadow.x = cp.x + 8;
      if (!cp.deployed && cp.x < this.vw - 40) {
        cp.deployed = true;
        this.tweens.add({ targets: cp.flag, scaleX: 1, duration: C.art.checkpointFlagMs, ease: 'Cubic.easeOut' });
      }
      if (cp.deployed && !this.reduced) cp.flag.y = C.world.groundY - 20 - 112 + 6 + Math.sin(this.t / 420) * 1.5;
    }
    if (this.meta) {
      this.meta.x = px + this.meta.D - dist;
      this.meta.arch.x = this.meta.x;
      this.meta.shadow.x = this.meta.x + 10;
    }
  }

  stepEntities(step, dtMs) {
    const g = C.world.groundY;
    const lead = this.vw + 80 - this.px; // los elementos nacen justo fuera de la pantalla

    // Guion: entra cada entidad cuando le toca (por distancia, nada al azar)
    const ents = this.level.entities;
    while (this.nextEnt < ents.length && ents[this.nextEnt].D - this.dist <= lead) {
      const e = ents[this.nextEnt++];
      if (e.kind === 'obs') this.spawnObstacle(e);
      else this.spawnPickup(e);
    }
    const starts = this.level.starts;
    while (this.nextFlag < starts.length && starts[this.nextFlag] - this.dist <= lead + 40) this.spawnFlag(starts[this.nextFlag++], false);
    if (!this.meta && !this.metaDone && this.level.end - this.dist <= lead + 40 && !this.demo) this.spawnFlag(this.level.end, true);

    this.placeEntities();

    // Checkpoint: al cruzar el inicio de un tramo se guarda el aprendizaje
    while (this.tramoIdx + 1 < this.level.tramos.length && this.dist >= starts[this.tramoIdx + 1]) {
      this.tramoIdx++;
      this.speedFrom = this.speed;
      this.accel = 0; // se recalcula hacia la velocidad del tramo con rampa de 2 s
      this.cp = { idx: this.tramoIdx, dist: starts[this.tramoIdx], pieces: this.pieces, pieceValue: this.pieceValue };
      if (this.partida && !this.demo) this.partida.maxTramo = Math.max(this.partida.maxTramo, this.tramoIdx);
      this.showBanner(t('hud.cp'), C.art.checkpointLabelMs);
      audio.stinger('checkpoint');
      if (!this.demo) this.ambient.good('checkpoint', this.t); // globo 0.3-0.8 s después
      audio.setTramo(this.tramoIdx);
      if (!this.demo) this.ambient.setDay(this.tramoIdx); // hora del día: crossfade de 6 s tras el checkpoint (el demo la cambia a los 31 s)
      this.rig.startHop();
      this.particles.burst('confetti', this.px + 20, g - 20 - 112);
      this.shiver();
      this.buzz([15, 40, 15]);
      this.shake(2, 120);
    }

    // Limpieza
    const outX = -140;
    this.obstacles = this.obstacles.filter((o) => (o.x < outX ? (o.destroy(), false) : true));
    this.pickups = this.pickups.filter((k) => (k.x < outX && !k.taken ? (k.destroy(), false) : !k.taken));
    this.checkpoints = this.checkpoints.filter((cp) => (cp.x < outX ? (cp.destroy(), false) : true));

    // Recoger piezas: la caja de recogida sigue el cuerpo de Moki (centro = salto + 46 px), no todo Moki
    const R = C.pickupReach;
    const bodyY = g - this.y + R.bodyCenter;
    for (const k of this.pickups) {
      if (k.taken) continue;
      if (Math.abs(k.x - this.px) < R.dx && Math.abs(k.h - bodyY) < R.dy) this.collect(k);
    }

    // Colisión (caja del jugador más chica que el dibujo)
    const pw = C.player.width - 6;
    const ph = C.player.height - 6;
    const pl = this.px - pw / 2;
    const pt = this.y - ph;
    const pb = this.y - 2;
    for (const o of this.obstacles) {
      if (!o.passed && o.x < this.px - 60) {
        o.passed = true;
        // Cuaderno: cada obstáculo cuenta una vez por partida aunque se repita el tramo tras un reintento.
        // Clave tipo+D: la caja y la viga de una VC comparten D y antes la viga no contaba (E1, inventario).
        const P = this.partida;
        const k = `${o.type}:${o.D}`;
        if (P && !this.demo && P.passed[o.type] !== undefined && !(P.seen = P.seen || new Set()).has(k)) {
          P.seen.add(k);
          P.passed[o.type] += 1;
        }
      }
      if (this.rewinding || this.god || this.paseoRun) continue;
      const { l: ol, r: or, t: ot, b: ob } = this.obsBox(o.type, o.x);
      if (pl < or && pl + pw > ol && pt < ob && pb > ot) {
        this.crash(o);
        break;
      }
    }
    void step;
    void dtMs;
  }

  // Caja de colisión de un obstáculo en coordenadas de mundo (la misma que usa el choque)
  obsBox(type, x) {
    const g = C.world.groundY;
    const size = C.obstacleSizes[type];
    const hs = type === 'caja' ? C.hitboxShrinkCaja : C.hitboxShrink;
    const l = x - size.width / 2 + hs.x;
    const r = x + size.width / 2 - hs.x;
    if (type === 'viga') {
      const b = g - size.hangBottom;
      return { l, r, t: b - size.height, b };
    }
    return { l, r, t: g - size.height + hs.top, b: g };
  }

  // Pinos y postes de la capa media (recortes sueltos en vez de pintados en el mosaico): corren con la capa media y se
  // desvanecen cuando la caja de colisión de un obstáculo, con C.art.midClear.marginPx de pantalla, se les acerca.
  // Así el fondo nunca pone un poste o un pino detrás de un obstáculo (no se confunde con la torre). Solo visual.
  stepMidProps() {
    if (!this.textures.exists(MID_PROPS[0].key)) return;
    const M = C.art.midClear;
    const ms = this.midS;
    const tp = this.mid.tilePositionX;
    const y0 = this.mid.y;
    const foot = y0 + (MID_H - 6) * ms;
    const u0 = tp - 100;
    const u1 = tp + this.vw / ms + 100;
    const boxes = [];
    if (M.on && this.level) {
      const mg = M.marginPx / this.zoom;
      const lo = this.dist - this.px - 300;
      const hi = this.dist - this.px + this.vw + 300;
      for (const e of this.level.entities) {
        if (e.kind !== 'obs' || e.D < lo || e.D > hi) continue;
        const b = this.obsBox(e.type, this.px + e.D - this.dist);
        boxes.push({ l: b.l - mg, r: b.r + mg, t: b.t - mg, b: b.b + mg });
      }
    }
    const fade = Math.max(1, M.fadePx / this.zoom);
    const pool = (this.midPool = this.midPool || []);
    const bodyTint = this.mid.tintTopLeft;
    const veilTint = this.midVeil.tintTopLeft;
    let n = 0;
    for (let k = Math.floor(u0 / MID_WRAP); k * MID_WRAP <= u1; k++) {
      for (const p of MID_PROPS) {
        const u = k * MID_WRAP + p.u;
        if (u + p.half < u0 || u - p.half > u1) continue;
        const l = (u - p.half - tp) * ms;
        const r = (u + p.half - tp) * ms;
        const t = foot - p.h * ms;
        let a = 1;
        for (const b of boxes) {
          if (t >= b.b || foot <= b.t) continue;
          a = Math.min(a, Phaser.Math.Clamp(Math.max(b.l - r, l - b.r) / fade, 0, 1));
        }
        if (!pool[n]) {
          pool[n] = {
            body: this.add.image(0, 0, p.key).setOrigin(0, 0).setDepth(2.99),
            veil: this.add.image(0, 0, p.key).setOrigin(0, 0).setDepth(2.995),
          };
        }
        const q = pool[n++];
        q.prop = p;
        q.inst = `${k}:${p.key}`;
        q.box = { left: l, right: r, top: t, bottom: foot };
        q.a = a;
        const x = (k * MID_WRAP + p.ox - tp) * ms;
        const y = y0 + p.oy * ms;
        q.body.setTexture(p.key).setPosition(x, y).setScale(ms).setTint(bodyTint).setAlpha(this.mid.alpha * a).setVisible(a > 0);
        q.veil.setTexture(p.key).setPosition(x, y).setScale(ms).setTintFill(veilTint).setAlpha(this.midVeil.alpha * a)
          .setVisible(a > 0 && this.midVeil.visible);
      }
    }
    for (let i = n; i < pool.length; i++) {
      pool[i].body.setVisible(false);
      pool[i].veil.setVisible(false);
      pool[i].a = 0;
    }
    this.midPoolN = n;
  }

  collect(k) {
    const R = C.combo;
    k.taken = true;
    // Racha: cada pieza a menos de 0.9 s de la anterior suma
    if (this.t - this.lastPickAt > R.windowMs) this.combo = 0;
    this.combo += 1;
    this.lastPickAt = this.t;
    let mult = 1;
    let arcFull = false;
    for (const [from, v] of R.steps) if (this.combo >= from) mult = v;
    this.pieces += 1;
    this.pieceValue += (k.amber ? C.amberValue : 1) * mult;
    const P = !this.demo && this.partida;
    if (P) {
      P.maxCombo = Math.max(P.maxCombo, this.combo);
      P.maxPieces = Math.max(P.maxPieces, this.pieces);
      if (k.amber) P.amber += 1;
    }
    audio.setStreak(this.combo);
    audio.sfx(k.amber ? 'amber' : 'pickup', { index: this.combo - 1 });
    if (k.arc) {
      this.arcGot[k.arc] = (this.arcGot[k.arc] || 0) + 1;
      if (this.arcGot[k.arc] === k.arcN) {
        this.pieceValue += C.arcBonus; // arco completo
        if (P) {
          P.arcs += 1;
          P.arcsByTramo[this.tramoIdx] = (P.arcsByTramo[this.tramoIdx] || 0) + 1;
        }
        audio.sfx('arc');
        if (!this.demo) this.ambient.good('arc', this.t);
        // Arco completo: abanico de papel, brinco grande de la ficha, nubes que tiemblan
        arcFull = true;
        this.particles.burst('arc', k.x, k.y);
        this.pop(this.hudR, 1.22, 160);
        this.shiver();
        this.buzz(12);
        this.shake(1, 80);
      }
    }
    this.setPieceLabel(mult);
    if (!arcFull) this.pop(this.hudR, 1.08 + 0.02 * Math.min(mult, 3), 120); // la ficha brinca más con la racha
    this.particles.burst('collect', k.x, k.y, { combo: this.combo });
    if (C.juice >= 3) this.buzz(5, 3);
    this.tweens.add({
      targets: k.sprite,
      y: k.y - 12,
      scale: 0,
      duration: this.reduced ? 120 : C.art.collectMs,
      ease: 'Cubic.easeIn',
      onComplete: () => k.destroy(),
    });
    this.tweens.add({ targets: k.shadow, alpha: 0, duration: C.art.collectMs });
  }

  // Moki: el títere (src/art/mokiRig.js) hace todo el dibujo y la animación; aquí solo se le pasa el estado
  // y se dibuja la sombra de contacto, que marca la altura del salto.
  stepMoki(dtMs) {
    const g = C.world.groundY;
    this.rig.update(
      {
        x: this.px,
        y: this.y,
        grounded: this.grounded,
        vy: this.vy,
        speed: this.speed,
        t: this.t,
        takeoffAt: this.takeoffAt,
        landAt: this.landAt,
        dead: this.dead,
        deadMs: this.deadFor,
        reduced: this.reduced,
        dist: this.dist,
      },
      dtMs
    );

    let sink = 0; // hundimiento de aterrizaje (px), solo para ensanchar la sombra
    if (!this.reduced) {
      const ld = this.t - this.landAt;
      if (ld >= 0 && ld < C.art.landingMs) sink = 1 - easeOutCubic(ld / C.art.landingMs);
    }
    const air = Math.max(0, g - this.y);
    const f = 1 / (1 + air / 150);
    this.mokiShadow.setPosition(this.px + 8, g + 1);
    this.mokiShadow.setDisplaySize(96 * (0.5 + 0.5 * f) * (1 + sink * 0.12), 22 * (0.6 + 0.4 * f));
    const MR = C.atmosphere.night.moonRim; // de noche la sombra de contacto sube (escalera de valores)
    const nightSh = this.ambient && MR.on ? MR.shadow * (this.ambient.nt || 0) : 0;
    this.mokiShadow.setAlpha((0.28 + nightSh) * (0.4 + 0.6 * f));

    if (this.debugEl) {
      const d = this.rig.debug;
      this.debugEl.textContent =
        `v ${this.speed.toFixed(0)} px/s  fase ${d.phi.toFixed(2)}\n` +
        `periodo ${(d.period * 1000).toFixed(0)} ms  ciclo ${d.cyclePx.toFixed(1)} px\n` +
        `deslizamiento apoyo ${d.slide.toFixed(2)} px  (ultimo ${d.lastSlide.toFixed(2)}, max ${d.maxSlide.toFixed(2)})\n` +
        `vaiven cadera ${d.bob.toFixed(2)} px  hundimiento pie ${d.sink.toFixed(2)} px`;
    }
  }

  stepHud() {
    const m = Math.floor(this.dist / 100);
    if (m !== this.lastM) {
      this.lastM = m;
      this.distLabel.set(`${m} ${t('hud.m')}`);
    }
  }

  // ---------- Tutorial (UX §4): el juego es el tutorial ----------

  tutSetState(state) {
    if (this.tut) this.tut.state = state;
    const on = state === 'decel' || state === 'stopped' || state === 'rewind';
    this.tutC.setVisible(on);
    this.tutArc.setVisible(on);
    this.rewinding = state === 'rewind';
  }

  // Devuelve { frozen, shift }: frozen = el tutorial manda sobre la velocidad; shift = px que rebobina esta vez.
  tutorialTick(dtMs) {
    const tut = this.tut;
    const T = C.tutorial;
    const out = { frozen: false, shift: 0 };
    if (!tut || this.demo || tut.stage >= 4) return out;

    // 1) Buscar el obstáculo de la lección
    if (tut.state === 'off' && (tut.stage === 0 || tut.stage === 2)) {
      const need = tut.stage === 0 ? 'caja' : 'torre';
      const o = this.obstacles.find((q) => q.type === need && q.x > this.px + 40);
      if (o) {
        const kind = tut.stage === 0 ? 'tap' : 'hold';
        const v = this.speed;
        const stopDist = airTravel(kind, v) / 2; // despegue a mitad del recorrido aéreo
        const decelPx = (v * (T.stopMs / 1000)) / 2;
        if (o.x - this.px <= stopDist + decelPx) {
          Object.assign(tut, { obs: o, kind, v0: v, stopDist, t: 0, handT: 0, pressed: false });
          tut.stage += 1;
          this.tutSetState('decel');
          this.drawTutArc();
          this.tutLabel.set(t(this.tutKey(kind)));
        }
      }
    }

    if (tut.state === 'decel' || tut.state === 'stopped') {
      out.frozen = true;
      tut.t += dtMs;
      tut.handT += dtMs;
      if (tut.pressed) {
        // Al presionar: el mundo vuelve a su velocidad, la mano se va y el salto ocurre en este cuadro.
        tut.pressed = false;
        this.speed = tut.v0;
        this.accel = 0;
        this.tutC.setVisible(false);
        this.tutArc.setVisible(false);
        tut.state = 'run';
        out.frozen = false;
        this.tutSetState('run');
        return out;
      }
      const u = this.reduced ? 1 : Math.min(1, tut.t / T.stopMs);
      this.speed = tut.v0 * (1 - u);
      if (u >= 1) {
        this.speed = 0;
        if (tut.state === 'decel') tut.state = 'stopped';
        // no pasa de la distancia ideal aunque se haya perdido un cuadro
        const gap = tut.obs.x - this.px - tut.stopDist;
        if (gap < 0) out.shift = -gap; // positivo: updateRun hace dist -= shift, que aleja la caja; con el signo al revés el desvío crecía cada cuadro
      }
      this.stepTutHand();
    } else if (tut.state === 'rewind') {
      out.frozen = true;
      const rate = (tut.rewindPx * dtMs) / T.rewindMs;
      const take = Math.min(rate, tut.rewindLeft);
      tut.rewindLeft -= take;
      out.shift = take;
      this.speed = 0;
      if (tut.rewindLeft <= 0.01) {
        tut.state = 'stopped';
        this.tutSetState('stopped');
        this.tutC.setVisible(true);
        this.tutArc.setVisible(true);
        tut.handT = 0;
      }
    } else if (tut.state === 'run') {
      // La lección termina cuando Moki pasa el obstáculo sin chocar
      if (tut.obs.x < this.px - 40) {
        tut.state = 'off';
        this.showBanner(t('tut.ok'), T.okMs);
        audio.sfx('eso');
        if (tut.stage === 3) {
          tut.stage = 4;
          save('moki.tutorial', '1');
        } else tut.stage = 2;
      }
    }
    return out;
  }

  tutKey(kind) {
    return `tut.${kind === 'tap' ? 'tap' : 'hold'}.${this.coarse ? 'touch' : 'kbd'}`;
  }

  // Arco punteado de tinta desde Moki, sobre el obstáculo (el modelo de salto da la trayectoria)
  drawTutArc() {
    const tut = this.tut;
    const g = C.world.groundY;
    const gfx = this.tutArc;
    gfx.clear();
    gfx.fillStyle(Phaser.Display.Color.HexStringToColor(PAL.border).color, 1);
    const air = planJump(tut.kind).air;
    for (let tt = 0.02; tt < air; tt += 0.028) {
      const x = this.px + tt * tut.v0;
      const y = g - riseAt(tut.kind, tut.v0, tt * tut.v0) - C.pickupReach.bodyCenter;
      gfx.fillCircle(x, y, 2);
    }
  }

  // Mano de papel: pulsa 4 veces (cada 1.2 s) y se queda presionada; vuelve a pulsar cada 10 s.
  stepTutHand() {
    const tut = this.tut;
    const T = C.tutorial;
    const cycle = T.handPulseMs * T.handPulses;
    const ph = tut.handT % (cycle + T.repeatMs);
    const inPulses = ph < cycle;
    // un tic por pulso de la mano
    const pulseIdx = inPulses ? Math.floor(ph / T.handPulseMs) + Math.floor(tut.handT / (cycle + T.repeatMs)) * 10 : -1;
    if (pulseIdx !== tut.lastPulse) {
      if (pulseIdx >= 0 && !this.reduced) audio.sfx('handTic');
      tut.lastPulse = pulseIdx;
    }
    const hold = tut.kind === 'hold';
    let down = 0; // 0 arriba, 1 abajo
    let ring = 0;
    if (this.reduced || !inPulses) down = 1;
    else {
      const u = (ph % T.handPulseMs) / T.handPulseMs;
      down = hold ? clamp(u * 3, 0, 1) : u < 0.28 ? Math.sin((u / 0.28) * Math.PI * 0.5) : Math.max(0, 1 - (u - 0.28) * 4);
    }
    ring = hold ? clamp(((inPulses ? ph % T.handPulseMs : 400) / 400), 0, 1) * (down > 0.9 ? 1 : 0) : down > 0.5 ? 1 : 0;
    const key = !this.coarse; // con teclado: una tecla "Espacio" de papel en vez del dedo
    const tex = key ? 'keycap' : 'hand';
    if (this.tutHand.texture.key !== tex) this.tutHand.setTexture(tex).setOrigin(0.5, key ? 0.5 : 0.1);
    const base = key ? 1.15 : 1.35;
    this.tutHand.setPosition(0, key ? 22 + down * 6 : down * 16);
    this.tutHand.setScale(base * (1 - down * 0.05));
    // fondo de papel claro con canto kraft: se lee sobre cielo, colina o suelo
    const halo = this.tutHalo;
    halo.clear();
    halo.fillStyle(0x22211f, 0.16);
    halo.fillCircle(2, 28, 52);
    halo.fillStyle(0xf4e8d5, 0.8);
    halo.fillCircle(0, 24, 52);
    halo.lineStyle(4, 0xb99168, 0.9);
    halo.strokeCircle(0, 24, 52);
    const gfx = this.tutRing;
    gfx.clear();
    if (!key) {
      // aro más grueso alrededor de la yema
      gfx.lineStyle(7, 0x22211f, 0.28);
      gfx.strokeCircle(0, -2, 30);
      if (ring > 0) {
        gfx.lineStyle(7, 0x22211f, 0.7);
        gfx.beginPath();
        gfx.arc(0, -2, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (hold ? ring : 1), false);
        gfx.strokePath();
      }
    } else if (ring > 0) {
      // en mantener, una barra se llena bajo la tecla en ~400 ms
      gfx.fillStyle(0x22211f, 0.55);
      gfx.fillRoundedRect(-44, 52, 88 * (hold ? ring : 1), 8, 4);
      gfx.lineStyle(3, 0x22211f, 0.3);
      gfx.strokeRoundedRect(-44, 52, 88, 8, 4);
    }
  }

  // Bot del demo (DISENO "demo"): salta 60-80 ms antes del punto ideal; toque 80 ms; mantiene 240 ms en torres y arcos altos.
  demoBot() {
    if (this.botRelease > 0) return;
    const o = this.obstacles.find((q) => !q.handled && q.x > this.px - 4 && (q.plan === 'tap' || q.plan === 'hold'));
    if (!o) return;
    const kind = o.plan;
    // Dos cajas pegadas (CC): un salto largo centrado en el par
    const pair = this.obstacles.some((q) => q.plan === 'skip' && q.D > o.D && q.D - o.D < 120) ? C.cajaPegadaGapPx / 2 : 0;
    const lead = airTravel(kind, this.speed) / 2 + (kind === 'tap' ? C.demo.leadTap : C.demo.leadHold) - pair; // despega más tarde: el apex cae en el centro del par
    if (o.x - this.px <= lead && this.grounded) {
      o.handled = true;
      this.press();
      this.botRelease = this.t + (kind === 'tap' ? 80 : 240);
    }
  }

  demoRestart() {
    this.demoStripping = true;
    this.rig.cancelHop();
    // Tira de papel que cubre mundo y HUD (no a Moki) y se retira: el reinicio no se nota
    const d = C.demo.stripMs;
    this.tweens.add({ targets: this.strip, alpha: 1, duration: d, onComplete: () => this.demoNext() });
    this.tweens.add({ targets: [this.hudL, this.hudR], alpha: 0, duration: d });
  }

  demoNext() {
    const keepSpeed = this.speed;
    this.demoVariant += 1;
    this.startDemo();
    this.speed = FIXED_SPEED || 320;
    void keepSpeed;
    this.strip.setAlpha(1);
    this.hudL.setAlpha(0);
    this.hudR.setAlpha(0);
    this.tweens.add({ targets: this.strip, alpha: 0, duration: C.demo.stripMs });
    this.tweens.add({ targets: [this.hudL, this.hudR], alpha: 1, duration: C.demo.stripMs });
  }

  // ---------- Fallo ----------

  crash(o) {
    const tut = this.tut;
    if (tut && !this.demo && (tut.state === 'run' || tut.state === 'stopped' || tut.state === 'decel') && (tut.stage === 1 || tut.stage === 3)) {
      // Fallar una lección no saca tarjeta: el obstáculo regresa a la espera y la mano reaparece.
      this.release();
      this.y = C.world.groundY;
      this.vy = 0;
      this.grounded = true;
      this.jumping = false;
      this.rig.reset();
      this.speed = 0;
      const want = this.px + tut.stopDist;
      tut.rewindPx = Math.max(0, want - tut.obs.x);
      tut.rewindLeft = tut.rewindPx;
      this.tutSetState('rewind');
      return;
    }
    // Al impacto el mundo se detiene en el punto exacto del contacto: se descuenta lo que el cuadro de choque ya
    // penetró en esa vuelta (hasta speed*dt), para que el traslape visible sea solo el de la hitbox.
    if (o.type !== 'viga') {
      const front = this.px + (C.player.width - 6) / 2;
      const hit = o.x - o.size.width / 2 + (o.type === 'caja' ? C.hitboxShrinkCaja : C.hitboxShrink).x;
      const pen = front - hit;
      this.impactPenetration = Math.max(0, pen);
      if (pen > 0) {
        this.dist -= pen;
        this.placeEntities();
      }
    }
    this.dead = true;
    this.screen = 'dead';
    this.deadFor = 0;
    this.deadSpeed = this.speed;
    this.recoilDone = 0;
    this.holding = false;
    this.cause = o.type;
    this.cardShown = false;
    if (this.partida && !this.demo) {
      this.partida.crashes += 1;
      this.partida.crashesByTramo[this.tramoIdx] = (this.partida.crashesByTramo[this.tramoIdx] || 0) + 1; // fila de la tarjeta para compartir
    }
    this.particles.burst('crash', this.px + 12, this.y - 10);
    this.buzz(25); // golpe suave, nada que regañe
    this.shake(2, 120);
    // El obstáculo se arruga 2% (papel apachurrado) y se queda así; al reintentar se crea liso de nuevo
    if (!this.calm && o.sprite) this.tweens.add({ targets: o.sprite, scaleX: 1.02, scaleY: 0.98, angle: o.type === 'viga' ? o.sprite.angle : -1, duration: 120, ease: 'Cubic.easeOut' });
    // La mejor marca se guarda también al fallar (no en el demo)
    const prevBest = num(this.bestKey(), 0);
    const isNew = !this.demo && !this.paseoRun && this.score > prevBest;
    if (isNew) save(this.bestKey(), this.score);
    this.failRecord = isNew && prevBest > 0;
    // Sonido: tropiezo amable, la música baja (ducking), stinger de fallo a los 80 ms y, si hay récord, el de récord después
    audio.sfx('stumble');
    audio.setState('dead');
    audio.setStreak(0);
    audio.stinger('fail');
    if (isNew && prevBest > 0)
      setTimeout(() => {
        if (this.screen !== 'dead') return;
        audio.stinger('record');
        this.celebrateRecord();
      }, 1700);
  }

  updateDead(dtMs) {
    const dt = dtMs / 1000;
    this.deadFor += dtMs;
    // Tropiezo (ANIMACION 3.4): hit-stop de 60 ms, luego el mundo frena en 220 ms y todo se asienta.
    if (this.deadFor >= C.art.hitStopMs || this.reduced) {
      this.t += dtMs;
      // Tras el hit-stop el mundo se queda quieto y Moki retrocede unos px con Cubic.out (220 ms): a los 280 ms ya
      // está despegado de la caja y no parece que la atraviesa. Con movimiento reducido: sin retroceso.
      const u = Math.min(1, (this.deadFor - C.art.hitStopMs) / 220);
      const e = this.reduced ? 0 : easeOutCubic(u);
      const back = C.art.recoilPx * (e - this.recoilDone);
      this.recoilDone = e;
      this.speed = 0;
      this.dist -= back;
      this.stepWorld(-back);
      this.placeEntities();
      this.particles.update(dtMs, -back);
      this.stepMoki(dtMs);
    }
    void dt;
    if (!this.cardShown && this.deadFor >= (this.reduced ? 150 : 250)) {
      this.cardShown = true;
      this.showFailCard();
      audio.cardUp(); // con la tarjeta visible la música se mantiene a 30% con lowpass 1200 Hz
      audio.sfx('card');
    }
    if (this.cardShown && this.deadFor >= C.retryLockoutMs) this.ui.unlockFail();
  }

  failRect() {
    const W = this.scale.width;
    const H = this.scale.height;
    const z = this.zoom;
    const mokiX = this.px * z;
    const headY = (C.world.groundY - C.player.spriteHeight - this.top) * z;
    const wide = W >= 700 && W > H * 0.9;
    if (wide) {
      const left = Math.round(mokiX + 120);
      return { left, top: Math.max(76, Math.round(H * 0.1)), width: Math.min(480, W - left - 24), maxHeight: H - 100 };
    }
    return { left: 16, top: 76, width: Math.min(W - 32, 440), maxHeight: Math.max(150, Math.round(headY - 76 - 12)) };
  }

  // Tarjeta ligera (director, P2): la pista es el título (una sola línea), debajo dónde sigues; sin lección rotativa
  // que contradiga "Empiezas de nuevo". Reintentar no exige leer: cualquier toque o tecla tras el bloqueo.
  showFailCard() {
    const pct = Math.min(99, Math.floor((100 * this.dist) / this.level.end));
    const where = this.cp.idx > 0 ? t('fail.cp') : t('fail.start');
    const meta = pct > 10 ? `${t('fail.pct', { n: pct })} · ${where}` : where; // el % solo si pasa de 10
    this.ui.showFail(
      { hint: t(`fail.hint.${this.cause}`), meta, prompt: t(this.coarse ? 'fail.go.touch' : 'fail.go.kbd'), rect: this.failRect(), isNew: this.failRecord },
      () => this.respawn()
    );
    this.showCuaderno();
  }

  // Reintento con un toque: Moki sale del inicio del tramo con lo guardado y 85% de velocidad que sube en 1 s.
  respawn() {
    this.ui.hideFail();
    const cp = this.cp;
    this.pieces = cp.pieces;
    this.pieceValue = cp.pieceValue;
    this.resetRun(this.level, cp.dist);
    this.screen = 'play';
    audio.setStreak(0);
    audio.setState('playing'); // reintento: la música vuelve a 100% en 600 ms
    const target = this.tramoSpeed(this.tramoIdx);
    this.speed = FIXED_SPEED || target * C.respawnSpeedMult;
    this.accel = FIXED_SPEED ? 0 : (target - this.speed) / C.respawnEaseSec;
    this.pieceLabel.set(String(this.pieces));
    this.lastM = -1;
    this.tut = { stage: this.tut.stage === 1 ? 0 : this.tut.stage === 3 ? 2 : this.tut.stage, state: 'off' };
    this.rig.reset();
  }

  // ---------- Final ----------

  finish() {
    this.screen = 'final';
    this.finalShown = false;
    this.finalT = 0;
    this.finalSpeed = this.speed;
    this.metaDone = true;
    this.release();
    this.rig.startHop();
    if (!this.paseoRun) save('moki.done', '1'); // abre Hardcore (decisión del líder); un paseo no lo abre
    if (this.partida) Object.assign(this.partida, { finished: true, pieceTotal: this.level.pieceTotal });
    // Puntaje, metros y piezas se congelan UNA vez al cruzar la meta: la tarjeta y la mejor marca dicen lo mismo
    const best = num(this.bestKey(), 0);
    const score = this.score;
    const isNew = !this.paseoRun && score > best;
    this.finalData = { isNew, hadBest: best > 0, score, meters: Math.floor(this.dist / 100), pieces: this.pieces, best: this.paseoRun ? best : Math.max(best, score), paseo: this.paseoRun };
    audio.setState('finished'); // la música baja a 0 y suena el stinger del final
    audio.stinger('final');
    if (isNew) save(this.bestKey(), score);
    this.ui.showPauseButton(false);
    // Meta: confeti de papel (Mucho o más) y vibración de festejo
    this.particles.burst('confetti', this.px + 40, C.world.groundY - 150);
    this.buzz([20, 40, 40]);
  }

  updateFinal(dtMs) {
    const dt = dtMs / 1000;
    this.finalT += dtMs;
    this.t += dtMs;
    // El mundo frena en 1 s; Moki queda en pose de celebración
    const u = Math.min(1, this.finalT / 1000);
    this.speed = this.finalSpeed * (1 - easeOutCubic(this.reduced ? 1 : u));
    const step = this.speed * dt;
    this.dist += step;
    this.stepJump(dt);
    this.stepWorld(step);
    this.placeEntities();
    this.stepMidProps();
    this.particles.update(dtMs, step);
    this.stepMoki(dtMs);
    if (!this.finalShown && this.finalT >= 1200) {
      this.finalShown = true;
      this.lastInputAt = this.time.now;
      this.showFinalCard();
    }
  }

  showFinalCard() {
    audio.finalCard(); // música a 35%, solo la base, con lowpass 2.5 kHz
    if (this.finalData.isNew && this.finalData.hadBest)
      setTimeout(() => {
        if (this.screen !== 'final') return;
        audio.stinger('record');
        this.celebrateRecord();
      }, 2600);
    // En vertical la tarjeta va entre el HUD y la cabeza de Moki (compacta): no lo tapa
    const rect = this.failRect();
    const wide = this.scale.width >= 700 && this.scale.width > this.scale.height * 0.9;
    const r = wide ? rect : { ...rect, compact: true };
    if (!wide) this.paseoTagC.setVisible(false); // en vertical la tarjeta cae sobre la etiqueta; la tarjeta ya dice 'Paseo completo'
    const d = this.finalData;
    this.ui.showFinal(
      { isNew: d.isNew, paseo: d.paseo, meters: d.meters, pieces: d.pieces, piecesTotal: this.level.pieceTotal, score: d.score, best: d.best, bestModo: t(`end.best.${this.bestMode()}`), modo: this.modoLabel() },
      { onAgain: () => this.playAgain(), onHow: () => this.showAsi(), onCopy: () => copiar(this.textoCompartir()) },
      r
    );
    this.showCuaderno();
  }

  // Tira del cuaderno bajo la tarjeta de fallo o de fin: notas activas con avance y el sello nuevo (GDD §3).
  showCuaderno() {
    if (!this.partida || this.demo) return;
    const z = this.zoom;
    const W = this.scale.width;
    const H = this.scale.height;
    // Zonas en px de pantalla: la tira no tapa a Moki (cabeza) y en vertical baja al suelo de papel
    const zonas = {
      wide: W >= 700 && W > H * 0.9,
      headY: (C.world.groundY - C.player.spriteHeight - this.top) * z,
      floorY: (C.world.groundY - this.top) * z,
    };
    this.ui.showCuaderno(revisar(this.partida), zonas);
  }

  // Tarjeta para compartir (GDD §3): modo, fecha local, una fila por página (sin caer / con tropiezo), sellos y racha
  textoCompartir() {
    const l = this.level;
    const P = this.partida || { crashesByTramo: {} };
    const c = leerCuaderno();
    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
    return textoTarjeta({
      modo: this.modoLabel() || t('share.clasico'),
      fecha,
      paginas: l.tramos.map((_, i) => ({ caidas: P.crashesByTramo[i] || 0 })),
      sellos: c.notas.length + c.sellos.length,
      de: TOTAL_SELLOS,
      racha: leerRacha().racha,
      paseo: !!(this.finalData && this.finalData.paseo),
    });
  }

  showAsi() {
    this.ui.showAsi(C.jorgeInterventions, () => this.ui.hideAsi());
  }

  // "Otra vez": en Reto repite el nivel del día; en Libre sale uno nuevo (startGame sortea otra semilla)
  playAgain() {
    this.startGame();
    this.tut = { stage: 4, state: 'off' }; // "Otra vez": sin tutorial
    this.metaDone = false;
  }
}
