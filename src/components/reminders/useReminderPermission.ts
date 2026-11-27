import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import type { Habit, NotificationSettings } from "@/data/types";
import {
  getReminderPermission,
  remindersSupported,
  requestReminderPermission,
  scheduledReminderCount,
  syncReminders,
  type ReminderPermission,
} from "@/lib/reminders";

export interface ReminderPermissionState {
  /** null while the first check runs. "unsupported" on web. */
  permission: ReminderPermission | null;
  /** How many reminders the phone has scheduled (native, granted). */
  scheduled: number;
  /** Shows the system prompt; resolves to the new permission. */
  request: () => Promise<ReminderPermission>;
}

/**
 * The notification permission and the scheduled count, kept fresh: checked
 * on mount, when the app comes back to the foreground (after a trip to the
 * phone's Settings) and shortly after habits or reminder settings change
 * (the store re-schedules on change).
 */
export function useReminderPermission(habits: Habit[], settings: NotificationSettings): ReminderPermissionState {
  const [permission, setPermission] = useState<ReminderPermission | null>(remindersSupported ? null : "unsupported");
  const [scheduled, setScheduled] = useState(0);
  const alive = useRef(true);
  const latest = useRef({ habits, settings });
  latest.current = { habits, settings };

  const last = useRef<ReminderPermission | null>(null);

  const check = useCallback(async () => {
    const p = await getReminderPermission();
    if (!alive.current) return;
    // Allowed in the phone's Settings while away: schedule now (the store only syncs on changes).
    if (p === "granted" && last.current !== null && last.current !== "granted") await syncReminders(latest.current.habits, latest.current.settings);
    last.current = p;
    setPermission(p);
    if (p === "granted") {
      const n = await scheduledReminderCount();
      if (alive.current) setScheduled(n);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!remindersSupported) return;
    void check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void check();
    });
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [check]);

  // The store re-schedules about 600 ms after a change; count again once it has.
  useEffect(() => {
    if (!remindersSupported) return;
    const id = setTimeout(() => void check(), 1200);
    return () => clearTimeout(id);
  }, [check, habits, settings]);

  const request = useCallback(async () => {
    const p = await requestReminderPermission();
    if (alive.current) setPermission(p);
    // The store only re-schedules when something changes, so schedule right away once allowed.
    if (p === "granted") await syncReminders(latest.current.habits, latest.current.settings);
    last.current = p;
    await check();
    return p;
  }, [check]);

  return { permission, scheduled, request };
}
