// Turns pixel art into voxel geometry.
//
// A sprite frame becomes a grid of cells (one per pixel, or per block of pixels). Every solid cell
// is a column of voxels reaching from a back depth to a front depth. "Inflating" a sprite makes the
// columns deeper the further a cell lies from the outline, in whole voxel steps, so a flat drawing
// turns into a rounded, terraced model. Neighbouring faces of the same colour and depth are merged
// into larger quads.
//
// Pure functions on typed arrays, no Three.js in here: the tests run them in Node.
//
// Output coordinates are frame pixels with the origin at the frame's centre, x right, y UP, and z
// towards the viewer.

export const EMPTY = -1;

/**
 * Reads one frame of an RGBA image into a grid of cells.
 *
 * With `pitch` > 1 each cell covers pitch x pitch pixels. A cell takes the rarest colour that fills
 * a fair share of it, so thin outlines survive the downsampling instead of being voted away.
 *
 * @param {{data: Uint8ClampedArray, width: number, height: number}} pixels
 * @returns {{gw: number, gh: number, pitch: number, fw: number, fh: number, col: Int32Array}}
 */
export function sampleGrid(pixels, fx, fy, fw, fh, { pitch = 1, alphaMin = 128, fill = 0.4 } = {}) {
  const { data, width } = pixels;
  const gw = Math.ceil(fw / pitch);
  const gh = Math.ceil(fh / pitch);
  const col = new Int32Array(gw * gh).fill(EMPTY);

  if (pitch === 1) {
    for (let y = 0; y < fh; y++) {
      let p = ((fy + y) * width + fx) * 4;
      for (let x = 0; x < fw; x++, p += 4) {
        if (data[p + 3] >= alphaMin) col[y * gw + x] = (data[p] << 16) | (data[p + 1] << 8) | data[p + 2];
      }
    }
    return { gw, gh, pitch, fw, fh, col };
  }

  // how common each colour is in the whole frame
  const global = new Map();
  for (let y = 0; y < fh; y++) {
    let p = ((fy + y) * width + fx) * 4;
    for (let x = 0; x < fw; x++, p += 4) {
      if (data[p + 3] < alphaMin) continue;
      const c = (data[p] << 16) | (data[p + 1] << 8) | data[p + 2];
      global.set(c, (global.get(c) || 0) + 1);
    }
  }
  const local = new Map();
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      local.clear();
      let solid = 0;
      let area = 0;
      const yEnd = Math.min(fh, (gy + 1) * pitch);
      const xEnd = Math.min(fw, (gx + 1) * pitch);
      for (let y = gy * pitch; y < yEnd; y++) {
        let p = ((fy + y) * width + fx + gx * pitch) * 4;
        for (let x = gx * pitch; x < xEnd; x++, p += 4) {
          area += 1;
          if (data[p + 3] < alphaMin) continue;
          solid += 1;
          const c = (data[p] << 16) | (data[p + 1] << 8) | data[p + 2];
          local.set(c, (local.get(c) || 0) + 1);
        }
      }
      if (solid < area * fill) continue;
      let best = EMPTY;
      let bestRarity = Infinity;
      for (const [c, n] of local) {
        if (n < solid * 0.25) continue;
        const rarity = global.get(c);
        if (rarity < bestRarity) {
          bestRarity = rarity;
          best = c;
        }
      }
      if (best === EMPTY) {
        // no colour reaches a quarter of the cell (anti-aliased art): take the most common one
        let most = 0;
        for (const [c, n] of local) {
          if (n > most) {
            most = n;
            best = c;
          }
        }
      }
      col[gy * gw + gx] = best;
    }
  }
  return { gw, gh, pitch, fw, fh, col };
}

/** The rows and columns that contain anything, in frame pixels: {left, right, top, bottom} or null. */
export function solidBounds(grid) {
  const { gw, gh, pitch, col } = grid;
  let left = gw;
  let right = -1;
  let top = gh;
  let bottom = -1;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (col[y * gw + x] === EMPTY) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  return { left: left * pitch, right: Math.min(grid.fw, (right + 1) * pitch), top: top * pitch, bottom: Math.min(grid.fh, (bottom + 1) * pitch) };
}

/**
 * Distance, in cells, from each solid cell to the nearest empty one (1 for a cell on the outline).
 * Empty cells get 0. The frame's border counts as empty unless that side is listed in `open`;
 * `wrapX` treats the grid as repeating horizontally (scrolling backdrops).
 * @returns {Float32Array}
 */
export function distanceField(grid, { open = {}, wrapX = false } = {}) {
  const { gw, gh, col } = grid;
  const BIG = 1e6;
  const DIAG = Math.SQRT2;
  const copies = wrapX ? 3 : 1;
  const w = gw * copies;
  const d = new Float32Array(w * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < w; x++) d[y * w + x] = col[y * gw + (x % gw)] === EMPTY ? 0 : BIG;

  const outL = open.left || wrapX ? BIG : 0;
  const outR = open.right || wrapX ? BIG : 0;
  const outT = open.top ? BIG : 0;
  const outB = open.bottom ? BIG : 0;
  const at = (x, y) => {
    if (y < 0) return outT;
    if (y >= gh) return outB;
    if (x < 0) return outL;
    if (x >= w) return outR;
    return d[y * w + x];
  };
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + DIAG, at(x + 1, y - 1) + DIAG);
    }
  }
  for (let y = gh - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + DIAG, at(x - 1, y + 1) + DIAG);
    }
  }
  if (!wrapX) return d;
  const middle = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) middle[y * gw + x] = d[y * w + gw + x];
  return middle;
}

/**
 * How far each cell's voxels reach from the middle plane: one `zStep` at the outline, another for
 * every `zStep / bevel` pixels further in, up to `maxDepth`.
 * @returns {Float32Array} half-depth per cell in pixels, 0 for empty cells
 */
export function inflateDepth(grid, distance, { zStep = 2, bevel = 1, minDepth = 0, maxDepth = 10 } = {}) {
  const { pitch, col } = grid;
  const depth = new Float32Array(col.length);
  const floor = Math.max(zStep, minDepth);
  for (let i = 0; i < col.length; i++) {
    if (col[i] === EMPTY) continue;
    const inPixels = (distance[i] - 0.5) * pitch;
    depth[i] = Math.min(maxDepth, Math.max(floor, Math.ceil((inPixels * bevel) / zStep) * zStep));
  }
  return depth;
}

/**
 * Bas-relief shading for the front faces: slopes that face the light (upper left) are a little
 * lighter, slopes facing away a little darker, flat areas untouched. Five levels, -2..2.
 * @returns {Int8Array}
 */
export function reliefShade(grid, distance, flatBeyond, { open = {}, wrapX = false } = {}) {
  const { gw, gh, col } = grid;
  const shade = new Int8Array(col.length);
  // beyond an open side the surface carries on level; beyond a closed one it drops away
  const at = (x, y, self) => {
    if (y < 0) return open.top ? self : 0;
    if (y >= gh) return open.bottom ? self : 0;
    if (x < 0 || x >= gw) {
      if (wrapX) x = (x + gw) % gw;
      else return (x < 0 ? open.left : open.right) ? self : 0;
    }
    return Math.min(distance[y * gw + x], flatBeyond);
  };
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      if (col[i] === EMPTY) continue;
      const self = Math.min(distance[i], flatBeyond);
      const gx = at(x + 1, y, self) - at(x - 1, y, self);
      const gy = at(x, y + 1, self) - at(x, y - 1, self);
      const lit = (gx * 0.55 + gy * 0.83) / 2;
      shade[i] = Math.max(-2, Math.min(2, Math.round(lit * 2)));
    }
  }
  return shade;
}

/** Growable vertex buffers for a list of quads. */
export class QuadList {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.count = 0;
  }

  /**
   * Adds a quad from four corners given in order around its edge. The winding is fixed up so the
   * front of the quad faces along the normal.
   */
  add(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, nx, ny, nz, r, g, b) {
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    const facing = (uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz;
    const p = this.positions;
    if (facing >= 0) p.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
    else p.push(ax, ay, az, dx, dy, dz, cx, cy, cz, bx, by, bz);
    for (let i = 0; i < 4; i++) {
      this.normals.push(nx, ny, nz);
      this.colors.push(r, g, b);
    }
    this.count += 1;
  }

  /** @returns {{positions: Float32Array, normals: Float32Array, colors: Float32Array, indices: Uint32Array}} */
  toArrays() {
    const indices = new Uint32Array(this.count * 6);
    for (let q = 0; q < this.count; q++) {
      const v = q * 4;
      indices.set([v, v + 1, v + 2, v, v + 2, v + 3], q * 6);
    }
    return { positions: new Float32Array(this.positions), normals: new Float32Array(this.normals), colors: new Float32Array(this.colors), indices };
  }
}

const SHADE_STEP = 0.07;

/**
 * Meshes a grid of voxel columns.
 *
 * @param {object} grid from sampleGrid
 * @param {object} options
 * @param {Float32Array} options.front z of each cell's front face
 * @param {Float32Array} options.back z of each cell's back face
 * @param {Int8Array} [options.shade] relief shading level per cell, applied to front faces
 * @param {{left?: boolean, right?: boolean, top?: boolean, bottom?: boolean}} [options.open] sides
 *        where the shape continues beyond the frame: no wall is built there
 * @param {boolean} [options.wrapX] the grid repeats horizontally
 * @param {[number, number]} [options.columns] only build cells in this range of columns, centred
 *        as a frame of its own (a wide backdrop is voxelised whole, then cut into tiles)
 * @param {boolean} [options.backFaces] build the faces that point away from the viewer
 * @returns {QuadList}
 */
export function meshGrid(grid, { front, back, shade = null, open = {}, wrapX = false, columns = null, backFaces = true }) {
  const { gw, gh, pitch, col } = grid;
  const x0 = columns ? columns[0] : 0;
  const x1 = columns ? columns[1] : gw;
  const fw = columns ? (x1 - x0) * pitch : grid.fw;
  const fh = grid.fh;
  const quads = new QuadList();

  const X = (gx) => Math.min((gx - x0) * pitch, fw) - fw / 2;
  const Y = (gy) => fh / 2 - Math.min(gy * pitch, fh);
  const R = (c) => ((c >> 16) & 255) / 255;
  const G = (c) => ((c >> 8) & 255) / 255;
  const B = (c) => (c & 255) / 255;

  // --- faces pointing at the viewer and away from her: greedy rectangles --------------------------
  const visited = new Uint8Array(gw * gh);
  const faces = (depthOf, shadeOf, normalZ) => {
    visited.fill(0);
    const same = (i, c, z, s) => !visited[i] && col[i] === c && depthOf[i] === z && shadeOf(i) === s;
    for (let y = 0; y < gh; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * gw + x;
        if (visited[i] || col[i] === EMPTY) continue;
        const c = col[i];
        const z = depthOf[i];
        const s = shadeOf(i);
        let w = 1;
        while (x + w < x1 && same(i + w, c, z, s)) w += 1;
        let h = 1;
        grow: while (y + h < gh) {
          for (let k = 0; k < w; k++) if (!same(i + h * gw + k, c, z, s)) break grow;
          h += 1;
        }
        for (let yy = 0; yy < h; yy++) visited.fill(1, i + yy * gw, i + yy * gw + w);
        const m = 1 + s * SHADE_STEP;
        quads.add(X(x), Y(y + h), z, X(x + w), Y(y + h), z, X(x + w), Y(y), z, X(x), Y(y), z, 0, 0, normalZ, Math.min(1, R(c) * m), Math.min(1, G(c) * m), Math.min(1, B(c) * m));
      }
    }
  };
  faces(front, shade ? (i) => shade[i] : () => 0, 1);
  if (backFaces) faces(back, () => 0, -1);

  // --- walls: wherever a neighbour is empty or shallower -------------------------------------------
  // `cell(x, y)` is the index of a neighbour, -1 for "nothing there", -2 for "same as me" (open side).
  const cell = (x, y) => {
    if (y < 0) return open.top ? -2 : -1;
    if (y >= gh) return open.bottom ? -2 : -1;
    if (x < 0 || x >= gw) {
      if (wrapX) return y * gw + ((x + gw) % gw);
      return (x < 0 ? open.left : open.right) ? -2 : -1;
    }
    return y * gw + x;
  };
  // The stretch of wall cell `i` shows towards neighbour `n`, in one of two slots: slot 0 is the
  // wall in front of the neighbour (or the whole side if there is no neighbour), slot 1 behind it.
  const span = [0, 0];
  const wallSpan = (i, n, slot) => {
    if (n === -2) return false;
    if (n === -1 || col[n] === EMPTY) {
      if (slot === 1) return false;
      span[0] = back[i];
      span[1] = front[i];
      return true;
    }
    if (slot === 0) {
      if (front[i] <= front[n]) return false;
      span[0] = Math.max(front[n], back[i]);
      span[1] = front[i];
      return true;
    }
    if (back[i] >= back[n]) return false;
    span[0] = back[i];
    span[1] = Math.min(back[n], front[i]);
    return true;
  };

  for (let slot = 0; slot < 2; slot++) {
    // vertical walls (facing left and right): runs go down a column
    for (const dir of [-1, 1]) {
      for (let x = x0; x < x1; x++) {
        let runStart = -1;
        let runColor = 0;
        let z0 = 0;
        let z1 = 0;
        const flush = (yEnd) => {
          if (runStart < 0) return;
          const wx = X(dir === 1 ? x + 1 : x);
          quads.add(wx, Y(runStart), z0, wx, Y(runStart), z1, wx, Y(yEnd), z1, wx, Y(yEnd), z0, dir, 0, 0, R(runColor), G(runColor), B(runColor));
          runStart = -1;
        };
        for (let y = 0; y < gh; y++) {
          const i = y * gw + x;
          const has = col[i] !== EMPTY && wallSpan(i, cell(x + dir, y), slot);
          if (has && runStart >= 0 && col[i] === runColor && span[0] === z0 && span[1] === z1) continue;
          flush(y);
          if (has) {
            runStart = y;
            runColor = col[i];
            z0 = span[0];
            z1 = span[1];
          }
        }
        flush(gh);
      }
    }
    // horizontal walls (facing up and down): runs go along a row
    for (const dir of [-1, 1]) {
      for (let y = 0; y < gh; y++) {
        let runStart = -1;
        let runColor = 0;
        let z0 = 0;
        let z1 = 0;
        const flush = (xEnd) => {
          if (runStart < 0) return;
          const wy = Y(dir === 1 ? y + 1 : y);
          quads.add(X(runStart), wy, z0, X(runStart), wy, z1, X(xEnd), wy, z1, X(xEnd), wy, z0, 0, -dir, 0, R(runColor), G(runColor), B(runColor));
          runStart = -1;
        };
        for (let x = x0; x < x1; x++) {
          const i = y * gw + x;
          const has = col[i] !== EMPTY && wallSpan(i, cell(x, y + dir), slot);
          if (has && runStart >= 0 && col[i] === runColor && span[0] === z0 && span[1] === z1) continue;
          flush(x);
          if (has) {
            runStart = x;
            runColor = col[i];
            z0 = span[0];
            z1 = span[1];
          }
        }
        flush(x1);
      }
    }
  }
  return quads;
}

/**
 * A sprite frame as a rounded voxel model, symmetric front to back.
 * @returns {QuadList}
 */
export function inflateFrame(grid, { zStep = 2, bevel = 1, minDepth = 0, maxDepth = 10, relief = true, open = {}, wrapX = false, columns = null, backFaces = true } = {}) {
  const distance = distanceField(grid, { open, wrapX });
  const front = inflateDepth(grid, distance, { zStep, bevel, minDepth, maxDepth });
  const back = front.map((z) => -z);
  const shade = relief ? reliefShade(grid, distance, maxDepth / bevel / grid.pitch + 0.5, { open, wrapX }) : null;
  return meshGrid(grid, { front, back, shade, open, wrapX, columns, backFaces });
}

/**
 * A frame cut out of a slab of constant thickness, from z = `back` to z = `front`.
 * @returns {QuadList}
 */
export function extrudeFrame(grid, { front, back, open = {}, backFaces = true } = {}) {
  const n = grid.col.length;
  return meshGrid(grid, { front: new Float32Array(n).fill(front), back: new Float32Array(n).fill(back), open, backFaces });
}
