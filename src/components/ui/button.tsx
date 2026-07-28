"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[color:var(--brand)] text-white hover:bg-[color:var(--accent)]",
  secondary:
    "border border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]",
  ghost: "text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)]",
  // Destructive actions must not read as routine ones sitting beside them.
  danger: "border border-rose-300 bg-white text-rose-600 hover:border-rose-500 hover:bg-rose-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-11 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  /**
   * Disable and relabel while the enclosing server action is in flight.
   * The button must be inside the <form> for this to see the action.
   */
  pendingWhileSubmitting?: boolean;
  pendingLabel?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  pendingWhileSubmitting = false,
  pendingLabel,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const { pending } = useFormStatus();
  const busy = pendingWhileSubmitting && pending;

  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "touch-target inline-flex items-center justify-center gap-2 rounded-full font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
    >
      {busy && pendingLabel ? pendingLabel : children}
    </button>
  );
}
