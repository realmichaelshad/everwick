/**
 * Web build of lib/reminders: browsers don't get scheduled local
 * notifications here, so every call resolves to "unsupported" / 0 and the UI
 * explains that reminders ring on the phone. Same API as reminders.ts
 * (Metro picks this file for web), and expo-notifications is never loaded.
 *
 * Phone preview: inside the showcase phone frame (?device=1, see
 * lib/launchFlags) the web build stands in for the phone app, so it answers
 * like a phone where notifications are allowed and counts the reminders the
 * phone would schedule. Screens then show the copy people see on their
 * phone. Nothing is scheduled and nothing rings.
 */
import { phoneSchedule, planReminders } from "@/data/reminderPlan";
import type { Habit, History, NotificationSettings } from "@/data/types";
import { now, todayKey } from "@/lib/clock";
import { launchFlags } from "@/lib/launchFlags";

export type ReminderPermission = "granted" | "denied" | "undetermined" | "unsupported";

const phonePreview = launchFlags().device;

/** False on the web, except in the phone preview, which behaves like a phone with notifications allowed. */
export const remindersSupported = phonePreview;

/** How many reminders the phone preview would have scheduled after the last sync. */
let previewCount = 0;

export async function getReminderPermission(): Promise<ReminderPermission> {
  return phonePreview ? "granted" : "unsupported";
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  return phonePreview ? "granted" : "unsupported";
}

export async function syncReminders(habits: Habit[], settings: NotificationSettings, history: History = { logs: {} }): Promise<number> {
  if (!phonePreview) return 0;
  const d = now();
  previewCount = phoneSchedule(planReminders(habits, settings), habits, history, todayKey(), d.getHours() * 60 + d.getMinutes()).length;
  return previewCount;
}

/** Notifications never fire on the web, so there is nothing to route. */
export function useReminderTaps(_onOpenHabit: (habitId: string) => void, _ready = true): void {}

export async function scheduledReminderCount(): Promise<number> {
  return phonePreview ? previewCount : 0;
}
