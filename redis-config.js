// lib/redis-config.js

const IORedis = require('ioredis');

// Read Redis configuration from environment variables.
// 'redis' is the default hostname because that is the service name in the Docker network.
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

console.log(`[Redis Config] Attempting to connect to Redis at ${redisHost}:${redisPort}`);

const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});

connection.on('connect', () => {
  console.log('[Redis Config] Successfully connected to Redis.');
});

connection.on('error', (err) => {
  console.error('[Redis Config] Could not connect to Redis:', err.message);
});

module.exports = connection;