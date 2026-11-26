import rappgymLogo from "@/assets/RappGym_1024.png";

/** Browser loading view; the operating system's launch screen stays static. */
export function StartupSplash() {
  return (
    <div aria-busy="true" className="startup-splash fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="landing-logo-shell">
        <img src={rappgymLogo} alt="RappGym" width={240} height={240} className="landing-logo is-waiting block h-60 w-60 max-w-[70vw] object-contain" />
      </div>
    </div>
  );
}