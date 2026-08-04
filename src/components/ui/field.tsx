import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTROL = cn(
  "w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3",
  "text-[color:var(--foreground)] outline-none transition",
  "placeholder:text-[color:var(--muted)]",
  "focus:border-[color:var(--brand)]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]",
  "aria-[invalid=true]:border-rose-400",
);

export { CONTROL as fieldControlClass };

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  /** Render something other than a plain <input> — a select, textarea, etc. */
  render?: (props: { id: string; className: string; "aria-describedby"?: string }) => ReactNode;
};

/**
 * Wires label/hint/error to the control via ids so screen readers announce them,
 * and keeps the error adjacent to the field rather than in a distant summary.
 *
 * Pass `type`/`inputMode`/`autoComplete` through as normal — getting the right
 * mobile keyboard is a prop here, not a repo-wide audit.
 */
export function Field({ label, hint, error, render, className, ...rest }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = cn(hint && hintId, error && errorId) || undefined;

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[color:var(--foreground)]">
        {label}
        {rest.required ? (
          <span className="ml-1 text-[color:var(--brand)]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {render ? (
        render({ id, className: CONTROL, "aria-describedby": describedBy })
      ) : (
        <input
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, className)}
        />
      )}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-[color:var(--muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
