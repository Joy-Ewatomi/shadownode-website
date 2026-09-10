import {
  Pool,
  type QueryResult,
  type QueryResultRow,
} from "pg"

import dns from "dns"

// ============================================================
// DNS
// ============================================================
//
// Prefer IPv4 because this project previously encountered
// IPv4/IPv6 connectivity differences with external services.
//

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
// CONFIGURATION
// ============================================================

const poolMaxRaw = Number(
  process.env.DB_POOL_MAX ?? "10",
)

const poolIdleTimeoutRaw = Number(
  process.env.DB_IDLE_TIMEOUT_MS ?? "60000",
)

const poolConnectionTimeoutRaw = Number(
  process.env.DB_CONNECTION_TIMEOUT_MS ?? "5000",
)

const poolQueryRetriesRaw = Number(
  process.env.DB_QUERY_RETRIES ?? "1",
)

// ============================================================
// NORMALIZED CONFIGURATION
// ============================================================

const poolMax =
  Number.isFinite(poolMaxRaw) &&
  poolMaxRaw > 0
    ? Math.min(
        Math.floor(poolMaxRaw),
        20,
      )
    : 10

const poolIdleTimeout =
  Number.isFinite(
    poolIdleTimeoutRaw,
  ) &&
  poolIdleTimeoutRaw >= 1000
    ? poolIdleTimeoutRaw
    : 60000

const poolConnectionTimeout =
  Number.isFinite(
    poolConnectionTimeoutRaw,
  ) &&
  poolConnectionTimeoutRaw >= 1000
    ? Math.min(
        poolConnectionTimeoutRaw,
        10000,
      )
    : 5000

const poolQueryRetries =
  Number.isFinite(
    poolQueryRetriesRaw,
  ) &&
  poolQueryRetriesRaw >= 0
    ? Math.min(
        Math.floor(
          poolQueryRetriesRaw,
        ),
        2,
      )
    : 1

// ============================================================
// CREATE POOL
// ============================================================

function createPool(): Pool | null {
  if (!connectionString) {
    return null
  }

  return new Pool({
    connectionString,

    /*
     * Preserve the existing project's SSL behavior.
     *
     * Your current Supabase connection is already working with
     * this configuration, so do not force SSL changes here.
     */
    ssl:
      process.env.POSTGRES_SSL === "true"
        ? {
            rejectUnauthorized:
              false,
          }
        : undefined,

    /*
     * Keep the pool deliberately conservative.
     */
    max: poolMax,

    /*
     * Keep idle connections around longer so normal dashboard
     * navigation does not constantly require new remote
     * PostgreSQL connections.
     */
    idleTimeoutMillis:
      poolIdleTimeout,

    /*
     * Do not allow a single connection attempt to hang
     * indefinitely.
     */
    connectionTimeoutMillis:
      poolConnectionTimeout,

    /*
     * Keep TCP connections alive.
     *
     * This is useful with remote databases and can help
     * identify dead network connections rather than silently
     * keeping stale sockets around.
     */
    keepAlive: true,
    keepAliveInitialDelayMillis:
      10000,

    allowExitOnIdle: false,
  })
}

// ============================================================
// DATABASE INSTANCE
// ============================================================

export const db =
  globalThis.shadownodePgPool ??
  createPool()

/*
 * In development, Next.js/Turbopack can reload modules.
 *
 * Reuse one shared Pool across reloads so we do not create
 * multiple pools unnecessarily.
 */
if (
  db &&
  process.env.NODE_ENV !==
    "production"
) {
  globalThis.shadownodePgPool =
    db
}

// ============================================================
// DATABASE STATUS HELPERS
// ============================================================

export function isDatabaseConfigured(): boolean {
  return Boolean(db)
}

export function isDatabaseConfigurationError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    error.message.includes(
      "must be configured with a PostgreSQL connection string",
    )
  )
}

export function isDatabaseNetworkError(
  error: unknown,
): boolean {
  if (
    !(error instanceof Error)
  ) {
    return false
  }

  const code =
    "code" in error
      ? String(
          (
            error as {
              code?: unknown
            }
          ).code,
        )
      : ""

  return [
    "ENETUNREACH",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ECONNRESET",
    "EHOSTUNREACH",
  ].includes(code)
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
    "08001",
    "08003",
    "08004",
    "08006",
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

  const code =
    "code" in error
      ? String(
          (
            error as {
              code?: unknown
            }
          ).code,
        )
      : ""

  if (
    CONNECTION_TERMINATED_CODES.has(
      code,
    )
  ) {
    return true
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
    ) ||
    message.includes(
      "socket hang up",
    ) ||
    message.includes(
      "connection terminated unexpectedly",
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

  const code =
    "code" in error
      ? String(
          (
            error as {
              code?: unknown
            }
          ).code,
        )
      : ""

  if (
    [
      "ETIMEDOUT",
      "ECONNRESET",
      "ECONNREFUSED",
    ].includes(code)
  ) {
    return true
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
    ) ||
    message.includes(
      "connection terminated unexpectedly",
    )
  )
}

// ============================================================
// RETRY POLICY
// ============================================================

function shouldRetryQuery(
  error: unknown,
  attempt: number,
  retries: number,
): boolean {
  if (
    attempt >= retries
  ) {
    return false
  }

  /*
   * We DO retry network/connection failures.
   *
   * Your environment has already demonstrated intermittent
   * connection establishment failures to the Supabase pooler.
   *
   * A single controlled retry gives a request a chance to
   * recover from a transient dead/stale connection.
   */
  return (
    isTimeoutError(error) ||
    isConnectionTerminatedError(
      error,
    ) ||
    isDatabaseNetworkError(
      error,
    )
  )
}

// ============================================================
// BACKOFF
// ============================================================

function getRetryDelay(
  attempt: number,
): number {
  /*
   * Small exponential backoff:
   *
   * attempt 0 → 250ms
   * attempt 1 → 500ms
   *
   * We cap this at 1000ms.
   */
  return Math.min(
    250 *
      Math.pow(
        2,
        attempt,
      ),
    1000,
  )
}

function wait(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
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
  retries = poolQueryRetries,
): Promise<QueryResult<T>> {
  if (!db) {
    throw new Error(
      "DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL must be configured with a PostgreSQL connection string",
    )
  }

  const safeRetries =
    Number.isFinite(retries) &&
    retries >= 0
      ? Math.min(
          Math.floor(retries),
          2,
        )
      : 0

  for (
    let attempt = 0;
    attempt <= safeRetries;
    attempt++
  ) {
    const startedAt =
      Date.now()

    try {
      const result =
        await db.query<T>(
          text,
          params,
        )

      const duration =
        Date.now() -
        startedAt

      if (
        duration >= 1500
      ) {
        console.warn(
          `[db] Slow query: ${duration}ms`,
          {
            attempt:
              attempt + 1,
            rows:
              result.rowCount ??
              0,
          },
        )
      }

      return result
    } catch (
      error: unknown
    ) {
      const duration =
        Date.now() -
        startedAt

      const code =
        error &&
        typeof error ===
          "object" &&
        "code" in error
          ? String(
              (
                error as {
                  code?: unknown
                }
              ).code,
            )
          : undefined

      const message =
        error instanceof Error
          ? error.message
          : String(error)

      console.error(
        "[db] Query failed",
        {
          attempt:
            attempt + 1,
          duration,
          code,
          message,
        },
      )

      const retryable =
        shouldRetryQuery(
          error,
          attempt,
          safeRetries,
        )

      if (!retryable) {
        throw error
      }

      const delay =
        getRetryDelay(
          attempt,
        )

      console.warn(
        `[db] Transient connection failure. Retrying in ${delay}ms...`,
        {
          attempt:
            attempt + 1,
          retries:
            safeRetries,
        },
      )

      await wait(delay)
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

  /*
   * Do not import PoolClient from "pg".
   *
   * Your installed pg typings do not export it from that module.
   * We already define the small client interface required by this
   * project, so use the returned client structurally.
   */
  const client =
    (await db.connect()) as unknown as DatabasePoolClient

  try {
    await client.query(
      "BEGIN",
    )

    try {
      const result =
        await callback(
          client,
        )

      await client.query(
        "COMMIT",
      )

      return result
    } catch (
      error: unknown
    ) {
      try {
        await client.query(
          "ROLLBACK",
        )
      } catch (
        rollbackError: unknown
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