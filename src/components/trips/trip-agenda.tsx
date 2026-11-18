import { HiOutlineCalendarDays } from "react-icons/hi2";
import type { MapPoint } from "@/components/maps/types";
import type { TripTravel, TripTravelLeg } from "@/lib/api";
import { TripDayPlaces } from "./trip-day-places";
import { calendarDay, dateInputValue, tripDateLabel, type TripDateRange } from "./trip-calendar";
import type { GetTripPlaceInfo } from "./use-trip-place-info";
import { TripTravelLegFields } from "./trip-travel-leg";

type Props = {
  range?: TripDateRange;
  activeDay?: number;
  places: MapPoint[];
  travel: TripTravel;
  onTravelChange?: (kind: keyof TripTravel, value?: TripTravelLeg) => void;
  onDay: (day: number) => void;
  onSelect: (place: MapPoint) => void;
  onRemove?: (place: MapPoint) => void;
  onMove?: (id: string, index: number) => void;
  getPlaceInfo: GetTripPlaceInfo;
};

export function TripAgenda({ range, activeDay, places, travel, onTravelChange, onDay, onSelect, onRemove, onMove, getPlaceInfo }: Props) {
  const dayCount = range ? range.end - range.start + 1 : 0;
  const dayNumber = range && activeDay !== undefined ? activeDay - range.start + 1 : 0;
  const useCalendar = dayCount > 31;

  return <section aria-labelledby="trip-day" className="min-w-0 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm sm:p-5">
    <h2 id="trip-day" className="mb-3.5 flex items-center gap-2 text-base font-semibold tracking-tight">
      <HiOutlineCalendarDays aria-hidden="true" className="size-5 text-brand" /> A nap programja
    </h2>
    {range && activeDay !== undefined ? (
      <div className={`grid min-w-0 gap-3 ${useCalendar ? "" : "sm:grid-cols-[4.25rem_minmax(0,1fr)]"}`}>
        <div role="group" aria-label="Napválasztó" className="min-w-0">
          <p className="sr-only" aria-live="polite">{dayNumber}. nap / {dayCount} · {tripDateLabel(activeDay)}</p>
          {useCalendar ? <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
            Nap kiválasztása
            <input type="date" value={dateInputValue(activeDay)} min={dateInputValue(range.start)} max={dateInputValue(range.end)}
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
              onChange={(event) => {
                const day = calendarDay(event.target.value);
                if (day >= range.start && day <= range.end) onDay(day);
              }} />
          </label> : <div className="flex flex-wrap gap-1.5 p-0.5 sm:flex-col sm:flex-nowrap sm:gap-1">
            {Array.from({ length: dayCount }, (_, index) => {
              const day = range.start + index;
              const selected = day === activeDay;
              return <button type="button" key={day} aria-pressed={selected} onClick={() => onDay(day)}
                className={`min-w-16 shrink-0 rounded-xl border px-1.5 py-1.5 text-center leading-tight focus-visible:outline-2 focus-visible:outline-brand sm:min-w-0 sm:py-0.5 ${selected ? "border-brand/60 bg-action text-white shadow-sm" : "border-transparent bg-surface-alt/65 text-foreground hover:border-border"}`}>
                <span className="block text-xs font-semibold">{day - range.start + 1}. nap</span>
                <span className={`mt-0.5 block text-[11px] ${selected ? "text-white/85" : "text-muted-foreground"}`}>{tripDateLabel(day, true)}</span>
              </button>;
            })}
          </div>}
        </div>
        <div className="min-w-0 space-y-2.5 rounded-xl border border-border/70 bg-surface-alt/35 p-2.5 sm:p-3">
          {activeDay === range.start && <TripTravelLegFields kind="arrival" value={travel.arrival}
            onChange={onTravelChange && ((value) => onTravelChange("arrival", value))} />}
          {places.length ? <TripDayPlaces key={activeDay} dayNumber={dayNumber} places={places}
            onSelect={onSelect} onRemove={onRemove} onMove={onMove} getPlaceInfo={getPlaceInfo} />
            : <p className="text-sm text-muted-foreground">{onMove ? "Válassz egy helyet a térképen vagy a keresőből, majd add hozzá ehhez a naphoz." : "Ehhez a naphoz még nincs mentett program."}</p>}
          {activeDay === range.end && <TripTravelLegFields kind="departure" value={travel.departure}
            onChange={onTravelChange && ((value) => onTravelChange("departure", value))} />}
        </div>
      </div>
    ) : <p className="rounded-xl bg-surface-alt/40 p-3 text-sm text-muted-foreground">Állítsd be az utazás időszakát a napi programhoz.</p>}
  </section>;
}
