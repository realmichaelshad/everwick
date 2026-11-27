/**
 * Everwick design tokens: spacing, radii, type scale, motion and layout.
 * Colors live in ./colors.ts. Never hard-code these values in screens;
 * import from "@/theme" instead.
 */
/** 4-point spacing scale. Use the keys, not raw numbers. */
export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
} as const;

/** Horizontal page gutter and other layout constants. */
export const layout = {
  gutter: 20,
  cardPadding: 16,
  listGap: 12,
  sectionGap: 28,
  /** Height of the floating tab bar (without the bottom inset). */
  tabBarHeight: 64,
  /** Space screens leave at the bottom so the last card ends above the tab bar's fade. */
  tabBarClearance: 124,
  /** Max width of the app column on wide web viewports. */
  maxAppWidth: 430,
  /** Minimum touch target (Apple HIG 44pt, Material 48dp: we use 44 for icons, 48 for buttons). */
  hitTarget: 44,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  card: 22,
  xl: 26,
  sheet: 30,
  pill: 999,
} as const;

/** Font family names as registered by expo-font in app/_layout.tsx. */
export const fonts = {
  display: "BricolageGrotesque_800ExtraBold",
  displayBold: "BricolageGrotesque_700Bold",
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

export type TextVariant =
  | "hero"
  | "display"
  | "numeral"
  | "numeralSm"
  | "title"
  | "headline"
  | "body"
  | "bodyStrong"
  | "callout"
  | "caption"
  | "overline"
  | "button"
  | "tab";

interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: "uppercase";
}

/**
 * Type scale. Bricolage Grotesque (display) is for greetings, screen titles
 * and big numbers; Plus Jakarta Sans carries all UI and body text.
 */
export const type: Record<TextVariant, TypeStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
  numeral: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  numeralSm: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.6 },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  headline: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, letterSpacing: -0.15 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  callout: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  // Small labels read as plain words in sentence case ("Schedule", "This week"), not shouted eyebrows.
  overline: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, letterSpacing: -0.05 },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, letterSpacing: -0.1 },
  tab: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.1 },
};

/** Motion: durations in ms and spring configs for Reanimated. */
export const motion = {
  fast: 160,
  base: 240,
  slow: 420,
  ring: 900,
  stagger: 45,
  spring: {
    /** Check-off bounce: lively, one overshoot. */
    bouncy: { damping: 11, stiffness: 260, mass: 0.8 },
    /** UI movement: sheets, thumbs, toggles. */
    gentle: { damping: 20, stiffness: 220, mass: 1 },
    /** Press feedback. */
    press: { damping: 18, stiffness: 420, mass: 0.6 },
  },
} as const;

