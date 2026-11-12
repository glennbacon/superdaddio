// The 3D renderer: draws the game's display list as a voxel diorama.
//
// The game logic still thinks in two dimensions (see display.js). Scenes tag their groups with a
// `layer`, and this renderer decides what each layer looks like:
//
//   world, front   the level itself. Every image and sprite frame is turned into a voxel model
//                  (mesher.js, models.js) and placed in a lane seen through a perspective camera,
//                  lit by a sun that casts shadows. "front" is scenery the original drew over the hero.
//   far1, far2     the scrolling backdrops, standing far behind the lane
//   sky            a plain colour image: becomes the sky and the colour of the distance haze
//   (anything else) HUD, menus and text: flat quads drawn over the 3D picture, as in the original
//
// The lane is laid out in the game's own screen coordinates (800 x 480, flipped so y points up),
// and it is the level that scrolls past a camera that stays put. That keeps every position the
// game computes meaningful without translation.

import * as THREE from 'three';
import { Group, Sprite, Text, setTextMeasurer } from '../display.js';
import { extrudeFrame, inflateFrame, sampleGrid, solidBounds } from './mesher.js';
import { LANE_BACK, LANE_FRONT, modelFor } from './models.js';
import { Precipitation, Stars } from './sky.js';

export const CONTENT_WIDTH = 800;
export const CONTENT_HEIGHT = 480;

const FONT_FAMILY = 'Pixelated';
const TEXT_SUPERSAMPLE = 3;
const DEG = Math.PI / 180;

// Camera: the lane fills the view exactly as the 2D game did when seen head-on; the camera then
// sits a little above and to one side, and leans with the scrolling.
const BASE_FOV = 30 * DEG;
const CAMERA_DISTANCE = CONTENT_HEIGHT / 2 / Math.tan(BASE_FOV / 2);
const CAMERA_PITCH = 6.5 * DEG;
const CAMERA_YAW = -5 * DEG;
const LEAN_MAX = 5.5 * DEG;
const MIN_ASPECT = 4 / 3;
const MAX_ASPECT = 2.4;

const FAR_DEPTH = { far1: 420, far2: 900 };
const GRID_CELL = 16; // size in pixels of one block of the terrain pattern
const GRID_TILES = 8;

// Colours go to the screen as authored: vertex colours are the artwork's own sRGB values and the
// lighting works on them directly.
THREE.ColorManagement.enabled = false;

const LIGHTING = {
  day: { ambient: [0xffffff, 0.56], sun: [0xfff6e6, 0.9], fog: 1 },
  rain: { ambient: [0xdfe6f2, 0.62], sun: [0xcfd8e8, 0.55], fog: 1.6 },
  snow: { ambient: [0xe8f0ff, 0.66], sun: [0xffffff, 0.6], fog: 1.4 },
  night: { ambient: [0x8d9fe0, 0.5], sun: [0xbfd0ff, 0.62], fog: 1 },
  cave: { ambient: [0x9aa4b8, 0.34], sun: [0xb8c4dc, 0.3], fog: 1, torch: [0xffc890, 1.0] },
};

function envName(env) {
  if (!env) return 'day';
  if (env.isCave) return 'cave';
  if (env.isNight) return 'night';
  if (env.isRaining) return 'rain';
  if (env.isSnowing) return 'snow';
  return 'day';
}

/** Unit quad for the flat overlay, where y points down: vertex 0 is the top-left corner. */
function overlayQuad() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

/** Unit quad for labels inside the 3D scene, where y points up. */
function billboardQuad() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

/** A unit cube whose every face shows a whole (unflipped) texture the right way up. */
function unitCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  return geometry;
}

/** The block pattern laid over terrain: a tile of cells, each a slightly different shade, with a bevel. */
function gridTexture() {
  const cell = 8;
  const size = cell * GRID_TILES;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const grey = (v) => {
    const n = Math.round(255 * Math.max(0, Math.min(1, v)));
    return `rgb(${n},${n},${n})`;
  };
  for (let cy = 0; cy < GRID_TILES; cy++) {
    for (let cx = 0; cx < GRID_TILES; cx++) {
      const base = 0.86 + random() * 0.13;
      context.fillStyle = grey(base);
      context.fillRect(cx * cell, cy * cell, cell, cell);
      context.fillStyle = grey(base + 0.05);
      context.fillRect(cx * cell, cy * cell, cell, 1);
      context.fillRect(cx * cell, cy * cell, 1, cell);
      context.fillStyle = grey(base - 0.09);
      context.fillRect(cx * cell, cy * cell + cell - 1, cell, 1);
      context.fillRect(cx * cell + cell - 1, cy * cell, 1, cell);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return texture;
}

function geometryFromArrays({ positions, normals, colors, indices }, uvs = null) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (uvs) geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(positions.length / 3 > 65535 ? indices : new Uint16Array(indices), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Splits a set of possibly overlapping rectangles into ones that do not overlap. */
function unionRects(rects) {
  const xs = [...new Set(rects.flatMap((r) => [r.x0, r.x1]))].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const x0 = xs[i];
    const x1 = xs[i + 1];
    const spans = rects.filter((r) => r.x0 <= x0 && r.x1 >= x1).map((r) => [r.y0, r.y1]).sort((a, b) => a[0] - b[0]);
    let current = null;
    for (const [y0, y1] of spans) {
      if (current && y0 <= current.y1) {
        current.y1 = Math.max(current.y1, y1);
      } else {
        current = { x0, x1, y0, y1 };
        out.push(current);
      }
    }
  }
  return out;
}

export class VoxelRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} assets
   * @param {(image: string) => THREE.Texture} assets.getTexture
   * @param {(image: string) => ImageData} assets.getPixels
   */
  constructor(canvas, { getTexture, getPixels }) {
    this.canvas = canvas;
    this.getTexture = getTexture;
    this.getPixels = getPixels;

    // dense phone screens hide the stair-steps by themselves; smoothing them as well costs a lot there
    const antialias = (window.devicePixelRatio || 1) < 2;
    this.three = new THREE.WebGLRenderer({ canvas, antialias, alpha: false, powerPreference: 'high-performance' });
    this.three.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.three.autoClear = false;
    this.three.info.autoReset = false; // one frame is several passes: count them together
    this.three.shadowMap.enabled = true;
    this.three.shadowMap.type = THREE.PCFSoftShadowMap;
    this.maxPixelRatio = 2;

    // --- the 3D scene ---
    this.world = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, CONTENT_WIDTH / CONTENT_HEIGHT, 60, 7000);
    this.target = new THREE.Vector3(CONTENT_WIDTH / 2, -CONTENT_HEIGHT / 2, 0);
    this.neutral = this._cameraPosition(CAMERA_YAW, CAMERA_PITCH, new THREE.Vector3());
    this.yaw = CAMERA_YAW;
    this.lean = 0;
    this.lastScroll = null;
    this.swayTime = 0;

    this.ambient = new THREE.AmbientLight(0xffffff, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.position.copy(this.target).add(new THREE.Vector3(-0.38, 0.8, 0.5).normalize().multiplyScalar(1100));
    this.sun.target.position.copy(this.target);
    this.sun.castShadow = true;
    const shadow = this.sun.shadow;
    shadow.mapSize.set(2048, 2048);
    shadow.camera.left = -760;
    shadow.camera.right = 760;
    shadow.camera.top = 520;
    shadow.camera.bottom = -520;
    shadow.camera.near = 100;
    shadow.camera.far = 2400;
    shadow.bias = -0.0006;
    shadow.normalBias = 1.2;
    this.torch = new THREE.PointLight(0xffc890, 0, 460, 0);
    this.torch.visible = false;
    this.world.add(this.ambient, this.sun, this.sun.target, this.torch);
    this.fog = new THREE.Fog(0x000000, CAMERA_DISTANCE + 200, CAMERA_DISTANCE + 3600);
    this.world.fog = this.fog;
    this.sky = new THREE.Color(0x000000);
    this.envKey = null;
    this.precipitation = new Precipitation(this.world);
    this.stars = new Stars(this.world);
    this.lastRenderAt = 0;

    this.voxelMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.slabMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, map: gridTexture() });
    this.glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    this.waterMaterial = new THREE.MeshLambertMaterial({ color: 0x1a78b4, transparent: true, opacity: 0.74, depthWrite: false });
    this.cubeMaterials = new Map();
    this.cube = unitCube();
    this.billboard = billboardQuad();
    this.frameCache = new Map();
    this.backdropCache = new Map();
    /** Sprite frames waiting to be voxelised ahead of the moment they are first shown. */
    this.warmQueue = [];

    // --- the flat overlay ---
    this.overlay = new THREE.Scene();
    this.overlayCamera = new THREE.OrthographicCamera(0, CONTENT_WIDTH, 0, CONTENT_HEIGHT, -1, 1);
    this.quad = overlayQuad();
    this.dimMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    this.dimMesh = new THREE.Mesh(this.quad, this.dimMaterial);
    this.dimMesh.renderOrder = -1;
    this.dimMesh.visible = false;
    this.overlay.add(this.dimMesh);

    this.views = new Set();
    this.frameId = 0;
    this.drawOrder = 0;
    this.scene = null;
    this.slabs = [];
    this.slabOrder = new Map();
    this.waterMesh = null;
    this.worldOrigin = null;
    this.dim = 0;

    // adaptive quality: drop resolution, then shadows, if frames take too long
    this.frameTimes = [];
    this.lastFrameAt = 0;
    this.quality = 2;

    const measureContext = document.createElement('canvas').getContext('2d');
    setTextMeasurer((text, size) => {
      measureContext.font = `${size}px ${FONT_FAMILY}`;
      return { width: Math.max(1, Math.ceil(measureContext.measureText(text).width)), height: Math.ceil(size * 1.25) };
    });

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // --- layout --------------------------------------------------------------------------------------

  /**
   * The 800 x 480 playfield is fitted into the window; the 3D view then carries on beyond it to
   * fill the window (within sensible limits), so wide phones see more of the level instead of bars.
   */
  resize() {
    const windowWidth = Math.max(1, window.innerWidth);
    const windowHeight = Math.max(1, window.innerHeight);
    let width = windowWidth;
    let height = windowHeight;
    if (width / height > MAX_ASPECT) width = Math.floor(height * MAX_ASPECT);
    if (width / height < MIN_ASPECT) height = Math.floor(width / MIN_ASPECT);
    const scale = Math.min(width / CONTENT_WIDTH, height / CONTENT_HEIGHT);
    this.scale = scale;
    this.marginX = (width / scale - CONTENT_WIDTH) / 2;
    this.marginY = (height / scale - CONTENT_HEIGHT) / 2;

    this.three.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio));
    this.three.setSize(width, height, false);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.camera.aspect = width / height;
    this.camera.fov = (2 * Math.atan((height / scale / 2) / CAMERA_DISTANCE)) / DEG;
    this.camera.updateProjectionMatrix();

    this.overlayCamera.left = -this.marginX;
    this.overlayCamera.right = CONTENT_WIDTH + this.marginX;
    this.overlayCamera.top = -this.marginY;
    this.overlayCamera.bottom = CONTENT_HEIGHT + this.marginY;
    this.overlayCamera.updateProjectionMatrix();

    this.dimMesh.position.set(CONTENT_WIDTH / 2, CONTENT_HEIGHT / 2, 0);
    this.dimMesh.scale.set(CONTENT_WIDTH + this.marginX * 2 + 2, CONTENT_HEIGHT + this.marginY * 2 + 2, 1);
  }

  /**
   * Converts a pointer position in CSS pixels to playfield coordinates. Touches beyond the
   * playfield count as touches on its nearest edge, so the whole screen around the game works as
   * an extension of the on-screen buttons.
   */
  toContent(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / this.scale - this.marginX;
    const y = (clientY - rect.top) / this.scale - this.marginY;
    return [Math.max(0, Math.min(CONTENT_WIDTH, x)), Math.max(0, Math.min(CONTENT_HEIGHT, y))];
  }

  _cameraPosition(yaw, pitch, out) {
    return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(CAMERA_DISTANCE).add(this.target);
  }

  // --- one frame -----------------------------------------------------------------------------------

  /**
   * @param {Group} root the display list
   * @param {object} [scene] the running scene; may offer renderHints() -> { env, scrollX, focus, sway }
   */
  render(root, scene = null) {
    this.frameId += 1;
    this.drawOrder = 0;
    const hints = (scene && scene.renderHints && scene.renderHints()) || {};

    if (scene !== this.scene) this._enterScene(root, scene);

    this.skyImage = null;
    this.worldOrigin = null;
    this.dim = 0;
    this._walk(root, 1, 1, 0, 0, 1, null);
    for (const view of this.views) {
      if (view.frameId !== this.frameId) this._dropView(view);
    }

    // how far the level scrolled since the last frame, and how much time passed
    let dx = 0;
    let dy = 0;
    if (hints.scrollX !== undefined) {
      if (this.lastScroll) {
        dx = hints.scrollX - this.lastScroll[0];
        dy = (hints.scrollY || 0) - this.lastScroll[1];
      }
      this.lastScroll = [hints.scrollX, hints.scrollY || 0];
    }
    const now = performance.now();
    const frames = Math.max(0, Math.min(4, (now - this.lastRenderAt) / (1000 / 60)));
    this.lastRenderAt = now;

    const has3D = this.worldOrigin !== null;
    if (has3D) {
      this._applyEnvironment(hints.env);
      this._moveCamera(hints, dx, frames);
      this.precipitation.update(frames, dx, dy);
      if (this.waterMesh) this.waterMesh.position.set(this.worldOrigin[0], -this.worldOrigin[1], 0);
      if (this.torch.visible && hints.focus) this.torch.position.set(hints.focus[0], -hints.focus[1] + 30, 95);
    } else if (this.envKey !== null) {
      this.envKey = null;
      this.precipitation.set(null);
      this.stars.visible = false;
    }
    if (this.waterMesh) this.waterMesh.visible = has3D;

    this.dimMesh.visible = this.dim > 0.001;
    this.dimMaterial.opacity = this.dim;

    this.three.info.reset();
    this.three.setClearColor(has3D ? this.sky : 0x000000, 1);
    this.three.clear();
    if (has3D) this.three.render(this.world, this.camera);
    this.three.clearDepth();
    this.three.render(this.overlay, this.overlayCamera);

    this._warmFrames();
    this._watchFrameRate();
  }

  /**
   * Building a frame's model takes a few milliseconds. Doing it the instant an animation first
   * reaches that frame would make the game stutter, so the frames of every sprite on stage are
   * built a few at a time in the background.
   */
  _warmFrames() {
    const deadline = performance.now() + 3;
    while (this.warmQueue.length && performance.now() < deadline) {
      const [image, model, frame, width, height] = this.warmQueue.pop();
      this._frameGeometry(image, model, frame, width, height);
    }
  }

  _queueSpriteFrames(sprite, model) {
    const pixels = this.getPixels(sprite.image);
    const total = Math.floor(pixels.width / sprite.frameWidth) * Math.floor(pixels.height / sprite.frameHeight);
    for (const { start, count } of Object.values(sprite.sequences)) {
      for (let k = 0; k < count; k++) {
        const frame = sprite.setStart - 1 + start - 1 + k;
        if (frame < total && !this.frameCache.has(`${sprite.image}#${frame}`)) this.warmQueue.push([sprite.image, model, frame, sprite.frameWidth, sprite.frameHeight]);
      }
    }
  }

  /** A new scene: forget what was learnt about the old one and survey the new level's terrain. */
  _enterScene(root, scene) {
    this.scene = scene;
    this.slabs = [];
    this.slabOrder = new Map();
    this.lastScroll = null;
    this.lean = 0;
    if (this.waterMesh) {
      this.world.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }
    const water = [];
    const survey = (object, layer) => {
      if (object.layer) layer = object.layer;
      if (object instanceof Group) {
        for (const child of object.children) survey(child, layer);
        return;
      }
      if ((layer !== 'world' && layer !== 'front') || !object.image || object.alpha <= 0) return;
      const kind = modelFor(object.image).kind;
      if (kind !== 'slab' && kind !== 'water') return;
      const rect = { x0: object._cx - object.width / 2, x1: object._cx + object.width / 2, y0: object._cy - object.height / 2, y1: object._cy + object.height / 2 };
      if (kind === 'water') {
        water.push(rect);
      } else {
        this.slabOrder.set(object, this.slabs.length);
        this.slabs.push(rect);
      }
    };
    survey(root, null);
    if (water.length) this._buildWater(water);
  }

  /** All the water in a level as one see-through mesh (overlapping pieces must not add up). */
  _buildWater(rects) {
    const positions = [];
    const normals = [];
    const indices = [];
    const quad = (corners, nx, ny, nz) => {
      const v = positions.length / 3;
      positions.push(...corners);
      for (let i = 0; i < 4; i++) normals.push(nx, ny, nz);
      indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    };
    const front = LANE_FRONT - 3;
    const back = LANE_BACK + 3;
    for (const r of unionRects(rects)) {
      const top = -(r.y0 + 4);
      const bottom = -r.y1;
      quad([r.x0, bottom, front, r.x1, bottom, front, r.x1, top, front, r.x0, top, front], 0, 0, 1);
      quad([r.x0, top, front, r.x1, top, front, r.x1, top, back, r.x0, top, back], 0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    this.waterMesh = new THREE.Mesh(geometry, this.waterMaterial);
    this.waterMesh.frustumCulled = false;
    this.waterMesh.renderOrder = 10;
    this.world.add(this.waterMesh);
  }

  _applyEnvironment(env) {
    if (this.skyImage) {
      const pixels = this.getPixels(this.skyImage);
      this.sky.setRGB(pixels.data[0] / 255, pixels.data[1] / 255, pixels.data[2] / 255);
    }
    const name = envName(env);
    const key = `${name}|${this.sky.getHex()}`;
    if (key === this.envKey) return;
    this.envKey = key;
    const look = LIGHTING[name];
    this.ambient.color.setHex(look.ambient[0]);
    this.ambient.intensity = look.ambient[1] * Math.PI;
    this.sun.color.setHex(look.sun[0]);
    this.sun.intensity = look.sun[1] * Math.PI;
    this.torch.visible = Boolean(look.torch);
    if (look.torch) {
      this.torch.color.setHex(look.torch[0]);
      this.torch.intensity = look.torch[1] * Math.PI;
    }
    this.fog.color.copy(this.sky);
    this.fog.far = CAMERA_DISTANCE + 3600 / look.fog;
    this.precipitation.set(name === 'rain' || name === 'snow' ? name : null);
    this.stars.visible = name === 'night';
  }

  _moveCamera(hints, dx, frames) {
    // lean into the scrolling: the camera trails behind the direction of travel
    let wanted = Math.max(-LEAN_MAX, Math.min(LEAN_MAX, Math.max(-8, Math.min(8, dx)) * 2.2 * DEG));
    if (hints.sway) {
      this.swayTime += frames / 60;
      wanted = Math.sin(this.swayTime * 0.45) * LEAN_MAX * 1.3;
    }
    this.lean += (wanted - this.lean) * (1 - Math.pow(1 - 0.035, Math.max(frames, 0.25)));
    this._cameraPosition(CAMERA_YAW + this.lean, CAMERA_PITCH, this.camera.position);
    this.camera.lookAt(this.target);
  }

  // --- walking the display list --------------------------------------------------------------------

  _walk(object, sx, sy, tx, ty, alpha, layer) {
    if (!object.isVisible) return;
    let opacity = alpha * object.alpha;
    if (object.layer) {
      layer = object.layer;
      if (layer === 'world') {
        // Fading the whole level (the pause menu does) dims the picture instead of making
        // thousands of voxels see-through.
        this.dim = Math.max(this.dim, 1 - opacity);
        opacity = 1;
      }
    }
    if (object instanceof Group) {
      const gsx = sx * object._xScale;
      const gsy = sy * object._yScale;
      const gtx = tx + sx * object._cx;
      const gty = ty + sy * object._cy;
      if (object.layer === 'world') this.worldOrigin = [gtx, gty];
      for (const child of object.children) this._walk(child, gsx, gsy, gtx, gty, opacity, layer);
      return;
    }
    if (layer === 'sky') {
      this.skyImage = object.image;
      if (this.worldOrigin === null) this.worldOrigin = [0, 0];
      return;
    }
    if (opacity <= 0) return; // invisible walls and sensors never get a mesh
    if (layer === 'weather' && this.precipitation.active) return; // the flat rain picture: replaced by real drops

    const solid = layer === 'world' || layer === 'front' || layer === 'far1' || layer === 'far2';
    if (solid && this.worldOrigin === null) this.worldOrigin = [0, 0];
    const view = object.view || (solid ? this._createSolidView(object, layer) : this._createFlatView(object));
    view.frameId = this.frameId;
    if (view.flat) this._updateFlatView(view, object, sx, sy, tx, ty, opacity);
    else this._updateSolidView(view, object, sx, sy, tx, ty, opacity);
  }

  // --- flat overlay views (HUD, menus, text) -------------------------------------------------------

  _createFlatView(object) {
    const material = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    let geometry = this.quad;
    const view = { flat: true, object, material, geometry: null, mesh: null, frameId: 0, frame: -1, text: null, texture: null, scene: this.overlay };
    if (object instanceof Sprite) {
      geometry = view.geometry = overlayQuad(); // sprites own their quad: its UVs select the frame
      material.map = this.getTexture(object.image);
    } else if (object instanceof Text) {
      view.texture = this._textTexture();
      material.map = view.texture;
    } else {
      material.map = this.getTexture(object.image);
    }
    view.mesh = new THREE.Mesh(geometry, material);
    this.overlay.add(view.mesh);
    this.views.add(view);
    object.view = view;
    return view;
  }

  _updateFlatView(view, object, sx, sy, tx, ty, opacity) {
    if (object instanceof Sprite) this._updateSpriteUVs(view, object);
    else if (object instanceof Text) this._updateText(view, object);
    const mesh = view.mesh;
    mesh.position.set(tx + sx * object._cx, ty + sy * object._cy, 0);
    mesh.scale.set(object.width * object._xScale * sx, object.height * object._yScale * sy, 1);
    mesh.rotation.z = object._rotation * DEG;
    mesh.renderOrder = this.drawOrder++;
    view.material.opacity = Math.min(1, opacity);
  }

  _updateSpriteUVs(view, sprite) {
    if (view.frame === sprite.frame) return;
    const image = view.material.map.image;
    view.frame = sprite.frame;
    const columns = Math.max(1, Math.floor(image.width / sprite.frameWidth));
    const column = sprite.frame % columns;
    const row = Math.floor(sprite.frame / columns);
    const u0 = (column * sprite.frameWidth) / image.width;
    const u1 = ((column + 1) * sprite.frameWidth) / image.width;
    const v0 = (row * sprite.frameHeight) / image.height;
    const v1 = ((row + 1) * sprite.frameHeight) / image.height;
    const uv = view.geometry.getAttribute('uv');
    uv.setXY(0, u0, v0);
    uv.setXY(1, u1, v0);
    uv.setXY(2, u1, v1);
    uv.setXY(3, u0, v1);
    uv.needsUpdate = true;
  }

  _textTexture() {
    const texture = new THREE.CanvasTexture(document.createElement('canvas'));
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  _updateText(view, object) {
    if (view.text === object.text) return;
    view.text = object.text;
    const canvas = view.texture.image;
    canvas.width = Math.max(1, object.width * TEXT_SUPERSAMPLE);
    canvas.height = Math.max(1, object.height * TEXT_SUPERSAMPLE);
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `${object.size * TEXT_SUPERSAMPLE}px ${FONT_FAMILY}`;
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.fillText(object.text, 0, canvas.height / 2);
    // a resized canvas needs a fresh GPU texture
    view.texture.dispose();
    view.texture.needsUpdate = true;
  }

  // --- solid views: voxel models in the lane -------------------------------------------------------

  _createSolidView(object, layer) {
    const view = { flat: false, object, layer, mesh: null, twin: null, material: null, ownMaterial: null, ownGeometry: null, texture: null, frameId: 0, frame: -1, text: null, model: null, z: 0, lift: 0, frameWidth: 1, frameHeight: 1, scene: this.world };
    this.views.add(view);
    object.view = view;

    if (object instanceof Text) {
      // score pop-ups: a label floating in front of the lane
      view.texture = this._textTexture();
      view.ownMaterial = new THREE.MeshBasicMaterial({ map: view.texture, transparent: true, depthTest: false, depthWrite: false, fog: false });
      view.mesh = new THREE.Mesh(this.billboard, view.ownMaterial);
      view.mesh.renderOrder = 20;
      view.z = 40;
      this.world.add(view.mesh);
      return view;
    }

    const model = (view.model = modelFor(object.image));
    const far = layer === 'far1' || layer === 'far2';
    const kind = far && model.kind !== 'backdrop' ? 'none' : model.kind;
    view.kind = kind;
    if (kind === 'none' || kind === 'water') return view; // water is drawn as one mesh per level

    let geometry;
    if (kind === 'slab') {
      geometry = view.ownGeometry = this._slabGeometry(object);
      view.material = this.slabMaterial;
      const order = this.slabOrder.get(object) || 0;
      view.z = order * 0.03; // overlapping pieces: the later one wins, as it did when painted in order
      view.lift = order * 0.012;
    } else if (kind === 'cube') {
      geometry = this.cube;
      view.material = this._cubeMaterial(object.image);
    } else if (kind === 'backdrop') {
      geometry = this._backdropGeometry(object.image);
      view.material = this.voxelMaterial;
    } else {
      view.material = model.glow ? this.glowMaterial : this.voxelMaterial;
      view.frameWidth = object instanceof Sprite ? object.frameWidth : this.getPixels(object.image).width;
      view.frameHeight = object instanceof Sprite ? object.frameHeight : this.getPixels(object.image).height;
      geometry = this._frameGeometry(object.image, model, kind === 'spin' ? 0 : object instanceof Sprite ? object.frame : 0, view.frameWidth, view.frameHeight).geometry;
      view.frame = object instanceof Sprite ? object.frame : 0;
      if (kind !== 'spin' && object instanceof Sprite && !this.frameCache.has(`${object.image}#warm`)) {
        this.frameCache.set(`${object.image}#warm`, true);
        this._queueSpriteFrames(object, model);
      }
      if (kind !== 'spin') {
        view.z = model.z[layer === 'front' ? 1 : 0];
        if (model.snap && !object.body) {
          view.lift = this._liftOntoTerrain(object, view);
          // scenery that overlaps gets slightly different depths instead of fighting over one plane
          view.z += (((Math.abs(Math.round(object._cx * 7 + object._cy * 13)) % 9) - 4) * 1.5);
        }
      }
    }

    view.mesh = new THREE.Mesh(geometry, view.material);
    view.mesh.castShadow = !far && model.cast;
    view.mesh.receiveShadow = !far && Boolean(model.receive);
    this.world.add(view.mesh);
    if (model.mirror) {
      view.twin = new THREE.Mesh(geometry, view.material);
      view.twin.castShadow = view.mesh.castShadow;
      this.world.add(view.twin);
    }
    return view;
  }

  _updateSolidView(view, object, sx, sy, tx, ty, opacity) {
    const mesh = view.mesh;
    if (!mesh) return;
    const cx = tx + sx * object._cx;
    const cy = ty + sy * object._cy;

    if (object instanceof Text) {
      this._updateText(view, object);
      mesh.position.set(cx, -cy, view.z);
      mesh.scale.set(object.width * sx, object.height * sy, 1);
      mesh.quaternion.copy(this.camera.quaternion);
      view.ownMaterial.opacity = Math.min(1, opacity);
      return;
    }

    const model = view.model;
    const scaleX = object._xScale * sx;
    const scaleY = object._yScale * sy;
    const kind = view.kind;

    if (kind === 'slab') {
      mesh.position.set(cx, -cy + view.lift, view.z);
    } else if (kind === 'cube') {
      mesh.position.set(cx, -cy, 0);
      mesh.scale.set(object.width * scaleX, object.height * scaleY, model.depth * Math.min(Math.abs(scaleX), Math.abs(scaleY)));
      mesh.rotation.z = -object._rotation * DEG;
    } else if (kind === 'backdrop') {
      // Stand the tile far behind the lane, enlarged so that from the resting camera it covers
      // exactly what it covered in 2D. When the camera leans, it then shifts as distant things do.
      const depth = FAR_DEPTH[view.layer];
      const k = (this.neutral.z + depth) / this.neutral.z;
      mesh.position.set(this.neutral.x + (cx - this.neutral.x) * k, this.neutral.y + (-cy - this.neutral.y) * k, -depth);
      mesh.scale.set((object.width / CONTENT_WIDTH) * scaleX * k, (object.height / CONTENT_HEIGHT) * scaleY * k, k);
    } else {
      if (kind !== 'spin' && object instanceof Sprite && view.frame !== object.frame) {
        view.frame = object.frame;
        mesh.geometry = this._frameGeometry(object.image, model, object.frame, view.frameWidth, view.frameHeight).geometry;
        if (view.twin) view.twin.geometry = mesh.geometry;
      }
      const fx = (object.width / view.frameWidth) * scaleX;
      const fy = (object.height / view.frameHeight) * scaleY;
      const fz = kind === 'inflate' ? Math.sqrt(Math.abs(fx * fy)) : Math.min(Math.abs(fx), Math.abs(fy));
      mesh.position.set(cx, -(cy - view.lift), view.z);
      mesh.scale.set(fx, fy, fz);
      mesh.rotation.z = -object._rotation * DEG;
      if (kind === 'spin') {
        const turn = object.sequence ? object.elapsed / object.sequence.time : 0;
        mesh.rotation.y = turn * Math.PI;
      }
      if (view.twin) {
        view.twin.position.set(cx, -(cy - view.lift), -view.z);
        view.twin.scale.copy(mesh.scale);
        view.twin.rotation.copy(mesh.rotation);
      }
    }

    // see-through objects (the hero blinking after a hit, things fading out) get a material of their own
    const alpha = Math.min(1, opacity * model.opacity);
    if (alpha < 0.999) {
      if (!view.ownMaterial) {
        view.ownMaterial = view.material.clone();
        view.ownMaterial.transparent = true;
      }
      view.ownMaterial.opacity = alpha;
      if (mesh.material !== view.ownMaterial) mesh.material = view.ownMaterial;
    } else if (mesh.material !== view.material) {
      mesh.material = view.material;
    }
    if (view.twin) view.twin.material = mesh.material;
  }

  /**
   * How far to raise a piece of scenery so it stands on the ground. The original painted trees,
   * flowers and rocks overlapping the top band of the terrain, which in 3D would bury their feet.
   */
  _liftOntoTerrain(object, view) {
    if (object._rotation !== 0) return 0;
    const bounds = this._frameGeometry(object.image, view.model, 0, view.frameWidth, view.frameHeight).bounds;
    if (!bounds) return 0;
    const bottom = object._cy + (bounds.bottom / view.frameHeight - 0.5) * object.height * object._yScale;
    let lift = 0;
    for (const slab of this.slabs) {
      if (object._cx < slab.x0 - 2 || object._cx > slab.x1 + 2) continue;
      const sunk = bottom - slab.y0;
      if (sunk > 0 && sunk <= 46 && (lift === 0 || sunk < lift)) lift = sunk;
    }
    return lift;
  }

  _frameGeometry(image, model, frame, frameWidth, frameHeight) {
    const key = `${image}#${frame}`;
    let entry = this.frameCache.get(key);
    if (!entry) {
      const pixels = this.getPixels(image);
      const columns = Math.max(1, Math.floor(pixels.width / frameWidth));
      const grid = sampleGrid(pixels, (frame % columns) * frameWidth, Math.floor(frame / columns) * frameHeight, frameWidth, frameHeight, model);
      const quads = model.kind === 'inflate' ? inflateFrame(grid, model) : extrudeFrame(grid, { front: model.half, back: -model.half });
      entry = { geometry: geometryFromArrays(quads.toArrays()), bounds: solidBounds(grid) };
      this.frameCache.set(key, entry);
    }
    return entry;
  }

  /**
   * Terrain: the image cut out of the full depth of the lane, at the size it is shown, with the
   * block pattern mapped in level coordinates so it runs unbroken from one piece to the next.
   */
  _slabGeometry(object) {
    const pixels = this.getPixels(object.image);
    const grid = sampleGrid(pixels, 0, 0, pixels.width, pixels.height);
    const arrays = extrudeFrame(grid, { front: LANE_FRONT, back: LANE_BACK }).toArrays();
    const { positions, normals } = arrays;
    const kx = object.width / pixels.width;
    const ky = object.height / pixels.height;
    const uvs = new Float32Array((positions.length / 3) * 2);
    const span = GRID_CELL * GRID_TILES;
    for (let v = 0; v < positions.length / 3; v++) {
      const x = (positions[v * 3] *= kx);
      const y = (positions[v * 3 + 1] *= ky);
      const z = positions[v * 3 + 2];
      const worldX = object._cx + x;
      const worldY = -object._cy + y;
      const u = Math.abs(normals[v * 3]) > 0.5 ? z : worldX;
      const w = Math.abs(normals[v * 3 + 1]) > 0.5 ? z : worldY;
      uvs[v * 2] = u / span;
      uvs[v * 2 + 1] = w / span;
    }
    return geometryFromArrays(arrays, uvs);
  }

  /**
   * A backdrop tile. The three tiles of a layer (a, b, c) repeat side by side, so they are
   * voxelised as one long wrapping strip and then cut apart: the relief matches across the joins.
   */
  _backdropGeometry(image) {
    let geometry = this.backdropCache.get(image);
    if (geometry) return geometry;
    const model = modelFor(image);
    const family = ['a', 'b', 'c'].map((letter) => image.replace(/[abc]\.png$/, `${letter}.png`));
    const grids = family.map((name) => {
      const pixels = this.getPixels(name);
      return sampleGrid(pixels, 0, 0, pixels.width, pixels.height, model);
    });
    const { gw, gh, pitch, fh } = grids[0];
    const strip = { gw: gw * 3, gh, pitch, fw: grids[0].fw * 3, fh, col: new Int32Array(gw * 3 * gh) };
    for (let t = 0; t < 3; t++) for (let y = 0; y < gh; y++) strip.col.set(grids[t].col.subarray(y * gw, (y + 1) * gw), y * gw * 3 + t * gw);
    family.forEach((name, t) => {
      const quads = inflateFrame(strip, { ...model, wrapX: true, open: { top: true, bottom: true }, columns: [t * gw, (t + 1) * gw], backFaces: false });
      this.backdropCache.set(name, geometryFromArrays(quads.toArrays()));
    });
    return this.backdropCache.get(image);
  }

  _cubeMaterial(image) {
    let material = this.cubeMaterials.get(image);
    if (!material) {
      const texture = new THREE.CanvasTexture(this.getTexture(image).image);
      texture.flipY = false;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.anisotropy = 4;
      material = new THREE.MeshLambertMaterial({ map: texture });
      this.cubeMaterials.set(image, material);
    }
    return material;
  }

  _dropView(view) {
    if (view.mesh) view.scene.remove(view.mesh);
    if (view.twin) view.scene.remove(view.twin);
    if (view.flat) {
      view.material.dispose();
      if (view.geometry) view.geometry.dispose();
    }
    if (view.ownMaterial) view.ownMaterial.dispose();
    if (view.ownGeometry) view.ownGeometry.dispose();
    if (view.texture) view.texture.dispose();
    if (view.object.view === view) view.object.view = null;
    this.views.delete(view);
  }

  // --- adaptive quality ----------------------------------------------------------------------------

  /** Slow device? First render fewer pixels, then give up the shadows. */
  _watchFrameRate() {
    const now = performance.now();
    const elapsed = now - this.lastFrameAt;
    this.lastFrameAt = now;
    if (elapsed <= 0 || elapsed > 250 || this.worldOrigin === null) {
      this.frameTimes.length = 0;
      return;
    }
    this.frameTimes.push(elapsed);
    if (this.frameTimes.length < 90) return;
    const average = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (average < 38 || this.quality === 0) return; // 38 ms: slower than a display capped at 30 frames a second
    this.quality -= 1;
    if (this.quality === 1) {
      this.maxPixelRatio = 1;
      this.resize();
    } else {
      this.sun.castShadow = false;
      this.three.shadowMap.enabled = false;
      this.three.shadowMap.needsUpdate = true;
      for (const material of [this.voxelMaterial, this.slabMaterial, ...this.cubeMaterials.values()]) material.needsUpdate = true;
    }
  }
}
