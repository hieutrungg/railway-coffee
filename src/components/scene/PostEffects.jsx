import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useAppStore } from '../../stores/useAppStore'

// Glow is strongest at night, when lanterns, headlights and train windows dominate the frame
const BLOOM_BY_WEATHER = {
  afternoon: { intensity: 0.35, threshold: 1.1 },
  sunset: { intensity: 0.75, threshold: 0.95 },
  night: { intensity: 1.15, threshold: 0.8 },
  rain: { intensity: 0.7, threshold: 0.9 },
}

// The composer disables renderer tone mapping, so ACES is re-applied as the last effect
export function PostEffects() {
  const weather = useAppStore((state) => state.weather)
  const isEnabled = useAppStore((state) => state.isPostFxEnabled)
  if (!isEnabled) return null

  const bloom = BLOOM_BY_WEATHER[weather] || BLOOM_BY_WEATHER.sunset
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={bloom.intensity}
        luminanceThreshold={bloom.threshold}
        luminanceSmoothing={0.25}
        radius={0.7}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={weather === 'afternoon' ? 0.4 : 0.6} />
    </EffectComposer>
  )
}
