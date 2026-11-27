import { router } from "expo-router";
import Bell from "lucide-react-native/icons/bell";
import CalendarCheck from "lucide-react-native/icons/calendar-check";
import Flame from "lucide-react-native/icons/flame";
import MoonStar from "lucide-react-native/icons/moon-star";
import Plus from "lucide-react-native/icons/plus";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Sun from "lucide-react-native/icons/sun";
import Volume2 from "lucide-react-native/icons/volume-2";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Button } from "@/components/ui/Button";
import { ListGroup, ListRow } from "@/components/ui/ListRow";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateViews";
import { Switch } from "@/components/ui/Switch";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import type { NotificationSettings, Weekday } from "@/data/types";
import { useHabits, useStore } from "@/data/store";
import { now } from "@/lib/clock";
import { remindersSupported } from "@/lib/reminders";
import { elevation, layout, motion, radius, space, useTheme } from "@/theme";

import { HabitReminderRow } from "./HabitReminderRow";
import { describeNextReminder, nextReminder, remindersOnDay } from "./reminderSummary";
import { RemindersOverview } from "./RemindersOverview";
import { TimeRow } from "./TimeRow";
import { useReminderPermission } from "./useReminderPermission";

/** Re-render once a minute so "now" and "next" stay true while the screen is open. */
function useMinute(): Date {
  const [date, setDate] = useState(() => now());
  useEffect(() => {
    const id = setInterval(() => setDate(now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return date;
}

/**
 * Reminders settings: where reminders stand on this device, today's
 * reminders on a timeline, the master switch, the daily nudges, extras and
 * a reminder per habit. Everything is local; on web the times are saved and
 * the screen explains that reminders ring on the phone.
 */
export function RemindersSettings() {
  const { status, state, actions } = useStore();
  const habits = useHabits();
  const toast = useToast();
  const reduced = useReducedMotion();
  const { habit: tone } = useTheme();
  const n = state.settings.notifications;
  const { permission, scheduled, request } = useReminderPermission(habits, n);
  const [busy, setBusy] = useState(false);
  const lastTimes = useRef<Record<string, string>>({});
  const date = useMinute();

  const weekday = date.getDay() as Weekday;
  const today = useMemo(() => remindersOnDay(habits, n, weekday), [habits, n, weekday]);
  const nextLine = useMemo(() => describeNextReminder(nextReminder(habits, n, date), date), [habits, n, date]);
  const nowMinutes = date.getHours() * 60 + date.getMinutes();

  const askPermission = useCallback(async () => {
    setBusy(true);
    try {
      const p = await request();
      if (p === "granted") toast.show({ message: "Reminders are on. Your phone will nudge you.", tone: "success", icon: Bell });
      else toast.show({ message: "Notifications are still off. You can allow them in Settings any time." });
    } finally {
      setBusy(false);
    }
  }, [request, toast]);

  const update = useCallback((patch: Partial<NotificationSettings>) => actions.updateNotifications(patch), [actions]);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      update({ enabled });
      if (!enabled) {
        toast.show({ message: "Reminders paused", icon: Bell, action: { label: "Undo", onPress: () => update({ enabled: true }) } });
        return;
      }
      if (permission === "undetermined") {
        void askPermission();
        return;
      }
      toast.show({
        message: remindersSupported ? "Reminders are on" : "Reminders are on. Your times are saved for the phone.",
        tone: "success",
        icon: Bell,
      });
    },
    [askPermission, permission, toast, update],
  );

  const enter = (i: number) =>
    reduced
      ? undefined
      : FadeInDown.delay(60 + i * motion.stagger)
          .springify()
          .damping(18)
          .stiffness(180);

  if (status === "loading") return <SettingsSkeleton />;
  if (status === "error") return <ErrorState onRetry={actions.retry} style={styles.error} />;

  const off = !n.enabled;
  const sun = tone("sun");
  const night = tone("indigo");
  const ember = tone("ember");
  const violet = tone("violet");
  const ocean = tone("ocean");

  return (
    <View style={styles.stack}>
      <Animated.View entering={enter(0)}>
        <RemindersOverview
          enabled={n.enabled}
          permission={permission}
          scheduled={scheduled}
          today={today}
          nextLine={nextLine}
          nowMinutes={nowMinutes}
          habits={habits}
          onTurnOn={() => void askPermission()}
          busy={busy}
        />
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <ListGroup>
          <ListRow
            label="Reminders"
            description={n.enabled ? "Nudges at the times you choose" : "Off. Nothing will ring."}
            icon={Bell}
            right={<Switch label="Reminders" value={n.enabled} onValueChange={setEnabled} />}
          />
        </ListGroup>
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <ListGroup title="Daily nudges" footer={off ? "Turn reminders on to change these." : undefined}>
          <TimeRow
            label="Morning nudge"
            description="Plan the day"
            value={n.morning}
            onChange={(morning) => update({ morning })}
            icon={Sun}
            iconBg={sun.soft}
            iconColor={sun.ink}
            disabled={off}
            sheetDescription="A short look at what's on today."
            presets={["06:30", "07:00", "07:30", "08:00", "09:00"]}
          />
          <TimeRow
            label="Evening check-in"
            description="Anything still open"
            value={n.evening}
            onChange={(evening) => update({ evening })}
            icon={MoonStar}
            iconBg={night.soft}
            iconColor={night.ink}
            disabled={off}
            sheetDescription="A last call for anything still open today."
            presets={["19:00", "20:00", "21:00", "21:30", "22:00"]}
          />
        </ListGroup>
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <ListGroup title="Extras">
          <ListRow
            label="Streak saver"
            description="A heads-up in the evening when a streak is at risk"
            icon={Flame}
            iconBg={ember.soft}
            iconColor={ember.ink}
            disabled={off}
            right={<Switch label="Streak saver" value={n.streakSaver} onValueChange={(streakSaver) => update({ streakSaver })} disabled={off} />}
          />
          <ListRow
            label="Weekly review"
            description="Sunday at 6 PM, a look back at your week"
            icon={CalendarCheck}
            iconBg={violet.soft}
            iconColor={violet.ink}
            disabled={off}
            right={<Switch label="Weekly review" value={n.weeklyReview} onValueChange={(weeklyReview) => update({ weeklyReview })} disabled={off} />}
          />
          <ListRow
            label="Sound"
            description="A soft chime with each reminder"
            icon={Volume2}
            iconBg={ocean.soft}
            iconColor={ocean.ink}
            disabled={off}
            right={<Switch label="Sound" value={n.sound} onValueChange={(sound) => update({ sound })} disabled={off} />}
          />
        </ListGroup>
      </Animated.View>

      <Animated.View entering={enter(4)}>
        <ListGroup title="Habit reminders" footer={habits.length ? "Each habit rings on the days it's scheduled." : undefined}>
          {habits.length ? (
            habits.map((h) => (
              <HabitReminderRow
                key={h.id}
                habit={h}
                disabled={off}
                fallbackTime={lastTimes.current[h.id]}
                onChange={(reminder) => {
                  if (h.reminder) lastTimes.current[h.id] = h.reminder;
                  actions.updateHabit(h.id, { reminder });
                }}
              />
            ))
          ) : (
            <View style={styles.empty}>
              <Text variant="bodyStrong">No habits yet</Text>
              <Text variant="caption" tone="muted">
                Create a habit and give it a time. It will show up here.
              </Text>
              <Button label="Create a habit" icon={Plus} size="md" onPress={() => router.push("/habit/new")} style={styles.emptyButton} />
            </View>
          )}
        </ListGroup>
      </Animated.View>

      <Animated.View entering={enter(5)}>
        <PrivacyNote />
      </Animated.View>
    </View>
  );
}

function PrivacyNote() {
  const { colors } = useTheme();
  return (
    <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
      <ShieldCheck size={18} color={colors.successText} strokeWidth={2.3} />
      <Text variant="caption" tone="muted" style={styles.flex}>
        Reminders are local. They're scheduled on this phone and nothing leaves it.
      </Text>
    </View>
  );
}

function SettingsSkeleton() {
  const { colors, isDark } = useTheme();
  const card = [styles.skelCard, { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }, elevation("card", colors, isDark)];
  return (
    <SkeletonGroup label="Loading reminders" style={styles.stack}>
      <View style={card}>
        <View style={styles.skelHead}>
          <View style={styles.skelLines}>
            <Skeleton width={64} height={18} radius={radius.pill} />
            <Skeleton width="80%" height={20} />
            <Skeleton width="95%" height={12} />
            <Skeleton width="70%" height={12} />
          </View>
          <Skeleton width={84} height={84} radius={42} />
        </View>
        <Skeleton width="100%" height={1} />
        <Skeleton width="55%" height={16} />
        <Skeleton width="100%" height={40} radius={radius.sm} />
      </View>
      {[1, 2, 3].map((rows) => (
        <View key={rows} style={card}>
          {Array.from({ length: rows }, (_, i) => (
            <View key={i} style={styles.skelRow}>
              <Skeleton width={36} height={36} radius={radius.sm} />
              <View style={styles.skelLines}>
                <Skeleton width="50%" height={14} />
                <Skeleton width="72%" height={11} />
              </View>
              <Skeleton width={52} height={32} radius={radius.pill} />
            </View>
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[6] },
  flex: { flex: 1 },
  error: { paddingTop: space[12] },
  empty: { padding: layout.cardPadding, gap: space[1] },
  emptyButton: { marginTop: space[3] },
  note: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4], borderRadius: radius.lg },
  skelCard: { borderRadius: radius.card, padding: layout.cardPadding, gap: space[4] },
  skelHead: { flexDirection: "row", gap: space[3] },
  skelLines: { flex: 1, gap: space[2] },
  skelRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
});
