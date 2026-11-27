/**
 * Written by scripts/sync-illustrations.ts (npm run illustrations). Do not edit by hand.
 * null = no PNG yet, the app draws the SVG fallback for that slot.
 */
import type { IllustrationSlot } from "./illustrationSlots";

/** Metro asset ids (what require() of an image returns), one entry per slot: a missing or misspelled slot fails the typecheck. */
export const ILLUSTRATION_SOURCES: Record<IllustrationSlot, number | null> = {
  "welcome": require("../../assets/illustrations/welcome.png"),
  "goals": require("../../assets/illustrations/goals.png"),
  "reminders": require("../../assets/illustrations/reminders.png"),
  "all-done": require("../../assets/illustrations/all-done.png"),
  "empty-habits": require("../../assets/illustrations/empty-habits.png"),
  "pro": require("../../assets/illustrations/pro.png"),
  "avatar": null,
  "badge-streak-7": require("../../assets/illustrations/badge-streak-7.png"),
  "badge-streak-30": require("../../assets/illustrations/badge-streak-30.png"),
  "badge-checkins-100": require("../../assets/illustrations/badge-checkins-100.png"),
  "badge-perfect-week": require("../../assets/illustrations/badge-perfect-week.png"),
  "habit-water": require("../../assets/illustrations/habit-water.png"),
  "habit-read": require("../../assets/illustrations/habit-read.png"),
  "habit-walk": require("../../assets/illustrations/habit-walk.png"),
  "habit-meditate": require("../../assets/illustrations/habit-meditate.png"),
  "habit-no-phone": require("../../assets/illustrations/habit-no-phone.png"),
  "habit-strength": require("../../assets/illustrations/habit-strength.png"),
};
