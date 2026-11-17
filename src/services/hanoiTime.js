// Picks the scene mood from the real time in Hanoi (UTC+7, no DST)
const HANOI_OFFSET_MS = 7 * 3600 * 1000
const DAY_MS = 24 * 3600 * 1000
const RAIN_BLOCK_HOURS = 3
const RAIN_CHANCE = 0.18

export const getHanoiHour = (now = Date.now()) => ((now + HANOI_OFFSET_MS) % DAY_MS) / 3600000

// Deterministic per 3-hour block so the weather doesn't flicker between reloads
const isRainyBlock = (now) => {
  const block = Math.floor((now + HANOI_OFFSET_MS) / (RAIN_BLOCK_HOURS * 3600 * 1000))
  const hash = Math.sin(block * 12.9898) * 43758.5453
  return hash - Math.floor(hash) < RAIN_CHANCE
}

export const getAutoWeather = (now = Date.now()) => {
  const hour = getHanoiHour(now)
  if (hour >= 18.5 || hour < 5.25) return 'night'
  if (hour < 6.5 || hour >= 16.75) return 'sunset' // bình minh & hoàng hôn
  return isRainyBlock(now) ? 'rain' : 'afternoon'
}
