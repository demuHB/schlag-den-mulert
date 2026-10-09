import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Loader2 } from 'lucide-react'
import { useData } from '../store/useData'

export default function Login() {
  const { unlock, status, error } = useData()
  const [pw, setPw] = useState('')
  const busy = status === 'unlocking'

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
        <img src="./logo.webp" alt="Schlag den Mulert" className="mx-auto w-full max-w-[340px] drop-shadow-[0_10px_40px_rgba(245,158,11,0.35)]" />
        <p className="mt-2 font-display text-xl tracking-wide text-gold-gradient uppercase">Ruhm, Ehre und 10 Euro</p>
        <form
          className="card mt-8 p-5 text-left"
          onSubmit={(e) => {
            e.preventDefault()
            if (pw) unlock(pw)
          }}
        >
          <label htmlFor="pw" className="label">Passwort</label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                id="pw"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full rounded-xl border border-line bg-card-solid py-2.5 pl-9 pr-3 text-ink outline-none focus:border-gold"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !pw}
              className="rounded-xl bg-gradient-to-r from-gold-2 to-orange px-4 font-semibold text-black disabled:opacity-50"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : 'Los'}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-daniel">{error}</p>}
          <p className="mt-4 text-xs text-ink-3">Einmal anmelden – dieses Gerät merkt sich den Zugang.</p>
        </form>
      </motion.div>
    </div>
  )
}
