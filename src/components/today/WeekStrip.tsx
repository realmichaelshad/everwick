import { StyleSheet, View } from "react-native";

import { PressableScale } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { useRovingFocus } from "@/components/ui/useRovingFocus";
import { addDays, formatLongDate, fromKey, startOfWeek, WEEKDAY_LETTER, weekdayOf } from "@/data/dates";
import { summarizeDay } from "@/data/stats";
import type { DateKey, Habit, History } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { fonts, radius, space, useTheme } from "@/theme";

export interface WeekStripProps {
  habits: Habit[];
  history: History;
  today: DateKey;
  selected: DateKey;
  onSelect: (day: DateKey) => void;
  weekStartsOn: 0 | 1;
}

/**
 * This week at a glance: each day's date with one mark under it (solid when
 * everything was done, hollow when some was), today outlined, any past day
 * selectable to check in late. Future days are inert. The selected day is a
 * filled ember pill. Keyboard: one tab stop, arrow keys.
 */
export function WeekStrip({ habits, history, today, selected, onSelect, weekStartsOn }: WeekStripProps) {
  const { colors } = useTheme();
  const start = startOfWeek(today, weekStartsOn);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const roving = useRovingFocus({
    count: 7,
    active: days.indexOf(selected),
    isDisabled: (i) => days[i] > today,
    onMove: (i) => {
      haptics.selection();
      onSelect(days[i]);
    },
  });
  return (
    <View style={styles.row} accessibilityRole="tablist" accessibilityLabel="Days this week">
      {days.map((day, index) => {
        const s = summarizeDay(habits, history, day, today);
        const isToday = day === today;
        const isSelected = day === selected;
        const future = day > today;
        const date = fromKey(day).getDate();
        // One mark under the date: a solid dot for a day with everything done, a hollow one for a partial day.
        const allDone = !future && s.scheduled > 0 && s.done === s.scheduled;
        const someDone = !future && !allDone && s.done > 0;
        const fg = isSelected ? colors.accentText : future ? colors.inkSubtle : colors.ink;
        return (
          <View
            key={day}
            style={[
              styles.day,
              // Quiet selection (a soft tint) so the day card stays the one bold thing on the screen.
              isSelected ? { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft } : isToday ? { borderColor: colors.lineStrong } : null,
            ]}
          >
            <View style={styles.dayContent} aria-hidden pointerEvents="none">
              <Text variant="caption" color={isSelected ? colors.accentText : colors.inkSubtle} style={styles.letter}>
                {WEEKDAY_LETTER[weekdayOf(day)]}
              </Text>
              <Text style={[styles.date, { color: fg }]} tabular>
                {date}
              </Text>
              <View style={[styles.mark, allDone ? { backgroundColor: colors.success } : null, someDone ? { borderWidth: 1.5, borderColor: colors.success } : null]} />
            </View>
            {/* Stretched control over the day: carries the spoken label. */}
            <PressableScale
              disabled={future}
              accessibilityLabel={`${isToday ? "Today, " : ""}${formatLongDate(day)}${future ? "" : `, ${s.done} of ${s.scheduled} done`}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected, disabled: future }}
              // react-native-web maps aria-selected (not accessibilityState) to the DOM.
              aria-selected={isSelected}
              {...roving(index)}
              pressScale={1}
              onPress={() => {
                if (day !== selected) haptics.selection();
                onSelect(day);
              }}
              style={styles.hit}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: space[1] },
  day: { flex: 1, borderRadius: radius.lg, minHeight: 70, borderWidth: 1.5, borderColor: "transparent" },
  dayContent: { alignItems: "center", gap: 3, paddingTop: space[2], paddingBottom: space[2] },
  hit: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg },
  letter: { fontSize: 12, lineHeight: 15 },
  date: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 21 },
  mark: { width: 6, height: 6, borderRadius: 3 },
});
