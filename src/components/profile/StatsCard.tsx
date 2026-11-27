import CheckCheck from "lucide-react-native/icons/check-check";
import Sparkles from "lucide-react-native/icons/sparkles";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Flame } from "@/components/ui/Flame";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Text } from "@/components/ui/Text";
import { inARow, streakUnit } from "@/data/streakCopy";
import { radius, space, useTheme } from "@/theme";

import { percent, sinceLine, type ProfileStats } from "./profileModel";

export interface StatsCardProps {
  stats: ProfileStats;
}

/**
 * Lifetime summary in one card, split into four cells by hairlines:
 * longest live streak, check-ins, perfect days and the 30-day completion.
 */
export function StatsCard({ stats }: StatsCardProps) {
  const { colors, habit } = useTheme();
  const sun = habit("sun");
  const streak = stats.topStreak;
  return (
    <Card padding={0} style={styles.card}>
      <View style={styles.row}>
        <Cell
          label="Top streak"
          spoken={streak ? `Longest live streak: ${streak.name}, ${inARow(streak, streak.current)}${streak.freezes ? `, ${streak.freezes} streak freezes held` : ""}` : "No live streak yet"}
          icon={<Flame size={18} lit={!!streak} animated={false} />}
          iconBg={streak ? colors.accentSoft : colors.surfaceMuted}
        >
          <View style={styles.streakRow}>
            <Text variant="numeral" tabular color={streak ? colors.accentText : colors.ink}>
              {streak?.current ?? 0}
            </Text>
          </View>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {streak ? `${streakUnit(streak, streak.current)} on ${streak.name}` : "Check in to start one"}
          </Text>
        </Cell>
        <View style={[styles.vline, { backgroundColor: colors.line }]} />
        <Cell
          label="Check-ins"
          spoken={`${stats.checkins} check-ins ${sinceLine(stats.since)}`}
          icon={<CheckCheck size={16} color={colors.successText} strokeWidth={2.5} />}
          iconBg={colors.successSoft}
        >
          <Text variant="numeral" tabular>
            {stats.checkins}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {sinceLine(stats.since)}
          </Text>
        </Cell>
      </View>
      <View style={[styles.hline, { backgroundColor: colors.line }]} />
      <View style={styles.row}>
        <Cell
          label="Perfect days"
          spoken={`${stats.perfectDays} perfect days in the last 60, every habit done`}
          icon={<Sparkles size={16} color={sun.ink} strokeWidth={2.4} />}
          iconBg={sun.soft}
        >
          <Text variant="numeral" tabular>
            {stats.perfectDays}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            in the last 60 days
          </Text>
        </Cell>
        <View style={[styles.vline, { backgroundColor: colors.line }]} />
        <Cell
          label="Completion"
          spoken={stats.hasRate ? `Completion over the last 30 days: ${percent(stats.rate30)}` : "No completion rate yet"}
          icon={<ProgressRing progress={stats.rate30} size={22} strokeWidth={4} />}
          iconBg="transparent"
        >
          <Text variant="numeral" tabular>
            {stats.hasRate ? percent(stats.rate30) : "–"}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            last 30 days
          </Text>
        </Cell>
      </View>
    </Card>
  );
}

function Cell({ label, spoken, icon, iconBg, children }: { label: string; spoken: string; icon: ReactNode; iconBg: string; children: ReactNode }) {
  // Native screen readers read each cell as one sentence; on web the visible text reads naturally.
  const a11y = Platform.OS === "web" ? {} : { accessible: true, accessibilityLabel: spoken };
  return (
    <View style={styles.cell} {...a11y}>
      <View style={styles.cellTop}>
        <View aria-hidden style={[styles.icon, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        <Text variant="overline" tone="subtle" numberOfLines={2} style={styles.flex}>
          {label}
        </Text>
      </View>
      <View style={styles.cellBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  row: { flexDirection: "row" },
  cell: { flex: 1, padding: space[4], gap: space[2] },
  cellTop: { flexDirection: "row", alignItems: "center", gap: space[2] },
  cellBody: { gap: 2 },
  icon: { width: 28, height: 28, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  vline: { width: StyleSheet.hairlineWidth },
  hline: { height: StyleSheet.hairlineWidth, marginHorizontal: space[4] },
  streakRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flex: 1 },
});
