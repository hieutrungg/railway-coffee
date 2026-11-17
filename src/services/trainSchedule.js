// Simulated timetable for the train street, in Hanoi time (UTC+7, no DST).
// Deterministic per day: reloading the page shows the same trains.

const HANOI_OFFSET_MS = 7 * 3600 * 1000
const DAY_MS = 24 * 3600 * 1000
const MINUTE_MS = 60 * 1000

export const hanoiDayStart = (now) =>
  Math.floor((now + HANOI_OFFSET_MS) / DAY_MS) * DAY_MS - HANOI_OFFSET_MS

const hanoiHour = (time) => ((time + HANOI_OFFSET_MS) % DAY_MS) / 3600000

const SOUTHBOUND = [
  { code: 'SE1', route: 'Hà Nội → Sài Gòn' },
  { code: 'SE3', route: 'Hà Nội → Sài Gòn' },
  { code: 'SE5', route: 'Hà Nội → Đà Nẵng' },
  { code: 'SE7', route: 'Hà Nội → Sài Gòn' },
  { code: 'SE19', route: 'Hà Nội → Đà Nẵng' },
  { code: 'NA1', route: 'Hà Nội → Vinh' },
  { code: 'SP1', route: 'Hà Nội → Lào Cai' },
]
const NORTHBOUND = [
  { code: 'SE2', route: 'Sài Gòn → Hà Nội' },
  { code: 'SE4', route: 'Sài Gòn → Hà Nội' },
  { code: 'SE6', route: 'Đà Nẵng → Hà Nội' },
  { code: 'SE8', route: 'Sài Gòn → Hà Nội' },
  { code: 'SE20', route: 'Đà Nẵng → Hà Nội' },
  { code: 'NA2', route: 'Vinh → Hà Nội' },
  { code: 'SP2', route: 'Lào Cai → Hà Nội' },
]

// Gap between trains, in minutes, by time of day
const GAP_RANGES = {
  normal: { day: [14, 26], night: [35, 55] },
  frequent: { day: [4, 8], night: [10, 16] },
}

const seededRandom = (seed) => {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const scheduleCache = new Map()

const buildDailySchedule = (dayStart, frequency) => {
  const cacheKey = `${dayStart}:${frequency}`
  if (scheduleCache.has(cacheKey)) return scheduleCache.get(cacheKey)

  const gaps = GAP_RANGES[frequency] || GAP_RANGES.normal
  const random = seededRandom(Math.floor(dayStart / DAY_MS) * 31 + (frequency === 'frequent' ? 7 : 0))
  const trains = []
  let time = dayStart + Math.floor(random() * 20) * MINUTE_MS
  let southIndex = 0
  let northIndex = 0

  while (time < dayStart + DAY_MS) {
    const isSouthbound = random() < 0.5
    const line = isSouthbound
      ? SOUTHBOUND[southIndex++ % SOUTHBOUND.length]
      : NORTHBOUND[northIndex++ % NORTHBOUND.length]
    trains.push({ id: `${line.code}@${time}`, ...line, isSouthbound, time })

    const hour = hanoiHour(time)
    const [minGap, maxGap] = hour >= 5.5 && hour < 22.5 ? gaps.day : gaps.night
    time += Math.round(minGap + random() * (maxGap - minGap)) * MINUTE_MS
  }

  scheduleCache.set(cacheKey, trains)
  return trains
}

// Trains whose scheduled time is after `since`, today and tomorrow
export const getUpcomingTrains = (now, frequency = 'normal', count = 4, since = now) => {
  const today = hanoiDayStart(now)
  return [...buildDailySchedule(today, frequency), ...buildDailySchedule(today + DAY_MS, frequency)]
    .filter((train) => train.time > since)
    .slice(0, count)
}

export const formatClock = (time) =>
  new Date(time).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  })

export const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

// The loco reaches the table ~10s after triggerTrain (4s bell + ~6s run-in),
// so trains are triggered this early to pass the table on the minute.
export const TRAIN_LEAD_MS = 10 * 1000
