import { useState, type ReactNode } from 'react'
import { useWidth } from '../lib/useWidth'
import type { Player } from '../types'


function niceMax(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  // Stufen, die sich sauber vierteln lassen (Gitterlinien bei 25 %)
  const step = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((s) => v / p <= s)!
  return step * p
}

export function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 90), width - 90)
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[150px] -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-card-solid px-3 py-2 text-xs shadow-2xl"
      style={{ left, top: Math.max(y - 10, 60) }}
    >
      {children}
    </div>
  )
}

export interface Marker {
  i: number
  player: Player
}

const BOTH: Player[] = ['dennis', 'daniel']

/** Liniendiagramm mit zwei Serien (Dennis/Daniel), Crosshair und Tooltip */
export function LineChart({
  labels,
  series,
  height = 260,
  tooltip,
  markers = [],
  xTick = (l) => l,
}: {
  labels: string[]
  series: Record<Player, number[]>
  height?: number
  tooltip: (i: number) => ReactNode
  markers?: Marker[]
  xTick?: (label: string, i: number) => string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 36, r: 14, t: 18, b: 26 }
  const n = labels.length
  const max = niceMax(Math.max(...series.dennis, ...series.daniel))
  const iw = Math.max(0, width - pad.l - pad.r)
  const ih = height - pad.t - pad.b
  const x = (i: number) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * iw)
  const y = (v: number) => pad.t + ih - (v / max) * ih
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const step = Math.ceil(n / Math.max(2, Math.floor(iw / 44)))
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')

  return (
    <div ref={ref} className="relative touch-pan-y select-none" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (n - 1))
            setHover(Math.min(n - 1, Math.max(0, i)))
          }}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="10" fill="var(--ink-3)" className="tabular">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % step === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">
                {xTick(l, i)}
              </text>
            ) : null,
          )}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--ink-3)" strokeDasharray="3 3" />}
          {BOTH.map((p) => (
            <path key={p} d={path(series[p])} fill="none" stroke={`var(--${p})`} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {markers.map((m) => (
            <g key={`${m.i}-${m.player}`}>
              <circle cx={x(m.i)} cy={y(series[m.player][m.i])} r={6.5} fill="var(--bg)" stroke="var(--gold)" strokeWidth={2} />
              <circle cx={x(m.i)} cy={y(series[m.player][m.i])} r={2.5} fill="var(--gold)" />
            </g>
          ))}
          {hover != null &&
            BOTH.map((p) => <circle key={p} cx={x(hover)} cy={y(series[p][hover])} r={4.5} fill={`var(--${p})`} stroke="var(--bg)" strokeWidth={2} />)}
          {BOTH.map((p) => {
            const v = series[p][n - 1]
            const o = series[p === 'dennis' ? 'daniel' : 'dennis'][n - 1]
            const above = v >= o
            return (
              <text key={p} x={x(n - 1) - 8} y={y(v) + (above ? -9 : 15)} textAnchor="end" fontSize="11" fontWeight={700} fill="var(--ink)" className="tabular">
                {v}
              </text>
            )
          })}
        </svg>
      )}
      {hover != null && (
        <Tooltip x={x(hover)} y={Math.min(y(series.dennis[hover]), y(series.daniel[hover]))} width={width}>
          {tooltip(hover)}
        </Tooltip>
      )}
    </div>
  )
}

/** Gestapelte Säulen (Dennis unten, Daniel oben) mit 2px-Abstand */
export function StackedBars({
  rows,
  height = 220,
  tooltip,
  label,
}: {
  rows: { dennis: number; daniel: number }[]
  height?: number
  tooltip: (i: number) => ReactNode
  label: (i: number) => string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 28, r: 4, t: 10, b: 22 }
  const max = niceMax(Math.max(...rows.map((r) => r.dennis + r.daniel)))
  const iw = Math.max(0, width - pad.l - pad.r)
  const ih = height - pad.t - pad.b
  const bw = iw / rows.length
  const barW = Math.max(4, Math.min(28, bw * 0.62))
  const h = (v: number) => (v / max) * ih
  const ticks = [0, 0.5, 1].map((t) => t * max)

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={pad.t + ih - h(t)} y2={pad.t + ih - h(t)} stroke="var(--grid)" />
              <text x={pad.l - 6} y={pad.t + ih - h(t)} dy="0.32em" textAnchor="end" fontSize="10" fill="var(--ink-3)">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = pad.l + bw * i + bw / 2
            const hd = h(r.dennis)
            const ha = h(r.daniel)
            const base = pad.t + ih
            return (
              <g key={i} onPointerEnter={() => setHover(i)} opacity={hover == null || hover === i ? 1 : 0.55}>
                <rect x={pad.l + bw * i} y={pad.t} width={bw} height={ih + pad.b} fill="transparent" />
                {hd > 0 && <rect x={cx - barW / 2} y={base - hd} width={barW} height={hd} rx={Math.min(4, hd / 2)} fill="var(--dennis)" />}
                {ha > 0 && (
                  <rect x={cx - barW / 2} y={base - hd - ha - (hd > 0 ? 2 : 0)} width={barW} height={ha} rx={Math.min(4, ha / 2)} fill="var(--daniel)" />
                )}
                {/* bei schmalen Säulen nur jede zweite Beschriftung (plus die gehoverte) */}
                {(bw >= 18 || i % 2 === 0 || hover === i) && (
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize="10" fill={hover === i ? 'var(--ink)' : 'var(--ink-3)'}>
                    {label(i)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {hover != null && (
        <Tooltip x={pad.l + bw * hover + bw / 2} y={pad.t + ih - h(rows[hover].dennis + rows[hover].daniel)} width={width}>
          {tooltip(hover)}
        </Tooltip>
      )}
    </div>
  )
}

/** Einfache horizontale Balken (eine Serie) */
export function HBars({
  rows,
  format,
  color = 'var(--gold-2)',
}: {
  rows: { label: string; value: number; sub?: string }[]
  format: (v: number) => string
  color?: string
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[64px_1fr] items-center gap-3 text-sm" title={r.sub}>
          <span className="truncate text-ink-2">{r.label}</span>
          <div className="flex items-center gap-2">
            <div className="h-3 rounded-r-[4px]" style={{ width: `${(r.value / max) * 78}%`, background: color }} />
            <span className="tabular whitespace-nowrap text-xs font-semibold text-ink">{format(r.value)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
