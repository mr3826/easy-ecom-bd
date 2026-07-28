import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <div className="w-full rounded-[2rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">Payment cancelled</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-3xl">The order remains unpaid.</h1>
        {paymentId ? <p className="mt-3 text-sm text-[color:var(--muted)]">Payment ID: {paymentId}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/checkout"
            className="touch-target inline-flex items-center justify-center rounded-full bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[color:var(--accent)]"
          >
            Try again
          </Link>
          <Link
            href="/cart"
            className="touch-target inline-flex items-center justify-center rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
          >
            Back to cart
          </Link>
        </div>
      </div>
    </main>
  );
}