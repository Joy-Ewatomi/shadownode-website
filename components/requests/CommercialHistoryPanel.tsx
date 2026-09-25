"use client"

import Link from "next/link"

type History = {
  status: string
  acceptedQuoteVersionId: string | null
  quotations: Array<Record<string, unknown>>
  negotiations: Array<Record<string, unknown>>
  payments: Array<Record<string, unknown>>
  destination: { type: "case" | "training"; id: string } | null
}

const money = (amount: unknown, currency: unknown) => `${String(currency || "").toUpperCase()} ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value: unknown) => value ? new Date(String(value)).toLocaleString("en-GB") : "Not recorded"
const label = (value: unknown) => String(value || "unknown").replaceAll("_", " ")

export default function CommercialHistoryPanel({ history }: { history?: History | null }) {
  if (!history) return null
  const paidPayment = history.payments.find((item) => item.status === "paid" && item.quote_version_id === history.acceptedQuoteVersionId)
  const acceptedQuote = history.quotations.find((item) => item.id === history.acceptedQuoteVersionId)
  return <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase text-[#20dc73]">Commercial record</p><h2 className="mt-2 text-xl font-semibold text-white">Quotation and Payment</h2></div><span className={`rounded border px-3 py-1 text-xs font-semibold uppercase ${history.status === "paid" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-[#24563d] text-white/60"}`}>{label(history.status)}</span></div>
    {paidPayment && acceptedQuote && <div className="mt-5 border-l-2 border-emerald-400 bg-emerald-400/5 p-4"><p className="font-semibold text-emerald-300">Final quotation paid</p><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><Info title="Quotation" value={`Version ${acceptedQuote.version_number}`} /><Info title="Amount" value={money(acceptedQuote.price, acceptedQuote.currency)} /><Info title="Accepted" value={date(acceptedQuote.accepted_at)} /><Info title="Verified payment" value={date(paidPayment.verified_at || paidPayment.paid_at)} /></div>{Boolean(acceptedQuote.scope_summary) && <p className="mt-3 text-sm text-white/60">{String(acceptedQuote.scope_summary)}</p>}<p className="mt-3 text-xs text-white/45">{String(paidPayment.provider || "Payment")} · {String(paidPayment.provider_reference || "Reference unavailable")}</p></div>}
    <div className="mt-6"><h3 className="font-semibold text-white">Quotation history</h3><div className="mt-3 divide-y divide-white/5 border-y border-white/10">{history.quotations.map((quote) => <article key={String(quote.id)} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-medium text-white">Version {String(quote.version_number)} · {money(quote.price, quote.currency)}</p><p className="mt-1 text-xs text-white/45">Issued {date(quote.issued_at || quote.created_at)}</p></div><span className="text-sm capitalize text-white/60">{label(quote.status)}</span></article>)}</div></div>
    {history.negotiations.length > 0 && <div className="mt-6"><h3 className="font-semibold text-white">Negotiation timeline</h3><div className="mt-3 space-y-3">{history.negotiations.map((event) => <article key={String(event.id)} className="border-l border-[#24563d] pl-4"><p className="text-sm font-medium text-white">Round {String(event.round_number)} · {label(event.status)}</p><p className="mt-1 text-sm text-white/60">Counteroffer: {money(event.requested_budget, event.quote_currency)}</p>{Boolean(event.client_reason) && <p className="mt-1 text-sm text-white/55">{String(event.client_reason)}</p>}<p className="mt-1 text-xs text-white/35">{date(event.created_at)}</p></article>)}</div></div>}
    <div className="mt-6"><h3 className="font-semibold text-white">Payment history</h3>{history.payments.length ? <div className="mt-3 divide-y divide-white/5 border-y border-white/10">{history.payments.map((payment) => <article key={String(payment.id)} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-medium text-white">{money(payment.amount, payment.currency)}</p><p className="mt-1 text-xs text-white/45">{String(payment.provider || "Provider not recorded")} · {String(payment.provider_reference || "Reference unavailable")} · {date(payment.created_at)}</p></div><span className="text-sm capitalize text-white/60">{label(payment.status)}</span></article>)}</div> : <p className="mt-2 text-sm text-white/45">No payment attempts recorded.</p>}</div>
    {history.destination && <Link href={history.destination.type === "training" ? `/dashboard/client/training/${history.destination.id}` : `/dashboard/client/cases/${history.destination.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-md border border-[#20dc73]/40 px-4 text-sm font-semibold text-[#20dc73]">Open resulting {history.destination.type === "training" ? "training engagement" : "case"}</Link>}
  </section>
}

function Info({ title, value }: { title: string; value: string }) {
  return <div><p className="text-xs uppercase text-white/35">{title}</p><p className="mt-1 text-white/75">{value}</p></div>
}
