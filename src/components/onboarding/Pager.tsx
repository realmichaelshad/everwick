import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, StyleSheet, View, type HostInstance, type LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useReducedMotion, withSpring, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { domElement } from "@/lib/dom";
import { motion } from "@/theme";

/** Snap spring for the pager: quick, settles without a visible wobble. */
export const PAGER_SPRING = { damping: 24, stiffness: 210, mass: 0.9 } as const;

export interface PagerProps {
  /** The active page. */
  index: number;
  onIndexChange: (index: number) => void;
  /**
   * Continuous position in pages (0 = first page, 1.5 = halfway to the third).
   * Owned by the parent so dots and parallax can follow the finger.
   */
  position: SharedValue<number>;
  children: ReactNode;
}

/**
 * Horizontal pager: pages sit side by side and slide with a spring. Drag with
 * a finger (or the mouse on web) to move between them; a flick or a drag
 * past a third of the width turns the page, and the edges rubber-band.
 * Only the active page is reachable by keyboard and screen readers.
 */
export function Pager({ index, onIndexChange, position, children }: PagerProps) {
  const pages = Children.toArray(children);
  const count = pages.length;
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  // The page a swipe just settled on: its spring (with the flick's velocity) is already running.
  const swiped = useRef<number | null>(null);

  // Follow index changes from buttons (Continue, Back) with the same spring as a swipe.
  useEffect(() => {
    if (swiped.current === index) {
      swiped.current = null;
      return;
    }
    swiped.current = null;
    position.value = reduced ? index : withSpring(index, PAGER_SPRING);
  }, [index, position, reduced]);

  const settle = (next: number) => {
    swiped.current = next;
    onIndexChange(next);
  };

  const pan = usePanGesture({
    enabled: width > 0,
    activeOffsetX: [-12, 12],
    failOffsetY: [-14, 14],
    onUpdate: (e) => {
      "worklet";
      const raw = index - e.translationX / width;
      // Rubber band past the first and last page.
      const min = 0;
      const max = count - 1;
      position.value = raw < min ? min - (min - raw) * 0.28 : raw > max ? max + (raw - max) * 0.28 : raw;
    },
    onDeactivate: (e) => {
      "worklet";
      const flick = Math.abs(e.velocityX) > 520 ? -Math.sign(e.velocityX) : 0;
      const dragged = -e.translationX / width;
      let next = index;
      if (flick !== 0) next = index + flick;
      else if (Math.abs(dragged) > 0.33) next = index + Math.sign(dragged);
      next = Math.max(0, Math.min(count - 1, next));
      const velocity = -e.velocityX / width;
      position.value = reduced ? next : withSpring(next, { ...PAGER_SPRING, velocity });
      if (next !== index) scheduleOnRN(settle, next);
    },
    onFinalize: (e) => {
      "worklet";
      // A cancelled drag (another gesture took over) returns to the current page.
      if (e.canceled) position.value = reduced ? index : withSpring(index, motion.spring.gentle);
    },
  });

  const track = useAnimatedStyle(() => ({ transform: [{ translateX: -position.value * width }] }));

  return (
    <View style={styles.viewport} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.track, { width: Math.max(1, width) * count }, track]}>
          {pages.map((page, i) => (
            <Page key={i} active={i === index} width={width}>
              {page}
            </Page>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**
 * One page. Inactive pages stay mounted (so a swipe shows them sliding in)
 * but are inert: no keyboard focus, hidden from assistive technology.
 */
function Page({ active, width, children }: { active: boolean; width: number; children: ReactNode }) {
  const ref = useRef<HostInstance>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = domElement(ref.current);
    if (!el) return;
    el.inert = !active;
    if (active) el.removeAttribute("aria-hidden");
    else el.setAttribute("aria-hidden", "true");
  }, [active]);
  // Native screen readers: hide the off-screen pages (web uses `inert` above, so these props never reach the DOM).
  const nativeHidden =
    Platform.OS === "web" ? null : ({ accessibilityElementsHidden: !active, importantForAccessibility: active ? "auto" : "no-hide-descendants" } as const);
  return (
    <View ref={ref} style={[styles.page, { width: width || "100%" }]} {...nativeHidden}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: "hidden" },
  track: { flex: 1, flexDirection: "row" },
  page: { height: "100%" },
});
