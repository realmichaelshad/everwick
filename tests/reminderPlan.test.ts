import { describe, expect, it } from "vitest";

import { habitIdFromNotification, MAX_SCHEDULED, parseTime, phoneSchedule, planReminders } from "@/data/reminderPlan";
import { reducer } from "@/data/reducer";
import { createSeedState } from "@/data/seed";

const state = createSeedState("2026-10-23");

describe("reminder plan", () => {
  it("schedules daily habits once and weekly habits per day", () => {
    const plan = planReminders(state.habits, state.settings.notifications);
    expect(plan.find((r) => r.id === "habit:read:daily")?.trigger).toEqual({ kind: "daily", hour: 21, minute: 15 });
    const strength = plan.filter((r) => r.id.startsWith("habit:strength:"));
    expect(strength.map((r) => r.trigger)).toEqual([
      { kind: "weekly", weekday: 1, hour: 18, minute: 0 },
      { kind: "weekly", weekday: 3, hour: 18, minute: 0 },
      { kind: "weekly", weekday: 5, hour: 18, minute: 0 },
    ]);
    expect(plan.some((r) => r.id === "nudge:morning")).toBe(true);
    expect(plan.some((r) => r.id === "review:weekly")).toBe(true);
  });

  it("schedules nothing when reminders are off and skips archived or reminder-less habits", () => {
    expect(planReminders(state.habits, { ...state.settings.notifications, enabled: false })).toEqual([]);
    const habits = state.habits.map((h) => (h.id === "read" ? { ...h, archived: true } : h.id === "walk" ? { ...h, reminder: null } : h));
    const ids = planReminders(habits, state.settings.notifications).map((r) => r.id);
    expect(ids.some((id) => id.startsWith("habit:read"))).toBe(false);
    expect(ids.some((id) => id.startsWith("habit:walk"))).toBe(false);
  });

  it("stays under the platform limit and parses times defensively", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...state.habits[3], id: `s${i}`, order: i }));
    expect(planReminders(many, state.settings.notifications).length).toBeLessThanOrEqual(MAX_SCHEDULED);
    expect(parseTime("07:05")).toEqual({ hour: 7, minute: 5 });
    expect(parseTime("99:99")).toEqual({ hour: 23, minute: 59 });
  });
});

describe("what the phone schedules (repeating, so reminders never run out)", () => {
  const TODAY = "2026-10-23"; // Friday
  const plan = planReminders(state.habits, state.settings.notifications);
  const at = (h: number, m = 0) => h * 60 + m;

  it("uses plain repeating triggers when nothing needs to stay quiet today", () => {
    const phone = phoneSchedule(plan, state.habits, state, TODAY, at(17, 40));
    expect(phone.find((r) => r.id === "habit:read:daily")?.trigger).toEqual({ kind: "daily", hour: 21, minute: 15 });
    expect(phone.find((r) => r.id === "habit:strength:1")?.trigger).toEqual({ kind: "weekly", weekday: 1, hour: 18, minute: 0 });
    // Nothing is dated: someone who never opens the app again still gets every reminder.
    expect(phone.every((r) => r.trigger.kind !== "date")).toBe(true);
  });

  it("keeps a habit that's done today quiet today, and only today", () => {
    const done = reducer(state, { type: "toggle", habitId: "read", key: TODAY, at: at(17, 50) });
    const phone = phoneSchedule(plan, done.habits, done, TODAY, at(17, 50));
    const read = phone.filter((r) => r.reminderId === "habit:read:daily");
    // No daily trigger (it would ring at 21:15 tonight): weekly ones for the other six days...
    expect(read.some((r) => r.trigger.kind === "daily")).toBe(false);
    const weekdays = read.flatMap((r) => (r.trigger.kind === "weekly" ? [r.trigger.weekday] : [])).sort();
    expect(weekdays).toEqual([0, 1, 2, 3, 4, 6]);
    // ...and next Friday as a one-off.
    expect(read.find((r) => r.trigger.kind === "date")?.trigger).toEqual({ kind: "date", day: "2026-10-30", hour: 21, minute: 15 });
  });

  it("keeps a reminder whose time has passed as a plain repeating trigger", () => {
    // Walk rings at 12:30; at 17:40 it's past, so a daily trigger next rings tomorrow anyway.
    const done = reducer(state, { type: "toggle", habitId: "walk", key: TODAY, at: at(17, 40) });
    const phone = phoneSchedule(plan, done.habits, done, TODAY, at(17, 40));
    expect(phone.filter((r) => r.reminderId.startsWith("habit:walk")).map((r) => r.trigger.kind)).toEqual(["daily"]);
  });

  it("keeps the evening check-in quiet once everything due today is done", () => {
    let s = state;
    for (const h of s.habits) s = reducer(s, { type: "setValue", habitId: h.id, key: TODAY, value: h.target, at: at(17) });
    const phone = phoneSchedule(plan, s.habits, s, TODAY, at(18));
    const evening = phone.filter((r) => r.reminderId === "nudge:evening");
    expect(evening.some((r) => r.trigger.kind === "daily")).toBe(false);
    expect(evening.some((r) => r.trigger.kind === "weekly" && r.trigger.weekday === 6)).toBe(true);
  });

  it("moves a done weekly habit's slot to next week and stays under the limit", () => {
    const done = reducer(state, { type: "toggle", habitId: "strength", key: TODAY, at: at(7) });
    const phone = phoneSchedule(plan, done.habits, done, TODAY, at(7, 30));
    const strength = phone.filter((r) => r.habitId === "strength").map((r) => r.trigger);
    expect(strength).toContainEqual({ kind: "weekly", weekday: 1, hour: 18, minute: 0 });
    expect(strength).toContainEqual({ kind: "weekly", weekday: 3, hour: 18, minute: 0 });
    expect(strength).toContainEqual({ kind: "date", day: "2026-10-30", hour: 18, minute: 0 });
    expect(strength.some((t) => t.kind === "weekly" && t.weekday === 5)).toBe(false);
    let all = state;
    for (const h of all.habits) all = reducer(all, { type: "setValue", habitId: h.id, key: TODAY, value: h.target, at: at(5) });
    expect(phoneSchedule(plan, all.habits, all, TODAY, at(5, 30)).length).toBeLessThanOrEqual(MAX_SCHEDULED);
  });

  it("routes a tapped reminder to its habit", () => {
    expect(habitIdFromNotification({ reminderId: "habit:read:daily", habitId: "read" })).toBe("read");
    expect(habitIdFromNotification({ reminderId: "habit:strength:1" })).toBe("strength");
    expect(habitIdFromNotification({ reminderId: "nudge:evening", habitId: null })).toBeNull();
    expect(habitIdFromNotification(null)).toBeNull();
  });
});
