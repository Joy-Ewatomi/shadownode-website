"use client";
import { useEffect } from "react";
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("APPLICATION ERROR", error.digest || "unavailable");
  }, [error]);
  return (
    <html lang="en">
      <body className="bg-[#050808] text-white">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-white/75">
              The service could not complete this action. Please try again. If
              it continues, contact support without including sensitive
              information.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-7 min-h-11 rounded bg-[#27d56e] px-5 font-semibold text-black"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
