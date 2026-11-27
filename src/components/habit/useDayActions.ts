import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import SkipForward from "lucide-react-native/icons/skip-forward";
import Trophy from "lucide-react-native/icons/trophy";
import Undo2 from "lucide-react-native/icons/undo-2";
import { useMemo, useRef } from "react";

import { checkInMessage, clearMessage, perfectDayMessage, skipMessage, unskipMessage } from "@/components/today/todayModel";
import { useToast } from "@/components/ui/Toast";
import { isDoneOn, isScheduledOn, isSkippedOn, streakInfo, summarizeDay, valueOn } from "@/data/stats";
import { useStore } from "@/data/store";
import type { DateKey, Habit } from "@/data/types";
import { haptics } from "@/lib/haptics";

import { restoreDay, streakAfterCheckIn } from "./detailModel";

/** Check-in actions for any habit on any day (Today's rows, habit detail, the day sheets). */
export interface CheckIns {
  /** Finish the day (all glasses / the one check-in). */
  complete(habit: Habit, day: DateKey): void;
  /** Target habits: one unit more or less. Completing announces like `complete`. */
  step(habit: Habit, day: DateKey, delta: 1 | -1): void;
  /** Clear the day's progress. */
  clear(habit: Habit, day: DateKey): void;
  skip(habit: Habit, day: DateKey): void;
  unskip(habit: Habit, day: DateKey): void;
  /** The check button: +1 for targets, check in for simple habits, or undo a finished day. */
  tap(habit: Habit, day: DateKey): void;
  /** Swipe right on a row: finish the day in one go, or undo a finished one. */
  swipeComplete(habit: Habit, day: DateKey): void;
  /** Swipe left on a row: skip, or take a skip back. */
  toggleSkip(habit: Habit, day: DateKey): void;
}

/** The same actions bound to one habit (habit detail and its day sheet). */
export interface DayActions {
  complete(day: DateKey): void;
  step(day: DateKey, delta: 1 | -1): void;
  clear(day: DateKey): void;
  skip(day: DateKey): void;
  unskip(day: DateKey): void;
  tap(day: DateKey): void;
}

/**
 * Every check-in, skip and fix-a-day action in the app, in one place: the
 * state change, the haptic, a one-line toast (copy from todayModel) and an
 * Undo that puts exactly that habit's day back (value, skip and the original
 * check-in time) without touching anything else that happened since.
 * Checking in the last open habit of today shows one "Perfect day" toast
 * instead of the check-in toast, wherever it happens.
 */
export function useCheckIns(options: { onAct?: () => void } = {}): CheckIns {
  const { state, actions, today } = useStore();
  const toast = useToast();
  const onAct = useRef(options.onAct);
  onAct.current = options.onAct;

  return useMemo<CheckIns>(() => {
    const acted = () => onAct.current?.();
    const undoFor = (habit: Habit, day: DateKey) => {
      const before = actions.snapshot();
      return {
        label: "Undo",
        onPress: () => {
          haptics.light();
          actions.restore(restoreDay(actions.snapshot(), before, habit.id, day));
        },
      };
    };

    /** True when finishing `habit` today leaves nothing open today. */
    const completesToday = (habit: Habit, day: DateKey) => {
      if (day !== today || habit.archived || !isScheduledOn(habit, day)) return false;
      const live = state.habits.filter((h) => !h.archived);
      const summary = summarizeDay(live, state, today, today);
      const wasSkipped = isSkippedOn(habit, state, day);
      const open = summary.scheduled - summary.done + (wasSkipped ? 1 : 0);
      return open === 1 && !isDoneOn(habit, state, day);
    };

    const announceDone = (habit: Habit, day: DateKey, action: { label: string; onPress: () => void }, perfect: boolean) => {
      haptics.complete();
      if (perfect) {
        const count = summarizeDay(state.habits.filter((h) => !h.archived), state, today, today).done + 1;
        toast.show({ message: perfectDayMessage(count), tone: "success", icon: Trophy, action });
        return;
      }
      const streak = streakAfterCheckIn(habit, state, day, today);
      // A late check-in only earns a streak mention when it actually lengthens the live streak.
      const grew = day === today || streak > streakInfo(habit, state, today).current;
      toast.show({ message: checkInMessage(habit, grew ? streak : null, day, today), tone: "success", action });
    };

    const complete = (habit: Habit, day: DateKey) => {
      acted();
      const perfect = completesToday(habit, day);
      const action = undoFor(habit, day);
      actions.setValue(habit.id, habit.target, day);
      announceDone(habit, day, action, perfect);
    };

    const clear = (habit: Habit, day: DateKey) => {
      acted();
      const action = undoFor(habit, day);
      actions.setValue(habit.id, 0, day);
      haptics.light();
      toast.show({ message: clearMessage(habit.name, day, today), icon: RotateCcw, action });
    };

    const step = (habit: Habit, day: DateKey, delta: 1 | -1) => {
      const value = valueOn(habit, state, day);
      const next = Math.max(0, Math.min(habit.target, value + delta));
      if (next === value) return;
      acted();
      const perfect = next >= habit.target && completesToday(habit, day);
      const action = undoFor(habit, day);
      actions.setValue(habit.id, next, day);
      if (next >= habit.target) announceDone(habit, day, action, perfect);
      else haptics.selection();
    };

    const skip = (habit: Habit, day: DateKey) => {
      acted();
      const action = undoFor(habit, day);
      actions.skip(habit.id, true, day);
      haptics.warning();
      toast.show({ message: skipMessage(habit.name, day, today), icon: SkipForward, action });
    };

    const unskip = (habit: Habit, day: DateKey) => {
      acted();
      const action = undoFor(habit, day);
      actions.skip(habit.id, false, day);
      haptics.light();
      toast.show({ message: unskipMessage(habit.name, day, today), icon: Undo2, action });
    };

    const tap = (habit: Habit, day: DateKey) => {
      if (isDoneOn(habit, state, day)) return clear(habit, day);
      if (habit.target > 1 && !isSkippedOn(habit, state, day)) return step(habit, day, 1);
      return complete(habit, day);
    };

    const swipeComplete = (habit: Habit, day: DateKey) => (isDoneOn(habit, state, day) ? clear(habit, day) : complete(habit, day));
    const toggleSkip = (habit: Habit, day: DateKey) => (isSkippedOn(habit, state, day) ? unskip(habit, day) : skip(habit, day));

    return { complete, step, clear, skip, unskip, tap, swipeComplete, toggleSkip };
  }, [actions, state, today, toast]);
}

/** useCheckIns bound to one habit (habit detail and its day sheet). */
export function useDayActions(habit: Habit | undefined): DayActions {
  const checkIns = useCheckIns();
  return useMemo<DayActions>(() => {
    if (!habit) {
      const noop = () => undefined;
      return { complete: noop, step: noop, clear: noop, skip: noop, unskip: noop, tap: noop };
    }
    return {
      complete: (day) => checkIns.complete(habit, day),
      step: (day, delta) => checkIns.step(habit, day, delta),
      clear: (day) => checkIns.clear(habit, day),
      skip: (day) => checkIns.skip(habit, day),
      unskip: (day) => checkIns.unskip(habit, day),
      tap: (day) => checkIns.tap(habit, day),
    };
  }, [checkIns, habit]);
}
