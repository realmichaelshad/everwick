import type { ReactNode } from "react";
import { Modal, Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Portal } from "./Portal";

/**
 * Where sheets and dialogs render.
 * - iOS and Android: a transparent React Native <Modal>, so the system treats
 *   it as modal: Android's Back button closes it (onRequestClose), VoiceOver
 *   and TalkBack can't reach the screen behind it, and it covers the status
 *   bar. Gestures inside need their own GestureHandlerRootView.
 * - Web: the app's portal, so overlays stay inside the phone-width column on
 *   wide screens (a web Modal would cover the whole browser window). The web
 *   dialog behavior (focus trap, Escape, focus return) is in useDialogA11y.
 */
export function ModalLayer({ children, onRequestClose }: { children: ReactNode; onRequestClose: () => void }) {
  if (Platform.OS === "web") return <Portal>{children}</Portal>;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onRequestClose} statusBarTranslucent navigationBarTranslucent supportedOrientations={["portrait"]}>
      <GestureHandlerRootView style={styles.fill}>{children}</GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
