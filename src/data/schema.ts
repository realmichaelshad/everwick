/**
 * Runtime validation for everything that crosses a trust boundary: what we
 * read back from device storage and what a person imports from a file.
 * TypeScript types describe the shape; these zod schemas enforce it.
 */
import { z } from "zod";

import { HABIT_COLOR_KEYS } from "@/theme/colors";

import { fromKey, toKey } from "./dates";
import { LIMITS } from "./limits";
import { DEFAULT_SETTINGS } from "./seed";
import { GOAL_KEYS, HABIT_ICON_KEYS, SCHEMA_VERSION, type AppState, type Habit, type Weekday } from "./types";

/*
 * Messages are written for people: each one is a whole phrase with its subject
 * ("the daily goal must be ..."), so describeIssue can put "Habit 2:" in front
 * and never shows zod's own wording.
 */
const says = (error: string) => ({ error });

/** A real calendar day as "YYYY-MM-DD" (2026-13-45 is rejected: it must round-trip). */
export const DateKeySchema = z
  .string(says("the date should look like 2026-10-23"))
  .regex(/^\d{4}-\d{2}-\d{2}$/, says("the date should look like 2026-10-23"))
  .refine((key) => toKey(fromKey(key)) === key, says("the date isn't a real day"));
export const TimeSchema = z.string(says("the time should look like 07:30")).regex(/^([01]\d|2[0-3]):[0-5]\d$/, says("the time should look like 07:30"));

const WeekdaySchema = z.number(says("the schedule should list days 0 (Sunday) to 6 (Saturday)")).int(says("the schedule should list days 0 (Sunday) to 6 (Saturday)")).min(0, says("the schedule should list days 0 (Sunday) to 6 (Saturday)")).max(6, says("the schedule should list days 0 (Sunday) to 6 (Saturday)"));

const GOAL_RANGE = `the daily goal must be a whole number from ${LIMITS.targetMin} to ${LIMITS.targetMax}`;

export const HabitSchema = z.object({
  id: z.string(says("the habit id is missing")).min(1, says("the habit id is missing")).max(80, says("the habit id is longer than 80 characters")),
  name: z.string(says("the name is missing")).trim().min(1, says("the name is empty")).max(LIMITS.name, says(`the name is longer than ${LIMITS.name} characters`)),
  icon: z.enum(HABIT_ICON_KEYS, says("the icon isn't one this version knows")),
  color: z.enum(HABIT_COLOR_KEYS, says("the color isn't one this version knows")),
  schedule: z
    .array(WeekdaySchema, says("the schedule should be a list of days"))
    .min(1, says("the schedule needs at least one day"))
    .max(7, says("the schedule has more than seven days"))
    .transform((days) => [...new Set(days)].sort((a, b) => a - b) as Weekday[]),
  target: z.number(says(GOAL_RANGE)).int(says(GOAL_RANGE)).min(LIMITS.targetMin, says(GOAL_RANGE)).max(LIMITS.targetMax, says(GOAL_RANGE)),
  unit: z.string(says("the unit should be text")).max(LIMITS.unit, says(`the unit is longer than ${LIMITS.unit} characters`)).nullable().default(null),
  detail: z.string(says("the description should be text")).max(LIMITS.detail, says(`the description is longer than ${LIMITS.detail} characters`)).default(""),
  reminder: TimeSchema.nullable().default(null),
  notes: z.string(says("the notes should be text")).max(LIMITS.notes, says(`the notes are longer than ${LIMITS.notes.toLocaleString("en-US")} characters`)).default(""),
  createdAt: DateKeySchema,
  order: z.number(says("the list position should be a number")).default(0),
  archived: z.boolean(says("the paused flag should be true or false")).default(false),
}) satisfies z.ZodType<Habit, unknown>;

const VALUE_RANGE = "a day's progress must be a number from 0 to 999";
export const LogsSchema = z.record(z.string(), z.record(DateKeySchema, z.number(says(VALUE_RANGE)).min(0, says(VALUE_RANGE)).max(999, says(VALUE_RANGE))));
export const SkipsSchema = z.record(z.string(), z.record(DateKeySchema, z.literal(true, says("a skipped day should be marked true"))));
const TIME_RANGE = "a check-in time must be whole minutes from 0 to 1439";
export const TimesSchema = z.record(z.string(), z.record(DateKeySchema, z.number(says(TIME_RANGE)).int(says(TIME_RANGE)).min(0, says(TIME_RANGE)).max(1439, says(TIME_RANGE))));

export const NotificationSettingsSchema = z.object({
  enabled: z.boolean().default(DEFAULT_SETTINGS.notifications.enabled),
  morning: TimeSchema.default(DEFAULT_SETTINGS.notifications.morning),
  evening: TimeSchema.default(DEFAULT_SETTINGS.notifications.evening),
  streakSaver: z.boolean().default(DEFAULT_SETTINGS.notifications.streakSaver),
  weeklyReview: z.boolean().default(DEFAULT_SETTINGS.notifications.weeklyReview),
  sound: z.boolean().default(DEFAULT_SETTINGS.notifications.sound),
});

export const SettingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).default(DEFAULT_SETTINGS.theme),
  name: z.string().max(LIMITS.profileName).default(DEFAULT_SETTINGS.name),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(DEFAULT_SETTINGS.weekStartsOn),
  haptics: z.boolean().default(DEFAULT_SETTINGS.haptics),
  goals: z
    .array(z.enum(GOAL_KEYS))
    .default([...DEFAULT_SETTINGS.goals]),
  notifications: NotificationSettingsSchema.default({ ...DEFAULT_SETTINGS.notifications }),
});

/** The stored app state at the current schema version (after migrations ran). */
export const AppStateSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  habits: z.array(HabitSchema),
  logs: LogsSchema,
  skips: SkipsSchema.default({}),
  times: TimesSchema.default({}),
  settings: SettingsSchema,
  onboarded: z.boolean().default(false),
  seededOn: DateKeySchema.nullable().default(null),
  modified: z.boolean().default(false),
  proPreview: z.boolean().default(false),
  seenAchievements: z.array(z.string()).default([]),
}) satisfies z.ZodType<AppState, unknown>;

/** An export file (any schema version we can migrate from). */
export const ExportFileSchema = z.object({
  app: z.literal("Everwick", says("This doesn't look like an Everwick export")),
  schema: z.number().int().min(1).default(1),
  exportedAt: z.string().optional(),
  habits: z.array(HabitSchema, says("the file has no list of habits")).max(LIMITS.habitsPerFile, says(`the file has more than ${LIMITS.habitsPerFile} habits`)),
  logs: LogsSchema,
  skips: SkipsSchema.default({}),
  times: TimesSchema.default({}),
  settings: SettingsSchema.optional(),
});

const HISTORY_LABEL: Record<string, string> = { logs: "history", skips: "skipped days", times: "check-in times" };
/** Plural subjects take "have": "The check-in times for Meditate have a day that isn't valid". */
const HISTORY_PLURAL = new Set(["skips", "times"]);
const ours = (message: string) => /^(the |a |a day's |this )/i.test(message);
const sentence = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}${/[.!?]$/.test(text) ? "" : "."}`;

/** The habit's name from the raw input (for messages), or null. */
function habitName(input: unknown, id: string): string | null {
  if (!input || typeof input !== "object") return null;
  const habits = (input as { habits?: unknown }).habits;
  if (!Array.isArray(habits)) return null;
  const match = habits.find((h): h is { id: unknown; name: unknown } => !!h && typeof h === "object" && (h as { id?: unknown }).id === id);
  return match && typeof match.name === "string" && match.name.trim() ? match.name.trim() : null;
}

/**
 * Turns the first zod issue into one plain-language sentence, e.g.
 * "Habit 1: the daily goal must be a whole number from 1 to 99." or
 * "The history for Meditate has a day that isn't valid (2026-13-45)."
 * Pass the raw `input` so history problems name the habit, not its id.
 */
export function describeIssue(error: z.ZodError, root: "state" | "file" = "file", input?: unknown): string {
  const first0 = error.issues[0];
  const where = root === "file" ? "this file" : "the stored data";
  if (!first0) return `Something in ${where} isn't right.`;
  // A bad record key (e.g. a date like 2026-13-45) carries our message one level down.
  const nested = first0.code === "invalid_key" ? first0.issues[0] : undefined;
  const issue = { path: first0.path, message: nested?.message ?? first0.message };
  const [first, second, third] = issue.path;
  if (first === "app") return sentence(issue.message);
  if (first === "habits" && typeof second === "number") {
    const detail = ours(issue.message) ? issue.message : `the ${typeof third === "string" ? third : "habit"} isn't valid`;
    const name = Array.isArray((input as { habits?: unknown } | undefined)?.habits) ? (input as { habits: { name?: unknown }[] }).habits[second]?.name : undefined;
    const label = typeof name === "string" && name.trim() ? `${name.trim().slice(0, 40)} (habit ${second + 1})` : `Habit ${second + 1}`;
    return `${label}: ${detail}${/[.!?]$/.test(detail) ? "" : "."}`;
  }
  if (first === "habits") return sentence(ours(issue.message) ? issue.message : `the list of habits in ${where} isn't valid`);
  if (typeof first === "string" && first in HISTORY_LABEL) {
    const name = typeof second === "string" ? habitName(input, second) : null;
    const habit = name ? ` for ${name}` : typeof second === "string" ? " for one habit" : "";
    const day = typeof third === "string" ? ` (${third})` : "";
    const why = ours(issue.message) ? `: ${issue.message}` : "";
    const verb = HISTORY_PLURAL.has(first) ? "have" : "has";
    return `The ${HISTORY_LABEL[first]}${habit} ${verb} a day that isn't valid${day}${why}.`;
  }
  if (first === "settings") return `The settings in ${where} aren't valid${ours(issue.message) ? `: ${issue.message}` : ""}.`;
  if (issue.path.length === 0) return root === "file" ? "That file isn't an Everwick export." : "The stored data has an unknown format.";
  return `Part of ${where} isn't valid (${issue.path.join(".")}).`;
}
