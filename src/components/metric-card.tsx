import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  delta,
  tone = "slate",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "slate" | "emerald" | "amber" | "sky";
}) {
  const styles: Record<typeof tone, string> = {
    slate: "border-slate-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    sky: "border-sky-200 bg-sky-50",
  };

  return (
    <div className={cn("rounded-3xl border p-5 shadow-sm", styles[tone])}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold text-slate-950">{value}</p>
        {delta ? <p className="text-sm font-medium text-slate-500">{delta}</p> : null}
      </div>
    </div>
  );
}

