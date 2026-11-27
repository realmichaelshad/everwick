import Check from "lucide-react-native/icons/check";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, useReducedMotion, withSpring } from "react-native-reanimated";

import { Illustration } from "@/components/illustrations/Illustration";
import { HABIT_ICON_COMPONENTS } from "@/components/ui/HabitIcon";
import { PressableScale } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { habitIllustrationSlot } from "@/content/illustrations";
import type { HabitIconKey } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { elevation, motion, radius, space, useTheme, type HabitColorKey } from "@/theme";

export interface GoalCardProps {
  label: string;
  icon: HabitIconKey;
  color: HabitColorKey;
  selected: boolean;
  onToggle: () => void;
}

/** The 3D art's square: shown whole (contain), never cropped by a tile. */
const ART = 46;
const BADGE = 24;

/**
 * A goal chip for onboarding step 2: the goal's soft 3D object, whole, on a
 * faint halo of its color, then the label. Picking it tints the card in the
 * goal's color, lifts the object a little and springs a check badge onto the
 * card's corner (never over the art). A checkbox for screen readers.
 */
export function GoalCard({ label, icon, color, selected, onToggle }: GoalCardProps) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const tone = theme.habit(color);
  const reduced = useReducedMotion();
  const slot = habitIllustrationSlot(icon);
  const Icon = HABIT_ICON_COMPONENTS[icon];

  const on = useDerivedValue(() => (reduced ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, motion.spring.bouncy)), [selected, reduced]);
  const badge = useAnimatedStyle(() => ({ opacity: Math.min(1, on.value * 1.5), transform: [{ scale: Math.max(0, on.value) }] }));
  const art = useAnimatedStyle(() => ({ transform: [{ translateY: on.value * -2 }, { scale: 1 + on.value * 0.06 }, { rotate: `${on.value * -5}deg` }] }));
  const cardBg = colors.surface;

  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={label}
      pressScale={0.96}
      onPress={() => {
        haptics.selection();
        onToggle();
      }}
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: selected ? colors.ink : isDark ? colors.line : colors.surface },
        selected ? null : elevation("card", colors, isDark),
      ]}
    >
      <View style={styles.artWrap} aria-hidden pointerEvents="none">
        <Animated.View style={art}>
          {slot ? <Illustration slot={slot} size={ART} /> : <Icon size={24} color={tone.ink} strokeWidth={2.3} />}
        </Animated.View>
      </View>
      <Text variant="bodyStrong" style={styles.label} numberOfLines={2} noWidow>
        {label}
      </Text>
      <Animated.View style={[styles.badge, { backgroundColor: colors.ink, borderColor: colors.canvas }, badge]} aria-hidden pointerEvents="none">
        <Check size={12} color={colors.inkInverse} strokeWidth={3.4} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: "46%",
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: 72,
    paddingLeft: space[2],
    paddingRight: space[3],
    paddingVertical: space[2],
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  artWrap: { width: ART + 4, height: ART + 4, alignItems: "center", justifyContent: "center" },
  // On the card's corner, straddling the border (never over the art or the label).
  badge: {
    position: "absolute",
    top: -8,
    right: -6,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, fontSize: 14.5, lineHeight: 19 },
});
