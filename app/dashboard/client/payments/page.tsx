import Link from "next/link"
import { ArrowRight, CreditCard } from "lucide-react"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"

type OutstandingPayment = {
  request_id: string
  title: string | null
  case_number: string | null
  amount: number | string
  currency: string | null
  payment_status: string
}

export default async function ClientPaymentsPage() {
  const user = await getCurrentUser()

  if (!user) redirect("/login")
  if (user.role !== "client") redirect("/dashboard")

  const profileId = await profileIdForUser(user.id)
  const result = profileId
    ? await query<OutstandingPayment>(
        `
          SELECT DISTINCT ON (p.request_id)
            p.request_id,
            r.title,
            c.case_number,
            p.amount,
            p.currency,
            COALESCE(p.status, 'pending') AS payment_status
          FROM payments p
          JOIN requests r
            ON r.id = p.request_id
           AND r.user_id = $1::uuid
          LEFT JOIN cases c
            ON c.id = p.case_id
          LEFT JOIN training_engagements te
            ON te.id = p.training_engagement_id
          WHERE COALESCE(p.status, 'pending') IN (
            'pending',
            'unpaid',
            'awaiting_payment',
            'failed'
          )
            AND (
              (c.client_profile_id = $2::uuid AND c.status = 'awaiting_payment')
              OR (r.user_id = $1::uuid AND r.status = 'awaiting_payment')
              OR (te.client_profile_id = $2::uuid AND te.status = 'awaiting_payment')
            )
            AND NOT EXISTS (
              SELECT 1
              FROM payments paid
              WHERE paid.request_id = p.request_id
                AND paid.status = 'paid'
            )
          ORDER BY p.request_id, p.created_at DESC
        `,
        [user.id, profileId],
      )
    : { rows: [] as OutstandingPayment[] }

  return (
    <div className="space-y-6 p-6 text-white">
      <header className="space-y-2 border-b border-[#143b28] pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#20dc73]">Client Payments</p>
        <h1 className="text-3xl font-bold">Outstanding payments</h1>
        <p className="text-sm text-white/55">Payment obligations that must be completed before work can begin.</p>
      </header>

      {result.rows.length === 0 ? (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-sm text-white/55">
          You have no outstanding payments.
        </div>
      ) : (
        <div className="grid gap-3">
          {result.rows.map((payment) => (
            <Link
              key={payment.request_id}
              href={`/dashboard/client/payments/${payment.request_id}`}
              aria-label={`Open payment for ${payment.title || "request"}`}
              className="flex min-w-0 items-center gap-4 rounded-md border border-[#143b28] bg-[#06110f] p-4 transition-colors hover:border-[#20dc73]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#20dc73]/25 bg-[#20dc73]/10 text-[#20dc73]">
                <CreditCard aria-hidden="true" className="size-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {payment.title || "Payment required"}
                </span>
                <span className="mt-1 block text-xs text-white/45">
                  {payment.case_number || "Request payment"} · {payment.payment_status.replaceAll("_", " ")}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-semibold text-[#20dc73]">
                  {(payment.currency || "NGN").toUpperCase()} {Number(payment.amount).toLocaleString()}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/45">
                  Continue <ArrowRight aria-hidden="true" className="size-3.5" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
