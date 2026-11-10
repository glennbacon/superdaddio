// Asset loading (browser only): textures, the pixel font and audio file URLs.
//
// Vite resolves these globs at build time, so adding a file to src/assets is all it takes to ship it.

import * as THREE from 'three';

const imageUrls = import.meta.glob('../assets/{images,images2}/*.png', { eager: true, query: '?url', import: 'default' });
const audioUrlsByPath = import.meta.glob('../assets/audio/*.{wav,mp3}', { eager: true, query: '?url', import: 'default' });
const fontUrl = new URL('../assets/fonts/Pixelated.ttf', import.meta.url).href;

const assetName = (path) => path.replace('../assets/', '');

/** Audio URLs keyed by file name without extension, e.g. "jumpsound", "track1". */
export const audioUrls = Object.fromEntries(
  Object.entries(audioUrlsByPath).map(([path, url]) => [path.split('/').pop().replace(/\.(wav|mp3)$/, ''), url]),
);

const textures = new Map();

/** @returns {THREE.Texture} the texture for an image path such as "images/hill.png" */
export function getTexture(image) {
  const texture = textures.get(image);
  if (!texture) throw new Error(`Unknown image: ${image}`);
  return texture;
}

/** Loads every image and the font. `onProgress` receives a 0..1 fraction. */
export async function loadAssets(onProgress = () => {}) {
  const entries = Object.entries(imageUrls);
  const loader = new THREE.TextureLoader();
  let done = 0;

  const font = new FontFace('Pixelated', `url(${fontUrl})`);
  const fontLoaded = font.load().then((face) => document.fonts.add(face));

  await Promise.all([
    fontLoaded,
    ...entries.map(async ([path, url]) => {
      const texture = await loader.loadAsync(url);
      // The camera's y axis points down, so images are uploaded unflipped. Linear filtering without
      // mipmaps matches how the original engine sampled its textures.
      texture.flipY = false;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      textures.set(assetName(path), texture);
      onProgress(++done / entries.length);
    }),
  ]);
}

const levelLoaders = import.meta.glob('../levels/*.json', { import: 'default' });

/** @param {string} name e.g. "level1_1" */
export async function loadLevelData(name) {
  const load = levelLoaders[`../levels/${name}.json`];
  if (!load) throw new Error(`Unknown level: ${name}`);
  return load();
}
