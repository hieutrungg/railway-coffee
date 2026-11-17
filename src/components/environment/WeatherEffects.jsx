import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../stores/useAppStore'

// Gentle Rain Particles
function RainParticles() {
  const rainRef = useRef()
  const count = 750

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18
      pos[i * 3 + 1] = Math.random() * 14 + 1
      pos[i * 3 + 2] = (Math.random() - 0.5) * 35
      spd[i] = 16 + Math.random() * 8
    }
    return [pos, spd]
  }, [count])

  useFrame((_, delta) => {
    if (!rainRef.current) return
    const pos = rainRef.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      let y = pos.getY(i) - speeds[i] * delta
      let x = pos.getX(i) - 1.5 * delta // slight slant
      if (y < 0.05) {
        y = 14
        x = (Math.random() - 0.5) * 18
      }
      pos.setY(i, y)
      pos.setX(i, x)
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        color="#c8d6e5"
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  )
}

// Occasional Birds soaring across the Hanoi sky
function Birds() {
  const birdsGroupRef = useRef()
  const birdPos = useRef({ x: -15, y: 7.5, z: -10, speed: 3.2 })

  useFrame((state, delta) => {
    if (!birdsGroupRef.current) return
    birdPos.current.x += birdPos.current.speed * delta
    birdPos.current.z += birdPos.current.speed * 0.4 * delta

    if (birdPos.current.x > 20) {
      // Loop bird back
      birdPos.current.x = -22
      birdPos.current.z = -20 + (Math.random() - 0.5) * 10
      birdPos.current.y = 7.0 + Math.random() * 2
    }

    birdsGroupRef.current.position.set(
      birdPos.current.x,
      birdPos.current.y + Math.sin(state.clock.getElapsedTime() * 2) * 0.15,
      birdPos.current.z
    )
  })

  return (
    <group ref={birdsGroupRef}>
      {/* Flock of 3 birds */}
      {[
        [0, 0, 0],
        [-0.8, -0.2, -0.6],
        [-0.5, 0.2, 0.7],
      ].map((offset, i) => (
        <group key={i} position={offset} scale={0.14}>
          <mesh rotation={[0, 0, 0.2]}>
            <coneGeometry args={[0.2, 0.8, 4]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          <mesh position={[-0.4, 0.1, 0]} rotation={[0, 0, -0.4]}>
            <boxGeometry args={[0.8, 0.05, 0.2]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          <mesh position={[0.4, 0.1, 0]} rotation={[0, 0, 0.4]}>
            <boxGeometry args={[0.8, 0.05, 0.2]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Evening Fireflies / Warm Dust motes
function DustMotes() {
  const motesRef = useRef()
  const count = 45

  const [positions, offsets] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const offs = []
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8
      pos[i * 3 + 1] = Math.random() * 3 + 0.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 + 0.5
      offs.push({
        baseX: pos[i * 3],
        baseY: pos[i * 3 + 1],
        baseZ: pos[i * 3 + 2],
        speed: 0.5 + Math.random() * 0.8,
        seed: Math.random() * 10,
      })
    }
    return [pos, offs]
  }, [count])

  useFrame((state) => {
    if (!motesRef.current) return
    const pos = motesRef.current.geometry.attributes.position
    const t = state.clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      const o = offsets[i]
      pos.setX(i, o.baseX + Math.sin(t * o.speed + o.seed) * 0.25)
      pos.setY(i, o.baseY + Math.cos(t * o.speed * 0.7 + o.seed) * 0.2)
      pos.setZ(i, o.baseZ + Math.sin(t * o.speed * 0.5 + o.seed) * 0.25)
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={motesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#ffcc66"
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

export function WeatherEffects() {
  const weather = useAppStore((state) => state.weather)

  return (
    <group>
      {weather === 'rain' && <RainParticles />}
      {weather === 'afternoon' && <Birds />}
      {(weather === 'sunset' || weather === 'night') && <DustMotes />}
    </group>
  )
}
