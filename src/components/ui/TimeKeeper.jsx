import { useEffect, useRef } from 'react'
import { useAppStore, getFocusRemaining } from '../../stores/useAppStore'
import { getUpcomingTrains, formatCountdown, TRAIN_LEAD_MS } from '../../services/trainSchedule'
import { audioService } from '../../services/audioService'
import { getStreetMood } from '../../services/streetSounds'
import { getHanoiHour } from '../../services/hanoiTime'

const TICK_MS = 500
// Events older than this (tab asleep, page reopened later) are skipped silently
const STALE_MS = 60 * 1000
const BREAK_TRAIN = { code: 'Tàu giờ nghỉ', route: 'Phin đã cạn — nghỉ tay một chút' }
const BASE_TITLE = document.title

// Always mounted (even with the UI hidden): dispatches timetable trains, runs the Pomodoro clock
// and keeps the audio engine in sync with the saved mixer, the weather and the hour
export function TimeKeeper() {
  const lastDispatchedAt = useRef(Date.now())

  useEffect(() => {
    const applyVolumes = ({ volumes, isMuted }) => audioService.setVolumes({ ...volumes, isMuted })
    applyVolumes(useAppStore.getState())
    return useAppStore.subscribe((state, previous) => {
      if (state.volumes !== previous.volumes || state.isMuted !== previous.isMuted) applyVolumes(state)
    })
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const state = useAppStore.getState()
      state.syncAutoWeather()
      audioService.setStreetMood(getStreetMood(useAppStore.getState().weather, getHanoiHour(now)))
      audioService.setPhinDripping(state.focus.phase === 'focus' && state.focus.pausedRemainingMs == null)

      if (state.isScheduleEnabled) {
        const [nextTrain] = getUpcomingTrains(now, state.trainFrequency, 1, lastDispatchedAt.current)
        if (nextTrain && now >= nextTrain.time - TRAIN_LEAD_MS) {
          lastDispatchedAt.current = nextTrain.time
          if (now - nextTrain.time < STALE_MS) state.triggerTrain(nextTrain)
        }
      } else {
        lastDispatchedAt.current = now
      }

      const { focus } = state
      const isRunning = focus.phase !== 'idle' && focus.pausedRemainingMs == null
      if (isRunning && getFocusRemaining(focus, now) <= 0) {
        const isFresh = now - focus.endsAt < STALE_MS
        const endedPhase = state.completeFocusPhase()
        if (isFresh && endedPhase === 'focus') {
          audioService.playChime()
          state.triggerTrain(BREAK_TRAIN)
        } else if (isFresh && endedPhase === 'break') {
          audioService.playChime([1568, 1318, 1046])
        }
      }

      const latestFocus = useAppStore.getState().focus
      document.title =
        latestFocus.phase === 'idle'
          ? BASE_TITLE
          : `${formatCountdown(getFocusRemaining(latestFocus, now))} · ${
              latestFocus.phase === 'focus' ? 'Tập trung' : 'Nghỉ'
            } — Cà Phê Đường Tàu`
    }

    tick()
    const timer = setInterval(tick, TICK_MS)
    return () => {
      clearInterval(timer)
      document.title = BASE_TITLE
    }
  }, [])

  return null
}
