import Bell from "lucide-react-native/icons/bell";
import BellOff from "lucide-react-native/icons/bell-off";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import Pause from "lucide-react-native/icons/pause";
import Target from "lucide-react-native/icons/target";
import { useCallback, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, View, type HostInstance } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { HabitIcon } from "@/components/ui/HabitIcon";
import { Text } from "@/components/ui/Text";
import { describeSchedule } from "@/data/catalog";
import { formatTime, orderedWeekdays, WEEKDAY_LETTER, WEEKDAY_LONG } from "@/data/dates";
import type { Habit } from "@/data/types";
import type { HeroRect } from "@/lib/heroTransition";
import { motion, radius, space, useTheme } from "@/theme";

import { measureInWindow } from "@/lib/measure";
import { glass } from "./tint";

/** Size of the hero art square (the PNG and the SVG fallback both fill it). */
export const HERO_ART = 148;
/** The list tile's corner radius relative to its size (16 / 48), so the flying tile matches the row. */
const TILE_RADIUS_RATIO = 16 / 48;

export interface HabitHeroProps {
  habit: Habit;
  /** Window rect of the tapped row's icon tile (lib/heroTransition), or null. */
  origin: HeroRect | null;
  /** The row's tile was solid (done today), so the flight starts from a solid tile. */
  tileSolid: boolean;
  weekStartsOn: 0 | 1;
}

/** How long the body waits while the tile flies in (about 60% of the flight), so the tile only crosses empty space. */
export const FLIGHT_HOLD_MS = 300;

/**
 * Entrance for the blocks under the art: fade and rise, staggered. On the web
 * the list screen is gone the moment the detail mounts (no native push to
 * cover the swap), so blocks use a short timing curve. When the hero tile is
 * flying in from the list (`afterFlight`), every block waits until the
 * flight is most of the way home, so the tile never passes over text.
 */
export function useEnter(afterFlight = false) {
  const reduced = useReducedMotion();
  return useCallback(
    (index: number) => {
      if (reduced) return undefined;
      const hold = afterFlight ? FLIGHT_HOLD_MS : 0;
      if (Platform.OS === "web") return FadeInDown.delay(hold + index * (afterFlight ? 40 : 24)).duration(260);
      return FadeInDown.delay((afterFlight ? hold : 90) + index * motion.stagger).springify().damping(18).stiffness(180);
    },
    [afterFlight, reduced],
  );
}

/**
 * The top of the habit detail: the habit's soft 3D art (or a large icon tile
 * for icons without art), name, detail line, the week's scheduled days,
 * schedule, reminder and goal.
 *
 * List-to-detail transition: when Today handed over the rect of the row's
 * icon tile, the art starts exactly there as that tile and springs into
 * place over an empty hero (the title and cards wait, see useEnter); as it
 * lands the tile cross-fades into the 3D art, which springs up from 0.8 (a
 * shared-element style transition that works on iOS, Android and web). Without an origin it fades
 * and scales in; under reduced motion it simply fades.
 */
export function HabitHero({ habit, origin, tileSolid, weekStartsOn }: HabitHeroProps) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const reduced = useReducedMotion();
  const fly = origin != null && !reduced;
  const enter = useEnter(fly);

  const stageRef = useRef<HostInstance>(null);
  const started = useRef(false);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(fly || reduced ? 1 : 0.86);
  const morph = useSharedValue(fly ? 0 : 1);
  const artScale = useSharedValue(fly ? 0.8 : 1);
  const shown = useSharedValue(0);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const settle = () => {
      shown.value = withTiming(1, { duration: reduced ? 160 : 280, easing: Easing.out(Easing.quad) });
      if (!reduced) scale.value = withSpring(1, motion.spring.gentle);
    };
    if (!fly || !origin) return settle();
    measureInWindow(stageRef.current, (rect) => {
      if (!rect) {
        morph.value = 1;
        return settle();
      }
      const dx = origin.x + origin.width / 2 - (rect.x + rect.width / 2);
      const dy = origin.y + origin.height / 2 - (rect.y + rect.height / 2);
      const s = origin.width / rect.width;
      const instant = { duration: 0 };
      tx.value = withSequence(withTiming(dx, instant), withSpring(0, motion.spring.gentle));
      ty.value = withSequence(withTiming(dy, instant), withSpring(0, motion.spring.gentle));
      scale.value = withSequence(withTiming(s, instant), withSpring(1, motion.spring.gentle));
      shown.value = 1;
      // The flat tile stays itself while it flies; once it is nearly home it cross-fades into
      // the 3D art, which springs up from 0.8 in place (never a swap mid-flight).
      morph.value = withSequence(withTiming(0, instant), withDelay(FLIGHT_HOLD_MS - 60, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })));
      artScale.value = withSequence(withTiming(0.8, instant), withDelay(FLIGHT_HOLD_MS - 60, withSpring(1, { damping: 12, stiffness: 190, mass: 0.8 })));
    });
  }, [fly, origin, reduced, morph, artScale, scale, shown, tx, ty]);

  const flight = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));
  const tileLayer = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0.2, 0.8], [1, 0], "clamp"),
    transform: [{ scale: interpolate(morph.value, [0, 1], [1, 1.08], "clamp") }],
  }));
  const artLayer = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0.1, 0.65], [0, 1], "clamp"),
    transform: [{ scale: artScale.value }],
  }));

  // The hero is the habit's own icon tile, larger: the same object the row's tile flies into.
  const art = <HabitIcon icon={habit.icon} color={habit.color} size={HERO_ART} variant="soft" style={{ borderRadius: HERO_ART * TILE_RADIUS_RATIO }} />;

  const scheduled = new Set(habit.schedule);
  const unit = habit.unit ?? "times";
  const goal = habit.target > 1 ? `${habit.target} ${unit}` : "Once a day";

  return (
    <View style={styles.hero}>
      <View ref={stageRef} collapsable={false} onLayout={start} style={styles.stage}>
        <Animated.View style={[StyleSheet.absoluteFill, flight]}>
          {fly ? (
            <Animated.View style={[StyleSheet.absoluteFill, tileLayer]}>
              <HabitIcon icon={habit.icon} color={habit.color} size={HERO_ART} variant={tileSolid ? "solid" : "soft"} style={{ borderRadius: HERO_ART * TILE_RADIUS_RATIO }} />
            </Animated.View>
          ) : null}
          <Animated.View style={[StyleSheet.absoluteFill, artLayer]}>{art}</Animated.View>
        </Animated.View>
      </View>

      <Animated.View entering={enter(0)} style={styles.titles}>
        <Text variant="display" heading align="center" numberOfLines={3}>
          {habit.name}
        </Text>
        {habit.detail ? (
          <Text variant="callout" tone="muted" align="center" numberOfLines={2}>
            {habit.detail}
          </Text>
        ) : null}
        {habit.archived ? (
          <View style={[styles.paused, { backgroundColor: colors.surfaceMuted }]}>
            <Pause size={12} color={colors.inkMuted} strokeWidth={2.6} />
            <Text variant="caption" tone="muted">
              Paused
            </Text>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View entering={enter(1)} style={[styles.facts, { backgroundColor: glass(colors, isDark, 0.74, 0.05), borderColor: isDark ? colors.line : glass(colors, false, 0.95) }]}>
        <View style={styles.week} aria-hidden>
          {orderedWeekdays(weekStartsOn).map((d) => {
            const on = scheduled.has(d);
            return (
              <View key={d} style={styles.dayCol}>
                <View style={[styles.day, on ? { backgroundColor: colors.ink, borderColor: colors.ink } : { borderColor: colors.lineStrong }]}>
                  <Text variant="caption" color={on ? colors.inkInverse : colors.inkSubtle} style={styles.dayText}>
                    {WEEKDAY_LETTER[d]}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={[styles.factRow, { borderTopColor: isDark ? colors.line : colors.line }]} role="list" aria-label="Schedule, reminder and goal">
          <Fact label="Schedule" value={describeSchedule(habit.schedule)} spoken={`Scheduled ${scheduleSpoken(habit)}`} icon={<CalendarDays size={14} color={colors.inkMuted} strokeWidth={2.4} />} />
          <View style={[styles.factSep, { backgroundColor: colors.line }]} />
          <Fact
            label="Reminder"
            value={habit.reminder ? formatTime(habit.reminder) : "Off"}
            spoken={habit.reminder ? `Reminder at ${formatTime(habit.reminder)}` : "No reminder"}
            icon={habit.reminder ? <Bell size={14} color={colors.inkMuted} strokeWidth={2.4} /> : <BellOff size={14} color={colors.inkSubtle} strokeWidth={2.4} />}
          />
          <View style={[styles.factSep, { backgroundColor: colors.line }]} />
          <Fact label="Goal" value={goal} spoken={`Goal: ${goal}`} icon={<Target size={14} color={colors.inkMuted} strokeWidth={2.4} />} />
        </View>
      </Animated.View>
    </View>
  );
}

function scheduleSpoken(habit: Habit): string {
  const text = describeSchedule(habit.schedule);
  if (text === "Every day" || text === "Weekdays" || text === "Weekends") return text.toLowerCase();
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => habit.schedule.includes(d as Habit["schedule"][number]))
    .map((d) => WEEKDAY_LONG[d])
    .join(", ");
}

function Fact({ label, value, spoken, icon }: { label: string; value: string; spoken: string; icon: ReactNode }) {
  return (
    <View role="listitem" aria-label={spoken} style={styles.fact}>
      <View aria-hidden style={styles.factInner}>
        <Text variant="overline" tone="subtle" numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.factValue}>
          {icon}
          <Text variant="caption" tone="default" numberOfLines={2} style={styles.factText}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Soft light behind the art so the 3D object sits in its own little glow (and never floats on the dark canvas). */
const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space[3], paddingTop: space[1], zIndex: 5 },
  stage: { width: HERO_ART, height: HERO_ART, zIndex: 5 },
  titles: { alignItems: "center", gap: space[1], paddingHorizontal: space[2], marginTop: space[1] },
  paused: { flexDirection: "row", alignItems: "center", gap: space[1], paddingHorizontal: space[2] + 2, paddingVertical: 3, borderRadius: radius.pill, marginTop: space[1] },
  facts: { alignSelf: "stretch", borderRadius: radius.card, borderWidth: 1, marginTop: space[2], overflow: "hidden" },
  week: { flexDirection: "row", paddingHorizontal: space[2], paddingVertical: space[3] },
  dayCol: { flex: 1, alignItems: "center" },
  day: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  dayText: { fontSize: 12, lineHeight: 16 },
  factRow: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
  fact: { flex: 1 },
  factInner: { alignItems: "center", gap: 3, paddingVertical: space[3], paddingHorizontal: space[1] },
  factValue: { flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "center" },
  factText: { flexShrink: 1, textAlign: "center" },
  factSep: { width: StyleSheet.hairlineWidth, marginVertical: space[3] },
});
