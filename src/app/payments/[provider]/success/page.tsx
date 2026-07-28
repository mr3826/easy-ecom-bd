import Link from "next/link";
import { buildOrderTrackingHref } from "@/lib/order-tracking";
import { getOrder, getPaymentById } from "@/server/store";

export const dynamic = "force-dynamic";

type PaymentSuccessSearchParams = {
  paymentId?: string;
  orderId?: string;
  orderCode?: string;
  invoice?: string;
};

async function resolveTrackingHref(searchParams: PaymentSuccessSearchParams) {
  const directOrderCode = searchParams.orderCode?.trim() ?? searchParams.invoice?.trim() ?? "";
  if (directOrderCode) {
    return buildOrderTrackingHref(directOrderCode);
  }

  const orderId = searchParams.orderId?.trim();
  if (orderId) {
    const order = await getOrder(orderId);
    if (order?.orderCode) {
      return buildOrderTrackingHref(order.orderCode);
    }
  }

  const paymentId = searchParams.paymentId?.trim();
  if (paymentId) {
    const payment = await getPaymentById(paymentId);
    if (payment) {
      const order = await getOrder(payment.orderId);
      if (order?.orderCode) {
        return buildOrderTrackingHref(order.orderCode);
      }
    }
  }

  return buildOrderTrackingHref(null);
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<PaymentSuccessSearchParams>;
}) {
  const params = await searchParams;
  const trackingHref = await resolveTrackingHref(params);
  const { paymentId } = params;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <div className="w-full rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700">Payment confirmed</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">The order is now paid.</h1>
        {paymentId ? <p className="mt-3 break-all text-sm text-emerald-800">Payment ID: {paymentId}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={trackingHref}
            className="touch-target inline-flex items-center justify-center rounded-full bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[color:var(--accent)]"
          >
            Track order
          </Link>
          <Link
            href="/admin/orders"
            className="touch-target inline-flex items-center justify-center rounded-full border border-emerald-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-900 transition hover:bg-emerald-100"
          >
            Open admin orders
          </Link>
        </div>
      </div>
    </main>
  );
}
