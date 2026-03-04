const { Queue, Worker } = require('bullmq');
const redis = require('../redis');
const { processMessage } = require('../services/llm');
const { sendText, sendTemplate, withinCustomerWindow } = require('../services/whatsapp');
const { upsert: sheetsUpsert } = require('../services/sheets');
const { outbox: outboxDb, requests: reqDb } = require('../db/outbox');
require('dotenv').config();

const QUEUE_NAME = 'wa-messages';
const DEDUPE_TTL = 60;
const LOCK_TTL   = 30;

const queue = new Queue(QUEUE_NAME, { connection: redis });

const worker = new Worker(QUEUE_NAME, async (job) => {
  const { wamid, from, text, timestamp, isBoss } = job.data;

  // 1. Deduplicacion
  const dedupeKey = `dedupe:${wamid || 'noid:' + from + ':' + Buffer.from(text).toString('base64').slice(0,16)}`;
  const isNew = await redis.set(dedupeKey, '1', 'EX', DEDUPE_TTL, 'NX');
  if (!isNew) { console.log(`[Processor] Duplicado ignorado`); return; }

  // 2. Lock por telefono
  const lockKey = `lock:phone:${from}`;
  const locked  = await redis.set(lockKey, job.id, 'EX', LOCK_TTL, 'NX');
  if (!locked) {
    await queue.add('message', job.data, { delay: 5000, attempts: 3 });
    console.log(`[Processor] Lock activo para ${from}, reencolado`);
    return;
  }

  try {
    // 3. Cargar estado
    const existing    = reqDb.getByPhone(from);
    const currentData = existing?.raw_data || {};
    const history     = existing?.history  || [];

    // 4. LLM
    const llm = await processMessage({ conversationHistory: history, currentData, incomingText: text, isBoss });
    const { next_message_to_customer, message_to_boss, sheet_update, reasoning_flags } = llm;

    // 5. Comandos del jefe
    if (reasoning_flags?.is_boss_command && isBoss) {
      const pending = reqDb.list('PENDIENTE_APROBACION_JEFE');
      if (pending.length > 0) {
        const target    = pending[0];
        const newStatus = reasoning_flags.boss_command === 'ACEPTAR' ? 'ACEPTADA' : 'RECHAZADA';
        reqDb.setStatus(target.id, newStatus);
        const msg = newStatus === 'ACEPTADA'
          ? `Tu cita en MOTO46 ha sido *confirmada*. Te esperamos el ${target.raw_data.date} (${target.raw_data.time_slot}).`
          : `Lo sentimos, tu solicitud de cita ha sido *rechazada*. Llamanos para buscar otra fecha.`;
        const lastInbound = await redis.get(`lastInbound:${target.phone}`);
        if (withinCustomerWindow(lastInbound)) {
          await sendText(target.phone, msg);
        } else {
          await sendTemplate(target.phone, process.env.WA_TEMPLATE_NAME || 'cita_fuera_ventana');
        }
        await sheetsUpsert({ ...target.raw_data, phone: target.phone, status: newStatus });
      }
      return;
    }

    // 6. Upsert SQLite
    const plate   = sheet_update?.plate || currentData?.plate;
    const savedId = plate
      ? reqDb.upsertByPlate(plate, from, { ...currentData, ...sheet_update })
      : reqDb.upsertByPhone(from, { ...currentData, ...sheet_update });

    reqDb.addHistory(savedId, { direction: 'in',  text });
    if (next_message_to_customer) reqDb.addHistory(savedId, { direction: 'out', text: next_message_to_customer });

    // 7. Google Sheets
    if (Object.keys(sheet_update || {}).length > 0) {
      try { await sheetsUpsert({ ...currentData, ...sheet_update, phone: from, request_id: savedId, wamid }); }
      catch (e) { console.error('[Sheets]', e.message); }
    }

    // 8. Envio al cliente
    if (next_message_to_customer) {
      const lastInbound = await redis.get(`lastInbound:${from}`);
      if (withinCustomerWindow(lastInbound)) {
        await sendText(from, next_message_to_customer);
      } else {
        await sendTemplate(from, process.env.WA_TEMPLATE_NAME || 'cita_fuera_ventana');
      }
    }

    // 9. Notificar al jefe si ready_for_boss
    if (reasoning_flags?.ready_for_boss && message_to_boss) {
      const bosses = (process.env.BOSS_PHONES || '').split(',').map(p => p.trim()).filter(Boolean);
      for (const bp of bosses) {
        await sendText(bp, `Nueva solicitud MOTO46

${message_to_boss}

Responde:
ACEPTAR
RECHAZAR`);
      }
      reqDb.setStatus(savedId, 'PENDIENTE_APROBACION_JEFE');
      await sheetsUpsert({ ...currentData, ...sheet_update, phone: from, status: 'PENDIENTE_APROBACION_JEFE', request_id: savedId });
    }

    // 10. Timestamp ultimo inbound
    await redis.set(`lastInbound:${from}`, timestamp || Date.now(), 'EX', 86400);

  } finally {
    await redis.del(lockKey);
  }
}, { connection: redis, concurrency: 5 });

worker.on('failed', (job, err) => console.error(`[BullMQ] Job ${job?.id} failed:`, err.message));
module.exports = { queue };
