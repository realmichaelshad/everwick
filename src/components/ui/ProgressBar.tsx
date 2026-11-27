import { useEffect, useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { motion, radius, useTheme } from "@/theme";

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  /** Optional segment count (e.g. 8 glasses) drawn as notches. */
  segments?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Linear progress for target habits ("5 of 8 glasses"). */
export function ProgressBar({ progress, color, trackColor, height = 6, segments, accessibilityLabel, style }: ProgressBarProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const clamped = Math.max(0, Math.min(1, progress));
  const value = useSharedValue(clamped);
  useEffect(() => {
    value.value = reduced ? clamped : withTiming(clamped, { duration: motion.slow, easing: Easing.out(Easing.cubic) });
  }, [clamped, reduced, value]);
  const fill = useAnimatedStyle(() => ({ width: width * value.value }));

  return (
    <View
      {...(accessibilityLabel
        ? { accessible: true, role: "progressbar" as const, "aria-label": accessibilityLabel, accessibilityValue: { min: 0, max: 100, now: Math.round(clamped * 100) } }
        : {})}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: radius.pill, backgroundColor: trackColor ?? colors.track, overflow: "hidden" }, style]}
    >
      <Animated.View style={[{ height, borderRadius: radius.pill, backgroundColor: color ?? colors.success }, fill]} />
      {segments && segments > 1 && width > 0
        ? Array.from({ length: segments - 1 }, (_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: ((i + 1) * width) / segments - 1,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: colors.surface,
                opacity: 0.9,
              }}
            />
          ))
        : null}
    </View>
  );
}
