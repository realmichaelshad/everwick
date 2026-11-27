import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Platform, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { Logo } from "@/components/brand/Logo";
import { Text } from "@/components/ui/Text";
import { TAGLINE } from "@/content/brand";
import { launchFlags } from "@/lib/launchFlags";
import { layout, useTheme } from "@/theme";

import { DeviceChrome } from "./DeviceChrome";

/** Below this width the app runs edge to edge like on a phone. */
export const FRAME_BREAKPOINT = 600;

/**
 * Web presentation: on wide viewports the app is a centered phone-width
 * column on a soft branded backdrop (with the concept-app note); on phones it
 * is edge to edge. On native this renders children untouched.
 */
export function WebFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const flags = launchFlags();
  if (Platform.OS !== "web") return <>{children}</>;

  const app = flags.device ? <DeviceChrome>{children}</DeviceChrome> : children;

  if (width < FRAME_BREAKPOINT) {
    // Edge to edge on phones. "clip" keeps anything that animates past the edge (a tab
    // scene sliding, confetti) from widening the page, and unlike "hidden" it can't be
    // scrolled sideways by a scroll-into-view.
    return <View style={[styles.fill, styles.clip, { backgroundColor: colors.canvas }]}>{app}</View>;
  }

  const columnHeight = Math.min(height - 48, 932);
  const wide = width >= 1100;

  return (
    <View style={[styles.fill, styles.center]}>
      <LinearGradient colors={[colors.backdrop[0], colors.backdrop[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" aria-hidden>
        <Defs>
          <RadialGradient id="bd-a" cx="22%" cy="18%" r="38%">
            <Stop offset="0" stopColor={isDark ? "#3B1A29" : "#FFC9AE"} stopOpacity={isDark ? 0.9 : 0.75} />
            <Stop offset="1" stopColor={isDark ? "#3B1A29" : "#FFC9AE"} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bd-b" cx="82%" cy="86%" r="42%">
            <Stop offset="0" stopColor={isDark ? "#2E1640" : "#F3C6E6"} stopOpacity={isDark ? 0.9 : 0.7} />
            <Stop offset="1" stopColor={isDark ? "#2E1640" : "#F3C6E6"} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bd-a)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bd-b)" />
      </Svg>

      {wide ? (
        <View style={styles.brand} accessibilityRole="banner">
          <Logo size={30} />
          <Text variant="callout" tone="muted" style={styles.tagline}>
            {TAGLINE}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.column,
          {
            height: columnHeight,
            backgroundColor: colors.canvas,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(28,20,36,0.06)",
          },
          isDark
            ? ({ boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)" } as object)
            : ({ boxShadow: "0 30px 80px rgba(138,74,42,0.22), 0 8px 24px rgba(28,20,36,0.08)" } as object),
        ]}
      >
        {app}
      </View>

      <View style={[styles.note, wide ? styles.noteWide : styles.noteNarrow]} accessibilityRole="contentinfo">
        <Text variant="caption" tone="muted" align={wide ? "left" : "center"}>
          Concept app with a fictional brand. Your data stays in this browser.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  clip: { overflow: "clip" } as unknown as ViewStyle,
  center: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  column: {
    width: "100%",
    maxWidth: layout.maxAppWidth,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
  },
  brand: { position: "absolute", top: 32, left: 40, gap: 6 },
  tagline: { marginLeft: 2 },
  note: { position: "absolute" },
  noteWide: { left: 40, bottom: 28 },
  noteNarrow: { left: 0, right: 0, bottom: 4 },
});
