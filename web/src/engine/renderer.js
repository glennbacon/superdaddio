// Three.js renderer for the display list.
//
// Every visible leaf of the display tree (image, sprite, text) becomes one textured quad. The tree
// is flattened each frame: group transforms are folded into each quad's position/scale and draw
// order is simply tree order, written to `renderOrder` (depth testing is off — this is a 2D game).
//
// The orthographic camera is set up with y pointing down so content coordinates map 1:1 to the
// scene: (0,0) is the top-left of the 800x480 playfield.

import * as THREE from 'three';
import { Group, Sprite, Text, setTextMeasurer } from './display.js';

export const CONTENT_WIDTH = 800;
export const CONTENT_HEIGHT = 480;

const FONT_FAMILY = 'Pixelated';
const TEXT_SUPERSAMPLE = 3; // text is rasterised at 3x so it stays sharp when the canvas is scaled up
const DEG = Math.PI / 180;

// Colours go to the screen exactly as authored, and translucent sprites blend the way they did in
// the original (no linear-space conversion).
THREE.ColorManagement.enabled = false;

function quadGeometry() {
  const geometry = new THREE.BufferGeometry();
  // unit quad centred on the origin; with y down, vertex 0 is the top-left corner
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(image: string) => THREE.Texture} getTexture
   */
  constructor(canvas, getTexture) {
    this.canvas = canvas;
    this.getTexture = getTexture;
    this.three = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    this.three.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.three.setClearColor(0x000000, 1);
    this.camera = new THREE.OrthographicCamera(0, CONTENT_WIDTH, 0, CONTENT_HEIGHT, -1, 1);
    this.scene = new THREE.Scene();
    this.sharedQuad = quadGeometry();
    this.views = new Set();
    this.frameId = 0;
    this.drawOrder = 0;

    const measureContext = document.createElement('canvas').getContext('2d');
    setTextMeasurer((text, size) => {
      measureContext.font = `${size}px ${FONT_FAMILY}`;
      return { width: Math.max(1, Math.ceil(measureContext.measureText(text).width)), height: Math.ceil(size * 1.25) };
    });

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Fits the 5:3 playfield into the window, letterboxed. */
  resize() {
    const scale = Math.min(window.innerWidth / CONTENT_WIDTH, window.innerHeight / CONTENT_HEIGHT);
    const width = Math.max(1, Math.floor(CONTENT_WIDTH * scale));
    const height = Math.max(1, Math.floor(CONTENT_HEIGHT * scale));
    this.three.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
    this.three.setSize(width, height, false);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /** Converts a pointer position in CSS pixels to content coordinates. */
  toContent(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return [((clientX - rect.left) / rect.width) * CONTENT_WIDTH, ((clientY - rect.top) / rect.height) * CONTENT_HEIGHT];
  }

  /** @param {Group} root */
  render(root) {
    this.frameId += 1;
    this.drawOrder = 0;
    this._walk(root, 1, 1, 0, 0, 1);
    for (const view of this.views) {
      if (view.frameId !== this.frameId) this._dropView(view);
    }
    this.three.render(this.scene, this.camera);
  }

  _walk(object, sx, sy, tx, ty, alpha) {
    if (!object.isVisible) return;
    const opacity = alpha * object.alpha;
    if (object instanceof Group) {
      // groups translate and scale their children (the game never rotates a group)
      const gsx = sx * object._xScale;
      const gsy = sy * object._yScale;
      const gtx = tx + sx * object._cx;
      const gty = ty + sy * object._cy;
      for (const child of object.children) this._walk(child, gsx, gsy, gtx, gty, opacity);
      return;
    }
    if (opacity <= 0) return; // invisible walls and sensors never get a mesh

    const view = object.view || this._createView(object);
    view.frameId = this.frameId;
    if (object instanceof Sprite) this._updateSpriteFrame(view, object);
    else if (object instanceof Text) this._updateText(view, object);

    const mesh = view.mesh;
    mesh.position.set(tx + sx * object._cx, ty + sy * object._cy, 0);
    mesh.scale.set(object.width * object._xScale * sx, object.height * object._yScale * sy, 1);
    mesh.rotation.z = object._rotation * DEG;
    mesh.renderOrder = this.drawOrder++;
    view.material.opacity = Math.min(1, opacity);
  }

  _createView(object) {
    const material = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    let geometry = this.sharedQuad;
    const view = { object, material, geometry: null, mesh: null, frameId: 0, frame: -1, text: null, texture: null };
    if (object instanceof Sprite) {
      geometry = view.geometry = quadGeometry(); // sprites own their quad: its UVs select the frame
      material.map = this.getTexture(object.image);
    } else if (object instanceof Text) {
      const canvas = document.createElement('canvas');
      view.texture = new THREE.CanvasTexture(canvas);
      view.texture.flipY = false;
      view.texture.generateMipmaps = false;
      view.texture.minFilter = THREE.LinearFilter;
      material.map = view.texture;
    } else {
      material.map = this.getTexture(object.image);
    }
    view.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(view.mesh);
    this.views.add(view);
    object.view = view;
    return view;
  }

  _updateSpriteFrame(view, sprite) {
    if (view.frame === sprite.frame) return;
    const image = view.material.map.image;
    if (!image) return;
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

  _dropView(view) {
    this.scene.remove(view.mesh);
    view.material.dispose();
    if (view.geometry) view.geometry.dispose();
    if (view.texture) view.texture.dispose();
    if (view.object.view === view) view.object.view = null;
    this.views.delete(view);
  }
}
