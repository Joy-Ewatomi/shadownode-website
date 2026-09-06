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
// POOL CONFIGURATION
// ============================================================

const poolMax = Number(
  process.env.DB_POOL_MAX || "10",
)

const poolIdleTimeout = Number(
  process.env.DB_IDLE_TIMEOUT_MS || "30000",
)

const poolConnectionTimeout = Number(
  process.env.DB_CONNECTION_TIMEOUT_MS || "5000",
)

// ============================================================
// CREATE POOL
// ============================================================

function createPool(): Pool | null {
  if (!connectionString) {
    return null
  }

  return new Pool({
    connectionString,

    ssl:
      process.env.POSTGRES_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,

    /*
     * Keep the pool deliberately controlled.
     *
     * Increasing this blindly can make Supabase/Postgres
     * connection exhaustion worse rather than better.
     */
    max:
      Number.isFinite(poolMax) &&
      poolMax > 0
        ? Math.min(poolMax, 20)
        : 10,

    /*
     * Connections that have been sitting unused for this
     * long can be released.
     */
    idleTimeoutMillis:
      Number.isFinite(poolIdleTimeout) &&
      poolIdleTimeout >= 1000
        ? poolIdleTimeout
        : 30000,

    /*
     * Do not wait 10+ seconds for a connection when the
     * pool/database is unavailable.
     */
    connectionTimeoutMillis:
      Number.isFinite(
        poolConnectionTimeout,
      ) &&
      poolConnectionTimeout >= 1000
        ? Math.min(
            poolConnectionTimeout,
            10000,
          )
        : 5000,

    allowExitOnIdle: false,

    /*
     * Recycle connections periodically.
     *
     * This helps prevent long-lived stale connections from
     * accumulating in development environments.
     */
    maxLifetimeSeconds: 300,
  })
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
        (
          error as {
            code?: unknown
          }
        ).code,
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
  error: unknown,
): boolean {
  if (
    !(error instanceof Error)
  ) {
    return false
  }

  if (
    "code" in error
  ) {
    const code = String(
      (
        error as {
          code?: unknown
        }
      ).code,
    )

    if (
      CONNECTION_TERMINATED_CODES.has(
        code,
      )
    ) {
      return true
    }
  }

  const message =
    error.message.toLowerCase()

  return (
    message.includes(
      "connection terminated",
    ) ||
    message.includes(
      "terminating connection",
    ) ||
    message.includes(
      "closed the connection",
    ) ||
    message.includes(
      "connection reset",
    ) ||
    message.includes(
      "connection ended",
    )
  )
}

// ============================================================
// TIMEOUT ERROR DETECTION
// ============================================================

function isTimeoutError(
  error: unknown,
): boolean {
  if (
    !(error instanceof Error)
  ) {
    return false
  }

  if (
    "code" in error
  ) {
    const code = String(
      (
        error as {
          code?: unknown
        }
      ).code,
    )

    if (
      [
        "ETIMEDOUT",
        "ECONNRESET",
        "ECONNREFUSED",
      ].includes(code)
    ) {
      return true
    }
  }

  const message =
    error.message.toLowerCase()

  return (
    message.includes(
      "timeout",
    ) ||
    message.includes(
      "etimedout",
    ) ||
    message.includes(
      "connection terminated",
    )
  )
}

// ============================================================
// QUERY RETRY POLICY
// ============================================================

function shouldRetryQuery(
  error: unknown,
  attempt: number,
  retries: number,
) {
  if (
    attempt >= retries
  ) {
    return false
  }

  /*
   * A connection timeout usually means the pool cannot
   * obtain a connection. Immediately retrying the same
   * operation can make pool pressure worse.
   *
   * Therefore timeout errors are NOT retried here.
   */
  if (
    isTimeoutError(error)
  ) {
    return false
  }

  /*
   * Retry only genuine terminated/stale connections.
   */
  return isConnectionTerminatedError(
    error,
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
  retries = 1,
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
    } catch (error: unknown) {
      const retryable =
        shouldRetryQuery(
          error,
          attempt,
          retries,
        )

      if (!retryable) {
        throw error
      }

      console.warn(
        `[db] Query attempt ${
          attempt + 1
        } failed: ${
          error instanceof Error
            ? error.message
            : "unknown database error"
        }. Retrying once...`,
      )

      /*
       * Small backoff for a terminated connection.
       */
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            250,
          ),
      )
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
    await client.query(
      "BEGIN",
    )

    try {
      const result =
        await callback(client)

      await client.query(
        "COMMIT",
      )

      return result
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK",
        )
      } catch (
        rollbackError
      ) {
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
