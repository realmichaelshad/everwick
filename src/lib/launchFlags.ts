import { Platform } from "react-native";

/**
 * Web-only launch flags for demos, QA and showcase captures. Read once from
 * the URL when the page loads and kept in memory, so client-side navigation
 * keeps them; only the presentation flag `device` also survives a reload.
 *
 * They are safe in a production build: the store never writes data from a
 * flag to storage (see data/store.tsx), and a forced theme or onboarding value
 * is saved as it was before the flag, so a shared link can't overwrite
 * anyone's habits or settings.
 *
 *   ?state=loading   keep the skeleton (storage read never resolves)
 *   ?state=error     first storage read fails (Retry works)
 *   ?state=empty     start with no habits (designed empty states)
 *   ?state=fresh     ignore stored data and start from the demo seed
 *   ?device=1        draw a generic phone status bar and home indicator (showcase frames)
 *   ?onboarded=1|0   force the onboarding flag
 *   ?theme=light|dark force a theme for this tab
 */
export interface LaunchFlags {
  state: "loading" | "error" | "empty" | "fresh" | null;
  device: boolean;
  onboarded: boolean | null;
  theme: "light" | "dark" | null;
}

const KEY = "everwick/launch-flags";
let cached: LaunchFlags | null = null;

const NONE: LaunchFlags = { state: null, device: false, onboarded: null, theme: null };

export function launchFlags(): LaunchFlags {
  if (cached) return cached;
  if (Platform.OS !== "web" || typeof window === "undefined") {
    cached = NONE;
    return cached;
  }
  let stored: Partial<LaunchFlags> = {};
  try {
    stored = JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}") as Partial<LaunchFlags>;
  } catch {
    stored = {};
  }
  const params = new URLSearchParams(window.location.search);
  const state = params.get("state");
  const theme = params.get("theme");
  const onboarded = params.get("onboarded");
  cached = {
    state: state === "loading" || state === "error" || state === "empty" || state === "fresh" ? state : null,
    device: params.has("device") ? params.get("device") === "1" : Boolean(stored.device),
    onboarded: onboarded === "1" ? true : onboarded === "0" ? false : null,
    theme: theme === "light" || theme === "dark" ? theme : null,
  };
  try {
    // Only the device frame persists across reloads in this tab; data and theme flags apply to this load.
    window.sessionStorage.setItem(KEY, JSON.stringify({ device: cached.device }));
  } catch {
    // sessionStorage can be unavailable (private mode); flags then apply to this load only.
  }
  return cached;
}
