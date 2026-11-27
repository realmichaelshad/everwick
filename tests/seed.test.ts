import { describe, expect, it } from "vitest";

import { evaluateAchievements, newlyUnlocked } from "@/data/achievements";
import { addDays, diffDays, weekdayOf } from "@/data/dates";
import { createRng, hashString } from "@/data/prng";
import { createEmptyState, createSeedState, HISTORY_DAYS, seedHabits, seedHistory, waterSoFar } from "@/data/seed";
import { rateDetail } from "@/components/habit/detailModel";
import { streakInfo } from "@/data/stats";

const TODAY = "2026-10-23"; // Friday

describe("prng", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng("everwick");
    const b = createRng("everwick");
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it("differs between seeds and hashes strings stably", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
    expect(hashString("water")).toBe(hashString("water"));
    const r = createRng(7);
    for (let i = 0; i < 50; i++) {
      const n = r.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});

describe("seed data", () => {
  const habits = seedHabits(TODAY);
  const history = seedHistory(habits, TODAY);
  const { logs, times, skips } = history;
  const byId = (id: string) => habits.find((h) => h.id === id)!;

  it("has 6 habits with 60 days of history", () => {
    expect(habits).toHaveLength(6);
    for (const h of habits) expect(diffDays(h.createdAt, TODAY)).toBe(HISTORY_DAYS - 1);
    const oldest = Object.keys(logs.water).sort()[0];
    expect(diffDays(oldest, TODAY)).toBeLessThanOrEqual(HISTORY_DAYS - 1);
  });

  it("is identical for the same day and different for another day", () => {
    expect(seedHistory(seedHabits(TODAY), TODAY)).toEqual(history);
    expect(createSeedState(TODAY)).toEqual(createSeedState(TODAY));
    const other = seedHistory(seedHabits("2026-11-02"), "2026-11-02");
    expect(Object.keys(other.logs.water)).not.toEqual(Object.keys(logs.water));
  });

  it("gives water the long 40+ day streak, kept alive by a freeze, with 5 of 8 glasses today", () => {
    const water = byId("water");
    const info = streakInfo(water, history, TODAY);
    expect(water.target).toBe(8);
    expect(logs.water[TODAY]).toBe(5);
    expect(info.current).toBe(47);
    expect(info.frozen).toContain(addDays(TODAY, -21));
    expect(info.freezes).toBe(2);
  });

  it("gives reading a 12-day streak that today's check-in extends, best ever 19", () => {
    const read = byId("read");
    expect(streakInfo(read, history, TODAY).current).toBe(12);
    const after = { ...history, logs: { ...logs, read: { ...logs.read, [TODAY]: 1 } } };
    expect(streakInfo(read, after, TODAY).current).toBe(13);
    expect(streakInfo(read, history, TODAY).best.length).toBe(19);
  });

  it("gives meditation a recently broken 21-day streak", () => {
    const m = byId("meditate");
    const info = streakInfo(m, history, TODAY);
    expect(info.best.length).toBe(21);
    expect(info.current).toBe(3);
    expect(logs.meditate[addDays(TODAY, -3)]).toBeUndefined();
  });

  it("makes walking weaker on weekends", () => {
    const walk = byId("walk");
    let weekday = 0;
    let weekdayDone = 0;
    let weekend = 0;
    let weekendDone = 0;
    for (let o = 1; o < HISTORY_DAYS; o++) {
      const key = addDays(TODAY, -o);
      const wd = weekdayOf(key);
      const done = (logs.walk[key] ?? 0) >= walk.target;
      if (wd === 0 || wd === 6) {
        weekend++;
        if (done) weekendDone++;
      } else {
        weekday++;
        if (done) weekdayDone++;
      }
    }
    expect(weekdayDone / weekday).toBeGreaterThan(weekendDone / weekend + 0.25);
  });

  it("shows no-phone improving over time", () => {
    const early = Object.keys(logs["no-phone"]).filter((k) => diffDays(k, TODAY) >= 30).length;
    const late = Object.keys(logs["no-phone"]).filter((k) => diffDays(k, TODAY) < 30).length;
    expect(late).toBeGreaterThan(early);
    expect(logs["no-phone"][TODAY]).toBeUndefined();
  });

  it("only logs strength on Mon/Wed/Fri, with the last six sessions done", () => {
    const s = byId("strength");
    expect(s.schedule).toEqual([1, 3, 5]);
    for (const key of Object.keys(logs.strength)) expect([1, 3, 5]).toContain(weekdayOf(key));
    expect(streakInfo(s, history, TODAY).current).toBe(6);
    expect(logs.strength[TODAY]).toBeUndefined();
  });

  it("keeps every habit believable (between 35% and 100% over 30 days)", () => {
    for (const h of habits) {
      const { rate } = rateDetail(h, history, TODAY, 30);
      expect(rate).toBeGreaterThan(0.35);
      expect(rate).toBeLessThanOrEqual(1);
    }
  });

  it("records a check-in time for every completed day, in each habit's rhythm", () => {
    for (const h of habits) {
      for (const [key, value] of Object.entries(logs[h.id])) {
        if (value >= h.target) expect(times[h.id][key]).toBeTypeOf("number");
        else expect(times[h.id][key]).toBeUndefined();
      }
    }
    const meditateTimes = Object.values(times.meditate);
    const readTimes = Object.values(times.read);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(meditateTimes)).toBeLessThan(9 * 60);
    expect(avg(readTimes)).toBeGreaterThan(21 * 60);
    expect(meditateTimes.some((m) => m < 7 * 60)).toBe(true); // early riser material
  });

  it("includes a couple of planned skips that hold no progress", () => {
    const skipped = Object.entries(skips).flatMap(([id, days]) => Object.keys(days).map((k) => [id, k] as const));
    expect(skipped.length).toBeGreaterThanOrEqual(2);
    for (const [id, key] of skipped) expect(logs[id][key]).toBeUndefined();
  });
});

describe("seed and empty states", () => {
  it("creates versioned states", () => {
    const seeded = createSeedState(TODAY);
    expect(seeded.version).toBe(2);
    expect(seeded.onboarded).toBe(false);
    expect(seeded.seededOn).toBe(TODAY);
    const empty = createEmptyState(TODAY);
    expect(empty.habits).toEqual([]);
    expect(empty.onboarded).toBe(true);
    expect(empty.modified).toBe(true);
  });
});

describe("today follows the clock", () => {
  const habitsFor = (state: ReturnType<typeof createSeedState>, id: string) => state.habits.find((h) => h.id === id)!;

  it("leaves habits open until their usual time has come", () => {
    const early = createSeedState(TODAY, {}, 1 * 60 + 47); // 1:47 AM
    for (const h of early.habits) {
      expect(early.logs[h.id][TODAY] ?? 0).toBe(0);
      expect(early.times[h.id][TODAY]).toBeUndefined();
    }
    const evening = createSeedState(TODAY, {}, 17 * 60 + 40); // the showcase clock
    expect(evening.logs.meditate[TODAY]).toBe(1);
    expect(evening.logs.walk[TODAY]).toBe(1);
    expect(evening.times.walk[TODAY]).toBeLessThanOrEqual(17 * 60 + 40);
    expect(evening.logs.read[TODAY] ?? 0).toBe(0);
  });

  it("fills Water's glasses as the day goes, never past the story's 5", () => {
    expect(waterSoFar(6 * 60)).toBe(0);
    expect(waterSoFar(12 * 60)).toBe(2);
    expect(waterSoFar(17 * 60 + 40)).toBe(5);
    expect(waterSoFar(23 * 60 + 59)).toBe(5);
    expect(createSeedState(TODAY, {}, 12 * 60).logs.water[TODAY]).toBe(2);
  });

  it("never changes past days, whatever the time", () => {
    const a = createSeedState(TODAY, {}, 60);
    const b = createSeedState(TODAY);
    for (const h of b.habits) {
      const strip = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== TODAY));
      expect(strip(a.logs[h.id])).toEqual(strip(b.logs[h.id]));
      expect(habitsFor(a, h.id)).toEqual(h);
    }
  });
});

describe("achievements in the demo data", () => {
  it("counts medals the seeded history already earned as seen, so Profile never opens with an unlock toast", () => {
    const state = createSeedState(TODAY, { onboarded: true });
    const achievements = evaluateAchievements(state.habits, state, TODAY);
    expect(achievements.filter((a) => a.unlocked).length).toBeGreaterThan(0);
    expect(newlyUnlocked(achievements, state.seenAchievements)).toEqual([]);
  });
});
