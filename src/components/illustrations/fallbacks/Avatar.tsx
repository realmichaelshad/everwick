/**
 * "avatar": a warm, soft-shaded character portrait (circular crop) used as
 * Maya's profile picture until an `avatar.png` is added. Drawn in the same
 * family as the clay PNGs: light from the top left, radial shading on skin,
 * hair and sweater, glossy highlights and a soft dawn halo behind the head.
 */
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { shade, SoftGradient, useSvgId } from "../soft";
import type { FallbackProps } from "./types";

const SKIN = "#F1BC98";
const HAIR = "#3B2440";
const SWEATER = "#FF7A45";
const INK = "#2A1830";

export function AvatarFallback({ size }: FallbackProps) {
  const bg = useSvgId("avbg");
  const glow = useSvgId("avglow");
  const halo = useSvgId("avhalo");
  const skin = useSvgId("avskin");
  const neck = useSvgId("avneck");
  const hair = useSvgId("avhair");
  const bun = useSvgId("avbun");
  const top = useSvgId("avtop");
  const blush = useSvgId("avblush");
  const ear = useSvgId("avear");
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <LinearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE2C9" />
          <Stop offset="0.55" stopColor="#FFB892" />
          <Stop offset="1" stopColor="#FF8FAE" />
        </LinearGradient>
        <RadialGradient id={glow} cx="26%" cy="18%" r="60%" fx="26%" fy="18%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.7} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={halo} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF4E6" stopOpacity={0.75} />
          <Stop offset="0.7" stopColor="#FFF4E6" stopOpacity={0.25} />
          <Stop offset="1" stopColor="#FFF4E6" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={skin} cx="38%" cy="30%" r="75%" fx="36%" fy="28%">
          <Stop offset="0" stopColor={shade(SKIN, 0.38)} />
          <Stop offset="0.6" stopColor={SKIN} />
          <Stop offset="1" stopColor={shade(SKIN, -0.16)} />
        </RadialGradient>
        <LinearGradient id={neck} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(SKIN, -0.22)} />
          <Stop offset="1" stopColor={shade(SKIN, -0.06)} />
        </LinearGradient>
        <SoftGradient id={hair} color={HAIR} light={0.28} dark={-0.25} cx="36%" cy="22%" />
        <SoftGradient id={bun} color={HAIR} light={0.32} dark={-0.25} />
        <SoftGradient id={top} color={SWEATER} light={0.35} dark={-0.2} cx="34%" cy="10%" />
        <SoftGradient id={ear} color={SKIN} light={0.2} dark={-0.18} />
        <RadialGradient id={blush} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FF7C86" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FF7C86" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* backdrop: peach dawn, light from the top left, a soft halo behind the head */}
      <Rect x={0} y={0} width={200} height={200} fill={`url(#${bg})`} />
      <Rect x={0} y={0} width={200} height={200} fill={`url(#${glow})`} />
      <Circle cx={100} cy={92} r={78} fill={`url(#${halo})`} />
      <Circle cx={160} cy={42} r={10} fill="#FFFFFF" opacity={0.22} />
      <Circle cx={36} cy={150} r={6} fill="#FFFFFF" opacity={0.18} />

      {/* sweater */}
      <Path d="M 22 206 C 24 170 56 150 100 150 C 144 150 176 170 178 206 Z" fill={`url(#${top})`} />
      <Path d="M 46 168 C 58 158 72 154 84 152" stroke="#FFFFFF" strokeOpacity={0.28} strokeWidth={5} strokeLinecap="round" fill="none" />
      {/* neck and the shadow the head casts on it */}
      <Path d="M 86 116 L 114 116 L 116 152 C 108 160 92 160 84 152 Z" fill={`url(#${neck})`} />
      <Ellipse cx={100} cy={152} rx={22} ry={6} fill={shade(SWEATER, -0.45)} opacity={0.22} />
      {/* crew neck rib */}
      <Path d="M 78 151 C 84 165 116 165 122 151" stroke={shade(SWEATER, -0.16)} strokeWidth={7} strokeLinecap="round" fill="none" />

      {/* hair behind the head + top knot */}
      <Ellipse cx={100} cy={86} rx={45} ry={47} fill={`url(#${hair})`} />
      <Circle cx={100} cy={34} r={19} fill={`url(#${bun})`} />
      <Path d="M 89 26 C 93 21 99 19 105 20" stroke="#FFFFFF" strokeOpacity={0.32} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Rect x={88} y={47} width={24} height={7} rx={3.5} fill="#F2386B" />
      <Rect x={91} y={48} width={9} height={2.5} rx={1.25} fill="#FFFFFF" opacity={0.4} />

      {/* ears and earrings */}
      <Ellipse cx={63} cy={98} rx={7} ry={10} fill={`url(#${ear})`} />
      <Ellipse cx={137} cy={98} rx={7} ry={10} fill={`url(#${ear})`} />
      <Ellipse cx={64} cy={99} rx={3} ry={5} fill={shade(SKIN, -0.2)} opacity={0.6} />
      <Ellipse cx={136} cy={99} rx={3} ry={5} fill={shade(SKIN, -0.2)} opacity={0.6} />
      <Circle cx={63} cy={111} r={3.4} fill="#FFC043" />
      <Circle cx={137} cy={111} r={3.4} fill="#FFC043" />
      <Circle cx={62} cy={110} r={1.1} fill="#FFFFFF" opacity={0.8} />
      <Circle cx={136} cy={110} r={1.1} fill="#FFFFFF" opacity={0.8} />

      {/* face */}
      <Ellipse cx={100} cy={95} rx={37} ry={40} fill={`url(#${skin})`} />

      {/* side-swept fringe with a glossy streak */}
      <Path
        d="M 62 92 C 58 62 78 46 102 46 C 126 46 144 62 139 90 C 133 78 121 70 106 68 C 98 76 84 80 72 84 C 68 86 64 89 62 92 Z"
        fill={`url(#${hair})`}
      />
      <Path d="M 76 62 C 86 53 100 50 114 53" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={4.5} strokeLinecap="round" fill="none" />

      {/* brows, eyes with catchlights */}
      <Path d="M 79 88 Q 86 84 93 87" stroke={HAIR} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M 107 87 Q 114 84 121 88" stroke={HAIR} strokeWidth={3} strokeLinecap="round" fill="none" />
      <G>
        <Ellipse cx={86} cy={99} rx={4.8} ry={5.8} fill={INK} />
        <Ellipse cx={114} cy={99} rx={4.8} ry={5.8} fill={INK} />
        <Circle cx={87.8} cy={96.8} r={1.8} fill="#FFFFFF" />
        <Circle cx={115.8} cy={96.8} r={1.8} fill="#FFFFFF" />
      </G>

      {/* cheeks, nose, smile */}
      <Circle cx={77} cy={112} r={10} fill={`url(#${blush})`} />
      <Circle cx={123} cy={112} r={10} fill={`url(#${blush})`} />
      <Path d="M 99 104 Q 103 109 99 111" stroke={shade(SKIN, -0.28)} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M 88 116 C 92 126 108 126 112 116 C 106 119 94 119 88 116 Z" fill="#9B3442" />
      <Path d="M 94 121.5 C 98 124 102 124 106 121.5 C 103 120 97 120 94 121.5 Z" fill="#FF8A8A" />
    </Svg>
  );
}
