import type { Player } from '../types'

export const NAMES: Record<Player, string> = { dennis: 'Dennis', daniel: 'Daniel' }
export const other = (p: Player): Player => (p === 'dennis' ? 'daniel' : 'dennis')

export function duration(sec: number | null | undefined, short = false) {
  if (sec == null) return '–'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (short) return `${h}:${String(m).padStart(2, '0')} h`
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
export function date(iso: string, withYear = true) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d}. ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`
}

export function dateRange(dates: string[]) {
  if (!dates.length) return '–'
  if (dates.length === 1) return date(dates[0])
  const [a, b] = [dates[0], dates[dates.length - 1]]
  return a.slice(0, 4) === b.slice(0, 4) ? `${date(a, false)} + ${date(b)}` : `${date(a)} + ${date(b)}`
}

export const year = (iso?: string) => iso?.slice(0, 4) ?? ''
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
export const fmtBytes = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)
