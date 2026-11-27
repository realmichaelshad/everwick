import { useEffect, useState } from "react";
import { Easing, useAnimatedReaction, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * A number that counts to `target` on the UI thread (eased timing) and
 * re-renders only when the rounded value changes. Starts from 0 on mount and
 * from the previous value afterwards, so switching Week/Month rolls the
 * numbers. Reduced motion shows the final value immediately.
 */
export function useCountUp(target: number, duration = 650): number {
  const reduced = useReducedMotion();
  const value = useSharedValue(reduced ? target : 0);
  const [display, setDisplay] = useState(() => (reduced ? Math.round(target) : 0));

  useEffect(() => {
    if (reduced) {
      value.value = target;
      setDisplay(Math.round(target));
      return;
    }
    value.value = withTiming(target, { duration, easing: Easing.out(Easing.cubic) });
  }, [duration, reduced, target, value]);

  useAnimatedReaction(
    () => Math.round(value.value),
    (next, previous) => {
      if (next !== previous) scheduleOnRN(setDisplay, next);
    },
  );

  return display;
}
