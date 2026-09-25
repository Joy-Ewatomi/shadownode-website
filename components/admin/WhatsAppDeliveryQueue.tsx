"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, RefreshCw, X } from "lucide-react"

type Delivery = { id: string; clientName: string; maskedNumber: string; eventType: string; reference: string | null; message: string; createdAt: string; status: string; openUrl: string | null }

export default function WhatsAppDeliveryQueue() {
  const [items, setItems] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    setLoading(true); setError("")
    const response = await fetch("/api/admin/communication-deliveries/whatsapp", { cache: "no-store" }).catch(() => null)
    const data = response ? await response.json().catch(() => ({})) : {}
    if (!response?.ok) setError(data.error || "Unable to load the delivery queue.")
    else setItems(data.deliveries || [])
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  async function act(id: string, action: "confirm_sent" | "cancel") {
    const response = await fetch(`/api/admin/communication-deliveries/whatsapp/${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
    if (!response.ok) { const data = await response.json().catch(() => ({})); setError(data.error || "Unable to update the delivery."); return }
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-white">Pending manual deliveries</h2><p className="mt-1 text-sm text-white/50">Opening WhatsApp does not mark a message sent. Confirm only after sending it.</p></div><button type="button" onClick={() => void load()} aria-label="Refresh queue" className="flex h-11 w-11 items-center justify-center rounded-md border border-[#143b28] text-white/70"><RefreshCw className="h-4 w-4" /></button></div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {loading ? <p className="text-sm text-white/50">Loading delivery queue...</p> : null}
    {!loading && items.length === 0 ? <p className="rounded-md border border-[#143b28] p-5 text-sm text-white/50">No pending WhatsApp deliveries.</p> : null}
    <div className="grid gap-4">{items.map((item) => <article key={item.id} className="min-w-0 rounded-md border border-[#143b28] bg-[#06110f] p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-medium text-white">{item.clientName}</h3><p className="text-xs text-white/45">{item.maskedNumber} · {item.eventType.replaceAll("_", " ")}</p></div><time className="text-xs text-white/40">{new Date(item.createdAt).toLocaleString()}</time></div>{item.reference && <p className="mt-3 break-all text-xs text-white/45">{item.reference}</p>}<pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-white/10 bg-black/30 p-3 font-sans text-sm leading-6 text-white/70">{item.message || "Message preparation is pending."}</pre><div className="mt-4 flex flex-wrap gap-2">{item.openUrl && <a href={item.openUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#20dc73] px-4 font-semibold text-[#03110a]"><ExternalLink className="h-4 w-4" />Open in WhatsApp</a>}<button type="button" disabled={!item.openUrl} onClick={() => void act(item.id, "confirm_sent")} className="min-h-11 rounded-md border border-[#20dc73]/50 px-4 text-sm text-[#20dc73] disabled:opacity-40">Confirm sent</button><button type="button" onClick={() => void act(item.id, "cancel")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-400/30 px-4 text-sm text-red-300"><X className="h-4 w-4" />Cancel delivery</button></div></article>)}</div>
  </section>
}
