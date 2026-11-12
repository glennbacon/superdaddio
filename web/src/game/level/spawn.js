// Everything a level can contain apart from the hero: enemies, items, platforms, scenery and effects.
//
// Sizes, shapes, materials, speeds and forces are the original game's numbers. Forces are tuned to
// body mass (shape area x density), so "tidying" a shape or a density changes how things move.
//
// `L` is the running LevelScene.

import { Image, Sprite, Text, Ref } from '../../engine/display.js';
import { currentHero, isFacingLeft, isFacingRight, playHeroAnimation } from './hero.js';
import { After, State } from '../state.js';

const seq = (start, count, time, loop = 0) => ({ start, count, time, loop });
const sheet = (name, size, height = size) => ({ image: `images/${name}.png`, frameWidth: size, frameHeight: height });

// --- effects -------------------------------------------------------------------------------------

/** Score pop-up that floats up and fades out of existence. */
export function spawnPoints(L, x, y, amount) {
  const points = new Text(amount, 16);
  L.groups.game.insert(points);
  points.x = x;
  points.y = y;
  L.clock.transitionTo(points, { time: 1000, y: points.y - 80 });
  L.clock.performWithDelay(1100, () => points.removeSelf());
}

/** The hero's death animation; when it finishes the level reloads. */
export function spawnHerodie(L, x, y) {
  const herodie = new Image('images/herodie.png', 26, 29);
  L.groups.game.insert(herodie);
  herodie.x = x;
  herodie.y = y;
  L.audio.play('herodiesound');
  L.clock.transitionTo(herodie, { time: 300, y: herodie.y - 100 });
  L.clock.performWithDelay(310, () => L.clock.transitionTo(herodie, { time: 500, y: herodie.y + 300 }));
  L.clock.performWithDelay(810, () => {
    herodie.removeSelf();
    L.gs.state2 = After.RELOAD;
    L.gs.state = State.UNLOAD;
  });
}

export function spawnPoof(L, x, y) {
  const poof = new Sprite(sheet('poofsheet', 64), { poof: seq(1, 4, 400, 1) });
  L.groups.game.insert(poof);
  poof.prepare('poof');
  poof.play();
  poof.x = x;
  poof.y = y;
  L.clock.performWithDelay(400, () => poof.removeSelf());
}

export function spawnDust(L, x, y) {
  const dust = new Sprite(sheet('dustsheet', 64, 16), { dust: seq(1, 5, 400, 1) });
  L.groups.game.insert(dust);
  dust.prepare('dust');
  dust.play();
  dust.x = x;
  dust.y = y;
  L.clock.performWithDelay(450, () => dust.removeSelf());
}

/** The coin that pops out of a coin block. */
export function spawnCoinAnimation(L, x, y) {
  const coin = new Sprite(sheet('coinsheet', 32), { coinSpinning: seq(1, 8, 300) });
  L.groups.game.insert(coin);
  coin.prepare('coinSpinning');
  coin.play();
  coin.x = x;
  coin.y = y;
  L.clock.transitionTo(coin, { time: 400, y: coin.y - 50 });
  L.clock.performWithDelay(500, () => coin.removeSelf());
  L.audio.play('coinsound');
}

const BRICK_PIECES = [
  // piece image, size, offset from the brick, force, where the force is applied relative to the piece
  { n: 1, w: 13, h: 13, dx: -8, dy: -9, fx: -0.3, fy: -0.7, px: 1, py: 1 },
  { n: 2, w: 15, h: 14, dx: 7, dy: -9, fx: 0.2, fy: -1.25, px: -1, py: 1 },
  { n: 3, w: 9, h: 15, dx: -9, dy: 0, fx: -0.09, fy: -0.7, px: 1, py: 1 },
  { n: 4, w: 11, h: 14, dx: 0, dy: 0, fx: -0.2, fy: -0.7, px: 1, py: 1 },
  { n: 5, w: 22, h: 16, dx: 9, dy: 0, fx: 0, fy: -0.5, px: 1, py: 1 },
  { n: 6, w: 21, h: 15, dx: -1, dy: -9, fx: -0.1, fy: -1.2, px: 1, py: 1 },
  { n: 7, w: 15, h: 18, dx: 12, dy: -9, fx: 0.08, fy: -1, px: -1, py: -1 },
];

/** A brick bursting into seven tumbling pieces. */
export function spawnBrokenBricks(L, x, y) {
  for (const piece of BRICK_PIECES) {
    const brick = new Image(`images/crackedblockpiece${piece.n}.png`, piece.w, piece.h);
    brick.x = x + piece.dx;
    brick.y = y + piece.dy;
    brick.myName = 'brokenbricks';
    brick.myName2 = 'ground';
    L.physics.addBody(brick, 'dynamic', { density: 0.3, friction: 0.3, bounce: 0.2 });
    L.groups.game.insert(brick);
    brick.applyForce(piece.fx, piece.fy, brick.x + piece.px, brick.y + piece.py);
    L.clock.performWithDelay(800, () => brick.removeSelf());
  }
}

/** The stretching silhouette shown while the small hero grows (the level is paused meanwhile). */
export function growDaddio(L) {
  const grow = new Image('images/growdad.png', 28, 31);
  grow.setReferencePoint(Ref.TopCenter);
  L.groups.game.insert(grow);
  grow.x = L.temp.heroX - 3;
  grow.y = L.temp.heroY - 32;
  L.clock.performWithDelay(1050, () => grow.removeSelf());
  L.clock.transitionTo(grow, { time: 1000, yScale: 1.5 });
}

export function shrinkDaddio(L, x, y) {
  const shrink = new Image('images/growdad.png', 28, 31);
  shrink.setReferencePoint(Ref.TopCenter);
  L.groups.game.insert(shrink);
  shrink.x = x - 3;
  shrink.y = y - 32;
  shrink.yScale = 1.5;
  L.clock.performWithDelay(550, () => shrink.removeSelf());
  L.clock.transitionTo(shrink, { time: 500, yScale: 1 });
}

// --- blocks and power-ups ------------------------------------------------------------------------

export function spawnBreakableBrick(L, x, y) {
  const brick = new Image('images/crackedblock.png', 32, 32);
  brick.setReferencePoint(Ref.TopCenter);
  L.physics.addBody(brick, 'kinematic', { density: 0.3, friction: 0.2, bounce: 0 });
  brick.x = x;
  brick.y = y;
  brick.myName = 'crackedblock';
  brick.myName2 = 'ground';
  brick.isMoving = false;
  L.groups.game.insert(brick);
  brick.toFront();
  return brick;
}

/** A power-up rises out of its block as a ghost, then becomes a solid object that can fall. */
function spawnPowerup(L, x, y, image, myName, material) {
  const powerup = new Image(`images/${image}.png`, 32, 32);
  powerup.setReferencePoint(Ref.TopCenter);
  L.physics.addBody(powerup, 'static', material);
  powerup.isSensor = true;
  powerup.x = x;
  powerup.y = y;
  powerup.myName = myName;
  L.groups.game.insert(powerup);
  L.clock.transitionTo(powerup, {
    time: 300,
    y: y - 50,
    onComplete: () => {
      powerup.isSensor = false;
      powerup.isFixedRotation = true;
      powerup.isBullet = true;
      powerup.bodyType = 'dynamic';
    },
  });
  return powerup;
}

export const spawnApplePowerup = (L, x, y) => spawnPowerup(L, x, y, 'apple', 'applePowerup', { density: 0.3, friction: 0.2, bounce: 0.1 });
export const spawnJetpackPowerup = (L, x, y) => spawnPowerup(L, x, y, 'jetpack', 'jetpackPowerup', { density: 0, friction: 0.2, bounce: 0 });
export const spawnFireFlowerPowerup = (L, x, y) => spawnPowerup(L, x, y, 'fireflower', 'fireFlowerPowerup', { density: 0, friction: 0.2, bounce: 0 });

// --- pick-ups and goals --------------------------------------------------------------------------

export function spawnCoin(L, x, y) {
  const coin = new Sprite(sheet('coinsheet', 32), { coinSpinning: seq(1, 8, 800) });
  L.groups.game.insert(coin);
  L.physics.addBody(coin, 'static', { density: 0, friction: 0, bounce: 0 });
  coin.isSensor = true;
  coin.prepare('coinSpinning');
  coin.play();
  coin.x = x;
  coin.y = y;
  coin.myName = 'coin';
  return coin;
}

const COIN_PATTERNS = {
  1: [[0, 0], [-40, 0], [40, 0], [0, -40], [0, 40]], // plus
  2: [[0, 0], [0, 40], [0, -40], [40, 0], [40, 40], [40, -40]], // two columns of three
  3: [[0, 0], [32, 24], [-32, -24]], // diagonal, falling to the right
  4: [[0, 0], [-32, 24], [32, -24]], // diagonal, rising to the right
  5: [[0, 0], [-32, 0], [32, 0]], // row of three
  6: [[0, 0], [-40, 0], [-80, 0], [40, 0], [80, 0]], // row of five
  7: [[0, 0], [-40, 0], [40, 0], [0, 40], [-40, 40], [40, 40], [0, -40], [-40, -40], [40, -40]], // 3 x 3
};

export function coinPattern(L, x, y, pattern) {
  for (const [dx, dy] of COIN_PATTERNS[pattern] || []) spawnCoin(L, x + dx, y + dy);
}

/** Dropped by a defeated boss; touching it finishes the world. */
export function spawnKey(L, x, y) {
  const key = new Sprite(sheet('keysheet', 64), { keySpinning: seq(1, 8, 1000) });
  L.groups.game.insert(key);
  L.physics.addBody(key, 'dynamic', { density: 0.3, friction: 0.3, bounce: 0.6, shape: [-4, -24, 4, -24, 4, 28, -4, 28] });
  key.isFixedRotation = true;
  key.prepare('keySpinning');
  key.play();
  key.x = x;
  key.y = y;
  key.myName = 'key';
  return key;
}

/** Ms. Daddio appears instead of a key after the final boss. She works exactly like a key. */
export function spawnLady(L, x, y) {
  const lady = new Image('images/msdaddio.png', 28, 46);
  L.groups.game.insert(lady);
  L.physics.addBody(lady, 'dynamic', { density: 0.3, friction: 0.3, bounce: 0 });
  lady.isFixedRotation = true;
  lady.x = x;
  lady.y = y;
  lady.myName = 'key';
  return lady;
}

export function spawnCheckPoint(L, x, y) {
  const checkPoint = new Sprite(sheet('checkpointsheet', 256), { flagup: seq(1, 14, 400, 1) });
  L.groups.game.insert(checkPoint);
  L.physics.addBody(checkPoint, 'static', { density: 0, friction: 0, bounce: 0, shape: [-10, -72, 10, -72, 10, 72, -10, 72] });
  checkPoint.isSensor = true;
  checkPoint.prepare('flagup');
  checkPoint.x = x;
  checkPoint.y = y;
  checkPoint.isSet = false;
  checkPoint.myName = 'checkPoint';
  return checkPoint;
}

export function spawnDoor(L, x, y, myName) {
  const door = new Sprite(sheet('bluedoorsheet', 128), { closedoor: seq(1, 10, 350, 1) });
  door.prepare('closedoor');
  L.groups.game.insert(door);
  // The original shape list contains a typo ("20,35 -20,35" evaluates 35-20), leaving seven numbers.
  // The engine read three corners from it, so the door's trigger is this triangle, not a rectangle.
  L.physics.addBody(door, 'static', { bounce: 0, friction: 0, density: 0, shape: [-20, -35, 20, -35, 20, 15, 35] });
  door.isSensor = true;
  door.myName = myName;
  door.state = 'dooropen';
  door.x = x;
  door.y = y;
  return door;
}

export function spawnSpringBoard(L, x, y, force) {
  const springBoard = new Sprite(sheet('springboardsheet', 64), { boing: seq(1, 6, 200, 1) });
  L.groups.game.insert(springBoard);
  L.physics.addBody(springBoard, 'dynamic', { bounce: 0.3, friction: 0.2, density: 0.7, shape: [-16, 6, 16, 6, 20, 20, -20, 20] });
  springBoard.myName = 'springBoard';
  springBoard.isFixedRotation = true;
  springBoard.prepare('boing');
  springBoard.x = x;
  springBoard.y = y;
  springBoard.force = force;
  return springBoard;
}

export function spawnFireBall(L, x, y) {
  const hero = L.obj.bigHero;
  const fireBall = new Image('images/fireball.png', 16, 16);
  L.groups.game.insert(fireBall);
  fireBall.x = x;
  fireBall.y = y;
  fireBall.myName = 'fireBall';
  if (isFacingRight(hero)) fireBall.x = fireBall.x + 16;
  if (isFacingLeft(hero)) fireBall.x = fireBall.x - 16;
  L.physics.addBody(fireBall, 'dynamic', { density: 0.3, friction: 0.1, bounce: 0.8, radius: 8 });
  if (isFacingRight(hero)) fireBall.applyForce(2.5, 0.85, fireBall.x, fireBall.y);
  if (isFacingLeft(hero)) fireBall.applyForce(-2.5, 0.85, fireBall.x, fireBall.y);
  L.clock.performWithDelay(1000, () => fireBall.removeSelf());
  L.clock.performWithDelay(400, () => (L.gs.throwFireBall = true));
  return fireBall;
}

// --- the block the hero can carry and throw ------------------------------------------------------

export function spawnThrowBrick(L, x, y) {
  const gs = L.gs;
  const brick = new Image('images/crackedblock.png', 32, 32);
  brick.x = x;
  brick.y = y;
  brick.myName = 'throwbrick';
  brick.myName2 = 'ground';
  brick.throwBrickisPickup = false;
  brick.throwBrickisCarry = false;
  brick.isAlive = true;
  L.groups.game.insert(brick);
  L.physics.addBody(brick, 'dynamic', { density: 0.2, friction: 4, bounce: 0, shape: [-14, -14, 14, -14, 14, 14, -14, 14] });

  const throwIt = (hero, direction, dy) => {
    L.audio.play('pickupblocksound');
    brick.x = hero.x + 40 * direction;
    brick.y = hero.y + dy;
    brick.bodyType = 'dynamic';
    brick.isSensor = false;
    gs.throwBrickisPickup = false;
    gs.throwBrickisCarry = false;
    gs.throwTheBrick = false;
    brick.throwBrickisPickup = false;
    brick.throwBrickisCarry = false;
    brick.applyForce(5 * direction, -2, brick.x - 1, brick.y + 1);
    playHeroAnimation(L, hero, hero.state);
  };

  brick.update = () => {
    if (brick.removed || brick.isAlive !== true) return;
    if (!(gs.heroX > brick.x - 400 && gs.heroX < brick.x + 400)) return;

    // the hero touched it last frame: pick it up
    if (gs.throwBrickisPickup && brick.throwBrickisPickup) {
      L.audio.play('pickupblocksound');
      gs.throwBrickisPickup = false;
      gs.throwBrickisCarry = true;
      brick.throwBrickisCarry = true;
      brick.bodyType = 'static';
    }

    const hero = currentHero(L);
    if (!hero || !gs.throwBrickisCarry || !brick.throwBrickisCarry) return;
    // held out in front of the hero; the big hero holds it lower and further out
    const [reach, hold, release] = hero.kind === 'big' ? [34, -5, -5] : [32, -15, -12];
    if (isFacingRight(hero)) {
      brick.x = hero.x + reach;
      brick.y = hero.y + hold;
    }
    if (isFacingLeft(hero)) {
      brick.x = hero.x - reach;
      brick.y = hero.y + hold;
    }
    if (gs.throwTheBrick && isFacingRight(hero)) throwIt(hero, 1, release);
    else if (gs.throwTheBrick && isFacingLeft(hero)) throwIt(hero, -1, release);
  };
  return brick;
}

// --- platforms -----------------------------------------------------------------------------------

function newPlatform(L, x, y, width, bodyType) {
  const platform = new Image('images/platform.png', width, 12);
  platform.setReferencePoint(Ref.TopCenter);
  L.physics.addBody(platform, bodyType, { density: 0, friction: 0.2, bounce: 0 });
  platform.x = x;
  platform.y = y;
  platform.myName = 'platform';
  platform.myName2 = 'ground';
  L.groups.game.insert(platform);
  platform.toFront();
  return platform;
}

export const spawnPlatform = (L, x, y, width) => newPlatform(L, x, y, width, 'static');

/** Rides up `distanceY` pixels and back, one pixel per frame. */
export function spawnMoveUpPlatform(L, x, y, distanceY, width) {
  const platform = newPlatform(L, x, y, width, 'kinematic');
  platform.startY = y;
  platform.endY = y - distanceY;
  platform.moveUpFlag = true;
  platform.update = () => {
    if (platform.y >= platform.endY && platform.moveUpFlag === true) platform.y = platform.y - 1;
    else if (platform.y <= platform.startY && platform.moveUpFlag === false) platform.y = platform.y + 1;
    if (platform.y > platform.startY && platform.moveUpFlag === false) platform.moveUpFlag = true;
    else if (platform.y < platform.endY && platform.moveUpFlag === true) platform.moveUpFlag = false;
  };
  return platform;
}

export function spawnMoveDownPlatform(L, x, y, distanceY, width) {
  const platform = newPlatform(L, x, y, width, 'kinematic');
  platform.startY = y;
  platform.endY = y + distanceY;
  platform.moveDownFlag = true;
  platform.update = () => {
    if (platform.y <= platform.endY && platform.moveDownFlag === true) platform.y = platform.y + 1;
    else if (platform.y >= platform.startY && platform.moveDownFlag === false) platform.y = platform.y - 1;
    if (platform.y < platform.startY && platform.moveDownFlag === false) platform.moveDownFlag = true;
    else if (platform.y > platform.endY && platform.moveDownFlag === true) platform.moveDownFlag = false;
  };
  return platform;
}

/** A rope bridge: boards pinned end to end between two invisible posts. */
export function spawnBridge(L, x, y, numBoards) {
  const newPole = (px) => {
    const pole = new Image('images/invisableground.png', 24, 24);
    pole.setReferencePoint(Ref.TopCenter);
    L.groups.game.insert(pole);
    pole.x = px;
    pole.y = y;
    pole.alpha = 0;
    L.physics.addBody(pole, 'static', { friction: 0.5 });
    return pole;
  };
  const pole1 = newPole(x);
  const pole2 = newPole(25 * numBoards + x - 2);

  let previous = pole1;
  for (let j = 1; j <= numBoards; j++) {
    const board = new Image('images/board.png', 30, 12);
    L.groups.game.insert(board);
    board.myName2 = 'ground';
    board.x = x - 22 + j * 26;
    board.y = y - 5;
    L.physics.addBody(board, 'dynamic', { density: 0.8, friction: 0.3, bounce: 0.3 });
    // heavy damping is what keeps the bridge taut
    board.angularDamping = 5000;
    board.linearDamping = 0.7;
    L.physics.newPivotJoint(previous, board, x - 36 + j * 26, y - 5);
    previous = board;
  }
  L.physics.newPivotJoint(previous, pole2, x - 36 + (numBoards + 1) * 26, y - 5);
}

// --- scenery -------------------------------------------------------------------------------------

/** Clouds drift left through the level and wrap around. */
export function spawnCloud(L, color, x, y, speed, sizeX, sizeY, startX, endX) {
  const cloud = new Image(color === 'grey' ? 'images/cloud2.png' : 'images/cloud.png', sizeX, sizeY);
  cloud.setReferencePoint(Ref.TopCenter);
  L.groups.game.insert(cloud);
  cloud.myName = 'cloud';
  L.physics.addBody(cloud, 'static', { density: 0, friction: 0, bounce: 0 });
  cloud.isSensor = true;
  cloud.x = x;
  cloud.y = y;
  cloud.speed = speed;
  cloud.update = () => {
    cloud.x = cloud.x - cloud.speed;
    if (cloud.x < startX) cloud.x = endX;
  };
  return cloud;
}

// --- enemies -------------------------------------------------------------------------------------

const ENEMY_MATERIAL = { bounce: 0, friction: 0.25, density: 0.55 };
const HEX_12 = [0, -12, 12, 0, 12, 11, 0, 12, -12, 11, -12, 0];
const HEX_24 = [0, -24, 24, 0, 24, 22, 0, 24, -24, 22, -24, 0];
const HEX_45 = [0, -45, 45, 0, 45, 44, 0, 45, -45, 44, -45, 0];
const scaled = (shape, factor) => shape.map((v) => v * factor);

// "Standing on something", for the enemies that hop whenever they are. The original tested
// "vy == 0": Box2D leaves a body that rests on the ground with a vertical speed of zero, and a tiny
// tolerance keeps that test meaningful with double-precision physics. But an enemy pressed against
// the underside of a block or a platform has no vertical speed either, and one that hops there
// pushes itself up again every frame and never comes down — so something must be holding it up too.
const isResting = (enemy) => Math.abs(enemy.vy) < 1e-4 && enemy.body !== null && enemy.body.isSupported();

function newEnemy(L, x, y, { sheet: enemySheet, sequences, first, shape, material = ENEMY_MATERIAL, myName, myName2 = 'badguy' }) {
  const enemy = new Sprite(enemySheet, sequences);
  L.groups.game.insert(enemy);
  enemy.prepare(first);
  L.physics.addBody(enemy, 'dynamic', { ...material, shape });
  enemy.isFixedRotation = true;
  enemy.isBullet = true;
  enemy.myName = myName;
  enemy.myName2 = myName2;
  enemy.vx = 0;
  enemy.vy = 0;
  enemy.x = x;
  enemy.y = y;
  enemy.isAlive = true;
  enemy.isFireBall = false;
  enemy.play();
  return enemy;
}

const heroInRange = (L, enemy) => L.gs.heroX > enemy.x - 800 && L.gs.heroX < enemy.x + 800;

/**
 * Ground enemies pace back and forth: they push themselves up to `speed`, turn around when a
 * collision tells them to, and hop when they walk off the end of a "jump sensor".
 */
function makeWalker(L, enemy, { state = 'walkLeft', speed, walkForce, jumpForce, alwaysActive = false }) {
  enemy.state = state;
  enemy.speed = speed;
  enemy.update = () => {
    if (enemy.removed || enemy.isAlive !== true) return;
    if (!alwaysActive && !heroInRange(L, enemy)) return;
    [enemy.vx, enemy.vy] = enemy.getLinearVelocity();
    if (enemy.vx < enemy.speed && enemy.state === 'walkRight') enemy.applyForce(walkForce, 0, enemy.x, enemy.y);
    if (enemy.vx > -enemy.speed && enemy.state === 'walkLeft') enemy.applyForce(-walkForce, 0, enemy.x, enemy.y);
    if (enemy.state === 'jumpRight') {
      enemy.applyForce(jumpForce[0], -jumpForce[1], enemy.x, enemy.y);
      enemy.state = 'walkRight';
    }
    if (enemy.state === 'jumpLeft') {
      enemy.applyForce(-jumpForce[0], -jumpForce[1], enemy.x, enemy.y);
      enemy.state = 'walkLeft';
    }
  };
  return enemy;
}

export function spawnOrangeBadGuy(L, x, y) {
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('orangebadguysheet', 32),
    sequences: { orangebadguyWalking: seq(1, 2, 350), orangebadguyStomp: seq(3, 2, 350, 1) },
    first: 'orangebadguyWalking',
    shape: HEX_12,
    myName: 'orangebadguy',
  });
  return makeWalker(L, enemy, { speed: 60, walkForce: 0.6, jumpForce: [2, 9] });
}

export function spawnBlueBadGuy(L, x, y) {
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('bluebadguysheet', 32),
    sequences: { bluebadguyWalking: seq(1, 2, 350) },
    first: 'bluebadguyWalking',
    shape: HEX_12,
    myName: 'bluebadguy',
  });
  return makeWalker(L, enemy, { speed: 60, walkForce: 0.3, jumpForce: [2, 9], alwaysActive: true });
}

export function spawnGreenBug(L, x, y) {
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('bugsheet', 32),
    sequences: { greenBugWalkingLeft: seq(1, 2, 350), greenBugWalkingRight: seq(3, 2, 350) },
    first: 'greenBugWalkingLeft',
    shape: HEX_12,
    myName: 'greenBug',
  });
  return makeWalker(L, enemy, { speed: 80, walkForce: 0.6, jumpForce: [2, 9] });
}

export function spawnSmallDragon(L, x, y) {
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('smalldragonsheet', 64),
    sequences: { smallDragonWalkingLeft: seq(1, 4, 350), smallDragonWalkingRight: seq(5, 4, 350) },
    first: 'smallDragonWalkingLeft',
    shape: HEX_24,
    myName: 'smalldragon',
  });
  return makeWalker(L, enemy, { speed: 60, walkForce: 2.0, jumpForce: [8, 30] });
}

export function spawnSnake(L, x, y) {
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('snakesheet', 64),
    sequences: { snakeWalkingLeft: seq(1, 2, 350), snakeWalkingRight: seq(3, 2, 350) },
    first: 'snakeWalkingLeft',
    shape: HEX_24,
    myName: 'snake',
  });
  return makeWalker(L, enemy, { speed: 60, walkForce: 2.0, jumpForce: [8, 30] });
}

// Bosses. Each hit removes the boss and spawns a smaller one in its place; `L.bossScale` remembers
// how far each has shrunk. The body shape and the forces shrink with it, the sprite is scaled to match.

function shrinkBoss(L, name, step) {
  L.bossScale[name] -= step;
  return L.bossScale[name];
}

function scaleSprite(enemy, scale) {
  enemy.xScale = scale;
  enemy.yScale = scale;
}

export function spawnBigRedBadGuy(L, x, y) {
  const scale = shrinkBoss(L, 'bigRed', 0.1);
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('bigredsheet', 128),
    sequences: { bigredbadguyWalking: seq(1, 2, 350) },
    first: 'bigredbadguyWalking',
    shape: scaled(HEX_45, scale),
    myName: 'bigredbadguy',
  });
  scaleSprite(enemy, scale);
  return makeWalker(L, enemy, { speed: 60, walkForce: 1.3 * scale, jumpForce: [5 * scale, 20 * scale] });
}

export function spawnBigYellowBadGuy(L, x, y) {
  const scale = shrinkBoss(L, 'bigYellow', 0.05);
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('bigyellowsheet', 128),
    sequences: { bigyellowbadguyWalking: seq(1, 2, 350) },
    first: 'bigyellowbadguyWalking',
    shape: scaled(HEX_45, scale),
    myName: 'bigyellowbadguy',
  });
  scaleSprite(enemy, scale);
  return makeWalker(L, enemy, { speed: 100, walkForce: 1.3 * scale, jumpForce: [5 * scale, 20 * scale] });
}

export function spawnSnowman(L, x, y, state) {
  const scale = shrinkBoss(L, 'snowman', 0.1);
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('snowmansheet', 128),
    sequences: { snowmanWalkingLeft: seq(1, 2, 350), snowmanWalkingRight: seq(3, 2, 350) },
    first: state === 'walkRight' ? 'snowmanWalkingRight' : 'snowmanWalkingLeft',
    shape: scaled(HEX_45, scale),
    myName: 'snowman',
  });
  scaleSprite(enemy, scale);
  return makeWalker(L, enemy, { state, speed: 60, walkForce: 1.3 * scale, jumpForce: [5 * scale, 20 * scale] });
}

export function spawnCloudman(L, x, y, state) {
  const scale = shrinkBoss(L, 'cloudman', 0.1);
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('cloudmansheet', 128),
    sequences: { cloudmanWalking: seq(1, 2, 350) },
    first: 'cloudmanWalking',
    shape: scaled([0, -55, 75, 0, 75, 74, 0, 75, -55, 74, -55, 0], scale),
    myName: 'cloudman',
  });
  scaleSprite(enemy, scale);
  return makeWalker(L, enemy, { state, speed: 80, walkForce: 2.3 * scale, jumpForce: [5 * scale, 20 * scale] });
}

export function spawnDragon(L, x, y, state) {
  const scale = shrinkBoss(L, 'dragon', 0.025);
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('dragonsheet', 256),
    sequences: { dragonWalkingLeft: seq(1, 4, 350), dragonWalkingRight: seq(5, 4, 350) },
    first: state === 'walkRight' ? 'dragonWalkingRight' : 'dragonWalkingLeft',
    shape: scaled([-55, -90, 10, -90, 80, 110, 0, 120, -80, 110], scale),
    material: { bounce: 0, friction: 0.2, density: 0.5 },
    myName: 'dragon',
  });
  scaleSprite(enemy, scale);
  // unlike the other bosses, the dragon's walking force does not shrink with it
  return makeWalker(L, enemy, { state, speed: 80, walkForce: 10.0, jumpForce: [30 * scale, 500 * scale] });
}

/** Hops on the spot whenever it is resting on something. */
export function spawnOrangeJumpyBadGuy(L, x, y) {
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('orangejumpybadguysheet', 32),
    sequences: { orangejumpybadguyWalking: seq(1, 2, 350), orangejumpybadguyStomp: seq(3, 2, 350, 1) },
    first: 'orangejumpybadguyWalking',
    shape: HEX_12,
    myName: 'orangejumpybadguy',
  });
  enemy.state = 'bounce';
  enemy.speed = 60;
  enemy.update = () => {
    if (enemy.removed || enemy.isAlive !== true || !heroInRange(L, enemy)) return;
    [enemy.vx, enemy.vy] = enemy.getLinearVelocity();
    if (enemy.state === 'bounce' && isResting(enemy)) enemy.applyForce(0, -7, enemy.x, enemy.y);
  };
  return enemy;
}

/** Patrols between beginX and endX, either hopping along the ground or hovering around endY. */
export function spawnPurpleFlyBadGuy(L, x, y, beginX, beginY, endX, endY, mode) {
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('purplebadguysheet', 32),
    sequences: { purpleflybadguywalking: seq(1, 2, 350), purpleflybadguystomp: seq(3, 2, 350, 1) },
    first: 'purpleflybadguywalking',
    shape: HEX_12,
    myName: 'purpleflybadguy',
  });
  Object.assign(enemy, { state: 'right', mode, beginX, beginY, endX, endY, speed: 40 });
  enemy.update = () => {
    if (enemy.removed || enemy.isAlive !== true) return;
    if (enemy.mode !== 'hop' && enemy.mode !== 'fly') return;
    [enemy.vx, enemy.vy] = enemy.getLinearVelocity();
    if (enemy.state === 'right' && enemy.x < enemy.endX && enemy.vx < enemy.speed) {
      enemy.applyForce(0.1, 0, enemy.x, enemy.y);
    } else if (enemy.state === 'left' && enemy.x > enemy.beginX && enemy.vx > -enemy.speed) {
      enemy.applyForce(-0.1, 0, enemy.x, enemy.y);
    }
    if (enemy.mode === 'hop') {
      if (isResting(enemy)) enemy.applyForce(0, -5, enemy.x, enemy.y);
    } else if (enemy.y >= enemy.endY && enemy.vy > -1) {
      enemy.applyForce(0, -1, enemy.x, enemy.y);
    }
    if (enemy.state === 'right' && enemy.x >= enemy.endX) enemy.state = 'left';
    else if (enemy.state === 'left' && enemy.x <= enemy.beginX) enemy.state = 'right';
  };
  return enemy;
}

/** Leaps out of the water to `endY`, falls back, waits `delay` frames, and leaps again. */
export function spawnFish(L, x, y, endY, delay) {
  const enemy = newEnemy(L, x, y, {
    sheet: sheet('fishsheet', 64),
    sequences: { fishflyup: seq(1, 4, 350), fishflydown: seq(5, 4, 350) },
    first: 'fishflyup',
    shape: HEX_12,
    myName: 'fish',
    myName2: 'fish',
  });
  Object.assign(enemy, { state: 'up', mode: 'up', beginY: y, endY, time: 0, delay, speed: -300 });
  const setAnimation = (name) => {
    enemy.pause();
    enemy.prepare(name);
    enemy.play();
  };
  enemy.update = () => {
    if (enemy.removed || enemy.isAlive !== true) return;
    [enemy.vx, enemy.vy] = enemy.getLinearVelocity();
    enemy.time = enemy.time + 1;
    if (enemy.mode === 'up') {
      if (enemy.state === 'up' && enemy.time > enemy.delay && enemy.vy > enemy.speed) {
        enemy.applyForce(0, -1, enemy.x, enemy.y);
      }
      if (enemy.y < enemy.endY) {
        enemy.mode = 'down';
        setAnimation('fishflydown');
      }
    }
    if (enemy.mode === 'down' && enemy.y > enemy.beginY) {
      // gravity brought it back down
      enemy.time = 0;
      enemy.mode = 'up';
      setAnimation('fishflyup');
    }
  };
  return enemy;
}

/** A snapping plant: far too heavy and grippy to be pushed around. */
export function spawnPlant(L, x, y) {
  return newEnemy(L, x, y, {
    sheet: sheet('plantsheet', 64),
    sequences: { plantchomp: seq(1, 2, 350) },
    first: 'plantchomp',
    shape: [-12, -22, 12, -22, 12, 30, -12, 30],
    material: { bounce: 0, friction: 100.25, density: 100.55 },
    myName: 'plant',
  });
}
