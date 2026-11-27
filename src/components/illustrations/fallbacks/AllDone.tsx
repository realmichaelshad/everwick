import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { FLAME_INNER_PATH, FLAME_PATH } from "@/components/brand/geometry";
import { useTheme } from "@/theme";

import { ContactShadow, Gloss, shade, SoftSparkle, useSvgId, VerticalGradient } from "../soft";
import type { FallbackProps } from "./types";

/** "all-done": a trophy cup holding the Everwick flame, ribbons of confetti around it. */
export function AllDoneFallback({ size }: FallbackProps) {
  const { colors, habit, isDark } = useTheme();
  const cup = useSvgId("cup");
  const cupSide = useSvgId("cupside");
  const flame = useSvgId("fl");
  const base = useSvgId("base");
  const gold = "#FFC24D";
  const confetti: [number, number, number, string][] = [
    [34, 58, -24, habit("ocean").solid],
    [58, 30, 32, habit("sun").solid],
    [148, 34, -38, habit("violet").solid],
    [170, 80, 18, habit("leaf").solid],
    [26, 112, 58, habit("rose").solid],
    [168, 128, -16, habit("teal").solid],
    [44, 150, 22, habit("indigo").solid],
    [120, 22, 70, habit("rose").solid],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <LinearGradient id={cup} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={shade(gold, 0.35)} />
          <Stop offset="0.45" stopColor={gold} />
          <Stop offset="1" stopColor={shade(gold, -0.32)} />
        </LinearGradient>
        <LinearGradient id={cupSide} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={shade(gold, 0.1)} />
          <Stop offset="1" stopColor={shade(gold, -0.35)} />
        </LinearGradient>
        <LinearGradient id={flame} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={colors.brand[0]} />
          <Stop offset="0.5" stopColor={colors.brand[1]} />
          <Stop offset="1" stopColor={colors.brand[2]} />
        </LinearGradient>
        <VerticalGradient id={base} from={isDark ? "#4A3A58" : "#3B2A48"} to={isDark ? "#2A2033" : "#1C1424"} />
      </Defs>

      <Circle cx={100} cy={102} r={74} fill={colors.accentSoft} opacity={isDark ? 0.9 : 1} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r1 = 80;
        const r2 = i % 2 ? 88 : 95;
        return (
          <Path
            key={i}
            d={`M ${100 + Math.cos(a) * r1} ${102 + Math.sin(a) * r1} L ${100 + Math.cos(a) * r2} ${102 + Math.sin(a) * r2}`}
            stroke={i % 3 === 0 ? colors.brand[2] : colors.brand[0]}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}

      <ContactShadow cx={100} cy={170} rx={42} opacity={isDark ? 0.45 : 0.16} />
      {/* base */}
      <Rect x={70} y={150} width={60} height={18} rx={7} fill={`url(#${base})`} />
      <Rect x={78} y={154} width={44} height={3} rx={1.5} fill="#FFFFFF" opacity={0.18} />
      {/* stem */}
      <Path d="M 92 128 L 108 128 L 112 150 L 88 150 Z" fill={`url(#${cupSide})`} />
      {/* handles */}
      <Path d="M 62 84 C 40 84 40 118 72 118" stroke={`url(#${cupSide})`} strokeWidth={9} fill="none" strokeLinecap="round" />
      <Path d="M 138 84 C 160 84 160 118 128 118" stroke={`url(#${cupSide})`} strokeWidth={9} fill="none" strokeLinecap="round" />
      {/* cup */}
      <Path d="M 60 76 L 140 76 C 140 112 124 132 100 132 C 76 132 60 112 60 76 Z" fill={`url(#${cup})`} />
      <Path d="M 60 76 L 140 76 L 139 82 L 61 82 Z" fill={shade(gold, -0.2)} opacity={0.6} />
      <Gloss cx={78} cy={96} rx={6} ry={16} rotate={-8} opacity={0.45} />
      {/* flame */}
      <G transform="translate(70 18) scale(0.94)">
        <Path d={FLAME_PATH} fill={`url(#${flame})`} />
        <Path d={FLAME_INNER_PATH} fill={colors.flameCore} />
      </G>

      {confetti.map(([x, y, a, c], i) => (
        <Rect key={i} x={x} y={y} width={12} height={6} rx={3} fill={c} transform={`rotate(${a} ${x + 6} ${y + 3})`} />
      ))}
      <SoftSparkle x={150} y={56} size={14} color={colors.brand[0]} />
      <SoftSparkle x={52} y={84} size={9} color={colors.accent} />
      <SoftSparkle x={156} y={152} size={8} color={colors.brand[2]} opacity={0.8} />
    </Svg>
  );
}
