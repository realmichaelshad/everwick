import CalendarCheck from "lucide-react-native/icons/calendar-check";
import Minus from "lucide-react-native/icons/minus";
import Play from "lucide-react-native/icons/play";
import SkipForward from "lucide-react-native/icons/skip-forward";
import Undo2 from "lucide-react-native/icons/undo-2";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { CheckButton } from "@/components/today/CheckButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Text } from "@/components/ui/Text";
import { checkinTimeOn, isDoneOn, isScheduledOn, isSkippedOn, valueOn, type StreakInfo } from "@/data/stats";
import type { DateKey, Habit, History } from "@/data/types";
import { fonts, radius, space, useTheme } from "@/theme";

import { restDayLine, todayCardCopy } from "./detailModel";
import type { DayActions } from "./useDayActions";

export interface TodayControlProps {
  habit: Habit;
  history: History;
  today: DateKey;
  info: StreakInfo;
  day: DayActions;
  onResume: () => void;
}

/**
 * "What about today?" for this habit: the big check-in (or a -/+ stepper
 * for targets like 8 glasses), what it means for the streak, and Skip.
 * Shows a rest-day note on unscheduled days and a Resume card when paused.
 */
export function TodayControl({ habit, history, today, info, day, onResume }: TodayControlProps) {
  const theme = useTheme();
  const { colors } = theme;
  const tone = theme.lit(habit.color);
  const overline = "Today";

  if (habit.archived) {
    return (
      <Card padding={space[4] + 2} style={styles.card}>
        <Text variant="overline" tone="subtle">
          Paused
        </Text>
        <Text variant="title" style={styles.title}>
          This habit is taking a break
        </Text>
        <Text variant="callout" tone="muted">
          It's hidden from Today and won't send reminders. Your history is safe.
        </Text>
        <View style={styles.pausedActions}>
          <Button label="Resume habit" icon={Play} onPress={onResume} />
          <Button label="All paused habits" variant="ghost" onPress={() => router.navigate("/profile")} accessibilityHint="Opens Profile, where paused habits are listed" />
        </View>
      </Card>
    );
  }

  if (!isScheduledOn(habit, today)) {
    return (
      <Card variant="muted" padding={space[4] + 2} style={[styles.card, styles.row]}>
        <View style={[styles.restIcon, { backgroundColor: colors.surface }]}>
          <CalendarCheck size={22} color={tone.ink} strokeWidth={2.3} />
        </View>
        <View style={styles.flex}>
          <Text variant="headline">{restDayLine(habit, today)}</Text>
          <Text variant="callout" tone="muted">
            Days off the schedule never break your streak.
          </Text>
        </View>
      </Card>
    );
  }

  const value = valueOn(habit, history, today);
  const done = isDoneOn(habit, history, today);
  const skipped = isSkippedOn(habit, history, today);
  const isTarget = habit.target > 1;
  const unit = habit.unit ?? "times";
  const at = checkinTimeOn(habit, history, today);
  // The live streak (it already includes today once done) drives "make it N in a row".
  const { title, body } = todayCardCopy(habit, { value, done, skipped, at }, info.current, today);

  const checkLabel = skipped
    ? `${habit.name}, skipped. Check in instead`
    : isTarget
      ? done
        ? `${habit.name}, ${habit.target} of ${habit.target} ${unit}, done. Reset`
        : `Add one, ${value} of ${habit.target} ${unit}`
      : done
        ? `${habit.name}, done. Mark as not done`
        : `Check in ${habit.name}`;
  // The verb under the big button: the screen's one primary action, spelled out.
  const verb = done ? "Done" : skipped ? "Check in" : isTarget ? "Add one" : "Check in";

  return (
    <Card padding={space[4] + 2} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="overline" tone="accent">
            {overline}
          </Text>
          <Text variant="title" tabular style={styles.title}>
            {title}
          </Text>
          <Text variant="callout" tone="muted">
            {body}
          </Text>
        </View>
        <View style={styles.controls}>
          {isTarget && !done && !skipped ? (
            <IconButton icon={Minus} label={`Remove one, ${value} of ${habit.target} ${unit}`} variant="muted" disabled={value === 0} onPress={() => day.step(today, -1)} />
          ) : null}
          <View style={styles.primary}>
            <CheckButton habit={habit} value={value} skipped={skipped} size={64} accessibilityLabel={checkLabel} onPress={() => day.tap(today)} />
            <Text variant="caption" color={done ? tone.ink : colors.ink} align="center" style={styles.verb} aria-hidden>
              {verb}
            </Text>
          </View>
        </View>
      </View>
      {isTarget && !skipped ? (
        <ProgressBar
          progress={value / habit.target}
          segments={habit.target}
          height={8}
          color={tone.solid}
          trackColor={tone.soft}
          accessibilityLabel={`${value} of ${habit.target} ${unit} today`}
          style={styles.bar}
        />
      ) : null}
      {!done ? (
        <View style={[styles.footer, { borderTopColor: colors.line }]}>
          {skipped ? (
            <Button label="Unskip" icon={Undo2} variant="tertiary" size="sm" onPress={() => day.unskip(today)} accessibilityLabel={`Unskip ${habit.name} for today`} style={styles.tertiary} />
          ) : (
            <Button label="Skip today" icon={SkipForward} variant="tertiary" size="sm" onPress={() => day.skip(today)} accessibilityLabel={`Skip today: ${habit.name}`} style={styles.tertiary} />
          )}
          <Text variant="caption" tone="subtle" style={styles.flex}>
            {skipped ? "Skips never count against you." : "Busy day? A skip keeps your streak safe."}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, gap: space[1] },
  row: { flexDirection: "row", alignItems: "center", gap: space[4] },
  flex: { flex: 1, gap: 2 },
  title: { marginTop: 2 },
  controls: { flexDirection: "row", alignItems: "center", gap: space[2] },
  primary: { alignItems: "center", gap: space[1] },
  verb: { fontFamily: fonts.bold, minWidth: 64 },
  tertiary: { marginLeft: -space[2] },
  bar: { marginTop: space[3] },
  footer: { flexDirection: "row", alignItems: "center", gap: space[3], borderTopWidth: StyleSheet.hairlineWidth, marginTop: space[3], paddingTop: space[3] },
  pausedActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[2], marginTop: space[3] },
  restIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
