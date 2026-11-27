/**
 * Onboarding fallbacks: welcome, goals, reminders. Original SVG art in the
 * same soft-shaded family as the 3D PNGs (light from the top left, contact
 * shadows, the dawn palette), shown only when a PNG is missing.
 */
import BookOpen from "lucide-react-native/icons/book-open";
import Droplet from "lucide-react-native/icons/droplet";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import Flower2 from "lucide-react-native/icons/flower-2";
import Footprints from "lucide-react-native/icons/footprints";
import MoonStar from "lucide-react-native/icons/moon-star";
import { View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { FLAME_INNER_PATH, FLAME_PATH } from "@/components/brand/geometry";
import { useTheme } from "@/theme";

import { ContactShadow, Gloss, shade, SoftGradient, SoftSparkle, useSvgId, VerticalGradient } from "../soft";
import type { FallbackProps } from "./types";

/** Fixed art colors (the art keeps its own palette in both themes, like the PNGs). */
const ART = {
  plum: "#3A2340",
  cream: "#FFF4E6",
  creamShade: "#F2D2B6",
  cheek: "#FF8A8A",
  face: "#FFFDF9",
};

function FlameGradient({ id }: { id: string }) {
  const { colors } = useTheme();
  return (
    <LinearGradient id={id} x1="0.2" y1="0" x2="0.8" y2="1">
      <Stop offset="0" stopColor={colors.brand[0]} />
      <Stop offset="0.5" stopColor={colors.brand[1]} />
      <Stop offset="1" stopColor={colors.brand[2]} />
    </LinearGradient>
  );
}

/** The brand flame (64x64 geometry) with its bottom-center placed at (x, y). */
function Flame({ x, y, scale, fill, core }: { x: number; y: number; scale: number; fill: string; core: string }) {
  return (
    <G transform={`translate(${x - 32 * scale} ${y - 56 * scale}) scale(${scale})`}>
      <Path d={FLAME_PATH} fill={fill} />
      <Path d={FLAME_INNER_PATH} fill={core} />
    </G>
  );
}

/** "welcome": a smiling candle on a sunrise hill, rays and sparkles around it. */
export function WelcomeFallback({ size }: FallbackProps) {
  const { colors, isDark } = useTheme();
  const flame = useSvgId("wf");
  const sun = useSvgId("sun");
  const hill = useSvgId("hill");
  const wax = useSvgId("wax");
  const rays = [-150, -125, -100, -80, -55, -30];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <FlameGradient id={flame} />
        <SoftGradient id={sun} color="#FFC24D" light={0.5} dark={-0.12} cx="50%" cy="40%" />
        <LinearGradient id={hill} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.brand[1]} />
          <Stop offset="1" stopColor={colors.brand[2]} />
        </LinearGradient>
        <VerticalGradient id={wax} from={ART.cream} to={ART.creamShade} />
      </Defs>
      <Circle cx={100} cy={110} r={84} fill={isDark ? "#2A1B30" : "#FFE6D6"} />
      {rays.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const r1 = 70;
        const r2 = 84;
        return (
          <Path
            key={deg}
            d={`M ${100 + Math.cos(a) * r1} ${128 + Math.sin(a) * r1} L ${100 + Math.cos(a) * r2} ${128 + Math.sin(a) * r2}`}
            stroke={colors.brand[0]}
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.9}
          />
        );
      })}
      <Path d="M 46 150 A 54 54 0 0 1 154 150 Z" fill={`url(#${sun})`} />
      <ContactShadow cx={100} cy={176} rx={72} opacity={isDark ? 0.45 : 0.14} />
      <Path d="M 14 168 C 28 128 172 128 186 168 C 170 180 30 180 14 168 Z" fill={`url(#${hill})`} />
      <Gloss cx={60} cy={146} rx={18} ry={4.5} rotate={-14} opacity={0.32} />
      {/* candle */}
      <Rect x={78} y={98} width={44} height={50} rx={12} fill={`url(#${wax})`} />
      <Path d="M 80 104 C 80 96 120 96 120 104 L 120 110 C 116 116 112 108 108 112 C 104 120 98 108 94 112 C 90 118 84 108 80 112 Z" fill={ART.face} />
      <Path d="M 100 98 L 100 88" stroke={ART.plum} strokeWidth={3} strokeLinecap="round" />
      <Path d="M 89 125 Q 92 121 95 125" stroke={ART.plum} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M 105 125 Q 108 121 111 125" stroke={ART.plum} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M 96 131 Q 100 135 104 131" stroke={ART.plum} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Circle cx={87} cy={131} r={3.2} fill={ART.cheek} opacity={0.55} />
      <Circle cx={113} cy={131} r={3.2} fill={ART.cheek} opacity={0.55} />
      <Flame x={100} y={92} scale={0.44} fill={`url(#${flame})`} core={colors.flameCore} />
      <SoftSparkle x={150} y={56} size={14} color={colors.brand[0]} />
      <SoftSparkle x={50} y={74} size={11} color={colors.brand[2]} />
      <SoftSparkle x={140} y={100} size={7} color={colors.accent} opacity={0.85} />
    </Svg>
  );
}

const TOKENS = [
  { icon: Droplet, key: "ocean", x: 0.22, y: 0.3, s: 0.24 },
  { icon: BookOpen, key: "violet", x: 0.5, y: 0.18, s: 0.27 },
  { icon: Footprints, key: "leaf", x: 0.78, y: 0.3, s: 0.24 },
  { icon: Flower2, key: "teal", x: 0.26, y: 0.62, s: 0.23 },
  { icon: Dumbbell, key: "rose", x: 0.5, y: 0.74, s: 0.25 },
  { icon: MoonStar, key: "indigo", x: 0.74, y: 0.62, s: 0.23 },
] as const;

/** "goals": a loose ring of soft habit tokens, like charms floating around a center sparkle. */
export function GoalsFallback({ size }: FallbackProps) {
  const { habit, isDark, colors } = useTheme();
  return (
    <View style={{ width: size, height: size }} aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 200 200" style={{ position: "absolute" }}>
        <Circle cx={100} cy={100} r={86} fill={isDark ? "#241B2B" : "#FFE8DC"} />
        <Circle cx={100} cy={96} r={46} stroke={isDark ? "#3E3348" : "#FFD3BF"} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" fill="none" />
        <SoftSparkle x={100} y={96} size={22} color={colors.brand[0]} />
        <SoftSparkle x={160} y={150} size={9} color={colors.brand[2]} opacity={0.8} />
        <SoftSparkle x={36} y={150} size={8} color={colors.accent} opacity={0.8} />
      </Svg>
      {TOKENS.map(({ icon: Icon, key, x, y, s }) => {
        const tone = habit(key);
        const d = size * s;
        return (
          <View
            key={key}
            style={{
              position: "absolute",
              left: size * x - d / 2,
              top: size * y - d / 2,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: tone.solid,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: Math.max(2, d * 0.06),
              borderColor: shade(tone.solid, 0.35),
              boxShadow: `0 ${d * 0.12}px ${d * 0.3}px rgba(60, 20, 10, ${isDark ? 0.5 : 0.18})`,
            }}
          >
            <Icon size={d * 0.46} color={tone.onSolid} strokeWidth={2.3} />
          </View>
        );
      })}
    </View>
  );
}

/** "reminders": a chunky alarm clock in front of a little sun, speech bubbles to the side. */
export function RemindersFallback({ size }: FallbackProps) {
  const { colors, isDark } = useTheme();
  const face = useSvgId("face");
  const body = useSvgId("body");
  const bell = useSvgId("bell");
  const sun = useSvgId("rsun");
  const bodyColor = "#FF7A45";
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <SoftGradient id={body} color={bodyColor} />
        <SoftGradient id={bell} color="#FFB547" />
        <SoftGradient id={sun} color="#FFC24D" light={0.5} dark={-0.1} />
        <SoftGradient id={face} color={ART.face} light={0} dark={-0.07} />
      </Defs>
      <Circle cx={100} cy={106} r={84} fill={isDark ? "#241B2B" : "#FFE8DC"} />
      {/* sun behind */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <Circle key={i} cx={62 + Math.cos(a) * 34} cy={72 + Math.sin(a) * 34} r={6} fill="#FFC24D" />;
      })}
      <Circle cx={62} cy={72} r={26} fill={`url(#${sun})`} />
      <ContactShadow cx={98} cy={180} rx={48} opacity={isDark ? 0.5 : 0.15} />
      <Path d="M 70 162 L 60 178" stroke={ART.plum} strokeWidth={9} strokeLinecap="round" />
      <Path d="M 126 162 L 136 178" stroke={ART.plum} strokeWidth={9} strokeLinecap="round" />
      <Path d="M 76 60 A 18 18 0 0 1 104 50" stroke={ART.plum} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle cx={70} cy={66} r={16} fill={`url(#${bell})`} />
      <Circle cx={128} cy={66} r={16} fill={`url(#${bell})`} />
      <Circle cx={98} cy={116} r={56} fill={`url(#${body})`} />
      <Circle cx={98} cy={116} r={44} fill={`url(#${face})`} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <Circle key={i} cx={98 + Math.cos(a) * 36} cy={116 + Math.sin(a) * 36} r={i % 3 === 0 ? 3.2 : 2} fill={i % 3 === 0 ? bodyColor : ART.plum} opacity={i % 3 === 0 ? 1 : 0.4} />;
      })}
      <Path d="M 98 116 L 84 104" stroke={ART.plum} strokeWidth={6} strokeLinecap="round" />
      <Path d="M 98 116 L 118 96" stroke={bodyColor} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={98} cy={116} r={6} fill={ART.plum} />
      <Circle cx={98} cy={116} r={2.6} fill="#FFB547" />
      <Gloss cx={68} cy={92} rx={12} ry={5} rotate={-40} opacity={0.4} />
      {/* chat bubbles: "time to check in" */}
      <Rect x={152} y={80} width={34} height={22} rx={10} fill={ART.face} />
      <Path d="M 156 101 L 152 109 L 164 101 Z" fill={ART.face} />
      <Circle cx={162} cy={91} r={2.4} fill={ART.plum} opacity={0.45} />
      <Circle cx={169} cy={91} r={2.4} fill={ART.plum} opacity={0.45} />
      <Circle cx={176} cy={91} r={2.4} fill={ART.plum} opacity={0.45} />
      <Rect x={156} y={114} width={30} height={20} rx={9} fill="#FFB547" />
      <Path d="M 160 133 L 156 140 L 167 133 Z" fill="#FFB547" />
      <Path d="M 164 124 L 169 129 L 178 119" stroke={ART.plum} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <SoftSparkle x={180} y={64} size={9} color={colors.brand[0]} />
      <SoftSparkle x={30} y={130} size={9} color={colors.brand[2]} opacity={0.8} />
    </Svg>
  );
}
