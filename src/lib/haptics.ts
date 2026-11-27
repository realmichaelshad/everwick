import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Haptic feedback on iOS and Android; a silent no-op on web. Call these from
 * event handlers only. `enabled` comes from Settings > Haptics.
 */
const native = Platform.OS === "ios" || Platform.OS === "android";
let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

const run = (fn: () => Promise<void>) => {
  if (!native || !enabled) return;
  fn().catch(() => undefined);
};

export const haptics = {
  /** Tiny tick: toggles, segmented controls, chip selection, +1 on a target habit. */
  selection: () => run(() => Haptics.selectionAsync()),
  /** A habit was completed. */
  complete: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Light tap: buttons, undo. */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Everything for today is done. */
  celebrate: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
