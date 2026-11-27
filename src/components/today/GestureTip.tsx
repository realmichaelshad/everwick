import AsyncStorage from "@react-native-async-storage/async-storage";
import Hand from "lucide-react-native/icons/hand";
import X from "lucide-react-native/icons/x";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import { FRAME_BREAKPOINT } from "@/components/system/WebFrame";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { radius, space, useTheme } from "@/theme";

const KEY = "everwick/tips/today-gestures";

const TOUCH_TIP = "Swipe right to check in, left to skip. Hold to reorder.";
const KEYBOARD_TIP = "Swipe right to check in, left to skip, hold to reorder. Keys: S skips, Alt+arrows move.";

/**
 * The keyboard half of the tip only where a keyboard and mouse are likely:
 * the web build in its desktop frame with a fine, hovering pointer. A phone
 * browser (and the native app) gets the touch-only line.
 */
function wantsKeyboardTip(width: number): boolean {
  if (Platform.OS !== "web" || width < FRAME_BREAKPOINT || typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** One-time hint that teaches the row gestures. Dismissal is remembered on the device. */
export function GestureTip() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setVisible(v !== "dismissed"))
      .catch(() => setVisible(true));
  }, []);
  if (!visible) return null;
  return (
    <Animated.View exiting={FadeOut.duration(160)} style={[styles.tip, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Hand size={16} color={colors.accentText} strokeWidth={2.4} />
      </View>
      <Text variant="caption" tone="muted" style={styles.text}>
        {wantsKeyboardTip(width) ? KEYBOARD_TIP : TOUCH_TIP}
      </Text>
      <IconButton
        icon={X}
        label="Dismiss tip"
        variant="ghost"
        size={32}
        iconSize={16}
        color={colors.inkSubtle}
        onPress={() => {
          setVisible(false);
          AsyncStorage.setItem(KEY, "dismissed").catch(() => undefined);
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: "row", alignItems: "center", gap: space[2] + 2, paddingLeft: space[2] + 2, paddingVertical: space[1], borderRadius: radius.lg },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  text: { flex: 1 },
});
