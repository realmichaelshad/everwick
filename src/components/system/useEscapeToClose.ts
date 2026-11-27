import { useIsFocused } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

/**
 * Web: Escape closes a modal screen (New habit, Edit habit, Upgrade to Pro)
 * through the same path as its Close button, so a form with changes still
 * asks "Discard changes?". Ignored while a sheet or dialog is open on top
 * (they handle Escape themselves) and while the screen isn't focused.
 * Listens in the capture phase: react-native-web's TextInput stops every key
 * event from bubbling, and Escape must work while typing in a field too.
 */
export function useEscapeToClose(close: () => void) {
  const focused = useIsFocused();
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (Platform.OS !== "web" || !focused || typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      closeRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [focused]);
}
