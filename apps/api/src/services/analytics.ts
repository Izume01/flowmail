import { Redis } from '@upstash/redis';

let redisInstance: Redis | null = null;

const getRedis = () => {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisInstance;
};

export const queueTrackingEvent = async (type: 'open' | 'click', emailId: string, projectId: string, metadata: any = {}) => {
  const event = {
    type,
    emailId,
    projectId,
    timestamp: Date.now(),
    ...metadata
  };
  const redis = getRedis();
  await redis.lpush('analytics_queue', JSON.stringify(event));
};
