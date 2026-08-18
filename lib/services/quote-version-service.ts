import { query } from "@/lib/db"
import {
  requireSupportedCurrency,
} from "@/lib/config/currencies"

export interface QuoteVersion {
  id: string
  request_id: string
  version_number: number
  created_by: string | null
  creator_role: string | null
  source: string
  price: number | null
  currency: string | null
  estimated_completion: string | null
  notes: string | null
  reasoning: string | null
  status: string | null
  created_at: string
  previous_price: number | null
  price_difference: number | null
}

type QuoteVersionRow = QuoteVersion & {
  [key: string]: unknown
}

export type QuoteVersionStatus =
  | "draft"
  | "generated"
  | "pending_super_admin_review"
  | "approved"
  | "adjusted"
  | "rejected"
  | "reviewing"
  | "quote_sent"
  | "revised_quote_sent"

export async function createQuoteVersion(input: {
  requestId: string
  userId: string
  role: string
  source: string
  price: number
  currency: string
  estimated_completion?: string | null
  reasoning?: string | null
  notes?: string | null
  status?: QuoteVersionStatus
}): Promise<QuoteVersion> {
  /**
   * =======================================================
   * VALIDATE REQUEST
   * =======================================================
   */

  if (!input.requestId?.trim()) {
    throw new Error("Request ID is required")
  }

  if (!input.userId?.trim()) {
    throw new Error("User ID is required")
  }

  /**
   * =======================================================
   * VALIDATE PRICE
   * =======================================================
   */

  const price = Number(input.price)

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Invalid quote price")
  }

  /**
   * =======================================================
   * VALIDATE CURRENCY
   * =======================================================
   *
   * No conversion happens here.
   *
   * The caller must provide the amount in the
   * currency supplied.
   */

  const normalizedCurrency =
    requireSupportedCurrency(input.currency)

  /**
   * =======================================================
   * VALIDATE ROLE
   * =======================================================
   */

  const role = input.role?.trim()

  if (!role) {
    throw new Error("Quote creator role is required")
  }

  /**
   * =======================================================
   * VALIDATE SOURCE
   * =======================================================
   */

  const source = input.source?.trim()

  if (!source) {
    throw new Error("Quote source is required")
  }

  /**
   * =======================================================
   * VALIDATE STATUS
   * =======================================================
   */

  const status =
    input.status ?? "draft"

  const allowedStatuses: QuoteVersionStatus[] = [
    "draft",
   "generated",
  "pending_super_admin_review",
  "approved",
  "adjusted",
  "rejected",
  "reviewing",
  "quote_sent",
  "revised_quote_sent"
  ]

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid quote version status: ${status}`,
    )
  }

  /**
   * =======================================================
   * VALIDATE ESTIMATED COMPLETION
   * =======================================================
   */

  const estimatedCompletion =
    input.estimated_completion?.trim() || null

  if (
    estimatedCompletion &&
    !/^\d{4}-\d{2}-\d{2}$/.test(
      estimatedCompletion,
    )
  ) {
    throw new Error(
      "Estimated completion must use YYYY-MM-DD format",
    )
  }

  /**
   * =======================================================
   * NORMALIZE INTERNAL DATA
   * =======================================================
   */

  const reasoning =
    input.reasoning?.trim() || null

  const notes =
    input.notes?.trim() || null

  /**
   * =======================================================
   * GET PREVIOUS VERSION
   * =======================================================
   */

  const previousResult =
    await query<{
      version_number: number | string
      price: number | string | null
    }>(
      `
        SELECT
          version_number,
          price
        FROM quote_versions
        WHERE request_id = $1
        ORDER BY version_number DESC
        LIMIT 1
      `,
      [input.requestId],
    )

  const previous =
    previousResult.rows[0]

  /**
   * =======================================================
   * DETERMINE NEXT VERSION
   * =======================================================
   */

  const latestVersion = Number(
    previous?.version_number ?? 0,
  )

  if (!Number.isFinite(latestVersion)) {
    throw new Error(
      "Unable to determine quote version",
    )
  }

  const versionNumber =
    latestVersion + 1

  /**
   * =======================================================
   * CALCULATE PRICE HISTORY
   * =======================================================
   */

  const previousPrice =
    previous?.price !== null &&
    previous?.price !== undefined
      ? Number(previous.price)
      : null

  if (
    previousPrice !== null &&
    !Number.isFinite(previousPrice)
  ) {
    throw new Error(
      "Previous quote price is invalid",
    )
  }

  const priceDifference =
    previousPrice !== null
      ? price - previousPrice
      : null

  /**
   * =======================================================
   * CREATE VERSION
   * =======================================================
   */

  const result =
    await query<QuoteVersionRow>(
      `
        INSERT INTO quote_versions
        (
          request_id,
          version_number,
          created_by,
          creator_role,
          source,
          price,
          currency,
          estimated_completion,
          notes,
          reasoning,
          status,
          previous_price,
          price_difference
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13
        )

        RETURNING
          id,
          request_id,
          version_number,
          created_by,
          creator_role,
          source,
          price,
          currency,
          estimated_completion,
          notes,
          reasoning,
          status,
          created_at,
          previous_price,
          price_difference
      `,
      [
        input.requestId,
        versionNumber,
        input.userId,
        role,
        source,
        price,
        normalizedCurrency,
        estimatedCompletion,
        notes,
        reasoning,
        status,
        previousPrice,
        priceDifference,
      ],
    )

  const quoteVersion =
    result.rows[0]

  if (!quoteVersion) {
    throw new Error(
      "Failed to create quote version",
    )
  }

  return quoteVersion
}