import type { LucideIcon } from "lucide-react-native";
import Check from "lucide-react-native/icons/check";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Info from "lucide-react-native/icons/info";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";

import { elevation, layout, radius, space, useTheme } from "@/theme";

import { PressableScale } from "./Pressable";
import { Text } from "./Text";

export interface ToastOptions {
  message: string;
  tone?: "default" | "success" | "danger";
  icon?: LucideIcon;
  /** Optional inline action, e.g. Undo. */
  action?: { label: string; onPress: () => void };
  /** ms, default 2600 (4200 with an action). */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  /** Element focused when the toast was shown (web), to return focus to if the toast had it. */
  opener: HTMLElement | null;
}

const ToastContext = createContext<{ show: (t: ToastOptions) => void } | null>(null);
const ToastBottomContext = createContext<(bottom: number | null) => void>(() => undefined);

/** Default distance from the bottom of the column: just above the floating tab bar. */
const DEFAULT_BOTTOM = layout.tabBarClearance - 8;

const web = Platform.OS === "web";

/**
 * Hosts the toast at the bottom of the app column (one at a time; a new
 * toast replaces the one on screen). The focused Screen sets the
 * offset (above the tab bar, above a pinned footer such as Save, or near the
 * bottom edge), so a toast never covers the screen's primary action.
 *
 * A toast with an action (Undo) waits while it is hovered or focused, so it
 * never disappears under the pointer or the keyboard; when a focused toast
 * leaves, focus goes back to where it was before.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [bottom, setBottom] = useState<number | null>(null);
  const counter = useRef(0);
  const show = useCallback((t: ToastOptions) => {
    counter.current += 1;
    const id = counter.current;
    const opener = web && typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    // One toast at a time: a new one replaces whatever is showing, so quick actions in a row
    // (check in, swipe, skip) never stack dark bars over the list. Each earlier action can
    // still be undone from its row or day sheet.
    setItems([{ ...t, id, opener }]);
  }, []);
  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      <ToastBottomContext.Provider value={setBottom}>{children}</ToastBottomContext.Provider>
      <View pointerEvents="box-none" style={[styles.host, { bottom: bottom ?? DEFAULT_BOTTOM }]} accessibilityLiveRegion="polite" aria-live="polite">
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { colors, isDark } = useTheme();
  const Icon = item.icon ?? (item.tone === "success" ? Check : item.tone === "danger" ? CircleAlert : Info);
  const iconBg = item.tone === "danger" ? colors.danger : item.tone === "success" ? colors.success : colors.accent;
  const duration = item.duration ?? (item.action ? 4200 : 2600);
  const [held, setHeld] = useState({ hover: false, focus: false });
  const paused = held.hover || held.focus;
  const hadFocus = useRef(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Dismiss timer: paused while the pointer or keyboard focus is on the toast, restarted after.
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => dismissRef.current(), duration);
    return () => clearTimeout(id);
  }, [duration, paused]);

  // A toast that had keyboard focus hands it back to its opener when it goes away.
  useEffect(
    () => () => {
      if (!web || !hadFocus.current) return;
      const opener = item.opener;
      requestAnimationFrame(() => {
        if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
      });
    },
    [item.opener],
  );

  const webHold = web
    ? {
        onMouseEnter: () => setHeld((h) => ({ ...h, hover: true })),
        onMouseLeave: () => setHeld((h) => ({ ...h, hover: false })),
        onFocus: () => {
          hadFocus.current = true;
          setHeld((h) => ({ ...h, focus: true }));
        },
        onBlur: () => {
          hadFocus.current = false;
          setHeld((h) => ({ ...h, focus: false }));
        },
      }
    : {};

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOut.duration(120)}
      role="status"
      {...webHold}
      style={[styles.toast, { backgroundColor: isDark ? colors.surfaceRaised : colors.ink, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }, elevation("floating", colors, isDark)]}
    >
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Icon size={14} color={isDark ? colors.onAccent : "#FFFFFF"} strokeWidth={3} />
      </View>
      <Text variant="callout" color={isDark ? colors.ink : colors.inkInverse} style={styles.message} numberOfLines={2}>
        {item.message}
      </Text>
      {item.action ? (
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            item.action?.onPress();
            onDismiss();
          }}
          style={styles.action}
        >
          <Text variant="caption" color={isDark ? colors.accentText : "#FFB38F"}>
            {item.action.label}
          </Text>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

/** For Screen: sets where toasts sit while this screen is focused (null = above the tab bar). */
export function useSetToastBottom(): (bottom: number | null) => void {
  return useContext(ToastBottomContext);
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: layout.gutter, right: layout.gutter },
  // Anchored to the host's bottom edge, so the outgoing toast fades in place under the incoming one.
  toast: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingVertical: space[1],
    paddingLeft: space[3],
    paddingRight: space[1],
    minHeight: 52,
    borderRadius: radius.lg,
  },
  icon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: space[1] },
  message: { flex: 1, paddingVertical: space[2] },
  /** A full 44x44 target (hitSlop isn't used: react-native-web ignores it). */
  action: { minWidth: 56, minHeight: 44, paddingHorizontal: space[3], alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
});
