import { useRef, useEffect } from "preact/hooks";
import type { JSX } from "preact";
import { addTouchDrag, enableDragAutoScroll } from "../../lib/dragHelpers";

interface DraggableListProps {
  items: string[];
  onReorder: (from: number, to: number) => void;
  submitted: boolean;
  renderRight: (item: string, idx: number) => JSX.Element | null;
  itemClass?: (item: string, idx: number) => string;
  labelClass?: string;
}

export function DraggableList({
  items,
  onReorder,
  submitted,
  renderRight,
  itemClass = () => "order-item",
  labelClass = "order-name",
}: DraggableListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const dragSrcIdxRef = useRef<number | null>(null);
  const stopScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!listRef.current || submitted) return;
    const ac = new AbortController();
    addTouchDrag(listRef.current, (from, to) => onReorderRef.current(from, to), ac.signal);
    return () => ac.abort();
  }, [submitted]);

  return (
    <div class="order-list" ref={listRef}>
      {items.map((item, idx) => (
        <div
          key={`${item}-${idx}`}
          class={itemClass(item, idx)}
          draggable={!submitted}
          onDragStart={submitted ? undefined : (e) => {
            dragSrcIdxRef.current = idx;
            (e as unknown as DragEvent).dataTransfer!.effectAllowed = "move";
            (e as unknown as DragEvent).dataTransfer!.setData("text/plain", String(idx));
            stopScrollRef.current = enableDragAutoScroll();
            setTimeout(() => (e.target as HTMLElement).classList.add("dragging"), 0);
          }}
          onDragEnd={submitted ? undefined : (e) => {
            (e.target as HTMLElement).classList.remove("dragging");
            dragSrcIdxRef.current = null;
            stopScrollRef.current?.(); stopScrollRef.current = null;
          }}
          onDragOver={submitted ? undefined : (e) => {
            e.preventDefault();
            (e as unknown as DragEvent).dataTransfer!.dropEffect = "move";
            listRef.current?.querySelectorAll(".order-item").forEach((el) => el.classList.remove("drag-over"));
            (e.currentTarget as HTMLElement).classList.add("drag-over");
          }}
          onDragLeave={submitted ? undefined : (e) => {
            if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
              (e.currentTarget as HTMLElement).classList.remove("drag-over");
            }
          }}
          onDrop={submitted ? undefined : (e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLElement).classList.remove("drag-over");
            const src = dragSrcIdxRef.current;
            if (src !== null && src !== idx) {
              onReorder(src, idx);
              dragSrcIdxRef.current = null;
            }
          }}
        >
          <span class="drag-handle" aria-hidden="true">⠿</span>
          <span class="order-idx">{idx + 1}</span>
          <span class={labelClass}>{item}</span>
          {renderRight(item, idx)}
        </div>
      ))}
    </div>
  );
}
