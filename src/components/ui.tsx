import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Player } from '../types'
import { NAMES } from '../lib/format'

const playerColor = (p: Player | null | undefined) => (p ? `var(--${p})` : 'var(--ink-3)')

export function PlayerDot({ p, size = 10 }: { p: Player | null; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: playerColor(p) }} />
}

export function PlayerTag({ p, className = '' }: { p: Player | null; className?: string }) {
  if (!p) return <span className="text-ink-3">–</span>
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-ink ${className}`}>
      <PlayerDot p={p} />
      {NAMES[p]}
    </span>
  )
}

export function Section({ title, kicker, children, right }: { title: string; kicker?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          {kicker && <div className="label mb-1">{kicker}</div>}
          <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Kpi({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card p-4">
      <div className="label flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-3xl tabular sm:text-4xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-2">{sub}</div>}
    </motion.div>
  )
}

/** Zweiseitiger Balken Dennis | Daniel mit Werten an den Enden */
export function VersusBar({ a, b, height = 10, labels = true }: { a: number; b: number; height?: number; labels?: boolean }) {
  const total = a + b || 1
  return (
    <div className="flex items-center gap-2">
      {labels && <span className="w-8 text-right text-sm font-semibold tabular">{a}</span>}
      <div className="flex flex-1 gap-[2px] overflow-hidden rounded-full" style={{ height }}>
        <div className="rounded-l-full" style={{ width: `${(a / total) * 100}%`, background: 'var(--dennis)' }} />
        <div className="rounded-r-full" style={{ width: `${(b / total) * 100}%`, background: 'var(--daniel)' }} />
      </div>
      {labels && <span className="w-8 text-sm font-semibold tabular">{b}</span>}
    </div>
  )
}

export function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-ink-2">
      <span className="flex items-center gap-1.5"><PlayerDot p="dennis" /> Dennis</span>
      <span className="flex items-center gap-1.5"><PlayerDot p="daniel" /> Daniel</span>
    </div>
  )
}

export function Score({ score, winner, className = '' }: { score: [number, number]; winner?: Player | null; className?: string }) {
  return (
    <span className={`tabular font-display ${className}`}>
      <span style={{ color: winner === 'dennis' ? 'var(--dennis)' : undefined }}>{score[0]}</span>
      <span className="mx-1 text-ink-3">:</span>
      <span style={{ color: winner === 'daniel' ? 'var(--daniel)' : undefined }}>{score[1]}</span>
    </span>
  )
}
