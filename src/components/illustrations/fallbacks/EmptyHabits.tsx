import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { FLAME_INNER_PATH, FLAME_PATH } from "@/components/brand/geometry";
import { useTheme } from "@/theme";

import { ContactShadow, shade, SoftSparkle, useSvgId } from "../soft";
import type { FallbackProps } from "./types";

/** "empty-habits": an unlit candle on a little dish, one spark waiting above the wick. */
export function EmptyHabitsFallback({ size }: FallbackProps) {
  const { colors, isDark } = useTheme();
  const wax = useSvgId("wax");
  const dish = useSvgId("dish");
  const spark = useSvgId("spark");
  const cream = isDark ? "#F6EBE3" : "#FFF9F4";
  const dishColor = isDark ? "#8C74FF" : "#FF9A6E";
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <LinearGradient id={wax} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={shade(cream, -0.02)} />
          <Stop offset="0.4" stopColor={cream} />
          <Stop offset="1" stopColor={shade(cream, -0.16)} />
        </LinearGradient>
        <LinearGradient id={dish} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(dishColor, 0.25)} />
          <Stop offset="1" stopColor={shade(dishColor, -0.25)} />
        </LinearGradient>
        <LinearGradient id={spark} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={colors.brand[0]} />
          <Stop offset="0.5" stopColor={colors.brand[1]} />
          <Stop offset="1" stopColor={colors.brand[2]} />
        </LinearGradient>
      </Defs>
      <Circle cx={100} cy={108} r={76} fill={isDark ? "#241B2B" : "#FFE8DC"} />
      <Circle cx={150} cy={52} r={22} fill={isDark ? "#3A1C2C" : "#FFD6E3"} opacity={0.8} />

      <ContactShadow cx={100} cy={172} rx={50} opacity={isDark ? 0.5 : 0.15} />
      {/* dish */}
      <Ellipse cx={100} cy={160} rx={48} ry={12} fill={`url(#${dish})`} />
      <Ellipse cx={100} cy={156} rx={40} ry={8} fill={shade(dishColor, 0.4)} opacity={0.65} />
      {/* candle */}
      <Rect x={76} y={84} width={48} height={74} rx={14} fill={`url(#${wax})`} />
      <Ellipse cx={100} cy={88} rx={24} ry={7} fill={shade(cream, -0.06)} />
      <Path d="M 112 90 q 7 12 0 26" stroke={shade(cream, -0.1)} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Path d="M 86 96 l 0 46" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      {/* wick */}
      <Path d="M 100 88 C 100 80 103 76 101 70" stroke={colors.ink} strokeWidth={3.2} strokeLinecap="round" fill="none" opacity={0.85} />
      {/* waiting spark */}
      <G transform="translate(87 26) scale(0.4)" opacity={0.55}>
        <Path d={FLAME_PATH} fill={`url(#${spark})`} />
        <Path d={FLAME_INNER_PATH} fill={colors.flameCore} />
      </G>
      <SoftSparkle x={134} y={60} size={13} color={colors.accent} />
      <SoftSparkle x={64} y={66} size={9} color={colors.brand[0]} />
      <SoftSparkle x={146} y={112} size={7} color={colors.brand[2]} opacity={0.8} />
    </Svg>
  );
}
