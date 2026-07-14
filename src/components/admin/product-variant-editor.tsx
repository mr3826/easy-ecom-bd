"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
          <p className="text-sm font-semibold text-white">Variant groups</p>
          <p className="mt-1 text-xs text-slate-400">
            Capture size, color, or bundle options now. The storefront can stay unchanged until variant pricing is needed.
          </p>
        </div>
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200 transition hover:border-sky-400/60 hover:bg-sky-500/20"
        >
          <Plus className="h-4 w-4" />
          Add group
        </button>
      </div>

      <div className="grid gap-4">
        {groups.map((group, index) => (
          <section key={group.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Variant group {index + 1}</p>
                <h3 className="mt-1 text-base font-semibold text-white">{group.name.trim() || "Untitled group"}</h3>
              </div>
              {groups.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-rose-400/60 hover:text-rose-300"
                  aria-label={`Remove variant group ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm">
                <span>Variant name</span>
                <input
                  value={group.name}
                  onChange={(event) => updateGroup(group.id, { name: event.target.value })}
                  placeholder="Size, Color, Material"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Options</span>
                <textarea
                  value={group.optionsText}
                  onChange={(event) => updateGroup(group.id, { optionsText: event.target.value })}
                  rows={3}
                  placeholder="Small, Medium, Large"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span>Price adjustment</span>
                  <input
                    type="number"
                    value={group.priceAdjustment}
                    onChange={(event) => updateGroup(group.id, { priceAdjustment: event.target.value })}
                    placeholder="0"
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>Variant SKU</span>
                  <input
                    value={group.sku}
                    onChange={(event) => updateGroup(group.id, { sku: event.target.value })}
                    placeholder="Optional SKU"
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
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
