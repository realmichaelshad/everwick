import Clock from "lucide-react-native/icons/clock";
import Minus from "lucide-react-native/icons/minus";
import Plus from "lucide-react-native/icons/plus";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { formatTime, stepTime } from "@/data/dates";
import { haptics } from "@/lib/haptics";
import { radius, space, useTheme } from "@/theme";

import { Button } from "./Button";
import { Chip } from "./Chip";
import { useRovingFocus } from "./useRovingFocus";
import { IconButton } from "./IconButton";
import { PressableScale } from "./Pressable";
import { SegmentedControl } from "./SegmentedControl";
import { Sheet } from "./Sheet";
import { Text } from "./Text";

const pad = (n: number) => String(n).padStart(2, "0");

/** "HH:MM" helpers (24h storage, 12h display). */
export function splitTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9, minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0 };
}
export const joinTime = (hour: number, minute: number) => `${pad(((hour % 24) + 24) % 24)}:${pad(((minute % 60) + 60) % 60)}`;

const DEFAULT_PRESETS = ["07:00", "09:00", "12:30", "18:00", "21:00"];

export interface TimePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** "HH:MM" (24h). */
  value: string;
  onChange: (value: string) => void;
  title?: string;
  description?: string;
  /** Quick picks ("HH:MM"). */
  presets?: string[];
  /** Minute step for the minute stepper (default 5). */
  step?: number;
}

/**
 * Time picker in a bottom sheet: big readout, hour and minute steppers,
 * AM/PM, and one-tap presets. Plain buttons, so it works the same on iOS,
 * Android and web and with screen readers. Commits on "Set time".
 */
export function TimePickerSheet({ visible, onClose, value, onChange, title = "Reminder time", description, presets = DEFAULT_PRESETS, step = 5 }: TimePickerSheetProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(value);
  const presetRoving = useRovingFocus({ count: presets.length, active: presets.indexOf(draft), onMove: (i) => setDraft(presets[i]) });
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);
  const { hour, minute } = splitTime(draft);
  const pm = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  const set = (h: number, m: number) => {
    haptics.selection();
    setDraft(joinTime(h, m));
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <Button
          label="Set time"
          size="lg"
          fullWidth
          onPress={() => {
            onChange(draft);
            onClose();
          }}
        />
      }
    >
      <View style={styles.readout} accessible accessibilityRole="text" accessibilityLabel={`Selected time ${formatTime(draft)}`} aria-live="polite">
        <Text variant="numeral" tabular>
          {hour12}:{pad(minute)}
        </Text>
        <Text variant="title" tone="muted">
          {pm ? "PM" : "AM"}
        </Text>
      </View>
      <View style={styles.steppers}>
        <Stepper label="Hour" value={String(hour12)} onMinus={() => set(hour - 1, minute)} onPlus={() => set(hour + 1, minute)} />
        <Stepper
          label="Minutes"
          value={pad(minute)}
          onMinus={() => {
            haptics.selection();
            setDraft(stepTime(draft, -1, step));
          }}
          onPlus={() => {
            haptics.selection();
            setDraft(stepTime(draft, 1, step));
          }}
        />
      </View>
      <SegmentedControl
        label="Morning or evening"
        options={[
          { value: "am", label: "AM" },
          { value: "pm", label: "PM" },
        ]}
        value={pm ? "pm" : "am"}
        onChange={(v) => {
          if ((v === "pm") !== pm) set(pm ? hour - 12 : hour + 12, minute);
        }}
      />
      <View style={styles.presets} accessibilityRole="radiogroup" accessibilityLabel="Suggested times">
        {presets.map((p, i) => (
          <Chip key={p} label={formatTime(p)} kind="radio" selected={p === draft} onPress={() => setDraft(p)} itemProps={presetRoving(i)} />
        ))}
      </View>
      <View style={[styles.hint, { backgroundColor: colors.surfaceMuted }]}>
        <Clock size={14} color={colors.inkMuted} strokeWidth={2.4} />
        <Text variant="caption" tone="muted" style={styles.flex}>
          Times use your phone's time zone.
        </Text>
      </View>
    </Sheet>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: colors.surfaceMuted }]}>
      <IconButton icon={Minus} label={`Earlier ${label.toLowerCase()}`} variant="surface" onPress={onMinus} />
      <View style={styles.stepperText}>
        <Text variant="overline" tone="subtle">
          {label}
        </Text>
        <Text variant="title" tabular>
          {value}
        </Text>
      </View>
      <IconButton icon={Plus} label={`Later ${label.toLowerCase()}`} variant="surface" onPress={onPlus} />
    </View>
  );
}

export interface TimeFieldProps {
  label: string;
  /** "HH:MM" (24h). */
  value: string;
  onChange: (value: string) => void;
  description?: string;
  disabled?: boolean;
  sheetTitle?: string;
  sheetDescription?: string;
  presets?: string[];
}

/** A row that shows a time and opens the TimePickerSheet. Use inside forms and settings lists. */
export function TimeField({ label, value, onChange, description, disabled, sheetTitle, sheetDescription, presets }: TimeFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* The visible text names the button ("Reminder time 9:00 AM"), so no explicit label that axe would compare against it. */}
      <PressableScale
        accessibilityRole="button"
        accessibilityHint="Opens the time picker"
        accessibilityState={{ disabled: !!disabled }}
        aria-disabled={disabled ? true : undefined}
        disabled={disabled}
        pressScale={0.98}
        onPress={() => {
          haptics.light();
          setOpen(true);
        }}
        style={[styles.field, { backgroundColor: colors.surfaceMuted, opacity: disabled ? 0.5 : 1 }]}
      >
        <View style={styles.flex}>
          <Text variant="bodyStrong">{label}</Text>
          {description ? (
            <Text variant="caption" tone="muted">
              {description}
            </Text>
          ) : null}
        </View>
        <View style={[styles.timePill, { backgroundColor: colors.surface }]}>
          <View aria-hidden>
            <Clock size={14} color={colors.accentText} strokeWidth={2.4} />
          </View>
          <Text variant="bodyStrong" tone="accent" tabular>
            {formatTime(value)}
          </Text>
        </View>
      </PressableScale>
      <TimePickerSheet visible={open} onClose={() => setOpen(false)} value={value} onChange={onChange} title={sheetTitle ?? label} description={sheetDescription} presets={presets} />
    </>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: space[2], paddingVertical: space[2] },
  steppers: { flexDirection: "row", gap: space[3] },
  stepper: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: space[2], borderRadius: radius.lg },
  stepperText: { alignItems: "center" },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  hint: { flexDirection: "row", alignItems: "center", gap: space[2], padding: space[3], borderRadius: radius.md },
  flex: { flex: 1 },
  field: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 60, paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: radius.md },
  timePill: { flexDirection: "row", alignItems: "center", gap: space[1.5], paddingHorizontal: space[3], paddingVertical: space[1.5], borderRadius: radius.pill },
});
