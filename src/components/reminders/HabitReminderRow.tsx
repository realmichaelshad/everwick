import Clock from "lucide-react-native/icons/clock";
import Plus from "lucide-react-native/icons/plus";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { HabitIcon } from "@/components/ui/HabitIcon";
import { PressableScale } from "@/components/ui/Pressable";
import { Switch } from "@/components/ui/Switch";
import { Text } from "@/components/ui/Text";
import { TimePickerSheet } from "@/components/ui/TimePicker";
import { describeSchedule } from "@/data/catalog";
import { formatTime } from "@/data/dates";
import type { Habit } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { layout, radius, space, useTheme } from "@/theme";

export const DEFAULT_HABIT_REMINDER = "09:00";

export interface HabitReminderRowProps {
  habit: Habit;
  /** Time to restore when the switch goes back on (the last one this habit had), else 9:00 AM. */
  fallbackTime?: string;
  onChange: (reminder: string | null) => void;
  disabled?: boolean;
}

/**
 * One habit's reminder: icon, name and schedule, a switch, and under the
 * name either the time (tap to change) or "Add a time". Turning the switch
 * off keeps the time in mind so turning it back on restores it.
 */
export function HabitReminderRow({ habit, fallbackTime, onChange, disabled }: HabitReminderRowProps) {
  const theme = useTheme();
  const { colors } = theme;
  const tone = theme.habit(habit.color);
  const [open, setOpen] = useState(false);
  const on = habit.reminder != null;
  const time = habit.reminder ?? fallbackTime ?? DEFAULT_HABIT_REMINDER;

  return (
    <View style={styles.row}>
      <HabitIcon icon={habit.icon} color={habit.color} size={40} style={disabled ? { backgroundColor: colors.surfaceMuted } : null} />
      <View style={styles.main}>
        <Text variant="bodyStrong" tone={disabled ? "muted" : "default"} numberOfLines={2} style={styles.name}>
          {habit.name}
        </Text>
        <View style={styles.meta}>
          {on ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${habit.name} reminder, ${formatTime(time)}`}
              accessibilityHint="Opens the time picker"
              accessibilityState={{ disabled: !!disabled }}
              disabled={disabled}
              hitSlop={5}
              pressScale={0.95}
              onPress={() => {
                haptics.light();
                setOpen(true);
              }}
              style={[styles.pill, { backgroundColor: disabled ? colors.surfaceMuted : tone.soft }]}
            >
              <Clock size={13} color={disabled ? colors.inkSubtle : tone.ink} strokeWidth={2.5} />
              <Text variant="caption" color={disabled ? colors.inkSubtle : tone.ink} tabular style={styles.pillText}>
                {formatTime(time)}
              </Text>
            </PressableScale>
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Add a time for ${habit.name}`}
              accessibilityHint="Opens the time picker"
              accessibilityState={{ disabled: !!disabled }}
              disabled={disabled}
              hitSlop={5}
              pressScale={0.95}
              onPress={() => {
                haptics.light();
                setOpen(true);
              }}
              style={[styles.pill, styles.add, { borderColor: colors.lineStrong }]}
            >
              <Plus size={13} color={disabled ? colors.inkSubtle : colors.accentText} strokeWidth={2.6} />
              <Text variant="caption" tone={disabled ? "subtle" : "accent"} style={styles.pillText}>
                Add a time
              </Text>
            </PressableScale>
          )}
          <Text variant="caption" tone={disabled ? "subtle" : "muted"} style={styles.flex}>
            {describeSchedule(habit.schedule)}
          </Text>
        </View>
      </View>
      <View style={styles.switch}>
        <Switch value={on} disabled={disabled} label={`${habit.name} reminder`} onValueChange={(value) => onChange(value ? time : null)} />
      </View>
      <TimePickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        value={time}
        onChange={(v) => onChange(v)}
        title={habit.name}
        description={ringsDescription(habit)}
      />
    </View>
  );
}

/** "Rings every day at this time." / "Rings on Mon, Wed, Fri at this time." */
function ringsDescription(habit: Habit): string {
  const days = describeSchedule(habit.schedule);
  if (days === "Every day") return "Rings every day at this time.";
  if (days === "Weekdays" || days === "Weekends") return `Rings on ${days.toLowerCase()} at this time.`;
  return `Rings on ${days} at this time.`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[3],
    paddingHorizontal: layout.cardPadding,
    paddingVertical: space[3],
  },
  main: { flex: 1, gap: space[1.5] },
  name: { paddingTop: 2 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space[2] + 2,
  },
  flex: { flexShrink: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space[1],
    minHeight: 34,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
  },
  add: { borderWidth: 1.5, borderStyle: "dashed" },
  pillText: { fontSize: 14 },
  switch: { paddingTop: 2 },
});
