"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import type { Category } from "@/lib/domain";
import { productSourceOptions } from "@/lib/product-admin";

export function ProductsFilterDrawer({
  categories,
  values,
}: {
  categories: Category[];
  values: {
    q: string;
    category: string;
    status: string;
    source: string;
    minPrice: string;
    maxPrice: string;
  };
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
      >
        <Filter className="h-4 w-4" />
        Filter
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close filter panel"
            className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Filter Products</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Narrow the catalog</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-white/20 hover:text-white"
                aria-label="Close filter panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form method="get" action="/admin/products" className="mt-6 grid flex-1 gap-4 overflow-auto pr-1">
              <input type="hidden" name="q" value={values.q} />

              <label className="grid gap-2 text-sm text-slate-200">
                <span className="font-medium text-slate-100">Category</span>
                <select
                  name="category"
                  defaultValue={values.category}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-slate-200">
                <span className="font-medium text-slate-100">Status</span>
                <select
                  name="status"
                  defaultValue={values.status}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-slate-200">
                <span className="font-medium text-slate-100">Source</span>
                <select
                  name="source"
                  defaultValue={values.source}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
                >
                  <option value="all">All sources</option>
                  {productSourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-slate-200">
                <span className="font-medium text-slate-100">Price range</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="minPrice"
                    defaultValue={values.minPrice}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Min"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
                  />
                  <input
                    name="maxPrice"
                    defaultValue={values.maxPrice}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Max"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
                  />
                </div>
              </label>

              <div className="mt-auto grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                <Link
                  href="/admin/products"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
                >
                  Clear
                </Link>
                <button className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400">
                  Apply
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
