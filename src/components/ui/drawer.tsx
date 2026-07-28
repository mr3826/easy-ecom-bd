"use client";

import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOverlay } from "./use-overlay";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title but keep it for screen readers. */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  /** Pinned to the bottom, outside the scroll area — cart totals, Apply/Clear. */
  footer?: ReactNode;
  side?: "right" | "top";
  className?: string;
};

/**
 * The single modal surface for the app. Uses h-dvh (not h-screen) so mobile
 * browser chrome can't push the footer off-screen, and pads for the home
 * indicator via .safe-bottom.
 */
export function Drawer({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  children,
  footer,
  side = "right",
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useOverlay(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-scrim)]" role="presentation">
      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-black/45 p-0"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "absolute z-[var(--z-drawer)] flex flex-col bg-white shadow-[0_24px_80px_rgba(139,0,0,0.22)] outline-none",
          side === "right" &&
            "inset-y-0 right-0 h-dvh max-h-dvh w-full border-l border-[color:var(--border)] sm:w-[min(100vw,26rem)]",
          side === "top" &&
            "inset-x-0 top-0 max-h-dvh w-full border-b border-[color:var(--border)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] px-4 py-4 sm:px-6">
          <div className={cn("min-w-0", hideTitle && "sr-only")}>
            <h2 id={titleId} className="truncate text-lg font-semibold text-[color:var(--foreground)]">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-[color:var(--muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="touch-target -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] transition hover:border-[color:var(--brand)]/40 hover:text-[color:var(--brand)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>

        {footer ? (
          <div className="safe-bottom border-t border-[color:var(--border)] px-4 pt-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
