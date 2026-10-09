import { useMemo, useState } from 'react'
import { ImageIcon, Search } from 'lucide-react'
import { useData } from '../store/useData'
import { allGames } from '../lib/stats'
import { NAMES, year } from '../lib/format'
import { PlayerDot, Section } from '../components/ui'
import { useGameModal } from '../store/useGameModal'
import type { Player } from '../types'

const RANGES = [
  { id: 'all', label: 'Alle Spiele', test: () => true },
  { id: 'early', label: '1–10', test: (n: number) => n <= 10 },
  { id: 'late', label: '11–20', test: (n: number) => n > 10 },
  { id: 'mb', label: 'Matchbälle', test: () => true },
] as const

export default function Games() {
  const data = useData((s) => s.data)!
  const open = useGameModal((s) => s.open)
  const [q, setQ] = useState('')
  const [show, setShow] = useState<number | 'all'>('all')
  const [winner, setWinner] = useState<Player | 'all'>('all')
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('all')
  const [onlyMedia, setOnlyMedia] = useState(false)

  const games = useMemo(() => allGames(data), [data])
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const r = RANGES.find((x) => x.id === range)!
    return games.filter(
      ({ show: s, game: g }) =>
        (show === 'all' || s.number === show) &&
        (winner === 'all' || g.winner === winner) &&
        r.test(g.nr) &&
        (range !== 'mb' || g.matchball) &&
        (!onlyMedia || g.media?.length) &&
        (!needle || g.name!.toLowerCase().includes(needle) || g.category?.toLowerCase().includes(needle) || g.replaced?.toLowerCase().includes(needle)),
    )
  }, [games, q, show, winner, range, onlyMedia])

  const count = { dennis: filtered.filter((x) => x.game.winner === 'dennis').length, daniel: filtered.filter((x) => x.game.winner === 'daniel').length }
  const select = 'rounded-xl border border-line bg-card-solid px-3 py-2 text-sm text-ink outline-none focus:border-gold'

  return (
    <Section kicker="Archiv" title={`Alle ${games.length} Spiele`}>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Spiel suchen …" className={`${select} w-full pl-9`} />
        </div>
        <select value={show} onChange={(e) => setShow(e.target.value === 'all' ? 'all' : Number(e.target.value))} className={select} aria-label="Show">
          <option value="all">Alle Shows</option>
          {data.shows.map((s) => (
            <option key={s.number} value={s.number}>
              {s.label} ({year(s.dates[0])})
            </option>
          ))}
        </select>
        <select value={winner} onChange={(e) => setWinner(e.target.value as Player | 'all')} className={select} aria-label="Sieger">
          <option value="all">Beide Sieger</option>
          <option value="dennis">Dennis</option>
          <option value="daniel">Daniel</option>
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value as typeof range)} className={select} aria-label="Wertigkeit">
          {RANGES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setOnlyMedia((v) => !v)}
          className={`${select} flex items-center gap-1.5 ${onlyMedia ? 'border-gold text-gold' : ''}`}
          aria-pressed={onlyMedia}
        >
          <ImageIcon size={15} /> mit Medien
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm text-ink-2">
        <span>{filtered.length} Treffer</span>
        <span className="flex items-center gap-1.5">
          <PlayerDot p="dennis" size={8} /> {count.dennis}
        </span>
        <span className="flex items-center gap-1.5">
          <PlayerDot p="daniel" size={8} /> {count.daniel}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(({ show: s, game: g }) => (
          <button
            key={`${s.number}-${g.nr}`}
            onClick={() => open(s.number, g.nr)}
            className="card flex items-center gap-3 p-3 text-left transition hover:border-gold/50"
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-lg text-white"
              style={{ background: `var(--${g.winner})` }}
              title={`${g.points} Punkte`}
            >
              {g.nr}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-semibold">{g.name}</span>
                {g.media?.length ? <ImageIcon size={13} className="shrink-0 text-gold" /> : null}
              </span>
              <span className="block truncate text-xs text-ink-3">
                {s.label} · {year(s.dates[0])} · {NAMES[g.winner!]}
                {g.matchball ? ` · ${g.matchball.n}. Matchball` : ''}
              </span>
            </span>
          </button>
        ))}
      </div>
      {!filtered.length && <div className="card mt-3 p-8 text-center text-ink-3">Keine Spiele gefunden.</div>}
    </Section>
  )
}
