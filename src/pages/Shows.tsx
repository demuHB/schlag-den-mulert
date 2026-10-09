import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useData } from '../store/useData'
import { comeback, decidedAt } from '../lib/stats'
import { NAMES, dateRange, duration } from '../lib/format'
import { Score, Section } from '../components/ui'

export default function Shows() {
  const data = useData((s) => s.data)!
  return (
    <Section kicker={`${data.shows.length} Ausgaben`} title="Die Shows">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...data.shows].reverse().map((s, i) => {
          const cb = comeback(s)
          return (
            <motion.div key={s.number} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/shows/${s.number}`} className="card group block overflow-hidden transition hover:border-gold/50">
                <div className="h-1.5" style={{ background: `var(--${s.winner})` }} />
                <div className="p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-3xl uppercase tracking-wide">{s.label}</span>
                    <Score score={s.final} winner={s.winner} className="text-2xl" />
                  </div>
                  <div className="mt-1 text-sm text-ink-2">{dateRange(s.dates)}</div>
                  {/* Mini-Sieger-Streifen der 20 Spiele */}
                  <div className="mt-4 flex gap-[2px]">
                    {s.games.map((g) => (
                      <div
                        key={g.nr}
                        className="h-5 flex-1 rounded-[3px]"
                        style={{ background: g.winner ? `var(--${g.winner})` : 'var(--grid)', opacity: g.winner ? 0.35 + (g.nr / 20) * 0.65 : 1 }}
                        title={`${g.nr}. ${g.name ?? '–'}`}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
                    <span>
                      Sieger <b className="text-ink">{s.winner && NAMES[s.winner]}</b>
                    </span>
                    <span>entschieden in Spiel {decidedAt(s)}</span>
                    {s.durationSec && <span>{duration(s.durationSec, true)}</span>}
                    {cb.deficit > 0 && <span>max. Rückstand {cb.deficit}</span>}
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </Section>
  )
}
