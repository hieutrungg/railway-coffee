import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html, RoundedBox } from '@react-three/drei'
import { useAppStore } from '../../stores/useAppStore'
import { audioService } from '../../services/audioService'

const WIDTH = 0.3
const HEIGHT = 0.18
const DEPTH = 0.12
const FRONT_Z = DEPTH / 2 + 0.001

const DIAL = { width: 0.11, height: 0.06, center: [0.075, 0.115] }
const FREQ_MIN = 88
const FREQ_MAX = 108

const makeTexture = (width, height, draw) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// Backlit FM scale printed on cream glass
const createDialTexture = () =>
  makeTexture(512, 280, (ctx, w, h) => {
    const glow = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.6)
    glow.addColorStop(0, '#fff2cf')
    glow.addColorStop(1, '#e6b46a')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = '#4a2a14'
    ctx.fillStyle = '#4a2a14'
    ctx.lineWidth = 3
    ctx.strokeRect(10, 10, w - 20, h - 20)

    const left = 40
    const right = w - 40
    for (let f = FREQ_MIN; f <= FREQ_MAX; f += 0.5) {
      const x = left + ((f - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)) * (right - left)
      const isMajor = f % 4 === 0
      const isMid = f % 1 === 0
      ctx.lineWidth = isMajor ? 4 : 2
      ctx.beginPath()
      ctx.moveTo(x, 120)
      ctx.lineTo(x, 120 - (isMajor ? 44 : isMid ? 26 : 14))
      ctx.stroke()
      if (isMajor) {
        ctx.font = 'bold 30px Georgia, serif'
        ctx.textAlign = 'center'
        ctx.fillText(String(f), x, 168)
      }
    }
    ctx.font = 'italic 30px Georgia, serif'
    ctx.textAlign = 'left'
    ctx.fillText('FM', 30, 230)
    ctx.textAlign = 'right'
    ctx.fillText('MHz', w - 30, 230)
    ctx.textAlign = 'center'
    ctx.font = 'bold 26px Georgia, serif'
    ctx.fillText('HÀ NỘI', w / 2, 236)
  })

// Woven speaker cloth
const createGrilleTexture = () =>
  makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c9b38c'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < w; i += 4) {
      ctx.fillStyle = i % 8 === 0 ? 'rgba(90,60,30,0.35)' : 'rgba(255,240,210,0.25)'
      ctx.fillRect(i, 0, 2, h)
      ctx.fillRect(0, i, w, 2)
    }
    const shade = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7)
    shade.addColorStop(0, 'rgba(0,0,0,0)')
    shade.addColorStop(1, 'rgba(40,20,5,0.45)')
    ctx.fillStyle = shade
    ctx.fillRect(0, 0, w, h)
  })

const freqToDialX = (freq) =>
  -DIAL.width / 2 + 0.01 + ((freq - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)) * (DIAL.width - 0.02)

function Knob({ position, radius, knobRef }) {
  return (
    <group ref={knobRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius * 1.08, 0.022, 24]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.0115, 0]}>
        <cylinderGeometry args={[radius * 0.7, radius * 0.7, 0.002, 24]} />
        <meshStandardMaterial color="#d6b25a" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.013, radius * 0.45]}>
        <boxGeometry args={[0.003, 0.002, radius * 0.6]} />
        <meshBasicMaterial color="#2a1a10" />
      </mesh>
    </group>
  )
}

export function VintageRadio({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const [hovered, setHovered] = useState(false)
  const radioRef = useRef()
  const tuneKnobRef = useRef()
  const needleRef = useRef()
  const dialLightRef = useRef()
  const dialMaterialRef = useRef()
  const grilleRef = useRef()

  const setRadioModalOpen = useAppStore((state) => state.setRadioModalOpen)
  const isRadioPlaying = useAppStore((state) => state.isRadioPlaying)
  const currentStation = useAppStore((state) => state.currentStation)

  const dialTexture = useMemo(() => createDialTexture(), [])
  const grilleTexture = useMemo(() => createGrilleTexture(), [])
  const targetScale = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()

    if (radioRef.current) {
      const scale = hovered ? 1.04 : 1
      radioRef.current.scale.lerp(targetScale.setScalar(scale), 1 - Math.exp(-8 * delta))
    }

    // Needle glides to the tuned station; idles slowly when nothing is tuned
    if (needleRef.current) {
      const targetX = currentStation
        ? freqToDialX(currentStation.freq)
        : freqToDialX(98 + Math.sin(time * 0.3) * 6)
      const previousX = needleRef.current.position.x
      needleRef.current.position.x = THREE.MathUtils.damp(previousX, targetX, 3, delta)
      if (tuneKnobRef.current) tuneKnobRef.current.rotation.y += (needleRef.current.position.x - previousX) * 60
    }

    const glow = isRadioPlaying ? 1.1 + Math.sin(time * 2.2) * 0.15 : hovered ? 0.7 : 0.35
    if (dialMaterialRef.current) {
      dialMaterialRef.current.emissiveIntensity = THREE.MathUtils.damp(
        dialMaterialRef.current.emissiveIntensity,
        glow,
        4,
        delta
      )
    }
    if (dialLightRef.current) dialLightRef.current.intensity = glow * 0.25

    // Speaker cloth "breathes" with the music
    if (grilleRef.current) {
      const beat = isRadioPlaying ? Math.max(0, Math.sin(time * 7.5)) ** 4 * 0.004 : 0
      grilleRef.current.position.z = FRONT_Z + 0.001 + beat
    }
  })

  const handleClick = (event) => {
    event.stopPropagation()
    audioService.playRadioDialClick()
    setRadioModalOpen(true)
  }

  return (
    <group
      ref={radioRef}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      {/* brass feet */}
      {[
        [-0.12, -0.04],
        [0.12, -0.04],
        [-0.12, 0.04],
        [0.12, 0.04],
      ].map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.006, z]}>
          <cylinderGeometry args={[0.009, 0.011, 0.012, 12]} />
          <meshStandardMaterial color="#b8923f" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      {/* walnut cabinet */}
      <RoundedBox args={[WIDTH, HEIGHT, DEPTH]} radius={0.018} smoothness={4} position={[0, 0.012 + HEIGHT / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={hovered ? '#6e4326' : '#5a341c'} roughness={0.5} metalness={0.05} />
      </RoundedBox>

      <group position={[0, 0.012, 0]}>
        {/* recessed front panel */}
        <mesh position={[0, HEIGHT / 2, FRONT_Z - 0.0005]}>
          <planeGeometry args={[WIDTH - 0.024, HEIGHT - 0.024]} />
          <meshStandardMaterial color="#3a2010" roughness={0.6} />
        </mesh>

        {/* speaker cloth with brass bars */}
        <mesh ref={grilleRef} position={[-0.062, HEIGHT / 2, FRONT_Z + 0.001]}>
          <planeGeometry args={[0.15, 0.135]} />
          <meshStandardMaterial map={grilleTexture} roughness={0.95} />
        </mesh>
        {[-0.04, 0, 0.04].map((y) => (
          <mesh key={y} position={[-0.062, HEIGHT / 2 + y, FRONT_Z + 0.005]}>
            <boxGeometry args={[0.152, 0.006, 0.004]} />
            <meshStandardMaterial color="#d6b25a" metalness={0.9} roughness={0.25} />
          </mesh>
        ))}

        {/* dial window */}
        <group position={[DIAL.center[0], DIAL.center[1], FRONT_Z + 0.002]}>
          <mesh position={[0, 0, -0.001]}>
            <planeGeometry args={[DIAL.width + 0.012, DIAL.height + 0.012]} />
            <meshStandardMaterial color="#d6b25a" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh>
            <planeGeometry args={[DIAL.width, DIAL.height]} />
            <meshStandardMaterial
              ref={dialMaterialRef}
              map={dialTexture}
              emissiveMap={dialTexture}
              emissive="#ffb04a"
              emissiveIntensity={0.35}
              roughness={0.2}
            />
          </mesh>
          <mesh ref={needleRef} position={[freqToDialX(98), 0.004, 0.002]}>
            <boxGeometry args={[0.0022, DIAL.height * 0.78, 0.001]} />
            <meshBasicMaterial color="#d81e05" toneMapped={false} />
          </mesh>
        </group>

        <Knob knobRef={tuneKnobRef} position={[0.05, 0.045, FRONT_Z + 0.011]} radius={0.019} />
        <Knob position={[0.105, 0.045, FRONT_Z + 0.011]} radius={0.016} />

        {/* power lamp */}
        <mesh position={[0.075, 0.075, FRONT_Z + 0.002]}>
          <circleGeometry args={[0.004, 12]} />
          <meshBasicMaterial color={isRadioPlaying ? '#36ff6a' : '#ff9a1f'} toneMapped={false} />
        </mesh>

        {/* carry handle */}
        <mesh position={[0, HEIGHT + 0.004, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.07, 0.006, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#2b1a0f" roughness={0.55} />
        </mesh>
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} position={[x, HEIGHT + 0.004, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.008, 12]} />
            <meshStandardMaterial color="#d6b25a" metalness={0.9} roughness={0.25} />
          </mesh>
        ))}

        {/* telescopic antenna */}
        <group position={[-0.125, HEIGHT, -0.04]} rotation={[0.15, 0, -0.35]}>
          <mesh position={[0, 0.17, 0]} castShadow>
            <cylinderGeometry args={[0.0028, 0.0045, 0.34, 8]} />
            <meshStandardMaterial color="#d6dbe0" metalness={0.95} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.345, 0]}>
            <sphereGeometry args={[0.006, 10, 10]} />
            <meshStandardMaterial color="#d6dbe0" metalness={0.95} roughness={0.15} />
          </mesh>
        </group>

        <pointLight
          ref={dialLightRef}
          position={[DIAL.center[0], DIAL.center[1], FRONT_Z + 0.06]}
          color="#ffad45"
          intensity={0.1}
          distance={0.7}
          decay={2}
        />
      </group>

      {hovered && (
        <Html position={[0, 0.34, 0]} center distanceFactor={2.2}>
          <div className="pointer-events-none select-none bg-[#1e1511]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#e2a865]/40 text-[#f7eee4] text-[11px] font-medium shadow-lg flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            {currentStation ? `${currentStation.name} — chạm để đổi đài` : 'Chạm để bật đài'}
          </div>
        </Html>
      )}
    </group>
  )
}
