import Check from "lucide-react-native/icons/check";
import Plus from "lucide-react-native/icons/plus";
import SkipForward from "lucide-react-native/icons/skip-forward";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { PressableScale } from "@/components/ui/Pressable";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { Habit } from "@/data/types";
import { motion, rgba, useTheme } from "@/theme";

export interface CheckButtonProps {
  habit: Habit;
  value: number;
  /** Skipped days show a dashed ring. */
  skipped?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  size?: number;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

const PARTICLES = 8;

/**
 * The tap-to-complete control. Simple habits: an empty disc with a neutral
 * rim and a faint check (so it reads "tap to check"); a tap lights it in the
 * flame color, bounces, flicks out a ring of sparks and draws the check.
 * Target habits (5 of 8 glasses): a progress ring with a plus that fills one
 * step per tap, then completes the same way.
 */
export function CheckButton({ habit, value, skipped, onPress, onLongPress, size = 48, accessibilityLabel, accessibilityHint }: CheckButtonProps) {
  const theme = useTheme();
  const tone = theme.habit(habit.color);
  const reduced = useReducedMotion();
  const done = value >= habit.target;
  const isTarget = habit.target > 1;

  const fill = useSharedValue(done ? 1 : 0);
  const scale = useSharedValue(1);
  const burst = useSharedValue(0);
  const wasDone = useRef(done);

  useEffect(() => {
    const completedNow = done && !wasDone.current;
    wasDone.current = done;
    if (reduced) {
      fill.value = done ? 1 : 0;
      return;
    }
    fill.value = withTiming(done ? 1 : 0, { duration: done ? 220 : 180, easing: Easing.out(Easing.cubic) });
    if (completedNow) {
      scale.value = withSequence(withTiming(0.8, { duration: 90 }), withSpring(1, motion.spring.bouncy));
      burst.value = 0;
      burst.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.quad) });
    }
  }, [done, reduced, fill, scale, burst]);

  // A small nudge for each +1 on target habits.
  const lastValue = useRef(value);
  useEffect(() => {
    if (!reduced && isTarget && value > lastValue.current && value < habit.target) {
      scale.value = withSequence(withTiming(0.9, { duration: 70 }), withSpring(1, motion.spring.bouncy));
    }
    lastValue.current = value;
  }, [value, isTarget, habit.target, reduced, scale]);

  // Unchecked: an empty disc inside a neutral rim (3:1 on the card) with a faint check that
  // says "tap to check". Checked: it lights up in the flame color, whatever the habit's color.
  const { colors, isDark } = theme;
  const lit = colors.success;
  const onLit = isDark ? "#1A0A02" : "#FFFFFF";
  const soft = rgba(colors.surface, 1);
  const solid = rgba(lit, 1);
  const rim = rgba(tone.rim, 1);
  const body = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(fill.value, [0, 1], [soft, solid]),
    borderColor: interpolateColor(fill.value, [0, 1], [rim, solid]),
  }));
  const check = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: interpolate(fill.value, [0, 1], [0.3, 1]) }, { rotate: `${interpolate(fill.value, [0, 1], [-30, 0])}deg` }],
  }));
  const hint = useAnimatedStyle(() => ({ opacity: interpolate(fill.value, [0, 0.4], [0.34, 0], "clamp") }));
  const ripple = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.15, 1], [0, 0.55, 0]),
    transform: [{ scale: interpolate(burst.value, [0, 1], [0.9, 1.9]) }],
  }));
  const rimWidth = size >= 56 ? 3 : 2.5;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: done }}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={6}
      pressScale={0.9}
      style={{ width: size, height: size }}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.round, { borderColor: lit, borderWidth: 2 }, ripple]} />
      {Array.from({ length: PARTICLES }, (_, i) => (
        <Particle key={i} index={i} burst={burst} size={size} color={i % 2 ? lit : colors.flameMid} />
      ))}
      {skipped ? (
        <View style={[StyleSheet.absoluteFill, styles.round, styles.center, { borderWidth: 2, borderStyle: "dashed", borderColor: theme.colors.lineStrong }]}>
          <SkipForward size={size * 0.38} color={theme.colors.inkSubtle} strokeWidth={2.4} />
        </View>
      ) : isTarget && !done ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <View style={[StyleSheet.absoluteFill, styles.round, { backgroundColor: colors.surface }]} />
          <ProgressRing progress={value / habit.target} size={size} strokeWidth={size >= 56 ? 5 : 4} colors={[lit, lit]} trackColor={colors.track} />
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Plus size={size * 0.42} color={colors.ink} strokeWidth={2.6} />
          </View>
        </View>
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, styles.round, styles.center, { borderWidth: rimWidth }, body]}>
          <Animated.View style={[styles.layer, hint]}>
            <Check size={size * 0.5} color={colors.inkSubtle} strokeWidth={3} />
          </Animated.View>
          <Animated.View style={check}>
            <Check size={size * 0.5} color={onLit} strokeWidth={3.2} />
          </Animated.View>
        </Animated.View>
      )}
    </PressableScale>
  );
}

function Particle({ index, burst, size, color }: { index: number; burst: ReturnType<typeof useSharedValue<number>>; size: number; color: string }) {
  const angle = (index / PARTICLES) * Math.PI * 2 - Math.PI / 2;
  const distance = size * 0.62;
  const dot = index % 2 ? 6 : 5;
  const style = useAnimatedStyle(() => {
    const t = burst.value;
    return {
      opacity: t === 0 || t === 1 ? 0 : interpolate(t, [0, 0.2, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * distance * t },
        { translateY: Math.sin(angle) * distance * t },
        { scale: interpolate(t, [0, 0.3, 1], [0.4, 1, 0.2]) },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: size / 2 - dot / 2,
          top: size / 2 - dot / 2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  round: { borderRadius: 999 },
  center: { alignItems: "center", justifyContent: "center" },
  layer: { position: "absolute" },
});
