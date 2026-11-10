// A simple scripted player used by the play-through test: it runs right, jumps gaps and obstacles,
// and tries to jump over (or onto) enemies. It "sees" the level through the physics world only.

import * as planck from 'planck';

/** Small deterministic random number generator, so a run can be repeated exactly. */
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groundBelow(world, x, y, depth) {
  let hit = false;
  world.rayCast(planck.Vec2(x / 100, y / 100), planck.Vec2(x / 100, (y + depth) / 100), (fixture) => {
    const body = fixture.getBody().getUserData();
    const o = body && body.object;
    if (!o || fixture.isSensor()) return -1;
    if (o.myName === 'ground' || o.myName2 === 'ground') {
      hit = true;
      return 0;
    }
    return -1;
  });
  return hit;
}

function enemyAhead(world, hero, reach) {
  for (let b = world.getBodyList(); b; b = b.getNext()) {
    const body = b.getUserData();
    const o = body && body.object;
    if (!o || o.removed || !o.isAlive) continue;
    if (o.myName2 !== 'badguy' && o.myName2 !== 'fish') continue;
    const dx = o.x - hero.x;
    if (dx > 0 && dx < reach && Math.abs(o.y - hero.y) < 50) return true;
  }
  return false;
}

/**
 * Plays the current level by holding right. Returns "won" when the door (or key) is reached,
 * "died" if the hero is lost, or "timeout".
 * @param {ReturnType<import('./helpers.js').startLevel>} game
 */
export async function playRight(game, { seed = 1, maxFrames = 60 * 180 } = {}) {
  const random = seededRandom(seed);
  const level = game.level;
  const world = game.app.physics.world;
  let jumpHold = 0;
  let stuck = 0;
  let lastX = game.hero.x;
  let reach = 60 + random() * 40;
  game.press('right');
  for (let frame = 0; frame < maxFrames; frame++) {
    // a win shows as state 5 for an instant, then as "level complete comes next" (state2 = 2)
    if (game.gs.state === 5 || (game.app.scene === level && game.gs.state2 === 2)) return 'won';
    if (game.app.scene !== level) return game.app.sceneName === 'levelcomplete' ? 'won' : 'died';
    const hero = game.hero;
    if (hero && game.gs.state === 1) {
      if (hero.state !== 'heroRunningRight') {
        game.release('right');
        game.press('right');
      }
      stuck = Math.abs(hero.x - lastX) < 0.2 ? stuck + 1 : 0;
      lastX = hero.x;
      if (jumpHold > 0) {
        jumpHold -= 1;
        if (jumpHold === 0) game.release('jump');
      } else if (hero.state2 === 'ready') {
        const gap = !groundBelow(world, hero.x + 26, hero.y, 60);
        if (gap || stuck > 8 || enemyAhead(world, hero, reach)) {
          game.press('jump');
          jumpHold = gap || stuck > 8 ? 26 : 12 + Math.floor(random() * 14);
          reach = 60 + random() * 40;
        }
      }
    }
    game.run(1);
    await new Promise((resolve) => setImmediate(resolve)); // lets a level reload finish loading
  }
  return 'timeout';
}
