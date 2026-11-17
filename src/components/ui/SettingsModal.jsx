import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Volume2,
  VolumeX,
  Sliders,
  Camera,
  Coffee,
  CloudRain,
  TrainTrack,
  Info,
  Bike,
} from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { audioService } from '../../services/audioService'

export function SettingsModal() {
  const isSettingsOpen = useAppStore((state) => state.isSettingsOpen)
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen)
  const volumes = useAppStore((state) => state.volumes)
  const setVolume = useAppStore((state) => state.setVolume)
  const isMuted = useAppStore((state) => state.isMuted)
  const toggleMute = useAppStore((state) => state.toggleMute)
  const cameraView = useAppStore((state) => state.cameraView)
  const setCameraView = useAppStore((state) => state.setCameraView)
  const showClearanceZone = useAppStore((state) => state.showClearanceZone)
  const toggleClearanceZone = useAppStore((state) => state.toggleClearanceZone)
  const isPostFxEnabled = useAppStore((state) => state.isPostFxEnabled)
  const togglePostFx = useAppStore((state) => state.togglePostFx)

  const handleVolumeChange = (channel, val) => {
    audioService.ensureContext()
    setVolume(channel, parseFloat(val))
  }

  const handleToggleMute = () => {
    audioService.ensureContext()
    toggleMute()
  }

  const CAMERA_VIEWS = [
    { id: 'table', label: 'Bàn cà phê (Mặc định)', desc: 'Góc ngồi thưởng thức cà phê và đài radio' },
    { id: 'track', label: 'Dọc đường tàu', desc: 'Toàn cảnh đường sắt trải dài qua con ngõ' },
    { id: 'balcony', label: 'Ban công trên cao', desc: 'Ngắm nhìn từ ban công tầng 2 phố cổ' },
  ]

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={() => setSettingsOpen(false)}
          />

          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 15 }}
            className="relative w-full max-w-lg rounded-3xl bg-[#1e1713] border border-[#b58348]/40 shadow-2xl shadow-black/80 z-10 p-6 text-[#f5ebd9] max-h-[90vh] overflow-y-auto"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 0%, rgba(200, 140, 70, 0.12), transparent 70%)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#b58348]/25 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#36261c] border border-[#d49b55]/50 flex items-center justify-center shadow-inner">
                  <Sliders className="w-5 h-5 text-[#f0b468]" />
                </div>
                <div>
                  <h3 className="font-serif-vintage text-xl font-bold text-[#fad6a5]">
                    CÀI ĐẶT TRẢI NGHIỆM
                  </h3>
                  <p className="text-xs text-[#b8a698]">Âm thanh môi trường & góc nhìn máy quay</p>
                </div>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-9 h-9 rounded-full bg-[#2c1f17] border border-[#b58348]/30 flex items-center justify-center text-[#c5b5a7] hover:text-white hover:bg-[#422e22] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audio Channels Mixer */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#e6b980] flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-[#f0b468]" />
                  Bộ trộn âm thanh (Audio Mixer)
                </h4>
                <button
                  onClick={handleToggleMute}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-red-900/40 border-red-500/60 text-red-300'
                      : 'bg-[#2b1e16] border-[#b58348]/30 text-[#d8c3b0]'
                  }`}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isMuted ? 'Đang tắt tiếng' : 'Tắt tất cả'}</span>
                </button>
              </div>

              {/* Master Volume */}
              <div className="p-3 rounded-2xl bg-[#140e0b]/80 border border-[#b58348]/20 space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-[#fad6a5]">
                  <span>Âm lượng tổng (Master)</span>
                  <span className="font-mono text-[#f0b468]">{Math.round(volumes.master * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volumes.master}
                  onChange={(e) => handleVolumeChange('master', e.target.value)}
                  className="w-full accent-[#d49b55] cursor-pointer"
                />
              </div>

              {/* Individual Ambient Channels */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Cafe Ambience */}
                <div className="p-3 rounded-xl bg-[#18110e] border border-[#b58348]/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#d8c3b0]">
                    <Coffee className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quán xá</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volumes.ambient}
                    onChange={(e) => handleVolumeChange('ambient', e.target.value)}
                    className="w-full accent-[#d49b55] cursor-pointer"
                  />
                  <div className="text-[10px] text-right font-mono text-[#a89688]">
                    {Math.round(volumes.ambient * 100)}%
                  </div>
                </div>

                {/* Rain Sound */}
                <div className="p-3 rounded-xl bg-[#18110e] border border-[#b58348]/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#d8c3b0]">
                    <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                    <span>Tiếng mưa</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volumes.rain}
                    onChange={(e) => handleVolumeChange('rain', e.target.value)}
                    className="w-full accent-[#d49b55] cursor-pointer"
                  />
                  <div className="text-[10px] text-right font-mono text-[#a89688]">
                    {Math.round(volumes.rain * 100)}%
                  </div>
                </div>

                {/* Train Sound */}
                <div className="p-3 rounded-xl bg-[#18110e] border border-[#b58348]/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#d8c3b0]">
                    <TrainTrack className="w-3.5 h-3.5 text-orange-400" />
                    <span>Tàu hỏa</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volumes.train}
                    onChange={(e) => handleVolumeChange('train', e.target.value)}
                    className="w-full accent-[#d49b55] cursor-pointer"
                  />
                  <div className="text-[10px] text-right font-mono text-[#a89688]">
                    {Math.round(volumes.train * 100)}%
                  </div>
                </div>

                {/* Street Sounds */}
                <div className="p-3 rounded-xl bg-[#18110e] border border-[#b58348]/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#d8c3b0]">
                    <Bike className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tiếng phố</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volumes.street}
                    onChange={(e) => handleVolumeChange('street', e.target.value)}
                    className="w-full accent-[#d49b55] cursor-pointer"
                    aria-label="Âm lượng tiếng phố: xe máy, tiếng rao, côn trùng"
                  />
                  <div className="text-[10px] text-right font-mono text-[#a89688]">
                    {Math.round(volumes.street * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Camera Views */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#e6b980] flex items-center gap-1.5 mb-2.5">
                <Camera className="w-4 h-4 text-[#f0b468]" />
                Chọn góc nhìn máy quay
              </h4>
              <div className="space-y-2">
                {CAMERA_VIEWS.map((view) => {
                  const isActive = cameraView === view.id
                  return (
                    <button
                      key={view.id}
                      onClick={() => {
                        audioService.playRadioDialClick()
                        setCameraView(view.id)
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#3b2a1e] border-[#f0b468] text-white shadow-md'
                          : 'bg-[#18110e] border-[#b58348]/20 text-[#d8c3b0] hover:bg-[#261b14]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#f5ebd9]">{view.label}</div>
                        <div className="text-[11px] text-[#9c897a] mt-0.5">{view.desc}</div>
                      </div>
                      {isActive && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f0b468] shadow-[0_0_8px_#f0b468]" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Post-processing toggle */}
              <div className="mt-3 pt-3 border-t border-[#b58348]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[#f5ebd9]">Hiệu ứng phát sáng (Bloom)</div>
                  <div className="text-[10px] text-[#9c897a]">Đèn lồng, đèn pha tàu toả sáng. Tắt nếu máy chạy chậm</div>
                </div>
                <button
                  onClick={togglePostFx}
                  aria-pressed={isPostFxEnabled}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    isPostFxEnabled
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                      : 'bg-[#2b1e16] border-[#b58348]/30 text-[#d8c3b0]'
                  }`}
                >
                  {isPostFxEnabled ? 'Đang bật' : 'Đang tắt'}
                </button>
              </div>

              {/* Debug Clearance Corridor Toggle */}
              <div className="mt-3 pt-3 border-t border-[#b58348]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[#f5ebd9]">Vùng an toàn đường tàu (Clearance Box)</div>
                  <div className="text-[10px] text-[#9c897a]">Hiện khung thể tích đỏ 2.4m kiểm tra va chạm</div>
                </div>
                <button
                  onClick={toggleClearanceZone}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    showClearanceZone
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                      : 'bg-[#2b1e16] border-[#b58348]/30 text-[#d8c3b0]'
                  }`}
                >
                  {showClearanceZone ? 'Đang bật' : 'Đang tắt'}
                </button>
              </div>
            </div>

            {/* Micro Interaction Hints */}
            <div className="p-3.5 rounded-2xl bg-[#140e0b]/90 border border-[#b58348]/20 text-xs text-[#b09d8e] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-[#f0b468]">
                <Info className="w-4 h-4" />
                Mẹo trải nghiệm:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#baa89b]">
                <li>Giữ chuột trái và kéo nhẹ để xoay góc nhìn tự nhiên.</li>
                <li>Nhấp chuột trực tiếp vào chiếc radio cổ trên bàn để mở đài nhạc Spotify.</li>
                <li>Nhấn phím <kbd className="px-1.5 py-0.5 bg-[#2c2017] rounded border border-[#806040] text-amber-300">H</kbd> hoặc nút con mắt để ẩn giao diện và thưởng thức không gian 3D.</li>
              </ul>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
