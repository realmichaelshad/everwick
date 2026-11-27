import Snowflake from "lucide-react-native/icons/snowflake";
import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Flame } from "@/components/ui/Flame";
import { Text } from "@/components/ui/Text";
import { radius, space, useTheme } from "@/theme";

/**
 * Shown instead of the stat tiles while a habit has no check-ins yet: what
 * the first check-in starts, rather than four zeros.
 */
export function FirstDayCard({ name, scheduledToday }: { name: string; scheduledToday: boolean }) {
  const { colors } = useTheme();
  return (
    <Card padding={space[4] + 2} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.flame, { backgroundColor: colors.surfaceMuted }]} aria-hidden>
          <Flame size={30} lit={false} />
        </View>
        <View style={styles.texts}>
          <Text variant="title">Your first check-in lights the flame</Text>
          <Text variant="callout" tone="muted">
            {scheduledToday ? `Check in ${name} above and this page starts filling up: streaks, your best run and your rhythm.` : `Your first due day starts the streak. Streaks, your best run and your rhythm show up here.`}
          </Text>
        </View>
      </View>
      <View style={[styles.tip, { backgroundColor: colors.freezeSoft }]}>
        <Snowflake size={16} color={colors.freezeText} strokeWidth={2.4} />
        <Text variant="caption" color={colors.freezeText} style={styles.flex}>
          Seven check-ins in a row earn a streak freeze, so one busy day never costs you the streak.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[4], borderRadius: radius.xl },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space[4] },
  flame: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: space[1] },
  tip: { flexDirection: "row", alignItems: "center", gap: space[2], padding: space[3], borderRadius: radius.md },
  flex: { flex: 1 },
});
