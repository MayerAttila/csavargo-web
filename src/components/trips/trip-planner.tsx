"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { sameMapPlace } from "@/components/maps/map-poi";
import type { MapCameraCommand, MapPoint } from "@/components/maps/types";
import { getTripPlan, saveTripPlan, type SavedTripPlan, type TripPlan } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { calendarDay, dateInputValue, type TripDateInputs, type TripDateRange } from "./trip-calendar";
import { TripAgenda } from "./trip-agenda";
import { TripLodging } from "./trip-lodging";
import { TripPlaceWorkspace } from "./trip-place-workspace";
import { TripSettings } from "./trip-settings";
import { restorePoint, storedPoint } from "./trip-point";
import { useTripPlaceInfo } from "./use-trip-place-info";

const emptyDay: MapPoint[] = [];
function restoreDays(plan?: TripPlan) {
  return Object.fromEntries((plan?.days ?? []).map(({ date, stops }) => [calendarDay(date), stops.map(restorePoint)]));
}

export function TripPlanner({ slug, initialSaved = null }: { slug: string; initialSaved?: SavedTripPlan | null }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const restored = initialSaved?.plan;
  const [name, setName] = useState(initialSaved?.name ?? "");
  const [destination, setDestination] = useState<MapPoint | undefined>(() => restored ? restorePoint(restored.destination) : undefined);
  const [lodging, setLodging] = useState<MapPoint | undefined>(() => restored?.lodging ? restorePoint(restored.lodging) : undefined);
  const [pickingLodging, setPickingLodging] = useState(false);
  const [placeView, setPlaceView] = useState<"map" | "list">("map");
  const placeWorkspace = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<TripDateRange | undefined>(() => restored
    ? { start: calendarDay(restored.start), end: calendarDay(restored.end) } : undefined);
  const [dateInputs, setDateInputs] = useState<TripDateInputs>(() => ({ start: restored?.start ?? "", end: restored?.end ?? "" }));
  const [activeDay, setActiveDay] = useState<number | undefined>(() => restored ? calendarDay(restored.start) : undefined);
  const [days, setDays] = useState<Partial<Record<number, MapPoint[]>>>(() => restoreDays(restored));
  const [candidate, setCandidate] = useState<MapPoint>();
  const getPlaceInfo = useTripPlaceInfo(candidate, token);
  const [camera, setCamera] = useState<MapCameraCommand | undefined>(() => {
    if (!destination || !range) return undefined;
    const firstDay = days[range.start];
    return firstDay?.length
      ? { type: "fit", coordinates: firstDay.map(({ coordinates }) => coordinates) }
      : { type: "view", view: { center: destination.coordinates, zoom: 11 } };
  });
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const places = activeDay === undefined ? emptyDay : days[activeDay] ?? emptyDay;
  const existing = candidate ? places.find((place) => sameMapPlace(place, candidate)) : undefined;
  const canPlan = Boolean(destination && range);
  const plan: TripPlan | null = destination && range ? {
    destination: storedPoint(destination),
    ...(lodging && { lodging: storedPoint(lodging) }),
    start: dateInputValue(range.start), end: dateInputValue(range.end),
    days: Object.entries(days).sort(([a], [b]) => Number(a) - Number(b)).flatMap(([day, stops]) => stops?.length
      ? [{ date: dateInputValue(Number(day)), stops: stops.map(storedPoint) }] : []),
  } : null;
  const tripName = name.trim();
  const hasChanges = tripName !== (saved?.name ?? "") || JSON.stringify(plan) !== JSON.stringify(saved?.plan ?? null);

  async function save() {
    if (saving || (saved && (!plan || !tripName || !hasChanges))) return;
    setSaving(true);
    try {
      const baseline = saved ?? await getTripPlan(slug);
      if (!plan) {
        if ((name || destination || lodging || dateInputs.start || dateInputs.end)
          && !window.confirm("A mentett terv betöltése lecseréli az oldalon megadott adatokat. Betöltöd a mentett tervet?")) return;
        const { destination: savedDestination, lodging: savedLodging, start, end } = baseline.plan;
        const startDay = calendarDay(start);
        const destinationPoint = restorePoint(savedDestination);
        const restoredDays = restoreDays(baseline.plan);
        setName(baseline.name);
        setDestination(destinationPoint);
        setLodging(savedLodging ? restorePoint(savedLodging) : undefined);
        setPickingLodging(false);
        setRange({ start: startDay, end: calendarDay(end) });
        setDateInputs({ start, end });
        setActiveDay(startDay);
        setDays(restoredDays);
        setCandidate(undefined);
        setCamera(restoredDays[startDay]?.length
          ? { type: "fit", coordinates: restoredDays[startDay].map(({ coordinates }) => coordinates) }
          : { type: "view", view: { center: destinationPoint.coordinates, zoom: 11 } });
        setSaved(baseline);
        return;
      }
      const nameToSave = tripName || baseline.name;
      if (!saved) {
        if (baseline.name === nameToSave && JSON.stringify(baseline.plan) === JSON.stringify(plan)) {
          if (!tripName) setName(baseline.name);
          setSaved(baseline);
          return;
        }
        if (!window.confirm("Lecseréled ennek az utazásnak a mentett tervét az itt összeállítottra?")) return;
      }
      setSaved(await saveTripPlan(slug, plan, baseline.version, nameToSave));
      if (!tripName) setName(nameToSave);
      notify.success("A tervet elmentettük a fiókodba.", { id: "trip-save" });
    } catch (error) {
      notify.error(error instanceof Error && error.message === "TRIP_CONFLICT"
        ? "A tervet időközben máshol módosították. A módosításaid ezen az oldalon maradtak."
        : "A mentés nem sikerült. Próbáld újra.", { id: "trip-save" });
    } finally {
      setSaving(false);
    }
  }

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

  function showLodgingOnMap(point: MapPoint) {
    setPickingLodging(false);
    setPlaceView("map");
    setCamera({ type: "view", view: { center: point.coordinates, zoom: 15 } });
    placeWorkspace.current?.scrollIntoView?.({ block: "nearest" });
  }

  function changeLodging(point?: MapPoint) {
    setLodging(point);
    setPickingLodging(false);
  }

  function toggleLodgingMapPick() {
    setPickingLodging(!pickingLodging);
    if (!pickingLodging) {
      setPlaceView("map");
      placeWorkspace.current?.scrollIntoView?.({ block: "nearest" });
    }
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
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <Link href="/utazasok" prefetch={false} className="text-xs font-medium text-muted-foreground hover:text-brand hover:underline">Vissza az utazásokhoz</Link>
        <h1 className="mt-1 wrap-break-word text-2xl font-bold tracking-tight sm:text-3xl">{tripName || saved?.name || "Kirándulástervező"}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p role="status" className="text-xs text-muted-foreground">
          {!saved ? "A mentett terv lekérése sikertelen volt. Újra megpróbálhatod ezen az oldalon."
            : hasChanges ? "Mentetlen módosítások"
            : "Mentve a fiókodba"}
        </p>
        <button type="button" disabled={saving || Boolean(saved && (!plan || !tripName || !hasChanges))} onClick={() => void save()}
          className="min-h-10 rounded-xl bg-action px-3 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-45">
          {saving ? "Folyamatban…" : !saved && !plan ? "Újrapróbálás" : "Terv mentése"}
        </button>
      </div>
    </header>

    <div className="grid items-start gap-4 lg:grid-cols-[minmax(20rem,0.6fr)_minmax(0,1fr)]">
      <div className="grid min-w-0 gap-4">
        <TripSettings token={token} name={name} onName={setName} destination={destination} dates={dateInputs}
          onDestination={chooseDestination} onDates={setDateInputs} onApplyRange={applyDateRange}>
          <TripLodging token={token} lodging={lodging} picking={pickingLodging} onChange={changeLodging}
            onShowOnMap={showLodgingOnMap} onToggleMapPick={toggleLodgingMapPick} />
        </TripSettings>
        <TripAgenda range={range} activeDay={activeDay} places={places} onDay={chooseDay}
          onSelect={choosePlace} onRemove={removePlace} onMove={movePlace} getPlaceInfo={getPlaceInfo} />
      </div>

      <div ref={placeWorkspace} className="min-w-0">
        <TripPlaceWorkspace token={token} activeDay={activeDay} canPlan={canPlan} points={places} lodging={lodging}
          candidate={candidate ? getPlaceInfo(candidate) : undefined} selectedId={existing?.id} camera={camera}
          view={placeView} onViewChange={(view) => { setPlaceView(view); if (view === "list") setPickingLodging(false); }}
          onLodgingPick={pickingLodging ? changeLodging : undefined} onCancelLodgingPick={() => setPickingLodging(false)}
          onSelect={choosePlace} onAdd={addPlace} />
      </div>
    </div>
  </div>;
}
