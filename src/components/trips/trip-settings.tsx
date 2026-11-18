import { useState, type FormEvent } from "react";
import { HiOutlineArrowsRightLeft, HiOutlineMapPin } from "react-icons/hi2";
import { PlaceSearch } from "@/components/maps/place-search";
import type { MapPoint } from "@/components/maps/types";
import type { TripDateInputs } from "./trip-calendar";

type Props = {
  token: string;
  destination?: MapPoint;
  dates: TripDateInputs;
  onDestination: (point: MapPoint) => void;
  onDates: (dates: TripDateInputs) => void;
  onApplyRange: (event: FormEvent<HTMLFormElement>) => void;
};

const dateInputClass = "h-11 min-w-0 w-full rounded-xl border border-border/80 bg-background/70 px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-brand";

export function TripSettings({ token, destination, dates, onDestination, onDates, onApplyRange }: Props) {
  const [editingDestination, setEditingDestination] = useState(false);

  return <section aria-labelledby="trip-settings" className="min-w-0 rounded-2xl border border-border/80 bg-surface shadow-sm">
    <div className="space-y-3 rounded-t-2xl border-b border-border/60 bg-linear-to-br from-brand/18 via-brand/5 to-transparent px-4 pt-4 pb-3.5 sm:px-5">
      <h2 id="trip-settings" className="text-base font-semibold tracking-tight">Úti cél és időtartam</h2>
      {destination && !editingDestination ? (
        <button type="button" onClick={() => setEditingDestination(true)} aria-label="Úti cél cseréje"
          className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-border/80 bg-surface/85 px-3 text-left text-sm font-semibold hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand">
          <HiOutlineMapPin aria-hidden="true" className="size-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 wrap-break-word">{destination.label}</span>
          <HiOutlineArrowsRightLeft aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      ) : <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <PlaceSearch token={token} label={destination ? "Úti cél módosítása" : "Úti cél keresése"} autoFocus={editingDestination}
            onSelect={(point) => { onDestination(point); setEditingDestination(false); }} />
        </div>
        {editingDestination && <button type="button" onClick={() => setEditingDestination(false)}
          className="min-h-11 shrink-0 rounded-xl px-2 text-xs font-medium text-muted-foreground hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand">Mégse</button>}
      </div>}
    </div>
    <form className="@container px-4 py-3.5 sm:px-5" noValidate onSubmit={onApplyRange}>
      <div className="grid grid-cols-2 items-end gap-2 @min-[19rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
          Kezdő dátum
          <input className={`${dateInputClass} text-foreground`} type="date" required value={dates.start}
            onChange={(event) => onDates({ ...dates, start: event.target.value })} />
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
          Záró dátum
          <input className={`${dateInputClass} text-foreground`} type="date" required min={dates.start || undefined} value={dates.end}
            onChange={(event) => onDates({ ...dates, end: event.target.value })} />
        </label>
        <button type="submit" className="col-span-2 h-11 justify-self-end rounded-xl bg-action px-3 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand @min-[19rem]:col-span-1">Mentés</button>
      </div>
    </form>
  </section>;
}
