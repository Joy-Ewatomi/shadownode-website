import type { MetadataRoute } from "next";
import { getTrustedApplicationOrigin } from "@/lib/app-origin";
export default function robots(): MetadataRoute.Robots {
  const origin = getTrustedApplicationOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/privacy",
          "/terms",
          "/security",
          "/contact",
          "/request",
          "/services/osint",
          "/services/cybersecurity-training",
          "/verify/certificate/",
        ],
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/cases/",
          "/account/",
          "/messages",
          "/test",
          "/test-login",
        ],
      },
    ],
    ...(origin
      ? { sitemap: new URL("/sitemap.xml", origin).toString(), host: origin }
      : {}),
  };
}
