/**
 * Everwick color system: neutral paper and ink, with one warm color that
 * means "lit" (a check-in done, a streak kept). Actions are ink, never orange.
 * Light and dark are designed separately. Contrast for every text pair is
 * documented in DESIGN.md and enforced by tests/contrast.test.ts.
 */

export type Scheme = "light" | "dark";

export interface ThemeColors {
  /** App background behind everything. */
  canvas: string;
  /** Cards and list rows. */
  surface: string;
  /** Inputs, segmented tracks, secondary tiles. */
  surfaceMuted: string;
  /** Sheets and dialogs (sit above surface). */
  surfaceRaised: string;
  line: string;
  lineStrong: string;

  ink: string;
  inkMuted: string;
  /** Tertiary text. Still AA (4.5:1) on canvas, surface and surfaceMuted. */
  inkSubtle: string;
  /** Text on an `ink` fill (e.g. toasts). */
  inkInverse: string;

  /** Brand ember: buttons, active tab, highlights. */
  accent: string;
  accentPressed: string;
  /** Text and icons on an accent fill. */
  onAccent: string;
  /** Accent-colored text on canvas/surface (AA). */
  accentText: string;
  /** Soft tinted fill for accent chips, selected states. */
  accentSoft: string;

  success: string;
  successText: string;
  successSoft: string;
  danger: string;
  dangerText: string;
  dangerSoft: string;
  warning: string;

  /** Swipe actions on habit rows: check-in (right) and skip (left) backgrounds with AA labels. */
  swipeCheck: string;
  onSwipeCheck: string;
  swipeSkip: string;
  onSwipeSkip: string;

  /** Streak freezes (ice): icon/fill, soft chip background, AA text. */
  freeze: string;
  freezeSoft: string;
  freezeText: string;

  /** Progress ring and bar tracks. */
  track: string;
  /** A switch that is off: the track outline and its small knob (3:1 on cards). */
  switchOff: string;
  /** Streak flame. */
  flameOuter: string;
  flameMid: string;
  flameCore: string;

  /** Header backdrop gradient (top to bottom, fades into canvas). */
  dawn: readonly [string, string, string];
  /** A second soft glow used behind the header on the right. */
  dawnGlow: string;
  /** The brand gradient: amber, ember, rose. Ring strokes, app icon, Pro. */
  brand: readonly [string, string, string];

  /** Segmented control: the selected thumb and its track (the thumb must read as raised in both themes). */
  segmentThumb: string;
  segmentTrack: string;
  segmentThumbBorder: string;

  scrim: string;
  tabBar: string;
  tabBarBorder: string;
  skeleton: string;
  skeletonHighlight: string;
  shadow: string;
  /** Focus ring for keyboard users on web. */
  focus: string;
  /** Web backdrop around the phone column on wide screens. */
  backdrop: readonly [string, string];
}

export const lightColors: ThemeColors = {
  canvas: "#F4F4F5",
  surface: "#FFFFFF",
  surfaceMuted: "#EDEDF0",
  surfaceRaised: "#FFFFFF",
  line: "#E4E4E8",
  lineStrong: "#D2D2D8",

  ink: "#121214",
  inkMuted: "#4E4E56",
  inkSubtle: "#66666F",
  inkInverse: "#FFFFFF",

  accent: "#121214",
  accentPressed: "#2A2A2E",
  onAccent: "#FFFFFF",
  accentText: "#121214",
  accentSoft: "#E8E8EC",

  success: "#EF5F17",
  successText: "#B23F06",
  successSoft: "#FDEBDF",
  danger: "#DC2626",
  dangerText: "#B91C1C",
  dangerSoft: "#FDE8E8",
  warning: "#F59E0B",

  swipeCheck: "#B8450A",
  onSwipeCheck: "#FFFFFF",
  swipeSkip: "#4E4E56",
  onSwipeSkip: "#FFFFFF",

  freeze: "#2563EB",
  freezeSoft: "#E7EEFD",
  freezeText: "#1D4ED8",

  track: "#E7E7EB",
  switchOff: "#7C7C86",
  flameOuter: "#EF5F17",
  flameMid: "#F7913A",
  flameCore: "#FFD9A0",

  dawn: ["#F4F4F5", "#F4F4F5", "#F4F4F5"],
  dawnGlow: "#F4F4F5",
  brand: ["#EF5F17", "#EF5F17", "#EF5F17"],

  segmentThumb: "#FFFFFF",
  segmentTrack: "#E8E8EC",
  segmentThumbBorder: "rgba(18, 18, 20, 0.06)",

  scrim: "rgba(10, 10, 12, 0.42)",
  tabBar: "rgba(255, 255, 255, 0.96)",
  tabBarBorder: "rgba(18, 18, 20, 0.08)",
  skeleton: "#EAEAEE",
  skeletonHighlight: "#F6F6F8",
  shadow: "#000000",
  focus: "#121214",
  backdrop: ["#ECECEF", "#E4E4E8"],
};

export const darkColors: ThemeColors = {
  canvas: "#0D0D0F",
  surface: "#17171A",
  surfaceMuted: "#202024",
  surfaceRaised: "#222226",
  line: "#26262B",
  lineStrong: "#34343A",

  ink: "#F4F4F5",
  inkMuted: "#B4B4BC",
  inkSubtle: "#94949E",
  inkInverse: "#121214",

  accent: "#F4F4F5",
  accentPressed: "#DADADF",
  onAccent: "#121214",
  accentText: "#F4F4F5",
  accentSoft: "#2A2A30",

  success: "#FF7A2E",
  successText: "#FF9A5C",
  successSoft: "#3A2216",
  danger: "#F87171",
  dangerText: "#FCA5A5",
  dangerSoft: "#3A1A1A",
  warning: "#FBBF24",

  swipeCheck: "#FF7A2E",
  onSwipeCheck: "#1A0A02",
  swipeSkip: "#3A3A42",
  onSwipeSkip: "#F4F4F5",

  freeze: "#60A5FA",
  freezeSoft: "#172238",
  freezeText: "#93C5FD",

  track: "#26262B",
  switchOff: "#8A8A96",
  flameOuter: "#FF7A2E",
  flameMid: "#FFA24A",
  flameCore: "#FFE0A8",

  dawn: ["#0D0D0F", "#0D0D0F", "#0D0D0F"],
  dawnGlow: "#0D0D0F",
  brand: ["#FF7A2E", "#FF7A2E", "#FF7A2E"],

  segmentThumb: "#3E3E46",
  segmentTrack: "#1C1C20",
  segmentThumbBorder: "rgba(255, 255, 255, 0.08)",

  scrim: "rgba(0, 0, 0, 0.6)",
  tabBar: "rgba(23, 23, 26, 0.96)",
  tabBarBorder: "rgba(255, 255, 255, 0.08)",
  skeleton: "#1C1C20",
  skeletonHighlight: "#26262B",
  shadow: "#000000",
  focus: "#F4F4F5",
  backdrop: ["#141417", "#0B0B0D"],
};

/* -------------------------------------------------------------------------- */
/* Habit colors                                                                */
/* -------------------------------------------------------------------------- */

export const HABIT_COLOR_KEYS = ["ember", "ocean", "violet", "leaf", "sun", "rose", "teal", "indigo"] as const;
export type HabitColorKey = (typeof HABIT_COLOR_KEYS)[number];

export interface HabitTone {
  /** Fills: check circle, bars, heatmap top level, progress. */
  solid: string;
  /**
   * Outline of an unchecked check button: the habit color, deepened where
   * needed so it reads at 3:1 against the card, the canvas and its own soft
   * fill (WCAG non-text contrast). In dark it is the solid color.
   */
  rim: string;
  /** Soft tinted background for icon tiles and done rows. */
  soft: string;
  /** Text/icon color that is AA on `soft`, surface and canvas. */
  ink: string;
  /** Icon/check color on a `solid` fill. */
  onSolid: string;
  /** Human label for pickers and screen readers. */
  label: string;
}

const habitLight: Record<HabitColorKey, HabitTone> = {
  ember: { solid: "#F4622A", rim: "#7C7C86", soft: "#EFEFF2", ink: "#B23A0A", onSolid: "#FFFFFF", label: "Ember" },
  ocean: { solid: "#2F7BFF", rim: "#7C7C86", soft: "#EFEFF2", ink: "#1D5BD8", onSolid: "#FFFFFF", label: "Ocean" },
  violet: { solid: "#7A5CFF", rim: "#7C7C86", soft: "#EFEFF2", ink: "#5B3FE0", onSolid: "#FFFFFF", label: "Violet" },
  leaf: { solid: "#1EA562", rim: "#7C7C86", soft: "#EFEFF2", ink: "#13774A", onSolid: "#FFFFFF", label: "Leaf" },
  sun: { solid: "#FFB224", rim: "#7C7C86", soft: "#EFEFF2", ink: "#8F5300", onSolid: "#3A2400", label: "Sun" },
  rose: { solid: "#FF4F8B", rim: "#7C7C86", soft: "#EFEFF2", ink: "#C2215B", onSolid: "#FFFFFF", label: "Rose" },
  teal: { solid: "#0E9E96", rim: "#7C7C86", soft: "#EFEFF2", ink: "#0B746F", onSolid: "#FFFFFF", label: "Teal" },
  indigo: { solid: "#4B5BD6", rim: "#7C7C86", soft: "#EFEFF2", ink: "#3443B8", onSolid: "#FFFFFF", label: "Indigo" },
};

const habitDark: Record<HabitColorKey, HabitTone> = {
  ember: { solid: "#FF7A45", rim: "#72727C", soft: "#222226", ink: "#FF9A6E", onSolid: "#1A0D10", label: "Ember" },
  ocean: { solid: "#4D8DFF", rim: "#72727C", soft: "#222226", ink: "#8DB6FF", onSolid: "#0B1020", label: "Ocean" },
  violet: { solid: "#8C74FF", rim: "#72727C", soft: "#222226", ink: "#B7A8FF", onSolid: "#120B24", label: "Violet" },
  leaf: { solid: "#34C77F", rim: "#72727C", soft: "#222226", ink: "#6FDCA4", onSolid: "#08190F", label: "Leaf" },
  sun: { solid: "#FFC043", rim: "#72727C", soft: "#222226", ink: "#FFD27A", onSolid: "#2A1A00", label: "Sun" },
  rose: { solid: "#FF6B9C", rim: "#72727C", soft: "#222226", ink: "#FF9EC0", onSolid: "#22070F", label: "Rose" },
  teal: { solid: "#2CC9BF", rim: "#72727C", soft: "#222226", ink: "#6FE0D8", onSolid: "#04201E", label: "Teal" },
  indigo: { solid: "#6E7CF0", rim: "#72727C", soft: "#222226", ink: "#AAB3FF", onSolid: "#0C0E26", label: "Indigo" },
};

export const habitPalettes: Record<Scheme, Record<HabitColorKey, HabitTone>> = {
  light: habitLight,
  dark: habitDark,
};

export const themes: Record<Scheme, ThemeColors> = { light: lightColors, dark: darkColors };

/** Mixes two "#RRGGBB" colors: t = 0 gives `a`, 1 gives `b`. */
export function mix(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const ch = (hex: string, i: number) => parseInt(hex.replace("#", "").slice(i, i + 2), 16);
  return `#${[0, 2, 4]
    .map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** "#RRGGBB" + alpha -> "rgba(r, g, b, a)" (safe for Reanimated color interpolation). */
export function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
