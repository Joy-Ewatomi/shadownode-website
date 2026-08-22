import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-6 text-white">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-[#7bf69f]">Access denied</p>
        <h1 className="mt-4 text-4xl font-semibold">403</h1>
        <p className="mt-3 text-white/60">Your current clearance does not authorize this area.</p>
        <Link href="/dashboard" className="mt-8 inline-flex rounded bg-[#21ff7d] px-4 py-2 text-sm font-semibold text-black">
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
