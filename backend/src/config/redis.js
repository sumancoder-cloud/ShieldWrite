const { createClient } = require('redis');

let redisClient = null;
let redisConnected = false;

const isRedisConfigured =
  !!process.env.REDIS_URL ||
  (!!process.env.REDIS_HOST && !!process.env.REDIS_PORT);

const toUpstashRestConfig = (redisUrl) => {
  const parsed = new URL(redisUrl);
  return {
    baseUrl: `https://${parsed.hostname}`,
    token: decodeURIComponent(parsed.password || ''),
  };
};

const createUpstashRestClient = ({ baseUrl, token }) => {
  const request = async (segments) => {
    const path = segments
      .map((part) => encodeURIComponent(String(part)))
      .join('/');

    const response = await fetch(`${baseUrl}/${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Upstash REST error (${response.status}): ${body}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Upstash REST command error: ${data.error}`);
    }

    return data.result;
  };

  return {
    isOpen: true,
    connect: async () => {
      await request(['ping']);
    },
    quit: async () => {},
    setEx: async (key, ttlSeconds, value) => {
      await request(['setex', key, Number(ttlSeconds), value]);
    },
    get: async (key) => request(['get', key]),
    del: async (key) => {
      await request(['del', key]);
    },
  };
};

const buildRedisOptions = () => {
  if (process.env.REDIS_URL) {
    const redisUrl = process.env.REDIS_URL;
    const parsedUrl = new URL(redisUrl);
    const isTls = parsedUrl.protocol === 'rediss:';

    return {
      url: redisUrl,
      socket: {
        tls: isTls,
        servername: parsedUrl.hostname,
        connectTimeout: 10000,
        keepAlive: 5000,
        reconnectStrategy: (retries) => {
          if (retries >= 5) {
            return new Error('Redis reconnect attempts exhausted');
          }
          return Math.min(retries * 200, 2000);
        },
      },
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

const shouldUseUpstashRest = () => {
  const transport = (process.env.REDIS_TRANSPORT || 'auto').toLowerCase();
  if (transport === 'rest') {
    return true;
  }
  if (transport === 'tcp') {
    return false;
  }

  if (!process.env.REDIS_URL) {
    return false;
  }

  try {
    const parsed = new URL(process.env.REDIS_URL);
    return parsed.hostname.endsWith('.upstash.io');
  } catch {
    return false;
  }
};

const connectRedis = async () => {
  if (!isRedisConfigured) {
    throw new Error('Redis is required but not configured. Set REDIS_URL or REDIS_HOST/REDIS_PORT.');
  }

  if (redisClient) {
    return redisClient;
  }

  if (shouldUseUpstashRest()) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL is required for Upstash REST transport.');
    }
    const restConfig = toUpstashRestConfig(process.env.REDIS_URL);
    if (!restConfig.token) {
      throw new Error('Upstash token missing in REDIS_URL.');
    }
    redisClient = createUpstashRestClient(restConfig);
    await redisClient.connect();
    redisConnected = true;
    console.log('Redis connected successfully (Upstash REST transport)');
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
  if (!redisConnected) {
    redisConnected = true;
  }
  return redisClient;
};

const getRedisClient = () => redisClient;
const isRedisConnected = () => redisConnected;

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected,
};
