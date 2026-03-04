const { Redis } = require('ioredis');
require('dotenv').config();
const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
redis.on('error', (err) => console.error('[Redis]', err.message));
module.exports = redis;
