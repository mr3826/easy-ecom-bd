import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteBrand } from "@/lib/site-brand";

export const metadata: Metadata = {
  title: siteBrand.name,
  description: `${siteBrand.name} fashion, lifestyle, and everyday essentials in Bangladesh.`,
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
