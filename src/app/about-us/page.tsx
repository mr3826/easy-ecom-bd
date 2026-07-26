import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/bornohin-storefront";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  const page = storefrontPolicyPages["about-us"];

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/shop", label: "Browse products" }, { href: "/contact-us", label: "Contact us", variant: "outline" }]} />
    </PublicShell>
  );
}
