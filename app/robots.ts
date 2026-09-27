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
          "/security-policy",
          "/contact",
          "/request",
          "/verify/certificate/",
        ],
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/cases/",
          "/security",
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
