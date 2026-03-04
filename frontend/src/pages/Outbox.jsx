import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOutbox, retryOutbox } from '../api'
import StatusBadge from '../components/StatusBadge'

export default function Outbox() {
  const [filter, setFilter] = useState('')
  const qc = useQueryClient()
  const { data=[], isLoading } = useQuery({
    queryKey: ['outbox', filter],
    queryFn:  () => getOutbox(filter || undefined),
    refetchInterval: 20_000,
  })
  const retry = useMutation({ mutationFn: retryOutbox, onSuccess: ()=>qc.invalidateQueries(['outbox']) })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Outbox de mensajes</h1>
          <p className="text-sm text-gray-400 mt-1">
            {data.filter(d=>d.status==='DEAD').length} muertos · {data.filter(d=>d.status==='PENDING').length} pendientes
          </p>
        </div>
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm">
          <option value="">Todos</option>
          <option value="PENDING">PENDING</option>
          <option value="SENT">SENT</option>
          <option value="DEAD">DEAD</option>
        </select>
      </div>
      {isLoading ? <div className="text-center py-20 text-gray-400">Cargando...</div> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-brand-black text-white">
                {['ID','Destinatario','Tipo','Estado','Intentos','Error','Creado',''].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(o=>(
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-gray-400">#{o.id}</td>
                  <td className="px-4 py-3 font-mono text-sm">{o.to_phone}</td>
                  <td className="px-4 py-3 text-sm">{o.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status}/></td>
                  <td className="px-4 py-3 text-center text-sm font-semibold">{o.attempts}</td>
                  <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate" title={o.error||''}>{o.error||'—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(o.created_at*1000).toLocaleString('es-ES')}</td>
                  <td className="px-4 py-3">
                    {o.status!=='SENT'&&(
                      <button onClick={()=>retry.mutate(o.id)} disabled={retry.isPending}
                        className="text-brand-purple text-xs font-semibold hover:underline">
                        Reintentar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.length===0&&(
                <tr><td colSpan={8} className="px-4 py-16 text-center text-gray-400">Sin mensajes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
