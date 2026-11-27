/**
 * Achievements: five small badges earned from the on-device history.
 * Pure functions over (habits, history, today), unit-tested in
 * tests/achievements.test.ts. Nothing is stored except which unlock
 * animations were already shown (AppState.seenAchievements), so an
 * achievement is always exactly what the history says it is.
 *
 * Rules
 * - streak-7 / streak-30: any habit's streak reached 7 (30) check-ins in a row.
 *   Uses the streak rules from stats.ts: unscheduled and skipped days are
 *   neutral, and a missed day covered by a freeze keeps the run alive.
 * - checkins-100: 100 completed check-ins across all habits.
 * - perfect-week: 7 perfect days in a row, where a perfect day has at least
 *   one habit due and every due habit done. Days with nothing due (rest days,
 *   everything skipped) are neutral: they neither count nor break the run.
 *   Today counts once it is perfect and never breaks the run while it is open.
 * - early-riser: 5 check-ins completed before 7:00 AM (from history.times).
 *
 * `unlockedOn` is the first day the condition became true.
 */
import type { IllustrationSlot } from "@/content/illustrations";

import { rangeKeys } from "./dates";
import { FREEZE_EVERY, isDoneOn, isDueOn, MAX_FREEZES, summarizeDay } from "./stats";
import type { DateKey, Habit, History } from "./types";

export type AchievementId = "streak-7" | "streak-30" | "checkins-100" | "perfect-week" | "early-riser";

export interface AchievementDef {
  id: AchievementId;
  title: string;
  /** What it celebrates, in one sentence. */
  description: string;
  /** How to earn it, in one or two sentences. */
  howTo: string;
  /** Medal art slot (null: the app draws the medal itself). */
  slot: IllustrationSlot | null;
  /** Short mark the app draws on the medal's ribbon pill ("7", "30", "100", "7/7"). */
  mark: string;
  /** A glyph drawn instead of text on the pill (Early riser shows a sunrise). */
  glyph?: "sunrise";
  /** Spoken version of the mark's meaning, used in progress copy ("check-ins in a row"). */
  unit: string;
  target: number;
}

export interface Achievement extends AchievementDef {
  progress: { current: number; target: number };
  unlocked: boolean;
  unlockedOn: DateKey | null;
  /** Habit that earned it first (streak achievements only). */
  earnedWith: { id: string; name: string } | null;
}

/** Check-ins completed before this many minutes after midnight count as early (7:00 AM). */
export const EARLY_BEFORE_MINUTES = 7 * 60;

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "streak-7",
    title: "7-day streak",
    description: "One habit kept alight for a whole week.",
    howTo: "Check in to any habit 7 times in a row. Rest days and skips don't break the run, and a freeze covers a missed day.",
    slot: "badge-streak-7",
    mark: "7",
    unit: "check-ins in a row",
    target: 7,
  },
  {
    id: "streak-30",
    title: "30-day streak",
    description: "A month-long flame. This is how habits become part of you.",
    howTo: "Keep one habit's streak going for 30 check-ins in a row. Freezes you earn along the way cover the odd missed day.",
    slot: "badge-streak-30",
    mark: "30",
    unit: "check-ins in a row",
    target: 30,
  },
  {
    id: "checkins-100",
    title: "100 check-ins",
    description: "A hundred small promises kept.",
    howTo: "Complete 100 check-ins across all your habits. Every finished habit on every day counts once.",
    slot: "badge-checkins-100",
    mark: "100",
    unit: "check-ins",
    target: 100,
  },
  {
    id: "perfect-week",
    title: "Perfect week",
    description: "Every habit, every day, seven days running.",
    howTo: "Finish everything that's due for 7 days in a row. Rest days and skipped habits don't count against you.",
    slot: "badge-perfect-week",
    mark: "7/7",
    unit: "perfect days in a row",
    target: 7,
  },
  {
    id: "early-riser",
    title: "Early riser",
    description: "Habits done while the day is still quiet.",
    howTo: "Complete 5 check-ins before 7:00 AM. Morning habits like meditating or a walk are a great start.",
    slot: null,
    mark: "Before 7 AM",
    glyph: "sunrise",
    unit: "check-ins before 7 AM",
    target: 5,
  },
];

/* -------------------------------------------------------------------------- */
/* Rule helpers                                                                */
/* -------------------------------------------------------------------------- */

export interface StreakMilestone {
  /** Day the run reached the length. */
  day: DateKey;
  habitId: string;
}

/**
 * The first day any habit's run reached `length` check-ins, walking the same
 * rules as stats.streakInfo (neutral rest days and skips, freezes earned every
 * FREEZE_EVERY check-ins and spent on missed past days). Returns null if no
 * run ever got that long.
 */
export function firstStreakMilestone(habits: Habit[], history: History, today: DateKey, length: number): StreakMilestone | null {
  let first: StreakMilestone | null = null;
  for (const habit of habits) {
    if (habit.createdAt > today) continue;
    let run = 0;
    let live = false;
    let bank = 0;
    for (const key of rangeKeys(habit.createdAt, today)) {
      if (first && key >= first.day) break; // can't beat the earliest one found
      if (!isDueOn(habit, history, key)) continue;
      if (isDoneOn(habit, history, key)) {
        live = true;
        run++;
        if (run % FREEZE_EVERY === 0 && bank < MAX_FREEZES) bank++;
        if (run === length) {
          first = { day: key, habitId: habit.id };
          break;
        }
      } else if (key === today) {
        continue;
      } else if (live && bank > 0) {
        bank--;
      } else if (live) {
        live = false;
        run = 0;
      }
    }
  }
  return first;
}

/** Every completed check-in (habit, day) up to today, oldest first. */
export function completedCheckins(habits: Habit[], history: History, today: DateKey): { day: DateKey; habitId: string }[] {
  const out: { day: DateKey; habitId: string }[] = [];
  for (const habit of habits) {
    for (const [key, value] of Object.entries(history.logs[habit.id] ?? {})) {
      if (key <= today && value >= habit.target) out.push({ day: key, habitId: habit.id });
    }
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.habitId < b.habitId ? -1 : 1));
}

/** Check-ins completed before 7:00 AM (time recorded and the day actually done), oldest first. */
export function earlyCheckins(habits: Habit[], history: History, today: DateKey, before = EARLY_BEFORE_MINUTES): { day: DateKey; habitId: string; minutes: number }[] {
  const out: { day: DateKey; habitId: string; minutes: number }[] = [];
  for (const habit of habits) {
    for (const [key, minutes] of Object.entries(history.times?.[habit.id] ?? {})) {
      if (key > today || minutes >= before) continue;
      if (!isDoneOn(habit, history, key)) continue;
      out.push({ day: key, habitId: habit.id, minutes });
    }
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.minutes - b.minutes));
}

export interface PerfectRun {
  /** Perfect days in the run that is still unbroken today. */
  current: number;
  /** Longest run of perfect days. */
  best: number;
  /** First day any run reached `length` perfect days (null if never). */
  reachedOn: DateKey | null;
}

/** Runs of perfect days from the first habit's start to today (see the rules at the top). */
export function perfectDayRuns(habits: Habit[], history: History, today: DateKey, length = 7): PerfectRun {
  const live = habits.filter((h) => !h.archived);
  if (!live.length) return { current: 0, best: 0, reachedOn: null };
  const start = live.reduce((min, h) => (h.createdAt < min ? h.createdAt : min), live[0].createdAt);
  if (start > today) return { current: 0, best: 0, reachedOn: null };
  let run = 0;
  let best = 0;
  let reachedOn: DateKey | null = null;
  for (const key of rangeKeys(start, today)) {
    const s = summarizeDay(live, history, key, today);
    if (s.scheduled === 0) continue; // nothing due: neutral
    if (s.done === s.scheduled) {
      run++;
      best = Math.max(best, run);
      if (run === length && !reachedOn) reachedOn = key;
    } else if (key !== today) {
      run = 0;
    }
  }
  return { current: run, best, reachedOn };
}

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                  */
/* -------------------------------------------------------------------------- */

/** The live streak of the habit with the longest one right now (for locked streak progress). */
function longestLiveRun(habits: Habit[], history: History, today: DateKey): number {
  let longest = 0;
  for (const habit of habits) {
    if (habit.archived || habit.createdAt > today) continue;
    let run = 0;
    let live = false;
    let bank = 0;
    for (const key of rangeKeys(habit.createdAt, today)) {
      if (!isDueOn(habit, history, key)) continue;
      if (isDoneOn(habit, history, key)) {
        live = true;
        run++;
        if (run % FREEZE_EVERY === 0 && bank < MAX_FREEZES) bank++;
      } else if (key === today) {
        continue;
      } else if (live && bank > 0) {
        bank--;
      } else if (live) {
        live = false;
        run = 0;
      }
    }
    longest = Math.max(longest, run);
  }
  return longest;
}

/**
 * Evaluates every achievement. Locked progress shows the distance that is
 * actually left: for streaks and the perfect week that is the live run (an
 * old run that ended can't grow any more), for counts the running total.
 */
export function evaluateAchievements(habits: Habit[], history: History, today: DateKey): Achievement[] {
  const names = new Map(habits.map((h) => [h.id, h.name]));
  const liveRun = longestLiveRun(habits, history, today);
  const checkins = completedCheckins(habits, history, today);
  const early = earlyCheckins(habits, history, today);
  const perfect = perfectDayRuns(habits, history, today, 7);

  return ACHIEVEMENTS.map((def): Achievement => {
    let unlockedOn: DateKey | null = null;
    let current = 0;
    let earnedWith: Achievement["earnedWith"] = null;
    switch (def.id) {
      case "streak-7":
      case "streak-30": {
        const milestone = firstStreakMilestone(habits, history, today, def.target);
        unlockedOn = milestone?.day ?? null;
        current = milestone ? def.target : liveRun;
        if (milestone) earnedWith = { id: milestone.habitId, name: names.get(milestone.habitId) ?? "A habit" };
        break;
      }
      case "checkins-100":
        current = checkins.length;
        unlockedOn = checkins.length >= def.target ? checkins[def.target - 1].day : null;
        break;
      case "perfect-week":
        unlockedOn = perfect.reachedOn;
        current = perfect.reachedOn ? def.target : perfect.current;
        break;
      case "early-riser":
        current = early.length;
        unlockedOn = early.length >= def.target ? early[def.target - 1].day : null;
        break;
    }
    const unlocked = unlockedOn !== null;
    return {
      ...def,
      progress: { current: Math.min(def.target, unlocked ? def.target : current), target: def.target },
      unlocked,
      unlockedOn,
      earnedWith,
    };
  });
}

/** Unlocked achievements whose unlock animation hasn't been shown yet. */
export function newlyUnlocked(achievements: Achievement[], seen: readonly string[]): Achievement[] {
  const set = new Set(seen);
  return achievements.filter((a) => a.unlocked && !set.has(a.id));
}

/** The locked achievement closest to unlocking (highest progress share; ties keep list order). */
export function nextAchievement(achievements: Achievement[]): Achievement | null {
  let next: Achievement | null = null;
  for (const a of achievements) {
    if (a.unlocked) continue;
    const share = a.progress.current / a.progress.target;
    if (!next || share > next.progress.current / next.progress.target) next = a;
  }
  return next;
}

/** "3 of 7 check-ins in a row" style progress line. */
export function describeProgress(a: Achievement): string {
  return `${a.progress.current} of ${a.progress.target} ${a.unit}`;
}
