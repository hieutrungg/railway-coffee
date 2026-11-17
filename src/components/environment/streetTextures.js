import * as THREE from 'three'

// Canvas textures for shop signs, blade signs and neon — cached by content

const cache = new Map()
const cached = (key, create) => {
  if (!cache.has(key)) cache.set(key, create())
  return cache.get(key)
}

const finish = (canvas) => {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

const fitFont = (ctx, text, maxWidth, size, family) => {
  let fontSize = size
  do {
    ctx.font = `bold ${fontSize}px ${family}`
    fontSize -= 2
  } while (ctx.measureText(text).width > maxWidth && fontSize > 12)
}

// Flat painted shop sign with border and optional subtitle
export const getShopSignTexture = (text, subText, background, foreground) =>
  cached(`sign:${text}:${subText}:${background}:${foreground}`, () => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, 512, 128)
    ctx.strokeStyle = foreground
    ctx.lineWidth = 5
    ctx.strokeRect(7, 7, 498, 114)
    ctx.fillStyle = foreground
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    fitFont(ctx, text, 470, 52, '"Be Vietnam Pro", Arial, sans-serif')
    ctx.fillText(text, 256, subText ? 52 : 66)
    if (subText) {
      ctx.font = '600 20px "Be Vietnam Pro", Arial, sans-serif'
      ctx.globalAlpha = 0.85
      ctx.fillText(subText, 256, 98)
    }
    return finish(canvas)
  })

// Vertical blade sign hanging out over the street, words stacked
export const getBladeSignTexture = (words, background, foreground) =>
  cached(`blade:${words.join('|')}:${background}`, () => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 384
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, 128, 384)
    ctx.strokeStyle = foreground
    ctx.lineWidth = 4
    ctx.strokeRect(6, 6, 116, 372)
    ctx.fillStyle = foreground
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const step = 360 / words.length
    words.forEach((word, index) => {
      fitFont(ctx, word, 104, 40, '"Be Vietnam Pro", Arial, sans-serif')
      ctx.fillText(word, 64, 12 + step * (index + 0.5))
    })
    return finish(canvas)
  })

// Neon tube lettering on a transparent background (rendered HDR so it blooms)
export const getNeonTexture = (text, color, { script = false } = {}) =>
  cached(`neon:${text}:${color}:${script}`, () => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 160
    const ctx = canvas.getContext('2d')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const family = script ? '"Brush Script MT", "Segoe Script", cursive' : '"Be Vietnam Pro", Arial, sans-serif'
    fitFont(ctx, text, 470, script ? 96 : 78, family)
    ctx.shadowColor = color
    ctx.shadowBlur = 22
    ctx.strokeStyle = color
    ctx.lineWidth = 7
    ctx.strokeText(text, 256, 82)
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.strokeText(text, 256, 82)
    return finish(canvas)
  })

// Round "trạm chờ tàu" badge with a little steam-train glyph
export const getStationBadgeTexture = () =>
  cached('badge', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(128, 128, 120, 0, Math.PI * 2)
    ctx.fillStyle = '#f3e3c3'
    ctx.fill()
    ctx.lineWidth = 14
    ctx.strokeStyle = '#b8261b'
    ctx.stroke()
    ctx.fillStyle = '#b8261b'
    ctx.textAlign = 'center'
    ctx.font = 'bold 26px "Be Vietnam Pro", Arial, sans-serif'
    ctx.fillText('TRẠM CHỜ TÀU', 128, 62)
    ctx.font = 'bold 22px "Be Vietnam Pro", Arial, sans-serif'
    ctx.fillText('TRAIN STATION', 128, 214)
    // train glyph
    ctx.fillStyle = '#2a2320'
    ctx.fillRect(70, 110, 96, 50)
    ctx.fillRect(150, 92, 34, 68)
    ctx.fillRect(84, 88, 16, 24)
    ctx.fillStyle = '#b8261b'
    ctx.fillRect(156, 100, 22, 18)
    ctx.fillStyle = '#2a2320'
    for (const x of [88, 120, 160]) {
      ctx.beginPath()
      ctx.arc(x, 168, 12, 0, Math.PI * 2)
      ctx.fill()
    }
    return finish(canvas)
  })

// Irregular stone slabs paved between and around the rails
export const getPaverTexture = () =>
  cached('pavers', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#4a4540'
    ctx.fillRect(0, 0, 256, 512)
    let y = 0
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    while (y < 512) {
      const rowHeight = 34 + random() * 30
      let x = -random() * 40
      while (x < 256) {
        const width = 50 + random() * 70
        const shade = 120 + random() * 50
        ctx.fillStyle = `rgb(${shade}, ${shade - 6}, ${shade - 14})`
        ctx.fillRect(x + 2, y + 2, width - 4, rowHeight - 4)
        ctx.fillStyle = `rgba(0,0,0,${0.05 + random() * 0.1})`
        ctx.fillRect(x + 2 + random() * width * 0.5, y + 2, width * 0.3, rowHeight - 4)
        x += width
      }
      y += rowHeight
    }
    const texture = finish(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  })
