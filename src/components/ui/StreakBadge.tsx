import Snowflake from "lucide-react-native/icons/snowflake";
import { useEffect, useRef } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { motion, radius, space, useTheme } from "@/theme";

import { Flame } from "./Flame";
import { Text } from "./Text";

export interface StreakBadgeProps {
  streak: number;
  /** Streak freezes held (0..2). Shown as an ice chip after the count when > 0. */
  freezes?: number;
  /** "pill" (default) has a soft background; "plain" is flame + number only. */
  variant?: "pill" | "plain";
  size?: "sm" | "md" | "lg";
  /** Spoken unit: "day" reads "12 day streak", "check-in" reads "7 check-in streak". */
  unit?: string;
  /** Visible unit set inline after the number ("days", "check-ins"); the freeze chip follows it. */
  unitLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const FLAME: Record<NonNullable<StreakBadgeProps["size"]>, number> = { sm: 16, md: 20, lg: 30 };

/**
 * Flame + streak count (the familiar fire-and-number badge, drawn with our own flame),
 * plus the streak freezes held. The number pops when the streak grows; the
 * flame is grey at 0.
 */
export function StreakBadge({ streak, freezes = 0, variant = "pill", size = "md", unit = "day", unitLabel, style }: StreakBadgeProps) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const previous = useRef(streak);

  useEffect(() => {
    if (streak > previous.current && !reduced) {
      pop.value = withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, motion.spring.bouncy));
    }
    previous.current = streak;
  }, [pop, reduced, streak]);

  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const lit = streak > 0;
  const bg = variant === "pill" ? (lit ? (isDark ? "rgba(255,122,69,0.14)" : "#FFF0E6") : colors.surfaceMuted) : "transparent";
  const label = `${lit ? `${streak} ${unit} streak` : "No streak yet"}${freezes > 0 ? `, ${freezes} streak ${freezes === 1 ? "freeze" : "freezes"}` : ""}`;

  return (
    <View accessible accessibilityLabel={label} style={[styles.outer, style]}>
      <View style={[styles.row, variant === "pill" ? styles.pill : null, { backgroundColor: bg }]}>
        <Flame size={FLAME[size]} lit={lit} intensity={Math.min(1, streak / 30)} />
        <Animated.View style={numberStyle}>
          <Text
            variant={size === "lg" ? "numeralSm" : "caption"}
            color={lit ? colors.accentText : colors.inkSubtle}
            tabular
            style={size === "md" ? styles.md : null}
          >
            {streak}
          </Text>
        </Animated.View>
        {unitLabel ? (
          <Text variant="caption" tone="muted" style={size === "lg" ? styles.unitLg : styles.unit}>
            {unitLabel}
          </Text>
        ) : null}
      </View>
      {freezes > 0 ? (
        <View style={[styles.freeze, variant === "pill" ? styles.freezePill : null, { backgroundColor: variant === "pill" ? colors.freezeSoft : "transparent" }]}>
          <Snowflake size={size === "lg" ? 16 : 12} color={colors.freezeText} strokeWidth={2.6} />
          <Text variant="caption" color={colors.freezeText} tabular style={styles.freezeText}>
            {freezes}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[1], rowGap: 2, alignSelf: "flex-start" },
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  pill: { paddingLeft: space[1.5], paddingRight: space[2] + 2, paddingVertical: 3, borderRadius: radius.pill },
  md: { fontSize: 14, lineHeight: 18 },
  unit: { marginLeft: 1 },
  unitLg: { marginLeft: 3, marginTop: 7 },
  freeze: { flexDirection: "row", alignItems: "center", gap: 2 },
  freezePill: { paddingHorizontal: space[1.5] + 1, paddingVertical: 3, borderRadius: radius.pill },
  freezeText: { fontSize: 12, lineHeight: 16 },
});
