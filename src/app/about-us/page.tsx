import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/bornohin-storefront";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const page = storefrontPolicyPages["about-us"];
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `${getSiteOrigin()}/about-us` },
  };
}

export default function AboutPage() {
  const page = storefrontPolicyPages["about-us"];

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/shop", label: "Browse products" }, { href: "/contact-us", label: "Contact us", variant: "outline" }]} />
    </PublicShell>
  );
}
