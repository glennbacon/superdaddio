// Headless harness: runs the real game logic and physics in Node, with no rendering or audio.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { App } from '../src/game/App.js';
import { SilentAudio } from '../src/engine/audio.js';
import { SaveData } from '../src/engine/save.js';
import { currentHero } from '../src/game/level/hero.js';

const LEVEL_DIR = fileURLToPath(new URL('../src/levels/', import.meta.url));

export const levelNames = readdirSync(LEVEL_DIR)
  .filter((file) => /^level\d_\d\.json$/.test(file))
  .map((file) => file.replace('.json', ''))
  .sort();

export const loadLevelData = (name) => JSON.parse(readFileSync(`${LEVEL_DIR}${name}.json`, 'utf8'));

/** Starts a level and returns handles for driving it. */
export function startLevel(name) {
  const app = new App({ audio: new SilentAudio(), save: new SaveData(null), loadLevel: loadLevelData });
  app.save.loadBox('worldUnlocked').store('loadlevel', name);
  const settings = app.save.loadBox('audioSetting');
  settings.store('soundOn', 'true');
  settings.store('musicOn', 'true');
  app.startLevel(loadLevelData(name));
  app.tick();
  const game = {
    app,
    get level() {
      return app.scene;
    },
    get hero() {
      return currentHero(app.scene);
    },
    gs: app.gameState,
    /** Advances `frames` frames. */
    run(frames = 1) {
      for (let i = 0; i < frames; i++) app.tick();
    },
    /** Advances until `condition()` is true; returns the number of frames it took, or -1. */
    runUntil(condition, maxFrames = 3600) {
      for (let i = 0; i < maxFrames; i++) {
        if (condition()) return i;
        app.tick();
      }
      return condition() ? maxFrames : -1;
    },
    press(action) {
      app.onKey({ phase: 'down', action });
    },
    release(action) {
      app.onKey({ phase: 'up', action });
    },
  };
  return game;
}

// --- hand-made test levels -----------------------------------------------------------------------

const call = (fn, args = [], key) => ({ op: 'call', fn, args, key });

/** A level-data image op, as the extractor would emit it. */
export function image(img, w, h, x, y, { name, name2, sensor = false, body = 'static', friction = 0.2, alpha, extra = {} } = {}) {
  const props = { ...extra };
  if (name) props.myName = name;
  if (name2) props.myName2 = name2;
  if (alpha !== undefined) props.alpha = alpha;
  if (sensor) props.isSensor = true;
  return {
    op: 'img',
    img: `images/${img}.png`,
    w,
    h,
    ref: 'TopCenter',
    x,
    y,
    props,
    group: 'game',
    body: body ? { type: body, density: 0, friction, bounce: 0 } : undefined,
  };
}

export const ground = (x, width, y = 480) => image('platform1', width, 400, x, y, { name: 'ground', name2: 'ground' });
export const brick = (x, y, name = 'crackedblock') => image('crackedblock', 32, 32, x, y, { name, name2: 'ground', body: 'kinematic', extra: { isMoving: false } });
export { call };

/**
 * Starts a small flat test level: 3000px of ground with its surface at y = 480, plus `ops`.
 * The hero appears standing at `heroX` (the game itself shifts him 149px left of the spawn call).
 */
export function startTestLevel({ ops = [], updates = [], heroX = 300, heroY = 460, level = 'level1_1', worldlevel = '1-1', flat = true } = {}) {
  const data = {
    level,
    worldlevel,
    env: { isDay: true, isNight: false, isRaining: false, isSnowing: false, isCave: false },
    ops: [call('loadHud'), ...(flat ? [ground(1000, 3000)] : []), ...ops, call('spawnSmallHero', [heroX + 149, heroY]), call('loadEnvironment'), call('loadPauseMenu')],
    updates,
  };
  // a reload (after the hero dies) gets the same hand-made level again
  const app = new App({ audio: new SilentAudio(), save: new SaveData(null), loadLevel: (name) => (name === level ? data : loadLevelData(name)) });
  app.save.loadBox('worldUnlocked').store('loadlevel', level);
  const settings = app.save.loadBox('audioSetting');
  settings.store('soundOn', 'true');
  settings.store('musicOn', 'true');
  app.startLevel(data);
  app.tick();
  return {
    app,
    get level() {
      return app.scene;
    },
    get hero() {
      return currentHero(app.scene);
    },
    gs: app.gameState,
    run(frames = 1) {
      for (let i = 0; i < frames; i++) app.tick();
    },
    runUntil(condition, maxFrames = 3600) {
      for (let i = 0; i < maxFrames; i++) {
        if (condition()) return i;
        app.tick();
      }
      return condition() ? maxFrames : -1;
    },
    /** Like run(), but also lets pending promises settle (a level reload loads its data asynchronously). */
    async runAsync(frames = 1) {
      for (let i = 0; i < frames; i++) {
        app.tick();
        await new Promise((resolve) => setImmediate(resolve));
      }
    },
    press(action) {
      app.onKey({ phase: 'down', action });
    },
    release(action) {
      app.onKey({ phase: 'up', action });
    },
    /** Skips the invulnerability the hero has for the first 3.5 seconds of a level. */
    endGracePeriod() {
      app.gameState.noHit = false;
      const hero = currentHero(app.scene);
      if (hero) hero.alpha = 1;
    },
    /** Puts the hero somewhere, at rest. */
    placeHero(x, y) {
      const hero = currentHero(app.scene);
      hero.x = x;
      hero.y = y;
      hero.setLinearVelocity(0, 0);
    },
  };
}
