/**
 * Achievement medals: badge-streak-7, badge-streak-30, badge-checkins-100,
 * badge-perfect-week (SVG fallbacks for the PNG slots), plus EarlyRiserMedal,
 * which has no PNG slot and is always drawn here.
 *
 * Drawn to sit next to the soft 3D PNGs: a scalloped rosette lit from the
 * top left, a raised inner ring, a cream well with the emblem, and two
 * notched ribbon tails. The app draws numbers and labels on top; the art has
 * none. `muted` renders the same medal in quiet greys (locked state on
 * platforms without CSS filters).
 */
import { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";
import Svg from "react-native-svg";

import { FLAME_INNER_PATH, FLAME_PATH } from "@/components/brand/geometry";

import { shade, SoftGradient, SoftSparkle, useSvgId } from "../soft";
import type { FallbackProps } from "./types";

interface MedalPalette {
  /** Scalloped outer rosette. */
  rosette: string;
  /** Raised ring around the well. */
  ring: string;
  /** Center well. */
  well: string;
  ribbon: string;
}

const GREY: MedalPalette = { rosette: "#CFC6CC", ring: "#B9AEB6", well: "#EEE9EC", ribbon: "#A99DA6" };

/** Scalloped circle outline: `bumps` rounded petals around radius r. */
function scallop(cx: number, cy: number, r: number, bumps: number, depth: number): string {
  const pt = (radius: number, a: number) => `${(cx + Math.cos(a) * radius).toFixed(2)} ${(cy + Math.sin(a) * radius).toFixed(2)}`;
  let d = "";
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / bumps) * Math.PI * 2 - Math.PI / 2;
    const am = (a0 + a1) / 2;
    if (i === 0) d += `M ${pt(r, a0)}`;
    d += ` Q ${pt(r + depth * 2, am)} ${pt(r, a1)}`;
  }
  return `${d} Z`;
}

const CX = 100;
const CY = 92;

function Ribbons({ color, id }: { color: string; id: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(color, -0.25)} />
          <Stop offset="0.35" stopColor={color} />
          <Stop offset="1" stopColor={shade(color, 0.12)} />
        </LinearGradient>
      </Defs>
      {/* left tail */}
      <Path d="M 74 128 L 50 186 L 68 180 L 78 197 L 102 140 Z" fill={`url(#${id})`} />
      <Path d="M 74 128 L 50 186 L 56 184 L 80 130 Z" fill="#FFFFFF" opacity={0.18} />
      {/* right tail */}
      <Path d="M 126 128 L 150 186 L 132 180 L 122 197 L 98 140 Z" fill={`url(#${id})`} />
      <Path d="M 126 128 L 150 186 L 144 184 L 120 130 Z" fill="#000000" opacity={0.08} />
    </>
  );
}

function MedalBase({ palette, size, children, bumps = 14 }: { palette: MedalPalette; size: number; children?: React.ReactNode; bumps?: number }) {
  const rosette = useSvgId("rosette");
  const ring = useSvgId("ring");
  const well = useSvgId("well");
  const ribbon = useSvgId("ribbon");
  const bevel = useSvgId("bevel");
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Defs>
        <SoftGradient id={rosette} color={palette.rosette} light={0.42} dark={-0.2} />
        <SoftGradient id={ring} color={palette.ring} light={0.4} dark={-0.22} cx="30%" cy="24%" />
        <RadialGradient id={well} cx="50%" cy="42%" r="62%" fx="44%" fy="34%">
          <Stop offset="0" stopColor={shade(palette.well, 0.5)} />
          <Stop offset="0.7" stopColor={palette.well} />
          <Stop offset="1" stopColor={shade(palette.well, -0.14)} />
        </RadialGradient>
        <LinearGradient id={bevel} x1="0.15" y1="0.1" x2="0.85" y2="0.9">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.12} />
        </LinearGradient>
      </Defs>
      <Ribbons color={palette.ribbon} id={ribbon} />
      <Path d={scallop(CX, CY, 66, bumps, 4.5)} fill={`url(#${rosette})`} />
      <Path d={scallop(CX, CY, 66, bumps, 4.5)} fill="none" stroke={`url(#${bevel})`} strokeWidth={2.5} />
      <Circle cx={CX} cy={CY} r={54} fill={`url(#${ring})`} />
      <Circle cx={CX} cy={CY} r={53} fill="none" stroke={`url(#${bevel})`} strokeWidth={3} />
      <Circle cx={CX} cy={CY + 1.5} r={42} fill={shade(palette.ring, -0.35)} opacity={0.35} />
      <Circle cx={CX} cy={CY} r={42} fill={`url(#${well})`} />
      {children}
      {/* top-left gloss on the rosette */}
      <Path d="M 52 66 C 60 50 74 40 90 36" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function FlameEmblem({ id, scale, x, y, from = "#FFD27A", to = "#FF6B35" }: { id: string; scale: number; x: number; y: number; from?: string; to?: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id={id} x1="0.3" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <G transform={`translate(${x} ${y}) scale(${scale})`}>
        <Path d={FLAME_PATH} fill={`url(#${id})`} />
        <Path d={FLAME_INNER_PATH} fill="#FFF3D6" opacity={0.95} />
        <Path d="M 36 10 C 37 16 42 20 44 26" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" fill="none" />
      </G>
    </>
  );
}

/** Two laurel branches curving around the well (30-day medal). */
function Laurel({ color }: { color: string }) {
  const leaves: React.ReactNode[] = [];
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 6; i++) {
      const deg = side === -1 ? 118 + i * 19 : 62 - i * 19;
      const a = (deg * Math.PI) / 180;
      const x = CX + Math.cos(a) * 33;
      const y = CY + Math.sin(a) * 33;
      leaves.push(<Ellipse key={`${side}-${i}`} cx={x} cy={y} rx={7.5} ry={3.4} fill={color} transform={`rotate(${deg + side * -55} ${x} ${y})`} />);
    }
  }
  return <>{leaves}</>;
}

export function BadgeStreak7Fallback({ size }: FallbackProps) {
  const flame = useSvgId("m7f");
  return (
    <MedalBase size={size} palette={{ rosette: "#FFB547", ring: "#FF8A3D", well: "#FFF1E2", ribbon: "#F2386B" }}>
      <FlameEmblem id={flame} scale={0.95} x={70} y={56} />
    </MedalBase>
  );
}

export function BadgeStreak30Fallback({ size }: FallbackProps) {
  const flame = useSvgId("m30f");
  return (
    <MedalBase size={size} palette={{ rosette: "#FF6B7E", ring: "#F5B83D", well: "#E8384F", ribbon: "#F2386B" }} bumps={16}>
      <Laurel color="#FFD36B" />
      <FlameEmblem id={flame} scale={0.72} x={77} y={66} from="#FFE6A6" to="#FF8A3D" />
      <SoftSparkle x={CX} y={CY - 58} size={14} color="#FFE08A" />
    </MedalBase>
  );
}

export function BadgeCheckins100Fallback({ size }: FallbackProps) {
  return (
    <MedalBase size={size} palette={{ rosette: "#FFC043", ring: "#FFA928", well: "#FFD05A", ribbon: "#FF5A5F" }}>
      <Path d="M 80 94 L 95 109 L 122 80" stroke={shade("#FFA928", -0.25)} strokeOpacity={0.35} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(1.5 3)" />
      <Path d="M 80 94 L 95 109 L 122 80" stroke="#FFF6E6" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <SoftSparkle x={160} y={50} size={16} color="#FF6B35" />
      <SoftSparkle x={42} y={60} size={11} color="#FFC043" />
    </MedalBase>
  );
}

export function BadgePerfectWeekFallback({ size }: FallbackProps) {
  const star = useSvgId("pws");
  const starPath = (() => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 26 : 12;
      pts.push(`${(CX + Math.cos(a) * r).toFixed(2)} ${(CY + 2 + Math.sin(a) * r).toFixed(2)}`);
    }
    return `M ${pts.join(" L ")} Z`;
  })();
  return (
    <MedalBase size={size} palette={{ rosette: "#FF9A3D", ring: "#FF8A3D", well: "#4A2A44", ribbon: "#F2386B" }} bumps={18}>
      <Defs>
        <SoftGradient id={star} color="#FFB547" light={0.5} dark={-0.12} />
      </Defs>
      <Path d={starPath} fill={`url(#${star})`} stroke="#FFC979" strokeWidth={3} strokeLinejoin="round" />
      {/* seven day dots on an arc above the medal */}
      {Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * (1.18 + (i / 6) * 0.64);
        return <Circle key={i} cx={CX + Math.cos(a) * 82} cy={CY + 8 + Math.sin(a) * 82} r={6} fill={i === 3 ? "#FF6B35" : "#FF8A5C"} />;
      })}
    </MedalBase>
  );
}

/**
 * "Early riser": a sunny rosette holding a little dawn scene (a sun with a
 * glow and rays rising behind two soft hills) under a glassy dome. No PNG
 * slot, so this is the medal in every build.
 */
export function EarlyRiserMedal({ size, muted = false }: FallbackProps & { muted?: boolean }) {
  const sky = useSvgId("ersky");
  const sun = useSvgId("ersun");
  const glow = useSvgId("erglow");
  const back = useSvgId("erback");
  const front = useSvgId("erfront");
  const clip = useSvgId("erclip");
  const c = muted
    ? { sky0: "#EEEAEC", sky1: "#DDD6DA", sun: "#C9C0C6", glow: "#F4F1F2", ray: "#BDB3BA", back: "#C4BAC0", front: "#ABA0A8", palette: GREY }
    : {
        sky0: "#FFE1B0",
        sky1: "#FFB8A6",
        sun: "#FFB547",
        glow: "#FFF3CF",
        ray: "#FF9A3D",
        back: "#FF9A84",
        front: "#F2607A",
        palette: { rosette: "#FFD35C", ring: "#FFB03B", well: "#FFE3C4", ribbon: "#FF6B35" },
      };
  const SY = CY + 6; // sun center
  return (
    <MedalBase size={size} palette={c.palette} bumps={16}>
      <Defs>
        <LinearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.sky0} />
          <Stop offset="1" stopColor={c.sky1} />
        </LinearGradient>
        <SoftGradient id={sun} color={c.sun} light={0.55} dark={-0.1} cx="40%" cy="30%" />
        <RadialGradient id={glow} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={c.glow} stopOpacity={0.95} />
          <Stop offset="1" stopColor={c.glow} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={back} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(c.back, 0.15)} />
          <Stop offset="1" stopColor={c.back} />
        </LinearGradient>
        <LinearGradient id={front} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(c.front, 0.12)} />
          <Stop offset="1" stopColor={shade(c.front, -0.18)} />
        </LinearGradient>
        <ClipPath id={clip}>
          <Circle cx={CX} cy={CY} r={40} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clip})`}>
        <Circle cx={CX} cy={CY} r={40} fill={`url(#${sky})`} />
        <Circle cx={CX} cy={SY} r={32} fill={`url(#${glow})`} />
        {Array.from({ length: 7 }, (_, i) => {
          const a = Math.PI * (1.1 + i * 0.133);
          return (
            <Path
              key={i}
              d={`M ${CX + Math.cos(a) * 23} ${SY + Math.sin(a) * 23} L ${CX + Math.cos(a) * 31} ${SY + Math.sin(a) * 31}`}
              stroke={c.ray}
              strokeWidth={4.5}
              strokeLinecap="round"
            />
          );
        })}
        <Circle cx={CX} cy={SY} r={16} fill={`url(#${sun})`} />
        <Path d={`M ${CX - 9} ${SY - 8} C ${CX - 6} ${SY - 12} ${CX - 1} ${SY - 13} ${CX + 3} ${SY - 13}`} stroke="#FFFFFF" strokeOpacity={0.65} strokeWidth={3} strokeLinecap="round" fill="none" />
        {/* back hill, then the front hill with a lit ridge */}
        <Path d={`M ${CX - 44} ${CY + 18} C ${CX - 30} ${CY + 4} ${CX - 12} ${CY + 4} ${CX + 2} ${CY + 14} C ${CX + 16} ${CY + 22} ${CX + 30} ${CY + 18} ${CX + 44} ${CY + 14} L ${CX + 44} ${CY + 44} L ${CX - 44} ${CY + 44} Z`} fill={`url(#${back})`} />
        <Path d={`M ${CX - 44} ${CY + 30} C ${CX - 22} ${CY + 18} ${CX + 2} ${CY + 14} ${CX + 20} ${CY + 18} C ${CX + 30} ${CY + 20} ${CX + 38} ${CY + 24} ${CX + 44} ${CY + 28} L ${CX + 44} ${CY + 44} L ${CX - 44} ${CY + 44} Z`} fill={`url(#${front})`} />
        <Path d={`M ${CX - 26} ${CY + 22} C ${CX - 12} ${CY + 16} ${CX + 2} ${CY + 15} ${CX + 14} ${CY + 17}`} stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      </G>
      {/* glassy dome highlight */}
      <Path d={`M ${CX - 28} ${CY - 22} C ${CX - 20} ${CY - 32} ${CX - 8} ${CY - 37} ${CX + 4} ${CY - 37}`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" fill="none" />
      {!muted ? <SoftSparkle x={156} y={44} size={14} color="#FFB547" /> : null}
    </MedalBase>
  );
}
