import { useLayoutEffect, useSyncExternalStore } from "react";

/**
 * One app-wide loading overlay. Any number of loading phases (hydration, session
 * check, route pending, view bootstrap) hold it; it hides only after the last
 * hold has been released for HANDOFF_MS, so consecutive phases never restart it.
 */
export const HANDOFF_MS = 180;

type Timer = ReturnType<typeof setTimeout>;

export function createSplashStore(handoffMs = HANDOFF_MS, schedule: (fn: () => void, ms: number) => Timer = setTimeout, cancel: (t: Timer) => void = clearTimeout) {
  let holds = 0;
  let visible = false;
  let timer: Timer | null = null;
  const listeners = new Set<() => void>();
  const set = (next: boolean) => {
    if (visible === next) return;
    visible = next;
    listeners.forEach((l) => l());
  };
  return {
    acquire() {
      holds += 1;
      if (timer) { cancel(timer); timer = null; }
      set(true);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holds -= 1;
        if (holds > 0) return;
        timer = schedule(() => { timer = null; if (holds === 0) set(false); }, handoffMs);
      };
    },
    isVisible: () => visible,
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}

export const splashStore = createSplashStore();

export function useSplashVisible() {
  return useSyncExternalStore(splashStore.subscribe, splashStore.isVisible, () => true);
}

/** Keeps the shared overlay visible while the calling component is mounted. */
export function useSplashHold(active = true) {
  useLayoutEffect(() => (active ? splashStore.acquire() : undefined), [active]);
}
