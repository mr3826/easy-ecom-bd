import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/bornohin-storefront";

export const dynamic = "force-dynamic";

export default function CookiePolicyPage() {
  const page = storefrontPolicyPages["cookie-policy"];

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/privacy", label: "Privacy policy" }, { href: "/shop", label: "Shop", variant: "outline" }]} />
    </PublicShell>
  );
}
