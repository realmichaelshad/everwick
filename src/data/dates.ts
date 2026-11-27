/**
 * Calendar-day helpers. Everything is keyed by local "YYYY-MM-DD" strings and
 * computed at local noon so daylight-saving shifts never skip or repeat a day.
 * Pure functions, no React Native imports (unit-tested with vitest).
 */
import type { DateKey, Weekday } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a DateKey to a Date at local noon. */
export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

export function weekdayOf(key: DateKey): Weekday {
  return fromKey(key).getDay() as Weekday;
}

/** Whole days from a to b (b - a). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

/** First day of the week containing `key`. weekStartsOn 1 = Monday. */
export function startOfWeek(key: DateKey, weekStartsOn: 0 | 1 = 1): DateKey {
  const wd = weekdayOf(key);
  const back = (wd - weekStartsOn + 7) % 7;
  return addDays(key, -back);
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function daysInMonth(key: DateKey): number {
  const d = fromKey(key);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Inclusive list of keys from start to end. */
export function rangeKeys(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const n = diffDays(start, end);
  for (let i = 0; i <= n; i++) out.push(addDays(start, i));
  return out;
}

/** The last `count` days ending at `end` (inclusive), oldest first. */
export function lastNDays(end: DateKey, count: number): DateKey[] {
  return rangeKeys(addDays(end, -(count - 1)), end);
}

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Weekdays in display order for a given week start. */
export function orderedWeekdays(weekStartsOn: 0 | 1 = 1): Weekday[] {
  return Array.from({ length: 7 }, (_, i) => ((i + weekStartsOn) % 7) as Weekday);
}

/** "Thursday, Oct 23" */
export function formatLongDate(key: DateKey): string {
  const d = fromKey(key);
  return `${WEEKDAY_LONG[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Oct 23" */
export function formatShortDate(key: DateKey): string {
  const d = fromKey(key);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Morning" | "Afternoon" | "Evening" for a clock hour. */
export function partOfDay(hour: number): "morning" | "afternoon" | "evening" {
  if (hour >= 4 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/** "07:30" -> "7:30 AM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** Minutes after midnight -> "7:25 AM" (check-in times, best time of day). */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return formatTime(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
}

/** Minutes after midnight -> "morning" | "afternoon" | "evening". */
export function partOfDayForMinutes(minutes: number): "morning" | "afternoon" | "evening" {
  return partOfDay(Math.floor(minutes / 60));
}

/** "Mon, Oct 19" */
export function formatMediumDate(key: DateKey): string {
  const d = fromKey(key);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Steps an "HH:MM" time to the next (+1) or previous (-1) multiple of `step`
 * minutes, wrapping around midnight. 07:03 +5 -> 07:05, 07:03 -5 -> 07:00.
 */
export function stepTime(hhmm: string, direction: 1 | -1, step = 5): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  const next = direction === 1 ? Math.floor(total / step) * step + step : Math.ceil(total / step) * step - step;
  const wrapped = ((next % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}
