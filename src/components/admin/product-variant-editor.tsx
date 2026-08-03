"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductVariantGroup } from "@/lib/domain";

type VariantGroupDraft = {
  id: string;
  name: string;
  optionsText: string;
  priceAdjustment: string;
  sku: string;
};

function makeDraft(group?: ProductVariantGroup, index = 0): VariantGroupDraft {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: group?.name ?? "",
    optionsText: group?.options?.join(", ") ?? "",
    priceAdjustment: String(group?.priceAdjustment ?? 0),
    sku: group?.sku ?? "",
  };
}

export function ProductVariantEditor({
  initialGroups,
}: {
  initialGroups: ProductVariantGroup[];
}) {
  const inputId = useId();
  const [groups, setGroups] = useState<VariantGroupDraft[]>(
    initialGroups.length ? initialGroups.map((group, index) => makeDraft(group, index)) : [makeDraft(undefined, 0)],
  );

  const updateGroup = (id: string, patch: Partial<VariantGroupDraft>) => {
    setGroups((current) => current.map((group) => (group.id === id ? { ...group, ...patch } : group)));
  };

  const addGroup = () => {
    setGroups((current) => [...current, makeDraft(undefined, current.length)]);
  };

  const removeGroup = (id: string) => {
    setGroups((current) => {
      const next = current.filter((group) => group.id !== id);
      return next.length ? next : [makeDraft(undefined, 0)];
    });
  };

  const serializedGroups = groups.map((group) => ({
    name: group.name.trim(),
    options: group.optionsText
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
    priceAdjustment: Number(group.priceAdjustment || 0),
    sku: group.sku.trim() || undefined,
  }));

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--foreground)]">Variant groups</p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Capture size, color, or bundle options now. The storefront can stay unchanged until variant pricing is needed.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addGroup}>
          <Plus className="h-4 w-4" />
          Add group
        </Button>
      </div>

      <div className="grid gap-4">
        {groups.map((group, index) => (
          <section key={group.id} className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Variant group {index + 1}</p>
                <h3 className="mt-1 text-base font-semibold text-[color:var(--foreground)]">{group.name.trim() || "Untitled group"}</h3>
              </div>
              {groups.length > 1 ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removeGroup(group.id)}
                  aria-label={`Remove variant group ${index + 1}`}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                <span>Variant name</span>
                <input
                  value={group.name}
                  onChange={(event) => updateGroup(group.id, { name: event.target.value })}
                  placeholder="Size, Color, Material"
                  className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none ring-0 placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60"
                />
              </label>
              <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                <span>Options</span>
                <textarea
                  value={group.optionsText}
                  onChange={(event) => updateGroup(group.id, { optionsText: event.target.value })}
                  rows={3}
                  placeholder="Small, Medium, Large"
                  className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none ring-0 placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                  <span>Price adjustment</span>
                  <input
                    type="number"
                    value={group.priceAdjustment}
                    onChange={(event) => updateGroup(group.id, { priceAdjustment: event.target.value })}
                    placeholder="0"
                    className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none ring-0 placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60"
                  />
                </label>
                <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                  <span>Variant SKU</span>
                  <input
                    value={group.sku}
                    onChange={(event) => updateGroup(group.id, { sku: event.target.value })}
                    placeholder="Optional SKU"
                    className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none ring-0 placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60"
                  />
                </label>
              </div>
            </div>
          </section>
        ))}
      </div>

      <input id={inputId} type="hidden" name="variantGroupsJson" value={JSON.stringify(serializedGroups)} />
    </div>
  );
}
