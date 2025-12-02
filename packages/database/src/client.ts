import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// For query purposes
const queryClient = postgres(connectionString);

// Create drizzle database instance with schema
export const db = drizzle(queryClient, { schema });

// Export for direct SQL queries if needed
export { queryClient as postgresClient };

// Type export
export type Database = typeof db;
