"use client";

import { useActionState, useEffect } from "react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { createAddressAction, updateAddressAction } from "@/app/actions";
import type { Address } from "@/lib/domain";

type AddressFormValues = Pick<
  Address,
  "name" | "phone" | "email" | "district" | "addressLine1" | "addressLine2" | "city" | "state" | "postalCode" | "isDefault"
>;

const emptyValues: AddressFormValues = {
  name: "",
  phone: "",
  email: "",
  district: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  isDefault: false,
};

export function AddressForm({ address, onDone }: { address?: Address; onDone?: () => void }) {
  const action = address ? updateAddressAction : createAddressAction;
  const [state, formAction] = useActionState(action, {});
  const values = address ?? emptyValues;

  useEffect(() => {
    if (state.success) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="grid gap-4">
      {address ? <input type="hidden" name="addressId" value={address.id} /> : null}

      {state.success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800" role="alert">
          {state.success}
        </div>
      )}
      {state.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800" role="alert">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Recipient name" name="name" required defaultValue={values.name} autoComplete="name" />
        <Field label="Phone" name="phone" required defaultValue={values.phone} type="tel" autoComplete="tel" />
      </div>

      <Field label="Email" name="email" type="email" defaultValue={values.email ?? ""} hint="Optional" autoComplete="email" />

      <Field label="Address line 1" name="addressLine1" required defaultValue={values.addressLine1} autoComplete="address-line1" />
      <Field label="Address line 2" name="addressLine2" defaultValue={values.addressLine2 ?? ""} hint="Optional" autoComplete="address-line2" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" name="city" required defaultValue={values.city} autoComplete="address-level2" />
        <Field label="District" name="district" required defaultValue={values.district} />
        <Field label="Postal code" name="postalCode" required defaultValue={values.postalCode} autoComplete="postal-code" />
      </div>

      <Field label="State/Division" name="state" required defaultValue={values.state} autoComplete="address-level1" />

      <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
        <input type="checkbox" name="isDefault" defaultChecked={values.isDefault} className="h-4 w-4" />
        Set as default address
      </label>

      <Button type="submit" variant="primary" pendingWhileSubmitting pendingLabel="Saving…">
        {address ? "Save changes" : "Add address"}
      </Button>
    </form>
  );
}
