/**
 * Deterministic demo data: 6 habits with 60 days of believable history,
 * generated relative to `today` so the app always looks current. The same
 * `today` always yields exactly the same data (seeded PRNG per habit).
 *
 * Story the data tells (pinned by tests/seed.test.ts):
 *  - Drink water: the long streak (47 check-ins, kept alive by a freeze three
 *    weeks ago), 5 of 8 glasses so far today, 2 freezes banked.
 *  - Read 20 minutes: a 12-day streak going, best ever 19.
 *  - Walk 8k steps: strong on weekdays, weaker on weekends; done today.
 *  - Meditate: a 21-day streak that broke after a 3-day trip, rebuilding (3).
 *  - No phone after 10pm: patchy at first, improving week by week.
 *  - Strength workout: Mon/Wed/Fri only, last 6 sessions done, today's still open.
 * Check-in times follow each habit's rhythm (meditation before 7:30 AM,
 * reading around 9:40 PM) so the time-of-day insights have something to say.
 */
import { evaluateAchievements } from "./achievements";
import { addDays, weekdayOf } from "./dates";
import { createRng, type Rng } from "./prng";
import {
  ALL_DAYS,
  SCHEMA_VERSION,
  type AppState,
  type CheckinTimes,
  type DateKey,
  type Habit,
  type Logs,
  type Settings,
  type Skips,
  type Weekday,
} from "./types";

export const SEED_VERSION = "everwick-seed-v2";
export const HISTORY_DAYS = 60;

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  name: "Maya",
  weekStartsOn: 1,
  haptics: true,
  goals: ["hydration", "fitness", "mind", "sleep"],
  notifications: {
    enabled: true,
    morning: "07:30",
    evening: "21:00",
    streakSaver: true,
    weeklyReview: true,
    sound: true,
  },
};

export function seedHabits(today: DateKey): Habit[] {
  const createdAt = addDays(today, -(HISTORY_DAYS - 1));
  const base = { createdAt, archived: false, schedule: [...ALL_DAYS] as Weekday[], unit: null, target: 1 };
  return [
    {
      ...base,
      id: "meditate",
      name: "Meditate 10 minutes",
      icon: "lotus",
      color: "teal",
      detail: "Morning, before coffee",
      reminder: "07:15",
      notes: "Box breathing for two minutes, then the body scan. Sit by the window if it's sunny.",
      order: 0,
    },
    {
      ...base,
      id: "water",
      name: "Drink water",
      icon: "droplet",
      color: "ocean",
      target: 8,
      unit: "glasses",
      detail: "8 glasses through the day",
      reminder: "09:00",
      notes: "Keep the big bottle on the desk. Two glasses before lunch makes the afternoon easy.",
      order: 1,
    },
    {
      ...base,
      id: "walk",
      name: "Walk 8k steps",
      icon: "footprints",
      color: "leaf",
      detail: "Lunch loop counts for 3k",
      reminder: "12:30",
      notes: "The park loop is about 3,000 steps. Take the stairs at the office.",
      order: 2,
    },
    {
      ...base,
      id: "strength",
      name: "Strength workout",
      icon: "dumbbell",
      color: "rose",
      schedule: [1, 3, 5],
      detail: "40 minutes, Mon · Wed · Fri",
      reminder: "18:00",
      notes: "Week 6 of the 5x5 plan. Add 2.5 kg to squats this week.",
      order: 3,
    },
    {
      ...base,
      id: "read",
      name: "Read 20 minutes",
      icon: "book",
      color: "violet",
      detail: "Before bed, paper book",
      reminder: "21:15",
      notes: "Currently reading a novel about a lighthouse keeper. Phone stays in the kitchen.",
      order: 4,
    },
    {
      ...base,
      id: "no-phone",
      name: "No phone after 10pm",
      icon: "moon",
      color: "indigo",
      detail: "Charger lives in the hallway",
      reminder: "21:45",
      notes: "Alarm clock instead of the phone. Podcasts count as phone.",
      order: 5,
    },
  ];
}

const inRange = (offset: number, from: number, to: number) => offset >= from && offset <= to;

/** Value for each habit on each day. `offset` is days before today (0 = today). */
function valueFor(habit: Habit, offset: number, key: DateKey, rng: Rng): number {
  const wd = weekdayOf(key);
  const weekend = wd === 0 || wd === 6;
  const r = rng.next();
  switch (habit.id) {
    case "water": {
      if (offset === 0) return 5;
      if (offset === 21) return 4; // a slow Sunday: a freeze keeps the streak alive
      if (inRange(offset, 1, 48)) return 8;
      if (inRange(offset, 49, 51)) return 3 + (offset % 2); // the rough start before the streak
      return r < 0.7 ? 8 : 3 + (Math.floor(r * 10) % 5);
    }
    case "read": {
      if (offset === 0) return 0;
      if (inRange(offset, 1, 12)) return 1; // live streak: 12
      if (inRange(offset, 13, 15) || inRange(offset, 22, 24) || inRange(offset, 44, 46)) return 0;
      if (inRange(offset, 16, 21)) return 1;
      if (inRange(offset, 25, 43)) return 1; // best run: 19
      return r < 0.74 ? 1 : 0;
    }
    case "walk": {
      if (offset <= 2) return 1;
      return r < (weekend ? 0.38 : 0.88) ? 1 : 0;
    }
    case "meditate": {
      if (offset <= 2) return 1; // rebuilding: 3
      if (inRange(offset, 3, 5)) return 0; // the trip that broke it
      if (inRange(offset, 6, 26)) return 1; // the 21-day run
      if (inRange(offset, 27, 29)) return 0;
      return r < 0.55 ? 1 : 0;
    }
    case "no-phone": {
      if (offset === 0) return 0;
      if (inRange(offset, 1, 4)) return 1;
      if (offset === 5) return 0;
      const p = 0.28 + 0.6 * (1 - offset / (HISTORY_DAYS - 1)); // improving over time
      return r < p ? 1 : 0;
    }
    case "strength":
      return r < 0.84 ? 1 : 0;
    default:
      return r < 0.7 ? habit.target : 0;
  }
}

/** Typical check-in minute (after midnight) per habit, plus +/- jitter in minutes. */
const RHYTHM: Record<string, { at: number; jitter: number; weekendShift?: number }> = {
  meditate: { at: 7 * 60 + 5, jitter: 22, weekendShift: 50 },
  water: { at: 16 * 60 + 40, jitter: 80 },
  walk: { at: 12 * 60 + 50, jitter: 35, weekendShift: -110 },
  strength: { at: 18 * 60 + 35, jitter: 20 },
  read: { at: 21 * 60 + 40, jitter: 18 },
  "no-phone": { at: 22 * 60 + 2, jitter: 4 },
};

function timeFor(habit: Habit, key: DateKey, rng: Rng): number {
  const rhythm = RHYTHM[habit.id] ?? { at: 12 * 60, jitter: 120 };
  const wd = weekdayOf(key);
  const shift = wd === 0 || wd === 6 ? (rhythm.weekendShift ?? 0) : 0;
  const minute = rhythm.at + shift + Math.round((rng.next() * 2 - 1) * rhythm.jitter);
  return Math.max(0, Math.min(24 * 60 - 1, minute));
}

/** Planned skips: a rainy-day walk and a red-eye flight. */
const SEED_SKIPS: { habitId: string; offset: number }[] = [
  { habitId: "walk", offset: 10 },
  { habitId: "no-phone", offset: 31 },
];

export interface SeedHistory {
  logs: Logs;
  skips: Skips;
  times: CheckinTimes;
}

/** End of the day: the default "now" for seeds, so tests see the whole story for today. */
export const END_OF_DAY = 24 * 60 - 1;

/** Glasses of water by `minute` today: none before 7 AM, then about one every 110 minutes, up to 5. */
export function waterSoFar(minute: number): number {
  return Math.max(0, Math.min(5, Math.floor((minute - 7 * 60) / 110)));
}

/**
 * `nowMinute` (minutes after midnight) keeps today honest: a check-in whose
 * usual time hasn't come yet is left open, and Water's glasses so far follow
 * the clock. Past days are unaffected, so the history stays deterministic.
 */
export function seedHistory(habits: Habit[], today: DateKey, nowMinute: number = END_OF_DAY): SeedHistory {
  const logs: Logs = {};
  const skips: Skips = {};
  const times: CheckinTimes = {};
  for (const habit of habits) {
    const rng = createRng(`${SEED_VERSION}:${habit.id}`);
    const clock = createRng(`${SEED_VERSION}:${habit.id}:time`);
    const entries: Record<DateKey, number> = {};
    const at: Record<DateKey, number> = {};
    for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
      const key = addDays(today, -offset);
      let v = valueFor(habit, offset, key, rng);
      const minute = timeFor(habit, key, clock);
      if (offset === 0) {
        // Nothing is done before its usual time today; Water fills up as the day goes.
        if (habit.id === "water") v = Math.min(v, waterSoFar(nowMinute));
        else if (minute > nowMinute) v = 0;
      }
      if (v > 0 && habit.schedule.includes(weekdayOf(key))) {
        entries[key] = Math.min(v, habit.target);
        if (entries[key] >= habit.target) at[key] = minute;
      }
    }
    logs[habit.id] = entries;
    times[habit.id] = at;
    skips[habit.id] = {};
  }

  // Strength: the last six scheduled sessions before today are done, the one before was missed,
  // and today's session (if scheduled) is still open.
  const strength = habits.find((h) => h.id === "strength");
  if (strength) {
    const entries = logs[strength.id];
    const at = times[strength.id];
    const clock = createRng(`${SEED_VERSION}:strength:sessions`);
    delete entries[today];
    delete at[today];
    let found = 0;
    for (let offset = 1; offset < HISTORY_DAYS && found < 7; offset++) {
      const key = addDays(today, -offset);
      if (!strength.schedule.includes(weekdayOf(key))) continue;
      found++;
      if (found <= 6) {
        entries[key] = 1;
        at[key] = timeFor(strength, key, clock);
      } else {
        delete entries[key];
        delete at[key];
      }
    }
  }

  for (const { habitId, offset } of SEED_SKIPS) {
    const key = addDays(today, -offset);
    if (!logs[habitId]) continue;
    delete logs[habitId][key];
    delete times[habitId][key];
    skips[habitId][key] = true;
  }
  return { logs, skips, times };
}

function freshSettings(): Settings {
  return { ...DEFAULT_SETTINGS, goals: [...DEFAULT_SETTINGS.goals], notifications: { ...DEFAULT_SETTINGS.notifications } };
}

/** `nowMinute`: minutes after midnight right now (default: end of day). See seedHistory. */
export function createSeedState(today: DateKey, overrides: Partial<AppState> = {}, nowMinute: number = END_OF_DAY): AppState {
  const habits = seedHabits(today);
  const history = seedHistory(habits, today, nowMinute);
  // Medals the 60 days of history already earned were "seen" long ago: Profile only celebrates
  // the ones a new check-in unlocks (e.g. finishing a perfect week), never on first open.
  const earned = evaluateAchievements(habits, history, today)
    .filter((a) => a.unlocked)
    .map((a) => a.id);
  const seenAchievements = [...new Set([...earned, ...(overrides.seenAchievements ?? [])])];
  return {
    version: SCHEMA_VERSION,
    habits,
    ...history,
    settings: freshSettings(),
    onboarded: false,
    seededOn: today,
    modified: false,
    proPreview: false,
    ...overrides,
    seenAchievements,
  };
}

/** A fresh, empty state (used for "start from scratch" and the empty-state demo). */
export function createEmptyState(today: DateKey, overrides: Partial<AppState> = {}): AppState {
  void today;
  return {
    version: SCHEMA_VERSION,
    habits: [],
    logs: {},
    skips: {},
    times: {},
    settings: freshSettings(),
    onboarded: true,
    seededOn: null,
    modified: true,
    proPreview: false,
    seenAchievements: [],
    ...overrides,
  };
}
