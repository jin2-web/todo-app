import mongoose from 'mongoose';
import { ConfigurationError } from './errors';
import { logger } from './logger';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

function getCache(): MongooseCache {
  if (!global.mongooseCache) {
    global.mongooseCache = { conn: null, promise: null };
  }
  return global.mongooseCache;
}

/** Connects once per process; the cache survives Next.js dev hot reloads. */
export async function connectToDatabase(): Promise<typeof mongoose> {
  const cache = getCache();
  if (cache.conn) {
    return cache.conn;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new ConfigurationError('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
  }
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { bufferCommands: false });
  }
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    logger.error('MongoDB connection failed', { error });
    throw error;
  }
  return cache.conn;
}

export async function disconnectFromDatabase(): Promise<void> {
  const cache = getCache();
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
