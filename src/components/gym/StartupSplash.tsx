import rappgymLogo from "@/assets/RappGym_1024.png";
import { useSplashHold, useSplashVisible } from "@/lib/startup-splash";

/** Holds the single app-wide splash overlay while mounted; renders nothing itself. */
export function StartupSplash() {
  useSplashHold();
  return null;
}

/** The one persistent overlay, rendered once in the root shell so phase handoffs never remount it. */
export function StartupOverlay({ hydrated }: { hydrated: boolean }) {
  const held = useSplashVisible();
  const visible = !hydrated || held;
  return (
    <div
      aria-busy={visible}
      aria-hidden={!visible}
      data-testid="startup-splash"
      className={`startup-splash fixed inset-0 z-[100] flex items-center justify-center bg-background${visible ? "" : " is-done"}`}
    >
      <div className="landing-logo-shell">
        <img src={rappgymLogo} alt="RappGym" width={240} height={240} className="landing-logo is-waiting block h-60 w-60 max-w-[70vw] object-contain" />
      </div>
    </div>
  );
}
