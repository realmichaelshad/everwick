import { StyleSheet, View } from "react-native";
import Animated, { interpolate, interpolateColor, useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { rgba, space, useTheme } from "@/theme";

const DOT = 8;
const PILL = 26;

export interface ProgressDotsProps {
  count: number;
  /** Continuous pager position in pages; the active dot stretches into an ember pill as you swipe. */
  position: SharedValue<number>;
  /** The settled step, for screen readers ("Step 2 of 3"). */
  index: number;
}

/** Onboarding progress: dots that morph into a pill for the current step and follow the finger mid-swipe. */
export function ProgressDots({ count, position, index }: ProgressDotsProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Setup progress"
      accessibilityValue={{ min: 1, max: count, now: index + 1, text: `Step ${index + 1} of ${count}` }}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={index + 1}
      aria-valuetext={`Step ${index + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} i={i} position={position} />
      ))}
    </View>
  );
}

function Dot({ i, position }: { i: number; position: SharedValue<number> }) {
  const { colors } = useTheme();
  const idle = rgba(colors.ink, 0.16);
  const style = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(position.value - i));
    return {
      width: interpolate(d, [0, 1], [PILL, DOT]),
      backgroundColor: interpolateColor(d, [0, 1], [colors.accent, idle]),
    };
  });
  return <Animated.View aria-hidden style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space[1.5], height: 20 },
  dot: { height: DOT, borderRadius: DOT / 2 },
});
