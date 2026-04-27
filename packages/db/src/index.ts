import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Schema = typeof schema;

// Lazy init — avoids "POSTGRES_URL is required" error during Next.js build-time static analysis
let _db: PostgresJsDatabase<Schema> | null = null;

function getDb(): PostgresJsDatabase<Schema> {
  if (!_db) {
    // Use a placeholder during build — postgres connects lazily so this won't fail until a real query runs at runtime
    const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "postgresql://localhost/placeholder";
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
