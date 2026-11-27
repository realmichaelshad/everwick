import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { radius as radii, space, useTheme } from "@/theme";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder block. Hidden from screen readers; wrap groups in <SkeletonGroup>. */
export function Skeleton({ width = "100%", height = 14, radius = radii.sm, style }: SkeletonProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse, reduced]);
  const animated = useAnimatedStyle(() => ({ opacity: 1 - pulse.value * 0.45 }));
  return (
    <Animated.View
      aria-hidden
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, animated, style]}
    />
  );
}

/** Announces "Loading" once for a whole skeleton layout. */
export function SkeletonGroup({ children, label = "Loading", style }: { children: React.ReactNode; label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} aria-busy style={style}>
      {children}
    </View>
  );
}

/** A habit-row shaped skeleton: icon tile, two lines, round check. */
export function SkeletonRow() {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }]}>
      <Skeleton width={48} height={48} radius={radii.md} />
      <View style={styles.lines}>
        <Skeleton width="62%" height={14} />
        <Skeleton width="38%" height={11} />
      </View>
      <Skeleton width={44} height={44} radius={22} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4], borderRadius: radii.card },
  lines: { flex: 1, gap: space[2] },
});
