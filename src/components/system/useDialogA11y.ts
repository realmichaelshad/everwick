import { useEffect, type RefObject } from "react";
import { Platform, type HostInstance } from "react-native";

import { domElement } from "@/lib/dom";

const FOCUSABLE = 'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"]), [role="button"], [role="switch"], [role="checkbox"]';

/**
 * The last element focused outside any dialog. A field with autoFocus moves
 * focus into the panel before the effect below runs, so the opener is taken
 * from here in that case.
 */
let lastOutside: HTMLElement | null = null;
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest?.('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')) lastOutside = target;
    },
    true,
  );
}

/**
 * Web dialog behavior for sheets and dialogs: move focus inside on open, trap
 * Tab within, close on Escape, and return focus to the opener on close.
 * No-op on iOS and Android, where sheets and dialogs are real modals
 * (ModalLayer): the system keeps screen readers inside and Back closes them.
 */
export function useDialogA11y(ref: RefObject<HostInstance | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (Platform.OS !== "web" || !open) return;
    const panel = domElement(ref.current);
    if (!panel) return;
    const active = document.activeElement as HTMLElement | null;
    const opener = active && panel.contains(active) ? lastOutside : active;
    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true");
    const raf = requestAnimationFrame(() => {
      const first = focusables()[0];
      (first ?? panel).focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open, onClose, ref]);
}
