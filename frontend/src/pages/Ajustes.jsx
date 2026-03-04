import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api'

const FIELDS = [
  { key:'boss_phones',    label:'Telefonos del jefe (allowlist)',   hint:'Sin +, separados por coma', icon:'📱' },
  { key:'slot_morning',   label:'Franja manana',                    hint:'HH:MM-HH:MM (Europe/Madrid)', icon:'🌅' },
  { key:'slot_afternoon', label:'Franja tarde',                     hint:'HH:MM-HH:MM (Europe/Madrid)', icon:'🌇' },
  { key:'template_name',  label:'Plantilla WhatsApp (fuera 24h)',   hint:'Nombre exacto aprobado en Meta', icon:'📄' },
  { key:'sheet_name',     label:'Pestana Google Sheets',            hint:'Nombre exacto de la pestaña', icon:'📊' },
]

export default function Ajustes() {
  const { data, isLoading } = useQuery({ queryKey:['settings'], queryFn: getSettings })
  if (isLoading) return <div className="text-center py-20 text-gray-400">Cargando...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Ajustes del sistema</h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Estos valores se configuran en el <code className="bg-yellow-100 px-1 rounded">.env</code> del backend.
        Editalos y reinicia el servidor.
      </div>
      <div className="space-y-4">
        {FIELDS.map(f=>(
          <div key={f.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{f.icon}</span>
              <span className="font-semibold text-sm text-gray-700">{f.label}</span>
            </div>
            <div className="font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-brand-purple">
              {data?.[f.key]||<span className="text-gray-400 italic">sin configurar</span>}
            </div>
            <p className="text-xs text-gray-400 mt-2">{f.hint}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-bold mb-3">Variables .env del backend</h2>
        <pre className="text-xs bg-gray-900 text-brand-lime rounded-lg p-4 overflow-x-auto leading-relaxed">{`PORT=3001
REDIS_URL=redis://localhost:6379
WA_VERIFY_TOKEN=tu_token
WA_ACCESS_TOKEN=token_permanente_meta
WA_PHONE_NUMBER_ID=id_del_numero
WA_TEMPLATE_NAME=nombre_plantilla_aprobada
GOOGLE_SERVICE_ACCOUNT_JSON=./credentials.json
SPREADSHEET_ID=id_de_la_hoja
SHEET_NAME=Citas
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
BOSS_PHONES=34600000001,34600000002
SLOT_MORNING=08:00-14:00
SLOT_AFTERNOON=16:00-20:00`}</pre>
      </div>
    </div>
  )
}
