"use client"

type TimelineUpdate = {
  id: string
  update_type: string | null
  title: string | null
  content: string | null
  created_at: string
}

export default function ClientTimeline({ updates }: { updates: TimelineUpdate[] }) {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Case Timeline</p>
        <h2 className="mt-1 font-semibold text-white">Client Updates</h2>
      </div>
      <div className="divide-y divide-[#143b28]">
        {!updates.length ? <p className="p-5 text-sm text-white/45">No case updates have been posted yet.</p> : null}
        {updates.map((update) => (
          <article key={update.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-white">{update.title || update.content || "Case update"}</p>
              <time className="text-xs text-white/35">{new Date(update.created_at).toLocaleString()}</time>
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#20dc73]">{update.update_type || "update"}</p>
            {update.title && update.content ? <p className="mt-2 text-sm text-white/60">{update.content}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}
