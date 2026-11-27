import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { Illustration } from "@/components/illustrations/Illustration";
import { useSvgId } from "@/components/illustrations/soft";
import { Text } from "@/components/ui/Text";
import { motion, space, useTheme } from "@/theme";

export const PRO_ART = 200;

/**
 * Pro hero: the gem on a brand-gradient glow (amber core, ember and rose
 * halo), floating gently, with the title and subtitle. When the preview
 * turns on, the gem gives a small celebratory hop.
 */
export function ProHero({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);
  const hop = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(
      withSequence(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) })),
      -1,
      false,
    );
    return () => cancelAnimation(bob);
  }, [bob, reduced]);

  useEffect(() => {
    if (!active || reduced) return;
    hop.value = withSequence(withTiming(1.12, { duration: 160, easing: Easing.out(Easing.quad) }), withSpring(1, motion.spring.bouncy));
  }, [active, hop, reduced]);

  const art = useAnimatedStyle(() => ({ transform: [{ translateY: -bob.value * 8 }, { scale: hop.value }] }));
  const glow = useAnimatedStyle(() => ({ opacity: 0.85 + bob.value * 0.15, transform: [{ scale: 1 + bob.value * 0.04 }] }));

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Animated.View pointerEvents="none" style={[styles.glow, glow]}>
          <ProGlow />
        </Animated.View>
        <Animated.View pointerEvents="none" style={art}>
          <Illustration slot="pro" size={PRO_ART} />
        </Animated.View>
      </View>
      <View style={styles.titles}>
        <Text variant="hero" heading align="center">
          Everwick Pro
        </Text>
        <Text variant="body" tone="muted" align="center" style={styles.sub}>
          {active ? "Every Pro feature is unlocked in this demo. Have a look around." : "More ways to keep your flame going, from deeper insights to widgets."}
        </Text>
      </View>
    </View>
  );
}

const GLOW_W = PRO_ART * 1.7;
const GLOW_H = PRO_ART * 1.35;

/** The brand-gradient halo behind the gem. */
function ProGlow() {
  const { colors, isDark } = useTheme();
  const id = useSvgId("pro-glow");
  // Eased falloff (many stops) so the halo has no visible edge on the plum night canvas.
  // By night the outer halo turns to the plum dawn glow, so it melts into the canvas.
  const stops = isDark
    ? [
        { offset: 0, color: colors.brand[0], opacity: 0.5 },
        { offset: 0.18, color: colors.brand[0], opacity: 0.4 },
        { offset: 0.36, color: colors.brand[1], opacity: 0.22 },
        { offset: 0.56, color: colors.brand[2], opacity: 0.1 },
        { offset: 0.76, color: colors.dawnGlow, opacity: 0.35 },
        { offset: 1, color: colors.dawnGlow, opacity: 0 },
      ]
    : [
        { offset: 0, color: colors.brand[0], opacity: 0.55 },
        { offset: 0.18, color: colors.brand[0], opacity: 0.45 },
        { offset: 0.36, color: colors.brand[1], opacity: 0.27 },
        { offset: 0.54, color: colors.brand[1], opacity: 0.13 },
        { offset: 0.7, color: colors.brand[2], opacity: 0.055 },
        { offset: 0.85, color: colors.brand[2], opacity: 0.015 },
        { offset: 1, color: colors.brand[2], opacity: 0 },
      ];
  return (
    <Svg width={GLOW_W} height={GLOW_H} viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          {stops.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Ellipse cx={100} cy={100} rx={100} ry={100} fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space[2] },
  stage: { width: PRO_ART, height: PRO_ART, alignItems: "center", justifyContent: "center", marginTop: space[6] },
  glow: { position: "absolute", width: GLOW_W, height: GLOW_H, left: (PRO_ART - GLOW_W) / 2, top: (PRO_ART - GLOW_H) / 2 },
  titles: { alignItems: "center", gap: space[2], paddingHorizontal: space[2] },
  sub: { maxWidth: 320 },
});
