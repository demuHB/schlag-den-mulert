import { useState } from 'react'
import type { SdmData } from '../types'
import { NAMES } from '../lib/format'
import { useGameModal } from '../store/useGameModal'

/** Raster Show × Spielnummer, eingefärbt nach Sieger. Klick öffnet das Spiel. */
export default function Heatmap({ data }: { data: SdmData }) {
  const open = useGameModal((s) => s.open)
  const [hover, setHover] = useState<string | null>(null)
  const cols = Array.from({ length: 20 }, (_, i) => i + 1)

  return (
    <div className="overflow-x-auto scrollbar-none">
      <div className="min-w-[620px]">
        <div className="grid grid-cols-[64px_repeat(20,1fr)] gap-[3px] text-[10px] text-ink-3">
          <div />
          {cols.map((c) => (
            <div key={c} className="text-center tabular">
              {c}
            </div>
          ))}
          {data.shows.map((s) => (
            <div key={s.number} className="contents">
              <div className="flex items-center text-xs font-semibold text-ink-2">{s.label}</div>
              {cols.map((c) => {
                const g = s.games.find((x) => x.nr === c)
                const id = `${s.number}-${c}`
                if (!g?.played || !g.winner)
                  return <div key={c} className="aspect-square rounded-[4px] border border-dashed border-line" title={`${s.label} Spiel ${c}: nicht gespielt`} />
                return (
                  <button
                    key={c}
                    onClick={() => open(s.number, c)}
                    onPointerEnter={() => setHover(id)}
                    onPointerLeave={() => setHover(null)}
                    title={`${s.label} · Spiel ${c}: ${g.name} – ${NAMES[g.winner]}`}
                    className="relative aspect-square rounded-[4px] transition-transform hover:z-10 hover:scale-125"
                    style={{ background: `var(--${g.winner})`, opacity: hover && hover !== id ? 0.75 : 1 }}
                  >
                    {g.matchball && <span className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-white/90" />}
                    {g.media?.length ? <span className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-gold" /> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
