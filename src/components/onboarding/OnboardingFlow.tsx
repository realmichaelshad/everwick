import { router } from "expo-router";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import Flame from "lucide-react-native/icons/flame";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, BackHandler, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { addedHabitsMessage, habitsForGoals, orderGoals, sameGoals } from "@/data/onboardingPlan";
import { useHabits, useStore } from "@/data/store";
import type { GoalKey, Habit } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { remindersSupported, requestReminderPermission, type ReminderPermission } from "@/lib/reminders";
import { layout, space } from "@/theme";

import { OnboardingBackdrop } from "./OnboardingBackdrop";
import { Pager } from "./Pager";
import { ProgressDots } from "./ProgressDots";
import { StepGoals, StepReminders, StepWelcome, type ReminderChoice } from "./Steps";

const STEPS = 3;
const TITLES = ["Welcome to Everwick", "What do you want to build?", "When should we nudge you?"];

/**
 * The three onboarding steps in a swipeable pager, with Skip always
 * available, progress dots and the primary action in the thumb zone.
 * Everything asked is used: the name in the Today greeting, the goals become
 * starter habits (see data/onboardingPlan.ts), the times become reminders.
 */
export function OnboardingFlow() {
  const { state, actions } = useStore();
  const habits = useHabits();
  const toast = useToast();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const settings = state.settings;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.name);
  const [goals, setGoals] = useState<GoalKey[]>(() => orderGoals(settings.goals));
  const [reminders, setReminders] = useState<ReminderChoice>({
    enabled: settings.notifications.enabled,
    morning: settings.notifications.morning,
    evening: settings.notifications.evening,
  });
  const [busy, setBusy] = useState(false);
  const touched = useRef({ name: false, goals: false, reminders: false });
  const position = useSharedValue(0);

  // The art scales with the screen so the headline, controls and button share the first view.
  const artSize = Math.round(Math.max(168, Math.min(272, Math.min(height, 932) * 0.31)));

  const stepRef = useRef(step);
  stepRef.current = step;
  const goTo = useCallback((next: number) => {
    const target = Math.max(0, Math.min(STEPS - 1, next));
    Keyboard.dismiss();
    if (target === stepRef.current) return;
    haptics.selection();
    setStep(target);
  }, []);

  // Announce the new step to screen readers on iOS and Android.
  useEffect(() => {
    if (Platform.OS !== "web") AccessibilityInfo.announceForAccessibility(`Step ${step + 1} of ${STEPS}. ${TITLES[step]}`);
  }, [step]);

  // Android back goes to the previous step before leaving.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === 0) return false;
      goTo(step - 1);
      return true;
    });
    return () => sub.remove();
  }, [goTo, step]);

  /** Adds the starter habits for the chosen goals and offers Undo. */
  const addGoalHabits = useCallback(
    (picked: GoalKey[], existing: Habit[]) => {
      const drafts = habitsForGoals(picked, existing);
      if (!drafts.length) return 0;
      const added = drafts.map((d) => actions.addHabit(d));
      toast.show({
        message: addedHabitsMessage(added.length),
        tone: "success",
        action: { label: "Undo", onPress: () => added.forEach((h) => actions.deleteHabit(h.id)) },
      });
      return added.length;
    },
    [actions, toast],
  );

  const leave = useCallback(() => {
    router.replace("/");
  }, []);

  const finish = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    let permission: ReminderPermission | null = null;
    try {
      // Asked only now, right after the step explained why, and only if the person wants reminders.
      if (remindersSupported && reminders.enabled) permission = await requestReminderPermission();
    } catch {
      permission = null;
    }
    const picked = orderGoals(goals);
    actions.completeOnboarding({ goals: picked, notifications: reminders, name: name.trim() });
    if (!name.trim()) actions.updateSettings({ name: "" });
    const added = addGoalHabits(picked, habits);
    if (!added && permission === "denied") {
      toast.show({ message: "Reminders stay off for now. You can allow them later in Profile." });
    }
    haptics.celebrate();
    leave();
  }, [actions, addGoalHabits, busy, goals, habits, leave, name, reminders, toast]);

  /** Skip keeps the demo data and whatever was already changed, without asking for anything else. */
  const skip = useCallback(() => {
    const t = touched.current;
    const picked = orderGoals(goals);
    actions.completeOnboarding({
      goals: picked,
      name: t.name ? name.trim() : undefined,
      notifications: t.reminders ? reminders : undefined,
    });
    if (t.name && !name.trim()) actions.updateSettings({ name: "" });
    if (t.goals && !sameGoals(picked, settings.goals)) addGoalHabits(picked, habits);
    leave();
  }, [actions, addGoalHabits, goals, habits, leave, name, reminders, settings.goals]);

  const toggleGoal = useCallback((goal: GoalKey) => {
    touched.current.goals = true;
    setGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : orderGoals([...prev, goal])));
  }, []);

  const last = step === STEPS - 1;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <OnboardingBackdrop position={position} />
      <View style={[styles.top, { paddingTop: insets.top + space[1] }]}>
        <View style={styles.topLeft}>
          {step > 0 ? (
            <Animated.View key="back" entering={reduced ? undefined : FadeIn.duration(180)} exiting={reduced ? undefined : FadeOut.duration(120)}>
              <IconButton icon={ChevronLeft} label="Back" variant="glass" iconSize={22} onPress={() => goTo(step - 1)} />
            </Animated.View>
          ) : (
            <Animated.View key="logo" entering={reduced ? undefined : FadeIn.duration(180)} exiting={reduced ? undefined : FadeOut.duration(120)}>
              <Logo size={24} />
            </Animated.View>
          )}
        </View>
        <Button label="Skip" variant="ghost" onPress={skip} testID="onboarding-skip" accessibilityHint="Finishes setup and keeps what you've chosen so far" />
      </View>

      <Pager index={step} onIndexChange={goTo} position={position}>
        <StepWelcome
          position={position}
          artSize={artSize}
          name={name}
          onNameChange={(v) => {
            touched.current.name = true;
            setName(v);
          }}
          onSubmit={() => goTo(1)}
        />
        <StepGoals position={position} artSize={artSize} goals={goals} onToggle={toggleGoal} habits={habits} />
        <StepReminders
          position={position}
          artSize={artSize}
          value={reminders}
          onChange={(patch) => {
            touched.current.reminders = true;
            setReminders((prev) => ({ ...prev, ...patch }));
          }}
        />
      </Pager>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, space[4]) + space[1] }]}>
        <ProgressDots count={STEPS} position={position} index={step} />
        {last ? (
          <Button label="Start building habits" icon={Flame} size="lg" fullWidth loading={busy} onPress={() => void finish()} testID="onboarding-finish" />
        ) : (
          <Button label="Continue" size="lg" fullWidth onPress={() => goTo(step + 1)} testID="onboarding-next" />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: layout.gutter - 4,
    paddingRight: layout.gutter - space[3],
    minHeight: 56,
  },
  topLeft: { minHeight: 44, justifyContent: "center" },
  bottom: { paddingHorizontal: layout.gutter, paddingTop: space[3], gap: space[4] },
});
