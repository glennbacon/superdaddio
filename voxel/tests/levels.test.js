// The 60 levels: that the extracted data matches the original source, and that every level runs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { levelNames, loadLevelData, startLevel, startTestLevel } from './helpers.js';
import { playRight } from './bot.js';
import { musicForLevel, nextLevelAfterBoss, nextLevelAfterDoor } from '../src/game/state.js';
import { spawnHerodie } from '../src/game/level/spawn.js';

const ASSETS = fileURLToPath(new URL('../src/assets/', import.meta.url));
const ORIGINAL = fileURLToPath(new URL('../../thelevel.lua', import.meta.url));

test('there are 60 levels: seven in each of worlds 1-8 and four in world 9', () => {
  assert.equal(levelNames.length, 60);
  for (let world = 1; world <= 9; world++) {
    const stages = levelNames.filter((name) => name.startsWith(`level${world}_`)).length;
    assert.equal(stages, world === 9 ? 4 : 7, `world ${world}`);
  }
});

test('level data agrees with a direct reading of the original Lua source', { skip: !existsSync(ORIGINAL) && 'original thelevel.lua not present' }, () => {
  // The data was produced by *running* the original loader. Here the source is only read as text
  // and counted, which checks the extraction by an independent route.
  const source = readFileSync(ORIGINAL, 'latin1').replace(/\r/g, '');
  const start = source.indexOf('\nlocal function loadLevel()');
  const end = source.indexOf('\nlocal function unLoadLevel()');
  const blocks = source.slice(start, end).split(/\n\tif loadTheLevel == "/).slice(1);
  assert.equal(blocks.length, 60);

  for (const block of blocks) {
    const name = block.slice(0, block.indexOf('"'));
    const code = block
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    const data = loadLevelData(name);
    const ops = data.ops;
    const count = (pattern) => (code.match(pattern) || []).length;
    const calls = (fn) => ops.filter((op) => op.op === 'call' && op.fn === fn).length;

    assert.equal(ops.filter((op) => op.op === 'img' && op.group !== 'sceneView').length, count(/obj\.object_\d+ = display\.newImageRect\(/g), `${name}: scenery and terrain objects`);
    assert.equal(ops.filter((op) => op.op === 'img' && op.body).length, count(/physics\.addBody\( obj\.object_\d+,/g), `${name}: objects with physics bodies`);
    for (const fn of ['coinPattern', 'spawnCloud', 'spawnBridge', 'spawnDoor', 'spawnOrangeBadGuy', 'spawnBlueBadGuy', 'spawnOrangeJumpyBadGuy', 'spawnPurpleFlyBadGuy', 'spawnGreenBug', 'spawnSnake', 'spawnSmallDragon', 'spawnFish', 'spawnPlant', 'spawnMoveUpPlatform', 'spawnMoveDownPlatform', 'spawnSpringBoard', 'spawnThrowBrick']) {
      assert.equal(calls(fn), count(new RegExp(`[= \\t]${fn}\\(`, 'g')), `${name}: ${fn} calls`);
    }
    assert.equal(data.worldlevel, name.replace('level', '').replace('_', '-'), `${name}: world label`);
  }
});

test('every level references only images that exist', () => {
  for (const name of levelNames) {
    for (const op of loadLevelData(name).ops) {
      if (op.op === 'img') assert.ok(existsSync(ASSETS + op.img), `${name}: ${op.img}`);
      if (op.fn === 'loadParallax') for (const img of op.args) assert.ok(existsSync(ASSETS + img), `${name}: ${img}`);
    }
  }
});

test('every level has a way to finish it', () => {
  for (const name of levelNames) {
    const ops = loadLevelData(name).ops;
    const has = (fn) => ops.some((op) => op.op === 'call' && op.fn === fn);
    if (name.endsWith('_7')) {
      assert.ok(['spawnBigRedBadGuy', 'spawnBigYellowBadGuy', 'spawnSnowman', 'spawnCloudman', 'spawnDragon'].some(has), `${name} has a boss`);
      assert.ok(nextLevelAfterBoss(name), `${name} unlocks a next world`);
    } else {
      assert.ok(ops.some((op) => op.fn === 'spawnDoor' && op.args[2] === 'endleveldoor'), `${name} has an exit door`);
    }
  }
  assert.deepEqual(nextLevelAfterDoor('level3_6'), { next: 'level3_7', isLast: false });
  assert.deepEqual(nextLevelAfterDoor('level9_4'), { next: 'level9_5', isLast: true });
  assert.equal(nextLevelAfterBoss('level8_7'), 'level9_1');
});

test('each world plays the music the original assigned to it', () => {
  const expected = { 1: 'track1', 2: 'track2', 3: 'track3', 4: 'track3', 5: 'track2', 6: 'track1', 7: 'track2', 8: 'track4' };
  for (const [world, track] of Object.entries(expected)) assert.equal(musicForLevel(`level${world}_3`), track);
  for (const world of [1, 3, 4, 6, 8]) assert.equal(musicForLevel(`level${world}_7`), 'track1b');
  for (const world of [2, 5, 7]) assert.equal(musicForLevel(`level${world}_7`), 'track2b');
  assert.equal(musicForLevel('level9_2'), null);
});

test('every level loads, and the hero lands on solid ground', () => {
  for (const name of levelNames) {
    const game = startLevel(name);
    for (const key of game.level.data.updates) {
      assert.equal(typeof game.level.obj[key].update, 'function', `${name}: ${key} is updated every frame`);
    }
    const level = game.level;
    const frames = game.runUntil(() => game.hero && game.hero.state2 === 'ready', 600);
    assert.ok(frames >= 0 && frames < 150, `${name}: hero landed (after ${frames} frames)`);
    // Three seconds in he is still inside his 3.5 s grace period, so no enemy can have hurt him:
    // only broken terrain (falling through the floor into a pit) could have ended the level.
    game.run(180 - frames);
    assert.equal(game.app.scene, level, `${name}: the hero is still standing where he started`);
    assert.equal(game.gs.state, 1, `${name}: level is running`);
    // five more seconds of everything in the level running; some enemies do come for an idle hero
    for (let i = 0; i < 300 && game.app.scene === level; i++) game.run(1);
  }
});

test('in every level with a checkpoint, the hero can restart from it and lands beside the flag', async () => {
  const withCheckpoint = levelNames.filter((name) => loadLevelData(name).ops.some((op) => op.fn === 'spawnCheckPoint'));
  assert.deepEqual(withCheckpoint, ['level1_2', 'level1_3', 'level1_5', 'level5_2', 'level5_3', 'level5_5', 'level8_1', 'level8_2', 'level8_6']);
  for (const name of withCheckpoint) {
    const game = startLevel(name);
    const level = game.level;
    game.runUntil(() => game.hero.state2 === 'ready', 600);
    const flag = level.obj.checkPoint1;
    assert.ok(flag, `${name}: has a checkpoint flag`);

    // walk into the flag, then lose a life
    game.hero.x = flag.x;
    game.hero.y = flag.y;
    game.hero.setLinearVelocity(0, 0);
    game.runUntil(() => game.gs.checkPointReached, 30);
    assert.ok(game.gs.checkPointReached, `${name}: checkpoint reached`);
    game.app.physics.pause();
    game.hero.alpha = 0;
    spawnHerodie(level, game.hero.x, game.hero.y);
    for (let i = 0; i < 300 && game.app.scene === level; i++) {
      game.run(1);
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.notEqual(game.app.scene, level, `${name}: the level reloaded`);

    const frames = game.runUntil(() => game.hero.state2 === 'ready', 300);
    assert.ok(frames >= 0, `${name}: the hero landed after restarting at the checkpoint`);
    game.run(30);
    assert.ok(Math.abs(game.hero.x - flag.x) < 2, `${name}: he is at the flag (x=${game.hero.x}, flag at ${flag.x})`);
    // the foot of the flagpole is about 62px below the flag's centre, sunk a few pixels into the ground
    assert.ok(Math.abs(game.hero.y + 12 - (flag.y + 58)) < 8, `${name}: standing on the ground the flag stands on (y=${game.hero.y}, flag at ${flag.y})`);
    assert.equal(game.app.scene.obj.checkPointFinish.x, flag.x, `${name}: the raised flag is shown`);
    assert.equal(game.gs.state, 1, `${name}: level is running`);
  }
});

test('level 1-1 can be played from start to door', async () => {
  // The scripted player is crude and loses to enemies on some runs, so several are tried. One win
  // is enough to show the whole course works: terrain, gaps, the rope bridge, and the exit door.
  const outcomes = [];
  for (let seed = 1; seed <= 12; seed++) {
    const game = startLevel('level1_1');
    const outcome = await playRight(game, { seed });
    outcomes.push(outcome);
    if (outcome !== 'won') continue;
    assert.ok(game.hero.x > 4100, 'reached the door at the far end');
    assert.equal(game.app.save.loadBox('worldUnlocked').retrieve('world1_2'), 'true', 'level 1-2 unlocked');
    game.runUntil(() => game.app.sceneName === 'levelcomplete', 300);
    assert.equal(game.app.sceneName, 'levelcomplete');
    return;
  }
  assert.fail(`no run reached the door: ${outcomes.join(', ')}`);
});

test('the hand-made test level helper builds a playable level', () => {
  const game = startTestLevel();
  game.runUntil(() => game.hero.state2 === 'ready', 300);
  assert.equal(game.hero.state2, 'ready');
});
