// Pointer and keyboard input, normalised for the game.
//
// Pointers (mouse, touch, pen) are reported like the original's touch events: a phase
// ("began" | "moved" | "ended" | "cancelled") and a position in content coordinates. Several
// pointers can be down at once, which is how the on-screen buttons are used on a phone.
//
// Keys are reported as game actions ("left", "right", "jump", "action", ...) with phase "down"/"up".

const KEY_ACTIONS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  KeyZ: 'jump',
  KeyX: 'action',
  KeyK: 'action',
  ShiftLeft: 'action',
  ShiftRight: 'action',
  Escape: 'pause',
  KeyP: 'pause',
  Enter: 'confirm',
  KeyR: 'restart',
  KeyM: 'menu',
};

export class Input {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(clientX: number, clientY: number) => [number, number]} toContent
   */
  constructor(canvas, toContent) {
    /** @type {(event: {phase: string, x: number, y: number}) => void} */
    this.onTouch = null;
    /** @type {(event: {phase: 'down'|'up', action: string}) => void} */
    this.onKey = null;
    /** Called on any user gesture (used to unlock audio). */
    this.onGesture = null;

    const active = new Set();
    const touch = (phase, event) => {
      const [x, y] = toContent(event.clientX, event.clientY);
      if (this.onTouch) this.onTouch({ phase, x, y });
    };

    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (this.onGesture) this.onGesture();
      active.add(event.pointerId);
      try {
        // keep receiving this pointer's events even if it slides off the canvas
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // not every pointer can be captured; the game still works without it
      }
      touch('began', event);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (active.has(event.pointerId)) touch('moved', event);
    });
    const end = (phase) => (event) => {
      if (!active.delete(event.pointerId)) return;
      touch(phase, event);
    };
    canvas.addEventListener('pointerup', end('ended'));
    canvas.addEventListener('pointercancel', end('cancelled'));
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    const held = new Set();
    window.addEventListener('keydown', (event) => {
      const action = KEY_ACTIONS[event.code];
      if (!action) return;
      event.preventDefault();
      if (this.onGesture) this.onGesture();
      if (event.repeat || held.has(event.code)) return;
      held.add(event.code);
      if (this.onKey) this.onKey({ phase: 'down', action });
    });
    window.addEventListener('keyup', (event) => {
      const action = KEY_ACTIONS[event.code];
      if (!action || !held.delete(event.code)) return;
      event.preventDefault();
      // two keys can map to one action (e.g. A and ArrowLeft); release only when the last one lifts
      for (const code of held) if (KEY_ACTIONS[code] === action) return;
      if (this.onKey) this.onKey({ phase: 'up', action });
    });
    window.addEventListener('blur', () => {
      // keys released while the window is unfocused never send keyup
      const actions = new Set([...held].map((code) => KEY_ACTIONS[code]));
      held.clear();
      for (const action of actions) if (this.onKey) this.onKey({ phase: 'up', action });
    });
  }
}
