"use client"

type ActivityItem = {
  activity_type: string
  title: string | null
  detail: string | null
  created_at: string
}

export default function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <Header title="Recent Bureau Activity" />
      <div className="divide-y divide-[#143b28]">
        {!items.length ? <p className="p-5 text-sm text-white/45">No recent activity.</p> : null}
        {items.map((item, index) => (
          <article key={`${item.activity_type}-${item.created_at}-${index}`} className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-white">{item.title || item.activity_type}</p>
              <time className="text-xs text-white/35">{new Date(item.created_at).toLocaleString()}</time>
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#20dc73]">{item.activity_type}</p>
            {item.detail ? <p className="mt-2 line-clamp-2 text-sm text-white/55">{item.detail}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function Header({ title }: { title: string }) {
  return (
    <div className="border-b border-[#143b28] px-5 py-4">
      <h2 className="font-semibold text-white">{title}</h2>
    </div>
  )
}
