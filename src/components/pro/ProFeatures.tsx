import type { LucideIcon } from "lucide-react-native";
import Check from "lucide-react-native/icons/check";
import InfinityIcon from "lucide-react-native/icons/infinity";
import LayoutGrid from "lucide-react-native/icons/layout-grid";
import Palette from "lucide-react-native/icons/palette";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Sparkles from "lucide-react-native/icons/sparkles";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Text } from "@/components/ui/Text";
import { elevation, layout, motion, radius, space, useTheme, type HabitColorKey } from "@/theme";

interface Feature {
  icon: LucideIcon;
  color: HabitColorKey;
  title: string;
  body: string;
}

export const PRO_FEATURES: Feature[] = [
  { icon: InfinityIcon, color: "ember", title: "Unlimited habits", body: "Track everything you care about, no cap." },
  { icon: Sparkles, color: "violet", title: "Advanced insights", body: "Habit pairings, best times and year-long trends." },
  { icon: Palette, color: "rose", title: "Custom app icons and themes", body: "Six icons and four color themes to pick from." },
  { icon: LayoutGrid, color: "ocean", title: "Home screen widgets", body: "Today's ring and your streaks at a glance." },
  { icon: ShieldCheck, color: "leaf", title: "Encrypted backup", body: "Your history, sealed with a key only you hold." },
];

/** What Pro adds, as a card of icon-tile rows. Shows "Unlocked" checks while the preview is on. */
export function ProFeatures({ unlocked }: { unlocked: boolean }) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const reduced = useReducedMotion();
  return (
    <View
      accessibilityRole="list"
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }, elevation("card", colors, isDark)]}
    >
      {PRO_FEATURES.map((f, i) => {
        const tone = theme.habit(f.color);
        const Icon = f.icon;
        return (
          <Animated.View
            key={f.title}
            accessibilityRole="listitem"
            entering={reduced ? undefined : FadeInDown.delay(140 + i * motion.stagger).springify().damping(18).stiffness(180)}
            style={[styles.row, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : null]}
          >
            <View style={[styles.tile, { backgroundColor: tone.soft }]} aria-hidden>
              <Icon size={20} color={tone.ink} strokeWidth={2.3} />
            </View>
            <View style={styles.texts}>
              <Text variant="bodyStrong">{f.title}</Text>
              <Text variant="caption" tone="muted">
                {f.body}
              </Text>
            </View>
            {unlocked ? (
              <View style={[styles.check, { backgroundColor: colors.successSoft }]} accessible accessibilityRole="image" accessibilityLabel="Unlocked">
                <Check size={14} color={colors.successText} strokeWidth={3} />
              </View>
            ) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, paddingHorizontal: layout.cardPadding, paddingVertical: space[1] },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[3] + 2 },
  tile: { width: 40, height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 2 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});
