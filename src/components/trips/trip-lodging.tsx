import { useState } from "react";
import { HiOutlineMapPin, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi2";
import { LuLocateFixed } from "react-icons/lu";
import { isPublicMapToken } from "@/components/maps/map-errors";
import { PlaceSearch } from "@/components/maps/place-search";
import type { MapPoint } from "@/components/maps/types";
import { Input } from "@/components/ui/input";

const iconButton = "grid h-11 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";

type Props = {
  token: string;
  lodging?: MapPoint;
  picking: boolean;
  onChange: (point?: MapPoint) => void;
  onShowOnMap: (point: MapPoint) => void;
  onToggleMapPick: () => void;
};

export function TripLodging({ token, lodging, picking, onChange, onShowOnMap, onToggleMapPick }: Props) {
  const [editing, setEditing] = useState(false);
  const showSelection = lodging && !editing;

  return <div className="border-t border-border/60 px-4 py-2 sm:px-5">
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        {showSelection ? <Input label="Szállás" value={lodging.label} title={lodging.label} readOnly />
          : <PlaceSearch token={token} label="Szállás keresése" autoFocus={editing} compact
            onSelect={(point) => { onChange(point); setEditing(false); }} />}
      </div>
      {editing && <button type="button" onClick={() => setEditing(false)}
        className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand">Mégse</button>}
      <button type="button" onClick={() => { setEditing(false); onToggleMapPick(); }} disabled={!isPublicMapToken(token)}
        aria-label="Szállás kiválasztása a térképen" title="Szállás kiválasztása a térképen" aria-pressed={picking}
        className={`${iconButton} ${picking ? "bg-brand/15 text-foreground" : ""}`}>
        <HiOutlineMapPin aria-hidden="true" className="size-5" />
      </button>
    </div>
    {showSelection && <div className="flex items-center justify-end gap-1">
      {lodging.address && lodging.address !== lodging.label &&
        <p className="min-w-0 flex-1 wrap-break-word px-1 text-xs text-muted-foreground">{lodging.address}</p>}
      <button type="button" onClick={() => onShowOnMap(lodging)} aria-label={`Szállás a térképen: ${lodging.label}`}
        title="Szállás megjelenítése a térképen" className={iconButton}>
        <LuLocateFixed aria-hidden="true" className="size-4" />
      </button>
      <button type="button" onClick={() => setEditing(true)} aria-label="Szállás módosítása" title="Szállás módosítása" className={iconButton}>
        <HiOutlinePencil aria-hidden="true" className="size-4" />
      </button>
      <button type="button" onClick={() => onChange(undefined)} aria-label="Szállás eltávolítása" title="Szállás eltávolítása" className={iconButton}>
        <HiOutlineTrash aria-hidden="true" className="size-4" />
      </button>
    </div>}
  </div>;
}
