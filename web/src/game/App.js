// The game itself, independent of any browser API: owns the clock, the physics world, the shared
// game state and the current scene, and advances them one fixed 1/60 s frame at a time.
//
// main.js wraps this with rendering, input and asset loading; the tests drive it directly.

import { Clock, FRAME_MS } from '../engine/clock.js';
import { Group, Sprite } from '../engine/display.js';
import { Physics } from '../engine/physics.js';
import { createGameState } from './state.js';
import { LevelScene } from './level/LevelScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { SelectWorldScene } from './scenes/SelectWorldScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';

const SIMPLE_SCENES = { title: TitleScene, selectworld: SelectWorldScene, levelcomplete: LevelCompleteScene };

export class App {
  /**
   * @param {object} services
   * @param {object} services.audio an AudioSystem (or SilentAudio)
   * @param {import('../engine/save.js').SaveData} services.save
   * @param {(name: string) => object | Promise<object>} services.loadLevel returns a level's data
   */
  constructor({ audio, save, loadLevel }) {
    this.clock = new Clock();
    this.physics = new Physics();
    this.physics.setGravity(0, 15);
    this.audio = audio;
    this.save = save;
    this.loadLevel = loadLevel;
    this.gameState = createGameState();
    /** Root of everything drawn. */
    this.stage = new Group();
    this.scene = null;
    this.sceneName = null;
    this._pendingScene = null;
  }

  /**
   * Switches scene at the start of the next frame. "level" starts whichever level the save data's
   * "loadlevel" names; until its data has arrived the current scene simply stays up.
   * @param {'title'|'selectworld'|'level'|'levelcomplete'} name
   */
  gotoScene(name) {
    if (name !== 'level') {
      this._pendingScene = { name, create: () => new SIMPLE_SCENES[name](this) };
      return;
    }
    const level = this.save.loadBox('worldUnlocked').retrieve('loadlevel');
    Promise.resolve()
      .then(() => this.loadLevel(level))
      .then((data) => this.startLevel(data))
      .catch((error) => {
        console.error(`Could not load ${level}`, error);
        this.gotoScene('selectworld');
      });
  }

  /** Starts a level from its data on the next frame. */
  startLevel(data) {
    this._pendingScene = { name: 'level', create: () => new LevelScene(this, data) };
  }

  /**
   * Advances the game by one frame, in the original engine's order: sprite animations, one physics
   * step (collision rules run inside it), the scene's per-frame logic, then timers and tweens.
   *
   * The order is part of how the game plays. The scene's logic has to see where the step left the
   * hero, or the camera trails him by a frame; and tweens have to come after it, or the camera glide
   * on landing is overwritten by the logic's own camera code and the view jumps instead.
   */
  tick() {
    if (this._pendingScene) {
      const { name, create } = this._pendingScene;
      this._pendingScene = null;
      if (this.scene) this.scene.destroy();
      this.clock.reset();
      this.physics.clear();
      this.physics.pause();
      this.scene = create();
      this.sceneName = name;
      this.stage.insert(this.scene.view);
    }
    this.clock.beginFrame();
    Sprite.advanceAll(FRAME_MS);
    this.physics.step();
    if (this.scene) this.scene.enterFrame();
    this.clock.update();
  }

  onTouch(event) {
    if (this.scene && this.scene.onTouch) this.scene.onTouch(event);
  }

  onKey(event) {
    if (this.scene && this.scene.onKey) this.scene.onKey(event);
  }
}
