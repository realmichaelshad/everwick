import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { haptics } from "@/lib/haptics";
import { radius, space, useTheme } from "@/theme";

import { PressableScale } from "./Pressable";
import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "tertiary" | "danger" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Screen-reader label when it should differ from the visible label. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Small buttons draw at 40 and reach a 48pt touch target through hitSlop (iOS and Android). */
const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56 };
const PAD: Record<ButtonSize, number> = { sm: space[3] + 2, md: space[5], lg: space[6] };

/**
 * Pill buttons. Primary is the ember accent with ink label (AA in both
 * themes). One primary per screen region; secondary is a muted pill, ghost
 * an accent text button and tertiary a quiet muted text button.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  loading,
  disabled,
  fullWidth,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: "transparent" },
    secondary: { bg: colors.surfaceMuted, fg: colors.ink, border: "transparent" },
    ghost: { bg: "transparent", fg: colors.accentText, border: "transparent" },
    /** Quietest: muted ink, no fill. For the secondary choice next to a big primary control. */
    tertiary: { bg: "transparent", fg: colors.inkMuted, border: "transparent" },
    danger: { bg: colors.dangerSoft, fg: colors.dangerText, border: "transparent" },
    inverse: { bg: colors.ink, fg: colors.inkInverse, border: "transparent" },
  }[variant];
  const inactive = disabled || loading;
  const iconSize = size === "sm" ? 16 : 18;

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      hitSlop={size === "sm" ? 4 : undefined}
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      style={[
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: PAD[size],
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={iconSize} color={palette.fg} strokeWidth={2.4} /> : null}
          <Text variant={size === "sm" ? "caption" : "button"} color={palette.fg} numberOfLines={1}>
            {label}
          </Text>
          {IconRight ? <IconRight size={iconSize} color={palette.fg} strokeWidth={2.4} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
});
