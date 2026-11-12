// The hero: small and big forms, and the rule for picking his animation.
//
// The two forms are separate sprites with separate bodies. Their densities were tuned so both weigh
// almost exactly the same (~0.023 kg), which is why the same run/jump forces work for both.

import { Sprite } from '../../engine/display.js';

const seq = (start, count, time, loop = 0) => ({ start, count, time, loop });

const SMALL_SHEET = { image: 'images/smallherosheet.png', frameWidth: 64, frameHeight: 64 };
const SMALL_SEQUENCES = {
  heroRunningLeft: seq(7, 3, 350),
  heroRunningRight: seq(2, 3, 350),
  heroFacingRight: seq(11, 2, 500),
  heroFacingLeft: seq(13, 2, 500),
  heroJumpRight: seq(5, 1, 400),
  heroJumpLeft: seq(6, 1, 400),

  heroRunningLeftBlock: seq(22, 3, 350),
  heroRunningRightBlock: seq(17, 3, 350),
  heroFacingRightBlock: seq(18, 1, 500),
  heroFacingLeftBlock: seq(23, 1, 500),
  heroJumpRightBlock: seq(20, 1, 400),
  heroJumpLeftBlock: seq(21, 1, 400),
};

const BIG_SHEET = { image: 'images/bigherosheet.png', frameWidth: 64, frameHeight: 64 };
const BIG_SEQUENCES = {
  heroRunningLeft: seq(12, 3, 350),
  heroRunningRight: seq(2, 3, 350),
  heroFacingRight: seq(41, 2, 500),
  heroFacingLeft: seq(43, 2, 500),
  heroJumpRight: seq(5, 1, 350),
  heroJumpLeft: seq(11, 1, 350),

  redheroRunningLeft: seq(32, 3, 350),
  redheroRunningRight: seq(22, 3, 350),
  redheroFacingRight: seq(51, 2, 500),
  redheroFacingLeft: seq(53, 2, 500),
  redheroJumpRight: seq(25, 1, 400),
  redheroJumpLeft: seq(31, 1, 400),

  heroRunningLeftBlock: seq(16, 3, 350),
  heroRunningRightBlock: seq(7, 3, 350),
  heroFacingRightBlock: seq(8, 1, 500),
  heroFacingLeftBlock: seq(18, 1, 500),
  heroJumpRightBlock: seq(10, 1, 400),
  heroJumpLeftBlock: seq(16, 1, 400),

  redheroRunningLeftBlock: seq(37, 3, 350),
  redheroRunningRightBlock: seq(27, 3, 350),
  redheroFacingRightBlock: seq(28, 1, 500),
  redheroFacingLeftBlock: seq(38, 1, 500),
  redheroJumpRightBlock: seq(30, 1, 400),
  redheroJumpLeftBlock: seq(36, 1, 400),

  heroRunningLeftJetPack: seq(72, 3, 350),
  heroRunningRightJetPack: seq(67, 3, 350),
  heroFacingRightJetPack: seq(101, 2, 500),
  heroFacingLeftJetPack: seq(103, 2, 500),
  heroJumpRightJetPack: seq(70, 1, 350),
  heroJumpLeftJetPack: seq(71, 1, 350),

  redheroRunningLeftJetPack: seq(92, 3, 350),
  redheroRunningRightJetPack: seq(88, 3, 350),
  redheroFacingRightJetPack: seq(111, 2, 500),
  redheroFacingLeftJetPack: seq(113, 2, 500),
  redheroJumpRightJetPack: seq(90, 1, 400),
  redheroJumpLeftJetPack: seq(91, 1, 400),

  heroRunningLeftBlockJetPack: seq(77, 3, 350),
  heroRunningRightBlockJetPack: seq(62, 3, 350),
  heroFacingRightBlockJetPack: seq(126, 2, 500),
  heroFacingLeftBlockJetPack: seq(128, 2, 500),
  heroJumpRightBlockJetPack: seq(65, 1, 400),
  heroJumpLeftBlockJetPack: seq(76, 1, 400),

  redheroRunningLeftBlockJetPack: seq(97, 3, 350),
  redheroRunningRightBlockJetPack: seq(82, 3, 350),
  redheroFacingRightBlockJetPack: seq(136, 1, 500),
  redheroFacingLeftBlockJetPack: seq(138, 1, 500),
  redheroJumpRightBlockJetPack: seq(85, 1, 400),
  redheroJumpLeftBlockJetPack: seq(96, 1, 400),
};

export const isFacingRight = (hero) => hero.state === 'heroFacingRight' || hero.state === 'heroRunningRight';
export const isFacingLeft = (hero) => hero.state === 'heroFacingLeft' || hero.state === 'heroRunningLeft';

/**
 * Plays the animation for a pose ("heroRunningLeft", "heroJumpRight", ...) in whatever outfit the
 * hero currently has: red when he has fire power, with a block when carrying one, with a jetpack.
 * @param {{carrying?: boolean}} [options] overrides the "carrying a block" part of the outfit
 */
export function playHeroAnimation(L, hero, pose, { carrying = L.gs.throwBrickisCarry } = {}) {
  const gs = L.gs;
  let name = pose;
  if (hero.kind === 'big' && gs.firepower) name = 'red' + name;
  if (carrying) name += 'Block';
  if (hero.kind === 'big' && gs.jetpack) name += 'JetPack';
  hero.pause();
  hero.prepare(name);
  hero.play();
}

/** The hero that is currently in play, or null while he is changing size. */
export function currentHero(L) {
  if (L.gs.heroSize === 'small') return L.obj.smallHero;
  if (L.gs.heroSize === 'big') return L.obj.bigHero;
  return null;
}

export function spawnSmallHero(L, x, y) {
  const gs = L.gs;
  gs.jetpack = false;
  if (L.audio.isChannelPlaying(1)) L.audio.stop(1);

  const hero = new Sprite(SMALL_SHEET, SMALL_SEQUENCES);
  hero.prepare('heroFacingRight');
  L.groups.game.insert(hero);
  L.physics.addBody(hero, 'dynamic', { bounce: 0, friction: 0.35, density: 0.6, shape: [0, -12, 11, 0, 11, 11, 0, 12, -11, 11, -11, 0] });
  hero.isFixedRotation = true;
  hero.isBullet = true;
  hero.kind = 'small';
  hero.myName = 'smallHero';
  hero.myName2 = 'hero';
  hero.checkForce = false;
  hero.state = 'heroFacingRight'; // facing / running, left / right
  hero.state2 = 'falling'; // "ready" | "jump" | "fly" | "falling"
  hero.vx = 0;
  hero.vy = 0;
  hero.x = x;
  hero.y = y;
  hero.scrollRightStartX = x - 150;
  hero.scrollLeftStartX = x - 100;
  hero.jumpStartY = hero.y;
  hero.jumpMaxVY = -300;
  hero.jumpEndY = 0;
  hero.jumpMaxY = 80;
  hero.runSpeed = 180;
  hero.play();
  gs.heroSize = 'small';
  L.obj.smallHero = hero;
  return hero;
}

/** Spawns the big hero where the small one was (see L.temp), and resumes the paused level. */
export function spawnBigHero(L) {
  const gs = L.gs;
  const hero = new Sprite(BIG_SHEET, BIG_SEQUENCES);
  hero.prepare('heroFacingRight');
  L.groups.game.insert(hero);
  L.physics.addBody(hero, 'dynamic', { bounce: 0, friction: 0.3, density: 0.35, shape: [0, -20, 11, 0, 11, 19, 0, 20, -11, 19, -11, 0] });
  hero.isFixedRotation = true;
  hero.isBullet = true;
  hero.kind = 'big';
  hero.myName = 'bigHero';
  hero.myName2 = 'hero';
  hero.state = 'heroFacingRight';
  hero.state2 = 'falling';
  hero.checkForce = false;
  hero.vx = 0;
  hero.vy = 0;
  hero.x = L.temp.heroX;
  hero.y = L.temp.heroY;
  hero.scrollRightStartX = L.temp.heroScrollRightStartX;
  hero.scrollLeftStartX = L.temp.heroScrollLeftStartX;
  hero.jumpStartY = L.temp.heroJumpStartY;
  hero.jumpMaxVY = -300;
  hero.jumpEndY = L.temp.heroJumpEndY;
  hero.jumpMaxY = 80;
  hero.runSpeed = 180;
  hero.play();
  gs.heroSize = 'big';
  L.obj.bigHero = hero;
  L.physics.start();
  gs.state = 1;
  return hero;
}
