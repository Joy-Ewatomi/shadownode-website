import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]/85 p-6">
      <h1 className="text-xl font-semibold text-white">
        Dashboard page not found
      </h1>
      <p className="mt-2 text-sm leading-6 text-white/60">
        The requested dashboard resource is unavailable or you do not have
        access to it.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex min-h-11 items-center text-[#76f0a3] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]"
      >
        Return to dashboard
      </Link>
    </section>
  );
}
