import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { getCurrentUser } from "@/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/login?next=/admin");
  }

  return <AdminShell>{children}</AdminShell>;
}
