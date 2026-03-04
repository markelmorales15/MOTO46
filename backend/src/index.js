require('dotenv').config();
const express = require('express');
const morgan  = require('morgan');
const cors    = require('cors');
const webhookRouter = require('./routes/webhook');
const apiRouter     = require('./routes/api');
const { startOutboxWorker } = require('./services/outboxRetry');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use('/webhook', webhookRouter);
app.use('/api',     apiRouter);
app.get('/health',  (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`MOTO46 Backend en http://localhost:${PORT}`);
  startOutboxWorker();
});
