import { create } from 'zustand'
import type { SdmData } from '../types'
import { deriveKey, fetchDecrypted, forgetKey, rememberKey, restoreKey } from '../lib/crypto'

type Status = 'init' | 'locked' | 'unlocking' | 'ready'

interface DataState {
  status: Status
  error: string | null
  key: CryptoKey | null
  data: SdmData | null
  restore: () => Promise<void>
  unlock: (password: string) => Promise<void>
  logout: () => void
}

async function load(key: CryptoKey): Promise<SdmData> {
  const buf = await fetchDecrypted(key, './data/sdm.enc')
  return JSON.parse(new TextDecoder().decode(buf))
}

export const useData = create<DataState>((set) => ({
  status: 'init',
  error: null,
  key: null,
  data: null,

  restore: async () => {
    try {
      const key = await restoreKey()
      if (key) {
        const data = await load(key)
        return set({ status: 'ready', key, data })
      }
    } catch {
      forgetKey()
    }
    set({ status: 'locked' })
  },

  unlock: async (password) => {
    set({ status: 'unlocking', error: null })
    try {
      const key = await deriveKey(password)
      const data = await load(key)
      await rememberKey(key)
      set({ status: 'ready', key, data })
    } catch (e) {
      const wrong = e instanceof DOMException && e.name === 'OperationError'
      set({ status: 'locked', error: wrong ? 'Falsches Passwort.' : 'Daten konnten nicht geladen werden.' })
    }
  },

  logout: () => {
    forgetKey()
    set({ status: 'locked', key: null, data: null, error: null })
  },
}))
