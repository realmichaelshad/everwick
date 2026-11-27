import { rgba, type ThemeColors } from "@/theme";

/**
 * Translucent "glass" fill for chips and slots that sit on tinted
 * backgrounds: a whisper of paper white by day, a whisper of light by night.
 */
export function glass(colors: ThemeColors, isDark: boolean, lightAlpha = 0.72, darkAlpha = 0.06): string {
  return isDark ? rgba(colors.ink, darkAlpha) : rgba(colors.surface, lightAlpha);
}
