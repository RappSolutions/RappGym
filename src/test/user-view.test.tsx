import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserViewProvider } from "@/lib/user-view";

const { getView, getUser, setScope } = vi.hoisted(() => ({
  getView: vi.fn(), getUser: vi.fn(), setScope: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/user-view.functions", () => ({ getUserView: getView, endUserView: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser } } }));
vi.mock("@/lib/gym", () => ({ setGymViewScope: setScope }));
vi.mock("@/lib/i18n", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("User-view bootstrap", () => {
  it("does not cancel a pending workout loader or discard its data", async () => {
    vi.stubGlobal("BroadcastChannel", class { close() {} onmessage = null; });
    getUser.mockResolvedValue({ data: { user: { id: "actor" } }, error: null });
    getView.mockResolvedValue({ actorId: "actor", userId: "actor", readOnly: false, name: "", email: "" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let finish: ((rows: string[]) => void) | undefined;
    const loading = client.ensureQueryData({
      queryKey: ["workouts"],
      queryFn: () => new Promise<string[]>((resolve) => { finish = resolve; }),
    });
    // Observe rejection immediately, just as a route loader/Suspense consumer does.
    const outcome = loading.then((data) => ({ data }), (error: unknown) => ({ error }));
    render(<QueryClientProvider client={client}><UserViewProvider><p>Workout ready</p></UserViewProvider></QueryClientProvider>);
    await screen.findByText("Workout ready");
    expect(client.getQueryState(["workouts"])?.fetchStatus).toBe("fetching");
    if (!finish) throw new Error("Workout loader did not start");
    await act(async () => { finish?.(["planned-workout"]); await loading.catch(() => {}); });
    expect(await outcome).toEqual({ data: ["planned-workout"] });
    expect(client.getQueryData(["workouts"])).toEqual(["planned-workout"]);
    expect(setScope).toHaveBeenCalledWith("actor", "actor");
    client.clear();
  });
});