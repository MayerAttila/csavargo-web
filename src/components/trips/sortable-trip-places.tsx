import { useId, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { HiOutlineBars3 } from "react-icons/hi2";
import type { MapPoint } from "@/components/maps/types";

type Props = {
  dayNumber: number;
  places: MapPoint[];
  onMove: (id: string, index: number) => void;
  renderPlace: (place: MapPoint, index: number, dragHandle: ReactNode) => ReactNode;
};

type Drag = { id: string; target: number; mode: "pointer" | "keyboard" };
const handleClass = "grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40";

export function SortableTripPlaces({ dayNumber, places, onMove, renderPlace }: Props) {
  const [drag, setDrag] = useState<Drag>();
  const pointer = useRef<{ id: number; startY: number } | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const instructions = useId();
  const dragIndex = drag ? places.findIndex((place) => place.id === drag.id) : -1;

  function targetAt(y: number, source: number) {
    const rows = Array.from(list.current?.children ?? []).filter((_, index) => index !== source);
    const index = rows.findIndex((row) => {
      const { top, height } = row.getBoundingClientRect();
      return y < top + height / 2;
    });
    return index < 0 ? rows.length : index;
  }

  function startPointer(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || drag || pointer.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, startY: event.clientY };
  }

  function movePointer(event: PointerEvent<HTMLButtonElement>, place: MapPoint, index: number) {
    if (pointer.current?.id !== event.pointerId) return;
    if (!drag && Math.abs(event.clientY - pointer.current.startY) < 5) return;
    setDrag({ id: place.id, target: targetAt(event.clientY, index), mode: "pointer" });
  }

  function cancelPointer(event: PointerEvent<HTMLButtonElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    setDrag(undefined);
  }

  function dropPointer(event: PointerEvent<HTMLButtonElement>, place: MapPoint, index: number) {
    if (pointer.current?.id !== event.pointerId) return;
    if (drag || Math.abs(event.clientY - pointer.current.startY) >= 5) {
      const bounds = list.current?.getBoundingClientRect();
      if (bounds && event.clientX >= bounds.left && event.clientX <= bounds.right) {
        onMove(place.id, targetAt(event.clientY, index));
      }
    }
    cancelPointer(event);
  }

  function toggleKeyboard(place: MapPoint, index: number) {
    if (drag?.mode === "keyboard" && drag.id === place.id) {
      onMove(place.id, drag.target);
      setDrag(undefined);
    } else if (!drag && !pointer.current) {
      setDrag({ id: place.id, target: index, mode: "keyboard" });
    }
  }

  return <>
    <p id={instructions} className="sr-only">A helyet húzással rendezheted. Billentyűzettel az Enter vagy a szóköz felveszi és leteszi, a nyilak mozgatják, az Escape megszakítja.</p>
    <p aria-live="polite" className="sr-only">{drag?.mode === "keyboard" ? `Célpozíció: ${drag.target + 1} / ${places.length}` : ""}</p>
    <ol ref={list} aria-label={`${dayNumber}. nap helyszínei`} className="mt-3 space-y-2">
      {places.map((place, index) => {
        const insertion = drag?.target === index && index !== dragIndex;
        const dragHandle = (
          <button type="button" aria-label={`${place.label} átrendezése`} aria-describedby={instructions} aria-pressed={drag?.id === place.id}
            title="Húzd a hely átrendezéséhez" disabled={places.length < 2}
            className={`${handleClass} touch-none cursor-grab select-none active:cursor-grabbing disabled:cursor-default`}
            onPointerDown={startPointer} onPointerMove={(event) => movePointer(event, place, index)}
            onPointerUp={(event) => dropPointer(event, place, index)} onPointerCancel={cancelPointer} onLostPointerCapture={cancelPointer}
            onClick={(event) => { if (event.detail === 0) toggleKeyboard(place, index); }}
            onKeyDown={(event) => {
              if (drag?.mode !== "keyboard" || drag.id !== place.id) return;
              if (event.key === "Escape") { event.preventDefault(); setDrag(undefined); return; }
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              const delta = event.key === "ArrowUp" ? -1 : 1;
              setDrag({ ...drag, target: Math.max(0, Math.min(places.length - 1, drag.target + delta)) });
            }}
            onBlur={() => { if (drag?.mode === "keyboard") setDrag(undefined); }}>
            <HiOutlineBars3 aria-hidden="true" className="size-5" />
          </button>
        );
        return <li key={place.id} className={`relative rounded-xl border border-border bg-background ${drag?.id === place.id ? "border-brand bg-brand/10" : ""}`}>
          {insertion && <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 h-0.5 rounded bg-brand ${index < dragIndex ? "-top-1.5" : "-bottom-1.5"}`} />}
          {renderPlace(place, index, dragHandle)}
        </li>;
      })}
    </ol>
  </>;
}
