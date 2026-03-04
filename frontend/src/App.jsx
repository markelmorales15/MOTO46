import { Routes, Route, NavLink } from 'react-router-dom'
import Solicitudes      from './pages/Solicitudes'
import DetalleSolicitud from './pages/DetalleSolicitud'
import Outbox           from './pages/Outbox'
import Ajustes          from './pages/Ajustes'

const NAV = [
  { to:'/',        label:'Solicitudes' },
  { to:'/outbox',  label:'Outbox' },
  { to:'/ajustes', label:'Ajustes' },
]

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-brand-black text-white px-6 py-4 flex items-center gap-4 shadow-lg">
        <span className="font-black text-xl tracking-widest text-brand-lime">MOTO46</span>
        <span className="text-xs text-brand-gray uppercase tracking-widest">Panel de Citas</span>
        <nav className="ml-auto flex gap-1">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/'}
              className={({isActive}) =>
                `text-sm px-4 py-2 rounded-lg transition ${isActive
                  ? 'bg-brand-purple text-white font-semibold'
                  : 'text-brand-gray hover:bg-white/10 hover:text-white'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Routes>
          <Route path="/"              element={<Solicitudes />} />
          <Route path="/solicitud/:id" element={<DetalleSolicitud />} />
          <Route path="/outbox"        element={<Outbox />} />
          <Route path="/ajustes"       element={<Ajustes />} />
        </Routes>
      </main>
    </div>
  )
}
