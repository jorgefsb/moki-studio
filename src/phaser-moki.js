// Phaser a medida: solo lo que el juego usa (vite.config.js apunta 'phaser' aquí).
// Si el juego empieza a usar otra pieza de Phaser (otro this.add.*, física, sonido de Phaser...), hay que importarla aquí.

import CONST from 'phaser/src/const.js';
import Extend from 'phaser/src/utils/object/Extend.js';

// Plugins de escena: cada archivo se registra solo en PluginCache al cargarse (los mismos de DefaultPlugins).
import 'phaser/src/events/EventEmitter.js';
import 'phaser/src/cameras/2d/CameraManager.js';
import 'phaser/src/scene/ScenePlugin.js';
import 'phaser/src/gameobjects/lights/LightsPlugin.js';
import 'phaser/src/time/Clock.js';
import 'phaser/src/data/DataManagerPlugin.js';
import 'phaser/src/input/InputPlugin.js';
import 'phaser/src/input/keyboard/KeyboardPlugin.js';
import 'phaser/src/input/mouse/MouseManager.js';
import 'phaser/src/input/touch/TouchManager.js';
import 'phaser/src/loader/LoaderPlugin.js';
import 'phaser/src/loader/filetypes/ImageFile.js';
import 'phaser/src/tweens/TweenManager.js';

// Objetos de juego que usamos: cada fábrica se registra sola en GameObjectFactory (this.add.*).
import 'phaser/src/gameobjects/DisplayList.js';
import 'phaser/src/gameobjects/UpdateList.js';
import 'phaser/src/gameobjects/GameObjectFactory.js';
import 'phaser/src/gameobjects/GameObjectCreator.js';
import 'phaser/src/gameobjects/image/ImageFactory.js';
import 'phaser/src/gameobjects/graphics/GraphicsFactory.js';
import 'phaser/src/gameobjects/container/ContainerFactory.js';
import 'phaser/src/gameobjects/tilesprite/TileSpriteFactory.js';
import 'phaser/src/gameobjects/shape/rectangle/RectangleFactory.js';
import 'phaser/src/gameobjects/text/TextFactory.js';

import BlendModes from 'phaser/src/renderer/BlendModes.js';
import Scene2D from 'phaser/src/cameras/2d/index.js';
import Color from 'phaser/src/display/color/index.js';
import Game from 'phaser/src/core/Game.js';
import Between from 'phaser/src/math/Between.js';
import Clamp from 'phaser/src/math/Clamp.js';
import FloatBetween from 'phaser/src/math/FloatBetween.js';
import Scale from 'phaser/src/scale/index.js';
import Scene from 'phaser/src/scene/Scene.js';

// Lo que el juego toca como Phaser.*, más las constantes (Phaser.AUTO...)
const Phaser = Extend(false, { BlendModes, Cameras: { Scene2D }, Display: { Color }, Game, Math: { Between, Clamp, FloatBetween }, Scale, Scene }, CONST);

export default Phaser;
