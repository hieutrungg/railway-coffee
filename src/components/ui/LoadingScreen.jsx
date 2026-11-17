import { motion } from 'framer-motion'
import { Coffee, Sparkles } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'

export function LoadingScreen() {
  const isLoading = useAppStore((state) => state.isLoading)

  if (!isLoading) return null

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#100d0b] text-[#f7eee4]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 50%, rgba(180, 115, 55, 0.18), #0c0908 75%)',
      }}
    >
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center">
        {/* Animated Coffee Phin Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-[#261b14] border-2 border-[#d49b55]/50 flex items-center justify-center shadow-2xl shadow-amber-900/40">
            <Coffee className="w-10 h-10 text-[#f0b468] animate-bounce" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        {/* Vintage Title */}
        <h1 className="font-serif-vintage text-2xl font-bold tracking-wider text-[#fad6a5] mb-2">
          CÀ PHÊ ĐƯỜNG TÀU
        </h1>
        <p className="font-sans text-xs uppercase tracking-widest text-[#cf9b5b] font-medium mb-6">
          Hà Nội Train Street Experience
        </p>

        {/* Loading Progress Bar */}
        <div className="w-56 h-1.5 rounded-full bg-[#241a14] border border-[#b58348]/20 overflow-hidden mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-[#d49b55] to-[#f5c27f]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />
        </div>

        <p className="text-[11px] text-[#9c897a] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Đang pha một ly cà phê phin và khởi tạo phố cổ...
        </p>
      </div>
    </motion.div>
  )
}
