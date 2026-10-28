import type { MetadataRoute } from "next";
import { pageRoutes, SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [pageRoutes.home, pageRoutes.signin, pageRoutes.signup],
      // One-time token pages: nothing useful to index, and links may carry tokens.
      disallow: [pageRoutes.forgotPassword, pageRoutes.resetPassword, pageRoutes.acceptInvite],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
