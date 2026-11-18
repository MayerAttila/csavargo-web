"use client";

import { useState, type FormEvent } from "react";
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineMapPin, HiOutlineTrash } from "react-icons/hi2";
import { MapCanvas } from "@/components/maps/map-canvas";
import { sameMapPlace } from "@/components/maps/map-poi";
import { PlaceSearch } from "@/components/maps/place-search";
import type { MapCameraCommand, MapPoint } from "@/components/maps/types";
import { notify } from "@/lib/notifications";

const emptyDay: MapPoint[] = [];
const panelClass = "rounded-2xl border border-border bg-surface p-4 sm:p-5";
const controlClass = "rounded-lg border border-border text-sm font-medium hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40";
const iconButtonClass = `${controlClass} grid size-10 shrink-0 place-items-center`;
const primaryClass = "min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";
const dateInputClass = "h-11 min-w-0 w-full rounded-lg border border-border bg-background px-2 focus-visible:outline-2 focus-visible:outline-brand";
const dayInMilliseconds = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat("hu-HU", { dateStyle: "long", timeZone: "UTC" });

type DateRange = { start: number; end: number };

function calendarDay(value: string) {
  // Treat dates as UTC calendar days so daylight saving never changes the trip length.
  return Date.parse(`${value}T00:00:00Z`) / dayInMilliseconds;
}

export function TripPlanner() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const [destination, setDestination] = useState<MapPoint>();
  const [range, setRange] = useState<DateRange>();
  const [dateInputs, setDateInputs] = useState({ start: "", end: "" });
  const [activeDay, setActiveDay] = useState<number>();
  const [days, setDays] = useState<Partial<Record<number, MapPoint[]>>>({});
  const [candidate, setCandidate] = useState<MapPoint>();
  const [camera, setCamera] = useState<MapCameraCommand>();
  const places = activeDay === undefined ? emptyDay : days[activeDay] ?? emptyDay;
  const existing = candidate ? places.find((place) => sameMapPlace(place, candidate)) : undefined;
  const canPlan = Boolean(destination && range);
  const dayNumber = range && activeDay !== undefined ? activeDay - range.start + 1 : 0;

  function chooseDestination(point: MapPoint) {
    setDestination(point);
    setCandidate(undefined);
    setCamera({ type: "view", view: { center: point.coordinates, zoom: 11 } });
  }

  function choosePlace(point: MapPoint) {
    if (!canPlan) return;
    const selected = places.find((place) => sameMapPlace(place, point)) ?? point;
    setCandidate(selected);
    setCamera({ type: "view", view: { center: selected.coordinates, zoom: 15 } });
  }

  function chooseDay(day: number) {
    setActiveDay(day);
    setCandidate(undefined);
    const dayPlaces = days[day];
    if (dayPlaces?.length) {
      setCamera({ type: "fit", coordinates: dayPlaces.map((place) => place.coordinates) });
    } else if (destination) {
      setCamera({ type: "view", view: { center: destination.coordinates, zoom: 11 } });
    }
  }

  function applyDateRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = calendarDay(dateInputs.start);
    const end = calendarDay(dateInputs.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
      notify.error("Adj meg érvényes kezdő és záró dátumot. A záró dátum nem lehet korábbi.", { id: "trip-duration" });
      return;
    }
    const insideRange = (day: number) => day >= start && day <= end;
    const dropsStops = Object.entries(days).some(([day, stops]) => !insideRange(Number(day)) && stops?.length);
    if (dropsStops && !window.confirm("Az új időszakon kívül eső napok programja törlődik. Módosítod az időszakot?")) {
      if (range) setDateInputs({
        start: new Date(range.start * dayInMilliseconds).toISOString().slice(0, 10),
        end: new Date(range.end * dayInMilliseconds).toISOString().slice(0, 10),
      });
      return;
    }
    setRange({ start, end });
    setDays((current) => Object.fromEntries(Object.entries(current).filter(([day]) => insideRange(Number(day)))));
    if (activeDay === undefined || !insideRange(activeDay)) chooseDay(start);
  }

  function addPlace() {
    if (!candidate || activeDay === undefined) return;
    setDays((current) => {
      const currentDay = current[activeDay] ?? emptyDay;
      if (currentDay.some((place) => sameMapPlace(place, candidate))) return current;
      return { ...current, [activeDay]: [...currentDay, candidate] };
    });
  }

  function removePlace(point: MapPoint) {
    if (activeDay === undefined) return;
    setDays((current) => ({ ...current, [activeDay]: (current[activeDay] ?? emptyDay).filter((place) => place.id !== point.id) }));
    if (existing?.id === point.id) setCandidate(undefined);
  }

  function movePlace(id: string, direction: -1 | 1) {
    if (activeDay === undefined) return;
    setDays((current) => {
      const currentDay = current[activeDay] ?? emptyDay;
      const index = currentDay.findIndex((place) => place.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= currentDay.length) return current;
      const reordered = [...currentDay];
      const [place] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, place);
      return { ...current, [activeDay]: reordered };
    });
  }

  return <div className="mx-auto w-full max-w-[100rem] space-y-5">
    <header>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kirándulástervező</h1>
      <p className="mt-1 text-sm text-muted-foreground">A terv oldalfrissítéskor és az oldal elhagyásakor törlődik.</p>
    </header>

    <div className="grid items-start gap-4 lg:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr]">
      <section aria-labelledby="trip-settings" className={`${panelClass} space-y-4 lg:col-start-1 lg:row-start-1`}>
        <h2 id="trip-settings" className="font-semibold">Úti cél és időtartam</h2>
        {destination && <p className="flex items-start gap-2 text-sm font-medium" role="status">
          <HiOutlineMapPin aria-hidden="true" className="size-5 shrink-0 text-brand" />
          <span className="min-w-0 wrap-break-word">{destination.label}</span>
        </p>}
        <PlaceSearch token={token} onSelect={chooseDestination} label={destination ? "Úti cél módosítása" : "Úti cél keresése"} />
        <form className="space-y-3" noValidate onSubmit={applyDateRange}>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              Kezdő dátum
              <input className={dateInputClass} type="date" required value={dateInputs.start}
                onChange={(event) => setDateInputs({ ...dateInputs, start: event.target.value })} />
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              Záró dátum
              <input className={dateInputClass} type="date" required min={dateInputs.start || undefined} value={dateInputs.end}
                onChange={(event) => setDateInputs({ ...dateInputs, end: event.target.value })} />
            </label>
          </div>
          <button type="submit" className={`${controlClass} min-h-11 px-3 py-2`}>Időszak beállítása</button>
        </form>
      </section>

      {range && activeDay !== undefined && <div role="group" aria-label="Napválasztó" className={`${panelClass} flex items-center justify-between gap-3 py-3 lg:col-start-1 lg:row-start-2`}>
        <button type="button" aria-label="Előző nap" className={iconButtonClass} disabled={activeDay === range.start} onClick={() => chooseDay(activeDay - 1)}>
          <HiOutlineChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <p className="text-center text-sm font-semibold" aria-live="polite">
          {dayNumber}. nap <span className="font-normal text-muted-foreground">/ {range.end - range.start + 1}</span>
          <span className="block text-xs font-normal text-muted-foreground">{dateFormatter.format(activeDay * dayInMilliseconds)}</span>
        </p>
        <button type="button" aria-label="Következő nap" className={iconButtonClass} disabled={activeDay === range.end} onClick={() => chooseDay(activeDay + 1)}>
          <HiOutlineChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>}

      <section aria-label="Helyek kiválasztása" className={`${panelClass} min-w-0 space-y-4 lg:col-start-2 lg:row-span-3 lg:row-start-1`}>
        {canPlan ? <PlaceSearch key={activeDay} token={token} onSelect={choosePlace} label="Látnivaló keresése" />
          : <p className="text-sm text-muted-foreground">Válassz úti célt és időszakot a látnivalók hozzáadásához.</p>}
        <MapCanvas token={token} points={places} selectedId={existing?.id} cameraCommand={camera}
          onSelect={(id) => { const point = places.find((place) => place.id === id); if (point) choosePlace(point); }}
          onPlaceSelect={canPlan ? choosePlace : undefined}
          missingTokenHint="Az úti cél és a látnivalók kereséséhez be kell állítani a térképszolgáltatást."
          className="h-[44svh] min-h-72 lg:h-[min(62svh,48rem)]" />
        {candidate ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
          <div className="min-w-0 wrap-break-word">
            <h2 className="text-sm font-semibold">{candidate.label}</h2>
            {candidate.address && <p className="text-xs text-muted-foreground">{candidate.address}</p>}
          </div>
          <button type="button" className={primaryClass} onClick={addPlace} disabled={Boolean(existing)}>
            {existing ? "A napi programban szerepel" : "Hozzáadás ehhez a naphoz"}
          </button>
        </div> : canPlan && <p className="text-sm text-muted-foreground">A programhoz válassz helyet a térképen vagy a keresőből.</p>}
      </section>

      {range && <section aria-labelledby="trip-day" className={`${panelClass} lg:col-start-1 lg:row-start-3`}>
        <h2 id="trip-day" className="font-semibold">A nap programja</h2>
        {places.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Ehhez a naphoz még nem adtál helyeket.</p>
          : <ol aria-label={`${dayNumber}. nap helyszínei`} className="mt-3 space-y-2">
            {places.map((place, index) => <li key={place.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-2">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">{index + 1}</span>
              <button type="button" aria-pressed={existing?.id === place.id}
                className="min-w-16 flex-1 wrap-break-word rounded text-left text-sm font-medium hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                onClick={() => choosePlace(place)}>{place.label}</button>
              <div className="ml-auto flex gap-1">
                <button type="button" aria-label={`${place.label} előrébb`} className={iconButtonClass} disabled={index === 0} onClick={() => movePlace(place.id, -1)}><HiOutlineArrowUp aria-hidden="true" className="size-4" /></button>
                <button type="button" aria-label={`${place.label} hátrébb`} className={iconButtonClass} disabled={index === places.length - 1} onClick={() => movePlace(place.id, 1)}><HiOutlineArrowDown aria-hidden="true" className="size-4" /></button>
                <button type="button" aria-label={`${place.label} törlése`} className={iconButtonClass} onClick={() => removePlace(place)}><HiOutlineTrash aria-hidden="true" className="size-4" /></button>
              </div>
            </li>)}
          </ol>}
      </section>}
    </div>
  </div>;
}
