/**
 * Pure helpers behind check-ins on Today and habit detail: what a tap or
 * swipe does to a habit, every check-in toast's copy, and merging a
 * reordered list back into the full order. No React Native imports;
 * unit-tested in tests/todayModel.test.ts. The hook that runs the actions
 * (components/habit/useDayActions.ts) uses these, so both screens say the
 * same thing.
 */
import { formatShortDate } from "@/data/dates";
import { streakLabel } from "@/data/streakCopy";
import type { DateKey, Habit } from "@/data/types";

export type CheckInMode = "tap" | "complete";

export interface CheckInState {
  value: number;
  done: boolean;
  skipped: boolean;
}

/**
 * The value after a tap or a swipe right:
 * - done: back to 0 (mark not done);
 * - a target habit tapped: one more unit (5 -> 6 of 8 glasses);
 * - a swipe (or a simple habit, or a skipped day): straight to the target.
 */
export function nextCheckInValue(habit: Pick<Habit, "target">, current: CheckInState, mode: CheckInMode): number {
  if (current.done) return 0;
  const stepwise = habit.target > 1 && mode === "tap" && !current.skipped;
  return stepwise ? Math.min(habit.target, current.value + 1) : habit.target;
}

/** " for Oct 19" when the change is for another day than today (empty for today). */
export function forDay(day: DateKey, today: DateKey): string {
  return day === today ? "" : ` for ${formatShortDate(day)}`;
}

/**
 * Toast after a check-in, one line: "Drink water · 48-day streak",
 * "Strength workout · 7 in a row", or "Read 20 minutes checked in" (with
 * " for Oct 19" for a late check-in). `streak` is null when the check-in
 * doesn't lengthen the live streak.
 */
export function checkInMessage(habit: Pick<Habit, "name" | "schedule">, streak: number | null, day: DateKey, today: DateKey): string {
  if (streak && streak > 1) return day === today ? `${habit.name} · ${streakLabel(habit, streak)}` : `${habit.name}${forDay(day, today)} · ${streakLabel(habit, streak)}`;
  return `${habit.name} checked in${forDay(day, today)}`;
}

/** Toast when the last open habit of today is done (replaces the check-in toast). */
export function perfectDayMessage(count: number): string {
  return count === 1 ? "Perfect day. Your habit is done" : `Perfect day. All ${count} habits done`;
}

/** "Walk 8k steps skipped · streak safe" / "Walk 8k steps skipped for Oct 19". */
export function skipMessage(name: string, day: DateKey, today: DateKey): string {
  return day === today ? `${name} skipped · streak safe` : `${name} skipped${forDay(day, today)}`;
}

export function unskipMessage(name: string, day: DateKey, today: DateKey): string {
  return `${name} is back on for ${day === today ? "today" : formatShortDate(day)}`;
}

export function clearMessage(name: string, day: DateKey, today: DateKey): string {
  return `${name}: check-in removed${forDay(day, today)}`;
}

/**
 * The day card's "what's left" sentence, built to fit (about two lines of
 * the card) instead of being cut off with an ellipsis: the richest form that
 * is at most `max` characters wins.
 *   ["Read 20 minutes"] -> "Read 20 minutes is still open."
 *   ["Walk", "Read"] -> "Walk and Read are still open."
 *   ["Read 20 minutes", "No phone after 10pm"] -> "Read 20 minutes and 1 more are still open."
 */
export function openHabitsLine(names: readonly string[], max = 48): string {
  const n = names.length;
  if (n === 0) return "Nothing left to check in.";
  const join = (list: readonly string[]) => (list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);
  const candidates =
    n === 1
      ? [`${names[0]} is still open.`]
      : [`${join(names)} are still open.`, ...(n > 2 ? [`${names[0]}, ${names[1]} and ${n - 2} more are still open.`] : []), `${names[0]} and ${n - 1} more are still open.`];
  return candidates.find((c) => c.length <= max) ?? `${n} habits are still open.`;
}

/**
 * Puts a reordered subset back into the full order: habits that weren't
 * shown (resting that day) keep their slots, the shown ones fill the rest in
 * their new order. mergeOrder(["a","b","c","d"], ["d","b"]) -> ["a","d","c","b"].
 */
export function mergeOrder(allIds: readonly string[], visibleIds: readonly string[]): string[] {
  const visible = new Set(visibleIds);
  let k = 0;
  return allIds.map((id) => (visible.has(id) ? visibleIds[k++] : id));
}

/** Swaps an item with its neighbour (Move up / Move down). Returns null at the ends. */
export function moveId(ids: readonly string[], id: string, delta: -1 | 1): string[] | null {
  const index = ids.indexOf(id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  const next = ids.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
