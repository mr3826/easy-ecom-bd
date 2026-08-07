"use client";

import { useActionState, useState, useMemo } from "react";
import { checkoutAction, type CheckoutState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { deliveryDistricts, deriveDeliveryZone, getDeliveryChargeForZone, type DeliverySettings } from "@/lib/delivery";

const INITIAL: CheckoutState = {};

interface CheckoutFormProps {
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  codEnabled: boolean;
  bkashEnabled: boolean;
  deliverySettings: DeliverySettings;
  subtotal: number;
  discountAmount: number;
}

export function CheckoutForm({
  userName = "",
  userPhone = "",
  userEmail = "",
  codEnabled,
  bkashEnabled,
  deliverySettings,
  subtotal,
  discountAmount,
}: CheckoutFormProps) {
  const [state, formAction] = useActionState(checkoutAction, INITIAL);

  const [customerName, setCustomerName] = useState(state.customerName ?? userName ?? "");
  const [customerPhone, setCustomerPhone] = useState(state.customerPhone ?? userPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(state.customerEmail ?? userEmail ?? "");
  const [district, setDistrict] = useState(state.district ?? "");
  const [shippingAddress, setShippingAddress] = useState(state.shippingAddress ?? "");
  const [notes, setNotes] = useState(state.notes ?? "");
  const [couponCode, setCouponCode] = useState(state.couponCode ?? "");
  
  const enabledPaymentMethods = useMemo(() => {
    const methods: Array<"cod" | "bkash"> = [];
    if (codEnabled) methods.push("cod");
    if (bkashEnabled) methods.push("bkash");
    return methods;
  }, [codEnabled, bkashEnabled]);

  // Compute default payment method from state or first enabled method
  const defaultPaymentMethod = useMemo(() => {
    if (state.paymentMethod && enabledPaymentMethods.includes(state.paymentMethod)) {
      return state.paymentMethod;
    }
    return enabledPaymentMethods[0] ?? "cod";
  }, [state.paymentMethod, enabledPaymentMethods]);

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bkash">(defaultPaymentMethod);

  const deliveryZone = useMemo(() => deriveDeliveryZone(district), [district]);
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const deliveryFee = useMemo(
    () => getDeliveryChargeForZone(deliverySettings, deliveryZone, subtotalAfterDiscount),
    [deliverySettings, deliveryZone, subtotalAfterDiscount]
  );

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
          render={({ id, className, "aria-describedby": describedBy }) => (
            <select
              id={id}
              name="district"
              required
              autoComplete="address-level1"
              aria-describedby={describedBy}
              className={className}
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
            >
              <option value="">Select a district</option>
              {deliveryDistricts.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.name}
                </option>
              ))}
            </select>
          )}
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
        {enabledPaymentMethods.map((method) => (
          <label
            key={method}
            className={`flex min-h-14 items-start gap-3 rounded-3xl border p-4 transition ${
              paymentMethod === method
                ? "border-[color:var(--brand)]/40 bg-[color:var(--brand-soft)]"
                : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method}
              checked={paymentMethod === method}
              onChange={() => setPaymentMethod(method)}
              className="mt-1 h-4 w-4 text-[color:var(--brand)] focus:ring-[color:var(--brand)]/40"
            />
            <span className="grid gap-1">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">
                {method === "cod" ? "Cash on Delivery" : "bKash"}
              </span>
              <span className="text-xs leading-5 text-[color:var(--muted)]">
                {method === "cod" ? "Pay when the parcel arrives" : "bKash checkout after order creation"}
              </span>
            </span>
          </label>
        ))}
        {enabledPaymentMethods.length === 0 && (
          <div className="col-span-2 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 text-center text-sm text-[color:var(--muted)]">
            No payment methods available. Please contact support.
          </div>
        )}
      </div>

      {district && (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[color:var(--muted)]">Delivery fee</span>
            <span className="font-medium text-[color:var(--foreground)]">
              {deliveryFee === 0 ? "Free" : deliveryFee.toLocaleString("en-BD") + " BDT"}
            </span>
          </div>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Zone: {deliveryZone.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} · Free delivery over {deliverySettings.freeDeliveryThreshold.toLocaleString("en-BD")} BDT
          </p>
        </div>
      )}

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
