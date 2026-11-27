import { Platform, type ViewStyle } from "react-native";

import type { ThemeColors } from "./colors";

export type Elevation = "none" | "card" | "raised" | "floating";

/**
 * Near-flat in light mode: a hairline of shadow under cards, real depth only
 * for floating layers. Dark mode drops shadows and relies on surface steps and
 * hairline borders instead (see Card).
 */
export function elevation(level: Elevation, colors: ThemeColors, isDark: boolean): ViewStyle {
  if (level === "none") return {};
  if (isDark) {
    if (level === "floating") {
      return Platform.select<ViewStyle>({
        web: { boxShadow: "0 18px 40px rgba(0,0,0,0.55)" } as ViewStyle,
        default: { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
      })!;
    }
    return {};
  }
  // Flat by design: cards sit on the canvas without a glow; only things that float over content cast a shadow.
  const spec = {
    card: { y: 1, blur: 2, opacity: 0.04, web: "0 1px 2px rgba(0,0,0,0.04)", elevation: 1 },
    raised: { y: 2, blur: 8, opacity: 0.06, web: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)", elevation: 3 },
    floating: { y: 10, blur: 28, opacity: 0.12, web: "0 1px 3px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.12)", elevation: 10 },
  }[level];
  return Platform.select<ViewStyle>({
    web: { boxShadow: spec.web } as ViewStyle,
    default: {
      shadowColor: colors.shadow,
      shadowOpacity: spec.opacity,
      shadowRadius: spec.blur,
      shadowOffset: { width: 0, height: spec.y },
      elevation: spec.elevation,
    },
  })!;
}
