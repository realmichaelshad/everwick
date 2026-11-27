import { describe, expect, it } from "vitest";

import { fromHabit, toPatch, validate } from "@/data/habitForm";
import { LIMITS } from "@/data/limits";
import { applyImport, buildExport, parseImport } from "@/data/persist";
import { reducer } from "@/data/reducer";
import { createSeedState } from "@/data/seed";

const TODAY = "2026-10-23";

/**
 * The form and the import check share one set of limits (data/limits.ts), so
 * whatever imports cleanly can be opened in Edit and saved without the app
 * quietly changing it.
 */
describe("one set of limits for the form and the import check", () => {
  const seeded = createSeedState(TODAY, { onboarded: true });

  function importWith(change: (file: ReturnType<typeof buildExport>) => void) {
    const file = buildExport(seeded, new Date());
    change(file);
    const parsed = parseImport(JSON.stringify(file));
    if (!parsed.ok) throw new Error(parsed.error);
    return applyImport(seeded, parsed.data);
  }

  it("keeps an imported goal of 50 through an edit of the name", () => {
    const state = importWith((file) => {
      const read = file.habits.find((h) => h.id === "read")!;
      read.target = 50;
      read.unit = "pages";
    });
    const read = state.habits.find((h) => h.id === "read")!;
    expect(read.target).toBe(50);
    // Open Edit, change only the name, save.
    const values = { ...fromHabit(read), name: "Read 50 pages" };
    const result = validate(values, []);
    expect(result.ok).toBe(true);
    expect(values.target).toBe(50);
    const saved = reducer(state, { type: "updateHabit", id: "read", patch: toPatch(values) });
    const after = saved.habits.find((h) => h.id === "read")!;
    expect(after.name).toBe("Read 50 pages");
    expect(after.target).toBe(50);
  });

  it("lets every name that imports also save in Edit", () => {
    const longest = "x".repeat(LIMITS.name);
    const state = importWith((file) => {
      file.habits[0].name = longest;
    });
    expect(validate(fromHabit(state.habits[0]), []).ok).toBe(true);
    const tooLong = buildExport(seeded, new Date());
    tooLong.habits[0].name = "x".repeat(LIMITS.name + 1);
    expect(parseImport(JSON.stringify(tooLong))).toEqual({ ok: false, error: expect.stringMatching(new RegExp(`longer than ${LIMITS.name} characters`)) });
  });

  it("rejects goals above the form's highest goal on import", () => {
    const file = buildExport(seeded, new Date());
    file.habits[0].target = LIMITS.targetMax + 1;
    expect(parseImport(JSON.stringify(file)).ok).toBe(false);
  });
});
