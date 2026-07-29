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

function createPool(): Pool | null {
  if (!connectionString) return null;

  const pool = new Pool({
    connectionString,
    ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    // Supabase pooler (PgBouncer) idle-timeouts aggressively — keep our pool lean
    max: 20,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: false,
  });

  return pool;
}

export const db = globalThis.shadownodePgPool ?? createPool();

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

const CONNECTION_TERMINATED_CODES = new Set([
  "57P01",
  "57P02",
  "57P03",
  "08000",
  "08003",
  "08006",
  "08001",
  "08004",
  "53300",
]);

function isConnectionTerminatedError(err: unknown): boolean {
  if (err instanceof Error && "code" in err) {
    const code = String((err as any).code);
    if (CONNECTION_TERMINATED_CODES.has(code)) return true;
    if (err.message.includes("Connection terminated")) return true;
    if (err.message.includes("terminating connection")) return true;
    if (err.message.includes("closed the connection")) return true;
  }
  return false;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  retries = 2,
): Promise<QueryResult<T>> {
  if (!db) {
    throw new Error("DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL must be configured with a PostgreSQL connection string");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await db.query<T>(text, params);
    } catch (err: unknown) {
      const isTerminated = isConnectionTerminatedError(err);
      const isTimeout = err instanceof Error && (err.message.includes("timeout") || err.message.includes("ETIMEDOUT"));

      if ((isTerminated || isTimeout) && attempt < retries) {
        console.warn(`[db] Query attempt ${attempt + 1} failed (${err instanceof Error ? err.message : "unknown"}), retrying...`);
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Unexpected: query exited retry loop without result");
}
