import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteBrand } from "@/lib/site-brand";

export const metadata: Metadata = {
  title: siteBrand.name,
  description:
    `Frontend rebuild of the ${siteBrand.name} storefront with a centralized theme system, collection pages, product views, and responsive shopping interactions.`,
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
