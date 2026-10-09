export type Player = 'dennis' | 'daniel'

export interface Media {
  id: string
  type: string
  size: number
  caption: string | null
}

export interface Matchball {
  n: number
  dennis: string | null
  daniel: string | null
}

export interface Game {
  nr: number
  points: number
  name: string | null
  replaced: string | null
  played: boolean
  score: [number, number] | null
  winner: Player | null
  matchball: Matchball | null
  note: string | null
  globalNr?: number
  category?: string
  media?: Media[]
}

export interface Show {
  number: number
  label: string
  dates: string[]
  durationSec: number | null
  durationParts: number[] | null
  daysSincePrevious: number | null
  mulertExpress: number | null
  trivias: number | null
  games: Game[]
  final: [number, number]
  winner: Player | null
  gamesPlayed: number
}

export interface SdmData {
  generated: string
  players: Record<Player, string>
  shows: Show[]
}
