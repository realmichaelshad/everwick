import { toKey } from "@/data/dates";
import type { DateKey } from "@/data/types";

/** Single source of "now" so tests and showcase captures (Playwright page.clock) control time. */
export function now(): Date {
  return new Date();
}

export function todayKey(): DateKey {
  return toKey(now());
}
