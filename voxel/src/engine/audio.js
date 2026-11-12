// Sound effects and music on the Web Audio API.
//
// Sounds are addressed by file name without extension ("jumpsound", "track1"). Most effects are
// fire-and-forget; a few things play on a numbered channel so they can be stopped, paused or queried
// later (channel 1 = jetpack loop, channel 2 = music), mirroring how the original game used them.

export class AudioSystem {
  /** @param {(name: string) => Promise<ArrayBuffer | null>} fetchSound returns a sound's encoded bytes */
  constructor(fetchSound) {
    this.fetchSound = fetchSound;
    this.buffers = new Map();
    this.loading = new Map();
    this.channels = new Map();
    this.channelVolumes = new Map();
    this.masterVolume = 1;
    this.context = null;
    this.master = null;
  }

  /** Creates the audio context. Browsers keep it suspended until the first user gesture. */
  init() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = this.masterVolume;
    this.master.connect(this.context.destination);
  }

  /** Call from a user gesture so audio is allowed to start. */
  unlock() {
    if (!this.context || this.context.state === 'running') return;
    try {
      const resumed = this.context.resume();
      if (resumed && resumed.catch) resumed.catch(() => {});
    } catch {
      // the browser refused; the next gesture tries again
    }
  }

  load(name) {
    if (!this.context) return Promise.resolve(null);
    if (!this.loading.has(name)) {
      this.loading.set(
        name,
        Promise.resolve()
          .then(() => this.fetchSound(name))
          .then((data) => (data ? this.context.decodeAudioData(data) : null))
          .then((buffer) => {
            if (buffer) this.buffers.set(name, buffer);
            return buffer;
          })
          .catch(() => null),
      );
    }
    return this.loading.get(name);
  }

  loadAll(names) {
    return Promise.all(names.map((name) => this.load(name)));
  }

  /**
   * @param {string} name
   * @param {{channel?: number, loop?: boolean}} [options]
   */
  play(name, { channel, loop = false } = {}) {
    if (!this.context) return;
    const buffer = this.buffers.get(name);
    if (!buffer) {
      // not decoded yet (music is loaded on demand): start it as soon as it is ready
      if (channel !== undefined) {
        this.stop(channel);
        const pending = { pending: true };
        this.channels.set(channel, pending);
        this.load(name).then((loaded) => {
          if (loaded && this.channels.get(channel) === pending) {
            this.channels.delete(channel);
            this.play(name, { channel, loop });
          }
        });
      }
      return;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    if (channel === undefined) {
      source.connect(this.master);
      source.start();
      return;
    }
    this.stop(channel);
    const gain = this.context.createGain();
    gain.gain.value = this.channelVolumes.get(channel) ?? 1;
    source.connect(gain).connect(this.master);
    const entry = { source, gain, paused: false };
    source.onended = () => {
      if (this.channels.get(channel) === entry) this.channels.delete(channel);
    };
    this.channels.set(channel, entry);
    source.start();
  }

  isChannelPlaying(channel) {
    const entry = this.channels.get(channel);
    return Boolean(entry && !entry.paused);
  }

  /** Stops one channel, or every channel when called without an argument. */
  stop(channel) {
    const targets = channel === undefined ? [...this.channels.keys()] : [channel];
    for (const key of targets) {
      const entry = this.channels.get(key);
      this.channels.delete(key);
      if (entry && entry.source) {
        entry.source.onended = null;
        try {
          entry.source.stop();
        } catch {
          // already stopped
        }
      }
    }
  }

  pause(channel) {
    const entry = this.channels.get(channel);
    if (entry && entry.source && !entry.paused) {
      entry.paused = true;
      entry.source.playbackRate.value = 0;
      entry.gain.gain.value = 0;
    }
  }

  resume(channel) {
    const entry = this.channels.get(channel);
    if (entry && entry.source && entry.paused) {
      entry.paused = false;
      entry.source.playbackRate.value = 1;
      entry.gain.gain.value = this.channelVolumes.get(channel) ?? 1;
    }
  }

  /** Sets the master volume, or one channel's volume when `channel` is given. */
  setVolume(volume, channel) {
    if (channel === undefined) {
      this.masterVolume = volume;
      if (this.master) this.master.gain.value = volume;
      return;
    }
    this.channelVolumes.set(channel, volume);
    const entry = this.channels.get(channel);
    if (entry && entry.gain && !entry.paused) entry.gain.gain.value = volume;
  }
}

/** Stand-in used by headless tests. */
export class SilentAudio {
  constructor() {
    this.played = [];
    this.channels = new Set();
  }
  init() {}
  unlock() {}
  load() {
    return Promise.resolve(null);
  }
  loadAll() {
    return Promise.resolve([]);
  }
  play(name, { channel } = {}) {
    this.played.push(name);
    if (channel !== undefined) this.channels.add(channel);
  }
  isChannelPlaying(channel) {
    return this.channels.has(channel);
  }
  stop(channel) {
    if (channel === undefined) this.channels.clear();
    else this.channels.delete(channel);
  }
  pause() {}
  resume() {}
  setVolume() {}
}
