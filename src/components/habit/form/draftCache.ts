import type { HabitFormValues } from "@/data/habitForm";

/**
 * Unsaved form drafts, kept in memory for the session and keyed by route
 * ("new", "edit:<id>"). Leaving the form without saving and coming back
 * restores exactly what was typed ("nothing lost"). Saving or discarding
 * clears the entry.
 */
const drafts = new Map<string, HabitFormValues>();

export const draftCache = {
  get(key: string): HabitFormValues | undefined {
    const draft = drafts.get(key);
    return draft ? { ...draft, days: [...draft.days] } : undefined;
  },
  set(key: string, values: HabitFormValues): void {
    drafts.set(key, { ...values, days: [...values.days] });
  },
  clear(key: string): void {
    drafts.delete(key);
  },
};
