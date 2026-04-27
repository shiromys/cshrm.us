import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@cloudsourcehrm/db/schema";

type Schema = typeof schema;

// Prevent multiple connections in development (hot reload)
const globalForDb = globalThis as unknown as {
  _pgClient?: ReturnType<typeof postgres>;
  _db?: PostgresJsDatabase<Schema>;
};

// Lazy init — avoids "POSTGRES_URL is required" error during Next.js build-time static analysis
function getDb(): PostgresJsDatabase<Schema> {
  if (!globalForDb._db) {
    // Use a placeholder during build — postgres connects lazily and only fails at actual query time
    const connectionString =
      process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "postgresql://localhost/placeholder";
    const client =
      globalForDb._pgClient ?? postgres(connectionString, { max: 10 });
    if (process.env.NODE_ENV !== "production") globalForDb._pgClient = client;
    globalForDb._db = drizzle(client, { schema });
  }
  return globalForDb._db;
}

export const db = new Proxy({} as PostgresJsDatabase<Schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<Schema>];
  },
});

export { schema };
export * from "@cloudsourcehrm/db/schema";
