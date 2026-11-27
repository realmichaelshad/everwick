import { describe, expect, it } from "vitest";

import { describeSchedule, describeTarget } from "@/data/catalog";
import {
  addDays,
  daysInMonth,
  diffDays,
  formatLongDate,
  formatMediumDate,
  formatMinutes,
  formatTime,
  partOfDayForMinutes,
  stepTime,
  lastNDays,
  orderedWeekdays,
  partOfDay,
  rangeKeys,
  startOfMonth,
  startOfWeek,
  toKey,
  weekdayOf,
} from "@/data/dates";

describe("date keys", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(toKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30"); // across a DST change in many zones
  });

  it("diffs and ranges inclusively", () => {
    expect(diffDays("2026-10-01", "2026-10-23")).toBe(22);
    expect(rangeKeys("2026-10-20", "2026-10-23")).toEqual(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"]);
    expect(lastNDays("2026-10-23", 3)).toEqual(["2026-10-21", "2026-10-22", "2026-10-23"]);
  });

  it("finds week and month starts", () => {
    expect(weekdayOf("2026-10-23")).toBe(5);
    expect(startOfWeek("2026-10-23", 1)).toBe("2026-10-19");
    expect(startOfWeek("2026-10-23", 0)).toBe("2026-10-18");
    expect(startOfWeek("2026-10-19", 1)).toBe("2026-10-19");
    expect(startOfMonth("2026-10-23")).toBe("2026-10-01");
    expect(daysInMonth("2026-02-10")).toBe(28);
    expect(orderedWeekdays(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});

describe("formatting", () => {
  it("formats dates and times for people", () => {
    expect(formatLongDate("2026-10-23")).toBe("Friday, Oct 23");
    expect(formatTime("07:30")).toBe("7:30 AM");
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("21:45")).toBe("9:45 PM");
    expect(partOfDay(7)).toBe("morning");
    expect(partOfDay(14)).toBe("afternoon");
    expect(partOfDay(22)).toBe("evening");
    expect(formatMinutes(7 * 60 + 5)).toBe("7:05 AM");
    expect(formatMinutes(21 * 60 + 40)).toBe("9:40 PM");
    expect(formatMinutes(0)).toBe("12:00 AM");
    expect(partOfDayForMinutes(13 * 60)).toBe("afternoon");
    expect(formatMediumDate("2026-10-19")).toBe("Mon, Oct 19");
    expect(stepTime("07:03", 1)).toBe("07:05");
    expect(stepTime("07:03", -1)).toBe("07:00");
    expect(stepTime("07:00", -1)).toBe("06:55");
    expect(stepTime("23:55", 1)).toBe("00:00");
    expect(stepTime("00:00", -1, 15)).toBe("23:45");
  });

  it("describes schedules and targets", () => {
    expect(describeSchedule([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(describeSchedule([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(describeSchedule([0, 6])).toBe("Weekends");
    expect(describeSchedule([5, 1, 3])).toBe("Mon, Wed, Fri");
    expect(describeTarget(8, "glasses")).toBe("8 glasses");
    expect(describeTarget(1, null)).toBe("Once a day");
  });
});
