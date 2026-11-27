import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius, space, useTheme } from "@/theme";

import { Text } from "./Text";

export interface BadgeProps {
  label: string;
  tone?: "neutral" | "accent" | "success" | "danger" | "custom";
  /** For tone="custom": background and text colors (e.g. a habit's soft + ink). */
  bg?: string;
  fg?: string;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

/** Small rounded label: "Rest day", "Pro", "Best", "+12%". */
export function Badge({ label, tone = "neutral", bg, fg, icon: Icon, style }: BadgeProps) {
  const { colors } = useTheme();
  const palette = {
    neutral: { bg: colors.surfaceMuted, fg: colors.inkMuted },
    accent: { bg: colors.accentSoft, fg: colors.accentText },
    success: { bg: colors.successSoft, fg: colors.successText },
    danger: { bg: colors.dangerSoft, fg: colors.dangerText },
    custom: { bg: bg ?? colors.surfaceMuted, fg: fg ?? colors.ink },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      {Icon ? <Icon size={12} color={palette.fg} strokeWidth={2.6} /> : null}
      <Text variant="caption" color={palette.fg} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    alignSelf: "flex-start",
    paddingHorizontal: space[2] + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: { fontSize: 12, lineHeight: 16 },
});
