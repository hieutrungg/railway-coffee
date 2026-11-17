// Web Audio API Synthesizer for Railway Café
// Generates realistic procedural sounds: railway bell, train horn, train rumble & tracks,
// rain ambience, outdoor cafe atmosphere, and vintage radio static.
import { StreetSoundscape } from './streetSounds'

class AudioService {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.ambientGain = null
    this.rainGain = null
    this.trainGain = null
    this.isInitialized = false

    // Active nodes
    this.ambientNoise = null
    this.rainNoise = null
    this.trainRumbleNode = null
    this.trainClickTimer = null
    this.crossingBellInterval = null
    this.street = null
    this.pendingStreetMood = null
    this.pendingVolumes = null
  }

  init() {
    if (this.isInitialized) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      this.ctx = new AudioCtx()

      // Master output
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)

      // Sub-buses
      this.ambientGain = this.ctx.createGain()
      this.ambientGain.gain.setValueAtTime(0.5, this.ctx.currentTime)
      this.ambientGain.connect(this.masterGain)

      // rainGain = user volume; rainFade = on/off by weather
      this.rainGain = this.ctx.createGain()
      this.rainGain.gain.setValueAtTime(0.7, this.ctx.currentTime)
      this.rainGain.connect(this.masterGain)
      this.rainFade = this.ctx.createGain()
      this.rainFade.gain.setValueAtTime(0, this.ctx.currentTime)
      this.rainFade.connect(this.rainGain)

      this.streetGain = this.ctx.createGain()
      this.streetGain.gain.setValueAtTime(0.7, this.ctx.currentTime)
      this.streetGain.connect(this.masterGain)
      this.street = new StreetSoundscape(this.ctx, this.streetGain)

      this.trainGain = this.ctx.createGain()
      this.trainGain.gain.setValueAtTime(0.9, this.ctx.currentTime)
      this.trainGain.connect(this.masterGain)

      this.isInitialized = true
      this.startAmbientSound()
      this.street.start()
      if (this.pendingStreetMood) this.street.setMood(this.pendingStreetMood)
      if (this.pendingVolumes) this.setVolumes(this.pendingVolumes)
      if (this.pendingWeather) this.setWeatherMode(this.pendingWeather)
    } catch (e) {
      console.warn('AudioContext initialization deferred until user interaction:', e)
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init()
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setVolumes({ master, ambient, rain, train, street = 0.7, isMuted }) {
    if (!this.ctx) {
      this.pendingVolumes = { master, ambient, rain, train, street, isMuted }
      return
    }
    const now = this.ctx.currentTime
    const m = isMuted ? 0 : master

    if (this.masterGain) this.masterGain.gain.setTargetAtTime(m, now, 0.05)
    if (this.ambientGain) this.ambientGain.gain.setTargetAtTime(ambient, now, 0.05)
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(rain, now, 0.05)
    if (this.trainGain) this.trainGain.gain.setTargetAtTime(train, now, 0.05)
    if (this.streetGain) this.streetGain.gain.setTargetAtTime(street, now, 0.05)
  }

  setStreetMood(mood) {
    if (!this.street) {
      this.pendingStreetMood = mood
      return
    }
    this.street.setMood(mood)
  }

  setPhinDripping(isDripping) {
    this.street?.setPhinDripping(isDripping)
  }

  // Create subtle pink/brown noise for cozy city breeze & room murmur
  startAmbientSound() {
    if (!this.ctx || this.ambientNoise) return
    try {
      const bufferSize = this.ctx.sampleRate * 2
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99 * b0 + white * 0.05
        b1 = 0.96 * b1 + white * 0.08
        b2 = 0.92 * b2 + white * 0.12
        data[i] = (b0 + b1 + b2) * 0.15
      }

      const noise = this.ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(450, this.ctx.currentTime)

      noise.connect(filter)
      filter.connect(this.ambientGain)
      noise.start()
      this.ambientNoise = noise
    } catch (e) {
      console.warn('Failed to start ambient noise:', e)
    }
  }

  // Update rain sound based on weather mode
  setWeatherMode(weather) {
    if (!this.ctx) {
      this.pendingWeather = weather
      return
    }
    const isRain = weather === 'rain'
    const now = this.ctx.currentTime

    if (isRain) {
      if (!this.rainNoise) {
        this.startRainSound()
      }
      this.rainFade.gain.cancelScheduledValues(now)
      this.rainFade.gain.setTargetAtTime(1, now, 1.2)
    } else {
      this.rainFade.gain.cancelScheduledValues(now)
      this.rainFade.gain.setTargetAtTime(0, now, 1.2)
    }
  }

  startRainSound() {
    if (!this.ctx || this.rainNoise) return
    try {
      const bufferSize = this.ctx.sampleRate * 2
      const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate)
      for (let channel = 0; channel < 2; channel++) {
        const out = buffer.getChannelData(channel)
        let lastOut = 0.0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          out[i] = (lastOut + 0.02 * white) / 1.02
          lastOut = out[i]
          out[i] *= 1.8
        }
      }

      const noise = this.ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true

      const bandpass = this.ctx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.setValueAtTime(1200, this.ctx.currentTime)
      bandpass.Q.setValueAtTime(0.6, this.ctx.currentTime)

      noise.connect(bandpass)
      bandpass.connect(this.rainFade)
      noise.start()
      this.rainNoise = noise
    } catch (e) {
      console.warn('Failed to start rain sound:', e)
    }
  }

  // Railway crossing warning bell
  playWarningBell(repeatCount = 8, intervalMs = 450) {
    this.ensureContext()
    if (!this.ctx) return

    let count = 0
    const ringBell = () => {
      if (count >= repeatCount || !this.ctx) {
        if (this.crossingBellInterval) clearInterval(this.crossingBellInterval)
        return
      }
      count++

      const now = this.ctx.currentTime
      // Two-tone bell harmonics
      ;[784, 1175].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)

        gain.gain.setValueAtTime(0.18 - idx * 0.06, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)

        osc.connect(gain)
        gain.connect(this.trainGain)

        osc.start(now)
        osc.stop(now + 0.55)
      })
    }

    ringBell()
    this.crossingBellInterval = setInterval(ringBell, intervalMs)
  }

  // Distant train horn
  playTrainHorn(distance = 1.0) {
    this.ensureContext()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    // Vietnamese D19E locomotive two-tone air horn (~311Hz D#4 and ~370Hz F#4)
    const tones = [311, 370, 466]
    tones.forEach((freq) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq * 0.98, now)
      // Doppler effect: slight pitch drop
      osc.frequency.linearRampToValueAtTime(freq * 0.94, now + 1.8)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(800 + (1 - distance) * 1200, now)

      const targetGain = 0.12 * (1 - distance * 0.4)
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.2)
      gain.gain.setValueAtTime(targetGain, now + 1.4)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.trainGain)

      osc.start(now)
      osc.stop(now + 2.1)
    })
  }

  // Train passing rumble and wheel-on-rail sound
  startTrainPassAudio(duration = 9) {
    this.ensureContext()
    if (!this.ctx) return

    const now = this.ctx.currentTime

    // Heavy low frequency rumble
    const osc = this.ctx.createOscillator()
    const rumbleGain = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(45, now)
    osc.frequency.linearRampToValueAtTime(60, now + duration * 0.35)
    osc.frequency.linearRampToValueAtTime(40, now + duration * 0.9)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(140, now)

    // Build up as train comes, peak at middle, fade out
    rumbleGain.gain.setValueAtTime(0.001, now)
    rumbleGain.gain.exponentialRampToValueAtTime(0.35, now + duration * 0.38)
    rumbleGain.gain.setValueAtTime(0.35, now + duration * 0.62)
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.95)

    osc.connect(filter)
    filter.connect(rumbleGain)
    rumbleGain.connect(this.trainGain)

    osc.start(now)
    osc.stop(now + duration)

    // Periodic wheel clack-clack
    let clackTime = 0
    const clackTotal = Math.round((duration * 1000) / 320)
    const clackTimer = setInterval(() => {
      clackTime++
      if (clackTime > clackTotal || !this.ctx) {
        clearInterval(clackTimer)
        return
      }

      const tNow = this.ctx.currentTime
      const distFactor = Math.sin((clackTime / clackTotal) * Math.PI)
      this.playRailClick(tNow, distFactor)
    }, 320)
  }

  playRailClick(time, intensity) {
    if (!this.ctx) return
    ;[0, 0.08].forEach((offset) => {
      const osc = this.ctx.createOscillator()
      const clickGain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(220, time + offset)
      osc.frequency.exponentialRampToValueAtTime(80, time + offset + 0.05)

      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(350, time + offset)

      const gainVal = Math.max(0.001, 0.15 * intensity)
      clickGain.gain.setValueAtTime(gainVal, time + offset)
      clickGain.gain.exponentialRampToValueAtTime(0.0001, time + offset + 0.07)

      osc.connect(filter)
      filter.connect(clickGain)
      clickGain.connect(this.trainGain)

      osc.start(time + offset)
      osc.stop(time + offset + 0.08)
    })
  }

  // Radio switch / dial click sound
  playRadioDialClick() {
    this.ensureContext()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1400, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04)

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 0.06)
  }

  // Radio static burst
  playRadioStatic(duration = 0.3) {
    this.ensureContext()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const bufferSize = Math.floor(this.ctx.sampleRate * duration)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1800, now)
    filter.Q.setValueAtTime(1.2, now)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    noise.start(now)
    noise.stop(now + duration + 0.05)
  }

  // Soft "spoon on glass" chime — Pomodoro phase changes
  playChime(notes = [1046, 1318, 1568]) {
    this.ensureContext()
    if (!this.ctx) return

    const start = this.ctx.currentTime
    notes.forEach((freq, index) => {
      const at = start + index * 0.18
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, at)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.2)
      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start(at)
      osc.stop(at + 1.25)
    })
  }
}

export const audioService = new AudioService()
