"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateUserProfileAction } from "@/app/actions";

export function ProfileForm({ initialData }: { initialData: { name: string; email: string; phone?: string | null } }) {
  const [state, formAction] = useActionState(updateUserProfileAction, {
    name: initialData.name,
    email: initialData.email,
    phone: initialData.phone ?? undefined,
  });

  return (
    <form action={formAction} className="grid gap-6">
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

      <Field
        label="Full name"
        name="name"
        required
        defaultValue={state.name ?? initialData.name}
        autoComplete="name"
      />

      <Field
        label="Email"
        name="email"
        type="email"
        required
        defaultValue={state.email ?? initialData.email}
        autoComplete="email"
        inputMode="email"
      />

      <Field
        label="Phone"
        name="phone"
        type="tel"
        defaultValue={state.phone ?? initialData.phone ?? ""}
        autoComplete="tel"
        hint="Optional"
      />

      <Button type="submit" variant="primary" pendingWhileSubmitting pendingLabel="Saving…">
        Save changes
      </Button>
    </form>
  );
}

