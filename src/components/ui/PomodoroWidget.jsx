import { Pause, Play, RotateCcw, Coffee } from 'lucide-react'
import {
  useAppStore,
  getFocusRemaining,
  getFocusProgress,
  FOCUS_MS,
} from '../../stores/useAppStore'
import { useNow } from '../../hooks/useNow'
import { formatCountdown } from '../../services/trainSchedule'
import { audioService } from '../../services/audioService'

// Little glass that fills as the phin drips
function PhinGlyph({ level, isDripping }) {
  const fillHeight = 14 * level
  return (
    <svg viewBox="0 0 24 32" className="w-6 h-8 shrink-0" aria-hidden="true">
      <rect x="5" y="1" width="14" height="8" rx="1.5" fill="#c5ccd3" />
      <rect x="3" y="8.5" width="18" height="2" rx="1" fill="#a0abb5" />
      {isDripping && <circle cx="12" cy="13.5" r="1.1" fill="#3a1d10" className="animate-bounce" />}
      <path d="M5 12 L19 12 L18 30 L6 30 Z" fill="rgba(255,255,255,0.12)" stroke="#e8d9c4" strokeWidth="0.8" />
      <rect x="6.3" y={30 - fillHeight} width="11.4" height={fillHeight} fill="#2a150c" />
      <rect x="6.3" y="27" width="11.4" height="3" fill="#f3e3b8" />
    </svg>
  )
}

const todayLabel = () => new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

// Pomodoro "1 phin = 25 phút": focus while the coffee drips; the break starts with a passing train
export function PomodoroWidget() {
  const now = useNow(1000)
  const focus = useAppStore((state) => state.focus)
  const phinsToday = useAppStore((state) => state.phinsToday)
  const startFocus = useAppStore((state) => state.startFocus)
  const togglePauseFocus = useAppStore((state) => state.togglePauseFocus)
  const resetFocus = useAppStore((state) => state.resetFocus)

  const phinCount = phinsToday.day === todayLabel() ? phinsToday.count : 0
  const isPaused = focus.pausedRemainingMs != null
  const remaining = getFocusRemaining(focus, now)
  const progress = getFocusProgress(focus, now)

  const handleStart = () => {
    audioService.ensureContext()
    audioService.playRadioDialClick()
    startFocus()
  }

  if (focus.phase === 'idle') {
    return (
      <button
        onClick={handleStart}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#211712]/85 hover:bg-[#38251c] border border-[#cda16e]/30 hover:border-[#f0b468] text-[#f5ebd9] shadow-xl backdrop-blur-md transition-all cursor-pointer"
        title="Pomodoro: tập trung 25 phút trong lúc phin nhỏ giọt"
      >
        <PhinGlyph level={1} isDripping={false} />
        <span className="text-left">
          <span className="block text-xs font-semibold">Pha phin mới · {formatCountdown(FOCUS_MS)}</span>
          <span className="block text-[10px] text-[#a38a78]">
            {phinCount > 0 ? `Hôm nay: ${phinCount} phin` : 'Tập trung đến khi phin cạn'}
          </span>
        </span>
      </button>
    )
  }

  const isFocus = focus.phase === 'focus'
  return (
    <div
      className={`flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-2xl border shadow-xl backdrop-blur-md ${
        isFocus ? 'bg-[#211712]/90 border-[#f0b468]/60' : 'bg-[#10201a]/90 border-emerald-400/50'
      }`}
    >
      {isFocus ? (
        <PhinGlyph level={0.12 + progress * 0.88} isDripping={!isPaused} />
      ) : (
        <Coffee className="w-6 h-6 text-emerald-300 shrink-0" />
      )}
      <div className="min-w-[92px]">
        <p className={`text-[9px] uppercase tracking-[0.16em] font-semibold ${isFocus ? 'text-[#c49866]' : 'text-emerald-300/80'}`}>
          {isFocus ? (isPaused ? 'Tạm dừng' : `Phin #${phinCount + 1} đang nhỏ giọt`) : 'Giờ nghỉ'}
        </p>
        <p className={`font-mono text-lg leading-tight tabular-nums ${isFocus ? 'text-[#ffd27a]' : 'text-emerald-200'}`}>
          {formatCountdown(remaining)}
        </p>
        <div className="h-1 mt-1 rounded-full bg-black/40 overflow-hidden">
          <div
            className={`h-full rounded-full ${isFocus ? 'bg-[#c8853b]' : 'bg-emerald-400'}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={togglePauseFocus}
          className="p-1.5 rounded-lg hover:bg-white/10 text-stone-200 cursor-pointer"
          title={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
          aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={resetFocus}
          className="p-1.5 rounded-lg hover:bg-white/10 text-stone-400 cursor-pointer"
          title={isFocus ? 'Đổ phin, làm lại' : 'Bỏ qua giờ nghỉ'}
          aria-label={isFocus ? 'Huỷ phiên tập trung' : 'Bỏ qua giờ nghỉ'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
