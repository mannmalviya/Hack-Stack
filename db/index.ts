import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Keep the connection string server-only. It may point to either Supabase's
// direct Postgres endpoint or its transaction pooler.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

// Supabase's transaction pooler does not support prepared statements, so they
// are disabled here. This setting also works with a direct database connection.
function createClient() {
  return postgres(databaseUrl!, { prepare: false, max: 10 });
}

// Every hot reload re-evaluates this module. Without a cached instance each
// reload opens another pool and never closes the previous one, which exhausts
// Postgres' connection slots after a stretch of editing.
const globalForDb = globalThis as typeof globalThis & {
  hackstackDbClient?: ReturnType<typeof createClient>;
};

const client = globalForDb.hackstackDbClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.hackstackDbClient = client;
}

// Register the complete schema so Drizzle's relational query API can resolve
// the relationships declared in db/schema/index.ts.
export const db = drizzle(client, { schema });

// Export the underlying client for graceful shutdowns and rare raw SQL needs.
export { client as databaseClient };
