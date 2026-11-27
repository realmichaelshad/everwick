import { describe, expect, it } from "vitest";

import { addDays, weekdayOf } from "@/data/dates";
import { FREEZE_EVERY, isDueOn, MAX_FREEZES, streakInfo, summarizeDay } from "@/data/stats";
import { ALL_DAYS, type Habit, type History } from "@/data/types";

const TODAY = "2026-10-23"; // Friday

function habit(partial: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    name: "Test",
    icon: "book",
    color: "violet",
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

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function history(done: number[], skipped: number[] = []): History {
  const logs: Record<string, number> = {};
  for (const o of done) logs[addDays(TODAY, -o)] = 1;
  const skips: Record<string, true> = {};
  for (const o of skipped) skips[addDays(TODAY, -o)] = true;
  return { logs: { h: logs }, skips: { h: skips } };
}

describe("streak freezes", () => {
  it("earns one freeze per 7 check-ins, up to the maximum", () => {
    expect(FREEZE_EVERY).toBe(7);
    expect(MAX_FREEZES).toBe(2);
    expect(streakInfo(habit(), history(range(1, 6)), TODAY).freezes).toBe(0);
    expect(streakInfo(habit(), history(range(1, 7)), TODAY).freezes).toBe(1);
    expect(streakInfo(habit(), history(range(1, 14)), TODAY).freezes).toBe(2);
    expect(streakInfo(habit(), history(range(1, 40)), TODAY).freezes).toBe(2);
  });

  it("spends a freeze on a missed day and keeps the streak alive", () => {
    // 10 days done (offsets 12..3), missed 2 days ago, done yesterday.
    const info = streakInfo(habit(), history([...range(3, 12), 1]), TODAY);
    expect(info.frozen).toEqual([addDays(TODAY, -2)]);
    expect(info.current).toBe(11); // frozen days bridge the run but don't add to it
    expect(info.freezes).toBe(0);
  });

  it("breaks the streak when more days are missed than freezes held", () => {
    // 14 done earns 2 freezes; 3 misses in a row spend both and then break.
    const info = streakInfo(habit(), history([...range(5, 18), 1]), TODAY);
    expect(info.frozen).toEqual([addDays(TODAY, -4), addDays(TODAY, -3)]);
    expect(info.current).toBe(1);
    expect(info.best.length).toBe(14);
    expect(info.runs).toHaveLength(2);
  });

  it("only spends freezes while a streak is live", () => {
    const info = streakInfo(habit(), history([...range(20, 26)]), TODAY); // 7 done, then nothing
    // One freeze earned at 7, spent on offset 19; offset 18 breaks the run; later misses cost nothing.
    expect(info.frozen).toEqual([addDays(TODAY, -19)]);
    expect(info.current).toBe(0);
    expect(info.freezes).toBe(0);
    const kept = streakInfo(habit(), history([...range(30, 43), ...range(20, 22)]), TODAY);
    // 14 done (2 freezes) -> misses 29, 28 frozen, 27 breaks; 23..27 misses don't spend; 22..20 new run.
    expect(kept.frozen).toEqual([addDays(TODAY, -29), addDays(TODAY, -28)]);
    expect(kept.freezes).toBe(0);
  });

  it("never spends a freeze on today while it is still open", () => {
    const info = streakInfo(habit(), history(range(1, 7)), TODAY);
    expect(info.current).toBe(7);
    expect(info.freezes).toBe(1);
    expect(info.frozen).toEqual([]);
    expect(info.nextFreezeIn).toBe(7);
  });

  it("counts toward the next freeze and reports a full bank as null", () => {
    expect(streakInfo(habit(), history(range(1, 3)), TODAY).nextFreezeIn).toBe(4);
    expect(streakInfo(habit(), history(range(1, 14)), TODAY).nextFreezeIn).toBeNull();
    expect(streakInfo(habit(), history([]), TODAY).nextFreezeIn).toBeNull();
  });
});

describe("schedules and skips", () => {
  it("ignores unscheduled days for a Mon/Wed/Fri habit", () => {
    const h = habit({ schedule: [1, 3, 5] });
    const mwf = range(1, 30).filter((o) => [1, 3, 5].includes(weekdayOf(addDays(TODAY, -o))));
    const info = streakInfo(h, history(mwf), TODAY);
    expect(info.current).toBe(mwf.length);
    expect(info.frozen).toEqual([]);
  });

  it("treats a skipped day as neutral: no break, no freeze, no count", () => {
    const info = streakInfo(habit(), history([1, 2, 4, 5], [3]), TODAY);
    expect(info.current).toBe(4);
    expect(info.frozen).toEqual([]);
    expect(isDueOn(habit(), history([], [0]), TODAY)).toBe(false);
  });

  it("removes skipped habits from the day's total", () => {
    const a = habit({ id: "a" });
    const b = habit({ id: "b" });
    const h: History = { logs: { a: { [TODAY]: 1 } }, skips: { b: { [TODAY]: true } } };
    const day = summarizeDay([a, b], h, TODAY, TODAY);
    expect(day.scheduled).toBe(1);
    expect(day.skipped).toBe(1);
    expect(day.done).toBe(1);
    expect(day.rate).toBe(1);
  });

  it("does not count days before the habit was created", () => {
    const h = habit({ createdAt: addDays(TODAY, -2) });
    const info = streakInfo(h, history(range(1, 20)), TODAY);
    expect(info.current).toBe(2);
  });
});
