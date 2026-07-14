import { redirect } from "next/navigation";

export default async function AdminProductsAddPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
  }>;
}) {
  const { edit = "" } = await searchParams;
  redirect(edit ? `/admin/products/new?edit=${encodeURIComponent(edit)}` : "/admin/products/new");
}
