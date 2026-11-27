import { useEffect, useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { FLAME_INNER_BOX, FLAME_INNER_PATH, FLAME_PATH, FLAME_VIEWBOX } from "@/components/brand/geometry";
import { useTheme } from "@/theme";

export interface FlameProps {
  size?: number;
  /** Unlit flames are a quiet grey silhouette (streak 0). */
  lit?: boolean;
  /** Gentle continuous flicker (off for reduced motion). */
  animated?: boolean;
  /** 0..1, bigger flicker for longer streaks. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The streak flame: the Everwick mark, flickering. Two layers move out of
 * phase (silhouette sways and stretches, the inner flame breathes) so it reads as
 * fire rather than a bouncing icon. Decorative; label the parent.
 */
export function Flame({ size = 20, lit = true, animated = true, intensity = 0.5, style }: FlameProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const gid = `flame-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const sway = useSharedValue(0);
  const breathe = useSharedValue(0);
  const run = lit && animated && !reduced;
  const amp = 0.6 + Math.min(1, Math.max(0, intensity)) * 0.8;

  useEffect(() => {
    if (!run) {
      cancelAnimation(sway);
      cancelAnimation(breathe);
      sway.value = 0;
      breathe.value = 0;
      return;
    }
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
        withTiming(-0.6, { duration: 640, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 460, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 380, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    breathe.value = withDelay(
      180,
      withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [run, sway, breathe]);

  const outer = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sway.value * 2.5 * amp}deg` },
      { scaleY: 1 + Math.abs(sway.value) * 0.06 * amp },
      { scaleX: 1 - Math.abs(sway.value) * 0.03 * amp },
    ],
  }));
  const core = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - breathe.value * 0.16 * amp }, { translateY: -breathe.value * size * 0.015 }],
    opacity: 1 - breathe.value * 0.18,
  }));

  const fillOuter = lit ? `url(#${gid})` : colors.track;
  const coreColor = lit ? colors.flameCore : colors.lineStrong;
  const box = FLAME_INNER_BOX;
  const k = size / 64;

  return (
    <View
      aria-hidden
      style={[{ width: size, height: size }, style]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.origin, outer]}>
        <Svg width={size} height={size} viewBox={FLAME_VIEWBOX}>
          <Defs>
            <LinearGradient id={gid} x1="0.25" y1="1" x2="0.7" y2="0">
              <Stop offset="0" stopColor={colors.brand[0]} />
              <Stop offset="0.55" stopColor={colors.brand[1]} />
              <Stop offset="1" stopColor={colors.flameOuter} />
            </LinearGradient>
          </Defs>
          <Path d={FLAME_PATH} fill={fillOuter} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.core,
          { width: box.width * k, height: box.height * k, left: box.x * k, top: box.y * k },
          core,
        ]}
      >
        <Svg width={box.width * k} height={box.height * k} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}>
          <Path d={FLAME_INNER_PATH} fill={coreColor} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { transformOrigin: "50% 92%" },
  // The inner flame breathes from its base.
  core: { position: "absolute", transformOrigin: "50% 85%" },
});
