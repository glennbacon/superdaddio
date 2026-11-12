// A running level: builds the world from extracted level data, then runs the per-frame game logic,
// the HUD, the pause menu and the controls.
//
// Level data (src/levels/*.json) is an ordered list of "ops" recorded from the original game's
// level-building code: plain scenery/terrain images, and calls to the spawn functions. Replaying it
// in order reproduces the original draw order as well as the objects themselves.

import { Group, Image, Ref, Text } from '../../engine/display.js';
import { After, State, forgetCheckPoint, musicForLevel, resetForLevel } from '../state.js';
import { currentHero, isFacingRight, playHeroAnimation, spawnSmallHero } from './hero.js';
import { onCollision, onPostCollision } from './collisions.js';
import * as spawn from './spawn.js';

const MUSIC_CHANNEL = 2;
const JETPACK_CHANNEL = 1;

/** Where the camera keeps the hero: he scrolls the view once he passes these screen positions. */
const SCROLL_RIGHT_AT = 450;
const SCROLL_LEFT_AT = 250;
const HERO_SCREEN_Y = 330;
/** A level starts with the hero this far left of where its data spawns him (see _build). */
const HERO_START_SHIFT = 149;

const inside = (event, x1, x2, y1, y2) => event.x >= x1 && event.x <= x2 && event.y >= y1 && event.y <= y2;
const released = (event) => event.phase === 'ended' || event.phase === 'cancelled';

export class LevelScene {
  /**
   * @param {object} app shared services: clock, physics, audio, save, gameState, gotoScene()
   * @param {object} data one level's extracted data
   */
  constructor(app, data) {
    this.app = app;
    this.clock = app.clock;
    this.physics = app.physics;
    this.audio = app.audio;
    this.save = app.save;
    this.gs = app.gameState;
    this.data = data;
    this.levelName = data.level;
    this.worldlevel = data.worldlevel;
    this.env = data.env;

    /** Named objects: the heroes, HUD pieces and everything the level updates each frame. */
    this.obj = {};
    /** Hero values carried over from the small hero to the big one while he grows. */
    this.temp = { heroX: 0, heroY: 0, heroScrollRightStartX: 0, heroScrollLeftStartX: 0, heroJumpStartY: 0, heroJumpEndY: 0 };
    /** Current size of each boss; every hit spawns a smaller replacement. */
    this.bossScale = { bigRed: 1, bigYellow: 1, snowman: 1, cloudman: 1, dragon: 1 };
    this.jumpTimer = 0;
    this.blinkCounter = 0;
    this.lastLevelCompleted = false;
    this.heldKeys = new Set();

    this.view = new Group();
    this.groups = {
      game: new Group(), // everything that scrolls with the level
      flower: new Group(), // foreground scenery, drawn in front of the hero
      gameP1: new Group(), // near parallax layer
      gameP2: new Group(), // far parallax layer
      hud: new Group(),
      weather: new Group(),
      pause: new Group(),
    };
    // what each group is, for the renderer (see engine/voxel/VoxelRenderer.js)
    this.groups.game.layer = 'world';
    this.groups.flower.layer = 'front';
    this.groups.gameP1.layer = 'far1';
    this.groups.gameP2.layer = 'far2';
    this.groups.weather.layer = 'weather';
    this.background = null;
    this.weatherTiles = [];

    this._build();
  }

  // --- building the level ----------------------------------------------------------------------

  _build() {
    const gs = this.gs;
    resetForLevel(gs, this.levelName);

    const calls = this._calls();
    for (const op of this.data.ops) {
      if (op.op === 'img') {
        this._addImage(op);
      } else if (op.op === 'call') {
        const fn = calls[op.fn];
        if (!fn) throw new Error(`Level ${this.levelName} uses unknown function ${op.fn}`);
        const result = fn(...op.args);
        if (op.key) this.obj[op.key] = result;
      }
    }

    const { game, flower, gameP1, gameP2, hud, weather, pause } = this.groups;
    game.insert(flower);
    flower.toFront();
    if (this.background) this.view.insert(this.background);
    for (const group of [gameP2, gameP1, game, hud, weather, pause]) this.view.insert(group);

    this.physics.onCollision = (event) => onCollision(this, event);
    this.physics.onPostCollision = (event) => onPostCollision(this, event);
    this.physics.start();

    gs.timeLeft = 300;
    gs.state = State.RUNNING;
    // the level timer: one unit every 400 ms
    this.countdownTimer = this.clock.performWithDelay(400, () => {
      if (gs.timeLeft > 0 && gs.state === State.RUNNING) gs.timeLeft -= 1;
    }, 0);

    // The hero starts one pixel past his scroll threshold so the first frame centres the camera on him.
    const hero = currentHero(this);
    hero.x = hero.scrollRightStartX + 1;

    this._startMusic();
  }

  /** The functions level data may call, bound to this level. */
  _calls() {
    const bind = (fn) => (...args) => fn(this, ...args);
    return {
      loadParallax: (...images) => this._loadParallax(...images),
      loadHud: () => this._loadHud(),
      loadEnvironment: () => this._loadEnvironment(),
      loadPauseMenu: () => this._loadPauseMenu(),
      spawnSmallHero: (x, y) => this._spawnHeroAtStart(x, y),
      coinPattern: bind(spawn.coinPattern),
      spawnCloud: bind(spawn.spawnCloud),
      spawnBridge: bind(spawn.spawnBridge),
      spawnDoor: bind(spawn.spawnDoor),
      spawnThrowBrick: bind(spawn.spawnThrowBrick),
      spawnCheckPoint: (x, y) => this._spawnCheckPoint(x, y),
      spawnSpringBoard: bind(spawn.spawnSpringBoard),
      spawnPlatform: bind(spawn.spawnPlatform),
      spawnMoveUpPlatform: bind(spawn.spawnMoveUpPlatform),
      spawnMoveDownPlatform: bind(spawn.spawnMoveDownPlatform),
      spawnOrangeBadGuy: bind(spawn.spawnOrangeBadGuy),
      spawnOrangeJumpyBadGuy: bind(spawn.spawnOrangeJumpyBadGuy),
      spawnPurpleFlyBadGuy: bind(spawn.spawnPurpleFlyBadGuy),
      spawnBlueBadGuy: bind(spawn.spawnBlueBadGuy),
      spawnGreenBug: bind(spawn.spawnGreenBug),
      spawnSnake: bind(spawn.spawnSnake),
      spawnSmallDragon: bind(spawn.spawnSmallDragon),
      spawnFish: bind(spawn.spawnFish),
      spawnPlant: bind(spawn.spawnPlant),
      spawnBigRedBadGuy: bind(spawn.spawnBigRedBadGuy),
      spawnBigYellowBadGuy: bind(spawn.spawnBigYellowBadGuy),
      spawnSnowman: bind(spawn.spawnSnowman),
      spawnCloudman: bind(spawn.spawnCloudman),
      spawnDragon: bind(spawn.spawnDragon),
    };
  }

  /** The hero's starting place: the level's own, or above the checkpoint he reached before he died. */
  _spawnHeroAtStart(x, y) {
    const gs = this.gs;
    if (!gs.checkPointReached) return spawnSmallHero(this, x, y);
    return spawnSmallHero(this, gs.checkPointX + HERO_START_SHIFT, gs.checkPointY);
  }

  /** A checkpoint flag — or, where the hero is restarting from it, the raised flag it has become. */
  _spawnCheckPoint(x, y) {
    const gs = this.gs;
    if (!(gs.checkPointReached && gs.checkPointX === x && gs.checkPointY === y)) return spawn.spawnCheckPoint(this, x, y);
    const finish = new Image('images/checkpointfinish.png', 144, 144);
    finish.x = x;
    finish.y = y;
    this.groups.game.insert(finish);
    this.obj.checkPointFinish = finish;
    return undefined;
  }

  /** One piece of terrain or scenery, set up in the same order the original code did it. */
  _addImage(op) {
    const props = Array.isArray(op.props) ? {} : op.props || {};
    const image = new Image(op.img, op.w, op.h);
    if (op.ref) image.setReferencePoint(Ref[op.ref]);
    image.x = op.x;
    image.y = op.y;
    if (props.rotation !== undefined) image.rotation = props.rotation;
    for (const [key, value] of Object.entries(props)) {
      if (key !== 'rotation' && key !== 'isSensor') image[key] = value;
    }
    if (op.group === 'game') this.groups.game.insert(image);
    else if (op.group === 'flower') this.groups.flower.insert(image);
    else if (op.group === 'sceneView') {
      image.layer = 'sky';
      this.background = image;
    }
    // else: never added to a group in the original either — it has no visible effect, but any body still counts
    if (op.body) {
      this.physics.addBody(image, op.body.type, { density: op.body.density, friction: op.body.friction, bounce: op.body.bounce });
      if (props.isSensor) image.isSensor = true;
    }
  }

  /**
   * Two layers of repeating 800px-wide backdrop tiles (a, b, c, a, b, c...) that scroll slower
   * than the level. The far layer extends further because it moves the least.
   */
  _loadParallax(p1a, p1b, p1c, p2a, p2b, p2c) {
    const fill = (group, images, from, to) => {
      for (let k = from; k <= to; k++) {
        const tile = new Image(images[((k % 3) + 3) % 3], 800, 480);
        tile.x = 400 + 800 * k;
        tile.y = 240;
        group.insert(tile);
      }
    };
    fill(this.groups.gameP1, [p1a, p1b, p1c], -10, 15);
    fill(this.groups.gameP2, [p2a, p2b, p2c], -18, 17);
  }

  _loadHud() {
    const hud = this.groups.hud;
    const button = (name, x, y, size) => {
      const image = new Image(`images/${name}.png`, size, size);
      image.x = x;
      image.y = y;
      return hud.insert(image);
    };
    const label = (text, x, y) => {
      const t = new Text(text, 24);
      t.setReferencePoint(Ref.CenterLeft);
      t.x = x;
      t.y = y;
      return hud.insert(t);
    };
    button('leftbuttonup', 60, 430, 100);
    button('rightbuttonup', 175, 430, 100);
    button('actionbuttonup', 615, 430, 100);
    button('jumpbuttonup', 730, 430, 100);
    button('pausebuttonup', 50, 110, 80);
    label('Score', 230, 440);
    this.obj.scoreTxtNum = label('0', 335, 440);
    label('World', 230, 470);
    label(this.worldlevel, 335, 470);
    label('Time', 420, 470);
    this.obj.timeTxtNum = label('400', 510, 470);
  }

  /** The pause menu is four corner pieces parked just off screen; they slide together when paused. */
  _loadPauseMenu() {
    const piece = (n, ref, x, y) => {
      const image = new Image(`images/pausemenu${n}.png`, 165, 185);
      image.setReferencePoint(ref);
      image.x = x;
      image.y = y;
      image.home = [x, y];
      return this.groups.pause.insert(image);
    };
    this.pausePieces = [
      piece(1, Ref.BottomRight, -1, -1),
      piece(2, Ref.BottomLeft, 801, -1),
      piece(3, Ref.TopRight, -1, 481),
      piece(4, Ref.TopLeft, 801, 481),
    ];
  }

  /** Rain or snow: three overlay tiles that fall diagonally and wrap around. */
  _loadEnvironment() {
    const weather = this.env.isRaining ? { image: 'images/rainbackground.png', dx: -2, dy: 4, wrapX: 320 } : this.env.isSnowing ? { image: 'images/snowbackground.png', dx: -1, dy: 3, wrapX: 160 } : null;
    if (!weather) return;
    this.weather = weather;
    for (const [x, y] of [[0, 0], [0, -480], [weather.wrapX, -960]]) {
      const tile = new Image(weather.image, 1120, 480);
      this.groups.weather.insert(tile);
      tile.setReferencePoint(Ref.TopLeft);
      tile.x = x;
      tile.y = y;
      this.weatherTiles.push(tile);
    }
  }

  _settings() {
    return this.save.loadBox('audioSetting');
  }

  _musicEnabled() {
    const settings = this._settings();
    return settings.retrieve('soundOn') === 'true' && settings.retrieve('musicOn') === 'true';
  }

  _startMusic() {
    this.audio.setVolume(1.0);
    const track = musicForLevel(this.levelName);
    if (track && this._musicEnabled()) {
      this.audio.setVolume(0.3, MUSIC_CHANNEL);
      this.audio.play(track, { channel: MUSIC_CHANNEL, loop: true });
    }
    if (this._settings().retrieve('soundOn') === 'false') this.audio.setVolume(0.0);
  }

  /** What the renderer wants to know about the level: its weather, how far it has scrolled, where the hero is on screen. */
  renderHints() {
    const game = this.groups.game;
    return { env: this.env, scrollX: game.x, scrollY: game.y, focus: [this.gs.heroX + game.x, this.gs.heroY + game.y] };
  }

  // --- every frame -------------------------------------------------------------------------------

  enterFrame() {
    const gs = this.gs;
    if (gs.state === State.PAUSED || gs.state === State.STOPPED) this._animateWeather();
    if (gs.state === State.UNLOAD) this._unload();
    if (gs.state === State.WIN) {
      forgetCheckPoint(gs);
      gs.state2 = After.LEVEL_COMPLETE;
      gs.state = State.UNLOAD;
    }
    if (gs.state !== State.RUNNING) return;

    // Three seconds after the last jump the hero is always allowed to jump again. This is the
    // original's safety net for landings it failed to notice — and it makes a mid-air jump possible.
    this.jumpTimer += 1;
    if (this.jumpTimer > 180) {
      const hero = currentHero(this);
      if (hero) hero.state2 = 'ready';
      this.jumpTimer = 0;
    }

    this._blinkWhileInvulnerable();

    const hero = currentHero(this);
    if (hero) this._updateHero(hero);

    const game = this.groups.game;
    this.groups.gameP1.x = game.x * 0.3;
    this.groups.gameP2.x = game.x * 0.1 - 110;

    this.obj.scoreTxtNum.text = gs.gameScore;
    this.obj.timeTxtNum.text = gs.timeLeft;

    for (const name of this.data.updates) this.obj[name].update();

    this._animateWeather();
  }

  _blinkWhileInvulnerable() {
    const gs = this.gs;
    if (gs.noHit !== true) return;
    const hero = currentHero(this);
    const n = this.blinkCounter;
    if (hero && (n === 10 || n === 30 || n === 50)) hero.alpha = 0.9;
    if (hero && (n === 0 || n === 20 || n === 40)) hero.alpha = 0.5;
    this.blinkCounter = n === 60 ? 0 : n + 1;
    if (gs.noHitTimer === 0) {
      gs.noHit = false;
      gs.noHitTimer = 210;
      this.blinkCounter = 0;
      if (hero) hero.alpha = 1;
    } else {
      gs.noHitTimer -= 1;
    }
  }

  _updateHero(hero) {
    const gs = this.gs;
    const game = this.groups.game;
    gs.heroX = hero.x;
    gs.heroY = hero.y;

    // Camera, vertical: follow the hero down whenever he drops below where his jump began, and up
    // when he walks uphill. During a jump the view holds still.
    if (hero.state2 === 'ready' && hero.y < hero.jumpStartY) {
      game.y = -(hero.y - HERO_SCREEN_Y);
      hero.jumpStartY = hero.y;
    }
    if (hero.y > hero.jumpStartY) game.y = -(hero.y - HERO_SCREEN_Y);

    // Camera, horizontal: a 200px dead zone. Pushing against either edge drags the view along.
    if (hero.x > hero.scrollRightStartX) {
      hero.scrollRightStartX = hero.x;
      hero.scrollLeftStartX = hero.x - 200;
      game.x = -(hero.x - SCROLL_RIGHT_AT);
    }
    if (hero.x < hero.scrollLeftStartX) {
      hero.scrollLeftStartX = hero.x;
      hero.scrollRightStartX = hero.x + 200;
      game.x = -(hero.x - SCROLL_LEFT_AT);
    }

    [hero.vx, hero.vy] = hero.getLinearVelocity();

    // Jumping is a sustained upward push while the button is held, until the hero has risen
    // jumpMaxY pixels or is already moving up fast enough.
    if (hero.state2 === 'jump' && hero.vy > hero.jumpMaxVY && hero.y > hero.jumpEndY) hero.applyForce(0, -0.8, hero.x, hero.y);
    if (hero.state2 === 'jump' && hero.y < hero.jumpEndY) hero.state2 = 'falling';

    // the jetpack pushes harder and 120px higher
    if (hero.kind === 'big') {
      if (hero.state2 === 'fly' && hero.vy > hero.jumpMaxVY && hero.y > hero.jumpEndY - 120) hero.applyForce(0, -1, hero.x, hero.y);
      if (hero.state2 === 'fly' && hero.y < hero.jumpEndY - 120) {
        hero.state2 = 'falling';
        this.audio.stop(JETPACK_CHANNEL);
      }
    }

    if (hero.state === 'heroRunningRight' && hero.vx < hero.runSpeed) hero.applyForce(0.5, 0, hero.x, hero.y);
    if (hero.state === 'heroRunningLeft' && hero.vx > -hero.runSpeed) hero.applyForce(-0.5, 0, hero.x, hero.y);
  }

  _animateWeather() {
    if (!this.weather) return;
    for (const tile of this.weatherTiles) {
      tile.y = tile.y + this.weather.dy;
      tile.x = tile.x + this.weather.dx;
    }
    for (const tile of this.weatherTiles) {
      if (tile.y >= 480) {
        tile.y = -960;
        tile.x = this.weather.wrapX;
      }
    }
  }

  /** Stops the level and, two seconds later, moves on to whatever `gs.state2` says comes next. */
  _unload() {
    const gs = this.gs;
    gs.state = State.STOPPED;
    this.physics.pause();
    this.clock.cancel(this.countdownTimer);
    this.clock.performWithDelay(2000, () => {
      this.audio.stop();
      if (gs.state2 === After.RELOAD) this.app.gotoScene('level');
      else if (gs.state2 === After.LEVEL_COMPLETE && !this.lastLevelCompleted) this.app.gotoScene('levelcomplete');
      else this.app.gotoScene('selectworld');
    });
  }

  destroy() {
    this.physics.onCollision = null;
    this.physics.onPostCollision = null;
    this.physics.pause();
    this.view.removeSelf();
    this.physics.clear();
  }

  // --- controls ----------------------------------------------------------------------------------
  //
  // Touch zones are the original's: the left edge of the screen runs left, the middle-left runs
  // right, and the bottom right holds action and jump. Keys call the same handlers.

  onTouch(event) {
    const gs = this.gs;
    if (gs.state === State.RUNNING) {
      if (inside(event, 0, 126, 0, 480)) this._run('Left', event.phase === 'began', true, released(event));
      if (inside(event, 127, 500, 0, 480)) this._run('Right', event.phase === 'began', true, released(event));
      if (inside(event, 670, 800, 300, 480)) {
        if (event.phase === 'began') this._jumpPressed();
        if (released(event)) this._jumpReleased();
      }
      if (inside(event, 497, 669, 300, 480)) {
        if (event.phase === 'began') this._actionPressed();
        if (released(event)) this._actionReleased();
      }
      if (inside(event, 0, 100, 70, 150) && released(event)) {
        this._pause();
        return;
      }
    }
    if (gs.state === State.PAUSED && released(event)) {
      if (inside(event, 300, 500, 152, 192)) this._resume();
      if (inside(event, 300, 500, 222, 262)) this._restart();
      if (inside(event, 300, 500, 300, 340)) this._quitToMenu();
    }
  }

  onKey({ phase, action }) {
    const gs = this.gs;
    const down = phase === 'down';
    if (down) this.heldKeys.add(action);
    else this.heldKeys.delete(action);

    if (gs.state === State.PAUSED) {
      if (!down) return;
      if (action === 'pause' || action === 'confirm') this._resume();
      else if (action === 'restart') this._restart();
      else if (action === 'menu') this._quitToMenu();
      return;
    }
    if (gs.state !== State.RUNNING) return;

    if (action === 'left' || action === 'right') {
      const direction = action === 'left' ? 'Left' : 'Right';
      const opposite = action === 'left' ? 'right' : 'left';
      if (!down && this.heldKeys.has(opposite)) {
        // One direction was released while the other is still held. The original stopped the hero
        // here, which suits two thumbs on a touch screen but not rolling across keys: keep running
        // the way that is still held.
        const hero = currentHero(this);
        if (hero && hero.state !== `heroRunning${direction}`) return;
        this._run(direction, false, false, true);
        this._run(direction === 'Left' ? 'Right' : 'Left', true, false, false);
        return;
      }
      this._run(direction, down, false, !down);
    } else if (action === 'jump') {
      if (down) this._jumpPressed();
      else this._jumpReleased();
    } else if (action === 'action') {
      if (down) this._actionPressed();
      else this._actionReleased();
    } else if (action === 'pause' && down) {
      this._pause();
    }
  }

  /**
   * One event on a run control.
   * @param {'Left'|'Right'} direction
   * @param {boolean} pressed the control went down
   * @param {boolean} dragging a touch that is merely over the control also turns a hero who is
   *        running the other way (sliding a thumb from one button to the other)
   * @param {boolean} let_go the control was released: stop, with a nudge against the motion
   */
  _run(direction, pressed, dragging, let_go) {
    const hero = currentHero(this);
    if (!hero) return;
    const running = `heroRunning${direction}`;
    const other = direction === 'Left' ? 'heroRunningRight' : 'heroRunningLeft';
    if (pressed || ((dragging || let_go) && hero.state === other)) {
      hero.state = running;
      playHeroAnimation(this, hero, running);
    }
    if (let_go) {
      hero.applyForce(direction === 'Left' ? 1.5 : -1.5, 0, hero.x, hero.y);
      hero.state = `heroFacing${direction}`;
      playHeroAnimation(this, hero, hero.state);
    }
  }

  _jumpPressed() {
    const gs = this.gs;
    const hero = currentHero(this);
    if (!hero || hero.state2 !== 'ready') return;
    this.jumpTimer = 0;
    hero.jumpStartY = hero.y;
    if (hero.kind === 'big' && gs.jetpack) {
      hero.state2 = 'fly';
      if (!this.audio.isChannelPlaying(JETPACK_CHANNEL)) this.audio.play('jetpacksound', { channel: JETPACK_CHANNEL, loop: true });
    } else {
      hero.state2 = 'jump';
      this.audio.play('jumpsound');
    }
    playHeroAnimation(this, hero, isFacingRight(hero) ? 'heroJumpRight' : 'heroJumpLeft');
    hero.jumpEndY = hero.y - hero.jumpMaxY;
  }

  _jumpReleased() {
    const hero = currentHero(this);
    if (!hero) return;
    if (hero.state2 === 'jump' || (hero.kind === 'big' && hero.state2 === 'fly')) {
      hero.state2 = 'falling';
      if (this.audio.isChannelPlaying(JETPACK_CHANNEL)) this.audio.stop(JETPACK_CHANNEL);
    }
  }

  /** Holding action is "run": faster, higher jumps. With fire power, pressing it also throws a fireball. */
  _actionPressed() {
    const gs = this.gs;
    const hero = currentHero(this);
    if (hero) {
      hero.runSpeed = 260;
      hero.jumpMaxY = 100;
      hero.timeScale = 1.75;
      if (hero.kind === 'big' && gs.throwFireBall === true && gs.throwBrickisCarry === false) {
        gs.throwFireBall = false;
        this.audio.play('fireballsound');
        spawn.spawnFireBall(this, hero.x, hero.y);
      }
    }
    gs.actionButtonisDown = true;
  }

  /** Releasing action throws the block the hero is carrying. */
  _actionReleased() {
    const gs = this.gs;
    const hero = currentHero(this);
    if (hero) {
      hero.runSpeed = 180;
      hero.jumpMaxY = 80;
      hero.timeScale = 1.0;
    }
    gs.actionButtonisDown = false;
    if (gs.throwBrickisCarry === true) gs.throwTheBrick = true;
  }

  // --- pause menu --------------------------------------------------------------------------------

  _pause() {
    if (this.gs.state !== State.RUNNING) return;
    this.audio.play('clicksound');
    if (this._musicEnabled()) this.audio.pause(MUSIC_CHANNEL);
    if (this.audio.isChannelPlaying(JETPACK_CHANNEL)) this.audio.stop(JETPACK_CHANNEL);
    this.physics.pause();
    this.gs.state = State.PAUSED;
    this.groups.pause.toFront();
    if (this.background) this.clock.transitionTo(this.background, { time: 500, alpha: 0 });
    this.clock.transitionTo(this.groups.game, { time: 500, alpha: 0.4 });
    this.clock.transitionTo(this.groups.hud, { time: 500, alpha: 0.3 });
    for (const piece of this.pausePieces) this.clock.transitionTo(piece, { time: 500, x: 400, y: 240 });
  }

  _closePauseMenu() {
    if (this.background) this.clock.transitionTo(this.background, { time: 500, alpha: 1 });
    this.clock.transitionTo(this.groups.game, { time: 500, alpha: 1 });
    this.clock.transitionTo(this.groups.hud, { time: 500, alpha: 1 });
    for (const piece of this.pausePieces) this.clock.transitionTo(piece, { time: 500, x: piece.home[0], y: piece.home[1] });
  }

  _resume() {
    if (this.gs.state !== State.PAUSED) return;
    this.audio.play('clicksound');
    if (this._musicEnabled()) this.audio.resume(MUSIC_CHANNEL);
    this.gs.state = State.RUNNING;
    this._closePauseMenu();
    this.physics.start();
  }

  /**
   * "Restart" costs the hero his life: the death animation plays and the level reloads — from the
   * very beginning, even if he had reached a checkpoint.
   */
  _restart() {
    if (this.gs.state !== State.PAUSED) return;
    forgetCheckPoint(this.gs);
    this.gs.state = State.STOPPED;
    this.audio.play('clicksound');
    if (this._musicEnabled()) this.audio.resume(MUSIC_CHANNEL);
    this._closePauseMenu();
    const hero = currentHero(this);
    if (hero) {
      hero.alpha = 0;
      spawn.spawnHerodie(this, hero.x, hero.y);
    } else {
      this.gs.state2 = After.RELOAD;
      this.gs.state = State.UNLOAD;
    }
  }

  _quitToMenu() {
    if (this.gs.state !== State.PAUSED) return;
    this.audio.play('coinsound');
    const loading = new Text('Loading menu...', 32);
    loading.x = 400;
    loading.y = 370;
    this.groups.pause.insert(loading);
    forgetCheckPoint(this.gs);
    this.gs.state = State.STOPPED;
    this.gs.state2 = After.MENU;
    this._unload();
  }
}
