/**
 * Slot to SVG fallback registry. Each fallback lives in the file for its
 * group of slots.
 */
import type { ComponentType } from "react";

import type { IllustrationSlot } from "@/content/illustrations";

import { AllDoneFallback } from "./AllDone";
import { AvatarFallback } from "./Avatar";
import { BadgeCheckins100Fallback, BadgePerfectWeekFallback, BadgeStreak30Fallback, BadgeStreak7Fallback } from "./Badges";
import { EmptyHabitsFallback } from "./EmptyHabits";
import { HabitMeditateFallback, HabitNoPhoneFallback, HabitReadFallback, HabitStrengthFallback, HabitWalkFallback, HabitWaterFallback } from "./HabitArt";
import { GoalsFallback, RemindersFallback, WelcomeFallback } from "./Onboarding";
import { ProFallback } from "./Pro";
import type { FallbackProps } from "./types";

export const FALLBACKS: Record<IllustrationSlot, ComponentType<FallbackProps>> = {
  welcome: WelcomeFallback,
  goals: GoalsFallback,
  reminders: RemindersFallback,
  "all-done": AllDoneFallback,
  "empty-habits": EmptyHabitsFallback,
  pro: ProFallback,
  avatar: AvatarFallback,
  "badge-streak-7": BadgeStreak7Fallback,
  "badge-streak-30": BadgeStreak30Fallback,
  "badge-checkins-100": BadgeCheckins100Fallback,
  "badge-perfect-week": BadgePerfectWeekFallback,
  "habit-water": HabitWaterFallback,
  "habit-read": HabitReadFallback,
  "habit-walk": HabitWalkFallback,
  "habit-meditate": HabitMeditateFallback,
  "habit-no-phone": HabitNoPhoneFallback,
  "habit-strength": HabitStrengthFallback,
};
