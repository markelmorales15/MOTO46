const axios = require('axios');
const { outbox: outboxDb } = require('../db/outbox');
require('dotenv').config();

const BASE         = `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}`;
const HEADERS      = () => ({ Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}` });
const MAX_ATTEMPTS = 5;

async function flushOutbox() {
  const pending = outboxDb.getPending();
  for (const item of pending) {
    try {
      await axios.post(`${BASE}/messages`, JSON.parse(item.payload), { headers: HEADERS() });
      outboxDb.markSent(item.id);
      console.log(`[Outbox] Enviado id=${item.id} a ${item.to_phone}`);
    } catch (err) {
      const n = item.attempts + 1;
      if (n >= MAX_ATTEMPTS) {
        outboxDb.markDead(item.id, err.message);
        console.error(`[Outbox] DEAD id=${item.id}:`, err.message);
      } else {
        const delay = Math.min(60_000 * Math.pow(2, n), 3_600_000);
        outboxDb.markRetry(item.id, n, Date.now() + delay, err.message);
        console.warn(`[Outbox] Retry ${n}/${MAX_ATTEMPTS} id=${item.id} en ${delay/1000}s`);
      }
    }
  }
}

function startOutboxWorker() {
  flushOutbox();
  setInterval(flushOutbox, 60_000);
  console.log('[Outbox] Worker iniciado (cada 60s)');
}

module.exports = { startOutboxWorker };
