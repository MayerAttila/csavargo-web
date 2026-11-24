import { useState } from "react";
import { HiOutlineMapPin } from "react-icons/hi2";
import { isPublicMapToken } from "@/components/maps/map-errors";
import { PlaceSearch } from "@/components/maps/place-search";
import type { MapPoint } from "@/components/maps/types";
import { Input } from "@/components/ui/input";
import type { SavedLodging, TripLodgingTimes } from "@/lib/api";

const timeFields = [
  { key: "checkInTime", label: "Elfoglalható ettől" },
  { key: "checkOutTime", label: "Elhagyandó eddig" },
] as const;

type Props = {
  token: string;
  lodging?: SavedLodging;
  picking: boolean;
  onChange?: (point?: MapPoint) => void;
  onManualChange?: (label: string) => void;
  onTimeChange?: (kind: keyof TripLodgingTimes, time?: string) => void;
  onToggleMapPick: () => void;
  onCancelMapPick: () => void;
};

export function TripLodging({ token, lodging, picking, onChange, onManualChange, onTimeChange, onToggleMapPick, onCancelMapPick }: Props) {
  const canUseMap = isPublicMapToken(token);
  const mapped = lodging && "coordinates" in lodging ? lodging : undefined;
  const [preferManual, setManual] = useState(() => !canUseMap || Boolean(lodging && !mapped));
  const manual = Boolean(onManualChange) && preferManual;
  const [manualName, setManualName] = useState(lodging?.label ?? "");

  function toggleManual() {
    setManual(!manual);
    if (!manual) {
      setManualName(lodging?.label ?? "");
      onCancelMapPick();
    }
  }

  return <div className="px-4 py-2 sm:px-5">
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        {onChange && !manual ? <PlaceSearch token={token} label="Szállás keresése" inputVariant="lodging" compact
          selectedValue={lodging?.label} onSelect={onChange} onClearSelection={() => onChange(undefined)} />
          : onManualChange ? <Input variant="lodging" label="Szállás neve" value={manualName} maxLength={200}
            onChange={(event) => {
              setManualName(event.currentTarget.value);
              onManualChange(event.currentTarget.value.trim());
            }} /> : <Input variant="lodging" value={lodging?.label ?? ""} readOnly />}
      </div>
      {canUseMap && (onChange ? !manual : mapped) && <button type="button" onClick={onToggleMapPick}
        aria-label={onChange ? "Szállás kiválasztása a térképen" : "Szállás megjelenítése a térképen"}
        aria-pressed={onChange ? picking : undefined}
        className={`grid h-11 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 ${picking ? "bg-brand/15 text-foreground" : ""}`}>
        <HiOutlineMapPin aria-hidden="true" className="size-5" />
      </button>}
    </div>
    {canUseMap && onManualChange && <button type="button" onClick={toggleManual}
      className="mt-1 cursor-pointer rounded-md px-1 py-1 text-xs text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">
      {manual ? "Szállás keresése" : "Kézi megadás"}
    </button>}
    {mapped?.address && mapped.address !== mapped.label &&
      <p className="mt-1 wrap-break-word px-1 text-xs text-muted-foreground">{mapped.address}</p>}
    {lodging && (onTimeChange || lodging.checkInTime || lodging.checkOutTime) &&
      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/70 pt-2">
        {timeFields.map(({ key, label }) => onTimeChange ? <label key={key} className="grid min-w-0 gap-1 text-xs text-muted-foreground">
          {label}
          <input type="time" value={lodging[key] ?? ""} onChange={(event) => onTimeChange(key, event.currentTarget.value || undefined)}
            className="h-9 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-sm text-foreground tabular-nums focus-visible:outline-2 focus-visible:outline-brand" />
        </label> : lodging[key] && <p key={key} className="text-xs text-muted-foreground">
          {label} <time className="block text-sm text-foreground tabular-nums" dateTime={lodging[key]}>{lodging[key]}</time>
        </p>)}
      </div>}
  </div>;
}
