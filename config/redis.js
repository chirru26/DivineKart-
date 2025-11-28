import redis from 'redis';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis max reconnection attempts reached');
            return new Error('Redis max reconnection attempts');
          }
          return retries * 50;
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('disconnect', () => {
      console.log('⚠️ Redis disconnected');
    });

    await redisClient.connect();

    return redisClient;
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
    // Don't exit - Redis is optional for the app to function
    return null;
  }
};

export const getRedisClient = () => redisClient;

export default redisClient;
