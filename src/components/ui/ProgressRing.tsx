import { useEffect, useId, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { motion, useTheme } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Gradient stops (2 or 3 colors). Defaults to the brand gradient. */
  colors?: readonly string[];
  trackColor?: string;
  children?: ReactNode;
  /** Spoken as "<label>, 45 percent". */
  accessibilityLabel?: string;
  /** Animate from the previous value (default true). */
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular progress with a rounded gradient stroke that fills with an eased
 * Reanimated timing. Center content goes in children.
 */
export function ProgressRing({
  progress,
  size = 132,
  strokeWidth = 14,
  colors: stops,
  trackColor,
  children,
  accessibilityLabel,
  animate = true,
  style,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const value = useSharedValue(animate && !reduced ? 0 : clamped);
  const palette = stops ?? colors.brand;

  useEffect(() => {
    value.value = animate && !reduced ? withTiming(clamped, { duration: motion.ring, easing: Easing.out(Easing.cubic) }) : clamped;
  }, [animate, clamped, reduced, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  return (
    <View
      {...(accessibilityLabel
        ? { accessible: true, role: "progressbar" as const, "aria-label": accessibilityLabel, accessibilityValue: { min: 0, max: 100, now: Math.round(clamped * 100) } }
        : {})}
      style={[{ width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {palette.map((c, i) => (
              <Stop key={`${c}-${i}`} offset={palette.length === 1 ? 0 : i / (palette.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? colors.track} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
