import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/constants";
import { siteUrl } from "@/lib/utils";

type SitemapRoute = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

const routes = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },
  { path: "/automation-audit", priority: 0.9, changeFrequency: "monthly" },
  { path: "/case-studies", priority: 0.75, changeFrequency: "monthly" },
  { path: "/about", priority: 0.65, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
  ...caseStudies.map((study): SitemapRoute => ({ path: `/case-studies/${study.slug}`, priority: 0.7, changeFrequency: "monthly" })),
] satisfies SitemapRoute[];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: siteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}