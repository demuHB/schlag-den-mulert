import type { Game, Player, SdmData, Show } from '../types'

export const PLAYERS: Player[] = ['dennis', 'daniel']
const idx = (p: Player) => (p === 'dennis' ? 0 : 1)
const zero = () => ({ dennis: 0, daniel: 0 })

export const playedGames = (s: Show) => s.games.filter((g) => g.played && g.winner)
export const allGames = (d: SdmData) => d.shows.flatMap((s) => playedGames(s).map((g) => ({ show: s, game: g })))

/** Punkte, die nach Spiel n noch vergeben werden können */
export const remainingAfter = (n: number) => {
  let r = 0
  for (let i = n + 1; i <= 20; i++) r += i
  return r
}

/** Spiel, mit dem die Show entschieden war (Vorsprung > Restpunkte) */
export function decidedAt(s: Show) {
  for (const g of playedGames(s)) {
    if (g.score && Math.abs(g.score[0] - g.score[1]) > remainingAfter(g.nr)) return g.nr
  }
  return playedGames(s).at(-1)?.nr ?? 20
}

/** Größter Rückstand, den der Showsieger im Laufe der Show hatte */
export function comeback(s: Show) {
  if (!s.winner) return { deficit: 0, atGame: 0 }
  const w = idx(s.winner)
  let deficit = 0
  let atGame = 0
  for (const g of playedGames(s)) {
    const d = g.score![1 - w] - g.score![w]
    if (d > deficit) {
      deficit = d
      atGame = g.nr
    }
  }
  return { deficit, atGame }
}

export function totals(d: SdmData) {
  const shows = zero()
  const games = zero()
  const points = zero()
  for (const s of d.shows) if (s.winner) shows[s.winner]++
  for (const { game } of allGames(d)) {
    games[game.winner!]++
    points[game.winner!] += game.points
  }
  const duration = d.shows.reduce((a, s) => a + (s.durationSec ?? 0), 0)
  return { shows, games, points, duration, gameCount: games.dennis + games.daniel }
}

/** Siege pro Spielnummer 1–20 */
export function byPosition(d: SdmData) {
  const rows = Array.from({ length: 20 }, (_, i) => ({ nr: i + 1, dennis: 0, daniel: 0 }))
  for (const { game } of allGames(d)) rows[game.nr - 1][game.winner!]++
  return rows
}

/** Längste Serien gewonnener Spiele in Folge (chronologisch über alle Shows) */
export function streaks(d: SdmData) {
  const best: Record<Player, { len: number; from?: { show: Show; game: Game }; to?: { show: Show; game: Game } }> = {
    dennis: { len: 0 },
    daniel: { len: 0 },
  }
  let cur: Player | null = null
  let len = 0
  let from: { show: Show; game: Game } | undefined
  for (const item of allGames(d)) {
    const w = item.game.winner!
    if (w === cur) len++
    else {
      cur = w
      len = 1
      from = item
    }
    if (len > best[w].len) best[w] = { len, from, to: item }
  }
  return best
}

export type MbStatus = 'versenkt' | 'verpasst' | 'abgewehrt'
/** Matchball-Bilanz: wer hatte ihn (versenkt/verpasst), wer hat abgewehrt */
export function matchballs(d: SdmData) {
  const res = { dennis: { versenkt: 0, verpasst: 0, abgewehrt: 0 }, daniel: { versenkt: 0, verpasst: 0, abgewehrt: 0 } }
  let total = 0
  for (const s of d.shows)
    for (const g of s.games) {
      if (!g.matchball) continue
      total++
      for (const p of PLAYERS) {
        const st = g.matchball[p] as MbStatus | null
        if (st && st in res[p]) res[p][st]++
      }
    }
  return { ...res, total }
}

/** Wiederkehrende Spiele (gleiche Kategorie mehrfach gespielt) */
export function recurring(d: SdmData) {
  const map = new Map<string, { name: string; dennis: number; daniel: number; items: { show: Show; game: Game }[] }>()
  for (const item of allGames(d)) {
    const key = item.game.category ?? item.game.name!
    const e = map.get(key) ?? { name: key, dennis: 0, daniel: 0, items: [] }
    e[item.game.winner!]++
    e.items.push(item)
    map.set(key, e)
  }
  return [...map.values()].filter((e) => e.items.length > 1).sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name))
}

/** Kumulierte Punkte/Spiele über alle Shows hinweg (für die "ewige Tabelle") */
export function cumulative(d: SdmData) {
  const pts = zero()
  const wins = zero()
  return d.shows.map((s) => {
    for (const g of playedGames(s)) pts[g.winner!] += g.points
    if (s.winner) wins[s.winner]++
    return { show: s, points: { ...pts }, wins: { ...wins } }
  })
}

/** Siegquote früh (1–10) vs. spät (11–20) */
export function halves(d: SdmData) {
  const early = zero()
  const late = zero()
  for (const { game } of allGames(d)) (game.nr <= 10 ? early : late)[game.winner!]++
  return { early, late }
}

export function milestones(d: SdmData) {
  const out: { show: Show; game: Game; text: string }[] = []
  for (const s of d.shows) for (const g of s.games) if (g.note) out.push({ show: s, game: g, text: g.note })
  return out
}

export function replacedGames(d: SdmData) {
  return d.shows.flatMap((s) => s.games.filter((g) => g.replaced).map((g) => ({ show: s, game: g })))
}

export function mediaCount(d: SdmData) {
  return d.shows.reduce((a, s) => a + s.games.reduce((b, g) => b + (g.media?.length ?? 0), 0), 0)
}
