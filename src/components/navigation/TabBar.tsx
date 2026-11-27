import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import ChartColumn from "lucide-react-native/icons/chart-column";
import Flame from "lucide-react-native/icons/flame";
import UserRound from "lucide-react-native/icons/user-round";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useState } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { haptics } from "@/lib/haptics";
import { elevation, layout, motion, radius, rgba, space, useTheme } from "@/theme";

/** Tab routes in order. Keep in sync with app/(tabs). */
export const TABS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: "index", label: "Today", icon: Flame },
  { name: "progress", label: "Progress", icon: ChartColumn },
  { name: "profile", label: "Profile", icon: UserRound },
];

/** How far above the bar the canvas fade starts (content dissolves before it reaches the pill). */
export const TAB_FADE = 40;

/**
 * Floating, rounded tab bar with a sliding ember pill behind the active tab.
 * Frosted on iOS and web, solid on Android. A canvas-colored fade sits behind
 * it, so content scrolling underneath dissolves instead of showing sharp
 * under and around the pill.
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const inner = width - 12;
  const slot = inner > 0 ? inner / TABS.length : 0;
  const activeName = state.routes[state.index]?.name;
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.name === activeName));

  const pill = useAnimatedStyle(() => ({
    width: slot - 8,
    transform: [{ translateX: withSpring(activeIndex * slot + 4, motion.spring.gentle) }],
  }));

  const web = Platform.OS === "web";
  const glass: ViewStyle = web ? ({ backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)" } as ViewStyle) : {};

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[rgba(colors.canvas, 0), rgba(colors.canvas, 0.86), colors.canvas]}
        locations={[0, 0.38, 0.6]}
        style={[styles.fade, { top: -TAB_FADE }]}
      />
      <View
        role={web ? "navigation" : undefined}
        aria-label="Main"
        accessibilityRole={web ? undefined : "tablist"}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[
          styles.bar,
          { backgroundColor: Platform.OS === "ios" ? "transparent" : colors.tabBar, borderColor: colors.tabBarBorder },
          glass,
          elevation("floating", colors, isDark),
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={[StyleSheet.absoluteFill, styles.blur, { backgroundColor: colors.tabBar }]} />
        ) : null}
        {slot > 0 ? <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: colors.accentSoft }, pill]} /> : null}
        {TABS.map((tab, i) => {
          const route = state.routes.find((r) => r.name === tab.name);
          if (!route) return null;
          const focused = i === activeIndex;
          const color = focused ? colors.accentText : colors.inkMuted;
          const Icon = tab.icon;
          return (
            <PressableScale
              key={tab.name}
              accessibilityRole={web ? "link" : "tab"}
              accessibilityState={web ? undefined : { selected: focused }}
              aria-current={web && focused ? "page" : undefined}
              accessibilityLabel={tab.label}
              pressScale={0.92}
              onPress={() => {
                const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptics.selection();
                  navigateToTab(route.key);
                }
              }}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
              style={styles.item}
            >
              <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 2.1} />
              <Text variant="tab" color={color}>
                {tab.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: layout.gutter },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bar: {
    flexDirection: "row",
    height: layout.tabBarHeight,
    borderRadius: radius.xl + 4,
    borderWidth: 1,
    padding: 6,
  },
  blur: { borderRadius: radius.xl + 4, overflow: "hidden" },
  pill: { position: "absolute", top: 6, bottom: 6, left: 6, borderRadius: radius.xl },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: space[0.5] },
});
