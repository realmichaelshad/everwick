import { router } from "expo-router";
import CalendarCheck from "lucide-react-native/icons/calendar-check";
import Pause from "lucide-react-native/icons/pause";
import Plus from "lucide-react-native/icons/plus";
import Sparkles from "lucide-react-native/icons/sparkles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type HostInstance } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";

import { PausedHabitsSheet } from "@/components/habit/PausedHabits";
import { useCheckIns } from "@/components/habit/useDayActions";
import { Illustration } from "@/components/illustrations/Illustration";
import { DayCard } from "@/components/today/DayCard";
import { GestureTip } from "@/components/today/GestureTip";
import { HabitRow } from "@/components/today/HabitRow";
import { QuickAddSheet } from "@/components/today/QuickAddSheet";
import { SortableHabitList, type SortableItem } from "@/components/today/SortableHabitList";
import { TodaySkeleton } from "@/components/today/TodaySkeleton";
import { mergeOrder } from "@/components/today/todayModel";
import { WeekStrip } from "@/components/today/WeekStrip";
import { Avatar } from "@/components/ui/Avatar";
import { Confetti } from "@/components/ui/Confetti";
import { PressableScale } from "@/components/ui/Pressable";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState, StorageErrorState } from "@/components/ui/StateViews";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { describeSchedule } from "@/data/catalog";
import { addDays, formatLongDate, partOfDay } from "@/data/dates";
import { isDoneOn, isScheduledOn, isSkippedOn, perfectDays, streakInfo, summarizeDay, valueOn } from "@/data/stats";
import { useHabits, usePausedHabits, useStore } from "@/data/store";
import type { DateKey, Habit, HabitDraft } from "@/data/types";
import { now } from "@/lib/clock";
import { haptics } from "@/lib/haptics";
import { radius, space, useTheme } from "@/theme";

interface TodayItem extends SortableItem {
  habit: Habit;
  value: number;
  streak: number;
  freezes: number;
}

/** Wait for the scroll to the celebration card to settle before the burst. */
const CELEBRATE_AFTER_SCROLL_MS = 450;

/**
 * Today answers "what do I still need to do today?": the week strip, the
 * day card (ring, how many are left, the next one up) and the habit list with
 * tap, swipe, hold-to-reorder and their keyboard and screen-reader twins.
 * Every change offers Undo, which puts the whole day back (restoreDay).
 */
export default function TodayScreen() {
  const { status, state, actions, today } = useStore();
  const habits = useHabits();
  const paused = usePausedHabits();
  const toast = useToast();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<DateKey>(today);
  const [quickAdd, setQuickAdd] = useState(false);
  const [pausedOpen, setPausedOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [celebrate, setCelebrate] = useState(0);
  const [dragging, setDragging] = useState(false);
  const acted = useRef(false);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const dayCardRef = useRef<HostInstance>(null);
  const reduced = useReducedMotion();

  // Follow the calendar when the day rolls over at midnight.
  useEffect(() => setSelected(today), [today]);

  const isToday = selected === today;
  const dayLabel = isToday ? "Today" : selected === addDays(today, -1) ? "Yesterday" : formatLongDate(selected);

  const items = useMemo<TodayItem[]>(
    () =>
      habits
        .filter((h) => isScheduledOn(h, selected))
        .map((h) => {
          const info = streakInfo(h, state, today);
          return {
            id: h.id,
            label: h.name,
            habit: h,
            value: valueOn(h, state, selected),
            done: isDoneOn(h, state, selected),
            skipped: isSkippedOn(h, state, selected),
            streak: info.current,
            freezes: info.freezes,
          };
        }),
    [habits, selected, state, today],
  );
  const resting = useMemo(() => habits.filter((h) => !isScheduledOn(h, selected) && h.createdAt <= selected), [habits, selected]);
  const summary = useMemo(() => summarizeDay(habits, state, selected, today), [habits, selected, state, today]);
  const openNames = items.filter((i) => !i.done && !i.skipped).map((i) => i.habit.name);
  const perfect = useMemo(() => perfectDays(habits, state, today, 60), [habits, state, today]);

  // Leave reorder mode when there is nothing to reorder.
  useEffect(() => {
    if (!isToday || items.length < 2) setReordering(false);
  }, [isToday, items.length]);

  // Celebrate the moment the last habit of today is checked in (not on load):
  // scroll the card into view first, then the trophy pops and the confetti bursts from it.
  const complete = isToday && summary.scheduled > 0 && summary.done === summary.scheduled;
  const wasComplete = useRef(complete);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    if (complete && !wasComplete.current && acted.current) {
      haptics.celebrate();
      scrollRef.current?.scrollTo({ y: 0, animated: !reduced });
      id = setTimeout(
        () => {
          setCelebrate((n) => n + 1);
          setConfetti((n) => n + 1);
        },
        reduced ? 0 : CELEBRATE_AFTER_SCROLL_MS,
      );
    }
    wasComplete.current = complete;
    return () => {
      if (id) clearTimeout(id);
    };
  }, [complete, reduced]);

  // Check-ins, skips and their toasts and Undo: the same actions as habit detail (useCheckIns).
  const checkIns = useCheckIns({
    onAct: () => {
      acted.current = true;
    },
  });

  const reorder = useCallback(
    (visibleIds: string[]) =>
      actions.reorder(
        mergeOrder(
          habits.map((h) => h.id),
          visibleIds,
        ),
      ),
    [actions, habits],
  );

  const addSuggestion = useCallback(
    (draft: HabitDraft) => {
      const habit = actions.addHabit(draft);
      setQuickAdd(false);
      toast.show({ message: `Added ${habit.name}`, tone: "success", action: { label: "Undo", onPress: () => actions.deleteHabit(habit.id) } });
    },
    [actions, toast],
  );

  const name = state.settings.name.trim();
  const greeting = name ? `Good ${partOfDay(now().getHours())}, ${name}` : `Good ${partOfDay(now().getHours())}`;

  const pausedLink = paused.length ? (
    <PressableScale accessibilityRole="button" accessibilityHint="Lists paused habits so you can resume them" onPress={() => setPausedOpen(true)} pressScale={0.98} style={styles.pausedLink}>
      <Pause size={14} color={colors.inkMuted} strokeWidth={2.4} />
      <Text variant="caption" tone="muted">
        {paused.length} paused {paused.length === 1 ? "habit" : "habits"}
      </Text>
      <Text variant="caption" tone="accent">
        Show
      </Text>
    </PressableScale>
  ) : null;

  let body: React.ReactNode;
  if (status === "loading") {
    body = <TodaySkeleton />;
  } else if (status === "error") {
    body = <StorageErrorState onRetry={actions.retry} onStartFresh={actions.resetDemoData} style={styles.stateWrap} />;
  } else if (habits.length === 0) {
    body = (
      <Animated.View entering={FadeIn.duration(240)}>
        <Header greeting={greeting} name={state.settings.name} today={today} />
        <EmptyState
          art={<Illustration slot="empty-habits" size={208} />}
          artSize={208}
          title="Light your first habit"
          body="Pick one small thing you can do every day. Two minutes counts, and Everwick keeps the streak."
          action={{ label: "Create a habit", icon: Plus, onPress: () => router.push("/habit/new") }}
          secondaryAction={{ label: "Browse suggestions", icon: Sparkles, onPress: () => setQuickAdd(true) }}
        >
          {pausedLink}
        </EmptyState>
      </Animated.View>
    );
  } else {
    const canReorder = isToday && items.length > 1;
    body = (
      <View style={styles.stack}>
        <Header greeting={greeting} name={state.settings.name} today={today} />
        <Animated.View entering={FadeInDown.duration(320)}>
          <WeekStrip habits={habits} history={state} today={today} selected={selected} onSelect={setSelected} weekStartsOn={state.settings.weekStartsOn} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(60).duration(360)}>
          <DayCard ref={dayCardRef} summary={summary} openNames={openNames} dayLabel={dayLabel} isToday={isToday} perfectDays={perfect} celebrate={celebrate} />
        </Animated.View>

        <View style={styles.section}>
          <SectionHeader
            title={isToday ? "Your habits" : dayLabel}
            // The day card already says how many are left; the header only names a mode.
            meta={reordering ? "Reordering" : undefined}
            actionLabel={reordering ? "Done" : canReorder ? "Reorder" : isToday ? undefined : "Back to today"}
            onAction={reordering ? () => setReordering(false) : canReorder ? () => setReordering(true) : isToday ? undefined : () => setSelected(today)}
          />
          {reordering ? null : <GestureTip />}
          {items.length ? (
            <SortableHabitList
              items={items}
              reorderEnabled={isToday}
              reordering={reordering}
              onDragStateChange={setDragging}
              onSwipeRight={(item) => checkIns.swipeComplete(item.habit, selected)}
              onSwipeLeft={(item) => checkIns.toggleSkip(item.habit, selected)}
              onReorder={reorder}
              renderRow={(item, helpers) => (
                <HabitRow
                  habit={item.habit}
                  value={item.value}
                  streak={item.streak}
                  freezes={item.freezes}
                  skipped={item.skipped}
                  pastDay={!isToday}
                  onCheck={() => checkIns.tap(item.habit, selected)}
                  helpers={helpers}
                />
              )}
            />
          ) : (
            <View style={[styles.restCard, { backgroundColor: colors.surfaceMuted }]}>
              <CalendarCheck size={20} color={colors.inkMuted} strokeWidth={2.2} />
              <Text variant="callout" tone="muted" style={styles.flex}>
                Nothing is scheduled {isToday ? "today" : "on this day"}. Rest is part of the plan.
              </Text>
            </View>
          )}
          {resting.length ? (
            <Text variant="caption" tone="subtle" style={styles.resting}>
              Resting {isToday ? "today" : "this day"}: {resting.map((h) => `${h.name} (${describeSchedule(h.schedule)})`).join(", ")}
            </Text>
          ) : null}
          {isToday && !reordering ? (
            // Named by its visible text ("Add a habit Pick a suggestion or create your own").
            <PressableScale
              accessibilityRole="button"
              accessibilityHint="Opens suggestions and the new habit form"
              onPress={() => setQuickAdd(true)}
              pressScale={0.98}
              style={[styles.addRow, { borderColor: colors.lineStrong }]}
            >
              <View aria-hidden style={[styles.addIcon, { backgroundColor: colors.accentSoft }]}>
                <Plus size={20} color={colors.accentText} strokeWidth={2.6} />
              </View>
              <View style={styles.flex}>
                <Text variant="headline">Add a habit</Text>
                <Text variant="caption" tone="muted">
                  Pick a suggestion or create your own
                </Text>
              </View>
            </PressableScale>
          ) : null}
          {pausedLink}
        </View>
      </View>
    );
  }

  return (
    <Screen tabBar onRefresh={actions.refresh} testID="screen-today" title="Today" inlineTitle="Today" scrollRef={scrollRef} scrollEnabled={!dragging && status !== "loading"}>
      {body}
      <QuickAddSheet visible={quickAdd} onClose={() => setQuickAdd(false)} habits={habits} onAdd={addSuggestion} />
      <PausedHabitsSheet visible={pausedOpen} onClose={() => setPausedOpen(false)} />
      <Confetti fire={confetti} anchor={dayCardRef} origin={{ x: 0.5, y: 0.26 }} />
    </Screen>
  );
}

function Header({ greeting, name, today }: { greeting: string; name: string; today: DateKey }) {
  return (
    <View style={styles.header}>
      <View style={styles.flex}>
        <Text variant="overline" tone="muted">
          {formatLongDate(today)}
        </Text>
        <Text variant="display" heading level={1} numberOfLines={2} style={styles.greeting}>
          {greeting}
        </Text>
      </View>
      <PressableScale accessibilityRole="link" accessibilityLabel="Profile and settings" onPress={() => router.navigate("/profile")} pressScale={0.92}>
        <Avatar name={name || "You"} size={46} ring photo />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  header: { flexDirection: "row", alignItems: "center", gap: space[3], paddingTop: space[2] },
  greeting: { marginTop: 2 },
  section: { gap: space[3] },
  flex: { flex: 1 },
  stateWrap: { flex: 1, justifyContent: "center", paddingTop: space[12] },
  restCard: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4], borderRadius: radius.card },
  resting: { paddingHorizontal: space[1] },
  addRow: { flexDirection: "row", alignItems: "center", gap: space[3], borderWidth: 1.5, borderStyle: "dashed", borderRadius: radius.card, padding: space[3] + 2, minHeight: 72 },
  addIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pausedLink: { flexDirection: "row", alignItems: "center", alignSelf: "center", gap: space[1.5], minHeight: 44, paddingHorizontal: space[3] },
});
