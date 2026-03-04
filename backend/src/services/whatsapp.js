const axios = require('axios');
const { outbox: outboxDb } = require('../db/outbox');
require('dotenv').config();

const BASE    = `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}`;
const HEADERS = () => ({ Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}` });

async function sendText(to, body) {
  return _send(to, { messaging_product: 'whatsapp', to, type: 'text', text: { body } }, 'text');
}

async function sendTemplate(to, templateName, langCode = 'es', components = []) {
  return _send(to, {
    messaging_product: 'whatsapp', to, type: 'template',
    template: { name: templateName, language: { code: langCode }, components }
  }, 'template');
}

async function _send(to, payload, type) {
  try {
    const r = await axios.post(`${BASE}/messages`, payload, { headers: HEADERS() });
    return { ok: true, data: r.data };
  } catch (err) {
    const status = err.response?.status;
    if (status === 429 || (status >= 500 && status < 600)) {
      outboxDb.push(to, payload, type);
      console.warn(`[WA] ${status} encolado en outbox para ${to}`);
      return { ok: false, queued: true };
    }
    console.error('[WA] Error no recuperable:', err.response?.data || err.message);
    return { ok: false, error: err.message };
  }
}

function withinCustomerWindow(lastInboundMs) {
  return lastInboundMs && (Date.now() - Number(lastInboundMs)) < 23.5 * 3600 * 1000;
}

module.exports = { sendText, sendTemplate, withinCustomerWindow };
