/**
 * Habit statistics: streaks (with skips and streak freezes), completion
 * rates, chart series and heatmap buckets. Pure functions over
 * (habits, history, today) so every screen computes the same numbers and
 * everything is unit-tested. `history` is anything with `logs` and optional
 * `skips`; AppState qualifies, so screens pass `state` directly.
 */
import {
  addDays,
  diffDays,
  fromKey,
  lastNDays,
  MONTH_SHORT,
  orderedWeekdays,
  rangeKeys,
  startOfWeek,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  weekdayOf,
} from "./dates";
import type { DateKey, Habit, History, Weekday } from "./types";

/* -------------------------------------------------------------------------- */
/* Single habit, single day                                                    */
/* -------------------------------------------------------------------------- */

/** On the habit's schedule: weekday is in the schedule and the habit existed. */
export function isScheduledOn(habit: Habit, key: DateKey): boolean {
  if (key < habit.createdAt) return false;
  return habit.schedule.includes(weekdayOf(key));
}

export function isSkippedOn(habit: Habit, history: History, key: DateKey): boolean {
  return history.skips?.[habit.id]?.[key] === true;
}

/** Due on this day: scheduled and not skipped. Only due days count toward rates and streaks. */
export function isDueOn(habit: Habit, history: History, key: DateKey): boolean {
  return isScheduledOn(habit, key) && !isSkippedOn(habit, history, key);
}

export function valueOn(habit: Habit, history: History, key: DateKey): number {
  return history.logs[habit.id]?.[key] ?? 0;
}

export function isDoneOn(habit: Habit, history: History, key: DateKey): boolean {
  return valueOn(habit, history, key) >= habit.target;
}

/** 0..1 progress for the day (5 of 8 glasses = 0.625). */
export function fractionOn(habit: Habit, history: History, key: DateKey): number {
  return Math.min(1, valueOn(habit, history, key) / Math.max(1, habit.target));
}

/** Minutes after midnight when the day was completed, or null. */
export function checkinTimeOn(habit: Habit, history: History, key: DateKey): number | null {
  return history.times?.[habit.id]?.[key] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Streaks and streak freezes                                                  */
/* -------------------------------------------------------------------------- */

/** A freeze is earned every time a streak reaches a multiple of this many check-ins. */
export const FREEZE_EVERY = 7;
/** Most freezes a habit can hold at once. */
export const MAX_FREEZES = 2;

export interface StreakRun {
  /** Completed due days in the run (frozen days bridge a run but do not add to it). */
  length: number;
  start: DateKey | null;
  end: DateKey | null;
}

export interface StreakInfo {
  /** Live streak: check-ins in the run that is still unbroken today (0 if none). */
  current: number;
  /** First day of the live streak. */
  currentStart: DateKey | null;
  /** Longest run ever. */
  best: StreakRun;
  /** Every run, oldest first (the live one last, if any). */
  runs: StreakRun[];
  /** Freezes held right now (0..MAX_FREEZES). */
  freezes: number;
  /** Missed due days that a freeze covered, oldest first. */
  frozen: DateKey[];
  /** Check-ins needed for the next freeze (null when the bank is full or no streak is live). */
  nextFreezeIn: number | null;
}

/**
 * Walks the habit's history oldest first.
 *
 * Rules (unit-tested in tests/streaks.test.ts):
 * - Unscheduled and skipped days are neutral: they neither extend nor break a streak.
 * - A completed due day extends the run. Each time the run reaches a multiple of
 *   FREEZE_EVERY check-ins, one freeze is earned (the bank holds at most MAX_FREEZES).
 * - A missed due day in the past spends a freeze if one is held and a run is live
 *   (the day is "frozen" and the run survives); otherwise the run ends.
 * - Today is still open: done counts, not done yet changes nothing.
 * - Earned freezes are kept when a streak breaks.
 */
export function streakInfo(habit: Habit, history: History, today: DateKey): StreakInfo {
  const runs: StreakRun[] = [];
  const frozen: DateKey[] = [];
  let run: StreakRun | null = null;
  let bank = 0;
  if (habit.createdAt <= today) {
    for (const key of rangeKeys(habit.createdAt, today)) {
      if (!isDueOn(habit, history, key)) continue;
      if (isDoneOn(habit, history, key)) {
        if (!run) run = { length: 0, start: key, end: key };
        run.length++;
        run.end = key;
        if (run.length % FREEZE_EVERY === 0 && bank < MAX_FREEZES) bank++;
      } else if (key === today) {
        continue;
      } else if (run && bank > 0) {
        bank--;
        frozen.push(key);
      } else if (run) {
        runs.push(run);
        run = null;
      }
    }
  }
  if (run) runs.push(run);
  const best = runs.reduce<StreakRun>((b, r) => (r.length > b.length ? r : b), { length: 0, start: null, end: null });
  const current = run ? run.length : 0;
  return {
    current,
    currentStart: run ? run.start : null,
    best,
    runs,
    freezes: bank,
    frozen,
    nextFreezeIn: run && bank < MAX_FREEZES ? FREEZE_EVERY - (run.length % FREEZE_EVERY) : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Days across habits                                                          */
/* -------------------------------------------------------------------------- */

export interface DaySummary {
  key: DateKey;
  /** Habits due that day (scheduled and not skipped). */
  scheduled: number;
  done: number;
  /** Scheduled habits the user skipped that day. */
  skipped: number;
  /** done / scheduled (0 when nothing was scheduled). */
  rate: number;
  /** Average partial progress across scheduled habits (drives the daily ring). */
  fraction: number;
  /** True for days after today. */
  future: boolean;
}

export function summarizeDay(habits: Habit[], history: History, key: DateKey, today: DateKey): DaySummary {
  const live = habits.filter((h) => !h.archived);
  const active = live.filter((h) => isDueOn(h, history, key));
  const skipped = live.filter((h) => isScheduledOn(h, key) && isSkippedOn(h, history, key)).length;
  const done = active.filter((h) => isDoneOn(h, history, key)).length;
  const fraction = active.length ? active.reduce((sum, h) => sum + fractionOn(h, history, key), 0) / active.length : 0;
  return {
    key,
    scheduled: active.length,
    done,
    skipped,
    rate: active.length ? done / active.length : 0,
    fraction,
    future: key > today,
  };
}

/* -------------------------------------------------------------------------- */
/* Completion over a period (one rule for every screen)                        */
/* -------------------------------------------------------------------------- */

export interface PeriodStats {
  /** Due habit-days counted (today: only the ones already done). */
  scheduled: number;
  /** Check-ins (completed due habit-days). */
  done: number;
  /** done / scheduled, 0 when nothing was due. */
  rate: number;
  /** Days where every due habit was done (today only once it is complete). */
  perfectDays: number;
  /** Days in the window up to today. */
  elapsed: number;
}

/**
 * Completion over [start, end]. The one rule every screen uses: future days
 * are ignored, and today is still open, so a habit not done yet today is
 * left out instead of counting as a miss (an evening visit never shows a
 * worse number than the morning one). Archived habits are ignored.
 */
export function periodStats(habits: Habit[], history: History, today: DateKey, start: DateKey, end: DateKey): PeriodStats {
  const active = habits.filter((h) => !h.archived);
  const last = end > today ? today : end;
  let scheduled = 0;
  let done = 0;
  let perfect = 0;
  let elapsed = 0;
  if (start <= last) {
    for (const key of rangeKeys(start, last)) {
      elapsed++;
      let dayDue = 0;
      let dayDone = 0;
      for (const h of active) {
        if (!isDueOn(h, history, key)) continue;
        dayDue++;
        const isDone = isDoneOn(h, history, key);
        if (isDone) dayDone++;
        if (key === today && !isDone) continue;
        scheduled++;
        if (isDone) done++;
      }
      if (dayDue > 0 && dayDone === dayDue) perfect++;
    }
  }
  return { scheduled, done, rate: scheduled ? done / scheduled : 0, perfectDays: perfect, elapsed };
}

/** Completed / due habit-days in [start, end] (same rule as periodStats). */
export function completionRate(habits: Habit[], history: History, start: DateKey, end: DateKey, today: DateKey): number {
  return periodStats(habits, history, today, start, end).rate;
}

/** Whole percentage points between two rates, from the rounded percentages people see (80% vs 64% = 16). */
export function ratePoints(current: number, previous: number): number {
  return Math.round(current * 100) - Math.round(previous * 100);
}

export interface RollingCompletion {
  days: number;
  /** The last `days` days, ending today. */
  current: PeriodStats;
  /** The `days` days before that. */
  previous: PeriodStats;
  start: DateKey;
  prevStart: DateKey;
  prevEnd: DateKey;
  /** Points between the two rates as shown (null when the previous window had nothing due). */
  points: number | null;
}

/**
 * "Completion over the last 30 days" and its comparison window. Progress
 * (Month tile and chart), the trend insight and Profile all read this one
 * function, so the same number appears everywhere.
 */
export function rollingCompletion(habits: Habit[], history: History, today: DateKey, days = 30): RollingCompletion {
  const start = addDays(today, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  const current = periodStats(habits, history, today, start, today);
  const previous = periodStats(habits, history, today, prevStart, prevEnd);
  return { days, current, previous, start, prevStart, prevEnd, points: previous.scheduled ? ratePoints(current.rate, previous.rate) : null };
}

export interface TopStreak {
  habitId: string;
  name: string;
  current: number;
  freezes: number;
  /** The habit's schedule, so the streak is worded in its own unit (data/streakCopy). */
  schedule: Weekday[];
}

/** The longest live streak across habits (ties: more freezes, then list order). Null when no streak is live. */
export function topLiveStreak(habits: Habit[], history: History, today: DateKey): TopStreak | null {
  let top: TopStreak | null = null;
  for (const h of [...habits].filter((x) => !x.archived).sort((a, b) => a.order - b.order)) {
    const info = streakInfo(h, history, today);
    if (info.current <= 0) continue;
    if (!top || info.current > top.current || (info.current === top.current && info.freezes > top.freezes)) {
      top = { habitId: h.id, name: h.name, current: info.current, freezes: info.freezes, schedule: h.schedule };
    }
  }
  return top;
}

/* -------------------------------------------------------------------------- */
/* Chart series                                                                */
/* -------------------------------------------------------------------------- */

export interface Bar {
  key: DateKey;
  /** Axis label: "M" .. "S" for weeks, "Oct 6" style for months. */
  label: string;
  rate: number;
  scheduled: number;
  done: number;
  future: boolean;
  isToday: boolean;
}

/** The current week (7 bars, weekStartsOn first). Future days have rate 0 and future=true. */
export function weekSeries(habits: Habit[], history: History, today: DateKey, weekStartsOn: 0 | 1 = 1): Bar[] {
  const start = startOfWeek(today, weekStartsOn);
  return rangeKeys(start, addDays(start, 6)).map((key) => {
    const s = summarizeDay(habits, history, key, today);
    return {
      key,
      label: WEEKDAY_SHORT[weekdayOf(key)].slice(0, 1),
      rate: s.future ? 0 : s.rate,
      scheduled: s.scheduled,
      done: s.future ? 0 : s.done,
      future: s.future,
      isToday: key === today,
    };
  });
}

/** One bar per day for the last `days` days (default 30), oldest first. */
export function dailySeries(habits: Habit[], history: History, today: DateKey, days = 30): Bar[] {
  return lastNDays(today, days).map((key) => {
    const s = summarizeDay(habits, history, key, today);
    const d = fromKey(key);
    return {
      key,
      label: `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`,
      rate: s.rate,
      scheduled: s.scheduled,
      done: s.done,
      future: false,
      isToday: key === today,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Heatmap                                                                     */
/* -------------------------------------------------------------------------- */

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatCell {
  key: DateKey;
  rate: number;
  level: HeatLevel;
  /** Nothing scheduled that day (or before history starts). */
  empty: boolean;
  future: boolean;
}

export interface Heatmap {
  /** columns[week][dayIndex], dayIndex 0 = weekStartsOn. */
  columns: HeatCell[][];
  /** Month labels positioned at the first column whose week starts in that month. */
  months: { column: number; label: string }[];
  start: DateKey;
  end: DateKey;
}

/** Bucket a completion rate into 5 heat levels (0 = none, 4 = all done). */
export function heatLevel(rate: number): HeatLevel {
  if (rate <= 0) return 0;
  if (rate >= 1) return 4;
  if (rate >= 0.67) return 3;
  if (rate >= 0.34) return 2;
  return 1;
}

/**
 * GitHub-style grid for the last `weeks` weeks (default 13, about 3 months),
 * ending with the current week. Optionally for a single habit.
 */
export function heatmap(
  habits: Habit[],
  history: History,
  today: DateKey,
  options: { weeks?: number; weekStartsOn?: 0 | 1 } = {},
): Heatmap {
  const weeks = options.weeks ?? 13;
  const weekStartsOn = options.weekStartsOn ?? 1;
  const lastWeekStart = startOfWeek(today, weekStartsOn);
  const start = addDays(lastWeekStart, -7 * (weeks - 1));
  const columns: HeatCell[][] = [];
  const months: { column: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(start, w * 7);
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(weekStart, d);
      const s = summarizeDay(habits, history, key, today);
      column.push({
        key,
        rate: s.future ? 0 : s.rate,
        level: s.future ? 0 : heatLevel(s.rate),
        empty: s.scheduled === 0,
        future: s.future,
      });
    }
    // Label a month at the first column that contains its 1st..7th day.
    const month = fromKey(weekStart).getMonth();
    const firstOfMonthInWeek = column.find((c) => fromKey(c.key).getDate() === 1);
    const labelMonth = firstOfMonthInWeek ? fromKey(firstOfMonthInWeek.key).getMonth() : w === 0 ? month : -1;
    if (labelMonth !== -1 && labelMonth !== lastMonth) {
      months.push({ column: w, label: MONTH_SHORT[labelMonth] });
      lastMonth = labelMonth;
    }
    columns.push(column);
  }
  return { columns, months, start, end: addDays(start, weeks * 7 - 1) };
}

/* -------------------------------------------------------------------------- */
/* Insights                                                                    */
/* -------------------------------------------------------------------------- */

export interface WeekdayStat {
  weekday: Weekday;
  label: string;
  rate: number;
  scheduled: number;
}

/** Completion rate per weekday over the last `days` days (today excluded while open). */
export function weekdayConsistency(habits: Habit[], history: History, today: DateKey, days = 60, weekStartsOn: 0 | 1 = 1): WeekdayStat[] {
  const totals = new Map<Weekday, { scheduled: number; done: number }>();
  for (const key of lastNDays(addDays(today, -1), days)) {
    const s = summarizeDay(habits, history, key, today);
    const wd = weekdayOf(key);
    const t = totals.get(wd) ?? { scheduled: 0, done: 0 };
    t.scheduled += s.scheduled;
    t.done += s.done;
    totals.set(wd, t);
  }
  return orderedWeekdays(weekStartsOn).map((wd) => {
    const t = totals.get(wd) ?? { scheduled: 0, done: 0 };
    return { weekday: wd, label: WEEKDAY_LONG[wd], rate: t.scheduled ? t.done / t.scheduled : 0, scheduled: t.scheduled };
  });
}

/** Days where every scheduled habit was done, in the last `days` days. */
export function perfectDays(habits: Habit[], history: History, today: DateKey, days = 60): number {
  return lastNDays(today, days).filter((key) => {
    const s = summarizeDay(habits, history, key, today);
    return s.scheduled > 0 && s.done === s.scheduled;
  }).length;
}

/** Completed days for one habit since it started (up to today). The habit detail "Check-ins" tile. */
export function habitCheckins(habit: Habit, history: History, today: DateKey): number {
  let n = 0;
  for (const [key, value] of Object.entries(history.logs[habit.id] ?? {})) {
    if (key <= today && key >= habit.createdAt && value >= habit.target) n++;
  }
  return n;
}

/** Total completed habit-days across all history: the sum of every habit's own count (habitCheckins). */
export function totalCompletions(habits: Habit[], history: History, today: DateKey): number {
  return habits.reduce((sum, h) => sum + habitCheckins(h, history, today), 0);
}

/**
 * A habit's usual check-in time: the median of its timed check-ins over the
 * last `days` days, rounded to 5 minutes so it reads as a habit rather than
 * a timestamp. Null with fewer than 3. Habit detail ("You usually check in
 * around 12:45 PM") and the Progress rhythm card both use this, so the two
 * screens always show the same time.
 */
export const USUAL_TIME_DAYS = 60;
export function usualCheckinTime(habit: Habit, history: History, today: DateKey, days = USUAL_TIME_DAYS): number | null {
  const times: number[] = [];
  for (const key of lastNDays(today, days)) {
    const t = checkinTimeOn(habit, history, key);
    if (t != null && Number.isFinite(t) && isDoneOn(habit, history, key)) times.push(t);
  }
  if (times.length < 3) return null;
  times.sort((a, b) => a - b);
  const mid = Math.floor(times.length / 2);
  const median = times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  return roundToFive(median);
}

/** Rounds minutes after midnight to the nearest 5 (wrapping at midnight). */
export function roundToFive(minutes: number): number {
  return (Math.round(minutes / 5) * 5) % 1440;
}

/** Days since the first habit was created (for "Day 60 with Everwick"). */
export function daysTracked(habits: Habit[], today: DateKey): number {
  if (!habits.length) return 0;
  const first = habits.reduce((min, h) => (h.createdAt < min ? h.createdAt : min), habits[0].createdAt);
  return Math.max(0, diffDays(first, today) + 1);
}

export const pct = (rate: number) => `${Math.round(rate * 100)}%`;
