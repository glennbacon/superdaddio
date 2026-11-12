// Browser entry point: loads assets, then runs the game loop.

import { FRAME_MS } from './engine/clock.js';
import { VoxelRenderer } from './engine/voxel/VoxelRenderer.js';
import { Input } from './engine/input.js';
import { AudioSystem } from './engine/audio.js';
import { SaveData } from './engine/save.js';
import { effectNames, fetchSound, getPixels, getTexture, loadAssets, loadLevelData, musicNames } from './engine/assets.js';
import { App } from './game/App.js';
import * as spawn from './game/level/spawn.js';

async function boot() {
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('game');
  const status = document.getElementById('status');

  await loadAssets((fraction) => (status.textContent = `Loading ${Math.round(fraction * 100)}%`));

  const audio = new AudioSystem(fetchSound);
  audio.init();
  await audio.loadAll(effectNames());
  audio.loadAll(musicNames); // music keeps decoding in the background

  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    // no storage available: progress lasts for this visit only
  }

  const renderer = new VoxelRenderer(canvas, { getTexture, getPixels });
  // with a keyboard to hand, say which keys do what
  const keyboard = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const controlsHint = keyboard ? 'Arrows or A/D: run   Space: jump   X: action   Esc: pause' : null;
  const app = new App({ audio, save: new SaveData(storage), loadLevel: loadLevelData, controlsHint });
  // the whole window takes touches, not just the picture: see VoxelRenderer.toContent
  const input = new Input(stage, (x, y) => renderer.toContent(x, y));
  input.onGesture = () => audio.unlock();
  // some browsers only allow sound to start when a touch or click ends, not when it begins
  for (const type of ['pointerup', 'touchend', 'click']) window.addEventListener(type, () => audio.unlock(), { capture: true, passive: true });
  input.onTouch = (event) => app.onTouch(event);
  input.onKey = (event) => app.onKey(event);

  // #level3-2 in the address jumps straight into a level
  const level = /^#level(\d)-(\d)(-debug)?$/.exec(window.location.hash);
  if (level) {
    const worldUnlocked = app.save.loadBox('worldUnlocked');
    worldUnlocked.store('loadlevel', `level${level[1]}_${level[2]}`);
    // the menus normally switch sound and music on the first time through
    const audioSettings = app.save.loadBox('audioSetting');
    audioSettings.storeIfNew('musicOn', 'true');
    audioSettings.storeIfNew('soundOn', 'true');
    app.gotoScene('level');
  } else {
    app.gotoScene('title');
  }
  // for poking at the game from the browser console: always while developing, otherwise only when
  // the address ends in "debug" (#debug, #level3-2-debug)
  if (import.meta.env.DEV || /debug$/.test(window.location.hash)) window.superdaddio = { app, renderer, spawn };

  status.remove();

  // The game advances in fixed 1/60 s frames no matter how fast the display refreshes.
  let last = performance.now();
  let owed = 0;
  const frame = (now) => {
    let elapsed = now - last;
    last = now;
    if (elapsed > 250) elapsed = FRAME_MS; // the tab was in the background
    if (Math.abs(elapsed - FRAME_MS) < 3) elapsed = FRAME_MS; // on a 60 Hz display: exactly one game frame per refresh
    owed += elapsed;
    let frames = 0;
    while (owed >= FRAME_MS - 0.001 && frames < 4) {
      app.tick();
      owed -= FRAME_MS;
      frames += 1;
    }
    if (frames === 4) owed = 0;
    renderer.render(app.stage, app.scene);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot().catch((error) => {
  console.error(error);
  const status = document.getElementById('status');
  if (status) status.textContent = `Failed to start: ${error.message}`;
});
