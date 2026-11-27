import ChevronRight from "lucide-react-native/icons/chevron-right";
import Lock from "lucide-react-native/icons/lock";
import Sunrise from "lucide-react-native/icons/sunrise";
import Trophy from "lucide-react-native/icons/trophy";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useSvgId } from "@/components/illustrations/soft";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HabitIcon } from "@/components/ui/HabitIcon";
import { PressableScale } from "@/components/ui/Pressable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { describeProgress, nextAchievement, type Achievement } from "@/data/achievements";
import { formatLongDate, formatShortDate } from "@/data/dates";
import type { Habit } from "@/data/types";
import { fonts, motion, radius, space, useTheme } from "@/theme";

import { MedalArt } from "./MedalArt";

/** Which medals are mid-celebration, and a key that changes per celebration. */
export interface Celebration {
  ids: string[];
  key: number;
}

export interface AchievementsCardProps {
  achievements: Achievement[];
  /** Newly unlocked ids whose reveal hasn't played yet: drawn locked until it does. */
  pending: string[];
  celebration: Celebration | null;
  onOpen: (id: string) => void;
}

const STAGGER = 130;

/**
 * The trophy shelf: five medals with their mark on a ribbon pill (locked
 * ones dimmed, with a lock and a progress ring), then the achievement that
 * is closest to unlocking.
 */
export function AchievementsCard({ achievements, pending, celebration, onOpen }: AchievementsCardProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const medal = width ? Math.max(52, Math.min(72, Math.floor((width - space[4] * 2) / achievements.length) - 6)) : 60;
  const next = nextAchievement(achievements);
  const celebrating = celebration?.ids ?? [];

  return (
    <Card padding={0} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.shelf}>
        {achievements.map((a) => {
          const order = celebrating.indexOf(a.id);
          return (
            <Medal
              key={a.id}
              achievement={a}
              size={medal}
              showLocked={!a.unlocked || pending.includes(a.id)}
              popKey={order >= 0 && celebration ? celebration.key : 0}
              delay={Math.max(0, order) * STAGGER}
              onPress={() => onOpen(a.id)}
            />
          );
        })}
      </View>
      <View style={[styles.sep, { backgroundColor: colors.line }]} />
      {next ? <NextUp achievement={next} onPress={() => onOpen(next.id)} /> : <AllUnlocked />}
    </Card>
  );
}

function Medal({
  achievement: a,
  size,
  showLocked,
  popKey,
  delay,
  onPress,
}: {
  achievement: Achievement;
  size: number;
  showLocked: boolean;
  popKey: number;
  delay: number;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const press = useSharedValue(1);

  useEffect(() => {
    if (!popKey || reduced) return;
    pop.value = 0;
    pop.value = withDelay(delay, withSpring(1, motion.spring.bouncy));
  }, [delay, pop, popKey, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.25], [0, 1], "clamp"),
    transform: [{ scale: (0.35 + 0.65 * pop.value) * press.value }, { rotate: `${(1 - pop.value) * -32}deg` }],
  }));

  const label = showLocked
    ? `${a.title}, locked, ${a.progress.current} of ${a.progress.target}`
    : `${a.title}, unlocked ${a.unlockedOn ? formatShortDate(a.unlockedOn) : ""}`.trim();

  return (
    <View style={styles.medalCol}>
      <Animated.View style={[styles.medalVisual, style]} aria-hidden pointerEvents="none">
        <View>
          <MedalArt achievement={a} size={size} locked={showLocked} shine={showLocked ? 0 : popKey} shineDelay={delay + 260} />
          {showLocked ? (
            <View style={[styles.lock, { backgroundColor: isDark ? colors.surfaceRaised : colors.surface, borderColor: colors.line }]}>
              <Lock size={11} color={colors.inkMuted} strokeWidth={2.6} />
            </View>
          ) : null}
        </View>
        {showLocked ? (
          <View style={[styles.pill, { backgroundColor: colors.surfaceMuted }]}>
            <ProgressRing progress={a.progress.current / a.progress.target} size={13} strokeWidth={2.5} animate={false} />
            <Text variant="caption" tone="muted" tabular maxFontSizeMultiplier={1.2} style={styles.pillText}>
              {a.progress.current}/{a.progress.target}
            </Text>
          </View>
        ) : (
          <View style={[styles.pill, { backgroundColor: colors.accent }]}>
            <MedalMark achievement={a} size="sm" />
          </View>
        )}
      </Animated.View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Shows the achievement and how to earn it"
        onPress={onPress}
        onPressIn={() => {
          if (!reduced) press.value = withSpring(0.92, motion.spring.press);
        }}
        onPressOut={() => {
          press.value = withSpring(1, motion.spring.press);
        }}
        pressScale={1}
        style={styles.overlay}
      />
    </View>
  );
}

function NextUp({ achievement: a, onPress }: { achievement: Achievement; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.nextWrap}>
      <View style={styles.next} aria-hidden pointerEvents="none">
        <MedalArt achievement={a} size={44} locked />
        <View style={styles.flex}>
          <Text variant="overline" tone="accent">
            Next up
          </Text>
          <Text variant="headline" numberOfLines={1}>
            {a.title}
          </Text>
          <ProgressBar progress={a.progress.current / a.progress.target} segments={a.target <= 10 ? a.target : undefined} height={6} style={styles.nextBar} />
          <Text variant="caption" tone="muted">
            {describeProgress(a)}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.inkSubtle} strokeWidth={2.4} />
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Next up: ${a.title}, ${describeProgress(a)}`}
        accessibilityHint="Shows how to earn it"
        onPress={onPress}
        pressScale={0.985}
        style={styles.overlay}
      />
    </View>
  );
}

function AllUnlocked() {
  const { colors } = useTheme();
  return (
    <View style={styles.next}>
      <View style={[styles.trophy, { backgroundColor: colors.accentSoft }]}>
        <Trophy size={20} color={colors.accentText} strokeWidth={2.3} />
      </View>
      <View style={styles.flex}>
        <Text variant="headline">Every medal unlocked</Text>
        <Text variant="caption" tone="muted">
          They're yours to keep. Keep the flame going.
        </Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Detail sheet                                                                */
/* -------------------------------------------------------------------------- */

export interface AchievementSheetProps {
  achievement: Achievement | null;
  habits: Habit[];
  onClose: () => void;
  onGoToday: () => void;
}

export function AchievementSheet({ achievement, habits, onClose, onGoToday }: AchievementSheetProps) {
  // Keep showing the last achievement while the sheet animates out.
  const [shown, setShown] = useState<Achievement | null>(achievement);
  useEffect(() => {
    if (achievement) setShown(achievement);
  }, [achievement]);
  const a = achievement ?? shown;
  if (!a) return null;
  const habit = a.earnedWith ? habits.find((h) => h.id === a.earnedWith?.id) : undefined;
  return (
    <Sheet
      visible={!!achievement}
      onClose={onClose}
      title={a.title}
      description={a.unlocked && a.unlockedOn ? `Unlocked ${formatLongDate(a.unlockedOn)}` : "Locked. Here's how to earn it."}
      footer={
        a.unlocked ? (
          <Button label="Done" variant="secondary" size="lg" fullWidth onPress={onClose} />
        ) : (
          <Button label="Check in on Today" size="lg" fullWidth onPress={onGoToday} />
        )
      }
    >
      <SheetBody achievement={a} habit={habit} />
    </Sheet>
  );
}

/** The mark on an unlocked medal's ribbon pill: its number, or a glyph (a sunrise for Early riser). */
function MedalMark({ achievement: a, size }: { achievement: Achievement; size: "sm" | "lg" }) {
  const { colors } = useTheme();
  if (a.glyph === "sunrise") return <Sunrise size={size === "sm" ? 13 : 18} color={colors.onAccent} strokeWidth={2.6} />;
  return size === "sm" ? (
    <Text variant="caption" tone="onAccent" tabular maxFontSizeMultiplier={1.2} style={[styles.pillText, styles.pillStrong]}>
      {a.mark}
    </Text>
  ) : (
    <Text variant="headline" tone="onAccent" tabular>
      {a.mark}
    </Text>
  );
}

function SheetBody({ achievement: a, habit }: { achievement: Achievement; habit?: Habit }) {
  const { colors, isDark } = useTheme();
  const glow = useSvgId("medalglow");
  const hero = 172;
  return (
    <>
      <View style={styles.hero}>
        <Svg aria-hidden width={hero + 80} height={hero + 40} style={styles.heroGlow}>
          <Defs>
            <RadialGradient id={glow} cx="50%" cy="46%" r="50%">
              <Stop offset="0.2" stopColor={a.unlocked ? colors.brand[0] : colors.lineStrong} stopOpacity={isDark ? 0.3 : 0.32} />
              <Stop offset="1" stopColor={a.unlocked ? colors.brand[0] : colors.lineStrong} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={(hero + 80) / 2} cy={(hero + 40) / 2} r={(hero + 40) / 2} fill={`url(#${glow})`} />
        </Svg>
        <MedalArt achievement={a} size={hero} locked={!a.unlocked} />
        <View style={[styles.heroPill, { backgroundColor: a.unlocked ? colors.accent : colors.surfaceMuted }]}>
          {a.unlocked ? null : <Lock size={13} color={colors.inkMuted} strokeWidth={2.6} />}
          {a.unlocked ? (
            <MedalMark achievement={a} size="lg" />
          ) : (
            <Text variant="headline" tone="muted" tabular>
              {`${a.progress.current}/${a.progress.target}`}
            </Text>
          )}
        </View>
      </View>
      <Text variant="body" tone="muted" align="center">
        {a.description}
      </Text>
      <Card variant="muted" style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text variant="caption" tone="muted">
            Progress
          </Text>
          <Text variant="caption" tabular>
            {describeProgress(a)}
          </Text>
        </View>
        <ProgressBar
          progress={a.progress.current / a.progress.target}
          segments={a.target <= 10 ? a.target : undefined}
          height={8}
          color={a.unlocked ? colors.success : colors.accent}
          accessibilityLabel={`${a.title} progress`}
        />
      </Card>
      <View style={styles.howTo}>
        <Text variant="overline" tone="subtle" heading>
          How to earn it
        </Text>
        <Text variant="body">{a.howTo}</Text>
      </View>
      {a.unlocked && a.earnedWith && a.unlockedOn ? (
        <View style={[styles.earned, { borderColor: colors.line }]}>
          {habit ? <HabitIcon icon={habit.icon} color={habit.color} size={36} /> : null}
          <Text variant="callout" tone="muted" style={styles.flex}>
            First earned with <Text variant="callout" style={styles.strong}>{a.earnedWith.name}</Text> on {formatShortDate(a.unlockedOn)}.
          </Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  shelf: { flexDirection: "row", paddingHorizontal: space[3], paddingTop: space[4], paddingBottom: space[3] },
  medalCol: { flex: 1, alignItems: "center" },
  medalVisual: { alignItems: "center" },
  lock: { position: "absolute", right: -2, top: 2, width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: -6, paddingHorizontal: space[2], minHeight: 20, borderRadius: radius.pill },
  pillText: { fontSize: 11.5, lineHeight: 15 },
  pillStrong: { fontFamily: fonts.extrabold },
  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius.md },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: space[4] },
  nextWrap: { position: "relative" },
  next: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4] },
  nextBar: { marginTop: space[1.5], marginBottom: space[1] },
  trophy: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  hero: { alignItems: "center", justifyContent: "center", paddingTop: space[2] },
  heroGlow: { position: "absolute", top: -12 },
  heroPill: { flexDirection: "row", alignItems: "center", gap: space[1], marginTop: -10, paddingHorizontal: space[3], paddingVertical: 3, borderRadius: radius.pill },
  progressCard: { gap: space[2] },
  progressTop: { flexDirection: "row", justifyContent: "space-between", gap: space[2] },
  howTo: { gap: space[1.5] },
  earned: { flexDirection: "row", alignItems: "center", gap: space[3], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth },
  strong: { fontFamily: fonts.bold },
});
