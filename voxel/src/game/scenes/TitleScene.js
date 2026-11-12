// Title screen: the hero paces under the logo and head-butts it every few seconds.
//
// Unlike the original's painted backdrop, this one is a small 3D set made of level scenery.

import { Group, Image, Ref, Sprite, Text } from '../../engine/display.js';

const seq = (start, count, time, loop = 0) => ({ start, count, time, loop });

/** Where the hero's feet are: the top of the ground. */
const GROUND = 392;

export class TitleScene {
  constructor(app) {
    this.app = app;
    this.clock = app.clock;
    this.audio = app.audio;
    this.view = new Group();
    this.blinkCounter = 0;
    this.jumpCounter = 0;
    this.running = true;

    const audioSettings = app.save.loadBox('audioSetting');
    audioSettings.storeIfNew('musicOn', 'true');
    audioSettings.storeIfNew('soundOn', 'true');
    audioSettings.save();
    this.audio.setVolume(audioSettings.retrieve('soundOn') === 'false' ? 0.0 : 1.0);

    // The original title was one painted picture: sky, a strip of grass and a strip of earth. Here
    // it is built from the game's own pieces, so the hero paces across a real patch of level.
    const sky = new Image('images/background.png', 900, 600);
    sky.layer = 'sky';
    this.view.insert(sky);

    const far2 = new Group();
    far2.layer = 'far2';
    const far1 = new Group();
    far1.layer = 'far1';
    const world = new Group();
    world.layer = 'world';
    const front = new Group();
    front.layer = 'front';
    for (const group of [far2, far1, world]) this.view.insert(group);

    const tiles = (group, layer, offset) => {
      for (let k = -3; k <= 3; k++) {
        const tile = new Image(`images/world1p${layer}${'abc'[((k % 3) + 3) % 3]}.png`, 800, 480);
        tile.x = 400 + 800 * k + offset;
        tile.y = 240;
        group.insert(tile);
      }
    };
    tiles(far1, 1, 0);
    tiles(far2, 2, -110);

    const scenery = (group, name, width, height, x, top) => {
      const image = new Image(`images/${name}.png`, width, height);
      image.setReferencePoint(Ref.TopCenter);
      image.x = x;
      image.y = top;
      return group.insert(image);
    };
    this.clouds = [scenery(world, 'cloud', 300, 100, 150, 150), scenery(world, 'cloud', 180, 60, 760, 60)];
    scenery(world, 'hill', 424, 180, 640, GROUND - 170);
    scenery(world, 'tree', 178, 200, 60, GROUND - 190);
    scenery(world, 'bush', 128, 80, 330, GROUND - 70);
    scenery(world, 'platform1', 2600, 400, 400, GROUND);
    scenery(front, 'yellowflower', 27, 48, 210, GROUND - 40);
    scenery(front, 'redflower', 27, 48, 545, GROUND - 40);
    scenery(front, 'pinkflower', 27, 48, 600, GROUND - 40);
    scenery(front, 'bush2', 128, 80, 800, GROUND - 70);
    world.insert(front);

    this.startLabel = new Text('Tap to Start', 24);
    this.startLabel.x = 400;
    this.startLabel.y = 414;
    this.view.insert(this.startLabel);

    if (app.controlsHint) {
      const hint = new Text(app.controlsHint, 14);
      hint.x = 400;
      hint.y = 444;
      this.view.insert(hint);
    }

    const copyright = new Text('Copyright (C) 2012  Glenn Bacon. All rights reserved.', 16);
    copyright.x = 400;
    copyright.y = 466;
    this.view.insert(copyright);

    this.block = new Image('images/superdaddioblock.png', 613, 141);
    this.block.x = 400;
    this.block.y = 92;
    world.insert(this.block);

    this.hero = new Sprite({ image: 'images/hugeherosheet.png', frameWidth: 256, frameHeight: 256 }, { heroRunningRight: seq(2, 3, 400), heroRunningLeft: seq(7, 3, 400) });
    this.hero.prepare('heroRunningRight');
    this.hero.state = 'heroRunningRight';
    world.insert(this.hero);
    front.toFront();
    this.hero.x = 400;
    this.hero.y = 300;
    this.hero.play();
  }

  /** For the renderer: a bright day, with the camera drifting slowly from side to side. */
  renderHints() {
    return { env: { isDay: true }, sway: true };
  }

  enterFrame() {
    for (const cloud of this.clouds) {
      cloud.x = cloud.x - 0.3;
      if (cloud.x < -500) cloud.x = 1300;
    }
    if (!this.running) return;
    const hero = this.hero;

    // pace between x = 100 and x = 700
    if (hero.state === 'heroRunningLeft' && hero.x > 100) hero.x = hero.x - 5;
    if (hero.state === 'heroRunningLeft' && hero.x === 100) this._turn('heroRunningRight', 5);
    if (hero.state === 'heroRunningRight' && hero.x < 700) hero.x = hero.x + 5;
    if (hero.state === 'heroRunningRight' && hero.x === 700) this._turn('heroRunningLeft', -5);

    // blink "Tap to Start"
    const n = this.blinkCounter;
    if (this.startLabel.alpha === 0 && (n === 20 || n === 80)) this.startLabel.alpha = 1;
    if (this.startLabel.alpha === 1 && (n === 0 || n === 50)) this.startLabel.alpha = 0;
    this.blinkCounter = n === 100 ? 0 : n + 1;

    // every 230 frames he jumps, and the logo bounces as if he hit it
    if (this.jumpCounter === 230) {
      this.jumpCounter = 0;
      this.clock.transitionTo(hero, { time: 150, y: hero.y - 60, onComplete: () => this.clock.transitionTo(hero, { time: 100, y: hero.y + 60 }) });
      this.clock.performWithDelay(140, () => {
        this.clock.transitionTo(this.block, { time: 170, y: this.block.y - 80, onComplete: () => this.clock.transitionTo(this.block, { time: 110, y: this.block.y + 80 }) });
      });
    } else {
      this.jumpCounter += 1;
    }
  }

  _turn(state, step) {
    this.hero.x = this.hero.x + step;
    this.hero.prepare(state);
    this.hero.state = state;
    this.hero.play();
  }

  _start() {
    if (!this.running) return;
    this.running = false;
    this.hero.pause();
    this.audio.play('coinsound');
    const loading = new Text('Loading menu...', 32);
    loading.x = 400;
    loading.y = 370;
    this.view.insert(loading);
    this.clock.performWithDelay(800, () => {
      this.audio.stop();
      this.app.gotoScene('selectworld');
    });
  }

  onTouch(event) {
    if (event.phase === 'ended' || event.phase === 'cancelled') this._start();
  }

  onKey({ phase, action }) {
    if (phase === 'down' && (action === 'confirm' || action === 'jump')) this._start();
  }

  destroy() {
    this.view.removeSelf();
  }
}
