/**
 * Pure state transitions for the store. Every change to AppState goes
 * through `reducer`, so behaviour is unit-tested without React
 * (tests/reducer.test.ts).
 */
import { isDoneOn, isSkippedOn, valueOn } from "./stats";
import type { AppState, DateKey, GoalKey, Habit, NotificationSettings, Settings } from "./types";

export type Action =
  | { type: "hydrate"; state: AppState }
  /**
   * `at` = minutes after midnight, recorded as the check-in time when the day
   * becomes done. Null for a late check-in on a past day: the real time is
   * unknown, so none is stored (it would skew time-of-day insights and could
   * unlock Early riser by mistake).
   */
  | { type: "setValue"; habitId: string; key: DateKey; value: number; at: number | null }
  | { type: "increment"; habitId: string; key: DateKey; delta: number; at: number | null }
  | { type: "toggle"; habitId: string; key: DateKey; at: number | null }
  | { type: "skip"; habitId: string; key: DateKey; skipped: boolean }
  | { type: "reorder"; ids: string[] }
  | { type: "addHabit"; habit: Habit }
  | { type: "updateHabit"; id: string; patch: Partial<Omit<Habit, "id">> }
  | { type: "deleteHabit"; id: string }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "notifications"; patch: Partial<NotificationSettings> }
  | { type: "onboarding"; onboarded: boolean; goals?: GoalKey[]; notifications?: Partial<NotificationSettings>; name?: string }
  | { type: "proPreview"; value: boolean }
  | { type: "seenAchievements"; ids: string[] };

const withoutKey = <T,>(map: Record<DateKey, T> | undefined, key: DateKey): Record<DateKey, T> => {
  const next = { ...(map ?? {}) };
  delete next[key];
  return next;
};

/** Pure state transitions. Exported for tests. */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "setValue": {
      const habit = state.habits.find((h) => h.id === action.habitId);
      if (!habit) return state;
      const value = Math.max(0, Math.min(habit.target, Math.round(action.value)));
      const wasDone = isDoneOn(habit, state, action.key);
      const entries = withoutKey(state.logs[habit.id], action.key);
      if (value > 0) entries[action.key] = value;
      let times = state.times[habit.id] ?? {};
      if (value >= habit.target && !wasDone && action.at != null) times = { ...times, [action.key]: action.at };
      if (value < habit.target) times = withoutKey(times, action.key);
      // Checking in clears a skip for that day.
      const skips = value > 0 && isSkippedOn(habit, state, action.key) ? { ...state.skips, [habit.id]: withoutKey(state.skips[habit.id], action.key) } : state.skips;
      return {
        ...state,
        modified: true,
        logs: { ...state.logs, [habit.id]: entries },
        times: { ...state.times, [habit.id]: times },
        skips,
      };
    }
    case "increment":
    case "toggle": {
      const habit = state.habits.find((h) => h.id === action.habitId);
      if (!habit) return state;
      const current = valueOn(habit, state, action.key);
      const value = action.type === "toggle" ? (current >= habit.target ? 0 : habit.target) : current + action.delta;
      return reducer(state, { type: "setValue", habitId: habit.id, key: action.key, value, at: action.at });
    }
    case "skip": {
      const habit = state.habits.find((h) => h.id === action.habitId);
      if (!habit) return state;
      const days = withoutKey(state.skips[habit.id], action.key);
      if (action.skipped) days[action.key] = true;
      return {
        ...state,
        modified: true,
        skips: { ...state.skips, [habit.id]: days },
        // Skipping a day clears any progress logged for it.
        logs: action.skipped ? { ...state.logs, [habit.id]: withoutKey(state.logs[habit.id], action.key) } : state.logs,
        times: action.skipped ? { ...state.times, [habit.id]: withoutKey(state.times[habit.id], action.key) } : state.times,
      };
    }
    case "reorder": {
      const position = new Map(action.ids.map((id, i) => [id, i]));
      const rest = state.habits.filter((h) => !position.has(h.id)).sort((a, b) => a.order - b.order);
      return {
        ...state,
        modified: true,
        habits: state.habits.map((h) => ({ ...h, order: position.get(h.id) ?? action.ids.length + rest.indexOf(h) })),
      };
    }
    case "addHabit":
      return {
        ...state,
        modified: true,
        habits: [...state.habits, action.habit],
        logs: { ...state.logs, [action.habit.id]: {} },
        skips: { ...state.skips, [action.habit.id]: {} },
        times: { ...state.times, [action.habit.id]: {} },
      };
    case "updateHabit":
      return {
        ...state,
        modified: true,
        habits: state.habits.map((h) => (h.id === action.id ? { ...h, ...action.patch, id: h.id } : h)),
      };
    case "deleteHabit": {
      const drop = <T,>(map: Record<string, T>) => {
        const next = { ...map };
        delete next[action.id];
        return next;
      };
      return {
        ...state,
        modified: true,
        habits: state.habits.filter((h) => h.id !== action.id),
        logs: drop(state.logs),
        skips: drop(state.skips),
        times: drop(state.times),
      };
    }
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "notifications":
      return { ...state, settings: { ...state.settings, notifications: { ...state.settings.notifications, ...action.patch } } };
    case "onboarding":
      return {
        ...state,
        onboarded: action.onboarded,
        settings: {
          ...state.settings,
          name: action.name?.trim() ? action.name.trim() : state.settings.name,
          goals: action.goals ?? state.settings.goals,
          notifications: { ...state.settings.notifications, ...(action.notifications ?? {}) },
        },
      };
    case "proPreview":
      return { ...state, proPreview: action.value };
    case "seenAchievements": {
      const seen = new Set([...state.seenAchievements, ...action.ids]);
      return seen.size === state.seenAchievements.length ? state : { ...state, seenAchievements: [...seen] };
    }
    default:
      return state;
  }
}
