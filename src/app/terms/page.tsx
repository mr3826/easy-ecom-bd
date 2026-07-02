import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/mokkah-storefront";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  const page = storefrontPolicyPages.terms;

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/shop", label: "Continue browsing" }, { href: "/contact-us", label: "Ask a question", variant: "outline" }]} />
    </PublicShell>
  );
}

