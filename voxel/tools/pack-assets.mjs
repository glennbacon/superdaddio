// Packs the game's assets into a few files under public/data/, so the browser makes a handful of
// requests instead of several hundred:
//
//   art.json      every image and the font
//   sfx.json      every sound effect
//   levels.json   all sixty levels
//   track*.mp3    the music, one file per track (fetched when first played)
//
// A pack is a JSON object of { "name": "<file contents in base64>" }. Base64 costs a third more
// bytes than a binary file would, but JSON is served by every static host, including ones that
// only pass a short list of file types.
//
// Run by `npm run dev` and `npm run build`.

import { mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const assets = join(root, 'src/assets');
const out = join(root, 'public/data');
mkdirSync(out, { recursive: true });

function pack(file, entries) {
  const index = {};
  let bytes = 0;
  for (const [name, data] of entries) {
    index[name] = data.toString('base64');
    bytes += data.length;
  }
  writeFileSync(join(out, file), JSON.stringify(index));
  return bytes;
}

const files = (dir, pattern) => readdirSync(join(assets, dir)).filter((name) => pattern.test(name)).sort();

const art = [];
for (const dir of ['images', 'images2']) for (const name of files(dir, /\.png$/)) art.push([`${dir}/${name}`, readFileSync(join(assets, dir, name))]);
art.push(['fonts/Pixelated.ttf', readFileSync(join(assets, 'fonts/Pixelated.ttf'))]);
const artBytes = pack('art.json', art);

const sfx = files('audio', /\.wav$/).map((name) => [name.replace('.wav', ''), readFileSync(join(assets, 'audio', name))]);
const sfxBytes = pack('sfx.json', sfx);

const music = files('audio', /\.mp3$/);
for (const name of music) copyFileSync(join(assets, 'audio', name), join(out, name));

const levelDir = join(root, 'src/levels');
const levels = {};
for (const name of readdirSync(levelDir).filter((file) => /^level\d_\d\.json$/.test(file)).sort()) {
  const level = JSON.parse(readFileSync(join(levelDir, name), 'utf8'));
  // "seq" records the order the original code set each property in; only the extractor's tests use it
  for (const op of level.ops) delete op.seq;
  levels[name.replace('.json', '')] = level;
}
writeFileSync(join(out, 'levels.json'), JSON.stringify(levels));

const kb = (n) => `${Math.round(n / 1024)} kB`;
console.log(`art.json ${art.length} files ${kb(artBytes)} · sfx.json ${sfx.length} files ${kb(sfxBytes)} · ${music.length} music tracks · ${Object.keys(levels).length} levels`);
