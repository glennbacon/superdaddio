// The game-wide state shared by every scene (the original kept this in one global table).

/** Values of `state`. */
export const State = Object.freeze({
  STOPPED: 0, // level not running (loading, growing, dying, menus busy)
  RUNNING: 1,
  PAUSED: 2,
  UNLOAD: 3, // tear the level down on the next frame
  WIN: 5,
});

/** Values of `state2`: where to go once the level has been unloaded. */
export const After = Object.freeze({
  RELOAD: 1, // hero died, or "restart"
  LEVEL_COMPLETE: 2,
  MENU: 3,
});

export function createGameState() {
  return {
    state: State.STOPPED,
    state2: 0,
    gameScore: 0,
    gameCoins: 0,
    timeLeft: 300,
    timeLeftTotal: 300,
    /** "small" | "big", or "nothingrightnow" while the hero is changing size */
    heroSize: 'small',
    heroX: 0,
    heroY: 0,
    firepower: false,
    throwFireBall: false,
    jetpack: false,
    actionButtonisDown: false,
    throwBrickisPickup: false,
    throwBrickisCarry: false,
    throwTheBrick: false,
    checkPointReached: false,
    /** the level the checkpoint belongs to, e.g. "level1_2" */
    checkPointLevel: null,
    checkPointX: 0,
    checkPointY: 0,
    kills: 0,
    /** true while the hero is invulnerable (start of a level, and after being hit) */
    noHit: true,
    noHitTimer: 210,
  };
}

/**
 * Resets everything a level load resets. The one thing that survives is a checkpoint reached in
 * this same level: the hero died after it, and comes back there instead of at the start.
 *
 * (The original has the code to restart from a checkpoint, but cleared the checkpoint on every
 * load before looking at it, so its checkpoints never did anything.)
 */
export function resetForLevel(gs, level) {
  const { checkPointReached, checkPointLevel, checkPointX, checkPointY } = gs;
  Object.assign(gs, createGameState());
  if (checkPointReached && checkPointLevel === level) Object.assign(gs, { checkPointReached, checkPointLevel, checkPointX, checkPointY });
}

/** Leaving a level any way other than dying: the next load starts from the beginning. */
export function forgetCheckPoint(gs) {
  gs.checkPointReached = false;
  gs.checkPointLevel = null;
}

// --- level progression ---------------------------------------------------------------------------

/** The level a door leads to, e.g. "level1_1" -> "level1_2". The last level (9-4) has no successor. */
export function nextLevelAfterDoor(level) {
  const [, world, stage] = level.match(/^level(\d)_(\d)$/);
  return { next: `level${world}_${Number(stage) + 1}`, isLast: level === 'level9_4' };
}

/** The level a boss key unlocks, e.g. "level1_7" -> "level2_1". */
export function nextLevelAfterBoss(level) {
  const match = level.match(/^level(\d)_7$/);
  return match ? `level${Number(match[1]) + 1}_1` : null;
}

/** Save-data flag that marks a level as unlocked, e.g. "level2_1" -> "world2_1". */
export const unlockKey = (level) => level.replace('level', 'world');

/** Music by level: worlds share tracks, and boss stages (x-7) get the "b" variants. */
export function musicForLevel(level) {
  const [, world, stage] = level.match(/^level(\d)_(\d)$/).map(Number);
  if (stage === 7) return [1, 3, 4, 6, 8].includes(world) ? 'track1b' : 'track2b';
  if (world === 1 || world === 6) return 'track1';
  if (world === 2 || world === 5 || world === 7) return 'track2';
  if (world === 3 || world === 4) return 'track3';
  if (world === 8) return 'track4';
  return null; // world 9 plays without music, as in the original
}
