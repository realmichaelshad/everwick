import type { ReactNode } from "react";
import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

import { elevation, layout, radius, useTheme, type Elevation } from "@/theme";

import { PressableScale } from "./Pressable";

export interface CardProps extends ViewProps {
  children?: ReactNode;
  /** "surface" (default), "muted" for secondary tiles, "tinted" uses `tint` as background. */
  variant?: "surface" | "muted" | "tinted";
  tint?: string;
  padding?: number;
  elevated?: Elevation;
  style?: StyleProp<ViewStyle>;
  /** Makes the whole card a button. Provide accessibilityLabel too. */
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * Rounded 22pt card. Light theme: white on warm paper with a soft shadow.
 * Dark theme: one surface step up with a hairline border instead of shadow.
 */
export function Card({ children, variant = "surface", tint, padding = layout.cardPadding, elevated = "card", style, onPress, onLongPress, ...rest }: CardProps) {
  const { colors, isDark } = useTheme();
  const bg = variant === "muted" ? colors.surfaceMuted : variant === "tinted" ? (tint ?? colors.accentSoft) : colors.surface;
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: bg,
      borderRadius: radius.card,
      padding,
      borderWidth: isDark && variant === "surface" ? 1 : 0,
      borderColor: colors.line,
    },
    variant === "surface" ? elevation(elevated, colors, isDark) : null,
    style,
  ];
  if (onPress || onLongPress) {
    return (
      <PressableScale accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} pressScale={0.985} style={base} {...rest}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={base} {...rest}>
      {children}
    </View>
  );
}
