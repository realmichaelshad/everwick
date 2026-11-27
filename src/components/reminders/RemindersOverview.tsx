import BellRing from "lucide-react-native/icons/bell-ring";
import Settings2 from "lucide-react-native/icons/settings-2";
import { Linking, StyleSheet, View } from "react-native";

import { Illustration } from "@/components/illustrations/Illustration";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import type { Habit } from "@/data/types";
import type { ReminderPermission } from "@/lib/reminders";
import { elevation, layout, radius, space, useTheme } from "@/theme";

import { DayTimeline } from "./DayTimeline";
import { describeDayCount, type DayReminder } from "./reminderSummary";

export interface RemindersOverviewProps {
  enabled: boolean;
  permission: ReminderPermission | null;
  scheduled: number;
  today: DayReminder[];
  nextLine: string;
  nowMinutes: number;
  habits: Habit[];
  onTurnOn: () => void;
  busy?: boolean;
}

interface Copy {
  badge: { label: string; tone: "success" | "accent" | "neutral" | "danger" };
  title: string;
  body: string;
}

function copyFor(enabled: boolean, permission: ReminderPermission | null, scheduled: number): Copy {
  if (!enabled) {
    return {
      badge: { label: "Paused", tone: "neutral" },
      title: "Reminders are paused",
      body: "Nothing will ring. Your times are kept, so turning reminders back on picks up where you left off.",
    };
  }
  switch (permission) {
    case "unsupported":
      return {
        badge: { label: "Web demo", tone: "accent" },
        title: "Reminders ring on your phone",
        body: "Your times are saved here. On the phone, Everwick schedules them as local notifications, so they ring even offline.",
      };
    case "granted":
      return {
        badge: { label: scheduled > 0 ? `On, ${scheduled} scheduled` : "On", tone: "success" },
        title: "Reminders are on",
        body: "Your phone will nudge you at the times below, even when Everwick is closed.",
      };
    case "denied":
      return {
        badge: { label: "Off in Settings", tone: "danger" },
        title: "Notifications are off for Everwick",
        body: "To get reminders, open your phone's Settings, tap Notifications and allow them for Everwick.",
      };
    case "undetermined":
      return {
        badge: { label: "Not on yet", tone: "accent" },
        title: "Get a nudge at the right time",
        body: "Everwick reminds you at the times you pick. Your phone asks for permission once, and you can change it later.",
      };
    default:
      return { badge: { label: "Checking", tone: "neutral" }, title: "Reminders", body: "Checking notification settings on this phone." };
  }
}

/**
 * The top of the Reminders screen: where reminders stand on this device
 * (with the one action that moves them forward) and today's reminders on a
 * timeline with the next one called out.
 */
export function RemindersOverview({ enabled, permission, scheduled, today, nextLine, nowMinutes, habits, onTurnOn, busy }: RemindersOverviewProps) {
  const { colors, isDark } = useTheme();
  const copy = copyFor(enabled, permission, scheduled);
  const action =
    enabled && permission === "undetermined" ? (
      <Button label="Turn on reminders" icon={BellRing} onPress={onTurnOn} loading={busy} />
    ) : enabled && permission === "denied" ? (
      <Button label="Open Settings" icon={Settings2} variant="secondary" onPress={() => void Linking.openSettings()} />
    ) : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }, elevation("card", colors, isDark)]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Badge label={copy.badge.label} tone={copy.badge.tone} />
          <Text variant="title" heading>
            {copy.title}
          </Text>
          <Text variant="callout" tone="muted">
            {copy.body}
          </Text>
        </View>
        <View pointerEvents="none" style={styles.art}>
          <Illustration slot="reminders" size={92} />
        </View>
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}

      <View style={[styles.divider, { backgroundColor: colors.line }]} />

      <View style={styles.today}>
        <View style={styles.todayHead}>
          <Text variant="overline" tone="subtle">
            Today
          </Text>
          <Text variant="caption" tone="muted" tabular>
            {enabled ? describeDayCount(today.length) : "Paused"}
          </Text>
        </View>
        <Text variant="headline" tone={enabled ? "default" : "muted"}>
          {enabled ? nextLine : "Turn reminders on to see your day"}
        </Text>
        <DayTimeline reminders={enabled ? today : []} habits={habits} nowMinutes={nowMinutes} paused={!enabled} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: layout.cardPadding + 2, gap: space[4] },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space[2] },
  headText: { flex: 1, gap: space[1.5] },
  art: { marginTop: -space[2], marginRight: -space[2] },
  action: { flexDirection: "row" },
  divider: { height: StyleSheet.hairlineWidth },
  today: { gap: space[2] },
  todayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
