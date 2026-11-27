import { router, useLocalSearchParams } from "expo-router";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import Pause from "lucide-react-native/icons/pause";
import PencilLine from "lucide-react-native/icons/pencil-line";
import Play from "lucide-react-native/icons/play";
import Trash2 from "lucide-react-native/icons/trash";
import { useCallback, useMemo, useRef, useState, type Ref } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedRef, useScrollOffset } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HabitDaySheet } from "@/components/habit/HabitDaySheet";
import { DetailSkeleton } from "@/components/habit/DetailSkeleton";
import { FirstDayCard } from "@/components/habit/FirstDayCard";
import { FreezeCard } from "@/components/habit/FreezeCard";
import { HabitCalendar } from "@/components/habit/HabitCalendar";
import { HabitHero, useEnter } from "@/components/habit/HabitHero";
import { NotesCard } from "@/components/habit/NotesCard";
import { PAUSED_HOME } from "@/components/habit/PausedHabits";
import { HEADER_HEIGHT, OverlayHeader } from "@/components/habit/OverlayHeader";
import { StatTiles } from "@/components/habit/StatTiles";
import { TodayControl } from "@/components/habit/TodayControl";
import { rateDetail, restoreHabit, totalCheckins, typicalCheckinTime } from "@/components/habit/detailModel";
import { useDayActions } from "@/components/habit/useDayActions";
import { Illustration } from "@/components/illustrations/Illustration";
import { DawnBackdrop } from "@/components/ui/DawnBackdrop";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { ListGroup, ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState, ErrorState } from "@/components/ui/StateViews";
import { useToast } from "@/components/ui/Toast";
import { diffDays } from "@/data/dates";
import { isDoneOn, isScheduledOn, streakInfo } from "@/data/stats";
import { useHabit, useStore } from "@/data/store";
import type { AppState, DateKey } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { takeHeroOrigin } from "@/lib/heroTransition";
import { space, useTheme } from "@/theme";

/** Habit detail: "how is this one habit going?" */
export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, state, actions, today } = useStore();
  const habit = useHabit(id);
  const toast = useToast();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const offset = useScrollOffset(scrollRef);
  const day = useDayActions(habit);

  // The tapped row's icon rect (Today hands it over just before navigating). Taken once.
  const [origin] = useState(() => (id ? takeHeroOrigin(id) : null));
  // Blocks under the hero wait for a tile flying in from the list (useEnter).
  const enter = useEnter(origin != null);
  const [tileSolid] = useState(() => (habit ? isDoneOn(habit, state, today) : false));
  const [openDay, setOpenDay] = useState<DateKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const deleteSnapshot = useRef<AppState | null>(null);

  const info = useMemo(() => (habit ? streakInfo(habit, state, today) : null), [habit, state, today]);
  const frozen = useMemo(() => new Set(info?.frozen ?? []), [info]);
  const rate = useMemo(() => (habit ? rateDetail(habit, state, today, 30) : null), [habit, state, today]);
  const total = useMemo(() => (habit ? totalCheckins(habit, state, today) : 0), [habit, state, today]);
  const typical = useMemo(() => (habit ? typicalCheckinTime(habit, state, today) : null), [habit, state, today]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);

  const edit = useCallback(() => {
    if (habit) router.push({ pathname: "/habit/[id]/edit", params: { id: habit.id } });
  }, [habit]);

  const setPaused = useCallback(
    (paused: boolean) => {
      if (!habit) return;
      actions.archiveHabit(habit.id, paused);
      if (paused) {
        haptics.warning();
        toast.show({ message: `${habit.name} paused. Find it in ${PAUSED_HOME}.`, icon: Pause, action: { label: "Undo", onPress: () => actions.archiveHabit(habit.id, false) } });
      } else {
        haptics.complete();
        toast.show({ message: `${habit.name} is back on Today`, tone: "success", icon: Play, action: { label: "Undo", onPress: () => actions.archiveHabit(habit.id, true) } });
      }
    },
    [actions, habit, toast],
  );

  const askDelete = useCallback(() => {
    deleteSnapshot.current = actions.snapshot();
    haptics.warning();
    setConfirmDelete(true);
  }, [actions]);

  const doDelete = useCallback(() => {
    const before = deleteSnapshot.current ?? actions.snapshot();
    if (!habit) return;
    const { id: habitId, name } = habit;
    setLeaving(true);
    goBack();
    actions.deleteHabit(habitId);
    toast.show({
      message: `${name} deleted`,
      icon: Trash2,
      action: { label: "Undo", onPress: () => actions.restore(restoreHabit(actions.snapshot(), before, habitId)) },
    });
  }, [actions, goBack, habit, toast]);

  const tone = habit ? theme.habit(habit.color) : null;
  const historyDays = habit ? Math.max(1, diffDays(habit.createdAt, today) + 1) : 0;

  let body: React.ReactNode;
  if (status === "loading") {
    body = <DetailSkeleton />;
  } else if (status === "error") {
    body = <ErrorState onRetry={actions.retry} style={styles.state} />;
  } else if (!habit || !info || !rate) {
    body = leaving ? null : (
      <EmptyState
        style={styles.state}
        art={<Illustration slot="empty-habits" size={188} />}
        artSize={188}
        title="This habit is gone"
        body="It may have been deleted. Your other habits and their streaks are right where you left them."
        action={{ label: "Back to Today", icon: ArrowLeft, onPress: () => router.replace("/") }}
      />
    );
  } else {
    body = (
      <View style={styles.stack}>
        <HabitHero habit={habit} origin={origin} tileSolid={tileSolid} weekStartsOn={state.settings.weekStartsOn} />

        <Animated.View entering={enter(3)}>
          <TodayControl habit={habit} history={state} today={today} info={info} day={day} onResume={() => setPaused(false)} />
        </Animated.View>

        <Animated.View entering={enter(4)} style={styles.section}>
          <SectionHeader title="How it's going" meta={historyDays === 1 ? "Started today" : `${historyDays} days`} />
          {total === 0 && info.current === 0 ? (
            <FirstDayCard name={habit.name} scheduledToday={isScheduledOn(habit, today) && !habit.archived} />
          ) : (
            <StatTiles habit={habit} info={info} rate={rate} total={total} typical={typical} />
          )}
        </Animated.View>

        {total > 0 ? (
          <Animated.View entering={enter(5)}>
            <FreezeCard info={info} habit={habit} />
          </Animated.View>
        ) : null}

        <Animated.View entering={enter(6)} style={styles.section}>
          <SectionHeader title="History" />
          <HabitCalendar habit={habit} history={state} today={today} weekStartsOn={state.settings.weekStartsOn} frozen={frozen} onOpenDay={setOpenDay} />
        </Animated.View>

        <Animated.View entering={enter(7)} style={styles.section}>
          <SectionHeader title="Notes" />
          <NotesCard key={habit.id} notes={habit.notes} onSave={(notes) => actions.updateHabit(habit.id, { notes })} />
        </Animated.View>

        <Animated.View entering={enter(8)}>
          <ListGroup title="Manage">
            <ListRow icon={PencilLine} iconBg={tone?.soft} iconColor={tone?.ink} label="Edit habit" description="Name, icon, color, schedule, goal and reminder" onPress={edit} />
            {habit.archived ? (
              <ListRow icon={Play} label="Resume habit" description="Show it on Today again" onPress={() => setPaused(false)} />
            ) : (
              <ListRow
                icon={Pause}
                iconBg={theme.colors.surfaceMuted}
                iconColor={theme.colors.inkMuted}
                label="Pause habit"
                description="Hide it from Today. History and streak stay, and Profile lists it to resume."
                onPress={() => setPaused(true)}
              />
            )}
            <ListRow icon={Trash2} tone="danger" label="Delete habit" description="Removes it and its history from this phone" onPress={askDelete} chevron={false} />
          </ListGroup>
        </Animated.View>
      </View>
    );
  }

  return (
    <Screen
      testID="screen-habit-detail"
      title={habit?.name ?? "Habit"}
      scrollRef={scrollRef as unknown as Ref<Animated.ScrollView>}
      backdrop={<DawnBackdrop height={460} tint={tone?.soft} />}
      contentStyle={{ paddingTop: insets.top + HEADER_HEIGHT }}
      overlay={
        <OverlayHeader
          offset={offset}
          leading="back"
          collapsedTitle={habit?.name}
          collapseAt={300}
          actions={habit && status === "ready" ? <IconButton icon={PencilLine} label="Edit habit" variant="glass" onPress={edit} /> : null}
        />
      }
    >
      {body}
      {habit && info ? (
        <>
          <HabitDaySheet habit={habit} day={openDay} history={state} today={today} frozen={frozen} actions={day} onClose={() => setOpenDay(null)} />
          <Dialog
            visible={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            tone="danger"
            icon={Trash2}
            title={`Delete ${habit.name}?`}
            message={`Its ${historyDays} ${historyDays === 1 ? "day" : "days"} of history go with it. You can undo this for a few seconds.`}
            confirmLabel="Delete habit"
            cancelLabel="Keep it"
            onConfirm={doDelete}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[6] },
  section: { gap: space[3] },
  state: { paddingTop: space[10] },
});
