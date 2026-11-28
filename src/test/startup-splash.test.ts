import { describe, expect, it, vi } from "vitest";
import { createSplashStore } from "@/lib/startup-splash";

describe("startup splash store", () => {
  it("stays visible across a handoff between consecutive loading phases", () => {
    vi.useFakeTimers();
    const s = createSplashStore(180);
    const a = s.acquire();
    a();
    vi.advanceTimersByTime(100);
    const b = s.acquire();
    vi.advanceTimersByTime(500);
    expect(s.isVisible()).toBe(true);
    b();
    vi.advanceTimersByTime(179);
    expect(s.isVisible()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(s.isVisible()).toBe(false);
    vi.useRealTimers();
  });
  it("ignores a double release", () => {
    vi.useFakeTimers();
    const s = createSplashStore(10);
    const a = s.acquire(); const b = s.acquire();
    a(); a();
    vi.advanceTimersByTime(50);
    expect(s.isVisible()).toBe(true);
    b(); vi.advanceTimersByTime(10);
    expect(s.isVisible()).toBe(false);
    vi.useRealTimers();
  });
});
