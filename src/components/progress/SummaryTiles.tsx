import TrendingDown from "lucide-react-native/icons/trending-down";
import TrendingUp from "lucide-react-native/icons/trending-up";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import type { ProgressRange, ProgressSummary } from "@/data/progressSeries";
import type { Bar } from "@/data/stats";
import { inARow, isDaily } from "@/data/streakCopy";
import { radius, space, useTheme } from "@/theme";

import { useCountUp } from "./useCountUp";

export interface SummaryTilesProps {
  summary: ProgressSummary;
  /** The bars of the selected range (for the perfect-day dots). */
  bars: Bar[];
  range: ProgressRange;
}

/**
 * "Am I improving?" in one compact card, so the scrub-able chart sits on the
 * first screen with it: the range's completion as the headline with the
 * change against the previous range in words, then three supporting numbers
 * with plain labels: check-ins, perfect days and the longest live streak.
 * Numbers roll to their new values when the range changes.
 */
export function SummaryTiles({ summary, range }: SummaryTilesProps) {
  const { colors } = useTheme();
  const { current, points, window, topStreak } = summary;
  const rate = Math.round(current.rate * 100);
  const shownRate = useCountUp(rate);
  const shownDone = useCountUp(current.done);
  const shownPerfect = useCountUp(current.perfectDays);
  const up = points != null && points > 0;
  const down = points != null && points < 0;
  const spokenDelta =
    points == null ? "" : points === 0 ? `, same as ${window.previousLabel}` : `, ${Math.abs(points)} points ${up ? "up" : "down"} on ${window.previousLabel}`;
  // Native screen readers read each part as one sentence; on web the visible text reads naturally.
  const a11y = (label: string) => (Platform.OS === "web" ? {} : { accessible: true, accessibilityLabel: label });

  // The change against the previous range, in words: "2 points higher than last week".
  const deltaText =
    points == null
      ? `First ${range === "week" ? "week" : "month"} tracked`
      : points === 0
        ? `Same as ${window.previousLabel}`
        : `${Math.abs(points)} ${Math.abs(points) === 1 ? "point" : "points"} ${up ? "higher" : "lower"} than ${window.previousLabel}`;
  const streakDays = topStreak?.current ?? 0;

  return (
    <Card padding={space[5]} style={styles.card}>
      <View {...a11y(`Completion ${window.spoken}: ${rate} percent${spokenDelta}`)}>
        <Text variant="overline" tone="subtle">
          {range === "week" ? "This week" : "Last 30 days"}
        </Text>
        <View style={styles.rateRow}>
          <Text variant="numeral" tabular style={styles.rate}>
            {shownRate}%
          </Text>
          <Text variant="body" tone="muted" style={styles.rateLabel}>
            of check-ins done
          </Text>
        </View>
        <View style={styles.delta}>
          {up || down ? <DeltaIcon up={up} color={up ? colors.successText : colors.dangerText} /> : null}
          <Text variant="caption" color={up ? colors.successText : down ? colors.dangerText : colors.inkSubtle}>
            {deltaText}
          </Text>
        </View>
      </View>

      <View style={[styles.row, { borderTopColor: colors.line }]}>
        <Stat label="check-ins" spoken={`${current.done} check-ins ${window.spoken}, out of ${current.scheduled} due`} a11y={a11y}>
          <Text variant="numeralSm" tabular>
            {shownDone}
            <Text variant="headline" tone="subtle" tabular>
              {` of ${current.scheduled}`}
            </Text>
          </Text>
        </Stat>
        <Stat
          label={current.perfectDays === 1 ? "perfect day" : "perfect days"}
          spoken={`${current.perfectDays} perfect ${current.perfectDays === 1 ? "day" : "days"} ${window.spoken}, every habit done`}
          a11y={a11y}
        >
          <Text variant="numeralSm" tabular>
            {shownPerfect}
          </Text>
        </Stat>
        <Stat
          label={topStreak ? `${topStreak.name} streak` : "longest streak"}
          spoken={topStreak ? `Longest live streak: ${topStreak.name}, ${inARow(topStreak, topStreak.current)}` : "No live streak yet"}
          a11y={a11y}
        >
          <Text variant="numeralSm" tabular>
            {streakDays}
            <Text variant="headline" tone="subtle">
              {topStreak && !isDaily(topStreak) ? " in a row" : streakDays === 1 ? " day" : " days"}
            </Text>
          </Text>
        </Stat>
      </View>
    </Card>
  );
}

function DeltaIcon({ up, color }: { up: boolean; color: string }) {
  const Icon = up ? TrendingUp : TrendingDown;
  return <Icon size={14} color={color} strokeWidth={2.6} />;
}

/** One of the three supporting numbers: value on top, a plain label under it. */
function Stat({ label, spoken, a11y, children }: { label: string; spoken: string; a11y: (label: string) => object; children: ReactNode }) {
  return (
    <View style={styles.stat} {...a11y(spoken)}>
      <View style={styles.statValue}>{children}</View>
      <Text variant="caption" tone="muted" numberOfLines={2} style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, gap: space[5] },
  rateRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: space[2], marginTop: space[1] },
  rate: { fontSize: 48, lineHeight: 52, letterSpacing: -1.6 },
  rateLabel: { flexShrink: 1 },
  delta: { flexDirection: "row", alignItems: "center", gap: space[1.5], marginTop: space[1] },
  row: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space[4], gap: space[3] },
  stat: { flex: 1, gap: 2, minWidth: 0 },
  statValue: { minHeight: 28, justifyContent: "center", alignItems: "flex-start" },
  statLabel: { fontSize: 13, lineHeight: 17 },
});
