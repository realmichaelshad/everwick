import { describe, expect, it } from "vitest";

import { migrate, MigrationError, MIGRATIONS } from "@/data/migrations";
import { parseState, StorageFormatError } from "@/data/persist";
import { createSeedState } from "@/data/seed";
import { SCHEMA_VERSION } from "@/data/types";

const TODAY = "2026-10-23";

/** A state exactly as schema v1 builds wrote it (no skips, times or seenAchievements). */
function v1Fixture() {
  const v2 = createSeedState(TODAY, { onboarded: true, modified: true });
  const { skips: _s, times: _t, seenAchievements: _a, ...rest } = v2;
  return { ...rest, version: 1 };
}

describe("migrations", () => {
  it("has a step for every version below the current one", () => {
    for (let v = 1; v < SCHEMA_VERSION; v++) expect(MIGRATIONS[v]).toBeTypeOf("function");
  });

  it("upgrades v1 to v2 with empty skips, times and achievements", () => {
    const { data, from, applied } = migrate(v1Fixture());
    expect(from).toBe(1);
    expect(applied).toEqual([1]);
    expect(data.version).toBe(2);
    expect(data.skips).toEqual({});
    expect(data.times).toEqual({});
    expect(data.seenAchievements).toEqual([]);
  });

  it("never drops skips or times a v1 file already carries", () => {
    const v1 = { ...v1Fixture(), skips: { water: { "2026-10-01": true } }, times: { water: { "2026-10-02": 480 } } };
    const { data } = migrate(v1);
    expect(data.skips).toEqual(v1.skips);
    expect(data.times).toEqual(v1.times);
  });

  it("refuses a version that isn't a whole number", () => {
    expect(() => migrate({ ...v1Fixture(), version: "2" })).toThrow(MigrationError);
    expect(() => migrate({ ...v1Fixture(), version: 1.5 })).toThrow(MigrationError);
  });

  it("leaves current data alone", () => {
    const state = createSeedState(TODAY);
    const { data, applied } = migrate(state);
    expect(applied).toEqual([]);
    expect(data).toEqual(state);
  });

  it("refuses data from a newer app and non-objects", () => {
    expect(() => migrate({ version: SCHEMA_VERSION + 1 })).toThrow(MigrationError);
    expect(() => migrate([])).toThrow(MigrationError);
    expect(() => migrate("hello")).toThrow(MigrationError);
  });

  it("reads a stored v1 blob end to end and keeps the history", () => {
    const v1 = v1Fixture();
    const state = parseState(JSON.stringify(v1))!;
    expect(state.version).toBe(SCHEMA_VERSION);
    expect(state.habits).toHaveLength(6);
    expect(state.logs).toEqual(v1.logs);
    expect(state.onboarded).toBe(true);
  });

  it("reports corrupt or invalid stored data as a StorageFormatError", () => {
    expect(() => parseState("{nope")).toThrow(StorageFormatError);
    expect(() => parseState(JSON.stringify({ version: 9 }))).toThrow(StorageFormatError);
    const bad = { ...createSeedState(TODAY), habits: [{ id: "x" }] };
    expect(() => parseState(JSON.stringify(bad))).toThrow(/Habit 1/);
    expect(parseState(null)).toBeNull();
    expect(parseState("")).toBeNull();
  });
});
