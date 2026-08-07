import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/bornohin-storefront";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const page = storefrontPolicyPages.privacy;
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `${getSiteOrigin()}/privacy` },
  };
}

export default function PrivacyPage() {
  const page = storefrontPolicyPages.privacy;

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/contact-us", label: "Contact support" }, { href: "/shop", label: "Back to shop", variant: "outline" }]} />
    </PublicShell>
  );
}
