/**
 * Pure logic behind the habit detail screen: the month calendar (grid and
 * day states), the numbers and wording on the stat tiles and the Today
 * card (in the habit's own streak unit, see data/streakCopy.ts), the
 * "back on Mon" rest-day line and precise Undo helpers. No React Native
 * imports; unit-tested in tests/detailModel.test.ts and
 * tests/streakCopy.test.ts.
 */
import { addDays, diffDays, formatMinutes, formatShortDate, fromKey, MONTH_LONG, orderedWeekdays, rangeKeys, startOfMonth, WEEKDAY_SHORT, weekdayOf } from "@/data/dates";
import { checkinTimeOn, FREEZE_EVERY, habitCheckins, isDoneOn, isScheduledOn, isSkippedOn, MAX_FREEZES, periodStats, valueOn, streakInfo, usualCheckinTime, type StreakInfo } from "@/data/stats";
import { freezeCovers, freezeGoalLine, inARow, isDaily, nextDueDay, nextInARow, seeYouLine, streakUnit } from "@/data/streakCopy";
import type { AppState, DateKey, Habit, History } from "@/data/types";

/* -------------------------------------------------------------------------- */
/* Calendar                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What a calendar day means for this habit:
 * - done: target reached
 * - partial: some progress on a target habit, not finished (past or today)
 * - skipped: skipped on purpose (neutral)
 * - frozen: missed, but a streak freeze covered it
 * - missed: a past due day without a check-in
 * - open: today, due, nothing logged yet
 * - unscheduled: not on the habit's schedule (neutral)
 * - future: after today
 * - before: before the habit existed
 */
export type DayState = "done" | "partial" | "skipped" | "frozen" | "missed" | "open" | "unscheduled" | "future" | "before";

export function dayState(habit: Habit, history: History, key: DateKey, today: DateKey, frozen: ReadonlySet<DateKey>): DayState {
  if (key > today) return "future";
  if (key < habit.createdAt) return "before";
  if (!isScheduledOn(habit, key)) return "unscheduled";
  if (isSkippedOn(habit, history, key)) return "skipped";
  if (isDoneOn(habit, history, key)) return "done";
  // A freeze is the story of a past day, even if some progress was logged.
  if (key !== today && frozen.has(key)) return "frozen";
  if (valueOn(habit, history, key) > 0) return "partial";
  return key === today ? "open" : "missed";
}

/** Days you can open in the calendar sheet (log, skip or fix a past day). */
export function isActionable(state: DayState): boolean {
  return state !== "future" && state !== "before" && state !== "unscheduled";
}

export function shiftMonth(month: DateKey, delta: number): DateKey {
  const d = fromKey(startOfMonth(month));
  const shifted = new Date(d.getFullYear(), d.getMonth() + delta, 1, 12);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-01`;
}

/** "October 2026" */
export function monthTitle(month: DateKey): string {
  const d = fromKey(month);
  return `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** The months the calendar can show: from the month the habit was created to the current month. */
export function monthBounds(habit: Habit, today: DateKey): { min: DateKey; max: DateKey } {
  const max = startOfMonth(today);
  const min = startOfMonth(habit.createdAt < today ? habit.createdAt : today);
  return { min, max };
}

export function clampMonth(month: DateKey, bounds: { min: DateKey; max: DateKey }): DateKey {
  const m = startOfMonth(month);
  if (m < bounds.min) return bounds.min;
  if (m > bounds.max) return bounds.max;
  return m;
}

/**
 * Weeks of the month as rows of 7 cells (weekStartsOn first). Cells outside
 * the month are null, so rows line up under the weekday headers.
 */
export function monthGrid(month: DateKey, weekStartsOn: 0 | 1): (DateKey | null)[][] {
  const first = startOfMonth(month);
  const last = addDays(shiftMonth(first, 1), -1);
  const lead = (weekdayOf(first) - weekStartsOn + 7) % 7;
  const cells: (DateKey | null)[] = [...Array.from({ length: lead }, () => null), ...rangeKeys(first, last)];
  while (cells.length % 7) cells.push(null);
  const rows: (DateKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** Weekday header letters and full names in display order. */
export function weekdayHeaders(weekStartsOn: 0 | 1): { letter: string; name: string }[] {
  return orderedWeekdays(weekStartsOn).map((d) => ({ letter: WEEKDAY_SHORT[d].slice(0, 1), name: WEEKDAY_SHORT[d] }));
}

/** States that belong to a streak chain (drawn joined in the calendar). */
export function inChain(state: DayState | null): boolean {
  return state === "done" || state === "frozen";
}

export interface MonthSummary {
  /** Due days so far this month (scheduled, not skipped, up to today; an open today is not counted). */
  due: number;
  done: number;
  frozen: number;
  missed: number;
  skipped: number;
}

export function summarizeMonth(habit: Habit, history: History, month: DateKey, today: DateKey, frozen: ReadonlySet<DateKey>): MonthSummary {
  const out: MonthSummary = { due: 0, done: 0, frozen: 0, missed: 0, skipped: 0 };
  for (const row of monthGrid(month, 1)) {
    for (const key of row) {
      if (!key) continue;
      const s = dayState(habit, history, key, today, frozen);
      if (s === "done") {
        out.done++;
        out.due++;
      } else if (s === "frozen") {
        out.frozen++;
        out.due++;
      } else if (s === "missed") {
        out.missed++;
        out.due++;
      } else if (s === "partial") {
        if (key !== today) {
          out.missed++;
          out.due++;
        }
      } else if (s === "skipped") out.skipped++;
    }
  }
  return out;
}

/** Spoken label for a calendar cell: "Oct 12, done at 7:10 AM". */
export function cellLabel(habit: Habit, history: History, key: DateKey, state: DayState, today: DateKey): string {
  const date = key === today ? `Today, ${formatShortDate(key)}` : formatShortDate(key);
  const unit = habit.unit ?? "times";
  switch (state) {
    case "done": {
      const at = checkinTimeOn(habit, history, key);
      return at != null ? `${date}, done at ${formatMinutes(at)}` : `${date}, done`;
    }
    case "partial":
      return `${date}, ${valueOn(habit, history, key)} of ${habit.target} ${unit}`;
    case "skipped":
      return `${date}, skipped`;
    case "frozen":
      return `${date}, missed, a freeze saved your streak`;
    case "missed":
      return `${date}, missed`;
    case "open":
      return `${date}, not checked in yet`;
    case "unscheduled":
      return `${date}, not scheduled`;
    case "future":
      return `${date}, upcoming`;
    case "before":
      return `${date}, before this habit started`;
  }
}

/** One short line for the day sheet. */
export function stateLine(habit: Habit, history: History, key: DateKey, state: DayState): string {
  const unit = habit.unit ?? "times";
  switch (state) {
    case "done": {
      const at = checkinTimeOn(habit, history, key);
      return at != null ? `Checked in at ${formatMinutes(at)}` : "Checked in";
    }
    case "partial":
      return `${valueOn(habit, history, key)} of ${habit.target} ${unit} so far`;
    case "skipped":
      return "Skipped. Skips never break a streak.";
    case "frozen":
      return "Missed, but a freeze kept your streak going";
    case "missed":
      return "Not checked in";
    case "open":
      return "Not checked in yet";
    default:
      return "Nothing to log on this day";
  }
}

/* -------------------------------------------------------------------------- */
/* Stats                                                                       */
/* -------------------------------------------------------------------------- */

/** "Aug 25 – Sep 12" (one day: "Aug 25"). */
export function formatRange(start: DateKey | null, end: DateKey | null): string {
  if (!start || !end) return "";
  if (start === end) return formatShortDate(start);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export interface RateDetail {
  rate: number;
  done: number;
  /** Due days counted (scheduled, not skipped; today only once it's done). */
  due: number;
}

/**
 * Completion over the last `days` days, with the counts behind it. The same
 * rule as every other screen (stats.periodStats): today counts only once
 * it's done. A paused habit still shows its own numbers here.
 */
export function rateDetail(habit: Habit, history: History, today: DateKey, days = 30): RateDetail {
  const stats = periodStats([{ ...habit, archived: false }], history, today, addDays(today, -(days - 1)), today);
  return { rate: stats.rate, done: stats.done, due: stats.scheduled };
}

/** Every completed day since the habit started (up to today): stats.habitCheckins. */
export const totalCheckins = habitCheckins;

/** Usual check-in time (stats.usualCheckinTime: the same number the Progress rhythm card shows). */
export const typicalCheckinTime = usualCheckinTime;

/** Next scheduled day after `from`, within two weeks (null if the habit has no days). */
export const nextScheduledDay = nextDueDay;

/** "Rest day, back tomorrow" / "Rest day, back on Mon". */
export function restDayLine(habit: Habit, today: DateKey): string {
  const next = nextScheduledDay(habit, today);
  if (!next) return "Rest day";
  if (diffDays(today, next) === 1) return "Rest day, back tomorrow";
  return `Rest day, back on ${WEEKDAY_SHORT[weekdayOf(next)]}`;
}

/** The streak after checking in on `day` (for the toast "13 days in a row"). */
export function streakAfterCheckIn(habit: Habit, state: AppState, day: DateKey, today: DateKey): number {
  const logs = { ...state.logs, [habit.id]: { ...(state.logs[habit.id] ?? {}), [day]: habit.target } };
  const skips = { ...state.skips, [habit.id]: { ...(state.skips[habit.id] ?? {}) } };
  delete skips[habit.id][day];
  return streakInfo(habit, { ...state, logs, skips }, today).current;
}

export interface FreezeCopy {
  title: string;
  /** How freezes work, in this habit's unit ("A freeze covers one missed check-in"). */
  explainer: string;
  /** Progress toward the next freeze (0..1), or null when no bar should show. */
  progress: number | null;
  progressLabel: string;
  /** "Saved your streak on Oct 2" lines, newest first (at most 2). */
  saves: string[];
}

const EVERY_DAY: Pick<Habit, "schedule"> = { schedule: [0, 1, 2, 3, 4, 5, 6] };

/** Everything the freeze card says, from streakInfo, worded for the habit's schedule. */
export function freezeCopy(info: StreakInfo, habit: Pick<Habit, "schedule"> = EVERY_DAY, every = FREEZE_EVERY, max = MAX_FREEZES): FreezeCopy {
  // "Yet" only while no freeze has ever been used; after one saved a streak the bank is just empty for now.
  const title = info.freezes > 0 ? `${info.freezes} ${info.freezes === 1 ? "freeze" : "freezes"} ready` : info.frozen.length ? "No freezes ready" : "No freezes yet";
  const explainer = `Every ${every} check-ins in a row earn a freeze (up to\u00A0${max}). A freeze covers ${freezeCovers(habit)}, so a busy ${isDaily(habit) ? "day" : "week"} doesn't cost your streak.`;
  let progress: number | null = null;
  let progressLabel: string;
  if (info.nextFreezeIn != null) {
    progress = (every - info.nextFreezeIn) / every;
    progressLabel = `${info.nextFreezeIn} more ${info.nextFreezeIn === 1 ? "check-in" : "check-ins"} for your next freeze`;
  } else if (info.freezes >= max) {
    progressLabel = `Your freeze bank is full. ${capitalize(freezeCovers(habit, max))} are covered.`;
  } else {
    progressLabel = freezeGoalLine(habit, every);
  }
  const saves = [...info.frozen]
    .reverse()
    .slice(0, 2)
    .map((key) => `Saved your streak on ${formatShortDate(key)}`);
  return { title, explainer, progress, progressLabel, saves };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/* -------------------------------------------------------------------------- */
/* Today card and streak tiles (wording)                                       */
/* -------------------------------------------------------------------------- */

export interface TodayDay {
  value: number;
  done: boolean;
  skipped: boolean;
  /** Check-in time today (minutes after midnight) or null. */
  at: number | null;
}

/**
 * Title and line of the "Today" card on habit detail, in the habit's own
 * streak unit: "7 days in a row. See you tomorrow." for a daily habit,
 * "7 check-ins in a row. See you Monday." for a Mon/Wed/Fri one on Friday
 * (and "Check in to make it 7 in a row." before the check-in).
 * `current` is the live streak (it already includes today once done).
 */
export function todayCardCopy(habit: Habit, day: TodayDay, current: number, today: DateKey): { title: string; body: string } {
  const unit = habit.unit ?? "times";
  const next = current + 1;
  if (day.skipped) return { title: "Skipped today", body: "Your streak is safe. Changed your mind? You can still check in." };
  if (day.done) {
    const title = day.at != null ? `Checked in at ${formatMinutes(day.at)}` : "Checked in";
    const streak = current > 1 ? `${inARow(habit, current)}.` : "A fresh streak starts today.";
    return { title, body: `${streak} ${seeYouLine(habit, today)}` };
  }
  if (habit.target > 1) {
    const left = habit.target - day.value;
    return { title: `${day.value} of ${habit.target} ${unit}`, body: current > 0 ? `${left} more to make it ${nextInARow(habit, next)}.` : `${left} more to finish today.` };
  }
  return { title: "Not checked in yet", body: current > 0 ? `Check in to make it ${nextInARow(habit, next)}.` : "Check in to start a new streak." };
}

export interface StreakTileCopy {
  /** Unit set inline after the big number: "days" / "check-ins". */
  currentUnit: string;
  currentCaption: string;
  currentSpoken: string;
  bestUnit: string;
  bestCaption: string;
  bestSpoken: string;
}

/** The Current streak and Best streak tiles on habit detail. */
export function streakTileCopy(habit: Habit, info: StreakInfo): StreakTileCopy {
  const bestIsNow = info.current > 0 && info.best.length === info.current && info.best.end === info.runs[info.runs.length - 1]?.end;
  const freezes = info.freezes ? `, ${info.freezes} ${info.freezes === 1 ? "freeze" : "freezes"} ready` : "";
  const range = formatRange(info.best.start, info.best.end);
  return {
    currentUnit: streakUnit(habit, info.current),
    currentCaption: info.currentStart ? `since ${formatShortDate(info.currentStart)}` : "Check in to start one",
    currentSpoken: `Current streak: ${inARow(habit, info.current)}${freezes}. ${info.currentStart ? `Since ${formatShortDate(info.currentStart)}` : "Check in to start one"}`,
    bestUnit: streakUnit(habit, info.best.length),
    bestCaption: info.best.length === 0 ? "Your first streak is one check-in away" : bestIsNow ? "Still your best ever" : range,
    bestSpoken: `Best streak: ${inARow(habit, info.best.length)}. ${bestIsNow ? "That's the streak you're on now" : range}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Undo                                                                        */
/* -------------------------------------------------------------------------- */

const withEntry = <T,>(map: Record<DateKey, T> | undefined, key: DateKey, value: T | undefined): Record<DateKey, T> => {
  const next = { ...(map ?? {}) };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
};

/**
 * Puts one habit's day back the way it was in `before` (value, skip and
 * check-in time), leaving everything else as it is now. Used by Undo so a
 * later change elsewhere is never lost, and the original check-in time
 * survives an accidental "mark not done".
 */
export function restoreDay(current: AppState, before: AppState, habitId: string, key: DateKey): AppState {
  return {
    ...current,
    modified: true,
    logs: { ...current.logs, [habitId]: withEntry(current.logs[habitId], key, before.logs[habitId]?.[key]) },
    skips: { ...current.skips, [habitId]: withEntry(current.skips[habitId], key, before.skips[habitId]?.[key]) },
    times: { ...current.times, [habitId]: withEntry(current.times[habitId], key, before.times[habitId]?.[key]) },
  };
}

/**
 * Brings a deleted habit back from `before` with all of its history, at its
 * old position, without undoing anything else that happened since.
 */
export function restoreHabit(current: AppState, before: AppState, habitId: string): AppState {
  const habit = before.habits.find((h) => h.id === habitId);
  if (!habit || current.habits.some((h) => h.id === habitId)) return current;
  const index = before.habits.findIndex((h) => h.id === habitId);
  const habits = [...current.habits];
  habits.splice(Math.min(index, habits.length), 0, habit);
  return {
    ...current,
    modified: true,
    habits,
    logs: { ...current.logs, [habitId]: before.logs[habitId] ?? {} },
    skips: { ...current.skips, [habitId]: before.skips[habitId] ?? {} },
    times: { ...current.times, [habitId]: before.times[habitId] ?? {} },
  };
}
