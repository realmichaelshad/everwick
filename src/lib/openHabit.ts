import { router } from "expo-router";
import type { HostInstance } from "react-native";

import { setHeroOrigin } from "./heroTransition";
import { measureInWindow } from "./measure";

/**
 * Opens a habit's detail screen, handing the tapped icon tile's window rect
 * to the detail hero first (lib/heroTransition) so the tile can fly into
 * place. On web the rect is read synchronously; on iOS and Android the push
 * waits at most 80 ms for the measurement and never blocks on it.
 */
export function openHabitWithHero(habitId: string, iconNode: HostInstance | null): void {
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    router.push({ pathname: "/habit/[id]", params: { id: habitId } });
  };
  measureInWindow(iconNode, (rect) => {
    if (rect) setHeroOrigin(habitId, rect);
    go();
  });
  setTimeout(go, 80);
}
