const { createClient } = require('redis');

let redisClient = null;
let redisConnected = false;

const isRedisConfigured =
  !!process.env.REDIS_URL ||
  (!!process.env.REDIS_HOST && !!process.env.REDIS_PORT);

const buildRedisOptions = () => {
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
    };
  }

  return {
    socket: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  };
};

const connectRedis = async () => {
  if (!isRedisConfigured) {
    console.warn('Redis not configured. OTP flow will use in-memory fallback.');
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient(buildRedisOptions());

  redisClient.on('error', (error) => {
    redisConnected = false;
    console.error('Redis error:', error.message);
  });

  redisClient.on('connect', () => {
    redisConnected = true;
    console.log('Redis connected successfully');
  });

  await redisClient.connect();
  return redisClient;
};

const getRedisClient = () => redisClient;
const isRedisConnected = () => redisConnected;

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected,
};
