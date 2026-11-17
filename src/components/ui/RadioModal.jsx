import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Radio, Disc3, Link as LinkIcon, Plus, Trash2, Heart, Info } from 'lucide-react'
import { useAppStore, PLAYLISTS, formatFrequency } from '../../stores/useAppStore'
import { audioService } from '../../services/audioService'
import { parseSpotifyUrl } from '../../services/spotify'

const DIAL_MIN = 88
const DIAL_MAX = 108
const DIAL_TICKS = [88, 92, 96, 100, 104, 108]

const dialPercent = (freq) => ((freq - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * 100

function FrequencyDial({ stations, currentStation }) {
  return (
    <div className="p-3.5 rounded-2xl bg-[#140e0b] border border-[#d49b55]/30 shadow-inner mb-5">
      <div className="relative h-14 rounded-lg bg-gradient-to-b from-[#3a2a17] to-[#241a10] border border-[#b58348]/25 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,180,90,0.22),transparent_70%)]" />
        {Array.from({ length: 41 }, (_, i) => (
          <span
            key={i}
            className="absolute top-0 w-px bg-[#f3d29b]/60"
            style={{ left: `${(i / 40) * 100}%`, height: i % 4 === 0 ? 14 : 7 }}
          />
        ))}
        {DIAL_TICKS.map((tick) => (
          <span
            key={tick}
            className="absolute top-4 -translate-x-1/2 text-[10px] font-mono text-[#f3d29b]"
            style={{ left: `${Math.min(97, Math.max(3, dialPercent(tick)))}%` }}
          >
            {tick}
          </span>
        ))}
        {stations.map((station) => (
          <span
            key={station.id}
            className={`absolute bottom-1.5 w-1.5 h-1.5 -translate-x-1/2 rounded-full ${
              station.isPersonal ? 'bg-emerald-400' : 'bg-[#f0b468]'
            }`}
            style={{ left: `${dialPercent(station.freq)}%` }}
            title={station.name}
          />
        ))}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_10px_#ff3300]"
          animate={{ left: `${currentStation ? dialPercent(currentStation.freq) : 50}%` }}
          transition={{ type: 'spring', damping: 14, stiffness: 90 }}
        />
      </div>
      <div className="flex justify-between items-center mt-2 px-1 text-xs gap-2">
        <span className="text-[#a89688] shrink-0">Đang dò sóng:</span>
        <span className="font-mono font-bold text-[#f3be7a] tracking-wide truncate">
          {currentStation
            ? `${formatFrequency(currentStation.freq)} — ${currentStation.name}`
            : 'Chưa chọn đài'}
        </span>
      </div>
    </div>
  )
}

function StationButton({ station, isActive, onSelect, onRemove }) {
  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isActive
          ? 'bg-[#3b2a1e] border-[#f0b468] shadow-md shadow-[#f0b468]/10'
          : 'bg-[#241913]/70 border-[#b58348]/20 hover:bg-[#2e2018] hover:border-[#b58348]/50'
      }`}
    >
      <button onClick={() => onSelect(station)} className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isActive ? 'bg-[#d49b55] text-[#140e0b]' : 'bg-[#33231a] text-[#c5a894]'
          }`}
        >
          <Disc3 className={`w-4 h-4 ${isActive ? 'animate-spin' : ''}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-semibold text-[#f0b468] shrink-0">
              {station.freq.toFixed(1)}
            </span>
            <h4 className="text-sm font-semibold truncate text-[#f5ebd9]">{station.name}</h4>
          </div>
          <p className="text-[11px] text-[#a89789] truncate mt-0.5">{station.desc}</p>
        </div>
      </button>
      {onRemove && (
        <button
          onClick={() => onRemove(station.id)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a89789] hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer shrink-0"
          title="Xoá khỏi Đài của tôi"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function AddPersonalStationForm({ onAdd }) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const preview = parseSpotifyUrl(url)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!url.trim()) return
    const station = onAdd(url, name)
    if (!station) {
      setError('Link chưa hợp lệ — hãy dán link playlist, album, bài hát, nghệ sĩ hoặc podcast Spotify.')
      return
    }
    setUrl('')
    setName('')
    setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#f0b468]" />
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
            placeholder="Dán link Spotify của bạn…"
            className="w-full bg-[#241a14] border border-[#b58348]/30 rounded-xl pl-8 pr-3 py-2 text-xs text-[#f5ebd9] placeholder-[#806f63] focus:outline-none focus:border-[#f0b468]"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={preview ? `Tên đài (mặc định: ${preview.label} của tôi)` : 'Tên đài (tuỳ chọn)'}
          maxLength={40}
          className="flex-1 min-w-0 bg-[#241a14] border border-[#b58348]/30 rounded-xl px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#806f63] focus:outline-none focus:border-[#f0b468]"
        />
        <button
          type="submit"
          disabled={!preview}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d49b55] hover:bg-[#e6ab65] disabled:opacity-40 disabled:cursor-not-allowed text-[#1a110a] text-xs font-semibold cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" /> Lưu & phát
        </button>
      </div>
      {preview && !error && (
        <p className="text-[11px] text-emerald-400">Nhận diện: {preview.label} · {preview.id}</p>
      )}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </form>
  )
}

export function RadioModal() {
  const isRadioModalOpen = useAppStore((state) => state.isRadioModalOpen)
  const setRadioModalOpen = useAppStore((state) => state.setRadioModalOpen)
  const currentStation = useAppStore((state) => state.currentStation)
  const selectStation = useAppStore((state) => state.selectStation)
  const personalStations = useAppStore((state) => state.personalStations)
  const addPersonalStation = useAppStore((state) => state.addPersonalStation)
  const removePersonalStation = useAppStore((state) => state.removePersonalStation)

  const tuneIn = (station) => {
    audioService.playRadioDialClick()
    audioService.playRadioStatic(0.25)
    selectStation(station)
  }

  const handleAdd = (url, name) => {
    const station = addPersonalStation(url, name)
    if (station) {
      audioService.playRadioDialClick()
      audioService.playRadioStatic(0.25)
    }
    return station
  }

  const allStations = [...personalStations, ...PLAYLISTS]

  return (
    <AnimatePresence>
      {isRadioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setRadioModalOpen(false)}
          />

          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#1e1713] border-2 border-[#b58348]/40 shadow-2xl shadow-black/80 flex flex-col p-5 sm:p-6 text-[#f5ebd9]"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(200, 140, 70, 0.15), transparent 70%)',
            }}
          >
            <div className="flex items-center justify-between border-b border-[#b58348]/25 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#36261c] border border-[#d49b55]/50 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-[#f0b468]" />
                </div>
                <div>
                  <h3 className="font-serif-vintage text-xl font-bold text-[#fad6a5] tracking-wide">
                    ĐÀI RADIO PHỐ CỔ
                  </h3>
                  <p className="text-xs text-[#b8a698]">Nhạc vẫn phát khi bạn đóng cửa sổ này</p>
                </div>
              </div>
              <button
                onClick={() => setRadioModalOpen(false)}
                className="w-9 h-9 rounded-full bg-[#2c1f17] border border-[#b58348]/30 flex items-center justify-center text-[#c5b5a7] hover:text-white hover:bg-[#422e22] cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <FrequencyDial stations={allStations} currentStation={currentStation} />

            <section className="p-3.5 rounded-2xl bg-[#18110e] border border-emerald-500/20 mb-5">
              <h4 className="text-sm font-semibold text-[#fad6a5] flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-emerald-400" /> Đài của tôi
                <span className="text-[10px] font-normal text-[#a89789]">— link Spotify cá nhân</span>
              </h4>
              {personalStations.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                  {personalStations.map((station) => (
                    <StationButton
                      key={station.id}
                      station={station}
                      isActive={currentStation?.id === station.id}
                      onSelect={tuneIn}
                      onRemove={removePersonalStation}
                    />
                  ))}
                </div>
              )}
              <AddPersonalStationForm onAdd={handleAdd} />
            </section>

            <section className="mb-4">
              <h4 className="text-xs uppercase tracking-wider text-[#a89789] mb-2">Đài có sẵn</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PLAYLISTS.map((station) => (
                  <StationButton
                    key={station.id}
                    station={station}
                    isActive={currentStation?.id === station.id}
                    onSelect={tuneIn}
                  />
                ))}
              </div>
            </section>

            <p className="flex items-start gap-2 text-[11px] text-[#a39082] pt-3 border-t border-[#36271e]">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#d49b55]" />
              <span>
                Đăng nhập Spotify trên trình duyệt này để nghe trọn bài (chưa đăng nhập chỉ nghe thử 30 giây).
                Có thể đặt link mặc định trong file <code className="text-[#f0b468]">.env.local</code>:{' '}
                <code className="text-[#f0b468]">VITE_SPOTIFY_URL=…</code>
              </span>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
