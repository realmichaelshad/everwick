/**
 * Static content: icon choices, quick-add suggestions and onboarding goals.
 * Pure data (no React Native) so it can be used by tests and scripts.
 */
import type { HabitColorKey } from "@/theme/colors";

import { ALL_DAYS, GOAL_KEYS, type GoalKey, type HabitDraft, type HabitIconKey, type Weekday } from "./types";

export const HABIT_ICONS: { key: HabitIconKey; label: string }[] = [
  { key: "droplet", label: "Water" },
  { key: "book", label: "Book" },
  { key: "footprints", label: "Steps" },
  { key: "lotus", label: "Meditation" },
  { key: "moon", label: "Evening" },
  { key: "dumbbell", label: "Strength" },
  { key: "bike", label: "Cycling" },
  { key: "apple", label: "Fruit" },
  { key: "salad", label: "Greens" },
  { key: "pill", label: "Vitamins" },
  { key: "pen", label: "Journal" },
  { key: "music", label: "Music" },
  { key: "sun", label: "Morning" },
  { key: "bed", label: "Sleep" },
  { key: "heart", label: "Heart" },
  { key: "leaf", label: "Outdoors" },
  { key: "coffee", label: "Coffee" },
  { key: "sprout", label: "Growth" },
  { key: "wind", label: "Breathing" },
  { key: "timer", label: "Focus" },
  { key: "languages", label: "Language" },
  { key: "guitar", label: "Practice" },
  { key: "piggy", label: "Savings" },
  { key: "smile", label: "Gratitude" },
  { key: "brush", label: "Creative" },
  { key: "mountain", label: "Adventure" },
];

export const WEEKDAYS_ONLY: Weekday[] = [1, 2, 3, 4, 5];
export const WEEKENDS_ONLY: Weekday[] = [0, 6];

/** One-tap habits offered by quick-add on Today and in the empty state. */
export const SUGGESTIONS: (HabitDraft & { key: string })[] = [
  {
    key: "stretch",
    name: "Stretch 5 minutes",
    icon: "wind",
    color: "teal",
    schedule: [...ALL_DAYS],
    target: 1,
    unit: null,
    detail: "Loosen up after waking",
    reminder: "07:45",
    notes: "",
  },
  {
    key: "journal",
    name: "Journal one page",
    icon: "pen",
    color: "violet",
    schedule: [...ALL_DAYS],
    target: 1,
    unit: null,
    detail: "Three lines is enough",
    reminder: "21:30",
    notes: "",
  },
  {
    key: "vitamins",
    name: "Take vitamins",
    icon: "pill",
    color: "sun",
    schedule: [...ALL_DAYS],
    target: 1,
    unit: null,
    detail: "With breakfast",
    reminder: "08:15",
    notes: "",
  },
  {
    key: "greens",
    name: "Eat 3 portions of veg",
    icon: "salad",
    color: "leaf",
    schedule: [...ALL_DAYS],
    target: 3,
    unit: "portions",
    detail: "Lunch and dinner count",
    reminder: null,
    notes: "",
  },
  {
    key: "language",
    name: "Practice Spanish",
    icon: "languages",
    color: "rose",
    schedule: [...WEEKDAYS_ONLY],
    target: 1,
    unit: null,
    detail: "10 minutes on the commute",
    reminder: "08:40",
    notes: "",
  },
  {
    key: "outside",
    name: "Get outside",
    icon: "leaf",
    color: "leaf",
    schedule: [...ALL_DAYS],
    target: 1,
    unit: null,
    detail: "Fresh air before noon",
    reminder: "11:00",
    notes: "",
  },
];

export interface GoalInfo {
  key: GoalKey;
  label: string;
  icon: HabitIconKey;
  color: HabitColorKey;
}

/** Label, icon and color for every goal key (including ones onboarding no longer offers, for older data). */
export const GOAL_INFO: Record<GoalKey, GoalInfo> = {
  hydration: { key: "hydration", label: "Drink more water", icon: "droplet", color: "ocean" },
  fitness: { key: "fitness", label: "Move every day", icon: "footprints", color: "leaf" },
  strength: { key: "strength", label: "Get stronger", icon: "dumbbell", color: "rose" },
  mind: { key: "mind", label: "Calmer mind", icon: "lotus", color: "teal" },
  learning: { key: "learning", label: "Read more", icon: "book", color: "violet" },
  sleep: { key: "sleep", label: "Sleep better", icon: "moon", color: "indigo" },
  nutrition: { key: "nutrition", label: "Eat well", icon: "salad", color: "leaf" },
  focus: { key: "focus", label: "Less screen time", icon: "timer", color: "sun" },
  selfcare: { key: "selfcare", label: "Self-care", icon: "heart", color: "ember" },
};

/**
 * The goals onboarding offers: six, each with its own soft 3D habit art
 * (water, sneaker, dumbbell, cushion, book, sleepy moon), so the chips are
 * one consistent set.
 */
export const GOALS: GoalInfo[] = (["hydration", "fitness", "strength", "mind", "learning", "sleep"] as const).map((key) => GOAL_INFO[key]);

/** Every goal key in display order (onboarding goals first). */
export const GOAL_ORDER: readonly GoalKey[] = [...GOALS.map((g) => g.key), ...GOAL_KEYS.filter((k) => !GOALS.some((g) => g.key === k))];

/** Friendly schedule summary: "Every day", "Weekdays", "Mon, Wed, Fri". */
export function describeSchedule(schedule: readonly Weekday[]): string {
  const set = new Set(schedule);
  if (set.size === 7) return "Every day";
  if (set.size === 5 && WEEKDAYS_ONLY.every((d) => set.has(d))) return "Weekdays";
  if (set.size === 2 && WEEKENDS_ONLY.every((d) => set.has(d))) return "Weekends";
  if (set.size === 0) return "No days set";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // Monday-first reading order.
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => set.has(d as Weekday))
    .map((d) => names[d])
    .join(", ");
}

/** "8 glasses", "1 time" style target label. */
export function describeTarget(target: number, unit: string | null): string {
  if (target <= 1 && !unit) return "Once a day";
  return `${target} ${unit ?? (target === 1 ? "time" : "times")}`;
}
