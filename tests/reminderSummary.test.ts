import { describe, expect, it } from "vitest";

import { createSeedState } from "@/data/seed";

import { describeDayCount, describeNextReminder, layoutTimeline, nextReminder, remindersOnDay, timelineWindow } from "@/components/reminders/reminderSummary";

const seed = createSeedState("2026-10-23"); // a Friday
const { habits } = seed;
const settings = seed.settings.notifications;
const friday = new Date(2026, 9, 23, 17, 40);

describe("reminders on a day", () => {
  it("lists the seed's Friday: six habit reminders plus the morning and evening nudges, in time order", () => {
    const day = remindersOnDay(habits, settings, 5);
    expect(day.map((r) => r.label)).toEqual([
      "Meditate 10 minutes",
      "Morning nudge",
      "Drink water",
      "Walk 8k steps",
      "Strength workout",
      "Evening check-in",
      "Read 20 minutes",
      "No phone after 10pm",
    ]);
    expect(day.find((r) => r.kind === "habit" && r.habitId === "strength")?.minutes).toBe(18 * 60);
  });

  it("only includes weekly reminders on their days", () => {
    const saturday = remindersOnDay(habits, settings, 6);
    expect(saturday.some((r) => r.habitId === "strength")).toBe(false);
    expect(saturday.some((r) => r.kind === "review")).toBe(false);
    const sunday = remindersOnDay(habits, settings, 0);
    expect(sunday.find((r) => r.kind === "review")).toMatchObject({ label: "Weekly review", minutes: 18 * 60 });
  });

  it("is empty when reminders are off", () => {
    expect(remindersOnDay(habits, { ...settings, enabled: false }, 5)).toEqual([]);
  });

  it("puts a habit reminder before a nudge at the same minute", () => {
    const sameTime = habits.map((h) => (h.id === "meditate" ? { ...h, reminder: "07:30" } : h));
    const day = remindersOnDay(sameTime, settings, 5);
    expect(day.slice(0, 2).map((r) => r.label)).toEqual(["Meditate 10 minutes", "Morning nudge"]);
  });
});

describe("next reminder", () => {
  it("finds the next one later today", () => {
    const next = nextReminder(habits, settings, friday);
    expect(next).toMatchObject({ inDays: 0, reminder: { label: "Strength workout" } });
    expect(describeNextReminder(next, friday)).toBe("Next: Strength workout at 6:00 PM");
  });

  it("rolls over to tomorrow after the last one", () => {
    const late = new Date(2026, 9, 23, 22, 30);
    const next = nextReminder(habits, settings, late);
    expect(next).toMatchObject({ inDays: 1, reminder: { label: "Meditate 10 minutes" } });
    expect(describeNextReminder(next, late)).toBe("Next: Meditate 10 minutes tomorrow at 7:15 AM");
  });

  it("names the weekday when it is further away, and says when nothing is planned", () => {
    const onlyReview = { ...settings, weeklyReview: true };
    const none = habits.map((h) => ({ ...h, reminder: null }));
    // With no habit reminders the daily nudges still ring tomorrow.
    expect(nextReminder(none, onlyReview, new Date(2026, 9, 23, 23, 0))?.inDays).toBe(1);
    expect(nextReminder(habits, { ...settings, enabled: false }, friday)).toBeNull();
    expect(describeNextReminder(null, friday)).toBe("Nothing planned yet");
    const fake = { reminder: { id: "x", kind: "review" as const, minutes: 18 * 60, label: "Weekly review", habitId: null }, inDays: 2 };
    expect(describeNextReminder(fake, friday)).toBe("Next: Weekly review Sunday at 6:00 PM");
  });

  it("counts the day in words", () => {
    expect(describeDayCount(0)).toBe("No reminders today");
    expect(describeDayCount(1)).toBe("1 reminder today");
    expect(describeDayCount(8)).toBe("8 reminders today");
  });
});

describe("timeline layout", () => {
  it("spans 6 AM to midnight, earlier when a reminder rings before 6", () => {
    expect(timelineWindow(remindersOnDay(habits, settings, 5))).toEqual({ start: 360, end: 1440 });
    const early = habits.map((h) => (h.id === "meditate" ? { ...h, reminder: "05:20" } : h));
    expect(timelineWindow(remindersOnDay(early, settings, 5))).toEqual({ start: 300, end: 1440 });
  });

  it("stacks dots that would overlap into lanes and keeps x within 0..1", () => {
    const day = remindersOnDay(habits, settings, 5);
    const placed = layoutTimeline(day, 0.04);
    expect(placed.every((p) => p.x >= 0 && p.x <= 1)).toBe(true);
    // 7:15 meditate and 7:30 morning nudge are 15 minutes apart: different lanes.
    expect(placed[0].lane).not.toBe(placed[1].lane);
    // 9:00 PM evening and 9:15 PM read stack; 9:45 PM is far enough from 9:00 to reuse its lane.
    expect(placed.slice(5).map((p) => p.lane)).toEqual([0, 1, 0]);
    // Three reminders within minutes of each other use three lanes.
    const crowded = layoutTimeline(day.slice(5), 0.2);
    expect(new Set(crowded.map((p) => p.lane)).size).toBe(3);
    // Well separated dots share the first lane.
    expect(placed[2].lane).toBe(0);
  });

  it("moves a dot off the track when it would sit on the now knob", () => {
    const day = remindersOnDay(habits, settings, 5);
    const free = layoutTimeline(day, 0.04);
    const target = free.findIndex((p) => p.lane === 0);
    const knob = free[target].x + 0.01;
    const placed = layoutTimeline(day, 0.04, 3, knob);
    expect(placed[target].lane).toBeGreaterThan(0);
    // Dots far from the knob keep their lanes.
    placed.forEach((p, i) => {
      if (Math.abs(p.x - knob) >= 0.04 && i !== target) expect(p.lane).toBe(free[i].lane);
    });
  });
});
