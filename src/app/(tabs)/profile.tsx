import Constants from "expo-constants";
import { router, useIsFocused } from "expo-router";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Eraser from "lucide-react-native/icons/eraser";
import Plus from "lucide-react-native/icons/plus";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Trophy from "lucide-react-native/icons/trophy";
import Upload from "lucide-react-native/icons/upload";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type HostInstance } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Logo } from "@/components/brand/Logo";
import { PausedHabitsGroup } from "@/components/habit/PausedHabits";
import { AchievementSheet, AchievementsCard, type Celebration } from "@/components/profile/Achievements";
import { NameSheet, ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { importSummary, memberLine, profileStats } from "@/components/profile/profileModel";
import { AboutGroup, AboutSheet, AppearanceGroup, DataGroup, GeneralGroup, GoalTags, ProCard } from "@/components/profile/Settings";
import { StatsCard } from "@/components/profile/StatsCard";
import { useDataActions } from "@/components/profile/useDataActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Confetti } from "@/components/ui/Confetti";
import { Dialog } from "@/components/ui/Dialog";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StorageErrorState } from "@/components/ui/StateViews";
import { Text } from "@/components/ui/Text";
import { TAGLINE } from "@/content/brand";
import { useToast } from "@/components/ui/Toast";
import { evaluateAchievements, newlyUnlocked } from "@/data/achievements";
import type { ImportedData } from "@/data/persist";
import { useHabits, useStore } from "@/data/store";
import { haptics } from "@/lib/haptics";
import { space } from "@/theme";

const VERSION = Constants.expoConfig?.version ?? "1.0.0";

/**
 * Profile and settings: who you are (portrait, name, day count), how it's
 * going (lifetime stats and achievements), goals, and every setting:
 * appearance, haptics, reminders, the Pro demo, your data and an honest
 * About. testID screen-profile (e2e contract).
 */
export default function ProfileScreen() {
  const { status, state, actions, today } = useStore();
  const habits = useHabits();
  const toast = useToast();
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const data = useDataActions();
  const [editingName, setEditingName] = useState(false);
  const [about, setAbout] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [confetti, setConfetti] = useState(0);
  const shelfRef = useRef<HostInstance>(null);

  const ready = status === "ready";
  const stats = useMemo(() => profileStats(habits, state.habits, state, today), [habits, state, today]);
  const achievements = useMemo(() => evaluateAchievements(state.habits, state, today), [state, today]);
  const fresh = useMemo(() => newlyUnlocked(achievements, state.seenAchievements).map((a) => a.id), [achievements, state.seenAchievements]);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const freshKey = fresh.join(",");

  // Unlock moment: medals the person hasn't seen yet pop in (spring scale and
  // turn, a shine sweep), with confetti and a success haptic. It plays once,
  // only while Profile is on screen; then they're marked as seen.
  useEffect(() => {
    if (!ready || !focused || !freshKey) return;
    const ids = freshKey.split(",");
    const id = setTimeout(() => {
      setCelebration((prev) => ({ ids, key: (prev?.key ?? 0) + 1 }));
      if (!reduced) setConfetti((n) => n + 1);
      haptics.celebrate();
      const first = achievements.find((a) => a.id === ids[0]);
      toast.show({
        message: ids.length === 1 && first ? `Achievement unlocked: ${first.title}` : `${ids.length} achievements unlocked. Tap a medal for the story.`,
        tone: "success",
        icon: Trophy,
      });
      actions.markAchievementsSeen(ids);
    }, 650);
    return () => clearTimeout(id);
  }, [achievements, actions, focused, freshKey, ready, reduced, toast]);

  const setTheme = useCallback((theme: "system" | "light" | "dark") => actions.updateSettings({ theme }), [actions]);
  const saveName = useCallback(
    (name: string) => {
      actions.updateSettings({ name });
      setEditingName(false);
      haptics.complete();
      toast.show({ message: `Hi, ${name}. Your greeting is updated.`, tone: "success" });
    },
    [actions, toast],
  );

  // Keep the dialogs' content stable while they animate out.
  const lastImport = useRef<ImportedData | null>(null);
  const lastError = useRef("");
  if (data.dialog?.kind === "import-confirm") lastImport.current = data.dialog.data;
  if (data.dialog?.kind === "import-error") lastError.current = data.dialog.message;

  let body: React.ReactNode;
  if (status === "loading") {
    body = <ProfileSkeleton />;
  } else if (status === "error") {
    body = (
      <StorageErrorState title="Couldn't open your profile" onRetry={actions.retry} onStartFresh={actions.resetDemoData} style={styles.stateWrap} />
    );
  } else {
    const empty = habits.length === 0;
    const enter = (delay: number) => (reduced ? undefined : FadeInDown.delay(delay).duration(380));
    body = (
      <View style={styles.stack}>
        <Animated.View entering={enter(0)}>
          <ProfileHeader
            name={state.settings.name}
            memberLine={memberLine(stats)}
            pro={state.proPreview}
            onEditName={() => setEditingName(true)}
            action={empty ? <Button label="Create a habit" icon={Plus} onPress={() => router.push("/habit/new")} /> : undefined}
          />
        </Animated.View>

        <Animated.View entering={enter(60)} style={styles.section}>
          <SectionHeader title="Achievements" meta={`${unlockedCount} of ${achievements.length}`} />
          <View ref={shelfRef} collapsable={false}>
            <AchievementsCard achievements={achievements} pending={fresh} celebration={celebration} onOpen={setOpenId} />
          </View>
        </Animated.View>

        <Animated.View entering={enter(120)} style={styles.section}>
          <SectionHeader title="Your numbers" />
          <StatsCard stats={stats} />
        </Animated.View>

        <Animated.View entering={enter(180)} style={styles.section}>
          <SectionHeader title="Your goals" meta={state.settings.goals.length ? `${state.settings.goals.length} picked` : undefined} actionLabel="Change" onAction={data.replayOnboarding} />
          <Card style={styles.goals}>
            <GoalTags goals={state.settings.goals} />
            <Text variant="caption" tone="subtle">
              Goals shape the habits Everwick suggests. Change them by replaying the welcome steps.
            </Text>
          </Card>
        </Animated.View>

        <PausedHabitsGroup />

        <ProCard active={state.proPreview} onPress={() => router.push("/pro")} />

        <AppearanceGroup settings={state.settings} onTheme={setTheme} onWeekStart={(weekStartsOn) => actions.updateSettings({ weekStartsOn })} />
        <GeneralGroup settings={state.settings} onHaptics={(haptics) => actions.updateSettings({ haptics })} onReminders={() => router.push("/notifications")} />
        <DataGroup busy={data.busy} onExport={data.exportNow} onImport={data.importNow} onReset={data.askReset} onClear={data.askClear} onReplay={data.replayOnboarding} />
        <AboutGroup version={VERSION} onAbout={() => setAbout(true)} />

        <View style={styles.footer} aria-hidden>
          <Logo size={22} />
          <Text variant="caption" tone="subtle" align="center">
            {TAGLINE}
          </Text>
        </View>
      </View>
    );
  }

  const open = achievements.find((a) => a.id === openId) ?? null;

  return (
    <Screen tabBar onRefresh={actions.refresh} testID="screen-profile" title="Profile" inlineTitle="Profile" scrollEnabled={status !== "loading"}>
      {body}

      <NameSheet visible={editingName} initial={state.settings.name} onClose={() => setEditingName(false)} onSave={saveName} />
      <AchievementSheet
        achievement={open}
        habits={state.habits}
        onClose={() => setOpenId(null)}
        onGoToday={() => {
          setOpenId(null);
          router.navigate("/");
        }}
      />
      <AboutSheet visible={about} onClose={() => setAbout(false)} version={VERSION} />

      <Dialog
        visible={data.dialog?.kind === "reset"}
        onClose={data.closeDialog}
        icon={RotateCcw}
        tone="danger"
        title="Reset demo data?"
        message="Your habits and history are replaced with the 60-day sample. Theme and name stay. You can undo right after."
        confirmLabel="Reset demo data"
        onConfirm={data.confirmReset}
      />
      <Dialog
        visible={data.dialog?.kind === "clear"}
        onClose={data.closeDialog}
        icon={Eraser}
        tone="danger"
        title="Start from scratch?"
        message="Every habit and check-in on this device is removed. You can undo right after."
        confirmLabel="Remove everything"
        onConfirm={data.confirmClear}
      />
      <Dialog
        visible={data.dialog?.kind === "import-confirm"}
        onClose={data.closeDialog}
        icon={Upload}
        title="Replace your habits?"
        message={lastImport.current ? importSummary(lastImport.current) : ""}
        confirmLabel="Replace"
        onConfirm={() => {
          if (lastImport.current) data.confirmImport(lastImport.current);
        }}
      />
      <Dialog
        visible={data.dialog?.kind === "import-error"}
        onClose={data.closeDialog}
        icon={CircleAlert}
        title="That file can't be imported"
        message={lastError.current}
        confirmLabel="Choose another file"
        onConfirm={() => void data.importNow()}
      />
      <Confetti fire={confetti} anchor={shelfRef} origin={{ x: 0.5, y: 0.4 }} count={64} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[7] },
  section: { gap: space[3] },
  goals: { gap: space[3] },
  footer: { alignItems: "center", gap: space[2], paddingTop: space[2] },
  stateWrap: { flex: 1, justifyContent: "center", paddingTop: space[12] },
});
