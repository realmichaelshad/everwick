/**
 * "pro": a faceted gem with a flame glowing inside, floating over a soft
 * pedestal, glowing rays around it. Original SVG in the soft-shaded family
 * of the 3D PNGs, shown only when pro.png is missing.
 */
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

import { FLAME_INNER_PATH, FLAME_PATH } from "@/components/brand/geometry";
import { useTheme } from "@/theme";

import { ContactShadow, Gloss, shade, SoftGradient, SoftSparkle, useSvgId } from "../soft";
import type { FallbackProps } from "./types";

const GEM = "#FF7FA6";
const GOLD = "#FFB547";
const CREAM = "#FFF1E4";

export function ProFallback({ size }: FallbackProps) {
  const { colors, isDark } = useTheme();
  const gem = useSvgId("gem");
  const top = useSvgId("gemtop");
  const pedestal = useSvgId("ped");
  const flame = useSvgId("pf");
  const halo = useSvgId("halo");
  const rays = [-160, -128, -96, -64, -32, 0, 180];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <LinearGradient id={gem} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={shade(GEM, 0.55)} />
          <Stop offset="0.5" stopColor={GEM} />
          <Stop offset="1" stopColor={shade(colors.brand[2], -0.15)} />
        </LinearGradient>
        <LinearGradient id={top} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={shade(GOLD, 0.5)} />
          <Stop offset="1" stopColor={shade(GEM, 0.3)} />
        </LinearGradient>
        <SoftGradient id={pedestal} color={CREAM} light={0.2} dark={-0.12} />
        <LinearGradient id={flame} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#FFF3C4" />
          <Stop offset="1" stopColor={GOLD} />
        </LinearGradient>
        <RadialGradient id={halo} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={GOLD} stopOpacity={isDark ? 0.45 : 0.4} />
          <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={100} cy={104} r={84} fill={isDark ? "#2A1B30" : "#FFE6EE"} />
      <Circle cx={100} cy={88} r={62} fill={`url(#${halo})`} />
      {rays.map((deg) => {
        const a = (deg * Math.PI) / 180;
        return (
          <Path
            key={deg}
            d={`M ${100 + Math.cos(a) * 62} ${88 + Math.sin(a) * 62} L ${100 + Math.cos(a) * 74} ${88 + Math.sin(a) * 74}`}
            stroke={GOLD}
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}
      {/* pedestal */}
      <ContactShadow cx={100} cy={182} rx={56} opacity={isDark ? 0.5 : 0.15} />
      <Path d="M 44 158 L 44 168 C 44 184 156 184 156 168 L 156 158 Z" fill={shade(CREAM, -0.14)} />
      <Path d="M 44 160 C 44 174 156 174 156 160" stroke={colors.brand[1]} strokeWidth={5} fill="none" opacity={0.8} />
      <Ellipse cx={100} cy={156} rx={56} ry={14} fill={`url(#${pedestal})`} />
      <Ellipse cx={100} cy={155} rx={34} ry={7} fill={GOLD} opacity={0.55} />
      {/* gem */}
      <Path d="M 100 142 L 54 84 L 74 54 L 126 54 L 146 84 Z" fill={`url(#${gem})`} />
      <Path d="M 74 54 L 126 54 L 146 84 L 54 84 Z" fill={`url(#${top})`} opacity={0.75} />
      <Path d="M 54 84 L 146 84 L 100 142 Z" fill={shade(GEM, -0.12)} opacity={0.45} />
      <Path d="M 74 54 L 87 84 L 100 54 L 113 84 L 126 54" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} fill="none" />
      <Path d="M 87 84 L 100 142 L 113 84" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={2} fill="none" />
      <G transform="translate(84.5 76) scale(0.48)">
        <Path d={FLAME_PATH} fill={`url(#${flame})`} />
        <Path d={FLAME_INNER_PATH} fill="#FFFFFF" />
      </G>
      <Gloss cx={80} cy={64} rx={8} ry={3} rotate={-20} opacity={0.7} />
      <SoftSparkle x={154} y={40} size={16} color={GOLD} />
      <SoftSparkle x={44} y={50} size={10} color={colors.brand[2]} />
      <SoftSparkle x={168} y={118} size={8} color={colors.accent} opacity={0.8} />
    </Svg>
  );
}
