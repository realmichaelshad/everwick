/**
 * How streaks are worded, in one place. A streak counts check-ins in a row
 * on the habit's own schedule, so its unit depends on the schedule:
 *
 * - every day: "48 days", "48-day streak", "See you tomorrow."
 * - any other schedule (Mon/Wed/Fri): "7 check-ins", "7 in a row",
 *   "See you Monday." (one Friday check-in is followed by Monday, not
 *   Saturday, and 7 workouts span 15 calendar days, not 7).
 *
 * Every screen, toast and spoken label that mentions a streak goes through
 * these helpers. Pure; unit-tested in tests/streakCopy.test.ts.
 */
import { addDays, diffDays, WEEKDAY_LONG, WEEKDAY_SHORT, weekdayOf } from "./dates";
import type { DateKey, Habit } from "./types";

type Scheduled = Pick<Habit, "schedule">;

/** Due every day of the week. */
export function isDaily(habit: Scheduled): boolean {
  return new Set(habit.schedule).size >= 7;
}

/** The streak's unit word: "day"/"days" for daily habits, "check-in"/"check-ins" otherwise. */
export function streakUnit(habit: Scheduled, n: number): string {
  if (isDaily(habit)) return n === 1 ? "day" : "days";
  return n === 1 ? "check-in" : "check-ins";
}

/** "48 days" / "7 check-ins". */
export function streakCount(habit: Scheduled, n: number): string {
  return `${n} ${streakUnit(habit, n)}`;
}

/** "48 days in a row" / "7 check-ins in a row". */
export function inARow(habit: Scheduled, n: number): string {
  return `${streakCount(habit, n)} in a row`;
}

/** The goal in "make it ___": "48 days in a row" / "7 in a row" (short enough for one line). */
export function nextInARow(habit: Scheduled, n: number): string {
  return isDaily(habit) ? `${n} days in a row` : `${n} in a row`;
}

/**
 * The short label for chips and toasts: "48-day streak" / "7 in a row".
 * The no-break space keeps it on one line next to a habit name.
 */
export function streakLabel(habit: Scheduled, n: number): string {
  return isDaily(habit) ? `${n}-day streak` : `${n} in a row`;
}

/** For screen readers: "48 day streak" / "7 check-in streak". */
export function spokenStreak(habit: Scheduled, n: number): string {
  return isDaily(habit) ? `${n} day streak` : `${n} check-in streak`;
}

/** The next scheduled day after `from` (within two weeks), or null when the habit has no days. */
export function nextDueDay(habit: Scheduled, from: DateKey): DateKey | null {
  for (let i = 1; i <= 14; i++) {
    const key = addDays(from, i);
    if (habit.schedule.includes(weekdayOf(key))) return key;
  }
  return null;
}

/** "tomorrow" / "Monday" (the next scheduled day, as a person would say it). */
export function nextDueWord(habit: Scheduled, from: DateKey, style: "long" | "short" = "long"): string | null {
  const next = nextDueDay(habit, from);
  if (!next) return null;
  if (diffDays(from, next) === 1) return "tomorrow";
  return (style === "long" ? WEEKDAY_LONG : WEEKDAY_SHORT)[weekdayOf(next)];
}

/** "See you tomorrow." / "See you Monday." */
export function seeYouLine(habit: Scheduled, from: DateKey): string {
  const word = nextDueWord(habit, from);
  return word ? `See you ${word}.` : "Nice work.";
}

/** What earns a freeze: "Check in 7 days in a row to earn a freeze" / "Check in 7 times in a row to earn a freeze". */
export function freezeGoalLine(habit: Scheduled, every: number): string {
  return isDaily(habit) ? `Check in ${every} days in a row to earn a freeze` : `Check in ${every} times in a row to earn a freeze`;
}

/** What one freeze covers: "one missed day" / "one missed check-in". */
export function freezeCovers(habit: Scheduled, n = 1): string {
  const what = isDaily(habit) ? (n === 1 ? "missed day" : "missed days") : n === 1 ? "missed check-in" : "missed check-ins";
  return `${n === 1 ? "one" : n === 2 ? "two" : n} ${what}`;
}
