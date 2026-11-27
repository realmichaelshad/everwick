import { describe, expect, it } from "vitest";

import { addDays, weekdayOf } from "@/data/dates";
import {
  completionRate,
  dailySeries,
  fractionOn,
  heatLevel,
  heatmap,
  isScheduledOn,
  periodStats,
  perfectDays,
  ratePoints,
  rollingCompletion,
  streakInfo,
  summarizeDay,
  topLiveStreak,
  weekdayConsistency,
  weekSeries,
} from "@/data/stats";
import { ALL_DAYS, type Habit, type History, type Weekday } from "@/data/types";

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

/** Mark offsets (days before TODAY) as done. */
function logsFor(id: string, offsets: number[], value = 1): History {
  const entries: Record<string, number> = {};
  for (const o of offsets) entries[addDays(TODAY, -o)] = value;
  return { logs: { [id]: entries } };
}

const EMPTY: History = { logs: {} };

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("current streak", () => {
  it("counts consecutive days through yesterday while today is still open", () => {
    const h = habit();
    expect(streakInfo(h, logsFor("h", range(1, 12)), TODAY).current).toBe(12);
  });

  it("includes today once it is done", () => {
    const h = habit();
    expect(streakInfo(h, logsFor("h", range(0, 12)), TODAY).current).toBe(13);
  });

  it("is zero when yesterday was missed, no freeze was held and today is open", () => {
    const h = habit();
    // A 5-day run earns no freeze (one is earned every 7 check-ins), so the miss ends it.
    expect(streakInfo(h, logsFor("h", range(2, 6)), TODAY).current).toBe(0);
  });

  it("skips unscheduled days instead of breaking (Mon/Wed/Fri)", () => {
    const h = habit({ schedule: [1, 3, 5] });
    // Done on the previous six scheduled days only; Tue/Thu/weekends are empty.
    const offsets: number[] = [];
    for (let o = 1; offsets.length < 6; o++) {
      if ([1, 3, 5].includes(weekdayOf(addDays(TODAY, -o)))) offsets.push(o);
    }
    expect(streakInfo(h, logsFor("h", offsets), TODAY).current).toBe(6);
  });

  it("does not count days before the habit existed", () => {
    const h = habit({ createdAt: addDays(TODAY, -3) });
    expect(streakInfo(h, logsFor("h", range(1, 20)), TODAY).current).toBe(3);
  });

  it("needs the full target for target habits", () => {
    const h = habit({ target: 8 });
    const logs: History = { logs: { h: { [addDays(TODAY, -1)]: 8, [addDays(TODAY, -2)]: 7, [addDays(TODAY, -3)]: 8 } } };
    expect(streakInfo(h, logs, TODAY).current).toBe(1);
  });
});

describe("best streak", () => {
  it("finds the longest run and its dates", () => {
    const h = habit();
    const logs = logsFor("h", [...range(1, 3), ...range(10, 30)]);
    const best = streakInfo(h, logs, TODAY).best;
    expect(best.length).toBe(21);
    expect(best.start).toBe(addDays(TODAY, -30));
    expect(best.end).toBe(addDays(TODAY, -10));
  });

  it("treats an open today as neither a break nor a day", () => {
    const h = habit();
    const runs = streakInfo(h, logsFor("h", range(1, 5)), TODAY).runs;
    expect(runs).toHaveLength(1);
    expect(runs[0].length).toBe(5);
  });

  it("returns an empty run when nothing was done", () => {
    expect(streakInfo(habit(), EMPTY, TODAY).best).toEqual({ length: 0, start: null, end: null });
  });
});

describe("partial progress", () => {
  it("reports 5 of 8 glasses as 0.625 and not done", () => {
    const h = habit({ target: 8, unit: "glasses" });
    const logs: History = { logs: { h: { [TODAY]: 5 } } };
    expect(fractionOn(h, logs, TODAY)).toBeCloseTo(0.625);
    expect(summarizeDay([h], logs, TODAY, TODAY).done).toBe(0);
    expect(summarizeDay([h], logs, TODAY, TODAY).fraction).toBeCloseTo(0.625);
  });

  it("averages partial progress across habits for the daily ring", () => {
    const water = habit({ id: "w", target: 8 });
    const read = habit({ id: "r" });
    const logs: History = { logs: { w: { [TODAY]: 4 }, r: { [TODAY]: 1 } } };
    const s = summarizeDay([water, read], logs, TODAY, TODAY);
    expect(s.scheduled).toBe(2);
    expect(s.done).toBe(1);
    expect(s.fraction).toBeCloseTo(0.75);
  });

  it("ignores archived habits and unscheduled habits", () => {
    const a = habit({ id: "a", archived: true });
    const b = habit({ id: "b", schedule: [((weekdayOf(TODAY) + 1) % 7) as Weekday] });
    expect(summarizeDay([a, b], EMPTY, TODAY, TODAY).scheduled).toBe(0);
    expect(isScheduledOn(b, TODAY)).toBe(false);
  });
});

describe("completion rates", () => {
  it("computes done / scheduled over a range", () => {
    const h = habit();
    const logs = logsFor("h", [1, 2, 3, 5]);
    expect(completionRate([h], logs, addDays(TODAY, -6), addDays(TODAY, -1), TODAY)).toBeCloseTo(4 / 6);
  });

  it("ignores future days", () => {
    const h = habit();
    const logs = logsFor("h", [0]);
    expect(completionRate([h], logs, TODAY, addDays(TODAY, 5), TODAY)).toBe(1);
  });

  it("does not let an open today drag a habit's 30-day rate down", () => {
    const h = habit();
    expect(periodStats([h], logsFor("h", range(1, 29)), TODAY, addDays(TODAY, -29), TODAY).rate).toBe(1);
  });

  it("builds the current week Monday-first with future days flagged", () => {
    const h = habit();
    const bars = weekSeries([h], logsFor("h", range(0, 10)), TODAY, 1);
    expect(bars).toHaveLength(7);
    expect(bars[0].label).toBe("M");
    expect(weekdayOf(bars[0].key)).toBe(1);
    expect(bars.find((b) => b.isToday)?.key).toBe(TODAY);
    // Friday is today, so Saturday and Sunday are in the future.
    expect(bars.filter((b) => b.future)).toHaveLength(2);
    expect(bars.filter((b) => !b.future).every((b) => b.rate === 1)).toBe(true);
  });

  it("has a daily series for the month", () => {
    const h = habit();
    expect(dailySeries([h], EMPTY, TODAY, 30)).toHaveLength(30);
  });
});

describe("period completion (one rule for every screen)", () => {
  it("leaves today's open habits out and counts today's check-ins", () => {
    const a = habit({ id: "a" });
    const b = habit({ id: "b" });
    // Yesterday: both done. Today: a done, b still open.
    const logs: History = { logs: { a: { [addDays(TODAY, -1)]: 1, [TODAY]: 1 }, b: { [addDays(TODAY, -1)]: 1 } } };
    const s = periodStats([a, b], logs, TODAY, addDays(TODAY, -1), TODAY);
    expect(s).toMatchObject({ scheduled: 3, done: 3, rate: 1, elapsed: 2 });
    expect(completionRate([a, b], logs, addDays(TODAY, -1), TODAY, TODAY)).toBe(1);
  });

  it("rounds points from the percentages people see", () => {
    expect(ratePoints(0.796, 0.634)).toBe(17); // 80% vs 63%
    expect(ratePoints(0.5, 0.5)).toBe(0);
  });

  it("compares the last N days (ending today) with the N before", () => {
    const h = habit();
    const r = rollingCompletion([h], logsFor("h", range(1, 6)), TODAY, 7);
    expect(r.current.rate).toBe(1); // today is open and left out
    expect(r.previous.rate).toBe(0);
    expect(r.points).toBe(100);
    expect(r.start).toBe(addDays(TODAY, -6));
    expect(r.prevEnd).toBe(addDays(TODAY, -7));
  });

  it("has no comparison when the previous window had nothing due", () => {
    const h = habit({ createdAt: addDays(TODAY, -3) });
    expect(rollingCompletion([h], logsFor("h", range(0, 3)), TODAY, 7).points).toBeNull();
  });

  it("picks the longest live streak (ties: more freezes, then list order)", () => {
    const a = habit({ id: "a", order: 0 });
    const b = habit({ id: "b", order: 1 });
    const logs: History = { logs: { ...logsFor("a", range(1, 5)).logs, ...logsFor("b", range(1, 9)).logs } };
    expect(topLiveStreak([a, b], logs, TODAY)).toMatchObject({ habitId: "b", current: 9 });
    expect(topLiveStreak([a, b], EMPTY, TODAY)).toBeNull();
    expect(topLiveStreak([{ ...b, archived: true }, a], logs, TODAY)?.habitId).toBe("a");
  });
});

describe("heatmap", () => {
  it("maps rates to five levels", () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(0.2)).toBe(1);
    expect(heatLevel(0.5)).toBe(2);
    expect(heatLevel(0.8)).toBe(3);
    expect(heatLevel(1)).toBe(4);
  });

  it("builds 13 week columns of 7 days ending with the current week", () => {
    const h = habit();
    const map = heatmap([h], logsFor("h", range(0, 59)), TODAY, { weeks: 13, weekStartsOn: 1 });
    expect(map.columns).toHaveLength(13);
    expect(map.columns.every((c) => c.length === 7)).toBe(true);
    expect(weekdayOf(map.columns[0][0].key)).toBe(1);
    const last = map.columns[12];
    expect(last.some((c) => c.key === TODAY)).toBe(true);
    // Saturday and Sunday after Friday-today are future cells.
    expect(last.filter((c) => c.future)).toHaveLength(2);
    // Days before history began are empty, recent days are full.
    expect(map.columns[0][0].empty).toBe(true);
    expect(last.find((c) => c.key === TODAY)?.level).toBe(4);
    expect(map.months.length).toBeGreaterThanOrEqual(3);
    expect(map.months[0].column).toBe(0);
  });
});

describe("insights", () => {
  it("returns weekday stats in week order", () => {
    const stats = weekdayConsistency([habit()], EMPTY, TODAY, 28, 1);
    expect(stats.map((s) => s.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("counts perfect days", () => {
    const a = habit({ id: "a" });
    const b = habit({ id: "b" });
    const logs: History = { logs: { ...logsFor("a", [1, 2, 3]).logs, ...logsFor("b", [2, 3, 4]).logs } };
    expect(perfectDays([a, b], logs, TODAY, 10)).toBe(2);
  });
});
