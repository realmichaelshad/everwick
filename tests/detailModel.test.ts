import { describe, expect, it } from "vitest";

import { reducer } from "@/data/reducer";
import { createSeedState } from "@/data/seed";
import { streakInfo } from "@/data/stats";

import {
  cellLabel,
  clampMonth,
  dayState,
  freezeCopy,
  formatRange,
  inChain,
  isActionable,
  monthBounds,
  monthGrid,
  monthTitle,
  nextScheduledDay,
  rateDetail,
  restDayLine,
  restoreDay,
  restoreHabit,
  shiftMonth,
  stateLine,
  streakAfterCheckIn,
  summarizeMonth,
  totalCheckins,
  typicalCheckinTime,
  weekdayHeaders,
} from "@/components/habit/detailModel";

const TODAY = "2026-10-23"; // Friday
const seed = createSeedState(TODAY, { onboarded: true });
const habit = (id: string, s = seed) => s.habits.find((h) => h.id === id)!;
const frozenOf = (id: string, s = seed) => new Set(streakInfo(habit(id, s), s, TODAY).frozen);

describe("month grid", () => {
  it("lays October 2026 out Monday-first with blanks around the month", () => {
    const rows = monthGrid("2026-10-01", 1);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(rows[4]).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", null]);
    expect(rows.every((r) => r.length === 7)).toBe(true);
  });

  it("supports Sunday-first weeks", () => {
    const rows = monthGrid("2026-10-15", 0);
    expect(rows[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weekdayHeaders(0)[0]).toEqual({ letter: "S", name: "Sun" });
    expect(weekdayHeaders(1).map((h) => h.letter).join("")).toBe("MTWTFSS");
  });

  it("moves between months across year ends and stays within the habit's months", () => {
    expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-31", -1)).toBe("2025-12-01");
    expect(monthTitle("2026-10-01")).toBe("October 2026");
    const bounds = monthBounds(habit("water"), TODAY);
    expect(bounds).toEqual({ min: "2026-08-01", max: "2026-10-01" });
    expect(clampMonth("2026-12-01", bounds)).toBe("2026-10-01");
    expect(clampMonth("2026-05-09", bounds)).toBe("2026-08-01");
  });
});

describe("day states (seed story at Fri Oct 23)", () => {
  const water = habit("water");
  const fz = frozenOf("water");

  it("marks water's slow Sunday three weeks ago as frozen, not partial", () => {
    expect(dayState(water, seed, "2026-10-02", TODAY, fz)).toBe("frozen");
  });

  it("shows today's 5 of 8 glasses as partial and future days as future", () => {
    expect(dayState(water, seed, TODAY, TODAY, fz)).toBe("partial");
    expect(dayState(water, seed, "2026-10-24", TODAY, fz)).toBe("future");
    expect(dayState(water, seed, "2026-08-01", TODAY, fz)).toBe("before");
  });

  it("treats Strength's rest days as unscheduled and today's session as open", () => {
    const strength = habit("strength");
    const f = frozenOf("strength");
    expect(dayState(strength, seed, "2026-10-22", TODAY, f)).toBe("unscheduled");
    expect(dayState(strength, seed, TODAY, TODAY, f)).toBe("open");
    expect(dayState(strength, seed, "2026-10-21", TODAY, f)).toBe("done");
  });

  it("shows the planned walk skip and real misses", () => {
    const walk = habit("walk");
    expect(dayState(walk, seed, "2026-10-13", TODAY, frozenOf("walk"))).toBe("skipped");
    const read = habit("read");
    expect(dayState(read, seed, "2026-10-08", TODAY, frozenOf("read"))).toBe("missed");
  });

  it("knows which states can be opened and which join a streak chain", () => {
    expect(isActionable("missed")).toBe(true);
    expect(isActionable("open")).toBe(true);
    expect(isActionable("unscheduled")).toBe(false);
    expect(isActionable("future")).toBe(false);
    expect(inChain("done") && inChain("frozen")).toBe(true);
    expect(inChain("skipped") || inChain(null)).toBe(false);
  });

  it("writes full spoken labels for cells", () => {
    const read = habit("read");
    expect(cellLabel(read, seed, "2026-10-12", "done", TODAY)).toMatch(/^Oct 12, done at \d{1,2}:\d{2} PM$/);
    expect(cellLabel(water, seed, TODAY, "partial", TODAY)).toBe("Today, Oct 23, 5 of 8 glasses");
    expect(cellLabel(water, seed, "2026-10-02", "frozen", TODAY)).toBe("Oct 2, missed, a freeze saved your streak");
    expect(stateLine(water, seed, TODAY, "partial")).toBe("5 of 8 glasses so far");
  });

  it("summarizes a month without counting today while it's open", () => {
    const s = summarizeMonth(water, seed, "2026-10-01", TODAY, fz);
    expect(s).toEqual({ due: 22, done: 21, frozen: 1, missed: 0, skipped: 0 });
  });
});

describe("stats", () => {
  it("counts the 30-day rate with its parts", () => {
    const water = rateDetail(habit("water"), seed, TODAY);
    expect(water.due).toBe(29); // today is open, so not counted yet
    expect(water.done).toBe(28);
    expect(water.rate).toBeCloseTo(28 / 29);
    const empty = rateDetail({ ...habit("water"), createdAt: "2026-11-01" }, seed, TODAY);
    expect(empty).toEqual({ rate: 0, done: 0, due: 0 });
  });

  it("totals every completed day", () => {
    expect(totalCheckins(habit("strength"), seed, TODAY)).toBe(20);
    expect(totalCheckins(habit("water"), seed, TODAY)).toBeGreaterThanOrEqual(47);
  });

  it("finds a typical check-in time rounded to 5 minutes", () => {
    const meditate = typicalCheckinTime(habit("meditate"), seed, TODAY)!;
    expect(meditate % 5).toBe(0);
    expect(meditate).toBeGreaterThanOrEqual(6 * 60 + 45);
    expect(meditate).toBeLessThanOrEqual(7 * 60 + 40);
    expect(typicalCheckinTime(habit("read"), { logs: {} }, TODAY)).toBeNull();
  });

  it("formats ranges with an en dash", () => {
    expect(formatRange("2026-09-10", "2026-09-28")).toBe("Sep 10 – Sep 28");
    expect(formatRange("2026-09-10", "2026-09-10")).toBe("Sep 10");
    expect(formatRange(null, null)).toBe("");
  });
});

describe("rest days", () => {
  it("says when a Mon/Wed/Fri habit is back", () => {
    const strength = habit("strength");
    expect(nextScheduledDay(strength, TODAY)).toBe("2026-10-26");
    expect(restDayLine(strength, "2026-10-24")).toBe("Rest day, back on Mon");
    expect(restDayLine(strength, "2026-10-25")).toBe("Rest day, back tomorrow");
    expect(restDayLine({ ...strength, schedule: [] }, TODAY)).toBe("Rest day");
  });
});

describe("freezes", () => {
  it("describes a full bank and the day a freeze saved the streak", () => {
    const copy = freezeCopy(streakInfo(habit("water"), seed, TODAY));
    expect(copy.title).toBe("2 freezes ready");
    expect(copy.progress).toBeNull();
    expect(copy.saves).toEqual(["Saved your streak on Oct 2"]);
  });

  it("shows progress toward the next freeze", () => {
    const copy = freezeCopy(streakInfo(habit("read"), seed, TODAY));
    expect(copy.title).toBe("1 freeze ready");
    expect(copy.progressLabel).toBe("2 more check-ins for your next freeze");
    expect(copy.progress).toBeCloseTo(5 / 7);
  });

  it("explains how to earn one when no streak is live", () => {
    const copy = freezeCopy({ current: 0, currentStart: null, best: { length: 0, start: null, end: null }, runs: [], freezes: 0, frozen: [], nextFreezeIn: null });
    expect(copy.title).toBe("No freezes yet");
    expect(copy.progressLabel).toBe("Check in 7 days in a row to earn a freeze");
  });

  it("says the bank is empty for now (not 'yet') once a freeze has saved a streak", () => {
    const copy = freezeCopy({ current: 3, currentStart: null, best: { length: 9, start: null, end: null }, runs: [], freezes: 0, frozen: ["2026-09-14"], nextFreezeIn: 4 });
    expect(copy.title).toBe("No freezes ready");
    expect(copy.saves).toEqual(["Saved your streak on Sep 14"]);
  });
});

describe("streak after a check-in", () => {
  it("extends Read's 12-day streak to 13 when today is checked in", () => {
    expect(streakAfterCheckIn(habit("read"), seed, TODAY, TODAY)).toBe(13);
  });

  it("counts a late check-in that rejoins a run", () => {
    // Meditate missed Oct 20; checking it in late joins the 21-day run (with its two frozen days) to today's 3.
    const after = streakAfterCheckIn(habit("meditate"), seed, "2026-10-20", TODAY);
    expect(after).toBeGreaterThan(3);
  });
});

describe("undo helpers", () => {
  it("restores one day exactly, keeping the original check-in time and later changes", () => {
    const before = seed;
    const originalTime = before.times.read["2026-10-12"];
    let s = reducer(before, { type: "setValue", habitId: "read", key: "2026-10-12", value: 0, at: 0 });
    s = reducer(s, { type: "toggle", habitId: "strength", key: TODAY, at: 1100 }); // something else happens
    const undone = restoreDay(s, before, "read", "2026-10-12");
    expect(undone.logs.read["2026-10-12"]).toBe(1);
    expect(undone.times.read["2026-10-12"]).toBe(originalTime);
    expect(undone.logs.strength[TODAY]).toBe(1);
  });

  it("restores a skip that was undone", () => {
    const skipped = reducer(seed, { type: "skip", habitId: "walk", key: TODAY, skipped: true });
    const unskipped = reducer(skipped, { type: "skip", habitId: "walk", key: TODAY, skipped: false });
    expect(restoreDay(unskipped, skipped, "walk", TODAY).skips.walk[TODAY]).toBe(true);
    expect(restoreDay(skipped, seed, "walk", TODAY).logs.walk[TODAY]).toBe(seed.logs.walk[TODAY]);
  });

  it("brings a deleted habit back in place with its history", () => {
    let s = reducer(seed, { type: "deleteHabit", id: "read" });
    s = reducer(s, { type: "toggle", habitId: "strength", key: TODAY, at: 1100 });
    const back = restoreHabit(s, seed, "read");
    expect(back.habits.map((h) => h.id)).toEqual(seed.habits.map((h) => h.id));
    expect(back.logs.read).toEqual(seed.logs.read);
    expect(back.times.read).toEqual(seed.times.read);
    expect(back.logs.strength[TODAY]).toBe(1);
    expect(restoreHabit(back, seed, "read")).toBe(back);
  });
});
