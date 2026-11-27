/**
 * The list of illustration slots, kept free of imports so build scripts
 * (scripts/sync-illustrations.ts) can read it without bundling images.
 */
export const ILLUSTRATION_SLOTS = [
  "welcome",
  "goals",
  "reminders",
  "all-done",
  "empty-habits",
  "pro",
  "avatar",
  "badge-streak-7",
  "badge-streak-30",
  "badge-checkins-100",
  "badge-perfect-week",
  "habit-water",
  "habit-read",
  "habit-walk",
  "habit-meditate",
  "habit-no-phone",
  "habit-strength",
] as const;

export type IllustrationSlot = (typeof ILLUSTRATION_SLOTS)[number];
