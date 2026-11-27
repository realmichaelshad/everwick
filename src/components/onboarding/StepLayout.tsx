import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { layout, rgba, space, useTheme } from "@/theme";

export interface StepLayoutProps {
  /** Hero art (HeroArt). */
  art: ReactNode;
  overline: string;
  title: string;
  body: string;
  children?: ReactNode;
}

/**
 * Shared layout for one onboarding step: centered art, then a left-aligned
 * eyebrow, headline and one sentence, then the step's controls. Scrolls when
 * large text needs the room.
 */
export function StepLayout({ art, overline, title, body, children }: StepLayoutProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.fill}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.art}>{art}</View>
        <View style={styles.copy}>
          <Text variant="overline" tone="accent">
            {overline}
          </Text>
          <Text variant="hero" heading>
            {title}
          </Text>
          <Text variant="body" tone="muted" style={styles.body}>
            {body}
          </Text>
        </View>
        {children ? <View style={styles.controls}>{children}</View> : null}
      </ScrollView>
      {/* Soft edge where content scrolls under the dots and button. */}
      <LinearGradient pointerEvents="none" colors={[rgba(colors.canvas, 0), colors.canvas]} style={styles.fade} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingBottom: space[4],
  },
  art: { alignItems: "center", justifyContent: "center" },
  copy: { gap: space[2], marginTop: space[1] },
  body: { maxWidth: 360 },
  controls: { marginTop: space[5], gap: space[3] },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: space[4],
  },
});
