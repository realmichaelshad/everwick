import { LinearGradient } from "expo-linear-gradient";
import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { useTheme } from "@/theme";

/**
 * The soft brand gradient behind screen headers: warm dawn by day, a plum
 * ember glow by night, fading into the canvas. Absolute, non-interactive.
 */
export function DawnBackdrop({ height = 360, tint }: { height?: number; /** Optional hue (e.g. a habit's soft color) blended in. */ tint?: string }) {
  const { colors } = useTheme();
  const gid = `glow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]} aria-hidden>
      <LinearGradient colors={tint ? [tint, colors.dawn[1], colors.dawn[2]] : [colors.dawn[0], colors.dawn[1], colors.dawn[2]]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={gid} cx="88%" cy="6%" rx="62%" ry="58%" fx="88%" fy="6%">
            <Stop offset="0" stopColor={colors.dawnGlow} stopOpacity={0.95} />
            <Stop offset="1" stopColor={colors.dawnGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0 },
});
