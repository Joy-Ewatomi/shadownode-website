import { Pool, type QueryResult, type QueryResultRow } from "pg";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

declare global {
  // eslint-disable-next-line no-var
  var shadownodePgPool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.SUPABASE_DB_URL ||
  process.env.SUPABASE_POSTGRES_URL ||
  (process.env.SUPABASE_URL?.startsWith("postgres") ? process.env.SUPABASE_URL : undefined);

export const db = connectionString
  ? globalThis.shadownodePgPool ?? new Pool({
      connectionString,
      ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    })
  : null;

if (db && process.env.NODE_ENV !== "production") {
  globalThis.shadownodePgPool = db;
}

export function isDatabaseConfigured() {
  return Boolean(db);
}

export function isDatabaseConfigurationError(error: unknown) {
  return error instanceof Error && error.message.includes("must be configured with a PostgreSQL connection string");
}

export function isDatabaseNetworkError(error: unknown) {
  return error instanceof Error && ("code" in error) && ["ENETUNREACH", "ETIMEDOUT", "ECONNREFUSED", "ENOTFOUND"].includes(String(error.code));
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  if (!db) {
    throw new Error("DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL must be configured with a PostgreSQL connection string");
  }

  return db.query<T>(text, params);
}
