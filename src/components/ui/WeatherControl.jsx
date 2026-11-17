import { Sun, Sunset, Moon, CloudRain, Clock3 } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { audioService } from '../../services/audioService'

const MODES = [
  { id: 'afternoon', label: 'Nắng chiều', icon: Sun },
  { id: 'sunset', label: 'Hoàng hôn', icon: Sunset },
  { id: 'night', label: 'Đêm ấm', icon: Moon },
  { id: 'rain', label: 'Mưa phùn', icon: CloudRain },
]

export function WeatherControl() {
  const weather = useAppStore((state) => state.weather)
  const setWeather = useAppStore((state) => state.setWeather)
  const weatherMode = useAppStore((state) => state.weatherMode)
  const enableAutoWeather = useAppStore((state) => state.enableAutoWeather)
  const isAuto = weatherMode === 'auto'

  const handleSelect = (modeId) => {
    audioService.ensureContext()
    audioService.playRadioDialClick()
    setWeather(modeId)
  }

  const handleAuto = () => {
    audioService.ensureContext()
    audioService.playRadioDialClick()
    enableAutoWeather()
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-[#1c1511]/80 backdrop-blur-md border border-[#cda16e]/25 shadow-lg">
      <button
        onClick={handleAuto}
        title="Tự động theo giờ Hà Nội"
        aria-pressed={isAuto}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
          isAuto
            ? 'bg-[#3b2a1e] text-[#fad6a5] ring-1 ring-[#f0b468]/70 font-semibold'
            : 'text-[#d8c3b0] hover:text-[#fff] hover:bg-[#2e2118]'
        }`}
      >
        <Clock3 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Giờ HN</span>
      </button>
      <span className="w-px h-4 bg-[#cda16e]/25" aria-hidden="true" />
      {MODES.map((mode) => {
        const Icon = mode.icon
        const isActive = weather === mode.id
        return (
          <button
            key={mode.id}
            onClick={() => handleSelect(mode.id)}
            title={isAuto && isActive ? `${mode.label} (tự động theo giờ Hà Nội)` : mode.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-[#d49b55] text-[#140e0b] shadow-md shadow-[#d49b55]/20 font-semibold'
                : 'text-[#d8c3b0] hover:text-[#fff] hover:bg-[#2e2118]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
