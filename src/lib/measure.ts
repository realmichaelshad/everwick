import type { HostInstance } from "react-native";

import type { HeroRect } from "@/lib/heroTransition";

/**
 * Window rect of a mounted view on iOS, Android and web. Calls back with
 * null when the view isn't laid out yet. Measure a view without transforms
 * (getBoundingClientRect includes them on web).
 */
export function measureInWindow(node: HostInstance | null, done: (rect: HeroRect | null) => void): void {
  const n = node as unknown as {
    getBoundingClientRect?: () => { x: number; y: number; width: number; height: number };
    measureInWindow?: (cb: (x: number, y: number, width: number, height: number) => void) => void;
  } | null;
  try {
    if (n?.getBoundingClientRect) {
      const r = n.getBoundingClientRect();
      done(r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null);
      return;
    }
    if (n?.measureInWindow) {
      n.measureInWindow((x, y, width, height) => done(width > 0 ? { x, y, width, height } : null));
      return;
    }
  } catch {
    // Measuring is a nicety; fall through to "no rect".
  }
  done(null);
}

