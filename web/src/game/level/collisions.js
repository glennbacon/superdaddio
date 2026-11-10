// What happens when things touch.
//
// This is a rule-for-rule translation of the original collision handlers, kept in the original
// order because rules read state that earlier rules may have just changed. Each rule is written for
// one assignment of the two colliding objects and tried both ways round.
//
// Things the rules rely on:
//   * y comparisons use reference points: level art is anchored at its top centre, so `block.y` is
//     the TOP of a block while `hero.y` is the hero's centre.
//   * The world cannot be changed in the middle of a physics step, so anything that removes or
//     creates bodies is put off to the next frame with a 2 ms timer — as the original did.
//   * `gs.noHit` is the hero's grace period: enemies cannot hurt him while it is set.

import { easing } from '../../engine/clock.js';
import { State, nextLevelAfterBoss, nextLevelAfterDoor, unlockKey } from '../state.js';
import { Text } from '../../engine/display.js';
import { playHeroAnimation, spawnBigHero, spawnSmallHero } from './hero.js';
import * as spawn from './spawn.js';

const isGround = (o) => o.myName === 'ground' || o.myName2 === 'ground';
const isHero = (o) => o.myName2 === 'hero';

// --- helpers ---------------------------------------------------------------------------------------

function stopJetpackSound(L) {
  if (L.audio.isChannelPlaying(1)) L.audio.stop(1);
}

function addScore(L, at, amount) {
  L.gs.gameScore += amount;
  spawn.spawnPoints(L, at.x, at.y, amount);
}

const later = (L, fn, ms = 2) => L.clock.performWithDelay(ms, fn);

/** Scale at or below which a boss is finally defeated instead of coming back smaller. */
const BOSS_DEFEATED_AT = { dragon: 0.3, bigredbadguy: 0.3, bigyellowbadguy: 0.3, snowman: 0.4, cloudman: 0.4 };
const BOSS_SCALE_KEY = { dragon: 'dragon', bigredbadguy: 'bigRed', bigyellowbadguy: 'bigYellow', snowman: 'snowman', cloudman: 'cloudman' };

function burst(L, x, y, offsets) {
  for (const d of offsets) {
    spawn.spawnPoof(L, x + d, y + d);
    spawn.spawnPoof(L, x - d, y - d);
    spawn.spawnPoof(L, x + d, y - d);
    spawn.spawnPoof(L, x - d, y + d);
  }
}

/** Removes a boss that took a hit: either it is finished (and drops the key) or a smaller one takes its place. */
function removeBoss(L, boss) {
  const name = boss.myName;
  const { x, y, state } = boss;
  if (L.bossScale[BOSS_SCALE_KEY[name]] <= BOSS_DEFEATED_AT[name]) {
    boss.isAlive = false;
    if (name === 'dragon') {
      burst(L, x, y, [15, 30, 45]);
    } else {
      spawn.spawnPoof(L, x, y);
      burst(L, x, y, [15]);
    }
    boss.removeSelf();
    // the final boss releases Ms. Daddio instead of a key
    if (L.worldlevel === '8-7') spawn.spawnLady(L, 500, 100);
    else spawn.spawnKey(L, 500, 100);
    return;
  }
  boss.removeSelf();
  if (name === 'dragon') L.obj.dragon1 = spawn.spawnDragon(L, x, y, state);
  else if (name === 'bigredbadguy') L.obj.bigRedBadGuy1 = spawn.spawnBigRedBadGuy(L, x, y + 20);
  else if (name === 'bigyellowbadguy') L.obj.bigYellowBadGuy1 = spawn.spawnBigYellowBadGuy(L, x, y + 20);
  else if (name === 'snowman') L.obj.snowman1 = spawn.spawnSnowman(L, x, y + 20, state);
  else if (name === 'cloudman') L.obj.cloudman1 = spawn.spawnCloudman(L, x, y + 20, state);
}

const POWERUP_FROM_BLOCK = {
  applepowerupblock: spawn.spawnApplePowerup,
  jetpackpowerupblock: spawn.spawnJetpackPowerup,
  fireflowerpowerupblock: spawn.spawnFireFlowerPowerup,
};

/** Removes an object, with the side effects some objects have when they go. */
function removeObject(L, object) {
  if (!object || object.removed) return;
  if (object.myName in BOSS_DEFEATED_AT) {
    removeBoss(L, object);
    return;
  }
  const spawnPowerup = POWERUP_FROM_BLOCK[object.myName];
  if (spawnPowerup) {
    // an opened power-up block releases its power-up and leaves an ordinary brick behind
    spawnPowerup(L, object.x, object.y);
    spawn.spawnBreakableBrick(L, object.x, object.y);
  }
  object.removeSelf();
}

function breakBrick(L, brick) {
  if (!brick || brick.removed) return;
  spawn.spawnBrokenBricks(L, brick.x, brick.y);
  removeObject(L, brick);
}

/** A block hit from below hops up 20px and settles back; what happens on the way down depends on the block. */
function bumpBlock(L, block) {
  const settle = () => {
    if (block.removed) return;
    const down = { time: 100, y: block.y + 20, transition: easing.inOutExpo };
    if (block.myName === 'crackedcoinblock') {
      // pays out one coin, then it is just a brick
      L.clock.transitionTo(block, { ...down, onStart: () => spawn.spawnCoinAnimation(L, block.x, block.y), onComplete: () => (block.isMoving = false) });
      block.myName = 'crackedblock';
    } else if (block.myName in POWERUP_FROM_BLOCK) {
      L.clock.transitionTo(block, { ...down, onComplete: () => removeObject(L, block) });
    } else if (block.myName === 'crackedblock') {
      L.clock.transitionTo(block, { ...down, onComplete: () => (block.isMoving = false) });
    }
  };
  later(L, () => {
    if (block.removed) return;
    L.clock.transitionTo(block, { time: 100, y: block.y - 20, transition: easing.inOutExpo, onComplete: settle });
  });
}

/** The little hop the hero gets from stomping an enemy. */
function bounceHero(L, hero) {
  if (hero.removed) return;
  hero.applyForce(0, L.gs.heroSize === 'small' ? -5 : -6, hero.x, hero.y);
  playHeroAnimation(L, hero, hero.state);
  hero.state2 = 'falling';
}

/** The big hero takes a hit: he shrinks and gets a grace period. */
function shrinkHero(L, hero) {
  const gs = L.gs;
  gs.noHit = true;
  gs.throwFireBall = false;
  gs.firepower = false;
  gs.heroSize = 'nothingrightnow';
  L.audio.play('shrinksound');
  const x = hero.x;
  const y = hero.y;
  spawn.shrinkDaddio(L, x, y);
  later(L, () => removeObject(L, hero));
  later(
    L,
    () => {
      spawnSmallHero(L, x, y - 24);
      L.groups.flower.toFront();
    },
    450,
  );
}

/** The small hero takes a hit: that's a life. */
function killHero(L, hero) {
  L.physics.pause();
  hero.alpha = 0;
  spawn.spawnHerodie(L, hero.x, hero.y);
}

/** The small hero picked up a power-up: freeze the level while he grows into the big hero. */
function growHero(L, hero, powerup, sound) {
  const gs = L.gs;
  gs.state = State.STOPPED;
  L.physics.pause();
  gs.heroSize = 'nothingrightnow';
  L.audio.play(sound);
  L.temp.heroX = hero.x;
  L.temp.heroY = hero.y;
  L.temp.heroScrollRightStartX = hero.scrollRightStartX;
  L.temp.heroScrollLeftStartX = hero.scrollLeftStartX;
  L.temp.heroJumpStartY = hero.jumpStartY;
  L.temp.heroJumpEndY = hero.jumpEndY;
  spawn.growDaddio(L);
  later(L, () => removeObject(L, powerup));
  later(L, () => removeObject(L, hero));
  later(
    L,
    () => {
      spawnBigHero(L);
      L.groups.flower.toFront();
    },
    1050,
  );
}

function unlock(L, level) {
  const worldUnlocked = L.save.loadBox('worldUnlocked');
  worldUnlocked.store('loadlevel', level);
  worldUnlocked.store(unlockKey(level), 'true');
  worldUnlocked.save();
}

// --- enemies ---------------------------------------------------------------------------------------

/**
 * How each enemy reacts to the hero and to fireballs.
 *   stomp:       the hero must be this many pixels above the enemy's centre to stomp it
 *                (omitted = cannot be stomped; any touch hurts)
 *   hurtBig:     ...and the big hero is hurt when he is not at least this far above it
 *   score:       points for defeating it
 *   boss:        stomps play the heavy sound and go through removeBoss; no puff of smoke
 *   fireball:    "kill" | "laugh" (immune, and it mocks you) | "hit" (bosses that fire does hurt)
 *   turns:       turns around when it bumps into a wall, another enemy or the hero;
 *                `turnAnimations` are the [left, right] walking animations to switch between
 *   pit:         for bosses, what falling onto a "deadfloor" does (see the rules)
 */
const ENEMIES = [
  { name: 'orangebadguy', stomp: 8, hurtBig: 8, score: 100, fireball: 'kill', turns: true },
  { name: 'smalldragon', stomp: 8, hurtBig: 8, score: 300, fireball: 'kill', turns: true, turnAnimations: ['smallDragonWalkingLeft', 'smallDragonWalkingRight'] },
  { name: 'snake', stomp: 8, hurtBig: 8, score: 250, fireball: 'kill', turns: true, turnAnimations: ['snakeWalkingLeft', 'snakeWalkingRight'] },
  { name: 'bigredbadguy', stomp: 16, hurtBig: 16, score: 1000, boss: true, fireball: 'laugh', turns: true, pit: { scaleKey: 'bigRed', scale: 0.1, score: 1000 } },
  // falling in the pit resets the *red* boss's scale — a slip in the original that is kept as is
  { name: 'bigyellowbadguy', stomp: 16, hurtBig: 16, score: 10000, boss: true, fireball: 'laugh', turns: true, pit: { scaleKey: 'bigRed', scale: 0.05, score: 10000 } },
  { name: 'snowman', stomp: 16, hurtBig: 16, score: 1000, boss: true, fireball: 'hit', turns: true, turnAnimations: ['snowmanWalkingLeft', 'snowmanWalkingRight'], pit: { scaleKey: 'snowman', scale: 0.1, score: 1000 } },
  { name: 'cloudman', stomp: 16, hurtBig: 16, score: 10000, boss: true, fireball: 'hit', turns: true, pit: { scaleKey: 'cloudman', scale: 0.07, score: 10000 } },
  { name: 'dragon', stomp: 16, hurtBig: 16, score: 2000, boss: true, fireball: 'dragon', turns: true, turnsOnHero: false, turnAnimations: ['dragonWalkingLeft', 'dragonWalkingRight'], pit: { scaleKey: 'dragon', scale: 0.1, score: 10000 } },
  { name: 'bluebadguy', score: 100, fireball: 'kill', turns: true },
  { name: 'fish', score: 300, fireball: 'kill' },
  { name: 'greenBug', stomp: 8, hurtBig: 8, score: 400, fireball: 'kill', turns: true, turnAnimations: ['greenBugWalkingLeft', 'greenBugWalkingRight'] },
  { name: 'plant', score: 300, fireball: 'kill', brokenByCarriedBrick: true },
  { name: 'purpleflybadguy', stomp: 8, hurtBig: 8, score: 500, fireball: 'kill' },
  { name: 'orangejumpybadguy', stomp: 4, hurtBig: 8, score: 200, fireball: 'kill' },
];

function enemyRules(L, def, a, b) {
  const gs = L.gs;
  const enemy = b;
  if (enemy.myName !== def.name) return;
  const canStomp = def.stomp !== undefined;

  // the big hero runs into it
  if (a.myName === 'bigHero' && gs.noHit === false && enemy.isAlive === true) {
    if (!canStomp || a.y + 8 >= enemy.y - def.hurtBig) shrinkHero(L, a);
  }

  // either hero lands on it
  if (canStomp && isHero(a) && enemy.isAlive === true) {
    const heroY = a.myName === 'bigHero' ? a.y + 8 : a.y;
    if (heroY < enemy.y - def.stomp) {
      a.setLinearVelocity(a.vx, 0);
      L.audio.play(def.boss ? 'stompsound' : 'poofsound');
      enemy.isAlive = false;
      if (!def.boss) spawn.spawnPoof(L, enemy.x, enemy.y);
      later(L, () => removeObject(L, enemy));
      later(L, () => bounceHero(L, a));
      addScore(L, enemy, def.score);
    }
  }

  // a fireball hits it
  if (a.myName === 'fireBall' && enemy.isAlive === true) {
    if (def.fireball === 'kill') {
      a.myName = 'nomorefireBall';
      a.alpha = 0;
      L.audio.play('poofsound');
      enemy.isAlive = false;
      spawn.spawnPoof(L, enemy.x, enemy.y);
      later(L, () => removeObject(L, enemy));
      addScore(L, enemy, def.score);
    } else if (def.fireball === 'laugh') {
      a.myName = 'nomorefireBall';
      a.alpha = 0;
      L.audio.play('poofsound');
      spawn.spawnPoof(L, a.x, a.y);
      later(L, () => L.audio.play('laughsound'), 200);
    } else if (def.fireball === 'hit') {
      L.audio.play('stompsound');
      a.setLinearVelocity(0, 0);
      enemy.isAlive = false;
      later(L, () => removeObject(L, enemy));
      addScore(L, enemy, def.score);
    } else if (def.fireball === 'dragon') {
      a.myName = 'nomorefireBall';
      a.alpha = 0;
      L.audio.play('poofsound');
      burst(L, a.x, a.y, [15, 45]);
      enemy.isAlive = false;
      later(L, () => removeObject(L, enemy));
      addScore(L, a, def.score);
    }
  }

  // the small hero runs into it
  if (a.myName === 'smallHero' && gs.noHit === false && enemy.isAlive === true) {
    if (!canStomp || a.y > enemy.y - 16) killHero(L, a);
  }

  if (def.turns && (a.myName === 'wall' || a.myName2 === 'badguy' || (def.turnsOnHero !== false && isHero(a)))) {
    const goRight = enemy.state === 'walkLeft' || enemy.state === 'jumpLeft';
    enemy.state = goRight ? 'walkRight' : 'walkLeft';
    if (def.turnAnimations) {
      enemy.pause();
      enemy.prepare(def.turnAnimations[goRight ? 1 : 0]);
      enemy.play();
    }
  }

  // a boss falls into a pit: that finishes it off
  if (def.pit && a.myName === 'deadfloor') {
    L.bossScale[def.pit.scaleKey] = def.pit.scale;
    enemy.isAlive = false;
    later(L, () => removeObject(L, enemy));
    addScore(L, enemy, def.pit.score);
  }

  if (def.brokenByCarriedBrick && a.myName === 'throwbrick' && gs.throwBrickisCarry === true) {
    L.audio.play('breakbricksound');
    enemy.isAlive = false;
    a.isAlive = false;
    spawn.spawnPoof(L, enemy.x, enemy.y);
    later(L, () => removeObject(L, enemy));
    later(L, () => breakBrick(L, a));
    addScore(L, enemy, def.score);
    gs.throwBrickisCarry = false;
    gs.throwBrickisPickup = false;
    gs.throwTheBrick = false;
  }
}

// --- contact begins ----------------------------------------------------------------------------------

/** Rules for the start of a contact, in original order. Each takes the pair in one particular order. */
const BEGAN_RULES = [
  // the door at the end of a level
  (L, hero, door) => {
    if (!isHero(hero) || door.myName !== 'endleveldoor') return;
    const { next, isLast } = nextLevelAfterDoor(L.levelName);
    unlock(L, next);
    if (isLast) L.lastLevelCompleted = true;
    L.gs.timeLeftTotal = L.gs.timeLeft;
    hero.alpha = 0;
    stopJetpackSound(L);
    L.audio.play('doorsound');
    door.play();
    L.gs.state = State.WIN;
  },

  (L, key, ground) => {
    if ((key.myName === 'biggoldcoin' || key.myName === 'key') && isGround(ground)) L.audio.play('coinhitgroundsound');
  },

  (L, checkPoint, hero) => {
    if (checkPoint.myName !== 'checkPoint' || !isHero(hero) || checkPoint.isSet !== false) return;
    L.gs.checkPointReached = true;
    L.gs.checkPointLevel = L.levelName;
    L.gs.checkPointX = checkPoint.x;
    L.gs.checkPointY = checkPoint.y;
    checkPoint.isSet = true;
    L.audio.play('checkpointsound');
    checkPoint.play();
  },

  // one-way platforms: jumping into one from below makes it passable for a moment
  (L, hero, platform) => {
    if (platform.myName !== 'platform' || !isHero(hero) || !(hero.y > platform.y + 12)) return;
    platform.isSensor = true;
    later(L, () => (platform.isSensor = false), 300);
  },

  // the key a boss leaves behind (or Ms. Daddio) ends the world
  (L, key, other) => {
    if (key.myName !== 'key' || !(isHero(other) || other.myName === 'fireBall')) return;
    L.audio.play('endlevelsound');
    const next = nextLevelAfterBoss(L.levelName);
    if (next) unlock(L, next);
    L.gs.timeLeftTotal = L.gs.timeLeft;
    other.alpha = 0;
    key.alpha = 0;
    stopJetpackSound(L);
    const line1 = new Text('Next', 40);
    line1.x = 400;
    line1.y = 160;
    L.groups.hud.insert(line1);
    const line2 = new Text('World Unlocked', 40);
    line2.x = 400;
    line2.y = 200;
    L.groups.hud.insert(line2);
    L.gs.state = State.WIN;
  },

  (L, brick, ground) => {
    if (brick.myName === 'throwbrick' && isGround(ground)) L.audio.play('throwblockthudsound');
  },
  (L, dragon, ground) => {
    if (dragon.myName === 'dragon' && isGround(ground)) L.audio.play('throwblockthudsound');
  },

  // touching a loose block picks it up (the block itself notices on its next update)
  (L, brick, hero) => {
    if (brick.myName !== 'throwbrick' || L.gs.throwBrickisCarry !== false || !isHero(hero)) return;
    L.gs.throwBrickisPickup = true;
    brick.throwBrickisPickup = true;
    playHeroAnimation(L, hero, hero.state, { carrying: true });
  },

  // landing
  (L, ground, hero) => {
    if (!isGround(ground) || !isHero(hero) || !(hero.y < ground.y)) return;
    if (!(hero.x + 11 >= ground.x - ground.width * 0.5 && hero.x - 11 <= ground.x + ground.width * 0.5)) return;
    if (ground.y < hero.jumpStartY) {
      // landed somewhere higher than the jump began: ease the camera up to it
      L.clock.transitionTo(L.groups.game, { time: 350, y: -(hero.y - 330) });
    }
    if (hero.state2 === 'falling') {
      playHeroAnimation(L, hero, hero.state);
      const current = L.gs.heroSize === 'small' ? L.obj.smallHero : L.gs.heroSize === 'big' ? L.obj.bigHero : null;
      if (current) current.checkForce = true;
      hero.jumpStartY = hero.y;
      hero.state2 = 'ready';
    }
  },

  // bumping his head on the underside of something solid ends the jump
  (L, ground, hero) => {
    if (ground.myName === 'ground' && isHero(hero) && hero.y > ground.y + 400) {
      hero.state2 = 'falling';
      stopJetpackSound(L);
    }
  },
  (L, ground, hero) => {
    if (ground.myName3 === 'ground' && isHero(hero) && hero.y > ground.y + 100) {
      hero.state2 = 'falling';
      stopJetpackSound(L);
    }
  },
  (L, ground, hero) => {
    if (ground.myName4 === 'ground' && isHero(hero) && hero.y > ground.y + 38) {
      hero.state2 = 'falling';
      stopJetpackSound(L);
    }
  },

  // hitting blocks from below: the small hero bumps them, the big hero smashes them
  (L, hero, block) => {
    if (block.myName !== 'crackedblock' || hero.myName !== 'smallHero' || !(hero.y > block.y + 31)) return;
    L.audio.play('thudsound');
    hero.state2 = 'falling';
    stopJetpackSound(L);
    if (block.isMoving === false) {
      block.isMoving = true;
      bumpBlock(L, block);
    }
  },
  (L, hero, block) => {
    if (block.myName !== 'crackedblock' || hero.myName !== 'bigHero' || !(hero.y > block.y + 31)) return;
    L.audio.play('breakbricksound');
    hero.state2 = 'falling';
    stopJetpackSound(L);
    later(L, () => breakBrick(L, block));
    addScore(L, block, 50);
  },
  (L, hero, block) => {
    if (block.myName !== 'crackedcoinblock' || hero.myName !== 'smallHero' || !(hero.y > block.y + 31)) return;
    hero.state2 = 'falling';
    stopJetpackSound(L);
    if (block.isMoving === false) {
      block.isMoving = true;
      bumpBlock(L, block);
      L.gs.gameCoins += 1;
      addScore(L, block, 200);
    }
  },
  (L, hero, block) => {
    if (block.myName !== 'crackedcoinblock' || hero.myName !== 'bigHero' || !(hero.y > block.y + 31)) return;
    L.audio.play('breakbricksound');
    hero.state2 = 'falling';
    stopJetpackSound(L);
    block.myName = 'crackedblock';
    later(L, () => spawn.spawnCoinAnimation(L, block.x, block.y));
    later(L, () => breakBrick(L, block), 4);
    L.gs.gameCoins += 1;
    addScore(L, block, 250);
  },
  ...['fireflowerpowerupblock', 'applepowerupblock', 'jetpackpowerupblock'].map((name) => (L, hero, block) => {
    if (block.myName !== name || !isHero(hero) || !(hero.y > block.y + 31)) return;
    hero.state2 = 'falling';
    stopJetpackSound(L);
    L.audio.play('powerupblocksound');
    if (block.isMoving === false) {
      block.isMoving = true;
      bumpBlock(L, block);
    }
  }),

  (L, hero, coin) => {
    if (coin.myName !== 'coin' || !isHero(hero)) return;
    L.audio.play('coinsound');
    later(L, () => removeObject(L, coin));
    L.gs.gameCoins += 1;
    addScore(L, coin, 200);
  },

  // power-ups
  (L, hero, apple) => {
    if (apple.myName !== 'applePowerup' || hero.myName !== 'smallHero') return;
    growHero(L, hero, apple, 'growsound');
    addScore(L, apple, 1000);
  },
  (L, hero, apple) => {
    if (apple.myName !== 'applePowerup' || hero.myName !== 'bigHero') return;
    L.audio.play('growsound');
    later(L, () => removeObject(L, apple));
    addScore(L, apple, 1000);
  },
  (L, hero, flower) => {
    if (flower.myName !== 'fireFlowerPowerup' || hero.myName !== 'bigHero') return;
    L.audio.play('fireballpowerupsound');
    L.gs.throwFireBall = true;
    L.gs.firepower = true;
    later(L, () => removeObject(L, flower));
    addScore(L, flower, 1000);
  },
  (L, hero, flower) => {
    if (flower.myName !== 'fireFlowerPowerup' || hero.myName !== 'smallHero') return;
    growHero(L, hero, flower, 'fireballpowerupsound');
    addScore(L, flower, 1000);
    L.gs.throwFireBall = true;
    L.gs.firepower = true;
  },
  (L, jetpack, hero) => {
    if (jetpack.myName !== 'jetpackPowerup' || hero.myName !== 'bigHero') return;
    L.audio.play('jetpackpowerupsound');
    later(L, () => removeObject(L, jetpack));
    addScore(L, jetpack, 2000);
    L.gs.jetpack = true;
  },
  (L, jetpack, hero) => {
    if (jetpack.myName !== 'jetpackPowerup' || hero.myName !== 'smallHero') return;
    growHero(L, hero, jetpack, 'jetpackpowerupsound');
    addScore(L, jetpack, 2000);
    L.gs.jetpack = true;
  },

  ...ENEMIES.map((def) => (L, a, b) => enemyRules(L, def, a, b)),

  // springboards: landing on one from above launches the hero a frame later
  (L, hero, board) => {
    if (board.myName !== 'springBoard' || !isHero(hero)) return;
    const big = hero.myName === 'bigHero';
    if (!((big ? hero.y + 10 : hero.y) < board.y + 7)) return;
    L.audio.play('springboardsound');
    board.pause();
    board.prepare('boing');
    board.play();
    hero.jumpStartY = hero.y - 800;
    hero.state2 = 'falling';
    stopJetpackSound(L);
    later(L, () => {
      if (board.removed) return;
      if (L.gs.heroSize === 'small') L.obj.smallHero.applyForce(0, -board.force, L.obj.smallHero.x, L.obj.smallHero.y);
      else if (L.obj.bigHero && !L.obj.bigHero.removed) L.obj.bigHero.applyForce(0, -(board.force + 1), L.obj.bigHero.x, L.obj.bigHero.y);
    });
  },

  // pits
  (L, floor, hero) => {
    if (floor.myName !== 'deadfloor' || !isHero(hero)) return;
    L.gs.state = State.STOPPED;
    hero.alpha = 0;
    spawn.spawnHerodie(L, hero.x, hero.y);
  },
  (L, floor, enemy) => {
    if (floor.myName !== 'deadfloor' || enemy.myName2 !== 'badguy') return;
    enemy.isAlive = false;
    later(L, () => removeObject(L, enemy));
  },
  (L, floor, board) => {
    if (floor.myName === 'deadfloor' && board.myName === 'springBoard') later(L, () => removeObject(L, board));
  },
  (L, floor, brick) => {
    if (floor.myName !== 'deadfloor' || brick.myName !== 'throwbrick') return;
    brick.isAlive = false;
    later(L, () => removeObject(L, brick));
  },

  (L, platform, fireBall) => {
    if (platform.myName === 'platform' && fireBall.myName === 'fireBall') fireBall.alpha = 0;
  },
];

// --- contact ends ------------------------------------------------------------------------------------

const JUMPS_RIGHT = new Set(['orangebadguy', 'dragon', 'bluebadguy', 'smalldragon', 'snake']);
const JUMPS_LEFT = new Set(['greenBug', 'orangebadguy', 'dragon', 'bluebadguy', 'smalldragon', 'snake']);

const ENDED_RULES = [
  // leaving a springboard adds its kick
  (L, hero, board) => {
    if (board.myName !== 'springBoard' || !isHero(hero)) return;
    const big = hero.myName === 'bigHero';
    if ((big ? hero.y + 10 : hero.y) < board.y + 7) hero.applyForce(0, -board.force, hero.x, hero.y);
  },
  // walkers hop when they walk off the end of a jump sensor (placed at ledges and gaps)
  (L, sensor, enemy) => {
    if (sensor.myName === 'jumpRightSensor' && JUMPS_RIGHT.has(enemy.myName) && enemy.state === 'walkRight') enemy.state = 'jumpRight';
  },
  (L, sensor, enemy) => {
    if (sensor.myName === 'jumpLeftSensor' && JUMPS_LEFT.has(enemy.myName) && enemy.state === 'walkLeft') enemy.state = 'jumpLeft';
  },
];

export function onCollision(L, event) {
  if (L.gs.state !== State.RUNNING) return;
  const rules = event.phase === 'began' ? BEGAN_RULES : event.phase === 'ended' ? ENDED_RULES : [];
  const { object1, object2 } = event;
  for (const rule of rules) {
    rule(L, object1, object2);
    rule(L, object2, object1);
  }
}

// --- after the solver: how hard things hit -----------------------------------------------------------

/** Points for knocking out each enemy with a thrown (or carried) block. */
const BRICK_VICTIMS = { orangebadguy: 100, purpleflybadguy: 500, orangejumpybadguy: 200, smalldragon: 300, snake: 250, fish: 300, plant: 300, greenBug: 400 };

function brickHitsEnemy(L, brick, enemy, force) {
  if (!(force > 0.01) || brick.myName !== 'throwbrick') return;
  const score = BRICK_VICTIMS[enemy.myName];
  if (score === undefined || enemy.isAlive === false) return;
  L.audio.play('breakbricksound');
  enemy.isAlive = false;
  brick.isAlive = false;
  spawn.spawnPoof(L, enemy.x, enemy.y);
  later(L, () => {
    if (!enemy.removed) enemy.removeSelf();
  });
  later(L, () => breakBrick(L, brick));
  addScore(L, enemy, score);
  L.gs.throwBrickisCarry = false;
  L.gs.throwBrickisPickup = false;
  L.gs.throwTheBrick = false;
}

function heroHitsGround(L, hero, ground, force) {
  if (!(force > 0.136) || !isHero(hero) || !isGround(ground)) return;
  const current = L.gs.heroSize === 'small' ? L.obj.smallHero : L.gs.heroSize === 'big' ? L.obj.bigHero : null;
  if (!current || current.checkForce !== true) return;
  // a hard landing: thump and a puff of dust
  L.audio.play('hitgroundsound');
  current.checkForce = false;
  spawn.spawnDust(L, hero.x, ground.y);
}

export function onPostCollision(L, event) {
  if (L.gs.state !== State.RUNNING) return;
  const { object1, object2, force } = event;
  brickHitsEnemy(L, object1, object2, force);
  brickHitsEnemy(L, object2, object1, force);
  heroHitsGround(L, object1, object2, force);
  heroHitsGround(L, object2, object1, force);
}
