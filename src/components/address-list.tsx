"use client";

import { useState } from "react";
import { AddressForm } from "@/components/address-form";
import { Button } from "@/components/ui/button";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions";
import type { Address } from "@/lib/domain";

export function AddressList({ addresses }: { addresses: Address[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(addresses.length === 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        {addresses.map((address) =>
          editingId === address.id ? (
            <div key={address.id} className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <AddressForm address={address} onDone={() => setEditingId(null)} />
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="mt-4 text-sm font-medium text-[color:var(--muted)] underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div key={address.id} className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {address.isDefault ? (
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Default</p>
                  ) : null}
                  <p className="font-semibold text-[color:var(--foreground)]">{address.name}</p>
                  <p className="text-sm text-[color:var(--muted)]">{address.phone}</p>
                  <p className="mt-2 text-sm text-[color:var(--foreground)]">
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ""}, {address.city}, {address.district}, {address.state}{" "}
                    {address.postalCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(address.id)}
                  className="text-sm font-medium text-[color:var(--brand)] underline"
                >
                  Edit
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {!address.isDefault ? (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="addressId" value={address.id} />
                    <Button type="submit" variant="secondary" size="sm" pendingWhileSubmitting pendingLabel="Setting…">
                      Set as default
                    </Button>
                  </form>
                ) : null}
                <form action={deleteAddressAction}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <Button type="submit" variant="danger" size="sm" pendingWhileSubmitting pendingLabel="Removing…">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ),
        )}
      </div>

      {adding ? (
        <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <h2 className="mb-4 text-lg font-semibold text-[color:var(--foreground)]">Add a new address</h2>
          <AddressForm onDone={() => setAdding(addresses.length === 0)} />
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          Add a new address
        </Button>
      )}
    </div>
  );
}
