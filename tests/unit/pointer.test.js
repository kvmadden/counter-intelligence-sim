// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useDrag } from "../../src/engine/pointer.js";

const hitTestDescriptor = Object.getOwnPropertyDescriptor(document, "elementFromPoint");

afterEach(() => {
  cleanup();
  if (hitTestDescriptor) {
    Object.defineProperty(document, "elementFromPoint", hitTestDescriptor);
  } else {
    delete document.elementFromPoint;
  }
  vi.restoreAllMocks();
});

function mockHitTest(element) {
  const hitTest = vi.fn(() => element);
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true, writable: true, value: hitTest,
  });
  return hitTest;
}

function pointer() {
  const currentTarget = {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  };
  return {
    currentTarget,
    event: (overrides = {}) => ({
      currentTarget, pointerId: 7, button: 0, clientX: 20, clientY: 30,
      ...overrides,
    }),
  };
}

test("drag tracks its captured pointer and drops on the nearest marked ancestor", () => {
  const { currentTarget, event } = pointer();
  const target = document.createElement("div");
  target.setAttribute("data-drop", "station");
  const child = target.appendChild(document.createElement("span"));
  const hitTest = mockHitTest(child);
  const onDrop = vi.fn();
  const { result } = renderHook(() => useDrag({ onDrop }));

  act(() => result.current.bind("card").onPointerDown(event()));
  expect(currentTarget.setPointerCapture).toHaveBeenCalledWith(7);
  expect(result.current.drag).toMatchObject({ id: "card", pointerId: 7, dx: 0, dy: 0 });
  expect(result.current.bind("card")["data-dragging"]).toBe("1");
  expect(result.current.bind("other").style).toBeUndefined();

  act(() => result.current.bind("card").onPointerMove(event({ pointerId: 9, clientX: 90 })));
  expect(result.current.drag.dx).toBe(0);
  act(() => result.current.bind("card").onPointerUp(event({ pointerId: 9 })));
  expect(onDrop).not.toHaveBeenCalled();
  expect(currentTarget.releasePointerCapture).not.toHaveBeenCalled();

  act(() => result.current.bind("card").onPointerMove(event({ clientX: 45, clientY: 24 })));
  expect(result.current.bind("card").style).toMatchObject({
    transform: "translate(25px, -6px)", pointerEvents: "none",
  });
  act(() => result.current.bind("card").onPointerUp(event({ clientX: 45, clientY: 24 })));
  expect(hitTest).toHaveBeenCalledWith(45, 24);
  expect(currentTarget.releasePointerCapture).toHaveBeenCalledWith(7);
  expect(onDrop).toHaveBeenCalledExactlyOnceWith("station", expect.objectContaining({
    id: "card", dx: 25, dy: -6,
  }));
  expect(result.current.drag).toBeNull();
  expect(result.current.bind("card").style).toBeUndefined();
});

test("releasing outside a marked drop target reports null and clears the drag", () => {
  const { event } = pointer();
  mockHitTest(document.createElement("div"));
  const onDrop = vi.fn();
  const { result } = renderHook(() => useDrag({ onDrop }));

  act(() => result.current.bind("card").onPointerDown(event()));
  act(() => result.current.bind("card").onPointerUp(event()));
  expect(onDrop).toHaveBeenCalledExactlyOnceWith(null, expect.objectContaining({ id: "card" }));
  expect(result.current.drag).toBeNull();
});

test("disabled dragging and non-primary mouse buttons do not capture a pointer", () => {
  const { currentTarget, event } = pointer();
  const onDrop = vi.fn();
  const { result, rerender } = renderHook(
    ({ disabled }) => useDrag({ onDrop, disabled }),
    { initialProps: { disabled: true } },
  );
  act(() => result.current.bind("card").onPointerDown(event()));
  expect(result.current.drag).toBeNull();
  rerender({ disabled: false });
  act(() => result.current.bind("card").onPointerDown(event({ button: 2 })));
  expect(result.current.drag).toBeNull();
  expect(currentTarget.setPointerCapture).not.toHaveBeenCalled();
  expect(onDrop).not.toHaveBeenCalled();
});

test("pointer cancellation clears drag styling without delivering a drop", () => {
  const { event } = pointer();
  const onDrop = vi.fn();
  const { result } = renderHook(() => useDrag({ onDrop }));

  act(() => result.current.bind("card").onPointerDown(event()));
  act(() => result.current.bind("card").onPointerCancel(event()));
  expect(result.current.drag).toBeNull();
  expect(result.current.bind("card")["data-dragging"]).toBeUndefined();
  act(() => result.current.bind("card").onPointerUp(event()));
  expect(onDrop).not.toHaveBeenCalled();

  act(() => result.current.bind("next").onPointerDown(event({ pointerId: 8 })));
  expect(result.current.drag).toMatchObject({ id: "next", pointerId: 8 });
});
