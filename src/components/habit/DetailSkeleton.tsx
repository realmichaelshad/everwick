import { StyleSheet, View } from "react-native";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { radius, space, useTheme } from "@/theme";

import { HERO_ART } from "./HabitHero";

/** Loading layout for habit detail: the same geometry as the real screen, so nothing jumps. */
export function DetailSkeleton() {
  const { colors, isDark } = useTheme();
  const card = { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 };
  return (
    <SkeletonGroup label="Loading habit" style={styles.wrap}>
      <View style={styles.hero}>
        <Skeleton width={HERO_ART - 24} height={HERO_ART - 24} radius={(HERO_ART - 24) / 2} style={styles.art} />
        <Skeleton width="58%" height={28} radius={radius.sm} />
        <Skeleton width="44%" height={14} />
        <View style={styles.days}>
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} width={32} height={32} radius={16} />
          ))}
        </View>
        <View style={styles.days}>
          <Skeleton width={96} height={30} radius={radius.pill} />
          <Skeleton width={88} height={30} radius={radius.pill} />
          <Skeleton width={120} height={30} radius={radius.pill} />
        </View>
      </View>
      <View style={[styles.card, card]}>
        <View style={styles.lines}>
          <Skeleton width="40%" height={11} />
          <Skeleton width="70%" height={20} />
          <Skeleton width="86%" height={12} />
        </View>
        <Skeleton width={64} height={64} radius={32} />
      </View>
      <View style={styles.tiles}>
        {Array.from({ length: 2 }, (_, i) => (
          <View key={i} style={[styles.tile, card]}>
            <Skeleton width="60%" height={11} />
            <Skeleton width="45%" height={26} radius={radius.xs} />
            <Skeleton width="70%" height={11} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[5] },
  hero: { alignItems: "center", gap: space[3], paddingTop: space[2] },
  art: { marginVertical: 12 },
  days: { flexDirection: "row", gap: space[1.5] },
  card: { flexDirection: "row", alignItems: "center", gap: space[4], padding: space[4] + 2, borderRadius: radius.xl },
  lines: { flex: 1, gap: space[2] },
  tiles: { flexDirection: "row", gap: space[3] },
  tile: { flex: 1, gap: space[2], padding: space[4], borderRadius: radius.card, minHeight: 124 },
});
