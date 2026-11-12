// Physics: a thin layer over planck.js (a JavaScript port of Box2D).
//
// The original game ran on Box2D through Corona SDK, so the port keeps Box2D and reproduces the
// conventions Corona layered on top of it:
//
//   * 100 pixels per metre; positions, velocities and force application points are in pixels
//   * forces and gravity are passed to Box2D unscaled (newtons, m/s^2)
//   * one fixed step of 1/60 s per frame, 8 velocity and 3 position iterations
//   * bodies never sleep (the game always called physics.start(true))
//   * material: a missing friction or bounce is 0, and a missing or zero density is 0.01;
//     default shape: the object's rectangle
//   * moving a display object teleports its body
//   * collision callbacks run inside the step, as soon as Box2D reports the contact
//
// These were checked against the engine's source (Solar2D, the open-sourced Corona SDK:
// librtt/Rtt_PhysicsWorld.cpp and Rtt_LuaLibPhysics.cpp), which differs from its documentation on
// the iteration counts and the material defaults.
//
// Game forces are tuned against body masses, which come from shape area x density, so shapes and
// densities here must stay exactly as the original code specified them.

import * as planck from 'planck';

export const PIXELS_PER_METER = 100;
export const STEP_SECONDS = 1 / 60;
export const VELOCITY_ITERATIONS = 8;
export const POSITION_ITERATIONS = 3;
/** What the engine gives a body element when no material table is passed at all. */
const NO_MATERIAL = { density: 0.01, friction: 0.3, bounce: 0.5 };
const DEG = Math.PI / 180;

export class PhysicsBody {
  /**
   * @param {Physics} physics
   * @param {import('./display.js').DisplayObject} object
   * @param {planck.Body} b2
   */
  constructor(physics, object, b2) {
    this.physics = physics;
    this.object = object;
    this.b2 = b2;
    this.destroyed = false;
    this._teleportPending = false;
  }

  get type() {
    return this.b2.getType();
  }
  set type(type) {
    this.physics._whenUnlocked(() => {
      if (!this.destroyed) this.b2.setType(type);
    });
  }

  get isSensor() {
    const fixture = this.b2.getFixtureList();
    return fixture ? fixture.isSensor() : false;
  }
  set isSensor(flag) {
    for (let f = this.b2.getFixtureList(); f; f = f.getNext()) f.setSensor(flag);
  }

  applyForce(fx, fy, px, py) {
    this.b2.applyForce(planck.Vec2(fx, fy), planck.Vec2(px / PIXELS_PER_METER, py / PIXELS_PER_METER), true);
  }

  setLinearVelocity(vx, vy) {
    this.b2.setLinearVelocity(planck.Vec2(vx / PIXELS_PER_METER, vy / PIXELS_PER_METER));
  }

  getLinearVelocity() {
    const v = this.b2.getLinearVelocity();
    return [v.x * PIXELS_PER_METER, v.y * PIXELS_PER_METER];
  }

  /** The objects this body is resting on or pressing against right now. Sensors do not count. */
  touching() {
    const objects = [];
    for (let edge = this.b2.getContactList(); edge; edge = edge.next) {
      const { contact } = edge;
      if (!contact.isTouching() || contact.getFixtureA().isSensor() || contact.getFixtureB().isSensor()) continue;
      const other = edge.other && edge.other.getUserData();
      if (other && !other.destroyed && !other.object.removed) objects.push(other.object);
    }
    return objects;
  }

  /** Moves the body to wherever the display object now is. */
  teleportToDisplay() {
    if (this.destroyed) return;
    if (this.physics.world.isLocked()) {
      // Box2D cannot move bodies mid-step; do it as soon as the step finishes
      if (!this._teleportPending) {
        this._teleportPending = true;
        this.physics._whenUnlocked(() => {
          this._teleportPending = false;
          this.teleportToDisplay();
        });
      }
      return;
    }
    const o = this.object;
    this.b2.setTransform(planck.Vec2(o._cx / PIXELS_PER_METER, o._cy / PIXELS_PER_METER), o._rotation * DEG);
    this.b2.setAwake(true);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.object.body = null;
    this.physics._whenUnlocked(() => this.physics.world.destroyBody(this.b2));
  }
}

export class Physics {
  constructor() {
    this.world = new planck.World({ gravity: planck.Vec2(0, 0), allowSleep: false });
    this.paused = true;
    this._deferred = [];
    /** @type {(event: {phase: 'began'|'ended', object1: object, object2: object}) => void} */
    this.onCollision = null;
    /** @type {(event: {force: number, object1: object, object2: object}) => void} */
    this.onPostCollision = null;

    this.world.on('begin-contact', (contact) => this._dispatch('began', contact));
    this.world.on('end-contact', (contact) => this._dispatch('ended', contact));
    this.world.on('post-solve', (contact, impulse) => {
      if (!this.onPostCollision) return;
      const pair = this._objects(contact);
      if (!pair) return;
      // "force" is the largest normal impulse among the contact points, as in the original engine
      let force = 0;
      const count = contact.getManifold().pointCount;
      for (let i = 0; i < count; i++) force = Math.max(force, impulse.normalImpulses[i]);
      this.onPostCollision({ force, object1: pair[0], object2: pair[1] });
    });
  }

  /** Metres per second squared, y down. */
  setGravity(gx, gy) {
    this.world.setGravity(planck.Vec2(gx, gy));
  }

  start() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  /**
   * Gives a display object a body. Without `shape` or `radius` the body is the object's rectangle.
   * @param {import('./display.js').DisplayObject} object
   * @param {'static'|'dynamic'|'kinematic'} type
   * @param {{density?: number, friction?: number, bounce?: number, shape?: number[], radius?: number}} [material]
   *        `shape` is a flat list of x,y pixel offsets from the object's centre.
   *        In a material table a missing friction or bounce counts as 0, and a density that is
   *        missing or 0 becomes 0.01 (which only matters once a body is dynamic).
   */
  addBody(object, type = 'dynamic', material = NO_MATERIAL) {
    const { friction = 0, bounce = 0, shape, radius } = material;
    const density = material.density > 0 ? material.density : 0.01;
    const b2 = this.world.createBody({
      type,
      position: planck.Vec2(object._cx / PIXELS_PER_METER, object._cy / PIXELS_PER_METER),
      angle: object._rotation * DEG,
    });

    let b2shape;
    if (shape) {
      const vertices = [];
      // an odd trailing number is dropped, exactly as the original engine did
      for (let i = 0; i + 1 < shape.length; i += 2) {
        vertices.push(planck.Vec2(shape[i] / PIXELS_PER_METER, shape[i + 1] / PIXELS_PER_METER));
      }
      b2shape = new planck.Polygon(vertices);
    } else if (radius) {
      b2shape = new planck.Circle(radius / PIXELS_PER_METER);
    } else {
      const hw = (object.width * Math.abs(object._xScale)) / 2 / PIXELS_PER_METER;
      const hh = (object.height * Math.abs(object._yScale)) / 2 / PIXELS_PER_METER;
      b2shape = new planck.Box(hw, hh);
    }
    b2.createFixture({ shape: b2shape, density, friction, restitution: bounce });

    const body = new PhysicsBody(this, object, b2);
    b2.setUserData(body);
    object.body = body;
    return body;
  }

  /** A pin joint between two objects at a point given in pixels. */
  newPivotJoint(objectA, objectB, x, y) {
    const anchor = planck.Vec2(x / PIXELS_PER_METER, y / PIXELS_PER_METER);
    return this.world.createJoint(new planck.RevoluteJoint({}, objectA.body.b2, objectB.body.b2, anchor));
  }

  /** Advances the simulation one frame (unless paused) and copies body transforms to their objects. */
  step() {
    if (this.paused) return;
    this.world.step(STEP_SECONDS, VELOCITY_ITERATIONS, POSITION_ITERATIONS);
    this._runDeferred();
    for (let b = this.world.getBodyList(); b; b = b.getNext()) {
      if (b.isStatic()) continue;
      const body = b.getUserData();
      if (!body || body.destroyed) continue;
      const p = b.getPosition();
      body.object._setFromBody(p.x * PIXELS_PER_METER, p.y * PIXELS_PER_METER, b.getAngle() / DEG);
    }
  }

  /** Destroys the world's bodies; used when a level is unloaded. */
  clear() {
    this._deferred = [];
    for (let b = this.world.getBodyList(); b; ) {
      const next = b.getNext();
      const body = b.getUserData();
      if (body) {
        body.destroyed = true;
        body.object.body = null;
      }
      this.world.destroyBody(b);
      b = next;
    }
  }

  _objects(contact) {
    const a = contact.getFixtureA().getBody().getUserData();
    const b = contact.getFixtureB().getBody().getUserData();
    // contacts that end because an object was removed are not reported
    if (!a || !b || a.destroyed || b.destroyed || a.object.removed || b.object.removed) return null;
    return [a.object, b.object];
  }

  _dispatch(phase, contact) {
    if (!this.onCollision) return;
    const pair = this._objects(contact);
    if (pair) this.onCollision({ phase, object1: pair[0], object2: pair[1] });
  }

  _whenUnlocked(fn) {
    if (this.world.isLocked()) this._deferred.push(fn);
    else fn();
  }

  _runDeferred() {
    while (this._deferred.length) {
      const queue = this._deferred;
      this._deferred = [];
      for (const fn of queue) fn();
    }
  }
}
