import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";

import { habitPalettes, themes, type HabitColorKey, type HabitTone, type Scheme, type ThemeColors } from "./colors";

export type ThemePreference = "system" | "light" | "dark";

export interface Theme {
  scheme: Scheme;
  isDark: boolean;
  colors: ThemeColors;
  /** Tones for a habit color in the active scheme. */
  habit: (key: HabitColorKey) => HabitTone;
  /**
   * The same tones for done states (a checked day, a filled bar or ring): the
   * fills are the flame color whatever the habit's color, the glyph keeps its hue.
   */
  lit: (key: HabitColorKey) => HabitTone;
  preference: ThemePreference;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ preference, children }: { preference: ThemePreference; children: ReactNode }) {
  const system = useColorScheme();
  const scheme: Scheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  const value = useMemo<Theme>(() => {
    const palette = habitPalettes[scheme];
    const colors = themes[scheme];
    const isDark = scheme === "dark";
    const habit = (key: HabitColorKey) => palette[key] ?? palette.ember;
    return {
      scheme,
      isDark,
      colors,
      habit,
      lit: (key) => ({ ...habit(key), solid: colors.success, soft: colors.track, onSolid: isDark ? "#1A0A02" : "#FFFFFF" }),
      preference,
    };
  }, [scheme, preference]);

  // Keep the web document in sync so overscroll, scrollbars and form controls match.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.colorScheme = scheme;
    root.dataset.theme = scheme;
    root.style.setProperty("--focus-ring", themes[scheme].focus);
    document.body.style.backgroundColor = themes[scheme].backdrop[1];
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themes[scheme].canvas);
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
