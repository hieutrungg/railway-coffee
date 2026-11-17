import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, TrainFront } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useNow } from '../../hooks/useNow'
import { getUpcomingTrains, formatClock, formatCountdown } from '../../services/trainSchedule'

const FREQUENCY_OPTIONS = [
  { id: 'normal', label: 'Như thật', hint: '15–25 phút/chuyến' },
  { id: 'frequent', label: 'Dày', hint: '4–8 phút/chuyến' },
]

// Station-style departure board: next trains through the street, with countdown
export function TrainBoard() {
  const now = useNow(1000)
  const [isExpanded, setIsExpanded] = useState(false)
  const isScheduleEnabled = useAppStore((state) => state.isScheduleEnabled)
  const setScheduleEnabled = useAppStore((state) => state.setScheduleEnabled)
  const trainFrequency = useAppStore((state) => state.trainFrequency)
  const setTrainFrequency = useAppStore((state) => state.setTrainFrequency)
  const activeTrain = useAppStore((state) => state.activeTrain)

  const upcoming = getUpcomingTrains(now, trainFrequency, 4)
  const [nextTrain, ...laterTrains] = upcoming
  const isSoon = isScheduleEnabled && nextTrain && nextTrain.time - now < 60 * 1000

  return (
    <div className="w-[260px] rounded-2xl bg-[#14100c]/85 backdrop-blur-md border border-[#cda16e]/25 shadow-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded((value) => !value)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer hover:bg-white/5 transition-colors"
        aria-expanded={isExpanded}
      >
        <TrainFront className={`w-4 h-4 shrink-0 ${isSoon || activeTrain ? 'text-red-400 animate-pulse' : 'text-[#f0b468]'}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#a38a78] font-semibold">
            {activeTrain ? 'Đang qua phố' : isScheduleEnabled ? 'Tàu tiếp theo' : 'Lịch tàu (đang tắt)'}
          </p>
          {activeTrain ? (
            <p className="font-mono text-sm text-red-300 truncate">
              {activeTrain.code} <span className="text-[11px] text-stone-300">{activeTrain.route}</span>
            </p>
          ) : nextTrain ? (
            <p className="font-mono text-sm text-[#ffd27a] truncate">
              {nextTrain.code}{' '}
              <span className="text-[11px] text-stone-300">{formatClock(nextTrain.time)}</span>
            </p>
          ) : null}
        </div>
        {!activeTrain && nextTrain && isScheduleEnabled && (
          <span
            className={`font-mono text-sm tabular-nums px-1.5 py-0.5 rounded-md bg-black/40 border ${
              isSoon ? 'text-red-300 border-red-500/40' : 'text-[#ffd27a] border-[#ffd27a]/15'
            }`}
          >
            {formatCountdown(nextTrain.time - now)}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-[#a38a78] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-[#cda16e]/15 space-y-2.5">
              <ul className="font-mono text-[11px] divide-y divide-white/5">
                {(activeTrain ? upcoming : laterTrains).map((train) => (
                  <li key={train.id} className="flex items-center gap-2 py-1">
                    <span className="w-10 text-[#ffd27a]">{train.code}</span>
                    <span className="flex-1 truncate text-stone-300">{train.route}</span>
                    <span className="text-[#c49866] tabular-nums">{formatClock(train.time)}</span>
                  </li>
                ))}
              </ul>

              <label className="flex items-center justify-between text-[11px] text-stone-200 cursor-pointer">
                <span>Tàu tự chạy theo lịch</span>
                <input
                  type="checkbox"
                  checked={isScheduleEnabled}
                  onChange={(event) => setScheduleEnabled(event.target.checked)}
                  className="accent-[#f0b468] w-3.5 h-3.5 cursor-pointer"
                />
              </label>

              <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Mật độ tàu">
                {FREQUENCY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    role="radio"
                    aria-checked={trainFrequency === option.id}
                    onClick={() => setTrainFrequency(option.id)}
                    className={`rounded-lg px-2 py-1.5 text-left border transition-colors cursor-pointer ${
                      trainFrequency === option.id
                        ? 'bg-[#3b271a] border-[#f0b468]/70 text-[#fad6a5]'
                        : 'bg-black/20 border-white/10 text-stone-300 hover:border-[#cda16e]/40'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold">{option.label}</span>
                    <span className="block text-[9px] text-stone-400">{option.hint}</span>
                  </button>
                ))}
              </div>
              <p className="text-[9px] leading-snug text-stone-500">
                Lịch giả lập theo giờ Hà Nội, giống nhau trong cả ngày.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
