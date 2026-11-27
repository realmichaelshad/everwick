import { StyleSheet, View } from "react-native";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { radius, space, useTheme } from "@/theme";

/** Loading layout in the shape of the real Profile: portrait, stats, medals, settings. */
export function ProfileSkeleton() {
  const { colors, isDark } = useTheme();
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }];
  return (
    <SkeletonGroup label="Loading your profile" style={styles.stack}>
      <View style={styles.header}>
        <Skeleton width={112} height={112} radius={56} />
        <Skeleton width={150} height={28} radius={radius.sm} style={styles.mt} />
        <Skeleton width={170} height={14} />
      </View>
      <View style={[card, styles.medals]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.medal}>
            <Skeleton width={52} height={52} radius={26} />
            <Skeleton width={30} height={16} radius={8} />
          </View>
        ))}
      </View>
      <View style={card}>
        <View style={styles.row}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.cell}>
              <Skeleton width={90} height={12} />
              <Skeleton width={64} height={36} radius={radius.sm} />
              <Skeleton width={80} height={11} />
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.cell}>
              <Skeleton width={90} height={12} />
              <Skeleton width={64} height={36} radius={radius.sm} />
              <Skeleton width={80} height={11} />
            </View>
          ))}
        </View>
      </View>
      <View style={card}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.listRow}>
            <Skeleton width={36} height={36} radius={radius.sm} />
            <View style={styles.lines}>
              <Skeleton width="55%" height={13} />
              <Skeleton width="80%" height={10} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[6] },
  header: { alignItems: "center", gap: space[2], paddingTop: space[4] },
  mt: { marginTop: space[3] },
  card: { borderRadius: radius.card, padding: space[4], gap: space[4] },
  row: { flexDirection: "row", gap: space[4] },
  cell: { flex: 1, gap: space[2] },
  medals: { flexDirection: "row", justifyContent: "space-between" },
  medal: { alignItems: "center", gap: space[2] },
  listRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  lines: { flex: 1, gap: space[2] },
});
