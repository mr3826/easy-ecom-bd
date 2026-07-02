import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/mokkah-storefront";

export const dynamic = "force-dynamic";

export default function FaqPage() {
  const page = storefrontPolicyPages.faq;

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/shop", label: "Browse catalog" }, { href: "/track-order", label: "Track order", variant: "outline" }]} />
    </PublicShell>
  );
}

