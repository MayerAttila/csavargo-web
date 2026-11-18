import type { FormEvent, ReactNode } from "react";
import type { MapPoint } from "@/components/maps/types";
import type { TripDateInputs } from "./trip-calendar";
import { TripDateFields } from "./trip-date-fields";
import { TripDestination } from "./trip-destination";

type Props = {
  token: string;
  name: string;
  onName: (name: string) => void;
  destination?: MapPoint;
  dates: TripDateInputs;
  onDestination: (point: MapPoint) => void;
  onDates: (dates: TripDateInputs) => void;
  onApplyRange: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
};

export function TripSettings({ token, name, onName, destination, dates, onDestination, onDates, onApplyRange, children }: Props) {
  return <section aria-labelledby="trip-settings" className="min-w-0 rounded-2xl border border-border/80 bg-surface shadow-sm">
    <div className="space-y-3 rounded-t-2xl border-b border-border/60 bg-linear-to-br from-brand/18 via-brand/5 to-transparent px-4 pt-4 pb-3.5 sm:px-5">
      <h2 id="trip-settings" className="text-base font-semibold tracking-tight">Úti cél és időtartam</h2>
      <TripDestination token={token} destination={destination} onChange={onDestination} />
    </div>
    <div className="px-4 pt-3.5 sm:px-5">
      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
        Utazás neve
        <input value={name} maxLength={200} onChange={(event) => onName(event.target.value)}
          className="h-11 rounded-xl border border-border/80 bg-background/70 px-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-brand" />
      </label>
    </div>
    <form className="@container px-4 py-3.5 sm:px-5" noValidate onSubmit={onApplyRange}>
      <div className="grid grid-cols-2 items-end gap-2 @min-[19rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <TripDateFields dates={dates} onDates={onDates} />
        <button type="submit" className="col-span-2 h-11 justify-self-end rounded-xl bg-action px-3 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand @min-[19rem]:col-span-1">Mentés</button>
      </div>
    </form>
    {children}
  </section>;
}
