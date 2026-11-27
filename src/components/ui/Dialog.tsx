import type { LucideIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, type HostInstance } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { ModalLayer } from "@/components/system/ModalLayer";
import { useDialogA11y } from "@/components/system/useDialogA11y";
import { elevation, motion, radius, space, useTheme } from "@/theme";

import { Button } from "./Button";
import { Text } from "./Text";

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: LucideIcon;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  /** "danger" styles the confirm button for destructive actions. */
  tone?: "default" | "danger";
}

/**
 * Centered confirm dialog (alertdialog) for destructive or important choices.
 * A real modal on iOS and Android (Back closes it, screen readers stay inside);
 * on web it traps focus, closes on Escape and returns focus to the opener.
 */
export function Dialog(props: DialogProps) {
  const [mounted, setMounted] = useState(props.visible);
  useEffect(() => {
    if (props.visible) setMounted(true);
  }, [props.visible]);
  if (!mounted) return null;
  return (
    <ModalLayer onRequestClose={props.onClose}>
      <DialogPanel {...props} onHidden={() => setMounted(false)} />
    </ModalLayer>
  );
}

function DialogPanel({ visible, onClose, title, message, icon: Icon, confirmLabel, onConfirm, cancelLabel = "Cancel", tone = "default", onHidden }: DialogProps & { onHidden: () => void }) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const ref = useRef<HostInstance>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useDialogA11y(ref, visible, close);

  useEffect(() => {
    if (visible) {
      progress.value = reduced ? 1 : withSpring(1, motion.spring.gentle);
      return;
    }
    progress.value = withTiming(0, { duration: reduced ? 0 : motion.fast, easing: Easing.in(Easing.quad) });
    const id = setTimeout(onHidden, (reduced ? 0 : motion.fast) + 30);
    return () => clearTimeout(id);
  }, [visible, progress, reduced, onHidden]);

  const scrim = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value) }));
  const card = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value), transform: [{ scale: 0.92 + progress.value * 0.08 }] }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.center]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}>
        <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={close} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        ref={ref}
        role="alertdialog"
        aria-modal
        aria-label={title}
        accessibilityViewIsModal
        style={[
          styles.card,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.line, borderWidth: isDark ? 1 : 0 },
          elevation("floating", colors, isDark),
          card,
        ]}
      >
        {Icon ? (
          <View style={[styles.icon, { backgroundColor: tone === "danger" ? colors.dangerSoft : colors.accentSoft }]}>
            <Icon size={24} color={tone === "danger" ? colors.dangerText : colors.accentText} strokeWidth={2.3} />
          </View>
        ) : null}
        <Text variant="title" align="center" heading>
          {title}
        </Text>
        <Text variant="callout" tone="muted" align="center">
          {message}
        </Text>
        <View style={styles.actions}>
          <Button
            label={confirmLabel}
            variant={tone === "danger" ? "inverse" : "primary"}
            fullWidth
            onPress={() => {
              onConfirm();
              close();
            }}
          />
          <Button label={cancelLabel} variant="secondary" fullWidth onPress={close} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", padding: space[6] },
  card: { width: "100%", maxWidth: 360, borderRadius: radius.xl, padding: space[6], gap: space[3], alignItems: "center" },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: space[1] },
  actions: { alignSelf: "stretch", gap: space[2], marginTop: space[2] },
});
