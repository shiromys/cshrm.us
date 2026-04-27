import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Schema = typeof schema;

// Lazy init — avoids "POSTGRES_URL is required" error during Next.js build-time static analysis
let _db: PostgresJsDatabase<Schema> | null = null;

function getDb(): PostgresJsDatabase<Schema> {
  if (!_db) {
    const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "";
    if (!connectionString) {
      throw new Error("POSTGRES_URL or DATABASE_URL environment variable is required");
    }
    const client = postgres(connectionString, { max: 10 });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export const db = new Proxy({} as PostgresJsDatabase<Schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<Schema>];
  },
});

export * from "./schema";
export { schema };
