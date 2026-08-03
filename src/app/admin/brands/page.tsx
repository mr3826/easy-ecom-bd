import Link from "next/link";
import { deleteBrandAction, saveBrandAction } from "@/app/admin/actions";
import { listBrands } from "@/server/store";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const brands = await listBrands();
  const selected = brands.find((item) => item.id === edit);

  return (
    <div className="space-y-6 text-[color:var(--foreground)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Brands</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Brand CRUD</h1>
      </div>
      <form action={saveBrandAction} className="grid gap-4 rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={selected?.id ?? ""} />
        <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
          <span>Name</span>
          <input name="name" defaultValue={selected?.name ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
          <span>Slug</span>
          <input name="slug" defaultValue={selected?.slug ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--foreground)] sm:col-span-2">
          <span>Description</span>
          <textarea name="description" rows={3} defaultValue={selected?.description ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60" />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
          <span>Status</span>
          <select name="isActive" defaultValue={selected?.isActive ? "true" : "false"} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--brand)]/60">
            <option value="true">Active</option>
            <option value="false">Hidden</option>
          </select>
        </label>
        <Button type="submit">{selected ? "Update brand" : "Create brand"}</Button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2">
        {brands.map((brand) => (
          <div key={brand.id} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[color:var(--foreground)]">{brand.name}</h2>
                <p className="mt-1 text-xs text-[color:var(--muted)]">{brand.slug}</p>
              </div>
              <StatusPill label={brand.isActive ? "active" : "hidden"} tone={brand.isActive ? "active" : "inactive"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="secondary">
              <Link href={`/admin/brands?edit=${brand.id}`}>Edit</Link>
            </Button>
              <form action={deleteBrandAction}>
                <input type="hidden" name="id" value={brand.id} />
                {/* A delete must not look like the Edit link next to it. */}
                <Button variant="danger" pendingWhileSubmitting pendingLabel="Deleting…">
                  Delete
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
