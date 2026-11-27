import { describe, expect, it } from "vitest";

import {
  ACHIEVEMENTS,
  completedCheckins,
  describeProgress,
  EARLY_BEFORE_MINUTES,
  earlyCheckins,
  evaluateAchievements,
  firstStreakMilestone,
  newlyUnlocked,
  nextAchievement,
  perfectDayRuns,
  type Achievement,
  type AchievementId,
} from "@/data/achievements";
import { addDays } from "@/data/dates";
import { reducer } from "@/data/reducer";
import { createRng } from "@/data/prng";
import { createEmptyState, createSeedState } from "@/data/seed";
import { streakInfo, totalCompletions } from "@/data/stats";
import { ALL_DAYS, type CheckinTimes, type Habit, type History, type Logs, type Skips, type Weekday } from "@/data/types";

const TODAY = "2026-10-23"; // Friday
const day = (offset: number) => addDays(TODAY, -offset);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

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
    createdAt: day(89),
    order: 0,
    archived: false,
    ...partial,
  };
}

/** Builds a history from offsets (days before TODAY). */
function history(spec: Record<string, { done?: number[]; skipped?: number[]; values?: Record<number, number>; times?: Record<number, number> }>): History {
  const logs: Logs = {};
  const skips: Skips = {};
  const times: CheckinTimes = {};
  for (const [id, s] of Object.entries(spec)) {
    logs[id] = {};
    skips[id] = {};
    times[id] = {};
    for (const o of s.done ?? []) logs[id][day(o)] = 1;
    for (const [o, v] of Object.entries(s.values ?? {})) logs[id][day(Number(o))] = v;
    for (const o of s.skipped ?? []) skips[id][day(o)] = true;
    for (const [o, m] of Object.entries(s.times ?? {})) times[id][day(Number(o))] = m;
  }
  return { logs, skips, times };
}

function get(list: Achievement[], id: AchievementId): Achievement {
  const a = list.find((x) => x.id === id);
  if (!a) throw new Error(`missing ${id}`);
  return a;
}

describe("achievement definitions", () => {
  it("has the five achievements in display order with art slots and marks", () => {
    expect(ACHIEVEMENTS.map((a) => a.id)).toEqual(["streak-7", "streak-30", "checkins-100", "perfect-week", "early-riser"]);
    expect(ACHIEVEMENTS.map((a) => a.mark)).toEqual(["7", "30", "100", "7/7", "Before 7 AM"]);
    expect(ACHIEVEMENTS.find((a) => a.id === "early-riser")?.glyph).toBe("sunrise");
    expect(ACHIEVEMENTS.map((a) => a.slot)).toEqual(["badge-streak-7", "badge-streak-30", "badge-checkins-100", "badge-perfect-week", null]);
    expect(ACHIEVEMENTS.map((a) => a.target)).toEqual([7, 30, 100, 7, 5]);
    for (const a of ACHIEVEMENTS) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.description).toMatch(/\.$/);
      expect(a.howTo).toMatch(/\.$/);
      expect(a.howTo).not.toMatch(/!/); // voice: calm, no exclamation marks
    }
  });
});

describe("empty history", () => {
  it("locks everything with zero progress", () => {
    const state = createEmptyState(TODAY);
    const list = evaluateAchievements(state.habits, state, TODAY);
    expect(list).toHaveLength(5);
    for (const a of list) {
      expect(a.unlocked).toBe(false);
      expect(a.unlockedOn).toBeNull();
      expect(a.progress).toEqual({ current: 0, target: a.target });
      expect(a.earnedWith).toBeNull();
    }
  });

  it("handles habits with no logs, skips or times at all", () => {
    const list = evaluateAchievements([habit("a")], { logs: {} }, TODAY);
    expect(list.every((a) => !a.unlocked && a.progress.current === 0)).toBe(true);
  });

  it("ignores habits created in the future", () => {
    const h = habit("a", { createdAt: addDays(TODAY, 3) });
    const list = evaluateAchievements([h], history({ a: { done: [] } }), TODAY);
    expect(list.every((a) => !a.unlocked)).toBe(true);
  });
});

describe("streak achievements", () => {
  it("stays locked at 6 in a row and shows 6/7", () => {
    const h = [habit("a")];
    const a = get(evaluateAchievements(h, history({ a: { done: range(1, 6) } }), TODAY), "streak-7");
    expect(a.unlocked).toBe(false);
    expect(a.progress).toEqual({ current: 6, target: 7 });
    expect(describeProgress(a)).toBe("6 of 7 check-ins in a row");
  });

  it("unlocks on the day the run reaches 7", () => {
    const h = [habit("a")];
    const a = get(evaluateAchievements(h, history({ a: { done: range(1, 7) } }), TODAY), "streak-7");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(1));
    expect(a.progress).toEqual({ current: 7, target: 7 });
    expect(a.earnedWith).toEqual({ id: "a", name: "Habit a" });
  });

  it("records the first day, not the latest, for a long run", () => {
    const a = get(evaluateAchievements([habit("a")], history({ a: { done: range(1, 20) } }), TODAY), "streak-7");
    expect(a.unlockedOn).toBe(day(14)); // 20..14 is the 7th check-in
  });

  it("treats skipped days as neutral", () => {
    const h = [habit("a")];
    const a = get(evaluateAchievements(h, history({ a: { done: [...range(1, 3), ...range(5, 8)], skipped: [4] } }), TODAY), "streak-7");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(1));
  });

  it("treats unscheduled days as neutral (Mon/Wed/Fri habit)", () => {
    const mwf: Weekday[] = [1, 3, 5];
    const h = habit("a", { schedule: mwf });
    // The 7 most recent Mon/Wed/Fri sessions before today (Fri Oct 23): 21, 19, 16, 14, 12, 9, 7 Oct.
    const sessions = [2, 4, 7, 9, 11, 14, 16];
    const a = get(evaluateAchievements([h], history({ a: { done: sessions } }), TODAY), "streak-7");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(2));
  });

  it("breaks on a missed day without a freeze and shows the live run as progress", () => {
    // 6 done, a miss, then 4 done: the best run was 6 but only the live run (4) can still grow.
    const h = [habit("a")];
    const a = get(evaluateAchievements(h, history({ a: { done: [...range(1, 4), ...range(6, 11)] } }), TODAY), "streak-7");
    expect(a.unlocked).toBe(false);
    expect(a.progress.current).toBe(4);
  });

  it("lets an earned freeze bridge a missed day on the way to 30", () => {
    // 20 check-ins (earns 2 freezes), one missed day, then 10 more: 30 check-ins in one run.
    const h = [habit("a")];
    const hist = history({ a: { done: [...range(1, 10), ...range(12, 31)] } });
    expect(streakInfo(h[0], hist, TODAY).frozen).toEqual([day(11)]);
    const a = get(evaluateAchievements(h, hist, TODAY), "streak-30");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(1));
  });

  it("stays locked at 29 and unlocks at 30", () => {
    const h = [habit("a")];
    const at29 = get(evaluateAchievements(h, history({ a: { done: range(1, 29) } }), TODAY), "streak-30");
    expect(at29.unlocked).toBe(false);
    expect(at29.progress).toEqual({ current: 29, target: 30 });
    const at30 = get(evaluateAchievements(h, history({ a: { done: range(1, 30) } }), TODAY), "streak-30");
    expect(at30.unlocked).toBe(true);
  });

  it("keeps today open: not checked in yet doesn't break the run", () => {
    const h = [habit("a")];
    const a = get(evaluateAchievements(h, history({ a: { done: range(1, 6) } }), TODAY), "streak-7");
    expect(a.progress.current).toBe(6);
    const done = get(evaluateAchievements(h, history({ a: { done: range(0, 6) } }), TODAY), "streak-7");
    expect(done.unlocked).toBe(true);
    expect(done.unlockedOn).toBe(TODAY);
  });

  it("needs the full target on target habits", () => {
    const water = habit("w", { target: 8, unit: "glasses" });
    const values = Object.fromEntries(range(1, 7).map((o) => [o, o === 4 ? 5 : 8]));
    const a = get(evaluateAchievements([water], history({ w: { values } }), TODAY), "streak-7");
    expect(a.unlocked).toBe(false);
  });

  it("uses the habit that got there first", () => {
    const h = [habit("late"), habit("early")];
    const hist = history({ late: { done: range(1, 7) }, early: { done: range(20, 26) } });
    const a = get(evaluateAchievements(h, hist, TODAY), "streak-7");
    expect(a.unlockedOn).toBe(day(20));
    expect(a.earnedWith?.id).toBe("early");
  });

  it("agrees with stats.streakInfo on random histories", () => {
    const rng = createRng("achievements-property");
    for (let trial = 0; trial < 60; trial++) {
      const h = habit("r", { schedule: trial % 3 === 0 ? [1, 3, 5] : [...ALL_DAYS] });
      const done: number[] = [];
      const skipped: number[] = [];
      const p = 0.55 + rng.next() * 0.4;
      for (let o = 0; o < 90; o++) {
        const r = rng.next();
        if (r < p) done.push(o);
        else if (r < p + 0.05) skipped.push(o);
      }
      const hist = history({ r: { done, skipped } });
      const best = streakInfo(h, hist, TODAY).best.length;
      for (const n of [3, 7, 12, 30]) {
        expect(firstStreakMilestone([h], hist, TODAY, n) !== null).toBe(best >= n);
      }
    }
  });
});

describe("100 check-ins", () => {
  it("counts completed check-ins across habits and unlocks on the 100th", () => {
    const h = [habit("a"), habit("b")];
    const hist = history({ a: { done: range(1, 50) }, b: { done: range(1, 50) } });
    const list = completedCheckins(h, hist, TODAY);
    expect(list).toHaveLength(100);
    expect(list.length).toBe(totalCompletions(h, hist, TODAY));
    const a = get(evaluateAchievements(h, hist, TODAY), "checkins-100");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(1)); // the last two are on the same day; the 100th is yesterday's second
  });

  it("stays locked at 99 with progress 99/100", () => {
    const h = [habit("a"), habit("b")];
    const a = get(evaluateAchievements(h, history({ a: { done: range(1, 50) }, b: { done: range(2, 50) } }), TODAY), "checkins-100");
    expect(a.unlocked).toBe(false);
    expect(a.progress).toEqual({ current: 99, target: 100 });
  });

  it("ignores partial target days and future days", () => {
    const water = habit("w", { target: 8 });
    const hist = history({ w: { values: { 1: 8, 2: 5, 3: 8 } } });
    hist.logs.w[addDays(TODAY, 2)] = 8;
    expect(completedCheckins([water], hist, TODAY)).toHaveLength(2);
  });
});

describe("perfect week", () => {
  const two = () => [habit("a"), habit("b")];

  it("unlocks on the 7th perfect day in a row", () => {
    const hist = history({ a: { done: range(1, 7) }, b: { done: range(1, 7) } });
    const a = get(evaluateAchievements(two(), hist, TODAY), "perfect-week");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(1));
    expect(describeProgress(a)).toBe("7 of 7 perfect days in a row");
  });

  it("breaks on a day where one due habit was missed", () => {
    const hist = history({ a: { done: range(1, 13) }, b: { done: [...range(1, 6), ...range(8, 13)] } });
    const run = perfectDayRuns(two(), hist, TODAY);
    expect(run).toEqual({ current: 6, best: 6, reachedOn: null });
    expect(get(evaluateAchievements(two(), hist, TODAY), "perfect-week").progress.current).toBe(6);
  });

  it("doesn't break when a habit is skipped and the rest is done", () => {
    const hist = history({ a: { done: range(1, 7) }, b: { done: [...range(1, 3), ...range(5, 7)], skipped: [4] } });
    expect(get(evaluateAchievements(two(), hist, TODAY), "perfect-week").unlocked).toBe(true);
  });

  it("treats a day with nothing due as neutral (neither counts nor breaks)", () => {
    // Day 4: both habits skipped. 3 + 4 perfect days around it make 7.
    const hist = history({ a: { done: [...range(1, 3), ...range(5, 8)], skipped: [4] }, b: { done: [...range(1, 3), ...range(5, 8)], skipped: [4] } });
    const a = get(evaluateAchievements(two(), hist, TODAY), "perfect-week");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(1));
    // Only 6 perfect days with the neutral day in the middle: still locked.
    const short = history({ a: { done: [...range(1, 3), ...range(5, 7)], skipped: [4] }, b: { done: [...range(1, 3), ...range(5, 7)], skipped: [4] } });
    expect(get(evaluateAchievements(two(), short, TODAY), "perfect-week").unlocked).toBe(false);
  });

  it("treats rest days (unscheduled) as neutral", () => {
    const weekdays = habit("a", { schedule: [1, 2, 3, 4, 5] });
    // Thu Oct 22 back to Wed Oct 14: 7 weekdays with the weekend (offsets 5 and 6) in between.
    const hist = history({ a: { done: [1, 2, 3, 4, 7, 8, 9] } });
    const a = get(evaluateAchievements([weekdays], hist, TODAY), "perfect-week");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(1));
  });

  it("needs the full target for a perfect day", () => {
    const water = habit("w", { target: 8 });
    const values = Object.fromEntries(range(1, 7).map((o) => [o, o === 3 ? 7 : 8]));
    expect(get(evaluateAchievements([water], history({ w: { values } }), TODAY), "perfect-week").unlocked).toBe(false);
  });

  it("keeps today open and counts it once it's perfect", () => {
    const open = history({ a: { done: range(1, 6) }, b: { done: range(1, 6) } });
    expect(perfectDayRuns(two(), open, TODAY).current).toBe(6);
    const half = history({ a: { done: range(0, 6) }, b: { done: range(1, 6) } });
    expect(perfectDayRuns(two(), half, TODAY).current).toBe(6);
    const full = history({ a: { done: range(0, 6) }, b: { done: range(0, 6) } });
    expect(get(evaluateAchievements(two(), full, TODAY), "perfect-week").unlockedOn).toBe(TODAY);
  });

  it("is zero with no habits", () => {
    expect(perfectDayRuns([], { logs: {} }, TODAY)).toEqual({ current: 0, best: 0, reachedOn: null });
  });
});

describe("early riser", () => {
  const morning = (offsets: number[], minutes = 6 * 60 + 40) => Object.fromEntries(offsets.map((o) => [o, minutes]));

  it("unlocks on the 5th check-in before 7:00 AM", () => {
    const hist = history({ a: { done: range(1, 10), times: morning([2, 4, 6, 8, 9]) } });
    const a = get(evaluateAchievements([habit("a")], hist, TODAY), "early-riser");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(2));
  });

  it("stays locked at 4 with progress 4/5", () => {
    const hist = history({ a: { done: range(1, 10), times: morning([2, 4, 6, 8]) } });
    const a = get(evaluateAchievements([habit("a")], hist, TODAY), "early-riser");
    expect(a.unlocked).toBe(false);
    expect(a.progress).toEqual({ current: 4, target: 5 });
    expect(describeProgress(a)).toBe("4 of 5 check-ins before 7 AM");
  });

  it("is not unlocked by late check-ins on past days (they carry no time)", () => {
    let state = createSeedState(TODAY, { onboarded: true });
    const before = get(evaluateAchievements(state.habits, state, TODAY), "early-riser").progress.current;
    // Five forgotten evenings logged at 6:30 AM the next morning: no times are recorded for them.
    for (const offset of [13, 14, 15, 22, 23]) state = reducer(state, { type: "toggle", habitId: "read", key: day(offset), at: null });
    expect(get(evaluateAchievements(state.habits, state, TODAY), "early-riser").progress.current).toBe(before);
  });

  it("counts 6:59 AM but not 7:00 AM", () => {
    expect(EARLY_BEFORE_MINUTES).toBe(420);
    const hist = history({ a: { done: [1, 2], times: { 1: 419, 2: 420 } } });
    expect(earlyCheckins([habit("a")], hist, TODAY).map((c) => c.day)).toEqual([day(1)]);
  });

  it("ignores times on days that aren't done and days in the future", () => {
    const hist = history({ a: { done: [1], times: { 1: 380, 2: 380 } } });
    hist.logs.a[addDays(TODAY, 1)] = 1;
    hist.times!.a[addDays(TODAY, 1)] = 380;
    expect(earlyCheckins([habit("a")], hist, TODAY)).toHaveLength(1);
  });

  it("counts different habits on the same morning separately", () => {
    const hist = history({ a: { done: [1, 2, 3], times: morning([1, 2, 3]) }, b: { done: [1, 2], times: morning([1, 2], 400) } });
    const a = get(evaluateAchievements([habit("a"), habit("b")], hist, TODAY), "early-riser");
    expect(a.unlocked).toBe(true);
    expect(a.unlockedOn).toBe(day(1));
  });

  it("works when history has no times at all", () => {
    expect(earlyCheckins([habit("a")], { logs: { a: { [day(1)]: 1 } } }, TODAY)).toEqual([]);
  });
});

describe("seed story (today = 2026-10-23)", () => {
  const state = createSeedState(TODAY);
  const list = evaluateAchievements(state.habits, state, TODAY);

  it("unlocks streak-7, streak-30, 100 check-ins and early riser", () => {
    expect(list.filter((a) => a.unlocked).map((a) => a.id)).toEqual(["streak-7", "streak-30", "checkins-100", "early-riser"]);
  });

  it("earns the 30-day streak with Drink water, bridged by its freeze", () => {
    const a = get(list, "streak-30");
    expect(a.earnedWith?.id).toBe("water");
    expect(a.unlockedOn).toBe("2026-10-05");
    expect(streakInfo(state.habits.find((h) => h.id === "water")!, state, TODAY).frozen).toEqual([day(21)]);
  });

  it("matches totalCompletions for 100 check-ins", () => {
    const a = get(list, "checkins-100");
    expect(completedCheckins(state.habits, state, TODAY).length).toBe(totalCompletions(state.habits, state, TODAY));
    expect(a.unlockedOn! < TODAY).toBe(true);
  });

  it("has early check-ins from the morning meditation", () => {
    const early = earlyCheckins(state.habits, state, TODAY);
    expect(early.length).toBeGreaterThanOrEqual(5);
    expect(early.every((c) => c.habitId === "meditate" && c.minutes < 420)).toBe(true);
  });

  it("leaves the perfect week locked at 2 of 7 (Wednesday and Thursday were perfect)", () => {
    const a = get(list, "perfect-week");
    expect(a.unlocked).toBe(false);
    expect(a.progress).toEqual({ current: 2, target: 7 });
    expect(nextAchievement(list)?.id).toBe("perfect-week");
  });

  it("is deterministic", () => {
    const again = createSeedState(TODAY);
    expect(evaluateAchievements(again.habits, again, TODAY)).toEqual(list);
  });
});

describe("helpers", () => {
  const state = createSeedState(TODAY);
  const list = evaluateAchievements(state.habits, state, TODAY);

  it("newlyUnlocked lists unlocked achievements not seen yet", () => {
    expect(newlyUnlocked(list, []).map((a) => a.id)).toEqual(["streak-7", "streak-30", "checkins-100", "early-riser"]);
    expect(newlyUnlocked(list, ["streak-7", "checkins-100"]).map((a) => a.id)).toEqual(["streak-30", "early-riser"]);
    expect(newlyUnlocked(list, ["perfect-week"]).map((a) => a.id)).not.toContain("perfect-week");
  });

  it("nextAchievement picks the locked one closest to done, or null when all are unlocked", () => {
    const empty = evaluateAchievements([], { logs: {} }, TODAY);
    expect(nextAchievement(empty)?.id).toBe("streak-7"); // all at 0: first in order
    const allDone = list.map((a) => ({ ...a, unlocked: true }));
    expect(nextAchievement(allDone)).toBeNull();
  });
});
