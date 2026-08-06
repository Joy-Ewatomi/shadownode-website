export type QuoteVersion = {
  id: string
  request_id: string
  version_number: number
  created_by: string | null
  creator_role: string | null
  source: string

  price: number | null
  currency: string | null

  estimated_completion: string | null

  reasoning: string | null
  notes: string | null

  status: string | null

  created_at: string | null
}