import Link from "next/link";
import { deleteBrandAction, saveBrandAction } from "@/app/admin/actions";
import { listBrands } from "@/server/store";
import { StatusPill } from "@/components/status-pill";

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const brands = listBrands();
  const selected = brands.find((item) => item.id === edit);

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Brands</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Brand CRUD</h1>
      </div>
      <form action={saveBrandAction} className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 md:grid-cols-2">
        <input type="hidden" name="id" value={selected?.id ?? ""} />
        <label className="grid gap-2 text-sm">
          <span>Name</span>
          <input name="name" defaultValue={selected?.name ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Slug</span>
          <input name="slug" defaultValue={selected?.slug ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Description</span>
          <textarea name="description" rows={3} defaultValue={selected?.description ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Status</span>
          <select name="isActive" defaultValue={selected?.isActive ? "true" : "false"} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
            <option value="true">Active</option>
            <option value="false">Hidden</option>
          </select>
        </label>
        <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">{selected ? "Update brand" : "Create brand"}</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {brands.map((brand) => (
          <div key={brand.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{brand.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{brand.slug}</p>
              </div>
              <StatusPill label={brand.isActive ? "active" : "hidden"} tone={brand.isActive ? "active" : "inactive"} />
            </div>
            <div className="mt-4 flex gap-3">
              <Link href={`/admin/brands?edit=${brand.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Edit</Link>
              <form action={deleteBrandAction}><input type="hidden" name="id" value={brand.id} /><button className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200">Delete</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

