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
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Payment confirmed</p>
        <h1 className="mt-2 text-3xl font-semibold">The order is now paid.</h1>
        <p className="mt-3 text-emerald-800">Payment ID: {paymentId}</p>
        <div className="mt-6 flex gap-3">
          <Link href={trackingHref} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
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
