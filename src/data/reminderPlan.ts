/**
 * Pure planning for local reminders: which notifications should exist for
 * the current habits and settings. lib/reminders.ts turns the plan into
 * expo-notifications calls on iOS and Android. Unit-tested.
 */
import { addDays, weekdayOf } from "./dates";
import { isDoneOn, isScheduledOn, isSkippedOn, summarizeDay } from "./stats";
import type { DateKey, Habit, History, NotificationSettings, Weekday } from "./types";

export type PlannedTrigger = { kind: "daily"; hour: number; minute: number } | { kind: "weekly"; weekday: Weekday; hour: number; minute: number };

export interface PlannedReminder {
  /** Stable id, e.g. "habit:read:daily" or "habit:strength:1". */
  id: string;
  title: string;
  body: string;
  trigger: PlannedTrigger;
  /** The habit this reminder is for (tapping it opens that habit). */
  habitId?: string;
}

/** iOS keeps at most 64 pending local notifications per app; stay under it. */
export const MAX_SCHEDULED = 60;

export function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { hour: Math.min(23, Math.max(0, h || 0)), minute: Math.min(59, Math.max(0, m || 0)) };
}

export function planReminders(habits: Habit[], settings: NotificationSettings): PlannedReminder[] {
  if (!settings.enabled) return [];
  const out: PlannedReminder[] = [];
  const active = habits.filter((h) => !h.archived && h.reminder).sort((a, b) => a.order - b.order);
  for (const habit of active) {
    const { hour, minute } = parseTime(habit.reminder as string);
    const body = habit.detail ? `${habit.detail}. Tap to check in.` : "Tap to check in.";
    const days = [...new Set(habit.schedule)];
    if (days.length === 7) {
      out.push({ id: `habit:${habit.id}:daily`, title: habit.name, body, trigger: { kind: "daily", hour, minute }, habitId: habit.id });
    } else {
      for (const weekday of days.sort((a, b) => a - b)) {
        out.push({ id: `habit:${habit.id}:${weekday}`, title: habit.name, body, trigger: { kind: "weekly", weekday, hour, minute }, habitId: habit.id });
      }
    }
  }
  const morning = parseTime(settings.morning);
  out.push({ id: "nudge:morning", title: "Good morning", body: "Here's what's on today. Small steps count.", trigger: { kind: "daily", ...morning } });
  const evening = parseTime(settings.evening);
  out.push({
    id: "nudge:evening",
    title: "Evening check-in",
    body: settings.streakSaver ? "How did today go? A minute now keeps your streaks lit." : "How did today go? Check in before bed.",
    trigger: { kind: "daily", ...evening },
  });
  if (settings.weeklyReview) {
    out.push({ id: "review:weekly", title: "Your week in Everwick", body: "See your streaks and what improved this week.", trigger: { kind: "weekly", weekday: 0, hour: 18, minute: 0 } });
  }
  return out.slice(0, MAX_SCHEDULED);
}

/* -------------------------------------------------------------------------- */
/* What the phone actually schedules                                           */
/* -------------------------------------------------------------------------- */

/**
 * One notification request for the phone. Repeating triggers ("daily",
 * "weekly") keep ringing even if the app is never opened again; a "date"
 * trigger rings once.
 */
export interface PhoneReminder {
  /** "habit:read:daily", "habit:read:daily#3" (weekly stand-in), "habit:read:daily@2026-10-30" (one-off). */
  id: string;
  reminderId: string;
  habitId?: string;
  title: string;
  body: string;
  trigger: { kind: "daily"; hour: number; minute: number } | { kind: "weekly"; weekday: Weekday; hour: number; minute: number } | { kind: "date"; day: DateKey; hour: number; minute: number };
}

const ringsOn = (r: PlannedReminder, day: DateKey) => r.trigger.kind === "daily" || r.trigger.weekday === weekdayOf(day);

/**
 * Turns the plan into the phone's notifications, built on repeating triggers
 * so reminders never run out for someone who stops opening the app (the
 * person reminders exist for). Repeating triggers can't skip a single day,
 * so a reminder that would still ring later today but should stay quiet (its
 * habit is already done or skipped, or it's the evening check-in on a day
 * where everything is done) is scheduled around today instead:
 * - a daily reminder becomes weekly ones for the other six weekdays, plus a
 *   one-off for this weekday next week;
 * - a weekly reminder for today's weekday becomes a one-off for next week.
 * The app re-plans after every check-in and on launch, so the stand-ins turn
 * back into plain repeating triggers the next time it runs. Capped under the
 * platform's limit, repeating triggers first.
 */
export function phoneSchedule(plan: PlannedReminder[], habits: Habit[], history: History, today: DateKey, nowMinute: number): PhoneReminder[] {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const todaySummary = summarizeDay(habits, history, today, today);
  const allDoneToday = todaySummary.scheduled > 0 && todaySummary.done === todaySummary.scheduled;
  const todayWeekday = weekdayOf(today);
  const nextWeek = addDays(today, 7);
  const repeating: PhoneReminder[] = [];
  const once: PhoneReminder[] = [];
  for (const r of plan) {
    const { hour, minute } = r.trigger;
    const base = { reminderId: r.id, habitId: r.habitId, title: r.title, body: r.body };
    const habit = r.habitId ? byId.get(r.habitId) : undefined;
    const aheadToday = ringsOn(r, today) && hour * 60 + minute > nowMinute;
    const quietToday =
      aheadToday && ((habit != null && (isDoneOn(habit, history, today) || isSkippedOn(habit, history, today) || !isScheduledOn(habit, today))) || (r.id === "nudge:evening" && allDoneToday));
    if (!quietToday) {
      repeating.push({ ...base, id: r.id, trigger: r.trigger.kind === "daily" ? { kind: "daily", hour, minute } : { kind: "weekly", weekday: r.trigger.weekday, hour, minute } });
      continue;
    }
    if (r.trigger.kind === "daily") {
      for (let d = 0; d < 7; d++) {
        if (d === todayWeekday) continue;
        repeating.push({ ...base, id: `${r.id}#${d}`, trigger: { kind: "weekly", weekday: d as Weekday, hour, minute } });
      }
    }
    once.push({ ...base, id: `${r.id}@${nextWeek}`, trigger: { kind: "date", day: nextWeek, hour, minute } });
  }
  return [...repeating, ...once].slice(0, MAX_SCHEDULED);
}

/** The habit a tapped notification is about, from its data (null for nudges). */
export function habitIdFromNotification(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { habitId?: unknown; reminderId?: unknown };
  if (typeof d.habitId === "string" && d.habitId) return d.habitId;
  if (typeof d.reminderId === "string" && d.reminderId.startsWith("habit:")) return d.reminderId.split(":")[1] || null;
  return null;
}
