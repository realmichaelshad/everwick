import { StyleSheet } from "react-native";
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useDerivedValue, useReducedMotion, withSpring } from "react-native-reanimated";

import { haptics } from "@/lib/haptics";
import { motion, radius, useTheme } from "@/theme";

import { PressableScale } from "./Pressable";

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Required: what this switch controls. */
  label: string;
  disabled?: boolean;
}

const W = 52;
const H = 32;
const BORDER = 2;
const KNOB = 24;
const KNOB_OFF = 16;
const PAD = (H - KNOB) / 2;

/**
 * Animated toggle with role="switch". Off is an outlined track with a small
 * knob in the same strong outline color (3:1 on any card, like Material's
 * switch); on fills with the ember accent and the knob grows white. The knob
 * springs across and scales between the two, so the state reads at a glance
 * in both themes. `aria-checked` is set explicitly: react-native-web maps it
 * (not `accessibilityState.checked`) to the DOM, and role="switch" requires it.
 */
export function Switch({ value, onValueChange, label, disabled }: SwitchProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useDerivedValue(() => (reduced ? (value ? 1 : 0) : withSpring(value ? 1 : 0, motion.spring.gentle)), [value, reduced]);
  const offTrack = colors.surfaceMuted;
  const offLine = colors.switchOff;
  const onColor = colors.accent;
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offTrack, onColor]),
    borderColor: interpolateColor(progress.value, [0, 1], [offLine, onColor]),
  }));
  const travel = W - BORDER * 2 - PAD * 2 - KNOB;
  const knob = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offLine, "#FFFFFF"]),
    transform: [{ translateX: progress.value * travel }, { scale: interpolate(progress.value, [0, 1], [KNOB_OFF / KNOB, 1]) }],
  }));

  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      aria-checked={value}
      aria-disabled={disabled ? true : undefined}
      disabled={disabled}
      hitSlop={8}
      pressScale={0.94}
      onPress={() => {
        haptics.selection();
        onValueChange(!value);
      }}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: radius.pill, borderWidth: BORDER, paddingHorizontal: PAD, justifyContent: "center" },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
