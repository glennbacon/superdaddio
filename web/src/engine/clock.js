// Game clock, timers and tweens.
//
// Everything is driven by fixed 60 Hz ticks rather than wall-clock time, so the game plays the same
// on a 144 Hz monitor as on a 60 Hz one, and headless tests are deterministic.
//
// Timers and tweens behave like the original engine's `timer` and `transition` libraries, and are
// updated at the same point in the frame: after the game's own per-frame code (see App.tick). That
// order matters. A tween has the last word over game code that writes the same property — the
// camera relies on it.

export const FRAME_MS = 1000 / 60;

/** Easing functions take progress 0..1 and return eased progress 0..1. */
export const easing = {
  linear: (t) => t,
  inOutExpo: (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const u = t * 2;
    if (u < 1) return 0.5 * Math.pow(2, 10 * (u - 1)) - 0.0005;
    return 0.5 * 1.0005 * (-Math.pow(2, -10 * (u - 1)) + 2);
  },
};

export class Clock {
  constructor() {
    this.now = 0;
    this._timers = [];
    this._tweens = [];
  }

  /**
   * Calls `fn` after `delayMs`. `iterations` > 1 repeats that many times; 0 repeats forever.
   * A timer never fires in the frame that created it, so even a 2 ms delay means "next frame".
   */
  performWithDelay(delayMs, fn, iterations = 1) {
    const timer = { due: this.now + delayMs, delay: delayMs, fn, remaining: iterations === 0 ? Infinity : iterations, created: this.now, cancelled: false };
    this._timers.push(timer);
    return timer;
  }

  cancel(handle) {
    if (handle) handle.cancelled = true;
  }

  /**
   * Tweens numeric properties of `target` to the given end values.
   * options: { time, transition, onStart, onComplete, ...properties }
   *
   * The starting values are the ones the target has right now, and `onStart` is called right now.
   * From then on the tween sets the properties every frame, whatever else has written to them.
   */
  transitionTo(target, options) {
    const { time = 500, transition = easing.linear, onStart, onComplete, ...ends } = options;
    if (onStart) onStart(target);
    const starts = {};
    for (const key of Object.keys(ends)) starts[key] = target[key];
    const tween = { target, time, ease: transition, onComplete, ends, starts, startTime: this.now, cancelled: false };
    this._tweens.push(tween);
    return tween;
  }

  /** Starts a new frame: moves the clock on by 1/60 s. Nothing fires until update(). */
  beginFrame() {
    this.now += FRAME_MS;
  }

  /** Fires the timers that are due, then moves the tweens along. */
  update() {
    const timers = this._timers;
    this._timers = [];
    for (const timer of timers) {
      if (timer.cancelled) continue;
      if (timer.due <= this.now && timer.created < this.now) {
        timer.remaining -= 1;
        if (timer.remaining > 0) {
          timer.due += Math.max(timer.delay, 0);
          this._timers.push(timer);
        }
        timer.fn();
      } else {
        this._timers.push(timer);
      }
    }

    const tweens = this._tweens;
    this._tweens = [];
    for (const tween of tweens) {
      if (tween.cancelled || tween.target.removed) continue;
      const progress = tween.time <= 0 ? 1 : Math.min(1, (this.now - tween.startTime) / tween.time);
      const eased = progress >= 1 ? 1 : tween.ease(progress);
      for (const key of Object.keys(tween.ends)) {
        tween.target[key] = tween.starts[key] + (tween.ends[key] - tween.starts[key]) * eased;
      }
      if (progress >= 1) {
        if (tween.onComplete) tween.onComplete(tween.target);
      } else {
        this._tweens.push(tween);
      }
    }
  }

  /** Drops every pending timer and tween (used when a scene is torn down). */
  reset() {
    this._timers = [];
    this._tweens = [];
  }
}
