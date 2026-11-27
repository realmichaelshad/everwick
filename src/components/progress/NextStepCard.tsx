import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Text } from "@/components/ui/Text";
import type { DaySummary } from "@/data/stats";
import { radius, space, useTheme } from "@/theme";

/**
 * The screen's one primary action, at the bottom where the thumb is: what is
 * still open today and a button back to Today. Becomes a quiet "all done"
 * note once everything due is checked in.
 */
export function NextStepCard({ today }: { today: DaySummary }) {
  const { colors } = useTheme();
  const left = today.scheduled - today.done;
  if (today.scheduled === 0) return null;
  const done = left === 0;
  return (
    <Card variant="tinted" tint={done ? colors.successSoft : colors.accentSoft} padding={space[4]} style={styles.card}>
      <View style={styles.row}>
        <ProgressRing
          progress={today.fraction}
          size={52}
          strokeWidth={7}
          colors={done ? [colors.success, colors.success] : undefined}
          trackColor={colors.surface}
          accessibilityLabel={`Today ${Math.round(today.fraction * 100)} percent done`}
        >
          <Text variant="caption" tabular>
            {today.done}/{today.scheduled}
          </Text>
        </ProgressRing>
        <View style={styles.texts}>
          <Text variant="headline">{done ? "All done for today" : `${left} ${left === 1 ? "habit" : "habits"} still open today`}</Text>
          <Text variant="callout" tone="muted">
            {done ? "Every check-in today is in. See you tomorrow." : "Each check-in today lifts this week's numbers."}
          </Text>
        </View>
      </View>
      {!done ? <Button label="Check in on Today" onPress={() => router.navigate("/")} fullWidth /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[4], borderRadius: radius.xl },
  row: { flexDirection: "row", alignItems: "center", gap: space[4] },
  texts: { flex: 1, gap: 2 },
});
