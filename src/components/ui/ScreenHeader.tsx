import { router } from "expo-router";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import X from "lucide-react-native/icons/x";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { layout, space } from "@/theme";

import { IconButton } from "./IconButton";
import { Text } from "./Text";

export interface ScreenHeaderProps {
  title?: string;
  /** "back" (chevron) for pushed screens, "close" (X) for modals, "none". */
  leading?: "back" | "close" | "none";
  onLeadingPress?: () => void;
  /** Right side actions (IconButtons, a text Button). */
  actions?: ReactNode;
  /** Where Back goes when there is no history (deep link). Default "/". */
  fallbackHref?: "/" | "/progress" | "/profile";
  /**
   * Heading level of the title. 1 (default): the header title is the screen's name
   * (New habit, Reminders), so it is the h1 that focus moves to after navigation.
   */
  titleLevel?: 1 | 2 | 3;
}

/** Compact header for stack screens: back/close, centered title, actions. */
export function ScreenHeader({ title, leading = "back", onLeadingPress, actions, fallbackHref = "/", titleLevel = 1 }: ScreenHeaderProps) {
  const goBack = () => {
    if (onLeadingPress) return onLeadingPress();
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
  };
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {leading !== "none" ? (
          <IconButton
            icon={leading === "back" ? ChevronLeft : X}
            label={leading === "back" ? "Back" : "Close"}
            variant="glass"
            iconSize={22}
            onPress={goBack}
          />
        ) : null}
      </View>
      <View style={styles.center}>
        {title ? (
          <Text variant="headline" numberOfLines={1} heading level={titleLevel}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: layout.gutter - 4, paddingVertical: space[2], minHeight: 60 },
  side: { minWidth: 88, flexDirection: "row", alignItems: "center", gap: space[2] },
  right: { justifyContent: "flex-end" },
  center: { flex: 1, alignItems: "center" },
});
