import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";

import { PressableScale } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { haptics } from "@/lib/haptics";
import { radius, rgba, space, useTheme } from "@/theme";
import { useRovingFocus } from "@/components/ui/useRovingFocus";

export interface FilterOption {
  value: string;
  label: string;
  /** Spoken name when it should be longer than the chip label. */
  spoken?: string;
  icon?: LucideIcon;
  /** Selected background, text and border (e.g. a habit's soft, ink and solid: an AA pair). */
  bg?: string;
  fg?: string;
  border?: string;
}

/**
 * A single-select row of filter chips that scrolls sideways, edge to edge of
 * its card with a soft fade on the right (so a cut-off chip reads as "more").
 * Exposed as a radio group (one choice at a time; arrow keys move it).
 */
export function FilterChips({ options, value, onChange, label }: { options: FilterOption[]; value: string; onChange: (value: string) => void; label: string }) {
  const { colors } = useTheme();
  const roving = useRovingFocus({
    count: options.length,
    active: options.findIndex((o) => o.value === value),
    onMove: (i) => {
      haptics.selection();
      onChange(options[i].value);
    },
  });
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
        <View role="radiogroup" aria-label={label} style={styles.row}>
          {options.map((o, i) => {
            const selected = o.value === value;
            const bg = selected ? (o.bg ?? colors.ink) : colors.surface;
            const fg = selected ? (o.fg ?? colors.inkInverse) : colors.ink;
            const Icon = o.icon;
            return (
              <PressableScale
                key={o.value}
                role="radio"
                aria-checked={selected}
                aria-label={o.spoken ?? o.label}
                {...roving(i)}
                pressScale={0.95}
                hitSlop={{ top: 2, bottom: 2 }}
                onPress={() => {
                  if (!selected) haptics.selection();
                  onChange(o.value);
                }}
                style={[styles.chip, { backgroundColor: bg, borderColor: selected ? (o.border ?? bg) : colors.lineStrong }]}
              >
                {Icon ? <Icon size={16} color={fg} strokeWidth={2.3} /> : null}
                <Text variant="caption" color={fg}>
                  {o.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>
      <LinearGradient pointerEvents="none" colors={[rgba(colors.surface, 0), colors.surface]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.fade} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: -space[4] },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: space[4] },
  fade: { position: "absolute", right: 0, top: 0, bottom: 0, width: 36 },
  row: { flexDirection: "row", gap: space[2] },
  chip: { flexDirection: "row", alignItems: "center", gap: space[1.5], paddingHorizontal: space[3] + 2, minHeight: 40, borderRadius: radius.pill, borderWidth: 1.5 },
});
