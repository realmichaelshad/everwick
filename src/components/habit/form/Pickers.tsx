import Check from "lucide-react-native/icons/check";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Minus from "lucide-react-native/icons/minus";
import Plus from "lucide-react-native/icons/plus";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { HABIT_ICON_COMPONENTS } from "@/components/ui/HabitIcon";
import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/Pressable";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { useRovingFocus } from "@/components/ui/useRovingFocus";
import { HABIT_ICONS } from "@/data/catalog";
import { orderedWeekdays, WEEKDAY_LETTER, WEEKDAY_LONG } from "@/data/dates";
import { FREQUENCY_OPTIONS, TARGET_MAX, TARGET_MIN, type Frequency } from "@/data/habitForm";
import type { HabitIconKey, Weekday } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { elevation, HABIT_COLOR_KEYS, radius, space, useTheme, type HabitColorKey } from "@/theme";

/* -------------------------------------------------------------------------- */
/* Icon                                                                        */
/* -------------------------------------------------------------------------- */

const ICON_COLUMNS = 6;
const GAP = space[2];

/** All 26 habit icons as a radio grid, tinted with the chosen color. */
export function IconPicker({ value, color, onChange }: { value: HabitIconKey; color: HabitColorKey; onChange: (icon: HabitIconKey) => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const tone = theme.habit(color);
  const [width, setWidth] = useState(0);
  const tile = width > 0 ? Math.floor((width - GAP * (ICON_COLUMNS - 1)) / ICON_COLUMNS) : 48;
  // One tab stop for all 26 icons; arrow keys move through the grid (and pick, as radios do).
  const roving = useRovingFocus({
    count: HABIT_ICONS.length,
    active: HABIT_ICONS.findIndex((i) => i.key === value),
    columns: ICON_COLUMNS,
    onMove: (i) => {
      haptics.selection();
      onChange(HABIT_ICONS[i].key);
    },
  });
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Icon"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={styles.iconGrid}
    >
      {HABIT_ICONS.map(({ key, label }, index) => {
        const selected = key === value;
        const Icon = HABIT_ICON_COMPONENTS[key];
        return (
          <PressableScale
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            {...roving(index)}
            pressScale={0.9}
            onPress={() => {
              if (!selected) haptics.selection();
              onChange(key);
            }}
            style={[
              styles.iconTile,
              { width: tile, height: tile, backgroundColor: selected ? tone.solid : colors.surfaceMuted, borderColor: selected ? tone.solid : "transparent" },
            ]}
          >
            <Icon size={Math.round(tile * 0.44)} color={selected ? tone.onSolid : colors.inkMuted} strokeWidth={2.2} />
          </PressableScale>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Color                                                                       */
/* -------------------------------------------------------------------------- */

/** Eight habit colors as labelled swatches (names help color-blind people too). */
export function ColorPicker({ value, onChange }: { value: HabitColorKey; onChange: (color: HabitColorKey) => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const roving = useRovingFocus({
    count: HABIT_COLOR_KEYS.length,
    active: HABIT_COLOR_KEYS.indexOf(value),
    onMove: (i) => {
      haptics.selection();
      onChange(HABIT_COLOR_KEYS[i]);
    },
  });
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Color" style={styles.colorGrid}>
      {HABIT_COLOR_KEYS.map((key, index) => {
        const tone = theme.habit(key);
        const selected = key === value;
        return (
          <PressableScale
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={tone.label}
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            {...roving(index)}
            pressScale={0.94}
            onPress={() => {
              if (!selected) haptics.selection();
              onChange(key);
            }}
            style={[styles.swatch, { backgroundColor: selected ? tone.soft : colors.surfaceMuted, borderColor: selected ? tone.solid : "transparent" }]}
          >
            <View style={[styles.swatchDot, { backgroundColor: tone.solid }]}>{selected ? <Check size={16} color={tone.onSolid} strokeWidth={3.2} /> : null}</View>
            <Text variant="caption" color={selected ? tone.ink : colors.inkMuted} numberOfLines={1} style={styles.swatchLabel}>
              {tone.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Frequency                                                                   */
/* -------------------------------------------------------------------------- */

export interface FrequencyPickerProps {
  frequency: Frequency;
  days: Weekday[];
  weekStartsOn: 0 | 1;
  color: HabitColorKey;
  error?: string;
  onFrequency: (f: Frequency) => void;
  onToggleDay: (d: Weekday) => void;
}

/** Daily / Weekdays / Weekends / Custom, with seven day toggles for Custom (summaries elsewhere say "Every day"). */
export function FrequencyPicker({ frequency, days, weekStartsOn, color, error, onFrequency, onToggleDay }: FrequencyPickerProps) {
  const theme = useTheme();
  const { colors } = theme;
  const tone = theme.habit(color);
  const reduced = useReducedMotion();
  return (
    <View style={styles.stack}>
      <FrequencyChoice value={frequency} onChange={onFrequency} />
      {frequency === "custom" ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={styles.stack}>
          <View style={styles.days} accessibilityRole="none">
            {orderedWeekdays(weekStartsOn).map((d) => {
              const on = days.includes(d);
              return (
                <PressableScale
                  key={d}
                  accessibilityRole="checkbox"
                  accessibilityLabel={WEEKDAY_LONG[d]}
                  accessibilityState={{ checked: on }}
                  aria-checked={on}
                  pressScale={0.9}
                  onPress={() => {
                    haptics.selection();
                    onToggleDay(d);
                  }}
                  style={styles.dayCell}
                >
                  <View style={[styles.dayChip, on ? { backgroundColor: tone.solid, borderColor: tone.solid } : { borderColor: colors.lineStrong }]}>
                    <Text variant="bodyStrong" color={on ? tone.onSolid : colors.inkMuted}>
                      {WEEKDAY_LETTER[d]}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
          {error ? (
            <View style={styles.error} accessibilityRole="alert" aria-live="polite">
              <CircleAlert size={14} color={colors.dangerText} strokeWidth={2.4} />
              <Text variant="caption" tone="danger">
                {error}
              </Text>
            </View>
          ) : (
            <Text variant="caption" tone="subtle">
              Days off never break your streak.
            </Text>
          )}
        </Animated.View>
      ) : (
        <Text variant="caption" tone="subtle">
          {frequency === "daily" ? "A little every day builds the strongest streaks." : "Days off never break your streak."}
        </Text>
      )}
    </View>
  );
}

/**
 * The kit's SegmentedControl at normal text sizes; with large Dynamic Type
 * (where four labels can't share one row) a 2x2 radio grid instead.
 */
function FrequencyChoice({ value, onChange }: { value: Frequency; onChange: (f: Frequency) => void }) {
  const { colors, isDark } = useTheme();
  const { fontScale } = useWindowDimensions();
  if ((fontScale || 1) <= 1.15) return <SegmentedControl label="How often" options={FREQUENCY_OPTIONS} value={value} onChange={onChange} />;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="How often" style={[styles.choiceGrid, { backgroundColor: colors.surfaceMuted }]}>
      {FREQUENCY_OPTIONS.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            pressScale={0.97}
            onPress={() => {
              if (!selected) haptics.selection();
              onChange(o.value);
            }}
            style={[styles.choice, selected ? [{ backgroundColor: isDark ? colors.surfaceRaised : colors.surface }, elevation("card", colors, isDark)] : null]}
          >
            <Text variant="caption" tone={selected ? "default" : "muted"} align="center">
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Goal                                                                        */
/* -------------------------------------------------------------------------- */

/** Daily goal stepper: 1 (once a day) to 20 ("8 glasses"). */
export function GoalStepper({ value, label, onChange }: { value: number; label: string; onChange: (n: number) => void }) {
  const { colors } = useTheme();
  const set = (n: number) => {
    const next = Math.min(TARGET_MAX, Math.max(TARGET_MIN, n));
    if (next !== value) haptics.selection();
    onChange(next);
  };
  return (
    <View style={[styles.stepper, { backgroundColor: colors.surfaceMuted }]}>
      <IconButton icon={Minus} label={`Lower the daily goal, now ${value}`} variant="surface" disabled={value <= TARGET_MIN} onPress={() => set(value - 1)} />
      <View style={styles.stepperText} accessibilityLiveRegion="polite" aria-live="polite">
        <Text variant="numeralSm" tabular align="center">
          {value}
        </Text>
        <Text variant="caption" tone="muted" align="center" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <IconButton icon={Plus} label={`Raise the daily goal, now ${value}`} variant="surface" disabled={value >= TARGET_MAX} onPress={() => set(value + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[3] },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  iconTile: { borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 2, minWidth: 44, minHeight: 44 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  swatch: {
    flexGrow: 1,
    flexBasis: "22%",
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: space[1],
    paddingVertical: space[2],
    paddingHorizontal: space[1],
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  swatchDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  swatchLabel: { fontSize: 12, lineHeight: 16 },
  days: { flexDirection: "row", marginHorizontal: -space[1] },
  dayCell: { flex: 1, minWidth: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  dayChip: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  error: { flexDirection: "row", alignItems: "center", gap: space[1] },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: radius.lg },
  choice: { flexGrow: 1, flexBasis: "45%", minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: space[2], borderRadius: radius.md },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: space[2], borderRadius: radius.lg },
  stepperText: { flex: 1, alignItems: "center" },
});
