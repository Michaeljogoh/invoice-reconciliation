import { drizzle } from 'drizzle-orm/postgres-js';
import postgres = require('postgres');
import * as schema from './schema';
import { ConfigService } from '@nestjs/config';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let dbClient: postgres.Sql | null = null;

export function getDatabaseClient(configService: ConfigService) {
  if (dbClient) return dbClient;

  const databaseUrl = configService.get<string>('DATABASE_URL');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  dbClient = postgres(databaseUrl, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return dbClient;
}

export function getDatabase(configService: ConfigService) {
  if (dbInstance) return dbInstance;

  const client = getDatabaseClient(configService);
  dbInstance = drizzle(client, { schema });

  return dbInstance;
}

export async function closeDatabase() {
  if (dbClient) {
    await dbClient.end();
    dbClient = null;
    dbInstance = null;
  }
}

export { schema };