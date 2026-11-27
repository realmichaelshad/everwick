/**
 * The Everwick mark: a candle flame with a flickering, hooked tip and a warm
 * inner flame, standing on a short plum wick. Ever + wick: the flame is what
 * grows from the wick. The hooked tip and the two-tone inner flame keep it
 * reading as fire at 40 px (never a water drop), and the wick is a plain
 * stroke under the flame's base (no shapes inside the core that could read
 * as a letter). 64x64 viewBox. Drawn by the in-app Logo, the streak flame
 * (outline and inner flame only), the illustration fallbacks, the icon
 * generator and the confetti.
 */
export const FLAME_VIEWBOX = "0 0 64 64";

/** Outer flame: rounded base, body swelling to the right, tip hooking back as it flickers. */
export const FLAME_PATH = "M41 2.5 C 38.5 9.5 50.5 20 50.5 38.5 A 18.5 18.5 0 0 1 13.5 38.5 C 13.5 28 22 22 27 15.5 C 31 10.5 37 8 41 2.5 Z";

/** The inner flame (the warm core, the "day dot" grown into a flame). */
export const FLAME_INNER_PATH = "M34 27 C 36.5 32 40 36 40 42 A 8 8 0 0 1 24 42 C 24 36.5 29.5 32.5 34 27 Z";

/** The inner flame's bounding box in the 64 box (for animating it on its own). */
export const FLAME_INNER_BOX = { x: 24, y: 27, width: 16, height: 23 } as const;

/** The wick: a short straight stroke under the flame's base. Stroke it (round caps). */
export const WICK_PATH = "M32 55.5 L32 61.5";
export const WICK_WIDTH = 4;

/** Wick color: plum in both themes. */
export const WICK_COLOR = "#1C1424";

/** The mark's visual center in its 64 box (for centering in icons). */
export const MARK_CENTER = { x: 32, y: 32 } as const;

/** Below this size (px) the mark drops the wick: the flame alone reads more clearly. */
export const WICK_MIN_SIZE = 36;
