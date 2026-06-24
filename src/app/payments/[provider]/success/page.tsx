import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <div className="w-full rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Payment confirmed</p>
        <h1 className="mt-2 text-3xl font-semibold">The order is now paid.</h1>
        <p className="mt-3 text-emerald-800">Payment ID: {paymentId}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/track" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
            Track order
          </Link>
          <Link href="/admin/orders" className="rounded-full border border-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-900">
            Open admin orders
          </Link>
        </div>
      </div>
    </main>
  );
}
