// The numbers that define how the game feels: masses, gravity, running, jumping.
//
// Expected values are derived from the original game's constants (forces in newtons, 100 px per
// metre, gravity 15 m/s^2, one 1/60 s step per frame), not from what the port happens to do.

import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestLevel, call, ground } from './helpers.js';
import { spawnBigHero } from '../src/game/level/hero.js';
import { Image } from '../src/engine/display.js';
import { Physics, POSITION_ITERATIONS, VELOCITY_ITERATIONS } from '../src/engine/physics.js';

const DT = 1 / 60;
const GRAVITY = 1500; // px/s^2
const HERO_MASS = 0.0231; // kg: 385 px^2 hexagon x density 0.6
const near = (actual, expected, tolerance, message) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected} +/- ${tolerance}, got ${actual}`);

function settle(game) {
  game.runUntil(() => game.hero.state2 === 'ready', 300);
  game.run(5);
}

// Engine defaults, as found in the engine's own source (Solar2D: librtt/Rtt_PhysicsWorld.cpp and
// Rtt_LuaLibPhysics.cpp). Its documentation says otherwise on both counts.

test('the solver runs 8 velocity and 3 position iterations per step', () => {
  assert.equal(VELOCITY_ITERATIONS, 8);
  assert.equal(POSITION_ITERATIONS, 3);
});

test('a material without friction or bounce has none, and zero density becomes 0.01', () => {
  const physics = new Physics();
  const fixtureOf = (material) => {
    const box = new Image('images/crackedblock.png', 100, 100);
    return physics.addBody(box, 'dynamic', material).b2.getFixtureList();
  };
  const bare = fixtureOf({ friction: 0.5 });
  assert.deepEqual([bare.getDensity(), bare.getFriction(), bare.getRestitution()], [0.01, 0.5, 0]);
  const weightless = fixtureOf({ density: 0, friction: 0.2, bounce: 0 });
  near(weightless.getBody().getMass(), 0.01, 1e-9, 'mass of a 1 m square of density 0.01');
  const none = fixtureOf(undefined);
  assert.deepEqual([none.getDensity(), none.getFriction(), none.getRestitution()], [0.01, 0.3, 0.5]);
});

test('the heroes weigh what their shapes and densities imply', () => {
  const game = startTestLevel();
  near(game.hero.body.b2.getMass(), 0.0231, 1e-6, 'small hero mass (kg)');
  Object.assign(game.level.temp, { heroX: 600, heroY: 400 });
  const big = spawnBigHero(game.level);
  near(big.body.b2.getMass(), 649e-4 * 0.35, 1e-6, 'big hero mass (kg)');
});

test('free fall follows gravity of 15 m/s^2 at 100 px per metre', () => {
  const game = startTestLevel({ heroY: -2000 });
  const y0 = game.hero.y;
  const v0 = game.hero.getLinearVelocity()[1];
  game.run(30);
  // semi-implicit Euler, as Box2D integrates: y += v*dt after v += g*dt
  let v = v0;
  let y = y0;
  for (let i = 0; i < 30; i++) {
    v += GRAVITY * DT;
    y += v * DT;
  }
  near(game.hero.y, y, 0.01, 'height after 30 frames of falling');
});

test('the hero stands on the ground surface', () => {
  const game = startTestLevel();
  settle(game);
  game.run(60);
  // The small hero's lowest point is 12px below his centre and the ground surface is at y = 480.
  // Box2D rests polygons on a thin collision margin, which at this scale is a 1.5px gap.
  near(game.hero.y + 12, 478.5, 0.5, 'bottom of the hero');
  assert.equal(game.hero.state2, 'ready');
});

test('running settles around 180 px/s, 260 px/s with the action button held', () => {
  const game = startTestLevel();
  settle(game);
  game.press('right');
  game.run(120);
  let x0 = game.hero.x;
  game.run(120);
  near((game.hero.x - x0) / 2, 190, 15, 'average running speed (px/s)');
  assert.equal(game.hero.state, 'heroRunningRight');

  game.press('action');
  game.run(120);
  x0 = game.hero.x;
  game.run(120);
  near((game.hero.x - x0) / 2, 270, 15, 'average speed with action held (px/s)');
});

test('letting go of a direction stops the hero and leaves him facing that way', () => {
  const game = startTestLevel();
  settle(game);
  game.press('left');
  game.run(60);
  assert.ok(game.hero.getLinearVelocity()[0] < -150, 'running left');
  game.release('left');
  assert.equal(game.hero.state, 'heroFacingLeft');
  game.run(45);
  near(game.hero.getLinearVelocity()[0], 0, 1, 'speed shortly after release');
});

/** The jump rule, integrated on its own: push 0.8 N up while rising slower than 300 px/s and below the cut-off. */
function referenceJump(holdFrames, maxRise = 80) {
  let rise = 0;
  let speed = 0; // px/s, upward
  let pushing = true;
  let apex = 0;
  for (let frame = 0; frame < 600; frame++) {
    if (frame >= holdFrames || rise > maxRise) pushing = false;
    const force = pushing && speed < 300 && rise < maxRise ? 0.8 : 0;
    speed += ((force / HERO_MASS) * 100 - GRAVITY) * DT;
    rise += speed * DT;
    apex = Math.max(apex, rise);
    if (rise <= 0 && frame > 2) break;
  }
  return apex;
}

function measureJump(game, holdFrames) {
  settle(game);
  const y0 = game.hero.y;
  let top = y0;
  game.press('jump');
  for (let frame = 0; frame < 240; frame++) {
    if (frame === holdFrames) game.release('jump');
    game.run(1);
    top = Math.min(top, game.hero.y);
    if (frame > holdFrames && game.hero.state2 === 'ready') break;
  }
  return y0 - top;
}

test('a held jump rises about 110 px: 80 px of push, then the hero coasts', () => {
  const game = startTestLevel();
  const rise = measureJump(game, 120);
  near(rise, referenceJump(120), 1.5, 'jump height against the reference model');
  near(rise, 110, 4, 'jump height (px)');
});

test('jump height depends on how long the button is held', () => {
  for (const hold of [3, 6, 10, 15]) {
    const game = startTestLevel();
    const rise = measureJump(game, hold);
    near(rise, referenceJump(hold), 1.5, `jump height when held for ${hold} frames`);
  }
});

test('holding action raises the jump cut-off from 80 to 100 px', () => {
  const game = startTestLevel();
  settle(game);
  game.press('action');
  const rise = measureJump(game, 120);
  near(rise, referenceJump(120, 100), 1.5, 'jump height with action held');
});

test('the hero cannot jump again until he lands', () => {
  const game = startTestLevel();
  settle(game);
  game.press('jump');
  game.run(10);
  game.release('jump');
  assert.equal(game.hero.state2, 'falling');
  game.run(1); // the push applied in the last frame of the jump still takes effect in this step
  const vy = game.hero.getLinearVelocity()[1];
  game.press('jump');
  game.run(2);
  assert.equal(game.hero.state2, 'falling', 'second press in mid-air is ignored');
  near(game.hero.getLinearVelocity()[1], vy + 2 * GRAVITY * DT, 0.01, 'no extra push: only gravity acts on him');
  game.release('jump');
});

test('the level clock loses one unit every 400 ms while the level runs', () => {
  const game = startTestLevel();
  assert.equal(game.gs.timeLeft, 300);
  game.run(240); // 4 seconds
  near(game.gs.timeLeft, 290, 1, 'time left after 4 seconds');
});

test('pausing freezes the world; resuming continues it', () => {
  const game = startTestLevel({ heroY: -500 });
  game.run(10);
  game.press('pause');
  assert.equal(game.gs.state, 2);
  const y = game.hero.y;
  const time = game.gs.timeLeft;
  game.run(120);
  assert.equal(game.hero.y, y, 'hero does not move while paused');
  assert.equal(game.gs.timeLeft, time, 'clock does not run while paused');
  game.press('pause');
  assert.equal(game.gs.state, 1);
  game.run(10);
  assert.ok(game.hero.y > y, 'falling again after resume');
});

test('a moving platform carries the hero up and down', () => {
  // platform top starts at y = 400 and travels 100 px up; the hero is dropped onto it
  const game = startTestLevel({ ops: [call('spawnMoveUpPlatform', [300, 400, 100, 128], 'lift')], updates: ['lift'], heroX: 300, heroY: 380 });
  const lift = game.level.obj.lift;
  game.run(40);
  near(game.hero.y + 12, lift.y, 2.5, 'hero stands on the platform');
  const y0 = lift.y;
  game.run(40);
  near(lift.y, y0 - 40, 1.01, 'platform moves one pixel per frame');
  near(game.hero.y + 12, lift.y, 2.5, 'hero rides along');
  game.run(200); // up to the top and partway back down
  near(game.hero.y + 12, lift.y, 2.5, 'still riding after the platform reversed');
  assert.ok(lift.y >= 299 && lift.y <= 401);
});

test('a platform can be jumped through from below and landed on', () => {
  const game = startTestLevel({ ops: [call('spawnPlatform', [300, 400, 128])], heroX: 300 });
  settle(game);
  game.press('jump');
  game.run(40);
  game.release('jump');
  game.runUntil(() => game.hero.state2 === 'ready', 240);
  near(game.hero.y + 12, 400, 2, 'hero ends up standing on top of the platform');
});

test('the rope bridge holds the hero', () => {
  // the gap in the floor is spanned only by the bridge
  const game = startTestLevel({
    flat: false,
    ops: [ground(0, 800), ground(1060, 800), call('spawnBridge', [402, 490, 10])],
    heroX: 300,
  });
  settle(game);
  game.press('right');
  let lowest = 0;
  for (let i = 0; i < 420 && game.hero.x < 720; i++) {
    game.run(1);
    lowest = Math.max(lowest, game.hero.y);
    assert.equal(game.app.scene, game.level, 'hero is still alive');
  }
  assert.ok(game.hero.x >= 720, `crossed the bridge (reached x=${game.hero.x})`);
  assert.ok(lowest < 510, `bridge sagged only slightly under the hero (lowest y=${lowest})`);
});

test('a springboard launches the hero well above a normal jump', () => {
  const game = startTestLevel({ ops: [call('spawnSpringBoard', [300, 440, 10], 'spring')], heroX: 300, heroY: 300 });
  let top = Infinity;
  for (let i = 0; i < 300; i++) {
    game.run(1);
    top = Math.min(top, game.hero.y);
  }
  assert.ok(480 - top > 250, `launched ${Math.round(480 - top)} px above the ground`);
});
