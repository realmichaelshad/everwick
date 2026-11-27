import { describe, expect, it } from "vitest";

import { GOALS } from "@/data/catalog";
import {
  addedHabitsMessage,
  describeGoalPlan,
  GOAL_HABITS,
  habitCoversGoal,
  habitsForGoals,
  joinNames,
  orderGoals,
  planGoals,
  sameGoals,
} from "@/data/onboardingPlan";
import { reducer } from "@/data/reducer";
import { createSeedState, DEFAULT_SETTINGS } from "@/data/seed";
import { GOAL_KEYS, type GoalKey, type Habit } from "@/data/types";

const seed = createSeedState("2026-10-23");
/** Every goal key, including ones onboarding no longer offers (older data still plans them). */
const ALL_GOALS = [...GOAL_KEYS];
const ONBOARDING_GOALS = GOALS.map((g) => g.key);

describe("onboarding goals -> habits", () => {
  it("adds only what the demo habits don't cover", () => {
    const drafts = habitsForGoals(["hydration", "nutrition"], seed.habits);
    expect(drafts.map((d) => d.name)).toEqual(["Eat 3 portions of veg"]);
    const plan = planGoals(["hydration", "nutrition"], seed.habits);
    expect(plan[0]).toMatchObject({ goal: "hydration", coveredBy: "Drink water", draft: null });
  });

  it("the default goals are all covered by the demo habits, so finishing as-is adds nothing", () => {
    expect(habitsForGoals(DEFAULT_SETTINGS.goals, seed.habits)).toEqual([]);
  });

  it("offers six onboarding goals, and the demo habits cover every one", () => {
    expect(ONBOARDING_GOALS).toEqual(["hydration", "fitness", "strength", "mind", "learning", "sleep"]);
    expect(habitsForGoals(ONBOARDING_GOALS, seed.habits)).toEqual([]);
  });

  it("with the demo habits, every goal except nutrition and self-care is already covered", () => {
    const plan = planGoals(ALL_GOALS, seed.habits);
    const added = plan.filter((p) => p.draft).map((p) => p.goal);
    expect(added).toEqual(["nutrition", "selfcare"]);
    expect(plan.find((p) => p.goal === "strength")?.coveredBy).toBe("Strength workout");
    expect(plan.find((p) => p.goal === "fitness")?.coveredBy).toBe("Walk 8k steps");
    // One habit can cover two goals: "No phone after 10pm" serves sleep and screen time.
    expect(plan.find((p) => p.goal === "sleep")?.coveredBy).toBe("No phone after 10pm");
    expect(plan.find((p) => p.goal === "focus")?.coveredBy).toBe("No phone after 10pm");
  });

  it("starts from scratch with one starter habit per goal", () => {
    const drafts = habitsForGoals(ALL_GOALS, []);
    expect(drafts).toHaveLength(ALL_GOALS.length);
    expect(new Set(drafts.map((d) => d.name)).size).toBe(drafts.length);
  });

  it("every starter habit covers its own goal, so planning again adds nothing (idempotent)", () => {
    for (const goal of ALL_GOALS) expect(habitCoversGoal(goal, GOAL_HABITS[goal])).toBe(true);
    const first = habitsForGoals(ALL_GOALS, seed.habits);
    expect(habitsForGoals(ALL_GOALS, [...seed.habits, ...first])).toEqual([]);
  });

  it("ignores archived habits", () => {
    const habits = seed.habits.map((h) => (h.id === "water" ? { ...h, archived: true } : h));
    expect(habitsForGoals(["hydration"], habits).map((d) => d.name)).toEqual(["Drink water"]);
  });

  it("matches by name as well as by icon", () => {
    const custom = { name: "Morning yoga", icon: "sun" } as Pick<Habit, "name" | "icon">;
    expect(habitCoversGoal("fitness", custom)).toBe(true);
    expect(habitCoversGoal("mind", { name: "Breathing practice", icon: "sprout" })).toBe(true);
    expect(habitCoversGoal("nutrition", { name: "Great posture", icon: "sprout" })).toBe(false);
  });

  it("never adds a habit whose name the person already uses, whatever its icon", () => {
    for (const goal of ALL_GOALS) {
      const habits = [{ name: GOAL_HABITS[goal].name.toUpperCase(), icon: "sprout" as const }];
      expect(habitsForGoals([goal], habits)).toEqual([]);
    }
  });

  it("orders and deduplicates goals by the catalog, whatever order they were tapped in", () => {
    expect(orderGoals(["selfcare", "hydration", "selfcare"])).toEqual(["hydration", "selfcare"]);
    expect(sameGoals(["mind", "sleep"], ["sleep", "mind", "mind"])).toBe(true);
    expect(sameGoals(["mind"], ["mind", "sleep"])).toBe(false);
  });

  it("returns fresh drafts (no shared arrays with the templates)", () => {
    const [draft] = habitsForGoals(["mind"], []);
    draft.schedule.pop();
    expect(GOAL_HABITS.mind.schedule).toHaveLength(7);
  });

  it("drafts are valid for the store: a schedule, a target of at least 1, times as HH:MM", () => {
    for (const draft of habitsForGoals(ALL_GOALS, [])) {
      expect(draft.schedule.length).toBeGreaterThanOrEqual(3);
      expect(draft.target).toBeGreaterThanOrEqual(1);
      if (draft.target > 1) expect(draft.unit).toBeTruthy();
      if (draft.reminder) expect(draft.reminder).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(draft.name.length).toBeLessThanOrEqual(32);
    }
  });

  it("finishing onboarding through the reducer keeps the goals and adds the drafts", () => {
    const goals: GoalKey[] = ["hydration", "nutrition", "selfcare"];
    let state = reducer(seed, {
      type: "onboarding",
      onboarded: true,
      goals,
      notifications: { enabled: true, morning: "07:00", evening: "21:30" },
      name: "Sam",
    });
    habitsForGoals(goals, state.habits).forEach((d, i) => {
      state = reducer(state, { type: "addHabit", habit: { ...d, id: `goal-${i}`, order: 10 + i, createdAt: "2026-10-23", archived: false } });
    });
    expect(state.onboarded).toBe(true);
    expect(state.settings.goals).toEqual(goals);
    expect(state.settings.name).toBe("Sam");
    expect(state.settings.notifications).toMatchObject({ enabled: true, morning: "07:00", evening: "21:30", weeklyReview: true });
    expect(state.habits.map((h) => h.name)).toEqual(expect.arrayContaining(["Eat 3 portions of veg", "15 minutes for you"]));
    expect(state.habits).toHaveLength(seed.habits.length + 2);
  });
});

describe("onboarding copy", () => {
  it("joins names the way people write them", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["Read"])).toBe("Read");
    expect(joinNames(["Read", "Walk"])).toBe("Read and Walk");
    expect(joinNames(["Read", "Walk", "Water"])).toBe("Read, Walk and Water");
    expect(joinNames(["A", "B", "C", "D", "E"])).toBe("A, B and 3 more");
  });

  it("explains what the selected goals will do", () => {
    expect(describeGoalPlan([])).toBe("Pick any that fit. You can add habits any time.");
    expect(describeGoalPlan(planGoals(["hydration"], seed.habits))).toBe("Your habits already cover this goal.");
    expect(describeGoalPlan(planGoals(["hydration", "mind"], seed.habits))).toBe("Your habits already cover these goals.");
    expect(describeGoalPlan(planGoals(["nutrition"], seed.habits))).toBe("We'll add Eat 3 portions of veg.");
    expect(describeGoalPlan(planGoals(["hydration", "nutrition", "selfcare"], seed.habits))).toBe(
      "We'll add Eat 3 portions of veg and 15 minutes for you. The rest is already on your list.",
    );
  });

  it("counts added habits in the toast", () => {
    expect(addedHabitsMessage(1)).toBe("Added 1 habit for your goals");
    expect(addedHabitsMessage(2)).toBe("Added 2 habits for your goals");
  });
});
