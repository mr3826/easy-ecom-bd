import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  inactive: "bg-[color:var(--surface-soft)] text-[color:var(--muted)] ring-[color:var(--border)]",
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  draft: "bg-[color:var(--surface-soft)] text-[color:var(--muted)] ring-[color:var(--border)]",
  confirmed: "bg-[#f4ded9] text-[color:var(--brand)] ring-[#e8c9c1]",
  processing: "bg-[#dfe6f1] text-[#334155] ring-[#ccd5e3]",
  paid: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  failed: "bg-rose-100 text-rose-800 ring-rose-200",
  cancelled: "bg-[color:var(--surface-soft)] text-[color:var(--muted)] ring-[color:var(--border)]",
  refunded: "bg-violet-100 text-violet-800 ring-violet-200",
  delivered: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  in_transit: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  picked_up: "bg-[#f4ded9] text-[color:var(--brand)] ring-[#e8c9c1]",
  returned: "bg-orange-100 text-orange-800 ring-orange-200",
};

export function StatusPill({
  label,
  tone = "inactive",
}: {
  label: string;
  tone?: keyof typeof toneMap | string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset",
        toneMap[tone] ?? toneMap.inactive,
      )}
    >
      {label}
    </span>
  );
}
