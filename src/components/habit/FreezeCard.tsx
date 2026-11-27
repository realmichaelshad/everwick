import ShieldCheck from "lucide-react-native/icons/shield-check";
import Snowflake from "lucide-react-native/icons/snowflake";
import { StyleSheet, View } from "react-native";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { Text } from "@/components/ui/Text";
import { FREEZE_EVERY, MAX_FREEZES, type StreakInfo } from "@/data/stats";
import type { Habit } from "@/data/types";
import { radius, rgba, space, useTheme } from "@/theme";

import { freezeCopy } from "./detailModel";

/**
 * Streak freezes for this habit, in ice: how many are banked (two slots),
 * how they're earned, progress to the next one, and the days they saved.
 */
export function FreezeCard({ info, habit }: { info: StreakInfo; habit: Pick<Habit, "schedule"> }) {
  const { colors, isDark } = useTheme();
  const copy = freezeCopy(info, habit, FREEZE_EVERY, MAX_FREEZES);
  return (
    <View style={[styles.card, { backgroundColor: colors.freezeSoft, borderColor: isDark ? colors.line : "transparent" }]}>
      {/* Frost in the corner: decorative. */}
      <View pointerEvents="none" aria-hidden style={styles.frost}>
        <Snowflake size={132} color={colors.freeze} strokeWidth={1.4} style={{ opacity: isDark ? 0.12 : 0.14 }} />
      </View>

      <View style={styles.head}>
        <View style={styles.texts}>
          <Text variant="overline" color={colors.freezeText}>
            Streak freezes
          </Text>
          <Text variant="title" heading level={3}>
            {copy.title}
          </Text>
        </View>
        <View style={styles.slots} accessible accessibilityRole="image" accessibilityLabel={`${info.freezes} of ${MAX_FREEZES} freezes banked`}>
          {Array.from({ length: MAX_FREEZES }, (_, i) => {
            const full = i < info.freezes;
            return (
              <View
                key={i}
                style={[
                  styles.slot,
                  full
                    ? { backgroundColor: colors.freeze, borderColor: colors.freeze }
                    : { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)", borderColor: colors.freeze, borderStyle: "dashed" },
                ]}
              >
                <Snowflake size={18} color={full ? colors.surface : colors.freezeText} strokeWidth={2.4} style={{ opacity: full ? 1 : 0.55 }} />
              </View>
            );
          })}
        </View>
      </View>

      <Text variant="callout" tone="muted">
        {copy.explainer}
      </Text>

      <View style={styles.progress}>
        {copy.progress != null ? (
          <ProgressBar
            progress={copy.progress}
            segments={FREEZE_EVERY}
            height={8}
            color={colors.freeze}
            trackColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.75)"}
            accessibilityLabel={copy.progressLabel}
          />
        ) : null}
        <Text variant="caption" color={colors.freezeText}>
          {copy.progressLabel}
        </Text>
      </View>

      {copy.saves.length ? (
        <View style={[styles.saves, { borderTopColor: isDark ? colors.line : rgba(colors.freezeText, 0.16) }]}>
          {copy.saves.map((line) => (
            <View key={line} style={styles.save}>
              <ShieldCheck size={16} color={colors.freezeText} strokeWidth={2.4} />
              <Text variant="caption" tone="default" style={styles.flex}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: space[4] + 2, gap: space[3], overflow: "hidden", borderWidth: 1 },
  frost: { position: "absolute", right: -28, top: -30, transform: [{ rotate: "18deg" }] },
  head: { flexDirection: "row", alignItems: "center", gap: space[3] },
  texts: { flex: 1, gap: 2 },
  slots: { flexDirection: "row", gap: space[2] },
  slot: { width: 40, height: 40, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  progress: { gap: space[2] },
  saves: { gap: space[2], borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space[3] },
  save: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flex: 1 },
});
