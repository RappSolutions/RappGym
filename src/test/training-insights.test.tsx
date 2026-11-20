import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingInsights } from "@/components/gym/TrainingInsights";

const { generate, viewState } = vi.hoisted(() => ({ generate: vi.fn(), viewState: { readOnly: false } }));

vi.mock("@/lib/training-insights.functions", () => ({ getTrainingInsights: vi.fn() }));
vi.mock("@/lib/ai-quota.functions", () => ({ getMyAiQuota: vi.fn() }));
vi.mock("@/lib/user-view", () => ({ useUserView: () => viewState }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => generate }));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useSuspenseQuery: () => ({ data: [] }),
  useQuery: () => ({ data: undefined }),
  useQueryClient: () => ({ invalidateQueries: () => Promise.resolve() }),
}));
vi.mock("@/hooks/use-gym", () => ({ useSelectedGym: () => [null] }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<object>()), useBlocker: () => ({ status: "idle" }) }));

afterEach(cleanup);
beforeEach(() => {
  viewState.readOnly = false;
  generate.mockReset();
  generate.mockResolvedValue({ insights: null, error: null });
});

describe("TrainingInsights initial request mode", () => {
  it("cannot issue paid AI requests while viewing another user", () => {
    viewState.readOnly = true;
    render(<TrainingInsights exercises={[]} hasLog initialMode="plan" />);
    fireEvent.click(screen.getByRole("button", { name: "Ge mig passförslag" }));
    expect(generate).not.toHaveBeenCalled();
  });
  it("submits a plan when opened from the workout AI shortcut", async () => {
    render(<TrainingInsights exercises={[]} hasLog initialMode="plan" />);
    fireEvent.click(screen.getByRole("button", { name: "Ge mig passförslag" }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ request: expect.objectContaining({ mode: "plan", question: "" }) }),
    })));
  });

  it("defaults to analysis without an initial mode", async () => {
    render(<TrainingInsights exercises={[]} hasLog />);
    fireEvent.click(screen.getByRole("button", { name: "Analysera mina pass" }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ request: expect.objectContaining({ mode: "summary" }) }),
    })));
  });

  it("allows switching to analysis after opening in planning mode", async () => {
    render(<TrainingInsights exercises={[]} hasLog initialMode="plan" />);
    fireEvent.click(screen.getByRole("button", { name: "Analys & frågor" }));
    fireEvent.click(screen.getByRole("button", { name: "Analysera mina pass" }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ request: expect.objectContaining({ mode: "summary" }) }),
    })));
  });
});