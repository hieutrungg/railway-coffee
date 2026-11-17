import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, TrainTrack } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'

export function TrainNotification() {
  const isTrainApproaching = useAppStore((state) => state.isTrainApproaching)
  const isTrainPassing = useAppStore((state) => state.isTrainPassing)
  const trainProgress = useAppStore((state) => state.trainProgress)
  const activeTrain = useAppStore((state) => state.activeTrain)

  const isVisible = isTrainApproaching || isTrainPassing

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 250 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[90%] pointer-events-none"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#290a0a]/95 via-[#380f0f]/95 to-[#290a0a]/95 border-2 border-red-500/70 p-4 shadow-2xl shadow-red-950/60 backdrop-blur-md text-white">
            {/* Caution hazard striped background top accent */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 opacity-80"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 10px, #111 10px, #111 20px)',
              }}
            />

            <div className="flex items-center gap-3 mt-1">
              {/* Blinking red signal indicator */}
              <div className="w-10 h-10 rounded-xl bg-red-900/60 border border-red-500 flex items-center justify-center shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold tracking-wider uppercase text-red-300 flex items-center gap-1.5">
                    <TrainTrack className="w-3.5 h-3.5 text-amber-400" />
                    {isTrainPassing ? 'ĐOÀN TÀU ĐANG CHẠY QUA' : 'CẢNH BÁO TÀU HỎA ĐANG ĐẾN'}
                  </h4>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                    {activeTrain?.code ?? 'TÀU D19E'}
                  </span>
                </div>
                {activeTrain?.route && (
                  <p className="text-[11px] font-mono text-amber-200/90 mt-0.5">{activeTrain.route}</p>
                )}
                <p className="text-xs text-stone-200 mt-0.5 leading-snug">
                  {isTrainPassing
                    ? 'Đoàn tàu sắt đang lướt qua sát mép bàn cà phê của bạn!'
                    : 'Tiếng chuông gác chắn và còi tàu đang vang lên. Xin chú ý an toàn!'}
                </p>
              </div>
            </div>

            {/* Progress bar during pass */}
            {isTrainPassing && (
              <div className="w-full bg-red-950/80 rounded-full h-1.5 mt-3 overflow-hidden border border-red-800/40">
                <motion.div
                  className="bg-gradient-to-r from-amber-400 to-red-500 h-full rounded-full"
                  style={{ width: `${Math.round(trainProgress * 100)}%` }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
