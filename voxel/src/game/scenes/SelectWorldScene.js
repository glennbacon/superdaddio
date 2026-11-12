// World select: nine worlds side by side, one per screen, with a row of stage buttons each.
// Stages unlock one at a time as doors and boss keys are reached.

import { Group, Image, Text } from '../../engine/display.js';

const WORLDS = 9;
const STAGES_PER_WORLD = [7, 7, 7, 7, 7, 7, 7, 7, 4];
const PAGE_WIDTH = 800;

const inside = (event, x1, x2, y1, y2) => event.x >= x1 && event.x <= x2 && event.y >= y1 && event.y <= y2;

export class SelectWorldScene {
  constructor(app) {
    this.app = app;
    this.clock = app.clock;
    this.audio = app.audio;
    this.view = new Group();
    /** "ready" | "sliding" | "credits" | "leaving" */
    this.mode = 'ready';
    this.world = 0; // index of the world on screen

    const worldUnlocked = (this.worldUnlocked = app.save.loadBox('worldUnlocked'));
    worldUnlocked.storeIfNew('loadlevel', 'level1_1');
    for (let world = 1; world <= WORLDS; world++) {
      for (let stage = 1; stage <= 7; stage++) worldUnlocked.storeIfNew(`world${world}_${stage}`, world === 1 && stage === 1 ? 'true' : 'false');
    }
    worldUnlocked.save();

    const audioSettings = (this.audioSettings = app.save.loadBox('audioSetting'));
    audioSettings.storeIfNew('musicOn', 'true');
    audioSettings.storeIfNew('soundOn', 'true');
    audioSettings.save();
    this.audio.setVolume(audioSettings.retrieve('soundOn') === 'false' ? 0.0 : 1.0);

    const image = (group, name, x, y, w, h) => {
      const o = new Image(`images/${name}.png`, w, h);
      o.x = x;
      o.y = y;
      return group.insert(o);
    };
    const text = (group, string, size, x, y) => {
      const o = new Text(string, size);
      o.x = x;
      o.y = y;
      return group.insert(o);
    };

    const backdrop = new Group();
    image(backdrop, 'background2', 400, 240, 800, 480);
    text(backdrop, 'Select World', 50, 400, 100);

    // the strip of worlds that slides left and right
    this.pages = new Group();
    for (let world = 1; world <= WORLDS; world++) {
      const pageX = (world - 1) * PAGE_WIDTH;
      image(this.pages, `world${world}screenshot`, pageX + 400, 250, 400, 200);
      text(this.pages, String(world), 50, pageX + 650, 100);
      for (let stage = 1; stage <= STAGES_PER_WORLD[world - 1]; stage++) {
        const unlocked = this._isUnlocked(world, stage);
        image(this.pages, unlocked ? `${stage}button` : 'lockbutton', pageX + 75 + (stage - 1) * 110, 420, 100, 100);
      }
    }

    const hud = new Group();
    image(hud, 'leftbuttonup', 100, 260, 100, 100);
    image(hud, 'rightbuttonup', 700, 260, 100, 100);
    this.musicOn = image(hud, 'musicbutton', 750, 150, 80, 80);
    this.volumeOn = image(hud, 'volumebutton', 50, 150, 80, 80);
    this.musicOff = image(hud, 'musicbutton2', 750, 150, 80, 80);
    this.volumeOff = image(hud, 'volumebutton2', 50, 150, 80, 80);
    image(hud, 'ibutton', 140, 150, 80, 80);
    this.loadingLabel = text(hud, 'Loading level...', 32, 400, 370);
    this.loadingLabel.alpha = 0;

    this.credits = new Group();
    image(this.credits, 'creditsbox', 0, 0, 350, 250);
    this.credits.x = 400;
    this.credits.y = -500;

    for (const group of [backdrop, this.pages, hud, this.credits]) this.view.insert(group);
    this._showToggles();
  }

  _isUnlocked(world, stage) {
    return (world === 1 && stage === 1) || this.worldUnlocked.retrieve(`world${world}_${stage}`) === 'true';
  }

  _showToggles() {
    const sound = this.audioSettings.retrieve('soundOn') === 'true';
    const music = this.audioSettings.retrieve('musicOn') === 'true';
    this.volumeOn.alpha = sound ? 1 : 0;
    this.volumeOff.alpha = sound ? 0 : 1;
    this.musicOn.alpha = music ? 1 : 0;
    this.musicOff.alpha = music ? 0 : 1;
  }

  enterFrame() {}

  _slide(step) {
    const target = this.world + step;
    if (this.mode !== 'ready' || target < 0 || target >= WORLDS) return;
    this.world = target;
    this.mode = 'sliding';
    this.audio.play('clicksound');
    this.clock.transitionTo(this.pages, { time: 400, x: -target * PAGE_WIDTH, onComplete: () => (this.mode = 'ready') });
  }

  _choose(stage) {
    const world = this.world + 1;
    if (this.mode !== 'ready' || stage > STAGES_PER_WORLD[this.world] || !this._isUnlocked(world, stage)) return;
    this.mode = 'leaving';
    this.loadingLabel.alpha = 1;
    this.worldUnlocked.store('loadlevel', `level${world}_${stage}`);
    this.worldUnlocked.save();
    this.audio.play('coinsound');
    this.clock.performWithDelay(800, () => {
      this.audio.stop();
      this.app.gotoScene('level');
    });
  }

  _toggleMusic() {
    const on = this.audioSettings.retrieve('musicOn') === 'true';
    this.audioSettings.store('musicOn', on ? 'false' : 'true');
    this.audioSettings.save();
    this._showToggles();
    this.audio.play('clicksound');
  }

  _toggleSound() {
    const on = this.audioSettings.retrieve('soundOn') === 'true';
    this.audioSettings.store('soundOn', on ? 'false' : 'true');
    this.audioSettings.save();
    this._showToggles();
    this.audio.setVolume(on ? 0.0 : 1.0);
    if (!on) this.audio.play('clicksound');
  }

  _openCredits() {
    if (this.mode !== 'ready') return;
    this.mode = 'credits';
    this.audio.play('clicksound');
    this.clock.transitionTo(this.credits, { time: 400, y: 240 });
  }

  _closeCredits() {
    if (this.credits.y !== 240) return; // still sliding in
    this.audio.play('clicksound');
    this.clock.transitionTo(this.credits, { time: 400, y: -500 });
    this.mode = 'ready';
  }

  onTouch(event) {
    if (event.phase !== 'ended') return;
    if (this.mode === 'credits') {
      this._closeCredits();
      return;
    }
    if (this.mode !== 'ready') return;
    if (inside(event, 50, 150, 201, 300)) this._slide(-1);
    else if (inside(event, 650, 750, 201, 300)) this._slide(1);
    else if (inside(event, 700, 800, 101, 200)) this._toggleMusic();
    else if (inside(event, 0, 90, 101, 200)) this._toggleSound();
    else if (inside(event, 91, 190, 101, 200)) this._openCredits();
    else if (event.y >= 370 && event.y <= 480) {
      for (let stage = 1; stage <= 7; stage++) {
        const left = 25 + (stage - 1) * 110;
        if (event.x >= left && event.x <= left + 100) this._choose(stage);
      }
    }
  }

  onKey({ phase, action }) {
    if (phase !== 'down') return;
    if (this.mode === 'credits') {
      this._closeCredits();
      return;
    }
    if (action === 'left') this._slide(-1);
    else if (action === 'right') this._slide(1);
    else if (action === 'confirm' || action === 'jump') {
      // start the furthest stage reached in this world
      const world = this.world + 1;
      for (let stage = STAGES_PER_WORLD[this.world]; stage >= 1; stage--) {
        if (this._isUnlocked(world, stage)) {
          this._choose(stage);
          break;
        }
      }
    }
  }

  destroy() {
    this.view.removeSelf();
  }
}
