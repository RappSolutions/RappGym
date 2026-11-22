import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useUserView } from "@/lib/user-view";
import { CircuitRunner } from "./CircuitRunner";

const ActiveWorkoutContext = createContext<(id: string) => void>(() => undefined);
export const useStartWorkout = () => useContext(ActiveWorkoutContext);

/** URL is authoritative; a user-scoped tab pointer restores an interrupted document, never an intentional Back. */
export function ActiveWorkout({ children }: { children: ReactNode }) {
  const { view } = useUserView();
  const navigate = useNavigate();
  const router = useRouter();
  const run = useRouterState({ select: (s) => s.location.search.run });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const key = `rappgym-active:${view?.actorId}:${view?.userId}`;
  const initialized = useRef(false);
  const previous = useRef<string | undefined>(undefined);
  const pushed = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const saved = sessionStorage.getItem(key);
      if (!run && saved) {
        void navigate({ to: "/workout", search: { run: saved }, replace: true });
        return;
      }
    }
    if (run) sessionStorage.setItem(key, run);
    else if (previous.current) sessionStorage.removeItem(key);
    previous.current = run;
  }, [run, key, navigate]);
  function start(id: string) {
    pushed.current = true;
    if (pathname === "/home") void navigate({ to: "/home", search: (prev) => ({ ...prev, run: id }) });
    else void navigate({ to: "/workout", search: (prev) => ({ ...prev, run: id }) });
  }
  function close() {
    sessionStorage.removeItem(key);
    if (pushed.current) { pushed.current = false; router.history.back(); }
    else if (pathname === "/home") void navigate({ to: "/home", search: (prev) => ({ ...prev, run: undefined }), replace: true });
    else void navigate({ to: "/workout", search: (prev) => ({ ...prev, run: undefined }), replace: true });
  }
  return <ActiveWorkoutContext.Provider value={start}>{children}{run && <CircuitRunner key={`${key}:${run}`} workoutId={run} onClose={close} />}</ActiveWorkoutContext.Provider>;
}