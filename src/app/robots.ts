import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// Same reason sitemap.ts carries it: without a dynamic marker Next renders this
// at BUILD time, so getSiteOrigin() resolves against the build machine's
// APP_URL. A build on a developer box shipped `Host: http://localhost:3000` and
// a sitemap link to localhost — production reads APP_URL from Passenger SetEnv,
// which does not exist until the app is running.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/account/", "/cart", "/checkout", "/api/", "/payments/", "/login", "/register", "/reset-password", "/verify-email"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
