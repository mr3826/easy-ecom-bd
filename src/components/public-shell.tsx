import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteAnalytics } from "@/components/site-analytics";
import type { ReactNode } from "react";

export function PublicShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf4_0%,#f4efe7_40%,#eef2f6_100%)] text-slate-900">
      <SiteAnalytics />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
