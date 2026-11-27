import { router } from "expo-router";
import Plus from "lucide-react-native/icons/plus";
import Sparkles from "lucide-react-native/icons/sparkles";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { HabitIcon } from "@/components/ui/HabitIcon";
import { PressableScale } from "@/components/ui/Pressable";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { describeSchedule, SUGGESTIONS } from "@/data/catalog";
import { formatTime } from "@/data/dates";
import type { Habit, HabitDraft } from "@/data/types";
import { haptics } from "@/lib/haptics";
import { radius, space, useTheme } from "@/theme";

export interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
  habits: Habit[];
  onAdd: (draft: HabitDraft) => void;
}

/** Quick add: one-tap suggestions, or "Create your own" for the full form. */
export function QuickAddSheet({ visible, onClose, habits, onAdd }: QuickAddSheetProps) {
  const { colors } = useTheme();
  const taken = new Set(habits.map((h) => h.name.toLowerCase()));
  const options = SUGGESTIONS.filter((s) => !taken.has(s.name.toLowerCase()));
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add a habit"
      description="Tap a suggestion to add it with sensible defaults. You can tweak it any time."
      footer={
        <Button
          label="Create your own"
          icon={Sparkles}
          size="lg"
          fullWidth
          onPress={() => {
            onClose();
            router.push("/habit/new");
          }}
        />
      }
    >
      <View style={styles.list}>
        {options.length === 0 ? (
          <Text variant="callout" tone="muted">
            You've added every suggestion. Create your own below.
          </Text>
        ) : null}
        {options.map(({ key, ...draft }) => (
          <PressableScale
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`Add ${draft.name}, ${describeSchedule(draft.schedule)}`}
            pressScale={0.98}
            onPress={() => {
              haptics.complete();
              onAdd(draft);
            }}
            style={[styles.row, { backgroundColor: colors.surfaceMuted }]}
          >
            <HabitIcon icon={draft.icon} color={draft.color} size={44} />
            <View style={styles.texts}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {draft.name}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {describeSchedule(draft.schedule)}
                {draft.reminder ? `, ${formatTime(draft.reminder)}` : ""}
              </Text>
            </View>
            <View style={[styles.add, { backgroundColor: colors.accent }]}>
              <Plus size={18} color={colors.onAccent} strokeWidth={2.8} />
            </View>
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[2] },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[2] + 2, paddingRight: space[3], borderRadius: radius.lg, minHeight: 64 },
  texts: { flex: 1, gap: 1 },
  add: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
