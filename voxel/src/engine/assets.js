// Asset loading (browser only): images, the pixel font, sounds and level data.
//
// Everything comes from a few files under ./data/ (see tools/pack-assets.mjs), fetched with
// fetch() and decoded from memory. Nothing is loaded through <img>, <audio> or CSS, so the game
// also runs where a page may only load such things from blob: or data: URLs.

import * as THREE from 'three';

const DATA_URL = new URL('./data/', document.baseURI).href;

/** @type {Map<string, ImageBitmap | HTMLImageElement>} */
const bitmaps = new Map();
const canvases = new Map();
const pixelCache = new Map();
const textures = new Map();
let sfxPack = null;
let levels = null;

async function fetchBytes(name, onProgress) {
  const response = await fetch(DATA_URL + name);
  if (!response.ok) throw new Error(`Could not load ${name} (${response.status})`);
  const total = Number(response.headers.get('content-length')) || 0;
  if (!onProgress || !total || !response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(1, received / total));
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/** Reads a pack (see tools/pack-assets.mjs): a Map of file name -> Uint8Array. */
async function fetchPack(name, onProgress) {
  const index = JSON.parse(new TextDecoder().decode(await fetchBytes(name, onProgress)));
  const files = new Map();
  for (const [file, base64] of Object.entries(index)) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    files.set(file, bytes);
  }
  return files;
}

async function decodeImage(bytes) {
  const blob = new Blob([bytes], { type: 'image/png' });
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    } catch {
      try {
        return await createImageBitmap(blob);
      } catch {
        // fall through to an <img> element
      }
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const element = new Image();
    element.src = url;
    await element.decode();
    return element;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Loads every image, the font and the sound-effect pack. `onProgress` receives a 0..1 fraction. */
export async function loadAssets(onProgress = () => {}) {
  const [files, sfx] = await Promise.all([fetchPack('art.json', (f) => onProgress(f * 0.4)), fetchPack('sfx.json')]);
  sfxPack = sfx;

  const font = files.get('fonts/Pixelated.ttf');
  files.delete('fonts/Pixelated.ttf');
  const fontLoaded = new FontFace('Pixelated', font.slice().buffer).load().then((face) => document.fonts.add(face));

  let done = 0;
  await Promise.all([
    fontLoaded,
    ...[...files].map(async ([name, bytes]) => {
      bitmaps.set(name, await decodeImage(bytes));
      onProgress(0.4 + 0.6 * (++done / files.size));
    }),
  ]);
}

function bitmapFor(image) {
  const bitmap = bitmaps.get(image);
  if (!bitmap) throw new Error(`Unknown image: ${image}`);
  return bitmap;
}

function canvasFor(image) {
  let canvas = canvases.get(image);
  if (!canvas) {
    const bitmap = bitmapFor(image);
    canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d', { willReadFrequently: true }).drawImage(bitmap, 0, 0);
    canvases.set(image, canvas);
  }
  return canvas;
}

/** @returns {{width: number, height: number}} the image's size in pixels */
export function getImageSize(image) {
  const bitmap = bitmapFor(image);
  return { width: bitmap.width, height: bitmap.height };
}

/** @returns {ImageData} the image's pixels, for building voxel models */
export function getPixels(image) {
  let pixels = pixelCache.get(image);
  if (!pixels) {
    const canvas = canvasFor(image);
    pixels = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
    pixelCache.set(image, pixels);
  }
  return pixels;
}

/**
 * @returns {THREE.Texture} the image as a texture with row 0 at v = 0, sampled without smoothing
 * when magnified so pixel art stays crisp
 */
export function getTexture(image) {
  let texture = textures.get(image);
  if (!texture) {
    texture = new THREE.CanvasTexture(canvasFor(image));
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    textures.set(image, texture);
  }
  return texture;
}

const MUSIC = ['track1', 'track1b', 'track2', 'track2b', 'track3', 'track4'];
export const musicNames = MUSIC;
export const effectNames = () => [...sfxPack.keys()];

/** @returns {Promise<ArrayBuffer | null>} the encoded audio for a sound, by name ("jumpsound", "track1") */
export async function fetchSound(name) {
  if (sfxPack && sfxPack.has(name)) return sfxPack.get(name).slice().buffer;
  if (MUSIC.includes(name)) return (await fetchBytes(`${name}.mp3`)).buffer;
  return null;
}

/** @param {string} name e.g. "level1_1" */
export async function loadLevelData(name) {
  if (!levels) levels = fetch(`${DATA_URL}levels.json`).then((response) => response.json());
  const level = (await levels)[name];
  if (!level) throw new Error(`Unknown level: ${name}`);
  return level;
}
