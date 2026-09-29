import type { MetadataRoute } from "next";
import { getTrustedApplicationOrigin } from "@/lib/app-origin";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getTrustedApplicationOrigin();
  if (!origin) return [];
  const paths = [
    "/",
    "/privacy",
    "/terms",
    "/security",
    "/contact",
    "/request",
    "/services/osint",
    "/services/cybersecurity-training",
  ];
  return paths.map((pathname) => ({
    url: new URL(pathname, origin).toString(),
    lastModified: new Date(),
    changeFrequency: pathname === "/" ? "weekly" : "monthly",
    priority: pathname === "/" ? 1 : 0.6,
  }));
}
