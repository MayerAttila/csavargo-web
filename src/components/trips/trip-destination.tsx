import { useState } from "react";
import { HiOutlineArrowsRightLeft, HiOutlineMapPin } from "react-icons/hi2";
import { PlaceSearch } from "@/components/maps/place-search";
import type { MapPoint } from "@/components/maps/types";

type Props = {
  token: string;
  destination?: MapPoint;
  onChange: (point: MapPoint) => void;
};

export function TripDestination({ token, destination, onChange }: Props) {
  const [editing, setEditing] = useState(false);

  if (destination && !editing) return <button type="button" onClick={() => setEditing(true)} aria-label="Úti cél cseréje"
    className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-border/80 bg-surface/85 px-3 text-left text-sm font-semibold hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand">
    <HiOutlineMapPin aria-hidden="true" className="size-5 shrink-0 text-brand" />
    <span className="min-w-0 flex-1 wrap-break-word">{destination.label}</span>
    <HiOutlineArrowsRightLeft aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
  </button>;

  return <div className="flex items-start gap-2">
    <div className="min-w-0 flex-1">
      <PlaceSearch token={token} label={destination ? "Úti cél módosítása" : "Úti cél keresése"} autoFocus={editing}
        onSelect={(point) => { onChange(point); setEditing(false); }} />
    </div>
    {editing && <button type="button" onClick={() => setEditing(false)}
      className="min-h-11 shrink-0 rounded-xl px-2 text-xs font-medium text-muted-foreground hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand">Mégse</button>}
  </div>;
}
