import ChevronRight from "lucide-react-native/icons/chevron-right";
import Snowflake from "lucide-react-native/icons/snowflake";
import Trophy from "lucide-react-native/icons/trophy";
import { useRef } from "react";
import { StyleSheet, View, type HostInstance } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Flame } from "@/components/ui/Flame";
import { HabitIcon } from "@/components/ui/HabitIcon";
import { PressableScale } from "@/components/ui/Pressable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Text } from "@/components/ui/Text";
import { formatRun, type StreakCardData } from "@/data/progressSeries";
import { spokenStreak, streakCount, streakUnit } from "@/data/streakCopy";
import { openHabitWithHero } from "@/lib/openHabit";
import { elevation, motion, radius, space, useTheme } from "@/theme";

/**
 * One card per habit, longest live streak first: icon, name, the live streak
 * (flame + count, its unit with the freezes beside it), the best run with dates, and a thin bar
 * comparing the two. Tapping a card opens the habit.
 */
export function StreakCards({ cards }: { cards: StreakCardData[] }) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.list}>
      {cards.map((card, i) => (
        <Animated.View key={card.habit.id} entering={reduced ? undefined : FadeInDown.delay(Math.min(i, 8) * motion.stagger).springify().damping(18).stiffness(180)}>
          <StreakCard card={card} />
        </Animated.View>
      ))}
    </View>
  );
}

function StreakCard({ card }: { card: StreakCardData }) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const tone = theme.lit(card.habit.color);
  const iconRef = useRef<HostInstance>(null);
  const { habit, current, freezes, best, personalBest, ratio } = card;
  const lit = current > 0;
  const bestText = best.length
    ? personalBest
      ? `Best ever, since\u00A0${formatRun({ ...best, end: best.start }).replace(" ", "\u00A0")}`
      : `Best ${best.length}, ${formatRun(best)}`
    : "No streak yet. Check in to start one";
  const spoken = [
    `${habit.name}.`,
    lit ? `${spokenStreak(habit, current)}${personalBest ? ", your best ever" : ""}.` : "No streak right now.",
    freezes ? `${freezes} streak ${freezes === 1 ? "freeze" : "freezes"}.` : "",
    best.length && !personalBest ? `Best ${streakCount(habit, best.length)}, ${formatRun(best).replace("–", "to")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const open = () => openHabitWithHero(habit.id, iconRef.current);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }, elevation("card", colors, isDark)]}>
      <View style={styles.content} aria-hidden pointerEvents="none">
        <View ref={iconRef} collapsable={false}>
          <HabitIcon icon={habit.icon} color={habit.color} size={48} />
        </View>
        <View style={styles.texts}>
          <Text variant="headline" numberOfLines={2}>
            {habit.name}
          </Text>
          <View style={styles.metaRow}>
            {personalBest ? <Trophy size={13} color={colors.accentText} strokeWidth={2.6} /> : null}
            <Text variant="caption" tone={personalBest ? "accent" : "subtle"} numberOfLines={2} style={styles.shrink}>
              {bestText}
            </Text>
          </View>
          <ProgressBar progress={best.length ? ratio : 0} color={lit ? tone.solid : colors.lineStrong} trackColor={tone.soft} height={6} style={styles.bar} />
        </View>
        <View style={styles.streak}>
          <View style={styles.streakRow}>
            <Flame size={22} lit={lit} intensity={Math.min(1, current / 30)} />
            <Text variant="numeralSm" tabular color={lit ? colors.ink : colors.inkSubtle}>
              {current}
            </Text>
          </View>
          <View style={styles.unitRow}>
            <Text variant="caption" tone="subtle" style={styles.freezeText}>
              {streakUnit(habit, current)}
            </Text>
            {freezes ? (
              <View style={[styles.freeze, { backgroundColor: colors.freezeSoft }]}>
                <Snowflake size={11} color={colors.freezeText} strokeWidth={2.6} />
                <Text variant="caption" color={colors.freezeText} tabular style={styles.freezeText}>
                  {freezes}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <ChevronRight size={18} color={colors.inkSubtle} strokeWidth={2.4} />
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint="Opens habit details"
        onPress={open}
        pressScale={0.985}
        style={styles.overlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3] },
  card: { borderRadius: radius.card },
  content: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[3] + 2, paddingLeft: space[3] + 2, paddingRight: space[3] },
  texts: { flex: 1, gap: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space[1] },
  shrink: { flexShrink: 1 },
  bar: { marginTop: space[1.5] },
  streak: { alignItems: "flex-end", minWidth: 56, gap: 2 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  unitRow: { flexDirection: "row", alignItems: "center", gap: space[1] },
  freeze: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: space[1.5], paddingVertical: 1, borderRadius: radius.pill },
  freezeText: { fontSize: 12, lineHeight: 16 },
  overlay: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius.card },
});
