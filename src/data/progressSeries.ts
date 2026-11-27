/**
 * Pure helpers behind the Progress tab: the Week/Month window, period stats
 * for the summary tiles, the bar chart model (with stable slots so bars can
 * morph between Week and Month), spoken chart labels, the per-day breakdown
 * shown when a heatmap cell is tapped, and the best-streak board.
 *
 * No React Native imports; unit-tested in tests/progressSeries.test.ts.
 * Today is still open everywhere: habits not done yet today are left out of
 * rates (stats.periodStats), so an evening visit never shows a worse number
 * than the morning one. The Month window is stats.rollingCompletion, the same
 * function the trend insight and Profile read, so "last 30 days" is one number.
 */
import { addDays, formatMediumDate, fromKey, MONTH_SHORT, startOfWeek, WEEKDAY_LONG, weekdayOf } from "./dates";
import {
  checkinTimeOn,
  dailySeries,
  isDoneOn,
  isScheduledOn,
  isSkippedOn,
  periodStats,
  ratePoints,
  rollingCompletion,
  streakInfo,
  summarizeDay,
  topLiveStreak,
  valueOn,
  weekSeries,
  type Bar,
  type DaySummary,
  type PeriodStats,
  type StreakRun,
  type TopStreak,
} from "./stats";
import type { DateKey, Habit, History } from "./types";

export type ProgressRange = "week" | "month";

/** Days in the Month view (one slim bar per day). */
export const MONTH_DAYS = 30;

const live = (habits: Habit[]) => habits.filter((h) => !h.archived);

/* -------------------------------------------------------------------------- */
/* Window                                                                      */
/* -------------------------------------------------------------------------- */

export interface RangeWindow {
  range: ProgressRange;
  start: DateKey;
  end: DateKey;
  /** The comparison period of the same length just before. */
  prevStart: DateKey;
  prevEnd: DateKey;
  /** Overline text: "Oct 19 – 25" or "Last 30 days". */
  label: string;
  /** For sentences: "this week" or "the last 30 days". */
  spoken: string;
  /** For the comparison badge: "last week" or "the 30 days before". */
  previousLabel: string;
}

/** "Oct 19 – 25", "Sep 28 – Oct 4". */
export function formatRange(start: DateKey, end: DateKey): string {
  const a = fromKey(start);
  const b = fromKey(end);
  const left = `${MONTH_SHORT[a.getMonth()]} ${a.getDate()}`;
  if (a.getFullYear() !== b.getFullYear()) return `${left}, ${a.getFullYear()} – ${MONTH_SHORT[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
  if (a.getMonth() === b.getMonth()) return `${left} – ${b.getDate()}`;
  return `${left} – ${MONTH_SHORT[b.getMonth()]} ${b.getDate()}`;
}

export function rangeWindow(today: DateKey, range: ProgressRange, weekStartsOn: 0 | 1 = 1): RangeWindow {
  if (range === "week") {
    const start = startOfWeek(today, weekStartsOn);
    const end = addDays(start, 6);
    return {
      range,
      start,
      end,
      prevStart: addDays(start, -7),
      prevEnd: addDays(start, -1),
      label: formatRange(start, end),
      spoken: "this week",
      previousLabel: "last week",
    };
  }
  const start = addDays(today, -(MONTH_DAYS - 1));
  return {
    range,
    start,
    end: today,
    prevStart: addDays(start, -MONTH_DAYS),
    prevEnd: addDays(start, -1),
    label: `Last ${MONTH_DAYS} days`,
    spoken: `the last ${MONTH_DAYS} days`,
    previousLabel: `the ${MONTH_DAYS} days before`,
  };
}

/* -------------------------------------------------------------------------- */
/* Period stats (summary tiles)                                                */
/* -------------------------------------------------------------------------- */

// The rules live in stats.ts so every screen shares them.
export { periodStats };
export type { PeriodStats, TopStreak };

export interface ProgressSummary {
  window: RangeWindow;
  current: PeriodStats;
  previous: PeriodStats;
  /** Whole points between the two rates as shown, or null when the previous period had nothing due. */
  points: number | null;
  /** The longest live streak across habits (ties: more freezes, then list order). */
  topStreak: TopStreak | null;
}

export function progressSummary(habits: Habit[], history: History, today: DateKey, range: ProgressRange, weekStartsOn: 0 | 1 = 1): ProgressSummary {
  const window = rangeWindow(today, range, weekStartsOn);
  const topStreak = topLiveStreak(habits, history, today);
  if (range === "month") {
    const rolling = rollingCompletion(habits, history, today, MONTH_DAYS);
    return { window, current: rolling.current, previous: rolling.previous, points: rolling.points, topStreak };
  }
  const current = periodStats(habits, history, today, window.start, window.end);
  const previous = periodStats(habits, history, today, window.prevStart, window.prevEnd);
  return { window, current, previous, points: previous.scheduled ? ratePoints(current.rate, previous.rate) : null, topStreak };
}

/** "+12 pts", "−4 pts", "±0 pts" from whole points. */
export function formatDelta(points: number): string {
  const p = Math.round(points);
  if (p === 0) return "±0 pts";
  return `${p > 0 ? "+" : "−"}${Math.abs(p)} pts`;
}

/* -------------------------------------------------------------------------- */
/* Bar chart                                                                   */
/* -------------------------------------------------------------------------- */

export interface ChartSlot {
  key: DateKey;
  /** Position and data in the Week view, or null when the day is not in it. */
  week: { index: number; bar: Bar } | null;
  month: { index: number; bar: Bar } | null;
}

export interface ChartModel {
  week: Bar[];
  month: Bar[];
  /**
   * The union of both views' days, oldest first. Each bar is keyed by its day,
   * so switching Week/Month morphs the days both views share (they slide and
   * resize) while the others fade in or out.
   */
  slots: ChartSlot[];
}

export function chartModel(habits: Habit[], history: History, today: DateKey, weekStartsOn: 0 | 1 = 1): ChartModel {
  const active = live(habits);
  const week = weekSeries(active, history, today, weekStartsOn);
  const month = dailySeries(active, history, today, MONTH_DAYS);
  const byKey = new Map<DateKey, ChartSlot>();
  week.forEach((bar, index) => byKey.set(bar.key, { key: bar.key, week: { index, bar }, month: null }));
  month.forEach((bar, index) => {
    const slot = byKey.get(bar.key);
    if (slot) slot.month = { index, bar };
    else byKey.set(bar.key, { key: bar.key, week: null, month: { index, bar } });
  });
  const slots = [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return { week, month, slots };
}

/** The best past day in a series (highest rate, then most done, then the latest). */
export function bestBar(bars: Bar[]): Bar | null {
  let best: Bar | null = null;
  for (const bar of bars) {
    if (bar.future || bar.scheduled === 0) continue;
    if (!best || bar.rate > best.rate || (bar.rate === best.rate && bar.done >= best.done)) best = bar;
  }
  return best;
}

/** Week ticks for the Month view: the first day of each week, labelled "Oct 5". */
export function monthTicks(bars: Bar[], weekStartsOn: 0 | 1 = 1): { index: number; label: string }[] {
  const out: { index: number; label: string }[] = [];
  bars.forEach((bar, index) => {
    if (weekdayOf(bar.key) !== weekStartsOn) return;
    const d = fromKey(bar.key);
    out.push({ index, label: `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}` });
  });
  return out;
}

/** Spoken and tooltip text for one bar. */
export function describeBar(bar: Bar): { date: string; detail: string; value: string; spoken: string } {
  const date = formatMediumDate(bar.key);
  const prefix = bar.isToday ? `Today, ${date}` : date;
  if (bar.future) return { date, detail: "Coming up", value: "", spoken: `${prefix}: coming up` };
  if (bar.scheduled === 0) return { date, detail: "Rest day", value: "", spoken: `${prefix}: rest day, nothing scheduled` };
  const pct = `${Math.round(bar.rate * 100)}%`;
  const habits = `${bar.done} of ${bar.scheduled} ${bar.scheduled === 1 ? "habit" : "habits"}`;
  const detail = bar.isToday ? `${habits} so far` : habits;
  return { date: bar.isToday ? "Today" : date, detail, value: pct, spoken: `${prefix}: ${detail}, ${pct}` };
}

/** The chart's summary label: "Completion this week: 92% average, best day Wednesday". */
export function chartSummary(range: ProgressRange, bars: Bar[], stats: PeriodStats): string {
  const avg = `${Math.round(stats.rate * 100)}% average`;
  if (!stats.scheduled) return range === "week" ? "Completion this week: nothing checked in yet" : `Completion over the last ${MONTH_DAYS} days: nothing checked in yet`;
  if (range === "week") {
    const best = bestBar(bars);
    const today = bars.find((b) => b.isToday && !b.future && b.scheduled > 0 && b.rate < 1);
    return `Completion this week: ${avg}${best ? `, best day ${WEEKDAY_LONG[weekdayOf(best.key)]}` : ""}${today ? `. Today so far: ${today.done} of ${today.scheduled}` : ""}`;
  }
  return `Completion over the last ${MONTH_DAYS} days: ${avg}, ${stats.perfectDays} perfect ${stats.perfectDays === 1 ? "day" : "days"}`;
}

/* -------------------------------------------------------------------------- */
/* One day in detail (heatmap sheet)                                           */
/* -------------------------------------------------------------------------- */

export type DayHabitState = "done" | "partial" | "skipped" | "frozen" | "missed" | "open";

export interface DayHabitDetail {
  habit: Habit;
  state: DayHabitState;
  value: number;
  /** Minutes after midnight the habit was completed, when known. */
  time: number | null;
}

export interface DayDetail {
  key: DateKey;
  summary: DaySummary;
  /** Scheduled habits, in list order. */
  habits: DayHabitDetail[];
  /** Habits that existed but were not scheduled that day. */
  resting: Habit[];
  /** No habit existed yet on this day. */
  beforeHistory: boolean;
  isToday: boolean;
  future: boolean;
}

/**
 * What happened on one day, habit by habit: done (with value and time),
 * partial ("5 of 8"), skipped, covered by a freeze, missed, or still open today.
 * A missed day that a freeze covered is "frozen" even when partly done.
 */
export function dayDetail(habits: Habit[], history: History, today: DateKey, key: DateKey): DayDetail {
  const active = live(habits).sort((a, b) => a.order - b.order);
  const details: DayHabitDetail[] = [];
  const resting: Habit[] = [];
  for (const habit of active) {
    if (key < habit.createdAt) continue;
    if (!isScheduledOn(habit, key)) {
      resting.push(habit);
      continue;
    }
    const value = valueOn(habit, history, key);
    let state: DayHabitState;
    if (isSkippedOn(habit, history, key)) state = "skipped";
    else if (isDoneOn(habit, history, key)) state = "done";
    else if (key >= today) state = value > 0 ? "partial" : "open";
    else if (streakInfo(habit, history, today).frozen.includes(key)) state = "frozen";
    else state = value > 0 ? "partial" : "missed";
    details.push({ habit, state, value, time: state === "done" ? checkinTimeOn(habit, history, key) : null });
  }
  return {
    key,
    summary: summarizeDay(active, history, key, today),
    habits: details,
    resting,
    beforeHistory: !active.some((h) => h.createdAt <= key),
    isToday: key === today,
    future: key > today,
  };
}

/* -------------------------------------------------------------------------- */
/* Best streaks                                                                */
/* -------------------------------------------------------------------------- */

export interface StreakCardData {
  habit: Habit;
  current: number;
  freezes: number;
  best: StreakRun;
  /** The live streak is the longest ever (and not zero). */
  personalBest: boolean;
  /** current / best, 0..1 (0 when there is no best yet). */
  ratio: number;
  /** Check-ins until the next freeze, when one can still be earned. */
  nextFreezeIn: number | null;
}

/** One entry per active habit, longest live streak first (then best, then list order). */
export function streakBoard(habits: Habit[], history: History, today: DateKey): StreakCardData[] {
  return live(habits)
    .sort((a, b) => a.order - b.order)
    .map((habit) => {
      const info = streakInfo(habit, history, today);
      return {
        habit,
        current: info.current,
        freezes: info.freezes,
        best: info.best,
        personalBest: info.current > 0 && info.current >= info.best.length,
        ratio: info.best.length ? Math.min(1, info.current / info.best.length) : 0,
        nextFreezeIn: info.nextFreezeIn,
      };
    })
    .sort((a, b) => b.current - a.current || b.best.length - a.best.length || a.habit.order - b.habit.order);
}

/** "Sep 7 – Sep 27" (both months spelled out, as on the streak cards). */
export function formatRun(run: StreakRun): string {
  if (!run.start || !run.end) return "";
  const a = fromKey(run.start);
  const b = fromKey(run.end);
  const left = `${MONTH_SHORT[a.getMonth()]} ${a.getDate()}`;
  return run.start === run.end ? left : `${left} – ${MONTH_SHORT[b.getMonth()]} ${b.getDate()}`;
}
