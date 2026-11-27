import { router } from "expo-router";
import Play from "lucide-react-native/icons/play";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { HabitIcon } from "@/components/ui/HabitIcon";
import { PressableScale } from "@/components/ui/Pressable";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { streakInfo } from "@/data/stats";
import { usePausedHabits, useStore } from "@/data/store";
import type { Habit } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { elevation, layout, radius, space, useTheme } from "@/theme";

/** Where paused habits live, for toasts and banners. */
export const PAUSED_HOME = "Profile, under Paused habits";

/** Resume a paused habit with feedback and Undo. */
export function useResumeHabit() {
  const { actions } = useStore();
  const toast = useToast();
  return (habit: Habit) => {
    actions.archiveHabit(habit.id, false);
    haptics.complete();
    toast.show({ message: `${habit.name} is back on Today`, tone: "success", icon: Play, action: { label: "Undo", onPress: () => actions.archiveHabit(habit.id, true) } });
  };
}

/**
 * One paused habit: icon, name, what was kept, and Resume. The row opens the
 * habit's details; Resume is its own button (never a button inside a button).
 */
function PausedRow({ habit, onResume, onOpen }: { habit: Habit; onResume: () => void; onOpen: () => void }) {
  const { state, today } = useStore();
  const info = streakInfo(habit, state, today);
  const kept = info.best.length > 0 ? `Best streak ${info.best.length}, history kept` : "History kept";
  return (
    <View style={styles.row}>
      <View style={styles.main} aria-hidden pointerEvents="none">
        <HabitIcon icon={habit.icon} color={habit.color} size={40} />
        <View style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {habit.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {kept}
          </Text>
        </View>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, paused`}
        accessibilityHint="Opens the habit's details"
        onPress={onOpen}
        pressScale={0.99}
        style={styles.overlay}
      />
      <Button label="Resume" icon={Play} size="sm" variant="secondary" onPress={onResume} accessibilityLabel={`Resume ${habit.name}`} />
    </View>
  );
}

/**
 * Paused habits on Profile, so a paused habit is never lost: each can be
 * opened or resumed. Renders nothing when no habit is paused.
 */
export function PausedHabitsGroup() {
  const { colors, isDark } = useTheme();
  const paused = usePausedHabits();
  const resume = useResumeHabit();
  if (!paused.length) return null;
  return (
    <View style={styles.group}>
      <Text variant="overline" tone="subtle" heading level={2} style={styles.groupTitle}>
        Paused habits
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }, elevation("card", colors, isDark)]}>
        {paused.map((h, i) => (
          <View key={h.id}>
            {i > 0 ? <View style={[styles.sep, { backgroundColor: colors.line }]} /> : null}
            <PausedRow habit={h} onResume={() => resume(h)} onOpen={() => router.push({ pathname: "/habit/[id]", params: { id: h.id } })} />
          </View>
        ))}
      </View>
      <Text variant="caption" tone="subtle" style={styles.groupTitle}>
        Paused habits are hidden from Today, charts and reminders. Their history and streaks are kept.
      </Text>
    </View>
  );
}

/** The same list in a sheet, opened from the "paused" link on Today. */
export function PausedHabitsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const paused = usePausedHabits();
  const resume = useResumeHabit();
  return (
    <Sheet visible={visible} onClose={onClose} title="Paused habits" description="Hidden from Today, charts and reminders. History and streaks are kept.">
      <View style={styles.sheetList}>
        {paused.map((h) => (
          <PausedRow
            key={h.id}
            habit={h}
            onResume={() => {
              resume(h);
              if (paused.length === 1) onClose();
            }}
            onOpen={() => {
              onClose();
              router.push({ pathname: "/habit/[id]", params: { id: h.id } });
            }}
          />
        ))}
        {paused.length === 0 ? (
          <Text variant="callout" tone="muted">
            Nothing is paused right now.
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  groupTitle: { paddingHorizontal: space[1] },
  card: { borderRadius: radius.card, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: layout.cardPadding + 40 + space[3] },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 68, paddingHorizontal: layout.cardPadding, paddingVertical: space[3] },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: space[3] },
  texts: { flex: 1, gap: 2 },
  overlay: { position: "absolute", left: 0, top: 0, bottom: 0, right: 120, borderRadius: radius.md },
  sheetList: { gap: space[1], marginHorizontal: -layout.cardPadding },
});
