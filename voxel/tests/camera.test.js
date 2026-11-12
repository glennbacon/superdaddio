// The camera, and the order things happen in within one frame.
//
// The original engine runs a frame as: physics step (collision handlers run inside it), then the
// game's per-frame code, then timers and tweens, then it draws. The camera depends on that order
// twice over: the game's code must see where the hero is *after* the step, and a tween on the view
// must have the last word over the game's own camera code.

import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestLevel, brick } from './helpers.js';
import { Clock, FRAME_MS } from '../src/engine/clock.js';

const near = (actual, expected, tolerance, message) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected} +/- ${tolerance}, got ${actual}`);
const HERO_SCREEN_Y = 330;
const cameraY = (game) => game.level.groups.game.y;
const cameraX = (game) => game.level.groups.game.x;

function settle(game) {
  game.runUntil(() => game.hero.state2 === 'ready', 300);
  game.run(5);
}

/** A row of bricks 70 px above the floor, and a hero who runs and jumps up onto it. */
function jumpOntoBricks() {
  const bricks = [];
  for (let i = 0; i < 6; i++) bricks.push(brick(520 + i * 32, 410));
  const game = startTestLevel({ ops: bricks, heroX: 400 });
  settle(game);
  game.run(60);
  game.press('right');
  game.run(12);
  game.press('jump');
  game.run(30);
  game.release('jump');
  game.run(15);
  game.release('right');
  return game;
}

test('landing on a higher platform eases the view up over about a third of a second', () => {
  const game = jumpOntoBricks();
  const before = cameraY(game);
  const landed = game.runUntil(() => game.hero.state2 === 'ready', 120);
  assert.ok(landed >= 0, 'the hero landed');
  near(game.hero.y + 12, 410 - 1.5, 0.6, 'standing on the bricks');

  let biggestStep = 0;
  let framesToArrive = -1;
  let previous = cameraY(game);
  for (let frame = 1; frame <= 60; frame++) {
    game.run(1);
    const now = cameraY(game);
    biggestStep = Math.max(biggestStep, Math.abs(now - previous));
    previous = now;
    if (framesToArrive < 0 && Math.abs(now - -(game.hero.y - HERO_SCREEN_Y)) < 0.01) framesToArrive = frame;
  }
  const travelled = cameraY(game) - before;
  near(travelled, 70, 1, 'the view ends up 70 px higher');
  // the original asks for a 350 ms glide: 21 frames, so about 3.3 px a frame
  assert.ok(biggestStep < 5, `the view never jumps (largest single-frame move was ${biggestStep.toFixed(2)} px)`);
  assert.ok(framesToArrive >= 19 && framesToArrive <= 23, `the glide takes about 21 frames (took ${framesToArrive})`);
  near(game.hero.y + cameraY(game), HERO_SCREEN_Y, 0.01, 'afterwards the hero is back at his usual height on screen');
});

test('the view is locked to the hero while he falls', () => {
  // dropped from high up: he is below where his "jump" began, so the view follows him down
  const game = startTestLevel({ heroY: -600 });
  game.run(5);
  for (let frame = 0; frame < 30; frame++) {
    game.run(1);
    assert.ok(game.hero.getLinearVelocity()[1] > 100, 'falling');
    near(game.hero.y + cameraY(game), HERO_SCREEN_Y, 1e-6, `hero's height on screen in frame ${frame}`);
  }
});

test('the view is locked to the hero while he runs right', () => {
  const game = startTestLevel();
  settle(game);
  game.press('right');
  game.run(60);
  for (let frame = 0; frame < 30; frame++) {
    game.run(1);
    near(game.hero.x + cameraX(game), 450, 1e-6, `hero's place on screen in frame ${frame}`);
  }
});

// --- tweens and timers, as the original engine's libraries behave ---------------------------------

/** Runs one frame of a bare clock the way App.tick does, with `logic` standing in for the game's code. */
function frame(clock, logic = () => {}) {
  clock.beginFrame();
  logic();
  clock.update();
}

test('a tween starts from the value its target had when it was created', () => {
  const clock = new Clock();
  const target = { y: 100 };
  frame(clock, () => {
    clock.transitionTo(target, { time: 10 * FRAME_MS, y: 200 });
    target.y = 180; // game code moves it afterwards, in the same frame
  });
  near(target.y, 100, 1e-9, 'creation frame: back at the starting value');
  frame(clock);
  near(target.y, 110, 1e-6, 'one frame later');
  for (let i = 0; i < 4; i++) frame(clock);
  near(target.y, 150, 1e-6, 'halfway');
});

test('a tween has the last word over game code that writes the same property', () => {
  const clock = new Clock();
  const target = { y: 0 };
  clock.transitionTo(target, { time: 10 * FRAME_MS, y: 100 });
  for (let i = 1; i <= 9; i++) {
    frame(clock, () => (target.y = 100));
    near(target.y, i * 10, 1e-6, `frame ${i}`);
  }
  for (let i = 0; i < 3; i++) frame(clock);
  assert.equal(target.y, 100, 'ends exactly on the end value');
});

test('a tween calls onStart at once and onComplete when it ends', () => {
  const clock = new Clock();
  const log = [];
  clock.transitionTo({ x: 0 }, { time: 2 * FRAME_MS, x: 1, onStart: () => log.push('start'), onComplete: () => log.push('complete') });
  assert.deepEqual(log, ['start']);
  for (let i = 0; i < 4; i++) frame(clock);
  assert.deepEqual(log, ['start', 'complete']);
});

test('a timer never fires in the frame that created it', () => {
  const clock = new Clock();
  let fired = 0;
  frame(clock, () => clock.performWithDelay(0, () => (fired += 1)));
  assert.equal(fired, 0, 'not in the same frame');
  frame(clock);
  assert.equal(fired, 1, 'in the next one');
  frame(clock);
  assert.equal(fired, 1, 'and only once');
});
