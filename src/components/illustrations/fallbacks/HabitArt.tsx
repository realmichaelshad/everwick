/**
 * Soft 3D habit icons: habit-water, habit-read, habit-walk, habit-meditate,
 * habit-no-phone, habit-strength. Used on habit detail headers and onboarding
 * goal chips (the list keeps the clean icon tiles).
 *
 * These are the original SVG fallbacks, drawn as small clay-like objects in
 * the same warm family as the PNGs (amber, ember, rose, cream; light from the
 * top left; soft contact shadow). They only show when a slot's PNG is
 * missing. Each draws in a 200x200 viewBox scaled to `size`.
 */
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { useTheme } from "@/theme";

import { ContactShadow, Gloss, shade, SoftGradient, SoftSparkle, useSvgId, VerticalGradient } from "../soft";
import type { FallbackProps } from "./types";

/** The warm clay palette shared with the PNG set. */
const CLAY = {
  amber: "#FFB547",
  apricot: "#FF9A4D",
  ember: "#FF6B35",
  coral: "#F2566B",
  rose: "#F2386B",
  cream: "#FFF3E4",
  paper: "#FFF9F1",
  plum: "#3A2433",
  lemon: "#FFC93C",
  water: "#BFE0FF",
};

function useShadow() {
  const { isDark } = useTheme();
  return { opacity: isDark ? 0.5 : 0.16, color: isDark ? "#000000" : "#5A2A14" };
}

/** habit-water: a glass of water with a lemon slice and a little splash. */
export function HabitWaterFallback({ size }: FallbackProps) {
  const shadow = useShadow();
  const { isDark } = useTheme();
  const glass = useSvgId("glass");
  const water = useSvgId("water");
  const lemon = useSvgId("lemon");
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <LinearGradient id={glass} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="0.45" stopColor="#E8F3FF" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.85} />
        </LinearGradient>
        <VerticalGradient id={water} from="#D8ECFF" to="#9CCBFF" />
        <SoftGradient id={lemon} color={CLAY.lemon} light={0.35} dark={-0.12} />
      </Defs>
      <ContactShadow cx={100} cy={176} rx={46} opacity={shadow.opacity} color={shadow.color} />
      {/* water */}
      <Path d="M 56 82 Q 100 92 144 82 L 139.5 158 Q 138.5 168 128 168 L 72 168 Q 61.5 168 60.5 158 Z" fill={`url(#${water})`} opacity={0.85} />
      {/* lemon slice, tilted in the water */}
      <G transform="rotate(-18 94 124)">
        <Ellipse cx={94} cy={124} rx={28} ry={26} fill={shade(CLAY.apricot, -0.05)} />
        <Ellipse cx={94} cy={124} rx={24.5} ry={22.5} fill={`url(#${lemon})`} />
        <Ellipse cx={94} cy={124} rx={19} ry={17.5} fill="#FFE7A0" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <Path key={i} d={`M 94 124 L ${94 + Math.cos(a) * 18} ${124 + Math.sin(a) * 16.5}`} stroke={CLAY.lemon} strokeWidth={2.6} strokeLinecap="round" />;
        })}
        <Circle cx={94} cy={124} r={3.2} fill="#FFF4CF" />
      </G>
      {/* bubbles */}
      <Circle cx={124} cy={104} r={3.5} fill="#FFFFFF" opacity={0.85} />
      <Circle cx={118} cy={146} r={2.6} fill="#FFFFFF" opacity={0.8} />
      <Circle cx={70} cy={100} r={2.2} fill="#FFFFFF" opacity={0.8} />
      <Circle cx={130} cy={128} r={1.8} fill="#FFFFFF" opacity={0.75} />
      {/* glass */}
      <Path d="M 50 50 L 59 160 Q 60.5 172 73 172 L 127 172 Q 139.5 172 141 160 L 150 50 Z" fill={`url(#${glass})`} opacity={isDark ? 0.2 : 0.6} />
      <Path d="M 50 50 L 59 160 Q 60.5 172 73 172 L 127 172 Q 139.5 172 141 160 L 150 50" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinejoin="round" opacity={0.95} />
      <Path d="M 50 50 L 59 160 Q 60.5 172 73 172 L 127 172 Q 139.5 172 141 160 L 150 50" fill="none" stroke="#8FB9E8" strokeWidth={1.2} opacity={0.6} />
      <Ellipse cx={100} cy={50} rx={50} ry={7.5} fill="#FFFFFF" fillOpacity={isDark ? 0.12 : 0.35} stroke="#FFFFFF" strokeWidth={3} />
      {/* glass highlights */}
      <Path d="M 63 62 L 69 150" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.75} />
      <Path d="M 137 66 L 133 120" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      {/* splash */}
      <Path d="M 128 46 Q 134 30 146 26 Q 140 36 136 46 Z" fill={CLAY.water} opacity={0.9} />
      <Circle cx={150} cy={20} r={5} fill={CLAY.water} />
      <Circle cx={148.5} cy={18.5} r={1.6} fill="#FFFFFF" />
      <Circle cx={160} cy={34} r={3.4} fill={CLAY.water} />
      <SoftSparkle x={44} y={34} size={12} color={CLAY.amber} />
    </Svg>
  );
}

/** habit-read: an open hardcover book with a ribbon bookmark. */
export function HabitReadFallback({ size }: FallbackProps) {
  const shadow = useShadow();
  const cover = useSvgId("cover");
  const left = useSvgId("left");
  const right = useSvgId("right");
  const ribbon = useSvgId("ribbon");
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <LinearGradient id={cover} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(CLAY.ember, 0.15)} />
          <Stop offset="1" stopColor={shade(CLAY.ember, -0.18)} />
        </LinearGradient>
        <LinearGradient id={left} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={CLAY.paper} />
          <Stop offset="1" stopColor={shade(CLAY.cream, -0.06)} />
        </LinearGradient>
        <LinearGradient id={right} x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor={CLAY.paper} />
          <Stop offset="1" stopColor={shade(CLAY.cream, -0.08)} />
        </LinearGradient>
        <VerticalGradient id={ribbon} from={shade(CLAY.rose, 0.12)} to={shade(CLAY.rose, -0.15)} />
      </Defs>
      <ContactShadow cx={100} cy={160} rx={74} opacity={shadow.opacity} color={shadow.color} />
      {/* cover */}
      <Path d="M 22 74 Q 60 64 100 82 Q 140 64 178 74 L 180 146 Q 140 138 100 156 Q 60 138 20 146 Z" fill={`url(#${cover})`} />
      <Path d="M 20 146 Q 60 138 100 156 Q 140 138 180 146 L 180 152 Q 140 144 100 162 Q 60 144 20 152 Z" fill={shade(CLAY.ember, -0.3)} />
      {/* page stacks */}
      <Path d="M 30 70 Q 64 58 100 76 L 100 148 Q 64 132 30 140 Z" fill={shade(CLAY.cream, -0.1)} />
      <Path d="M 170 70 Q 136 58 100 76 L 100 148 Q 136 132 170 140 Z" fill={shade(CLAY.cream, -0.12)} />
      {/* pages */}
      <Path d="M 34 64 Q 66 52 100 72 L 100 144 Q 66 126 34 134 Z" fill={`url(#${left})`} />
      <Path d="M 166 64 Q 134 52 100 72 L 100 144 Q 134 126 166 134 Z" fill={`url(#${right})`} />
      {/* gutter */}
      <Path d="M 100 72 L 100 144" stroke={shade(CLAY.cream, -0.22)} strokeWidth={2.5} strokeLinecap="round" />
      {/* page edge lines */}
      <Path d="M 34 137 Q 66 129 100 147" stroke={shade(CLAY.cream, -0.18)} strokeWidth={1.4} fill="none" />
      <Path d="M 166 137 Q 134 129 100 147" stroke={shade(CLAY.cream, -0.2)} strokeWidth={1.4} fill="none" />
      {/* soft text lines */}
      {[0, 1, 2, 3].map((i) => (
        <Path key={`l${i}`} d={`M 46 ${84 + i * 12} Q 70 ${78 + i * 12} 90 ${88 + i * 12}`} stroke={shade(CLAY.cream, -0.14)} strokeWidth={3} strokeLinecap="round" fill="none" />
      ))}
      {[0, 1, 2].map((i) => (
        <Path key={`r${i}`} d={`M 112 ${88 + i * 12} Q 128 ${78 + i * 12} 140 ${80 + i * 12}`} stroke={shade(CLAY.cream, -0.14)} strokeWidth={3} strokeLinecap="round" fill="none" />
      ))}
      {/* ribbon */}
      <Path d="M 140 60 L 152 60 L 152 158 L 146 151 L 140 158 Z" fill={`url(#${ribbon})`} />
      <Path d="M 143 64 L 143 146" stroke="#FFFFFF" strokeWidth={1.6} opacity={0.35} strokeLinecap="round" />
      <Gloss cx={52} cy={70} rx={14} ry={4} rotate={-14} opacity={0.6} />
      <SoftSparkle x={36} y={40} size={13} color={CLAY.amber} />
      <SoftSparkle x={170} y={44} size={9} color={CLAY.rose} opacity={0.85} />
    </Svg>
  );
}

/** habit-walk: a chunky orange running sneaker. */
export function HabitWalkFallback({ size }: FallbackProps) {
  const shadow = useShadow();
  const upper = useSvgId("upper");
  const sole = useSvgId("sole");
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <SoftGradient id={upper} color={CLAY.ember} light={0.35} dark={-0.2} cx="30%" cy="20%" />
        <VerticalGradient id={sole} from="#FFFFFF" to={shade(CLAY.cream, -0.1)} />
      </Defs>
      <ContactShadow cx={102} cy={164} rx={72} opacity={shadow.opacity} color={shadow.color} />
      {/* sole */}
      <Path d="M 24 132 Q 22 158 46 160 L 158 160 Q 184 158 182 138 Q 180 128 168 128 L 32 124 Q 24 124 24 132 Z" fill={`url(#${sole})`} />
      <Path d="M 30 146 Q 100 152 178 146" stroke={CLAY.coral} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.85} />
      {/* upper */}
      <Path d="M 30 128 Q 26 92 50 74 Q 64 64 80 72 L 96 88 Q 104 94 116 98 Q 150 106 168 116 Q 182 124 178 134 L 30 134 Z" fill={`url(#${upper})`} />
      {/* heel tab */}
      <Path d="M 42 82 Q 46 62 60 60 Q 66 60 64 70 Q 56 74 52 88 Z" fill={CLAY.rose} />
      {/* toe cap */}
      <Path d="M 150 110 Q 176 118 178 132 L 150 132 Q 146 120 150 110 Z" fill={shade(CLAY.apricot, 0.25)} opacity={0.9} />
      {/* side panel */}
      <Path d="M 56 118 Q 84 98 120 112 Q 100 124 60 128 Z" fill={CLAY.cream} opacity={0.9} />
      {/* laces */}
      {[0, 1, 2, 3].map((i) => (
        <Path key={i} d={`M ${84 + i * 10} ${82 + i * 5} L ${96 + i * 10} ${94 + i * 4}`} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
      ))}
      <Path d="M 80 78 Q 70 60 86 52" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M 86 80 Q 100 62 92 50" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" fill="none" />
      <Gloss cx={66} cy={88} rx={12} ry={5} rotate={-40} opacity={0.5} />
      <SoftSparkle x={150} y={70} size={14} color={CLAY.amber} />
      <SoftSparkle x={170} y={92} size={8} color={CLAY.rose} opacity={0.85} />
    </Svg>
  );
}

/** habit-meditate: a lotus resting on a round floor cushion. */
export function HabitMeditateFallback({ size }: FallbackProps) {
  const shadow = useShadow();
  const cushion = useSvgId("cushion");
  const top = useSvgId("top");
  const petal = useSvgId("petal");
  const back = useSvgId("back");
  const petals = [-56, -28, 0, 28, 56];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <LinearGradient id={cushion} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(CLAY.ember, 0.1)} />
          <Stop offset="1" stopColor={shade(CLAY.coral, -0.2)} />
        </LinearGradient>
        <SoftGradient id={top} color={CLAY.apricot} light={0.3} dark={-0.1} cx="40%" cy="30%" />
        <LinearGradient id={petal} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD6B8" />
          <Stop offset="0.55" stopColor="#FFA36B" />
          <Stop offset="1" stopColor={CLAY.ember} />
        </LinearGradient>
        <LinearGradient id={back} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB89A" />
          <Stop offset="1" stopColor={CLAY.coral} />
        </LinearGradient>
      </Defs>
      <ContactShadow cx={100} cy={170} rx={66} opacity={shadow.opacity} color={shadow.color} />
      {/* cushion body and top */}
      <Path d="M 34 132 Q 34 168 100 170 Q 166 168 166 132 Z" fill={`url(#${cushion})`} />
      <Ellipse cx={100} cy={130} rx={66} ry={24} fill={`url(#${top})`} />
      <Ellipse cx={100} cy={130} rx={58} ry={18} fill="none" stroke={shade(CLAY.ember, -0.08)} strokeWidth={1.6} strokeDasharray="4 5" opacity={0.6} />
      {/* back petals */}
      {[-42, -14, 14, 42].map((r) => (
        <Path key={`b${r}`} d="M 100 74 Q 116 100 100 128 Q 84 100 100 74 Z" fill={`url(#${back})`} transform={`rotate(${r} 100 128)`} opacity={0.95} />
      ))}
      {/* front petals */}
      {petals.map((r) => (
        <Path key={`p${r}`} d="M 100 70 Q 118 100 100 130 Q 82 100 100 70 Z" fill={`url(#${petal})`} transform={`rotate(${r} 100 130)`} />
      ))}
      {[-56, 0, 56].map((r) => (
        <Path key={`v${r}`} d="M 100 90 Q 103 104 100 118" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.35} transform={`rotate(${r} 100 130)`} />
      ))}
      <Circle cx={100} cy={124} r={6} fill={CLAY.amber} />
      <Gloss cx={64} cy={124} rx={14} ry={4} rotate={-8} opacity={0.45} />
      <SoftSparkle x={46} y={70} size={12} color={CLAY.amber} />
      <SoftSparkle x={158} y={62} size={9} color={CLAY.rose} opacity={0.85} />
    </Svg>
  );
}

/** habit-no-phone: a sleepy crescent moon tucked in front of a plain-backed phone. */
export function HabitNoPhoneFallback({ size }: FallbackProps) {
  const shadow = useShadow();
  const phone = useSvgId("phone");
  const moon = useSvgId("moon");
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <LinearGradient id={phone} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={shade(CLAY.coral, 0.25)} />
          <Stop offset="1" stopColor={shade(CLAY.coral, -0.12)} />
        </LinearGradient>
        <SoftGradient id={moon} color={CLAY.amber} light={0.45} dark={-0.15} cx="30%" cy="35%" />
      </Defs>
      <ContactShadow cx={104} cy={172} rx={58} opacity={shadow.opacity} color={shadow.color} />
      {/* phone (plain back) */}
      <G transform="rotate(12 134 100)">
        <Rect x={104} y={40} width={62} height={112} rx={16} fill={shade(CLAY.coral, -0.25)} />
        <Rect x={102} y={36} width={62} height={112} rx={16} fill={`url(#${phone})`} />
        <Gloss cx={118} cy={52} rx={10} ry={4} rotate={-20} opacity={0.55} />
      </G>
      {/* moon */}
      <Path d="M 78.1 68.2 A 46 46 0 1 0 126.2 126.9 A 38 38 0 0 1 78.1 68.2 Z" fill={`url(#${moon})`} />
      {/* sleepy face */}
      <Path d="M 56 112 Q 62 118 68 112" stroke={shade(CLAY.amber, -0.55)} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M 76 124 Q 82 130 88 124" stroke={shade(CLAY.amber, -0.55)} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Ellipse cx={58} cy={126} rx={6} ry={4} fill={CLAY.rose} opacity={0.35} />
      <Path d="M 66 136 Q 72 140 78 136" stroke={shade(CLAY.amber, -0.55)} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Gloss cx={56} cy={92} rx={10} ry={4} rotate={-60} opacity={0.55} />
      <SoftSparkle x={46} y={52} size={16} color={CLAY.amber} />
      <SoftSparkle x={176} y={40} size={11} color={CLAY.amber} />
      <SoftSparkle x={34} y={84} size={8} color={CLAY.rose} opacity={0.8} />
    </Svg>
  );
}

/** habit-strength: an orange dumbbell with a plum grip. */
export function HabitStrengthFallback({ size }: FallbackProps) {
  const shadow = useShadow();
  const plate = useSvgId("plate");
  const inner = useSvgId("inner");
  const grip = useSvgId("grip");
  const plates = (x: number, flip: boolean) => (
    <G key={x}>
      <Rect x={x} y={60} width={24} height={80} rx={12} fill={`url(#${plate})`} />
      <Rect x={flip ? x - 16 : x + 20} y={70} width={16} height={60} rx={8} fill={`url(#${inner})`} />
      <Ellipse cx={x + 12} cy={70} rx={6} ry={4} fill="#FFFFFF" opacity={0.4} />
    </G>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <SoftGradient id={plate} color={CLAY.ember} light={0.38} dark={-0.22} cx="30%" cy="22%" />
        <SoftGradient id={inner} color={CLAY.apricot} light={0.3} dark={-0.2} cx="30%" cy="22%" />
        <VerticalGradient id={grip} from={shade(CLAY.plum, 0.25)} to={CLAY.plum} />
      </Defs>
      <ContactShadow cx={100} cy={166} rx={64} opacity={shadow.opacity} color={shadow.color} />
      <G transform="rotate(-28 100 100)">
        {/* grip */}
        <Rect x={64} y={91} width={72} height={18} rx={9} fill={`url(#${grip})`} />
        <Path d="M 70 96 L 130 96" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" opacity={0.28} />
        {[78, 88, 98, 108, 118].map((gx) => (
          <Path key={gx} d={`M ${gx} 93 L ${gx} 107`} stroke={shade(CLAY.plum, -0.3)} strokeWidth={1.4} opacity={0.6} />
        ))}
        {/* collars */}
        <Rect x={58} y={86} width={10} height={28} rx={4} fill={CLAY.amber} />
        <Rect x={132} y={86} width={10} height={28} rx={4} fill={CLAY.amber} />
        {plates(22, false)}
        {plates(154, true)}
      </G>
      <SoftSparkle x={40} y={44} size={14} color={CLAY.amber} />
      <SoftSparkle x={166} y={154} size={9} color={CLAY.rose} opacity={0.85} />
    </Svg>
  );
}
