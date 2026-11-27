import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setHeroOrigin, takeHeroOrigin } from "@/lib/heroTransition";

const rect = { x: 20, y: 300, width: 44, height: 44 };

describe("hero transition origins", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T17:40:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns the rect set for that habit only", () => {
    setHeroOrigin("water", rect);
    expect(takeHeroOrigin("read")).toBeNull();
    expect(takeHeroOrigin("water")).toEqual(rect);
  });

  it("can be taken twice in a row (StrictMode double initializers), then expires", () => {
    setHeroOrigin("walk", rect);
    expect(takeHeroOrigin("walk")).toEqual(rect);
    vi.advanceTimersByTime(100);
    expect(takeHeroOrigin("walk")).toEqual(rect);
    vi.advanceTimersByTime(300);
    expect(takeHeroOrigin("walk")).toBeNull();
  });

  it("ignores an origin older than 1.5 s (a deep link or back-then-forward)", () => {
    setHeroOrigin("read", rect);
    vi.advanceTimersByTime(1600);
    expect(takeHeroOrigin("read")).toBeNull();
  });
});
