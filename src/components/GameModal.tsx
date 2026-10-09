import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Film, ImageOff, Loader2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '../store/useData'
import { useGameModal } from '../store/useGameModal'
import type { Media } from '../types'
import { isVideo, useMediaUrl } from '../lib/media'
import { NAMES, dateRange } from '../lib/format'
import { PlayerTag, Score } from './ui'

export function MediaView({ media, className = '' }: { media: Media; className?: string }) {
  const { url, error } = useMediaUrl(media)
  if (error)
    return (
      <div className={`grid place-items-center bg-black/30 text-ink-3 ${className}`}>
        <ImageOff />
      </div>
    )
  if (!url)
    return (
      <div className={`grid place-items-center bg-black/30 text-ink-3 ${className}`}>
        <Loader2 className="animate-spin" />
      </div>
    )
  return isVideo(media) ? (
    <video src={url} controls playsInline className={`bg-black object-contain ${className}`} />
  ) : (
    <img src={url} alt={media.caption ?? ''} className={`object-contain ${className}`} />
  )
}

export function MediaThumb({ media, onClick }: { media: Media; onClick?: () => void }) {
  const { url } = useMediaUrl(isVideo(media) ? null : media)
  return (
    <button onClick={onClick} className="relative aspect-video overflow-hidden rounded-lg border border-line bg-black/30">
      {isVideo(media) ? (
        <div className="grid h-full place-items-center text-ink-2">
          <Film />
        </div>
      ) : url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <Loader2 className="m-auto h-full animate-spin text-ink-3" />
      )}
    </button>
  )
}

export default function GameModal() {
  const { sel, close, open } = useGameModal()
  const data = useData((s) => s.data)
  const [miState, setMiState] = useState({ key: '', i: 0 })
  const show = sel && data?.shows.find((s) => s.number === sel.show)
  const game = show?.games.find((g) => g.nr === sel!.game)

  useEffect(() => {
    if (!sel) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, close])

  const played = show?.games.filter((g) => g.played) ?? []
  const pos = played.findIndex((g) => g.nr === game?.nr)
  const media = game?.media ?? []
  const selKey = sel ? `${sel.show}-${sel.game}` : ''
  const mi = miState.key === selKey ? Math.min(miState.i, Math.max(0, media.length - 1)) : 0
  const setMi = (i: number) => setMiState({ key: selKey, i })

  return (
    <AnimatePresence>
      {show && game && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-card-solid p-5 sm:rounded-3xl sm:p-6"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="label">
                  {show.label} · Spiel {game.nr} · {game.points} {game.points === 1 ? 'Punkt' : 'Punkte'}
                </div>
                <h3 className="mt-1 font-display text-3xl uppercase tracking-wide">{game.name}</h3>
                {game.replaced && <div className="mt-1 text-sm text-ink-3">ersetzte „{game.replaced}“</div>}
              </div>
              <button onClick={close} className="rounded-full p-2 text-ink-2 hover:bg-card" aria-label="Schließen">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line p-3">
                <div className="label">Sieger</div>
                <div className="mt-1.5">
                  <PlayerTag p={game.winner} />
                </div>
              </div>
              <div className="rounded-xl border border-line p-3">
                <div className="label">Stand danach</div>
                <div className="mt-1 text-2xl">{game.score && <Score score={game.score} winner={game.winner} />}</div>
              </div>
              <div className="col-span-2 rounded-xl border border-line p-3 sm:col-span-1">
                <div className="label">Show</div>
                <Link to={`/shows/${show.number}`} onClick={close} className="mt-1.5 block text-sm font-semibold text-gold hover:underline">
                  {show.label} · {dateRange(show.dates)}
                </Link>
                {game.globalNr && <div className="text-xs text-ink-3">{game.globalNr}. SdM-Spiel insgesamt</div>}
              </div>
            </div>

            {game.matchball && (
              <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm">
                <span className="font-semibold text-gold">{game.matchball.n}. Matchball</span>
                {(['dennis', 'daniel'] as const).map((p) =>
                  game.matchball![p] ? (
                    <span key={p} className="ml-3 text-ink-2">
                      {NAMES[p]}: <b className="text-ink">{game.matchball![p]}</b>
                    </span>
                  ) : null,
                )}
              </div>
            )}
            {game.note && <div className="mt-3 rounded-xl border border-line p-3 text-sm text-ink-2">📝 {game.note}</div>}

            <div className="mt-5">
              <div className="label mb-2">Medien</div>
              {media.length ? (
                <>
                  <MediaView media={media[mi]} className="aspect-video w-full rounded-xl" />
                  {media[mi].caption && <div className="mt-1.5 text-sm text-ink-2">{media[mi].caption}</div>}
                  {media.length > 1 && (
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {media.map((m, i) => (
                        <div key={m.id} className={i === mi ? 'rounded-lg ring-2 ring-gold' : ''}>
                          <MediaThumb media={m} onClick={() => setMi(i)} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-ink-3">
                  Noch keine Screenshots oder Clips.
                  <div className="mt-1 text-xs">
                    Ablegen unter <code className="text-ink-2">raw/media/sdm-{show.number}/spiel-{game.nr}.jpg</code>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                disabled={pos <= 0}
                onClick={() => open(show.number, played[pos - 1].nr)}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:bg-card disabled:opacity-30"
              >
                <ChevronLeft size={16} /> Vorheriges
              </button>
              <button
                disabled={pos >= played.length - 1}
                onClick={() => open(show.number, played[pos + 1].nr)}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:bg-card disabled:opacity-30"
              >
                Nächstes <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
