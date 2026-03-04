const express = require('express');
const { requests: reqDb, outbox: outboxDb } = require('../db/outbox');
require('dotenv').config();

const router = express.Router();

router.get('/requests', (req, res) => {
  try { res.json(reqDb.list(req.query.status || null)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/requests/:id', (req, res) => {
  const r = reqDb.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});

router.patch('/requests/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status requerido' });
  reqDb.setStatus(req.params.id, status);
  res.json({ ok: true });
});

router.get('/outbox', (req, res) => res.json(outboxDb.getAll(req.query.status || null)));

router.post('/outbox/:id/retry', (req, res) => {
  outboxDb.retry(req.params.id);
  res.json({ ok: true });
});

router.get('/settings', (req, res) => res.json({
  boss_phones:    process.env.BOSS_PHONES    || '',
  slot_morning:   process.env.SLOT_MORNING   || '08:00-14:00',
  slot_afternoon: process.env.SLOT_AFTERNOON || '16:00-20:00',
  template_name:  process.env.WA_TEMPLATE_NAME || '',
  sheet_name:     process.env.SHEET_NAME     || 'Citas',
}));

module.exports = router;
