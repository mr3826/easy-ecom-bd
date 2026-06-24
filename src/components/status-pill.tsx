import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-700 ring-slate-200",
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  confirmed: "bg-blue-100 text-blue-800 ring-blue-200",
  processing: "bg-sky-100 text-sky-800 ring-sky-200",
  paid: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  failed: "bg-rose-100 text-rose-800 ring-rose-200",
  cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
  refunded: "bg-violet-100 text-violet-800 ring-violet-200",
  delivered: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  in_transit: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  picked_up: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  returned: "bg-orange-100 text-orange-800 ring-orange-200",
  courier_created: "bg-blue-100 text-blue-800 ring-blue-200",
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
