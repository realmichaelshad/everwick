import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Illustration } from "@/components/illustrations/Illustration";
import { ArtGlow } from "@/components/illustrations/ArtGlow";
import type { IllustrationSlot } from "@/content/illustrations";

export interface HeroArtProps {
  slot: IllustrationSlot;
  size: number;
  /** This page's index and the pager position, for the parallax as pages slide. */
  page: number;
  position: SharedValue<number>;
  /** Gentle float (off under reduced motion). */
  float?: boolean;
}

/**
 * Onboarding hero: the slot's soft 3D illustration on a warm glow (paper
 * light by day, a candle-amber halo by night so the art never floats on the
 * plum canvas). It drifts a little slower than its page while swiping
 * (parallax) and floats gently while idle.
 */
export function HeroArt({ slot, size, page, position, float = true }: HeroArtProps) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduced || !float) return;
    bob.value = withRepeat(
      withSequence(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })),
      -1,
      false,
    );
    return () => cancelAnimation(bob);
  }, [bob, float, reduced]);

  const art = useAnimatedStyle(() => {
    const d = position.value - page;
    const far = Math.min(1, Math.abs(d));
    return {
      opacity: interpolate(far, [0, 1], [1, 0.25]),
      transform: [
        { translateX: reduced ? 0 : d * size * 0.42 },
        { translateY: -bob.value * 7 },
        { scale: reduced ? 1 : interpolate(far, [0, 1], [1, 0.86]) },
        { rotate: `${reduced ? 0 : d * -6}deg` },
      ],
    };
  });
  const glow = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(position.value - page));
    return {
      opacity: interpolate(d, [0, 1], [1, 0]),
      transform: [{ scale: 1 + bob.value * 0.05 }],
    };
  });

  // An elliptical halo: wide enough to feel like light, short enough to stay inside the page (no clipped edge).
  const glowW = size * 1.5;
  const glowH = size * 1.2;
  return (
    <View style={[styles.stage, { width: size, height: size, marginTop: size * 0.1 }]}>
      <Animated.View pointerEvents="none" style={[styles.glow, { width: glowW, height: glowH, left: (size - glowW) / 2, top: (size - glowH) / 2 }, glow]}>
        <ArtGlow width={glowW} height={glowH} />
      </Animated.View>
      {/* pointerEvents none: drags start on the pager, not as a native image drag on web. */}
      <Animated.View pointerEvents="none" style={art}>
        <Illustration slot={slot} size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
});
