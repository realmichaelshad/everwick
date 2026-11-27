import { Platform, type HostInstance } from "react-native";

/**
 * On the web a host component's ref is its DOM element. These two helpers are
 * the one place that cast is made (null on iOS and Android).
 */
export function domElement(node: HostInstance | null | undefined): HTMLElement | null {
  if (Platform.OS !== "web" || !node) return null;
  return node as unknown as HTMLElement;
}

/** Moves keyboard focus to a host view (web), without scrolling it into view. */
export function focusHost(node: HostInstance | null | undefined): void {
  domElement(node)?.focus({ preventScroll: true });
}
