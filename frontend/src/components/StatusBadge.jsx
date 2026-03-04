const C = {
  PENDIENTE_DATOS:           'bg-yellow-100 text-yellow-800 border-yellow-300',
  PENDIENTE_APROBACION_JEFE: 'bg-blue-100 text-blue-800 border-blue-300',
  ACEPTADA:                  'bg-green-100 text-green-800 border-green-300',
  RECHAZADA:                 'bg-red-100 text-red-800 border-red-300',
  PENDING:                   'bg-yellow-100 text-yellow-800 border-yellow-300',
  SENT:                      'bg-green-100 text-green-800 border-green-300',
  DEAD:                      'bg-red-100 text-red-800 border-red-300',
}
export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${C[status]||'bg-gray-100 text-gray-700 border-gray-300'}`}>
      {status}
    </span>
  )
}
