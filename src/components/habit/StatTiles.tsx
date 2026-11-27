import CircleCheckBig from "lucide-react-native/icons/circle-check-big";
import Clock from "lucide-react-native/icons/clock";
import Trophy from "lucide-react-native/icons/trophy";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { Text } from "@/components/ui/Text";
import { formatMinutes, formatShortDate, partOfDayForMinutes } from "@/data/dates";
import type { StreakInfo } from "@/data/stats";
import { isDaily } from "@/data/streakCopy";
import type { Habit } from "@/data/types";
import { radius, space, useTheme } from "@/theme";

import { streakTileCopy, type RateDetail } from "./detailModel";

export interface StatTilesProps {
  habit: Habit;
  info: StreakInfo;
  rate: RateDetail;
  total: number;
  /** Typical check-in time (minutes after midnight) or null. */
  typical: number | null;
}

/** "How is this one habit going?" in four numbers: streak, best, last 30 days, all check-ins. */
export function StatTiles({ habit, info, rate, total, typical }: StatTilesProps) {
  const theme = useTheme();
  const { colors } = theme;
  const tone = theme.lit(habit.color);
  const pct = Math.round(rate.rate * 100);
  const copy = streakTileCopy(habit, info);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Tile
          label="Current streak"
          spoken={copy.currentSpoken}
          value={
            <View style={styles.valueRow}>
              <StreakBadge streak={info.current} freezes={info.freezes} size="lg" variant="plain" unit={spokenUnit(habit)} unitLabel={copy.currentUnit} />
            </View>
          }
          caption={copy.currentCaption}
        />
        <Tile
          label="Best streak"
          spoken={copy.bestSpoken}
          value={
            <ValueRow icon={<Trophy size={18} color={colors.accentText} strokeWidth={2.4} />} iconBg={colors.accentSoft}>
              <Text variant="numeralSm" tabular>
                {info.best.length}
              </Text>
              <Text variant="caption" tone="muted" style={styles.unit}>
                {copy.bestUnit}
              </Text>
            </ValueRow>
          }
          caption={copy.bestCaption}
        />
      </View>
      <View style={styles.row}>
        <Tile
          label="Last 30 days"
          spoken={`Last 30 days: ${pct} percent, ${rate.done} of ${rate.due} days done`}
          value={
            <ValueRow icon={<ProgressRing progress={rate.rate} size={30} strokeWidth={4.5} colors={[tone.solid, tone.solid]} trackColor={tone.soft} />}>
              <Text variant="numeralSm" tabular>
                {pct}%
              </Text>
            </ValueRow>
          }
          caption={rate.due ? `${rate.done} of ${rate.due} days done` : "Nothing due yet"}
        />
        <Tile
          label="Check-ins"
          spoken={`${total} check-ins since ${formatShortDate(habit.createdAt)}${typical != null ? `. Usually done around ${formatMinutes(typical)}` : ""}`}
          value={
            <ValueRow icon={<CircleCheckBig size={18} color={tone.ink} strokeWidth={2.4} />} iconBg={tone.soft}>
              <Text variant="numeralSm" tabular>
                {total}
              </Text>
            </ValueRow>
          }
          caption={`since ${formatShortDate(habit.createdAt)}`}
        />
      </View>
      {typical != null ? (
        <View style={[styles.typical, { backgroundColor: colors.surfaceMuted }]}>
          <Clock size={15} color={colors.inkMuted} strokeWidth={2.4} />
          <Text variant="caption" tone="muted" style={styles.flex}>
            You usually check in around{" "}
            <Text variant="caption" tone="default">
              {formatMinutes(typical)}
            </Text>
            {`, in the\u00A0${partOfDayForMinutes(typical)}.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** StreakBadge's spoken unit ("48 day streak" / "7 check-in streak"). */
const spokenUnit = (habit: Habit) => (isDaily(habit) ? "day" : "check-in");

function Tile({ label, spoken, value, caption }: { label: string; spoken: string; value: ReactNode; caption: string }) {
  return (
    <Card padding={space[4]} style={styles.tile} accessible accessibilityRole="summary" accessibilityLabel={spoken}>
      <Text variant="overline" tone="subtle" numberOfLines={2} aria-hidden>
        {label}
      </Text>
      <View style={styles.value} aria-hidden>
        {value}
      </View>
      <Text variant="caption" tone="muted" numberOfLines={2} aria-hidden>
        {caption}
      </Text>
    </Card>
  );
}

/** Icon disc + big number, so all four tiles share one rhythm. */
function ValueRow({ icon, iconBg, children }: { icon: ReactNode; iconBg?: string; children: ReactNode }) {
  return (
    <View style={styles.valueRow}>
      <View style={[styles.icon, iconBg ? { backgroundColor: iconBg } : null]}>{icon}</View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  row: { flexDirection: "row", gap: space[3] },
  tile: { flex: 1, gap: space[2], minHeight: 120 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  value: { minHeight: 34, justifyContent: "center", alignItems: "flex-start" },
  valueRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  unit: { marginTop: 7 },
  typical: { flexDirection: "row", alignItems: "center", gap: space[2], paddingHorizontal: space[3] + 2, paddingVertical: space[2] + 2, borderRadius: radius.md },
  flex: { flex: 1 },
});
