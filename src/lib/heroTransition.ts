/**
 * List-to-detail "shared element" transition that works on iOS, Android and web.
 * The list measures the habit's icon tile in window coordinates just before
 * navigating; the detail screen takes that rect and springs its hero icon
 * from there into place (see habit detail). Origins expire quickly so a deep
 * link or a back-then-forward never animates from a stale spot.
 */
export interface HeroRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TTL_MS = 1500;
/** A taken origin stays readable this long, so a second call (React StrictMode runs initializers twice) gets it too. */
const REPEAT_MS = 250;
const origins = new Map<string, { rect: HeroRect; at: number; takenAt?: number }>();

export function setHeroOrigin(habitId: string, rect: HeroRect): void {
  origins.set(habitId, { rect, at: Date.now() });
}

/**
 * Returns the origin for this habit if it was set in the last 1.5 s, then
 * expires it. Calling it again within 250 ms returns the same rect.
 */
export function takeHeroOrigin(habitId: string): HeroRect | null {
  const entry = origins.get(habitId);
  if (!entry) return null;
  const now = Date.now();
  if (entry.takenAt === undefined) {
    if (now - entry.at > TTL_MS) {
      origins.delete(habitId);
      return null;
    }
    entry.takenAt = now;
    return entry.rect;
  }
  if (now - entry.takenAt <= REPEAT_MS) return entry.rect;
  origins.delete(habitId);
  return null;
}
