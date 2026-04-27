import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@cloudsourcehrm/db/schema";

const connectionString =
  process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "";

if (!connectionString) {
  throw new Error("POSTGRES_URL or DATABASE_URL environment variable is required");
}

// Prevent multiple connections in development (hot reload)
const globalForDb = globalThis as unknown as { _pgClient?: ReturnType<typeof postgres> };

const client = globalForDb._pgClient ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb._pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
export * from "@cloudsourcehrm/db/schema";
