import { useCallback, useRef, useState } from "react";

// One drag implementation for mouse and touch: pointer events with capture.
// The dragged element gets pointer-events:none while it moves so the drop
// target under the finger is what elementFromPoint reports on release.
export function useDrag({ onDrop, disabled = false }) {
  const [drag, setDrag] = useState(null);
  const ref = useRef(null);
  ref.current = drag;

  const onPointerDown = useCallback((e, id) => {
    if (disabled || ref.current) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 });
  }, [disabled]);

  const onPointerMove = useCallback((e) => {
    const d = ref.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setDrag({ ...d, dx: e.clientX - d.startX, dy: e.clientY - d.startY });
  }, []);

  const onPointerUp = useCallback((e) => {
    const d = ref.current;
    if (!d || d.pointerId !== e.pointerId) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest?.("[data-drop]") || null;
    setDrag(null);
    onDrop(target ? target.getAttribute("data-drop") : null, d);
  }, [onDrop]);

  const onPointerCancel = useCallback(() => setDrag(null), []);

  const bind = (id) => ({
    onPointerDown: (e) => onPointerDown(e, id),
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    "data-dragging": drag?.id === id ? "1" : undefined,
    style: drag?.id === id ? { transform: `translate(${drag.dx}px, ${drag.dy}px)`, pointerEvents: "none", zIndex: 5 } : undefined,
  });

  return { drag, bind };
}
