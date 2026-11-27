import type { HabitColorKey } from "@/theme/colors";

/** Local calendar day as "YYYY-MM-DD". All history is keyed by this. */
export type DateKey = string;

/** 0 = Sunday ... 6 = Saturday (same as Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_DAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export const HABIT_ICON_KEYS = [
  "droplet",
  "book",
  "footprints",
  "lotus",
  "moon",
  "dumbbell",
  "bike",
  "apple",
  "salad",
  "pill",
  "pen",
  "music",
  "sun",
  "bed",
  "heart",
  "leaf",
  "coffee",
  "sprout",
  "wind",
  "timer",
  "languages",
  "guitar",
  "piggy",
  "smile",
  "brush",
  "mountain",
] as const;

export type HabitIconKey = (typeof HABIT_ICON_KEYS)[number];

export interface Habit {
  id: string;
  name: string;
  icon: HabitIconKey;
  color: HabitColorKey;
  /** Days this habit is due. All seven = every day. Unscheduled days never break a streak. */
  schedule: Weekday[];
  /** How many units make the day "done". 1 = a simple check-off. */
  target: number;
  /** Unit for target habits, e.g. "glasses". Shown as "5 of 8 glasses". */
  unit: string | null;
  /** Short description shown under the name, e.g. "20 minutes before bed". */
  detail: string;
  /** Reminder as "HH:MM" (24h) or null. */
  reminder: string | null;
  notes: string;
  /** Day the habit was created; days before it are not counted. */
  createdAt: DateKey;
  order: number;
  archived: boolean;
}

/** Progress per habit per day: logs[habitId][dateKey] = units done (0..target). */
export type Logs = Record<string, Record<DateKey, number>>;

/** Days a habit was skipped on purpose: skips[habitId][dateKey] = true. A skip neither counts nor breaks a streak. */
export type Skips = Record<string, Record<DateKey, true>>;

/** When a day's check-in was completed, in minutes after local midnight: times[habitId][dateKey] = 445 (7:25 AM). */
export type CheckinTimes = Record<string, Record<DateKey, number>>;

/**
 * Everything the statistics need to know about what happened. AppState
 * satisfies it, so screens can pass `state` straight in.
 */
export interface History {
  logs: Logs;
  skips?: Skips;
  times?: CheckinTimes;
}

/**
 * Onboarding goals. Every key stays valid for stored data, even ones the
 * current onboarding no longer offers (nutrition, focus, selfcare).
 */
export const GOAL_KEYS = ["hydration", "fitness", "strength", "mind", "sleep", "learning", "nutrition", "focus", "selfcare"] as const;
export type GoalKey = (typeof GOAL_KEYS)[number];

export interface NotificationSettings {
  enabled: boolean;
  /** Morning nudge "HH:MM". */
  morning: string;
  /** Evening check-in "HH:MM". */
  evening: string;
  /** Warn before a streak would break. */
  streakSaver: boolean;
  /** Sunday recap. */
  weeklyReview: boolean;
  sound: boolean;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  name: string;
  /** 1 = Monday. */
  weekStartsOn: 0 | 1;
  haptics: boolean;
  goals: GoalKey[];
  notifications: NotificationSettings;
}

/** Current storage schema version. Bump it and add a migration in migrations.ts when AppState changes shape. */
export const SCHEMA_VERSION = 2;

export interface AppState {
  version: typeof SCHEMA_VERSION;
  habits: Habit[];
  logs: Logs;
  skips: Skips;
  times: CheckinTimes;
  settings: Settings;
  onboarded: boolean;
  /** The day the demo history was generated for (null when the user cleared it). */
  seededOn: DateKey | null;
  /** True once the user changed anything; untouched demo data is regenerated each new day. */
  modified: boolean;
  /** Mock Pro state for the Upgrade screen (no purchase ever happens). */
  proPreview: boolean;
  /** Achievement ids whose unlock animation the user has already seen. */
  seenAchievements: string[];
}

/** Input for creating a habit (id, order, createdAt are filled in by the store). */
export type HabitDraft = Omit<Habit, "id" | "order" | "createdAt" | "archived"> & { createdAt?: DateKey };
