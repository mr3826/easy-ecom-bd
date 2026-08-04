import Link from "next/link";
import type { ReactNode } from "react";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";

type AdminTaxonomyPageProps<T extends { id: string; name: string; slug: string; description: string; isActive: boolean }> = {
  listFunction: () => Promise<T[]>;
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  singularLabel: string;
  pluralLabel: string;
  editHrefPrefix: string;
  children?: ReactNode;
};

export function AdminTaxonomyPage<T extends { id: string; name: string; slug: string; description: string; isActive: boolean }>({
  listFunction,
  saveAction,
  deleteAction,
  singularLabel,
  pluralLabel,
  editHrefPrefix,
}: AdminTaxonomyPageProps<T>) {
  return async function AdminTaxonomyPageComponent({
    searchParams,
  }: {
    searchParams: Promise<{ edit?: string }>;
  }) {
    const { edit } = await searchParams;
    const items = await listFunction();
    const selected = items.find((item) => item.id === edit);

    return (
      <div className="space-y-6 text-[color:var(--foreground)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">{pluralLabel}</p>
          <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">{singularLabel} CRUD</h1>
        </div>
        <form action={saveAction} className="grid gap-4 rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6 sm:grid-cols-2">
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
          <Button type="submit">{selected ? `Update ${singularLabel.toLowerCase()}` : `Create ${singularLabel.toLowerCase()}`}</Button>
        </form>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[color:var(--foreground)]">{item.name}</h2>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{item.slug}</p>
                </div>
                <StatusPill label={item.isActive ? "active" : "hidden"} tone={item.isActive ? "active" : "inactive"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <Link href={`/${editHrefPrefix}?edit=${item.id}`}>Edit</Link>
                </Button>
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={item.id} />
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
  };
}