import type { LucideIcon } from "lucide-react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Clock from "lucide-react-native/icons/clock";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { PressableScale } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { TimePickerSheet } from "@/components/ui/TimePicker";
import { formatTime } from "@/data/dates";
import { haptics } from "@/lib/haptics";
import { layout, radius, space, useTheme } from "@/theme";

export interface TimeRowProps {
  label: string;
  description?: string;
  /** "HH:MM" (24h). */
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  disabled?: boolean;
  sheetTitle?: string;
  sheetDescription?: string;
  presets?: string[];
}

/**
 * A settings row for a reminder time, styled like ListRow (icon tile, label,
 * description) with the time in an ember pill. Tapping it opens the shared
 * TimePickerSheet. The whole row is one button with the full spoken label.
 */
export function TimeRow({ label, description, value, onChange, icon: Icon, iconBg, iconColor, disabled, sheetTitle, sheetDescription, presets }: TimeRowProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const time = formatTime(value);
  return (
    <View style={styles.row}>
      {/* Disabled is drawn with quieter colors (still AA), never with opacity, so text stays readable. */}
      <View style={styles.visual} aria-hidden pointerEvents="none">
        <View style={[styles.tile, { backgroundColor: disabled ? colors.surfaceMuted : (iconBg ?? colors.accentSoft) }]}>
          <Icon size={18} color={disabled ? colors.inkSubtle : (iconColor ?? colors.accentText)} strokeWidth={2.3} />
        </View>
        <View style={styles.texts}>
          <Text variant="bodyStrong" tone={disabled ? "muted" : "default"} numberOfLines={2}>
            {label}
          </Text>
          {description ? (
            <Text variant="caption" tone={disabled ? "subtle" : "muted"} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        <View style={[styles.pill, { backgroundColor: disabled ? colors.surfaceMuted : colors.accentSoft }]}>
          <Clock size={13} color={disabled ? colors.inkSubtle : colors.accentText} strokeWidth={2.5} />
          <Text variant="caption" tone={disabled ? "subtle" : "accent"} tabular style={styles.pillText}>
            {time}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.inkSubtle} strokeWidth={2.4} />
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${time}${description ? `. ${description}` : ""}`}
        accessibilityHint="Opens the time picker"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        pressScale={0.985}
        onPress={() => {
          haptics.light();
          setOpen(true);
        }}
        style={styles.overlay}
      />
      <TimePickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        value={value}
        onChange={onChange}
        title={sheetTitle ?? label}
        description={sheetDescription}
        presets={presets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, justifyContent: "center" },
  visual: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: layout.cardPadding, paddingVertical: space[3] },
  tile: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    paddingHorizontal: space[2] + 2,
    paddingVertical: space[1] + 1,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: 14 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.md },
});
