export function enableDragAutoScroll(): () => void {
  const ZONE = 80;
  const SPEED = 10;
  const onDragOver = (e: DragEvent) => {
    const y = e.clientY;
    if (y < ZONE) window.scrollBy(0, -SPEED);
    else if (y > window.innerHeight - ZONE) window.scrollBy(0, SPEED);
  };
  document.addEventListener("dragover", onDragOver);
  return () => document.removeEventListener("dragover", onDragOver);
}

export function addTouchDrag(
  listEl: HTMLElement,
  onSwap: (from: number, to: number) => void,
  signal: AbortSignal,
): void {
  const ZONE = 80, SPEED = 8;
  let ghost: HTMLElement | null = null;
  let srcEl: HTMLElement | null = null;
  let srcIdx: number | null = null;
  let targetIdx: number | null = null;
  let offsetX = 0, offsetY = 0;

  function items() { return Array.from(listEl.querySelectorAll<HTMLElement>(".order-item")); }

  listEl.addEventListener("touchstart", (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const item = (e.target as HTMLElement).closest<HTMLElement>(".order-item");
    if (!item) return;
    const els = items();
    srcIdx = els.indexOf(item);
    if (srcIdx === -1) return;
    srcEl = item;
    const touch = e.touches[0];
    const rect = item.getBoundingClientRect();
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    ghost = item.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: "fixed", left: rect.left + "px", top: rect.top + "px",
      width: rect.width + "px", margin: "0", opacity: "0.85",
      pointerEvents: "none", zIndex: "9999",
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)", transform: "scale(1.02)",
    });
    document.body.appendChild(ghost);
    item.classList.add("dragging");
    e.preventDefault();
  }, { passive: false, signal });

  listEl.addEventListener("touchmove", (e) => {
    if (!ghost) return;
    const touch = e.touches[0];
    ghost.style.left = (touch.clientX - offsetX) + "px";
    ghost.style.top = (touch.clientY - offsetY) + "px";
    ghost.style.visibility = "hidden";
    const under = document.elementFromPoint(touch.clientX, touch.clientY);
    ghost.style.visibility = "";
    const overItem = under && (under as HTMLElement).closest<HTMLElement>(".order-item");
    items().forEach((el) => el.classList.remove("drag-over"));
    if (overItem && overItem !== srcEl) {
      const idx = items().indexOf(overItem);
      if (idx !== -1) { overItem.classList.add("drag-over"); targetIdx = idx; }
    } else { targetIdx = null; }
    if (touch.clientY < ZONE) window.scrollBy(0, -SPEED);
    else if (touch.clientY > window.innerHeight - ZONE) window.scrollBy(0, SPEED);
    e.preventDefault();
  }, { passive: false, signal });

  function endDrag() {
    if (!ghost) return;
    ghost.remove(); ghost = null;
    if (srcEl) srcEl.classList.remove("dragging");
    items().forEach((el) => el.classList.remove("drag-over"));
    if (srcIdx !== null && targetIdx !== null && srcIdx !== targetIdx) {
      onSwap(srcIdx, targetIdx);
    }
    srcEl = null; srcIdx = null; targetIdx = null;
  }

  listEl.addEventListener("touchend", endDrag, { passive: true, signal });
  listEl.addEventListener("touchcancel", endDrag, { passive: true, signal });
}
