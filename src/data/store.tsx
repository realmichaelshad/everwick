/**
 * Everwick's device-local store. One React context holds the whole app state,
 * persisted to AsyncStorage (localStorage on web) under STORAGE_KEY as a
 * versioned, zod-validated JSON document (see persist.ts and migrations.ts).
 *
 *   const { status, state, actions } = useStore();
 *   const habits = useHabits();          // active habits, in order
 *   const today = useToday();            // "YYYY-MM-DD", updates at midnight
 *
 * status: "loading" (show skeletons) | "ready" | "error" (show ErrorState with actions.retry).
 * saveError: set when writing to storage failed (full or blocked storage); the
 * app shows a toast with Retry (actions.retrySave). Cleared by the next good write.
 *
 * Demo flags (?state=fresh|empty, ?theme, ?onboarded; see lib/launchFlags) only
 * change what is in memory: data from a flag is never written to storage, and
 * a forced theme or onboarding value is saved as it was before the flag.
 *
 * Every mutation goes through the pure `reducer` in reducer.ts (unit-tested
 * in tests/reducer.test.ts). Undo is snapshot based: take `actions.snapshot()`
 * before a change and pass it to `actions.restore()` from the toast's Undo.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";

import { setHapticsEnabled } from "@/lib/haptics";
import { launchFlags } from "@/lib/launchFlags";
import { now, todayKey } from "@/lib/clock";
import { syncReminders } from "@/lib/reminders";

import { applyImport, buildExport, LEGACY_STORAGE_KEYS, parseImport, parseState, resolveLaunchState, serializeState, STORAGE_KEY, type ImportResult } from "./persist";
import { createEmptyState, createSeedState } from "./seed";
import { reducer } from "./reducer";
import { isDoneOn, valueOn } from "./stats";
import type { AppState, DateKey, GoalKey, Habit, HabitDraft, NotificationSettings, Settings } from "./types";

export type StoreStatus = "loading" | "ready" | "error";

export interface StoreActions {
  /** Check off a habit for a day (or un-check it). Returns the new done state. */
  toggle(habitId: string, key?: DateKey): boolean;
  /** Add (or remove, with a negative delta) units for target habits like "8 glasses". Returns the new value. */
  increment(habitId: string, delta?: number, key?: DateKey): number;
  setValue(habitId: string, value: number, key?: DateKey): void;
  /** Mark a day as skipped on purpose (neither counts nor breaks the streak), or undo the skip. */
  skip(habitId: string, skipped: boolean, key?: DateKey): void;
  /** New display order for active habits (ids top to bottom). */
  reorder(ids: string[]): void;
  addHabit(draft: HabitDraft): Habit;
  updateHabit(id: string, patch: Partial<Omit<Habit, "id">>): void;
  deleteHabit(id: string): void;
  archiveHabit(id: string, archived: boolean): void;
  updateSettings(patch: Partial<Settings>): void;
  updateNotifications(patch: Partial<NotificationSettings>): void;
  completeOnboarding(input?: { goals?: GoalKey[]; notifications?: Partial<NotificationSettings>; name?: string }): void;
  replayOnboarding(): void;
  setProPreview(value: boolean): void;
  /** Remember that these achievements' unlock animation has been shown. */
  markAchievementsSeen(ids: string[]): void;
  /** Regenerate the 60-day demo history (keeps theme, name and onboarding). Also recovers from a storage error. */
  resetDemoData(): void;
  /** Remove every habit and log (shows the designed empty states). */
  clearAllData(): void;
  /** Pretty JSON of everything stored on this device. */
  exportData(): string;
  /** Validate an export file. Does not change anything; pass the data to importData. */
  previewImport(text: string): ImportResult;
  /** Replace habits and history with a validated import (keep a snapshot first for Undo). */
  importData(result: Extract<ImportResult, { ok: true }>["data"]): void;
  /** The whole state right now, for Undo. */
  snapshot(): AppState;
  /** Put back a snapshot taken earlier (Undo). */
  restore(snapshot: AppState): void;
  /** Re-read storage (pull to refresh). */
  refresh(): Promise<void>;
  /** Try loading again after an error. */
  retry(): void;
  /** Write to storage again after a failed save. */
  retrySave(): void;
}

export interface StoreValue {
  status: StoreStatus;
  error: string | null;
  /** The last write to storage failed (null when saved). */
  saveError: string | null;
  state: AppState;
  today: DateKey;
  actions: StoreActions;
}

const StoreContext = createContext<StoreValue | null>(null);

let idCounter = 0;
function newId(name: string): string {
  idCounter += 1;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${slug || "habit"}-${now().getTime().toString(36)}${idCounter}`;
}

const minutesNow = () => {
  const d = now();
  return d.getHours() * 60 + d.getMinutes();
};

/** Check-in time to record: now for today, unknown (null) for a late check-in on a past day. */
const checkinTime = (key: DateKey): number | null => (key === todayKey() ? minutesNow() : null);

async function readStored(): Promise<AppState | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw != null) return parseState(raw);
  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = await AsyncStorage.getItem(key);
    if (legacy != null) return parseState(legacy);
  }
  return null;
}

/** Values a demo flag forced into memory, with what storage held before (saved instead while untouched). */
interface FlagOverrides {
  theme?: { applied: Settings["theme"]; original: Settings["theme"] };
  onboarded?: { applied: boolean; original: boolean };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const flags = launchFlags();
  const [today, setToday] = useState<DateKey>(() => todayKey());
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [state, dispatch] = useReducer(reducer, today, (t) => createEmptyState(t, { onboarded: true }));
  const attempt = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  /** True while the data on screen came from a demo flag (?state=fresh|empty): never persisted. */
  const ephemeral = useRef(false);
  const overrides = useRef<FlagOverrides>({});

  const load = useCallback(async () => {
    attempt.current += 1;
    const t = todayKey();
    setStatus("loading");
    setError(null);
    try {
      if (flags.state === "loading") return; // demo: stay on the skeleton
      if (flags.state === "error" && attempt.current === 1) {
        await new Promise((r) => setTimeout(r, 450));
        throw new Error("Simulated storage read failure");
      }
      let next: AppState;
      ephemeral.current = false;
      if (flags.state === "empty" && attempt.current === 1) {
        next = createEmptyState(t);
        ephemeral.current = true;
      } else if (flags.state === "fresh" && attempt.current === 1) {
        next = createSeedState(t, {}, minutesNow());
        ephemeral.current = true;
      } else next = resolveLaunchState(await readStored(), t, minutesNow());
      overrides.current = {};
      if (flags.onboarded !== null && next.onboarded !== flags.onboarded) {
        overrides.current.onboarded = { applied: flags.onboarded, original: next.onboarded };
        next = { ...next, onboarded: flags.onboarded };
      }
      if (flags.theme && next.settings.theme !== flags.theme) {
        overrides.current.theme = { applied: flags.theme, original: next.settings.theme };
        next = { ...next, settings: { ...next.settings, theme: flags.theme } };
      }
      dispatch({ type: "hydrate", state: next });
      setToday(t);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [flags.onboarded, flags.state, flags.theme]);

  useEffect(() => {
    void load();
  }, [load]);

  // Persist (debounced) whenever state changes after a successful load.
  useEffect(() => {
    if (status !== "ready" || ephemeral.current) return;
    const id = setTimeout(() => {
      // Values a demo flag forced stay in memory: save what was stored before, unless the person changed it since.
      const { theme, onboarded } = overrides.current;
      let toSave = state;
      if (theme && toSave.settings.theme === theme.applied) toSave = { ...toSave, settings: { ...toSave.settings, theme: theme.original } };
      if (onboarded && toSave.onboarded === onboarded.applied) toSave = { ...toSave, onboarded: onboarded.original };
      AsyncStorage.setItem(STORAGE_KEY, serializeState(toSave)).then(
        () => setSaveError(null),
        (e: unknown) => setSaveError(e instanceof Error ? e.message : String(e)),
      );
    }, 200);
    return () => clearTimeout(id);
  }, [state, status, saveAttempt]);

  // Keep scheduled reminders (native only) in step with habits, settings and today's check-ins
  // (a habit done today shouldn't ring again today).
  useEffect(() => {
    if (status !== "ready") return;
    const id = setTimeout(() => {
      void syncReminders(state.habits, state.settings.notifications, { logs: state.logs, skips: state.skips });
    }, 600);
    return () => clearTimeout(id);
  }, [state.habits, state.logs, state.skips, state.settings.notifications, status, today]);

  // Roll over at midnight.
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayKey();
      setToday((prev) => (prev === t ? prev : t));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setHapticsEnabled(state.settings.haptics);
  }, [state.settings.haptics]);

  const actions = useMemo<StoreActions>(() => {
    const find = (id: string) => stateRef.current.habits.find((h) => h.id === id);
    const reseed = () => {
      const s = stateRef.current;
      // An explicit reset is the person's own data from now on, even in a demo-flag session.
      ephemeral.current = false;
      dispatch({
        type: "hydrate",
        state: createSeedState(todayKey(), { settings: s.settings, onboarded: true, proPreview: s.proPreview, seenAchievements: s.seenAchievements }, minutesNow()),
      });
      setToday(todayKey());
      setError(null);
      setStatus("ready");
    };
    return {
      toggle(habitId, key = todayKey()) {
        const habit = find(habitId);
        if (!habit) return false;
        const done = isDoneOn(habit, stateRef.current, key);
        dispatch({ type: "toggle", habitId, key, at: checkinTime(key) });
        return !done;
      },
      increment(habitId, delta = 1, key = todayKey()) {
        const habit = find(habitId);
        if (!habit) return 0;
        const value = Math.max(0, Math.min(habit.target, valueOn(habit, stateRef.current, key) + delta));
        dispatch({ type: "increment", habitId, key, delta, at: checkinTime(key) });
        return value;
      },
      setValue(habitId, value, key = todayKey()) {
        dispatch({ type: "setValue", habitId, key, value, at: checkinTime(key) });
      },
      skip(habitId, skipped, key = todayKey()) {
        dispatch({ type: "skip", habitId, key, skipped });
      },
      reorder(ids) {
        dispatch({ type: "reorder", ids });
      },
      addHabit(draft) {
        const habit: Habit = {
          ...draft,
          id: newId(draft.name),
          createdAt: draft.createdAt ?? todayKey(),
          order: stateRef.current.habits.reduce((max, h) => Math.max(max, h.order), -1) + 1,
          archived: false,
        };
        dispatch({ type: "addHabit", habit });
        return habit;
      },
      updateHabit(id, patch) {
        dispatch({ type: "updateHabit", id, patch });
      },
      deleteHabit(id) {
        dispatch({ type: "deleteHabit", id });
      },
      archiveHabit(id, archived) {
        dispatch({ type: "updateHabit", id, patch: { archived } });
      },
      updateSettings(patch) {
        if (patch.theme !== undefined) delete overrides.current.theme;
        dispatch({ type: "settings", patch });
      },
      updateNotifications(patch) {
        dispatch({ type: "notifications", patch });
      },
      completeOnboarding(input = {}) {
        delete overrides.current.onboarded;
        dispatch({ type: "onboarding", onboarded: true, ...input });
      },
      replayOnboarding() {
        delete overrides.current.onboarded;
        dispatch({ type: "onboarding", onboarded: false });
      },
      setProPreview(value) {
        dispatch({ type: "proPreview", value });
      },
      markAchievementsSeen(ids) {
        dispatch({ type: "seenAchievements", ids });
      },
      resetDemoData() {
        reseed();
      },
      clearAllData() {
        const s = stateRef.current;
        dispatch({ type: "hydrate", state: createEmptyState(todayKey(), { settings: s.settings, proPreview: s.proPreview, seenAchievements: s.seenAchievements }) });
      },
      exportData() {
        return JSON.stringify(buildExport(stateRef.current, now()), null, 2);
      },
      previewImport(text) {
        return parseImport(text);
      },
      importData(data) {
        dispatch({ type: "hydrate", state: applyImport(stateRef.current, data) });
      },
      snapshot() {
        return stateRef.current;
      },
      restore(snapshot) {
        dispatch({ type: "hydrate", state: snapshot });
      },
      async refresh() {
        const started = Date.now();
        try {
          // A demo-flag session has nothing of its own in storage to re-read.
          const stored = ephemeral.current ? null : await readStored();
          if (stored) dispatch({ type: "hydrate", state: resolveLaunchState(stored, todayKey(), minutesNow()) });
        } catch {
          // Keep what is on screen; a failed refresh is not worth an error screen.
        }
        setToday(todayKey());
        // Let the refresh spinner read as intentional.
        const elapsed = Date.now() - started;
        if (elapsed < 650) await new Promise((r) => setTimeout(r, 650 - elapsed));
      },
      retry() {
        void load();
      },
      retrySave() {
        setSaveAttempt((n) => n + 1);
      },
    };
  }, [load]);

  const value = useMemo<StoreValue>(() => ({ status, error, saveError, state, today, actions }), [status, error, saveError, state, today, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function useToday(): DateKey {
  return useStore().today;
}

/** Active (non-archived) habits in display order. */
export function useHabits(): Habit[] {
  const { state } = useStore();
  return useMemo(() => state.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order), [state.habits]);
}

export function useHabit(id: string | undefined): Habit | undefined {
  const { state } = useStore();
  return useMemo(() => state.habits.find((h) => h.id === id), [state.habits, id]);
}

/** Paused (archived) habits in display order: listed on Profile so they can be resumed. */
export function usePausedHabits(): Habit[] {
  const { state } = useStore();
  return useMemo(() => state.habits.filter((h) => h.archived).sort((a, b) => a.order - b.order), [state.habits]);
}
