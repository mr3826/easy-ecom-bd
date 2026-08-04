"use client";

import { useActionState, useState } from "react";
import { checkoutAction, type CheckoutState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const INITIAL: CheckoutState = {};

export function CheckoutForm({
  userName = "",
  userPhone = "",
  userEmail = "",
}: {
  userName?: string;
  userPhone?: string;
  userEmail?: string;
}) {
  const [state, formAction] = useActionState(checkoutAction, INITIAL);

  const [customerName, setCustomerName] = useState(state.customerName ?? userName ?? "");
  const [customerPhone, setCustomerPhone] = useState(state.customerPhone ?? userPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(state.customerEmail ?? userEmail ?? "");
  const [district, setDistrict] = useState(state.district ?? "");
  const [shippingAddress, setShippingAddress] = useState(state.shippingAddress ?? "");
  const [notes, setNotes] = useState(state.notes ?? "");
  const [couponCode, setCouponCode] = useState(state.couponCode ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bkash">(state.paymentMethod ?? "cod");

  return (
    <form action={formAction} className="mt-7 grid gap-5">
      {state.error ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Name"
          name="customerName"
          required
          autoComplete="name"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
        />
        <Field
          label="Phone"
          name="customerPhone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="District"
          name="district"
          required
          autoComplete="address-level1"
          placeholder="Dhaka"
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
        />
        <Field
          label="Email"
          name="customerEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={customerEmail}
          onChange={(event) => setCustomerEmail(event.target.value)}
        />
      </div>

      <Field
        label="Shipping address"
        name="shippingAddress"
        required
        autoComplete="street-address"
        placeholder="House, road, area, landmark"
        render={({ id, className, "aria-describedby": describedBy }) => (
          <textarea
            id={id}
            name="shippingAddress"
            rows={4}
            required
            autoComplete="street-address"
            placeholder="House, road, area, landmark"
            aria-describedby={describedBy}
            className={className}
            value={shippingAddress}
            onChange={(event) => setShippingAddress(event.target.value)}
          />
        )}
      />

      <Field
        label="Coupon code"
        name="couponCode"
        placeholder="Optional"
        autoComplete="off"
        autoCapitalize="characters"
        value={couponCode}
        onChange={(event) => setCouponCode(event.target.value)}
      />

      <Field
        label="Notes"
        name="notes"
        placeholder="Delivery instructions or product note"
        render={({ id, className, "aria-describedby": describedBy }) => (
          <textarea
            id={id}
            name="notes"
            rows={3}
            placeholder="Delivery instructions or product note"
            aria-describedby={describedBy}
            className={className}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        )}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label
          className={`flex min-h-14 items-start gap-3 rounded-3xl border p-4 transition ${
            paymentMethod === "cod" ? "border-[color:var(--brand)]/40 bg-[color:var(--brand-soft)]" : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="cod"
            checked={paymentMethod === "cod"}
            onChange={() => setPaymentMethod("cod")}
            className="mt-1 h-4 w-4 text-[color:var(--brand)] focus:ring-[color:var(--brand)]/40"
          />
          <span className="grid gap-1">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">Cash on Delivery</span>
            <span className="text-xs leading-5 text-[color:var(--muted)]">Pay when the parcel arrives</span>
          </span>
        </label>
        <label
          className={`flex min-h-14 items-start gap-3 rounded-3xl border p-4 transition ${
            paymentMethod === "bkash" ? "border-[color:var(--brand)]/40 bg-[color:var(--brand-soft)]" : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="bkash"
            checked={paymentMethod === "bkash"}
            onChange={() => setPaymentMethod("bkash")}
            className="mt-1 h-4 w-4 text-[color:var(--brand)] focus:ring-[color:var(--brand)]/40"
          />
          <span className="grid gap-1">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">bKash</span>
            <span className="text-xs leading-5 text-[color:var(--muted)]">bKash checkout after order creation</span>
          </span>
        </label>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-xs text-[color:var(--muted)] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
        <span className="shrink-0 rounded-full bg-[color:var(--surface-soft)] px-3 py-2">COD depends on delivery zone</span>
        <span className="shrink-0 rounded-full bg-[color:var(--surface-soft)] px-3 py-2">bKash follows shop settings</span>
        <span className="shrink-0 rounded-full bg-[color:var(--surface-soft)] px-3 py-2">Support answers fast</span>
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        pendingWhileSubmitting
        pendingLabel="Placing your order…"
        className="uppercase tracking-[0.18em]"
      >
        Place order and continue
      </Button>
    </form>
  );
}