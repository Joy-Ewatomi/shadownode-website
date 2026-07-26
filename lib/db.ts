import { Pool, type QueryResult, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var shadownodePgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

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

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  if (!db) {
    throw new Error("DATABASE_URL or POSTGRES_URL must be configured");
  }

  return db.query<T>(text, params);
}
