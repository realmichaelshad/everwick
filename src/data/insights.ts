/**
 * Insights engine for the Progress tab: turns check-in history into a few
 * short, encouraging observations ("You're most consistent on Mondays").
 *
 * Pure TypeScript over (habits, history, today), no React Native imports,
 * unit-tested in tests/insights.test.ts. Every helper is exported on its own
 * so it can be tested with small fixtures; buildInsights() assembles the cards
 * the screen shows, at most one per kind, sorted by score.
 *
 * Conventions shared by every helper:
 * - Today is still open, so windows end yesterday unless noted.
 * - Only due days count (scheduled and not skipped); skips are neutral.
 * - Archived habits are ignored.
 * - Nothing divides by zero: helpers return null (or skip a pair) when a
 *   comparison has no data on one side.
 */
import { addDays, formatMinutes, lastNDays, partOfDayForMinutes, WEEKDAY_LONG, weekdayOf } from "./dates";
import { daysTracked, isDoneOn, isDueOn, rollingCompletion, roundToFive, streakInfo, usualCheckinTime, weekdayConsistency, type WeekdayStat } from "./stats";
import type { DateKey, Habit, History, Weekday } from "./types";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type InsightKind = "weekday" | "correlation" | "risk" | "time" | "trend";
export type PartOfDay = "morning" | "afternoon" | "evening";

interface InsightBase {
  /** Stable id, e.g. "weekday", "correlation:meditate:read". */
  id: string;
  kind: InsightKind;
  title: string;
  /** One sentence. */
  body: string;
  /** Ranking weight, roughly 0..1. Higher shows first. */
  score: number;
  /** Habits the insight is about (for icons and links). */
  habitIds: string[];
}

export interface WeekdayInsight extends InsightBase {
  kind: "weekday";
  data: WeekdayPattern;
}
export interface CorrelationInsight extends InsightBase {
  kind: "correlation";
  data: HabitCorrelation;
}
export interface RiskInsight extends InsightBase {
  kind: "risk";
  data: StreakRisk;
}
export interface TimeInsight extends InsightBase {
  kind: "time";
  data: TimeOfDayPattern;
}
export interface TrendInsight extends InsightBase {
  kind: "trend";
  data: TrendSummary;
}

export type Insight = WeekdayInsight | CorrelationInsight | RiskInsight | TimeInsight | TrendInsight;

export interface InsightOptions {
  /** Look-back window in days for weekday, correlation and time patterns (default 60). */
  days?: number;
  weekStartsOn?: 0 | 1;
  /** Window for the trend comparison (default 30: last 30 days vs the 30 before). */
  trendDays?: number;
  /** Most cards to return (default 5). */
  max?: number;
}

/** Insights need at least this many days of history before they say anything. */
export const MIN_DAYS_FOR_INSIGHTS = 7;

/* -------------------------------------------------------------------------- */
/* Wording helpers                                                             */
/* -------------------------------------------------------------------------- */

const QUANTITY_SUFFIX = /\s+\d[\d.,]*\s*(k\s+)?(minutes?|mins?|min|hours?|hrs?|steps?|glasses|cups?|pages?|reps?|km|miles?|times?|x)$/i;

/**
 * The habit's name without a trailing amount, for sentences:
 * "Read 20 minutes" -> "Read", "Walk 8k steps" -> "Walk".
 * Names without an amount are returned unchanged.
 */
export function shortName(name: string): string {
  const trimmed = name.trim();
  const short = trimmed.replace(QUANTITY_SUFFIX, "").trim();
  return short.length >= 2 ? short : trimmed;
}

/** First words that read naturally after "On days you ...". */
const VERBS = new Set([
  "meditate", "read", "walk", "run", "jog", "drink", "write", "journal", "stretch", "practice", "practise", "study", "cook",
  "floss", "swim", "cycle", "ride", "hike", "pray", "paint", "draw", "learn", "plan", "eat", "call", "play", "sing", "clean",
  "tidy", "review", "breathe", "lift", "train", "sleep", "wake", "go", "take", "do", "make",
]);

/**
 * A verb phrase for "On days you ___": "meditate", "read", "drink water".
 * Falls back to "complete Strength workout" when the name is not an action.
 */
export function activityPhrase(habit: Pick<Habit, "name">): string {
  const short = shortName(habit.name);
  const first = short.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (VERBS.has(first)) return short.charAt(0).toLowerCase() + short.slice(1);
  return `complete ${short}`;
}

/**
 * The second habit in a pairing sentence: "On days you meditate, you ___ 34%
 * more often". Action names read as verbs ("read", "walk"); anything else is
 * quoted as a habit ("check off “No phone after 10pm”").
 */
export function outcomePhrase(habit: Pick<Habit, "name">): string {
  const short = shortName(habit.name);
  const first = short.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (VERBS.has(first)) return short.charAt(0).toLowerCase() + short.slice(1);
  return `check off \u201c${short}\u201d`;
}

const plural = (weekday: Weekday) => `${WEEKDAY_LONG[weekday]}s`;
const percent = (rate: number) => `${Math.round(rate * 100)}%`;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const live = (habits: Habit[]) => habits.filter((h) => !h.archived);

/** The `days` days before today (oldest first). Today is excluded while it is still open. */
function pastWindow(today: DateKey, days: number): DateKey[] {
  return days > 0 ? lastNDays(addDays(today, -1), days) : [];
}

/* -------------------------------------------------------------------------- */
/* Weekday consistency                                                         */
/* -------------------------------------------------------------------------- */

export interface WeekdayPattern {
  best: WeekdayStat;
  /** The lightest weekday (lowest rate), or null when it equals the best. */
  worst: WeekdayStat | null;
  /** Every weekday in display order (for the mini bar chart). */
  days: WeekdayStat[];
  /** Overall completion rate across the window. */
  average: number;
}

/**
 * The weekday with the highest completion rate over the last `days` days.
 * Needs at least `minSamples` scheduled habit-days on the winning weekday and
 * data on two or more weekdays; returns null when every day is equal.
 * Ties go to the weekday with more data, then the earlier one in the week.
 */
export function consistentWeekday(
  habits: Habit[],
  history: History,
  today: DateKey,
  options: { days?: number; weekStartsOn?: 0 | 1; minSamples?: number } = {},
): WeekdayPattern | null {
  const days = options.days ?? 60;
  const minSamples = options.minSamples ?? 4;
  const stats = weekdayConsistency(live(habits), history, today, days, options.weekStartsOn ?? 1);
  const withData = stats.filter((s) => s.scheduled >= minSamples);
  if (withData.length < 2) return null;
  const best = withData.reduce((b, s) => (s.rate > b.rate || (s.rate === b.rate && s.scheduled > b.scheduled) ? s : b));
  const worst = withData.reduce((w, s) => (s.rate < w.rate ? s : w));
  if (best.rate === worst.rate) return null;
  const scheduled = stats.reduce((n, s) => n + s.scheduled, 0);
  const done = stats.reduce((n, s) => n + s.rate * s.scheduled, 0);
  return { best, worst: worst.weekday === best.weekday ? null : worst, days: stats, average: scheduled ? done / scheduled : 0 };
}

function weekdayInsight(pattern: WeekdayPattern): WeekdayInsight {
  const { best, worst, average } = pattern;
  const lift = best.rate - average;
  const tail = worst && worst.rate < best.rate ? ` ${plural(worst.weekday)} are your lightest day at ${percent(worst.rate)}.` : "";
  return {
    id: "weekday",
    kind: "weekday",
    title: `You're most consistent on ${plural(best.weekday)}`,
    body: `You finish ${percent(best.rate)} of your habits on ${plural(best.weekday)}.${tail}`,
    score: 0.4 + Math.min(0.4, Math.max(0, lift) * 3),
    habitIds: [],
    data: pattern,
  };
}

/* -------------------------------------------------------------------------- */
/* Correlations between habits                                                 */
/* -------------------------------------------------------------------------- */

export interface HabitCorrelation {
  /** The habit whose check-in is the condition. */
  a: string;
  /** The habit whose completion is compared. */
  b: string;
  /** P(B done | A done) over days both were due. */
  withRate: number;
  /** P(B done | A not done) over days both were due. */
  withoutRate: number;
  /** Relative lift: (withRate - withoutRate) / withoutRate. 0.34 = "34% more often". */
  lift: number;
  samplesWith: number;
  samplesWithout: number;
}

/**
 * For every ordered pair of habits (A, B), compares how often B gets done on
 * days A was done versus days A was not, over the last `days` days where both
 * were due. A pair is kept when each side has at least `minSamples` days and
 * the relative lift is at least `minLift` either way. Pairs where B was never
 * done without A (withoutRate 0) are skipped: a relative lift is undefined.
 * Sorted by absolute lift, strongest first.
 */
export function habitCorrelations(
  habits: Habit[],
  history: History,
  today: DateKey,
  days = 60,
  options: { minSamples?: number; minLift?: number } = {},
): HabitCorrelation[] {
  const minSamples = options.minSamples ?? 8;
  const minLift = options.minLift ?? 0.15;
  const active = live(habits);
  const window = pastWindow(today, days);
  // Precompute due/done per habit per day once.
  const due = new Map<string, boolean[]>();
  const done = new Map<string, boolean[]>();
  for (const h of active) {
    due.set(h.id, window.map((k) => isDueOn(h, history, k)));
    done.set(h.id, window.map((k) => isDoneOn(h, history, k)));
  }
  const out: HabitCorrelation[] = [];
  for (const a of active) {
    for (const b of active) {
      if (a.id === b.id) continue;
      const dueA = due.get(a.id)!;
      const dueB = due.get(b.id)!;
      const doneA = done.get(a.id)!;
      const doneB = done.get(b.id)!;
      let withN = 0;
      let withDone = 0;
      let withoutN = 0;
      let withoutDone = 0;
      for (let i = 0; i < window.length; i++) {
        if (!dueA[i] || !dueB[i]) continue;
        if (doneA[i]) {
          withN++;
          if (doneB[i]) withDone++;
        } else {
          withoutN++;
          if (doneB[i]) withoutDone++;
        }
      }
      if (withN < minSamples || withoutN < minSamples) continue;
      const withRate = withDone / withN;
      const withoutRate = withoutDone / withoutN;
      if (withoutRate === 0) continue;
      const lift = (withRate - withoutRate) / withoutRate;
      if (Math.abs(lift) < minLift) continue;
      out.push({ a: a.id, b: b.id, withRate, withoutRate, lift, samplesWith: withN, samplesWithout: withoutN });
    }
  }
  return out.sort((x, y) => Math.abs(y.lift) - Math.abs(x.lift) || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
}

function correlationInsight(c: HabitCorrelation, habits: Habit[]): CorrelationInsight | null {
  const a = habits.find((h) => h.id === c.a);
  const b = habits.find((h) => h.id === c.b);
  if (!a || !b || c.lift <= 0) return null;
  const pct = Math.round(c.lift * 100);
  // Confidence grows with the smaller side of the comparison.
  const confidence = clamp01(Math.min(c.samplesWith, c.samplesWithout) / 20);
  return {
    id: `correlation:${a.id}:${b.id}`,
    kind: "correlation",
    title: "Better together",
    body: `On days you ${activityPhrase(a)}, you ${outcomePhrase(b)} ${pct}% more often.`,
    score: 0.35 + Math.min(0.4, c.lift) * confidence,
    habitIds: [a.id, b.id],
    data: c,
  };
}

/* -------------------------------------------------------------------------- */
/* Streak risks                                                                */
/* -------------------------------------------------------------------------- */

export interface WeekdayMiss {
  weekday: Weekday;
  /** Missed due days / due days on this weekday (0 when none were due). */
  missRate: number;
  samples: number;
}

export interface StreakRisk {
  habitId: string;
  /** The weekday this habit is missed most. */
  weekday: Weekday;
  missRate: number;
  samples: number;
  /** The habit's completion rate over the same window. */
  overallRate: number;
  /** Every weekday, Sunday first (index = Weekday). */
  byWeekday: WeekdayMiss[];
  /** Freezes held right now (a freeze can cover that day). */
  freezes: number;
}

/**
 * Habits that are going well overall but tend to slip on one weekday. Looks at
 * each habit's misses per weekday over the last `weeks` weeks (ending
 * yesterday) and flags its worst weekday when that day's miss rate is at least
 * `minMissRate` with at least `minSamples` due days, while the habit's overall
 * rate is at least `minOverallRate`. One risk per habit, sorted by how much
 * worse that day is than the habit's usual miss rate.
 */
export function streakRisks(
  habits: Habit[],
  history: History,
  today: DateKey,
  options: { weeks?: number; minSamples?: number; minMissRate?: number; minOverallRate?: number } = {},
): StreakRisk[] {
  const weeks = options.weeks ?? 8;
  const minSamples = options.minSamples ?? 4;
  const minMissRate = options.minMissRate ?? 0.5;
  const minOverallRate = options.minOverallRate ?? 0.6;
  const window = pastWindow(today, weeks * 7);
  const out: StreakRisk[] = [];
  for (const habit of live(habits)) {
    const due = [0, 0, 0, 0, 0, 0, 0];
    const missed = [0, 0, 0, 0, 0, 0, 0];
    for (const key of window) {
      if (!isDueOn(habit, history, key)) continue;
      const wd = weekdayOf(key);
      due[wd]++;
      if (!isDoneOn(habit, history, key)) missed[wd]++;
    }
    const totalDue = due.reduce((a, b) => a + b, 0);
    if (!totalDue) continue;
    const overallRate = 1 - missed.reduce((a, b) => a + b, 0) / totalDue;
    if (overallRate < minOverallRate) continue;
    const byWeekday: WeekdayMiss[] = due.map((n, wd) => ({ weekday: wd as Weekday, samples: n, missRate: n ? missed[wd] / n : 0 }));
    const candidates = byWeekday.filter((d) => d.samples >= minSamples && d.missRate >= minMissRate);
    if (!candidates.length) continue;
    const worst = candidates.reduce((w, d) => (d.missRate > w.missRate || (d.missRate === w.missRate && d.samples > w.samples) ? d : w));
    out.push({
      habitId: habit.id,
      weekday: worst.weekday,
      missRate: worst.missRate,
      samples: worst.samples,
      overallRate,
      byWeekday,
      freezes: streakInfo(habit, history, today).freezes,
    });
  }
  const excess = (r: StreakRisk) => r.missRate - (1 - r.overallRate);
  return out.sort((x, y) => excess(y) - excess(x) || x.habitId.localeCompare(y.habitId));
}

function riskInsight(risk: StreakRisk, habits: Habit[]): RiskInsight | null {
  const habit = habits.find((h) => h.id === risk.habitId);
  if (!habit) return null;
  const day = plural(risk.weekday);
  const missed = Math.round(risk.missRate * risk.samples);
  const often = risk.missRate >= 0.7 ? "usually" : "often";
  const tip =
    risk.freezes > 0
      ? `You have ${risk.freezes} ${risk.freezes === 1 ? "freeze" : "freezes"} saved if one slips.`
      : "A shorter version still counts.";
  return {
    id: `risk:${habit.id}`,
    kind: "risk",
    title: `Plan ahead for ${day}`,
    body: `You ${often} miss ${habit.name} on ${day} (${missed} of the last ${risk.samples}). ${tip}`,
    score: 0.3 + Math.min(0.4, Math.max(0, risk.missRate - (1 - risk.overallRate)) * 0.6),
    habitIds: [habit.id],
    data: risk,
  };
}

/* -------------------------------------------------------------------------- */
/* Best time of day                                                            */
/* -------------------------------------------------------------------------- */

export interface HabitTime {
  habitId: string;
  /** Usual check-in minute after midnight (stats.usualCheckinTime: median, rounded to 5). */
  median: number;
  part: PartOfDay;
  count: number;
}

export interface TimeOfDayPattern {
  /** The part of the day with the most check-ins. */
  part: PartOfDay;
  /** Median minute of the check-ins in that part of the day. */
  median: number;
  /** Check-ins in that part / all timed check-ins. */
  share: number;
  /** Timed check-ins in the window. */
  count: number;
  /** Check-ins per part of the day. */
  parts: Record<PartOfDay, number>;
  /** Per habit, earliest median first. */
  perHabit: HabitTime[];
}

/** Median of a list of numbers (average of the middle two for even lengths). */
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * When check-ins happen, from history.times over the last `days` days
 * (today included: a check-in time is a fact once it exists). Needs at least
 * `minCount` timed check-ins overall; habits need 3 to get their own median.
 */
export function bestTimeOfDay(
  habits: Habit[],
  history: History,
  today: DateKey,
  options: { days?: number; minCount?: number } = {},
): TimeOfDayPattern | null {
  const days = options.days ?? 60;
  const minCount = options.minCount ?? 10;
  const window = lastNDays(today, days);
  const all: number[] = [];
  const perHabit: HabitTime[] = [];
  for (const habit of live(habits)) {
    const times = history.times?.[habit.id];
    if (!times) continue;
    const mins: number[] = [];
    for (const key of window) {
      const t = times[key];
      if (typeof t === "number" && Number.isFinite(t) && isDoneOn(habit, history, key)) mins.push(t);
    }
    all.push(...mins);
    // The habit's usual time is the same number its detail screen shows (rounded to 5 minutes).
    const usual = usualCheckinTime(habit, history, today, days);
    if (usual != null) perHabit.push({ habitId: habit.id, median: usual, part: partOfDayForMinutes(usual), count: mins.length });
  }
  if (all.length < minCount) return null;
  const buckets: Record<PartOfDay, number[]> = { morning: [], afternoon: [], evening: [] };
  for (const t of all) buckets[partOfDayForMinutes(t)].push(t);
  const order: PartOfDay[] = ["morning", "afternoon", "evening"];
  const part = order.reduce((best, p) => (buckets[p].length > buckets[best].length ? p : best), order[0]);
  return {
    part,
    median: roundToFive(median(buckets[part])),
    share: buckets[part].length / all.length,
    count: all.length,
    parts: { morning: buckets.morning.length, afternoon: buckets.afternoon.length, evening: buckets.evening.length },
    perHabit: perHabit.sort((a, b) => a.median - b.median),
  };
}

const PART_TITLE: Record<PartOfDay, string> = {
  morning: "You're a morning person",
  afternoon: "Afternoons are your rhythm",
  evening: "You're an evening finisher",
};

function timeInsight(pattern: TimeOfDayPattern, habits: Habit[]): TimeInsight {
  const name = (id: string) => habits.find((h) => h.id === id)?.name ?? "";
  // Contrast with the habit that keeps the opposite rhythm, if any.
  const other = pattern.part === "morning" ? pattern.perHabit[pattern.perHabit.length - 1] : pattern.perHabit[0];
  const contrast =
    other && other.part !== pattern.part
      ? ` ${name(other.habitId)} is your ${other.part === "morning" ? "morning anchor" : other.part === "afternoon" ? "midday habit" : "evening ritual"} at ${formatMinutes(other.median)}.`
      : "";
  return {
    id: "time",
    kind: "time",
    title: PART_TITLE[pattern.part],
    body: `Most of your check-ins happen in the ${pattern.part}, around ${formatMinutes(pattern.median)}.${contrast}`,
    score: 0.35 + Math.min(0.25, pattern.share * 0.3),
    habitIds: other && contrast ? [other.habitId] : [],
    data: pattern,
  };
}

/* -------------------------------------------------------------------------- */
/* Trend                                                                       */
/* -------------------------------------------------------------------------- */

export interface TrendSummary {
  /** Completion rate over the last `days` days (today counts once a habit is done). */
  current: number;
  /** The `days` days before that. */
  previous: number;
  /** current - previous, as a rate (0.12 = 12 points). */
  delta: number;
  /** Whole points between the two rates as shown (80% vs 64% = 16). */
  points: number;
  days: number;
}

/**
 * Points versus the previous period: the last `days` days against the `days`
 * before them. Built on stats.rollingCompletion, the same numbers as the
 * Progress Month tile and Profile. Null when either period had nothing due.
 */
export function trendSummary(habits: Habit[], history: History, today: DateKey, days = 30): TrendSummary | null {
  if (days < 1) return null;
  const rolling = rollingCompletion(live(habits), history, today, days);
  if (!rolling.current.scheduled || rolling.points == null) return null;
  const current = rolling.current.rate;
  const previous = rolling.previous.rate;
  return { current, previous, delta: current - previous, points: rolling.points, days };
}

function trendInsight(t: TrendSummary): TrendInsight {
  const period = t.days === 7 ? "week" : t.days === 30 ? "month" : `${t.days} days`;
  const span = t.days === 7 ? "7 days" : `${t.days} days`;
  const up = t.points >= 3;
  const down = t.points <= -3;
  const title = up ? `Up ${t.points} points this ${period}` : down ? "A lighter stretch" : `Steady this ${period}`;
  const body = up
    ? `You finished ${percent(t.current)} of your habits in the last ${span}, up from ${percent(t.previous)} the ${span} before.`
    : down
      ? `You finished ${percent(t.current)} in the last ${span}, ${Math.abs(t.points)} points under the ${span} before. One check-in today starts the climb.`
      : `You finished ${percent(t.current)} of your habits in the last ${span}, right in line with the ${span} before.`;
  return {
    id: "trend",
    kind: "trend",
    title,
    body,
    score: up ? 0.45 + Math.min(0.35, t.delta * 1.5) : down ? 0.3 : 0.25,
    habitIds: [],
    data: t,
  };
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                    */
/* -------------------------------------------------------------------------- */

/** True once there is enough history for insights to mean something. */
export function insightsUnlocked(habits: Habit[], today: DateKey): boolean {
  return daysTracked(live(habits), today) >= MIN_DAYS_FOR_INSIGHTS;
}

/** Days of history still needed before insights unlock (0 when unlocked). */
export function daysUntilInsights(habits: Habit[], today: DateKey): number {
  return Math.max(0, MIN_DAYS_FOR_INSIGHTS - daysTracked(live(habits), today));
}

/**
 * The insight cards for the Progress tab: at most one per kind (weekday,
 * correlation, risk, time, trend), sorted by score, capped at `max`.
 * Returns [] until there are MIN_DAYS_FOR_INSIGHTS days of history.
 */
export function buildInsights(habits: Habit[], history: History, today: DateKey, options: InsightOptions = {}): Insight[] {
  const active = live(habits);
  if (!active.length || !insightsUnlocked(active, today)) return [];
  const days = options.days ?? 60;
  const out: Insight[] = [];

  const weekday = consistentWeekday(active, history, today, { days, weekStartsOn: options.weekStartsOn });
  if (weekday) out.push(weekdayInsight(weekday));

  const pair = habitCorrelations(active, history, today, days).find((c) => c.lift > 0);
  const correlation = pair ? correlationInsight(pair, active) : null;
  if (correlation) out.push(correlation);

  const risk = streakRisks(active, history, today)[0];
  const riskCard = risk ? riskInsight(risk, active) : null;
  if (riskCard) out.push(riskCard);

  const time = bestTimeOfDay(active, history, today, { days });
  if (time) out.push(timeInsight(time, active));

  const trend = trendSummary(active, history, today, options.trendDays ?? 30);
  if (trend) out.push(trendInsight(trend));

  return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, options.max ?? 5);
}
