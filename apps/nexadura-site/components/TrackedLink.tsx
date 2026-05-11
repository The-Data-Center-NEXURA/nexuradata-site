"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackConversion } from "@/lib/analytics";

type TrackedLinkProps = LinkProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    eventName: "cta_click" | "nav_click" | "case_study_click";
    eventLabel: string;
    eventLocation: string;
  };

export default function TrackedLink({ children, eventName, eventLabel, eventLocation, onClick, href, ...props }: TrackedLinkProps) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        trackConversion(eventName, {
          label: eventLabel,
          location: eventLocation,
          href: String(href),
        });
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}