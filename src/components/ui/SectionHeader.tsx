import { StyleSheet, View } from "react-native";

import { space } from "@/theme";

import { PressableScale } from "./Pressable";
import { Text } from "./Text";

export interface SectionHeaderProps {
  title: string;
  /** Small muted text after the title ("4 left"). */
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Section title row with an optional text action on the right. */
export function SectionHeader({ title, meta, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <Text variant="title" heading>
          {title}
        </Text>
        {meta ? (
          <Text variant="caption" tone="subtle">
            {meta}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <PressableScale accessibilityRole="button" onPress={onAction} hitSlop={10} style={styles.action}>
          <Text variant="caption" tone="accent">
            {actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space[3] },
  titles: { flexDirection: "row", alignItems: "baseline", gap: space[2], flexShrink: 1 },
  action: { paddingVertical: space[1] },
});
