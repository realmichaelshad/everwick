import { profileStats } from "@/components/profile/profileModel";
import { buildInsights, trendSummary } from "@/data/insights";
import { describe, expect, it } from "vitest";

import { addDays } from "@/data/dates";
import {
  bestBar,
  chartModel,
  chartSummary,
  dayDetail,
  describeBar,
  formatDelta,
  formatRange,
  formatRun,
  MONTH_DAYS,
  monthTicks,
  periodStats,
  progressSummary,
  rangeWindow,
  streakBoard,
} from "@/data/progressSeries";
import { createSeedState } from "@/data/seed";
import type { Bar } from "@/data/stats";
import { ALL_DAYS, type Habit, type History } from "@/data/types";

// 2026-10-23 is a Friday.
const TODAY = "2026-10-23";

function habit(partial: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    name: "Test",
    icon: "droplet",
    color: "ocean",
    schedule: [...ALL_DAYS],
    target: 1,
    unit: null,
    detail: "",
    reminder: null,
    notes: "",
    createdAt: addDays(TODAY, -59),
    order: 0,
    archived: false,
    ...partial,
  };
}

function bar(partial: Partial<Bar>): Bar {
  return { key: TODAY, label: "F", rate: 0, scheduled: 0, done: 0, future: false, isToday: false, ...partial };
}

describe("rangeWindow and labels", () => {
  it("formats ranges within a month, across months and years", () => {
    expect(formatRange("2026-10-19", "2026-10-25")).toBe("Oct 19 – 25");
    expect(formatRange("2026-09-28", "2026-10-04")).toBe("Sep 28 – Oct 4");
    expect(formatRange("2026-12-28", "2027-01-03")).toBe("Dec 28, 2026 – Jan 3, 2027");
  });

  it("uses the calendar week for Week", () => {
    const w = rangeWindow(TODAY, "week", 1);
    expect([w.start, w.end, w.prevStart, w.prevEnd]).toEqual(["2026-10-19", "2026-10-25", "2026-10-12", "2026-10-18"]);
    expect(w.label).toBe("Oct 19 – 25");
    expect(w.previousLabel).toBe("last week");
    const sunday = rangeWindow(TODAY, "week", 0);
    expect([sunday.start, sunday.end]).toEqual(["2026-10-18", "2026-10-24"]);
  });

  it("uses the last 30 days for Month", () => {
    const m = rangeWindow(TODAY, "month");
    expect([m.start, m.end, m.prevStart, m.prevEnd]).toEqual(["2026-09-24", "2026-10-23", "2026-08-25", "2026-09-23"]);
    expect(m.label).toBe("Last 30 days");
  });

  it("formats deltas in whole points", () => {
    expect(formatDelta(12)).toBe("+12 pts");
    expect(formatDelta(-4)).toBe("−4 pts");
    expect(formatDelta(0)).toBe("±0 pts");
  });
});

describe("periodStats", () => {
  const a = habit({ id: "a" });
  const b = habit({ id: "b" });

  it("leaves habits still open today out of the rate", () => {
    const history: History = { logs: { a: { [TODAY]: 1, [addDays(TODAY, -1)]: 1 }, b: { [addDays(TODAY, -1)]: 1 } } };
    const s = periodStats([a, b], history, TODAY, addDays(TODAY, -1), TODAY);
    // Yesterday 2/2, today a done and b still open (not counted).
    expect(s).toEqual({ scheduled: 3, done: 3, rate: 1, perfectDays: 1, elapsed: 2 });
  });

  it("counts today as a perfect day only once everything is done", () => {
    const history: History = { logs: { a: { [TODAY]: 1 }, b: { [TODAY]: 1 } } };
    expect(periodStats([a, b], history, TODAY, TODAY, TODAY).perfectDays).toBe(1);
  });

  it("ignores future days, skips and archived habits", () => {
    const history: History = {
      logs: { a: { [addDays(TODAY, -1)]: 1 } },
      skips: { b: { [addDays(TODAY, -1)]: true } },
    };
    const archived = habit({ id: "c", archived: true });
    const s = periodStats([a, b, archived], history, TODAY, addDays(TODAY, -1), addDays(TODAY, 5));
    expect(s.scheduled).toBe(1);
    expect(s.done).toBe(1);
    expect(s.elapsed).toBe(2);
  });

  it("is zero, not NaN, with nothing due", () => {
    expect(periodStats([], { logs: {} }, TODAY, addDays(TODAY, -6), TODAY)).toEqual({ scheduled: 0, done: 0, rate: 0, perfectDays: 0, elapsed: 7 });
    expect(periodStats([a], { logs: {} }, TODAY, addDays(TODAY, 1), addDays(TODAY, 3)).elapsed).toBe(0);
  });
});

describe("progressSummary on the demo data", () => {
  const state = createSeedState(TODAY);

  it("compares this week with last week", () => {
    const s = progressSummary(state.habits, state, TODAY, "week", 1);
    expect(s.window.label).toBe("Oct 19 – 25");
    expect(s.current.elapsed).toBe(5);
    expect(s.current.rate).toBeGreaterThan(0);
    expect(s.points).not.toBeNull();
    expect(s.points).toBe(Math.round(s.current.rate * 100) - Math.round(s.previous.rate * 100));
    expect(s.topStreak).toMatchObject({ habitId: "water", current: 47, freezes: 2 });
  });

  it("compares the last 30 days with the 30 before", () => {
    const s = progressSummary(state.habits, state, TODAY, "month", 1);
    expect(s.current.elapsed).toBe(MONTH_DAYS);
    expect(s.previous.elapsed).toBe(MONTH_DAYS);
    // The seed story improves over time (No phone after 10pm, Water's rough start).
    expect(s.points!).toBeGreaterThan(5);
  });

  it("has no comparison or top streak without history", () => {
    const s = progressSummary([habit({ createdAt: TODAY })], { logs: {} }, TODAY, "week");
    expect(s.points).toBeNull();
    expect(s.topStreak).toBeNull();
  });
});

describe("chartModel", () => {
  const state = createSeedState(TODAY);
  const model = chartModel(state.habits, state, TODAY, 1);

  it("keeps 7 week bars and 30 month bars", () => {
    expect(model.week).toHaveLength(7);
    expect(model.month).toHaveLength(MONTH_DAYS);
    expect(model.week.filter((b) => b.future).map((b) => b.key)).toEqual(["2026-10-24", "2026-10-25"]);
    expect(model.month[MONTH_DAYS - 1].isToday).toBe(true);
  });

  it("shares slots between views by day", () => {
    // Sep 24 .. Oct 25: 30 month days plus the weekend still ahead.
    expect(model.slots).toHaveLength(32);
    expect(model.slots[0].key).toBe("2026-09-24");
    expect(model.slots[0].week).toBeNull();
    const today = model.slots.find((s) => s.key === TODAY)!;
    expect(today.week?.index).toBe(4);
    expect(today.month?.index).toBe(29);
    expect(today.week?.bar.done).toBe(today.month?.bar.done);
    const saturday = model.slots.find((s) => s.key === "2026-10-24")!;
    expect(saturday.month).toBeNull();
    expect(saturday.week?.bar.future).toBe(true);
    const both = model.slots.filter((s) => s.week && s.month);
    expect(both.map((s) => s.key)).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"]);
  });

  it("picks the best past day and skips future and rest days", () => {
    const bars = [
      bar({ key: "2026-10-19", rate: 0.8, scheduled: 5, done: 4 }),
      bar({ key: "2026-10-20", rate: 1, scheduled: 4, done: 4 }),
      bar({ key: "2026-10-21", rate: 1, scheduled: 6, done: 6 }),
      bar({ key: "2026-10-22", rate: 0, scheduled: 0 }),
      bar({ key: "2026-10-24", rate: 0, future: true, scheduled: 5 }),
    ];
    expect(bestBar(bars)?.key).toBe("2026-10-21");
    expect(bestBar([bar({ future: true })])).toBeNull();
    expect(bestBar([])).toBeNull();
  });

  it("puts a tick on the first day of each week", () => {
    expect(monthTicks(model.month, 1)).toEqual([
      { index: 4, label: "Sep 28" },
      { index: 11, label: "Oct 5" },
      { index: 18, label: "Oct 12" },
      { index: 25, label: "Oct 19" },
    ]);
    expect(monthTicks(model.month, 0).map((t) => t.label)).toEqual(["Sep 27", "Oct 4", "Oct 11", "Oct 18"]);
  });

  it("describes bars for the tooltip and screen readers", () => {
    expect(describeBar(bar({ key: "2026-10-21", rate: 1, scheduled: 6, done: 6 }))).toEqual({
      date: "Wed, Oct 21",
      detail: "6 of 6 habits",
      value: "100%",
      spoken: "Wed, Oct 21: 6 of 6 habits, 100%",
    });
    expect(describeBar(bar({ key: TODAY, isToday: true, rate: 2 / 6, scheduled: 6, done: 2 })).spoken).toBe("Today, Fri, Oct 23: 2 of 6 habits so far, 33%");
    expect(describeBar(bar({ key: "2026-10-24", future: true })).detail).toBe("Coming up");
    expect(describeBar(bar({ key: "2026-10-18" })).spoken).toBe("Sun, Oct 18: rest day, nothing scheduled");
    expect(describeBar(bar({ key: "2026-10-18", rate: 1, scheduled: 1, done: 1 })).detail).toBe("1 of 1 habit");
  });

  it("summarises the chart in one sentence", () => {
    const week = progressSummary(state.habits, state, TODAY, "week");
    expect(chartSummary("week", model.week, week.current)).toMatch(/^Completion this week: \d+% average, best day [A-Z][a-z]+day(\. Today so far: \d+ of \d+)?$/);
    const month = progressSummary(state.habits, state, TODAY, "month");
    expect(chartSummary("month", model.month, month.current)).toMatch(/^Completion over the last 30 days: \d+% average, \d+ perfect days?$/);
    expect(chartSummary("week", [], { scheduled: 0, done: 0, rate: 0, perfectDays: 0, elapsed: 0 })).toBe("Completion this week: nothing checked in yet");
  });
});

describe("dayDetail", () => {
  const state = createSeedState(TODAY);
  const stateOf = (key: string, id: string) => dayDetail(state.habits, state, TODAY, key).habits.find((d) => d.habit.id === id);

  it("shows today's open, partial and done habits", () => {
    const day = dayDetail(state.habits, state, TODAY, TODAY);
    expect(day.isToday).toBe(true);
    expect(day.habits).toHaveLength(6);
    expect(stateOf(TODAY, "water")).toMatchObject({ state: "partial", value: 5, time: null });
    expect(stateOf(TODAY, "strength")?.state).toBe("open");
    expect(stateOf(TODAY, "read")?.state).toBe("open");
    const meditate = stateOf(TODAY, "meditate")!;
    expect(meditate.state).toBe("done");
    expect(meditate.time).toBeGreaterThan(5 * 60);
    expect(meditate.time).toBeLessThan(9 * 60);
  });

  it("marks the day a freeze saved Water's streak", () => {
    const key = addDays(TODAY, -21);
    expect(stateOf(key, "water")).toMatchObject({ state: "frozen", value: 4 });
  });

  it("marks skips and rest days", () => {
    expect(stateOf(addDays(TODAY, -10), "walk")?.state).toBe("skipped");
    // Saturday Oct 17: Strength (Mon/Wed/Fri) is resting.
    const saturday = dayDetail(state.habits, state, TODAY, "2026-10-17");
    expect(saturday.resting.map((h) => h.id)).toEqual(["strength"]);
    expect(saturday.habits.some((d) => d.habit.id === "strength")).toBe(false);
  });

  it("tells freeze-covered days from the miss that broke a streak", () => {
    // Meditate's 3-day gap (offsets 5..3): two freezes covered the first two days, the third broke the run.
    expect(stateOf(addDays(TODAY, -5), "meditate")?.state).toBe("frozen");
    expect(stateOf(addDays(TODAY, -4), "meditate")?.state).toBe("frozen");
    expect(stateOf(addDays(TODAY, -3), "meditate")?.state).toBe("missed");
  });

  it("flags days before the first habit", () => {
    const early = dayDetail(state.habits, state, TODAY, "2026-08-01");
    expect(early.beforeHistory).toBe(true);
    expect(early.habits).toEqual([]);
    expect(dayDetail(state.habits, state, TODAY, addDays(TODAY, 1)).future).toBe(true);
  });
});

describe("streakBoard", () => {
  const state = createSeedState(TODAY);
  const board = streakBoard(state.habits, state, TODAY);

  it("ranks habits by live streak", () => {
    expect(board).toHaveLength(6);
    expect(board[0]).toMatchObject({ current: 47, freezes: 2, personalBest: true, ratio: 1 });
    expect(board[0].habit.id).toBe("water");
    for (let i = 1; i < board.length; i++) expect(board[i - 1].current).toBeGreaterThanOrEqual(board[i].current);
  });

  it("compares the live streak with the best one", () => {
    const meditate = board.find((c) => c.habit.id === "meditate")!;
    expect(meditate.current).toBe(3);
    expect(meditate.best.length).toBe(21);
    expect(meditate.ratio).toBeCloseTo(3 / 21);
    expect(meditate.personalBest).toBe(false);
    const read = board.find((c) => c.habit.id === "read")!;
    expect(read.current).toBe(12);
    expect(read.best.length).toBe(19);
  });

  it("formats a run's dates", () => {
    expect(formatRun({ length: 21, start: "2026-09-07", end: "2026-09-27" })).toBe("Sep 7 – Sep 27");
    expect(formatRun({ length: 1, start: "2026-09-07", end: "2026-09-07" })).toBe("Sep 7");
    expect(formatRun({ length: 0, start: null, end: null })).toBe("");
  });

  it("handles habits without any history", () => {
    const [card] = streakBoard([habit({ createdAt: TODAY })], { logs: {} }, TODAY);
    expect(card).toMatchObject({ current: 0, ratio: 0, personalBest: false });
  });
});

describe("one 30-day number everywhere", () => {
  // 2026-10-23 at 17:40 is the showcase clock; the seed is relative to it.
  const state = createSeedState(TODAY);
  const active = state.habits.filter((h) => !h.archived);

  it("Progress Month, the trend insight and Profile agree on rate and points", () => {
    const month = progressSummary(active, state, TODAY, "month", 1);
    const trend = trendSummary(active, state, TODAY, MONTH_DAYS)!;
    const profile = profileStats(active, state.habits, state, TODAY);
    expect(trend).not.toBeNull();
    expect(trend.current).toBe(month.current.rate);
    expect(trend.previous).toBe(month.previous.rate);
    expect(trend.points).toBe(month.points);
    expect(profile.rate30).toBe(month.current.rate);
    // And the card's sentence uses the same rounded numbers as the tile.
    const card = buildInsights(active, state, TODAY).find((i) => i.kind === "trend");
    if (card) expect(card.body).toContain(`${Math.round(month.current.rate * 100)}%`);
  });
});
