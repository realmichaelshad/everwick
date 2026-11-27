import { describe, expect, it } from "vitest";

import { checkInMessage, clearMessage, mergeOrder, moveId, nextCheckInValue, openHabitsLine, perfectDayMessage, skipMessage, unskipMessage } from "@/components/today/todayModel";
import { restoreDay } from "@/components/habit/detailModel";
import { addDays } from "@/data/dates";
import { reducer } from "@/data/reducer";
import { createSeedState } from "@/data/seed";

const TODAY = "2026-10-23";

describe("what a tap or swipe does", () => {
  const glasses = { target: 8 };
  const simple = { target: 1 };

  it("adds one glass on tap and fills the target on swipe", () => {
    expect(nextCheckInValue(glasses, { value: 5, done: false, skipped: false }, "tap")).toBe(6);
    expect(nextCheckInValue(glasses, { value: 5, done: false, skipped: false }, "complete")).toBe(8);
  });

  it("checks a simple habit in and a done one back out", () => {
    expect(nextCheckInValue(simple, { value: 0, done: false, skipped: false }, "tap")).toBe(1);
    expect(nextCheckInValue(simple, { value: 1, done: true, skipped: false }, "tap")).toBe(0);
    expect(nextCheckInValue(glasses, { value: 8, done: true, skipped: false }, "complete")).toBe(0);
  });

  it("checks a skipped target habit in completely", () => {
    expect(nextCheckInValue(glasses, { value: 0, done: false, skipped: true }, "tap")).toBe(8);
  });
});

describe("toast copy", () => {
  const water = { name: "Drink water", schedule: [0, 1, 2, 3, 4, 5, 6] as const };
  const strength = { name: "Strength workout", schedule: [1, 3, 5] as const };
  const daily = { ...water, schedule: [...water.schedule] };
  const mwf = { ...strength, schedule: [...strength.schedule] };

  it("is one short line in the habit's own streak unit", () => {
    expect(checkInMessage(daily, 48, TODAY, TODAY)).toBe("Drink water · 48-day\u00A0streak");
    expect(checkInMessage(mwf, 7, TODAY, TODAY)).toBe("Strength workout · 7 in\u00A0a\u00A0row");
    expect(checkInMessage({ ...daily, name: "Read 20 minutes" }, 1, TODAY, TODAY)).toBe("Read 20 minutes checked in");
    expect(checkInMessage({ ...daily, name: "Read 20 minutes" }, null, TODAY, TODAY)).toBe("Read 20 minutes checked in");
    expect(checkInMessage(daily, null, "2026-10-19", TODAY)).toBe("Drink water checked in for Oct 19");
    expect(checkInMessage(daily, 12, "2026-10-19", TODAY)).toBe("Drink water for Oct 19 · 12-day\u00A0streak");
    expect(perfectDayMessage(6)).toBe("Perfect day. All 6 habits done");
    expect(perfectDayMessage(1)).toBe("Perfect day. Your habit is done");
  });

  it("names the day for skips and fixes on another day, the same on Today and detail", () => {
    expect(skipMessage("Walk 8k steps", TODAY, TODAY)).toBe("Walk 8k steps skipped · streak safe");
    expect(skipMessage("Walk 8k steps", "2026-10-19", TODAY)).toBe("Walk 8k steps skipped for Oct 19");
    expect(unskipMessage("Walk 8k steps", TODAY, TODAY)).toBe("Walk 8k steps is back on for today");
    expect(unskipMessage("Walk 8k steps", "2026-10-19", TODAY)).toBe("Walk 8k steps is back on for Oct 19");
    expect(clearMessage("Read 20 minutes", TODAY, TODAY)).toBe("Read 20 minutes: check-in removed");
    expect(clearMessage("Read 20 minutes", "2026-10-19", TODAY)).toBe("Read 20 minutes: check-in removed for Oct 19");
  });

  it("keeps every toast to one line at phone width (about 40 characters)", () => {
    for (const m of [checkInMessage(daily, 48, TODAY, TODAY), checkInMessage(mwf, 7, TODAY, TODAY), skipMessage("Drink water", TODAY, TODAY), perfectDayMessage(6)]) {
      expect(m.length).toBeLessThanOrEqual(40);
    }
  });
});

describe("the day card's what's-left sentence", () => {
  it("lists names when they fit and summarizes when they don't, never cut off", () => {
    expect(openHabitsLine(["Read 20 minutes"])).toBe("Read 20 minutes is still open.");
    expect(openHabitsLine(["Walk 8k steps", "Read"])).toBe("Walk 8k steps and Read are still open.");
    expect(openHabitsLine(["Read 20 minutes", "No phone after 10pm"])).toBe("Read 20 minutes and 1 more are still open.");
    expect(openHabitsLine(["Drink water", "Read 20 minutes", "No phone after 10pm", "Strength workout"])).toBe("Drink water and 3 more are still open.");
    expect(openHabitsLine(["A very long habit name that goes on", "Another long one"])).toBe("2 habits are still open.");
    for (const names of [["Read 20 minutes", "No phone after 10pm"], ["Meditate 10 minutes", "Strength workout", "Walk 8k steps"]]) {
      expect(openHabitsLine(names).length).toBeLessThanOrEqual(48);
    }
  });
});

describe("reorder", () => {
  it("keeps resting habits in their slots", () => {
    expect(mergeOrder(["a", "b", "c", "d"], ["d", "b"])).toEqual(["a", "d", "c", "b"]);
    expect(mergeOrder(["a", "b"], ["b", "a"])).toEqual(["b", "a"]);
    expect(mergeOrder(["a", "b", "c"], [])).toEqual(["a", "b", "c"]);
  });

  it("moves one step up or down and stops at the ends", () => {
    expect(moveId(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveId(["a", "b", "c"], "a", -1)).toBeNull();
    expect(moveId(["a", "b", "c"], "c", 1)).toBeNull();
    expect(moveId(["a", "b", "c"], "x", 1)).toBeNull();
  });
});

describe("undo on Today restores the whole day", () => {
  it("brings back the value, the skip and the original check-in time", () => {
    const before = createSeedState(TODAY, { onboarded: true });
    // Walk was done today at its usual time; mark it not done by mistake, then Undo.
    expect(before.times.walk[TODAY]).toBeTypeOf("number");
    const after = reducer(before, { type: "setValue", habitId: "walk", key: TODAY, value: 0, at: 600 });
    expect(after.times.walk[TODAY]).toBeUndefined();
    const undone = restoreDay(after, before, "walk", TODAY);
    expect(undone.logs.walk[TODAY]).toBe(1);
    expect(undone.times.walk[TODAY]).toBe(before.times.walk[TODAY]);
  });

  it("restores a skipped day after an accidental check-in", () => {
    const yesterday = addDays(TODAY, -1);
    let before = createSeedState(TODAY, { onboarded: true });
    before = reducer(before, { type: "skip", habitId: "read", key: yesterday, skipped: true });
    const after = reducer(before, { type: "toggle", habitId: "read", key: yesterday, at: null });
    expect(after.skips.read[yesterday]).toBeUndefined();
    const undone = restoreDay(after, before, "read", yesterday);
    expect(undone.skips.read[yesterday]).toBe(true);
    expect(undone.logs.read[yesterday]).toBeUndefined();
  });
});
