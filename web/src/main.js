// Browser entry point: loads assets, then runs the game loop.

import { FRAME_MS } from './engine/clock.js';
import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { AudioSystem } from './engine/audio.js';
import { SaveData } from './engine/save.js';
import { audioUrls, getTexture, loadAssets, loadLevelData } from './engine/assets.js';
import { App } from './game/App.js';

const MUSIC = ['track1', 'track1b', 'track2', 'track2b', 'track3', 'track4'];

async function boot() {
  const canvas = document.getElementById('game');
  const status = document.getElementById('status');

  await loadAssets((fraction) => (status.textContent = `Loading ${Math.round(fraction * 100)}%`));

  const audio = new AudioSystem(audioUrls);
  audio.init();
  const effects = Object.keys(audioUrls).filter((name) => !MUSIC.includes(name));
  await audio.loadAll(effects);
  audio.loadAll(MUSIC); // music keeps decoding in the background

  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    // no storage available: progress lasts for this visit only
  }

  const renderer = new Renderer(canvas, getTexture);
  const app = new App({ audio, save: new SaveData(storage), loadLevel: loadLevelData });
  const input = new Input(canvas, (x, y) => renderer.toContent(x, y));
  input.onGesture = () => audio.unlock();
  input.onTouch = (event) => app.onTouch(event);
  input.onKey = (event) => app.onKey(event);

  // ?level=level3_2 jumps straight into a level
  const level = new URLSearchParams(window.location.search).get('level');
  if (level && /^level\d_\d$/.test(level)) {
    const worldUnlocked = app.save.loadBox('worldUnlocked');
    worldUnlocked.store('loadlevel', level);
    app.gotoScene('level');
  } else {
    app.gotoScene('title');
  }
  if (import.meta.env.DEV) window.superdaddio = app;

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
    renderer.render(app.stage);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot().catch((error) => {
  console.error(error);
  const status = document.getElementById('status');
  if (status) status.textContent = `Failed to start: ${error.message}`;
});
