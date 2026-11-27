import { forwardRef } from "react";
import { Platform, Text as RNText, type HostInstance, type TextProps as RNTextProps, type TextStyle } from "react-native";

import { withoutWidow } from "@/lib/typography";
import { type as typeScale, useTheme, type TextVariant, type ThemeColors } from "@/theme";

export type TextTone = "default" | "muted" | "subtle" | "accent" | "inverse" | "onAccent" | "success" | "danger";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Explicit color wins over tone (e.g. a habit's `ink`). */
  color?: string;
  align?: TextStyle["textAlign"];
  /** Renders with accessibilityRole="header" (use for screen and section titles). */
  heading?: boolean;
  /**
   * Heading level (web: h1..h4). Defaults from the variant: hero/display 1
   * (the screen title), title 2 (sections, sheets), headline/overline 3 (cards).
   */
  level?: 1 | 2 | 3 | 4;
  /**
   * Keep the last two words together so a line never ends on a lone word
   * ("All done for / today", "...right where you left / them."). On by
   * default for headings and for sentence-length body copy (body, callout,
   * caption over BODY_WIDOW_MIN characters); pass false to opt out.
   */
  noWidow?: boolean;
  /** Tabular figures for counters that change (streaks, percentages). */
  tabular?: boolean;
}

export { withoutWidow };

/** Body variants that get widow protection by default once the text is sentence-length. */
const BODY_VARIANTS = new Set<TextVariant>(["body", "bodyStrong", "callout", "caption"]);
const BODY_WIDOW_MIN = 28;

function keepsWidow(variant: TextVariant, heading: boolean | undefined, noWidow: boolean | undefined, text: string): boolean {
  if (noWidow !== undefined) return noWidow;
  if (heading) return true;
  return BODY_VARIANTS.has(variant) && text.length >= BODY_WIDOW_MIN && text.includes(" ");
}

const LEVEL_FOR: Partial<Record<TextVariant, 1 | 2 | 3>> = { hero: 1, display: 1, title: 2, headline: 3, overline: 3, bodyStrong: 3 };

const toneColor = (tone: TextTone, c: ThemeColors) =>
  ({
    default: c.ink,
    muted: c.inkMuted,
    subtle: c.inkSubtle,
    accent: c.accentText,
    inverse: c.inkInverse,
    onAccent: c.onAccent,
    success: c.successText,
    danger: c.dangerText,
  })[tone];

/**
 * The only text component screens should use. Variants come from the type
 * scale in theme/tokens.ts; colors from the active theme.
 */
export const Text = forwardRef<HostInstance, TextProps>(function Text(
  { variant = "body", tone = "default", color, align, heading, level, noWidow, tabular, style, children, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const headingLevel = heading ? (level ?? LEVEL_FOR[variant] ?? 2) : undefined;
  // react-native-web renders role=heading with aria-level as <h1>..<h4>.
  const levelProps = headingLevel && Platform.OS === "web" ? ({ "aria-level": headingLevel } as object) : null;
  return (
    <RNText
      ref={ref}
      accessibilityRole={heading ? "header" : rest.accessibilityRole}
      maxFontSizeMultiplier={1.4}
      {...levelProps}
      {...rest}
      children={typeof children === "string" && keepsWidow(variant, heading, noWidow, children) ? withoutWidow(children) : children}
      style={[
        typeScale[variant],
        { color: color ?? toneColor(tone, colors) },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    />
  );
});
