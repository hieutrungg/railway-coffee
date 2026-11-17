import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  TrainTrack,
  Sliders,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { WeatherControl } from './WeatherControl'
import { TrainNotification } from './TrainNotification'
import { RadioModal } from './RadioModal'
import { SettingsModal } from './SettingsModal'
import { LoadingScreen } from './LoadingScreen'
import { SpotifyDock } from './SpotifyDock'
import { TimeKeeper } from './TimeKeeper'
import { TrainBoard } from './TrainBoard'
import { PomodoroWidget } from './PomodoroWidget'
import { audioService } from '../../services/audioService'

export function OverlayUI() {
  const isUiHidden = useAppStore((state) => state.isUiHidden)
  const toggleUiHidden = useAppStore((state) => state.toggleUiHidden)
  const triggerTrain = useAppStore((state) => state.triggerTrain)
  const isTrainApproaching = useAppStore((state) => state.isTrainApproaching)
  const isTrainPassing = useAppStore((state) => state.isTrainPassing)
  const setRadioModalOpen = useAppStore((state) => state.setRadioModalOpen)
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen)
  const isRadioPlaying = useAppStore((state) => state.isRadioPlaying)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timeString, setTimeString] = useState('')

  // Hanoi Local Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      // Display in Hanoi Time GMT+7
      setTimeString(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Ho_Chi_Minh',
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key.toLowerCase() === 'h') {
        toggleUiHidden()
      } else if (e.key.toLowerCase() === 't') {
        audioService.ensureContext()
        triggerTrain()
      } else if (e.key.toLowerCase() === 'r') {
        audioService.ensureContext()
        setRadioModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleUiHidden, triggerTrain, setRadioModalOpen])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const handleManualTrain = () => {
    audioService.ensureContext()
    triggerTrain()
  }

  const handleOpenRadio = () => {
    audioService.ensureContext()
    audioService.playRadioDialClick()
    setRadioModalOpen(true)
  }

  const handleOpenSettings = () => {
    audioService.ensureContext()
    audioService.playRadioDialClick()
    setSettingsOpen(true)
  }

  return (
    <>
      <LoadingScreen />
      <TrainNotification />
      <RadioModal />
      <SettingsModal />
      <SpotifyDock />
      <TimeKeeper />

      {/* Floating Hide/Show UI Button (Always accessible) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={toggleUiHidden}
          title={isUiHidden ? 'Hiện giao diện (H)' : 'Ẩn giao diện để ngắm cảnh (H)'}
          className="w-11 h-11 rounded-full bg-[#1c1511]/85 hover:bg-[#332219] border border-[#cda16e]/40 shadow-xl flex items-center justify-center text-[#f7eee4] transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
        >
          {isUiHidden ? <Eye className="w-5 h-5 text-[#f0b468]" /> : <EyeOff className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {!isUiHidden && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6"
          >
            {/* TOP BAR */}
            <header className="flex flex-col sm:flex-row items-start justify-between gap-3 pointer-events-auto">
              <div className="flex flex-col gap-2">
              {/* Brand Logo & Location */}
              <div className="flex items-center gap-3.5 p-2 px-3.5 rounded-2xl bg-[#1a1410]/80 backdrop-blur-md border border-[#cda16e]/25 shadow-xl">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c8853b] to-[#78471b] border border-[#e8b982]/40 flex items-center justify-center shadow-inner">
                  <span className="text-base select-none">☕</span>
                </div>
                <div>
                  <h1 className="font-serif-vintage text-base sm:text-lg font-bold tracking-wide text-[#fad6a5] leading-tight">
                    CÀ PHÊ ĐƯỜNG TÀU
                  </h1>
                  <p className="text-[10px] tracking-wider uppercase text-[#c49866] font-medium flex items-center gap-1.5">
                    <span>Hà Nội Train Street</span>
                    <span className="w-1 h-1 rounded-full bg-[#c49866]" />
                    <span className="flex items-center gap-1 text-[#a38a78] font-mono">
                      <Clock className="w-2.5 h-2.5" /> {timeString}
                    </span>
                  </p>
                </div>
              </div>

              <TrainBoard />
              </div>

              {/* Weather & Ambience Selector */}
              <div className="flex items-center gap-2">
                <WeatherControl />
              </div>
            </header>

            {/* BOTTOM DOCK */}
            <footer className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
              {/* Left Action: Trigger Train Passage */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleManualTrain}
                  disabled={isTrainApproaching || isTrainPassing}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-semibold tracking-wide transition-all shadow-xl cursor-pointer backdrop-blur-md ${
                    isTrainApproaching || isTrainPassing
                      ? 'bg-amber-950/80 border-amber-600/50 text-amber-300 animate-pulse'
                      : 'bg-[#211712]/85 hover:bg-[#38251c] border-[#cda16e]/30 text-[#f5ebd9] hover:border-[#f0b468] hover:scale-102'
                  }`}
                  title="Nhấn phím T để gọi tàu"
                >
                  <TrainTrack className="w-4 h-4 text-[#f0b468]" />
                  <span>
                    {isTrainPassing
                      ? 'Tàu đang chạy qua!'
                      : isTrainApproaching
                      ? 'Tàu đang tới...'
                      : 'Gọi tàu hỏa (T)'}
                  </span>
                </button>
                <PomodoroWidget />
              </div>

              {/* Right Controls Dock */}
              <div className="flex items-center gap-2 mr-14">
                {/* Radio Console Button */}
                <button
                  onClick={handleOpenRadio}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-medium transition-all shadow-xl cursor-pointer backdrop-blur-md ${
                    isRadioPlaying
                      ? 'bg-[#3b271a]/90 border-[#f0b468] text-[#fad6a5] shadow-[#f0b468]/15'
                      : 'bg-[#1e1511]/85 hover:bg-[#302018] border-[#cda16e]/30 text-[#f5ebd9]'
                  }`}
                  title="Mở đài Radio (R)"
                >
                  <Radio className={`w-4 h-4 text-[#f0b468] ${isRadioPlaying ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">Đài Radio (R)</span>
                  {isRadioPlaying && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>

                {/* Settings & Audio Mixer Button */}
                <button
                  onClick={handleOpenSettings}
                  className="p-2.5 rounded-2xl bg-[#1e1511]/85 hover:bg-[#302018] border border-[#cda16e]/30 text-[#f5ebd9] shadow-xl transition-all cursor-pointer backdrop-blur-md"
                  title="Cài đặt âm lượng & góc nhìn"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2.5 rounded-2xl bg-[#1e1511]/85 hover:bg-[#302018] border border-[#cda16e]/30 text-[#f5ebd9] shadow-xl transition-all cursor-pointer backdrop-blur-md"
                  title="Toàn màn hình"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
