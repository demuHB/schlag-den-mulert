import { create } from 'zustand'

interface Sel {
  show: number
  game: number
}

export const useGameModal = create<{ sel: Sel | null; open: (show: number, game: number) => void; close: () => void }>((set) => ({
  sel: null,
  open: (show, game) => set({ sel: { show, game } }),
  close: () => set({ sel: null }),
}))
