import type { LucideIcon } from "lucide-react-native";
import BellRing from "lucide-react-native/icons/bell-ring";
import BookOpen from "lucide-react-native/icons/book-open";
import Droplet from "lucide-react-native/icons/droplet";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import Flower2 from "lucide-react-native/icons/flower-2";
import Footprints from "lucide-react-native/icons/footprints";
import MoonStar from "lucide-react-native/icons/moon-star";
import User from "lucide-react-native/icons/user";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";

import { Flame } from "@/components/ui/Flame";
import type { IllustrationSlot } from "@/content/illustrations";
import { useTheme } from "@/theme";

export interface IllustrationProps {
  slot: IllustrationSlot;
  /** Square size in points. */
  size: number;
  /** Accessible description; omit when decorative (the default). */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

const HABIT_GLYPHS: Partial<Record<IllustrationSlot, LucideIcon>> = {
  "habit-water": Droplet,
  "habit-read": BookOpen,
  "habit-walk": Footprints,
  "habit-meditate": Flower2,
  "habit-no-phone": MoonStar,
  "habit-strength": Dumbbell,
};

const BADGES = new Set<IllustrationSlot>(["badge-streak-7", "badge-streak-30", "badge-checkins-100", "badge-perfect-week"]);

/**
 * Flat vector art drawn from the app's own parts: the flame mark, the day
 * grid and the icon set, in paper, ink and the one flame color. Every slot
 * fills the same square, so layouts never change.
 */
export function Illustration({ slot, size, label, style }: IllustrationProps) {
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  return (
    <View {...a11y} style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <Art slot={slot} size={size} />
    </View>
  );
}

function Art({ slot, size }: { slot: IllustrationSlot; size: number }) {
  const { colors } = useTheme();
  const glyph = HABIT_GLYPHS[slot];
  const badge = BADGES.has(slot);

  if (glyph) return <Tile size={size} icon={glyph} />;
  if (badge) return <Medal size={size} />;

  switch (slot) {
    case "goals":
      return <DayGrid size={size} />;
    case "reminders":
      return <Tile size={size} icon={BellRing} round />;
    case "avatar":
      return <Tile size={size} icon={User} round />;
    case "pro":
      return (
        <Disc size={size} fill={colors.ink}>
          <Flame size={size * 0.44} />
        </Disc>
      );
    case "empty-habits":
      return (
        <Disc size={size} fill={colors.surfaceMuted} ring={colors.lineStrong}>
          <Flame size={size * 0.4} lit={false} animated={false} />
        </Disc>
      );
    case "welcome":
      return <WelcomeWeek size={size} />;
    default:
      // all-done: the lit flame in a soft halo of its own color.
      return (
        <Disc size={size} fill={colors.successSoft} ring={colors.success}>
          <Flame size={size * 0.42} intensity={0.8} />
        </Disc>
      );
  }
}

/** A circle with an optional hairline ring, content centered. */
function Disc({ size, fill, ring, children }: { size: number; fill: string; ring?: string; children: React.ReactNode }) {
  const r = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={r} cy={r} r={r - 1.5} fill={fill} stroke={ring ?? "transparent"} strokeWidth={ring ? 1.5 : 0} strokeOpacity={0.5} />
      </Svg>
      {children}
    </View>
  );
}

/** An icon on a paper tile (rounded square, or a circle). */
function Tile({ size, icon: Icon, round }: { size: number; icon: LucideIcon; round?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: round ? size / 2 : size * 0.28,
        backgroundColor: colors.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={size * 0.42} color={colors.ink} strokeWidth={1.75} />
    </View>
  );
}

/**
 * A medal: a stamped ring in the flame color around the flame (or another
 * mark). The milestone itself is printed under it by the achievements list.
 */
export function Medal({ size, icon: Icon }: { size: number; icon?: LucideIcon }) {
  const { colors } = useTheme();
  const r = size / 2;
  const stroke = Math.max(2, size * 0.06);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={r} cy={r} r={r - stroke / 2} fill={colors.surface} stroke={colors.success} strokeWidth={stroke} />
        <Circle cx={r} cy={r} r={r - stroke * 2.4} fill="none" stroke={colors.success} strokeWidth={1} strokeOpacity={0.35} />
      </Svg>
      {Icon ? <Icon size={size * 0.38} color={colors.successText} strokeWidth={2} /> : <Flame size={size * 0.4} animated={false} />}
    </View>
  );
}

/**
 * The welcome picture: the flame over a week of days, five lit, today ringed
 * and one still to come. The whole idea of the app in one line.
 */
function WelcomeWeek({ size }: { size: number }) {
  const { colors } = useTheme();
  const dot = size * 0.085;
  const gap = size * 0.035;
  const width = dot * 7 + gap * 6;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", gap: size * 0.1 }}>
      <Flame size={size * 0.34} intensity={0.8} />
      <Svg width={width} height={dot + 4}>
        {Array.from({ length: 7 }, (_, i) => {
          const cx = dot / 2 + i * (dot + gap);
          const lit = i < 5;
          const today = i === 5;
          return (
            <Circle
              key={i}
              cx={cx}
              cy={dot / 2 + 2}
              r={dot / 2 - (today ? 1 : 0)}
              fill={lit ? colors.success : "transparent"}
              stroke={lit ? colors.success : today ? colors.ink : colors.lineStrong}
              strokeWidth={lit ? 0 : 2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

/** The habit grid: days as squares, some lit. What a week of habits looks like. */
function DayGrid({ size }: { size: number }) {
  const { colors } = useTheme();
  const cols = 5;
  const rows = 4;
  const gap = size * 0.05;
  const cell = (size - gap * (cols - 1)) / cols;
  const lit = new Set([0, 1, 2, 4, 5, 6, 7, 9, 11, 12, 13, 15, 17, 18]);
  return (
    <Svg width={size} height={size * (rows / cols)}>
      {Array.from({ length: cols * rows }, (_, i) => (
        <Rect
          key={i}
          x={(i % cols) * (cell + gap)}
          y={Math.floor(i / cols) * (cell + gap)}
          width={cell}
          height={cell}
          rx={cell * 0.28}
          fill={lit.has(i) ? colors.success : colors.track}
        />
      ))}
    </Svg>
  );
}
