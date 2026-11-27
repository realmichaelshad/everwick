import { router } from "expo-router";
import Plus from "lucide-react-native/icons/plus";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Illustration } from "@/components/illustrations/Illustration";
import { CompletionChart } from "@/components/progress/CompletionChart";
import { ProgressDaySheet } from "@/components/progress/ProgressDaySheet";
import { HeatmapCard } from "@/components/progress/Heatmap";
import { InsightCards, InsightsLocked } from "@/components/progress/InsightCards";
import { NextStepCard } from "@/components/progress/NextStepCard";
import { ProgressSkeleton } from "@/components/progress/ProgressSkeleton";
import { StreakCards } from "@/components/progress/StreakCards";
import { SummaryTiles } from "@/components/progress/SummaryTiles";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, StorageErrorState } from "@/components/ui/StateViews";
import { Text } from "@/components/ui/Text";
import { buildInsights, insightsUnlocked } from "@/data/insights";
import { chartModel, chartSummary, progressSummary, streakBoard, type ProgressRange } from "@/data/progressSeries";
import { daysTracked, summarizeDay } from "@/data/stats";
import { useHabits, useStore } from "@/data/store";
import type { DateKey } from "@/data/types";
import { space } from "@/theme";

const RANGES: { value: ProgressRange; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/**
 * Progress answers "am I improving?": a Week/Month overview (tiles and a
 * scrub-able completion chart), a 13-week calendar with per-day details,
 * streaks per habit and a few insights from the on-device history.
 */
export default function ProgressScreen() {
  const { status, state, actions, today } = useStore();
  const habits = useHabits();
  const reduced = useReducedMotion();
  const weekStartsOn = state.settings.weekStartsOn;
  const [range, setRange] = useState<ProgressRange>("week");
  const [openDay, setOpenDay] = useState<DateKey | null>(null);

  const summary = useMemo(() => progressSummary(habits, state, today, range, weekStartsOn), [habits, range, state, today, weekStartsOn]);
  const model = useMemo(() => chartModel(habits, state, today, weekStartsOn), [habits, state, today, weekStartsOn]);
  const bars = range === "week" ? model.week : model.month;
  const board = useMemo(() => streakBoard(habits, state, today), [habits, state, today]);
  const insights = useMemo(() => buildInsights(habits, state, today, { weekStartsOn }), [habits, state, today, weekStartsOn]);
  const todaySummary = useMemo(() => summarizeDay(habits, state, today, today), [habits, state, today]);
  const firstDay = useMemo(() => habits.reduce<DateKey | null>((min, h) => (!min || h.createdAt < min ? h.createdAt : min), null), [habits]);
  const unlocked = insightsUnlocked(habits, today);

  const enter = (delay: number) => (reduced ? undefined : FadeInDown.delay(delay).duration(360));

  let body: React.ReactNode;
  if (status === "loading") {
    body = <ProgressSkeleton />;
  } else if (status === "error") {
    body = (
      <StorageErrorState title="Couldn't open your progress" onRetry={actions.retry} onStartFresh={actions.resetDemoData} style={styles.stateWrap} />
    );
  } else if (habits.length === 0) {
    body = (
      <Animated.View entering={reduced ? undefined : FadeIn.duration(240)} style={styles.stack}>
        <Header overline="Your progress" />
        <EmptyState
          art={<Illustration slot="empty-habits" size={208} />}
          artSize={208}
          title="Your progress lives here"
          body="Create a habit and check in for a few days. Your charts, streaks and insights fill in as you go."
          action={{ label: "Create a habit", icon: Plus, onPress: () => router.push("/habit/new") }}
        />
      </Animated.View>
    );
  } else {
    body = (
      <View style={styles.stack}>
        <View style={styles.top}>
          <Header overline={summary.window.label} />
          <SegmentedControl options={RANGES} value={range} onChange={setRange} label="Chart range" />
        </View>

        <Animated.View entering={enter(40)}>
          <SummaryTiles summary={summary} bars={bars} range={range} />
        </Animated.View>

        <Animated.View entering={enter(100)}>
          <CompletionChart
            model={model}
            range={range}
            average={summary.current.rate}
            hasData={summary.current.scheduled > 0}
            summary={chartSummary(range, bars, summary.current)}
            weekStartsOn={weekStartsOn}
          />
        </Animated.View>

        <Animated.View entering={enter(160)}>
          <HeatmapCard habits={habits} history={state} today={today} weekStartsOn={weekStartsOn} onOpenDay={setOpenDay} openDay={openDay} />
        </Animated.View>

        <View style={styles.section}>
          <SectionHeader title="Streaks" meta={`${habits.length} ${habits.length === 1 ? "habit" : "habits"}`} />
          <StreakCards cards={board} />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Insights" meta={unlocked ? "From the last 60 days" : undefined} />
          {unlocked && insights.length ? (
            <InsightCards insights={insights} habits={habits} weekStartsOn={weekStartsOn} />
          ) : (
            <InsightsLocked daysTracked={daysTracked(habits, today)} />
          )}
        </View>

        <NextStepCard today={todaySummary} />
      </View>
    );
  }

  return (
    <Screen tabBar onRefresh={actions.refresh} testID="screen-progress" title="Progress" inlineTitle="Progress">
      {body}
      <ProgressDaySheet
        day={openDay}
        onClose={() => setOpenDay(null)}
        onChangeDay={setOpenDay}
        habits={habits}
        history={state}
        today={today}
        firstDay={firstDay}
      />
    </Screen>
  );
}

function Header({ overline }: { overline: string }) {
  return (
    <View style={styles.header}>
      <Text variant="overline" tone="accent">
        {overline}
      </Text>
      <Text variant="display" heading style={styles.title}>
        Progress
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  top: { gap: space[4] },
  header: { paddingTop: space[2] },
  title: { marginTop: 2 },
  section: { gap: space[3] },
  stateWrap: { flex: 1, justifyContent: "center", paddingTop: space[12] },
});
