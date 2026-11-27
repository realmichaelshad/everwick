import { StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader, type ScreenHeaderProps } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme";

/** ScreenHeader's row height (minHeight 60). Content under an overlay header starts below it. */
export const HEADER_HEIGHT = 60;

export interface OverlayHeaderProps extends Omit<ScreenHeaderProps, "title"> {
  /** Scroll offset of the screen's scroll view (useScrollOffset). */
  offset: SharedValue<number>;
  /** Always-visible title (modals). */
  title?: string;
  /** Title that fades in once the hero has scrolled away (detail screens). */
  collapsedTitle?: string;
  /** Scroll position where the collapsed title is fully shown. */
  collapseAt?: number;
}

/**
 * A ScreenHeader that floats over the screen, so a tinted dawn backdrop runs
 * edge to edge behind it. Its canvas background and hairline fade in as
 * content scrolls underneath; a detail screen's title fades in once the
 * hero is gone. Pass it to <Screen overlay={...}>: it renders first inside
 * the screen (Back and Close are the first Tab stops) and floats above the
 * content with its z-index.
 */
export function OverlayHeader({ offset, title, collapsedTitle, collapseAt = 220, ...header }: OverlayHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = useAnimatedStyle(() => ({ opacity: interpolate(offset.value, [0, 16], [0, 1], "clamp") }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [collapseAt - 60, collapseAt], [0, 1], "clamp"),
    transform: [{ translateY: interpolate(offset.value, [collapseAt - 60, collapseAt], [8, 0], "clamp") }],
  }));
  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas, borderBottomColor: colors.line }, styles.bg, bg]} />
      <ScreenHeader title={title} {...header} />
      {collapsedTitle && !title ? (
        <Animated.View pointerEvents="none" aria-hidden style={[styles.collapsed, { top: insets.top }, titleStyle]}>
          <Text variant="headline" numberOfLines={1}>
            {collapsedTitle}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  bg: { borderBottomWidth: StyleSheet.hairlineWidth },
  collapsed: { position: "absolute", left: 104, right: 104, height: HEADER_HEIGHT, alignItems: "center", justifyContent: "center" },
});
