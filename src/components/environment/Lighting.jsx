import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../stores/useAppStore'

const WEATHER_PRESETS = {
  afternoon: {
    ambientColor: '#fff3e0',
    ambientIntensity: 1.1,
    dirLightColor: '#ffeedb',
    dirLightIntensity: 1.8,
    dirLightPos: [10, 18, 8],
    fogColor: '#dfd2c0',
    fogDensity: 0.014,
    lanternIntensity: 0.6,
    skyColor: '#b0d6f5',
  },
  sunset: {
    ambientColor: '#c9a2a0',
    ambientIntensity: 0.55,
    dirLightColor: '#ff9a55',
    dirLightIntensity: 1.7,
    dirLightPos: [14, 10, -8],
    fogColor: '#6a4a52',
    fogDensity: 0.018,
    lanternIntensity: 1.3,
    skyColor: '#5c2d36',
  },
  night: {
    ambientColor: '#2b334a',
    ambientIntensity: 0.55,
    dirLightColor: '#6a89b8',
    dirLightIntensity: 0.6,
    dirLightPos: [6, 15, 8],
    fogColor: '#10141f',
    fogDensity: 0.024,
    lanternIntensity: 2.8,
    skyColor: '#0a0d16',
  },
  rain: {
    ambientColor: '#96a5b5',
    ambientIntensity: 0.75,
    dirLightColor: '#8a9bb0',
    dirLightIntensity: 0.95,
    dirLightPos: [5, 14, 5],
    fogColor: '#5c6772',
    fogDensity: 0.032,
    lanternIntensity: 2.0,
    skyColor: '#3c454e',
  },
}

export function Lighting() {
  const weather = useAppStore((state) => state.weather)

  const dirLightRef = useRef()
  const ambientLightRef = useRef()
  const currentPreset = WEATHER_PRESETS[weather] || WEATHER_PRESETS.sunset

  const ambientColor = useRef(new THREE.Color(currentPreset.ambientColor))
  const dirColor = useRef(new THREE.Color(currentPreset.dirLightColor))

  useFrame((state, delta) => {
    const target = WEATHER_PRESETS[weather] || WEATHER_PRESETS.sunset
    // Frame-rate independent and always <= 1: a long frame (hidden tab, hitch) must not make the lerp overshoot and blow up
    const speed = 1 - Math.exp(-2.5 * Math.min(delta, 1))

    // Interpolate ambient
    ambientColor.current.lerp(new THREE.Color(target.ambientColor), speed)
    if (ambientLightRef.current) {
      ambientLightRef.current.color.copy(ambientColor.current)
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(
        ambientLightRef.current.intensity,
        target.ambientIntensity,
        speed
      )
    }

    // Interpolate directional sun/moon
    dirColor.current.lerp(new THREE.Color(target.dirLightColor), speed)
    if (dirLightRef.current) {
      dirLightRef.current.color.copy(dirColor.current)
      dirLightRef.current.intensity = THREE.MathUtils.lerp(
        dirLightRef.current.intensity,
        target.dirLightIntensity,
        speed
      )
      dirLightRef.current.position.lerp(new THREE.Vector3(...target.dirLightPos), speed)
    }

    // Update scene fog
    if (state.scene.fog) {
      state.scene.fog.color.lerp(new THREE.Color(target.fogColor), speed)
      state.scene.fog.density = THREE.MathUtils.lerp(
        state.scene.fog.density,
        target.fogDensity,
        speed
      )
    }
  })

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={currentPreset.ambientIntensity} />
      <hemisphereLight args={['#9fb3d6', '#3a2a20', 0.45]} />
      <directionalLight
        ref={dirLightRef}
        position={currentPreset.dirLightPos}
        intensity={currentPreset.dirLightIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0005}
      />

      {/* Warm accent light directly illuminating the main Customer Table & Vintage Radio */}
      <pointLight
        position={[-1.95, 2.1, 0.2]}
        color="#ffcc77"
        intensity={currentPreset.lanternIntensity * 1.4}
        distance={4.5}
        decay={2}
      />

      {/* Main Café Interior Warm Glow */}
      <pointLight
        position={[-3.6, 1.8, 1.0]}
        color="#ff9933"
        intensity={currentPreset.lanternIntensity * 1.5}
        distance={5.5}
        decay={2}
      />

      {/* Street Silk Lanterns Glow */}
      <pointLight
        position={[0, 4.5, 0]}
        color="#ff8833"
        intensity={currentPreset.lanternIntensity * 1.2}
        distance={9}
        decay={2}
      />

      {/* Opposite Storefronts Glow */}
      <pointLight
        position={[2.4, 2.2, -2.5]}
        color="#ffa84d"
        intensity={currentPreset.lanternIntensity * 1.1}
        distance={6}
        decay={2}
      />
    </>
  )
}
