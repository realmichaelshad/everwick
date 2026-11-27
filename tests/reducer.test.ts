import { describe, expect, it } from "vitest";

import { addDays } from "@/data/dates";
import { reducer } from "@/data/reducer";
import { createSeedState } from "@/data/seed";
import { isDoneOn, streakInfo } from "@/data/stats";

const TODAY = "2026-10-23"; // Friday
const base = createSeedState(TODAY, { onboarded: true });
const habit = (id: string, s = base) => s.habits.find((h) => h.id === id)!;

describe("check-ins", () => {
  it("toggles a simple habit and records the check-in time", () => {
    const s = reducer(base, { type: "toggle", habitId: "read", key: TODAY, at: 21 * 60 + 30 });
    expect(isDoneOn(habit("read"), s, TODAY)).toBe(true);
    expect(s.times.read[TODAY]).toBe(21 * 60 + 30);
    expect(s.modified).toBe(true);
    expect(streakInfo(habit("read"), s, TODAY).current).toBe(13);
    const back = reducer(s, { type: "toggle", habitId: "read", key: TODAY, at: 0 });
    expect(back.logs.read[TODAY]).toBeUndefined();
    expect(back.times.read[TODAY]).toBeUndefined();
  });

  it("increments target habits up to the target and stamps the time only on completion", () => {
    let s = reducer(base, { type: "increment", habitId: "water", key: TODAY, delta: 1, at: 600 });
    expect(s.logs.water[TODAY]).toBe(6);
    expect(s.times.water[TODAY]).toBeUndefined();
    s = reducer(s, { type: "increment", habitId: "water", key: TODAY, delta: 5, at: 700 });
    expect(s.logs.water[TODAY]).toBe(8);
    expect(s.times.water[TODAY]).toBe(700);
    s = reducer(s, { type: "increment", habitId: "water", key: TODAY, delta: 1, at: 800 });
    expect(s.times.water[TODAY]).toBe(700);
  });

  it("ignores unknown habits", () => {
    expect(reducer(base, { type: "toggle", habitId: "nope", key: TODAY, at: 0 })).toBe(base);
  });

  it("stores no check-in time for a late check-in on a past day (at: null)", () => {
    const day = addDays(TODAY, -13); // Read was missed that day in the seed
    expect(isDoneOn(habit("read"), base, day)).toBe(false);
    const s = reducer(base, { type: "toggle", habitId: "read", key: day, at: null });
    expect(isDoneOn(habit("read"), s, day)).toBe(true);
    expect(s.times.read[day]).toBeUndefined();
    // Target habits too.
    const w = reducer(base, { type: "setValue", habitId: "water", key: addDays(TODAY, -21), value: 8, at: null });
    expect(w.logs.water[addDays(TODAY, -21)]).toBe(8);
    expect(w.times.water[addDays(TODAY, -21)]).toBeUndefined();
  });
});

describe("skips", () => {
  it("skips a day, clearing its progress, and a check-in clears the skip", () => {
    let s = reducer(base, { type: "skip", habitId: "water", key: TODAY, skipped: true });
    expect(s.skips.water[TODAY]).toBe(true);
    expect(s.logs.water[TODAY]).toBeUndefined();
    s = reducer(s, { type: "toggle", habitId: "water", key: TODAY, at: 900 });
    expect(s.skips.water[TODAY]).toBeUndefined();
    expect(s.logs.water[TODAY]).toBe(8);
  });

  it("un-skips", () => {
    const yesterday = addDays(TODAY, -1);
    let s = reducer(base, { type: "skip", habitId: "read", key: yesterday, skipped: true });
    s = reducer(s, { type: "skip", habitId: "read", key: yesterday, skipped: false });
    expect(s.skips.read[yesterday]).toBeUndefined();
  });
});

describe("habits", () => {
  it("reorders by id list", () => {
    const ids = ["read", "water", "meditate", "walk", "strength", "no-phone"];
    const s = reducer(base, { type: "reorder", ids });
    const ordered = [...s.habits].sort((a, b) => a.order - b.order).map((h) => h.id);
    expect(ordered).toEqual(ids);
  });

  it("keeps habits missing from a partial reorder after the listed ones", () => {
    const s = reducer(base, { type: "reorder", ids: ["no-phone", "read"] });
    const ordered = [...s.habits].sort((a, b) => a.order - b.order).map((h) => h.id);
    expect(ordered.slice(0, 2)).toEqual(["no-phone", "read"]);
    expect(ordered).toHaveLength(6);
  });

  it("deletes a habit with all its history", () => {
    const s = reducer(base, { type: "deleteHabit", id: "walk" });
    expect(s.habits.find((h) => h.id === "walk")).toBeUndefined();
    expect(s.logs.walk).toBeUndefined();
    expect(s.skips.walk).toBeUndefined();
    expect(s.times.walk).toBeUndefined();
  });

  it("restores everything from a snapshot (undo)", () => {
    const snapshot = base;
    const changed = reducer(base, { type: "deleteHabit", id: "walk" });
    expect(reducer(changed, { type: "hydrate", state: snapshot })).toBe(snapshot);
  });

  it("remembers seen achievements once", () => {
    let s = reducer({ ...base, seenAchievements: [] }, { type: "seenAchievements", ids: ["streak-7"] });
    s = reducer(s, { type: "seenAchievements", ids: ["streak-7", "perfect-week"] });
    expect(s.seenAchievements).toEqual(["streak-7", "perfect-week"]);
    expect(reducer(s, { type: "seenAchievements", ids: ["streak-7"] })).toBe(s);
  });
});
