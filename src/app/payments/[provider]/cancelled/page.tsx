import { redirect } from "next/navigation";
import { buildOrderTrackingHref } from "@/lib/order-tracking";
import { getOrder, getPaymentById } from "@/server/store";

export const dynamic = "force-dynamic";

type PaymentCancelledSearchParams = {
  paymentId?: string;
};

async function resolveTrackingHref(searchParams: PaymentCancelledSearchParams) {
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

export default async function PaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<PaymentCancelledSearchParams>;
}) {
  const params = await searchParams;
  const trackingHref = await resolveTrackingHref(params);
  redirect(trackingHref);
}
