import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GeometryBatch, createRandom } from './geometryBatch'

// Café rows along both sides of the track, with seated customers and onlookers filming with phones.
// Everything is merged into two meshes so a busy street stays cheap to draw.

const SIDEWALK_Y = 0.16
const STOOL_HEIGHT = 0.26
const TABLE_HEIGHT = 0.44
const SEAT_Y = SIDEWALK_Y + STOOL_HEIGHT

const SHIRTS = ['#f2f2f2', '#2d4f8a', '#c23b3b', '#3c6e4a', '#e7c35a', '#1f1f1f', '#9c6bb3', '#e98f6b', '#7fa7c9', '#d9d2c5']
const PANTS = ['#2b3240', '#1f1f1f', '#4a5a7a', '#8a7a62', '#3b3b3b', '#5c4a3a']
const SKIN = ['#e9c3a0', '#d9a77f', '#c68b62', '#f1d2b6']
const HAIR = ['#1a1410', '#2d2017', '#5a4030', '#c9c2b5', '#d8b26e']
const STOOLS = ['#c8322b', '#2c5fb0', '#e2a920', '#c8322b']
const DRINKS = ['#b9782c', '#24130c', '#f0e6c8', '#e8a51c', '#7a3b1c']

// Places limbs in a person-local frame (+z = facing direction) and converts to world space
const personFrame = (base, yaw) => {
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    at: (x, y, z) => [base[0] + x * cos + z * sin, base[1] + y, base[2] - x * sin + z * cos],
    rot: (rx = 0, rz = 0) => ({ rotation: [rx, yaw, rz], order: 'YXZ' }),
  }
}

const limb = (batch, frame, position, length, thickness, color, rx = 0, rz = 0) =>
  batch.capsule({ position: frame.at(...position), ...frame.rot(rx, rz), scale: [thickness, length / 2, thickness], color })

const addHead = (batch, frame, y, look, random) => {
  const skin = random.pick(SKIN)
  batch.sphere({ position: frame.at(0, y, 0.01), scale: [0.2, 0.23, 0.21], color: skin })
  batch.sphere({ position: frame.at(0, y + 0.04, -0.02), ...frame.rot(look), scale: [0.215, 0.2, 0.22], color: random.pick(HAIR) })
  if (random.chance(0.25)) {
    // cap
    batch.cylinder({ position: frame.at(0, y + 0.1, 0), scale: [0.23, 0.07, 0.23], color: random.pick(SHIRTS) })
    batch.box({ position: frame.at(0, y + 0.07, 0.13), ...frame.rot(), scale: [0.18, 0.015, 0.12], color: random.pick(SHIRTS) })
  }
  return skin
}

function addSeatedPerson(batch, base, yaw, random) {
  const frame = personFrame(base, yaw)
  const shirt = random.pick(SHIRTS)
  const pants = random.pick(PANTS)
  for (const x of [-0.1, 0.1]) {
    limb(batch, frame, [x, 0.06, 0.17], 0.42, 0.15, pants, Math.PI / 2)
    limb(batch, frame, [x, -0.18, 0.38], 0.44, 0.12, pants)
    batch.box({ position: frame.at(x, -0.39, 0.43), ...frame.rot(), scale: [0.1, 0.06, 0.2], color: '#2a2420' })
  }
  batch.capsule({ position: frame.at(0, 0.34, 0), ...frame.rot(0.12), scale: [0.36, 0.27, 0.24], color: shirt })
  const skin = addHead(batch, frame, 0.76, 0, random)
  for (const x of [-0.21, 0.21]) {
    limb(batch, frame, [x, 0.4, 0.13], 0.46, 0.1, shirt, 1.0)
    batch.sphere({ position: frame.at(x * 0.8, 0.27, 0.32), scale: 0.07, color: skin })
  }
}

// Filmers get their right arm from an animated rig instead of the merged batch
function addStandingPerson(batch, base, yaw, random, { isFilmer = false } = {}) {
  const frame = personFrame(base, yaw)
  const shirt = random.pick(SHIRTS)
  const pants = random.pick(PANTS)
  const height = random.range(0.92, 1.05)
  for (const x of [-0.09, 0.09]) {
    limb(batch, frame, [x, 0.45 * height, 0], 0.9 * height, 0.14, pants)
    batch.box({ position: frame.at(x, 0.03, 0.04), ...frame.rot(), scale: [0.1, 0.06, 0.22], color: '#2a2420' })
  }
  batch.capsule({ position: frame.at(0, 1.15 * height, 0), ...frame.rot(), scale: [0.38, 0.3, 0.24], color: shirt })
  const skin = addHead(batch, frame, 1.6 * height, 0, random)
  for (const side of isFilmer ? [-1] : [-1, 1]) {
    limb(batch, frame, [side * 0.23, 1.05 * height, 0], 0.6, 0.1, shirt, 0.1, side * 0.1)
  }
  return { shirt, skin, height, yaw, base }
}

function addTable(batch, center, random) {
  const [x, , z] = center
  batch.box({ position: [x, SIDEWALK_Y + TABLE_HEIGHT - 0.012, z], scale: [0.48, 0.024, 0.62], color: '#5a3a22' })
  for (const dx of [-0.19, 0.19]) {
    for (const dz of [-0.26, 0.26]) {
      batch.box({ position: [x + dx, SIDEWALK_Y + TABLE_HEIGHT / 2, z + dz], scale: [0.025, TABLE_HEIGHT, 0.025], color: '#3d3f42' })
    }
  }
  const drinks = Math.floor(random.range(1, 4))
  for (let i = 0; i < drinks; i++) {
    batch.cylinder({
      position: [x + random.range(-0.15, 0.15), SIDEWALK_Y + TABLE_HEIGHT + 0.05, z + random.range(-0.22, 0.22)],
      scale: [0.06, 0.1, 0.06],
      color: random.pick(DRINKS),
    })
  }
}

function addStool(batch, position, color) {
  batch.frustum({ position: [position[0], SIDEWALK_Y + (STOOL_HEIGHT - 0.03) / 2, position[2]], scale: [0.33, STOOL_HEIGHT - 0.03, 0.33], color })
  batch.box({ position: [position[0], SIDEWALK_Y + STOOL_HEIGHT - 0.015, position[2]], scale: [0.235, 0.03, 0.235], color })
}

// Keep the seated view down the track clear around the player's own table
const isNearPlayerTable = (side, z) => side < 0 && z > -1.2 && z < 2.2

function buildStreetLife() {
  const random = createRandom(2024)
  const solid = new GeometryBatch()

  for (const side of [-1, 1]) {
    const facingTrack = side < 0 ? Math.PI / 2 : -Math.PI / 2
    for (let z = side < 0 ? 6 : 7; z > -44; z -= random.range(1.35, 1.9)) {
      if (isNearPlayerTable(side, z)) continue
      const tableX = side * random.range(1.72, 1.82)
      addTable(solid, [tableX, 0, z], random)
      for (const dz of [-0.2, 0.22]) {
        const stoolPosition = [side * 2.3, 0, z + dz]
        addStool(solid, stoolPosition, random.pick(STOOLS))
        if (random.chance(0.72)) {
          addSeatedPerson(solid, [stoolPosition[0], SEAT_Y, stoolPosition[2]], facingTrack + random.range(-0.25, 0.25), random)
        }
      }
    }

    // onlookers lining the curb, looking toward the oncoming train (it arrives from -z)
    const lookYaw = side < 0 ? 2.55 : -2.55
    for (let z = side < 0 ? -7 : 1.5; z > -34; z -= random.range(1.2, 3.2)) {
      if (FILMER_SPOTS.some((spot) => Math.sign(spot.x) === side && Math.abs(spot.z - z) < 0.8)) continue
      const count = random.chance(0.4) ? 2 : 1
      for (let i = 0; i < count; i++) {
        addStandingPerson(solid, [side * random.range(1.38, 1.5), SIDEWALK_Y, z - i * 0.45], lookYaw + random.range(-0.35, 0.35), random)
      }
    }
  }

  const filmers = FILMER_SPOTS.map((spot) =>
    addStandingPerson(solid, [spot.x, SIDEWALK_Y, spot.z], spot.x < 0 ? 2.55 : -2.55, random, { isFilmer: true })
  )

  return { solid: solid.build(), filmers }
}

// Just two people filming, taking turns raising their phones
const FILMER_SPOTS = [
  { x: 1.44, z: -2.6 },
  { x: 1.44, z: -7.2 },
]
const FILM_CYCLE_SECONDS = 9
const ARM_DOWN = -0.08
const ARM_RAISED = -1.95 // shoulder pitch that points the forearm forward and up at eye level
const SHOULDER_HEIGHT = 1.38
const ARM_LENGTH = 0.5

const smoothstep = (edge0, edge1, x) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function FilmerArm({ filmer, phase }) {
  const pivotRef = useRef()
  const screenRef = useRef()
  const screenColor = useMemo(() => new THREE.Color('#cfe6ff'), [])
  const { base, yaw, height, shirt, skin } = filmer

  useFrame(({ clock }) => {
    const wave = Math.sin((clock.elapsedTime / FILM_CYCLE_SECONDS) * Math.PI * 2 + phase)
    const raise = smoothstep(-0.15, 0.45, wave)
    pivotRef.current.rotation.x = THREE.MathUtils.lerp(ARM_DOWN, ARM_RAISED, raise)
    screenRef.current.color.copy(screenColor).multiplyScalar(0.15 + raise * 1.7)
  })

  return (
    <group position={[base[0], base[1] + SHOULDER_HEIGHT * height, base[2]]} rotation={[0, yaw, 0]}>
      <group position={[0.2, 0, 0]} rotation={[0, 0, 0.08]} ref={pivotRef}>
        <mesh position={[0, -ARM_LENGTH / 2, 0]} castShadow>
          <capsuleGeometry args={[0.05, ARM_LENGTH - 0.1, 2, 6]} />
          <meshStandardMaterial color={shirt} roughness={0.75} />
        </mesh>
        <mesh position={[0, -ARM_LENGTH - 0.02, 0]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color={skin} roughness={0.75} />
        </mesh>
        {/* phone held in the hand, screen facing the filmer */}
        <group position={[0, -ARM_LENGTH - 0.07, -0.01]}>
          <mesh>
            <boxGeometry args={[0.078, 0.155, 0.012]} />
            <meshStandardMaterial color="#1b1b1f" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, -0.007]}>
            <planeGeometry args={[0.068, 0.14]} />
            <meshBasicMaterial ref={screenRef} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

const solidMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 })

export function StreetLife() {
  const { solid, filmers } = useMemo(() => buildStreetLife(), [])
  return (
    <group>
      {solid && <mesh geometry={solid} material={solidMaterial} castShadow receiveShadow />}
      {filmers.map((filmer, index) => (
        <FilmerArm key={index} filmer={filmer} phase={index * Math.PI} />
      ))}
    </group>
  )
}
