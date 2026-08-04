"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// Ref-counted so two overlays open at once can't clobber each other's restore
// value and leave the body permanently unscrollable.
let lockCount = 0;
let restoreOverflow = "";

function lockBodyScroll() {
  if (lockCount === 0) {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = restoreOverflow;
  }
}

/**
 * Everything `role="dialog" aria-modal="true"` promises but nothing in this app
 * previously delivered: the page behind stops scrolling, Tab cycles inside the
 * panel instead of walking into the hidden page, Escape closes, and focus
 * returns to whatever opened it.
 */
export function useOverlay(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>,
) {
  // Kept in a ref so the effect doesn't re-run (and re-lock) on every render
  // just because the parent passed a new closure.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;
    lockBodyScroll();

    // Captured once: the ref is null again by the time cleanup runs on unmount.
    const panel = panelRef.current;
    // Focus the panel itself rather than its first control: dropping the caret
    // straight into a search box scrolls long panels and fights screen readers.
    panel?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const node = panelRef.current;
      if (!node) return;

      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      unlockBodyScroll();
      // Only steal focus back if it is still inside the panel we are unmounting;
      // otherwise we would yank the caret away from wherever the user moved on to.
      if (opener && document.body.contains(opener)) {
        const stillInside = panel?.contains(document.activeElement);
        if (stillInside || document.activeElement === document.body) {
          opener.focus({ preventScroll: true });
        }
      }
    };
  }, [open, panelRef]);
}
