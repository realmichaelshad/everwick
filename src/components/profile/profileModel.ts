/**
 * Pure helpers for the Profile screen: the stats summary, the "Day 60 with
 * Everwick" line, name validation and the import confirmation copy.
 * Unit-tested in tests/profileModel.test.ts.
 */
import { formatShortDate } from "@/data/dates";
import { LIMITS } from "@/data/limits";
import type { ImportedData } from "@/data/persist";
import { daysTracked, perfectDays, rollingCompletion, topLiveStreak, totalCompletions, type TopStreak } from "@/data/stats";
import type { DateKey, Habit, History } from "@/data/types";

export interface ProfileStats {
  /** The habit with the longest live streak right now. */
  topStreak: TopStreak | null;
  /** Completed check-ins across all habits, ever. */
  checkins: number;
  /** Days in the last 60 where every due habit was done. */
  perfectDays: number;
  /** Completion over the last 30 days (stats.rollingCompletion: the same number as Progress > Month). */
  rate30: number;
  /** False when nothing was scheduled in that window (show a dash, not 0%). */
  hasRate: boolean;
  /** First day any habit existed. */
  since: DateKey | null;
  /** Day count since the first habit (1 = the first day). */
  day: number;
}

/**
 * `habits` are the active habits (streaks, rates); `allHabits` include
 * archived ones so lifetime check-ins don't shrink when a habit is archived.
 */
export function profileStats(habits: Habit[], allHabits: Habit[], history: History, today: DateKey): ProfileStats {
  const topStreak = topLiveStreak(habits, history, today);
  const rolling = rollingCompletion(habits, history, today, 30);
  const pool = allHabits.length ? allHabits : habits;
  const since = pool.length ? pool.reduce((min, h) => (h.createdAt < min ? h.createdAt : min), pool[0].createdAt) : null;
  return {
    topStreak,
    checkins: totalCompletions(pool, history, today),
    perfectDays: perfectDays(habits, history, today, 60),
    rate30: rolling.current.rate,
    hasRate: rolling.current.scheduled > 0,
    since,
    day: daysTracked(pool, today),
  };
}

/** "Day 60 with Everwick" (or a friendly line for day one and no habits). */
export function memberLine(stats: Pick<ProfileStats, "day">): string {
  if (stats.day <= 0) return "Your first flame is one habit away";
  if (stats.day === 1) return "Day 1 with Everwick";
  return `Day ${stats.day} with Everwick`;
}

/** "Since Aug 25" for the check-ins tile. */
export function sinceLine(since: DateKey | null): string {
  return since ? `since ${formatShortDate(since)}` : "all time";
}

export const NAME_MAX = LIMITS.profileName;

/** Plain-language validation for the name sheet. */
export function nameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Add a name, even a nickname. It's only used for your greeting.";
  if (trimmed.length > NAME_MAX) return `Keep it to ${NAME_MAX} characters or fewer.`;
  return null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Confirmation copy before an import replaces the data on this device. */
export function importSummary(data: Pick<ImportedData, "habits" | "checkins">): string {
  return `${plural(data.habits.length, "habit", "habits")} and ${plural(data.checkins, "check-in", "check-ins")} from this file will replace what's on this device. You can undo right after.`;
}

/** Toast after a successful import. */
export function importedMessage(data: Pick<ImportedData, "habits">): string {
  return `Imported ${plural(data.habits.length, "habit", "habits")}`;
}

/** Percent with no decimals: 0.857 -> "86%". */
export const percent = (rate: number) => `${Math.round(rate * 100)}%`;
