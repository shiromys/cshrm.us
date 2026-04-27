import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "";

// Use connection pooling in production, direct in migrations
const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema });
export * from "./schema";
export { schema };
