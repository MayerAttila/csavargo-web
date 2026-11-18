"use client";

import { useRef, useState, type FormEvent } from "react";
import { isPublicMapToken } from "@/components/maps/map-errors";
import { sameMapPlace } from "@/components/maps/map-poi";
import type { MapCameraCommand, MapPoint } from "@/components/maps/types";
import { notify } from "@/lib/notifications";
import { calendarDay, dateInputValue, type TripDateInputs, type TripDateRange } from "./trip-calendar";
import { TripAgenda } from "./trip-agenda";
import { TripPlaceWorkspace } from "./trip-place-workspace";
import { TripSettings } from "./trip-settings";

const emptyDay: MapPoint[] = [];

export function TripPlanner() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const [destination, setDestination] = useState<MapPoint>();
  const [range, setRange] = useState<TripDateRange>();
  const [dateInputs, setDateInputs] = useState<TripDateInputs>({ start: "", end: "" });
  const [activeDay, setActiveDay] = useState<number>();
  const [days, setDays] = useState<Partial<Record<number, MapPoint[]>>>({});
  const [candidate, setCandidate] = useState<MapPoint>();
  const [camera, setCamera] = useState<MapCameraCommand>();
  const places = activeDay === undefined ? emptyDay : days[activeDay] ?? emptyDay;
  const existing = candidate ? places.find((place) => sameMapPlace(place, candidate)) : undefined;
  const canPlan = Boolean(destination && range);
  const searchRef = useRef<HTMLInputElement>(null);

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
        start: dateInputValue(range.start),
        end: dateInputValue(range.end),
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

  function movePlace(id: string, nextIndex: number) {
    if (activeDay === undefined) return;
    setDays((current) => {
      const currentDay = current[activeDay] ?? emptyDay;
      const index = currentDay.findIndex((place) => place.id === id);
      if (index < 0 || nextIndex < 0 || nextIndex >= currentDay.length || index === nextIndex) return current;
      const reordered = [...currentDay];
      const [place] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, place);
      return { ...current, [activeDay]: reordered };
    });
  }

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 sm:space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kirándulástervező</h1>
      <p className="text-xs text-muted-foreground sm:text-sm">A terv oldalfrissítéskor és az oldal elhagyásakor törlődik.</p>
    </header>

    <div className="grid items-start gap-4 lg:grid-cols-[minmax(20rem,0.6fr)_minmax(0,1fr)]">
      <div className="grid min-w-0 gap-4">
        <TripSettings token={token} destination={destination} dates={dateInputs}
          onDestination={chooseDestination} onDates={setDateInputs} onApplyRange={applyDateRange} />
        <TripAgenda token={token} range={range} activeDay={activeDay} places={places}
          canAdd={canPlan && isPublicMapToken(token)} onDay={chooseDay} onFind={() => searchRef.current?.focus()}
          onSelect={choosePlace} onRemove={removePlace} onMove={movePlace} />
      </div>

      <TripPlaceWorkspace token={token} activeDay={activeDay} canPlan={canPlan} points={places}
        candidate={candidate} selectedId={existing?.id} camera={camera} searchRef={searchRef}
        onSelect={choosePlace} onAdd={addPlace} />
    </div>
  </div>;
}
