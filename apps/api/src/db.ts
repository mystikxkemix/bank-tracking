import { MongoClient, type Db } from 'mongodb';
import { config } from './config';

let client: MongoClient | null = null;
let database: Db | null = null;

export async function connectDb(): Promise<Db> {
  client = new MongoClient(config.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  database = client.db(config.MONGODB_DB);
  return database;
}

/** Returns the connected database. Collections getters in each feature's model.ts call this lazily. */
export function getDb(): Db {
  if (!database) {
    throw new Error('Database not connected: call connectDb() first');
  }
  return database;
}

export async function closeDb(): Promise<void> {
  await client?.close();
  client = null;
  database = null;
}
