import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/bornohin-storefront";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const page = storefrontPolicyPages["cookie-policy"];
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `${getSiteOrigin()}/cookie-policy` },
  };
}

export default function CookiePolicyPage() {
  const page = storefrontPolicyPages["cookie-policy"];

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/privacy", label: "Privacy policy" }, { href: "/shop", label: "Shop", variant: "outline" }]} />
    </PublicShell>
  );
}
