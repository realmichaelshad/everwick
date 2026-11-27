import { describe, expect, it } from "vitest";

import { addDays, weekdayOf } from "@/data/dates";
import {
  activityPhrase,
  outcomePhrase,
  bestTimeOfDay,
  buildInsights,
  consistentWeekday,
  daysUntilInsights,
  habitCorrelations,
  insightsUnlocked,
  median,
  MIN_DAYS_FOR_INSIGHTS,
  shortName,
  streakRisks,
  trendSummary,
  type InsightKind,
} from "@/data/insights";
import { createSeedState } from "@/data/seed";
import { ALL_DAYS, type CheckinTimes, type Habit, type History, type Logs, type Skips, type Weekday } from "@/data/types";

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
    createdAt: addDays(TODAY, -119),
    order: 0,
    archived: false,
    ...partial,
  };
}

/** Builds a History from per-habit predicates over offsets (days before TODAY). */
function history(spec: Record<string, (offset: number) => boolean>, days = 120, extra: { skips?: Skips; times?: CheckinTimes } = {}): History {
  const logs: Logs = {};
  for (const [id, done] of Object.entries(spec)) {
    logs[id] = {};
    for (let o = 0; o < days; o++) if (done(o)) logs[id][addDays(TODAY, -o)] = 1;
  }
  return { logs, ...extra };
}

const wd = (offset: number) => weekdayOf(addDays(TODAY, -offset));

describe("wording helpers", () => {
  it("drops a trailing amount from habit names", () => {
    expect(shortName("Read 20 minutes")).toBe("Read");
    expect(shortName("Walk 8k steps")).toBe("Walk");
    expect(shortName("Meditate 10 minutes")).toBe("Meditate");
    expect(shortName("Drink 8 glasses")).toBe("Drink");
    expect(shortName("No phone after 10pm")).toBe("No phone after 10pm");
    expect(shortName("Strength workout")).toBe("Strength workout");
    // Never shortens a name to nothing.
    expect(shortName("8 glasses")).toBe("8 glasses");
  });

  it("builds a verb phrase for 'On days you ...'", () => {
    expect(activityPhrase({ name: "Meditate 10 minutes" })).toBe("meditate");
    expect(activityPhrase({ name: "Read 20 minutes" })).toBe("read");
    expect(activityPhrase({ name: "Drink water" })).toBe("drink water");
    expect(activityPhrase({ name: "Strength workout" })).toBe("complete Strength workout");
  });

  it("phrases the paired habit as an action, or quotes it", () => {
    expect(outcomePhrase({ name: "Read 20 minutes" })).toBe("read");
    expect(outcomePhrase({ name: "Walk 8k steps" })).toBe("walk");
    expect(outcomePhrase({ name: "No phone after 10pm" })).toBe("check off \u201cNo phone after 10pm\u201d");
  });

  it("computes medians for odd and even lists and empty input", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 10])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("consistentWeekday", () => {
  it("finds the weekday with the highest completion rate", () => {
    const h = habit();
    // Every Tuesday done, every other day done on even offsets only.
    const hist = history({ h: (o) => wd(o) === 2 || o % 2 === 0 });
    const pattern = consistentWeekday([h], hist, TODAY)!;
    expect(pattern.best.weekday).toBe(2);
    expect(pattern.best.rate).toBe(1);
    expect(pattern.average).toBeGreaterThan(0.5);
    expect(pattern.average).toBeLessThan(1);
    expect(pattern.worst?.weekday).not.toBe(2);
    // Display order starts on Monday by default.
    expect(pattern.days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("returns null when every weekday is the same", () => {
    expect(consistentWeekday([habit()], history({ h: () => true }), TODAY)).toBeNull();
  });

  it("needs enough samples per weekday", () => {
    const hist = history({ h: (o) => wd(o) === 2 });
    expect(consistentWeekday([habit()], hist, TODAY, { days: 14 })).toBeNull();
    expect(consistentWeekday([habit()], hist, TODAY, { days: 28 })?.best.weekday).toBe(2);
  });

  it("returns null without habits or history", () => {
    expect(consistentWeekday([], { logs: {} }, TODAY)).toBeNull();
    expect(consistentWeekday([habit({ createdAt: TODAY })], { logs: {} }, TODAY)).toBeNull();
  });
});

describe("habitCorrelations", () => {
  const a = habit({ id: "a", name: "Meditate 10 minutes" });
  const b = habit({ id: "b", name: "Read 20 minutes" });

  it("compares B's rate on days with and without A", () => {
    // Window = offsets 1..60. A done on 1..30; B done on 1..24 (24/30 with A) and 31..42 (12/30 without).
    const hist = history({ a: (o) => o >= 1 && o <= 30, b: (o) => (o >= 1 && o <= 24) || (o >= 31 && o <= 42) });
    const pairs = habitCorrelations([a, b], hist, TODAY, 60);
    const ab = pairs.find((p) => p.a === "a" && p.b === "b")!;
    expect(ab.samplesWith).toBe(30);
    expect(ab.samplesWithout).toBe(30);
    expect(ab.withRate).toBeCloseTo(0.8);
    expect(ab.withoutRate).toBeCloseTo(0.4);
    expect(ab.lift).toBeCloseTo(1);
  });

  it("requires 8 samples on each side", () => {
    const hist = history({ a: (o) => o >= 1 && o <= 7, b: (o) => o <= 7 || o % 3 === 0 });
    expect(habitCorrelations([a, b], hist, TODAY, 60).filter((p) => p.a === "a")).toEqual([]);
  });

  it("ignores lifts under 15%", () => {
    // B: 50% with A, 45% without -> lift 0.11
    const hist = history({ a: (o) => o >= 1 && o <= 20, b: (o) => (o >= 1 && o <= 10) || (o >= 21 && o <= 29) });
    expect(habitCorrelations([a, b], hist, TODAY, 40).find((p) => p.a === "a")).toBeUndefined();
  });

  it("skips pairs where B never happens without A (no division by zero)", () => {
    const hist = history({ a: (o) => o >= 1 && o <= 30, b: (o) => o >= 1 && o <= 20 });
    const pairs = habitCorrelations([a, b], hist, TODAY, 60);
    expect(pairs.find((p) => p.a === "a" && p.b === "b")).toBeUndefined();
    for (const p of pairs) expect(Number.isFinite(p.lift)).toBe(true);
  });

  it("keeps negative lifts and sorts by strength", () => {
    // B done mostly when A is NOT done.
    const hist = history({ a: (o) => o >= 1 && o <= 30, b: (o) => (o >= 1 && o <= 6) || (o >= 31 && o <= 54) });
    const ab = habitCorrelations([a, b], hist, TODAY, 60).find((p) => p.a === "a" && p.b === "b")!;
    expect(ab.lift).toBeLessThan(-0.15);
    const pairs = habitCorrelations([a, b], hist, TODAY, 60);
    for (let i = 1; i < pairs.length; i++) expect(Math.abs(pairs[i - 1].lift)).toBeGreaterThanOrEqual(Math.abs(pairs[i].lift));
  });

  it("only counts days where both habits are due", () => {
    const mondays = habit({ id: "b", schedule: [1] });
    const hist = history({ a: (o) => o % 2 === 0, b: () => true });
    // B is due on ~8 Mondays in 60 days: never 8 on both sides of A.
    expect(habitCorrelations([a, mondays], hist, TODAY, 60)).toEqual([]);
  });

  it("returns nothing for no habits or one habit", () => {
    expect(habitCorrelations([], { logs: {} }, TODAY)).toEqual([]);
    expect(habitCorrelations([a], history({ a: () => true }), TODAY)).toEqual([]);
  });
});

describe("streakRisks", () => {
  it("flags the weekday a strong habit keeps missing", () => {
    const walk = habit({ id: "walk", name: "Walk 8k steps" });
    const hist = history({ walk: (o) => wd(o) !== 6 });
    const [risk] = streakRisks([walk], hist, TODAY);
    expect(risk.habitId).toBe("walk");
    expect(risk.weekday).toBe(6);
    expect(risk.missRate).toBe(1);
    expect(risk.samples).toBe(8);
    expect(risk.overallRate).toBeCloseTo(48 / 56);
    expect(risk.byWeekday).toHaveLength(7);
  });

  it("stays quiet when the habit is struggling overall (under 60%)", () => {
    const hist = history({ h: (o) => wd(o) !== 6 && o % 2 === 0 });
    expect(streakRisks([habit()], hist, TODAY)).toEqual([]);
  });

  it("needs at least 4 samples and a 50% miss rate", () => {
    const missSaturdays = history({ h: (o) => wd(o) !== 6 });
    expect(streakRisks([habit()], missSaturdays, TODAY, { weeks: 3 })).toEqual([]);
    // 3 of 8 Saturdays missed: under the threshold.
    let saturdays = 0;
    const someSaturdays = history({ h: (o) => (o >= 1 && o <= 56 && wd(o) === 6 ? ++saturdays > 3 : true) });
    expect(streakRisks([habit()], someSaturdays, TODAY)).toEqual([]);
  });

  it("treats skipped days as neutral", () => {
    const skips: Skips = { h: {} };
    for (let o = 1; o <= 56; o++) if (wd(o) === 6) skips.h[addDays(TODAY, -o)] = true;
    const hist = history({ h: (o) => wd(o) !== 6 }, 120, { skips });
    expect(streakRisks([habit()], hist, TODAY)).toEqual([]);
  });

  it("handles habits with nothing due", () => {
    expect(streakRisks([habit({ createdAt: TODAY })], { logs: {} }, TODAY)).toEqual([]);
    expect(streakRisks([], { logs: {} }, TODAY)).toEqual([]);
  });
});

describe("bestTimeOfDay", () => {
  function timed(spec: Record<string, number[]>, doneDays = 12): History {
    const logs: Logs = {};
    const times: CheckinTimes = {};
    for (const [id, minutes] of Object.entries(spec)) {
      logs[id] = {};
      times[id] = {};
      minutes.slice(0, doneDays).forEach((m, i) => {
        const key = addDays(TODAY, -(i + 1));
        logs[id][key] = 1;
        times[id][key] = m;
      });
    }
    return { logs, times };
  }

  it("finds the busiest part of the day and its median time", () => {
    const morning = habit({ id: "m" });
    const evening = habit({ id: "e" });
    const hist = timed({ m: [420, 425, 430, 435, 440, 445, 450, 455], e: [1260, 1270, 1280] });
    const pattern = bestTimeOfDay([morning, evening], hist, TODAY)!;
    expect(pattern.part).toBe("morning");
    // Rounded to 5 minutes, like every "usual time" in the app (437.5 -> 440).
    expect(pattern.median).toBe(440);
    expect(pattern.count).toBe(11);
    expect(pattern.share).toBeCloseTo(8 / 11);
    expect(pattern.parts).toEqual({ morning: 8, afternoon: 0, evening: 3 });
    expect(pattern.perHabit.map((p) => p.habitId)).toEqual(["m", "e"]);
    expect(pattern.perHabit[1].part).toBe("evening");
  });

  it("needs 10 timed check-ins", () => {
    expect(bestTimeOfDay([habit()], timed({ h: [420, 430, 440] }), TODAY)).toBeNull();
    expect(bestTimeOfDay([], { logs: {} }, TODAY)).toBeNull();
  });

  it("ignores times on days the habit was not completed", () => {
    const h = habit({ target: 8 });
    const hist = timed({ h: Array.from({ length: 12 }, () => 600) });
    // Values of 1 never reach a target of 8.
    expect(bestTimeOfDay([h], hist, TODAY)).toBeNull();
  });
});

describe("trendSummary", () => {
  it("compares the last period with the one before, in points", () => {
    const hist = history({ h: (o) => o <= 30 || o % 2 === 0 });
    const t = trendSummary([habit()], hist, TODAY, 30)!;
    expect(t.current).toBe(1);
    expect(t.previous).toBe(0.5);
    expect(t.points).toBe(50);
    expect(t.days).toBe(30);
  });

  it("returns null without a previous period", () => {
    expect(trendSummary([habit({ createdAt: addDays(TODAY, -5) })], history({ h: () => true }), TODAY, 7)).toBeNull();
    expect(trendSummary([], { logs: {} }, TODAY)).toBeNull();
  });
});

describe("buildInsights", () => {
  it("returns nothing for no habits", () => {
    expect(buildInsights([], { logs: {} }, TODAY)).toEqual([]);
  });

  it("waits for a week of history", () => {
    const fresh = habit({ createdAt: addDays(TODAY, -3) });
    expect(insightsUnlocked([fresh], TODAY)).toBe(false);
    expect(daysUntilInsights([fresh], TODAY)).toBe(MIN_DAYS_FOR_INSIGHTS - 4);
    expect(buildInsights([fresh], history({ h: (o) => o <= 3 }), TODAY)).toEqual([]);
    const week = habit({ createdAt: addDays(TODAY, -(MIN_DAYS_FOR_INSIGHTS - 1)) });
    expect(insightsUnlocked([week], TODAY)).toBe(true);
    expect(daysUntilInsights([week], TODAY)).toBe(0);
  });

  it("ignores archived habits", () => {
    const archived = habit({ archived: true });
    expect(buildInsights([archived], history({ h: (o) => o % 2 === 0 }), TODAY)).toEqual([]);
  });
});

describe("insights on the demo data", () => {
  const state = createSeedState(TODAY);
  const insights = buildInsights(state.habits, state, TODAY);

  it("tells five different things, sorted by score", () => {
    expect(insights.length).toBe(5);
    const kinds = new Set<InsightKind>(insights.map((i) => i.kind));
    expect(kinds).toEqual(new Set(["weekday", "correlation", "risk", "time", "trend"]));
    for (let i = 1; i < insights.length; i++) expect(insights[i - 1].score).toBeGreaterThanOrEqual(insights[i].score);
    for (const i of insights) {
      expect(i.title.length).toBeGreaterThan(5);
      expect(i.body).toMatch(/\.$/);
      expect(i.body).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it("flags Walk on a weekend day", () => {
    const [top] = streakRisks(state.habits, state, TODAY);
    expect(top.habitId).toBe("walk");
    expect([0, 6]).toContain(top.weekday);
    const card = insights.find((i) => i.kind === "risk")!;
    expect(card.body).toMatch(/miss Walk 8k steps on (Saturdays|Sundays)/);
  });

  it("knows meditation happens early and most check-ins come in the evening", () => {
    const pattern = bestTimeOfDay(state.habits, state, TODAY)!;
    expect(pattern.perHabit[0].habitId).toBe("meditate");
    expect(pattern.perHabit[0].median).toBeLessThan(7 * 60 + 30);
    expect(pattern.part).toBe("evening");
    expect(pattern.perHabit.find((p) => p.habitId === "read")!.part).toBe("evening");
  });

  it("sees the improvement over the last month", () => {
    const t = trendSummary(state.habits, state, TODAY, 30)!;
    expect(t.points).toBeGreaterThan(5);
    expect(insights.find((i) => i.kind === "trend")!.title).toMatch(/^Up \d+ points this month$/);
  });

  it("finds a positive pairing between two habits", () => {
    const card = insights.find((i) => i.kind === "correlation");
    expect(card?.kind).toBe("correlation");
    if (card?.kind !== "correlation") return;
    expect(card.data.lift).toBeGreaterThanOrEqual(0.15);
    expect(card.data.samplesWith).toBeGreaterThanOrEqual(8);
    expect(card.data.samplesWithout).toBeGreaterThanOrEqual(8);
    expect(card.body).toMatch(/^On days you .+, you .+ \d+% more often\.$/);
    expect(card.body).not.toMatch(/you finish (No phone|Strength)/);
  });

  it("names a best weekday above the average", () => {
    const pattern = consistentWeekday(state.habits, state, TODAY)!;
    expect(pattern.best.rate).toBeGreaterThan(pattern.average);
    expect(insights.find((i) => i.kind === "weekday")!.title).toMatch(/^You're most consistent on [A-Z][a-z]+days$/);
  });

  it("is deterministic", () => {
    const again = createSeedState(TODAY);
    expect(buildInsights(again.habits, again, TODAY)).toEqual(insights);
  });

  it("weekday helper types line up with Weekday", () => {
    const days: Weekday[] = consistentWeekday(state.habits, state, TODAY)!.days.map((d) => d.weekday);
    expect(days).toHaveLength(7);
  });
});
