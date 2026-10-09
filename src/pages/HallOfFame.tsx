import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Award, Clock, Flame, Hourglass, Medal, Repeat, Scale, Swords, TrendingUp, Zap } from 'lucide-react'
import { useData } from '../store/useData'
import { allGames, comeback, decidedAt, milestones, replacedGames, streaks } from '../lib/stats'
import { NAMES, dateRange, duration, year } from '../lib/format'
import { PlayerDot, Section } from '../components/ui'
import { useGameModal } from '../store/useGameModal'
import type { Player, Show } from '../types'

function Record({
  icon,
  title,
  value,
  who,
  detail,
  to,
  small,
}: {
  icon: ReactNode
  title: string
  value: ReactNode
  who?: Player | 'both' | null
  detail: ReactNode
  to?: string
  small?: boolean
}) {
  const body = (
    <div className="card relative h-full overflow-hidden p-5 transition hover:border-gold/50">
      <div className="absolute -right-4 -top-4 text-gold/10 [&>svg]:h-24 [&>svg]:w-24">{icon}</div>
      <div className="label flex items-center gap-1.5 text-gold">{title}</div>
      <div className={`mt-2 break-words font-display tabular ${small ? 'text-2xl uppercase' : 'text-4xl'}`}>{value}</div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
        {who === 'both' ? (
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            <PlayerDot p="dennis" /> <PlayerDot p="daniel" /> beide
          </span>
        ) : (
          who && (
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <PlayerDot p={who} /> {NAMES[who]}
            </span>
          )
        )}
        {detail}
      </div>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

export default function HallOfFame() {
  const data = useData((s) => s.data)!
  const open = useGameModal((s) => s.open)
  const by = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, b) => (f(b) > f(a) ? b : a))

  const r = useMemo(() => {
    const shows = data.shows
    const diff = (s: Show) => Math.abs(s.final[0] - s.final[1])
    const biggest = by(shows, diff)
    const closest = by(shows, (s) => -diff(s))
    const bestCb = by(shows, (s) => comeback(s).deficit)
    const earliest = by(shows, (s) => -decidedAt(s))
    const latest = by(shows, (s) => decidedAt(s) + (s.gamesPlayed === 20 ? 1 : 0))
    const withDur = shows.filter((s) => s.durationSec)
    const longest = by(withDur, (s) => s.durationSec!)
    const shortest = by(withDur, (s) => -s.durationSec!)
    const longestBreak = by(shows, (s) => s.daysSincePrevious ?? 0)
    const st = streaks(data)
    const streakP: Player = st.dennis.len >= st.daniel.len ? 'dennis' : 'daniel'
    const mostPoints = by(shows, (s) => Math.max(...s.final))
    const fewestPoints = by(shows, (s) => -Math.min(...s.final))
    const games = allGames(data)
    const firstNamed = games[0]
    return { biggest, closest, bestCb, earliest, latest, longest, shortest, longestBreak, st, streakP, mostPoints, fewestPoints, firstNamed, diff }
  }, [data])

  const notes = milestones(data)
  const replaced = replacedGames(data)
  const winnerOfMax = (s: Show): Player => (s.final[0] > s.final[1] ? 'dennis' : 'daniel')
  const loserOfMin = (s: Show): Player => (s.final[0] < s.final[1] ? 'dennis' : 'daniel')

  return (
    <div>
      <Section kicker="Für die Ewigkeit" title="Hall of Fame">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Record icon={<Swords />} title="Höchster Sieg" value={r.biggest.final.join(':')} who={r.biggest.winner} detail={`${r.biggest.label} · ${r.diff(r.biggest)} Punkte Vorsprung`} to={`/shows/${r.biggest.number}`} />
          <Record icon={<Scale />} title="Knappste Show" value={r.closest.final.join(':')} who={r.closest.winner} detail={`${r.closest.label} · nur ${r.diff(r.closest)} Punkte`} to={`/shows/${r.closest.number}`} />
          <Record
            icon={<TrendingUp />}
            title="Größtes Comeback"
            value={`−${comeback(r.bestCb).deficit}`}
            who={r.bestCb.winner}
            detail={`${r.bestCb.label} · Rückstand nach Spiel ${comeback(r.bestCb).atGame} noch gedreht`}
            to={`/shows/${r.bestCb.number}`}
          />
          <Record
            icon={<Flame />}
            title="Längste Siegesserie"
            value={r.st[r.streakP].len}
            who={r.st.dennis.len === r.st.daniel.len ? 'both' : r.streakP}
            detail={
              r.st.dennis.len === r.st.daniel.len
                ? 'Spiele in Folge · Gleichstand'
                : `Spiele in Folge · ${r.st[r.streakP].from?.show.label} – ${r.st[r.streakP].to?.show.label}`
            }
            to="/statistik"
          />
          <Record icon={<Zap />} title="Am frühesten entschieden" value={`Spiel ${decidedAt(r.earliest)}`} who={r.earliest.winner} detail={r.earliest.label} to={`/shows/${r.earliest.number}`} />
          <Record icon={<Hourglass />} title="Krimi bis zum Schluss" value={`Spiel ${decidedAt(r.latest)}`} who={r.latest.winner} detail={`${r.latest.label} · ${r.latest.final.join(':')}`} to={`/shows/${r.latest.number}`} />
          <Record icon={<Medal />} title="Meiste Punkte in einer Show" value={Math.max(...r.mostPoints.final)} who={winnerOfMax(r.mostPoints)} detail={r.mostPoints.label} to={`/shows/${r.mostPoints.number}`} />
          <Record icon={<Award />} title="Wenigste Punkte in einer Show" value={Math.min(...r.fewestPoints.final)} who={loserOfMin(r.fewestPoints)} detail={r.fewestPoints.label} to={`/shows/${r.fewestPoints.number}`} />
          <Record icon={<Clock />} title="Längste Show" value={duration(r.longest.durationSec, true)} detail={`${r.longest.label} · ${dateRange(r.longest.dates)}`} to={`/shows/${r.longest.number}`} />
          <Record icon={<Clock />} title="Kürzeste Show" value={duration(r.shortest.durationSec, true)} detail={`${r.shortest.label} · ${dateRange(r.shortest.dates)}`} to={`/shows/${r.shortest.number}`} />
          <Record
            icon={<Repeat />}
            title="Längste Pause"
            value={`${r.longestBreak.daysSincePrevious} Tage`}
            detail={`vor ${r.longestBreak.label} (${year(r.longestBreak.dates[0])}) · ≈ ${((r.longestBreak.daysSincePrevious ?? 0) / 365).toFixed(1)} Jahre`}
            to={`/shows/${r.longestBreak.number}`}
          />
          <Record
            icon={<Award />}
            title="Das allererste Spiel"
            value={r.firstNamed.game.name}
            small
            who={r.firstNamed.game.winner}
            detail={`${r.firstNamed.show.label} · ${dateRange(r.firstNamed.show.dates)}`}
            to={`/shows/${r.firstNamed.show.number}`}
          />
        </div>
      </Section>

      <Section kicker="Meilensteine & Trivia" title="Aus dem Logbuch">
        <div className="card divide-y divide-line">
          {notes.map(({ show, game, text }) => (
            <button key={`${show.number}-${game.nr}`} onClick={() => open(show.number, game.nr)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-card sm:p-4">
              <span className="chip shrink-0 bg-gold/15 text-gold">{show.label}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{text}</span>
                <span className="text-xs text-ink-3">
                  Spiel {game.nr}: {game.name}
                </span>
              </span>
              <PlayerDot p={game.winner} />
            </button>
          ))}
        </div>
      </Section>

      {replaced.length > 0 && (
        <Section kicker="Kurzfristig getauscht" title="Ersetzte Spiele">
          <div className="grid gap-2 sm:grid-cols-2">
            {replaced.map(({ show, game }) => (
              <button key={`${show.number}-${game.nr}`} onClick={() => open(show.number, game.nr)} className="card flex items-center gap-3 p-3 text-left hover:border-gold/50">
                <span className="chip shrink-0 border border-line text-ink-2">
                  {show.label} · {game.nr}
                </span>
                <span className="min-w-0 truncate text-sm">
                  <s className="text-ink-3">{game.replaced}</s> → <b>{game.name}</b>
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
