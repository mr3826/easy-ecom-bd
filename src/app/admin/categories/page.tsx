import Link from "next/link";
import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import { listCategories } from "@/server/store";
import { StatusPill } from "@/components/status-pill";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const categories = listCategories();
  const selected = categories.find((item) => item.id === edit);

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Categories</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Category CRUD</h1>
      </div>
      <form action={saveCategoryAction} className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 md:grid-cols-2">
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
        <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">{selected ? "Update category" : "Create category"}</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <div key={category.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{category.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{category.slug}</p>
              </div>
              <StatusPill label={category.isActive ? "active" : "hidden"} tone={category.isActive ? "active" : "inactive"} />
            </div>
            <div className="mt-4 flex gap-3">
              <Link href={`/admin/categories?edit=${category.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Edit</Link>
              <form action={deleteCategoryAction}><input type="hidden" name="id" value={category.id} /><button className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200">Delete</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

