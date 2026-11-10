// A tiny 2D display list: groups, images, sprite-sheet animations and text.
//
// This is the logic-side scene graph. It has no dependency on Three.js, so the whole game can run
// headless (see tests/). `renderer.js` walks this tree every frame and mirrors it into Three.js meshes.
//
// Coordinates are the game's content space: 800x480, y pointing down, rotation in degrees clockwise.
//
// Like the engine the game was written for, an object's x/y is the position of its *reference point*
// (centre by default). Level art is anchored "top centre", and game logic compares those y values
// directly (e.g. "hero is 31px below the top of this brick"), so the reference-point semantics are
// part of the gameplay, not just layout.

/** Reference points, as a fraction of (width, height) measured from the centre. */
export const Ref = Object.freeze({
  Center: [0, 0],
  TopLeft: [-0.5, -0.5],
  TopCenter: [0, -0.5],
  TopRight: [0.5, -0.5],
  CenterLeft: [-0.5, 0],
  CenterRight: [0.5, 0],
  BottomLeft: [-0.5, 0.5],
  BottomCenter: [0, 0.5],
  BottomRight: [0.5, 0.5],
});

const DEG = Math.PI / 180;

// Text needs real font metrics, which only exist in a browser. The renderer installs a real
// measurer; headless runs fall back to this estimate.
let textMeasurer = (text, size) => ({ width: Math.ceil(String(text).length * size * 0.6), height: Math.ceil(size * 1.2) });
export function setTextMeasurer(fn) {
  textMeasurer = fn;
}

export class DisplayObject {
  constructor(width = 0, height = 0) {
    this.parent = null;
    this.width = width;
    this.height = height;
    this.alpha = 1;
    this.isVisible = true;
    this.removed = false;
    /** @type {import('./physics.js').PhysicsBody | null} */
    this.body = null;
    this.view = null; // owned by the renderer

    // Centre of the object in parent coordinates. Physics bodies live at the centre.
    this._cx = 0;
    this._cy = 0;
    this._rotation = 0;
    this._xScale = 1;
    this._yScale = 1;
    this._refX = 0;
    this._refY = 0;
  }

  /** Vector from the centre to the reference point, in parent coordinates. */
  _refOffset() {
    const ox = this._refX * this.width * this._xScale;
    const oy = this._refY * this.height * this._yScale;
    if (this._rotation === 0) return [ox, oy];
    const c = Math.cos(this._rotation * DEG);
    const s = Math.sin(this._rotation * DEG);
    return [ox * c - oy * s, ox * s + oy * c];
  }

  /** Changes which point x/y refer to. The object itself does not move. */
  setReferencePoint(ref) {
    this._refX = ref[0];
    this._refY = ref[1];
  }

  get x() {
    return this._cx + this._refOffset()[0];
  }
  set x(value) {
    this._cx = value - this._refOffset()[0];
    this._movedByGame();
  }

  get y() {
    return this._cy + this._refOffset()[1];
  }
  set y(value) {
    this._cy = value - this._refOffset()[1];
    this._movedByGame();
  }

  // Rotation and scale pivot around the reference point.
  get rotation() {
    return this._rotation;
  }
  set rotation(value) {
    this._pivot(() => (this._rotation = value));
  }

  get xScale() {
    return this._xScale;
  }
  set xScale(value) {
    this._pivot(() => (this._xScale = value));
  }

  get yScale() {
    return this._yScale;
  }
  set yScale(value) {
    this._pivot(() => (this._yScale = value));
  }

  _pivot(change) {
    const [bx, by] = this._refOffset();
    const rx = this._cx + bx;
    const ry = this._cy + by;
    change();
    const [ax, ay] = this._refOffset();
    this._cx = rx - ax;
    this._cy = ry - ay;
    this._movedByGame();
  }

  _movedByGame() {
    if (this.body) this.body.teleportToDisplay();
  }

  /** Called by physics after a step; does not feed back into the body. */
  _setFromBody(cx, cy, rotation) {
    this._cx = cx;
    this._cy = cy;
    this._rotation = rotation;
  }

  toFront() {
    const siblings = this.parent && this.parent.children;
    if (!siblings) return;
    const i = siblings.indexOf(this);
    if (i >= 0 && i !== siblings.length - 1) {
      siblings.splice(i, 1);
      siblings.push(this);
    }
  }

  toBack() {
    const siblings = this.parent && this.parent.children;
    if (!siblings) return;
    const i = siblings.indexOf(this);
    if (i > 0) {
      siblings.splice(i, 1);
      siblings.unshift(this);
    }
  }

  /** Removes the object (and its physics body) for good. Safe to call twice. */
  removeSelf() {
    if (this.removed) return;
    this.removed = true;
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
      this.parent = null;
    }
    if (this.body) this.body.destroy();
  }

  // --- physics conveniences (no-ops until a body has been added) ---------------------------------

  get isSensor() {
    return this.body ? this.body.isSensor : false;
  }
  set isSensor(flag) {
    if (this.body) this.body.isSensor = flag;
  }

  get bodyType() {
    return this.body ? this.body.type : undefined;
  }
  set bodyType(type) {
    if (this.body) this.body.type = type;
  }

  set isFixedRotation(flag) {
    if (this.body) this.body.b2.setFixedRotation(flag);
  }
  set isBullet(flag) {
    if (this.body) this.body.b2.setBullet(flag);
  }
  set linearDamping(value) {
    if (this.body) this.body.b2.setLinearDamping(value);
  }
  set angularDamping(value) {
    if (this.body) this.body.b2.setAngularDamping(value);
  }

  /** Force in newtons; application point in content pixels. */
  applyForce(fx, fy, px, py) {
    if (this.body) this.body.applyForce(fx, fy, px, py);
  }
  /** Pixels per second. */
  setLinearVelocity(vx, vy) {
    if (this.body) this.body.setLinearVelocity(vx, vy);
  }
  /** @returns {[number, number]} pixels per second */
  getLinearVelocity() {
    return this.body ? this.body.getLinearVelocity() : [0, 0];
  }
}

export class Group extends DisplayObject {
  constructor() {
    super(0, 0);
    /** @type {DisplayObject[]} back-to-front */
    this.children = [];
  }

  /** Adds a child on top of the others, taking it from its previous parent if it had one. */
  insert(child) {
    if (child.parent) {
      const i = child.parent.children.indexOf(child);
      if (i >= 0) child.parent.children.splice(i, 1);
    }
    child.parent = this;
    this.children.push(child);
    return child;
  }

  removeSelf() {
    if (this.removed) return;
    for (const child of [...this.children]) child.removeSelf();
    super.removeSelf();
  }
}

/** A texture stretched to width x height. */
export class Image extends DisplayObject {
  constructor(image, width, height) {
    super(width, height);
    this.image = image; // asset path, e.g. "images/hill.png"
  }
}

/**
 * A sprite-sheet animation.
 *
 * Sheets are uniform grids read left-to-right, top-to-bottom. A sequence is
 * { start, count, time, loop }: `count` frames beginning at 1-based frame `start`, one pass taking
 * `time` ms, repeated `loop` times (0 = forever). After a finite sequence ends the last frame stays.
 */
export class Sprite extends DisplayObject {
  /**
   * @param {{image: string, frameWidth: number, frameHeight: number}} sheet
   * @param {Record<string, {start: number, count: number, time: number, loop: number}>} sequences
   * @param {number} [setStart] first sheet frame of the sprite's frame set (1-based); sequences index from here
   */
  constructor(sheet, sequences, setStart = 1) {
    super(sheet.frameWidth, sheet.frameHeight);
    this.image = sheet.image;
    this.frameWidth = sheet.frameWidth;
    this.frameHeight = sheet.frameHeight;
    this.sequences = sequences;
    this.setStart = setStart;
    this.sequence = null;
    this.sequenceName = null;
    this.playing = false;
    this.timeScale = 1;
    this.elapsed = 0;
    /** 0-based index into the sheet */
    this.frame = setStart - 1;
    Sprite.live.add(this);
  }

  /** Selects a sequence, rewound to its first frame and stopped. Unknown names are ignored. */
  prepare(name) {
    const sequence = this.sequences[name];
    if (!sequence) return;
    this.sequence = sequence;
    this.sequenceName = name;
    this.elapsed = 0;
    this.playing = false;
    this._updateFrame();
  }

  play() {
    if (this.sequence) this.playing = true;
  }

  pause() {
    this.playing = false;
  }

  advance(ms) {
    if (!this.playing || !this.sequence) return;
    this.elapsed += ms * this.timeScale;
    this._updateFrame();
  }

  _updateFrame() {
    const { start, count, time, loop } = this.sequence;
    let index = Math.floor(this.elapsed / (time / count));
    if (loop > 0 && index >= count * loop) {
      index = count - 1;
      this.playing = false;
    } else {
      index %= count;
    }
    this.frame = this.setStart - 1 + start - 1 + index;
  }

  removeSelf() {
    Sprite.live.delete(this);
    super.removeSelf();
  }

  /** Advances every live sprite; called once per frame by the game loop. */
  static advanceAll(ms) {
    for (const sprite of Sprite.live) sprite.advance(ms);
  }
}
/** @type {Set<Sprite>} */
Sprite.live = new Set();

export class Text extends DisplayObject {
  constructor(text, size) {
    super(0, 0);
    this.size = size;
    this._text = '';
    this.text = text;
  }

  get text() {
    return this._text;
  }
  set text(value) {
    const text = String(value);
    if (text === this._text && this.width > 0) return;
    // keep the reference point where it is, so left-anchored labels stay left-anchored
    const [bx, by] = this._refOffset();
    const rx = this._cx + bx;
    const ry = this._cy + by;
    this._text = text;
    const { width, height } = textMeasurer(text, this.size);
    this.width = width;
    this.height = height;
    const [ax, ay] = this._refOffset();
    this._cx = rx - ax;
    this._cy = ry - ay;
  }
}
