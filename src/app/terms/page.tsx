import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/bornohin-storefront";
import { getSettings } from "@/server/store";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const page = storefrontPolicyPages.terms;
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `${getSiteOrigin()}/terms` },
  };
}

export default async function TermsPage() {
  const page = storefrontPolicyPages.terms;
  const settings = await getSettings();
  const body = [
    ...page.body,
    `Return and refund policy: ${settings.returnRefundPolicy}`,
  ];

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={body} actions={[{ href: "/shop", label: "Continue browsing" }, { href: "/contact-us", label: "Ask a question", variant: "outline" }]} />
    </PublicShell>
  );
}
