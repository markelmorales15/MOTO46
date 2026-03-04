import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRequest, setStatus } from '../api'
import StatusBadge from '../components/StatusBadge'

const STATUSES = ['PENDIENTE_DATOS','PENDIENTE_APROBACION_JEFE','ACEPTADA','RECHAZADA']

export default function DetalleSolicitud() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: req, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn:  () => getRequest(id),
    refetchInterval: 10_000,
  })
  const mutation = useMutation({
    mutationFn: (status) => setStatus(id, status),
    onSuccess:  () => { qc.invalidateQueries(['request', id]); qc.invalidateQueries(['requests']); },
  })

  if (isLoading) return <div className="text-center py-20 text-gray-400">Cargando...</div>
  if (!req)      return <div className="text-center py-20 text-red-400">No encontrado.</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={()=>navigate(-1)} className="text-brand-purple text-sm font-semibold hover:underline">
        ← Volver
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Solicitud <span className="text-brand-purple">#{req.id}</span></h2>
          <StatusBadge status={req.status}/>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div><dt className="text-gray-400 mb-1">Telefono</dt><dd className="font-mono font-semibold">{req.phone}</dd></div>
          {Object.entries(req.raw_data).map(([k,v])=>(
            <div key={k}>
              <dt className="text-gray-400 mb-1 capitalize">{k.replace('_',' ')}</dt>
              <dd className="font-semibold">{String(v)||'—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold mb-4">Historial de conversacion</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(req.history||[]).length===0 && <p className="text-gray-400 text-sm text-center py-4">Sin mensajes</p>}
          {(req.history||[]).map((h,i)=>(
            <div key={i} className={`flex ${h.direction==='out'?'justify-end':'justify-start'}`}>
              <div className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                h.direction==='out'
                  ? 'bg-brand-purple text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}>
                <p>{h.text}</p>
                <p className="text-xs opacity-60 mt-1 text-right">
                  {h.direction==='out'?'MARA':'Cliente'} · {new Date(h.ts).toLocaleTimeString('es-ES')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold mb-4">Cambiar estado manualmente</h3>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s=>(
            <button key={s} onClick={()=>mutation.mutate(s)}
              disabled={req.status===s||mutation.isPending}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                req.status===s
                  ? 'bg-brand-black text-white cursor-default'
                  : 'bg-gray-100 text-gray-700 hover:bg-brand-purple hover:text-white'
              }`}>
              {req.status===s?`✓ ${s}`:s}
            </button>
          ))}
        </div>
        {mutation.isSuccess&&<p className="text-green-600 text-sm mt-2">Estado actualizado</p>}
      </div>
    </div>
  )
}
