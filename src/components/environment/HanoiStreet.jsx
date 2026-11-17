import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../stores/useAppStore'
import { GeometryBatch, createRandom } from './geometryBatch'
import {
  getShopSignTexture,
  getBladeSignTexture,
  getNeonTexture,
  getStationBadgeTexture,
} from './streetTextures'

// The train street is a narrow canyon of tube houses: facades sit 3.3 m from the track centre
export const FACADE_X = 3.3
const STREET_START_Z = 13
const STREET_END_Z = -76
const GROUND_FLOOR_HEIGHT = 3.5
const FLOOR_HEIGHT = 3.0
const SHADOW_CHUNK_LIMIT_Z = -16
const CHUNK_LENGTH = 16

const WALL_COLORS = ['#e2b45a', '#d9a54a', '#ecd9b0', '#e8c98f', '#c98d4e', '#e4cfc0', '#d7b98a', '#bf7f4a', '#f0e2c4', '#cfb08a']
const SHUTTER_COLORS = ['#2e5b3c', '#25483a', '#3a6b6b', '#5b3b24', '#2c4f6b']
const AWNING_COLORS = ['#e8a51c', '#e7b52c', '#d9531e', '#c2321f', '#e98f1b', '#2f6e47']
// Warm, fairly dim shop interiors so the fairy lights stay the brightest thing on the facade
const INTERIOR_COLORS = ['#b8743a', '#c98a4a', '#9a6236', '#d39a5a', '#a66a3c']
const BULB_PALETTES = [
  ['#ffd9a0', '#ffe6bf'],
  ['#3d7bff', '#ff4fa3', '#3dff8a', '#ffd9a0', '#40e0ff'],
  ['#ff3040', '#ffc040', '#3dff8a'],
  ['#ffd9a0', '#ffc040'],
  ['#40e0ff', '#3d7bff', '#ffffff'],
]
const SHOP_SIGNS = [
  ['CÀ PHÊ GA CŨ', 'CÀ PHÊ PHIN • TRÀ ĐÁ'],
  ['BIA HƠI PHỐ CỔ', ''],
  ['BÚN CHẢ HÀ NỘI', 'GIA TRUYỀN TỪ 1968'],
  ['PHỞ BÒ PHỐ CỔ', 'HANOI NOODLE SOUP'],
  ['BÁNH MÌ HÀ NỘI', 'PÂTÉ • CHẢ • TRỨNG'],
  ['TRÀ CHANH GIÃ TAY', ''],
  ['XÓM TÀU 1986', 'COFFEE & TEA'],
  ['CÀ PHÊ TRỨNG', 'EGG COFFEE'],
  ['TIỆM TẠP HOÁ CỔ', ''],
  ['NHÀ NGHỈ ĐƯỜNG RAY', 'HOMESTAY'],
  ['QUÁN 1902', 'CÀ PHÊ • NƯỚC ÉP'],
  ['SINH TỐ BỐN MÙA', ''],
]
const SIGN_STYLES = [
  ['#7e2417', '#f4d06f'],
  ['#1b3d2b', '#eed182'],
  ['#14325c', '#f3e3c3'],
  ['#f2c230', '#7e2417'],
  ['#2a2320', '#f0b468'],
]
const BLADE_SIGNS = [['CÀ', 'PHÊ'], ['CAFE', 'TÀU'], ['BIA', 'HƠI'], ['PHỞ'], ['TRÀ', 'ĐÁ'], ['NHÀ', 'NGHỈ']]
const NEON_SIGNS = [
  ['HANOI', '#ff2d55', false],
  ['Coffee', '#ffffff', true],
  ['TRAIN STREET', '#38e8ff', false],
  ['Bia Hơi', '#3dff8a', true],
  ['CÀ PHÊ', '#ffb020', false],
  ['Live Music', '#ff4fd8', true],
  ['Egg Coffee', '#40e0ff', true],
]

// Converts "out from the facade, height, along the street" into world coordinates for one side
const sideFrame = (side) => ({
  x: (out) => side * (FACADE_X - out),
  faceRotationY: -side * (Math.PI / 2),
})

function buildStreet() {
  const random = createRandom(1975)
  const chunks = new Map()
  const signs = []
  const neons = []
  const blades = []
  const badges = []
  const bulbs = []

  const chunkFor = (z) => {
    const key = Math.floor((STREET_START_Z - z) / CHUNK_LENGTH)
    if (!chunks.has(key)) {
      chunks.set(key, { solid: new GeometryBatch(), glow: new GeometryBatch(), castShadow: z > SHADOW_CHUNK_LIMIT_Z })
    }
    return chunks.get(key)
  }

  const addBulb = (position, color) => bulbs.push({ position, color })

  // A sagging string of bulbs between two points
  const addBulbString = (from, to, spacing, colors, sag = 0.25) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
    const count = Math.max(2, Math.round(length / spacing))
    for (let i = 0; i <= count; i++) {
      const t = i / count
      addBulb(
        [
          THREE.MathUtils.lerp(from[0], to[0], t),
          THREE.MathUtils.lerp(from[1], to[1], t) - Math.sin(t * Math.PI) * sag,
          THREE.MathUtils.lerp(from[2], to[2], t),
        ],
        colors[i % colors.length]
      )
    }
  }

  const buildHouse = (side, zStart, width, isHero) => {
    const { x, faceRotationY } = sideFrame(side)
    const zCenter = zStart - width / 2
    const { solid, glow } = chunkFor(zCenter)
    const floors = isHero ? 3 : Math.floor(random.range(2, 4.99))
    const height = GROUND_FLOOR_HEIGHT + floors * FLOOR_HEIGHT + random.range(0, 0.6)
    const wall = random.pick(WALL_COLORS)
    const trim = new THREE.Color(wall).multiplyScalar(0.78).getStyle()
    const shutter = random.pick(SHUTTER_COLORS)
    const bulbPalette = random.pick(BULB_PALETTES)
    const along = width - 0.06

    // body, side pilasters, parapet
    solid.box({ position: [x(-3), height / 2, zCenter], scale: [6, height, along], color: wall })
    for (const edge of [-1, 1]) {
      solid.box({ position: [x(0.06), height / 2, zCenter + edge * (along / 2 - 0.1)], scale: [0.14, height, 0.2], color: trim })
    }
    solid.box({ position: [x(0.08), height + 0.25, zCenter], scale: [0.2, 0.5, along], color: trim })
    if (random.chance(0.45)) {
      solid.box({ position: [x(-1.2), height + 0.75, zCenter], rotation: [0, 0, side * 0.35], scale: [3, 0.18, along + 0.2], color: '#9c3b24' })
    }

    // ground floor: lit shop interior with shelves and stock
    const shopWidth = along * random.range(0.7, 0.86)
    glow.box({ position: [x(-0.02), 1.4, zCenter], scale: [0.04, 2.7, shopWidth], color: random.pick(INTERIOR_COLORS) })
    // dark door frame (jambs + lintel) so the opening reads as a shopfront, not a painted wall
    for (const edge of [-1, 1]) {
      solid.box({ position: [x(0.05), 1.4, zCenter + edge * (shopWidth / 2 + 0.06)], scale: [0.1, 2.8, 0.12], color: '#2a1d14' })
    }
    solid.box({ position: [x(0.05), 2.82, zCenter], scale: [0.1, 0.12, shopWidth + 0.24], color: '#2a1d14' })
    solid.box({ position: [x(-0.03), 1.4, zCenter + shopWidth * 0.22], scale: [0.02, 2.7, 0.05], color: '#3a2618' })
    for (const y of [0.9, 1.6, 2.2]) {
      solid.box({ position: [x(0.02), y, zCenter], scale: [0.04, 0.05, shopWidth], color: '#3a2618' })
      const items = Math.floor(shopWidth / 0.35)
      for (let i = 0; i < items; i++) {
        if (random.chance(0.4)) continue
        solid.box({
          position: [x(0.05), y + 0.12, zCenter - shopWidth / 2 + (i + 0.5) * (shopWidth / items)],
          scale: [0.06, random.range(0.12, 0.22), 0.16],
          color: random.pick(['#c2321f', '#e8a51c', '#2f6e47', '#f3e3c3', '#3d5f9c', '#7a4a2a']),
        })
      }
    }
    solid.box({ position: [x(0.12), GROUND_FLOOR_HEIGHT - 0.05, zCenter], scale: [0.24, 0.16, along], color: trim })

    // ground-floor awning sloping toward the track, with a bulb string on its edge
    if (isHero || random.chance(0.75)) {
      const awningColor = random.pick(AWNING_COLORS)
      const depth = random.range(0.9, 1.35)
      const top = GROUND_FLOOR_HEIGHT - 0.3
      const slope = 0.32
      solid.box({
        position: [x(depth / 2), top - Math.sin(slope) * depth * 0.5, zCenter],
        rotation: [0, 0, side * slope],
        scale: [depth, 0.04, along * 0.95],
        color: awningColor,
      })
      const edgeY = top - Math.sin(slope) * depth
      solid.box({ position: [x(depth), edgeY - 0.1, zCenter], scale: [0.02, 0.2, along * 0.95], color: awningColor })
      if (random.chance(0.7)) {
        addBulbString(
          [x(depth + 0.02), edgeY - 0.22, zCenter + along * 0.47],
          [x(depth + 0.02), edgeY - 0.22, zCenter - along * 0.47],
          0.16,
          bulbPalette,
          0.05
        )
      }
      // Tết firecracker strings hanging from the awning
      if (random.chance(0.22)) {
        for (let k = 0; k < 2; k++) {
          const z = zCenter + random.range(-along * 0.35, along * 0.35)
          const length = random.range(1.0, 1.6)
          solid.cylinder({ position: [x(depth - 0.1), edgeY - 0.2 - length / 2, z], scale: [0.07, length, 0.07], color: '#c81e1e' })
          for (let ring = 0; ring < 6; ring++) {
            solid.cylinder({
              position: [x(depth - 0.1), edgeY - 0.25 - (ring + 0.5) * (length / 6), z],
              scale: [0.085, 0.025, 0.085],
              color: '#e8b33a',
            })
          }
        }
      }
    }

    // upper floors: ledges, shuttered windows, balconies, air conditioners, plants
    for (let floor = 0; floor < floors; floor++) {
      const base = GROUND_FLOOR_HEIGHT + floor * FLOOR_HEIGHT
      const windowCount = Math.max(1, Math.round(along / 1.5))
      const hasBalcony = (isHero && floor === 0) || random.chance(0.5)
      solid.box({ position: [x(0.08), base + FLOOR_HEIGHT - 0.06, zCenter], scale: [0.16, 0.12, along], color: trim })

      for (let w = 0; w < windowCount; w++) {
        const z = zCenter - along / 2 + (w + 0.5) * (along / windowCount)
        const isLit = random.chance(0.55)
        const windowWidth = Math.min(0.95, (along / windowCount) * 0.55)
        ;(isLit ? glow : solid).box({
          position: [x(0.01), base + 1.45, z],
          scale: [0.03, 1.55, windowWidth],
          color: isLit ? random.pick(INTERIOR_COLORS) : '#1d2228',
        })
        for (const edge of [-1, 1]) {
          solid.box({
            position: [x(0.05), base + 1.45, z + edge * (windowWidth / 2 + 0.17)],
            scale: [0.05, 1.6, 0.32],
            color: shutter,
          })
        }
        solid.box({ position: [x(0.07), base + 0.62, z], scale: [0.14, 0.07, windowWidth + 0.3], color: trim })
      }

      if (hasBalcony) {
        const depth = 0.85
        solid.box({ position: [x(depth / 2), base + 0.08, zCenter], scale: [depth, 0.14, along * 0.9], color: '#8a8178' })
        solid.box({ position: [x(depth - 0.02), base + 0.95, zCenter], scale: [0.05, 0.05, along * 0.9], color: '#1f2421' })
        const bars = Math.round((along * 0.9) / 0.14)
        for (let b = 0; b <= bars; b++) {
          solid.box({
            position: [x(depth - 0.02), base + 0.52, zCenter - (along * 0.9) / 2 + b * ((along * 0.9) / bars)],
            scale: [0.02, 0.85, 0.02],
            color: '#1f2421',
          })
        }
        if (random.chance(0.7)) {
          const pots = Math.floor(random.range(1, 4))
          for (let p = 0; p < pots; p++) {
            const z = zCenter + random.range(-along * 0.38, along * 0.38)
            solid.cylinder({ position: [x(depth - 0.25), base + 0.3, z], scale: [0.24, 0.3, 0.24], color: '#94452b' })
            solid.sphere({ position: [x(depth - 0.25), base + 0.6, z], scale: [0.5, 0.45, 0.5], color: random.pick(['#2d6e3e', '#357d47', '#286337']) })
            if (random.chance(0.4)) {
              solid.sphere({ position: [x(depth - 0.1), base + 0.68, z + 0.1], scale: 0.25, color: '#e83e8c' })
            }
          }
        }
        // fairy lights draped along the balcony rail
        if (random.chance(0.6)) {
          addBulbString(
            [x(depth), base + 0.98, zCenter + along * 0.45],
            [x(depth), base + 0.98, zCenter - along * 0.45],
            0.14,
            bulbPalette,
            0.12
          )
        }
      } else if (random.chance(0.35)) {
        // upper-floor awning like the yellow canvas ones in old-quarter photos
        solid.box({
          position: [x(0.5), base + 2.45, zCenter],
          rotation: [0, 0, side * 0.4],
          scale: [1.0, 0.04, along * 0.7],
          color: random.pick(AWNING_COLORS),
        })
      }

      if (random.chance(0.4)) {
        solid.box({
          position: [x(0.2), base + 2.3, zCenter + random.range(-along * 0.35, along * 0.35)],
          scale: [0.3, 0.45, 0.7],
          color: '#e6e6e2',
        })
      }
    }

    // curtain of fairy-light strands over the first upper floor
    if (isHero || random.chance(0.5)) {
      const strands = Math.round(along / 0.22)
      const top = GROUND_FLOOR_HEIGHT + 2.7
      for (let s = 0; s <= strands; s++) {
        const z = zCenter - along / 2 + s * (along / strands)
        const drop = random.range(1.2, 2.6)
        const count = Math.round(drop / 0.13)
        for (let b = 0; b < count; b++) {
          addBulb([x(0.18), top - b * 0.13, z], bulbPalette[(s + b) % bulbPalette.length])
        }
      }
      addBulbString([x(0.18), top + 0.05, zCenter + along / 2], [x(0.18), top + 0.05, zCenter - along / 2], 0.12, bulbPalette, 0.0)
    }

    // shop sign above the awning
    const [title, subtitle] = isHero ? ['CÀ PHÊ ĐƯỜNG TÀU', 'HÀ NỘI TRAIN STREET • EST. 1975'] : random.pick(SHOP_SIGNS)
    const [background, foreground] = isHero ? ['#7e2417', '#f4d06f'] : random.pick(SIGN_STYLES)
    const signWidth = Math.min(along * 0.85, 3.2)
    signs.push({
      position: [x(0.06), GROUND_FLOOR_HEIGHT + 0.35, zCenter],
      rotationY: faceRotationY,
      size: [signWidth, signWidth / 4],
      texture: getShopSignTexture(title, subtitle, background, foreground),
    })

    // perpendicular blade sign hanging over the street
    if (random.chance(0.4)) {
      const [background2, foreground2] = random.pick(SIGN_STYLES)
      blades.push({
        position: [x(0.55), GROUND_FLOOR_HEIGHT + random.range(1.2, 2.4), zCenter + along * random.range(-0.4, 0.4)],
        texture: getBladeSignTexture(random.pick(BLADE_SIGNS), background2, foreground2),
      })
      solid.box({ position: [x(0.25), GROUND_FLOOR_HEIGHT + 2.6, zCenter], scale: [0.5, 0.03, 0.03], color: '#1f2421' })
    }

    // neon on the upper facade
    if (floors > 1 && random.chance(0.45)) {
      const [text, color, script] = random.pick(NEON_SIGNS)
      neons.push({
        position: [x(0.12), GROUND_FLOOR_HEIGHT + FLOOR_HEIGHT + random.range(1.6, 2.3), zCenter],
        rotationY: faceRotationY,
        size: [Math.min(along * 0.8, 2.6), Math.min(along * 0.8, 2.6) * 0.31],
        texture: getNeonTexture(text, color, { script }),
        color,
      })
    }
    if (random.chance(0.12)) {
      badges.push({ position: [x(0.15), GROUND_FLOOR_HEIGHT + FLOOR_HEIGHT * 0.55, zCenter + along * 0.3], rotationY: faceRotationY })
    }
  }

  for (const side of [-1, 1]) {
    let z = STREET_START_Z
    while (z > STREET_END_Z) {
      const width = random.range(3.2, 5.2)
      const isHero = side === -1 && z > 0.5 && z - width < 0.5
      buildHouse(side, z, width, isHero)
      z -= width
    }
  }

  // bulb strings and lantern lines zigzagging across the street
  const crossLanterns = []
  for (let z = 8; z > -60; z -= random.range(3.5, 6)) {
    const palette = random.pick(BULB_PALETTES)
    const y = random.range(5.4, 6.6)
    addBulbString([-FACADE_X + 0.2, y, z], [FACADE_X - 0.2, y + random.range(-0.4, 0.4), z - random.range(1, 3)], 0.22, palette, 0.6)
    if (random.chance(0.45)) {
      const count = Math.floor(random.range(3, 6))
      for (let i = 0; i < count; i++) {
        crossLanterns.push({
          position: [-1.6 + (i / (count - 1)) * 3.2, y - 0.5 - Math.sin((i / (count - 1)) * Math.PI) * 0.5, z - 1],
          color: random.pick(['#ff3b20', '#ffb020', '#ff4422', '#ff7a1a']),
        })
      }
    }
  }

  const geometries = [...chunks.values()].map(({ solid, glow, castShadow }) => ({
    solid: solid.build(),
    glow: glow.build(),
    castShadow,
  }))
  return { geometries, signs, neons, blades, badges, bulbs, crossLanterns }
}

// ---------------------------------------------------------------- fairy lights
// All bulbs in one InstancedMesh; a shader tweak makes each one twinkle at its own pace
function FairyLights({ bulbs }) {
  const meshRef = useRef()
  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
    mat.userData.time = { value: 0 }
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = mat.userData.time
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
        '#include <color_vertex>',
        `#include <color_vertex>
        float bulbId = float(gl_InstanceID);
        vColor *= 0.55 + 0.45 * sin(uTime * (1.2 + mod(bulbId, 5.0) * 0.5) + bulbId * 2.17);`
      )
    }
    return mat
  }, [])

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.032, 0), [])

  const setupInstances = (mesh) => {
    if (!mesh || mesh.userData.isReady) return
    meshRef.current = mesh
    const matrix = new THREE.Matrix4()
    const color = new THREE.Color()
    bulbs.forEach((bulb, index) => {
      matrix.makeTranslation(...bulb.position)
      mesh.setMatrixAt(index, matrix)
      mesh.setColorAt(index, color.set(bulb.color).multiplyScalar(3.2))
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.userData.isReady = true
  }

  useFrame((state) => {
    material.userData.time.value = state.clock.getElapsedTime()
  })

  return <instancedMesh ref={setupInstances} args={[geometry, material, bulbs.length]} frustumCulled={false} />
}

// Gentle swaying Vietnamese silk lantern (near the café, animated)
function Lantern({ position, color = '#ff5522', scale = 1 }) {
  const groupRef = useRef()
  const weather = useAppStore((state) => state.weather)
  const isNight = weather === 'night' || weather === 'sunset' || weather === 'rain'
  const offset = useMemo(() => (position[0] * 7.1 + position[2] * 3.3) % (Math.PI * 2), [position])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime() + offset
    groupRef.current.rotation.z = Math.sin(t * 1.4) * 0.06
    groupRef.current.rotation.x = Math.cos(t * 1.1) * 0.04
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.55, 6]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isNight ? 1.8 : 0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 12]} />
        <meshStandardMaterial color="#2d1c10" />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.08, 0.04, 0.04, 12]} />
        <meshStandardMaterial color="#2d1c10" />
      </mesh>
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[0.015, 0.03, 0.16, 8]} />
        <meshStandardMaterial color="#cc2211" />
      </mesh>
    </group>
  )
}

const sharedPlane = new THREE.PlaneGeometry(1, 1)
const solidMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.03 })
const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(0.95, 0.95, 0.95) })
const lanternMaterials = new Map()
const getLanternMaterial = (color) => {
  if (!lanternMaterials.has(color)) {
    lanternMaterials.set(color, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6) }))
  }
  return lanternMaterials.get(color)
}
const lanternGeometry = new THREE.SphereGeometry(0.16, 12, 10)

export function HanoiStreet() {
  const street = useMemo(() => buildStreet(), [])

  return (
    <group>
      {street.geometries.map(({ solid, glow, castShadow }, index) => (
        <group key={index}>
          {solid && <mesh geometry={solid} material={solidMaterial} castShadow={castShadow} receiveShadow />}
          {glow && <mesh geometry={glow} material={glowMaterial} />}
        </group>
      ))}

      {street.signs.map((sign, index) => (
        <mesh key={`sign${index}`} geometry={sharedPlane} position={sign.position} rotation={[0, sign.rotationY, 0]} scale={[...sign.size, 1]}>
          <meshStandardMaterial map={sign.texture} roughness={0.55} emissive="#ffffff" emissiveMap={sign.texture} emissiveIntensity={0.18} />
        </mesh>
      ))}

      {street.blades.map((blade, index) => (
        <mesh key={`blade${index}`} geometry={sharedPlane} position={blade.position} scale={[0.42, 1.26, 1]}>
          <meshStandardMaterial map={blade.texture} side={THREE.DoubleSide} roughness={0.6} emissive="#ffffff" emissiveMap={blade.texture} emissiveIntensity={0.2} />
        </mesh>
      ))}

      {street.neons.map((neon, index) => (
        <mesh key={`neon${index}`} geometry={sharedPlane} position={neon.position} rotation={[0, neon.rotationY, 0]} scale={[...neon.size, 1]}>
          <meshBasicMaterial map={neon.texture} transparent depthWrite={false} color={new THREE.Color(2.4, 2.4, 2.4)} />
        </mesh>
      ))}

      {street.badges.map((badge, index) => (
        <mesh key={`badge${index}`} geometry={sharedPlane} position={badge.position} rotation={[0, badge.rotationY, 0]} scale={[1.3, 1.3, 1]}>
          <meshStandardMaterial map={getStationBadgeTexture()} transparent emissive="#ffffff" emissiveMap={getStationBadgeTexture()} emissiveIntensity={0.35} />
        </mesh>
      ))}

      {street.crossLanterns.map((lantern, index) => (
        <mesh key={`lantern${index}`} geometry={lanternGeometry} material={getLanternMaterial(lantern.color)} position={lantern.position} scale={[1, 1.15, 1]} />
      ))}

      <FairyLights bulbs={street.bulbs} />

      {/* Animated lanterns close to the café table */}
      <Lantern position={[-0.6, 3.8, 1.2]} color="#ff4422" scale={1.1} />
      <Lantern position={[0.5, 4.0, 0.8]} color="#f59e0b" scale={0.95} />
      <Lantern position={[-0.4, 3.7, -2.2]} color="#ff3b20" scale={1.05} />
      <Lantern position={[0.5, 3.9, -2.8]} color="#fbb42c" scale={0.95} />
      <Lantern position={[-1.7, 2.8, 0.5]} color="#ffaa22" scale={0.9} />
    </group>
  )
}
