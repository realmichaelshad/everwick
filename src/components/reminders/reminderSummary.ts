/**
 * What the Reminders screen shows about the plan: the nudges that ring on a
 * given day (for the day timeline) and the next one to ring. Pure; built on
 * data/reminderPlan.ts so it always matches what the phone schedules.
 * Tested in tests/reminderSummary.test.ts.
 */
import { formatMinutes } from "@/data/dates";
import { planReminders, type PlannedReminder } from "@/data/reminderPlan";
import type { Habit, NotificationSettings, Weekday } from "@/data/types";

export type DayReminderKind = "morning" | "evening" | "review" | "habit";

export interface DayReminder {
  id: string;
  kind: DayReminderKind;
  /** Minutes after midnight. */
  minutes: number;
  /** What the person calls it: the habit name, "Morning nudge", "Evening check-in", "Weekly review". */
  label: string;
  habitId: string | null;
}

const LABELS: Record<Exclude<DayReminderKind, "habit">, string> = {
  morning: "Morning nudge",
  evening: "Evening check-in",
  review: "Weekly review",
};

function toDayReminder(r: PlannedReminder): DayReminder {
  const minutes = r.trigger.hour * 60 + r.trigger.minute;
  if (r.id === "nudge:morning") return { id: r.id, kind: "morning", minutes, label: LABELS.morning, habitId: null };
  if (r.id === "nudge:evening") return { id: r.id, kind: "evening", minutes, label: LABELS.evening, habitId: null };
  if (r.id.startsWith("review:")) return { id: r.id, kind: "review", minutes, label: LABELS.review, habitId: null };
  const habitId = r.id.split(":")[1] ?? null;
  return { id: r.id, kind: "habit", minutes, label: r.title, habitId };
}

const ringsOn = (r: PlannedReminder, weekday: Weekday) => r.trigger.kind === "daily" || r.trigger.weekday === weekday;

/** Every reminder that rings on this weekday, earliest first (habit reminders before nudges at the same minute). */
export function remindersOnDay(habits: Habit[], settings: NotificationSettings, weekday: Weekday): DayReminder[] {
  return planReminders(habits, settings)
    .filter((r) => ringsOn(r, weekday))
    .map(toDayReminder)
    .sort((a, b) => a.minutes - b.minutes || (a.kind === "habit" ? -1 : 0) - (b.kind === "habit" ? -1 : 0));
}

export interface NextReminder {
  reminder: DayReminder;
  /** 0 = later today, 1 = tomorrow, ... */
  inDays: number;
}

/** The next reminder strictly after `now`, looking up to a week ahead. Null when nothing is planned. */
export function nextReminder(habits: Habit[], settings: NotificationSettings, now: Date): NextReminder | null {
  const minuteNow = now.getHours() * 60 + now.getMinutes();
  for (let inDays = 0; inDays <= 7; inDays++) {
    const weekday = ((now.getDay() + inDays) % 7) as Weekday;
    const day = remindersOnDay(habits, settings, weekday);
    const found = inDays === 0 ? day.find((r) => r.minutes > minuteNow) : day[0];
    if (found) return { reminder: found, inDays };
  }
  return null;
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Next: Strength workout at 6:00 PM", "Next: Morning nudge tomorrow at 7:30 AM". */
export function describeNextReminder(next: NextReminder | null, now: Date): string {
  if (!next) return "Nothing planned yet";
  const at = formatMinutes(next.reminder.minutes);
  const when = next.inDays === 0 ? `at ${at}` : next.inDays === 1 ? `tomorrow at ${at}` : `${WEEKDAY_NAMES[(now.getDay() + next.inDays) % 7]} at ${at}`;
  return `Next: ${next.reminder.label} ${when}`;
}

/** "8 reminders today", "1 reminder today", "No reminders today". */
export function describeDayCount(count: number): string {
  if (count === 0) return "No reminders today";
  return `${count} ${count === 1 ? "reminder" : "reminders"} today`;
}

/** Window the day timeline draws: from the earlier of 6 AM or the first reminder, to midnight. */
export function timelineWindow(reminders: readonly DayReminder[]): { start: number; end: number } {
  const first = reminders.length ? reminders[0].minutes : 6 * 60;
  const start = Math.min(6 * 60, Math.floor(first / 60) * 60);
  return { start, end: 24 * 60 };
}

/**
 * Horizontal placement of timeline dots: x in [0, 1] across the window, and
 * a lane (0, 1, 2) so dots closer than `minGap` (as a fraction of the width)
 * stack instead of overlapping. `keepClear` is a spot on the track itself
 * (lane 0) that is already taken, such as the "now" knob: a dot closer to it
 * than `minGap` moves up a lane.
 */
export function layoutTimeline(reminders: readonly DayReminder[], minGap: number, lanes = 3, keepClear?: number): { id: string; x: number; lane: number }[] {
  const { start, end } = timelineWindow(reminders);
  const lastX: number[] = Array.from({ length: lanes }, () => -Infinity);
  const blocked = (x: number, lane: number) => lane === 0 && keepClear !== undefined && Math.abs(x - keepClear) < minGap;
  return reminders.map((r) => {
    const x = Math.min(1, Math.max(0, (r.minutes - start) / (end - start)));
    let lane = lastX.findIndex((lx, i) => x - lx >= minGap && !blocked(x, i));
    if (lane === -1) lane = lastX.indexOf(Math.min(...lastX));
    lastX[lane] = x;
    return { id: r.id, x, lane };
  });
}

/** "6 AM", "Noon", "6 PM", "Midnight": the axis labels both day timelines use. */
export function timelineTickLabel(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  if (m === 0) return "Midnight";
  if (m === 720) return "Noon";
  const h = Math.floor(m / 60);
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
}

/** Ticks every six hours inside [start, end] (6 AM, Noon, 6 PM, Midnight). */
export function timelineTicks(start: number, end: number): number[] {
  const ticks: number[] = [];
  for (let m = Math.ceil(start / 360) * 360; m <= end; m += 360) ticks.push(m);
  return ticks;
}
