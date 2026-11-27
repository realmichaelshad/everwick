import Check from "lucide-react-native/icons/check";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import SkipForward from "lucide-react-native/icons/skip-forward";
import Undo2 from "lucide-react-native/icons/undo-2";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, View, type AccessibilityActionEvent, type AccessibilityActionInfo, type KeyDownEvent } from "react-native";
import { GestureDetector, useCompetingGestures, usePanGesture, type PanGestureConfig } from "react-native-gesture-handler";
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Text } from "@/components/ui/Text";
import { withTouchAction } from "@/lib/gestures";
import { haptics } from "@/lib/haptics";
import { motion, radius, space, useTheme } from "@/theme";

import { ROW_GAP, useRowHeight } from "./HabitRow";
import { moveId } from "./todayModel";

/** Distance a row must travel before releasing triggers the swipe action. */
const SWIPE_THRESHOLD = 92;
const HOLD_TO_DRAG_MS = 300;

export interface SortableItem {
  id: string;
  /** Swipe right: check in (or undo a check-in). */
  done: boolean;
  /** Swipe left: skip (or unskip). */
  skipped: boolean;
  label: string;
}

/** Handed to each row so its accessible element (the stretched button) carries the list actions. */
export interface RowHelpers {
  /** True while a swipe or drag is in progress, so the release does not also open details. */
  isGestureActive: () => boolean;
  /** Screen-reader actions: Check in, Skip, Move up, Move down (VoiceOver rotor, TalkBack menu). */
  accessibilityActions: AccessibilityActionInfo[];
  onAccessibilityAction: (e: AccessibilityActionEvent) => void;
  /** Web keyboard: S skips or unskips, Alt+Up/Down moves the focused row. */
  onKeyDown?: (e: KeyDownEvent) => void;
  /** Reorder mode: move buttons instead of the check button (null at the ends). */
  reorder: { up: (() => void) | null; down: (() => void) | null } | null;
}

export interface SortableHabitListProps<T extends SortableItem> {
  items: T[];
  renderRow: (item: T, helpers: RowHelpers) => ReactNode;
  onSwipeRight: (item: T) => void;
  onSwipeLeft: (item: T) => void;
  /** New order (ids top to bottom) after a drag. */
  onReorder: (ids: string[]) => void;
  /** Disable drag (e.g. while viewing a past day). */
  reorderEnabled?: boolean;
  /** Called with true when a row is lifted and false when it is dropped (lock the scroll view meanwhile). */
  onDragStateChange?: (dragging: boolean) => void;
  /** Visible reorder mode (keyboard and pointer users): rows show Move up / Move down buttons. */
  reordering?: boolean;
}

type Positions = Record<string, number>;

/**
 * The habit list on Today with three gestures per row, all on the UI thread:
 *  - swipe right to check in, swipe left to skip (rubber-banded, with a
 *    haptic tick when the action arms and a spring back);
 *  - hold and drag to reorder: the row lifts, neighbours spring out of the
 *    way slot by slot, and the new order is committed on release.
 * Rows have a fixed height so slots are simple multiples of ROW_STEP.
 *
 * Every gesture has a non-gesture twin: screen readers get Check in, Skip,
 * Move up and Move down as actions on the row's button; keyboards get S
 * (skip) and Alt+Up/Down (move) on a focused row, plus the visible reorder
 * mode (`reordering`) with Move up / Move down buttons.
 *
 * Touch on the web: rows allow vertical page scrolling (touch-action pan-y),
 * so a person can scroll Today by dragging anywhere; once a row is lifted the
 * list blocks scrolling until it is dropped.
 */
export function SortableHabitList<T extends SortableItem>({ items, renderRow, onSwipeRight, onSwipeLeft, onReorder, reorderEnabled = true, onDragStateChange, reordering = false }: SortableHabitListProps<T>) {
  const rowHeight = useRowHeight();
  const step = rowHeight + ROW_GAP;
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const idsKey = ids.join("|");
  const positions = useSharedValue<Positions>(Object.fromEntries(ids.map((id, i) => [id, i])));
  const activeId = useSharedValue("");
  const lastGestureAt = useRef(0);

  useEffect(() => {
    positions.value = Object.fromEntries(idsKey.split("|").filter(Boolean).map((id, i) => [id, i]));
  }, [idsKey, positions]);

  const markGesture = useCallback(() => {
    lastGestureAt.current = Date.now();
  }, []);

  // Web touch: rows leave vertical panning to the browser (pan-y). While a row is lifted,
  // cancel touchmove so the page doesn't scroll under the finger.
  const dragActive = useRef(false);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const block = (e: TouchEvent) => {
      if (dragActive.current && e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);
  const isGestureActive = useCallback(() => Date.now() - lastGestureAt.current < 450, []);

  const commitOrder = useCallback(
    (next: Positions) => {
      lastGestureAt.current = Date.now();
      dragActive.current = false;
      onDragStateChange?.(false);
      const ordered = Object.entries(next)
        .sort((a, b) => a[1] - b[1])
        .map(([id]) => id);
      if (ordered.join("|") !== idsKey) {
        haptics.complete();
        onReorder(ordered);
      } else haptics.light();
    },
    [idsKey, onReorder, onDragStateChange],
  );
  const dragStarted = useCallback(() => {
    dragActive.current = true;
    onDragStateChange?.(true);
  }, [onDragStateChange]);

  const move = useCallback(
    (id: string, delta: -1 | 1) => {
      const next = moveId(ids, id, delta);
      if (!next) return;
      haptics.selection();
      onReorder(next);
    },
    [ids, onReorder],
  );

  return (
    <View style={{ height: Math.max(0, items.length * step - ROW_GAP) }}>
      {items.map((item, index) => (
        <SortableRow
          key={item.id}
          item={item}
          index={index}
          count={items.length}
          positions={positions}
          activeId={activeId}
          reorderEnabled={reorderEnabled && items.length > 1}
          onGesture={markGesture}
          onDragStart={dragStarted}
          onCommit={commitOrder}
          rowHeight={rowHeight}
          onSwipeRight={() => onSwipeRight(item)}
          onSwipeLeft={() => onSwipeLeft(item)}
          onMove={(delta) => move(item.id, delta)}
          renderRow={(helpers) => renderRow(item, { ...helpers, isGestureActive })}
          reordering={reordering && reorderEnabled && items.length > 1}
        />
      ))}
    </View>
  );
}

interface SortableRowProps {
  item: SortableItem;
  index: number;
  count: number;
  positions: SharedValue<Positions>;
  activeId: SharedValue<string>;
  reorderEnabled: boolean;
  onGesture: () => void;
  onDragStart: () => void;
  onCommit: (positions: Positions) => void;
  rowHeight: number;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onMove: (delta: -1 | 1) => void;
  renderRow: (helpers: Omit<RowHelpers, "isGestureActive">) => ReactNode;
  reordering: boolean;
}

function SortableRow({ item, index, count, positions, activeId, reorderEnabled, onGesture, onDragStart, onCommit, rowHeight, onSwipeRight, onSwipeLeft, onMove, renderRow, reordering }: SortableRowProps) {
  const ROW_STEP = rowHeight + ROW_GAP;
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const id = item.id;
  const dragTop = useSharedValue(index * ROW_STEP);
  const startTop = useSharedValue(0);
  const lift = useSharedValue(0);
  const swipeX = useSharedValue(0);
  const armed = useSharedValue(0); // -1 skip armed, 1 check armed, 0 none
  const swiping = useSharedValue(false);

  const tick = useCallback(() => haptics.selection(), []);
  const pickUp = useCallback(() => {
    haptics.complete();
    onGesture();
    onDragStart();
  }, [onGesture, onDragStart]);

  const drag = usePanGesture(
    withTouchAction<PanGestureConfig>({
      enabled: reorderEnabled && !reordering,
      activateAfterLongPress: HOLD_TO_DRAG_MS,
      onActivate: () => {
        "worklet";
        startTop.value = (positions.value[id] ?? 0) * ROW_STEP;
        dragTop.value = startTop.value;
        activeId.value = id;
        lift.value = withSpring(1, motion.spring.gentle);
        scheduleOnRN(pickUp);
      },
      onUpdate: (e) => {
        "worklet";
        if (activeId.value !== id) return;
        const max = (count - 1) * ROW_STEP;
        dragTop.value = Math.min(max + 16, Math.max(-16, startTop.value + e.translationY));
        const slot = Math.min(count - 1, Math.max(0, Math.round(dragTop.value / ROW_STEP)));
        const current = positions.value[id];
        if (slot !== current) {
          const next: Positions = { ...positions.value };
          for (const key of Object.keys(next)) if (next[key] === slot) next[key] = current;
          next[id] = slot;
          positions.value = next;
          scheduleOnRN(tick);
        }
      },
      onFinalize: () => {
        "worklet";
        if (activeId.value !== id) return;
        dragTop.value = withSpring((positions.value[id] ?? 0) * ROW_STEP, motion.spring.gentle, () => {
          activeId.value = "";
        });
        lift.value = withSpring(0, motion.spring.gentle);
        scheduleOnRN(onCommit, positions.value);
      },
    }, "pan-y"),
  );

  const swipe = usePanGesture(
    withTouchAction<PanGestureConfig>({
      enabled: !reordering,
      activeOffsetX: [-14, 14],
      failOffsetY: [-12, 12],
      onActivate: () => {
        "worklet";
        swiping.value = true;
        scheduleOnRN(onGesture);
      },
      onUpdate: (e) => {
        "worklet";
        const x = e.translationX;
        // Rubber band past the threshold so the row never flies off.
        const limit = SWIPE_THRESHOLD * 1.6;
        swipeX.value = Math.abs(x) <= SWIPE_THRESHOLD ? x : Math.sign(x) * (SWIPE_THRESHOLD + (Math.abs(x) - SWIPE_THRESHOLD) * 0.35);
        swipeX.value = Math.max(-limit, Math.min(limit, swipeX.value));
        const next = swipeX.value >= SWIPE_THRESHOLD ? 1 : swipeX.value <= -SWIPE_THRESHOLD ? -1 : 0;
        if (next !== armed.value) {
          armed.value = next;
          if (next !== 0) scheduleOnRN(tick);
        }
      },
      onFinalize: () => {
        "worklet";
        // Finalize also runs for touches that never became a swipe (plain taps): ignore those.
        if (!swiping.value) return;
        swiping.value = false;
        const fired = armed.value;
        armed.value = 0;
        swipeX.value = withSpring(0, { ...motion.spring.gentle, overshootClamping: false });
        if (fired === 1) scheduleOnRN(onSwipeRight);
        if (fired === -1) scheduleOnRN(onSwipeLeft);
        scheduleOnRN(onGesture);
      },
    }, "pan-y"),
  );

  const gesture = useCompetingGestures(drag, swipe);

  const container = useAnimatedStyle(() => {
    const dragging = activeId.value === id;
    const target = (positions.value[id] ?? 0) * ROW_STEP;
    return {
      top: dragging ? dragTop.value : reduced ? target : withSpring(target, motion.spring.gentle),
      zIndex: dragging ? 20 : 1,
    };
  });
  const card = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }, { scale: 1 + lift.value * 0.035 }, { rotate: `${lift.value * -0.6}deg` }],
    opacity: 1,
  }));
  const shadow = useAnimatedStyle(() => ({ opacity: lift.value }));
  const leftAction = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, swipeX.value / SWIPE_THRESHOLD));
    return { opacity: swipeX.value > 2 ? 1 : 0, transform: [{ scale: interpolate(p, [0, 1], [0.6, 1]) }] };
  });
  const rightAction = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, -swipeX.value / SWIPE_THRESHOLD));
    return { opacity: swipeX.value < -2 ? 1 : 0, transform: [{ scale: interpolate(p, [0, 1], [0.6, 1]) }] };
  });
  const leftBg = useAnimatedStyle(() => ({ opacity: swipeX.value > 2 ? withTiming(armed.value === 1 ? 1 : 0.55, { duration: 120 }) : 0 }));
  const rightBg = useAnimatedStyle(() => ({ opacity: swipeX.value < -2 ? withTiming(armed.value === -1 ? 1 : 0.55, { duration: 120 }) : 0 }));

  const rightLabel = item.done ? "Undo" : "Check in";
  const leftLabel = item.skipped ? "Unskip" : "Skip";
  const RightIcon = item.done ? RotateCcw : Check;
  const LeftIcon = item.skipped ? Undo2 : SkipForward;

  const canMove = reorderEnabled;
  const actions: AccessibilityActionInfo[] = [
    { name: "activate", label: "Open details" },
    { name: "checkIn", label: item.done ? "Mark as not done" : "Check in" },
    { name: "skip", label: item.skipped ? "Unskip" : "Skip" },
    ...(canMove && index > 0 ? [{ name: "moveUp", label: "Move up" }] : []),
    ...(canMove && index < count - 1 ? [{ name: "moveDown", label: "Move down" }] : []),
  ];
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === "checkIn") onSwipeRight();
    else if (name === "skip") onSwipeLeft();
    else if (name === "moveUp") onMove(-1);
    else if (name === "moveDown") onMove(1);
  };
  const onKeyDown =
    Platform.OS === "web"
      ? (e: KeyDownEvent) => {
          const { key, altKey, ctrlKey, metaKey } = e.nativeEvent;
          if ((key === "s" || key === "S") && !altKey && !ctrlKey && !metaKey) {
            e.preventDefault();
            onSwipeLeft();
          } else if (altKey && canMove && (key === "ArrowUp" || key === "ArrowDown")) {
            e.preventDefault();
            onMove(key === "ArrowUp" ? -1 : 1);
          }
        }
      : undefined;
  const row = renderRow({
    accessibilityActions: actions,
    onAccessibilityAction,
    onKeyDown,
    reorder: reordering ? { up: index > 0 ? () => onMove(-1) : null, down: index < count - 1 ? () => onMove(1) : null } : null,
  });

  return (
    <Animated.View style={[styles.slot, { height: rowHeight }, container]}>
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(Math.min(index, 8) * motion.stagger).springify().damping(18).stiffness(180)}>
        {/* swipe backgrounds */}
        <Animated.View style={[styles.actionBg, { backgroundColor: colors.swipeCheck }, leftBg]} />
        <Animated.View style={[styles.actionBg, { backgroundColor: colors.swipeSkip }, rightBg]} />
        <Animated.View style={[styles.actionLeft, leftAction]} aria-hidden>
          <RightIcon size={20} color={colors.onSwipeCheck} strokeWidth={2.8} />
          <Text variant="caption" color={colors.onSwipeCheck}>
            {rightLabel}
          </Text>
        </Animated.View>
        <Animated.View style={[styles.actionRight, rightAction]} aria-hidden>
          <Text variant="caption" color={colors.onSwipeSkip}>
            {leftLabel}
          </Text>
          <LeftIcon size={20} color={colors.onSwipeSkip} strokeWidth={2.6} />
        </Animated.View>

        {/* pan-y: a vertical drag on a row scrolls the page on touch screens (web); swipes and holds still work. */}
        <GestureDetector gesture={gesture} touchAction="pan-y">
          <Animated.View style={card}>
            <Animated.View pointerEvents="none" style={[styles.liftShadow, isDark ? styles.liftShadowDark : null, shadow]} />
            {row}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { position: "absolute", left: 0, right: 0 },
  actionBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.card },
  actionLeft: { position: "absolute", left: space[5], top: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: space[2] },
  actionRight: { position: "absolute", right: space[5], top: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: space[2] },
  liftShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    boxShadow: "0 18px 36px rgba(138, 74, 42, 0.28)",
  },
  liftShadowDark: { boxShadow: "0 18px 40px rgba(0, 0, 0, 0.6)" },
});
