// t relativo al bloque; dur incluye la cola (>= 1.2 s); min/max = tramo 1-4
export const BLOQUES = [
  // descanso y premio (siempre permitidos, sin importar la dificultad del tramo)
  { id: 'respiro',      dur: 3,   ev: [[0, 'P5']],                              dif: 1, min: 1, max: 4, tags: ['descanso'] },
  { id: 'arco-corto',   dur: 4,   ev: [[0, 'C+A3'], [2, 'P5']],                 dif: 1, min: 1, max: 4, tags: ['descanso', 'premio'] },
  { id: 'arco-alto',    dur: 4.5, ev: [[0, 'C+Aup'], [2.5, 'P5']],              dif: 1, min: 1, max: 4, tags: ['descanso', 'premio', 'ensena-mantener'] },
  { id: 'viga-piezas',  dur: 4,   ev: [[0, 'V+P5'], [2.5, 'C']],                dif: 1, min: 3, max: 4, tags: ['descanso', 'viga'] },
  // caja
  { id: 'cajas-2',      dur: 4,   ev: [[0, 'C'], [2.5, 'C']],                   dif: 1, min: 1, max: 2, tags: ['caja'] },
  { id: 'cajas-3',      dur: 5.5, ev: [[0, 'C'], [2, 'C'], [4, 'C']],           dif: 2, min: 1, max: 3, tags: ['caja', 'ritmo'] },
  { id: 'par-cajas',    dur: 4,   ev: [[0, 'C.C'], [2.5, 'C']],                 dif: 2, min: 2, max: 4, tags: ['caja', 'ritmo'] },
  // torre
  { id: 'torre-caja',   dur: 4,   ev: [[0, 'T'], [2.5, 'C']],                   dif: 1, min: 1, max: 3, tags: ['torre', 'ensena-mantener'] },
  { id: 'alterna',      dur: 5.5, ev: [[0, 'C'], [2, 'T'], [4, 'C']],           dif: 2, min: 1, max: 3, tags: ['alterna'] },
  { id: 'torre-arco',   dur: 4,   ev: [[0, 'T+Aup'], [2.5, 'C']],               dif: 2, min: 1, max: 4, tags: ['torre', 'premio'] },
  // salto largo
  { id: 'largo',        dur: 4,   ev: [[0, 'CC'], [2.5, 'C']],                  dif: 2, min: 2, max: 4, tags: ['salto-largo'] },
  { id: 'largo-arco',   dur: 4.5, ev: [[0, 'CC+Aup'], [2.5, 'P5']],             dif: 2, min: 2, max: 4, tags: ['salto-largo', 'premio'] },
  // ritmo
  { id: 'tc-torre',     dur: 4,   ev: [[0, 'T.C'], [2.5, 'T']],                 dif: 3, min: 2, max: 4, tags: ['ritmo', 'torre'] },
  { id: 'ritmo-mixto',  dur: 5.5, ev: [[0, 'C.C'], [2, 'T'], [4, 'CC']],        dif: 3, min: 2, max: 4, tags: ['ritmo'] },
  // viga
  { id: 'viga-intro',   dur: 4,   ev: [[0, 'V'], [2.5, 'VC']],                  dif: 2, min: 3, max: 4, tags: ['viga', 'ensena-viga'] },
  { id: 'caja-viga',    dur: 4.5, ev: [[0, 'C.V'], [2.5, 'VC']],                dif: 3, min: 3, max: 4, tags: ['viga', 'ritmo'] },
  { id: 'torre-viga',   dur: 4,   ev: [[0, 'T.V'], [2.5, 'C']],                 dif: 3, min: 3, max: 4, tags: ['viga', 'torre'] },
  { id: 'viga-dura',    dur: 5.5, ev: [[0, 'T.V'], [2, 'C.V'], [4, 'VC']],      dif: 4, min: 3, max: 4, tags: ['viga', 'ritmo'] },
  { id: 'cc-viga',      dur: 6,   ev: [[0, 'CC'], [2.2, 'V'], [3.8, 'T.C']],    dif: 4, min: 3, max: 4, tags: ['viga', 'salto-largo'] },
  // pieza 5b: 24 → 40+ bloques. Solo códigos y premios que ya existen (sin arte ni física nueva).
  // descanso y premio
  { id: 'arcos-2',      dur: 3.5, ev: [[0, 'C+A3'], [2, 'C+A3']],               dif: 1, min: 1, max: 4, tags: ['descanso', 'premio'] },
  { id: 'salto-premio', dur: 3,   ev: [[0, 'CC+Aup']],                          dif: 1, min: 2, max: 4, tags: ['descanso', 'premio'] },
  // caja y torre (desde T1)
  { id: 'caja-arco',    dur: 3.5, ev: [[0, 'C'], [2, 'C+A3']],                  dif: 1, min: 1, max: 4, tags: ['caja', 'premio'] },
  { id: 'caja-torre',   dur: 4,   ev: [[0, 'C'], [2.5, 'T']],                   dif: 1, min: 1, max: 3, tags: ['torre'] },
  { id: 'torre-sola',   dur: 3,   ev: [[0, 'T+A3up']],                          dif: 1, min: 1, max: 3, tags: ['torre', 'premio'] },
  { id: 'dos-torres',   dur: 4,   ev: [[0, 'T'], [2.5, 'T+A3up']],              dif: 2, min: 1, max: 4, tags: ['torre', 'premio'] },
  { id: 'escalera',     dur: 5.5, ev: [[0, 'C'], [2, 'C+A3'], [4, 'T']],        dif: 2, min: 1, max: 3, tags: ['alterna', 'premio'] },
  { id: 'alterna-alta', dur: 5.5, ev: [[0, 'T'], [2, 'C'], [4, 'T+Aup']],       dif: 2, min: 1, max: 4, tags: ['alterna', 'premio'] },
  { id: 'tres-torres',  dur: 5.5, ev: [[0, 'T'], [2, 'T+Aup'], [4, 'T']],       dif: 3, min: 2, max: 4, tags: ['torre', 'ritmo'] },
  // salto largo y pares (desde T2)
  { id: 'par-arco',     dur: 4,   ev: [[0, 'C.C'], [2.2, 'C+A3']],              dif: 2, min: 2, max: 4, tags: ['caja', 'ritmo', 'premio'] },
  { id: 'largo-torre',  dur: 4,   ev: [[0, 'CC'], [2.5, 'T']],                  dif: 2, min: 2, max: 4, tags: ['salto-largo', 'torre'] },
  { id: 'torre-largo',  dur: 4,   ev: [[0, 'T'], [2, 'CC+Aup']],                dif: 3, min: 2, max: 4, tags: ['salto-largo', 'torre', 'premio'] },
  { id: 'doble-par',    dur: 4.5, ev: [[0, 'C.C'], [2.2, 'C.C']],               dif: 3, min: 2, max: 4, tags: ['caja', 'ritmo'] },
  { id: 'tc-largo',     dur: 4.5, ev: [[0, 'T.C'], [2.2, 'CC']],                dif: 3, min: 2, max: 4, tags: ['ritmo', 'salto-largo'] },
  { id: 'caja-tc',      dur: 5.5, ev: [[0, 'C'], [1.8, 'T.C'], [4, 'C+A3']],    dif: 3, min: 2, max: 4, tags: ['ritmo', 'torre', 'premio'] },
  { id: 'largo-doble',  dur: 4.5, ev: [[0, 'CC'], [2.2, 'CC+Aup']],             dif: 3, min: 2, max: 4, tags: ['salto-largo', 'premio'] },
  { id: 'ritmo-largo',  dur: 6.5, ev: [[0, 'C.C'], [2, 'T.C'], [4, 'C.C']],     dif: 4, min: 3, max: 4, tags: ['ritmo'] },
  // viga (desde T3)
  { id: 'viga-caja',    dur: 4,   ev: [[0, 'VC'], [2.5, 'C+A3']],               dif: 2, min: 3, max: 4, tags: ['viga', 'premio'] },
  { id: 'viga-doble',   dur: 3.5, ev: [[0, 'VC'], [2, 'VC']],                   dif: 2, min: 3, max: 4, tags: ['viga', 'ritmo'] },
  { id: 'viga-torre',   dur: 4,   ev: [[0, 'VC'], [2, 'T+Aup']],                dif: 3, min: 3, max: 4, tags: ['viga', 'torre', 'premio'] },
  { id: 'viga-largo',   dur: 4.5, ev: [[0, 'VC'], [2.2, 'CC+Aup']],             dif: 3, min: 3, max: 4, tags: ['viga', 'salto-largo', 'premio'] },
  { id: 'cv-torre',     dur: 4,   ev: [[0, 'C.V'], [2.2, 'T+Aup']],             dif: 3, min: 3, max: 4, tags: ['viga', 'torre', 'premio'] },
  { id: 'viga-tc',      dur: 6.5, ev: [[0, 'VC'], [2, 'T.C'], [4, 'C.V']],      dif: 4, min: 3, max: 4, tags: ['viga', 'ritmo'] },
  { id: 'gran-viga',    dur: 5.5, ev: [[0, 'T.V'], [2.2, 'CC'], [4.2, 'VC']],   dif: 4, min: 3, max: 4, tags: ['viga', 'salto-largo'] },
  // pop-up (U): solo dificultad >= 2 y desde T2; nunca a los 0 s del bloque y >= 1.8 s tras el obstáculo anterior,
  // para que el aviso empiece con Moki ya en el suelo
  { id: 'pop-intro',    dur: 4,   ev: [[0, 'C'], [2.2, 'U']],                   dif: 2, min: 2, max: 4, tags: ['popup', 'caja'] },
  { id: 'pop-arco',     dur: 4,   ev: [[0, 'C+A3'], [2.2, 'U+A3']],             dif: 2, min: 2, max: 4, tags: ['popup', 'premio'] },
  { id: 'pop-torre',    dur: 4,   ev: [[0, 'T'], [2.2, 'U']],                   dif: 3, min: 2, max: 4, tags: ['popup', 'torre'] },
  { id: 'pop-largo',    dur: 4.5, ev: [[0, 'CC'], [2.4, 'U+A3']],               dif: 3, min: 2, max: 4, tags: ['popup', 'salto-largo', 'premio'] },
  { id: 'pop-doble',    dur: 5,   ev: [[0, 'C'], [1.8, 'U'], [3.6, 'U']],       dif: 3, min: 2, max: 4, tags: ['popup', 'ritmo'] },
  { id: 'pop-viga',     dur: 4,   ev: [[0, 'VC'], [2.2, 'U']],                  dif: 3, min: 3, max: 4, tags: ['popup', 'viga'] },
  { id: 'pop-ritmo',    dur: 5.5, ev: [[0, 'T.C'], [2.4, 'U'], [4.2, 'T']],     dif: 4, min: 3, max: 4, tags: ['popup', 'ritmo'] },
  // trampolín (mec 'tramp': solo con esa mecánica destrabada, en Libre). Nudo a 0.9 s (C.tramp.nudoSec); lo siguiente a
  // >= 2.2 s del trampolín (0.75 s libres al caer del vuelo de ~1.24 s). Arriba el arco del vuelo, abajo el combo a mano.
  { id: 'tramp-intro',  dur: 3,   ev: [[0, 'J+Avu']],                           dif: 1, min: 1, max: 4, tags: ['trampolin', 'premio'], mec: 'tramp' },
  { id: 'tramp-nudo',   dur: 3,   ev: [[0, 'J+Avu'], [0.9, 'C+A3']],            dif: 2, min: 1, max: 4, tags: ['trampolin', 'premio'], mec: 'tramp' },
  { id: 'tramp-torre',  dur: 3,   ev: [[0, 'J+Avu'], [0.9, 'T+A3up']],          dif: 3, min: 2, max: 4, tags: ['trampolin', 'torre'], mec: 'tramp' },
  { id: 'tramp-viga',   dur: 4,   ev: [[0, 'J+Avu'], [0.9, 'C+A3'], [2.3, 'V']], dif: 3, min: 3, max: 4, tags: ['trampolin', 'viga'], mec: 'tramp' },
  { id: 'tramp-doble',  dur: 5,   ev: [[0, 'J+Avu'], [0.9, 'C+A3'], [2.4, 'J+Avu'], [3.3, 'T']], dif: 3, min: 3, max: 4, tags: ['trampolin', 'ritmo'], mec: 'tramp' },
  // viento (mec 'viento', NIVELES.md "#2 Viento" §3): > a favor (tocar antes), < en contra (tocar después). Nunca en T1;
  // par y ritmo solo en el pico (soloPico); máx. 2 por página; la primera página con viento abre con intro y contra.
  { id: 'viento-intro', dur: 3,   ev: [[0, 'C>+Aup']],                          dif: 1, min: 2, max: 4, tags: ['viento', 'premio'], mec: 'viento' },
  { id: 'viento-contra', dur: 3,  ev: [[0, 'C<']],                              dif: 2, min: 2, max: 4, tags: ['viento'], mec: 'viento' },
  { id: 'viento-torre', dur: 3,   ev: [[0, 'T>+Aup']],                          dif: 2, min: 2, max: 4, tags: ['viento', 'torre'], mec: 'viento' },
  { id: 'viento-par',   dur: 4,   ev: [[0, 'C>'], [1.5, 'C<']],                 dif: 3, min: 2, max: 4, tags: ['viento', 'ritmo'], mec: 'viento', soloPico: true },
  { id: 'viento-ritmo', dur: 4,   ev: [[0, 'C<'], [1.0, 'C<'], [2.2, 'C<']],    dif: 3, min: 2, max: 4, tags: ['viento', 'ritmo'], mec: 'viento', soloPico: true },
  // timbre (mec 'timbre', NIVELES.md §9): tocarlo con el salto mantenido acuesta la torre de +0.9 (5 piezas de piso);
  // a mano, el arco alto sobre la torre de pie. Máx. 1 por página; intro solo al estrenarlo; tc y viga solo en el pico.
  { id: 'timbre-intro', dur: 3,   ev: [[0, 'B'], [0.9, 'T+A3up']],              dif: 2, min: 2, max: 4, tags: ['timbre', 'premio'], mec: 'timbre', soloEstreno: true },
  { id: 'timbre-caja',  dur: 3,   ev: [[0, 'C+B'], [0.9, 'T+A3up']],            dif: 2, min: 2, max: 4, tags: ['timbre'], mec: 'timbre' },
  { id: 'timbre-tc',    dur: 4,   ev: [[0, 'C+B'], [0.9, 'T.C+A3up']],          dif: 3, min: 2, max: 4, tags: ['timbre', 'ritmo'], mec: 'timbre', soloPico: true },
  { id: 'timbre-viga',  dur: 4,   ev: [[0, 'C+B'], [0.9, 'T+A3up'], [2.1, 'V']], dif: 3, min: 2, max: 4, tags: ['timbre', 'viga'], mec: 'timbre', soloPico: true },
  // zanja (mec 'zanja', NIVELES.md §10): sus bloques viven en src/zanja.js, que solo baja Libre
  // sorpresas (1 por tramo; se colocan aparte, ver §4)
  { id: 'regalo7',      dur: 4,   ev: [[0, 'T+Aup7'], [2, 'P5']],               dif: 1, min: 1, max: 1, tags: ['sorpresa', 'premio'] },
  { id: 'ambar',        dur: 4.5, ev: [[0, 'T+AupAmb'], [2.5, 'C.C']],          dif: 2, min: 2, max: 3, tags: ['sorpresa', 'premio'] },
  { id: 'regalo-ambar', dur: 4,   ev: [[0, 'T+Aup7Amb'], [2, 'P5']],            dif: 2, min: 2, max: 4, tags: ['sorpresa', 'premio'] },
  { id: 'viga-arco',    dur: 3.5, ev: [[0, 'V+Adn'], [2, 'P5']],                dif: 2, min: 3, max: 4, tags: ['sorpresa', 'viga', 'premio'] },
  { id: 'ola',          dur: 6.5, ev: [[0, 'OLA']],                             dif: 4, min: 4, max: 4, tags: ['sorpresa', 'ritmo'] },
];

// Especiales (no se sortean)
export const T1_INTRO = [[2.5, 'C+A3'], [5, 'C'], [7.5, 'T+A3up'], [10, 'P5']]; // T1 0-12 s, absoluto: el tutorial depende de esto

export const SORPRESAS = { 1: [['regalo7', 1]], 2: [['ambar', 2], ['regalo-ambar', 1]], 3: [['viga-arco', 2], ['regalo-ambar', 1]], 4: [['ola', 3], ['viga-arco', 1]] };
