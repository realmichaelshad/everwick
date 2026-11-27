import X from "lucide-react-native/icons/x";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View, type HostInstance } from "react-native";
import { GestureDetector, usePanGesture, type PanGestureConfig } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { ModalLayer } from "@/components/system/ModalLayer";
import { withTouchAction } from "@/lib/gestures";
import { useDialogA11y } from "@/components/system/useDialogA11y";
import { elevation, layout, motion, radius, space, useTheme } from "@/theme";

import { IconButton } from "./IconButton";
import { Text } from "./Text";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Sticky footer (buttons). */
  footer?: ReactNode;
  /** Max height as a fraction of the app height (default 0.86). */
  maxHeight?: number;
}

/**
 * Bottom sheet (a modal dialog): scrim, rounded panel sliding up, grab
 * handle, title, close button. Ways out: the close button, a scrim tap,
 * dragging the handle or header down (past a third of the panel or with a
 * flick; otherwise it springs back), Android's Back button and Escape.
 * A real modal on iOS and Android (ModalLayer); on web, focus is trapped
 * while open and returned to the opener after.
 */
export function Sheet({ visible, onClose, title, description, children, footer, maxHeight = 0.86 }: SheetProps) {
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);
  if (!mounted) return null;
  return (
    <ModalLayer onRequestClose={onClose}>
      <SheetPanel visible={visible} onClose={onClose} onHidden={() => setMounted(false)} title={title} description={description} footer={footer} maxHeight={maxHeight}>
        {children}
      </SheetPanel>
    </ModalLayer>
  );
}

function SheetPanel({
  visible,
  onClose,
  onHidden,
  title,
  description,
  children,
  footer,
  maxHeight,
}: SheetProps & { onHidden: () => void; maxHeight: number }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const panelHeight = useSharedValue(480);
  const panelRef = useRef<HostInstance>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useDialogA11y(panelRef, visible, close);

  // Drag the handle or header down to dismiss: follows the finger (a stiff rubber band upward),
  // closes past a third of the panel or on a flick, springs back otherwise.
  const pan = usePanGesture(
    withTouchAction<PanGestureConfig>({
      activeOffsetY: [-6, 6],
      failOffsetX: [-24, 24],
      onUpdate: (e) => {
        "worklet";
        const y = e.translationY;
        drag.value = y >= 0 ? y : y * 0.15;
      },
      onDeactivate: (e) => {
        "worklet";
        if (drag.value > panelHeight.value * 0.32 || e.velocityY > 900) {
          scheduleOnRN(close);
        } else {
          drag.value = withSpring(0, motion.spring.gentle);
        }
      },
    }, "pan-x"),
  );

  useEffect(() => {
    if (visible) drag.value = 0;
    const duration = reduced ? 0 : visible ? motion.slow : motion.base;
    progress.value = withTiming(visible ? 1 : 0, { duration, easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic) });
    if (!visible) {
      const id = setTimeout(onHidden, duration + 30);
      return () => clearTimeout(id);
    }
  }, [visible, progress, reduced, onHidden, drag]);

  const scrim = useAnimatedStyle(() => ({ opacity: progress.value * (1 - Math.min(0.6, Math.max(0, drag.value) / Math.max(1, panelHeight.value))) }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * Math.max(640, panelHeight.value + 40) + drag.value }] }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        ref={panelRef}
        onLayout={(e) => {
          panelHeight.value = e.nativeEvent.layout.height;
        }}
        role="dialog"
        aria-modal
        aria-label={title}
        accessibilityViewIsModal
        style={[
          styles.panel,
          {
            backgroundColor: colors.surfaceRaised,
            maxHeight: `${Math.round(maxHeight * 100)}%`,
            paddingBottom: Math.max(insets.bottom, space[4]),
            borderColor: colors.line,
            borderWidth: isDark ? 1 : 0,
          },
          elevation("floating", colors, isDark),
          panel,
        ]}
      >
        <GestureDetector gesture={pan} touchAction="pan-x">
          <View style={styles.grab}>
            <View style={[styles.handle, { backgroundColor: colors.lineStrong }]} />
            <View style={styles.header}>
              <View style={styles.titles}>
                <Text variant="title" heading>
                  {title}
                </Text>
                {description ? (
                  <Text variant="callout" tone="muted">
                    {description}
                  </Text>
                ) : null}
              </View>
              <IconButton icon={X} label="Close" variant="muted" size={36} iconSize={18} onPress={close} />
            </View>
          </View>
        </GestureDetector>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: space[2],
  },
  grab: { cursor: "grab" },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, marginBottom: space[2] },
  header: { flexDirection: "row", alignItems: "flex-start", gap: space[3], paddingHorizontal: layout.gutter, paddingTop: space[2], paddingBottom: space[3] },
  titles: { flex: 1, gap: space[1] },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: layout.gutter, paddingBottom: space[4], gap: space[4] },
  footer: { paddingHorizontal: layout.gutter, paddingTop: space[2], gap: space[2] },
});
