// Procedural Hanoi street soundscape: distant motorbikes, horn beeps, bicycle bells,
// a street vendor's call, spoon clinks, and at night crickets and the "tắc kè" gecko.
// Everything is synthesized with Web Audio — no audio files.

const random = (min, max) => min + Math.random() * (max - min)
const pick = (items) => items[Math.floor(Math.random() * items.length)]

// Expected seconds between events, per mood (missing = never)
const MOODS = {
  day: { motorbike: 9, horn: 16, bicycleBell: 40, vendor: 75, clink: 22 },
  evening: { motorbike: 14, horn: 28, bicycleBell: 70, vendor: 140, clink: 14, gecko: 120 },
  lateNight: { motorbike: 45, gecko: 50 },
  rain: { motorbike: 18, horn: 40, clink: 30 },
}
const CRICKETS_BY_MOOD = { day: 0, evening: 0.6, lateNight: 1, rain: 0 }

// Short sung phrases, shaped like a vendor calling out down the alley
// (pitch in Hz, duration in s, glide target ratio)
const VENDOR_PHRASES = [
  [[330, 0.32, 1], [392, 0.28, 1], [370, 0.3, 0.98], [294, 0.7, 0.9]],
  [[440, 0.25, 1], [440, 0.25, 1], [392, 0.55, 0.92]],
  [[349, 0.3, 1.04], [415, 0.4, 1], [311, 0.8, 0.88]],
]

export class StreetSoundscape {
  constructor(ctx, output) {
    this.ctx = ctx
    this.output = output
    this.mood = null
    this.timer = null
    this.crickets = null
    this.dripTimer = null

    // Alley echo shared by distant sounds
    this.echoSend = ctx.createGain()
    this.echoSend.gain.value = 0.35
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.19
    const feedback = ctx.createGain()
    feedback.gain.value = 0.28
    const damp = ctx.createBiquadFilter()
    damp.type = 'lowpass'
    damp.frequency.value = 1800
    this.echoSend.connect(delay)
    delay.connect(damp)
    damp.connect(feedback)
    feedback.connect(delay)
    damp.connect(output)
  }

  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 1000)
    this.startCrickets()
  }

  setMood(mood) {
    if (!MOODS[mood] || mood === this.mood) return
    this.mood = mood
    const now = this.ctx.currentTime
    this.crickets?.gain.gain.setTargetAtTime(0.03 * CRICKETS_BY_MOOD[mood], now, 2)
  }

  // Each second, every event of the current mood fires with probability 1 / meanInterval
  tick() {
    const events = MOODS[this.mood]
    if (!events || this.ctx.state !== 'running') return
    for (const [name, meanSeconds] of Object.entries(events)) {
      if (Math.random() < 1 / meanSeconds) this[name]()
    }
  }

  // Sound source → gain envelope → stereo pan → output (+ echo)
  createVoice(pan, echo = 0.3) {
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    const panner = this.ctx.createStereoPanner()
    panner.pan.value = pan
    gain.connect(panner)
    panner.connect(this.output)
    if (echo > 0) {
      const send = this.ctx.createGain()
      send.gain.value = echo
      panner.connect(send)
      send.connect(this.echoSend)
    }
    return { gain, panner }
  }

  // Xe máy chạy ngang đầu ngõ: putt-putt engine, doppler pitch drop, left → right sweep
  motorbike() {
    const now = this.ctx.currentTime
    const duration = random(3.5, 6)
    const peak = now + duration * random(0.4, 0.6)
    const loudness = random(0.06, 0.13)
    const direction = Math.random() < 0.5 ? 1 : -1
    const { gain, panner } = this.createVoice(-0.9 * direction, 0.2)
    panner.pan.linearRampToValueAtTime(0.9 * direction, now + duration)

    const rpm = random(34, 52)
    const engine = this.ctx.createOscillator()
    engine.type = 'sawtooth'
    engine.frequency.setValueAtTime(rpm * 1.05, now)
    engine.frequency.linearRampToValueAtTime(rpm * 1.04, peak)
    engine.frequency.linearRampToValueAtTime(rpm * 0.93, now + duration)

    const growl = this.ctx.createOscillator()
    growl.type = 'square'
    growl.frequency.setValueAtTime(rpm * 2.02, now)
    growl.frequency.linearRampToValueAtTime(rpm * 1.86, now + duration)
    const growlLevel = this.ctx.createGain()
    growlLevel.gain.value = 0.35

    // Four-stroke "putt" pulsing
    const pulse = this.ctx.createOscillator()
    pulse.frequency.value = rpm / 2
    const pulseDepth = this.ctx.createGain()
    pulseDepth.gain.value = 0.5
    const pulsed = this.ctx.createGain()
    pulsed.gain.value = 0.6
    pulse.connect(pulseDepth)
    pulseDepth.connect(pulsed.gain)

    const muffle = this.ctx.createBiquadFilter()
    muffle.type = 'lowpass'
    muffle.frequency.setValueAtTime(380, now)
    muffle.frequency.linearRampToValueAtTime(900, peak)
    muffle.frequency.linearRampToValueAtTime(320, now + duration)

    engine.connect(pulsed)
    growl.connect(growlLevel)
    growlLevel.connect(pulsed)
    pulsed.connect(muffle)
    muffle.connect(gain)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(loudness, peak)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    for (const node of [engine, growl, pulse]) {
      node.start(now)
      node.stop(now + duration + 0.1)
    }
  }

  // Bíp bíp — scooter horn, one or two short beeps
  horn() {
    const now = this.ctx.currentTime
    const { gain } = this.createVoice(random(-0.8, 0.8), 0.4)
    const pitch = random(380, 470)
    const beeps = Math.random() < 0.6 ? 2 : 1
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = pitch * 2
    filter.Q.value = 1.5
    filter.connect(gain)
    gain.gain.value = random(0.025, 0.05)

    for (let index = 0; index < beeps; index++) {
      const at = now + index * 0.2
      const length = index === beeps - 1 ? random(0.15, 0.35) : 0.12
      const env = this.ctx.createGain()
      env.gain.setValueAtTime(0, at)
      env.gain.linearRampToValueAtTime(1, at + 0.01)
      env.gain.setValueAtTime(1, at + length)
      env.gain.linearRampToValueAtTime(0, at + length + 0.02)
      env.connect(filter)
      for (const ratio of [1, 1.26]) {
        const osc = this.ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.value = pitch * ratio
        osc.connect(env)
        osc.start(at)
        osc.stop(at + length + 0.05)
      }
    }
  }

  // Kính coong — bicycle bell, inharmonic partials with fast decay
  bicycleBell() {
    const now = this.ctx.currentTime
    const { gain } = this.createVoice(random(-0.6, 0.6), 0.5)
    gain.gain.value = random(0.03, 0.06)
    const rings = Math.random() < 0.5 ? 2 : 3
    for (let ring = 0; ring < rings; ring++) {
      const at = now + ring * 0.16
      for (const [ratio, level] of [[1, 1], [1.48, 0.6], [2.31, 0.35]]) {
        const osc = this.ctx.createOscillator()
        osc.frequency.value = 2150 * ratio
        const env = this.ctx.createGain()
        env.gain.setValueAtTime(0.0001, at)
        env.gain.exponentialRampToValueAtTime(level, at + 0.004)
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.7)
        osc.connect(env)
        env.connect(gain)
        osc.start(at)
        osc.stop(at + 0.75)
      }
    }
  }

  // Tiếng rao xa xa — a voice-like tone through vowel formants, with vibrato
  vendor() {
    const phrase = pick(VENDOR_PHRASES)
    const { gain } = this.createVoice(random(-0.7, 0.7), 0.9)
    const muffle = this.ctx.createBiquadFilter()
    muffle.type = 'lowpass'
    muffle.frequency.value = 1500
    muffle.connect(gain)

    const formants = [[750, 6, 1], [1150, 8, 0.6], [2600, 10, 0.2]].map(([freq, q, level]) => {
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = freq
      filter.Q.value = q
      const amount = this.ctx.createGain()
      amount.gain.value = level
      filter.connect(amount)
      amount.connect(muffle)
      return filter
    })

    let at = this.ctx.currentTime + 0.05
    for (const [pitch, length, glide] of phrase) {
      const voice = this.ctx.createOscillator()
      voice.type = 'sawtooth'
      voice.frequency.setValueAtTime(pitch, at)
      voice.frequency.linearRampToValueAtTime(pitch * glide, at + length)
      const vibrato = this.ctx.createOscillator()
      vibrato.frequency.value = 5.5
      const vibratoDepth = this.ctx.createGain()
      vibratoDepth.gain.value = pitch * 0.012
      vibrato.connect(vibratoDepth)
      vibratoDepth.connect(voice.frequency)

      const env = this.ctx.createGain()
      env.gain.setValueAtTime(0.0001, at)
      env.gain.exponentialRampToValueAtTime(1, at + 0.05)
      env.gain.setValueAtTime(1, at + length * 0.75)
      env.gain.exponentialRampToValueAtTime(0.0001, at + length)
      voice.connect(env)
      for (const filter of formants) env.connect(filter)

      voice.start(at)
      voice.stop(at + length + 0.02)
      vibrato.start(at)
      vibrato.stop(at + length + 0.02)
      at += length + 0.06
    }
    gain.gain.value = random(0.05, 0.09)
  }

  // Leng keng — spoon stirring a glass at a nearby table
  clink() {
    const now = this.ctx.currentTime
    const { gain } = this.createVoice(random(-0.4, 0.4), 0.15)
    gain.gain.value = random(0.015, 0.035)
    const taps = Math.floor(random(2, 5))
    for (let tap = 0; tap < taps; tap++) {
      const at = now + tap * random(0.11, 0.16)
      const osc = this.ctx.createOscillator()
      osc.frequency.value = random(2500, 2800)
      const env = this.ctx.createGain()
      env.gain.setValueAtTime(0.0001, at)
      env.gain.exponentialRampToValueAtTime(1, at + 0.003)
      env.gain.exponentialRampToValueAtTime(0.0001, at + 0.25)
      osc.connect(env)
      env.connect(gain)
      osc.start(at)
      osc.stop(at + 0.3)
    }
  }

  // "Tắc kè… tắc kè…" — a click followed by a falling croak, repeated, slowing down
  gecko() {
    const { gain } = this.createVoice(random(-0.9, 0.9), 0.6)
    gain.gain.value = random(0.04, 0.07)
    const calls = Math.floor(random(4, 8))
    let at = this.ctx.currentTime + 0.1
    for (let call = 0; call < calls; call++) {
      const fade = 1 - call / (calls + 2)
      const tac = this.ctx.createOscillator()
      tac.type = 'square'
      tac.frequency.value = 950
      const tacEnv = this.ctx.createGain()
      tacEnv.gain.setValueAtTime(0.0001, at)
      tacEnv.gain.exponentialRampToValueAtTime(0.5 * fade, at + 0.008)
      tacEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.07)
      tac.connect(tacEnv)

      const ke = this.ctx.createOscillator()
      ke.type = 'sawtooth'
      const keStart = at + 0.16
      ke.frequency.setValueAtTime(560, keStart)
      ke.frequency.exponentialRampToValueAtTime(330, keStart + 0.22)
      const keEnv = this.ctx.createGain()
      keEnv.gain.setValueAtTime(0.0001, keStart)
      keEnv.gain.exponentialRampToValueAtTime(fade, keStart + 0.02)
      keEnv.gain.exponentialRampToValueAtTime(0.0001, keStart + 0.24)
      ke.connect(keEnv)

      const throat = this.ctx.createBiquadFilter()
      throat.type = 'bandpass'
      throat.frequency.value = 900
      throat.Q.value = 2.5
      tacEnv.connect(throat)
      keEnv.connect(throat)
      throat.connect(gain)

      tac.start(at)
      tac.stop(at + 0.08)
      ke.start(keStart)
      ke.stop(keStart + 0.26)
      at += 0.75 + call * 0.12
    }
  }

  // Night crickets: a high tone gated into chirp trains by two slow oscillators
  startCrickets() {
    if (this.crickets) return
    const tone = this.ctx.createOscillator()
    tone.frequency.value = 4600
    const chirp = this.ctx.createOscillator()
    chirp.type = 'square'
    chirp.frequency.value = 28
    const chirpDepth = this.ctx.createGain()
    chirpDepth.gain.value = 0.5
    const gate = this.ctx.createGain()
    gate.gain.value = 0.5
    chirp.connect(chirpDepth)
    chirpDepth.connect(gate.gain)

    const phrase = this.ctx.createOscillator()
    phrase.frequency.value = 0.7
    const phraseDepth = this.ctx.createGain()
    phraseDepth.gain.value = 0.5
    const phraseGate = this.ctx.createGain()
    phraseGate.gain.value = 0.5
    phrase.connect(phraseDepth)
    phraseDepth.connect(phraseGate.gain)

    const gain = this.ctx.createGain()
    gain.gain.value = 0
    const panner = this.ctx.createStereoPanner()
    panner.pan.value = -0.5
    tone.connect(gate)
    gate.connect(phraseGate)
    phraseGate.connect(gain)
    gain.connect(panner)
    panner.connect(this.output)
    for (const node of [tone, chirp, phrase]) node.start()
    this.crickets = { gain }
    if (this.mood) gain.gain.value = 0.03 * CRICKETS_BY_MOOD[this.mood]
  }

  // Tách… tách… — the phin dripping into the glass during a focus session
  setPhinDripping(isDripping) {
    if (isDripping && !this.dripTimer) {
      this.dripTimer = setInterval(() => this.drip(), 714)
    } else if (!isDripping && this.dripTimer) {
      clearInterval(this.dripTimer)
      this.dripTimer = null
    }
  }

  drip() {
    if (this.ctx.state !== 'running') return
    const now = this.ctx.currentTime + random(0, 0.08)
    const { gain } = this.createVoice(0.25, 0)
    gain.gain.value = 0.035
    const osc = this.ctx.createOscillator()
    osc.frequency.setValueAtTime(random(1500, 1900), now)
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.04)
    const env = this.ctx.createGain()
    env.gain.setValueAtTime(0.0001, now)
    env.gain.exponentialRampToValueAtTime(1, now + 0.003)
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)
    osc.connect(env)
    env.connect(gain)
    osc.start(now)
    osc.stop(now + 0.08)
  }
}

// Weather and the real hour in Hanoi decide what the street sounds like
export const getStreetMood = (weather, hanoiHour) => {
  if (weather === 'rain') return 'rain'
  const isLate = hanoiHour >= 22 || hanoiHour < 5
  if (weather === 'night') return isLate ? 'lateNight' : 'evening'
  return isLate ? 'evening' : 'day'
}
