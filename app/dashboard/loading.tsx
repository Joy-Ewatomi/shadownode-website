export default function DashboardLoading() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="space-y-5"
    >
      <div className="h-7 w-52 animate-pulse rounded bg-white/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-md border border-[#143b28] bg-[#06110f]/80"
          />
        ))}
      </div>
      <span className="sr-only">Loading dashboard content...</span>
    </section>
  );
}
