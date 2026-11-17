import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingInsights } from "@/components/gym/TrainingInsights";

const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));

vi.mock("@/lib/training-insights.functions", () => ({ getTrainingInsights: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => generate }));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useSuspenseQuery: () => ({ data: [] }),
  useQueryClient: () => ({}),
}));
vi.mock("@/hooks/use-gym", () => ({ useSelectedGym: () => [null] }));

afterEach(cleanup);
beforeEach(() => {
  generate.mockReset();
  generate.mockResolvedValue({ insights: null, error: null });
});

describe("TrainingInsights initial request mode", () => {
  it("submits a plan when opened from the workout AI shortcut", async () => {
    render(<TrainingInsights exercises={[]} hasLog initialMode="plan" />);
    fireEvent.click(screen.getByRole("button", { name: "Ge mig passförslag" }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith({
      data: expect.objectContaining({ request: expect.objectContaining({ mode: "plan", question: "" }) }),
    }));
  });

  it("defaults to analysis without an initial mode", async () => {
    render(<TrainingInsights exercises={[]} hasLog />);
    fireEvent.click(screen.getByRole("button", { name: "Analysera mina pass" }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith({
      data: expect.objectContaining({ request: expect.objectContaining({ mode: "summary" }) }),
    }));
  });

  it("allows switching to analysis after opening in planning mode", async () => {
    render(<TrainingInsights exercises={[]} hasLog initialMode="plan" />);
    fireEvent.click(screen.getByRole("button", { name: "Analys & frågor" }));
    fireEvent.click(screen.getByRole("button", { name: "Analysera mina pass" }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith({
      data: expect.objectContaining({ request: expect.objectContaining({ mode: "summary" }) }),
    }));
  });
});