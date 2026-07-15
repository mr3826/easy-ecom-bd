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
    slate: "border-[color:var(--border)] bg-white",
    emerald: "border-[#d7e7df] bg-[#f5faf7]",
    amber: "border-[#edd9b6] bg-[#fef8ee]",
    sky: "border-[#d9e1f1] bg-[#f5f7fb]",
  };

  return (
    <div className={cn("rounded-[1.75rem] border p-5 shadow-[0_18px_40px_rgba(61,39,35,0.06)]", styles[tone])}>
      <p className="text-sm font-medium text-[color:var(--muted)]">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold text-[color:var(--foreground)]">{value}</p>
        {delta ? <p className="text-sm font-medium text-[color:var(--muted)]">{delta}</p> : null}
      </div>
    </div>
  );
}
