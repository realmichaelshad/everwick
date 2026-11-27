import { describe, expect, it } from "vitest";

import { addDays } from "@/data/dates";
import { applyImport, buildExport, exportFileName, parseImport, parseState, resolveLaunchState } from "@/data/persist";
import { createEmptyState, createSeedState } from "@/data/seed";

const TODAY = "2026-10-23";

describe("stored state", () => {
  it("round-trips through JSON", () => {
    const state = createSeedState(TODAY, { onboarded: true });
    expect(parseState(JSON.stringify(state))).toEqual(state);
  });

  it("re-seeds untouched demo data on a new day but keeps the user's own data", () => {
    const yesterday = addDays(TODAY, -1);
    const untouched = createSeedState(yesterday, { onboarded: true, seenAchievements: ["streak-7"] });
    const relaunched = resolveLaunchState(untouched, TODAY);
    expect(relaunched.seededOn).toBe(TODAY);
    expect(relaunched.onboarded).toBe(true);
    // Medals kept from before, plus the ones the seeded history already earned (never announced as new).
    expect(relaunched.seenAchievements).toContain("streak-7");
    expect(relaunched.seenAchievements).toEqual(expect.arrayContaining(["streak-30", "checkins-100"]));

    const mine = { ...untouched, modified: true };
    expect(resolveLaunchState(mine, TODAY)).toBe(mine);
    expect(resolveLaunchState(null, TODAY).habits).toHaveLength(6);
  });
});

describe("export", () => {
  it("builds a versioned export with a concept note", () => {
    const file = buildExport(createEmptyState(TODAY), new Date("2026-10-23T10:00:00Z"));
    expect(file.app).toBe("Everwick");
    expect(file.schema).toBe(2);
    expect(file.note).toMatch(/concept app/);
    expect(file.habits).toEqual([]);
    expect(exportFileName(TODAY)).toBe("everwick-export-2026-10-23.json");
  });
});

describe("import", () => {
  const seeded = createSeedState(TODAY, { onboarded: true });
  const text = JSON.stringify(buildExport(seeded, new Date()));

  it("accepts its own export and counts check-ins", () => {
    const result = parseImport(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.habits).toHaveLength(6);
    expect(result.data.logs).toEqual(seeded.logs);
    expect(result.data.skips).toEqual(seeded.skips);
    expect(result.data.checkins).toBeGreaterThan(200);
    expect(result.data.fromSchema).toBe(2);
  });

  it("migrates an older (schema 1) export", () => {
    const old = { app: "Everwick", exportedAt: "2026-09-01T10:00:00Z", habits: seeded.habits, logs: seeded.logs, settings: seeded.settings };
    const result = parseImport(JSON.stringify(old));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fromSchema).toBe(1);
      expect(result.data.skips.water).toEqual({});
    }
  });

  it("explains what is wrong in plain language", () => {
    expect(parseImport("not json")).toEqual({ ok: false, error: expect.stringMatching(/isn't valid JSON/) });
    expect(parseImport(JSON.stringify({ app: "Other", habits: [], logs: {} }))).toEqual({ ok: false, error: expect.stringMatching(/Everwick export/) });
    const noName = JSON.parse(text);
    noName.habits[1].name = "  ";
    expect(parseImport(JSON.stringify(noName))).toEqual({ ok: false, error: "Habit 2: the name is empty." });
    const badColor = JSON.parse(text);
    badColor.habits[0].color = "plaid";
    expect(parseImport(JSON.stringify(badColor))).toEqual({ ok: false, error: `${badColor.habits[0].name} (habit 1): the color isn't one this version knows.` });
    const dupes = JSON.parse(text);
    dupes.habits[1].id = dupes.habits[0].id;
    expect(parseImport(JSON.stringify(dupes))).toEqual({ ok: false, error: expect.stringMatching(/are the same habit/) });
    const future = JSON.parse(text);
    future.schema = 99;
    expect(parseImport(JSON.stringify(future))).toEqual({ ok: false, error: expect.stringMatching(/newer version/) });
  });

  it("never shows zod's own wording", () => {
    const bigGoal = JSON.parse(text);
    bigGoal.habits[0].target = 150;
    expect(parseImport(JSON.stringify(bigGoal))).toEqual({ ok: false, error: `${bigGoal.habits[0].name} (habit 1): the daily goal must be a whole number from 1 to 99.` });
    const negative = JSON.parse(text);
    negative.logs.meditate["2026-10-01"] = -1;
    const neg = parseImport(JSON.stringify(negative));
    const meditate = negative.habits.find((h: { id: string }) => h.id === "meditate").name;
    // Names the habit (never its internal id), and plural subjects take "have".
    expect(neg).toEqual({ ok: false, error: `The history for ${meditate} has a day that isn't valid (2026-10-01): a day's progress must be a number from 0 to 999.` });
    const badTime = JSON.parse(text);
    badTime.times.meditate = { "2026-10-01": 2000 };
    expect(parseImport(JSON.stringify(badTime))).toEqual({ ok: false, error: `The check-in times for ${meditate} have a day that isn't valid (2026-10-01): a check-in time must be whole minutes from 0 to 1439.` });
    for (const bad of [bigGoal, negative, badTime]) {
      const r = parseImport(JSON.stringify(bad));
      expect(r.ok ? "" : r.error).not.toMatch(/expected|Too (big|small)|Invalid/);
    }
  });

  it("words a file that isn't an object as an import problem, not a storage one", () => {
    expect(parseImport("[1, 2, 3]")).toEqual({ ok: false, error: "That file isn't an Everwick export. Choose a file exported from Everwick." });
    expect(parseImport('"hello"')).toEqual({ ok: false, error: expect.not.stringMatching(/Stored data/) });
  });

  it("rejects impossible dates such as 2026-13-45", () => {
    const file = JSON.parse(text);
    file.logs.water["2026-13-45"] = 8;
    const result = parseImport(JSON.stringify(file));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/2026-13-45/) });
    expect(result.ok ? "" : result.error).toMatch(/isn't a real day/);
  });

  it("rejects a schema version that isn't a whole number instead of treating it as version 1", () => {
    const file = JSON.parse(text);
    file.schema = "2";
    expect(parseImport(JSON.stringify(file))).toEqual({ ok: false, error: "That file has a format version Everwick doesn't recognise." });
  });

  it("drops history for unknown habits and clamps values to the target", () => {
    const file = JSON.parse(text);
    file.logs.ghost = { [TODAY]: 1 };
    file.logs.water[TODAY] = 50;
    const result = parseImport(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.logs.ghost).toBeUndefined();
    expect(result.data.logs.water[TODAY]).toBe(8);
  });

  it("applies an import but keeps the current theme", () => {
    const current = createEmptyState(TODAY, { settings: { ...createEmptyState(TODAY).settings, theme: "dark" } });
    const result = parseImport(text);
    if (!result.ok) throw new Error(result.error);
    const next = applyImport(current, result.data);
    expect(next.habits).toHaveLength(6);
    expect(next.settings.theme).toBe("dark");
    expect(next.modified).toBe(true);
    expect(next.seededOn).toBeNull();
  });
});
