import { query } from "@/lib/db"

let availability: Promise<boolean> | null = null

export async function richDocumentStorageAvailable() {
  if (!availability) {
    availability = query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'case_reports' AND column_name IN ('summary_document', 'summary_document_version'))
          OR (table_name = 'case_report_sections' AND column_name IN ('content_document', 'content_document_version'))
        )
    `).then((result) => result.rows.length === 4).catch(() => false)
  }
  return availability
}
