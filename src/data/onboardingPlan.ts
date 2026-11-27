/**
 * Onboarding goals -> habits. The goals picked in onboarding step 2 are
 * used, not just stored: for every goal that none of the person's current
 * habits covers yet, Everwick adds one small starter habit.
 *
 *   habitsForGoals(["hydration", "nutrition"], habits)
 *   // -> [{ name: "Eat 3 portions of veg", ... }]   (Drink water already covers hydration)
 *
 * Pure TypeScript (no React Native), unit-tested in tests/onboardingPlan.test.ts.
 */
import { GOAL_ORDER, SUGGESTIONS } from "./catalog";
import { ALL_DAYS, type GoalKey, type Habit, type HabitDraft, type HabitIconKey } from "./types";

/** The minimum a habit needs for goal matching (a Habit or a HabitDraft both work). */
type HabitLike = Pick<Habit, "name" | "icon"> & { archived?: boolean };

interface GoalMatcher {
  /** Icons that, on their own, mean a habit serves this goal. */
  icons: readonly HabitIconKey[];
  /** Words in a habit name that mean the same. */
  words: RegExp;
}

/**
 * How Everwick decides that an existing habit already covers a goal: by its
 * icon or by plain words in its name. A habit can cover more than one goal
 * ("No phone after 10pm" serves both sleep and screen time).
 */
export const GOAL_MATCHERS: Record<GoalKey, GoalMatcher> = {
  hydration: { icons: ["droplet"], words: /\b(water|hydrat\w*)\b/i },
  fitness: {
    icons: ["footprints", "bike", "mountain"],
    words: /\b(walk\w*|run\w*|steps?|yoga|cycl\w*|swim\w*|stretch\w*|hike|hiking|exercise|move|cardio)\b/i,
  },
  strength: { icons: ["dumbbell"], words: /\b(strength|gym|weights?|lift\w*|workout|push-?ups?|squats?|pilates)\b/i },
  mind: { icons: ["lotus", "wind"], words: /\b(meditat\w*|breath\w*|mindful\w*|calm)\b/i },
  sleep: { icons: ["bed", "moon"], words: /\b(sleep\w*|bed|bedtime|lights out|wind down)\b/i },
  learning: { icons: ["book", "languages"], words: /\b(read\w*|books?|learn\w*|study|course|language|spanish|french)\b/i },
  nutrition: { icons: ["salad", "apple"], words: /\b(veg\w*|fruit\w*|eat|meals?|cook\w*|salad|breakfast|protein)\b/i },
  focus: { icons: ["timer"], words: /\b(phone|screens?|screen-free|focus\w*|social media|deep work)\b/i },
  selfcare: { icons: ["heart", "smile"], words: /\b(self-care|selfcare|me time|for you|yourself|bath|gratitude|journal\w*)\b/i },
};

const everyDay = () => [...ALL_DAYS];

const greens = SUGGESTIONS.find((s) => s.key === "greens");

/** One small, specific starter habit per goal (defaults follow the forgiving-form rules: daily, a sensible reminder). */
export const GOAL_HABITS: Record<GoalKey, HabitDraft> = {
  hydration: {
    name: "Drink water",
    icon: "droplet",
    color: "ocean",
    schedule: everyDay(),
    target: 8,
    unit: "glasses",
    detail: "8 glasses through the day",
    reminder: "09:00",
    notes: "",
  },
  fitness: {
    name: "Walk 8k steps",
    icon: "footprints",
    color: "leaf",
    schedule: everyDay(),
    target: 1,
    unit: null,
    detail: "A lunch loop counts",
    reminder: "12:30",
    notes: "",
  },
  strength: {
    name: "Strength workout",
    icon: "dumbbell",
    color: "rose",
    schedule: [1, 3, 5],
    target: 1,
    unit: null,
    detail: "40 minutes, Mon · Wed · Fri",
    reminder: "18:00",
    notes: "",
  },
  mind: {
    name: "Meditate 10 minutes",
    icon: "lotus",
    color: "teal",
    schedule: everyDay(),
    target: 1,
    unit: null,
    detail: "Morning, before coffee",
    reminder: "07:15",
    notes: "",
  },
  sleep: {
    name: "Lights out by 11pm",
    icon: "bed",
    color: "indigo",
    schedule: everyDay(),
    target: 1,
    unit: null,
    detail: "Wind down 30 minutes before",
    reminder: "22:30",
    notes: "",
  },
  learning: {
    name: "Read 20 minutes",
    icon: "book",
    color: "violet",
    schedule: everyDay(),
    target: 1,
    unit: null,
    detail: "A few pages before bed",
    reminder: "21:15",
    notes: "",
  },
  nutrition: greens
    ? {
        name: greens.name,
        icon: greens.icon,
        color: greens.color,
        schedule: [...greens.schedule],
        target: greens.target,
        unit: greens.unit,
        detail: greens.detail,
        reminder: greens.reminder,
        notes: greens.notes,
      }
    : {
        name: "Eat 3 portions of veg",
        icon: "salad",
        color: "leaf",
        schedule: everyDay(),
        target: 3,
        unit: "portions",
        detail: "Lunch and dinner count",
        reminder: null,
        notes: "",
      },
  focus: {
    name: "Screen-free hour",
    icon: "timer",
    color: "sun",
    schedule: everyDay(),
    target: 1,
    unit: null,
    detail: "Phone in another room for an hour",
    reminder: "19:00",
    notes: "",
  },
  selfcare: {
    name: "15 minutes for you",
    icon: "heart",
    color: "ember",
    schedule: everyDay(),
    target: 1,
    unit: null,
    detail: "A bath, a stretch or a call with a friend",
    reminder: "20:00",
    notes: "",
  },
};

/** True when this habit already serves the goal. Archived habits never count. */
export function habitCoversGoal(goal: GoalKey, habit: HabitLike): boolean {
  if (habit.archived) return false;
  const m = GOAL_MATCHERS[goal];
  return m.icons.includes(habit.icon) || m.words.test(habit.name);
}

export interface GoalPlanItem {
  goal: GoalKey;
  /** Name of the habit that already covers the goal (existing, or one added earlier in this plan). */
  coveredBy: string | null;
  /** The starter habit Everwick will add, when nothing covers the goal yet. */
  draft: HabitDraft | null;
}

/** Selected goals, deduplicated, in the catalog's order (stable, whatever order they were tapped in). */
export function orderGoals(goals: readonly GoalKey[]): GoalKey[] {
  const picked = new Set(goals);
  return GOAL_ORDER.filter((k) => picked.has(k));
}

/**
 * For each selected goal: which habit covers it, or which starter habit to
 * add. Drafts planned for earlier goals count as covering later ones, so the
 * plan never adds two habits for the same need.
 */
export function planGoals(goals: readonly GoalKey[], existing: readonly HabitLike[]): GoalPlanItem[] {
  const pool: HabitLike[] = existing.filter((h) => !h.archived);
  const names = new Set(pool.map((h) => h.name.trim().toLowerCase()));
  return orderGoals(goals).map((goal) => {
    const cover = pool.find((h) => habitCoversGoal(goal, h));
    if (cover) return { goal, coveredBy: cover.name, draft: null };
    const template = GOAL_HABITS[goal];
    // Never add a habit with the same name as one the person already has.
    if (names.has(template.name.toLowerCase())) return { goal, coveredBy: template.name, draft: null };
    const draft: HabitDraft = { ...template, schedule: [...template.schedule] };
    pool.push(draft);
    names.add(draft.name.toLowerCase());
    return { goal, coveredBy: null, draft };
  });
}

/** The starter habits to add for these goals (empty when the current habits cover them all). */
export function habitsForGoals(goals: readonly GoalKey[], existingHabits: readonly HabitLike[]): HabitDraft[] {
  return planGoals(goals, existingHabits).flatMap((item) => (item.draft ? [item.draft] : []));
}

/** "A", "A and B", "A, B and C", "A, B and 2 more". */
export function joinNames(names: readonly string[], max = 3): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length <= max) return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const shown = names.slice(0, max - 1);
  return `${shown.join(", ")} and ${names.length - shown.length} more`;
}

/** One line under the goal chips that says what picking them will do. */
export function describeGoalPlan(plan: readonly GoalPlanItem[]): string {
  if (plan.length === 0) return "Pick any that fit. You can add habits any time.";
  const adds = plan.flatMap((p) => (p.draft ? [p.draft.name] : []));
  if (adds.length === 0) return plan.length === 1 ? "Your habits already cover this goal." : "Your habits already cover these goals.";
  const covered = plan.length - adds.length;
  const lead = `We'll add ${joinNames(adds)}`;
  return covered > 0 ? `${lead}. The rest is already on your list.` : `${lead}.`;
}

/** Toast after onboarding: "Added 2 habits for your goals". */
export function addedHabitsMessage(count: number): string {
  return `Added ${count} ${count === 1 ? "habit" : "habits"} for your goals`;
}

/** True when two goal selections hold the same goals (order does not matter). */
export function sameGoals(a: readonly GoalKey[], b: readonly GoalKey[]): boolean {
  const x = orderGoals(a);
  const y = orderGoals(b);
  return x.length === y.length && x.every((k, i) => k === y[i]);
}
