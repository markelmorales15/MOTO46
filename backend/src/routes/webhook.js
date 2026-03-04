const express = require('express');
const { queue } = require('../queue/processor');
require('dotenv').config();

const router      = express.Router();
const BOSS_PHONES = new Set(
  (process.env.BOSS_PHONES || '').split(',').map(p => p.trim()).filter(Boolean)
);

router.get('/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    console.log('[Webhook] Verificado');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/whatsapp', async (req, res) => {
  res.sendStatus(200); // ACK inmediato < 1s

  try {
    const messages = req.body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;

    for (const msg of messages) {
      const text = msg.text?.body?.trim();
      if (!text) continue;

      await queue.add('message', {
        wamid:     msg.id,
        from:      msg.from,
        text,
        timestamp: Number(msg.timestamp) * 1000,
        isBoss:    BOSS_PHONES.has(msg.from),
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }
  } catch (err) {
    console.error('[Webhook] Error encolando:', err.message);
  }
});

module.exports = router;
