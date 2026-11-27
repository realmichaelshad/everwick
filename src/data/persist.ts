/**
 * Pure persistence helpers: read and migrate what comes back from storage,
 * decide whether untouched demo data should be regenerated for a new day,
 * and build and parse export files. No React Native imports (unit-tested).
 */
import { migrate, MigrationError } from "./migrations";
import { AppStateSchema, describeIssue, ExportFileSchema } from "./schema";
import { createSeedState } from "./seed";
import { SCHEMA_VERSION, type AppState, type CheckinTimes, type DateKey, type Habit, type Logs, type Settings, type Skips } from "./types";

/** Current storage key. The schema version lives inside the value, not in the key. */
export const STORAGE_KEY = "everwick/state";
/** Keys earlier builds wrote to; read once and migrated forward. */
export const LEGACY_STORAGE_KEYS = ["everwick/state/v1"] as const;

export class StorageFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageFormatError";
  }
}

/**
 * Parses stored JSON: JSON -> migrations -> zod validation.
 * Returns null for missing data; throws StorageFormatError for data we can't use.
 */
export function parseState(raw: string | null | undefined): AppState | null {
  if (raw == null || raw === "") return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new StorageFormatError("Stored data is not valid JSON");
  }
  let migrated: Record<string, unknown>;
  try {
    migrated = migrate(json).data;
  } catch (e) {
    throw new StorageFormatError(e instanceof MigrationError ? e.message : "Stored data has an unknown format");
  }
  const result = AppStateSchema.safeParse(migrated);
  if (!result.success) throw new StorageFormatError(describeIssue(result.error, "state", migrated));
  return result.data;
}

export function serializeState(state: AppState): string {
  return JSON.stringify(state);
}

/**
 * What the app should show at launch: stored data as-is, or (for first launch
 * and untouched demo data from an earlier day) a fresh seed relative to today.
 */
export function resolveLaunchState(stored: AppState | null, today: DateKey, nowMinute?: number): AppState {
  if (!stored) return createSeedState(today, {}, nowMinute);
  if (!stored.modified && stored.seededOn && stored.seededOn !== today) {
    return createSeedState(
      today,
      {
        settings: stored.settings,
        onboarded: stored.onboarded,
        proPreview: stored.proPreview,
        seenAchievements: stored.seenAchievements,
      },
      nowMinute,
    );
  }
  return stored;
}

/* -------------------------------------------------------------------------- */
/* Export and import                                                           */
/* -------------------------------------------------------------------------- */

export interface ExportFile {
  app: "Everwick";
  schema: typeof SCHEMA_VERSION;
  note: string;
  exportedAt: string;
  habits: Habit[];
  logs: Logs;
  skips: Skips;
  times: CheckinTimes;
  settings: Settings;
}

export function buildExport(state: AppState, exportedAt: Date): ExportFile {
  return {
    app: "Everwick",
    schema: SCHEMA_VERSION,
    note: "Everwick is a concept app (fictional brand). This file contains only data stored on this device.",
    exportedAt: exportedAt.toISOString(),
    habits: state.habits,
    logs: state.logs,
    skips: state.skips,
    times: state.times,
    settings: state.settings,
  };
}

export function exportFileName(today: DateKey): string {
  return `everwick-export-${today}.json`;
}

export interface ImportedData {
  habits: Habit[];
  logs: Logs;
  skips: Skips;
  times: CheckinTimes;
  settings: Settings | null;
  /** Schema version of the file before migration. */
  fromSchema: number;
  /** Completed check-ins in the file (for the confirmation copy). */
  checkins: number;
}

export type ImportResult = { ok: true; data: ImportedData } | { ok: false; error: string };

/** Migration problems, worded for someone choosing a file (not for stored data). */
function importMigrationMessage(e: unknown): string {
  if (!(e instanceof MigrationError)) return "That file can't be read. Choose a file exported from Everwick.";
  switch (e.problem) {
    case "not-object":
      return "That file isn't an Everwick export. Choose a file exported from Everwick.";
    case "newer":
      return "This file was made by a newer version of Everwick. Update the app, then import it again.";
    default:
      return "That file has a format version Everwick doesn't recognise.";
  }
}

/** Validates an export file's text. Errors are short sentences meant for people. */
export function parseImport(text: string): ImportResult {
  if (text.length > 5_000_000) return { ok: false, error: "That file is too large to be an Everwick export." };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON. Choose a file exported from Everwick." };
  }
  let migrated: Record<string, unknown>;
  let fromSchema: number;
  try {
    const result = migrate(json, "schema");
    migrated = result.data;
    fromSchema = result.from;
  } catch (e) {
    return { ok: false, error: importMigrationMessage(e) };
  }
  const parsed = ExportFileSchema.safeParse(migrated);
  if (!parsed.success) return { ok: false, error: describeIssue(parsed.error, "file", migrated) };
  const file = parsed.data;
  const ids = new Set<string>();
  for (const h of file.habits) {
    if (ids.has(h.id)) return { ok: false, error: `Two habits in this file are the same habit (${h.name}). Remove one and try again.` };
    ids.add(h.id);
  }
  // Keep history only for habits in the file; clamp values to each habit's target.
  const logs: Logs = {};
  let checkins = 0;
  for (const h of file.habits) {
    const entries: Record<DateKey, number> = {};
    for (const [key, value] of Object.entries(file.logs[h.id] ?? {})) {
      const v = Math.min(h.target, Math.round(value));
      if (v > 0) entries[key] = v;
      if (v >= h.target) checkins++;
    }
    logs[h.id] = entries;
  }
  const pick = <T,>(map: Record<string, T>): Record<string, T> =>
    Object.fromEntries(file.habits.map((h) => [h.id, map[h.id] ?? ({} as T)]));
  return {
    ok: true,
    data: {
      habits: file.habits.map((h, i) => ({ ...h, order: Number.isFinite(h.order) ? h.order : i })),
      logs,
      skips: pick(file.skips),
      times: pick(file.times),
      settings: file.settings ?? null,
      fromSchema,
      checkins,
    },
  };
}

/** The state after importing: data replaced, theme kept, marked as the person's own data. */
export function applyImport(current: AppState, data: ImportedData): AppState {
  return {
    ...current,
    habits: data.habits,
    logs: data.logs,
    skips: data.skips,
    times: data.times,
    settings: data.settings ? { ...data.settings, theme: current.settings.theme } : current.settings,
    onboarded: true,
    seededOn: null,
    modified: true,
  };
}
