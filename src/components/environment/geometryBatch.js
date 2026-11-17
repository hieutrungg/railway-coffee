import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Deterministic RNG so the procedural street looks the same on every load
export const createRandom = (seed) => {
  let value = seed >>> 0
  const next = () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  next.range = (min, max) => min + next() * (max - min)
  next.pick = (items) => items[Math.floor(next() * items.length)]
  next.chance = (probability) => next() < probability
  return next
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
const UNIT_CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 8)
const UNIT_SPHERE = new THREE.SphereGeometry(0.5, 8, 6)
const UNIT_CAPSULE = new THREE.CapsuleGeometry(0.5, 1, 2, 6)
// Square frustum (plastic stool body), corners rotated to face the axes
const UNIT_FRUSTUM = new THREE.CylinderGeometry(0.4, 0.5, 1, 4).rotateY(Math.PI / 4)

const SHAPES = { box: UNIT_BOX, cylinder: UNIT_CYLINDER, sphere: UNIT_SPHERE, capsule: UNIT_CAPSULE, frustum: UNIT_FRUSTUM }

const toNonIndexedWithColor = (geometry, color) => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  flat.deleteAttribute('uv')
  const count = flat.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return flat
}

// Collects many coloured primitives and merges them into one vertex-coloured geometry (one draw call)
export class GeometryBatch {
  constructor() {
    this.parts = []
    this.matrix = new THREE.Matrix4()
    this.quaternion = new THREE.Quaternion()
    this.euler = new THREE.Euler()
    this.color = new THREE.Color()
  }

  add(shape, { position = [0, 0, 0], rotation = [0, 0, 0], order = 'XYZ', scale = [1, 1, 1], color = '#ffffff', intensity = 1 }) {
    this.euler.set(rotation[0], rotation[1], rotation[2], order)
    this.quaternion.setFromEuler(this.euler)
    this.matrix.compose(
      new THREE.Vector3(...position),
      this.quaternion,
      new THREE.Vector3(...(Array.isArray(scale) ? scale : [scale, scale, scale]))
    )
    const geometry = toNonIndexedWithColor(SHAPES[shape], this.color.set(color).multiplyScalar(intensity))
    geometry.applyMatrix4(this.matrix)
    this.parts.push(geometry)
    return this
  }

  box(options) {
    return this.add('box', options)
  }

  cylinder(options) {
    return this.add('cylinder', options)
  }

  sphere(options) {
    return this.add('sphere', options)
  }

  capsule(options) {
    return this.add('capsule', options)
  }

  frustum(options) {
    return this.add('frustum', options)
  }

  build() {
    if (this.parts.length === 0) return null
    const merged = mergeGeometries(this.parts, false)
    this.parts.forEach((part) => part.dispose())
    this.parts = []
    merged.computeBoundingSphere()
    return merged
  }
}
