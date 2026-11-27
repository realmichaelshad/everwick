/**
 * Every length and range limit on a habit and the profile, in one place.
 * The Add / Edit form (habitForm.ts) and the storage and import schemas
 * (schema.ts) both read these, so anything that imports cleanly can also be
 * edited and saved unchanged (tests/limits.test.ts).
 */
export const LIMITS = {
  /** Habit name, after trimming. */
  name: 40,
  /** The one-liner under the name. */
  detail: 60,
  /** Unit for target habits ("glasses"). */
  unit: 20,
  /** Daily goal: 1 is a simple check-off. */
  targetMin: 1,
  targetMax: 99,
  notes: 2000,
  /** The name on Profile ("Good evening, Maya"). */
  profileName: 24,
  /** Most habits in one import file. */
  habitsPerFile: 200,
} as const;
