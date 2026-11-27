import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Platform, RefreshControl, StyleSheet, View, type HostInstance, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { domElement } from "@/lib/dom";
import { layout, rgba, space, useTheme } from "@/theme";

import { DawnBackdrop } from "./DawnBackdrop";
import { Text } from "./Text";
import { useSetToastBottom } from "./Toast";

export interface ScreenProps {
  children: ReactNode;
  /** Fixed header (e.g. <ScreenHeader>) that gains a solid background once content scrolls under it. */
  header?: ReactNode;
  /**
   * A header that floats over the content (OverlayHeader), so a tinted backdrop runs
   * edge to edge behind it. It is rendered first, so Back and Close are the first
   * Tab stops, and it belongs to the screen (inert with it when another screen is on top).
   */
  overlay?: ReactNode;
  /** "dawn" (default) draws the brand gradient behind the top of the screen. */
  backdrop?: "dawn" | "none" | ReactNode;
  /** Tab screens leave room for the floating tab bar. */
  tabBar?: boolean;
  /** Pull to refresh (native). Return a promise; the spinner stays until it settles. */
  onRefresh?: () => Promise<void>;
  /** Set false for screens that manage their own scrolling. */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Footer pinned to the bottom (e.g. a Save button). */
  footer?: ReactNode;
  scrollRef?: Ref<Animated.ScrollView>;
  /** Lock scrolling (e.g. while a list row is being dragged). Default true. */
  scrollEnabled?: boolean;
  testID?: string;
  /** Accessible name of the screen's main region (defaults to its h1 on web). */
  title?: string;
  /**
   * Screens with a large title (the tabs): once it scrolls away, this short title
   * fades in, centered in a compact bar under the status bar (the iOS large-title pattern).
   */
  inlineTitle?: string;
}

/**
 * Web keyboard and screen-reader focus for a screen in a navigator:
 * - a screen that isn't focused (a tab you left, a screen under a pushed one)
 *   is `inert`, so Tab never lands on its invisible controls;
 * - when the screen gains focus after navigation, focus returns to the
 *   control that was focused when you left it, or moves to its title (h1).
 * No-op on iOS and Android, where the navigators handle this natively.
 */
let pageLoadScreenSeen = false;

/** Height of the compact title bar under the status bar, and the scroll offset where it starts to fade in. */
const INLINE_BAR = 44;
const INLINE_FROM = 44;

function useScreenFocus(rootRef: React.RefObject<HostInstance | null>) {
  const focused = useIsFocused();
  const remembered = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const root = domElement(rootRef.current);
    if (!root) return;
    root.inert = !focused;
    if (!focused) return;
    // The first screen of the page load keeps the browser's own focus; every later one is a navigation.
    if (!pageLoadScreenSeen) {
      pageLoadScreenSeen = true;
      return;
    }
    // The incoming screen can still be hidden for a frame or two while the navigator swaps
    // scenes (focus() then silently fails), so keep trying for a few frames.
    let frame = 0;
    let id = 0;
    const attempt = () => {
      const back = remembered.current;
      const target =
        back && root.contains(back) && back.isConnected ? back : (root.querySelector<HTMLElement>("h1") ?? root.querySelector<HTMLElement>("h2"));
      if (!target) return;
      if (target !== back && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      if (document.activeElement === target) {
        remembered.current = null;
        return;
      }
      if (++frame < 30) id = requestAnimationFrame(attempt);
    };
    id = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(id);
  }, [focused, rootRef]);

  // Leaving: remember what had focus inside this screen (e.g. the row that opened a habit).
  useFocusEffect(
    useCallback(
      () => () => {
        if (Platform.OS !== "web" || typeof document === "undefined") return;
        const root = domElement(rootRef.current);
        const active = document.activeElement as HTMLElement | null;
        if (root && active && root.contains(active)) remembered.current = active;
      },
      [rootRef],
    ),
  );
}

/**
 * Page shell for every screen: canvas background, dawn gradient, safe-area
 * padding, gutter, bottom clearance for the tab bar, pull to refresh and a
 * status-bar scrim that fades in on scroll. Rendered as <main> on web.
 */
export function Screen({ children, header, overlay, backdrop = "dawn", tabBar, onRefresh, scroll = true, contentStyle, footer, scrollRef, scrollEnabled = true, testID, title, inlineTitle }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rootRef = useRef<HostInstance>(null);
  useScreenFocus(rootRef);
  const y = useSharedValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const scrim = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 24], [0, 1], "clamp") }));
  const inlineBar = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [INLINE_FROM, INLINE_FROM + 20], [0, 1], "clamp") }));
  const inlineText = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(y.value, [INLINE_FROM, INLINE_FROM + 28], [6, 0], "clamp") }] }));

  // Toasts sit above the tab bar (default), above a pinned footer, or near the bottom edge.
  const setToastBottom = useSetToastBottom();
  const [footerHeight, setFooterHeight] = useState(0);
  const toastBottom = tabBar ? null : footer ? footerHeight + space[3] : insets.bottom + space[6];
  useFocusEffect(
    useCallback(() => {
      setToastBottom(toastBottom);
    }, [setToastBottom, toastBottom]),
  );

  const topPad = header ? 0 : insets.top + 8;
  const bottomPad = tabBar ? layout.tabBarClearance + insets.bottom : footer ? 24 : insets.bottom + 32;

  const body = scroll ? (
    <Animated.ScrollView
      ref={scrollRef}
      scrollEnabled={scrollEnabled}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh && Platform.OS !== "web" ? (
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
            progressViewOffset={insets.top}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await onRefresh();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        ) : undefined
      }
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: bottomPad }, contentStyle]}
    >
      {backdrop === "dawn" ? <DawnBackdrop /> : backdrop !== "none" ? backdrop : null}
      {children}
    </Animated.ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, { paddingTop: topPad, paddingBottom: bottomPad }, contentStyle]}>
      {backdrop === "dawn" ? <DawnBackdrop /> : backdrop !== "none" ? backdrop : null}
      {children}
    </View>
  );

  return (
    <View ref={rootRef} testID={testID} role="main" aria-label={title} style={[styles.fill, { backgroundColor: colors.canvas }]}>
      {overlay}
      {header ? (
        <HeaderBar y={y} insetTop={insets.top}>
          {header}
        </HeaderBar>
      ) : null}
      {body}
      {footer ? (
        <View
          onLayout={(e: LayoutChangeEvent) => setFooterHeight(Math.round(e.nativeEvent.layout.height))}
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.canvas, borderTopColor: colors.line }]}
        >
          {footer}
        </View>
      ) : null}
      {!header && insets.top > 0 ? <Animated.View pointerEvents="none" style={[styles.scrim, { height: insets.top, backgroundColor: colors.canvas }, scrim]} /> : null}
      {!header && inlineTitle ? (
        <Animated.View
          pointerEvents="none"
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.scrim, styles.inlineBar, { height: insets.top + INLINE_BAR, paddingTop: insets.top, backgroundColor: colors.canvas, borderBottomColor: colors.line }, inlineBar]}
        >
          <Animated.View style={inlineText}>
            <Text variant="headline" align="center" numberOfLines={1}>
              {inlineTitle}
            </Text>
          </Animated.View>
        </Animated.View>
      ) : null}
      {/* Scrolling stack screens: content fades out above the home indicator instead of running under it
          (the bottom twin of the status-bar scrim; the content's bottom padding is taller, so nothing is lost). */}
      {scroll && !tabBar && !footer && insets.bottom > 0 ? (
        <LinearGradient
          pointerEvents="none"
          colors={[rgba(colors.canvas, 0), rgba(colors.canvas, 0.96), colors.canvas]}
          locations={[0, 0.5, 1]}
          style={[styles.bottomFade, { height: insets.bottom + 18 }]}
        />
      ) : null}
    </View>
  );
}

function HeaderBar({ children, y, insetTop }: { children: ReactNode; y: ReturnType<typeof useSharedValue<number>>; insetTop: number }) {
  const { colors } = useTheme();
  const bg = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 16], [0, 1], "clamp") }));
  return (
    <View style={[styles.header, { paddingTop: insetTop }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, bg]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, flexGrow: 1 },
  header: { zIndex: 10 },
  scrim: { position: "absolute", top: 0, left: 0, right: 0 },
  inlineBar: { justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 5 },
  bottomFade: { position: "absolute", left: 0, right: 0, bottom: 0 },
  footer: { paddingHorizontal: layout.gutter, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
