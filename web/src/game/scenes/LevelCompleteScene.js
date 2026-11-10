// Level complete: the remaining time is counted down into bonus points, 100 per unit, one per frame.

import { Group, Image, Ref, Text } from '../../engine/display.js';

export class LevelCompleteScene {
  constructor(app) {
    this.app = app;
    this.clock = app.clock;
    this.audio = app.audio;
    this.gs = app.gameState;
    this.view = new Group();
    this.timeLeft = this.gs.timeLeftTotal;
    this.bonus = 0;
    this.leaving = false;

    const background = new Image('images/levelcomplete.png', 800, 480);
    background.x = 400;
    background.y = 240;
    this.view.insert(background);

    const label = (text, x, y) => {
      const t = new Text(text, 28);
      t.setReferencePoint(Ref.CenterLeft);
      t.x = x;
      t.y = y;
      return this.view.insert(t);
    };
    label('Time', 250, 200);
    this.timeNum = label('0', 430, 200);
    label('X  100', 510, 200);
    label('Bonus', 250, 250);
    this.bonusNum = label('0', 430, 250);
    label('Score', 250, 300);
    this.scoreNum = label('0', 430, 300);

    this.continueButton = new Image('images/rightbuttonup.png', 100, 100);
    this.continueButton.x = 50;
    this.continueButton.y = 120;
    this.continueButton.alpha = 0;
    this.view.insert(this.continueButton);

    this.loadingLabel = new Text('Loading level...', 32);
    this.loadingLabel.alpha = 0;
    this.loadingLabel.x = 400;
    this.loadingLabel.y = 370;
    this.view.insert(this.loadingLabel);

    if (this.timeLeft === 0) {
      this._tally();
    } else {
      this.audio.play('addscoresound', { channel: 1, loop: true });
      this.clock.performWithDelay(2, () => this._tally(), this.gs.timeLeftTotal + 1);
    }
  }

  _tally() {
    this.timeNum.text = this.timeLeft;
    this.bonusNum.text = this.bonus;
    this.gs.gameScore += 100;
    this.scoreNum.text = this.gs.gameScore;
    if (this.timeLeft === 0) {
      this.audio.stop();
      this.audio.play('tallydonesound');
      this.continueButton.alpha = 1;
    }
    this.timeLeft -= 1;
    this.bonus += 100;
  }

  enterFrame() {}

  _continue() {
    if (this.leaving || this.continueButton.alpha !== 1) return;
    this.leaving = true;
    this.audio.play('coinsound');
    this.loadingLabel.alpha = 1;
    this.clock.performWithDelay(2000, () => this.app.gotoScene('level'));
  }

  onTouch(event) {
    if (event.phase === 'ended' && event.x >= 0 && event.x <= 100 && event.y >= 70 && event.y <= 170) this._continue();
  }

  onKey({ phase, action }) {
    if (phase === 'down' && (action === 'confirm' || action === 'jump' || action === 'right')) this._continue();
  }

  destroy() {
    this.view.removeSelf();
  }
}
