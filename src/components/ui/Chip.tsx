import type { LucideIcon } from "lucide-react-native";
import Check from "lucide-react-native/icons/check";
import { StyleSheet, View } from "react-native";

import { haptics } from "@/lib/haptics";
import { radius, space, useTheme } from "@/theme";

import { PressableScale } from "./Pressable";
import { Text } from "./Text";
import type { RovingItemProps } from "./useRovingFocus";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  /**
   * Tone for the selected state (a habit tone from theme.habit(key)). Selected
   * chips then use the AA pair soft fill + ink text with a solid border.
   * Defaults to an ink fill with inverse text.
   */
  tone?: { solid: string; soft: string; ink: string };
  /** "toggle" chips are checkboxes, "radio" chips are one choice of a group, "action" chips are buttons. */
  kind?: "toggle" | "radio" | "action";
  size?: "md" | "lg";
  accessibilityHint?: string;
  /** Roving focus props when the chip is part of a radio group (useRovingFocus). */
  itemProps?: RovingItemProps;
}

/** Pill chip for goals, filters and quick-add suggestions. */
export function Chip({ label, selected = false, onPress, icon: Icon, tone, kind = "toggle", size = "md", accessibilityHint, itemProps }: ChipProps) {
  const { colors } = useTheme();
  const bg = selected ? (tone?.soft ?? colors.ink) : colors.surface;
  const fg = selected ? (tone?.ink ?? colors.inkInverse) : colors.ink;
  const border = selected ? (tone?.solid ?? colors.ink) : colors.lineStrong;
  const toggle = kind !== "action";
  return (
    <PressableScale
      accessibilityRole={kind === "radio" ? "radio" : toggle ? "checkbox" : "button"}
      accessibilityState={toggle ? { checked: selected } : undefined}
      // react-native-web maps aria-checked (not accessibilityState) to the DOM; checkbox and radio roles require it.
      aria-checked={toggle ? selected : undefined}
      {...itemProps}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      pressScale={0.95}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      style={[
        styles.chip,
        size === "lg" ? styles.lg : null,
        { backgroundColor: bg, borderColor: border },
      ]}
    >
      {Icon ? (
        <View aria-hidden>
          <Icon size={size === "lg" ? 18 : 16} color={fg} strokeWidth={2.3} />
        </View>
      ) : null}
      <Text variant={size === "lg" ? "bodyStrong" : "caption"} color={fg}>
        {label}
      </Text>
      {toggle && selected ? (
        <View style={styles.check} aria-hidden>
          <Check size={14} color={fg} strokeWidth={3} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1.5],
    paddingHorizontal: space[3] + 2,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  lg: { minHeight: 48, paddingHorizontal: space[4], gap: space[2] },
  check: { marginLeft: 2 },
});
