import { describe, expect, it } from "vitest";

import { addDays } from "@/data/dates";
import { createEmptyState, createSeedState } from "@/data/seed";
import { totalCompletions } from "@/data/stats";
import { ALL_DAYS, type Habit } from "@/data/types";

import { importedMessage, importSummary, memberLine, nameError, NAME_MAX, percent, profileStats, sinceLine } from "@/components/profile/profileModel";

const TODAY = "2026-10-23";

function habit(id: string, partial: Partial<Habit> = {}): Habit {
  return {
    id,
    name: `Habit ${id}`,
    icon: "book",
    color: "violet",
    schedule: [...ALL_DAYS],
    target: 1,
    unit: null,
    detail: "",
    reminder: null,
    notes: "",
    createdAt: addDays(TODAY, -9),
    order: 0,
    archived: false,
    ...partial,
  };
}

describe("profileStats", () => {
  it("tells the seed story: Drink water's 47-day streak with 2 freezes, day 60", () => {
    const state = createSeedState(TODAY);
    const stats = profileStats(state.habits, state.habits, state, TODAY);
    expect(stats.topStreak).toMatchObject({ habitId: "water", name: "Drink water", current: 47, freezes: 2 });
    expect(stats.day).toBe(60);
    expect(memberLine(stats)).toBe("Day 60 with Everwick");
    expect(stats.since).toBe(addDays(TODAY, -59));
    expect(stats.checkins).toBe(totalCompletions(state.habits, state, TODAY));
    expect(stats.hasRate).toBe(true);
    expect(stats.rate30).toBeGreaterThan(0.6);
    expect(stats.rate30).toBeLessThan(1);
    expect(stats.perfectDays).toBeGreaterThan(5);
  });

  it("shows zeros gracefully with no habits", () => {
    const state = createEmptyState(TODAY);
    const stats = profileStats([], [], state, TODAY);
    expect(stats).toEqual({ topStreak: null, checkins: 0, perfectDays: 0, rate30: 0, hasRate: false, since: null, day: 0 });
    expect(memberLine(stats)).toBe("Your first flame is one habit away");
    expect(sinceLine(stats.since)).toBe("all time");
  });

  it("ignores today's open habits in the 30-day rate", () => {
    const h = habit("a");
    const logs = { a: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((o) => [addDays(TODAY, -o), 1])) };
    const stats = profileStats([h], [h], { logs }, TODAY);
    expect(stats.rate30).toBe(1); // 9 of 9 full days; today is still open
  });

  it("keeps archived habits in lifetime check-ins but not in streaks", () => {
    const live = habit("a");
    const old = habit("b", { archived: true });
    const logs = { a: { [addDays(TODAY, -1)]: 1 }, b: { [addDays(TODAY, -1)]: 1, [addDays(TODAY, -2)]: 1 } };
    const stats = profileStats([live], [live, old], { logs }, TODAY);
    expect(stats.checkins).toBe(3);
    expect(stats.topStreak?.habitId).toBe("a");
  });

  it("picks the longest live streak, counting runs a freeze kept alive", () => {
    const a = habit("a");
    const b = habit("b", { createdAt: addDays(TODAY, -30) });
    const days = (from: number, to: number) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [addDays(TODAY, -(from + i)), 1]));
    // a: 7 straight. b: 7 straight, a missed day 8 covered by the freeze it had earned, then 7 more.
    const logs = { a: days(1, 7), b: { ...days(1, 7), ...days(9, 15) } };
    const stats = profileStats([a, b], [a, b], { logs }, TODAY);
    expect(stats.topStreak?.current).toBe(14); // b's freeze bridged day 8
    expect(stats.topStreak?.habitId).toBe("b");
  });
});

describe("copy helpers", () => {
  it("validates names in plain language", () => {
    expect(nameError("Maya")).toBeNull();
    expect(nameError("   ")).toMatch(/Add a name/);
    expect(nameError("x".repeat(NAME_MAX + 1))).toMatch(/24 characters/);
  });

  it("writes the import confirmation and toast", () => {
    const six = { habits: Array.from({ length: 6 }, (_, i) => habit(String(i))), checkins: 312 };
    expect(importSummary(six)).toBe("6 habits and 312 check-ins from this file will replace what's on this device. You can undo right after.");
    expect(importSummary({ habits: [habit("a")], checkins: 1 })).toMatch(/^1 habit and 1 check-in from/);
    expect(importedMessage(six)).toBe("Imported 6 habits");
  });

  it("formats since and percent", () => {
    expect(sinceLine("2026-08-25")).toBe("since Aug 25");
    expect(percent(0.857)).toBe("86%");
  });
});
