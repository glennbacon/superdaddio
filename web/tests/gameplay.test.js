// Game rules, exercised in small hand-made levels: scoring, power-ups, enemies, blocks, bosses,
// winning and losing. Scores and thresholds are the original game's.

import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestLevel, call, brick, image } from './helpers.js';
import * as spawn from '../src/game/level/spawn.js';

const near = (actual, expected, tolerance, message) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected} +/- ${tolerance}, got ${actual}`);
const played = (game, sound) => game.app.audio.played.includes(sound);
const settle = (game) => {
  game.runUntil(() => game.hero.state2 === 'ready', 300);
  game.run(5);
};
const objectsNamed = (game, name) => {
  const found = [];
  for (let b = game.app.physics.world.getBodyList(); b; b = b.getNext()) {
    const o = b.getUserData().object;
    if (o.myName === name && !o.removed) found.push(o);
  }
  return found;
};

/** Drops the hero onto an object from just above it. */
function dropOnto(game, target, height = 50) {
  game.placeHero(target.x, target.y - height);
}

/** Makes the small hero big, the way picking up an apple does. */
function growBig(game) {
  spawn.spawnApplePowerup(game.level, game.hero.x, game.hero.y - 20);
  game.runUntil(() => game.gs.heroSize === 'big', 240);
  assert.equal(game.gs.heroSize, 'big');
  game.runUntil(() => game.hero.state2 === 'ready', 240);
}

test('coins are worth 200 points', () => {
  const game = startTestLevel({ ops: [call('coinPattern', [400, 455, 5])], heroX: 300 });
  settle(game);
  game.press('right');
  game.run(90);
  assert.equal(game.gs.gameCoins, 3);
  assert.equal(game.gs.gameScore, 600);
  assert.equal(objectsNamed(game, 'coin').length, 0, 'collected coins are gone');
  assert.ok(played(game, 'coinsound'));
});

test('stomping an enemy defeats it, scores, and bounces the hero', () => {
  const game = startTestLevel({ ops: [call('spawnOrangeBadGuy', [500, 460], 'guy')], updates: ['guy'] });
  settle(game);
  const guy = game.level.obj.guy;
  dropOnto(game, guy);
  game.runUntil(() => guy.removed, 120);
  assert.ok(guy.removed, 'enemy removed');
  assert.equal(game.gs.gameScore, 100);
  game.run(2);
  assert.ok(game.hero.getLinearVelocity()[1] < -100, 'hero bounces up');
  assert.equal(game.gs.heroSize, 'small', 'hero unharmed');
});

test('each enemy is worth its original score when stomped', () => {
  const cases = [
    ['spawnOrangeBadGuy', [500, 460], 100],
    ['spawnSmallDragon', [500, 440], 300],
    ['spawnSnake', [500, 440], 250],
    ['spawnGreenBug', [500, 460], 400],
    ['spawnOrangeJumpyBadGuy', [500, 460], 200],
    ['spawnPurpleFlyBadGuy', [500, 460, 400, 460, 600, 460, 'hop'], 500],
  ];
  for (const [fn, args, score] of cases) {
    const game = startTestLevel({ ops: [call(fn, args, 'enemy')], updates: ['enemy'] });
    game.run(20);
    const enemy = game.level.obj.enemy;
    dropOnto(game, enemy, 60);
    game.runUntil(() => enemy.removed, 180);
    assert.ok(enemy.removed, `${fn} can be stomped`);
    assert.equal(game.gs.gameScore, score, `${fn} score`);
  }
});

test('the hero is invulnerable for the first 3.5 seconds of a level', () => {
  const game = startTestLevel({ ops: [call('spawnOrangeBadGuy', [360, 460], 'guy')], updates: ['guy'] });
  assert.equal(game.gs.noHit, true);
  game.run(150); // the enemy walks into the hero well inside the grace period
  assert.equal(game.app.scene, game.level, 'still alive');
  assert.equal(game.level.obj.guy.state, 'walkRight', 'the enemy turned around on contact');
  game.run(70);
  assert.equal(game.gs.noHit, false, 'grace period over after 211 frames');
});

test('touching an enemy from the side costs the small hero his life and restarts the level', async () => {
  const game = startTestLevel({ ops: [call('spawnOrangeBadGuy', [420, 460], 'guy')], updates: ['guy'] });
  settle(game);
  game.endGracePeriod();
  const level = game.level;
  game.runUntil(() => played(game, 'herodiesound'), 300);
  assert.ok(played(game, 'herodiesound'), 'death sound');
  assert.equal(game.app.physics.paused, true, 'the world stops while he dies');
  await game.runAsync(200); // 0.8 s of animation, 2 s pause, then the reload
  assert.notEqual(game.app.scene, level, 'a fresh copy of the level is running');
  assert.equal(game.app.sceneName, 'level');
  assert.equal(game.gs.gameScore, 0);
});

test('falling into a pit is fatal', async () => {
  const pit = image('invisableground', 600, 40, 300, 700, { name: 'deadfloor', name2: 'deadfloor', sensor: true, friction: 0, alpha: 0 });
  const game = startTestLevel({ flat: false, ops: [pit], heroX: 300, heroY: 400 });
  const level = game.level;
  game.runUntil(() => played(game, 'herodiesound'), 300);
  assert.ok(played(game, 'herodiesound'));
  await game.runAsync(200);
  assert.notEqual(game.app.scene, level, 'level restarted');
});

// --- checkpoints -----------------------------------------------------------------------------------

/** Solid ground from x = 0 to 1400 with a checkpoint flag at x = 700, then a fatal drop. */
function checkpointLevel() {
  const floor = image('platform1', 1400, 400, 700, 480, { name: 'ground', name2: 'ground' });
  const pit = image('invisableground', 1200, 40, 2000, 800, { name: 'deadfloor', name2: 'deadfloor', sensor: true, friction: 0, alpha: 0 });
  return startTestLevel({ flat: false, ops: [floor, pit, call('spawnCheckPoint', [700, 408], 'checkPoint1')], heroX: 300 });
}

/** Runs right until the hero has fallen into the pit and the level has reloaded. */
async function runIntoThePit(game) {
  const level = game.level;
  game.press('right');
  game.runUntil(() => played(game, 'herodiesound'), 900);
  assert.ok(played(game, 'herodiesound'), 'the hero died');
  game.release('right');
  game.app.audio.played.length = 0;
  await game.runAsync(200);
  assert.notEqual(game.app.scene, level, 'the level reloaded');
}

test('touching a checkpoint raises its flag', () => {
  const game = checkpointLevel();
  settle(game);
  const flag = game.level.obj.checkPoint1;
  assert.equal(flag.frame, 0, 'red flag at the bottom of the pole');
  game.press('right');
  game.runUntil(() => game.gs.checkPointReached, 300);
  assert.ok(game.gs.checkPointReached, 'reached');
  assert.ok(played(game, 'checkpointsound'));
  game.run(60);
  assert.equal(flag.frame, 13, 'green flag at the top');
});

test('dying after a checkpoint brings the hero back above it', async () => {
  const game = checkpointLevel();
  settle(game);
  await runIntoThePit(game);

  assert.equal(game.gs.heroSize, 'small');
  near(game.hero.x, 700, 1, 'hero comes back at the checkpoint');
  assert.ok(game.hero.y >= 408 && game.hero.y < 467, `...dropping in from the flag, onto the ground (y=${game.hero.y})`);
  near(game.hero.x + game.level.groups.game.x, 450, 1, 'the view is on him straight away');
  assert.equal(objectsNamed(game, 'checkPoint').length, 0, 'the flag cannot be triggered again');
  const finish = game.level.obj.checkPointFinish;
  assert.ok(finish, 'a raised green flag stands in its place');
  assert.deepEqual([finish.x, finish.y], [700, 408]);
  settle(game);
  near(game.hero.y + 12, 478.5, 0.6, 'he lands on the ground under the flag');
  assert.equal(game.gs.gameScore, 0);
  assert.ok(game.gs.timeLeft >= 297, `with a full clock (${game.gs.timeLeft})`);

  // and again: the checkpoint holds for as long as he keeps dying in this level
  await runIntoThePit(game);
  near(game.hero.x, 700, 1, 'second death: back at the checkpoint again');
});

test('dying before the checkpoint starts the level from the beginning', async () => {
  const pit = image('invisableground', 1200, 40, -600, 800, { name: 'deadfloor', name2: 'deadfloor', sensor: true, friction: 0, alpha: 0 });
  const floor = image('platform1', 1400, 400, 700, 480, { name: 'ground', name2: 'ground' });
  const game = startTestLevel({ flat: false, ops: [floor, pit, call('spawnCheckPoint', [700, 408], 'checkPoint1')], heroX: 300 });
  settle(game);
  const level = game.level;
  game.press('left');
  game.runUntil(() => played(game, 'herodiesound'), 900);
  game.release('left');
  await game.runAsync(200);
  assert.notEqual(game.app.scene, level, 'the level reloaded');
  near(game.hero.x, 300, 1, 'back at the start');
  assert.equal(objectsNamed(game, 'checkPoint').length, 1, 'the flag is still waiting');
});

test('"Restart" in the pause menu forgets the checkpoint', async () => {
  const game = checkpointLevel();
  settle(game);
  game.press('right');
  game.runUntil(() => game.gs.checkPointReached, 300);
  game.release('right');
  game.run(30);
  const level = game.level;
  game.press('pause');
  game.press('restart');
  await game.runAsync(260);
  assert.notEqual(game.app.scene, level, 'the level reloaded');
  assert.equal(game.gs.checkPointReached, false);
  near(game.hero.x, 300, 1, 'back at the start of the level');
  assert.equal(objectsNamed(game, 'checkPoint').length, 1, 'the flag is down again');
});

test('leaving for the menu forgets the checkpoint', async () => {
  const game = checkpointLevel();
  settle(game);
  game.press('right');
  game.runUntil(() => game.gs.checkPointReached, 300);
  game.release('right');
  game.press('pause');
  game.press('menu');
  await game.runAsync(200);
  assert.equal(game.app.sceneName, 'selectworld');
  assert.equal(game.gs.checkPointReached, false);
});

test('the small hero bumps bricks; a coin block pays out once', () => {
  const game = startTestLevel({ ops: [brick(300, 400, 'crackedcoinblock')], heroX: 300 });
  settle(game);
  const block = objectsNamed(game, 'crackedcoinblock')[0];
  const top = block.y;
  const jumpInto = () => {
    game.press('jump');
    game.run(20);
    game.release('jump');
    game.runUntil(() => game.hero.state2 === 'ready', 200);
    game.run(20);
  };
  jumpInto();
  assert.equal(game.gs.gameCoins, 1);
  assert.equal(game.gs.gameScore, 200);
  assert.equal(block.myName, 'crackedblock', 'now an ordinary brick');
  near(block.y, top, 0.01, 'the block settled back where it was');
  jumpInto();
  assert.equal(game.gs.gameScore, 200, 'no second coin');
  assert.ok(!block.removed, 'the small hero cannot break bricks');
  assert.ok(played(game, 'thudsound'));
});

test('a power-up block releases an apple that turns the small hero into the big hero', () => {
  const game = startTestLevel({ ops: [brick(300, 400, 'applepowerupblock')], heroX: 300 });
  settle(game);
  game.press('jump');
  game.run(20);
  game.release('jump');
  game.runUntil(() => objectsNamed(game, 'applePowerup').length === 1, 120);
  assert.equal(objectsNamed(game, 'applePowerup').length, 1, 'apple appeared');
  assert.equal(objectsNamed(game, 'applepowerupblock').length, 0, 'the block is used up');
  assert.equal(objectsNamed(game, 'crackedblock').length, 1, 'an ordinary brick took its place');
  // the apple rises 50px, then drops; put the hero under it
  const apple = objectsNamed(game, 'applePowerup')[0];
  game.runUntil(() => apple.bodyType === 'dynamic', 60);
  game.placeHero(apple.x, apple.y - 30);
  game.runUntil(() => game.gs.heroSize !== 'small', 120);
  assert.equal(game.gs.heroSize, 'nothingrightnow', 'the hero is mid-transformation');
  assert.equal(game.gs.state, 0, 'the level waits while he grows');
  game.runUntil(() => game.gs.heroSize === 'big', 120);
  assert.equal(game.gs.heroSize, 'big');
  assert.equal(game.gs.state, 1);
  assert.equal(game.gs.gameScore, 1000);
  assert.equal(game.hero.myName, 'bigHero');
});

test('the big hero smashes bricks from below for 50 points', () => {
  const game = startTestLevel({ ops: [brick(300, 380)], heroX: 300 });
  settle(game);
  growBig(game);
  const score = game.gs.gameScore;
  game.press('jump');
  game.run(20);
  game.release('jump');
  game.run(10);
  assert.equal(objectsNamed(game, 'crackedblock').length, 0, 'brick destroyed');
  assert.equal(game.gs.gameScore, score + 50);
  assert.ok(played(game, 'breakbricksound'));
  assert.equal(objectsNamed(game, 'brokenbricks').length, 7, 'seven pieces fly off');
  game.run(60);
  assert.equal(objectsNamed(game, 'brokenbricks').length, 0, 'the pieces disappear after 0.8 s');
});

test('a hit shrinks the big hero instead of killing him, and grants a grace period', () => {
  const game = startTestLevel({ ops: [call('spawnOrangeBadGuy', [900, 460], 'guy')], updates: ['guy'] });
  settle(game);
  growBig(game);
  game.endGracePeriod();
  const guy = game.level.obj.guy;
  game.placeHero(guy.x - 40, guy.y - 8);
  game.runUntil(() => game.gs.heroSize !== 'big', 200);
  assert.equal(game.gs.heroSize, 'nothingrightnow');
  assert.equal(game.gs.noHit, true);
  assert.ok(played(game, 'shrinksound'));
  game.runUntil(() => game.gs.heroSize === 'small', 60);
  assert.equal(game.gs.heroSize, 'small');
  assert.equal(game.app.scene, game.level, 'still alive');
});

test('the fire flower lets the big hero throw fireballs that defeat enemies', () => {
  const game = startTestLevel({ ops: [call('spawnOrangeBadGuy', [900, 460], 'guy')], updates: ['guy'] });
  settle(game);
  growBig(game);
  spawn.spawnFireFlowerPowerup(game.level, game.hero.x, game.hero.y - 20);
  game.runUntil(() => game.gs.firepower, 120);
  assert.equal(game.gs.firepower, true);
  const guy = game.level.obj.guy;
  game.placeHero(guy.x - 120, 458);
  game.run(5);
  const score = game.gs.gameScore;
  game.press('action');
  assert.equal(objectsNamed(game, 'fireBall').length, 1, 'a fireball is thrown');
  assert.equal(game.gs.throwFireBall, false, 'not another one right away');
  game.release('action');
  game.runUntil(() => guy.removed, 90);
  assert.ok(guy.removed, 'the fireball defeated the enemy');
  assert.equal(game.gs.gameScore, score + 100);
  game.run(30);
  assert.equal(game.gs.throwFireBall, true, 'ready again after 0.4 s');
});

test('the jetpack flies the big hero 120 px higher than a jump', () => {
  const game = startTestLevel();
  settle(game);
  growBig(game);
  spawn.spawnJetpackPowerup(game.level, game.hero.x, game.hero.y - 20);
  game.runUntil(() => game.gs.jetpack, 120);
  game.runUntil(() => game.hero.state2 === 'ready', 120);
  const y0 = game.hero.y;
  let top = y0;
  game.press('jump');
  assert.equal(game.hero.state2, 'fly');
  for (let i = 0; i < 200; i++) {
    game.run(1);
    top = Math.min(top, game.hero.y);
  }
  game.release('jump');
  assert.ok(y0 - top > 200 && y0 - top < 260, `rose ${Math.round(y0 - top)} px`);
});

test('a loose block is picked up on touch, carried, and thrown by releasing action', () => {
  const game = startTestLevel({ ops: [call('spawnThrowBrick', [380, 460], 'block'), call('spawnOrangeBadGuy', [900, 460], 'guy')], updates: ['block', 'guy'] });
  settle(game);
  const block = game.level.obj.block;
  game.press('right');
  game.runUntil(() => game.gs.throwBrickisCarry, 120);
  assert.equal(game.gs.throwBrickisCarry, true, 'picked up');
  game.release('right');
  game.run(45); // come to a stop: while running, the block trails the hero by one frame of movement
  near(block.x, game.hero.x + 32, 0.5, 'held out in front of the hero');
  near(block.y, game.hero.y - 15, 0.5, 'held at head height');

  const guy = game.level.obj.guy;
  game.placeHero(guy.x - 150, 466);
  game.run(3);
  game.press('action');
  game.release('action');
  game.run(2);
  assert.equal(game.gs.throwBrickisCarry, false, 'thrown');
  assert.ok(block.getLinearVelocity()[0] > 200, 'flying forwards');
  game.runUntil(() => guy.removed, 120);
  assert.ok(guy.removed, 'the block knocked out the enemy');
  assert.equal(game.gs.gameScore, 100);
  assert.ok(block.removed, 'and broke');
});

test('a loose block lands without a sound: the original has that thud commented out', () => {
  const game = startTestLevel({ ops: [call('spawnThrowBrick', [380, 460], 'block')], updates: ['block'] });
  settle(game);
  game.run(60);
  assert.ok(!played(game, 'throwblockthudsound'), 'silent while it settles at the start of the level');

  game.press('right');
  game.runUntil(() => game.gs.throwBrickisCarry, 120);
  game.release('right');
  game.run(45);
  game.press('action');
  game.release('action');
  game.run(150); // thrown, tumbled and come to rest
  assert.equal(game.gs.throwBrickisCarry, false, 'thrown');
  assert.ok(!played(game, 'throwblockthudsound'), 'silent when it lands after being thrown');
});

test('the dragon lands with a thud', () => {
  const game = startTestLevel({ ops: [call('spawnDragon', [700, 0, 'walkLeft'], 'dragon1')], updates: ['dragon1'], level: 'level2_7', worldlevel: '2-7' });
  game.runUntil(() => played(game, 'throwblockthudsound'), 240);
  assert.ok(played(game, 'throwblockthudsound'));
});

// --- landings the collision rules do not see ------------------------------------------------------
//
// A landing is noticed when the contact with the ground begins. These are the landings that have
// no such moment; in the original they left the hero in his jump pose, unable to jump, until its
// three-second safety net or the next touch of a direction button.

const inJumpPose = (game) => /Jump/.test(game.hero.sequenceName);

test('a short hop on a rising platform ends in a landing', () => {
  for (const held of [1, 2, 3]) {
    const game = startTestLevel({ ops: [call('spawnMoveUpPlatform', [300, 470, 130, 128], 'platform')], updates: ['platform'], heroX: 300, heroY: 300 });
    settle(game);
    game.run(20);
    game.press('jump');
    game.run(held);
    game.release('jump');
    game.run(30);
    assert.equal(game.hero.sequenceName, 'heroFacingRight', `standing again after a ${held}-frame hop`);
    assert.equal(game.hero.state2, 'ready', `and able to jump after a ${held}-frame hop`);
  }
});

test('jumping up through a moving platform ends in a landing when he comes to rest on it', () => {
  let landings = 0;
  for (const [fn, args] of [
    ['spawnMoveUpPlatform', [500, 430, 130, 128]],
    ['spawnMoveDownPlatform', [500, 300, 130, 128]],
  ]) {
    for (let wait = 0; wait < 260; wait += 3) {
      const game = startTestLevel({ ops: [call(fn, args, 'platform')], updates: ['platform'], heroX: 500 });
      const platform = game.level.obj.platform;
      settle(game);
      game.run(wait);
      game.press('jump');
      game.run(wait % 2 ? 9 : 20);
      game.release('jump');
      game.run(100);
      const hero = game.hero;
      if (Math.abs(hero.y + 12 - platform.y) > 3) continue; // he did not end up on the platform
      landings += 1;
      assert.ok(!inJumpPose(game), `${fn}, jump after ${wait} frames: he stands on the platform in the ${hero.sequenceName} pose`);
      assert.equal(hero.state2, 'ready', `${fn}, jump after ${wait} frames`);
    }
  }
  assert.ok(landings > 20, `the sweep landed on the platform ${landings} times`);
});

test('bumping his head under a low ceiling ends in a landing', () => {
  for (const gap of [1, 2, 3]) {
    const game = startTestLevel({ ops: [brick(300, 480 - 24 - gap - 32, 'ground')] });
    settle(game);
    game.press('jump');
    game.run(10);
    game.release('jump');
    game.run(30);
    assert.equal(game.hero.sequenceName, 'heroFacingRight', `standing again under a ceiling ${gap}px above his head`);
    assert.equal(game.hero.state2, 'ready');
  }
});

test('an ordinary jump is not mistaken for a landing', () => {
  const game = startTestLevel({});
  settle(game);
  const groundY = game.hero.y;
  game.press('jump');
  let airborne = 0;
  for (let frame = 0; frame < 120; frame++) {
    game.run(1);
    if (frame === 12) game.release('jump');
    if (game.hero.y < groundY - 3) {
      airborne += 1;
      assert.ok(inJumpPose(game), `jump pose in the air (frame ${frame})`);
      assert.notEqual(game.hero.state2, 'ready', `cannot jump again in the air (frame ${frame})`);
    }
  }
  assert.ok(airborne > 20, 'he really jumped');
  assert.equal(game.hero.sequenceName, 'heroFacingRight', 'and landed');
  assert.equal(game.hero.state2, 'ready');
});

// --- outfits ---------------------------------------------------------------------------------------

test('the big hero changes outfit the moment he picks up a fire flower or a jetpack', () => {
  let game = startTestLevel({});
  settle(game);
  growBig(game);
  spawn.spawnFireFlowerPowerup(game.level, game.hero.x, game.hero.y - 20);
  game.runUntil(() => game.gs.firepower === true, 240);
  game.run(2);
  assert.equal(game.hero.sequenceName, 'redheroFacingRight', 'red without touching the controls');

  spawn.spawnJetpackPowerup(game.level, game.hero.x, game.hero.y - 20);
  game.runUntil(() => game.gs.jetpack === true, 240);
  game.run(2);
  assert.equal(game.hero.sequenceName, 'redheroFacingRightJetPack', 'and wearing the jetpack');

  // while running with the button held down, and in mid-jump, he keeps doing what he was doing
  game = startTestLevel({});
  settle(game);
  growBig(game);
  game.press('right');
  game.run(20);
  spawn.spawnFireFlowerPowerup(game.level, game.hero.x + 40, game.hero.y - 10);
  game.runUntil(() => game.gs.firepower === true, 240);
  game.run(2);
  assert.equal(game.hero.sequenceName, 'redheroRunningRight', 'red while running');
  game.release('right');
  game.run(30);
  game.press('jump');
  game.run(8);
  spawn.spawnJetpackPowerup(game.level, game.hero.x, game.hero.y - 4);
  game.runUntil(() => game.gs.jetpack === true, 60);
  game.run(1);
  assert.equal(game.hero.sequenceName, 'redheroJumpRightJetPack', 'jetpack on in mid-jump');
});

test('the small hero who takes a fire flower in mid-air grows straight into the red outfit', () => {
  const game = startTestLevel({});
  settle(game);
  game.press('jump');
  game.run(12);
  spawn.spawnFireFlowerPowerup(game.level, game.hero.x, game.hero.y - 4);
  game.runUntil(() => game.gs.heroSize !== 'small', 60);
  game.release('jump');
  game.runUntil(() => game.gs.heroSize === 'big', 240);
  assert.equal(game.hero.sequenceName, 'redheroFacingRight');
});

test('walkers turn around at walls and hop when they leave a jump sensor', () => {
  const wall = (x) => image('invisableground', 10, 100, x, 380, { name: 'wall', name2: 'wall', sensor: true, friction: 0, alpha: 0 });
  const sensor = image('invisableground', 40, 60, 560, 420, { name: 'jumpRightSensor', sensor: true, friction: 0, alpha: 0 });
  const game = startTestLevel({ ops: [wall(450), wall(860), sensor, call('spawnOrangeBadGuy', [650, 460], 'guy')], updates: ['guy'], heroX: 100 });
  const guy = game.level.obj.guy;
  const speeds = [];
  const watch = (until) =>
    game.runUntil(() => {
      speeds.push(guy.getLinearVelocity()[1]);
      return until();
    }, 900);

  // he starts out walking left and passes through the "jump right" sensor without reacting
  watch(() => guy.x < 500);
  assert.equal(guy.state, 'walkLeft');
  assert.ok(Math.min(...speeds) > -50, 'no hop on the way left');
  // the left wall turns him around
  watch(() => guy.state === 'walkRight');
  assert.equal(guy.state, 'walkRight');
  // walking out of the sensor on the way back makes him hop
  speeds.length = 0;
  watch(() => guy.x > 640);
  assert.ok(Math.min(...speeds) < -100, 'hopped when leaving the jump sensor');
  // the hop carries him about 175 px; then the right wall turns him around again
  watch(() => guy.state === 'walkLeft');
  assert.equal(guy.state, 'walkLeft');
});

test('the door finishes the level: time is banked and the next stage unlocks', () => {
  const game = startTestLevel({ ops: [call('spawnDoor', [420, 447, 'endleveldoor'], 'door1')], heroX: 300 });
  settle(game);
  game.press('right');
  game.runUntil(() => game.app.sceneName === 'levelcomplete', 600);
  assert.equal(game.app.sceneName, 'levelcomplete');
  const worldUnlocked = game.app.save.loadBox('worldUnlocked');
  assert.equal(worldUnlocked.retrieve('world1_2'), 'true');
  assert.equal(worldUnlocked.retrieve('loadlevel'), 'level1_2');

  // the tally pays 100 points per remaining time unit (plus one), one unit per frame
  const banked = game.gs.timeLeftTotal;
  game.run(banked + 5);
  assert.equal(game.gs.gameScore, (banked + 1) * 100);
});

test('a boss shrinks with every stomp and drops the key that unlocks the next world', () => {
  const game = startTestLevel({ ops: [call('spawnBigRedBadGuy', [700, 380], 'bigRedBadGuy1')], updates: ['bigRedBadGuy1'], level: 'level1_7', worldlevel: '1-7', heroX: 300 });
  game.run(30);
  let stomps = 0;
  const sizes = [];
  while (objectsNamed(game, 'key').length === 0 && stomps < 20) {
    const boss = game.level.obj.bigRedBadGuy1;
    sizes.push(boss.xScale);
    game.runUntil(() => Math.abs(boss.getLinearVelocity()[1]) < 1, 240); // let him land
    game.placeHero(boss.x, boss.y - 60 * boss.xScale - 30);
    game.runUntil(() => boss.removed, 240);
    assert.ok(boss.removed, `stomp ${stomps + 1} connected`);
    stomps += 1;
    game.run(3);
  }
  assert.equal(stomps, 8, 'eight stomps finish the big red boss');
  near(sizes[0], 0.9, 1e-9, 'first size');
  assert.ok(sizes.every((s, i) => i === 0 || s < sizes[i - 1]), 'each one smaller than the last');
  assert.equal(game.gs.gameScore, 8000);

  const key = objectsNamed(game, 'key')[0];
  near(key.x, 500, 1, 'the key appears at x = 500');
  game.runUntil(() => Math.abs(key.getLinearVelocity()[1]) < 1 && key.y > 300, 600);
  game.placeHero(key.x - 30, 460);
  game.press('right');
  game.runUntil(() => game.gs.state !== 1, 240);
  const worldUnlocked = game.app.save.loadBox('worldUnlocked');
  assert.equal(worldUnlocked.retrieve('world2_1'), 'true');
  assert.equal(worldUnlocked.retrieve('loadlevel'), 'level2_1');
  assert.ok(played(game, 'endlevelsound'));
});

test('fireballs bounce off the big red boss, who laughs', () => {
  const game = startTestLevel({ ops: [call('spawnBigRedBadGuy', [900, 380], 'bigRedBadGuy1')], updates: ['bigRedBadGuy1'], level: 'level1_7', worldlevel: '1-7' });
  settle(game);
  growBig(game);
  game.gs.firepower = true;
  game.gs.throwFireBall = true;
  const boss = game.level.obj.bigRedBadGuy1;
  game.placeHero(boss.x - 160, 458);
  game.run(3);
  game.press('action');
  game.release('action');
  game.runUntil(() => played(game, 'laughsound'), 120);
  assert.ok(played(game, 'laughsound'));
  assert.ok(!boss.removed, 'unharmed');
});
