"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getPageType, trackConversion } from "@/lib/analytics";

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackConversion("page_view_template", {
      path: pathname,
      page_type: getPageType(pathname),
    });
  }, [pathname]);

  return null;
}