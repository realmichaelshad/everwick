/**
 * Illustration slots. Every place in the app that can show a soft 3D
 * illustration has a slot here. Until a PNG exists at
 * assets/illustrations/<slot>.png the app draws an original SVG fallback
 * (see components/illustrations/fallbacks), sized and placed the same way,
 * so either version looks intentional.
 *
 * Adding an image: drop `<slot>.png` into assets/illustrations/ and run
 * `npm run illustrations`, which regenerates illustrationSources.ts with a
 * static require() for every file present (Metro needs static requires).
 * Each slot's usage and art notes are in ILLUSTRATION_SPECS below; README.md
 * lists the slots under "Illustrations".
 */
import type { HabitIconKey } from "@/data/types";

import { ILLUSTRATION_SOURCES } from "./illustrationSources";
import { ILLUSTRATION_SLOTS, type IllustrationSlot } from "./illustrationSlots";

export { ILLUSTRATION_SLOTS };
export type { IllustrationSlot };

export interface IllustrationSpec {
  slot: IllustrationSlot;
  /** Where the app shows it. */
  usage: string;
  /** Art notes: what the image shows, so a replacement keeps the same subject and role. */
  art: string;
  /** Square PNG. Transparent background unless noted. */
  transparent: boolean;
  /** Circular crop in the app. */
  circular?: boolean;
}

/**
 * Shared art direction for every illustration: soft, rounded clay-like
 * forms with a matte finish and warm light from the top left, in the Everwick
 * dawn palette (apricot #FFB547, ember #FF6B35, rose #F2386B, plum #1C1424
 * accents on cream #FFF7F2), centered with generous padding and a gentle
 * contact shadow. No lettering or logos: numbers and labels are drawn by the
 * app. Square PNGs (960 px for heroes, 512 px for medals and habit objects)
 * with transparent backgrounds, except the avatar.
 */
export const ILLUSTRATION_STYLE =
  "Soft rounded clay-like forms, matte finish, warm light from the top left, gentle contact shadow, Everwick dawn palette, centered with generous padding, no lettering or logos.";

export const ILLUSTRATION_SPECS: Record<IllustrationSlot, IllustrationSpec> = {
  welcome: { slot: "welcome", usage: "Onboarding step 1 hero", art: "A smiling candle mascot with a small flame, sitting on a sunrise hill with rays and sparkles.", transparent: true },
  goals: { slot: "goals", usage: "Onboarding step 2 (pick your goals) hero", art: "A loose cluster of habit objects floating together: a glass of water, an open book, a sneaker, a meditation cushion, a dumbbell, a plain-backed phone and a crescent moon.", transparent: true },
  reminders: { slot: "reminders", usage: "Onboarding step 3 (reminder times) hero", art: "A chunky twin-bell alarm clock in ember orange with a rising sun and soft speech bubbles behind it.", transparent: true },
  "all-done": { slot: "all-done", usage: "Today: the all-done celebration card", art: "A golden trophy cup with a star, holding a bright flame, with confetti ribbons bursting around it.", transparent: true },
  "empty-habits": { slot: "empty-habits", usage: "Empty, error and not-found states", art: "An unlit cream candle on a round dish beside a small sprout in a terracotta pot: waiting to be lit.", transparent: true },
  pro: { slot: "pro", usage: "Upgrade to Pro hero (demo screen, no purchase)", art: "A faceted amber gem with a warm flame glowing inside, resting on a lit cream pedestal, sparkles around it.", transparent: true },
  avatar: {
    slot: "avatar",
    usage: "Profile photo (circular crop)",
    art: "A friendly stylised portrait of a young woman with a warm smile and a top knot, shoulders up, on a soft peach background (not transparent).",
    transparent: false,
    circular: true,
  },
  "badge-streak-7": { slot: "badge-streak-7", usage: "Achievement medal: 7-day streak (the app draws the number)", art: "A round amber medal with an embossed flame and an empty ribbon.", transparent: true },
  "badge-streak-30": { slot: "badge-streak-30", usage: "Achievement medal: 30-day streak (the app draws the number)", art: "A coral and gold medal with a large flame and a laurel rim, empty ribbon.", transparent: true },
  "badge-checkins-100": { slot: "badge-checkins-100", usage: "Achievement medal: 100 check-ins (the app draws the number)", art: "A golden medal with a big embossed check mark and small sparkles.", transparent: true },
  "badge-perfect-week": { slot: "badge-perfect-week", usage: "Achievement medal: perfect week (the app draws the label)", art: "An orange and plum medal with a star at its center.", transparent: true },
  "habit-water": { slot: "habit-water", usage: "Habit detail header and onboarding goal: water", art: "A glass of water with a lemon slice and a small splash.", transparent: true },
  "habit-read": { slot: "habit-read", usage: "Habit detail header and onboarding goal: reading", art: "An open hardcover book with cream pages, an ember cover and a ribbon bookmark.", transparent: true },
  "habit-walk": { slot: "habit-walk", usage: "Habit detail header and onboarding goal: walking", art: "An orange running sneaker with white laces.", transparent: true },
  "habit-meditate": { slot: "habit-meditate", usage: "Habit detail header and onboarding goal: meditation", art: "A round ember meditation cushion with a lotus flower on top.", transparent: true },
  "habit-no-phone": { slot: "habit-no-phone", usage: "Habit detail header and onboarding goal: sleep and screen-free evenings", art: "A sleepy crescent moon resting against a plain-backed phone, with small stars.", transparent: true },
  "habit-strength": { slot: "habit-strength", usage: "Habit detail header and onboarding goal: strength", art: "An orange dumbbell with rounded weights and a plum grip.", transparent: true },
};

/** The bundled PNG for a slot, or null while the SVG fallback is used. */
export function illustrationSource(slot: IllustrationSlot) {
  return ILLUSTRATION_SOURCES[slot] ?? null;
}

/** 3D habit art exists for the six seed habit icons. */
const HABIT_SLOT_BY_ICON: Partial<Record<HabitIconKey, IllustrationSlot>> = {
  droplet: "habit-water",
  book: "habit-read",
  footprints: "habit-walk",
  lotus: "habit-meditate",
  moon: "habit-no-phone",
  dumbbell: "habit-strength",
};

/** The 3D slot for a habit icon, or null when there is none (use <HabitIcon> then). */
export function habitIllustrationSlot(icon: HabitIconKey): IllustrationSlot | null {
  return HABIT_SLOT_BY_ICON[icon] ?? null;
}
