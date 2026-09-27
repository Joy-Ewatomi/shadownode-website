import Link from "next/link";
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050808] px-6 text-white">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-[#76f0a3]">
          Not found
        </p>
        <h1 className="mt-4 text-4xl font-semibold">404</h1>
        <p className="mt-3 text-white/75">
          The page is unavailable or you may not have access to it.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center rounded bg-[#27d56e] px-4 py-2 text-sm font-semibold text-black"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
