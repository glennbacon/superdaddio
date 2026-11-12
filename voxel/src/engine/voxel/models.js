// How each piece of the original artwork becomes a voxel model, and where it stands in depth.
//
// The level is a lane running left to right. z = 0 is the middle of the lane, where the hero, the
// enemies and the blocks live; positive z is towards the camera. Terrain is a slab that fills the
// lane from LANE_BACK to LANE_FRONT. Scenery that the original drew behind the hero stands on the
// back half of the slab, scenery it drew in front of him on the front half.

export const LANE_FRONT = 56;
export const LANE_BACK = -104;

/**
 * kind:
 *   inflate  rounded model: deeper the further a pixel is from the outline (the default)
 *   extrude  cut-out of constant thickness `half` * 2
 *   slab     terrain: the image cut out of the whole lane, with a block pattern on it
 *   cube     the image on all six faces of a box `depth` deep
 *   water    a see-through volume filling the lane
 *   spin     a flat cut-out that turns about its vertical axis (coins, keys)
 *   none     never drawn
 *
 * zStep     size of one voxel layer in source pixels
 * bevel     depth gained per pixel of distance from the outline
 * maxDepth  cap on the half-depth, in source pixels
 * pitch     source pixels per voxel across the image (1 = every pixel)
 * z         depth of the model's middle plane: [when drawn behind the hero, when drawn in front]
 * snap      stand on the terrain below instead of sinking into its top band
 * receive   shadows fall on it
 * cast      it throws a shadow
 */
const DEFAULT = { kind: 'inflate', pitch: 1, zStep: 2, bevel: 1, minDepth: 0, maxDepth: 10, alphaMin: 128, relief: true, z: [0, 30], snap: false, cast: true, receive: false, opacity: 1 };

const character = { zStep: 2, maxDepth: 10 };
const critter64 = { zStep: 2, maxDepth: 12 };
const boss = { zStep: 4, maxDepth: 32, bevel: 0.9 };
const slab = { kind: 'slab', receive: true };
const cube = { kind: 'cube', depth: 32, receive: true };
const flower = { zStep: 1, maxDepth: 3, z: [-30, 30], snap: true };
const sign = { kind: 'extrude', half: 3, z: [-30, 32], snap: true };
const hidden = { kind: 'none' };

const MODELS = {
  // terrain
  platform1: slab,
  platform2: slab,
  platform3: slab,
  platform4: slab,
  platform5: slab,
  platformtree: slab,
  invisableground: hidden,
  sensor: hidden,
  water: { kind: 'water', cast: false },
  crackedblock: cube,
  powerupbrick: cube,
  platform: { kind: 'extrude', half: 26, receive: true },
  board: { kind: 'extrude', half: 22, receive: true },
  bridgeend: { kind: 'extrude', half: 5, z: [-27, 27], mirror: true },
  springboardsheet: { kind: 'extrude', half: 16 },

  // scenery
  hill: { zStep: 4, bevel: 0.75, maxDepth: 40, z: [-66, 34], snap: true, receive: true },
  hill2: { zStep: 4, bevel: 0.75, maxDepth: 40, z: [-66, 34], snap: true, receive: true },
  tree: { zStep: 3, bevel: 0.8, maxDepth: 21, z: [-56, 30], snap: true, receive: true },
  tree2: { zStep: 2, bevel: 1, maxDepth: 6, z: [-56, 30], snap: true },
  bush: { zStep: 3, bevel: 0.8, maxDepth: 15, z: [-36, 36], snap: true, receive: true },
  bush2: { zStep: 3, bevel: 0.8, maxDepth: 15, z: [-36, 36], snap: true, receive: true },
  rock: { zStep: 2, bevel: 0.9, maxDepth: 12, z: [-30, 34], snap: true, receive: true },
  cloud: { zStep: 3, bevel: 0.7, maxDepth: 12, z: [-170, -170], cast: false },
  cloud2: { zStep: 3, bevel: 0.7, maxDepth: 12, z: [-170, -170], cast: false },
  yellowflower: flower,
  redflower: flower,
  pinkflower: flower,
  purpleflower: flower,
  sign,
  signleft: sign,
  signright: sign,
  signupleft: sign,
  signupright: sign,
  signdownleft: sign,
  bluedoorsheet: { kind: 'extrude', half: 4, z: [-30, 30] },
  checkpointsheet: { kind: 'extrude', half: 2, z: [-24, 24] },
  checkpointfinish: { kind: 'extrude', half: 2, z: [-24, 24] },

  // pick-ups
  coinsheet: { kind: 'spin', half: 2.5, cast: true },
  keysheet: { kind: 'spin', half: 3 },
  apple: { zStep: 2, maxDepth: 8 },
  fireflower: { zStep: 2, maxDepth: 4 },
  jetpack: { zStep: 2, maxDepth: 6 },
  fireball: { zStep: 2, maxDepth: 6, cast: false, glow: true },

  // the hero
  smallherosheet: character,
  bigherosheet: character,
  hugeherosheet: { pitch: 4, zStep: 8, maxDepth: 40 },
  herodie: character,
  growdad: character,
  shrinkdad: character,
  msdaddio: character,

  // enemies
  orangebadguysheet: character,
  orangejumpybadguysheet: character,
  purplebadguysheet: character,
  bluebadguysheet: character,
  bugsheet: character,
  yellowbadguysheet: critter64,
  snakesheet: critter64,
  smalldragonsheet: critter64,
  fishsheet: { zStep: 2, maxDepth: 6 },
  plantsheet: { zStep: 2, maxDepth: 6 },
  bigredsheet: boss,
  bigyellowsheet: boss,
  snowmansheet: { zStep: 4, maxDepth: 28, bevel: 0.9 },
  cloudmansheet: boss,
  dragonsheet: { zStep: 4, maxDepth: 28, bevel: 0.8 },
  dragonsheet2: { zStep: 4, maxDepth: 28, bevel: 0.8 },

  // effects
  poofsheet: { zStep: 2, maxDepth: 8, alphaMin: 70, cast: false, opacity: 0.85, relief: false },
  dustsheet: { zStep: 2, maxDepth: 4, alphaMin: 70, cast: false, opacity: 0.85, relief: false },
  crackedblockpiece1: { kind: 'extrude', half: 7 },
  crackedblockpiece2: { kind: 'extrude', half: 7 },
  crackedblockpiece3: { kind: 'extrude', half: 7 },
  crackedblockpiece4: { kind: 'extrude', half: 7 },
  crackedblockpiece5: { kind: 'extrude', half: 7 },
  crackedblockpiece6: { kind: 'extrude', half: 7 },
  crackedblockpiece7: { kind: 'extrude', half: 7 },

  // title screen
  superdaddioblock: { kind: 'extrude', half: 30, receive: true },
};

/** Scrolling mountain and cave backdrops: chunky voxels, since they are seen from far away. */
const BACKDROP = { kind: 'backdrop', pitch: 8, zStep: 8, bevel: 0.5, maxDepth: 40, relief: true, cast: false, receive: false, z: [0, 0], snap: false, opacity: 1, alphaMin: 128 };

const cache = new Map();

/** @param {string} image asset path, e.g. "images/hill.png" */
export function modelFor(image) {
  let model = cache.get(image);
  if (!model) {
    const name = image.split('/').pop().replace(/\.png$/, '');
    model = /^world\dp\d[abc]$/.test(name) ? { ...BACKDROP } : { ...DEFAULT, ...MODELS[name] };
    model.name = name;
    cache.set(image, model);
  }
  return model;
}
