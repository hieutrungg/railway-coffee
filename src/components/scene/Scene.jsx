import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CameraManager } from './CameraManager'
import { PostEffects } from './PostEffects'
import { Lighting } from '../environment/Lighting'
import { RailwayTrack } from '../environment/RailwayTrack'
import { HanoiStreet } from '../environment/HanoiStreet'
import { CafeTerrace } from '../environment/CafeTerrace'
import { StreetLife } from '../environment/StreetLife'
import { Train } from '../train/Train'
import { WeatherEffects } from '../environment/WeatherEffects'
import { useAppStore } from '../../stores/useAppStore'
import { audioService } from '../../services/audioService'

const FOG_COLORS = {
  afternoon: '#dfd2c0',
  sunset: '#6a4a52',
  night: '#0c0f17',
  rain: '#58636d',
}

// Hide the loading screen only once the first frame has actually been drawn
function FirstFrameSignal() {
  const setIsLoading = useAppStore((state) => state.setIsLoading)
  const hasSignalled = useRef(false)
  useFrame(() => {
    if (hasSignalled.current) return
    hasSignalled.current = true
    setIsLoading(false)
  })
  return null
}

function SceneContent() {
  const weather = useAppStore((state) => state.weather)

  useEffect(() => {
    audioService.setWeatherMode(weather)
  }, [weather])

  return (
    <>
      <color attach="background" args={[FOG_COLORS[weather] || FOG_COLORS.sunset]} />
      <fogExp2 attach="fog" args={[FOG_COLORS[weather] || FOG_COLORS.sunset, 0.022]} />

      <CameraManager />
      <Lighting />
      <RailwayTrack />
      <HanoiStreet />
      <CafeTerrace />
      <StreetLife />
      <Train />
      <WeatherEffects />
      <PostEffects />
      <FirstFrameSignal />
    </>
  )
}

export function Scene() {
  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <Canvas
        shadows
        dpr={[1, 1.8]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          powerPreference: 'high-performance',
        }}
        camera={{
          fov: 55,
          near: 0.1,
          far: 90,
          position: [-2.15, 1.25, 0.65],
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  )
}
