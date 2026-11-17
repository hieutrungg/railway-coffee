import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../../stores/useAppStore'

const VIEW_CONFIGS = {
  // Seated on a low plastic stool, eye level ~1.1m, looking up the track past the table
  table: {
    position: [-2.3, 1.18, 1.25],
    target: [-0.55, 0.85, -5.5],
    minDistance: 0.6,
    maxDistance: 8,
  },
  track: {
    position: [2.0, 1.6, 4.2],
    target: [0, 1.1, -5.0],
    minDistance: 1,
    maxDistance: 12,
  },
  balcony: {
    position: [-2.85, 5.2, 0.5],
    target: [0.3, 1.0, -7.0],
    minDistance: 1,
    maxDistance: 15,
  },
}

const TRANSITION_SECONDS = 1.4
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Breathing & train shake are applied as a temporary offset: removed before OrbitControls
// updates (priority -2) and re-added afterwards, so they never accumulate into drift.
export function CameraManager() {
  const controlsRef = useRef()
  const { camera } = useThree()
  const cameraView = useAppStore((state) => state.cameraView)

  const appliedOffset = useRef(new THREE.Vector3())
  const transition = useRef(null)
  const isFirstMount = useRef(true)

  useEffect(() => {
    const config = VIEW_CONFIGS[cameraView] || VIEW_CONFIGS.table
    const controls = controlsRef.current
    if (!controls) return

    if (isFirstMount.current) {
      camera.position.set(...config.position)
      controls.target.set(...config.target)
      controls.update()
      isFirstMount.current = false
      return
    }

    transition.current = {
      elapsed: 0,
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPos: new THREE.Vector3(...config.position),
      toTarget: new THREE.Vector3(...config.target),
    }
  }, [cameraView, camera])

  useFrame(() => {
    camera.position.sub(appliedOffset.current)
    appliedOffset.current.set(0, 0, 0)
  }, -2)

  useFrame((state, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    const move = transition.current
    if (move) {
      move.elapsed += delta
      const t = easeInOutCubic(Math.min(1, move.elapsed / TRANSITION_SECONDS))
      camera.position.lerpVectors(move.fromPos, move.toPos, t)
      controls.target.lerpVectors(move.fromTarget, move.toTarget, t)
      if (t >= 1) transition.current = null
    }

    const time = state.clock.getElapsedTime()
    const shake = useAppStore.getState().cameraShake
    const offset = appliedOffset.current
    offset.set(Math.cos(time * 0.5) * 0.006, Math.sin(time * 0.8) * 0.008, 0)
    if (shake > 0.01) {
      const magnitude = shake * 0.025
      offset.x += (Math.random() - 0.5) * magnitude
      offset.y += (Math.random() - 0.5) * magnitude * 1.4
      offset.z += (Math.random() - 0.5) * magnitude * 0.6
    }
    camera.position.add(offset)
  })

  const config = VIEW_CONFIGS[cameraView] || VIEW_CONFIGS.table

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.45}
      zoomSpeed={0.6}
      enablePan={false}
      minPolarAngle={0.3}
      maxPolarAngle={Math.PI / 1.85}
      minDistance={config.minDistance}
      maxDistance={config.maxDistance}
    />
  )
}
