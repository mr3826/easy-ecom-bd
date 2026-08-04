import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteBrand } from "@/lib/site-brand";

export const metadata: Metadata = {
  title: siteBrand.name,
  description: `${siteBrand.name} fashion, lifestyle, and everyday essentials in Bangladesh.`,
};

// `viewportFit: "cover"` is what makes env(safe-area-inset-*) return non-zero.
// Without it the --safe-bottom token in globals.css silently resolves to 0 and
// every .safe-bottom padding is a no-op on notched devices.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
