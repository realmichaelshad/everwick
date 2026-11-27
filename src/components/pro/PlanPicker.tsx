import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, useReducedMotion, withSpring } from "react-native-reanimated";

import { Badge } from "@/components/ui/Badge";
import { PressableScale } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { haptics } from "@/lib/haptics";
import { elevation, motion, radius, space, useTheme } from "@/theme";

export type PlanKey = "monthly" | "yearly";

interface Plan {
  key: PlanKey;
  name: string;
  price: string;
  per: string;
  note: string;
  badge?: string;
  spoken: string;
}

/** Example prices for the demo. Nothing can be bought: there is no payment flow anywhere in the app. */
export const PLANS: Plan[] = [
  { key: "monthly", name: "Monthly", price: "$3.99", per: "per month", note: "Cancel any time", spoken: "Monthly, $3.99 a month" },
  {
    key: "yearly",
    name: "Yearly",
    price: "$28.99",
    per: "per year",
    note: "$2.42 a month",
    badge: "Save 40%",
    spoken: "Yearly, $28.99 a year, works out to $2.42 a month, save 40%",
  },
];

export interface PlanPickerProps {
  value: PlanKey;
  onChange: (plan: PlanKey) => void;
}

/** Two plan cards with radio semantics. The prices are examples for the concept; nothing is ever charged. */
export function PlanPicker({ value, onChange }: PlanPickerProps) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="Plan (example prices)">
      {PLANS.map((plan) => (
        <PlanCard key={plan.key} plan={plan} selected={plan.key === value} onPress={() => onChange(plan.key)} />
      ))}
    </View>
  );
}

function PlanCard({ plan, selected, onPress }: { plan: Plan; selected: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const on = useDerivedValue(() => (reduced ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, motion.spring.bouncy)), [selected, reduced]);
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: on.value }] }));
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accent : isDark ? colors.line : colors.surface,
        },
        selected ? null : elevation("card", colors, isDark),
      ]}
    >
      {/* Visuals; the radio overlay below carries the spoken label. */}
      <View style={styles.visual} aria-hidden pointerEvents="none">
        <View style={styles.top}>
          <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.lineStrong }]}>
            <Animated.View style={[styles.radioDot, { backgroundColor: colors.accent }, dot]} />
          </View>
          {plan.badge ? <Badge label={plan.badge} tone="success" /> : null}
        </View>
        <Text variant="bodyStrong">{plan.name}</Text>
        <View style={styles.priceRow}>
          <Text variant="numeralSm" tabular>
            {plan.price}
          </Text>
        </View>
        <Text variant="caption" tone="muted">
          {plan.per}
        </Text>
        <Text variant="caption" tone={selected ? "accent" : "subtle"}>
          {plan.note}
        </Text>
      </View>
      <PressableScale
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        accessibilityLabel={plan.spoken}
        pressScale={0.97}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        style={styles.overlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", gap: space[3] },
  card: { flex: 1, borderRadius: radius.lg, borderWidth: 2, minHeight: 136 },
  visual: { padding: space[3] + 2, gap: 2 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space[2], minHeight: 22 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: space[1] },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg },
});
