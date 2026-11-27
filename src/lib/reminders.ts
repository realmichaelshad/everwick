/**
 * Local reminders with expo-notifications on iOS and Android. Nothing leaves
 * the device: these are scheduled local notifications, not push. On web the
 * reminder UI still works and the app explains that reminders ring on the
 * phone (see `remindersSupported`).
 *
 *   const status = await getReminderPermission();   // "granted" | "denied" | "undetermined" | "unsupported"
 *   const next = await requestReminderPermission();
 *   await syncReminders(habits, settings.notifications, history); // the store calls this for you
 *   useReminderTaps((habitId) => router.push(...));               // the root layout does this
 *
 * The phone gets repeating daily and weekly notifications (data/reminderPlan
 * phoneSchedule), so reminders keep coming even if the app isn't opened for
 * weeks. They are re-planned after every check-in and on launch, so a habit
 * that's already done today doesn't ring again today and the evening
 * check-in stays quiet on a perfect day.
 */
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { fromKey } from "@/data/dates";
import { habitIdFromNotification, phoneSchedule, planReminders, type PhoneReminder } from "@/data/reminderPlan";
import type { Habit, History, NotificationSettings } from "@/data/types";
import { now, todayKey } from "@/lib/clock";

export type ReminderPermission = "granted" | "denied" | "undetermined" | "unsupported";

/** True on iOS and Android. On web, show the "reminders ring on your phone" note instead. */
export const remindersSupported = Platform.OS === "ios" || Platform.OS === "android";

const CHANNEL_ID = "habit-reminders";
let configured = false;

async function configure() {
  if (!remindersSupported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Habit reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 120, 80, 120],
      lightColor: "#FF6B35",
    });
  }
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (!remindersSupported) return "unsupported";
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return "granted";
    return p.canAskAgain ? "undetermined" : "denied";
  } catch {
    return "unsupported";
  }
}

/** Shows the system prompt (once). Call it from a button the person pressed, after explaining why. */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!remindersSupported) return "unsupported";
  try {
    await configure();
    const p = await Notifications.requestPermissionsAsync();
    if (p.granted) return "granted";
    return p.canAskAgain ? "undetermined" : "denied";
  } catch {
    return "unsupported";
  }
}

function toTrigger(r: PhoneReminder): Notifications.NotificationTriggerInput {
  const channelId = Platform.OS === "android" ? CHANNEL_ID : undefined;
  const t = r.trigger;
  if (t.kind === "daily") return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: t.hour, minute: t.minute, channelId };
  // expo-notifications counts weekdays 1 (Sunday) to 7 (Saturday).
  if (t.kind === "weekly") return { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: t.weekday + 1, hour: t.hour, minute: t.minute, channelId };
  const at = fromKey(t.day);
  at.setHours(t.hour, t.minute, 0, 0);
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId };
}

function toRequest(r: PhoneReminder, sound: boolean): Notifications.NotificationRequestInput {
  return {
    identifier: r.id,
    content: { title: r.title, body: r.body, sound: sound ? "default" : undefined, data: { reminderId: r.reminderId, habitId: r.habitId ?? null } },
    trigger: toTrigger(r),
  };
}

let syncing: Promise<number> | null = null;

/**
 * Replaces every scheduled reminder with the current plan. Returns how many
 * are scheduled (0 without permission, on web, or when reminders are off).
 */
export async function syncReminders(habits: Habit[], settings: NotificationSettings, history: History = { logs: {} }): Promise<number> {
  if (!remindersSupported) return 0;
  const run = async () => {
    try {
      if ((await getReminderPermission()) !== "granted") return 0;
      await configure();
      await Notifications.cancelAllScheduledNotificationsAsync();
      const d = now();
      const plan = phoneSchedule(planReminders(habits, settings), habits, history, todayKey(), d.getHours() * 60 + d.getMinutes());
      for (const r of plan) await Notifications.scheduleNotificationAsync(toRequest(r, settings.sound));
      return plan.length;
    } catch {
      return 0;
    }
  };
  // Serialize syncs so a fast series of edits never interleaves cancel/schedule.
  syncing = (syncing ?? Promise.resolve(0)).then(run, run);
  return syncing;
}

/** For the settings screen: how many reminders the phone will ring. */
export async function scheduledReminderCount(): Promise<number> {
  if (!remindersSupported) return 0;
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}

/**
 * Tapping a habit's reminder opens that habit, also when the tap launched the
 * app (useLastNotificationResponse covers the cold start). Nudges just open
 * the app. Each response is handled once.
 */
export function useReminderTaps(onOpenHabit: (habitId: string) => void, ready = true) {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  const open = useRef(onOpenHabit);
  open.current = onOpenHabit;
  useEffect(() => {
    if (!ready || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handled.current === key) return;
    handled.current = key;
    const habitId = habitIdFromNotification(response.notification.request.content.data);
    if (habitId) open.current(habitId);
    Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }, [ready, response]);
}
