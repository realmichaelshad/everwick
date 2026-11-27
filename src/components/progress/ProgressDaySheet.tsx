import Check from "lucide-react-native/icons/check";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Minus from "lucide-react-native/icons/minus";
import SkipForward from "lucide-react-native/icons/skip-forward";
import Snowflake from "lucide-react-native/icons/snowflake";
import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { HabitIcon } from "@/components/ui/HabitIcon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { describeSchedule } from "@/data/catalog";
import { addDays, formatLongDate, formatMinutes } from "@/data/dates";
import { dayDetail, type DayDetail, type DayHabitDetail } from "@/data/progressSeries";
import type { DateKey, Habit, History } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { radius, space, useTheme } from "@/theme";

export interface ProgressDaySheetProps {
  /** The day to show, or null when closed. */
  day: DateKey | null;
  onClose: () => void;
  /** Step to another day without closing. */
  onChangeDay: (day: DateKey) => void;
  habits: Habit[];
  history: History;
  today: DateKey;
  /** Earliest day with history (the Previous button stops there). */
  firstDay: DateKey | null;
}

/**
 * One day in detail, opened from the heatmap: the day's ring, then every
 * scheduled habit with what happened (checked in with time, partly done,
 * skipped, covered by a freeze, missed, or still open today). Previous / Next
 * step through days without closing the sheet.
 */
export function ProgressDaySheet({ day, onClose, onChangeDay, habits, history, today, firstDay }: ProgressDaySheetProps) {
  // Keep the last day while the sheet animates out.
  const [shown, setShown] = useState<DateKey | null>(day);
  useEffect(() => {
    if (day) setShown(day);
  }, [day]);
  const detail = useMemo(() => (shown ? dayDetail(habits, history, today, shown) : null), [habits, history, shown, today]);
  if (!shown || !detail) return null;

  const prev = addDays(shown, -1);
  const next = addDays(shown, 1);
  const canPrev = !!firstDay && prev >= firstDay;
  const canNext = next <= today;
  const go = (key: DateKey) => {
    haptics.selection();
    onChangeDay(key);
  };

  return (
    <Sheet
      visible={day != null}
      onClose={onClose}
      title={detail.isToday ? "Today" : formatLongDate(shown)}
      description={detail.isToday ? formatLongDate(shown) : undefined}
      footer={
        <View style={styles.footer}>
          <Button label="Previous day" icon={ChevronLeft} variant="secondary" size="md" disabled={!canPrev} onPress={() => go(prev)} style={styles.flex} />
          <Button label="Next day" iconRight={ChevronRight} variant="secondary" size="md" disabled={!canNext} onPress={() => go(next)} style={styles.flex} />
        </View>
      }
    >
      <DaySummaryBlock detail={detail} />
      {detail.habits.length ? (
        <View style={styles.list}>
          {detail.habits.map((d) => (
            <HabitLine key={d.habit.id} detail={d} />
          ))}
        </View>
      ) : null}
      {detail.resting.length ? (
        <Text variant="caption" tone="subtle">
          Resting: {detail.resting.map((h) => `${h.name} (${describeSchedule(h.schedule)})`).join(", ")}
        </Text>
      ) : null}
    </Sheet>
  );
}

function DaySummaryBlock({ detail }: { detail: DayDetail }) {
  const { colors } = useTheme();
  const { summary } = detail;
  const frozen = detail.habits.filter((d) => d.state === "frozen").length;
  const pct = Math.round(summary.rate * 100);
  const perfect = summary.scheduled > 0 && summary.done === summary.scheduled;
  const open = detail.habits.filter((d) => d.state === "open" || (detail.isToday && d.state === "partial")).length;

  let headline: string;
  let body: string;
  if (detail.beforeHistory) {
    headline = "Before your first habit";
    body = "Nothing was tracked yet on this day.";
  } else if (!summary.scheduled) {
    headline = "Rest day";
    body = summary.skipped ? "Everything due was skipped. Streaks stayed safe." : "Nothing was scheduled. Rest is part of the plan.";
  } else {
    headline = `${summary.done} of ${summary.scheduled} ${summary.scheduled === 1 ? "habit" : "habits"}`;
    if (perfect) body = detail.isToday ? "All done for today." : "A perfect day. Every habit checked in.";
    else if (detail.isToday) body = `${open} still open today.`;
    else if (frozen) body = `${frozen === 1 ? "A freeze" : `${frozen} freezes`} kept ${frozen === 1 ? "a streak" : "streaks"} alive.`;
    else body = summary.done ? "Every check-in counts toward the week." : "A quiet day. The next one is a fresh start.";
  }

  return (
    <View style={styles.summary}>
      <ProgressRing
        progress={summary.scheduled ? summary.fraction : 0}
        size={76}
        strokeWidth={9}
        colors={perfect ? [colors.success, colors.success] : undefined}
        accessibilityLabel={summary.scheduled ? `${pct} percent of habits done` : undefined}
      >
        <Text variant="headline" tabular>
          {summary.scheduled ? `${pct}%` : "–"}
        </Text>
      </ProgressRing>
      <View style={styles.flex}>
        <Text variant="title" tabular>
          {headline}
        </Text>
        <Text variant="callout" tone="muted">
          {body}
        </Text>
        {summary.skipped || frozen ? (
          <View style={styles.chips}>
            {summary.skipped ? (
              <View style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
                <SkipForward size={12} color={colors.inkMuted} strokeWidth={2.6} />
                <Text variant="caption" tone="muted" style={styles.chipText}>
                  {summary.skipped} skipped
                </Text>
              </View>
            ) : null}
            {frozen ? (
              <View style={[styles.chip, { backgroundColor: colors.freezeSoft }]}>
                <Snowflake size={12} color={colors.freezeText} strokeWidth={2.6} />
                <Text variant="caption" color={colors.freezeText} style={styles.chipText}>
                  {frozen} {frozen === 1 ? "freeze" : "freezes"} used
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function statusText(d: DayHabitDetail): string {
  const { habit, value, time } = d;
  const unit = habit.unit ?? "times";
  const amount = `${value} of ${habit.target} ${unit}`;
  switch (d.state) {
    case "done":
      return `${habit.target > 1 ? `${habit.target} of ${habit.target} ${unit}` : "Checked in"}${time != null ? ` at ${formatMinutes(time)}` : ""}`;
    case "partial":
      return habit.target > 1 ? amount : "Partly done";
    case "skipped":
      return "Skipped. The streak was safe";
    case "frozen":
      return value > 0 ? `${amount}. A freeze kept the streak` : "Missed. A freeze kept the streak";
    case "missed":
      return "Missed";
    case "open":
      return "Still open";
  }
}

function HabitLine({ detail }: { detail: DayHabitDetail }) {
  const theme = useTheme();
  const { colors } = theme;
  const tone = theme.lit(detail.habit.color);
  const text = statusText(detail);
  const done = detail.state === "done";
  const textColor =
    detail.state === "done" ? tone.ink : detail.state === "frozen" ? colors.freezeText : detail.state === "missed" ? colors.inkSubtle : colors.inkMuted;
  const a11y = Platform.OS === "web" ? {} : { accessible: true, accessibilityLabel: `${detail.habit.name}: ${text}` };

  let glyph: React.ReactNode;
  if (done) {
    glyph = (
      <View style={[styles.glyph, { backgroundColor: tone.solid }]}>
        <Check size={16} color={tone.onSolid} strokeWidth={3} />
      </View>
    );
  } else if (detail.state === "partial" || detail.state === "open") {
    glyph = <ProgressRing progress={detail.value / Math.max(1, detail.habit.target)} size={30} strokeWidth={4} colors={[tone.solid, tone.solid]} trackColor={tone.soft} animate={false} />;
  } else if (detail.state === "frozen") {
    glyph = (
      <View style={[styles.glyph, { backgroundColor: colors.freezeSoft }]}>
        <Snowflake size={15} color={colors.freezeText} strokeWidth={2.6} />
      </View>
    );
  } else if (detail.state === "skipped") {
    glyph = (
      <View style={[styles.glyph, { backgroundColor: colors.surfaceMuted }]}>
        <SkipForward size={14} color={colors.inkMuted} strokeWidth={2.6} />
      </View>
    );
  } else {
    glyph = (
      <View style={[styles.glyph, styles.missed, { borderColor: colors.lineStrong }]}>
        <Minus size={14} color={colors.inkSubtle} strokeWidth={2.6} />
      </View>
    );
  }

  return (
    <View style={styles.line} {...a11y}>
      <HabitIcon icon={detail.habit.icon} color={detail.habit.color} size={40} variant={done ? "solid" : "soft"} />
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {detail.habit.name}
        </Text>
        <Text variant="caption" color={textColor}>
          {text}
        </Text>
      </View>
      <View aria-hidden>{glyph}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: "row", gap: space[2] },
  summary: { flexDirection: "row", alignItems: "center", gap: space[4] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[1.5], marginTop: space[2] },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.pill },
  chipText: { fontSize: 12, lineHeight: 16 },
  list: { gap: space[3] },
  line: { flexDirection: "row", alignItems: "center", gap: space[3] },
  glyph: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  missed: { borderWidth: 1.5, borderStyle: "dashed" },
});
