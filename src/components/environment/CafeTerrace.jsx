import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { VintageRadio } from '../radio/VintageRadio'
import { useAppStore, getFocusProgress } from '../../stores/useAppStore'

// Animated Steam rising from the hot Vietnamese Coffee Cup
// Soft round sprite so steam reads as wisps, not square points
let steamSpriteCache = null
const getSteamSprite = () => {
  if (steamSpriteCache) return steamSpriteCache
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  steamSpriteCache = new THREE.CanvasTexture(canvas)
  return steamSpriteCache
}

function CoffeeSteam({ position = [0, 0, 0] }) {
  const pointsRef = useRef()
  const particleCount = 28

  const [positions, initialData] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const init = []
    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 0.04
      const y = Math.random() * 0.35
      const z = (Math.random() - 0.5) * 0.04
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      init.push({
        baseX: x,
        speed: 0.12 + Math.random() * 0.1,
        swaySpeed: 1.5 + Math.random() * 2,
        swayAmp: 0.02 + Math.random() * 0.03,
        offset: Math.random() * Math.PI * 2,
      })
    }
    return [pos, init]
  }, [particleCount])

  useFrame((state, delta) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position
    const time = state.clock.getElapsedTime()

    for (let i = 0; i < particleCount; i++) {
      const d = initialData[i]
      let y = posAttr.getY(i) + d.speed * delta
      if (y > 0.45) y = 0.02
      posAttr.setY(i, y)

      const sway = Math.sin(time * d.swaySpeed + d.offset) * (y * d.swayAmp)
      posAttr.setX(i, d.baseX + sway)
      posAttr.setZ(i, (Math.random() - 0.5) * 0.01 + sway * 0.5)
    }
    posAttr.needsUpdate = true
  })

  return (
    <group position={position}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          map={getSteamSprite()}
          color="#f4ece1"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

// Coffee layer spans this height range inside the glass (cup-local Y)
const COFFEE_BASE_Y = 0.0425
const COFFEE_FULL_HEIGHT = 0.045
const PHIN_OUTLET_Y = 0.122
const DROPS_PER_SECOND = 1.4

// Vietnamese Phin Drip Coffee Cup — during a Pomodoro focus the glass fills drop by drop
function VietnameseCoffeeCup({ position }) {
  const coffeeRef = useRef()
  const dropRef = useRef()
  const dropPhase = useRef(0)

  useFrame((_, delta) => {
    const { focus } = useAppStore.getState()
    const isFocusing = focus.phase === 'focus'
    const isDripping = isFocusing && focus.pausedRemainingMs == null
    const level = isFocusing ? 0.15 + 0.85 * getFocusProgress(focus) : 1

    const coffee = coffeeRef.current
    if (coffee) {
      coffee.scale.y = level
      coffee.position.y = COFFEE_BASE_Y + (COFFEE_FULL_HEIGHT * level) / 2
    }

    const drop = dropRef.current
    if (!drop) return
    drop.visible = isDripping
    if (!isDripping) return
    dropPhase.current = (dropPhase.current + delta * DROPS_PER_SECOND) % 1
    const surfaceY = COFFEE_BASE_Y + COFFEE_FULL_HEIGHT * level
    const fall = dropPhase.current * dropPhase.current // accelerate like gravity
    drop.position.y = PHIN_OUTLET_Y - fall * (PHIN_OUTLET_Y - surfaceY)
    drop.scale.setScalar(dropPhase.current < 0.15 ? dropPhase.current / 0.15 : 1)
  })

  return (
    <group position={position}>
      {/* Ceramic Saucer Plate */}
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <cylinderGeometry args={[0.08, 0.06, 0.015, 24]} />
        <meshStandardMaterial color="#e5ddd2" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Glass Cup Body */}
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.036, 0.11, 24]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.88}
          opacity={1}
          transparent
          roughness={0.1}
          ior={1.45}
          thickness={0.05}
        />
      </mesh>

      {/* Sweet Condensed Milk Layer (bottom) */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.036, 0.034, 0.026, 20]} />
        <meshStandardMaterial color="#fff4cc" roughness={0.3} />
      </mesh>

      {/* Rich Black Drip Coffee Layer (middle/top) */}
      <mesh ref={coffeeRef} position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.038, 0.036, 0.045, 20]} />
        <meshStandardMaterial color="#24130c" roughness={0.4} />
      </mesh>

      {/* Traditional Metal Phin Drip Filter */}
      <group position={[0, 0.125, 0]}>
        <mesh position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.054, 0.052, 0.008, 24]} />
          <meshStandardMaterial color="#c5ccd3" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.038, 0.065, 24]} />
          <meshStandardMaterial color="#c5ccd3" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.075, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.006, 24]} />
          <meshStandardMaterial color="#c5ccd3" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.086, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.016, 12]} />
          <meshStandardMaterial color="#a0abb5" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* Falling drop under the phin */}
      <mesh ref={dropRef} position={[0, PHIN_OUTLET_Y, 0]} visible={false}>
        <sphereGeometry args={[0.0045, 8, 8]} />
        <meshStandardMaterial color="#1c0d06" roughness={0.15} />
      </mesh>

      {/* Coffee Spoon */}
      <group position={[0.06, 0.02, 0.02]} rotation={[0, 0.5, 0.3]}>
        <mesh>
          <boxGeometry args={[0.09, 0.004, 0.012]} />
          <meshStandardMaterial color="#dcdcdc" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Animated Rising Steam */}
      <CoffeeSteam position={[0, 0.22, 0]} />
    </group>
  )
}

// ---------------------------------------------------------------- plastic stool
const STOOL_COLORS = { red: '#c8322b', blue: '#2c5fb0', yellow: '#e2a920' }
const STOOL_HEIGHT = 0.26

// Alpha map that cuts the classic arch openings into each side of the stool
const createStoolArchAlpha = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.moveTo(14, 64)
  ctx.lineTo(14, 36)
  ctx.quadraticCurveTo(32, 14, 50, 36)
  ctx.lineTo(50, 64)
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.repeat.set(4, 1)
  return texture
}

let stoolAssetsCache = null
const getStoolAssets = () => {
  if (stoolAssetsCache) return stoolAssetsCache
  const body = new THREE.CylinderGeometry(0.15, 0.185, STOOL_HEIGHT - 0.03, 4, 1, true)
  body.rotateY(Math.PI / 4)
  const alphaMap = createStoolArchAlpha()
  const materials = Object.fromEntries(
    Object.entries(STOOL_COLORS).map(([name, color]) => [
      name,
      {
        body: new THREE.MeshStandardMaterial({
          color,
          roughness: 0.45,
          side: THREE.DoubleSide,
          alphaMap,
          alphaTest: 0.5,
        }),
        seat: new THREE.MeshStandardMaterial({ color, roughness: 0.4 }),
      },
    ])
  )
  stoolAssetsCache = {
    body,
    seat: new THREE.BoxGeometry(0.235, 0.03, 0.235),
    hole: new THREE.CircleGeometry(0.028, 16),
    holeMaterial: new THREE.MeshBasicMaterial({ color: '#111' }),
    materials,
  }
  return stoolAssetsCache
}

// Ghế nhựa thấp vỉa hè Hà Nội
function PlasticStool({ position, rotation = [0, 0, 0], color = 'red' }) {
  const assets = getStoolAssets()
  const material = assets.materials[color]
  return (
    <group position={position} rotation={rotation}>
      <mesh
        geometry={assets.body}
        material={material.body}
        position={[0, (STOOL_HEIGHT - 0.03) / 2, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={assets.seat}
        material={material.seat}
        position={[0, STOOL_HEIGHT - 0.015, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={assets.hole}
        material={assets.holeMaterial}
        position={[0, STOOL_HEIGHT + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  )
}

// ---------------------------------------------------------------- low table
const TABLE_HEIGHT = 0.44

function LowTable({ position, rotation = [0, 0, 0], size = [0.7, 0.5], wood = '#6b4429', children }) {
  const [width, depth] = size
  const legInsetX = width / 2 - 0.06
  const legInsetZ = depth / 2 - 0.06
  const legCorners = [
    [-legInsetX, -legInsetZ],
    [legInsetX, -legInsetZ],
    [-legInsetX, legInsetZ],
    [legInsetX, legInsetZ],
  ]
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, TABLE_HEIGHT - 0.012, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.024, depth]} />
        <meshStandardMaterial color={wood} roughness={0.68} />
      </mesh>
      {[-1, 1].map((i) => (
        <mesh key={i} position={[0, TABLE_HEIGHT + 0.0005, (i * depth) / 6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, 0.004]} />
          <meshBasicMaterial color="#2c1a0f" />
        </mesh>
      ))}
      {legCorners.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, (TABLE_HEIGHT - 0.024) / 2, z]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, TABLE_HEIGHT - 0.024, 8]} />
          <meshStandardMaterial color="#3d3f42" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {[-legInsetX, legInsetX].map((x) => (
        <mesh key={x} position={[x, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, depth - 0.12, 6]} />
          <meshStandardMaterial color="#3d3f42" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <group position={[0, TABLE_HEIGHT, 0]}>{children}</group>
    </group>
  )
}

const ICE_CUBES = [
  [0.008, 0.07, 0.005, 0.3],
  [-0.01, 0.068, -0.006, 1.1],
  [0.002, 0.074, -0.012, 2.0],
]

// Cốc trà đá
function IcedTeaGlass({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.032, 0.027, 0.09, 18, 1, true]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.9}
          roughness={0.08}
          thickness={0.01}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.029, 0.026, 0.065, 18]} />
        <meshStandardMaterial color="#b9782c" roughness={0.15} transparent opacity={0.82} />
      </mesh>
      {ICE_CUBES.map(([x, y, z, r]) => (
        <mesh key={r} position={[x, y, z]} rotation={[r, r * 0.7, 0]}>
          <boxGeometry args={[0.016, 0.016, 0.016]} />
          <meshStandardMaterial color="#e9f3f5" transparent opacity={0.75} roughness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

const SIDEWALK_Y = 0.16

export function CafeTerrace() {
  return (
    <group>
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, 0.08, -31]} receiveShadow>
          <boxGeometry args={[2.2, 0.16, 90]} />
          <meshStandardMaterial color="#4a423b" roughness={0.88} />
        </mesh>
      ))}

      {/* MAIN TABLE — beside the yellow line, the train passes ~0.6m away */}
      <LowTable position={[-1.8, SIDEWALK_Y, 0.05]} rotation={[0, 0.08, 0]} size={[0.72, 0.52]}>
        <VintageRadio position={[-0.1, 0, -0.08]} rotation={[0, 0.6, 0]} />
        <VietnameseCoffeeCup position={[0.2, 0, 0.1]} />
        <IcedTeaGlass position={[0.04, 0, 0.18]} />
        <mesh position={[0.25, 0.008, -0.15]} rotation={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[0.055, 0.016, 0.085]} />
          <meshStandardMaterial color="#8a3020" roughness={0.6} />
        </mesh>
      </LowTable>

      {/* Your stool (camera sits just above it) + companion stools */}
      <PlasticStool position={[-2.2, SIDEWALK_Y, 0.72]} rotation={[0, 0.3, 0]} color="red" />
      <PlasticStool position={[-1.78, SIDEWALK_Y, -0.58]} rotation={[0, -0.15, 0]} color="blue" />
      <PlasticStool position={[-2.42, SIDEWALK_Y, 0.02]} rotation={[0, 1.1, 0]} color="red" />

      {/* Chalkboard menu stand */}
      <group position={[-1.62, SIDEWALK_Y, 1.55]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.38, 0.65, 0.03]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.5, 0.016]}>
          <planeGeometry args={[0.32, 0.55]} />
          <meshStandardMaterial color="#1a1c1a" roughness={0.9} />
        </mesh>
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} position={[x, 0.18, 0.1]} rotation={[-0.2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.4, 6]} />
            <meshStandardMaterial color="#4d3220" />
          </mesh>
        ))}
      </group>

      <group position={[1.7, SIDEWALK_Y, 0.6]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.36, 12]} />
          <meshStandardMaterial color="#8f4328" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.48, 0]} castShadow>
          <dodecahedronGeometry args={[0.26, 1]} />
          <meshStandardMaterial color="#2d6e3e" roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}
