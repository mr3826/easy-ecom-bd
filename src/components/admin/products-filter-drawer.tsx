"use client";

import Link from "next/link";
import { useState } from "react";
import { Filter } from "lucide-react";
import type { Category } from "@/lib/domain";
import { productSourceOptions } from "@/lib/product-admin";
import { Drawer } from "@/components/ui/drawer";
import { Field, fieldControlClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const FORM_ID = "admin-products-filter";

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

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filter
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filter products"
        description="Narrow the catalog"
        footer={
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/products"
              className="touch-target inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border)] px-4 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--brand)]/40 hover:bg-[color:var(--surface-soft)]"
            >
              Clear
            </Link>
            {/* `form=` lets the submit live in the pinned footer while staying
                part of the scrollable form above it. */}
            <Button form={FORM_ID} type="submit">
              Apply
            </Button>
          </div>
        }
      >
        <form id={FORM_ID} method="get" action="/admin/products" className="grid gap-4">
          <input type="hidden" name="q" value={values.q} />

          <Field
            label="Category"
            render={(props) => (
              <select {...props} name="category" defaultValue={values.category}>
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          />

          <Field
            label="Status"
            render={(props) => (
              <select {...props} name="status" defaultValue={values.status}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            )}
          />

          <Field
            label="Source"
            render={(props) => (
              <select {...props} name="source" defaultValue={values.source}>
                <option value="all">All sources</option>
                {productSourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          />

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-[color:var(--foreground)]">Price range</legend>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="minPrice"
                defaultValue={values.minPrice}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="Min"
                aria-label="Minimum price"
                className={fieldControlClass}
              />
              <input
                name="maxPrice"
                defaultValue={values.maxPrice}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="Max"
                aria-label="Maximum price"
                className={fieldControlClass}
              />
            </div>
          </fieldset>
        </form>
      </Drawer>
    </>
  );
}
