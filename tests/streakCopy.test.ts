import { describe, expect, it } from "vitest";

import { freezeCopy, streakTileCopy, todayCardCopy } from "@/components/habit/detailModel";
import { reducer } from "@/data/reducer";
import { createSeedState } from "@/data/seed";
import { streakInfo } from "@/data/stats";
import { freezeCovers, freezeGoalLine, inARow, isDaily, nextDueDay, nextDueWord, seeYouLine, spokenStreak, streakCount, streakLabel, streakUnit } from "@/data/streakCopy";
import type { Habit } from "@/data/types";

const FRIDAY = "2026-10-23";
const daily = { schedule: [0, 1, 2, 3, 4, 5, 6] } as Pick<Habit, "schedule">;
const mwf = { schedule: [1, 3, 5] } as Pick<Habit, "schedule">;

describe("streak wording follows the habit's schedule", () => {
  it("counts days for daily habits and check-ins for the rest", () => {
    expect(isDaily(daily)).toBe(true);
    expect(isDaily(mwf)).toBe(false);
    expect(streakUnit(daily, 1)).toBe("day");
    expect(streakUnit(daily, 48)).toBe("days");
    expect(streakUnit(mwf, 1)).toBe("check-in");
    expect(streakUnit(mwf, 7)).toBe("check-ins");
    expect(streakCount(mwf, 6)).toBe("6 check-ins");
    expect(inARow(daily, 48)).toBe("48 days in a row");
    expect(inARow(mwf, 7)).toBe("7 check-ins in a row");
    expect(streakLabel(daily, 48)).toBe("48-day streak");
    expect(streakLabel(mwf, 7)).toBe("7 in a row");
    expect(spokenStreak(daily, 12)).toBe("12 day streak");
    expect(spokenStreak(mwf, 7)).toBe("7 check-in streak");
  });

  it("knows the next due day: a Friday workout is followed by Monday, not tomorrow", () => {
    expect(nextDueDay(mwf, FRIDAY)).toBe("2026-10-26");
    expect(nextDueWord(mwf, FRIDAY)).toBe("Monday");
    expect(nextDueWord(mwf, "2026-10-26")).toBe("Wednesday");
    expect(nextDueWord(daily, FRIDAY)).toBe("tomorrow");
    expect(seeYouLine(mwf, FRIDAY)).toBe("See you Monday.");
    expect(seeYouLine(daily, FRIDAY)).toBe("See you tomorrow.");
    expect(seeYouLine({ schedule: [] }, FRIDAY)).toBe("Nice work.");
  });

  it("words freezes per schedule", () => {
    expect(freezeCovers(daily)).toBe("one missed day");
    expect(freezeCovers(mwf)).toBe("one missed check-in");
    expect(freezeCovers(mwf, 2)).toBe("two missed check-ins");
    expect(freezeGoalLine(daily, 7)).toBe("Check in 7 days in a row to earn a freeze");
    expect(freezeGoalLine(mwf, 7)).toBe("Check in 7 times in a row to earn a freeze");
  });
});

describe("the seeded Strength workout (Mon/Wed/Fri) on a Friday", () => {
  const seed = createSeedState(FRIDAY, { onboarded: true });
  const strength = seed.habits.find((h) => h.id === "strength")!;
  const water = seed.habits.find((h) => h.id === "water")!;

  it("asks to make it 7 in a row, not 7 days", () => {
    const info = streakInfo(strength, seed, FRIDAY);
    expect(info.current).toBe(6);
    const copy = todayCardCopy(strength, { value: 0, done: false, skipped: false, at: null }, info.current, FRIDAY);
    expect(copy).toEqual({ title: "Not checked in yet", body: "Check in to make it 7 in a row." });
  });

  it("says see you Monday after the Friday check-in, with the streak in check-ins", () => {
    const after = reducer(seed, { type: "setValue", habitId: "strength", key: FRIDAY, value: 1, at: 17 * 60 + 40 });
    const info = streakInfo(strength, after, FRIDAY);
    expect(info.current).toBe(7);
    const copy = todayCardCopy(strength, { value: 1, done: true, skipped: false, at: 17 * 60 + 40 }, info.current, FRIDAY);
    expect(copy.title).toBe("Checked in at 5:40 PM");
    expect(copy.body).toBe("7 check-ins in a row. See you Monday.");
  });

  it("puts the unit next to the number on both streak tiles", () => {
    const tiles = streakTileCopy(strength, streakInfo(strength, seed, FRIDAY));
    expect(tiles.currentUnit).toBe("check-ins");
    expect(tiles.currentCaption).toBe("since Oct 9");
    expect(tiles.currentSpoken).toMatch(/^Current streak: 6 check-ins in a row\. Since Oct 9$/);
    expect(tiles.bestUnit).toBe("check-ins");
    expect(tiles.bestSpoken).toMatch(/^Best streak: 9 check-ins in a row\./);
  });

  it("keeps days for the daily Drink water habit", () => {
    const info = streakInfo(water, seed, FRIDAY);
    const tiles = streakTileCopy(water, info);
    expect(tiles.currentUnit).toBe("days");
    const done = todayCardCopy(water, { value: 8, done: true, skipped: false, at: 600 }, info.current + 1, FRIDAY);
    expect(done.body).toBe(`${info.current + 1} days in a row. See you tomorrow.`);
    const open = todayCardCopy(water, { value: 5, done: false, skipped: false, at: null }, info.current, FRIDAY);
    expect(open).toEqual({ title: "5 of 8 glasses", body: `3 more to make it ${info.current + 1} days in a row.` });
  });

  it("explains freezes in the habit's unit", () => {
    const copy = freezeCopy(streakInfo(strength, seed, FRIDAY), strength);
    expect(copy.explainer).toContain("A freeze covers one missed check-in");
    const full = freezeCopy({ current: 14, currentStart: null, best: { length: 14, start: null, end: null }, runs: [], freezes: 2, frozen: [], nextFreezeIn: null }, mwf);
    expect(full.progressLabel).toBe("Your freeze bank is full. Two missed check-ins are covered.");
  });
});
