import type { MetadataRoute } from "next";
import { pageRoutes, SITE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}${pageRoutes.home}`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}${pageRoutes.signup}`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}${pageRoutes.signin}`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
