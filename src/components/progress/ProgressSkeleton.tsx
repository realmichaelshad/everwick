import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FRAME_BREAKPOINT } from "@/components/system/WebFrame";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { layout, radius, rgba, space, useTheme } from "@/theme";

/**
 * Loading layout for Progress in the real geometry: header, toggle, summary card,
 * chart and the heatmap peeking in below. It is clipped to one screen on
 * purpose: a skeleton that scrolls would be a scroll region with nothing to
 * focus.
 */
export function ProgressSkeleton() {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Exactly one screen of the app (the web phone column is shorter than the window), minus Screen's paddings.
  const appHeight = Platform.OS === "web" && width >= FRAME_BREAKPOINT ? Math.min(height - 48, 932) : height;
  const maxHeight = Math.max(320, appHeight - insets.top - 8 - insets.bottom - layout.tabBarClearance - 4);
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }];
  return (
    <SkeletonGroup label="Loading your progress" style={[styles.wrap, { maxHeight }]}>
      <View style={styles.header}>
        <Skeleton width={110} height={12} />
        <Skeleton width={150} height={30} radius={radius.sm} />
      </View>
      <Skeleton height={44} radius={radius.pill} />
      <View style={[card, styles.summary]}>
        <View style={styles.summaryHead}>
          <View style={styles.summaryTexts}>
            <Skeleton width="52%" height={10} />
            <Skeleton width={120} height={44} radius={radius.sm} />
            <Skeleton width="60%" height={14} />
          </View>
          <Skeleton width={76} height={76} radius={38} />
        </View>
        <View style={[styles.row, styles.stats, { borderTopColor: colors.line }]}>
          {[0, 1, 2].map((col) => (
            <View key={col} style={styles.stat}>
              <Skeleton width="52%" height={24} radius={radius.xs} />
              <Skeleton width="76%" height={10} />
            </View>
          ))}
        </View>
      </View>
      <View style={[card, styles.chart]}>
        <Skeleton width="46%" height={14} />
        <View style={styles.bars}>
          {[0.62, 0.8, 0.55, 0.92, 0.7, 0.3, 0.3].map((h, i) => (
            <Skeleton key={i} width={26} height={Math.round(140 * h)} radius={radius.xs} />
          ))}
        </View>
      </View>
      <View style={[card, styles.heat]}>
        <Skeleton width="38%" height={14} />
        <View style={styles.grid}>
          {Array.from({ length: 7 }, (_, r) => (
            <View key={r} style={styles.gridRow}>
              {Array.from({ length: 13 }, (_, c) => (
                <Skeleton key={c} width={18} height={18} radius={5} />
              ))}
            </View>
          ))}
        </View>
      </View>
      {/* Fade the clipped edge into the canvas. */}
      <LinearGradient pointerEvents="none" colors={[rgba(colors.canvas, 0), colors.canvas]} style={styles.fade} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4], overflow: "hidden" },
  header: { gap: space[2], marginTop: space[2] },
  row: { flexDirection: "row", gap: space[3] },
  card: { borderRadius: radius.card, padding: space[4] },
  summary: { gap: space[4], borderRadius: radius.xl, padding: space[4] + 2 },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: space[3] },
  summaryTexts: { flex: 1, gap: space[2] },
  stats: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space[4] },
  stat: { flex: 1, gap: space[2] },
  chart: { gap: space[4], borderRadius: radius.xl },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 148 },
  heat: { gap: space[3], borderRadius: radius.xl },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 72 },
  grid: { gap: 4 },
  gridRow: { flexDirection: "row", justifyContent: "space-between" },
});
