/**
 * Versioned storage schema. Every stored blob and export file carries a
 * version; migrations upgrade old data one step at a time until it matches
 * SCHEMA_VERSION, then the zod schema validates the result.
 *
 * Adding a version: bump SCHEMA_VERSION in types.ts, add `MIGRATIONS[old]`
 * that returns data shaped for `old + 1`, and add a fixture test in
 * tests/migrations.test.ts. Never edit a published migration.
 */
import { SCHEMA_VERSION } from "./types";

type Json = Record<string, unknown>;
export type Migration = (data: Json) => Json;

export type MigrationProblem = "not-object" | "newer" | "unknown-version" | "missing-step";

export class MigrationError extends Error {
  /** What went wrong, so storage and import can each word it for their reader. */
  readonly problem: MigrationProblem;
  readonly version: number | null;
  constructor(message: string, problem: MigrationProblem, version: number | null = null) {
    super(message);
    this.name = "MigrationError";
    this.problem = problem;
    this.version = version;
  }
}

const isRecord = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);

export const MIGRATIONS: Record<number, Migration> = {
  /**
   * v1 -> v2: added skips (a day can be skipped on purpose), check-in times
   * (for time-of-day insights and the Early riser achievement) and the list of
   * achievements whose unlock animation was already shown.
   */
  1: (data) => ({
    ...data,
    version: 2,
    // Keep anything already there (a hand-edited or mislabelled file); never drop data.
    skips: isRecord(data.skips) ? data.skips : {},
    times: isRecord(data.times) ? data.times : {},
    seenAchievements: Array.isArray(data.seenAchievements) ? data.seenAchievements : [],
  }),
};

export interface MigrationResult {
  data: Json;
  /** Version the data had before migrating. */
  from: number;
  /** Versions that were migrated from, in order (empty when already current). */
  applied: number[];
}

/** Upgrades `input` to SCHEMA_VERSION. Throws MigrationError for data we can't read. */
export function migrate(input: unknown, versionKey: "version" | "schema" = "version"): MigrationResult {
  if (!isRecord(input)) {
    throw new MigrationError("Stored data isn't an object", "not-object");
  }
  let data = { ...input };
  const raw = data[versionKey];
  // Only a missing version means "the first format"; anything else must be a whole number we know.
  if (raw !== undefined && !(typeof raw === "number" && Number.isInteger(raw))) {
    throw new MigrationError(`Unknown schema version ${JSON.stringify(raw)}`, "unknown-version");
  }
  const from = raw === undefined ? 1 : (raw as number);
  if (from > SCHEMA_VERSION) {
    throw new MigrationError(`This data was saved by a newer version of Everwick (schema ${from})`, "newer", from);
  }
  if (from < 1) throw new MigrationError(`Unknown schema version ${String(raw)}`, "unknown-version", from);
  const applied: number[] = [];
  for (let v = from; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new MigrationError(`No migration from schema ${v}`, "missing-step", v);
    data = step(data);
    applied.push(v);
  }
  if (versionKey === "schema") data.schema = SCHEMA_VERSION;
  return { data, from, applied };
}
