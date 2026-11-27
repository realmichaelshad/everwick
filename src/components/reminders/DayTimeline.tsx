import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion, ZoomIn } from "react-native-reanimated";

import { Text } from "@/components/ui/Text";
import { formatMinutes } from "@/data/dates";
import type { Habit } from "@/data/types";
import { motion, rgba, space, useTheme } from "@/theme";

import { layoutTimeline, timelineTickLabel, timelineTicks, timelineWindow, type DayReminder } from "./reminderSummary";

const DOT = 12;
const LANE = 15;
const LANES = 3;
const TRACK = 4;
const NOW = 12;

export interface DayTimelineProps {
  reminders: DayReminder[];
  habits: Habit[];
  /** Minutes after midnight right now (the part of the day that has passed is filled in). */
  nowMinutes: number;
  /** Reminders are off: draw the empty track only. */
  paused?: boolean;
}

/**
 * The day's reminders as dots on a line from morning to midnight, colored
 * by habit, with the part of the day already gone filled in ember. Dots that
 * would overlap stack on short stems. One image with a full description for
 * screen readers.
 */
export function DayTimeline({ reminders, habits, nowMinutes, paused }: DayTimelineProps) {
  const theme = useTheme();
  const { colors } = theme;
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const { start, end } = timelineWindow(reminders);
  const nowX = Math.min(1, Math.max(0, (nowMinutes - start) / (end - start)));
  // The now knob sits on the track, so a reminder right next to it stacks on a stem instead of colliding.
  const placed = useMemo(() => (width ? layoutTimeline(reminders, (DOT + 3) / width, LANES, paused ? undefined : nowX) : []), [nowX, paused, reminders, width]);
  const byId = useMemo(() => new Map(reminders.map((r) => [r.id, r])), [reminders]);
  const colorOf = (r: DayReminder) => {
    if (r.kind === "morning") return theme.habit("sun").solid;
    if (r.kind === "evening") return theme.habit("indigo").solid;
    if (r.kind === "review") return colors.accent;
    const habit = habits.find((h) => h.id === r.habitId);
    return habit ? theme.habit(habit.color).solid : colors.accent;
  };

  const ticks = timelineTicks(start, end);

  const summary = paused
    ? "Reminders are off, so nothing rings today."
    : reminders.length
      ? `Today's reminders: ${reminders.map((r) => `${r.label} at ${formatMinutes(r.minutes)}`).join(", ")}.`
      : "No reminders ring today.";

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.plot}>
        {/* track and the part of the day already gone */}
        <View style={[styles.track, styles.full, { backgroundColor: colors.track }]} />
        {!paused ? (
          <View style={[styles.track, { width: `${nowX * 100}%` }]}>
            <LinearGradient
              colors={[rgba(colors.brand[0], 0.55), colors.brand[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : null}
        {/* now: a knob at the end of the filled part of the day */}
        {!paused && width ? <View style={[styles.now, { left: nowX * width - NOW / 2, backgroundColor: colors.accent, borderColor: colors.surface }]} /> : null}
        {!paused
          ? placed.map((p, i) => {
              const r = byId.get(p.id);
              if (!r) return null;
              const gone = r.minutes <= nowMinutes;
              const left = p.x * width - DOT / 2;
              return (
                <Animated.View
                  key={p.id}
                  entering={
                    reduced
                      ? undefined
                      : ZoomIn.delay(120 + i * motion.stagger)
                          .springify()
                          .damping(14)
                  }
                  style={[styles.pin, { left, bottom: 0 }]}
                >
                  {p.lane > 0 ? <View style={[styles.stem, { height: p.lane * LANE, backgroundColor: rgba(colors.ink, 0.14) }]} /> : null}
                  <View style={[styles.dot, { bottom: p.lane * LANE, backgroundColor: colorOf(r), borderColor: colors.surface, opacity: gone ? 0.45 : 1 }]} />
                </Animated.View>
              );
            })
          : null}
      </View>
      <Animated.View entering={reduced ? undefined : FadeIn.duration(motion.base)} style={styles.ticks}>
        {ticks.map((m, i) => (
          <Text
            key={m}
            variant="caption"
            tone="subtle"
            style={[
              styles.tick,
              { left: `${((m - start) / (end - start)) * 100}%` },
              i === 0 ? styles.tickFirst : i === ticks.length - 1 ? styles.tickLast : styles.tickMid,
            ]}
          >
            {timelineTickLabel(m)}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const PLOT = DOT + LANE * (LANES - 1) + 4;

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  plot: { height: PLOT, justifyContent: "flex-end" },
  track: { position: "absolute", left: 0, bottom: (DOT - TRACK) / 2, height: TRACK, borderRadius: TRACK / 2, overflow: "hidden" },
  full: { right: 0 },
  now: { position: "absolute", bottom: (DOT - NOW) / 2, width: NOW, height: NOW, borderRadius: NOW / 2, borderWidth: 3 },
  pin: { position: "absolute", width: DOT, height: PLOT, alignItems: "center" },
  stem: { position: "absolute", bottom: DOT / 2, width: 1.5 },
  dot: { position: "absolute", width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2 },
  ticks: { height: 18 },
  tick: { position: "absolute", fontSize: 12, lineHeight: 16, width: 72 },
  tickFirst: { textAlign: "left" },
  tickMid: { textAlign: "center", marginLeft: -36 },
  tickLast: { textAlign: "right", marginLeft: -72 },
});
