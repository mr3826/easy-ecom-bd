import Link from "next/link";

export default async function PaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Payment cancelled</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">The order remains unpaid.</h1>
        <p className="mt-3 text-slate-600">Payment ID: {paymentId}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/checkout" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
            Try again
          </Link>
          <Link href="/cart" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
            Back to cart
          </Link>
        </div>
      </div>
    </main>
  );
}

