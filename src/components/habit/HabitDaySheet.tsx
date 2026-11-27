import Check from "lucide-react-native/icons/check";
import Minus from "lucide-react-native/icons/minus";
import Plus from "lucide-react-native/icons/plus";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import SkipForward from "lucide-react-native/icons/skip-forward";
import Snowflake from "lucide-react-native/icons/snowflake";
import Undo2 from "lucide-react-native/icons/undo-2";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { formatLongDate } from "@/data/dates";
import { valueOn } from "@/data/stats";
import type { DateKey, Habit, History } from "@/data/types";
import { radius, rgba, space, useTheme } from "@/theme";

import { dayState, stateLine } from "./detailModel";
import type { DayActions } from "./useDayActions";

export interface HabitDaySheetProps {
  habit: Habit;
  /** The day to show, or null when closed. */
  day: DateKey | null;
  history: History;
  today: DateKey;
  frozen: ReadonlySet<DateKey>;
  actions: DayActions;
  onClose: () => void;
}

/**
 * One calendar day in a sheet: what happened, and the fixes that make sense
 * (check in late, mark not done, skip or unskip, or step a target). Every
 * change shows a toast with Undo.
 */
export function HabitDaySheet({ habit, day, history, today, frozen, actions, onClose }: HabitDaySheetProps) {
  const theme = useTheme();
  const { colors } = theme;
  const tone = theme.lit(habit.color);
  // Keep showing the last day while the sheet slides away.
  const [shown, setShown] = useState<DateKey | null>(day);
  useEffect(() => {
    if (day) setShown(day);
  }, [day]);
  const key = day ?? shown;
  if (!key) return null;

  const state = dayState(habit, history, key, today, frozen);
  const value = valueOn(habit, history, key);
  const isTarget = habit.target > 1;
  const unit = habit.unit ?? "times";
  const done = state === "done";
  const skipped = state === "skipped";
  const title = key === today ? `Today, ${formatLongDate(key).split(", ")[1]}` : formatLongDate(key);

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const primary = done ? (
    <Button label="Mark not done" icon={RotateCcw} variant="secondary" size="lg" fullWidth onPress={run(() => actions.clear(key))} />
  ) : (
    <Button label={isTarget ? "Mark all done" : "Check in"} icon={Check} size="lg" fullWidth onPress={run(() => actions.complete(key))} />
  );
  const secondary = done ? null : skipped ? (
    <Button label="Unskip" icon={Undo2} variant="ghost" fullWidth onPress={run(() => actions.unskip(key))} />
  ) : (
    <Button label="Skip this day" icon={SkipForward} variant="ghost" fullWidth onPress={run(() => actions.skip(key))} />
  );

  return (
    <Sheet
      visible={day != null}
      onClose={onClose}
      title={title}
      description={habit.name}
      footer={
        <>
          {primary}
          {secondary}
        </>
      }
    >
      <View style={[styles.status, { backgroundColor: colors.surfaceMuted }]} accessibilityLiveRegion="polite" aria-live="polite">
        <View
          aria-hidden
          style={[
            styles.badge,
            done
              ? { backgroundColor: tone.solid }
              : state === "frozen"
                ? { backgroundColor: colors.freezeSoft }
                : skipped
                  ? { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.lineStrong }
                  : { backgroundColor: tone.soft, borderWidth: 2, borderColor: rgba(tone.rim, 0.55) },
          ]}
        >
          {done ? (
            <Check size={22} color={tone.onSolid} strokeWidth={3} />
          ) : state === "frozen" ? (
            <Snowflake size={20} color={colors.freezeText} strokeWidth={2.6} />
          ) : skipped ? (
            <SkipForward size={18} color={colors.inkSubtle} strokeWidth={2.4} />
          ) : null}
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{stateLine(habit, history, key, state)}</Text>
          {state === "frozen" ? (
            <Text variant="caption" tone="muted">
              Checking in now keeps the freeze for another day.
            </Text>
          ) : state === "missed" ? (
            <Text variant="caption" tone="muted">
              Forgot to log it? A late check-in counts like any other.
            </Text>
          ) : null}
        </View>
      </View>

      {isTarget && !skipped ? (
        <View style={styles.stepperWrap}>
          <View style={[styles.stepper, { backgroundColor: colors.surfaceMuted }]}>
            <IconButton icon={Minus} label={`Remove one, ${value} of ${habit.target} ${unit}`} variant="surface" disabled={value === 0} onPress={() => actions.step(key, -1)} />
            <View style={styles.stepperText} accessibilityLiveRegion="polite" aria-live="polite">
              <Text variant="numeralSm" tabular>
                {value}
                <Text variant="body" tone="muted">
                  {" "}
                  / {habit.target}
                </Text>
              </Text>
              <Text variant="caption" tone="muted">
                {unit}
              </Text>
            </View>
            <IconButton icon={Plus} label={`Add one, ${value} of ${habit.target} ${unit}`} variant="surface" disabled={value >= habit.target} onPress={() => actions.step(key, 1)} />
          </View>
          <ProgressBar progress={value / habit.target} segments={habit.target} height={8} color={tone.solid} trackColor={tone.soft} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[3], borderRadius: radius.lg },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, gap: 2 },
  stepperWrap: { gap: space[3] },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: space[2], borderRadius: radius.lg },
  stepperText: { alignItems: "center" },
});
