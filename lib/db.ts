import {
  Pool,
  type QueryResult,
  type QueryResultRow,
} from "pg"

import dns from "dns"

dns.setDefaultResultOrder("ipv4first")

// ============================================================
// TYPES
// ============================================================

export type DatabasePoolClient = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>

  release: () => void
}

// ============================================================
// GLOBAL POOL
// ============================================================

declare global {
  // eslint-disable-next-line no-var
  var shadownodePgPool: Pool | undefined
}

// ============================================================
// CONNECTION STRING
// ============================================================

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.SUPABASE_DB_URL ||
  process.env.SUPABASE_POSTGRES_URL ||
  (
    process.env.SUPABASE_URL?.startsWith(
      "postgres",
    )
      ? process.env.SUPABASE_URL
      : undefined
  )

// ============================================================
// CREATE POOL
// ============================================================

function createPool(): Pool | null {
  if (!connectionString) {
    return null
  }

  const pool = new Pool({
    connectionString,

    ssl:
      process.env.POSTGRES_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,

    max: 10,

    idleTimeoutMillis: 30000,

    connectionTimeoutMillis: 10000,

    allowExitOnIdle: false,
  })

  return pool
}

// ============================================================
// DATABASE INSTANCE
// ============================================================

export const db =
  globalThis.shadownodePgPool ??
  createPool()

if (
  db &&
  process.env.NODE_ENV !== "production"
) {
  globalThis.shadownodePgPool = db
}

// ============================================================
// DATABASE STATUS HELPERS
// ============================================================

export function isDatabaseConfigured() {
  return Boolean(db)
}

export function isDatabaseConfigurationError(
  error: unknown,
) {
  return (
    error instanceof Error &&
    error.message.includes(
      "must be configured with a PostgreSQL connection string",
    )
  )
}

export function isDatabaseNetworkError(
  error: unknown,
) {
  return (
    error instanceof Error &&
    "code" in error &&
    [
      "ENETUNREACH",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",
    ].includes(
      String(
        (error as { code?: unknown }).code,
      ),
    )
  )
}

// ============================================================
// CONNECTION ERROR DETECTION
// ============================================================

const CONNECTION_TERMINATED_CODES =
  new Set([
    "57P01",
    "57P02",
    "57P03",
    "08000",
    "08003",
    "08006",
    "08001",
    "08004",
    "53300",
  ])

function isConnectionTerminatedError(
  err: unknown,
): boolean {
  if (
    err instanceof Error &&
    "code" in err
  ) {
    const code = String(
      (err as { code?: unknown }).code,
    )

    if (
      CONNECTION_TERMINATED_CODES.has(
        code,
      )
    ) {
      return true
    }

    if (
      err.message.includes(
        "Connection terminated",
      )
    ) {
      return true
    }

    if (
      err.message.includes(
        "terminating connection",
      )
    ) {
      return true
    }

    if (
      err.message.includes(
        "closed the connection",
      )
    ) {
      return true
    }
  }

  return false
}

// ============================================================
// TIMEOUT ERROR DETECTION
// ============================================================

function isTimeoutError(
  err: unknown,
): boolean {
  return (
    err instanceof Error &&
    (
      err.message.includes(
        "timeout",
      ) ||
      err.message.includes(
        "ETIMEDOUT",
      )
    )
  )
}

// ============================================================
// NORMAL QUERY
// ============================================================

export async function query<
  T extends QueryResultRow = QueryResultRow,
>(
  text: string,
  params: unknown[] = [],
  retries = 2,
): Promise<QueryResult<T>> {
  if (!db) {
    throw new Error(
      "DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL must be configured with a PostgreSQL connection string",
    )
  }

  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {
    try {
      return await db.query<T>(
        text,
        params,
      )
    } catch (err: unknown) {
      const isTerminated =
        isConnectionTerminatedError(
          err,
        )

      const isTimeout =
        isTimeoutError(err)

      if (
        (
          isTerminated ||
          isTimeout
        ) &&
        attempt < retries
      ) {
        console.warn(
          `[db] Query attempt ${
            attempt + 1
          } failed (${
            err instanceof Error
              ? err.message
              : "unknown"
          }), retrying...`,
        )

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              200 *
                (attempt + 1),
            ),
        )

        continue
      }

      throw err
    }
  }

  throw new Error(
    "Unexpected: query exited retry loop without result",
  )
}

// ============================================================
// TRANSACTION
// ============================================================

export async function withTransaction<T>(
  callback: (
    client: DatabasePoolClient,
  ) => Promise<T>,
): Promise<T> {
  if (!db) {
    throw new Error(
      "DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL must be configured with a PostgreSQL connection string",
    )
  }

  const client =
    (await (
      db.connect() as unknown as Promise<DatabasePoolClient>
    ))

  try {
    await client.query("BEGIN")

    try {
      const result =
        await callback(client)

      await client.query("COMMIT")

      return result
    } catch (error) {
      try {
        await client.query("ROLLBACK")
      } catch (rollbackError) {
        console.error(
          "[db] Transaction rollback failed",
          rollbackError,
        )
      }

      throw error
    }
  } finally {
    client.release()
  }
}