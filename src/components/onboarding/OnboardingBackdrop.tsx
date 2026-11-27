import { StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { DawnBackdrop } from "@/components/ui/DawnBackdrop";
import { useTheme } from "@/theme";

const HEIGHT = 600;

/**
 * The onboarding sky: the brand dawn behind step 1 that warms to rose for
 * the goals and settles to dusk lilac for reminders, cross-fading with the
 * pager position. Without a position (loading) it is the plain dawn.
 */
export function OnboardingBackdrop({ position }: { position?: SharedValue<number> }) {
  const { habit, colors } = useTheme();
  if (!position) return <DawnBackdrop height={HEIGHT} />;
  const tints = [colors.dawn[0], habit("rose").soft, habit("violet").soft];
  return (
    <View pointerEvents="none" style={[styles.wrap, { height: HEIGHT }]} aria-hidden>
      {tints.map((tint, i) => (
        <Layer key={i} index={i} position={position} tint={tint} />
      ))}
    </View>
  );
}

function Layer({ index, position, tint }: { index: number; position: SharedValue<number>; tint: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: index === 0 ? 1 : interpolate(position.value, [index - 1, index], [0, 1], "clamp"),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <DawnBackdrop height={HEIGHT} tint={tint} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0 },
});
