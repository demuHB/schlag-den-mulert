import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, Gamepad2, Home, LogOut, Moon, Sun, Trophy, Tv } from 'lucide-react'
import { useData } from '../store/useData'
import GameModal from './GameModal'
import { useGameModal } from '../store/useGameModal'

const NAV = [
  { to: '/', label: 'Übersicht', icon: Home },
  { to: '/shows', label: 'Shows', icon: Tv },
  { to: '/spiele', label: 'Spiele', icon: Gamepad2 },
  { to: '/statistik', label: 'Statistik', icon: BarChart3 },
  { to: '/hall-of-fame', label: 'Hall of Fame', icon: Trophy },
]

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'light' ? '#f6f3ee' : '#0d0b16')
    try {
      localStorage.setItem('sdm-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))] as const
}

export default function Layout() {
  const logout = useData((s) => s.logout)
  const [theme, toggle] = useTheme()
  const { pathname } = useLocation()
  const closeModal = useGameModal((s) => s.close)
  useEffect(() => {
    window.scrollTo(0, 0)
    closeModal()
  }, [pathname, closeModal])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex h-14 items-center gap-3">
          <NavLink to="/" className="shrink-0">
            <img src="./logo.webp" alt="Schlag den Mulert" className="h-9 w-auto" />
          </NavLink>
          <nav className="scrollbar-none -mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? 'bg-gold/15 text-gold' : 'text-ink-2 hover:bg-card hover:text-ink'
                  }`
                }
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <button onClick={toggle} className="rounded-full p-2 text-ink-2 hover:bg-card hover:text-ink" aria-label="Farbschema wechseln">
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button onClick={logout} className="rounded-full p-2 text-ink-2 hover:bg-card hover:text-ink" aria-label="Abmelden" title="Abmelden">
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <Outlet />
      <GameModal />
      <footer className="mt-16 text-center text-xs text-ink-3">
        Schlag den Mulert · Es geht um Ruhm, Ehre und 10 Euro
      </footer>
    </div>
  )
}
