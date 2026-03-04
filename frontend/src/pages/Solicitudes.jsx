import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getRequests } from '../api'
import StatusBadge from '../components/StatusBadge'

const STATUSES = ['','PENDIENTE_DATOS','PENDIENTE_APROBACION_JEFE','ACEPTADA','RECHAZADA']

export default function Solicitudes() {
  const [filter, setFilter] = useState('')
  const { data=[], isLoading, refetch } = useQuery({
    queryKey: ['requests', filter],
    queryFn:  () => getRequests(filter || undefined),
    refetchInterval: 15_000,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Solicitudes de Cita</h1>
        <div className="flex gap-3">
          <select value={filter} onChange={e=>setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm">
            {STATUSES.map(s=><option key={s} value={s}>{s||'Todos los estados'}</option>)}
          </select>
          <button onClick={()=>refetch()}
            className="bg-brand-purple text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-800 transition">
            Actualizar
          </button>
        </div>
      </div>
      {isLoading ? <div className="text-center py-20 text-gray-400">Cargando...</div> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-brand-black text-white">
                {['ID','Matricula','Nombre','Telefono','Fecha','Franja','Servicio','Estado','Actualizado',''].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(r=>(
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-gray-400">#{r.id}</td>
                  <td className="px-4 py-3 font-bold text-brand-purple">{r.raw_data?.plate||'—'}</td>
                  <td className="px-4 py-3 text-sm">{r.raw_data?.name||'—'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{r.phone}</td>
                  <td className="px-4 py-3 text-sm">{r.raw_data?.date||'—'}</td>
                  <td className="px-4 py-3 text-sm">{r.raw_data?.time_slot||'—'}</td>
                  <td className="px-4 py-3 text-sm">{r.raw_data?.service||'—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status}/></td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(r.updated_at*1000).toLocaleString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/solicitud/${r.id}`} className="text-brand-purple font-semibold text-sm hover:underline">Ver →</Link>
                  </td>
                </tr>
              ))}
              {data.length===0&&(
                <tr><td colSpan={10} className="px-4 py-16 text-center text-gray-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
