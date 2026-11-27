import ArrowDown from "lucide-react-native/icons/arrow-down";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import Bell from "lucide-react-native/icons/bell";
import SkipForward from "lucide-react-native/icons/skip-forward";
import { useEffect, useRef } from "react";
import { StyleSheet, useWindowDimensions, View, type HostInstance } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { HabitIcon } from "@/components/ui/HabitIcon";
import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/Pressable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { Text } from "@/components/ui/Text";
import { formatTime } from "@/data/dates";
import { isDaily, spokenStreak } from "@/data/streakCopy";

/** The streak's unit after the flame on a row: "days" for daily habits, "in a row" otherwise. */
function streakUnitShort(habit: Pick<Habit, "schedule">, n: number): string {
  return isDaily(habit) ? (n === 1 ? "day" : "days") : "in a row";
}
import type { Habit } from "@/data/types";
import { openHabitWithHero } from "@/lib/openHabit";
import { elevation, motion, radius, rgba, space, useTheme } from "@/theme";

import { CheckButton } from "./CheckButton";
import type { RowHelpers } from "./SortableHabitList";

/** Every row on Today has the same height so drag-to-reorder can snap to slots. */
export const ROW_HEIGHT = 76;
export const ROW_GAP = 12;

/** Row height grows with the system text size (Dynamic Type / font scale, capped like Text at 1.4x). */
export function useRowHeight(): number {
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(1.4, Math.max(1, fontScale || 1));
  return Math.round(ROW_HEIGHT + (scale - 1) * 72);
}

export interface HabitRowProps {
  habit: Habit;
  value: number;
  streak: number;
  freezes: number;
  skipped: boolean;
  onCheck: () => void;
  /** Viewing a past day: hide reminder, label accordingly. */
  pastDay?: boolean;
  /** List helpers: gesture state, screen-reader actions, keyboard shortcuts and reorder mode. */
  helpers?: RowHelpers;
}

/**
 * A habit on Today: icon tile, name, streak in words and progress or
 * reminder, and the check button. Two sibling controls (open details /
 * check in) so there is never a button inside a button.
 */
export function HabitRow({ habit, value, streak, freezes, skipped, onCheck, pastDay, helpers }: HabitRowProps) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const reduced = useReducedMotion();
  const done = value >= habit.target;
  const isTarget = habit.target > 1;
  const iconRef = useRef<HostInstance>(null);
  const rowHeight = useRowHeight();

  const tint = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    tint.value = reduced ? (done ? 1 : 0) : withTiming(done ? 1 : 0, { duration: 320 });
  }, [done, reduced, tint]);
  // A done habit steps back: the card goes flat onto the canvas with a hairline, so the open ones stand out.
  const from = rgba(colors.surface, 1);
  const to = rgba(colors.surface, 0);
  const borderFrom = isDark ? rgba(colors.line, 1) : rgba(colors.surface, 0);
  const borderTo = rgba(colors.lineStrong, 1);
  const press = useSharedValue(1);
  const card = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(tint.value, [0, 1], [from, to]),
    borderColor: interpolateColor(tint.value, [0, 1], [borderFrom, borderTo]),
    transform: [{ scale: press.value }],
  }));

  const unit = habit.unit ?? "times";
  const showReminder = !done && !skipped && !pastDay && !isTarget && !!habit.reminder;
  const meta = skipped
    ? pastDay
      ? "Skipped"
      : "Skipped today"
    : isTarget
      ? `${value} of ${habit.target} ${unit}`
      : done
        ? "Done"
        : showReminder
          ? formatTime(habit.reminder as string)
          : habit.detail;

  const checkLabel = skipped
    ? `${habit.name}, skipped. Check in instead`
    : isTarget
      ? done
        ? `${habit.name}, ${habit.target} of ${habit.target} ${unit}, done. Reset`
        : `${habit.name}, ${value} of ${habit.target} ${unit}. Add one`
      : done
        ? `${habit.name}, done. Mark as not done`
        : `Mark ${habit.name} as done`;

  const open = () => {
    if (helpers?.isGestureActive()) return;
    openHabitWithHero(habit.id, iconRef.current);
  };
  const reorder = helpers?.reorder ?? null;

  return (
    <Animated.View style={[styles.card, { borderWidth: 1, height: rowHeight }, done || skipped ? null : elevation("card", colors, isDark), card, skipped ? { opacity: 0.72 } : null]}>
      {/* Visual content. Hidden from assistive tech: the overlay button below carries the full label. */}
      <View style={styles.main} aria-hidden pointerEvents="none">
        <View ref={iconRef} collapsable={false}>
          <HabitIcon icon={habit.icon} color={habit.color} size={48} variant="soft" />
        </View>
        <View style={styles.texts}>
          <Text
            variant="headline"
            numberOfLines={1}
            style={skipped ? { textDecorationLine: "line-through", color: colors.inkMuted } : done ? { color: colors.inkMuted } : null}
          >
            {habit.name}
          </Text>
          <View style={styles.metaRow}>
            {/* The streak in words ("47 days"); freezes are explained on the habit's own page. */}
            <StreakBadge streak={streak} size="sm" variant="plain" unit={isDaily(habit) ? "day" : "check-in"} unitLabel={streak > 0 ? streakUnitShort(habit, streak) : undefined} />
            <View style={[styles.dot, { backgroundColor: colors.lineStrong }]} />
            {skipped ? <SkipForward size={12} color={colors.inkSubtle} strokeWidth={2.4} /> : null}
            {showReminder ? <Bell size={12} color={colors.inkMuted} strokeWidth={2.4} /> : null}
            <Text variant="caption" color={done && !isTarget ? colors.successText : colors.inkMuted} numberOfLines={1} style={styles.metaText}>
              {meta}
            </Text>
          </View>
          {isTarget && !skipped ? (
            <ProgressBar progress={value / habit.target} color={colors.success} trackColor={colors.track} height={5} segments={habit.target} style={styles.bar} />
          ) : null}
        </View>
      </View>
      {/* Stretched button over the content (everything but the check button). */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}. ${showReminder ? `Reminder ${meta}` : meta}. ${streak > 0 ? spokenStreak(habit, streak) : "No streak yet"}${freezes ? `, ${freezes} streak ${freezes === 1 ? "freeze" : "freezes"}` : ""}`}
        accessibilityHint={reorder ? "Use Move up and Move down to reorder" : "Opens habit details. More actions: check in, skip, move."}
        accessibilityActions={helpers?.accessibilityActions}
        onAccessibilityAction={helpers?.onAccessibilityAction}
        onKeyDown={helpers?.onKeyDown}
        onPress={open}
        onPressIn={() => {
          if (!reduced) press.value = withSpring(0.985, motion.spring.press);
        }}
        onPressOut={() => {
          press.value = withSpring(1, motion.spring.press);
        }}
        pressScale={1}
        style={styles.overlay}
      />
      {reorder ? (
        <View style={styles.moves}>
          <IconButton icon={ArrowUp} label={`Move ${habit.name} up`} variant="muted" size={40} iconSize={18} disabled={!reorder.up} onPress={() => reorder.up?.()} />
          <IconButton icon={ArrowDown} label={`Move ${habit.name} down`} variant="muted" size={40} iconSize={18} disabled={!reorder.down} onPress={() => reorder.down?.()} />
        </View>
      ) : (
        <View style={styles.check}>
          <CheckButton habit={habit} value={value} skipped={skipped} onPress={onCheck} size={44} accessibilityLabel={checkLabel} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", borderRadius: radius.card, paddingRight: space[3] + 2 },
  main: { flex: 1, height: "100%", flexDirection: "row", alignItems: "center", gap: space[3], paddingLeft: space[3] + 2, paddingRight: space[2] },
  texts: { flex: 1, gap: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  dot: { width: 3, height: 3, borderRadius: 2 },
  metaText: { flexShrink: 1 },
  bar: { marginTop: 5, marginRight: space[1] },
  check: { paddingLeft: space[1], zIndex: 2 },
  moves: { flexDirection: "row", gap: space[1.5], paddingLeft: space[1], zIndex: 2 },
  overlay: { position: "absolute", left: 0, top: 0, bottom: 0, right: 44 + space[3] + 2 + space[1], borderRadius: radius.card },
});
