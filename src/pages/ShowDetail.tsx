import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ImageIcon, Target } from 'lucide-react'
import { useData } from '../store/useData'
import { comeback, decidedAt, playedGames } from '../lib/stats'
import { NAMES, date, dateRange, duration } from '../lib/format'
import { Kpi, Legend, PlayerDot, PlayerTag, Score, Section } from '../components/ui'
import { LineChart, type Marker } from '../components/charts'
import { MediaThumb } from '../components/GameModal'
import { useGameModal } from '../store/useGameModal'
import type { Player } from '../types'

export default function ShowDetail() {
  const { nr } = useParams()
  const data = useData((s) => s.data)!
  const open = useGameModal((s) => s.open)
  const idx = data.shows.findIndex((s) => s.number === Number(nr))
  const show = data.shows[idx]

  const chart = useMemo(() => {
    if (!show) return null
    const games = playedGames(show)
    const labels = ['Start', ...games.map((g) => String(g.nr))]
    const series = { dennis: [0, ...games.map((g) => g.score![0])], daniel: [0, ...games.map((g) => g.score![1])] }
    const markers: Marker[] = []
    games.forEach((g, i) => {
      if (!g.matchball) return
      const holder = (['dennis', 'daniel'] as Player[]).find((p) => g.matchball![p] === 'versenkt' || g.matchball![p] === 'verpasst')
      // Markierung beim Stand vor dem Matchball-Spiel (dort lag der Matchball)
      if (holder) markers.push({ i, player: holder })
    })
    return { games, labels, series, markers }
  }, [show])

  if (!show || !chart) return <Navigate to="/shows" replace />
  const prev = data.shows[idx - 1]
  const next = data.shows[idx + 1]
  const cb = comeback(show)
  const media = show.games.flatMap((g) => (g.media ?? []).map((m) => ({ m, g })))

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <Link to="/shows" className="text-ink-2 hover:text-ink">
          ← Alle Shows
        </Link>
        <div className="flex gap-1">
          {prev && (
            <Link to={`/shows/${prev.number}`} className="flex items-center rounded-full px-2 py-1 text-ink-2 hover:bg-card">
              <ChevronLeft size={16} /> {prev.label}
            </Link>
          )}
          {next && (
            <Link to={`/shows/${next.number}`} className="flex items-center rounded-full px-2 py-1 text-ink-2 hover:bg-card">
              {next.label} <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>

      <div className="card relative mt-4 overflow-hidden p-5 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `var(--${show.winner})` }} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label">{dateRange(show.dates)}</div>
            <h1 className="mt-1 font-display text-5xl uppercase tracking-wide sm:text-6xl">{show.label}</h1>
            <div className="mt-2 text-ink-2">
              Sieger: <PlayerTag p={show.winner} className="text-lg" />
            </div>
          </div>
          <Score score={show.final} winner={show.winner} className="text-6xl sm:text-7xl" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Dauer"
          value={duration(show.durationSec, true)}
          sub={show.durationParts ? show.durationParts.map((p, i) => `Tag ${i + 1}: ${duration(p, true)}`).join(' · ') : show.dates.map((d) => date(d)).join(' + ')}
        />
        <Kpi label="Entschieden" value={`Spiel ${decidedAt(show)}`} sub={`${show.gamesPlayed} Spiele gespielt`} />
        <Kpi
          label="Max. Rückstand"
          value={cb.deficit || '–'}
          sub={cb.deficit ? `${show.winner && NAMES[show.winner]} lag nach Spiel ${cb.atGame} hinten` : 'Start-Ziel-Sieg'}
        />
        <Kpi
          label="Pause davor"
          value={show.daysSincePrevious != null ? `${show.daysSincePrevious} T` : 'Premiere'}
          sub={[show.mulertExpress != null && `${show.mulertExpress}× Mulert-Express`, show.trivias != null && `${show.trivias} Trivias`].filter(Boolean).join(' · ') || undefined}
        />
      </div>

      <Section title="Punkteverlauf" kicker="Spiel für Spiel" right={<Legend />}>
        <div className="card p-4">
          <LineChart
            labels={chart.labels}
            series={chart.series}
            markers={chart.markers}
            height={300}
            tooltip={(i) => {
              if (i === 0) return <div className="text-ink-2">Start 0 : 0</div>
              const g = chart.games[i - 1]
              return (
                <>
                  <div className="label">
                    Spiel {g.nr} · {g.points} P
                  </div>
                  <div className="mt-0.5 font-semibold text-ink">{g.name}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-ink-2">
                    <PlayerDot p={g.winner} size={8} /> {g.winner && NAMES[g.winner]} gewinnt
                  </div>
                  <div className="mt-1 tabular text-ink">
                    {g.score![0]} : {g.score![1]}
                  </div>
                  {g.matchball && <div className="mt-1 text-gold">{g.matchball.n}. Matchball</div>}
                </>
              )
            }}
          />
          {chart.markers.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-3">
              <Target size={12} className="text-gold" /> Matchball (Stand vor dem Spiel)
            </div>
          )}
        </div>
      </Section>

      <Section title="Die Spiele" kicker={`${show.gamesPlayed} von 20`}>
        <div className="card divide-y divide-line overflow-hidden">
          {show.games.map((g) => (
            <button
              key={g.nr}
              disabled={!g.played}
              onClick={() => open(show.number, g.nr)}
              className="grid w-full grid-cols-[34px_1fr_auto] items-center gap-3 px-3 py-2.5 text-left transition hover:bg-card disabled:opacity-40 sm:grid-cols-[40px_1fr_120px_90px] sm:px-4"
            >
              <span className="font-display text-xl text-ink-3 tabular">{g.nr}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{g.name ?? 'nicht mehr nötig'}</span>
                  {g.media?.length ? <ImageIcon size={14} className="shrink-0 text-gold" /> : null}
                </span>
                <span className="flex flex-wrap gap-x-2 text-xs text-ink-3">
                  {g.matchball && <span className="text-gold">{g.matchball.n}. Matchball</span>}
                  {g.replaced && <span>statt „{g.replaced}“</span>}
                  {g.note && <span>{g.note}</span>}
                  <span className="sm:hidden">{g.winner && NAMES[g.winner]}</span>
                </span>
              </span>
              <span className="hidden sm:block">
                <PlayerTag p={g.winner} className="text-sm" />
              </span>
              <span className="text-right">{g.score && <Score score={g.score} winner={g.winner} className="text-lg" />}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Medien" kicker="Screenshots & Clips">
        {media.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {media.map(({ m, g }) => (
              <div key={m.id}>
                <MediaThumb media={m} onClick={() => open(show.number, g.nr)} />
                <div className="mt-1 truncate text-xs text-ink-2">
                  {g.nr}. {g.name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-ink-3">
            Für diese Show gibt es noch keine Medien. Ablegen unter <code className="text-ink-2">raw/media/sdm-{show.number}/spiel-NR.jpg</code>
          </div>
        )}
      </Section>
    </div>
  )
}
