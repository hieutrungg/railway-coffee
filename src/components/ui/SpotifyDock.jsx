import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Radio, X } from 'lucide-react'
import { useAppStore, formatFrequency } from '../../stores/useAppStore'
import { embedHeightFor } from '../../services/spotify'

const IFRAME_API_SRC = 'https://open.spotify.com/embed/iframe-api/v1'
const COLLAPSED_PLAYER_HEIGHT = 80

// The Spotify iFrame API only calls window.onSpotifyIframeApiReady once, so cache the promise.
let iframeApiPromise = null
const loadSpotifyIframeApi = () => {
  if (iframeApiPromise) return iframeApiPromise
  iframeApiPromise = new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api)
    const script = document.createElement('script')
    script.src = IFRAME_API_SRC
    script.async = true
    script.onerror = () => reject(new Error('Spotify iFrame API failed to load'))
    document.body.appendChild(script)
  })
  return iframeApiPromise
}

// Stays mounted for the whole session so music keeps playing when the radio modal closes.
export function SpotifyDock() {
  const currentStation = useAppStore((state) => state.currentStation)
  const isDockExpanded = useAppStore((state) => state.isDockExpanded)
  const setDockExpanded = useAppStore((state) => state.setDockExpanded)
  const setIsRadioPlaying = useAppStore((state) => state.setIsRadioPlaying)
  const selectStation = useAppStore((state) => state.selectStation)
  const isUiHidden = useAppStore((state) => state.isUiHidden)
  const isRadioPlaying = useAppStore((state) => state.isRadioPlaying)

  const hostRef = useRef(null)
  const controllerRef = useRef(null)
  const [apiFailed, setApiFailed] = useState(false)

  const playerHeight = currentStation ? embedHeightFor(currentStation.type) : 0
  const visibleHeight = isDockExpanded ? playerHeight : COLLAPSED_PLAYER_HEIGHT

  useEffect(() => {
    if (!currentStation) {
      controllerRef.current?.destroy?.()
      controllerRef.current = null
      setIsRadioPlaying(false)
      return
    }

    if (controllerRef.current) {
      controllerRef.current.loadUri(currentStation.uri)
      controllerRef.current.play()
      return
    }

    let isCancelled = false
    loadSpotifyIframeApi()
      .then((api) => {
        if (isCancelled || !hostRef.current) return
        const mountPoint = document.createElement('div')
        hostRef.current.replaceChildren(mountPoint)
        api.createController(
          mountPoint,
          { uri: currentStation.uri, width: '100%', height: playerHeight },
          (controller) => {
            controllerRef.current = controller
            controller.addListener('playback_update', (event) => {
              setIsRadioPlaying(!event.data.isPaused && event.data.position >= 0)
            })
            controller.addListener('ready', () => controller.play())
          }
        )
      })
      .catch(() => setApiFailed(true))

    return () => {
      isCancelled = true
    }
    // playerHeight is derived from currentStation; re-running on it would recreate the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStation, setIsRadioPlaying])

  useEffect(() => {
    const iframe = hostRef.current?.querySelector('iframe')
    if (iframe && playerHeight) iframe.style.height = `${playerHeight}px`
  }, [playerHeight])

  const handleClose = () => {
    controllerRef.current?.pause?.()
    selectStation(null)
  }

  return (
    <div
      className={`fixed right-4 sm:right-6 bottom-20 z-40 w-[min(360px,calc(100vw-2rem))] transition-all duration-300 ${
        currentStation && !isUiHidden
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      aria-hidden={!currentStation || isUiHidden}
    >
      <div className="rounded-2xl overflow-hidden glass-panel">
        <div className="flex items-center gap-2 px-3 py-2 text-xs">
          <Radio
            className={`w-3.5 h-3.5 shrink-0 text-[#f0b468] ${isRadioPlaying ? 'animate-pulse' : ''}`}
          />
          <span className="font-mono text-[#f0b468] shrink-0">
            {currentStation ? formatFrequency(currentStation.freq) : ''}
          </span>
          <span className="truncate text-[#f5ebd9] font-medium">{currentStation?.name}</span>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <button
              onClick={() => setDockExpanded(!isDockExpanded)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center cursor-pointer"
              title={isDockExpanded ? 'Thu gọn trình phát' : 'Mở rộng trình phát'}
            >
              {isDockExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center cursor-pointer"
              title="Tắt đài"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          className="relative overflow-hidden transition-[height] duration-300 px-2 pb-2"
          style={{ height: currentStation ? visibleHeight + 8 : 0 }}
        >
          {apiFailed && currentStation ? (
            <iframe
              key={currentStation.uri}
              title="Spotify"
              src={`https://open.spotify.com/embed/${currentStation.uri.split(':')[1]}/${currentStation.uri.split(':')[2]}?utm_source=generator&theme=0`}
              width="100%"
              height={playerHeight}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="rounded-xl border-0"
            />
          ) : (
            <div ref={hostRef} className="rounded-xl overflow-hidden" />
          )}
        </div>
      </div>
    </div>
  )
}
