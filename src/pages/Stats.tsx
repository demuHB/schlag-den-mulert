import { useMemo, useState } from 'react'
import { useData } from '../store/useData'
import { byPosition, comeback, decidedAt, halves, matchballs, recurring, streaks, totals } from '../lib/stats'
import { NAMES, duration, pct, year } from '../lib/format'
import { Legend, PlayerDot, Section, VersusBar } from '../components/ui'
import { HBars, StackedBars } from '../components/charts'
import Heatmap from '../components/Heatmap'
import { useGameModal } from '../store/useGameModal'
import type { Player } from '../types'

const P: Player[] = ['dennis', 'daniel']

export default function Stats() {
  const data = useData((s) => s.data)!
  const open = useGameModal((s) => s.open)
  const t = useMemo(() => totals(data), [data])
  const pos = useMemo(() => byPosition(data), [data])
  const h = useMemo(() => halves(data), [data])
  const mb = useMemo(() => matchballs(data), [data])
  const st = useMemo(() => streaks(data), [data])
  const rec = useMemo(() => recurring(data), [data])
  const [showAllRec, setShowAllRec] = useState(false)

  const shows = data.shows.map((s) => ({ s, cb: comeback(s), dec: decidedAt(s), diff: Math.abs(s.final[0] - s.final[1]) }))

  return (
    <div>
      <Section kicker="Bilanz" title="Kopf an Kopf">
        <div className="card grid gap-5 p-5 sm:grid-cols-3">
          {[
            { label: 'Shows', a: t.shows.dennis, b: t.shows.daniel },
            { label: 'Spiele', a: t.games.dennis, b: t.games.daniel },
            { label: 'Punkte', a: t.points.dennis, b: t.points.daniel },
            { label: 'Spiele 1–10', a: h.early.dennis, b: h.early.daniel },
            { label: 'Spiele 11–20', a: h.late.dennis, b: h.late.daniel },
            { label: 'Matchbälle verwandelt', a: mb.dennis.versenkt, b: mb.daniel.versenkt },
          ].map((r) => (
            <div key={r.label}>
              <div className="label mb-2">{r.label}</div>
              <VersusBar a={r.a} b={r.b} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-end">
          <Legend />
        </div>
      </Section>

      <Section kicker="Wer gewinnt was?" title="Alle Spiele auf einen Blick" right={<Legend />}>
        <div className="card p-4">
          <Heatmap data={data} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-3">
            <span>Spalten = Spielnummer (= Punkte) · Klick öffnet das Spiel</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ink" /> Matchball
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] border border-dashed border-line" /> nicht mehr gespielt
            </span>
          </div>
        </div>
      </Section>

      <Section kicker="Siege nach Spielnummer" title="Früh stark, hinten raus?" right={<Legend />}>
        <div className="card p-4">
          <StackedBars
            rows={pos}
            label={(i) => String(i + 1)}
            tooltip={(i) => (
              <>
                <div className="font-semibold text-ink">
                  Spiel {i + 1} · {i + 1} {i ? 'Punkte' : 'Punkt'}
                </div>
                {P.map((p) => (
                  <div key={p} className="mt-1 flex items-center justify-between gap-4 text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <PlayerDot p={p} size={8} /> {NAMES[p]}
                    </span>
                    <b className="tabular text-ink">
                      {pos[i][p]} ({pct(pos[i][p], pos[i].dennis + pos[i].daniel)} %)
                    </b>
                  </div>
                ))}
              </>
            )}
          />
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section kicker="Nerven aus Stahl" title="Matchbälle">
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="label text-left">
                  <th className="p-3 font-semibold">Spieler</th>
                  <th className="p-3 text-right font-semibold">verwandelt</th>
                  <th className="p-3 text-right font-semibold">vergeben</th>
                  <th className="p-3 text-right font-semibold">abgewehrt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {P.map((p) => (
                  <tr key={p}>
                    <td className="p-3">
                      <span className="flex items-center gap-2 font-semibold">
                        <PlayerDot p={p} /> {NAMES[p]}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular">{mb[p].versenkt}</td>
                    <td className="p-3 text-right tabular">{mb[p].verpasst}</td>
                    <td className="p-3 text-right tabular">{mb[p].abgewehrt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-line p-3 text-xs text-ink-3">
              {mb.total} Matchball-Spiele · Quote verwandelt: Dennis {pct(mb.dennis.versenkt, mb.dennis.versenkt + mb.dennis.verpasst)} %, Daniel{' '}
              {pct(mb.daniel.versenkt, mb.daniel.versenkt + mb.daniel.verpasst)} %
            </div>
          </div>
        </Section>

        <Section kicker="Am Stück" title="Längste Siegesserien">
          <div className="grid gap-3">
            {P.map((p) => (
              <div key={p} className="card flex items-center gap-4 p-4">
                <div className="font-display text-5xl tabular" style={{ color: `var(--${p})` }}>
                  {st[p].len}
                </div>
                <div className="text-sm">
                  <div className="font-semibold">{NAMES[p]} – Spiele in Folge</div>
                  {st[p].from && st[p].to && (
                    <div className="text-ink-2">
                      {st[p].from!.show.label} Spiel {st[p].from!.game.nr} bis {st[p].to!.show.label} Spiel {st[p].to!.game.nr}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section kicker="Wann war's vorbei?" title="Entschieden in Spiel …">
          <div className="card p-4">
            <HBars rows={shows.map(({ s, dec }) => ({ label: s.label, value: dec, sub: `${s.label}: entschieden in Spiel ${dec}` }))} format={(v) => `Spiel ${v}`} />
            <div className="mt-3 text-xs text-ink-3">Ab hier konnte der Gegner rechnerisch nicht mehr aufholen.</div>
          </div>
        </Section>
        <Section kicker="Sitzfleisch" title="Showdauer">
          <div className="card p-4">
            <HBars
              rows={data.shows.filter((s) => s.durationSec).map((s) => ({ label: s.label, value: s.durationSec!, sub: `${year(s.dates[0])}` }))}
              format={(v) => duration(v, true)}
            />
            <div className="mt-3 text-xs text-ink-3">Ohne Shows, deren Dauer noch nicht eingetragen ist.</div>
          </div>
        </Section>
      </div>

      <Section kicker="Aufholjagden" title="Comebacks & Krimis">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="label text-left">
                <th className="p-3 font-semibold">Show</th>
                <th className="p-3 font-semibold">Sieger</th>
                <th className="p-3 text-right font-semibold">Endstand</th>
                <th className="p-3 text-right font-semibold">Abstand</th>
                <th className="p-3 text-right font-semibold">max. Rückstand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...shows]
                .sort((a, b) => b.cb.deficit - a.cb.deficit)
                .map(({ s, cb, diff }) => (
                  <tr key={s.number}>
                    <td className="p-3 font-semibold">{s.label}</td>
                    <td className="p-3">
                      <span className="flex items-center gap-1.5">
                        <PlayerDot p={s.winner} size={8} /> {s.winner && NAMES[s.winner]}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular">{s.final.join(' : ')}</td>
                    <td className="p-3 text-right tabular">{diff}</td>
                    <td className="p-3 text-right tabular">{cb.deficit ? `${cb.deficit} (nach Spiel ${cb.atGame})` : '–'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        kicker="Immer wieder gern"
        title="Dauerbrenner"
        right={
          rec.length > 8 && (
            <button onClick={() => setShowAllRec((v) => !v)} className="text-sm font-semibold text-gold hover:underline">
              {showAllRec ? 'weniger' : `alle ${rec.length}`}
            </button>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(showAllRec ? rec : rec.slice(0, 8)).map((r) => (
            <div key={r.name} className="card p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{r.name}</span>
                <span className="text-xs text-ink-3">{r.items.length}× gespielt</span>
              </div>
              <div className="mt-2">
                <VersusBar a={r.dennis} b={r.daniel} height={8} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.items.map(({ show, game }) => (
                  <button
                    key={`${show.number}-${game.nr}`}
                    onClick={() => open(show.number, game.nr)}
                    className="chip border border-line text-ink-2 hover:border-gold/60"
                    title={game.name ?? ''}
                  >
                    <PlayerDot p={game.winner} size={7} /> {show.label.replace('SdM ', '')}·{game.nr}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
