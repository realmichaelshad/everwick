import BellRing from "lucide-react-native/icons/bell-ring";
import Info from "lucide-react-native/icons/info";
import Smartphone from "lucide-react-native/icons/smartphone";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Text } from "@/components/ui/Text";
import { TimeField } from "@/components/ui/TimePicker";
import { formatTime } from "@/data/dates";
import { getReminderPermission, remindersSupported, requestReminderPermission, type ReminderPermission } from "@/lib/reminders";
import { radius, space, useTheme } from "@/theme";

export interface ReminderPickerProps {
  on: boolean;
  time: string;
  onToggle: (on: boolean) => void;
  onTime: (time: string) => void;
  /** Settings > Notifications master switch. */
  notificationsEnabled: boolean;
}

/**
 * Reminder switch and time. On a phone, turning it on explains why before
 * asking for notification permission, and shows plain help when the
 * permission is off. On web the time is saved and a note explains that
 * reminders ring on the phone.
 */
export function ReminderPicker({ on, time, onToggle, onTime, notificationsEnabled }: ReminderPickerProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [permission, setPermission] = useState<ReminderPermission>(remindersSupported ? "undetermined" : "unsupported");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let alive = true;
    void getReminderPermission().then((p) => alive && setPermission(p));
    return () => {
      alive = false;
    };
  }, []);

  const ask = async () => {
    setAsking(true);
    try {
      setPermission(await requestReminderPermission());
    } finally {
      setAsking(false);
    }
  };

  let note: React.ReactNode = null;
  if (on) {
    if (permission === "unsupported") {
      note = (
        <Note icon={<Smartphone size={16} color={colors.inkMuted} strokeWidth={2.4} />}>
          Reminders ring on your phone. This web demo saves the time.
        </Note>
      );
    } else if (permission === "undetermined") {
      note = (
        <View style={[styles.explain, { backgroundColor: colors.accentSoft }]}>
          <View style={styles.row}>
            <BellRing size={18} color={colors.accentText} strokeWidth={2.4} />
            <Text variant="callout" style={styles.flex}>
              Everwick will send one gentle nudge at {formatTime(time)} on the days this habit is due. Your phone will ask to allow notifications.
            </Text>
          </View>
          <Button label="Allow notifications" size="sm" loading={asking} onPress={() => void ask()} />
        </View>
      );
    } else if (permission === "denied") {
      note = (
        <Note icon={<Info size={16} color={colors.dangerText} strokeWidth={2.4} />} tone="danger">
          Notifications are off for Everwick. Turn them on in your phone's Settings to get this reminder. The time is saved either way.
        </Note>
      );
    } else if (!notificationsEnabled) {
      note = (
        <Note icon={<Info size={16} color={colors.inkMuted} strokeWidth={2.4} />}>
          Reminders are paused in Profile, under Notifications. The time is saved for when you turn them back on.
        </Note>
      );
    }
  }

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">Remind me</Text>
          <Text variant="caption" tone="muted">
            {on ? `Every due day at ${formatTime(time)}` : "No reminder for this habit"}
          </Text>
        </View>
        <Switch label="Remind me" value={on} onValueChange={onToggle} />
      </View>
      {on ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={styles.stack}>
          <TimeField
            label="Reminder time"
            value={time}
            onChange={onTime}
            sheetDescription="Pick when this habit should nudge you."
            presets={["07:00", "09:00", "12:30", "18:00", "21:00"]}
          />
          {note}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Note({ icon, children, tone = "default" }: { icon: React.ReactNode; children: React.ReactNode; tone?: "default" | "danger" }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.note, { backgroundColor: tone === "danger" ? colors.dangerSoft : colors.surfaceMuted }]}>
      <View style={styles.noteIcon}>{icon}</View>
      <Text variant="caption" color={tone === "danger" ? colors.dangerText : colors.inkMuted} style={styles.flex}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[3] },
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  flex: { flex: 1 },
  explain: { gap: space[3], padding: space[3], borderRadius: radius.md },
  note: { flexDirection: "row", alignItems: "flex-start", gap: space[2], padding: space[3], borderRadius: radius.md },
  noteIcon: { marginTop: 1 },
});
