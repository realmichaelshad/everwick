import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { haptics } from "@/lib/haptics";
import { elevation, layout, radius, useTheme } from "@/theme";

import { PressableScale } from "./Pressable";

export interface IconButtonProps {
  icon: LucideIcon;
  /** Required: icon-only buttons need a spoken label. */
  label: string;
  onPress?: () => void;
  variant?: "surface" | "muted" | "ghost" | "accent" | "glass";
  size?: number;
  iconSize?: number;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Round icon button with a 44pt minimum hit area. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  variant = "surface",
  size = layout.hitTarget,
  iconSize = 20,
  color,
  disabled,
  style,
  testID,
}: IconButtonProps) {
  const { colors, isDark } = useTheme();
  const bg = {
    surface: colors.surface,
    muted: colors.surfaceMuted,
    ghost: "transparent",
    accent: colors.accent,
    glass: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)",
  }[variant];
  const fg = color ?? (variant === "accent" ? colors.onAccent : colors.ink);
  const hitSlop = Math.max(0, (layout.hitTarget - size) / 2);

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={hitSlop}
      pressScale={0.92}
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      style={[
        styles.base,
        { width: size, height: size, backgroundColor: bg, opacity: disabled ? 0.4 : 1 },
        variant === "surface" ? elevation("card", colors, isDark) : null,
        variant === "surface" && isDark ? { borderWidth: 1, borderColor: colors.line } : null,
        style,
      ]}
    >
      <Icon size={iconSize} color={fg} strokeWidth={2.2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
