import { useEffect, useState } from 'react'
import type { Media } from '../types'
import { fetchDecrypted } from './crypto'
import { useData } from '../store/useData'

// Entschlüsselte Medien bleiben für die Sitzung als Blob-URL im Speicher
const cache = new Map<string, Promise<string>>()

export function useMediaUrl(media: Media | null) {
  const key = useData((s) => s.key)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!media || !key) return
    let alive = true
    let p = cache.get(media.id)
    if (!p) {
      p = fetchDecrypted(key, `./media/${media.id}.bin`).then((buf) => URL.createObjectURL(new Blob([buf], { type: media.type })))
      p.catch(() => cache.delete(media.id))
      cache.set(media.id, p)
    }
    p.then((u) => alive && setUrl(u)).catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [media, key])

  return { url, error }
}

export const isVideo = (m: Media) => m.type.startsWith('video/')
