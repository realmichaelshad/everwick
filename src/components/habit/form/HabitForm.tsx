import { router, usePreventRemove } from "expo-router";
import Check from "lucide-react-native/icons/check";
import History from "lucide-react-native/icons/rotate-ccw-clock";
import Plus from "lucide-react-native/icons/plus";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Trash2 from "lucide-react-native/icons/trash";
import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View, type TextInputInstance } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedRef, useReducedMotion, useScrollOffset } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { DawnBackdrop } from "@/components/ui/DawnBackdrop";
import { Dialog } from "@/components/ui/Dialog";
import { useEscapeToClose } from "@/components/system/useEscapeToClose";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import {
  cleanText,
  describeGoal,
  DETAIL_MAX,
  emptyForm,
  firstError,
  fromHabit,
  NAME_MAX,
  sameValues,
  toDraft,
  toggleDay,
  toPatch,
  UNIT_MAX,
  UNIT_SUGGESTIONS,
  validate,
  withFrequency,
  type HabitFormValues,
} from "@/data/habitForm";
import { streakInfo } from "@/data/stats";
import { useStore } from "@/data/store";
import type { Habit } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { motion, radius, space, useTheme } from "@/theme";

import { HEADER_HEIGHT, OverlayHeader } from "../OverlayHeader";
import { draftCache } from "./draftCache";
import { HabitPreview } from "./HabitPreview";
import { ColorPicker, FrequencyPicker, GoalStepper, IconPicker } from "./Pickers";
import { ReminderPicker } from "./ReminderPicker";

export interface HabitFormProps {
  mode: "new" | "edit";
  /** The habit being edited (edit mode). */
  habit?: Habit;
  testID: string;
}

/**
 * Add and Edit habit share this form: a live preview, name and detail,
 * icon and color, schedule, daily goal and reminder. Sensible defaults,
 * inline plain-language validation, Save in thumb reach, a "Discard
 * changes?" check on the way out, and unsaved drafts kept for the session.
 */
export function HabitForm({ mode, habit, testID }: HabitFormProps) {
  const { state, actions, today } = useStore();
  const toast = useToast();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const offset = useScrollOffset(scrollRef);
  const detailRef = useRef<TextInputInstance>(null);

  const cacheKey = mode === "new" ? "new" : `edit:${habit?.id ?? ""}`;
  // The values this form started from (what "unchanged" means), fixed for the visit.
  const [base] = useState<HabitFormValues>(() => (habit ? fromHabit(habit) : emptyForm()));
  const [restored] = useState<HabitFormValues | null>(() => {
    const draft = draftCache.get(cacheKey);
    return draft && !sameValues(draft, base) ? draft : null;
  });
  const [values, setValues] = useState<HabitFormValues>(restored ?? base);
  const [showRestored, setShowRestored] = useState(restored != null);
  const [nameTouched, setNameTouched] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  const [leaving, setLeaving] = useState(false);

  const existingNames = useMemo(() => state.habits.filter((h) => h.id !== habit?.id).map((h) => h.name), [state.habits, habit?.id]);
  const { ok, errors } = validate(values, existingNames);
  const dirty = !sameValues(values, base);
  const tone = theme.habit(values.color);
  const info = useMemo(() => (habit ? streakInfo(habit, state, today) : null), [habit, state, today]);

  // Keep the draft for the session so leaving and coming back loses nothing.
  useEffect(() => {
    if (leaving) return;
    if (dirty) draftCache.set(cacheKey, values);
    else draftCache.clear(cacheKey);
  }, [cacheKey, dirty, leaving, values]);

  const allowLeave = usePreventRemove(dirty && !leaving, ({ repeat }) => {
    haptics.warning();
    setConfirmLeave(() => repeat);
  });

  const update = (patch: Partial<HabitFormValues>) => setValues((v) => ({ ...v, ...patch }));

  // Escape works like the Close button: going back is guarded, so changes still ask "Discard changes?".
  useEscapeToClose(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  });

  const nameError = errors.name && (nameTouched || errors.name.startsWith("You already") || errors.name.startsWith("Keep")) ? errors.name : null;
  const canSave = ok && (mode === "new" || dirty);
  const hint = !ok
    ? errors.name === "Give your habit a name"
      ? "Name your habit to save it"
      : firstError(errors)
    : mode === "edit" && !dirty
      ? "No changes yet"
      : null;

  const leave = () => {
    setLeaving(true);
    draftCache.clear(cacheKey);
    allowLeave();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const save = () => {
    if (!canSave) {
      haptics.error();
      setNameTouched(true);
      return;
    }
    if (mode === "new") {
      const created = actions.addHabit(toDraft(values));
      haptics.complete();
      leave();
      toast.show({
        message: `Added ${created.name}`,
        tone: "success",
        icon: Plus,
        action: { label: "Undo", onPress: () => actions.deleteHabit(created.id) },
      });
      return;
    }
    if (!habit) return;
    const before = toPatch(fromHabit(habit));
    actions.updateHabit(habit.id, toPatch(values));
    haptics.complete();
    leave();
    toast.show({ message: "Saved", tone: "success", icon: Check, action: { label: "Undo", onPress: () => actions.updateHabit(habit.id, before) } });
  };

  const enter = (i: number) => (reduced ? undefined : FadeInDown.delay(40 + i * motion.stagger).springify().damping(18).stiffness(180));

  const footer = (
    <View style={styles.footer}>
      {hint ? (
        <Text variant="caption" tone="subtle" align="center" accessibilityLiveRegion="polite" aria-live="polite">
          {hint}
        </Text>
      ) : null}
      <Button
        label={mode === "new" ? "Add habit" : "Save changes"}
        icon={mode === "new" ? Plus : Check}
        size="lg"
        fullWidth
        disabled={!canSave}
        onPress={save}
        testID="habit-save"
      />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
      <Screen
        testID={testID}
        title={mode === "new" ? "New habit" : "Edit habit"}
        overlay={<OverlayHeader offset={offset} title={mode === "new" ? "New habit" : "Edit habit"} leading="close" />}
        scrollRef={scrollRef as unknown as Ref<Animated.ScrollView>}
        backdrop={<DawnBackdrop height={340} tint={tone.soft} />}
        contentStyle={{ paddingTop: insets.top + HEADER_HEIGHT + space[2] }}
        footer={footer}
      >
        <View style={styles.stack}>
          <Animated.View entering={enter(0)}>
            <HabitPreview values={values} streak={info?.current ?? 0} freezes={info?.freezes ?? 0} />
          </Animated.View>

          {showRestored ? (
            <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={[styles.restored, { backgroundColor: theme.colors.accentSoft }]}>
              <History size={18} color={theme.colors.accentText} strokeWidth={2.4} />
              <Text variant="caption" style={styles.flex}>
                We kept your unsaved changes from before.
              </Text>
              <Button
                label="Start over"
                icon={RotateCcw}
                variant="ghost"
                size="sm"
                onPress={() => {
                  setValues(base);
                  setShowRestored(false);
                  draftCache.clear(cacheKey);
                }}
              />
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(1)}>
            <Card padding={space[4]} style={styles.card}>
              <TextField
                label="Name"
                value={values.name}
                onChangeText={(name) => update({ name })}
                onBlur={() => setNameTouched(true)}
                placeholder="e.g. Stretch 5 minutes"
                maxLength={NAME_MAX}
                showCount
                error={nameError}
                autoCapitalize="sentences"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => detailRef.current?.focus()}
              />
              <TextField
                ref={detailRef}
                label="Detail (optional)"
                value={values.detail}
                onChangeText={(detail) => update({ detail })}
                placeholder="e.g. After morning coffee"
                maxLength={DETAIL_MAX}
                error={errors.detail}
                returnKeyType="done"
              />
            </Card>
          </Animated.View>

          <Section title="Icon and color" index={2} enter={enter}>
            <Card padding={space[4]} style={styles.card}>
              <ColorPicker value={values.color} onChange={(color) => update({ color })} />
              <View style={[styles.rule, { backgroundColor: theme.colors.line }]} />
              <IconPicker value={values.icon} color={values.color} onChange={(icon) => update({ icon })} />
            </Card>
          </Section>

          <Section title="How often" index={3} enter={enter}>
            <Card padding={space[4]} style={styles.card}>
              <FrequencyPicker
                frequency={values.frequency}
                days={values.days}
                weekStartsOn={state.settings.weekStartsOn}
                color={values.color}
                error={errors.days}
                onFrequency={(f) => setValues((v) => withFrequency(v, f))}
                onToggleDay={(d) => setValues((v) => toggleDay(v, d))}
              />
            </Card>
          </Section>

          <Section title="Daily goal" index={4} enter={enter}>
            <Card padding={space[4]} style={styles.card}>
              <GoalStepper value={values.target} label={describeGoal(values)} onChange={(target) => update({ target })} />
              {values.target > 1 ? (
                <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={styles.unit}>
                  <TextField
                    label="Unit"
                    value={values.unit}
                    onChangeText={(unit) => update({ unit })}
                    placeholder="times"
                    maxLength={UNIT_MAX}
                    error={errors.unit}
                    helper="What you count, like glasses or pages"
                    returnKeyType="done"
                  />
                  <View style={styles.chips}>
                    {UNIT_SUGGESTIONS.map((u) => (
                      <Chip key={u} kind="action" label={u} accessibilityHint="Uses this unit" selected={cleanText(values.unit).toLowerCase() === u} onPress={() => update({ unit: u })} />
                    ))}
                  </View>
                </Animated.View>
              ) : (
                <Text variant="caption" tone="subtle">
                  Counting something, like 8 glasses? Raise the goal and Today adds one per tap.
                </Text>
              )}
            </Card>
          </Section>

          <Section title="Reminder" index={5} enter={enter}>
            <Card padding={space[4]} style={styles.card}>
              <ReminderPicker
                on={values.reminderOn}
                time={values.reminder}
                onToggle={(reminderOn) => update({ reminderOn })}
                onTime={(reminder) => update({ reminder })}
                notificationsEnabled={state.settings.notifications.enabled}
              />
            </Card>
          </Section>
        </View>

        <Dialog
          visible={confirmLeave != null}
          onClose={() => setConfirmLeave(null)}
          tone="danger"
          icon={Trash2}
          title="Discard changes?"
          message={mode === "new" ? "This habit hasn't been added yet. Leave now and it won't be saved." : "Your edits to this habit haven't been saved yet."}
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          onConfirm={() => {
            const repeat = confirmLeave;
            setLeaving(true);
            draftCache.clear(cacheKey);
            setConfirmLeave(null);
            repeat?.();
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Section({ title, index, enter, children }: { title: string; index: number; enter: (i: number) => ReturnType<typeof FadeInDown.delay> | undefined; children: ReactNode }) {
  return (
    <Animated.View entering={enter(index)} style={styles.section}>
      <Text variant="overline" tone="subtle" heading level={2} style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  stack: { gap: space[5] },
  card: { gap: space[4] },
  section: { gap: space[2] },
  sectionTitle: { paddingHorizontal: space[1] },
  rule: { height: StyleSheet.hairlineWidth },
  unit: { gap: space[3] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  footer: { gap: space[2] },
  restored: { flexDirection: "row", alignItems: "center", gap: space[2], paddingLeft: space[3], paddingRight: space[1], paddingVertical: space[1], borderRadius: radius.lg },
});
