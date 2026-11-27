/**
 * The Add / Edit habit form as pure data: values, defaults, presets,
 * validation with plain-language messages, and conversion to and from a
 * Habit. No React Native imports, so everything here is unit-tested
 * (tests/habitForm.test.ts). The screen (components/habit/HabitForm) only
 * renders these values and calls these functions.
 */
import { z } from "zod";

import { HABIT_COLOR_KEYS, type HabitColorKey } from "@/theme/colors";

import { WEEKDAYS_ONLY, WEEKENDS_ONLY } from "./catalog";
import { LIMITS } from "./limits";
import { ALL_DAYS, HABIT_ICON_KEYS, type Habit, type HabitDraft, type HabitIconKey, type Weekday } from "./types";

export type Frequency = "daily" | "weekdays" | "weekends" | "custom";

export interface HabitFormValues {
  name: string;
  /** Optional one-liner under the name ("Before bed, paper book"). */
  detail: string;
  icon: HabitIconKey;
  color: HabitColorKey;
  frequency: Frequency;
  /** The days used when frequency is "custom" (kept while a preset is picked, so switching back restores them). */
  days: Weekday[];
  /** 1 = a simple check-off; more = "8 glasses" style. */
  target: number;
  /** Unit for targets above 1; blank falls back to "times". */
  unit: string;
  reminderOn: boolean;
  /** "HH:MM" 24h. Kept when the reminder is switched off, so switching it on again restores it. */
  reminder: string;
}

export type HabitFormField = keyof HabitFormValues;
export type HabitFormErrors = Partial<Record<HabitFormField, string>>;

export const NAME_MAX = LIMITS.name;
export const DETAIL_MAX = LIMITS.detail;
export const UNIT_MAX = LIMITS.unit;
export const TARGET_MIN = LIMITS.targetMin;
export const TARGET_MAX = LIMITS.targetMax;
export const DEFAULT_REMINDER = "09:00";

/** One-tap units offered under the target stepper. */
export const UNIT_SUGGESTIONS = ["glasses", "minutes", "pages", "thousand steps", "times"] as const;

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "custom", label: "Custom" },
];

const PRESET_DAYS: Record<Exclude<Frequency, "custom">, readonly Weekday[]> = {
  daily: ALL_DAYS,
  weekdays: WEEKDAYS_ONLY,
  weekends: WEEKENDS_ONLY,
};

const sortDays = (days: readonly Weekday[]): Weekday[] => [...new Set(days)].sort((a, b) => a - b) as Weekday[];

/** Collapses inner whitespace and trims ("  Read   more " -> "Read more"). */
export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Case- and space-insensitive key for duplicate-name checks. */
export function nameKey(name: string): string {
  return cleanText(name).toLocaleLowerCase();
}

/** Sensible defaults for a new habit: sprout icon, ember, every day, once a day, reminder on at 9:00 AM. */
export function emptyForm(): HabitFormValues {
  return {
    name: "",
    detail: "",
    icon: "sprout",
    color: "ember",
    frequency: "daily",
    days: [...ALL_DAYS],
    target: 1,
    unit: "",
    reminderOn: true,
    reminder: DEFAULT_REMINDER,
  };
}

/** The frequency preset that matches a set of days exactly, or "custom". */
export function frequencyFor(days: readonly Weekday[]): Frequency {
  const set = sortDays(days).join(",");
  for (const [key, preset] of Object.entries(PRESET_DAYS) as [Exclude<Frequency, "custom">, readonly Weekday[]][]) {
    if (sortDays(preset).join(",") === set) return key;
  }
  return "custom";
}

/** The days a form schedules: the preset's days, or the custom selection. Always sorted Sun..Sat. */
export function schedulePreset(values: Pick<HabitFormValues, "frequency" | "days">): Weekday[] {
  return values.frequency === "custom" ? sortDays(values.days) : sortDays(PRESET_DAYS[values.frequency]);
}

/**
 * Switching frequency. Moving to "custom" starts from the days the person
 * was already looking at (every day -> all seven), so nothing jumps.
 */
export function withFrequency(values: HabitFormValues, frequency: Frequency): HabitFormValues {
  if (frequency === values.frequency) return values;
  if (frequency === "custom") return { ...values, frequency, days: schedulePreset(values) };
  return { ...values, frequency };
}

/** Toggles one weekday in a custom schedule. */
export function toggleDay(values: HabitFormValues, day: Weekday): HabitFormValues {
  const days = values.days.includes(day) ? values.days.filter((d) => d !== day) : [...values.days, day];
  return { ...values, frequency: "custom", days: sortDays(days) };
}

/** Clamps a target into the allowed range. */
export function clampTarget(target: number): number {
  if (!Number.isFinite(target)) return TARGET_MIN;
  return Math.min(TARGET_MAX, Math.max(TARGET_MIN, Math.round(target)));
}

/** The unit a saved habit will use: null for once-a-day habits, "times" when left blank. */
export function effectiveUnit(values: Pick<HabitFormValues, "target" | "unit">): string | null {
  if (values.target <= 1) return null;
  return cleanText(values.unit) || "times";
}

/** "Once a day" or "8 glasses a day". */
export function describeGoal(values: Pick<HabitFormValues, "target" | "unit">): string {
  const unit = effectiveUnit(values);
  return unit ? `${values.target} ${unit} a day` : "Once a day";
}

/** Form values for editing an existing habit. */
export function fromHabit(habit: Habit): HabitFormValues {
  const days = sortDays(habit.schedule);
  return {
    name: habit.name,
    detail: habit.detail ?? "",
    icon: habit.icon,
    color: habit.color,
    frequency: frequencyFor(days),
    days,
    target: clampTarget(habit.target),
    unit: habit.unit ?? "",
    reminderOn: habit.reminder != null,
    reminder: habit.reminder ?? DEFAULT_REMINDER,
  };
}

/** The habit draft to save (notes are not part of the form and start empty). */
export function toDraft(values: HabitFormValues): HabitDraft {
  const target = clampTarget(values.target);
  return {
    name: cleanText(values.name),
    detail: cleanText(values.detail),
    icon: values.icon,
    color: values.color,
    schedule: schedulePreset(values),
    target,
    unit: effectiveUnit({ target, unit: values.unit }),
    reminder: values.reminderOn ? values.reminder : null,
    notes: "",
  };
}

/** The changes an edit makes to an existing habit (everything the form owns; notes and history are untouched). */
export function toPatch(values: HabitFormValues): Partial<Omit<Habit, "id">> {
  const { notes: _notes, ...patch } = toDraft(values);
  return patch;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

const TimeValue = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a reminder time");

/** The form's shape and rules, with messages written for people (shown inline under each field). */
export const HabitFormSchema = z.object({
  name: z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(1, "Give your habit a name").max(NAME_MAX, `Keep the name under ${NAME_MAX} characters`)),
  detail: z.string().transform(cleanText).pipe(z.string().max(DETAIL_MAX, `Keep the detail under ${DETAIL_MAX} characters`)),
  icon: z.enum(HABIT_ICON_KEYS, { error: "Pick an icon" }),
  color: z.enum(HABIT_COLOR_KEYS, { error: "Pick a color" }),
  frequency: z.enum(["daily", "weekdays", "weekends", "custom"], { error: "Pick how often" }),
  days: z.array(z.number().int().min(0).max(6)),
  target: z
    .number({ error: `Pick a goal between ${TARGET_MIN} and ${TARGET_MAX}` })
    .int(`Pick a whole number`)
    .min(TARGET_MIN, `Pick a goal between ${TARGET_MIN} and ${TARGET_MAX}`)
    .max(TARGET_MAX, `Pick a goal between ${TARGET_MIN} and ${TARGET_MAX}`),
  unit: z.string().transform(cleanText).pipe(z.string().max(UNIT_MAX, `Keep the unit under ${UNIT_MAX} characters`)),
  reminderOn: z.boolean(),
  reminder: TimeValue,
});

export interface ValidationResult {
  ok: boolean;
  errors: HabitFormErrors;
}

/**
 * Validates the form. `existingNames` are the names of the person's other
 * habits (exclude the one being edited); a match is reported in plain words.
 * Returns the first message per field.
 */
export function validate(values: HabitFormValues, existingNames: readonly string[] = []): ValidationResult {
  const errors: HabitFormErrors = {};
  const parsed = HabitFormSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as HabitFormField | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }
  if (!errors.name) {
    const key = nameKey(values.name);
    const clash = existingNames.find((n) => nameKey(n) === key);
    if (clash) errors.name = `You already have a habit called ${cleanText(clash)}`;
  }
  if (schedulePreset(values).length === 0) errors.days = "Pick at least one day";
  return { ok: Object.keys(errors).length === 0, errors };
}

/** The first problem, in reading order, for the hint next to Save. */
export function firstError(errors: HabitFormErrors): string | null {
  const order: HabitFormField[] = ["name", "detail", "icon", "color", "frequency", "days", "target", "unit", "reminder", "reminderOn"];
  for (const field of order) if (errors[field]) return errors[field] ?? null;
  return null;
}

/** True when two forms would save the same habit (ignores spacing and day order). */
export function sameValues(a: HabitFormValues, b: HabitFormValues): boolean {
  const da = toDraft(a);
  const db = toDraft(b);
  return (
    da.name === db.name &&
    da.detail === db.detail &&
    da.icon === db.icon &&
    da.color === db.color &&
    da.schedule.join(",") === db.schedule.join(",") &&
    da.target === db.target &&
    da.unit === db.unit &&
    da.reminder === db.reminder
  );
}

