import Bell from "lucide-react-native/icons/bell";
import Info from "lucide-react-native/icons/info";
import MoonStar from "lucide-react-native/icons/moon-star";
import Smartphone from "lucide-react-native/icons/smartphone";
import Sparkles from "lucide-react-native/icons/sparkles";
import Sun from "lucide-react-native/icons/sun";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { TimeRow } from "@/components/reminders/TimeRow";
import { ListGroup, ListRow } from "@/components/ui/ListRow";
import { Switch } from "@/components/ui/Switch";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { TAGLINE_LINES } from "@/content/brand";
import { GOALS } from "@/data/catalog";
import { describeGoalPlan, planGoals } from "@/data/onboardingPlan";
import type { GoalKey, Habit } from "@/data/types";
import { remindersSupported } from "@/lib/reminders";
import { radius, space, useTheme } from "@/theme";

import { GoalCard } from "./GoalCard";
import { HeroArt } from "./HeroArt";
import { StepLayout } from "./StepLayout";

interface StepBase {
  position: SharedValue<number>;
  /** Square size of the hero art for this screen height. */
  artSize: number;
}

/* -------------------------------------------------------------------------- */
/* 1. Welcome                                                                  */
/* -------------------------------------------------------------------------- */

export function StepWelcome({
  position,
  artSize,
  name,
  onNameChange,
  onSubmit,
}: StepBase & { name: string; onNameChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <StepLayout
      art={<HeroArt slot="welcome" size={artSize} page={0} position={position} />}
      overline="Welcome to Everwick"
      title={TAGLINE_LINES.join("\n")}
      body="Check in each day and your streak grows. Freezes cover the odd busy day, so one miss never puts the flame out."
    >
      <TextField
        label="What should we call you?"
        helper="Only used for your daily greeting."
        value={name}
        onChangeText={onNameChange}
        placeholder="Your first name"
        maxLength={24}
        autoCapitalize="words"
        autoComplete="given-name"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={onSubmit}
        submitBehavior="blurAndSubmit"
      />
    </StepLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Goals                                                                    */
/* -------------------------------------------------------------------------- */

export function StepGoals({ position, artSize, goals, onToggle, habits }: StepBase & { goals: GoalKey[]; onToggle: (goal: GoalKey) => void; habits: Habit[] }) {
  const { colors } = useTheme();
  const selected = useMemo(() => new Set(goals), [goals]);
  const plan = useMemo(() => planGoals(goals, habits), [goals, habits]);
  const adds = plan.filter((p) => p.draft).length;
  const count = plan.length;
  return (
    <StepLayout
      art={<HeroArt slot="goals" size={Math.round(artSize * 0.44)} page={1} position={position} />}
      overline="Your goals"
      title="What will you build?"
      body="Pick a few. We'll fill the gaps with starter habits."
    >
      <View style={styles.grid}>
        {GOALS.map((g) => (
          <GoalCard key={g.key} label={g.label} icon={g.icon} color={g.color} selected={selected.has(g.key)} onToggle={() => onToggle(g.key)} />
        ))}
      </View>
      <View style={[styles.plan, { backgroundColor: colors.surfaceMuted }]} aria-live="polite" accessibilityLiveRegion="polite">
        <View style={[styles.planIcon, { backgroundColor: adds ? colors.accentSoft : colors.successSoft }]} aria-hidden>
          <Sparkles size={16} color={adds ? colors.accentText : colors.successText} strokeWidth={2.4} />
        </View>
        <View style={styles.flex}>
          <Text variant="caption" tabular>
            {count === 0 ? "No goals picked yet" : `${count} ${count === 1 ? "goal" : "goals"} picked`}
          </Text>
          <Text variant="caption" tone="muted">
            {describeGoalPlan(plan)}
          </Text>
        </View>
      </View>
    </StepLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Reminders                                                                */
/* -------------------------------------------------------------------------- */

export interface ReminderChoice {
  enabled: boolean;
  morning: string;
  evening: string;
}

export function StepReminders({
  position,
  artSize,
  value,
  onChange,
}: StepBase & { value: ReminderChoice; onChange: (patch: Partial<ReminderChoice>) => void }) {
  const { colors, habit } = useTheme();
  const sun = habit("sun");
  const night = habit("indigo");
  const off = !value.enabled;
  return (
    <StepLayout
      art={<HeroArt slot="reminders" size={Math.round(artSize * 0.48)} page={2} position={position} />}
      overline="Reminders"
      title="When should we nudge you?"
      body="A nudge to plan the morning and a check-in before bed, so no streak slips by."
    >
      <ListGroup>
        <ListRow
          label="Remind me"
          description={value.enabled ? "Two gentle nudges a day" : "No reminders for now"}
          icon={Bell}
          right={<Switch value={value.enabled} onValueChange={(enabled) => onChange({ enabled })} label="Remind me" />}
        />
        <TimeRow
          label="Morning nudge"
          description="Plan the day"
          value={value.morning}
          onChange={(morning) => onChange({ morning })}
          icon={Sun}
          iconBg={sun.soft}
          iconColor={sun.ink}
          disabled={off}
          sheetDescription="A short look at what's on today."
          presets={["06:30", "07:00", "07:30", "08:00", "09:00"]}
        />
        <TimeRow
          label="Evening check-in"
          description="Anything still open"
          value={value.evening}
          onChange={(evening) => onChange({ evening })}
          icon={MoonStar}
          iconBg={night.soft}
          iconColor={night.ink}
          disabled={off}
          sheetDescription="A last call for anything still open today."
          presets={["19:00", "20:00", "21:00", "21:30", "22:00"]}
        />
      </ListGroup>
      <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
        {remindersSupported ? <Info size={16} color={colors.inkMuted} strokeWidth={2.4} /> : <Smartphone size={16} color={colors.inkMuted} strokeWidth={2.4} />}
        <Text variant="caption" tone="muted" style={styles.flex}>
          {remindersSupported
            ? value.enabled
              ? "Next, your phone asks to allow notifications. You can change this anytime in Profile."
              : "You can turn reminders on later in Profile."
            : "Reminders ring on your phone. This web demo saves your times."}
        </Text>
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: space[2] + 2, rowGap: space[3], paddingTop: space[1] },
  plan: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[3], paddingVertical: space[2] + 2, borderRadius: radius.md },
  planIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  note: { flexDirection: "row", alignItems: "flex-start", gap: space[2], padding: space[3], borderRadius: radius.md },
  flex: { flex: 1 },
});
