import { HiOutlineMapPin } from "react-icons/hi2";
import { isPublicMapToken } from "@/components/maps/map-errors";
import { PlaceSearch } from "@/components/maps/place-search";
import type { MapPoint } from "@/components/maps/types";
import { Input } from "@/components/ui/input";

type Props = {
  token: string;
  lodging?: MapPoint;
  picking: boolean;
  onChange?: (point?: MapPoint) => void;
  onToggleMapPick: () => void;
};

export function TripLodging({ token, lodging, picking, onChange, onToggleMapPick }: Props) {
  return <div className="px-4 py-2 sm:px-5">
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        {onChange ? <PlaceSearch token={token} label="Szállás keresése" inputVariant="lodging" compact
          selectedValue={lodging?.label} onSelect={onChange} onClearSelection={() => onChange(undefined)} />
          : <Input variant="lodging" value={lodging?.label ?? ""} readOnly />}
      </div>
      {(onChange || lodging) && <button type="button" onClick={onToggleMapPick} disabled={!isPublicMapToken(token)}
        aria-label={onChange ? "Szállás kiválasztása a térképen" : "Szállás megjelenítése a térképen"}
        aria-pressed={onChange ? picking : undefined}
        className={`grid h-11 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 ${picking ? "bg-brand/15 text-foreground" : ""}`}>
        <HiOutlineMapPin aria-hidden="true" className="size-5" />
      </button>}
    </div>
    {lodging?.address && lodging.address !== lodging.label &&
      <p className="mt-1 wrap-break-word px-1 text-xs text-muted-foreground">{lodging.address}</p>}
  </div>;
}
