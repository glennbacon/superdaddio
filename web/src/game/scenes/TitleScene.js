// Title screen: the hero paces under the logo and head-butts it every few seconds.

import { Group, Image, Sprite, Text } from '../../engine/display.js';

const seq = (start, count, time, loop = 0) => ({ start, count, time, loop });

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

    const background = new Image('images/titlescreen.png', 900, 600);
    background.x = 400;
    background.y = 240;
    this.view.insert(background);

    this.startLabel = new Text('Tap to Start', 24);
    this.startLabel.x = 400;
    this.startLabel.y = 410;
    this.view.insert(this.startLabel);

    this.block = new Image('images/superdaddioblock.png', 613, 141);
    this.block.x = 400;
    this.block.y = 100;
    this.view.insert(this.block);

    this.hero = new Sprite({ image: 'images/hugeherosheet.png', frameWidth: 256, frameHeight: 256 }, { heroRunningRight: seq(2, 3, 400), heroRunningLeft: seq(7, 3, 400) });
    this.hero.prepare('heroRunningRight');
    this.hero.state = 'heroRunningRight';
    this.view.insert(this.hero);
    this.hero.x = 400;
    this.hero.y = 300;
    this.hero.play();
  }

  enterFrame() {
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
