import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-6 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold">Verify Your Email</h1>
        <p className="mt-3 text-white/60">Open the verification link sent to your inbox before accessing the secure portal.</p>
        <Link href="/resend-verification" className="mt-8 inline-flex rounded bg-[#21ff7d] px-4 py-2 text-sm font-semibold text-black">
          Resend link
        </Link>
      </div>
    </main>
  );
}
