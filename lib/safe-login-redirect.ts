const ALLOWED_DESTINATIONS = ["/dashboard", "/account"] as const;

export function safeLoginDestination(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/dashboard";

  try {
    const parsed = new URL(value, "https://shadownode.invalid");
    if (parsed.origin !== "https://shadownode.invalid") return "/dashboard";
    const allowed = ALLOWED_DESTINATIONS.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );
    return allowed ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export function requestedServiceLabel(destination: string) {
  if (destination === "/dashboard/client/requests/osint") return "OSINT request";
  if (destination === "/dashboard/client/requests/cybersecurity") return "Cybersecurity Training request";
  return null;
}
