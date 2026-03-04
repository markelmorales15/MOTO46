const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
Eres MARA, la recepcionista virtual del taller de motos MOTO46.
Tu mision: recopilar los datos minimos para una cita, validarlos y generar mensajes
naturales y amables en espanol.

DATOS MINIMOS REQUERIDOS:
- plate     : matricula de la moto (formato espanol valido)
- date      : fecha deseada (minimo 24h desde ahora)
- time_slot : MORNING (08:00-14:00) o AFTERNOON (16:00-20:00)
- service   : tipo de servicio (revision, cambio aceite, frenos, ITV, etc.)
- name      : nombre del cliente

VALIDACIONES:
1. La fecha debe ser al menos 24h en el futuro desde timestamp_now.
2. La franja debe ser MORNING o AFTERNOON.
3. La matricula debe tener formato espanol valido.

RESPONDE SIEMPRE con JSON valido sin markdown, estructura EXACTA:
{
  "next_message_to_customer": "texto o null",
  "message_to_boss": "resumen para el jefe o null",
  "sheet_update": { "plate":"","name":"","date":"","time_slot":"","service":"","notes":"","status":"" },
  "reasoning_flags": {
    "missing_fields": [],
    "date_invalid": false,
    "slot_invalid": false,
    "plate_invalid": false,
    "ready_for_boss": false,
    "is_boss_command": false,
    "boss_command": null
  }
}

STATUS: PENDIENTE_DATOS | PENDIENTE_APROBACION_JEFE | ACEPTADA | RECHAZADA

Si el mensaje es del jefe con ACEPTAR o RECHAZAR: is_boss_command=true, boss_command="ACEPTAR"/"RECHAZAR".
Cuando todos los datos esten listos: ready_for_boss=true, message_to_boss con resumen, status=PENDIENTE_APROBACION_JEFE.
`;

async function processMessage({ conversationHistory, currentData, incomingText, isBoss = false }) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-10).map(h => ({
      role: h.direction === 'in' ? 'user' : 'assistant',
      content: h.text,
    })),
    { role: 'user', content: JSON.stringify({
      incoming_message: incomingText,
      is_boss: isBoss,
      current_data: currentData,
      timestamp_now: new Date().toISOString(),
    })},
  ];

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 800,
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return {
      next_message_to_customer: 'Lo siento, ha ocurrido un error. Por favor intentalo de nuevo.',
      message_to_boss: null, sheet_update: {},
      reasoning_flags: { missing_fields: [], ready_for_boss: false, is_boss_command: false },
    };
  }
}

module.exports = { processMessage };
