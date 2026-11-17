const SUPPORTED_TYPES = ['playlist', 'album', 'track', 'artist', 'show', 'episode']

const TYPE_LABELS = {
  playlist: 'Playlist',
  album: 'Album',
  track: 'Bài hát',
  artist: 'Nghệ sĩ',
  show: 'Podcast',
  episode: 'Tập podcast',
}

// Accepts: https://open.spotify.com/(intl-xx/)?(embed/)?<type>/<id>?si=...  |  spotify:<type>:<id>
export const parseSpotifyUrl = (rawUrl) => {
  const url = (rawUrl || '').trim()
  if (!url) return null

  const typePattern = SUPPORTED_TYPES.join('|')
  const webMatch = url.match(
    new RegExp(`open\\.spotify\\.com/(?:intl-[a-z-]+/)?(?:embed/)?(${typePattern})/([A-Za-z0-9]{10,})`)
  )
  const uriMatch = url.match(new RegExp(`^spotify:(${typePattern}):([A-Za-z0-9]{10,})$`))
  const match = webMatch || uriMatch
  if (!match) return null

  const [, type, id] = match
  return { type, id, label: TYPE_LABELS[type], embedUrl: buildEmbedUrl(type, id) }
}

export const buildEmbedUrl = (type, id) =>
  `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`

export const embedHeightFor = (type) => (type === 'track' || type === 'episode' ? 152 : 352)

export const DEFAULT_PERSONAL_URL = import.meta.env.VITE_SPOTIFY_URL || ''
