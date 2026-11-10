// Saved data: small named key/value "boxes" kept in localStorage.
//
// Values are stored as the same strings the original game used ("true"/"false", "level1_1"), so
// the game code reads the same way.

const PREFIX = 'superdaddio.';

class Box {
  constructor(name, storage) {
    this.name = name;
    this.storage = storage;
    this.data = {};
    try {
      const raw = storage && storage.getItem(PREFIX + name);
      if (raw) this.data = JSON.parse(raw) || {};
    } catch {
      this.data = {};
    }
  }

  retrieve(key) {
    return this.data[key];
  }

  store(key, value) {
    this.data[key] = value;
  }

  storeIfNew(key, value) {
    if (this.data[key] === undefined) this.data[key] = value;
  }

  save() {
    try {
      if (this.storage) this.storage.setItem(PREFIX + this.name, JSON.stringify(this.data));
    } catch {
      // storage can be unavailable (private browsing); the game still runs, it just won't remember
    }
  }
}

export class SaveData {
  /** @param {Storage | null} storage localStorage, or null to keep everything in memory */
  constructor(storage) {
    this.storage = storage;
    this.boxes = new Map();
  }

  /** @returns {Box} */
  loadBox(name) {
    if (!this.boxes.has(name)) this.boxes.set(name, new Box(name, this.storage));
    return this.boxes.get(name);
  }
}
