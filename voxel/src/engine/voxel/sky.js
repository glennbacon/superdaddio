// Things in the air: rain and snow that fall through the depth of the scene, and stars at night.
//
// The original laid a flat picture of rain or snow over the screen. Here every drop and flake is a
// small voxel somewhere between the camera and the mountains, so near ones pass in front of the
// hero and far ones behind the terrain.

import * as THREE from 'three';

const KINDS = {
  rain: { count: 520, size: [1.4, 15, 1.4], velocity: [-3.4, -13], color: 0xc4d2ee, opacity: 0.55, wobble: 0 },
  snow: { count: 380, size: [3.2, 3.2, 3.2], velocity: [-0.8, -2.1], color: 0xffffff, opacity: 0.92, wobble: 0.6 },
};

// the box of air the drops live in, in the lane's coordinates (y up)
const X0 = -420;
const X1 = 1220;
const Y0 = -640;
const Y1 = 170;
const Z0 = -460;
const Z1 = 330;

const wrap = (value, low, high) => {
  const span = high - low;
  return low + ((((value - low) % span) + span) % span);
};

export class Precipitation {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.kind = null;
    this.mesh = null;
    this.points = null;
    this.matrix = new THREE.Matrix4();
    this.rotation = new THREE.Quaternion();
    this.scaleOne = new THREE.Vector3(1, 1, 1);
    this.position = new THREE.Vector3();
    this.time = 0;
  }

  get active() {
    return this.kind !== null;
  }

  /** @param {'rain' | 'snow' | null} kind */
  set(kind) {
    if (kind === this.kind) return;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    this.kind = kind;
    if (!kind) return;
    const look = KINDS[kind];
    const material = new THREE.MeshBasicMaterial({ color: look.color, transparent: true, opacity: look.opacity, fog: false, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(...look.size), material, look.count);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 15;
    this.points = new Float32Array(look.count * 4); // x, y, z, phase
    let seed = 99;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < look.count; i++) {
      this.points[i * 4] = X0 + random() * (X1 - X0);
      this.points[i * 4 + 1] = Y0 + random() * (Y1 - Y0);
      this.points[i * 4 + 2] = Z0 + random() * (Z1 - Z0);
      this.points[i * 4 + 3] = random() * Math.PI * 2;
    }
    // streaks lean the way they fall
    this.rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(look.velocity[0], -look.velocity[1]));
    this.scene.add(this.mesh);
  }

  /**
   * @param {number} frames how many 1/60 s steps have passed
   * @param {number} dx how far the level scrolled since the last call (the air moves with the ground)
   * @param {number} dy
   */
  update(frames, dx, dy) {
    if (!this.mesh) return;
    const look = KINDS[this.kind];
    const points = this.points;
    this.time += frames / 60;
    for (let i = 0; i < look.count; i++) {
      const p = i * 4;
      const sway = look.wobble ? Math.sin(this.time * 1.7 + points[p + 3]) * look.wobble : 0;
      points[p] = wrap(points[p] + (look.velocity[0] + sway) * frames + dx, X0, X1);
      points[p + 1] = wrap(points[p + 1] + look.velocity[1] * frames - dy, Y0, Y1);
      this.position.set(points[p], points[p + 1], points[p + 2]);
      this.matrix.compose(this.position, this.rotation, this.scaleOne);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** A field of small cubes far behind everything, for the night levels. */
export class Stars {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    const count = 150;
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, count);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const size = 4 + Math.floor(random() * 3) * 3;
      matrix.makeScale(size, size, size);
      matrix.setPosition(-2400 + random() * 5600, -900 + random() * 2300, -2600);
      this.mesh.setMatrixAt(i, matrix);
      const shade = 0.55 + random() * 0.45;
      this.mesh.setColorAt(i, color.setRGB(shade, shade, Math.min(1, shade + 0.12)));
    }
    scene.add(this.mesh);
  }

  set visible(flag) {
    this.mesh.visible = flag;
  }
}
