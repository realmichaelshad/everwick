import type { LucideIcon } from "lucide-react-native";
import Apple from "lucide-react-native/icons/apple";
import Bike from "lucide-react-native/icons/bike";
import BookOpen from "lucide-react-native/icons/book-open";
import Brush from "lucide-react-native/icons/brush";
import Coffee from "lucide-react-native/icons/coffee";
import Droplet from "lucide-react-native/icons/droplet";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import Flower2 from "lucide-react-native/icons/flower-2";
import Footprints from "lucide-react-native/icons/footprints";
import Guitar from "lucide-react-native/icons/guitar";
import Heart from "lucide-react-native/icons/heart";
import Languages from "lucide-react-native/icons/languages";
import Leaf from "lucide-react-native/icons/leaf";
import MoonStar from "lucide-react-native/icons/moon-star";
import Mountain from "lucide-react-native/icons/mountain";
import Music from "lucide-react-native/icons/eighth-notes";
import PenLine from "lucide-react-native/icons/pen-line";
import PiggyBank from "lucide-react-native/icons/piggy-bank";
import Pill from "lucide-react-native/icons/pill";
import Salad from "lucide-react-native/icons/salad";
import Smile from "lucide-react-native/icons/face-slightly-smiling";
import Sprout from "lucide-react-native/icons/sprout";
import Sun from "lucide-react-native/icons/sun";
import BedDouble from "lucide-react-native/icons/bed-double";
import Timer from "lucide-react-native/icons/timer";
import Wind from "lucide-react-native/icons/wind";
import { View, type StyleProp, type ViewStyle } from "react-native";

import type { HabitIconKey } from "@/data/types";
import { radius, useTheme, type HabitColorKey } from "@/theme";

export const HABIT_ICON_COMPONENTS: Record<HabitIconKey, LucideIcon> = {
  droplet: Droplet,
  book: BookOpen,
  footprints: Footprints,
  lotus: Flower2,
  moon: MoonStar,
  dumbbell: Dumbbell,
  bike: Bike,
  apple: Apple,
  salad: Salad,
  pill: Pill,
  pen: PenLine,
  music: Music,
  sun: Sun,
  bed: BedDouble,
  heart: Heart,
  leaf: Leaf,
  coffee: Coffee,
  sprout: Sprout,
  wind: Wind,
  timer: Timer,
  languages: Languages,
  guitar: Guitar,
  piggy: PiggyBank,
  smile: Smile,
  brush: Brush,
  mountain: Mountain,
};

export interface HabitIconProps {
  icon: HabitIconKey;
  color: HabitColorKey;
  /** Tile size (icon is ~46% of it). */
  size?: number;
  /** "soft" tile (default), "solid" tile with onSolid icon, or "bare" icon only. */
  variant?: "soft" | "solid" | "bare";
  style?: StyleProp<ViewStyle>;
}

/** A habit's icon on its color tile. Decorative: label the parent instead. */
export function HabitIcon({ icon, color, size = 48, variant = "soft", style }: HabitIconProps) {
  const { habit } = useTheme();
  const tone = habit(color);
  const Icon = HABIT_ICON_COMPONENTS[icon] ?? Sprout;
  const iconSize = Math.round(size * 0.46);
  if (variant === "bare") return <Icon size={iconSize} color={tone.ink} strokeWidth={2.2} />;
  return (
    <View
      aria-hidden
      style={[
        {
          width: size,
          height: size,
          borderRadius: size >= 48 ? radius.md : radius.sm,
          backgroundColor: variant === "solid" ? tone.solid : tone.soft,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Icon size={iconSize} color={variant === "solid" ? tone.onSolid : tone.ink} strokeWidth={2.2} />
    </View>
  );
}
