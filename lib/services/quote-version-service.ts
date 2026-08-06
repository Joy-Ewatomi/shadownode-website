import { query } from "@/lib/db"

export async function createQuoteVersion({
  requestId,
  userId,
  role,
  source,
  price,
  currency,
  estimated_completion,
  reasoning,
  status = "draft",
}: {
  requestId: string
  userId: string
  role: string
  source: string
  price: number
  currency: string
  estimated_completion?: string | null
  reasoning?: string | null
  status?: string
}) {

  const normalizedCurrency = currency.trim().toUpperCase()

if (!normalizedCurrency || normalizedCurrency.length > 10) {
  throw new Error("Invalid currency")
}

  const latest = await query<{ version:number }>(
    `
    SELECT COALESCE(MAX(version_number),0) AS version
    FROM quote_versions
    WHERE request_id=$1
    `,
    [requestId]
  )


  const version =
    Number(latest.rows[0].version) + 1


  const completion =
    estimated_completion &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      estimated_completion
    )
      ? estimated_completion
      : null


  const result = await query(
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
      reasoning,
      status
    )
    VALUES
    (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
    )
    RETURNING *
    `,
    [
      requestId,
      version,
      userId,
      role,
      source,
      price,
      normalizedCurrency,
      completion,
      reasoning || null,
      status,
    ]
  )


  return result.rows[0]
}