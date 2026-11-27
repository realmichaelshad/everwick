import { StyleSheet, View } from "react-native";

import { Skeleton, SkeletonGroup, SkeletonRow } from "@/components/ui/Skeleton";
import { radius, space, useTheme } from "@/theme";

/** Loading layout for Today: same geometry as the real screen, so nothing jumps. */
export function TodaySkeleton() {
  const { colors, isDark } = useTheme();
  return (
    <SkeletonGroup label="Loading today's habits" style={styles.wrap}>
      <View style={styles.header}>
        <Skeleton width={140} height={12} />
        <Skeleton width="72%" height={30} radius={radius.sm} />
      </View>
      <View style={styles.week}>
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} width={38} height={62} radius={radius.lg} />
        ))}
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }]}>
        <Skeleton width={108} height={108} radius={54} />
        <View style={styles.lines}>
          <Skeleton width="40%" height={11} />
          <Skeleton width="80%" height={20} />
          <Skeleton width="90%" height={12} />
        </View>
      </View>
      <View style={styles.rows}>
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[5] },
  header: { gap: space[2], marginTop: space[2] },
  week: { flexDirection: "row", justifyContent: "space-between" },
  card: { flexDirection: "row", alignItems: "center", gap: space[4], padding: space[4] + 2, borderRadius: radius.xl },
  lines: { flex: 1, gap: space[2] },
  rows: { gap: 12 },
});
