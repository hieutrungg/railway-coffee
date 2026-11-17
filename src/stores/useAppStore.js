import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseSpotifyUrl, DEFAULT_PERSONAL_URL } from '../services/spotify'
import { getAutoWeather } from '../services/hanoiTime'

export const PLAYLISTS = [
  {
    id: 'hanoi-lofi',
    name: 'Hà Nội Chiều Mưa',
    desc: 'Lofi & indie thư giãn',
    uri: 'spotify:playlist:37i9dQZF1DWWQRwui0ExPn',
    type: 'playlist',
    freq: 96.5,
  },
  {
    id: 'acoustic-viet',
    name: 'Quán Nhỏ Phố Cổ',
    desc: 'Acoustic mộc mạc, hoài niệm',
    uri: 'spotify:playlist:37i9dQZF1DX4E3UdUs7fUx',
    type: 'playlist',
    freq: 101.2,
  },
  {
    id: 'rain-coffee',
    name: 'Cà Phê Trầm Lắng',
    desc: 'Deep focus — đọc sách, làm việc',
    uri: 'spotify:playlist:37i9dQZF1DWZeKCadgRdKQ',
    type: 'playlist',
    freq: 104.8,
  },
  {
    id: 'jazz-night',
    name: 'Tàu Đêm Năm Cũ',
    desc: 'Jazz & nhạc xưa dưới đèn vàng',
    uri: 'spotify:playlist:37i9dQZF1DXbITWG1ZJKYt',
    type: 'playlist',
    freq: 88.5,
  },
]

export const formatFrequency = (freq) => `${freq.toFixed(1)} FM`

const PERSONAL_FREQ_SLOTS = [90.3, 92.7, 94.1, 98.9, 99.9, 103.3, 106.1, 107.5]

const nextPersonalFrequency = (personalStations) => {
  const used = new Set(personalStations.map((station) => station.freq))
  return PERSONAL_FREQ_SLOTS.find((freq) => !used.has(freq)) ?? 99.9
}

const createPersonalStation = (url, name, personalStations) => {
  const parsed = parseSpotifyUrl(url)
  if (!parsed) return null
  return {
    id: `me-${parsed.type}-${parsed.id}`,
    name: name?.trim() || `${parsed.label} của tôi`,
    desc: `${parsed.label} cá nhân`,
    uri: `spotify:${parsed.type}:${parsed.id}`,
    type: parsed.type,
    freq: nextPersonalFrequency(personalStations),
    isPersonal: true,
  }
}

// ---------------------------------------------------------------- Pomodoro "1 phin"
export const FOCUS_MS = 25 * 60 * 1000
export const SHORT_BREAK_MS = 5 * 60 * 1000
export const LONG_BREAK_MS = 15 * 60 * 1000
export const PHINS_PER_LONG_BREAK = 4

const IDLE_FOCUS = { phase: 'idle', endsAt: null, durationMs: FOCUS_MS, pausedRemainingMs: null }

export const getFocusRemaining = (focus, now = Date.now()) => {
  if (focus.phase === 'idle') return focus.durationMs
  if (focus.pausedRemainingMs != null) return focus.pausedRemainingMs
  return Math.max(0, focus.endsAt - now)
}

// 0 → 1 over the current phase
export const getFocusProgress = (focus, now = Date.now()) =>
  focus.phase === 'idle' ? 0 : 1 - getFocusRemaining(focus, now) / focus.durationMs

const MANUAL_TRAIN = { code: 'Tàu khách', route: 'Gọi tàu thủ công' }

const seedPersonalStations = () => {
  const seeded = createPersonalStation(DEFAULT_PERSONAL_URL, 'Playlist của tôi', [])
  return seeded ? [seeded] : []
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Weather / Atmosphere: 'afternoon' | 'sunset' | 'night' | 'rain'
      // 'auto' follows the real time in Hanoi; picking a mode by hand switches to 'manual'
      weatherMode: 'auto',
      weather: getAutoWeather(),
      setWeather: (weather) => set({ weather, weatherMode: 'manual' }),
      enableAutoWeather: () => set({ weatherMode: 'auto', weather: getAutoWeather() }),
      syncAutoWeather: () => {
        const { weatherMode, weather } = get()
        const next = getAutoWeather()
        if (weatherMode === 'auto' && next !== weather) set({ weather: next })
      },

      // Bloom + vignette post-processing (off on weak machines)
      isPostFxEnabled: true,
      togglePostFx: () => set((state) => ({ isPostFxEnabled: !state.isPostFxEnabled })),

      // Camera views: 'table' (seated) | 'track' | 'balcony'
      cameraView: 'table',
      setCameraView: (cameraView) => set({ cameraView }),

      // Debug clearance corridor visualization
      showClearanceZone: false,
      toggleClearanceZone: () => set((s) => ({ showClearanceZone: !s.showClearanceZone })),

      // Train status
      isTrainApproaching: false,
      isTrainPassing: false,
      trainProgress: 0,
      cameraShake: 0,
      trainWarningTime: 0,
      activeTrain: null,

      // Timetable: trains pass on schedule (Hanoi time)
      isScheduleEnabled: true,
      setScheduleEnabled: (isScheduleEnabled) => set({ isScheduleEnabled }),
      trainFrequency: 'normal', // 'normal' | 'frequent'
      setTrainFrequency: (trainFrequency) => set({ trainFrequency }),

      triggerTrain: (train = MANUAL_TRAIN) => {
        const { isTrainApproaching, isTrainPassing } = get()
        if (isTrainApproaching || isTrainPassing) return false
        set({ isTrainApproaching: true, trainWarningTime: Date.now(), activeTrain: train })
        setTimeout(() => set({ isTrainPassing: true }), 4000)
        return true
      },

      updateTrainProgress: (progress, shakeIntensity) =>
        set({ trainProgress: progress, cameraShake: shakeIntensity }),

      finishTrainPass: () =>
        set({
          isTrainApproaching: false,
          isTrainPassing: false,
          trainProgress: 0,
          cameraShake: 0,
          activeTrain: null,
        }),

      // Pomodoro — one phin of coffee = one 25-minute focus session
      focus: IDLE_FOCUS,
      phinsToday: { day: '', count: 0 },

      startFocus: () =>
        set({
          focus: { phase: 'focus', endsAt: Date.now() + FOCUS_MS, durationMs: FOCUS_MS, pausedRemainingMs: null },
        }),

      togglePauseFocus: () =>
        set(({ focus }) => {
          if (focus.phase === 'idle') return {}
          if (focus.pausedRemainingMs != null) {
            return { focus: { ...focus, endsAt: Date.now() + focus.pausedRemainingMs, pausedRemainingMs: null } }
          }
          return { focus: { ...focus, pausedRemainingMs: getFocusRemaining(focus) } }
        }),

      resetFocus: () => set({ focus: IDLE_FOCUS }),

      // Called by the ticker when a phase runs out; returns the phase that just ended
      completeFocusPhase: () => {
        const { focus, phinsToday } = get()
        if (focus.phase === 'focus') {
          const today = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
          const count = (phinsToday.day === today ? phinsToday.count : 0) + 1
          const breakMs = count % PHINS_PER_LONG_BREAK === 0 ? LONG_BREAK_MS : SHORT_BREAK_MS
          set({
            phinsToday: { day: today, count },
            focus: { phase: 'break', endsAt: Date.now() + breakMs, durationMs: breakMs, pausedRemainingMs: null },
          })
          return 'focus'
        }
        if (focus.phase === 'break') {
          set({ focus: IDLE_FOCUS })
          return 'break'
        }
        return null
      },

      // Radio & Music (Spotify)
      isRadioModalOpen: false,
      setRadioModalOpen: (isOpen) => set({ isRadioModalOpen: isOpen }),
      personalStations: seedPersonalStations(),
      currentStation: null,
      isRadioPlaying: false,
      setIsRadioPlaying: (playing) => set({ isRadioPlaying: playing }),
      isDockExpanded: false,
      setDockExpanded: (isExpanded) => set({ isDockExpanded: isExpanded }),

      selectStation: (station) => set({ currentStation: station, isDockExpanded: true }),

      addPersonalStation: (url, name) => {
        const { personalStations } = get()
        const station = createPersonalStation(url, name, personalStations)
        if (!station) return null
        const existing = personalStations.find((item) => item.id === station.id)
        if (existing) {
          set({ currentStation: existing, isDockExpanded: true })
          return existing
        }
        set({
          personalStations: [...personalStations, station],
          currentStation: station,
          isDockExpanded: true,
        })
        return station
      },

      removePersonalStation: (stationId) =>
        set((state) => ({
          personalStations: state.personalStations.filter((station) => station.id !== stationId),
          currentStation: state.currentStation?.id === stationId ? null : state.currentStation,
        })),

      // Audio volumes
      volumes: { master: 0.8, ambient: 0.6, rain: 0.7, train: 0.9, street: 0.7, radioFx: 0.5 },
      isMuted: false,
      setVolume: (channel, val) =>
        set((state) => ({
          volumes: { ...state.volumes, [channel]: Math.max(0, Math.min(1, val)) },
        })),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      // UI state
      isUiHidden: false,
      toggleUiHidden: () => set((state) => ({ isUiHidden: !state.isUiHidden })),
      isSettingsOpen: false,
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

      // Loading
      isLoading: true,
      setIsLoading: (val) => set({ isLoading: val }),
    }),
    {
      name: 'railway-cafe',
      version: 2,
      // Keep new volume channels when restoring an older saved mixer
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        volumes: { ...current.volumes, ...persisted?.volumes },
      }),
      partialize: (state) => ({
        personalStations: state.personalStations,
        currentStation: state.currentStation,
        volumes: state.volumes,
        weather: state.weather,
        weatherMode: state.weatherMode,
        isPostFxEnabled: state.isPostFxEnabled,
        isScheduleEnabled: state.isScheduleEnabled,
        trainFrequency: state.trainFrequency,
        focus: state.focus,
        phinsToday: state.phinsToday,
      }),
    }
  )
)
