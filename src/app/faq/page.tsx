import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/bornohin-storefront";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const page = storefrontPolicyPages.faq;
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `${getSiteOrigin()}/faq` },
  };
}

export default function FaqPage() {
  const page = storefrontPolicyPages.faq;

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/shop", label: "Browse catalog" }, { href: "/track-order", label: "Track order", variant: "outline" }]} />
    </PublicShell>
  );
}
