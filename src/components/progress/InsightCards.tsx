import type { LucideIcon } from "lucide-react-native";
import Activity from "lucide-react-native/icons/activity";
import CalendarCheck from "lucide-react-native/icons/calendar-check";
import CalendarClock from "lucide-react-native/icons/calendar-clock";
import Lock from "lucide-react-native/icons/lock";
import MoonStar from "lucide-react-native/icons/moon-star";
import Sun from "lucide-react-native/icons/sun";
import Sunrise from "lucide-react-native/icons/sunrise";
import TrendingDown from "lucide-react-native/icons/trending-down";
import TrendingUp from "lucide-react-native/icons/trending-up";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { layoutTimeline, timelineTickLabel, timelineTicks, timelineWindow } from "@/components/reminders/reminderSummary";
import { Card } from "@/components/ui/Card";
import { HabitIcon } from "@/components/ui/HabitIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Text } from "@/components/ui/Text";
import { formatMinutes, orderedWeekdays, WEEKDAY_LETTER } from "@/data/dates";
import { MIN_DAYS_FOR_INSIGHTS, shortName, type Insight, type TimeOfDayPattern } from "@/data/insights";
import type { Habit, Weekday } from "@/data/types";
import { fonts, motion, radius, rgba, space, useTheme } from "@/theme";

export interface InsightCardsProps {
  insights: Insight[];
  habits: Habit[];
  weekStartsOn: 0 | 1;
}

/** 3 to 5 insight cards, each with an icon, a title, one sentence and a tiny visual. */
export function InsightCards({ insights, habits, weekStartsOn }: InsightCardsProps) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.list}>
      {insights.map((insight, i) => (
        <Animated.View key={insight.id} entering={reduced ? undefined : FadeInDown.delay(Math.min(i, 6) * motion.stagger).springify().damping(18).stiffness(180)}>
          <InsightCard insight={insight} habits={habits} weekStartsOn={weekStartsOn} />
        </Animated.View>
      ))}
    </View>
  );
}

const OVERLINE: Record<Insight["kind"], string> = {
  weekday: "Pattern",
  correlation: "Pairing",
  risk: "Heads up",
  time: "Rhythm",
  trend: "Trend",
};

function InsightCard({ insight, habits, weekStartsOn }: { insight: Insight; habits: Habit[]; weekStartsOn: 0 | 1 }) {
  const theme = useTheme();
  const { colors } = theme;
  const find = (id: string) => habits.find((h) => h.id === id);
  const a11y = Platform.OS === "web" ? {} : { accessible: true, accessibilityLabel: `${OVERLINE[insight.kind]}. ${insight.title}. ${insight.body}` };

  let tile: React.ReactNode;
  let visual: React.ReactNode = null;
  switch (insight.kind) {
    case "weekday": {
      tile = <IconTile icon={CalendarCheck} bg={colors.successSoft} fg={colors.successText} />;
      visual = (
        <WeekBars
          values={insight.data.days.map((d) => ({ weekday: d.weekday, value: d.rate, hasData: d.scheduled > 0 }))}
          highlight={insight.data.best.weekday}
          strong={colors.success}
          strongText={colors.successText}
        />
      );
      break;
    }
    case "correlation": {
      const a = find(insight.data.a);
      const b = find(insight.data.b);
      tile = a && b ? <PairTile a={a} b={b} /> : <IconTile icon={Activity} bg={colors.accentSoft} fg={colors.accentText} />;
      if (a && b) {
        const tone = theme.habit(b.color);
        visual = (
          <CompareBars
            rows={[
              { label: `With ${shortName(a.name)}`, value: insight.data.withRate, color: tone.solid },
              { label: "Without", value: insight.data.withoutRate, color: colors.lineStrong },
            ]}
            caption={`How often you finish ${shortName(b.name)}`}
          />
        );
      }
      break;
    }
    case "risk": {
      const h = find(insight.data.habitId);
      tile = <IconTile icon={CalendarClock} bg={colors.accentSoft} fg={colors.accentText} />;
      const byDay = new Map(insight.data.byWeekday.map((d) => [d.weekday, d]));
      visual = (
        <WeekBars
          values={orderedWeekdays(weekStartsOn).map((wd) => {
            const d = byDay.get(wd);
            return { weekday: wd, value: d && d.samples ? 1 - d.missRate : 0, hasData: !!d?.samples };
          })}
          highlight={insight.data.weekday}
          strong={colors.success}
          strongText={colors.accentText}
          caption={h ? `${shortName(h.name)}: how often it gets done, by weekday` : undefined}
        />
      );
      break;
    }
    case "time": {
      const sun = theme.habit("sun");
      const icon = insight.data.part === "morning" ? Sunrise : insight.data.part === "afternoon" ? Sun : MoonStar;
      tile = <IconTile icon={icon} bg={sun.soft} fg={sun.ink} />;
      visual = <DayTimeline pattern={insight.data} habits={habits} />;
      break;
    }
    case "trend": {
      const up = insight.data.points >= 3;
      const down = insight.data.points <= -3;
      tile = (
        <IconTile
          icon={up ? TrendingUp : down ? TrendingDown : Activity}
          bg={up ? colors.successSoft : down ? colors.accentSoft : colors.surfaceMuted}
          fg={up ? colors.successText : down ? colors.accentText : colors.inkMuted}
        />
      );
      const span = insight.data.days;
      visual = (
        <CompareBars
          rows={[
            { label: `Last ${span} days`, value: insight.data.current, color: up ? colors.success : colors.accent },
            { label: `${span} days before`, value: insight.data.previous, color: colors.lineStrong },
          ]}
        />
      );
      break;
    }
  }

  return (
    <Card padding={space[4]} style={styles.card} {...a11y}>
      <View style={styles.head}>
        <View aria-hidden>{tile}</View>
        <Text variant="overline" tone="subtle">
          {OVERLINE[insight.kind]}
        </Text>
      </View>
      <View style={styles.texts}>
        <Text variant="headline">{insight.title}</Text>
        <Text variant="callout" tone="muted">
          {insight.body}
        </Text>
      </View>
      {visual ? <View aria-hidden>{visual}</View> : null}
    </Card>
  );
}

function IconTile({ icon: Icon, bg, fg }: { icon: LucideIcon; bg: string; fg: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <Icon size={18} color={fg} strokeWidth={2.4} />
    </View>
  );
}

/** Two habit icons, overlapping. */
function PairTile({ a, b }: { a: Habit; b: Habit }) {
  const { colors } = useTheme();
  return (
    <View style={styles.pair}>
      <HabitIcon icon={a.icon} color={a.color} size={32} />
      <View style={[styles.pairSecond, { borderColor: colors.surface }]}>
        <HabitIcon icon={b.icon} color={b.color} size={32} />
      </View>
    </View>
  );
}

/**
 * Seven mini columns, one per weekday, with one highlighted. One hue per
 * card: the other days are a pale tint of the highlight on an even paler
 * track, so the card stays clean (no grey bars on peach).
 */
function WeekBars({
  values,
  highlight,
  strong,
  strongText,
  caption,
}: {
  values: { weekday: Weekday; value: number; hasData: boolean }[];
  highlight: Weekday;
  strong: string;
  strongText: string;
  caption?: string;
}) {
  const { colors, isDark } = useTheme();
  const soft = rgba(strong, isDark ? 0.34 : 0.28);
  const track = rgba(strong, isDark ? 0.09 : 0.07);
  const H = 46;
  return (
    <View style={styles.visual}>
      <View style={styles.weekBars}>
        {values.map(({ weekday, value, hasData }) => {
          const on = weekday === highlight;
          return (
            <View key={weekday} style={styles.weekCol}>
              <Text variant="caption" color={on ? strongText : "transparent"} tabular maxFontSizeMultiplier={1.15} style={styles.weekPct}>
                {Math.round(value * 100)}%
              </Text>
              <View style={[styles.weekTrack, { height: H, backgroundColor: track }]}>
                <View style={{ height: hasData ? Math.max(4, value * H) : 0, backgroundColor: on ? strong : soft, borderRadius: radius.xs }} />
              </View>
              <Text variant="caption" color={on ? strongText : colors.inkSubtle} maxFontSizeMultiplier={1.15} style={[styles.weekLetter, on ? styles.weekOn : null]}>
                {WEEKDAY_LETTER[weekday]}
              </Text>
            </View>
          );
        })}
      </View>
      {caption ? (
        <Text variant="caption" tone="subtle" style={styles.caption}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/** Two labelled horizontal bars for a with/without or now/before comparison. */
function CompareBars({ rows, caption }: { rows: { label: string; value: number; color: string }[]; caption?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.visual, styles.compare]}>
      {rows.map((row) => (
        <View key={row.label} style={styles.compareRow}>
          <Text variant="caption" tone="muted" numberOfLines={2} style={styles.compareLabel}>
            {row.label}
          </Text>
          <View style={[styles.compareTrack, { backgroundColor: colors.track }]}>
            <View style={[styles.compareFill, { width: `${Math.max(3, Math.round(row.value * 100))}%`, backgroundColor: row.color }]} />
          </View>
          <Text variant="caption" tabular style={styles.compareValue}>
            {Math.round(row.value * 100)}%
          </Text>
        </View>
      ))}
      {caption ? (
        <Text variant="caption" tone="subtle">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const RHYTHM_DOT = 14;
const RHYTHM_LANE = 15;
const RHYTHM_LANES = 3;
const RHYTHM_TRACK = 8;

/**
 * The day from 6 AM (or the first usual time) to midnight with each habit's
 * usual check-in time as a dot, the busiest part of the day tinted. Dots that
 * would overlap stack on short stems, and the axis uses the same window and
 * labels as the Reminders timeline (6 AM, Noon, 6 PM, Midnight).
 */
function DayTimeline({ pattern, habits }: { pattern: TimeOfDayPattern; habits: Habit[] }) {
  const theme = useTheme();
  const { colors } = theme;
  const [width, setWidth] = useState(0);
  const marks = useMemo(
    () =>
      pattern.perHabit
        .map((p) => ({ id: p.habitId, kind: "habit" as const, minutes: p.median, label: "", habitId: p.habitId }))
        .sort((a, b) => a.minutes - b.minutes),
    [pattern.perHabit],
  );
  const { start, end } = timelineWindow(marks);
  const placed = useMemo(() => (width ? layoutTimeline(marks, (RHYTHM_DOT + 3) / width, RHYTHM_LANES) : []), [marks, width]);
  const frac = (m: number) => Math.max(0, Math.min(1, (m - start) / (end - start)));
  const parts: { key: TimeOfDayPattern["part"]; from: number; to: number }[] = [
    { key: "morning", from: start, to: 12 * 60 },
    { key: "afternoon", from: 12 * 60, to: 17 * 60 },
    { key: "evening", from: 17 * 60, to: end },
  ];
  const sun = theme.habit("sun");
  const lanes = Math.max(1, ...placed.map((p) => p.lane + 1));
  const plotHeight = RHYTHM_DOT + RHYTHM_LANE * (lanes - 1) + 2;
  return (
    <View style={styles.visual} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ height: plotHeight }}>
        <View style={[styles.timeTrack, { backgroundColor: colors.track }]}>
          {parts.map((p) => (
            <View
              key={p.key}
              style={[
                styles.timePart,
                { left: `${(frac(p.from) * 100).toFixed(2)}%`, width: `${((frac(p.to) - frac(p.from)) * 100).toFixed(2)}%` },
                p.key === pattern.part ? { backgroundColor: rgba(sun.solid, theme.isDark ? 0.3 : 0.35) } : null,
              ]}
            />
          ))}
        </View>
        {placed.map((p) => {
          const habit = habits.find((h) => h.id === p.id);
          if (!habit) return null;
          const left = p.x * width - RHYTHM_DOT / 2;
          return (
            <View key={p.id} style={[styles.pin, { left, height: plotHeight }]}>
              {p.lane > 0 ? <View style={[styles.stem, { height: p.lane * RHYTHM_LANE, backgroundColor: rgba(colors.ink, 0.16) }]} /> : null}
              <View style={[styles.timeDot, { bottom: p.lane * RHYTHM_LANE, backgroundColor: theme.habit(habit.color).solid, borderColor: colors.surface }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.ticks}>
        {timelineTicks(start, end).map((m, i, all) => (
          <Text
            key={m}
            variant="caption"
            tone="subtle"
            maxFontSizeMultiplier={1.15}
            style={[styles.tick, { left: `${frac(m) * 100}%` }, i === 0 ? styles.tickFirst : i === all.length - 1 ? styles.tickLast : styles.tickMid]}
          >
            {timelineTickLabel(m)}
          </Text>
        ))}
      </View>
      <View style={styles.timeLegend}>
        {pattern.perHabit.map((p) => {
          const habit = habits.find((h) => h.id === p.habitId);
          if (!habit) return null;
          return (
            <View key={p.habitId} style={styles.timeKey}>
              <View style={[styles.timeKeyDot, { backgroundColor: theme.habit(habit.color).solid }]} />
              <Text variant="caption" tone="muted" style={styles.timeLabel}>
                {shortName(habit.name)} {formatMinutes(p.median)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Shown until there is a week of history. */
export function InsightsLocked({ daysTracked }: { daysTracked: number }) {
  const { colors } = useTheme();
  const left = Math.max(0, MIN_DAYS_FOR_INSIGHTS - daysTracked);
  const day = Math.min(MIN_DAYS_FOR_INSIGHTS, Math.max(1, daysTracked));
  return (
    <Card padding={space[4]} style={styles.card}>
      <View style={styles.head}>
        <View aria-hidden>
          <IconTile icon={Lock} bg={colors.surfaceMuted} fg={colors.inkMuted} />
        </View>
        <Text variant="overline" tone="subtle">
          Almost there
        </Text>
      </View>
      <View style={styles.texts}>
        <Text variant="headline">Insights unlock after a week of check-ins</Text>
        <Text variant="callout" tone="muted">
          {left} more {left === 1 ? "day" : "days"} and Everwick can spot your best days, habits that help each other and your daily rhythm.
        </Text>
      </View>
      <View style={styles.lockedBar}>
        <ProgressBar progress={day / MIN_DAYS_FOR_INSIGHTS} segments={MIN_DAYS_FOR_INSIGHTS} height={8} accessibilityLabel={`Day ${day} of ${MIN_DAYS_FOR_INSIGHTS}`} style={styles.flex} />
        <Text variant="caption" tone="subtle" tabular>
          Day {day} of {MIN_DAYS_FOR_INSIGHTS}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3] },
  card: { gap: space[3] },
  head: { flexDirection: "row", alignItems: "center", gap: space[2] + 2 },
  texts: { gap: space[1] },
  tile: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  pair: { flexDirection: "row", alignItems: "center" },
  pairSecond: { marginLeft: -10, borderWidth: 2, borderRadius: radius.sm + 2 },
  visual: { marginTop: space[1] },
  weekBars: { flexDirection: "row", gap: space[2] },
  weekCol: { flex: 1, alignItems: "center", gap: 3 },
  weekPct: { fontSize: 11, lineHeight: 14 },
  weekTrack: { alignSelf: "stretch", maxWidth: 30, width: "100%", borderRadius: radius.xs, justifyContent: "flex-end", overflow: "hidden", marginHorizontal: "auto" },
  weekLetter: { fontSize: 11, lineHeight: 14 },
  weekOn: { fontFamily: fonts.extrabold },
  caption: { marginTop: space[2] },
  compare: { gap: space[2] },
  compareRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  compareLabel: { flexBasis: "34%", maxWidth: 150 },
  compareTrack: { flex: 1, height: 10, borderRadius: radius.pill, overflow: "hidden" },
  compareFill: { height: 10, borderRadius: radius.pill },
  compareValue: { minWidth: 38, textAlign: "right" },
  timeTrack: { position: "absolute", left: 0, right: 0, bottom: (RHYTHM_DOT - RHYTHM_TRACK) / 2, height: RHYTHM_TRACK, borderRadius: radius.pill, overflow: "hidden" },
  timePart: { position: "absolute", top: 0, bottom: 0 },
  pin: { position: "absolute", bottom: 0, width: RHYTHM_DOT, alignItems: "center" },
  stem: { position: "absolute", bottom: RHYTHM_DOT / 2, width: 1.5 },
  timeDot: { position: "absolute", width: RHYTHM_DOT, height: RHYTHM_DOT, borderRadius: RHYTHM_DOT / 2, borderWidth: 2.5 },
  ticks: { height: 18, marginTop: space[1.5] },
  tick: { position: "absolute", fontSize: 12, lineHeight: 16, width: 72 },
  tickFirst: { textAlign: "left" },
  tickMid: { textAlign: "center", marginLeft: -36 },
  tickLast: { textAlign: "right", marginLeft: -72 },
  timeLabel: { fontSize: 11, lineHeight: 14 },
  timeLegend: { flexDirection: "row", flexWrap: "wrap", columnGap: space[3], rowGap: space[1], marginTop: space[3] },
  timeKey: { flexDirection: "row", alignItems: "center", gap: 5 },
  timeKeyDot: { width: 8, height: 8, borderRadius: 4 },
  lockedBar: { flexDirection: "row", alignItems: "center", gap: space[3] },
  flex: { flex: 1 },
});
