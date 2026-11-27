import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useTheme } from "@/theme";

import { useSvgId } from "./soft";

/**
 * The halo behind a soft 3D illustration: paper light by day, a candle-amber
 * glow by night so the art never floats on the plum canvas. Eased falloff
 * (many stops) so it never shows an edge.
 */
export function ArtGlow({ width, height }: { width: number; height: number }) {
  const { colors, isDark } = useTheme();
  const id = useSvgId("art-glow");
  const stops = isDark
    ? [
        { offset: 0, color: colors.brand[0], opacity: 0.3 },
        { offset: 0.2, color: colors.brand[0], opacity: 0.24 },
        { offset: 0.4, color: colors.brand[1], opacity: 0.13 },
        { offset: 0.6, color: colors.brand[1], opacity: 0.055 },
        { offset: 0.8, color: colors.brand[1], opacity: 0.015 },
        { offset: 1, color: colors.brand[1], opacity: 0 },
      ]
    : [
        { offset: 0, color: colors.surface, opacity: 1 },
        { offset: 0.42, color: colors.surface, opacity: 0.75 },
        { offset: 0.7, color: colors.dawn[0], opacity: 0.45 },
        { offset: 1, color: colors.dawn[0], opacity: 0 },
      ];
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          {stops.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={100} cy={100} r={100} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Seats an illustration on its glow (about 1.45x the art), centered, so empty,
 * error and not-found art sits in the scene in both themes.
 */
export function ArtStage({ size, children, style }: { size: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const w = size * 1.45;
  const h = size * 1.2;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View pointerEvents="none" style={[styles.glow, { width: w, height: h, left: (size - w) / 2, top: (size - h) / 2 }]}>
        <ArtGlow width={w} height={h} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ glow: { position: "absolute" } });
