import { useId, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { PiDotsSixVertical } from "react-icons/pi";
import type { MapPoint } from "@/components/maps/types";

type Props = {
  dayNumber: number;
  places: MapPoint[];
  onMove: (id: string, index: number) => void;
  renderPlace: (place: MapPoint, orderBadge: ReactNode) => ReactNode;
};

type Drag = { id: string; target: number; mode: "pointer" | "keyboard" };
const badgeClass = "grid size-8 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand";

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
    {places.length > 1 && <p id={instructions} className="sr-only">A helyet a sorszámánál fogva húzhatod. Billentyűzettel az Enter vagy a szóköz felveszi és leteszi, a nyilak mozgatják, az Escape megszakítja.</p>}
    <p aria-live="polite" className="sr-only">{drag?.mode === "keyboard" ? `Célpozíció: ${drag.target + 1} / ${places.length}` : ""}</p>
    <ol ref={list} aria-label={`${dayNumber}. nap helyszínei`} className="mt-3 space-y-2">
      {places.map((place, index) => {
        const insertion = drag?.target === index && index !== dragIndex;
        const orderBadge = places.length > 1 ? (
          <button type="button" aria-label={`${place.label} átrendezése`} aria-describedby={instructions} aria-pressed={drag?.id === place.id}
            title="Húzd a sorszámot az átrendezéshez"
            className="group/grip flex shrink-0 touch-none cursor-grab select-none items-center gap-0.5 rounded-full focus-visible:outline-2 focus-visible:outline-brand active:cursor-grabbing"
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
            <PiDotsSixVertical aria-hidden="true" className="size-3.5 text-muted-foreground group-hover/grip:text-brand" />
            <span className={badgeClass}>{index + 1}</span>
          </button>
        ) : <span aria-hidden="true" className={badgeClass}>{index + 1}</span>;
        return <li key={place.id} className={`relative rounded-xl border border-border bg-background ${drag?.id === place.id ? "border-brand bg-brand/10" : ""}`}>
          {insertion && <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 h-0.5 rounded bg-brand ${index < dragIndex ? "-top-1.5" : "-bottom-1.5"}`} />}
          {renderPlace(place, orderBadge)}
        </li>;
      })}
    </ol>
  </>;
}
