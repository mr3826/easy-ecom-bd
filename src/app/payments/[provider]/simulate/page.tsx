import Link from "next/link";
import { notFound } from "next/navigation";
import { listPayments } from "@/server/store";

const providerNames: Record<string, string> = {
  bkash: "bKash",
};

export const dynamic = "force-dynamic";

export default async function PaymentSimPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string }>;
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { provider } = await params;
  const { paymentId } = await searchParams;
  const payments = await listPayments();
  const payment = paymentId ? payments.find((item) => item.id === paymentId) : undefined;
  if (provider !== "bkash") notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{providerNames[provider]} simulation</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Confirm or cancel the payment handoff</h1>
        <p className="mt-3 text-slate-600">
          The live provider integration would redirect here only for demo/testing. In production this page is replaced by the merchant gateway.
        </p>
        <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm text-slate-700">
          <p className="font-medium text-slate-950">Payment ID</p>
          <p className="mt-1 font-mono">{payment?.id ?? "unknown"}</p>
          <p className="mt-3 font-medium text-slate-950">Status</p>
          <p className="mt-1">{payment?.status ?? "processing"}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={`/api/payments/${provider}/callback`} method="post">
            <input type="hidden" name="paymentId" value={payment?.id ?? ""} />
            <input type="hidden" name="status" value="paid" />
            <button className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">Confirm payment</button>
          </form>
          <form action={`/api/payments/${provider}/callback`} method="post">
            <input type="hidden" name="paymentId" value={payment?.id ?? ""} />
            <input type="hidden" name="status" value="failed" />
            <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Mark failed</button>
          </form>
          <Link href="/checkout" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
            Back to checkout
          </Link>
        </div>
      </div>
    </main>
  );
}
