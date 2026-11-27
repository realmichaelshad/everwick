import { useCallback, useRef } from "react";
import { Platform, type HostInstance, type KeyDownEvent } from "react-native";

import { focusHost } from "@/lib/dom";

export interface RovingFocusOptions {
  count: number;
  /** Index that holds the single tab stop (the selected item; 0 when none is selected). */
  active: number;
  /** Arrow keys move here. For radio groups and tabs, moving also selects (the ARIA pattern). */
  onMove: (index: number) => void;
  /** Items per row in a grid (Up/Down move a row). Default: one row, Up/Down move like Left/Right. */
  columns?: number;
  isDisabled?: (index: number) => boolean;
}

export interface RovingItemProps {
  ref?: (node: HostInstance | null) => void;
  tabIndex?: 0 | -1;
  onKeyDown?: (e: KeyDownEvent) => void;
}

/**
 * Roving tab stop for radio groups, tab lists and grids on the web: the group
 * is one Tab stop (the selected item) and the arrow keys, Home and End move
 * between items, so a picker with 26 icons costs one Tab press instead of 26.
 * Returns nothing on iOS and Android, where screen readers swipe between items.
 *
 *   const roving = useRovingFocus({ count, active: selectedIndex, onMove: (i) => select(items[i]) });
 *   <PressableScale {...roving(i)} ... />
 */
export function useRovingFocus({ count, active, onMove, columns, isDisabled }: RovingFocusOptions): (index: number) => RovingItemProps {
  const refs = useRef<(HostInstance | null)[]>([]);
  const stop = active >= 0 && active < count ? active : 0;
  return useCallback(
    (index: number): RovingItemProps => {
      if (Platform.OS !== "web") return {};
      return {
        ref: (node) => {
          refs.current[index] = node;
        },
        tabIndex: index === stop ? 0 : -1,
        onKeyDown: (e) => {
          const key = e.nativeEvent.key;
          const row = columns ?? 1;
          let target: number;
          if (key === "ArrowRight") target = index + 1;
          else if (key === "ArrowLeft") target = index - 1;
          else if (key === "ArrowDown") target = index + row;
          else if (key === "ArrowUp") target = index - row;
          else if (key === "Home") target = 0;
          else if (key === "End") target = count - 1;
          else return;
          e.preventDefault();
          const step = target >= index ? 1 : -1;
          // Single rows wrap around; grids stop at the edges.
          if (!columns) target = (target + count) % count;
          while (target >= 0 && target < count && isDisabled?.(target)) target += step;
          if (target < 0 || target >= count || target === index) return;
          onMove(target);
          focusHost(refs.current[target]);
        },
      };
    },
    [columns, count, isDisabled, onMove, stop],
  );
}
