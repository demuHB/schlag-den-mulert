import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, Clock, Gamepad2, Target, Trophy } from 'lucide-react'
import { useData } from '../store/useData'
import { cumulative, matchballs, totals } from '../lib/stats'
import { NAMES, dateRange, duration, year } from '../lib/format'
import { Kpi, Legend, PlayerDot, Score, Section, VersusBar } from '../components/ui'
import { LineChart } from '../components/charts'
import type { Player } from '../types'

export default function Overview() {
  const data = useData((s) => s.data)!
  const t = useMemo(() => totals(data), [data])
  const mb = useMemo(() => matchballs(data), [data])
  const cum = useMemo(() => cumulative(data), [data])
  const last = data.shows.at(-1)!
  const leader: Player | null = t.shows.dennis > t.shows.daniel ? 'dennis' : t.shows.daniel > t.shows.dennis ? 'daniel' : null

  return (
    <div>
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card relative overflow-hidden px-5 py-8 text-center sm:px-10 sm:py-10"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_220px_at_50%_0%,rgba(251,191,36,0.18),transparent_70%)]" />
        <img src="./logo.webp" alt="Schlag den Mulert" className="relative mx-auto w-full max-w-[360px] drop-shadow-[0_10px_40px_rgba(245,158,11,0.35)]" />
        <p className="relative mt-1 font-display text-lg uppercase tracking-wider text-gold-gradient sm:text-xl">Ruhm, Ehre und 10 Euro</p>

        <div className="relative mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          {(['dennis', null, 'daniel'] as const).map((p) =>
            p === null ? (
              <div key="vs" className="text-center">
                <div className="label">Shows</div>
                <div className="font-display text-6xl tabular sm:text-8xl">
                  <span style={{ color: 'var(--dennis)' }}>{t.shows.dennis}</span>
                  <span className="mx-2 text-ink-3">:</span>
                  <span style={{ color: 'var(--daniel)' }}>{t.shows.daniel}</span>
                </div>
              </div>
            ) : (
              <div key={p} className={p === 'dennis' ? 'text-right' : 'text-left'}>
                <div className={`flex items-center gap-2 ${p === 'dennis' ? 'justify-end' : ''}`}>
                  <PlayerDot p={p} size={12} />
                  <span className="font-display text-2xl uppercase tracking-wide sm:text-4xl">{NAMES[p]}</span>
                </div>
                <div className="mt-1 text-xs text-ink-2 sm:text-sm">
                  {t.games[p]} Spiele · {t.points[p]} Punkte
                </div>
                {leader === p && <div className="chip mt-2 bg-gold/15 text-gold">👑 Tabellenführer</div>}
              </div>
            ),
          )}
        </div>
        <div className="relative mx-auto mt-6 max-w-xl">
          <div className="label mb-2">Gewonnene Spiele</div>
          <VersusBar a={t.games.dennis} b={t.games.daniel} height={12} />
        </div>
      </motion.section>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Trophy size={13} />} label="Shows" value={data.shows.length} sub={`${year(data.shows[0].dates[0])} – ${year(last.dates.at(-1))}`} />
        <Kpi icon={<Gamepad2 size={13} />} label="Spiele" value={t.gameCount} sub={`${t.points.dennis + t.points.daniel} Punkte vergeben`} />
        <Kpi icon={<Clock size={13} />} label="Spielzeit" value={`${Math.round(t.duration / 3600)} h`} sub="reine Showdauer (bekannt)" />
        <Kpi icon={<Target size={13} />} label="Matchbälle" value={mb.total} sub={`${mb.dennis.versenkt + mb.daniel.versenkt} verwandelt`} />
      </div>

      {/* Ewige Tabelle */}
      <Section kicker="Alle Shows kumuliert" title="Das ewige Punkte-Rennen" right={<Legend />}>
        <div className="card p-4">
          <LineChart
            labels={cum.map((c) => c.show.label)}
            series={{ dennis: cum.map((c) => c.points.dennis), daniel: cum.map((c) => c.points.daniel) }}
            xTick={(l) => l.replace('SdM ', '')}
            tooltip={(i) => (
              <>
                <div className="font-semibold text-ink">
                  nach {cum[i].show.label} ({year(cum[i].show.dates[0])})
                </div>
                {(['dennis', 'daniel'] as const).map((p) => (
                  <div key={p} className="mt-1 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <PlayerDot p={p} size={8} /> {NAMES[p]}
                    </span>
                    <span className="tabular font-semibold text-ink">
                      {cum[i].points[p]} P · {cum[i].wins[p]} Shows
                    </span>
                  </div>
                ))}
              </>
            )}
          />
        </div>
      </Section>

      {/* Timeline */}
      <Section kicker="Historie" title="Alle Shows" right={<Link to="/shows" className="text-sm font-semibold text-gold hover:underline">Details →</Link>}>
        <ol className="relative space-y-3 border-l border-line pl-5 sm:pl-6">
          {[...data.shows].reverse().map((s) => (
            <li key={s.number} className="relative">
              <span
                className="absolute -left-[27px] top-4 h-3 w-3 rounded-full ring-4 ring-bg sm:-left-[31px]"
                style={{ background: `var(--${s.winner})` }}
              />
              <Link to={`/shows/${s.number}`} className="card flex flex-wrap items-center gap-x-4 gap-y-1 p-3 transition hover:border-gold/50 sm:p-4">
                <span className="font-display text-xl uppercase tracking-wide">{s.label}</span>
                <span className="flex items-center gap-1 text-sm text-ink-2">
                  <CalendarDays size={14} /> {dateRange(s.dates)}
                </span>
                <span className="ml-auto flex items-center gap-3">
                  <span className="hidden text-xs text-ink-3 sm:inline">{duration(s.durationSec)}</span>
                  <Score score={s.final} winner={s.winner} className="text-xl" />
                  <span className="chip" style={{ background: `color-mix(in srgb, var(--${s.winner}) 18%, transparent)`, color: 'var(--ink)' }}>
                    {s.winner && NAMES[s.winner]}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  )
}
