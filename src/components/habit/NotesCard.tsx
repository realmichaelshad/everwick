import Check from "lucide-react-native/icons/check";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { LIMITS } from "@/data/limits";
import { space, useTheme } from "@/theme";

const SAVE_AFTER_MS = 700;
const NOTES_MAX = LIMITS.notes;

export interface NotesCardProps {
  notes: string;
  onSave: (notes: string) => void;
}

/**
 * Free-form notes that save themselves: after a short pause in typing, on
 * blur and when leaving the screen. A quiet inline "Saved" confirms it
 * (no toast for every keystroke).
 */
export function NotesCard({ notes, onSave }: NotesCardProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState(notes);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ draft: notes, stored: notes, onSave });
  latest.current.onSave = onSave;

  // Follow outside changes (Undo, import) while the person isn't typing.
  useEffect(() => {
    if (timer.current == null && notes !== latest.current.stored) {
      latest.current = { ...latest.current, draft: notes, stored: notes };
      setDraft(notes);
    }
  }, [notes]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const { draft: text, stored } = latest.current;
    if (text === stored) return;
    latest.current.stored = text;
    latest.current.onSave(text);
    setSaved(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setSaved(false), 2200);
  }, []);

  // Save whatever is pending when the screen goes away.
  useEffect(
    () => () => {
      flush();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [flush],
  );

  return (
    <Card padding={space[4]} style={styles.card}>
      <TextField
        label="What helps you stick with it"
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          latest.current.draft = text;
          setSaved(false);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(flush, SAVE_AFTER_MS);
        }}
        onBlur={flush}
        multiline
        maxLength={NOTES_MAX}
        placeholder="What makes this easier? Where you do it, what you need, your plan for a busy day."
      />
      <View style={styles.status} accessibilityLiveRegion="polite" aria-live="polite">
        {saved ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(160)} exiting={reduced ? undefined : FadeOut.duration(200)} style={styles.saved}>
            <Check size={14} color={colors.successText} strokeWidth={3} />
            <Text variant="caption" tone="success">
              Saved
            </Text>
          </Animated.View>
        ) : (
          <Text variant="caption" tone="subtle">
            Notes save as you type and stay on this phone.
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[2] },
  status: { minHeight: 18 },
  saved: { flexDirection: "row", alignItems: "center", gap: space[1] },
});
