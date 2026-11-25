import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

let server: MongoMemoryServer | null = null;

export async function startTestDatabase(): Promise<void> {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri();
  await connectToDatabase();
}

export async function stopTestDatabase(): Promise<void> {
  await disconnectFromDatabase();
  if (server) {
    await server.stop();
    server = null;
  }
}

export async function clearTestDatabase(): Promise<void> {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}
