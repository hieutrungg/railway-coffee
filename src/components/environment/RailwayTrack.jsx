import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../stores/useAppStore'
import { getPaverTexture } from './streetTextures'

const TRACK_CENTER_Z = -21
const PAVED_WIDTH = 2.48

// HDR red so the blinking crossing lamps bloom
const LAMP_ON = new THREE.Color('#ff1100').multiplyScalar(4)
const LAMP_DIM = new THREE.Color('#330000')

const railGauge = 1.05 // Meter-gauge width (Vietnam standard)
const railLength = 110

export function RailwayTrack() {
  const isTrainApproaching = useAppStore((state) => state.isTrainApproaching)
  const isTrainPassing = useAppStore((state) => state.isTrainPassing)
  const showClearanceZone = useAppStore((state) => state.showClearanceZone)
  const warningLampRef1 = useRef()
  const warningLampRef2 = useRef()

  // Stone slabs paved level with the sleepers, as on the real train street
  const paverTexture = useMemo(() => {
    const texture = getPaverTexture().clone()
    texture.repeat.set(1, railLength / 4)
    texture.needsUpdate = true
    return texture
  }, [])

  // Warning light blinking during train approach/pass
  useFrame((state) => {
    const isWarningActive = isTrainApproaching || isTrainPassing
    if (warningLampRef1.current && warningLampRef2.current) {
      if (isWarningActive) {
        const blink = Math.sin(state.clock.getElapsedTime() * 12) > 0
        warningLampRef1.current.color.set(blink ? LAMP_ON : LAMP_DIM)
        warningLampRef2.current.color.set(!blink ? LAMP_ON : LAMP_DIM)
      } else {
        warningLampRef1.current.color.set('#220000')
        warningLampRef2.current.color.set('#220000')
      }
    }
  })


  return (
    <group position={[0, 0, 0]}>
      {/* Street Stone Asphalt Ground */}
      <mesh position={[0, -0.06, TRACK_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, railLength]} />
        <meshStandardMaterial color="#2d2824" roughness={0.92} metalness={0.08} />
      </mesh>

      {/* Stone slab bed between the curbs */}
      <mesh position={[0, 0.085, TRACK_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PAVED_WIDTH, railLength]} />
        <meshStandardMaterial map={paverTexture} roughness={0.9} />
      </mesh>

      {/* Left Steel Rail */}
      <mesh position={[-railGauge / 2, 0.13, TRACK_CENTER_Z]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.1, railLength]} />
        <meshStandardMaterial color="#8e969d" roughness={0.22} metalness={0.9} />
      </mesh>

      {/* Right Steel Rail */}
      <mesh position={[railGauge / 2, 0.13, TRACK_CENTER_Z]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.1, railLength]} />
        <meshStandardMaterial color="#8e969d" roughness={0.22} metalness={0.9} />
      </mesh>

      {/* Rail Steel Base Tie Plates */}
      <mesh position={[-railGauge / 2, 0.08, TRACK_CENTER_Z]}>
        <boxGeometry args={[0.13, 0.02, railLength]} />
        <meshStandardMaterial color="#4a4c4e" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[railGauge / 2, 0.08, TRACK_CENTER_Z]}>
        <boxGeometry args={[0.13, 0.02, railLength]} />
        <meshStandardMaterial color="#4a4c4e" roughness={0.5} metalness={0.7} />
      </mesh>

      {/* LEFT SIDE CURB & YELLOW SAFETY LINE (Border with Left Cafe) */}
      <mesh position={[-1.3, 0.08, TRACK_CENTER_Z]} receiveShadow>
        <boxGeometry args={[0.12, 0.16, railLength]} />
        <meshStandardMaterial color="#554d46" roughness={0.85} />
      </mesh>
      <mesh position={[-1.34, 0.161, TRACK_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.09, railLength]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.6} />
      </mesh>

      {/* RIGHT SIDE CURB & YELLOW SAFETY LINE (Border with Right Cafes) */}
      <mesh position={[1.3, 0.08, TRACK_CENTER_Z]} receiveShadow>
        <boxGeometry args={[0.12, 0.16, railLength]} />
        <meshStandardMaterial color="#554d46" roughness={0.85} />
      </mesh>
      <mesh position={[1.34, 0.161, TRACK_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.09, railLength]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.6} />
      </mesh>

      {/* Hanoi Railway Crossing Signal Pole (Safely on left sidewalk at X = -1.65) */}
      <group position={[-1.65, 0.16, -5.2]}>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 2.8, 12]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.052, 0.055, 1.0, 12]} />
          <meshStandardMaterial color="#cc2b1d" metalness={0.2} roughness={0.6} />
        </mesh>

        {/* Crossbuck sign "CHÚ Ý TÀU HỎA" */}
        <group position={[0, 2.3, 0.06]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.8, 0.14, 0.02]} />
            <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.8, 0.14, 0.02]} />
            <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.42, 0.22, 0.14]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[-0.14, 0.25, 0.08]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshBasicMaterial ref={warningLampRef1} color="#220000" />
          </mesh>
          <mesh position={[0.14, 0.25, 0.08]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshBasicMaterial ref={warningLampRef2} color="#220000" />
          </mesh>
        </group>
      </group>

      {/* DEBUG: Transparent Train Clearance Corridor Visualization */}
      {showClearanceZone && (
        <group position={[0, 1.55, TRACK_CENTER_Z]}>
          {/* Clearance box (2.4m wide x 3.1m high x 70m long) */}
          <mesh>
            <boxGeometry args={[2.4, 3.1, 70]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.22} wireframe={false} />
          </mesh>
          {/* Wireframe boundary */}
          <mesh>
            <boxGeometry args={[2.4, 3.1, 70]} />
            <meshBasicMaterial color="#f59e0b" wireframe />
          </mesh>
        </group>
      )}
    </group>
  )
}
