"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-md border border-red-500/30 bg-red-500/10 p-5"
    >
      <h1 className="text-xl font-semibold text-white">
        Dashboard content could not be loaded
      </h1>
      <p className="mt-2 text-sm leading-6 text-white/65">
        Your navigation remains available. Retry the page content or choose
        another dashboard section.
      </p>
      <Button type="button" className="mt-5" onClick={reset}>
        Retry
      </Button>
    </section>
  );
}
