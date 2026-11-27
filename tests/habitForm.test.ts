import { describe, expect, it } from "vitest";

import {
  clampTarget,
  describeGoal,
  effectiveUnit,
  emptyForm,
  firstError,
  frequencyFor,
  fromHabit,
  HabitFormSchema,
  nameKey,
  sameValues,
  schedulePreset,
  TARGET_MAX,
  toDraft,
  toggleDay,
  toPatch,
  validate,
  withFrequency,
  type HabitFormValues,
} from "@/data/habitForm";
import { HabitSchema } from "@/data/schema";
import { createSeedState } from "@/data/seed";

const TODAY = "2026-10-23";
const seed = createSeedState(TODAY, { onboarded: true });
const habit = (id: string) => seed.habits.find((h) => h.id === id)!;
const names = seed.habits.map((h) => h.name);
const form = (patch: Partial<HabitFormValues> = {}): HabitFormValues => ({ ...emptyForm(), ...patch });

describe("defaults", () => {
  it("starts with the forgiving defaults: sprout, ember, every day, once a day, reminder at 9:00", () => {
    const f = emptyForm();
    expect(f).toMatchObject({ icon: "sprout", color: "ember", frequency: "daily", target: 1, reminderOn: true, reminder: "09:00", name: "" });
    expect(schedulePreset(f)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(describeGoal(f)).toBe("Once a day");
  });

  it("returns a fresh object each time", () => {
    const a = emptyForm();
    a.days.pop();
    expect(emptyForm().days).toHaveLength(7);
  });
});

describe("frequency and schedule", () => {
  it("maps presets to days (sorted Sun..Sat)", () => {
    expect(schedulePreset(form({ frequency: "weekdays" }))).toEqual([1, 2, 3, 4, 5]);
    expect(schedulePreset(form({ frequency: "weekends" }))).toEqual([0, 6]);
    expect(schedulePreset(form({ frequency: "custom", days: [5, 1, 3, 3] }))).toEqual([1, 3, 5]);
  });

  it("infers the preset from a set of days", () => {
    expect(frequencyFor([0, 1, 2, 3, 4, 5, 6])).toBe("daily");
    expect(frequencyFor([5, 4, 3, 2, 1])).toBe("weekdays");
    expect(frequencyFor([6, 0])).toBe("weekends");
    expect(frequencyFor([1, 3, 5])).toBe("custom");
    expect(frequencyFor([])).toBe("custom");
  });

  it("switching to custom starts from the days already shown", () => {
    const weekdays = form({ frequency: "weekdays", days: [] });
    const custom = withFrequency(weekdays, "custom");
    expect(custom.frequency).toBe("custom");
    expect(custom.days).toEqual([1, 2, 3, 4, 5]);
    // Back to a preset keeps the custom days for later.
    expect(withFrequency(custom, "daily").days).toEqual([1, 2, 3, 4, 5]);
    expect(withFrequency(custom, "custom")).toBe(custom);
  });

  it("toggles single days in a custom schedule", () => {
    let f = withFrequency(form(), "custom");
    f = toggleDay(f, 0);
    f = toggleDay(f, 6);
    expect(f.days).toEqual([1, 2, 3, 4, 5]);
    f = toggleDay(f, 6);
    expect(f.days).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("target and unit", () => {
  it("clamps targets to 1..20 and whole numbers", () => {
    expect(clampTarget(0)).toBe(1);
    expect(clampTarget(99)).toBe(TARGET_MAX);
    expect(clampTarget(7.6)).toBe(8);
    expect(clampTarget(Number.NaN)).toBe(1);
  });

  it("uses no unit for once-a-day habits and falls back to 'times'", () => {
    expect(effectiveUnit({ target: 1, unit: "glasses" })).toBeNull();
    expect(effectiveUnit({ target: 3, unit: "  " })).toBe("times");
    expect(effectiveUnit({ target: 8, unit: " glasses " })).toBe("glasses");
    expect(describeGoal({ target: 8, unit: "glasses" })).toBe("8 glasses a day");
    expect(describeGoal({ target: 1, unit: "" })).toBe("Once a day");
  });
});

describe("validation", () => {
  it("asks for a name in plain words", () => {
    const r = validate(form({ name: "   " }), names);
    expect(r.ok).toBe(false);
    expect(r.errors.name).toBe("Give your habit a name");
    expect(firstError(r.errors)).toBe("Give your habit a name");
  });

  it("catches duplicates regardless of case and spacing, naming the existing habit", () => {
    const r = validate(form({ name: "  read   20 MINUTES " }), names);
    expect(r.errors.name).toBe("You already have a habit called Read 20 minutes");
    expect(nameKey(" Read  20 minutes")).toBe(nameKey("read 20 MINUTES"));
  });

  it("lets an edit keep its own name (callers exclude it)", () => {
    const others = names.filter((n) => n !== "Read 20 minutes");
    expect(validate(fromHabit(habit("read")), others).ok).toBe(true);
  });

  it("needs at least one day for a custom schedule", () => {
    const r = validate(form({ name: "Stretch", frequency: "custom", days: [] }));
    expect(r.ok).toBe(false);
    expect(r.errors.days).toBe("Pick at least one day");
  });

  it("limits lengths and ranges with friendly messages", () => {
    expect(validate(form({ name: "x".repeat(41) })).errors.name).toBe("Keep the name under 40 characters");
    expect(validate(form({ name: "Ok", detail: "y".repeat(61) })).errors.detail).toBe("Keep the detail under 60 characters");
    expect(validate(form({ name: "Ok", target: 100 })).errors.target).toBe("Pick a goal between 1 and 99");
    expect(validate(form({ name: "Ok", target: 2, unit: "z".repeat(21) })).errors.unit).toBe("Keep the unit under 20 characters");
    expect(validate(form({ name: "Ok", reminder: "25:00" })).errors.reminder).toBe("Pick a reminder time");
  });

  it("accepts a complete form", () => {
    expect(validate(form({ name: "Stretch 5 minutes" }), names)).toEqual({ ok: true, errors: {} });
    expect(HabitFormSchema.safeParse(form({ name: "Stretch" })).success).toBe(true);
  });
});

describe("conversion", () => {
  it("round-trips every seed habit through the form unchanged", () => {
    for (const h of seed.habits) {
      const draft = toDraft(fromHabit(h));
      expect(draft).toEqual({
        name: h.name,
        detail: h.detail,
        icon: h.icon,
        color: h.color,
        schedule: h.schedule,
        target: h.target,
        unit: h.unit,
        reminder: h.reminder,
        notes: "",
      });
    }
  });

  it("reads seed schedules as presets or custom", () => {
    expect(fromHabit(habit("water")).frequency).toBe("daily");
    expect(fromHabit(habit("strength"))).toMatchObject({ frequency: "custom", days: [1, 3, 5] });
    expect(fromHabit(habit("water"))).toMatchObject({ target: 8, unit: "glasses", reminderOn: true, reminder: "09:00" });
  });

  it("builds a clean draft: trimmed text, null reminder when off, no unit for once a day", () => {
    const draft = toDraft(form({ name: "  Stretch   5 minutes ", detail: " after  waking ", reminderOn: false, target: 1, unit: "glasses" }));
    expect(draft).toMatchObject({ name: "Stretch 5 minutes", detail: "after waking", reminder: null, unit: null, schedule: [0, 1, 2, 3, 4, 5, 6] });
  });

  it("produces drafts that pass the storage schema", () => {
    const draft = toDraft(form({ name: "Walk the dog", frequency: "weekends", target: 2, unit: "" }));
    const parsed = HabitSchema.safeParse({ ...draft, id: "x", createdAt: TODAY, order: 9, archived: false });
    expect(parsed.success).toBe(true);
    expect(draft.unit).toBe("times");
  });

  it("edits never touch notes or history", () => {
    const patch = toPatch(fromHabit(habit("read")));
    expect(patch).not.toHaveProperty("notes");
    expect(patch).not.toHaveProperty("createdAt");
    expect(patch.name).toBe("Read 20 minutes");
  });

  it("compares forms by what they would save", () => {
    const a = fromHabit(habit("water"));
    expect(sameValues(a, { ...a, name: " Drink  water " })).toBe(true);
    expect(sameValues(a, { ...a, days: [6, 5, 4, 3, 2, 1, 0] })).toBe(true);
    expect(sameValues(a, { ...a, target: 7 })).toBe(false);
    // Switching the reminder off and on again with the same time is no change.
    expect(sameValues(a, { ...a, reminderOn: true })).toBe(true);
    expect(sameValues(a, { ...a, reminderOn: false })).toBe(false);
  });
});
