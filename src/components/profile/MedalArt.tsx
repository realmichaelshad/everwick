import SunMedium from "lucide-react-native/icons/sun-medium";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { Illustration, Medal } from "@/components/illustrations/Illustration";
import type { AchievementDef } from "@/data/achievements";
import { useTheme } from "@/theme";

export interface MedalArtProps {
  achievement: Pick<AchievementDef, "id" | "slot">;
  size: number;
  locked?: boolean;
  /** Increment to sweep a shine across the medal (unlock moment). */
  shine?: number;
  /** Delay before the shine sweep, ms. */
  shineDelay?: number;
}

/**
 * The medal picture for an achievement: a flame medal from its slot, or the
 * sunrise medal for Early riser. Locked medals are desaturated and dimmed: a
 * CSS filter on web, lower opacity on iOS and Android.
 */
export function MedalArt({ achievement, size, locked = false, shine = 0, shineDelay = 0 }: MedalArtProps) {
  const { isDark } = useTheme();
  const webLocked: ViewStyle | null =
    locked && Platform.OS === "web" ? ({ filter: `grayscale(1) ${isDark ? "brightness(0.8)" : "brightness(1.04)"}`, opacity: isDark ? 0.5 : 0.55 } as ViewStyle) : null;

  const dim = locked && Platform.OS !== "web" ? { opacity: 0.45 } : null;
  const art = achievement.slot ? <Illustration slot={achievement.slot} size={size} style={dim} /> : <View style={dim}><Medal size={size} icon={SunMedium} /></View>;

  return (
    <View aria-hidden style={[{ width: size, height: size }, webLocked]}>
      {art}
      {shine > 0 && !locked ? <Shine key={shine} size={size} delay={shineDelay} /> : null}
    </View>
  );
}

/** A soft diagonal light band that sweeps once across the rosette. */
function Shine({ size, delay }: { size: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 760, easing: Easing.inOut(Easing.cubic) }));
  }, [delay, t]);
  const disc = size * 0.68;
  const band = useAnimatedStyle(() => ({
    opacity: t.value > 0 && t.value < 1 ? 1 : 0,
    transform: [{ translateX: -disc + t.value * disc * 2 }, { rotate: "24deg" }],
  }));
  return (
    <View pointerEvents="none" style={[styles.clip, { width: disc, height: disc, borderRadius: disc / 2, left: (size - disc) / 2, top: size * 0.46 - disc / 2 }]}>
      <Animated.View style={[styles.band, { height: disc * 1.6, top: -disc * 0.3, width: disc * 0.42, left: disc * 0.29 }, band]}>
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.75)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: "absolute", overflow: "hidden" },
  band: { position: "absolute" },
});
