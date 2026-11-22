import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.resolve }));
vi.mock("@/lib/exercise-title.functions", () => ({ resolveExerciseTitle: {} }));
vi.mock("@/lib/i18n", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
import { useExerciseTitle } from "./use-exercise-title";

beforeEach(() => { mocks.resolve.mockReset(); });
it("never applies a title after a newer manual edit", async () => {
  let finish: ((value: { title: string }) => void) | undefined;
  mocks.resolve.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { result } = renderHook(() => useExerciseTitle(true, "sv"));
  const apply = vi.fn();
  let pending: Promise<void> | undefined;
  act(() => { pending = result.current.lookup("https://example.com", apply); });
  act(() => result.current.cancel());
  await act(async () => { finish?.({ title: "Old title" }); await pending; });
  expect(apply).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
});
it("discards results when the dialog closes or language changes", async () => {
  let finish: ((value: { title: string }) => void) | undefined;
  mocks.resolve.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { result, rerender } = renderHook(({ open, scope }) => useExerciseTitle(open, scope), { initialProps: { open: true, scope: "sv" } });
  const apply = vi.fn();
  let pending: Promise<void> | undefined;
  act(() => { pending = result.current.lookup("https://example.com", apply); });
  rerender({ open: false, scope: "en" });
  await act(async () => { finish?.({ title: "Old title" }); await pending; });
  expect(apply).not.toHaveBeenCalled();
});