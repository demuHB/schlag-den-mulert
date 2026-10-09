import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useData } from './store/useData'
import Layout from './components/Layout'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Shows from './pages/Shows'
import ShowDetail from './pages/ShowDetail'
import Games from './pages/Games'
import Stats from './pages/Stats'
import HallOfFame from './pages/HallOfFame'

export default function App() {
  const status = useData((s) => s.status)
  const restore = useData((s) => s.restore)

  useEffect(() => {
    restore()
  }, [restore])

  if (status === 'init') return <div className="min-h-screen" />
  if (status !== 'ready') return <Login />

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="shows" element={<Shows />} />
          <Route path="shows/:nr" element={<ShowDetail />} />
          <Route path="spiele" element={<Games />} />
          <Route path="statistik" element={<Stats />} />
          <Route path="hall-of-fame" element={<HallOfFame />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
