// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useDelay, useReducedMotion, useShotClock } from "../../src/engine/clock.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockAnimationFrames() {
  const callbacks = new Map();
  let nextId = 0;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback) => {
    const id = ++nextId;
    callbacks.set(id, callback);
    return id;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id) => callbacks.delete(id)));

  return (now) => {
    const next = callbacks.entries().next().value;
    expect(next, "a frame should be scheduled").toBeDefined();
    const [id, callback] = next;
    callbacks.delete(id);
    act(() => callback(now));
  };
}

test("shot clock counts visible frame time and expires exactly once", () => {
  const frame = mockAnimationFrames();
  vi.spyOn(performance, "now").mockReturnValue(0);
  const onExpire = vi.fn();
  const { result } = renderHook(() => useShotClock({
    durationMs: 1000, running: true, onExpire, key: "round-1",
  }));

  expect(result.current).toBe(1000);
  frame(250);
  expect(result.current).toBe(750);
  frame(1000);
  expect(result.current).toBe(0);
  expect(onExpire).toHaveBeenCalledTimes(1);
  expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
});

test("shot clock preserves remaining time while hidden and rebases on return", () => {
  const frame = mockAnimationFrames();
  const clockNow = vi.spyOn(performance, "now").mockReturnValue(0);
  let hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  const onExpire = vi.fn();
  const { result } = renderHook(() => useShotClock({
    durationMs: 1000, running: true, onExpire, key: "round-1",
  }));

  frame(200);
  expect(result.current).toBe(800);
  hidden = true;
  frame(700);
  expect(result.current).toBe(800);

  clockNow.mockReturnValue(700);
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  frame(900);
  expect(result.current).toBe(600);
  expect(onExpire).not.toHaveBeenCalled();
});

test("delay restarts for a new key and cancels when inactive", () => {
  vi.useFakeTimers();
  const first = vi.fn();
  const second = vi.fn();
  const { rerender } = renderHook(
    ({ active, callback, reset }) => useDelay(100, active, callback, reset),
    { initialProps: { active: true, callback: first, reset: 1 } },
  );

  act(() => vi.advanceTimersByTime(50));
  rerender({ active: true, callback: second, reset: 2 });
  act(() => vi.advanceTimersByTime(50));
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(50));
  expect(second).toHaveBeenCalledTimes(1);
  rerender({ active: false, callback: second, reset: 3 });
  act(() => vi.advanceTimersByTime(200));
  expect(second).toHaveBeenCalledTimes(1);
});

test("reduced-motion hook follows preference changes and removes its listener", () => {
  let notify;
  const query = {
    matches: true,
    addEventListener: vi.fn((_event, listener) => { notify = listener; }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => query));
  const { result, unmount } = renderHook(() => useReducedMotion());

  expect(result.current).toBe(true);
  expect(query.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  act(() => {
    query.matches = false;
    notify();
  });
  expect(result.current).toBe(false);

  unmount();
  expect(query.removeEventListener).toHaveBeenCalledWith("change", notify);
});
