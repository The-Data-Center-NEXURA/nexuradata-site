import type { MetadataRoute } from "next";
import { brand } from "@/lib/constants";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: siteUrl("/sitemap.xml"),
    host: `https://${brand.domain}`,
  };
}