import Check from "lucide-react-native/icons/check";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Snowflake from "lucide-react-native/icons/snowflake";
import { memo, useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeInLeft, FadeInRight, useReducedMotion } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/Pressable";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Text } from "@/components/ui/Text";
import { useRovingFocus, type RovingItemProps } from "@/components/ui/useRovingFocus";
import { fromKey } from "@/data/dates";
import { fractionOn } from "@/data/stats";
import type { DateKey, Habit, History } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { fonts, radius, rgba, space, useTheme } from "@/theme";

import { cellLabel, clampMonth, dayState, inChain, isActionable, monthBounds, monthGrid, monthTitle, shiftMonth, summarizeMonth, weekdayHeaders, type DayState } from "./detailModel";

export interface HabitCalendarProps {
  habit: Habit;
  history: History;
  today: DateKey;
  weekStartsOn: 0 | 1;
  /** Missed days a freeze covered (streakInfo().frozen). */
  frozen: ReadonlySet<DateKey>;
  /** Open the day sheet (check in late, skip, fix a day). */
  onOpenDay: (day: DateKey) => void;
}

const CIRCLE = 36;
const ROW_H = 44;

/**
 * Month calendar for one habit. Done days are solid in the habit color and
 * join into streak chains (frozen days keep the chain going in ice);
 * partial days show a ring, skips a dashed outline, misses a small neutral
 * dot (a missed day is information, not an error, so no red).
 * Tap a past day or today to fix it. Swipe or use the arrows to change
 * month (from the month the habit started to this month).
 */
export function HabitCalendar({ habit, history, today, weekStartsOn, frozen, onOpenDay }: HabitCalendarProps) {
  const theme = useTheme();
  const { colors } = theme;
  const reduced = useReducedMotion();
  const bounds = monthBounds(habit, today);
  const [month, setMonth] = useState(bounds.max);
  const [direction, setDirection] = useState<1 | -1 | 0>(0);
  const current = clampMonth(month, bounds);
  const canPrev = current > bounds.min;
  const canNext = current < bounds.max;

  const go = (delta: 1 | -1) => {
    const next = clampMonth(shiftMonth(current, delta), bounds);
    if (next === current) return;
    haptics.selection();
    setDirection(delta);
    setFocusIndex(null);
    setMonth(next);
  };
  const goNext = () => go(1);
  const goPrev = () => go(-1);

  const swipe = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    onDeactivate: (e) => {
      "worklet";
      if (e.translationX < -48 || e.velocityX < -600) scheduleOnRN(goNext);
      else if (e.translationX > 48 || e.velocityX > 600) scheduleOnRN(goPrev);
    },
  });

  const rows = useMemo(() => monthGrid(current, weekStartsOn), [current, weekStartsOn]);
  const states = useMemo(() => {
    const map = new Map<DateKey, DayState>();
    for (const row of rows) for (const key of row) if (key) map.set(key, dayState(habit, history, key, today, frozen));
    return map;
  }, [rows, habit, history, today, frozen]);
  const summary = useMemo(() => summarizeMonth(habit, history, current, today, frozen), [habit, history, current, today, frozen]);

  // Keyboard (web): the month is one Tab stop; arrow keys move by day and week, Enter opens the day.
  const cells = useMemo(() => rows.flat(), [rows]);
  const actionableAt = useCallback((i: number) => {
    const key = cells[i];
    return !!key && isActionable(states.get(key) ?? "unscheduled");
  }, [cells, states]);
  const defaultFocus = useMemo(() => {
    const todayIndex = cells.indexOf(today);
    if (todayIndex >= 0 && actionableAt(todayIndex)) return todayIndex;
    for (let i = cells.length - 1; i >= 0; i--) if (actionableAt(i)) return i;
    return 0;
  }, [actionableAt, cells, today]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const stop = focusIndex != null && actionableAt(focusIndex) ? focusIndex : defaultFocus;
  const roving = useRovingFocus({ count: cells.length, active: stop, columns: 7, onMove: setFocusIndex, isDisabled: (i) => !actionableAt(i) });
  const headers = weekdayHeaders(weekStartsOn);
  const isTarget = habit.target > 1;

  const summaryText =
    summary.due === 0
      ? current === bounds.max
        ? "Nothing due yet this month"
        : "Nothing was due this month"
      : `${summary.done} of ${summary.due} days done${summary.frozen ? `, ${summary.frozen} ${summary.frozen === 1 ? "freeze" : "freezes"} used` : ""}`;

  const entering = reduced ? undefined : direction === 1 ? FadeInRight.duration(260) : direction === -1 ? FadeInLeft.duration(260) : FadeIn.duration(200);

  return (
    <Card padding={space[4]} style={styles.card}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="title" heading level={3}>
            {monthTitle(current)}
          </Text>
          <Text variant="caption" tone="muted">
            {summaryText}
          </Text>
        </View>
        <IconButton icon={ChevronLeft} label="Previous month" variant="muted" size={36} iconSize={18} disabled={!canPrev} onPress={goPrev} />
        <IconButton icon={ChevronRight} label="Next month" variant="muted" size={36} iconSize={18} disabled={!canNext} onPress={goNext} />
      </View>

      <View style={styles.weekdays} aria-hidden>
        {headers.map((h, i) => (
          <Text key={i} variant="overline" tone="subtle" align="center" style={styles.weekday}>
            {h.letter}
          </Text>
        ))}
      </View>

      <GestureDetector gesture={swipe} touchAction="pan-y">
        <Animated.View key={current} entering={entering} style={styles.grid}>
          {rows.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((key, c) => {
                if (!key) return <View key={c} style={styles.cell} />;
                const state = states.get(key) ?? "unscheduled";
                const left = c > 0 ? (row[c - 1] ? (states.get(row[c - 1] as DateKey) ?? null) : null) : null;
                const right = c < 6 ? (row[c + 1] ? (states.get(row[c + 1] as DateKey) ?? null) : null) : null;
                return (
                  <DayCell
                    key={key}
                    day={key}
                    state={state}
                    isToday={key === today}
                    chainLeft={inChain(state) && inChain(left)}
                    chainRight={inChain(state) && inChain(right)}
                    fraction={state === "partial" ? fractionOn(habit, history, key) : 0}
                    label={cellLabel(habit, history, key, state, today)}
                    color={habit.color}
                    onPress={onOpenDay}
                    roving={roving(r * 7 + c)}
                  />
                );
              })}
            </View>
          ))}
        </Animated.View>
      </GestureDetector>

      <View style={[styles.legend, { borderTopColor: colors.line }]}>
        <LegendItem label="Done">
          <View style={[styles.legendDot, { backgroundColor: theme.lit(habit.color).solid }]} />
        </LegendItem>
        {isTarget ? (
          <LegendItem label="Partly">
            <ProgressRing progress={0.6} size={14} strokeWidth={2.5} colors={[theme.lit(habit.color).solid, theme.lit(habit.color).solid]} trackColor={theme.lit(habit.color).soft} animate={false} />
          </LegendItem>
        ) : null}
        <LegendItem label="Freeze">
          <View style={[styles.legendDot, styles.legendIce, { backgroundColor: colors.freezeSoft }]}>
            <Snowflake size={9} color={colors.freezeText} strokeWidth={3} />
          </View>
        </LegendItem>
        <LegendItem label="Skipped">
          <View style={[styles.legendDot, { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.inkSubtle }]} />
        </LegendItem>
        <LegendItem label="Missed">
          <View style={[styles.missDot, { backgroundColor: colors.inkSubtle }]} />
        </LegendItem>
      </View>
      <Text variant="caption" tone="subtle" style={styles.hint}>
        Tap a day to check in late or fix it.
      </Text>
    </Card>
  );
}

function LegendItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.legendItem}>
      <View aria-hidden style={styles.legendSwatch}>
        {children}
      </View>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

interface DayCellProps {
  day: DateKey;
  state: DayState;
  isToday: boolean;
  chainLeft: boolean;
  chainRight: boolean;
  fraction: number;
  label: string;
  color: Habit["color"];
  onPress: (day: DateKey) => void;
  /** Roving tab stop props (web): one Tab stop for the whole month. */
  roving: RovingItemProps;
}

const DayCell = memo(function DayCell({ day, state, isToday, chainLeft, chainRight, fraction, label, color, onPress, roving }: DayCellProps) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const tone = theme.lit(color);
  const date = fromKey(day).getDate();
  const band = isDark ? rgba(tone.solid, 0.26) : tone.soft;
  const bandIce = state === "frozen";

  let circle: React.ReactNode;
  let text = colors.ink;
  switch (state) {
    case "done":
      circle = <View style={[styles.circle, { backgroundColor: tone.solid }]} />;
      text = tone.onSolid;
      break;
    case "partial":
      circle = (
        <View style={styles.circle}>
          <ProgressRing progress={fraction} size={CIRCLE} strokeWidth={3} colors={[tone.solid, tone.solid]} trackColor={tone.soft} animate={false} />
        </View>
      );
      break;
    case "frozen":
      circle = <View style={[styles.circle, { backgroundColor: colors.freezeSoft, borderWidth: 1.5, borderColor: rgba(colors.freeze, 0.55) }]} />;
      text = colors.freezeText;
      break;
    case "skipped":
      circle = <View style={[styles.circle, { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.lineStrong }]} />;
      text = colors.inkSubtle;
      break;
    case "missed":
    case "open":
      circle = null;
      text = colors.ink;
      break;
    default:
      circle = null;
      text = colors.inkSubtle;
  }
  const inactive = state === "future" || state === "before";

  const visual = (
    <View style={styles.cellInner} aria-hidden pointerEvents="none">
      {chainLeft ? <View style={[styles.bandLeft, { backgroundColor: bandIce ? colors.freezeSoft : band }]} /> : null}
      {chainRight ? <View style={[styles.bandRight, { backgroundColor: bandIce ? colors.freezeSoft : band }]} /> : null}
      {circle}
      {isToday ? <View style={[styles.todayRing, { borderColor: state === "done" ? tone.solid : colors.ink }]} /> : null}
      {state === "frozen" ? (
        <View>
          <Snowflake size={16} color={colors.freezeText} strokeWidth={2.6} />
        </View>
      ) : state === "done" && isToday ? (
        <View>
          <Check size={18} color={tone.onSolid} strokeWidth={3.2} />
        </View>
      ) : (
        <Text style={[styles.date, { color: text }, state === "done" || isToday ? styles.dateBold : null, inactive ? styles.dateLight : null]} tabular>
          {date}
        </Text>
      )}
      {state === "missed" ? <View style={[styles.missDot, styles.missUnder, { backgroundColor: colors.inkSubtle }]} /> : null}
    </View>
  );

  if (!isActionable(state)) {
    return <View style={styles.cell}>{visual}</View>;
  }
  return (
    <View style={styles.cell}>
      {visual}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens this day to check in, skip or undo"
        {...roving}
        pressScale={0.9}
        onPress={() => {
          haptics.selection();
          onPress(day);
        }}
        style={styles.hit}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: { gap: space[3], borderRadius: radius.xl },
  head: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flex: 1, gap: 2 },
  weekdays: { flexDirection: "row" },
  weekday: { flex: 1 },
  grid: { gap: space[1.5] },
  row: { flexDirection: "row" },
  cell: { flex: 1, height: ROW_H },
  cellInner: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  circle: { position: "absolute", width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: "center", justifyContent: "center" },
  bandLeft: { position: "absolute", left: 0, right: "50%", height: CIRCLE },
  bandRight: { position: "absolute", left: "50%", right: 0, height: CIRCLE },
  todayRing: { position: "absolute", width: CIRCLE + 6, height: CIRCLE + 6, borderRadius: (CIRCLE + 6) / 2, borderWidth: 2 },
  date: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
  dateBold: { fontFamily: fonts.bold },
  dateLight: { fontFamily: fonts.medium },
  missDot: { width: 5, height: 5, borderRadius: 3 },
  missUnder: { position: "absolute", bottom: 6 },
  hit: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.pill },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: space[3], rowGap: space[2], borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space[3] },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  legendSwatch: { width: 14, height: 14, alignItems: "center", justifyContent: "center" },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendIce: { width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  hint: { marginTop: -space[1] },
});
