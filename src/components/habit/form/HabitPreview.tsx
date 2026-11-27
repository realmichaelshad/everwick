import Bell from "lucide-react-native/icons/bell";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { HabitIcon } from "@/components/ui/HabitIcon";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { Text } from "@/components/ui/Text";
import { describeSchedule } from "@/data/catalog";
import { formatTime } from "@/data/dates";
import { effectiveUnit, schedulePreset, type HabitFormValues } from "@/data/habitForm";
import { elevation, motion, radius, space, useTheme } from "@/theme";

export interface HabitPreviewProps {
  values: HabitFormValues;
  /** Current streak (edit) or 0 (new). */
  streak: number;
  freezes?: number;
}

/**
 * Live preview of the habit as it will look on Today: icon tile, name,
 * schedule and reminder, and its streak flame. The tile pops when the icon
 * or color changes, so every choice gets instant feedback.
 */
export function HabitPreview({ values, streak, freezes = 0 }: HabitPreviewProps) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const tone = theme.habit(values.color);
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!reduced) pop.value = withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, motion.spring.bouncy));
  }, [values.icon, values.color, pop, reduced]);
  const tileStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const name = values.name.trim();
  const days = schedulePreset(values);
  const unit = effectiveUnit(values);
  const parts = [days.length ? describeSchedule(days) : "Pick days", unit ? `${values.target} ${unit}` : null].filter(Boolean);

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Preview: ${name || "Your new habit"}, ${parts.join(", ")}${values.reminderOn ? `, reminder at ${formatTime(values.reminder)}` : ""}`}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }, elevation("raised", colors, isDark)]}
    >
      <View aria-hidden style={styles.row}>
        <Animated.View style={tileStyle}>
          <HabitIcon icon={values.icon} color={values.color} size={52} variant="solid" />
        </Animated.View>
        <View style={styles.texts}>
          <View style={styles.top}>
            <Text variant="overline" color={tone.ink} style={styles.flex}>
              Preview
            </Text>
            <StreakBadge streak={streak} freezes={freezes} size="sm" />
          </View>
          <Text variant="headline" numberOfLines={1} color={name ? colors.ink : colors.inkSubtle}>
            {name || "Your new habit"}
          </Text>
          <View style={styles.meta}>
            <Text variant="caption" tone="muted" numberOfLines={1} style={styles.metaText}>
              {parts.join(", ")}
            </Text>
            {values.reminderOn ? (
              <>
                <View style={[styles.dot, { backgroundColor: colors.lineStrong }]} />
                <Bell size={12} color={colors.inkMuted} strokeWidth={2.4} />
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {formatTime(values.reminder)}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: space[4], borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  texts: { flex: 1, gap: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flex: 1 },
  meta: { flexDirection: "row", alignItems: "center", gap: space[1.5], marginTop: 1 },
  metaText: { flexShrink: 1 },
  dot: { width: 3, height: 3, borderRadius: 2 },
});
