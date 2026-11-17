import { useEffect } from 'react'
import { Scene } from './components/scene/Scene'
import { OverlayUI } from './components/ui/OverlayUI'
import { audioService } from './services/audioService'

function App() {
  // Initialize and unlock Web Audio API on first user interaction anywhere in the window
  useEffect(() => {
    const handleFirstInteraction = () => {
      audioService.ensureContext()
    }

    window.addEventListener('click', handleFirstInteraction, { once: true })
    window.addEventListener('keydown', handleFirstInteraction, { once: true })
    window.addEventListener('touchstart', handleFirstInteraction, { once: true })

    return () => {
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
      window.removeEventListener('touchstart', handleFirstInteraction)
    }
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0c0908]">
      {/* Main 3D WebGL Canvas Scene */}
      <Scene />

      {/* Atmospheric 2D UI Overlay */}
      <OverlayUI />
    </div>
  )
}

export default App
