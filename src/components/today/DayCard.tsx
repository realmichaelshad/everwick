import { forwardRef, useEffect } from "react";
import { StyleSheet, View, type HostInstance } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { Illustration } from "@/components/illustrations/Illustration";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Text } from "@/components/ui/Text";
import type { DaySummary } from "@/data/stats";
import { radius, space, useTheme } from "@/theme";

export interface DayCardProps {
  summary: DaySummary;
  /** Names of habits still open, in list order. */
  openNames: string[];
  /** "Today", "Yesterday" or "Monday, Oct 19". */
  dayLabel: string;
  isToday: boolean;
  /** Perfect days in the last 60 (for the celebration copy). */
  perfectDays: number;
  /** Increment to replay the celebration (trophy pop and glow pulse) when the day is completed. */
  celebrate?: number;
}

/**
 * The answer to "what do I still need to do today?": the day's ring, how
 * many habits are left and the next one up. Streaks live on the rows and in
 * Progress, so this card says one thing. Turns into the celebration card when
 * everything due is done.
 */
export const DayCard = forwardRef<HostInstance, DayCardProps>(function DayCard({ summary, openNames, dayLabel, isToday, perfectDays, celebrate = 0 }, ref) {
  const left = summary.scheduled - summary.done;
  const allDone = summary.scheduled > 0 && left === 0;

  if (allDone) {
    return (
      <View ref={ref} collapsable={false}>
        <Celebration isToday={isToday} dayLabel={dayLabel} done={summary.done} scheduled={summary.scheduled} perfectDays={perfectDays} play={celebrate} />
      </View>
    );
  }

  const pct = Math.round(summary.fraction * 100);
  // One count, said once: the ring shows done of due, the title says what's left, the body names the next habit.
  const title = summary.scheduled === 0 ? "A rest day" : `${left} ${left === 1 ? "habit" : "habits"} left`;
  const body =
    summary.scheduled === 0
      ? summary.skipped
        ? "Everything due is skipped. Streaks stay safe."
        : "Nothing is scheduled. Enjoy it."
      : openNames.length
        ? `Next up: ${openNames[0]}`
        : "Nothing left to check in.";

  return (
    <View ref={ref} collapsable={false}>
      <Card
        padding={space[5]}
        style={styles.card}
        accessibilityRole="summary"
        accessibilityLabel={`${dayLabel}: ${summary.done} of ${summary.scheduled} habits done, ${pct} percent of the day's progress. ${body}`}
        accessible
      >
        {/* The arc also shows partial progress (5 of 8 glasses), so it moves with every tap. */}
        <ProgressRing progress={summary.fraction} size={96} strokeWidth={11}>
          <View style={styles.ringCount}>
            <Text variant="numeralSm" tabular style={styles.ringNumber}>
              {summary.done}
            </Text>
            <Text variant="headline" tone="subtle" tabular style={styles.ringOf}>
              /{summary.scheduled}
            </Text>
          </View>
        </ProgressRing>
        <View style={styles.texts}>
          {isToday ? null : (
            <Text variant="overline" tone="accent">
              {dayLabel}
            </Text>
          )}
          <Text variant="display" style={styles.title}>
            {title}
          </Text>
          <Text variant="body" tone="muted" numberOfLines={2}>
            {body}
          </Text>
        </View>
      </Card>
    </View>
  );
});

/**
 * The all-done card: the lit flame and the day's tally. When `play` changes
 * the flame springs up with a little wobble and a ring of light pulses out
 * from the card (the confetti comes from Today).
 */
function Celebration({ isToday, dayLabel, done, scheduled, perfectDays, play }: { isToday: boolean; dayLabel: string; done: number; scheduled: number; perfectDays: number; play: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!play || reduced) return;
    pop.value = withSequence(withTiming(0.55, { duration: 0 }), withSpring(1, { damping: 7, stiffness: 180, mass: 0.7 }));
    pulse.value = withSequence(withTiming(0, { duration: 0 }), withDelay(80, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
  }, [play, pop, pulse, reduced]);

  const trophy = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { rotate: `${(1 - pop.value) * -18}deg` }],
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: pulse.value > 0 && pulse.value < 1 ? 0.55 * (1 - pulse.value) : 0,
    transform: [{ scaleX: 1 + pulse.value * 0.06 }, { scaleY: 1 + pulse.value * 0.22 }],
  }));

  const title = isToday ? "All done today" : "All done";
  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.pulse, { borderColor: colors.success }, ring]} />
      <Animated.View
        entering={reduced ? undefined : ZoomIn.springify().damping(14)}
        style={[styles.celebrate, { backgroundColor: colors.surface }]}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`${isToday ? "All done today" : `All done on ${dayLabel}`}. ${done} of ${scheduled} habits.`}
      >
        <Animated.View style={[styles.celebrateArt, trophy]}>
          <Illustration slot="all-done" size={96} />
        </Animated.View>
        <View style={styles.celebrateText}>
          {isToday ? null : (
            <Text variant="overline" tone="accent">
              {dayLabel}
            </Text>
          )}
          <Text variant="display" style={styles.celebrateTitle}>
            {title}
          </Text>
          <Text variant="body" tone="muted">
            {isToday ? `${done} of ${done} habits. ${perfectDays} perfect ${perfectDays === 1 ? "day" : "days"} in the last 60.` : "Every habit was checked in on this day."}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: space[5], borderRadius: radius.xl },
  ringCount: { flexDirection: "row", alignItems: "baseline" },
  ringNumber: { fontSize: 28, lineHeight: 32 },
  ringOf: { marginLeft: 1 },
  texts: { flex: 1, gap: space[1] },
  title: { fontSize: 24, lineHeight: 28 },
  pulse: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius.xl + 4, borderWidth: 3 },
  celebrate: { borderRadius: radius.xl, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: space[5], padding: space[5] },
  celebrateText: { flex: 1, gap: space[1] },
  celebrateTitle: { fontSize: 24, lineHeight: 28 },
  celebrateArt: { width: 96, height: 96 },
});
