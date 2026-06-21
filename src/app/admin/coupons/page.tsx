import Link from "next/link";
import { saveCouponAction } from "@/app/admin/actions";
import { listCoupons } from "@/server/store";
import { StatusPill } from "@/components/status-pill";

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const coupons = listCoupons();
  const selected = coupons.find((item) => item.id === edit);

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Coupons</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Discount system</h1>
      </div>
      <form action={saveCouponAction} className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 md:grid-cols-2">
        <input type="hidden" name="id" value={selected?.id ?? ""} />
        <label className="grid gap-2 text-sm">
          <span>Code</span>
          <input name="code" defaultValue={selected?.code ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Type</span>
          <select name="type" defaultValue={selected?.type ?? "percentage"} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span>Value</span>
          <input name="value" type="number" defaultValue={selected?.value ?? 0} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Min order amount</span>
          <input name="minOrderAmount" type="number" defaultValue={selected?.minOrderAmount ?? 0} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Description</span>
          <input name="description" defaultValue={selected?.description ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Status</span>
          <select name="isActive" defaultValue={selected?.isActive ? "true" : "false"} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
            <option value="true">Active</option>
            <option value="false">Hidden</option>
          </select>
        </label>
        <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">{selected ? "Update coupon" : "Create coupon"}</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{coupon.code}</h2>
                <p className="mt-1 text-sm text-slate-400">{coupon.description}</p>
              </div>
              <StatusPill label={coupon.isActive ? "active" : "hidden"} tone={coupon.isActive ? "active" : "inactive"} />
            </div>
            <p className="mt-4 text-sm text-slate-300">{coupon.type} · {coupon.value} · min {coupon.minOrderAmount}</p>
            <Link href={`/admin/coupons?edit=${coupon.id}`} className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Edit</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

