// The voxel mesher: geometry is checked by measuring it. A closed surface whose faces all point
// outwards encloses a volume that can be summed up face by face; if that equals the volume of the
// voxel columns, no wall is missing, doubled or inside out.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EMPTY, distanceField, extrudeFrame, inflateDepth, inflateFrame, meshGrid, sampleGrid, solidBounds } from '../src/engine/voxel/mesher.js';
import { modelFor } from '../src/engine/voxel/models.js';
import { levelNames, loadLevelData } from './helpers.js';
import { readPng } from './png.js';

const ASSETS = fileURLToPath(new URL('../src/assets/', import.meta.url));

/** Volume enclosed by a quad list, by the divergence theorem. */
function enclosedVolume(quads) {
  const { positions, normals } = quads;
  let volume = 0;
  for (let q = 0; q < quads.count; q++) {
    const p = q * 12;
    const [ax, ay, az] = positions.slice(p, p + 3);
    const [bx, by, bz] = positions.slice(p + 3, p + 6);
    const [dx, dy, dz] = positions.slice(p + 9, p + 12);
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = dx - ax, vy = dy - ay, vz = dz - az;
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const area = Math.hypot(cx, cy, cz);
    const [nx, ny, nz] = normals.slice(p, p + 3);
    // the winding must agree with the normal the lighting will use
    assert.ok(cx * nx + cy * ny + cz * nz > -1e-9, 'a quad faces away from its normal');
    volume += ((ax * nx + ay * ny + az * nz) * area) / 3;
  }
  return volume;
}

function columnVolume(grid, front, back) {
  let volume = 0;
  for (let y = 0; y < grid.gh; y++) {
    for (let x = 0; x < grid.gw; x++) {
      const i = y * grid.gw + x;
      if (grid.col[i] === EMPTY) continue;
      const w = Math.min(grid.fw, (x + 1) * grid.pitch) - x * grid.pitch;
      const h = Math.min(grid.fh, (y + 1) * grid.pitch) - y * grid.pitch;
      volume += w * h * (front[i] - back[i]);
    }
  }
  return volume;
}

function gridFrom(rows, pitch = 1) {
  const gh = rows.length;
  const gw = rows[0].length;
  const col = new Int32Array(gw * gh);
  rows.forEach((row, y) => [...row].forEach((ch, x) => (col[y * gw + x] = ch === '.' ? EMPTY : ch.charCodeAt(0) * 1000)));
  return { gw, gh, pitch, fw: gw * pitch, fh: gh * pitch, col };
}

test('a solid block becomes six quads', () => {
  const grid = gridFrom(['aaaa', 'aaaa', 'aaaa']);
  const quads = extrudeFrame(grid, { front: 3, back: -1 });
  assert.equal(quads.count, 6);
  assert.equal(Math.round(enclosedVolume(quads)), 4 * 3 * 4);
});

test('colours split faces but the surface stays closed', () => {
  const grid = gridFrom(['aab.', 'a.bb', 'ccc.', '...d']);
  const quads = extrudeFrame(grid, { front: 2, back: -2 });
  assert.equal(Math.round(enclosedVolume(quads)), 10 * 4); // ten solid cells, four deep
});

test('inflating makes the middle deeper than the rim, in whole steps', () => {
  const grid = gridFrom(Array.from({ length: 9 }, () => 'aaaaaaaaa'));
  const depth = inflateDepth(grid, distanceField(grid), { zStep: 2, bevel: 1, maxDepth: 6 });
  assert.equal(depth[0], 2);
  assert.equal(depth[4 * 9 + 4], 6);
  for (const d of depth) assert.equal(d % 2, 0);
  const quads = inflateFrame(grid, { zStep: 2, bevel: 1, maxDepth: 6 });
  assert.ok(Math.abs(enclosedVolume(quads) - columnVolume(grid, depth, depth.map((z) => -z))) < 1e-6);
});

test('random shapes mesh into closed surfaces', () => {
  let seed = 42;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let round = 0; round < 40; round++) {
    const gw = 3 + Math.floor(random() * 14);
    const gh = 3 + Math.floor(random() * 14);
    const rows = Array.from({ length: gh }, () => Array.from({ length: gw }, () => (random() < 0.3 ? '.' : 'abc'[Math.floor(random() * 3)])).join(''));
    const grid = gridFrom(rows, 1 + (round % 3));
    const n = grid.col.length;
    const front = Float32Array.from({ length: n }, () => 1 + Math.floor(random() * 5));
    const back = Float32Array.from({ length: n }, () => -1 - Math.floor(random() * 5));
    const quads = meshGrid(grid, { front, back });
    assert.ok(Math.abs(enclosedVolume(quads) - columnVolume(grid, front, back)) < 1e-6, `round ${round}`);
  }
});

test('open sides get no wall', () => {
  const grid = gridFrom(['aaa', 'aaa']);
  const closed = extrudeFrame(grid, { front: 1, back: -1 });
  const open = extrudeFrame(grid, { front: 1, back: -1, open: { bottom: true, left: true } });
  assert.equal(closed.count - open.count, 2);
});

test('downsampling keeps thin outlines', () => {
  // a 12 x 8 picture: a block of one colour with a one-pixel line of another through it
  const width = 12;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const line = x === 5;
      data.set(line ? [255, 255, 255, 255] : [10, 60, 90, 255], (y * width + x) * 4);
    }
  }
  const grid = sampleGrid({ data, width, height }, 0, 0, width, height, { pitch: 4 });
  assert.equal(grid.gw, 3);
  assert.equal(grid.col[1], 0xffffff); // the cell the line runs through takes the line's colour
  assert.equal(grid.col[0], (10 << 16) | (60 << 8) | 90);
});

// --- the real artwork ----------------------------------------------------------------------------

const images = new Map();
function pixelsOf(image) {
  if (!images.has(image)) images.set(image, readPng(`${ASSETS}${image}`));
  return images.get(image);
}

/** Frame sizes of the sprite sheets, as the game declares them. */
const SHEETS = {
  smallherosheet: 64, bigherosheet: 64, hugeherosheet: 256, coinsheet: 32, keysheet: 64, poofsheet: 64, dustsheet: [64, 16],
  bluedoorsheet: 128, checkpointsheet: 256, springboardsheet: 64, orangebadguysheet: 32, orangejumpybadguysheet: 32,
  purplebadguysheet: 32, bluebadguysheet: 32, bugsheet: 32, snakesheet: 64, smalldragonsheet: 64, fishsheet: 64, plantsheet: 64,
  bigredsheet: 128, bigyellowsheet: 128, snowmansheet: 128, cloudmansheet: 128, dragonsheet: 256, dragonsheet2: 256,
};

/** Pictures that only ever appear flat, in menus and the HUD. */
const MENU_ART = /screenshot|button|pausemenu|titlescreen|levelcomplete|^levels|creditsbox|^Default|^lock|background|^world\d/;

test('every piece of artwork voxelises into a closed model', () => {
  let frames = 0;
  let quads = 0;
  for (const dir of ['images', 'images2']) {
    for (const file of readdirSync(`${ASSETS}${dir}`).filter((name) => name.endsWith('.png'))) {
      const image = `${dir}/${file}`;
      if (MENU_ART.test(file)) continue;
      const model = modelFor(image);
      if (model.kind !== 'inflate' && model.kind !== 'extrude' && model.kind !== 'spin') continue;
      const pixels = pixelsOf(image);
      const size = SHEETS[model.name];
      const [fw, fh] = size ? (Array.isArray(size) ? size : [size, size]) : [pixels.width, pixels.height];
      const columns = Math.floor(pixels.width / fw);
      const rows = Math.floor(pixels.height / fh);
      for (let frame = 0; frame < columns * rows; frame++) {
        const grid = sampleGrid(pixels, (frame % columns) * fw, Math.floor(frame / columns) * fh, fw, fh, model);
        const list = model.kind === 'inflate' ? inflateFrame(grid, model) : extrudeFrame(grid, { front: model.half, back: -model.half });
        let expected;
        if (model.kind === 'inflate') {
          const depth = inflateDepth(grid, distanceField(grid), model);
          expected = columnVolume(grid, depth, depth.map((z) => -z));
        } else {
          expected = columnVolume(grid, new Float32Array(grid.col.length).fill(model.half), new Float32Array(grid.col.length).fill(-model.half));
        }
        const volume = enclosedVolume(list);
        assert.ok(Math.abs(volume - expected) < 1e-3 * Math.max(1, expected), `${image} frame ${frame}: ${volume} != ${expected}`);
        assert.ok(list.count < 20000, `${image} frame ${frame} has ${list.count} quads`);
        frames += 1;
        quads += list.count;
      }
    }
  }
  assert.ok(frames > 400, `only ${frames} frames were checked`);
  assert.ok(quads / frames < 1500, `models average ${Math.round(quads / frames)} quads`);
});

test('terrain images are cut from the lane as simple boxes', () => {
  for (const name of ['platform1', 'platform2', 'platform3', 'platform4', 'platform5']) {
    const pixels = pixelsOf(`images/${name}.png`);
    const grid = sampleGrid(pixels, 0, 0, pixels.width, pixels.height);
    const quads = extrudeFrame(grid, { front: 56, back: -104 });
    assert.ok(quads.count <= 12, `${name}: ${quads.count} quads`); // two bands: 2 fronts, 2 backs, top, bottom, 4 sides
    assert.deepEqual(solidBounds(grid), { left: 0, right: pixels.width, top: 0, bottom: pixels.height });
  }
});

test('every image the levels use has a model', () => {
  const kinds = new Set(['inflate', 'extrude', 'slab', 'cube', 'water', 'spin', 'none', 'backdrop']);
  const used = new Set();
  for (const name of levelNames) {
    for (const op of loadLevelData(name).ops) {
      if (op.op === 'img') used.add(op.img);
      else if (op.fn === 'loadParallax') op.args.forEach((image) => used.add(image));
    }
  }
  assert.ok(used.size > 40);
  for (const image of used) {
    const model = modelFor(image);
    assert.ok(kinds.has(model.kind), `${image}: unknown kind ${model.kind}`);
    pixelsOf(image); // and the file exists
    if (/world\dp\d[abc]\.png$/.test(image)) assert.equal(model.kind, 'backdrop');
  }
});
